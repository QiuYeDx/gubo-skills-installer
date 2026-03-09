import { homedir } from 'node:os';
import { join } from 'node:path';

const home = homedir();
const cwd = process.cwd();

/**
 * 定义所有支持的安装目标类型。
 * 每个目标包含:
 *  - id: 唯一标识符
 *  - label: 显示名称
 *  - getPath: 根据 skillName 生成最终路径的函数
 */
export const targetDefinitions = [
  {
    id: 'current',
    label: '📂 当前目录',
    getPath: (skillName) => join(cwd, skillName),
  },
  {
    id: 'cursor-project',
    label: '📁 Cursor (项目级)',
    getPath: (skillName) => join(cwd, '.cursor', 'skills', skillName),
  },
  {
    id: 'cursor-global',
    label: '🌐 Cursor (全局)',
    getPath: (skillName) => join(home, '.cursor', 'skills', skillName),
  },
  {
    id: 'claude-code',
    label: '🤖 Claude Code',
    getPath: (skillName) => join(home, '.claude', 'skills', skillName),
  },
  {
    id: 'gemini-cli',
    label: '💎 Gemini CLI',
    getPath: (skillName) => join(home, '.gemini', 'skills', skillName),
  },
  {
    id: 'codex',
    label: '📦 Codex',
    getPath: (skillName) => join(home, '.agents', 'skills', skillName),
  },
];

/**
 * 获取指定 Skill 的所有可能安装路径 (兼容旧版调用)
 */
export function getTargets(skillName) {
  return targetDefinitions.map((def) => ({
    id: def.id,
    label: def.label,
    path: def.getPath(skillName),
  }));
}
