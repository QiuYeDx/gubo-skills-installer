# @guwave/common-legend 通用工具函数参考

以下函数是与 CommonLegend 配合使用的可复用逻辑。在新项目中可直接复制使用。

## 1. 图例交互处理函数

### handleLegendForCommonClick — 处理点击(含 Ctrl/Shift 多选)

这是最核心的交互处理函数，根据 isCtrl、isShift 和 selectedShowType 更新图例状态。

```ts
import { cloneDeep } from 'lodash';
import {
  GroupItem,
  ListItemStatus,
  PanelItem,
  SelectedShowType,
  gComponentsLegendBinListSort,
} from '@guwave/common-legend';

const findGroupItemById = (legend: PanelItem[], id: string): GroupItem | undefined => {
  for (const panel of legend) {
    for (const group of panel.infoGroups) {
      if (group.id === id) return group;
    }
  }
  return undefined;
};

export const handleLegendForCommonClick = (
  legend: PanelItem[],
  param: { id: string; name: string; isCtrl: boolean; isShift: boolean },
  customOptionKey: 'colorByOptions' | 'waferLegendOptions' = 'colorByOptions',
  extraInfo?: { sortType?: string; sortOrder?: string },
): PanelItem[] => {
  const newLegend = cloneDeep(legend);
  const groupItem = findGroupItemById(newLegend, param.id);
  if (!groupItem) return newLegend;

  let selectedShowType: SelectedShowType | undefined;
  let list: any[] | undefined;

  if (customOptionKey === 'colorByOptions') {
    if (!groupItem.colorByOptions) return newLegend;
    selectedShowType = groupItem.colorByOptions.selectedShowType;
    list = groupItem.colorByOptions.list;
  } else {
    if (!groupItem.waferLegendOptions) return newLegend;
    selectedShowType = groupItem.waferLegendOptions.selectedShowType;
    list = groupItem.waferLegendOptions.data;
    if (extraInfo?.sortType && extraInfo?.sortOrder) {
      list?.sort((a, b) =>
        gComponentsLegendBinListSort(a, b, extraInfo.sortOrder as any, extraInfo.sortType as any),
      );
    }
  }
  if (!selectedShowType || !list) return newLegend;

  const nonSelectedStatus =
    selectedShowType === SelectedShowType.OnlyShowSelected
      ? ListItemStatus.Disabled
      : ListItemStatus.Transparent;

  const updateNonSelected = () => {
    list!.forEach((item) => {
      if (item.status !== ListItemStatus.Selected) item.status = nonSelectedStatus;
    });
  };

  if (param.isCtrl) {
    const selected = list.filter((i) => i.status === ListItemStatus.Selected);
    if (selected.length === 1 && selected[0].name === param.name) {
      list.forEach((i) => (i.status = ListItemStatus.Normal));
    } else {
      const item = list.find((i) => i.name === param.name);
      if (item)
        item.status =
          item.status === ListItemStatus.Selected ? ListItemStatus.Normal : ListItemStatus.Selected;
      updateNonSelected();
    }
  } else if (param.isShift) {
    const lastIdx = list.findIndex((i) => i.isLastClick);
    const curIdx = list.findIndex((i) => i.name === param.name);
    if (lastIdx !== -1 && curIdx !== -1) {
      const [start, end] = [Math.min(lastIdx, curIdx), Math.max(lastIdx, curIdx)];
      for (let i = start; i <= end; i++) list[i].status = ListItemStatus.Selected;
    } else {
      const item = list.find((i) => i.name === param.name);
      if (item && item.status !== ListItemStatus.Disabled) item.status = ListItemStatus.Selected;
    }
    updateNonSelected();
  } else {
    const selected = list.filter((i) => i.status === ListItemStatus.Selected);
    if (selected.length === 1 && selected[0].name === param.name) {
      list.forEach((i) => (i.status = ListItemStatus.Normal));
    } else {
      list.forEach((i) => {
        i.status = i.name === param.name ? ListItemStatus.Selected : nonSelectedStatus;
      });
    }
  }

  list.forEach((i) => (i.isLastClick = false));
  const clicked = list.find((i) => i.name === param.name);
  if (clicked) clicked.isLastClick = true;

  return newLegend;
};
```

