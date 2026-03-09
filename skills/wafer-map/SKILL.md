---
name: wafer-map
description: >-
  Guide for using @guwave/wafermap-v2 to render semiconductor wafer maps with
  Canvas. Use when creating, configuring, or integrating wafer map
  visualizations (die map, bin map, reticle map, site map) in React, Vue3, or
  vanilla JS projects. Crucial: verify .npmrc configuration for @guwave scope
  before installation. Triggers on: "wafer map", "晶圆图", "die map", "bin map",
  "WaferMap", "@guwave/wafermap", "wafermap", ".npmrc config for wafermap",
  "reticle", "notch", "highlight", "brush", "圈选", "高亮", "框选", "辅助线",
  "subline".
---

# @guwave/wafermap-v2 使用指南

基于 Canvas 的高性能半导体晶圆图渲染组件，**框架无关**（React / Vue3 / 原生 JS 均可）。

## 补充参考文档索引

| 文件 | 内容 |
| --- | --- |
| [reference.md](reference.md) | 完整 TypeScript 类型定义、构造函数、实例方法签名、导出清单 |
| [recipes.md](recipes.md) | 实用代码模式：数据生成、自定义 Tooltip、Legend 高亮、框选管理、React/Vue3 生产级模板 |
| [features.md](features.md) | 已支持特性矩阵、配置组合与功能交互说明 |
| [react-demo.tsx](react-example/react-demo.tsx) | **完整 React 示例**：含数据生成、BinMap 着色、Tooltip 自定义、Legend 高亮、框选、Reticle、高亮互斥逻辑，可作为集成参考 |

## 前提条件：.npmrc 配置

由于 `@guwave/wafermap-v2` 托管在私有仓库，在安装前**必须**确保项目根目录下存在 `.npmrc` 文件，并且正确配置了 `@guwave` 的作用域仓库地址。

必须检查或创建 `.npmrc` 文件，内容参考如下：

```ini
registry=https://registry.npmmirror.com/

# 必须配置 @guwave 作用域以指向私有仓库
@guwave:registry=http://192.168.2.210:7001/
```

## 安装

确认 `.npmrc` 配置正确后，执行以下命令：

```bash
pnpm add @guwave/wafermap-v2 lodash
```

`lodash` 为 peerDependency，必须安装。

如果项目执行 `pnpm install` 报错，先删除项目根目录下的 `node_modules`，再重试：

```bash
rm -rf node_modules
pnpm install
```

（如果项目中有 `package-lock.json`, 即用的是 npm, 则把 pnpm 命令换为 npm）

## 导入

```typescript
import WaferMap from '@guwave/wafermap-v2';
import '@guwave/wafermap-v2/style.css';

// 类型（按需）
import type { WaferMapOptions, WaferMapDataItem } from '@guwave/wafermap-v2';

// 颜色工具（可选，单独入口）
import { getColorByPFBinNum, makeColorBlockColors, BinPFTypeEnum } from '@guwave/wafermap-v2/utils';
```

## 核心概念

| 概念 | 说明 |
| --- | --- |
| **Wafer** | 圆形晶圆，`wafer.diameter` 设置直径（mm），`wafer.notch` 设置缺口方向 |
| **Die** | 晶圆上最小芯片单元，`die.width/height` 设置物理尺寸（mm） |
| **Reticle** | 光罩区域，包含多个 Die，由 `center.dieCountInReticle` 控制 |
| **坐标系** | `axis.directionX`（`'left'`/`'right'`）+ `axis.directionY`（`'up'`/`'down'`）控制方向 |

### 两种渲染模式

- **`type: 'dashboard'`**（默认）— 数据驱动：提供 `data` 数组，每个 die 的坐标和属性由数据决定
- **`type: 'waferMap-config'`** — 配置驱动：仅提供晶圆参数和可选 `siteData`，组件自动生成圆内 die 数据

## ⛔ 关键规则：圈选高亮与 Legend 高亮互斥

> **此规则为强制约束，编写任何使用 WaferMap 高亮功能的代码时必须遵守。**

WaferMap 有两种高亮机制，**它们互斥，不能同时存在**：

