# @guwave/common-legend 使用示例

## 示例 1：普通图表 (Scatter/Histogram/BoxPlot) 的完整接入

### 1.1 桥接组件 (一次性设置)

```tsx
// src/components/CommonLegend/index.tsx
import { CommonLegend } from '@guwave/common-legend';
import { applyPureVueInReact } from 'veaury';

export const ReactCommonLegend = applyPureVueInReact(CommonLegend);
```

### 1.2 useLegend Hook (普通图表通用 Hook 示例)

```tsx
import { useState, useCallback } from 'react';
import { compact, debounce } from 'lodash';
import {
  ColorByItemStyle, GroupItem, IconType, ListItemStatus,
  PanelItem, SelectedShowType,
} from '@guwave/common-legend';
import {
  buildTrellisByInfo, buildColorByInfo, buildColorByLegend,
  buildDatasetInfo, getAllColorMap,
  handleLegendForCommonClick, handleLegendForRefresh,
  handleLegendUpdateSelectedShowType,
} from './utils'; // 从 reference-utils.md 中复制的工具函数

const ICON_TYPE_LIST = [
  IconType.Circle, IconType.Square, IconType.Triangle, IconType.Rhombus,
  IconType.CircleWithLine, IconType.SquareWithLine,
  IconType.TriangleWithLine, IconType.RhombusWithLine,
];

interface UseLegendProps {
  allColorByKey: string[];
  currColorByKey: string[];
  colorGroups?: string[][];
  trellisByShowNames?: string;
  colorByShowNames?: string;
  datasetName?: string;
  datasetData?: string[];
  legendStyle?: ColorByItemStyle;
  autoIcon?: boolean;
}

export const useLegend = (props: UseLegendProps) => {
  const {
    allColorByKey, currColorByKey, colorGroups = [],
    trellisByShowNames = '', colorByShowNames = '',
    datasetName = '', datasetData = [],
    legendStyle = ColorByItemStyle.Default,
    autoIcon = true,
  } = props;

  const colorById = 'default';
  const [legend, setLegend] = useState<PanelItem[]>([]);
  const [legendWidth, setLegendWidth] = useState<number>(160);
  const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});
  const [manualColorMap, setManualColorMap] = useState<Record<string, Record<string, string>>>({});
  const [selectedShowTypeMap, setSelectedShowTypeMap] = useState<Record<string, SelectedShowType>>({});
  const [selectedNameMap, setSelectedNameMap] = useState<Record<string, string[]>>({});
  const [lastClickNameMap, setLastClickNameMap] = useState<Record<string, string | undefined>>({});

  const allColorMap = getAllColorMap({ sortedColorByKey: allColorByKey, colorGroups });

  const buildLegend = useCallback(() => {
    const sortedCurr = [...currColorByKey].sort(
      (a, b) => allColorByKey.indexOf(a) - allColorByKey.indexOf(b),
    );

    const initLegend: PanelItem[] = [{
      panelTitle: '',
      infoGroups: compact([
        buildDatasetInfo({ hiddenIds, datasetName, datasetData }),
        buildTrellisByInfo(trellisByShowNames, hiddenIds),
        buildColorByInfo(colorByShowNames, hiddenIds),
        buildColorByLegend({
          colorById,
          hiddenIds,
          isShowControlKey: 'Legend List',
          iconTypeList: ICON_TYPE_LIST,
          allColorByKey,
          currColorByKey: sortedCurr,
          allColorMap,
          manualColorMap,
          legendStyle,
          autoIcon,
          selectedShowTypeByGroupMap: selectedShowTypeMap,
          selectedNameByGroupMap: selectedNameMap,
          lastClickNameByGroupMap: lastClickNameMap,
        }),
      ]),
    }];
    setLegend(initLegend);
  }, [allColorByKey, currColorByKey, hiddenIds, manualColorMap,
      selectedShowTypeMap, selectedNameMap, lastClickNameMap]);

  // 图例颜色修改
  const handleColorChange = (param: { id: string; name: string; color: string }) => {
    setManualColorMap((prev) => ({
      ...prev,
      [param.id]: { ...prev[param.id], [param.name]: param.color },
    }));
  };

  // 图例点击 (含 Ctrl/Shift 多选)
  const handleCommonClick = (param: { id: string; name: string; isCtrl: boolean; isShift: boolean }) => {
    const updated = handleLegendForCommonClick(legend, param);

    updated.forEach((panel) =>
      panel.infoGroups.forEach((group) => {
        if (group.colorByOptions?.list) {
          const selected = group.colorByOptions.list
            .filter((i) => i.status === ListItemStatus.Selected)
            .map((i) => i.name);
          setSelectedNameMap((prev) => ({ ...prev, [group.id]: selected }));
          const lastClick = group.colorByOptions.list.find((i) => i.isLastClick);
          setLastClickNameMap((prev) => ({ ...prev, [group.id]: lastClick?.name }));
        }
      }),
    );
    setLegend(updated);
  };

  // 切换 高亮/仅显示
  const handleSelectedShowType = (param: { id: string; selectedShowType: SelectedShowType }) => {
    setSelectedShowTypeMap((prev) => ({ ...prev, [param.id]: param.selectedShowType }));
    setLegend(handleLegendUpdateSelectedShowType(legend, param.id, param.selectedShowType));
  };

  // 重置
  const handleRefresh = () => {
    setLegend(handleLegendForRefresh(legend));
    setManualColorMap({});
    setSelectedShowTypeMap({});
    setSelectedNameMap({});
    setLastClickNameMap({});
    setLegendWidth(160);
  };

  // 显示设置
  const handleShowConfig = (param: { isShowControlKey: string; isShow: boolean }) => {
    setHiddenIds((prev) => ({ ...prev, [param.isShowControlKey]: param.isShow }));
  };

  // 宽度调整
  const handleUpdateWidth = (width: number) => setLegendWidth(width);

  return {
    legend, legendWidth, allColorMap,
    handleColorChange, handleCommonClick, handleSelectedShowType,
    handleRefresh, handleShowConfig, handleUpdateWidth,
    buildLegend,
  };
};
```