### handleLegendForRefresh — 重置所有图例状态

```ts
export const handleLegendForRefresh = (legend: PanelItem[]): PanelItem[] => {
  const newLegend = cloneDeep(legend);
  newLegend.forEach((panel) =>
    panel.infoGroups.forEach((group) =>
      group.colorByOptions?.list.forEach((item) => {
        item.status = ListItemStatus.Normal;
        item.isLastClick = false;
      }),
    ),
  );
  return newLegend;
};
```

### handleLegendUpdateSelectedShowType — 切换高亮/仅显示

```ts
export const handleLegendUpdateSelectedShowType = (
  legend: PanelItem[],
  id: string,
  selectedShowType: SelectedShowType,
  customOptionKey: 'colorByOptions' | 'waferLegendOptions' = 'colorByOptions',
): PanelItem[] => {
  const newLegend = cloneDeep(legend);
  const allGroups = newLegend.flatMap((p) => p.infoGroups);
  const groupItem = allGroups.find((g) => g.id === id);
  if (!groupItem) return newLegend;

  const targetStatus =
    selectedShowType === SelectedShowType.Highlight
      ? ListItemStatus.Transparent
      : ListItemStatus.Disabled;

  const list =
    customOptionKey === 'colorByOptions'
      ? groupItem.colorByOptions?.list
      : groupItem.waferLegendOptions?.data;

  list?.forEach((item: any) => {
    if (![ListItemStatus.Selected, ListItemStatus.Normal].includes(item.status)) {
      item.status = targetStatus;
    }
  });

  if (customOptionKey === 'colorByOptions' && groupItem.colorByOptions) {
    groupItem.colorByOptions.selectedShowType = selectedShowType;
  } else if (groupItem.waferLegendOptions) {
    groupItem.waferLegendOptions.selectedShowType = selectedShowType;
  }

  return newLegend;
};
```

## 2. Builder 函数

### buildColorByLegend — 构建普通图表颜色图例

```ts
import { compact, isEmpty } from 'lodash';
import {
  ColorByItemStyle,
  GroupItem,
  IconType,
  ListItem,
  ListItemStatus,
  SelectedShowType,
} from '@guwave/common-legend';

export const buildColorByLegend = ({
  colorById,
  hiddenIds,
  isShowControlKey,
  iconTypeList,
  allColorByKey,
  currColorByKey,
  allColorMap,
  manualColorMap,
  legendStyle,
  autoIcon = true,
  defaultIcon,
  axisTitle = '',
  showOperateTipText = true,
  showLegendListTitle = true,
  selectedShowTypeByGroupMap,
  selectedNameByGroupMap,
  lastClickNameByGroupMap,
}: {
  colorById: string;
  hiddenIds: Record<string, boolean>;
  isShowControlKey: string;
  iconTypeList: IconType[];
  allColorByKey: string[];
  currColorByKey: string[];
  allColorMap: Record<string, string>;
  manualColorMap: Record<string, Record<string, string>>;
  legendStyle: ColorByItemStyle;
  autoIcon?: boolean;
  defaultIcon?: IconType;
  axisTitle?: string;
  showOperateTipText?: boolean;
  showLegendListTitle?: boolean;
  selectedShowTypeByGroupMap?: Record<string, SelectedShowType>;
  selectedNameByGroupMap?: Record<string, string[]>;
  lastClickNameByGroupMap?: Record<string, string | undefined>;
}): GroupItem | undefined => {
  if (isEmpty(allColorByKey) || isEmpty(currColorByKey)) return;

  const allIconMap: Record<string, IconType> = {};
  allColorByKey.forEach((key, i) => {
    allIconMap[key] = autoIcon ? iconTypeList[i % iconTypeList.length] : (defaultIcon || IconType.Circle);
  });

  const selectedNames = selectedNameByGroupMap?.[colorById] || [];
  const selectedShowType = selectedShowTypeByGroupMap?.[colorById] ?? SelectedShowType.Highlight;
  const lastClickName = lastClickNameByGroupMap?.[colorById];

  const colorByList: ListItem[] = currColorByKey.map((item) => ({
    name: item,
    status: selectedNames.includes(item) ? ListItemStatus.Selected : ListItemStatus.Normal,
    icon: allIconMap[item] || defaultIcon || IconType.Circle,
    color: manualColorMap?.[colorById]?.[item] ?? allColorMap?.[item],
    isLastClick: item === lastClickName,
  }));

  if (colorByList.some((i) => i.status === ListItemStatus.Selected)) {
    colorByList.forEach((i) => {
      if (i.status !== ListItemStatus.Selected) {
        i.status =
          selectedShowType === SelectedShowType.OnlyShowSelected
            ? ListItemStatus.Disabled
            : ListItemStatus.Transparent;
      }
    });
  }

  return {
    id: colorById,
    isShow: hiddenIds[isShowControlKey] ?? true,
    isShowControlKey,
    colorByOptions: {
      style: legendStyle,
      list: colorByList,
      showOperateTipText,
      showLegendListTitle,
      axisTitle,
      selectedShowType,
    },
  };
};
```

