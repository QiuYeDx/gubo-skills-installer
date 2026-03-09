# @guwave/wafermap-v2 实用代码模式

本文档基于实际项目开发经验，提供可直接复用的代码模式和最佳实践。所有模式均同时覆盖 React 和 Vue3。

## 目录

1. [生成晶圆模拟数据](#生成晶圆模拟数据)
2. [自定义 Tooltip 渲染](#自定义-tooltip-渲染)
3. [Color By / Legend 高亮](#color-by--legend-高亮)
4. [框选生命周期管理](#框选生命周期管理)
5. [⛔ 高亮互斥实现模式](#高亮互斥实现模式)
6. [框架集成生产级模板](#框架集成生产级模板)
7. [动态更新最佳实践](#动态更新最佳实践)
8. [TypeScript 常见类型问题](#typescript-常见类型问题)

---

## 生成晶圆模拟数据

### Reticle 坐标计算

当 `dieCountInReticle = { x: 3, y: 3 }` 时，每个 Reticle 包含 3×3 = 9 个 Die。

**Die 坐标 → Reticle 坐标**（`Math.floor` 对正负数均正确）：

```typescript
const dieCountInReticle = { x: 3, y: 3 };

// Die → Reticle 坐标
const reticleX = Math.floor(dieX / dieCountInReticle.x);
const reticleY = Math.floor(dieY / dieCountInReticle.y);

// 验证：
// dieX=0  → reticleX=0,  dieX=2  → reticleX=0
// dieX=3  → reticleX=1,  dieX=5  → reticleX=1
// dieX=-1 → reticleX=-1, dieX=-3 → reticleX=-1
```

### Die 在 Reticle 内的位置与 Site 索引

```typescript
// Die 在所属 Reticle 内的局部坐标（0-indexed），需处理负数取模
const dieInReticleX = ((dieX % dieCountInReticle.x) + dieCountInReticle.x) % dieCountInReticle.x;
const dieInReticleY = ((dieY % dieCountInReticle.y) + dieCountInReticle.y) % dieCountInReticle.y;

// Site 编号（1-indexed）
const siteIndex = dieInReticleY * dieCountInReticle.x + dieInReticleX + 1;
// dieCountInReticle={x:3,y:3} 时，siteIndex 范围为 1~9
```

### 完整数据生成函数

```typescript
import type { WaferMapDataItem } from '@guwave/wafermap-v2';

interface BinDef {
  key: string;
  binType: string;
  binNum: number;
  color: string;
  weight: number;  // 权重（所有权重之和应为 1）
}

// 确定性随机数生成器（保证每次结果一致）
function createSeededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function generateWaferData(params: {
  diameter: number;            // 晶圆直径 mm
  margin: number;              // 边距 mm
  dieWidth: number;            // Die 宽 mm
  dieHeight: number;           // Die 高 mm
  dieCountInReticle: { x: number; y: number };
  bins: BinDef[];
  seed?: number;
}): WaferMapDataItem[] {
  const { diameter, margin, dieWidth, dieHeight, dieCountInReticle, bins, seed = 42 } = params;
  const radius = (diameter - margin * 2) / 2;
  const maxD = Math.ceil(radius / Math.min(dieWidth, dieHeight));
  const rand = createSeededRandom(seed);
  const data: WaferMapDataItem[] = [];

  for (let x = -maxD; x <= maxD; x++) {
    for (let y = -maxD; y <= maxD; y++) {
      const cx = (x + 0.5) * dieWidth;
      const cy = (y + 0.5) * dieHeight;
      if (cx * cx + cy * cy > radius * radius) continue;

      const r = rand();
      let cum = 0;
      let bin: BinDef = bins[0];
      for (const b of bins) {
        cum += b.weight;
        if (r < cum) { bin = b; break; }
      }

      const rx = Math.floor(x / dieCountInReticle.x);
      const ry = Math.floor(y / dieCountInReticle.y);

      const dieInRx = ((x % dieCountInReticle.x) + dieCountInReticle.x) % dieCountInReticle.x;
      const dieInRy = ((y % dieCountInReticle.y) + dieCountInReticle.y) % dieCountInReticle.y;
      const siteIdx = dieInRy * dieCountInReticle.x + dieInRx + 1;

      data.push({
        dieX: x,
        dieY: y,
        reticleX: rx,
        reticleY: ry,
        binType: bin.binType,
        binNum: bin.binNum,
        k: bin.key,
        site: `S${siteIdx}`,
        reticleLabel: `R(${rx},${ry})`,
      });
    }
  }
  return data;
}
```

**使用示例**：

```typescript
const bins: BinDef[] = [
  { key: 'P-1', binType: 'P', binNum: 1, color: '#34AA0C', weight: 0.82 },
  { key: 'F-2', binType: 'F', binNum: 2, color: '#ff600d', weight: 0.07 },
  { key: 'F-3', binType: 'F', binNum: 3, color: '#feed11', weight: 0.06 },
  { key: 'F-4', binType: 'F', binNum: 4, color: '#d254a5', weight: 0.05 },
];

const data = generateWaferData({
  diameter: 300, margin: 3,
  dieWidth: 5, dieHeight: 5,
  dieCountInReticle: { x: 3, y: 3 },
  bins,
});
// 300mm wafer, 5×5mm die → 约 2700 个 die
```

### Die 数量估算

给定晶圆参数，可以预估 die 数量：

```
有效半径 = (diameter - margin × 2) / 2
近似 die 数 ≈ π × (有效半径 / dieWidth) × (有效半径 / dieHeight)
```

| 直径 | Die 尺寸 | 约 Die 数 |
| --- | --- | --- |
| 300mm | 5×5mm | ~2,700 |
| 300mm | 3×3mm | ~7,500 |
| 300mm | 1×1mm | ~68,000 |
| 200mm | 5×5mm | ~1,100 |

---

## 自定义 Tooltip 渲染

### 基本自定义（HTML 字符串）

```typescript
tooltip: {
  render: ({ data }) => {
    return `
      <div style="padding: 4px 0">
        <div><b>Die:</b> (${data.dieX}, ${data.dieY})</div>
        <div><b>Bin:</b> ${data.binType === 'P' ? 'Pass' : 'Fail'} - ${data.binNum}</div>
      </div>
    `;
  },
},
```

### 动态字段选择

允许用户通过 UI 控制 tooltip 中显示哪些字段：

```typescript
const tooltipFields: Record<string, boolean> = {
  dieX: true, dieY: true,
  reticleX: false, reticleY: false,
  binType: true, binNum: true,
  binName: false, site: false,
};

function buildTooltipRender(fields: Record<string, boolean>) {
  return ({ data }: { data: WaferMapDataItem }) => {
    const lines: string[] = [];
    if (fields.dieX) lines.push(`<b>Die X:</b> ${data.dieX}`);
    if (fields.dieY) lines.push(`<b>Die Y:</b> ${data.dieY}`);
    if (fields.reticleX) lines.push(`<b>Reticle X:</b> ${data.reticleX}`);
    if (fields.reticleY) lines.push(`<b>Reticle Y:</b> ${data.reticleY}`);
    if (fields.binType) lines.push(`<b>Bin Type:</b> ${data.binType === 'P' ? 'Pass' : 'Fail'}`);
    if (fields.binNum) lines.push(`<b>Bin Num:</b> ${data.binNum}`);
    if (fields.binName) lines.push(`<b>Bin Name:</b> ${data.binName}`);
    if (fields.site) lines.push(`<b>Site:</b> ${data.site}`);
    if (lines.length === 0) lines.push('<i style="color:#999">No fields selected</i>');
    return lines.map(l => `<div style="padding:1px 0">${l}</div>`).join('');
  };
}
```

**框架中的引用稳定性**：
- **React**：用 `useCallback` 或在 `useMemo` 的 options 中直接内联构建
- **Vue3**：在 `computed` 中构建 options 时直接内联，或用普通函数（Vue 的响应式系统不依赖引用等价性）

### Tooltip 返回 HTMLElement

```typescript
tooltip: {
  render: ({ data, event }) => {
    const el = document.createElement('div');
    el.style.cssText = 'padding: 8px; font-size: 12px;';
    el.innerHTML = `<strong>(${data.dieX}, ${data.dieY})</strong>`;
    return el;
  },
},
```

---

## Color By / Legend 高亮

> ⛔ **Legend 高亮状态与圈选高亮状态互斥**：Legend 变更时清空 Brush 选中 die（不关闭框选开关）；Brush 选中 die 时重置 Legend 为全选。见 [高亮互斥实现模式](#高亮互斥实现模式)。

使用 `highlightLayer` 实现按 Bin 类型过滤显示（Legend 交互）。

### 核心原理

- `highlightLayer.show = true` 时，所有 die 先被 `maskBgColor` 遮罩
- `isHighlight` 对每个 die 调用：返回样式对象则高亮该 die，返回 `undefined` 则保持遮罩
- 当所有 Bin 类型都选中时，设置 `highlightLayer: undefined` 关闭遮罩层以获得最佳性能

### 实现模式（框架无关）

```typescript
// Bin 定义和颜色映射
const BIN_DEFS = [
  { key: 'P-1', color: '#34AA0C', label: 'Pass - HBin1' },
  { key: 'F-2', color: '#ff600d', label: 'Fail - HBin2' },
  { key: 'F-3', color: '#feed11', label: 'Fail - HBin3' },
];
const colorMap = Object.fromEntries(BIN_DEFS.map(b => [b.key, b.color]));

// 用户选中状态（Legend 复选框）
const activeBins: Record<string, boolean> = { 'P-1': true, 'F-2': true, 'F-3': false };
const allActive = Object.values(activeBins).every(Boolean);

// 构建 highlightLayer 配置
const highlightLayer = allActive
  ? undefined
  : {
      show: true,
      maskBgColor: 'rgba(255,255,255,0.725)',
      isHighlight: ({ shape }: { shape: { data: WaferMapDataItem } }) => {
        const binKey = `${shape.data.binType}-${shape.data.binNum}`;
        if (activeBins[binKey]) {
          return { die: { bgColor: colorMap[binKey] } };
        }
        return undefined;
      },
    };

waferMap.setOptions({ ...otherOptions, highlightLayer });
```

### 高频更新优化

Legend 切换频率较高时，使用 `highlight()` 替代 `setOptions()` 避免底图重绘：

```typescript
waferMap.highlight({
  highlightLayer: allActive
    ? { show: false, maskBgColor: '' }
    : {
        show: true,
        maskBgColor: 'rgba(255,255,255,0.725)',
        isHighlight: ({ shape }) => {
          const binKey = `${shape.data.binType}-${shape.data.binNum}`;
          return activeBins[binKey]
            ? { die: { bgColor: colorMap[binKey] } }
            : undefined;
        },
      },
});
```

---

## 框选生命周期管理

> ⛔ **圈选高亮状态与 Legend 高亮状态互斥**：Brush 选中 die 时自动重置 Legend 为全选；Legend 变更时自动清空 Brush 选中 die。框选功能开关本身不受影响。见 [高亮互斥实现模式](#高亮互斥实现模式)。

### 完整框选流程（框架无关）

```typescript
// 1. 在 setOptions 中配置框选样式和行为
waferMap.setOptions({
  ...otherOptions,
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
});

// 2. 启用框选
waferMap.changeBrushEnabled(true);

// 3. 订阅框选变化
const unsubBrush = waferMap.onBrushChange((shapes) => {
  const count = shapes?.length ?? 0;
  console.log(`已选中 ${count} 个 die`);
});

// 4. 禁用框选并清除
waferMap.changeBrushEnabled(false);
waferMap.clearBrushedShapes();

// 5. 清理订阅
unsubBrush();
```

### React 中的框选管理

```tsx
const [brushEnabled, setBrushEnabled] = useState(false);
const [brushedCount, setBrushedCount] = useState(0);

useEffect(() => {
  const wm = new WaferMap(containerRef.current!, { zoomEnabled: true });
  instanceRef.current = wm;

  const unsub = wm.onBrushChange((shapes?: any[] | null) => {
    setBrushedCount(shapes?.length ?? 0);
  });

  return () => { unsub(); wm.destroy(); };
}, []);

useEffect(() => {
  if (!instanceRef.current) return;
  instanceRef.current.changeBrushEnabled(brushEnabled);
  if (!brushEnabled) {
    instanceRef.current.clearBrushedShapes();
    setBrushedCount(0);
  }
}, [brushEnabled]);
```

### Vue3 中的框选管理

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import WaferMap from '@guwave/wafermap-v2';

const props = defineProps<{ brushEnabled: boolean }>();
const emit = defineEmits<{ brushChange: [count: number] }>();

const containerRef = ref<HTMLElement>();
let instance: WaferMap | null = null;
let unsubBrush: (() => void) | null = null;

onMounted(() => {
  instance = new WaferMap(containerRef.value!, { zoomEnabled: true });

  unsubBrush = instance.onBrushChange((shapes?: any[] | null) => {
    emit('brushChange', shapes?.length ?? 0);
  });
});

watch(() => props.brushEnabled, (enabled) => {
  if (!instance) return;
  instance.changeBrushEnabled(enabled);
  if (!enabled) {
    instance.clearBrushedShapes();
    emit('brushChange', 0);
  }
});

onUnmounted(() => {
  unsubBrush?.();
  instance?.destroy();
  instance = null;
});
</script>
```

---

## 高亮互斥实现模式

> ⛔ **此为强制规则**：圈选高亮（Brush Highlight）与 Legend 高亮（Color By Highlight）的**高亮状态**互斥。

### 原理

两种高亮机制都作用于 `highlightLayer`：
- **圈选高亮**：`brush.needBrushHighlight: true` + `changeBrushEnabled(true)` → 框选后自动高亮选中 die
- **Legend 高亮**：`highlightLayer.isHighlight` → 按条件决定哪些 die 高亮

同时存在时 `highlightLayer` 状态冲突，导致视觉错乱和不可预测行为。

### 互斥行为（必须实现）

| 触发动作 | 效果 | 不影响 |
| --- | --- | --- |
| Legend 状态变更（勾选/取消 Bin） | `clearBrushedShapes()` 清空 Brush 选中 die | 框选功能开关（`changeBrushEnabled` 保持不变） |
| Brush 实际选中 die（`onBrushChange` 收到有效 shapes） | 重置 Legend 为全选（`highlightLayer: undefined`） | 框选功能开关 |
| 启用/禁用框选开关 | 无 | Legend 状态 |

### React 实现

```tsx
const [brushEnabled, setBrushEnabled] = useState(false);
const [brushedCount, setBrushedCount] = useState(0);
const [activeBins, setActiveBins] = useState<Record<string, boolean>>(
  () => Object.fromEntries(BIN_DEFS.map((b) => [b.key, true])),
);
const allBinsActive = useMemo(
  () => Object.values(activeBins).every(Boolean),
  [activeBins],
);

// 区分"程序清空 brush"和"用户框选动作"的标记
const isProgrammaticClearRef = useRef(false);

// ── 实例创建 effect ──
useEffect(() => {
  const wm = new WaferMap(containerRef.current!, { zoomEnabled: true });
  instanceRef.current = wm;

  // ⛔ 互斥核心：Brush 选中 die 时重置 Legend
  const unsubBrush = wm.onBrushChange((shapes?: any[] | null) => {
    setBrushedCount(shapes?.length ?? 0);
    if (isProgrammaticClearRef.current) {
      isProgrammaticClearRef.current = false;
      return; // 这是 Legend 触发的程序清空，不重置 Legend
    }
    if (shapes && shapes.length > 0) {
      setActiveBins(Object.fromEntries(BIN_DEFS.map((b) => [b.key, true])));
    }
  });

  return () => { unsubBrush(); wm.destroy(); };
}, []);

// ⛔ 互斥核心：Legend 变更时清空 Brush 选中 die（不影响框选开关）
const toggleBin = (key: string) => {
  isProgrammaticClearRef.current = true;
  instanceRef.current?.clearBrushedShapes();
  setBrushedCount(0);
  setActiveBins((prev) => ({ ...prev, [key]: !prev[key] }));
};

// 框选开关：独立控制，不影响 Legend
// 直接使用 setBrushEnabled，无需额外逻辑

// options 中根据 allBinsActive 条件设置 highlightLayer
const options = useMemo((): WaferMapOptions => ({
  // ...其他配置
  highlightLayer: allBinsActive
    ? undefined  // 全选时关闭高亮层，Brush 选中高亮可正常生效
    : {
        show: true,
        maskBgColor: 'rgba(255,255,255,0.725)',
        isHighlight: ({ shape }) =>
          activeBins[shape.data.k]
            ? { die: { bgColor: colorMap[shape.data.k] } }
            : undefined,
      },
}), [activeBins, allBinsActive, /* ...其他依赖 */]);
```

### Vue3 实现

```vue
<script setup lang="ts">
const brushEnabled = ref(false);
const activeBins = ref<Record<string, boolean>>(
  Object.fromEntries(BIN_DEFS.map((b) => [b.key, true])),
);
const allBinsActive = computed(
  () => Object.values(activeBins.value).every(Boolean),
);

let isProgrammaticClear = false;

// ── 实例创建 ──
onMounted(() => {
  instance = new WaferMap(containerRef.value!, { zoomEnabled: true });

  // ⛔ 互斥核心：Brush 选中 die 时重置 Legend
  unsubBrush = instance.onBrushChange((shapes?: any[] | null) => {
    brushedCount.value = shapes?.length ?? 0;
    if (isProgrammaticClear) {
      isProgrammaticClear = false;
      return;
    }
    if (shapes && shapes.length > 0) {
      activeBins.value = Object.fromEntries(BIN_DEFS.map((b) => [b.key, true]));
    }
  });
});

// ⛔ 互斥核心：Legend 变更时清空 Brush 选中 die（不影响框选开关）
function toggleBin(key: string) {
  isProgrammaticClear = true;
  instance?.clearBrushedShapes();
  brushedCount.value = 0;
  activeBins.value = { ...activeBins.value, [key]: !activeBins.value[key] };
}

// 框选开关：独立控制，不影响 Legend
watch(() => brushEnabled.value, (enabled) => {
  instance?.changeBrushEnabled(enabled);
  if (!enabled) {
    instance?.clearBrushedShapes();
    brushedCount.value = 0;
  }
});

// options 中根据 allBinsActive 条件设置 highlightLayer
const options = computed((): WaferMapOptions => ({
  // ...其他配置
  highlightLayer: allBinsActive.value
    ? undefined
    : {
        show: true,
        maskBgColor: 'rgba(255,255,255,0.725)',
        isHighlight: ({ shape }) =>
          activeBins.value[shape.data.k]
            ? { die: { bgColor: colorMap[shape.data.k] } }
            : undefined,
      },
}));
</script>
```

### 检查清单

在编写涉及 WaferMap 高亮的代码时，确认以下事项：

- [ ] Legend 切换处理中：是否调用了 `clearBrushedShapes()` 清空 Brush 选中 die？
- [ ] Legend 切换处理中：是否**没有**调用 `changeBrushEnabled(false)`？（框选开关应保持不变）
- [ ] `onBrushChange` 回调中：收到有效 shapes 时是否重置了 Legend 为全选？
- [ ] `onBrushChange` 回调中：是否区分了"用户框选"和"程序 `clearBrushedShapes()` 触发"？（用 ref 标记）
- [ ] `highlightLayer` 配置：当 `allBinsActive` 时是否设为 `undefined`（而非 `{ show: false }`）？
- [ ] 框选开关（`changeBrushEnabled`）：是否独立于 Legend 状态控制？

---

## 框架集成生产级模板

综合了 ResizeObserver、框选管理、Legend 高亮、Tooltip 自定义的完整模板。

### React 生产级组件模板

```tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import WaferMap from '@guwave/wafermap-v2';
import '@guwave/wafermap-v2/style.css';
import type { WaferMapOptions, WaferMapDataItem } from '@guwave/wafermap-v2';

interface WaferMapViewProps {
  data: WaferMapDataItem[];
  colorMap: Record<string, string>;
  activeBins?: Record<string, boolean>;
  brushEnabled?: boolean;
  notchDirection?: 'up' | 'down' | 'left' | 'right';
  onBrushChange?: (count: number) => void;
}

function WaferMapView({
  data,
  colorMap,
  activeBins,
  brushEnabled = false,
  notchDirection = 'down',
  onBrushChange,
}: WaferMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<WaferMap | null>(null);

  // ── 1. 创建/销毁实例 ──
  useEffect(() => {
    if (!containerRef.current) return;
    const wm = new WaferMap(containerRef.current, { zoomEnabled: true });
    instanceRef.current = wm;

    const unsubBrush = wm.onBrushChange((shapes?: any[] | null) => {
      onBrushChange?.(shapes?.length ?? 0);
    });

    const ro = new ResizeObserver(() => wm.resize());
    ro.observe(containerRef.current);

    return () => {
      unsubBrush();
      ro.disconnect();
      wm.destroy();
      instanceRef.current = null;
    };
  }, []);

  // ── 2. 构建 options ──
  const allBinsActive = useMemo(
    () => !activeBins || Object.values(activeBins).every(Boolean),
    [activeBins],
  );

  const options = useMemo((): WaferMapOptions => ({
    type: 'dashboard',
    clip: true,
    wafer: { diameter: 300, margin: 3, notch: { direction: notchDirection } },
    axis: { show: true, directionX: 'right', directionY: 'up' },
    center: { dieCountInReticle: { x: 3, y: 3 } },
    die: {
      width: 5, height: 5,
      bgColor: (item: WaferMapDataItem) => colorMap[item.k] || '#ccc',
      line: { show: true, width: 1, color: '#fff' },
    },
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
    highlightLayer: allBinsActive
      ? undefined
      : {
          show: true,
          maskBgColor: 'rgba(255,255,255,0.725)',
          isHighlight: ({ shape }) => {
            const binKey = `${shape.data.binType}-${shape.data.binNum}`;
            return activeBins?.[binKey]
              ? { die: { bgColor: colorMap[binKey] } }
              : undefined;
          },
        },
    data,
  }), [data, colorMap, notchDirection, allBinsActive, activeBins]);

  // ── 3. 同步 options ──
  useEffect(() => {
    instanceRef.current?.setOptions(options);
    instanceRef.current?.changeBrushEnabled(brushEnabled);
  }, [options, brushEnabled]);

  // ── 4. 框选禁用时清除 ──
  useEffect(() => {
    if (!brushEnabled && instanceRef.current) {
      instanceRef.current.clearBrushedShapes();
    }
  }, [brushEnabled]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

#### React Effect 职责分离要点

| Effect | 依赖 | 职责 |
| --- | --- | --- |
| 创建实例 | `[]` | new WaferMap、订阅事件、ResizeObserver |
| 同步 options | `[options, brushEnabled]` | setOptions + changeBrushEnabled |
| 框选清除 | `[brushEnabled]` | 禁用时 clearBrushedShapes |

**关键原则**：
- `onBrushChange` 订阅放在创建实例的 effect 中，**只订阅一次**
- `options` 对象使用 `useMemo` 构建，避免每次渲染都触发 setOptions
- `brushEnabled` 变化时同时调用 `changeBrushEnabled` 和（如禁用时）`clearBrushedShapes`
- 不要在 options 的 useMemo 依赖中包含回调函数引用（如 `onBrushChange`），否则会导致无限循环

### Vue3 生产级组件模板

```vue
<template>
  <div ref="containerRef" style="width: 100%; height: 100%" />
</template>
<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import WaferMap from '@guwave/wafermap-v2';
import '@guwave/wafermap-v2/style.css';
import type { WaferMapOptions, WaferMapDataItem } from '@guwave/wafermap-v2';

interface Props {
  data: WaferMapDataItem[];
  colorMap: Record<string, string>;
  activeBins?: Record<string, boolean>;
  brushEnabled?: boolean;
  notchDirection?: 'up' | 'down' | 'left' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  brushEnabled: false,
  notchDirection: 'down',
});

const emit = defineEmits<{
  brushChange: [count: number];
}>();

const containerRef = ref<HTMLElement>();
let instance: WaferMap | null = null;
let unsubBrush: (() => void) | null = null;
let ro: ResizeObserver | null = null;

// ── 1. 构建 options（用 computed 保持引用稳定） ──
const allBinsActive = computed(() => {
  if (!props.activeBins) return true;
  return Object.values(props.activeBins).every(Boolean);
});

const options = computed((): WaferMapOptions => ({
  type: 'dashboard',
  clip: true,
  wafer: { diameter: 300, margin: 3, notch: { direction: props.notchDirection } },
  axis: { show: true, directionX: 'right', directionY: 'up' },
  center: { dieCountInReticle: { x: 3, y: 3 } },
  die: {
    width: 5, height: 5,
    bgColor: (item: WaferMapDataItem) => props.colorMap[item.k] || '#ccc',
    line: { show: true, width: 1, color: '#fff' },
  },
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
  highlightLayer: allBinsActive.value
    ? undefined
    : {
        show: true,
        maskBgColor: 'rgba(255,255,255,0.725)',
        isHighlight: ({ shape }) => {
          const binKey = `${shape.data.binType}-${shape.data.binNum}`;
          return props.activeBins?.[binKey]
            ? { die: { bgColor: props.colorMap[binKey] } }
            : undefined;
        },
      },
  data: props.data,
}));

// ── 2. 创建/销毁实例 ──
onMounted(() => {
  if (!containerRef.value) return;
  instance = new WaferMap(containerRef.value, { zoomEnabled: true });

  ro = new ResizeObserver(() => instance?.resize());
  ro.observe(containerRef.value);

  unsubBrush = instance.onBrushChange((shapes?: any[] | null) => {
    emit('brushChange', shapes?.length ?? 0);
  });

  instance.setOptions(options.value);
  instance.changeBrushEnabled(props.brushEnabled);
});

// ── 3. 同步 options ──
watch(options, (opts) => {
  instance?.setOptions(opts);
}, { deep: true });

// ── 4. 同步框选状态 ──
watch(() => props.brushEnabled, (enabled) => {
  if (!instance) return;
  instance.changeBrushEnabled(enabled);
  if (!enabled) {
    instance.clearBrushedShapes();
    emit('brushChange', 0);
  }
});

// ── 5. 销毁 ──
onUnmounted(() => {
  unsubBrush?.();
  ro?.disconnect();
  instance?.destroy();
  instance = null;
});
</script>
```

#### Vue3 关键要点

| 生命周期 | 职责 |
| --- | --- |
| `onMounted` | new WaferMap、ResizeObserver、事件订阅、首次 setOptions |
| `watch(options)` | options 变化时调用 setOptions |
| `watch(brushEnabled)` | 切换框选启用 + 禁用时 clearBrushedShapes |
| `onUnmounted` | 取消订阅、断开 ResizeObserver、destroy 实例 |

**关键原则**：
- `onBrushChange` 订阅在 `onMounted` 中一次完成，取消在 `onUnmounted` 中调用
- 用 `computed` 构建 `options` 对象，仅在依赖变化时产生新引用
- `watch` 搭配 `deep: true` 监听嵌套对象变化
- 避免在 `watch` 回调中修改被 `watch` 的数据源（防止循环触发）
- `let instance` 而非 `ref(instance)` — WaferMap 实例不需要响应式追踪

---

## 动态更新最佳实践

### 何时用 setOptions vs highlight

```typescript
// ✅ 结构性变更 → setOptions（会重绘底图）
waferMap.setOptions({
  wafer: { notch: { direction: 'left' } },
  die: { line: { width: 2 } },
  clip: false,
  data: newData,
});

// ✅ 仅高亮变更 → highlight（不重绘底图，更高效）
waferMap.highlight({
  highlightLayer: {
    show: true,
    maskBgColor: 'rgba(255,255,255,0.725)',
    isHighlight: ({ shape }) => { ... },
  },
});

// ✅ 仅切换框选 → changeBrushEnabled（最轻量）
waferMap.changeBrushEnabled(false);
waferMap.clearBrushedShapes();
```

### 避免不必要的重绘

**React**：

```tsx
// ❌ 每次 render 都创建新的 options 对象
useEffect(() => {
  waferMap.setOptions({
    die: { bgColor: (item) => colorMap[item.k] },
    data: waferData,
  });
}); // 缺少依赖项，每次 render 都执行

// ✅ 用 useMemo 稳定 options 引用
const options = useMemo(() => ({
  die: { bgColor: (item: WaferMapDataItem) => colorMap[item.k] },
  data: waferData,
}), [colorMap, waferData]);

useEffect(() => {
  waferMap.setOptions(options);
}, [options]);
```

**Vue3**：

```vue
<script setup lang="ts">
// ❌ 在 watch 中每次构建新的完整 options
watch([data, colorMap], () => {
  instance?.setOptions({
    die: { bgColor: (item) => colorMap.value[item.k] },
    data: data.value,
  });
});

// ✅ 用 computed 稳定 options 引用，仅在依赖变化时重新计算
const options = computed(() => ({
  die: { bgColor: (item: WaferMapDataItem) => props.colorMap[item.k] },
  data: props.data,
}));

watch(options, (opts) => {
  instance?.setOptions(opts);
}, { deep: true });
</script>
```

---

## TypeScript 常见类型问题

### 1. onBrushChange 回调签名

```typescript
// ❌ 类型不兼容 —— shapes 可能为 null
wm.onBrushChange((shapes: WaferMapDataItem[]) => { ... });

// ✅ shapes 可能是 undefined、null 或 any[]
wm.onBrushChange((shapes?: any[] | null) => {
  const count = shapes?.length ?? 0;
});
```

### 2. as const 数组的联合类型

```typescript
const BIN_DEFS = [
  { key: 'P-1', binType: 'P', binNum: 1, color: '#34AA0C', weight: 0.82 },
  { key: 'F-2', binType: 'F', binNum: 2, color: '#ff600d', weight: 0.07 },
] as const;

// ❌ 类型推断过窄，循环中无法重新赋值
let bin = BIN_DEFS[0]; // 类型被锁定为第一个元素的字面量类型
for (const b of BIN_DEFS) {
  bin = b; // Error: 不能将 'F-2' 赋给 'P-1'
}

// ✅ 显式声明为联合类型
let bin: (typeof BIN_DEFS)[number] = BIN_DEFS[0];
for (const b of BIN_DEFS) {
  bin = b; // OK
}
```

### 3. bgColor 函数中的业务字段

```typescript
// WaferMapDataItem 有 [key: string]: any，所以可以直接访问业务字段
die: {
  bgColor: (item: WaferMapDataItem) => {
    // item.k、item.binType 等业务字段通过 any 索引签名访问
    return colorMap[item.k] || '#ccc';
  },
},
```

### 4. highlightLayer 的 isHighlight 参数类型

```typescript
// shape 参数的结构
isHighlight: ({ shape }: {
  shape: { data: WaferMapDataItem; type: 'die' | 'reticle' };
}) => {
  // shape.data 包含 die 的所有数据
  // shape.type 区分是 die 还是 reticle
  const binKey = `${shape.data.binType}-${shape.data.binNum}`;
  return activeBins[binKey]
    ? { die: { bgColor: colorMap[binKey] } }
    : undefined;
};
```