### 1.3 图表组件中使用

```tsx
import { ReactCommonLegend } from '@/components/CommonLegend';

const ScatterChart = ({ data, containerHeight }) => {
  const {
    legend, legendWidth, allColorMap,
    handleColorChange, handleCommonClick, handleSelectedShowType,
    handleRefresh, handleShowConfig, handleUpdateWidth,
    buildLegend,
  } = useLegend({
    allColorByKey: data.allColorByKey,
    currColorByKey: data.currColorByKey,
    colorGroups: data.colorGroups,
    trellisByShowNames: 'Lot Id',
    colorByShowNames: 'Wafer Id',
    legendStyle: ColorByItemStyle.Default,
  });

  useEffect(() => { buildLegend(); }, [buildLegend]);

  // 根据图例状态过滤/高亮图表数据
  const getSeriesStyle = (colorKey: string) => {
    const color = allColorMap[colorKey];
    // 使用 legend 中对应 group 的 list 获取 status
    // status === 'selected' → 高亮
    // status === 'disabled' → 隐藏
    // status === 'transparent' → 半透明
    return { color, opacity: 1 };
  };

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        {/* 图表区域 */}
      </div>
      <ReactCommonLegend
        height={containerHeight}
        infoPanels={legend}
        width={legendWidth}
        minWidth={160}
        onUpdateColor={handleColorChange}
        onChangeShowConfig={handleShowConfig}
        onCommonClick={handleCommonClick}
        onUpdateSelectedShowType={handleSelectedShowType}
        onRefresh={handleRefresh}
        onUpdateWidth={handleUpdateWidth}
      />
    </div>
  );
};
```

## 示例 2：晶圆图 (BinMap) 的完整接入

### 2.1 构建晶圆图图例数据

```tsx
import { compact } from 'lodash';
import {
  ListItemStatus, PanelItem, SelectedShowType,
} from '@guwave/common-legend';
import { buildDatasetInfo, buildTrellisByInfo, buildWaferLegend, buildWaferMapInfo } from './utils';

const buildBinMapLegend = ({
  legendData,        // LegendDataItem[] - 从接口获取并处理后的 bin 数据
  summaryInfoData,   // { title, value }[] - Device、Test Stage 等
  hiddenIds,
  showValueColumn,
  selectedShowTypeMap,
  selectedNameMap,
  lastClickNameMap,
  binType,           // 'HBin' | 'SBin' | 'HBinGroup' | 'SBinGroup'
  datasetName,
  datasetData,
  trellisByValue,
}): PanelItem[] => {
  const datasetInfo = buildDatasetInfo({ hiddenIds, datasetName, datasetData });
  const trellisByInfo = buildTrellisByInfo(trellisByValue, hiddenIds);
  const infoList = buildWaferMapInfo({ summaryInfo: summaryInfoData, hiddenIds });

  const waferLegendTable = buildWaferLegend({
    id: 'waferColorBy',
    isShowControlKey: 'Legend list',
    isShow: hiddenIds['Legend list'] ?? true,
    selectedShowType: selectedShowTypeMap?.['waferColorBy'] ?? SelectedShowType.Highlight,
    colorByData: legendData,
    selectedShowTypeByGroupMap: selectedShowTypeMap,
    selectedNameByGroupMap: selectedNameMap,
    lastClickNameByGroupMap: lastClickNameMap,
    basicWaferLegendOptions: {
      type: 'BIN' as any,
      showLegendListOperator: true,
      countAndColumnShowName: 'Count/Rate',
      showValueColumn,
      defaultSortKey: 'name',
      defaultSortOrder: 'ascending',
      allowFirstColumnSort: true,
      allowChangeColor: true,
      firstColumnShowName: binType,
    },
  });

  return [{
    panelTitle: '',
    infoGroups: compact([datasetInfo, trellisByInfo, infoList, waferLegendTable]),
  }];
};
```

### 2.2 晶圆图特有事件处理

