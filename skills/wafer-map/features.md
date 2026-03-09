# @guwave/wafermap-v2 已支持特性

本文档列出所有已验证可用的特性、其关键配置项、以及特性间的组合使用方式。

## 特性矩阵

| # | 特性 | 配置层级 | 状态 |
| --- | --- | --- | --- |
| 1 | [Notch 方向](#1-notch-方向) | `wafer.notch.direction` | ✅ 已验证 |
| 2 | [Die 着色（函数/静态）](#2-die-着色) | `die.bgColor` | ✅ 已验证 |
| 3 | [Die 描边](#3-die-描边) | `die.line` | ✅ 已验证 |
| 4 | [Die 标签](#4-die-标签) | `die.label` | ✅ 已验证 |
| 5 | [Reticle 显示与描边](#5-reticle-显示与描边) | `reticle.show` + `reticle.line` | ✅ 已验证 |
| 6 | [Reticle Site 标签](#6-reticle-site-标签) | `reticle.label` | ✅ 已验证 |
| 7 | [裁剪/完整显示](#7-裁剪完整显示) | `clip` | ✅ 已验证 |
| 8 | [自定义 Tooltip](#8-自定义-tooltip) | `tooltip.render` | ✅ 已验证 |
| 9 | [框选 Brush](#9-框选-brush) | `brush` + `changeBrushEnabled()` | ✅ 已验证 |
| 10 | [Alt 增减选](#10-alt-增减选) | `brush.supportAltSelected` | ✅ 已验证 |
| 11 | [高亮层 / Color By Legend](#11-高亮层--color-by-legend) | `highlightLayer` | ✅ 已验证 |
| 12 | [坐标轴](#12-坐标轴) | `axis` | ✅ 已验证 |
| 13 | [缩放与平移](#13-缩放与平移) | `Config.zoomEnabled` | ✅ 已验证 |
| 14 | [旋转](#14-旋转) | `rotate` / `setRotate()` | ✅ API 可用 |
| 15 | [辅助线 SublinePlugin](#15-辅助线-sublineplugin) | `SublinePlugin` | ✅ API 可用 |
| 16 | [导出图片](#16-导出图片) | `toDataURL()` / `toBlob()` | ✅ API 可用 |
| 17 | [数据过滤](#17-数据过滤) | `isDrawDataItem` / `dieRange` | ✅ API 可用 |
| 18 | [Die 点击事件](#18-die-点击事件) | `onClickDie()` | ✅ API 可用 |
| 19 | [waferMap-config 自动生成模式](#19-wafermap-config-模式) | `type: 'waferMap-config'` | ✅ 已验证 |

---

## 各特性详解

### 1. Notch 方向

晶圆缺口（Notch）方向，用于标识晶圆物理方位。

```typescript
wafer: {
  notch: {
    show: true,
    direction: 'down',  // 'up' | 'down' | 'left' | 'right'
    size: 10,           // Notch 大小（px）
    bgColor: '#000',    // Notch 颜色
  },
}
```

**动态切换**：修改 `notch.direction` 后调用 `setOptions()` 即可实时切换方向。

### 2. Die 着色

每个 Die 的背景颜色，支持静态颜色或根据数据动态计算。

```typescript
die: {
  // 方式 1：静态颜色
  bgColor: '#189A1F',

  // 方式 2：函数着色（推荐，可根据业务数据动态计算）
  bgColor: (item: WaferMapDataItem) => {
    return colorMap[item.k] || '#ccc';
  },
}
```

**典型场景**：BinMap 按 Bin 类型着色、Parametric Map 按参数值色阶着色。

### 3. Die 描边

控制 Die 之间的边框线显示。

```typescript
die: {
  line: {
    show: true,       // boolean | 'auto'
    width: 1,         // 线宽（px）
    color: '#ffffff',  // 线颜色
    showByRatio: 0.5, // 仅 'auto' 模式下，缩放比例低于此值时隐藏描边
  },
}
```

**`show: 'auto'`**：大数据量下推荐使用。缩放级别较小时自动隐藏描边以提升渲染性能，放大到一定比例后自动显示。

### 4. Die 标签

在每个 Die 上显示文字标签。

```typescript
die: {
  label: {
    show: true,       // boolean | 'auto'
    fontSize: 6,      // 字号
    color: '#000',    // 字体颜色
  },
}
// 数据中通过 dieLabel 字段（或 dataMap.dieLabel 映射）提供标签文本
```

### 5. Reticle 显示与描边

显示 Reticle（光罩）区域边界。

```typescript
reticle: {
  show: true,         // 开启 Reticle 边界显示
  line: {
    width: 2,         // 边框宽度
    color: '#3a3a3a', // 边框颜色
  },
  centerReticleLine: {
    show: false,      // 显示中心 Reticle 的特殊标记线
    width: 1,
    color: '#aaa',
  },
}
// 需配合 center.dieCountInReticle 使用
```

**前提**：数据中的 `reticleX` / `reticleY` 字段必须正确，且 `center.dieCountInReticle` 需要设置为实际的每 Reticle Die 数量。

### 6. Reticle Site 标签

在 Reticle 区域内显示标签文字。

```typescript
reticle: {
  show: true,          // 必须先开启 Reticle 显示
  label: {
    show: true,        // 开启 Site 标签
    fontSize: 16,      // 标签字号
    color: '#000',     // 标签颜色
  },
}
// 数据中通过 reticleLabel 字段提供标签文本，如 'R(0,0)'、'S1' 等
```

**注意**：`reticle.label` 仅在 `reticle.show: true` 时可见。

### 7. 裁剪/完整显示

控制晶圆圆边界外的 Die 是否显示。

```typescript
// 裁剪模式（默认）：仅显示圆内的 Die
clip: true,

// 完整模式：圆边界外的 Die 也会显示
clip: false,
```

**视觉效果**：
- `clip: true` → 晶圆呈圆形，边缘 Die 被裁剪
- `clip: false` → 边缘 Reticle 完整显示，晶圆呈现为"方形边缘"

### 8. 自定义 Tooltip

自定义鼠标悬停时显示的提示框内容。

```typescript
// 禁用
tooltip: false,

// 默认（显示 die 所有数据字段）
tooltip: true,

// 自定义 HTML 内容
tooltip: {
  render: ({ data, reticleData, event }) => {
    return `<div><b>Die:</b> (${data.dieX}, ${data.dieY})</div>`;
  },
  debounce: 50,  // 可选：防抖延迟（ms）
},
```

> 详细自定义模式见 [recipes.md](recipes.md#自定义-tooltip-渲染)

### 9. 框选 Brush

矩形框选 Die，获取选中的 Die 列表。

```typescript
// 配置（在 setOptions 中）
brush: {
  needBrushHighlight: true,    // 框选后高亮选中的 die
  supportAltSelected: false,   // 是否支持 Alt 增减选
  styleOptions: {
    area: {
      line: { width: 1, color: 'rgba(93,45,205,1)' },
      bgColor: 'rgba(93,45,205,0.25)',
    },
  },
},

// 启用/禁用（独立控制）
waferMap.changeBrushEnabled(true);
waferMap.changeBrushEnabled(false);

// 监听选中变化
const unsub = waferMap.onBrushChange((shapes) => { ... });

// 清除选中
waferMap.clearBrushedShapes();
```

**重要**：
- `setOptions({ brush })` 仅定义配置，需额外调用 `changeBrushEnabled(true)` 才能启用框选。
- ⛔ Brush 实际选中 die 时会重置 Legend 为全选；Legend 变更时会清空 Brush 选中的 die。见 [高亮互斥规则](#高亮互斥规则强制)。

### 10. Alt 增减选

在框选模式下，按住 Alt 键可以进行增量选择（添加新选区）或减量选择（移除已选区域）。

```typescript
brush: {
  needBrushHighlight: true,
  supportAltSelected: true,  // 开启 Alt 增减选
},
```

**操作方式**：
- 普通框选：替换当前选区
- Alt + 框选：在已有选区基础上增加/减少

### 11. 高亮层 / Color By Legend

按条件高亮特定 Die，未高亮的 Die 被半透明遮罩覆盖。

```typescript
highlightLayer: {
  show: true,
  maskBgColor: 'rgba(255,255,255,0.725)',  // 遮罩颜色
  isHighlight: ({ shape }) => {
    if (shape.data.binType === 'P') {
      return { die: { bgColor: '#34AA0C' } };  // 高亮
    }
    return undefined;  // 不高亮 → 被遮罩
  },
},
```

> 详细 Legend 交互模式见 [recipes.md](recipes.md#color-by--legend-高亮)

⛔ **Legend 高亮状态与圈选高亮状态互斥**：Legend 变更时清空 Brush 选中 die；Brush 选中 die 时重置 Legend 为全选。见 [高亮互斥规则](#高亮互斥规则强制)。

### 12. 坐标轴

显示 Die 坐标轴刻度。

```typescript
axis: {
  show: true,
  directionX: 'right',  // X 轴正方向
  directionY: 'up',     // Y 轴正方向
  line: { width: 1, color: '#707070' },
  font: { fontSize: 10, color: '#000' },
}
```

### 13. 缩放与平移

鼠标滚轮缩放、拖拽平移。

```typescript
// 在构造函数中启用（默认 true）
const wm = new WaferMap(container, { zoomEnabled: true });

// 运行时控制
wm.enableZoom(false);  // 禁用缩放
wm.resetZoom();        // 重置到初始视角
```

### 14. 旋转

旋转整个晶圆图。

```typescript
// 方式 1：在 options 中设置
waferMap.setOptions({ rotate: 90 });

// 方式 2：动态设置
waferMap.setRotate(45);
```

### 15. 辅助线 SublinePlugin

在晶圆图上叠加辅助线（行列等分线、同心圆、扇形分区）。

```typescript
import { SublinePlugin } from '@guwave/wafermap-v2';

const wm = new WaferMap(container);
wm.use(new SublinePlugin());
wm.setOptions({ ...options, isSaveDiePos: true });

wm.subline.setSubline({
  row: { enable: true, count: 8 },
  col: { enable: true, count: 8 },
  circle: { enable: true, count: 3, splitType: 'RADIUS' },
  sector: { enable: true, count: 6 },
  style: { color: '#999', lineWidth: 1, lineType: 'dashed' },
});
```

**Ctrl/Alt + 双击**：可选中辅助线区域内的所有 Die。

### 16. 导出图片

将当前晶圆图导出为图片。

```typescript
// 导出为 Data URL
const dataUrl = waferMap.toDataURL({ type: 'image/png' });

// 导出为 Blob
const blob = await waferMap.toBlob({ type: 'image/jpeg', quality: 0.9 });
```

### 17. 数据过滤

限制渲染的 Die 范围或按条件过滤。

```typescript
// 方式 1：坐标范围限制
dieRange: { minX: -10, minY: -10, maxX: 10, maxY: 10 },

// 方式 2：自定义过滤函数
isDrawDataItem: (item) => item.binType === 'F',  // 仅渲染 Fail 的 die
```

### 18. Die 点击事件

监听 Die 点击。

```typescript
const unsub = waferMap.onClickDie(
  (item) => {
    console.log('clicked die:', item);
    return true;  // 返回 true 阻止默认行为
  },
  { native: false },
);

// 清理
unsub();
```

### 19. waferMap-config 模式

不提供 `data` 数组，组件根据晶圆参数自动生成圆内所有 Die。

```typescript
waferMap.setOptions({
  type: 'waferMap-config',
  wafer: { diameter: 100, margin: 2 },
  die: { width: 4, height: 4 },
  center: { dieCountInReticle: { x: 2, y: 3 } },
  siteData: [
    { reticleX: 1, reticleY: 1, reticleLabel: 'S1' },
  ],
});
```

**适用场景**：快速预览晶圆布局，无需提供具体 Die 数据。

---

## 特性组合指南

### 常见组合

| 组合 | 配置要点 |
| --- | --- |
| BinMap + Legend 高亮 | `die.bgColor` 函数着色 + `highlightLayer.isHighlight` 按 Bin 类型过滤 |
| Reticle + Site 标签 | `reticle.show: true` + `reticle.label.show: true` + 数据含 `reticleLabel` 字段 |
| ⛔ 框选高亮状态 + Legend 高亮状态 | **高亮状态互斥。** 配置可共存，但 Brush 选中 die 时自动重置 Legend 为全选；Legend 变更时自动清空 Brush 选中 die。框选开关本身不受 Legend 影响。见 [高亮互斥规则](#高亮互斥规则强制) |
| 裁剪 + Reticle | `clip: false` 可查看完整 Reticle 布局，`clip: true` 仅显示圆内部分 |
| 自定义 Tooltip + 框选 | 两者独立，框选不影响 Tooltip 显示 |
| Die 描边 auto + 大数据 | `die.line.show: 'auto'` 在缩放较小时自动隐藏描边提升性能 |

### 互斥/冲突说明

| 情况 | 说明 |
| --- | --- |
| ⛔ **圈选高亮状态与 Legend 高亮状态互斥** | 两者的**高亮状态**不能同时存在。Legend 变更时清空 Brush 选中的 die（不关闭框选开关）；Brush 实际选中 die 时重置 Legend 为默认全选。详见 [高亮互斥规则](#高亮互斥规则强制) |
| `reticle.label` 需要 `reticle.show: true` | label 依赖 reticle 渲染层，reticle 关闭时 label 不显示 |
| `tooltip: false` 禁用所有 tooltip | 即使配置了 `render`，`tooltip: false` 也会全部禁用 |
| `type: 'waferMap-config'` 不使用 `data` | 该模式自动生成数据，传入 `data` 会被忽略 |
| `setOptions` 与 `highlight` | 先 `setOptions` 再 `highlight`，反过来 highlight 可能被覆盖 |

### 高亮互斥规则（强制）

> ⛔ **此规则为强制约束，所有使用 WaferMap 高亮功能的代码必须遵守。**

圈选高亮（Brush Highlight）和 Legend 高亮（Color By Highlight）的**高亮状态互斥**：

| 用户动作 | 正确做法 | 错误做法 |
| --- | --- | --- |
| 用户切换 Legend（勾选/取消某些 Bin） | 调用 `clearBrushedShapes()` 清空 Brush 选中的 die，**保持框选开关不变** | 同时保留 Brush 选中状态和 Legend 高亮 |
| 用户框选产生结果（`onBrushChange` 收到有效 shapes） | 重置 Legend 为全选（`highlightLayer: undefined`） | 同时保留 Legend 过滤和 Brush 选中高亮 |
| 用户启用/禁用框选开关 | 无需操作 Legend | 启用框选时重置 Legend（不需要） |
| 所有 Legend 项均为选中状态 | `highlightLayer: undefined`，Brush 可自由使用 | — |

**关键区分**：
- **"Legend 变更"** → 清空 Brush 选中 die，但**不关闭**框选功能开关（`changeBrushEnabled` 保持不变）
- **"Brush 实际选中 die"**（用户框选动作）→ 重置 Legend，但**不是"启用框选开关"**这个动作
- 框选功能开关（`changeBrushEnabled`）和 Legend 状态是**独立**的，互斥的是它们的**高亮结果**

**为什么互斥**：两种高亮机制都通过 `highlightLayer` 控制 die 的可见/高亮状态。同时存在时，框选高亮和 Legend 过滤高亮会争抢对 `highlightLayer` 的控制权，导致：
- 视觉不一致（选中的 die 被 Legend 遮罩，或 Legend 过滤被框选覆盖）
- 状态不可预测（用户难以理解当前的高亮来源）

**实现参考**：
- 完整代码见 [react-demo.tsx](react-example/react-demo.tsx) 中的 `toggleBin` 函数和 `onBrushChange` 回调
- React/Vue3 模式见 [recipes.md](../recipes.md#高亮互斥实现模式)
