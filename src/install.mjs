import { select, confirm, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import AdmZip from 'adm-zip';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';

import config from './config.mjs';
import { targetDefinitions } from './targets.mjs';

const IGNORED_ENTRIES = new Set(['.DS_Store', 'Thumbs.db', '__MACOSX']);

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

async function downloadZip(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('下载超时 (120s), 请检查网络连接');
    }
    throw new Error(`下载失败: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
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

    const overwrite = await confirm({
      message: '是否覆盖安装 (可能包含版本更新)?',
      default: false,
    });

    if (!overwrite) {
      console.log(chalk.dim('\n  已取消安装。\n'));
      return;
    }
  }

  // 4) 下载并安装
  console.log();
  const spinner = ora({ text: '准备安装...', color: 'cyan' }).start();

  try {
    for (let i = 0; i < selectedSkills.length; i++) {
      const skill = selectedSkills[i];
      const prefix = `[${i + 1}/${selectedSkills.length}] ${skill.displayName}`;

      spinner.text = `${prefix}: 正在下载...`;
      // 注意: 实际项目中可能需要并发下载或缓存，这里保持简单串行
      const zipBuffer = await downloadZip(skill.assetUrl);

      for (const targetDef of selectedTargetDefs) {
        const targetPath = targetDef.getPath(skill.name);
        spinner.text = `${prefix}: 安装到 ${targetDef.label}...`;
        extractZip(zipBuffer, targetPath, skill.stripComponents);
      }
    }
    spinner.succeed(chalk.green('所有安装完成!'));
  } catch (err) {
    spinner.fail(chalk.red('安装过程中发生错误'));
    throw err;
  }

  // 5) 展示结果
  console.log();
  console.log(chalk.bold('  已安装:'));
  for (const skill of selectedSkills) {
    console.log(chalk.cyan(`    📦 ${skill.displayName}`));
    for (const targetDef of selectedTargetDefs) {
      console.log(
        chalk.green(`       ✓ ${targetDef.label}`) +
          chalk.dim(` → ${targetDef.getPath(skill.name)}`)
      );
    }
  }
  console.log();
}