```tsx
// 统计列显隐
const handleShowValueColumnChange = (param: { id: string; checked: boolean }) => {
  setShowValueColumn(param.checked);
  // 切换统计列时同步更新排序策略
};

// 排序变化
const handleSortChange = (sort: { prop: string; order: string; id: string }) => {
  setSortInfo({ columnKey: sort.prop, order: sort.order });
};

// 颜色修改 (晶圆图直接修改 binColor)
const handleColorChange = (param: { id: string; name: string; color: string }) => {
  setManualBinColor((prev) => ({ ...prev, [param.name]: param.color }));
};

// 图例点击 (晶圆图使用 waferLegendOptions)
const handleCommonClick = (param: { id: string; name: string; isCtrl: boolean; isShift: boolean }) => {
  const updated = handleLegendForCommonClick(
    legend,
    param,
    'waferLegendOptions',  // 关键：晶圆图使用 waferLegendOptions
    { sortType: 'bin', sortOrder: 'ascending' }, // 传入当前排序信息，保证 Shift 多选区间正确
  );
  // 提取选中项并同步状态...
  setLegend(updated);
};
```

### 2.3 晶圆图图例渲染

```tsx
<ReactCommonLegend
  height={containerHeight}
  infoPanels={legend}
  width={legendWidth}
  minWidth={160}
  onUpdateColor={handleColorChange}
  onChangeShowConfig={handleShowConfig}
  onCommonClick={handleCommonClick}
  onUpdateSelectedShowType={handleSelectedShowType}
  onRefresh={handleRefresh}
  onUpdateWidth={handleUpdateWidth}
  onSortChange={handleSortChange}
  onWaferMapShowValCol={handleShowValueColumnChange}
/>
```

## 示例 3：手动构建简单图例 (无 builder 函数)

适用于快速原型或简单场景，直接构建 `PanelItem[]`:

```tsx
import { PanelItem, ListItemStatus, IconType, SelectedShowType } from '@guwave/common-legend';

const simpleLegend: PanelItem[] = [
  {
    panelTitle: '',
    infoGroups: [
      {
        id: 'dataset',
        isShowControlKey: 'Dataset',
        isShow: true,
        trellisByOptions: {
          title: 'Dataset:',
          content: 'my-dataset-v1',
        },
      },
      {
        id: 'colorBy',
        isShowControlKey: 'Legend List',
        isShow: true,
        colorByOptions: {
          list: [
            { name: 'Series A', status: ListItemStatus.Normal, icon: IconType.Circle, color: '#5629c1', isLastClick: false },
            { name: 'Series B', status: ListItemStatus.Normal, icon: IconType.Square, color: '#3498db', isLastClick: false },
            { name: 'Series C', status: ListItemStatus.Normal, icon: IconType.Triangle, color: '#e74c3c', isLastClick: false },
          ],
          style: 'default',
          selectedShowType: SelectedShowType.Highlight,
          showOperateTipText: true,
        },
      },
    ],
  },
];
```

## 示例 4：多 Panel 布局 (多子图表共享一个图例)

当一个图表区域有多个子图（如 Scatter + Line）时，使用多个 PanelItem:

```tsx
const multiPanelLegend: PanelItem[] = [
  {
    panelTitle: '',  // 公共信息不显示标题
    infoGroups: [
      { id: 'dataset', isShowControlKey: 'Dataset', isShow: true,
        trellisByOptions: { title: 'Dataset:', content: 'demo' } },
      { id: 'trellis', isShowControlKey: 'Trellis by', isShow: true,
        trellisByOptions: { title: 'Trellis by:', content: 'Lot Id' } },
    ],
  },
  {
    panelTitle: 'Scatter Plot',  // 有标题 → 显示可折叠的面板
    infoGroups: [
      { id: 'scatter-legend', isShowControlKey: 'Legend List', isShow: true,
        colorByOptions: { list: [/* ... */], style: 'default', selectedShowType: 'highlight' } },
    ],
  },
  {
    panelTitle: 'Line Chart',
    infoGroups: [
      { id: 'line-y1', isShowControlKey: 'Legend List-Line', isShow: true,
        colorByOptions: { list: [/* ... */], style: 'entirely', axisTitle: 'Y1' } },
      { id: 'line-y2', isShowControlKey: 'Legend List-Line', isShow: true,
        colorByOptions: { list: [/* ... */], style: 'entirely', axisTitle: 'Y2' } },
    ],
  },
];
```

注意：相同 `isShowControlKey` 的 Group 会在显示设置面板中一起控制显隐。

## 图表与图例联动布局组件参考

```tsx
const ChartWithLegend = ({
  children,
  legendDom,
  showLegend = true,
}: {
  children: React.ReactNode;
  legendDom: JSX.Element;
  showLegend?: boolean;
}) => (
  <div style={{ display: 'flex', width: '100%', height: '100%' }}>
    <div style={{ flex: 1, overflow: 'hidden' }}>
      {children}
    </div>
    {showLegend && (
      <div style={{ flexShrink: 0 }}>
        {legendDom}
      </div>
    )}
  </div>
);
```
