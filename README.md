# @guwave/gubo-skills-installer

Gubo Skills 一键安装器 —— 通过 `npx` 快速将 @guwave 组件使用指南（AI Skill）安装到 Cursor / Claude Code / Gemini CLI / Codex 等 AI 编程助手中。

---

## 包含的 Skills

| Skill | 说明 |
|-------|------|
| **Wafer Map Skill** | 晶圆图渲染组件 `@guwave/wafermap-v2` 使用指南，覆盖 die map、bin map、reticle map、site map 等场景 |
| **Common Legend Skill** | 图例组件 `@guwave/common-legend` 使用指南，支持 Vue3 及 React（veaury 桥接） |

---

## 使用方式

```bash
npx @guwave/gubo-skills-installer
```

CLI 会引导你完成以下流程：

1. **选择 Skill** — 勾选要安装的 Skill（支持多选）
2. **选择安装路径** — 选择目标平台或"全部安装"
3. **覆盖确认** — 若目标路径已存在同名 Skill，会提示是否覆盖
4. **自动下载安装** — 从远端下载 zip 并解压到目标路径

---

## 支持的安装目标

| 目标 | 路径 |
|------|------|
| 当前目录 | `<cwd>/<skillName>` |
| Cursor（项目级） | `<cwd>/.cursor/skills/<skillName>` |
| Cursor（全局） | `~/.cursor/skills/<skillName>` |
| Claude Code | `~/.claude/skills/<skillName>` |
| Gemini CLI | `~/.gemini/skills/<skillName>` |
| Codex | `~/.agents/skills/<skillName>` |

---

## 本地开发

> 要求 Node >= 18

```bash
pnpm install
node bin/cli.mjs
```

---

## 项目结构

```text
gubo-skills-installer/
├── package.json
├── bin/
│   └── cli.mjs          # CLI 入口
├── src/
│   ├── config.mjs       # Skill 列表与下载地址配置
│   ├── install.mjs      # 安装主流程
│   └── targets.mjs      # 安装目标路径定义
└── skills/              # Skill 源文件（用于打包上传）
    ├── wafer-map/
    └── common-legend/
```

---

## License

MIT