| 高亮类型 | 触发方式 | 配置 |
| --- | --- | --- |
| **圈选高亮**（Brush Highlight） | 用户框选 die 后，选中的 die 高亮 | `brush.needBrushHighlight: true` + `changeBrushEnabled(true)` |
| **Legend 高亮**（Color By Highlight） | 用户在 Legend 中取消勾选某些类别，剩余类别高亮 | `highlightLayer.isHighlight` 返回样式或 `undefined` |

### 互斥规则

1. **Legend 高亮状态变更时**（用户勾选/取消某些 Bin）→ **清空** Brush 当前选中的 die（`clearBrushedShapes()`），**不影响**框选功能开关本身（不需要调用 `changeBrushEnabled(false)`，框选仍可用）
2. **Brush 实际选中/移除 die 时**（用户框选产生结果，即 `onBrushChange` 回调收到有效 shapes）→ **重置** Legend 为初始默认状态（全部 Bin 选中，`highlightLayer: undefined`）

**注意区分**：
- "启用/禁用框选开关"（`changeBrushEnabled`）**不**触发 Legend 重置——只有**实际产生框选结果**才会
- "Legend 状态变更"**不**关闭框选开关——只是**清空已选中的 die**

### 实现要求

```typescript
// Legend 状态变更 → 清空 Brush 选中的 die（不影响框选开关）
function onLegendChange() {
  waferMap.clearBrushedShapes();
  // 更新 activeBins 和 highlightLayer ...
}

// Brush 用户选中动作（onBrushChange 回调）→ 重置 Legend 为默认
function onBrushChange(shapes: any[] | null) {
  if (shapes && shapes.length > 0) {
    activeBins = allBinsActiveState; // 全选 → highlightLayer: undefined
  }
}
```