### buildWaferLegend — 构建晶圆图表格图例

```ts
export const buildWaferLegend = ({
  id,
  isShow,
  isShowControlKey,
  selectedShowType,
  colorByData,
  basicWaferLegendOptions,
  selectedShowTypeByGroupMap,
  selectedNameByGroupMap,
  lastClickNameByGroupMap,
}: {
  id: string;
  isShow: boolean;
  isShowControlKey: string;
  selectedShowType: SelectedShowType;
  colorByData: Array<{ name: string; status?: ListItemStatus; isLastClick?: boolean; [k: string]: any }>;
  basicWaferLegendOptions: Partial<WaferLegendProps>;
  selectedShowTypeByGroupMap?: Record<string, SelectedShowType>;
  selectedNameByGroupMap?: Record<string, string[]>;
  lastClickNameByGroupMap?: Record<string, string | undefined>;
}): GroupItem | undefined => {
  if (isEmpty(colorByData)) return;

  const selectedNames = selectedNameByGroupMap?.[id] || [];
  const finalShowType = selectedShowTypeByGroupMap?.[id] ?? selectedShowType;
  const lastClickName = lastClickNameByGroupMap?.[id];

  const waferList = colorByData.map((item) => ({
    ...item,
    status: selectedNames.includes(item.name) ? ListItemStatus.Selected : (item.status ?? ListItemStatus.Normal),
    isLastClick: item.name === lastClickName || item.isLastClick || false,
  }));

  if (waferList.some((i) => i.status === ListItemStatus.Selected)) {
    waferList.forEach((i) => {
      if (i.status !== ListItemStatus.Selected) {
        i.status =
          finalShowType === SelectedShowType.OnlyShowSelected
            ? ListItemStatus.Disabled
            : ListItemStatus.Transparent;
      }
    });
  }

  return {
    id,
    isShow,
    isShowControlKey,
    waferLegendOptions: {
      ...basicWaferLegendOptions,
      data: waferList,
      selectedShowType: finalShowType,
      showLegendListTitle: true,
    },
  };
};
```

### 简单信息 Builder

