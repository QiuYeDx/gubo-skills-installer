import { select, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawn } from 'node:child_process';

import config from './config.mjs';
import { targetDefinitions } from './targets.mjs';

const IGNORED_ENTRIES = new Set(['.DS_Store', 'Thumbs.db', '__MACOSX']);
const PROXY_ENV_KEYS = [
  'HTTPS_PROXY',
  'https_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'ALL_PROXY',
  'all_proxy',
];
const RETRYABLE_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
  'FETCH_FAILED',
  'DOWNLOAD_TIMEOUT',
]);
const DOWNLOAD_TIMEOUT_MS = 120_000;
const FETCH_RETRY_TIMES = 3;
const FETCH_RETRY_INTERVAL_MS = 1_200;

// ─── Banner ──────────────────────────────────────────────────

function printBanner(skills) {
  console.log();
  if (skills.length === 1) {
    console.log(chalk.cyan.bold(`  🚀 ${skills[0].displayName} 安装器`));
    console.log(chalk.dim(`     ${skills[0].description}`));
  } else {
    console.log(chalk.cyan.bold(`  🚀 Skill Installer`));
    console.log(chalk.dim(`     即将安装 ${skills.length} 个 Skills`));
  }
  console.log(chalk.dim(`     ${'─'.repeat(40)}`));
  console.log();
}

// ─── Download ────────────────────────────────────────────────

function withCode(error, code, extra = {}) {
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(err) {
  return err?.code || err?.cause?.code || err?.cause?.cause?.code || '';
}

function formatError(err) {
  if (!err) return '未知错误';
  const code = getErrorCode(err);
  return code ? `${err.message} (${code})` : err.message;
}

function getProxyEnvNames() {
  return PROXY_ENV_KEYS.filter((name) => Boolean(process.env[name]));
}

function shouldPreferCurl() {
  return getProxyEnvNames().length > 0 && process.env.NODE_USE_ENV_PROXY !== '1';
}

function isRetriableError(err) {
  if (!err) return false;
  if (err.code === 'HTTP_STATUS') {
    return err.status >= 500 || err.status === 429;
  }
  const code = getErrorCode(err);
  if (RETRYABLE_NETWORK_CODES.has(code)) {
    return true;
  }
  return /fetch failed/i.test(err.message);
}

async function downloadWithFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw withCode(new Error(`HTTP ${res.status} ${res.statusText}`), 'HTTP_STATUS', {
        status: res.status,
      });
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err.name === 'AbortError') {
      throw withCode(
        new Error(`下载超时 (${Math.floor(DOWNLOAD_TIMEOUT_MS / 1000)}s), 请检查网络连接`),
        'DOWNLOAD_TIMEOUT'
      );
    }
    const code = getErrorCode(err) || 'FETCH_FAILED';
    throw withCode(new Error(`fetch 失败: ${err.message}`, { cause: err }), code);
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadWithCurl(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '-fL',
      '-sS',
      '--connect-timeout',
      '15',
      '--max-time',
      String(Math.ceil(DOWNLOAD_TIMEOUT_MS / 1000)),
      url,
    ];
    const child = spawn('curl', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const chunks = [];
    let stderr = '';

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(withCode(new Error('系统未安装 curl 命令'), 'CURL_NOT_FOUND'));
        return;
      }
      reject(withCode(new Error(`启动 curl 失败: ${err.message}`), err.code || 'CURL_START_FAILED'));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
        return;
      }
      const detail = stderr.trim() || `curl 退出码 ${code}`;
      reject(withCode(new Error(`curl 下载失败: ${detail}`), `CURL_EXIT_${code}`));
    });
  });
}

async function downloadZip(url) {
  const errors = [];

  if (shouldPreferCurl()) {
    try {
      return await downloadWithCurl(url);
    } catch (err) {
      errors.push(`curl 预下载失败: ${formatError(err)}`);
    }
  }

  for (let attempt = 1; attempt <= FETCH_RETRY_TIMES; attempt++) {
    try {
      return await downloadWithFetch(url);
    } catch (err) {
      errors.push(`fetch 第 ${attempt} 次失败: ${formatError(err)}`);
      if (attempt < FETCH_RETRY_TIMES && isRetriableError(err)) {
        await sleep(FETCH_RETRY_INTERVAL_MS * attempt);
        continue;
      }
      break;
    }
  }

  try {
    return await downloadWithCurl(url);
  } catch (err) {
    errors.push(`curl 兜底失败: ${formatError(err)}`);
  }

  const proxyEnvNames = getProxyEnvNames();
  const proxyHint =
    proxyEnvNames.length > 0 && process.env.NODE_USE_ENV_PROXY !== '1'
      ? `检测到已设置 ${proxyEnvNames.join(', ')}，如需让 Node fetch 走代理，请在命令前追加 NODE_USE_ENV_PROXY=1`
      : '';
  const githubHint = url.includes('github.com')
    ? '当前下载地址位于 GitHub，若网络受限，建议使用可访问 GitHub 的网络或镜像地址。'
    : '';
  const details = [...errors, proxyHint, githubHint].filter(Boolean).join('；');

  throw new Error(`下载失败: ${details}`);
}

// ─── Extract ─────────────────────────────────────────────────