> 完整实现参见 [react-demo.tsx](react-example/react-demo.tsx) 中的 `toggleBin` 函数和 `onBrushChange` 回调。
> React/Vue3 实现模式详见 [recipes.md](recipes.md#高亮互斥实现模式)。

**违反此规则会导致两种高亮状态同时作用于 highlightLayer，产生视觉冲突和状态不一致。**

---

### 已支持特性速查

> 详见 [features.md](features.md) 中的完整特性矩阵。

| 特性 | 关键配置 | 说明 |
| --- | --- | --- |
| Notch 方向 | `wafer.notch.direction` | `'up'` / `'down'` / `'left'` / `'right'` |
| Die 描边 | `die.line.{ show, width, color }` | `show` 支持 `boolean` 或 `'auto'`（按缩放比例自动显隐） |
| Die 着色 | `die.bgColor` | 字符串或 `(item) => string` 函数 |
| Die 标签 | `die.label.{ show, fontSize, color }` | 在 die 上显示文字 |
| Reticle 显示 | `reticle.show` | 需同时配置 `center.dieCountInReticle` |
| Reticle 标签 | `reticle.label.{ show, fontSize }` | 需在数据中提供 `reticleLabel` 字段 |
| 裁剪/完整显示 | `clip` | `true` 裁剪圆外 die，`false` 完整显示 |
| 自定义 Tooltip | `tooltip.render` | 返回 HTML 字符串或 HTMLElement |
| 框选（Brush） | `brush` + `changeBrushEnabled()` | 矩形框选 die，支持 Alt 增减选 |
| 高亮层 | `highlightLayer.isHighlight` | 按条件高亮 die，未高亮部分显示遮罩 |
| 缩放/平移 | `Config.zoomEnabled` | 构造函数参数，支持滚轮缩放和拖拽平移 |
| 旋转 | `rotate` / `setRotate()` | 旋转晶圆图 |
| 辅助线 | `SublinePlugin` | 行列线、同心圆、扇形分区 |
| 导出图片 | `toDataURL()` / `toBlob()` | 导出为 PNG/JPEG |

## 快速开始

```typescript
const container = document.getElementById('wafer-container')!;
// 容器必须有明确的 CSS 宽高
const waferMap = new WaferMap(container, { zoomEnabled: true });

waferMap.setOptions({
  type: 'dashboard',
  clip: true,
  wafer: { diameter: 300, margin: 3, notch: { direction: 'down' } },
  axis: { show: true, directionX: 'right', directionY: 'up' },
  center: { dieCountInReticle: { x: 1, y: 1 } },
  die: {
    width: 3.5,
    height: 4.2,
    bgColor: (item) => colorMap[item.k] || '#ccc',
    line: { show: true, width: 1, color: 'white' },
  },
  dataMap: { dieX: 'dieX', dieY: 'dieY', reticleX: 'rx', reticleY: 'ry' },
  data: dieDataArray,
});
```

## WaferMapOptions 配置速查

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `type` | `'dashboard' \| 'waferMap-config'` | `'dashboard'` | 渲染模式 |
| `padding` | `number` | `10` | 画布内边距（px） |
| `clip` | `boolean` | `true` | 是否裁剪圆外 die |
| `rotate` | `number` | `0` | 旋转角度（度） |
| `isSaveDiePos` | `boolean` | `false` | 保存 die 像素位置到数据项 |
| `resetZoom` | `boolean` | `false` | setOptions 时重置缩放 |
| `data` | `WaferMapDataItem[]` | — | die 数据（dashboard 模式必需） |
| `siteData` | `WaferMapSiteData[]` | — | site 数据（waferMap-config 模式可选） |
| `dataMap` | `Record<string, string>` | 见下方 | 数据字段名映射 |
| `dieRange` | `{ minX, minY, maxX, maxY }` | — | 限定渲染的 die 坐标范围 |
| `isDrawDataItem` | `(item) => boolean` | — | 自定义过滤条件 |
| `tooltip` | `boolean \| { render, debounce }` | `true` | tooltip 配置 |

### wafer 晶圆配置

```typescript
wafer: {
  show: true,
  diameter: 300,        // 晶圆直径（mm）
  margin: 3,            // 边距（mm）
  notch: {
    show: true,
    direction: 'down',  // 'up' | 'down' | 'left' | 'right'
    size: 10,
    bgColor: '#000',
  },
  inner: { show: true, line: { color: '#858585', width: 1 }, bgColor: '#ececec' },
  outer: { show: true, line: { color: '#858585', width: 1 }, bgColor: '#ececec' },
}
```

### axis 坐标轴

```typescript
axis: {
  show: true,
  directionX: 'right', // 'left' | 'right'
  directionY: 'up',    // 'up' | 'down'
  line: { width: 1, color: '#707070' },
  font: { fontSize: 10, color: '#000' },
}
```

### center 坐标系中心

```typescript
center: {
  die: { x: 0, y: 0 },                     // 中心 die 坐标
  dieOffset: { xLength: 0, yLength: 0 },    // die 中心偏移（mm）
  reticle: { x: 0, y: 0 },                  // 中心 reticle 坐标
  reticleOffset: { xLength: 0, yLength: 0 }, // reticle 中心偏移（mm）
  dieInReticle: { x: 0, y: 0 },             // reticle 内 die 起始索引
  dieCountInReticle: { x: 1, y: 1 },        // 每 reticle 包含的 die 数（x × y）
}
```

**Reticle 坐标计算规则**：当 `dieCountInReticle: { x: 3, y: 3 }` 时：
- Die (0,0) ~ (2,2) → Reticle (0,0)
- Die (3,0) ~ (5,2) → Reticle (1,0)
- Die (-3,-3) ~ (-1,-1) → Reticle (-1,-1)
- 公式：`reticleX = Math.floor(dieX / dieCountInReticle.x)`（对负数同样适用）

### die 芯片配置

```typescript
die: {
  show: true,
  width: 4,             // mm
  height: 4,            // mm
  margin: 0,            // die 间距
  bgColor: '#189A1F',   // 字符串 或 (item: WaferMapDataItem) => string
  line: {
    show: true,         // boolean | 'auto'（按缩放比例自动显隐）
    width: 2,
    color: '#3a3a3a',
    showByRatio: 0.5,   // 'auto' 模式触发比例
  },
  label: { show: false, fontSize: 6, color: '#000' },
}
```

### reticle 光罩配置

```typescript
reticle: {
  show: false,
  line: { width: 2, color: '#3a3a3a' },
  bgColor: '#fff',      // 字符串 或 (item: WaferMapDataItem) => string
  label: { show: false, fontSize: 16, color: '#000' },
  centerReticleLine: { show: false, width: 1, color: '#aaa' },
}
```

**注意**：`reticle.label` 仅在 `reticle.show: true` 时有效。数据中需要提供 `reticleLabel` 字段（或通过 `dataMap.reticleLabel` 映射）。

### dataMap 字段映射

后端数据字段名与标准字段不同时配置：

```typescript
dataMap: {
  dieX: 'dieX',             // 数据中 die X 坐标字段名
  dieY: 'dieY',
  reticleX: 'reticleX',
  reticleY: 'reticleY',
  dieLabel: 'dieLabel',
  reticleLabel: 'reticleLabel',
}
```

### WaferMapDataItem 数据格式

```typescript
interface WaferMapDataItem {
  dieX?: number;
  dieY?: number;
  reticleX?: number;
  reticleY?: number;
  dieLabel?: string | number;
  reticleLabel?: string | number;
  [key: string]: any;        // 携带任意业务数据（binType, color 等）
}
```

## 实例方法

### 渲染与配置

```typescript
waferMap.setOptions(options: WaferMapOptions)       // 设置配置并渲染（全量更新）
waferMap.resize(options?: WaferMapOptions)           // 响应容器尺寸变化
waferMap.resetZoom()                                 // 重置缩放到初始状态
waferMap.enableZoom(enabled: boolean)                // 启用/禁用滚轮缩放
waferMap.setRotate(degree: number)                   // 设置旋转角度
waferMap.getData(isCurrent?: boolean)                // 获取 die/reticle shape 数据
```

### 高亮与框选

```typescript
// 仅更新高亮/框选配置（比 setOptions 更轻量，不重绘底图）
waferMap.highlight({ highlightLayer?, brush? })

// 框选控制
waferMap.changeBrushEnabled(enabled?: boolean)       // 启用/禁用框选
waferMap.clearBrushedShapes()                        // 清除框选
```

### 事件监听

```typescript
// 返回 unsubscribe 函数，务必在组件卸载时调用
const unsubBrush = waferMap.onBrushChange(fn: (shapes?) => void)
const unsubClick = waferMap.onClickDie(fn, { native?: boolean })
```

### 导出与插件

```typescript
waferMap.toDataURL({ type?, quality? })              // 导出 DataURL
waferMap.toBlob({ type?, quality? })                 // 导出 Blob（Promise）
waferMap.getFinalCanvas()                            // 获取合成 Canvas 元素
waferMap.use(plugin: Plugin, options?)               // 注册插件（链式调用）
waferMap.destroy()                                   // 销毁实例，释放资源
```

### setOptions vs highlight — 何时用哪个

| 场景 | 推荐方法 | 原因 |
| --- | --- | --- |
| 修改 wafer/die/reticle/tooltip 等基础配置 | `setOptions()` | 需要完整重绘 |
| 仅更新 Legend 高亮 / 框选样式 | `highlight()` | 仅更新高亮层，不重绘底图，性能更好 |
| 首次渲染或数据变更 | `setOptions()` | 全量配置 |
| 动态切换框选启用/禁用 | `changeBrushEnabled()` | 独立控制，不触发重绘 |

## 框架集成

### React — 生产级模板

> 完整的带 Legend/Brush/Tooltip 综合模板见 [recipes.md](recipes.md#react-生产级组件模板)

```tsx
import { useRef, useEffect, useMemo } from 'react';
import WaferMap from '@guwave/wafermap-v2';
import '@guwave/wafermap-v2/style.css';
import type { WaferMapOptions } from '@guwave/wafermap-v2';

function WaferMapView({ options }: { options: WaferMapOptions }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<WaferMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const wm = new WaferMap(containerRef.current, { zoomEnabled: true });
    instanceRef.current = wm;

    const ro = new ResizeObserver(() => wm.resize());
    ro.observe(containerRef.current);

    const unsubBrush = wm.onBrushChange((shapes?: any[] | null) => {
      console.log('brushed:', shapes?.length ?? 0);
    });

    return () => {
      unsubBrush();
      ro.disconnect();
      wm.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setOptions(options);
  }, [options]);

  return <div ref={containerRef} style={{ width: '100%', height: 600 }} />;
}
```

**关键注意点**：
- 使用 `ResizeObserver` 监听容器尺寸变化并调用 `resize()`，比 `window.addEventListener('resize')` 更准确
- 事件订阅（`onBrushChange` / `onClickDie`）放在创建实例的 effect 中，**一次订阅即可**
- 所有 `onXxx` 返回的 unsubscribe 函数必须在 cleanup 中调用
- `options` 对象用 `useMemo` 构建以避免不必要的重渲染

### Vue 3 — 生产级模板

> 完整的带 Legend/Brush/Tooltip 综合模板见 [recipes.md](recipes.md#vue3-生产级组件模板)

```vue
<template>
  <div ref="containerRef" style="width: 100%; height: 600px" />
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import WaferMap from '@guwave/wafermap-v2';
import '@guwave/wafermap-v2/style.css';
import type { WaferMapOptions } from '@guwave/wafermap-v2';

const props = defineProps<{ options: WaferMapOptions }>();
const emit = defineEmits<{ brushChange: [count: number] }>();

const containerRef = ref<HTMLElement>();
let instance: WaferMap | null = null;
let unsubBrush: (() => void) | null = null;
let ro: ResizeObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  instance = new WaferMap(containerRef.value, { zoomEnabled: true });

  ro = new ResizeObserver(() => instance?.resize());
  ro.observe(containerRef.value);

  unsubBrush = instance.onBrushChange((shapes?: any[] | null) => {
    emit('brushChange', shapes?.length ?? 0);
  });

  instance.setOptions(props.options);
});

watch(() => props.options, (opts) => {
  if (opts) instance?.setOptions(opts);
}, { deep: true });

onUnmounted(() => {
  unsubBrush?.();
  ro?.disconnect();
  instance?.destroy();
  instance = null;
});
</script>
```

**关键注意点**：
- 使用 `ResizeObserver` 替代 `window.addEventListener('resize')`
- 事件订阅在 `onMounted` 中一次完成，取消订阅在 `onUnmounted` 中调用
- 使用 `watch` + `deep: true` 监听 `options` 变化，触发 `setOptions` 重绘
- 建议用 `computed` 构建 `options` 对象，确保引用稳定（减少不必要的 `setOptions` 调用）

## 场景示例

### 1. BinMap — 按 Bin 着色

```typescript
const colorMap: Record<string, string> = {
  'P-HBIN1-HBin1': '#34AA0C',
  'F-HBIN2-HBin2': '#ff600d',
  'F-HBIN4-HBin4': '#d254a5',
};

waferMap.setOptions({
  type: 'dashboard',
  clip: true,
  wafer: { diameter: 300, margin: 3, notch: { direction: 'down' } },
  axis: { show: true, directionX: 'right', directionY: 'up' },
  center: { dieCountInReticle: { x: 1, y: 1 } },
  die: {
    width: 0.82,
    height: 0.91,
    bgColor: (item) => colorMap[item.k] || '#eee',
    line: { show: true, width: 1, color: 'white' },
  },
  grid: { show: true },
  dataMap: { dieX: 'dieX', dieY: 'dieY', reticleX: 'rx', reticleY: 'ry' },
  tooltip: true,
  data: binData,
});
```

### 2. 含 Reticle 的晶圆图

```typescript
waferMap.setOptions({
  clip: false,
  wafer: { diameter: 26, margin: 2, notch: { direction: 'down' } },
  axis: { show: true, directionX: 'right', directionY: 'up' },
  center: {
    dieOffset: { xLength: 2, yLength: 3 },
    dieInReticle: { x: 1, y: 2 },
    dieCountInReticle: { x: 2, y: 3 },
  },
  die: { width: 4, height: 4, line: { show: true, width: 1 } },
  reticle: { show: true, line: { width: 4 }, label: { show: true } },
  dataMap: { reticleLabel: 'site' },
  data: [
    { reticleX: 0, reticleY: 0, dieX: 0, dieY: 0 },
    { reticleX: 0, reticleY: 0, dieX: 0, dieY: 1 },
    { reticleX: 0, reticleY: 0, dieX: 1, dieY: 0, site: 'A1' },
    { reticleX: 1, reticleY: 0, dieX: 2, dieY: 0 },
  ],
});
```

### 3. waferMap-config 模式（自动生成）

```typescript
waferMap.setOptions({
  type: 'waferMap-config',
  wafer: { diameter: 100, margin: 2, notch: { direction: 'down' } },
  axis: { show: true, directionX: 'right', directionY: 'up' },
  center: {
    dieCountInReticle: { x: 2, y: 3 },
  },
  die: { width: 4, height: 4 },
  siteData: [
    { reticleX: 1, reticleY: 1, reticleLabel: 'S1' },
    { reticleX: 2, reticleY: 1, reticleLabel: 'S2' },
  ],
});
```

### 4. 高亮与框选

> ⛔ **圈选高亮状态与 Legend 高亮状态互斥**，详见 [关键规则](#⛔-关键规则圈选高亮与-legend-高亮互斥)。
> 完整的框选生命周期管理和 Legend 高亮模式详见 [recipes.md](recipes.md)

框选配置（`brush`）和 Legend 配置（`highlightLayer`）可以共存于同一个 `options` 中，但它们的**高亮状态互斥**：
- 当用户通过 Brush 选中了 die → Legend 应自动重置为全选（`highlightLayer: undefined`）
- 当用户切换 Legend（部分 Bin 取消勾选）→ Brush 选中的 die 应被自动清空

```typescript
waferMap.setOptions({
  // ...基础 wafer/die/center 配置
  brush: {
    needBrushHighlight: true,
    supportAltSelected: true,
    styleOptions: {
      area: {
        line: { width: 1, color: 'rgba(93,45,205,1)' },
        bgColor: 'rgba(93,45,205,0.25)',
      },
    },
  },
  // ⛔ highlightLayer 根据 Legend 状态动态设置：
  //    全选时为 undefined（此时 Brush 选中高亮可正常生效）
  //    部分选中时配置 isHighlight（此时 Brush 选中应已被清空）
  highlightLayer: allBinsActive
    ? undefined
    : {
        show: true,
        maskBgColor: 'rgba(255,255,255,0.725)',
        isHighlight: ({ shape }) =>
          activeBins[shape.data.k]
            ? { die: { bgColor: colorMap[shape.data.k] } }
            : undefined,
      },
  data: dieData,
});

waferMap.changeBrushEnabled(true);

// ⛔ 在 onBrushChange 回调中实现互斥：用户框选产生结果时重置 Legend
const unsubBrush = waferMap.onBrushChange((shapes) => {
  if (shapes && shapes.length > 0) {
    // 重置 Legend 为全选，使 highlightLayer 变为 undefined
    resetLegendToDefault();
  }
});
```

**框选配置 vs 启用/禁用**：
- `setOptions({ brush: { ... } })` — 配置框选行为和样式
- `changeBrushEnabled(true/false)` — 运行时启用/禁用框选（不触发重绘）
- `clearBrushedShapes()` — 清除当前选中状态

### 5. 导出图片

```typescript
const dataUrl = waferMap.toDataURL({ type: 'image/png' });

const blob = await waferMap.toBlob({ type: 'image/jpeg', quality: 0.9 });
if (blob) {
  const url = URL.createObjectURL(blob);
  // 下载或展示
}
```

## SublinePlugin 辅助线

```typescript
import { SublinePlugin } from '@guwave/wafermap-v2';

const waferMap = new WaferMap(container);
waferMap.use(new SublinePlugin());
waferMap.setOptions(options);

waferMap.subline.setSubline({
  row: { enable: true, count: 8 },
  col: { enable: true, count: 8 },
  circle: { enable: true, count: 3, splitType: 'RADIUS' }, // 'RADIUS' | 'AREA'
  sector: { enable: true, count: 6 },
  style: { color: '#999', lineWidth: 1, lineType: 'dashed' },
});
```

- 调用路径是 `waferMap.subline.setSubline(...)`，不是 `waferMap.setSubline(...)`
- 使用 subline 时，建议在 `setOptions` 中开启 `isSaveDiePos: true`（插件依赖该信息）
- **row / col**：水平行线 / 垂直列线，等分晶圆区域
- **circle**：同心圆，`RADIUS` 等分半径 / `AREA` 等分面积
- **sector**：扇形分区线
- **Ctrl/Alt + 双击**：选中区域内所有 die

## 颜色工具

```typescript
import {
  getColorByPFBinNum,
  getColorByPFBinNumV2,
  BinPFTypeEnum,
  makeColorBlockColors,
  BIN_PF_MAP_COLORS,
} from '@guwave/wafermap-v2/utils';

// 按 P/F 和 BinNumber 获取颜色
getColorByPFBinNum(BinPFTypeEnum.PASS, 1);  // '#34AA0C'
getColorByPFBinNum(BinPFTypeEnum.FAIL, 3);  // '#feed11'

// 生成连续色阶（可选 schema）
const { colorGroupArrayHex } = makeColorBlockColors(10, 'red_green');
// colorSchema: 'red_green' | 'green_red' | 'lightGreen_paleGreen' |
//   'paleGreen_lightGreen' | 'lightRed_paleRed' | 'paleRed_lightRed' |
//   'red_green_blue' | 'blue_green_yellow'
```

## 常见陷阱与注意事项

### 必须遵守

- 容器元素**必须有明确的 CSS 宽高**，WaferMap 自动适配容器大小
- 销毁前调用 `onClickDie`/`onBrushChange` 返回的取消函数移除监听
- 调用 `destroy()` 释放 Canvas 和事件资源

### 性能优化

- `data` 数组量大时不要频繁深拷贝，组件已优化大数据处理
- `die.line.show: 'auto'` 在缩放较小时自动隐藏边框线以提升性能
- 仅更新高亮时使用 `highlight()` 而非 `setOptions()`，避免不必要的底图重绘
- 使用 `ResizeObserver` 替代 `window.addEventListener('resize')`
- React 中用 `useMemo` 构建 `options`，Vue3 中用 `computed` 构建 `options`，避免不必要的 `setOptions` 调用

### TypeScript 类型注意

- `onBrushChange` 回调签名为 `(shapes?: any[] | null) => void`，参数可能为 `null`，需用 `shapes?.length ?? 0` 安全访问
- 使用 `as const` 定义 Bin 颜色等常量数组时，循环赋值需显式标注联合类型：`let bin: (typeof BIN_DEFS)[number] = BIN_DEFS[0]`
- `die.bgColor` 函数中的 `item` 是 `WaferMapDataItem` 类型，业务字段通过 `item.xxx` 动态访问（`[key: string]: any`）

### ⛔ 高亮互斥（强制规则）

- **圈选高亮状态与 Legend 高亮状态不能同时存在**
- Legend 状态变更 → 清空 Brush 选中的 die（`clearBrushedShapes()`），**不关闭**框选功能开关
- Brush 实际选中 die（`onBrushChange` 收到有效 shapes）→ 重置 Legend 为默认全选（`highlightLayer: undefined`）
- "启用/禁用框选开关"本身**不触发** Legend 重置；"Legend 变更"本身**不关闭**框选开关
- 详见 [关键规则](#⛔-关键规则圈选高亮与-legend-高亮互斥) 和 [recipes.md](recipes.md#高亮互斥实现模式)

### 框选相关

- `setOptions({ brush })` 仅定义框选的**配置和样式**，不会自动启用框选
- 需要额外调用 `changeBrushEnabled(true)` 来**启用**框选功能
- 禁用框选时建议同时调用 `clearBrushedShapes()` 清除已选状态
- `supportAltSelected: true` 允许用户按住 Alt 键进行增选/减选

### Reticle 相关

- `reticle.label` 仅在 `reticle.show: true` 时可见
- 数据中需要提供 `reticleLabel` 字段（或通过 `dataMap.reticleLabel` 映射到实际字段名）
- `clip: false` 时边缘 reticle 会完整显示（超出晶圆圆边界的部分也会渲染）

## 详细类型参考

完整 TypeScript 类型定义见 [reference.md](reference.md)
