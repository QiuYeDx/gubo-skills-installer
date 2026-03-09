---
name: common-legend
description: 'Guide for using @guwave/common-legend Vue3 component (with veaury for React) to render chart/wafer map legends. Use when creating, configuring, or integrating legend panels in React or Vue3 projects. Covers ColorBy legend, WaferMap legend, TrellisBy info, LineAndPoint info, and Dataset info groups. Triggers on: "common-legend", "图例", "legend", "CommonLegend", "ReactCommonLegend", "@guwave/common-legend", "ColorBy", "wafer legend", "晶圆图例", "veaury".'
---

# @guwave/common-legend 使用指南

`@guwave/common-legend` 是一个 Vue3 图例组件库，用于在图表/晶圆图旁渲染可交互的 Legend 面板。在 React 项目中通过 `veaury` 桥接使用。

---

## ⚠️ 关键前置检查清单

在集成 `@guwave/common-legend` 到 React+Vite 项目之前，**必须**逐项确认以下事项，任何一项遗漏都会导致组件异常：

### 1. Veaury 所需的三个 Vite 插件依赖

`veaury` 内部依赖这三个 Vite 插件，缺少任何一个都会导致构建失败或运行异常：

```jsonc
// package.json - devDependencies 中必须包含：
"@vitejs/plugin-react": "^4.6.0",
"@vitejs/plugin-vue": "^5.2.4",
"@vitejs/plugin-vue-jsx": "^4.2.0",
```

即使项目中没有直接使用 Vue 或 Vue JSX，也必须安装，因为 `veaury` 的 Vite 插件会同时调用这三个插件。

### 2. 必须关闭 React 严格模式

React 的 `<React.StrictMode>` 会导致组件 double-render，与 veaury 桥接的 Vue 组件产生冲突，表现为渲染异常、事件丢失等问题。入口文件中**不要**包裹 `<React.StrictMode>`：

```tsx
// src/main.tsx — 正确写法：不使用 StrictMode
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <App />  // 不要包裹 <React.StrictMode>
);
```

### 3. 必须安装并导入 ElementPlus 主题

`@guwave/common-legend` 内部使用了 ElementPlus 组件（如颜色选择器、表格等），需要安装主题包和 sass 预处理器：

```jsonc
// package.json - dependencies：
"element-plus": "^2.9.0",
"@guwave/element-plus-theme": "0.1.7",

// package.json - devDependencies：
"sass": "^1.77.0",
```

主题的 SCSS 文件需要在**桥接组件文件中**导入（不是在 main.tsx 中），详见下方桥接组件写法。

### 4. HTML/`:root` 的 font-size 必须为 16px

`@guwave/common-legend` 内部大量使用 `rem` 单位。如果项目全局样式修改了 `:root` 或 `html` 的 `font-size`（如设为 `14px`、`62.5%` 等），组件内所有尺寸都会错乱。

**必须确保**：
```css
/* 不要修改 html/root 的 font-size，保持浏览器默认的 16px */
:root {
  font-size: 16px; /* 或者干脆不设置，保持默认 */
}
```

如果项目出于其他需要必须改 `font-size`，则需对 CommonLegend 的容器做 `font-size: 16px` 的重置。

### 5. .npmrc 配置

确保 `.npmrc` 中配置了 `@guwave` scope 的 registry：

```ini
@guwave:registry=http://192.168.2.210:7001/
```

---

## 安装与依赖

```bash
# 需要配置 .npmrc 以支持 @guwave scope
pnpm add @guwave/common-legend
# peerDependencies (项目中已有则跳过)
pnpm add element-plus lodash vue @vueuse/core
# ElementPlus 主题（必须）
pnpm add @guwave/element-plus-theme@0.1.7
# React 项目额外需要
pnpm add veaury
# devDependencies — veaury Vite 插件所需的三个依赖 + sass
pnpm add -D @vitejs/plugin-react @vitejs/plugin-vue @vitejs/plugin-vue-jsx sass
```

**样式导入** (项目入口文件中):
```ts
import '@guwave/common-legend/dist/style.css';
```

## Vite 配置

使用 `veaury` 提供的 Vite 插件替代原生 `@vitejs/plugin-react`，不要同时使用两者：

```ts
// vite.config.ts
import { defineConfig } from "vite";
import veauryVitePlugins from 'veaury/vite/index.js';

export default defineConfig({
  plugins: [
    // 不要再单独引入 react()，veaury 插件已经内含
    veauryVitePlugins({
      type: 'react',
    }),
    // ...其他插件
  ],
});
```

## 在 React 中使用 (veaury 桥接)

### 1. 创建桥接组件（关键：必须注册 ElementPlus）

桥接组件中**必须**通过 `beforeVueAppMount` 注册 ElementPlus，否则组件内部使用的 ElementPlus（颜色选择器、Tooltip 等）都不会生效：

```tsx
// src/components/CommonLegend/index.tsx
import { CommonLegend } from "@guwave/common-legend";
import { applyPureVueInReact } from "veaury";
import ElementPlus from "element-plus";
import "@guwave/element-plus-theme/index.scss";

export const ReactCommonLegend = applyPureVueInReact(CommonLegend, {
  beforeVueAppMount: (app: any) => {
    app.use(ElementPlus);
  },
});
```