function extractZip(zipBuffer, targetPath, stripComponents = 0) {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }

  const zip = new AdmZip(zipBuffer);

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;

    const parts = entry.entryName.split('/');

    if (parts.some((p) => IGNORED_ENTRIES.has(p))) continue;

    if (parts.length <= stripComponents) continue;
    const relativePath = parts.slice(stripComponents).join('/');
    if (!relativePath) continue;

    const fullPath = join(targetPath, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, entry.getData());
  }
}

// ─── CLI Flow ────────────────────────────────────────────────

export async function main() {
  // 归一化配置: 支持 skills 数组或单对象配置
  const skills = config.skills || (Array.isArray(config) ? config : [config]);

  printBanner(skills);

  // 1) 选择要安装的 Skills (如果配置了多个)
  let selectedSkills = skills;
  if (skills.length > 1) {
    selectedSkills = await checkbox({
      message: '请选择要安装的 Skill:',
      choices: skills.map((s) => ({
        name: `${s.displayName} ${chalk.dim(`(${s.description})`)}`,
        value: s,
        checked: true,
      })),
      required: true,
    });
  }

  // 2) 选择安装目标 (一次选择，应用于所有 Skill)
  const targetId = await select({
    message: chalk.bold('请选择安装路径 (将应用于所有选中的 Skill):'),
    choices: [
      {
        value: 'all',
        name: `${chalk.yellow('✨')} 全部安装 ${chalk.dim(`(${targetDefinitions.length} 个路径)`)}`,
      },
      ...targetDefinitions.map((t) => ({
        value: t.id,
        name: t.label,
      })),
    ],
  });

  const selectedTargetDefs =
    targetId === 'all'
      ? targetDefinitions
      : targetDefinitions.filter((t) => t.id === targetId);

  // 3) 检查已有安装
  const conflicts = [];
  for (const skill of selectedSkills) {
    for (const targetDef of selectedTargetDefs) {
      const path = targetDef.getPath(skill.name);
      if (existsSync(path)) {
        conflicts.push({ skill, targetDef, path });
      }
    }
  }

  const skipSet = new Set();

  if (conflicts.length > 0) {
    console.log();
    console.log(chalk.yellow('  ⚠️  以下路径已存在对应 Skill:'));
    for (const c of conflicts) {
      console.log(
        chalk.yellow(`     • [${c.skill.displayName}] -> ${c.targetDef.label}`) +
        chalk.dim(` ${c.path}`)
      );
    }
    console.log();

    const totalPairs = selectedSkills.length * selectedTargetDefs.length;
    const allConflict = conflicts.length >= totalPairs;

    const choices = [
      { value: 'overwrite', name: '覆盖安装 (可能包含版本更新)' },
      { value: 'cancel', name: '取消安装' },
    ];
    if (!allConflict) {
      choices.unshift({
        value: 'skip',
        name: '跳过已存在的, 继续安装其余',
      });
    }

    const action = await select({ message: '如何处理已存在的 Skill?', choices });

    if (action === 'cancel') {
      console.log(chalk.dim('\n  已取消安装。\n'));
      return;
    }

    if (action === 'skip') {
      for (const c of conflicts) {
        skipSet.add(`${c.skill.name}::${c.targetDef.id}`);
      }
    }
  }

  // 4) 下载并安装
  console.log();
  const spinner = ora({ text: '准备安装...', color: 'cyan' }).start();
  const installed = [];

  try {
    for (let i = 0; i < selectedSkills.length; i++) {
      const skill = selectedSkills[i];
      const prefix = `[${i + 1}/${selectedSkills.length}] ${skill.displayName}`;

      const targetsForSkill = selectedTargetDefs.filter(
        (t) => !skipSet.has(`${skill.name}::${t.id}`)
      );

      if (targetsForSkill.length === 0) {
        continue;
      }

      spinner.text = `${prefix}: 正在下载...`;
      const zipBuffer = await downloadZip(skill.assetUrl);

      for (const targetDef of targetsForSkill) {
        const targetPath = targetDef.getPath(skill.name);
        spinner.text = `${prefix}: 安装到 ${targetDef.label}...`;
        extractZip(zipBuffer, targetPath, skill.stripComponents);
        installed.push({ skill, targetDef });
      }
    }
    spinner.succeed(chalk.green('安装完成!'));
  } catch (err) {
    spinner.fail(chalk.red('安装过程中发生错误'));
    throw err;
  }

  // 5) 展示结果
  if (installed.length > 0) {
    console.log();
    console.log(chalk.bold('  已安装:'));
    for (const skill of selectedSkills) {
      const skillInstalls = installed.filter((r) => r.skill.name === skill.name);
      if (skillInstalls.length === 0) continue;
      console.log(chalk.cyan(`    📦 ${skill.displayName}`));
      for (const { targetDef } of skillInstalls) {
        console.log(
          chalk.green(`       ✓ ${targetDef.label}`) +
          chalk.dim(` → ${targetDef.getPath(skill.name)}`)
        );
      }
    }
  }

  if (skipSet.size > 0) {
    console.log();
    console.log(chalk.bold('  已跳过 (已存在):'));
    for (const c of conflicts) {
      console.log(
        chalk.dim(`    ⊘ [${c.skill.displayName}] -> ${c.targetDef.label} ${c.path}`)
      );
    }
  }
  console.log();
}
