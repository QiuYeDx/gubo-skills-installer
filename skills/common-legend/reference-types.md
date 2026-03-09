# @guwave/common-legend 类型定义参考

## 组件 Props

```ts
type CommonLegendProps = {
  width?: number;      // 默认 160
  minWidth?: number;    // 默认 160
  maxWidth?: number;    // 默认 480
  height: number;       // 必填，容器高度
  infoPanels: PanelItem[];
  isShowConfigButtonHidden?: boolean; // 隐藏显示设置按钮
};
```

## 数据结构

```ts
type PanelItem = {
  infoGroups: GroupItem[];
  panelTitle?: string; // '' 时不展示标题栏
};

type GroupItem = {
  id: string;
  isShowControlKey: string;
  isShow: boolean;
  colorByOptions?: ColorByOptions;
  trellisByOptions?: TrellisByOptions;
  infoListOptions?: InfoListOptions;
  lineAndPointOptions?: LineAndPointOptions;
  normalInfoListOptions?: NormalInfoListOptions;
  waferLegendOptions?: WaferLegendProps;
};
```

## 枚举类型

```ts
enum ListItemStatus {
  Normal = 'normal',
  Selected = 'selected',
  Disabled = 'disabled',
  Transparent = 'transparent',
}

enum IconType {
  Circle = 'circle',
  Square = 'square',
  Triangle = 'triangle',
  Rhombus = 'rhombus',
  CircleWithLine = 'circle-with-line',
  SquareWithLine = 'square-with-line',
  TriangleWithLine = 'triangle-with-line',
  RhombusWithLine = 'rhombus-with-line',
  HollowCircle = 'hollow-circle',
  HollowSquare = 'hollow-square',
  HollowTriangle = 'hollow-triangle',
  HollowRhombus = 'hollow-rhombus',
  HollowCircleWithLine = 'hollow-circle-with-line',
  HollowSquareWithLine = 'hollow-square-with-line',
  HollowTriangleWithLine = 'hollow-triangle-with-line',
  HollowRhombusWithLine = 'hollow-rhombus-with-line',
}

enum SelectedShowType {
  Highlight = 'highlight',
  OnlyShowSelected = 'onlyShowSelected',
}

enum ColorByItemStyle {
  Default = 'default',    // 单行截断 + tooltip
  Entirely = 'entirely',  // 换行展示全部
}
```

## ColorByOptions (普通图表颜色图例)

```ts
type ListItem = {
  name: string;
  status: ListItemStatus;
  icon?: IconType;
  color?: string;
  isLastClick: boolean; // Shift 多选时标记上次点击位置
};

type ColorByOptions = {
  list: ListItem[];
  style?: ColorByItemStyle;
  showLegendListTitle?: boolean;
  showOperateTipText?: boolean;
  selectedShowType?: SelectedShowType;
  axisTitle?: string;
  hideSelectedShowType?: boolean;
};
```

## WaferLegendProps (晶圆图表格图例)

```ts
enum WafermapThemeEnum {
  BIN = 'BIN',
  RANGE = 'RANGE',
  PF = 'PF',
}

enum BinPFTypeEnum {
  PASS = 'P',
  FAIL = 'F',
  UNKNOWN = 'U',
}

type WaferMapLegendItem = {
  k: number | string;
  name: string;
  count: number;
  percent: number;       // 小数形式 0-1
  hitAlg: 0 | 1;
  binType?: 'HBIN' | 'SBIN' | 'HBin' | 'SBin';
  binNum?: number;
  pf?: BinPFTypeEnum;
  color?: string;
  outlier0?: boolean;
  outlier100?: boolean;
  manualOutlier?: boolean;
  invalid?: boolean;
};

type LegendDataItem = WaferMapLegendItem & {
  color: string;
  isKill?: boolean;
  isSummary?: boolean;       // total/pass 汇总行
  countBgcPercent?: number;  // 统计列背景色宽度百分比
  percentBgcPercent?: number;
  status: ListItemStatus;
  isLastClick: boolean;
};

type WaferLegendProps = {
  type: WafermapThemeEnum;
  showValueColumn: boolean;
  firstColumnShowName: string | undefined;
  allowFirstColumnSort: boolean;
  allowChangeColor: boolean;
  countAndColumnShowName?: string;      // 默认 'Count/Rate'
  countAndColumnShowNameTooltip?: string;
  data: LegendDataItem[];
  textTruncateStyle?: ColorByItemStyle;
  showLegendListTitle?: boolean;
  showLegendListOperator?: boolean;     // 显示高亮/仅显示切换、统计开关、操作说明
  selectedShowType?: SelectedShowType;
  defaultSortKey?: 'name' | 'countAndPercent';
  defaultSortOrder?: 'ascending' | 'descending';
  storeSorterInfo?: { columnKey: 'name' | 'countAndPercent'; order: OrderType };
  updateStoreInfo?: { columnKey: 'name' | 'countAndPercent'; order: OrderType };
};
```

## 其他 Options 类型

```ts
type TrellisByOptions = {
  title: string;
  content: string;
  tooltipContent?: string;
};

type InfoListOptions = {
  title: string;
  infoList: { subTitle: string; content?: string }[];
};

type LineAndPointInfo = {
  id: string;
  name: string;
  color: string;
  tooltip?: string;
  description?: string;
  status?: ListItemStatus;
};

type LineAndPointOptions = {
  title: string;
  styleOptions?: { truncate: boolean };
  infoList: LineAndPointInfo[];
};

type NormalInfoListOptions = {
  title: string;
  infoList: string[];
};
```

## 事件参数类型

```ts
type UpdateColorEventProps = { id: string; name: string; color: string };
type CommonClickEventProps = { id: string; name: string; isCtrl: boolean; isShift: boolean };
type UpdateSelectedShowTypeEventProps = { id: string; selectedShowType: SelectedShowType };
type ChangeShowConfigEventProps = { isShowControlKey: string; isShow: boolean };
type DoubleClickEventProps = { id: string; name: string };
type SelectEventProps = { id: string; name: string }[];
type RefreshEventProps = { idList?: string[] };
type CopyEventProps = { idList?: string[] };
type SortEventProps = Sort & { id: string }; // Sort from element-plus: { prop: string; order: string }
type WaferMapShowValColEventProps = { id: string; checked: boolean };
```