**错误写法**（缺少 ElementPlus 注册，内部 ElementPlus 组件将全部失效）：
```tsx
// ❌ 错误：缺少 beforeVueAppMount 和 ElementPlus 注册
export const ReactCommonLegend = applyPureVueInReact(CommonLegend);
```

### 2. 在 JSX 中使用

veaury 会将 Vue 的 `emit` 事件映射为 React 的 `onXxx` 回调（驼峰前加 `on`）。

**默认宽度建议不低于 260px**，以确保表格式图例（waferLegendOptions）的列内容不被截断：

```tsx
<ReactCommonLegend
  height={containerHeight}
  infoPanels={legend}          // PanelItem[] - 核心数据
  width={legendWidth || 260}   // 默认宽度建议 ≥ 260px
  minWidth={200}
  maxWidth={480}
  onUpdateColor={handleColorChange}
  onChangeShowConfig={handleShowConfig}
  onCommonClick={handleCommonClick}
  onUpdateSelectedShowType={handleSelectedShowType}
  onRefresh={handleRefresh}
  onUpdateWidth={handleUpdateWidth}
  onLineItemClick={handleLineItemClick}
  onSortChange={handleSortChange}               // 晶圆图图例排序
  onWaferMapShowValCol={handleShowValColumn}     // 晶圆图统计列显隐
/>
```

## 核心概念：数据结构

组件接收 `infoPanels: PanelItem[]`，结构层级为：

```
CommonLegendProps
  └─ infoPanels: PanelItem[]
       ├─ panelTitle?: string        // 面板标题，'' 则不显示标题栏
       └─ infoGroups: GroupItem[]    // 多个 Group 组成一个面板
            ├─ id: string            // 唯一标识
            ├─ isShowControlKey: string  // 显隐控制键(相同key的Group一起显隐)
            ├─ isShow: boolean
            └─ 以下 Options 互斥使用(每个Group只用一种):
                ├─ colorByOptions      → 普通图表颜色图例列表
                ├─ waferLegendOptions  → 晶圆图表格式图例
                ├─ trellisByOptions    → 简单文本信息展示
                ├─ infoListOptions     → 旧版 Line and Point
                ├─ lineAndPointOptions → 新版 Line and Point
                └─ normalInfoListOptions → 纯文本列表
```

## 六种 Group 模块

### 1. trellisByOptions — 文本信息展示
用于展示 Trellis by、Color by、Dataset 等文本信息。

```ts
{ title: 'Trellis by:', content: '645:ALL00PGMVFY0SEC_BLK', tooltipContent?: '...' }
```

### 2. colorByOptions — 普通图表颜色图例
用于 Scatter、Histogram、BoxPlot 等普通图表的颜色图例列表。

```ts
{
  list: ListItem[],                    // { name, status, icon, color, isLastClick }
  style?: ColorByItemStyle,            // 'default'(截断) | 'entirely'(换行)
  selectedShowType?: SelectedShowType, // 'highlight' | 'onlyShowSelected'
  axisTitle?: string,                  // 轴标题，如 'Y1'
  showLegendListTitle?: boolean,
  showOperateTipText?: boolean,
  hideSelectedShowType?: boolean,
}
```

### 3. waferLegendOptions — 晶圆图表格图例
用于 BinMap、ParametricMap 等晶圆图的表格式图例，支持 Count/Rate 列、排序、统计开关。

```ts
{
  type: 'BIN' | 'RANGE' | 'PF',
  data: LegendDataItem[],             // 含 k, name, count, percent, color, pf, binNum 等
  showValueColumn: boolean,            // 是否显示统计列
  firstColumnShowName: string,         // 如 'HBin', 'SBin'
  allowFirstColumnSort: boolean,
  allowChangeColor: boolean,
  showLegendListOperator?: boolean,    // 高亮/仅显示、统计开关、操作说明
  selectedShowType?: SelectedShowType,
  defaultSortKey?: 'name' | 'countAndPercent',
  defaultSortOrder?: 'ascending' | 'descending',
}
```

### 4. lineAndPointOptions — 新版线条/标记图例
```ts
{
  title: 'Line and Point:',
  styleOptions?: { truncate: boolean },
  infoList: LineAndPointInfo[],  // { id, name, color, tooltip?, description?, status? }
}
```

### 5. normalInfoListOptions — 纯文本列表
```ts
{ title: 'Info:', infoList: ['Device: XXX', 'Test Stage: FT'] }
```

### 6. infoListOptions — 旧版线条图例 (deprecated)
```ts
{ title: 'Line and Point:', infoList: [{ subTitle: 'Regress A', content: 'R²=0.82\ny=...' }] }
```

## 事件映射表 (Vue emit → React prop)