```ts
export const buildTrellisByInfo = (showNames: string, hiddenIds: Record<string, boolean>): GroupItem => ({
  id: 'Trellis by',
  isShowControlKey: 'Trellis by',
  isShow: hiddenIds['Trellis by'] ?? true,
  trellisByOptions: { title: 'Trellis by:', content: showNames },
});

export const buildColorByInfo = (showNames: string, hiddenIds: Record<string, boolean>): GroupItem => ({
  id: 'Color by',
  isShowControlKey: 'Color by',
  isShow: hiddenIds['Color by'] ?? true,
  trellisByOptions: { title: 'Color by:', content: showNames },
});

export const buildDatasetInfo = ({
  hiddenIds,
  datasetName,
  datasetData,
}: {
  hiddenIds: Record<string, boolean>;
  datasetName: string;
  datasetData: string[];
}): GroupItem | undefined => {
  if (isEmpty(datasetData)) return;
  return {
    id: 'Dataset',
    isShow: hiddenIds['Dataset'] ?? true,
    isShowControlKey: 'Dataset',
    trellisByOptions: {
      title: 'Dataset:',
      content: datasetName || '(NA)',
      tooltipContent: `${datasetName || '(NA)'}\n${datasetData.join('\n')}`,
    },
  };
};

export const buildWaferMapInfo = ({
  summaryInfo,
  hiddenIds,
}: {
  summaryInfo: Array<{ title: string; value: string }>;
  hiddenIds: Record<string, boolean>;
}): GroupItem | undefined => {
  if (isEmpty(summaryInfo)) return;
  return {
    id: 'Info',
    isShow: hiddenIds['Info'] ?? true,
    isShowControlKey: 'Info',
    normalInfoListOptions: {
      title: 'Info:',
      infoList: summaryInfo.map((i) => i.title + ':' + i.value),
    },
  };
};
```

## 3. 颜色映射工具

### getAllColorMap — 为 colorByKey 分配颜色

支持 colorGroups（同组共享颜色）。

```ts
const DEFAULT_COLORS = [
  '#5629c1', '#3498db', '#e74c3c', '#2ecc71', '#f1c40f',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#16a085',
];

export const getAllColorMap = ({
  sortedColorByKey,
  colorGroups = [],
  colorPalette = DEFAULT_COLORS,
}: {
  sortedColorByKey: string[];
  colorGroups?: string[][];
  colorPalette?: string[];
}): Record<string, string> => {
  const colorMap: Record<string, string> = {};
  let colorIndex = 0;
  const groupColorMap = new Map<string[], string>();
  const keyGroupMap: Record<string, string[]> = {};

  for (const group of colorGroups) {
    for (const key of group) keyGroupMap[key] = group;
  }

  for (const key of sortedColorByKey) {
    if (colorMap[key]) continue;
    const group = keyGroupMap[key];
    if (group) {
      let groupColor = groupColorMap.get(group);
      if (!groupColor) {
        groupColor = colorPalette[colorIndex % colorPalette.length];
        colorIndex++;
        groupColorMap.set(group, groupColor);
        for (const gk of group) {
          if (sortedColorByKey.includes(gk)) colorMap[gk] = groupColor;
        }
      } else {
        colorMap[key] = groupColor;
      }
    } else {
      colorMap[key] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }
  }
  return colorMap;
};
```

## 4. 库导出的排序工具

```ts
import { gComponentsLegendBinListSort } from '@guwave/common-legend';

// 用于晶圆图图例数据排序
// recordA, recordB: LegendDataItem
// order: 'ascending' | 'descending' | null
// type: 'bin' | 'count' | 'percent'
// 排序优先级: isSummary > isKill > hitAlg > unknown pf > fail > pass > 无 pf
const sorted = [...data].sort((a, b) => gComponentsLegendBinListSort(a, b, 'ascending', 'bin'));
```

## 5. 百分比格式化 (组件内部使用)

```ts
export const toPercent = (num: number, decimal = 2): string => {
  if (num == null) return '-';
  const powNum = Math.pow(10, decimal);
  return `${(Math.round(num * 10000 * powNum) / (100 * powNum)).toFixed(decimal)}%`;
};

export const toPercentHigh = (num: number, decimal = 2): string => {
  if (num == null) return '-';
  if (num > 0.9999 && num < 1) return '>99.99%';
  if (num < 0.0001 && num > 0) return '<0.01%';
  return toPercent(num, decimal);
};
```