| Vue emit 事件 | React prop (veaury) | 参数类型 | 说明 |
|---|---|---|---|
| `updateColor` | `onUpdateColor` | `{ id, name, color }` | 颜色选择器修改颜色 |
| `commonClick` | `onCommonClick` | `{ id, name, isCtrl, isShift }` | 图例项点击(含修饰键) |
| `updateSelectedShowType` | `onUpdateSelectedShowType` | `{ id, selectedShowType }` | 高亮/仅显示切换 |
| `changeShowConfig` | `onChangeShowConfig` | `{ isShowControlKey, isShow }` | 显示设置面板切换 |
| `refresh` | `onRefresh` | `{ idList? }` | 还原按钮 |
| `updateWidth` | `onUpdateWidth` | `number` | 拖拽调整宽度 |
| `sortChange` | `onSortChange` | `{ prop, order, id }` | 晶圆图例排序 |
| `waferMapShowValCol` | `onWaferMapShowValCol` | `{ id, checked }` | 统计列显隐 |
| `lineItemClick` | `onLineItemClick` | `LineAndPointInfo` | 线条图例项点击 |

## 通用交互处理函数 (可复用)

库导出了排序工具函数，项目中还有一套可复用的交互处理逻辑：

```ts
// 从库中导出
import { gComponentsLegendBinListSort } from '@guwave/common-legend';

// 通用交互处理函数 (需在项目中实现，参考 reference-utils.md)
handleLegendForCommonClick(legend, param, customOptionKey?, extraInfo?)
handleLegendForRefresh(legend)
handleLegendUpdateSelectedShowType(legend, id, selectedShowType, customOptionKey?)
```

## 构建 Legend 数据的 Builder 函数

项目中封装了 builder 函数来构建各种 GroupItem：

| Builder 函数 | 用途 |
|---|---|
| `buildTrellisByInfo(showNames, hiddenIds)` | 构建 Trellis by 信息 |
| `buildColorByInfo(showNames, hiddenIds)` | 构建 Color by 信息 |
| `buildColorByLegend({...})` | 构建颜色图例列表 (含icon分配、颜色映射) |
| `buildWaferLegend({...})` | 构建晶圆图表格图例 |
| `buildWaferMapInfo({summaryInfo, hiddenIds})` | 构建晶圆图 Info 区 |
| `buildDatasetInfo({hiddenIds, datasetName, datasetData})` | 构建 Dataset 信息 |
| `buildGlobalMarkLineInfo({...})` | 构建全局标线图例 |
| `getAllColorMap({sortedColorByKey, colorGroups})` | 生成 key→color 映射 |
| `getUnitColorByKey({sortedColorByKey, unitInfo})` | 追加单位信息 |

## 完整使用流程

1. **前置检查**：确认上方"关键前置检查清单"中的全部 5 项
2. **安装依赖**：`@guwave/common-legend`、`veaury`、`element-plus`、`@guwave/element-plus-theme`、`sass`、三个 Vite 插件
3. **配置 Vite**：使用 `veauryVitePlugins({ type: 'react' })` 替代 `@vitejs/plugin-react`
4. **关闭严格模式**：确认 `main.tsx` 中没有 `<React.StrictMode>` 包裹
5. **导入样式**：在入口文件导入 `@guwave/common-legend/dist/style.css`
6. **创建桥接组件**：`applyPureVueInReact(CommonLegend, { beforeVueAppMount })`，必须在 `beforeVueAppMount` 中注册 `ElementPlus`，并导入主题 SCSS
7. **确认 font-size**：检查全局 CSS 中 `:root`/`html` 的 `font-size` 为 `16px`（浏览器默认值）
8. **构建 PanelItem[] 数据**：使用 builder 函数或手动构建
9. **渲染组件**：传入 `infoPanels` 和事件回调，默认宽度建议 ≥ 260px
10. **处理交互**：使用通用处理函数更新 legend 状态

## 常见问题排查

| 现象 | 原因 | 解决方案 |
|---|---|---|
| 颜色选择器不显示 / Tooltip 不弹出 | 桥接时未注册 ElementPlus | 在 `applyPureVueInReact` 的 `beforeVueAppMount` 中 `app.use(ElementPlus)` |
| 组件尺寸全部错乱 | `:root`/`html` 的 `font-size` 不是 16px | 恢复为 `font-size: 16px` 或在容器上重置 |
| 组件 double-render / 事件异常 | React 严格模式开启 | 移除 `<React.StrictMode>` |
| 构建报错找不到 Vue 插件 | 缺少 `@vitejs/plugin-vue` 或 `@vitejs/plugin-vue-jsx` | 安装这三个插件到 devDependencies |
| SCSS 导入报错 | 未安装 `sass` | `pnpm add -D sass` |
| 表格图例列内容被截断 | 默认宽度太小 | 将 `width` 默认值调至 ≥ 260px |
| 主题样式不生效 | 未导入 `@guwave/element-plus-theme/index.scss` | 在桥接组件文件中导入该 SCSS |

## 附加资源

- 完整类型定义见 [reference-types.md](reference-types.md)
- 通用工具函数实现见 [reference-utils.md](reference-utils.md)
- 普通图表和晶圆图的完整使用示例见 [reference-examples.md](reference-examples.md)
