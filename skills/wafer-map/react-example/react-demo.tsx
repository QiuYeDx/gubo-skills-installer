import React, { useRef, useEffect, useState, useMemo } from "react";
import WaferMap from "@guwave/wafermap-v2";
import "@guwave/wafermap-v2/style.css";
import type { WaferMapOptions, WaferMapDataItem } from "@guwave/wafermap-v2";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// ─── 常量 ─────────────────────────────────────────────

const BIN_DEFS = [
  { key: "P-1", binType: "P", binNum: 1, color: "#34AA0C", label: "Pass - Bin1", weight: 0.82 },
  { key: "F-2", binType: "F", binNum: 2, color: "#ff600d", label: "Fail - Bin2", weight: 0.07 },
  { key: "F-3", binType: "F", binNum: 3, color: "#feed11", label: "Fail - Bin3", weight: 0.06 },
  { key: "F-4", binType: "F", binNum: 4, color: "#d254a5", label: "Fail - Bin4", weight: 0.05 },
] as const;

type BinDef = (typeof BIN_DEFS)[number];

const COLOR_MAP: Record<string, string> = Object.fromEntries(
  BIN_DEFS.map((b) => [b.key, b.color]),
);

const DIE_COUNT_IN_RETICLE = { x: 3, y: 3 };

// ─── 数据生成 ──────────────────────────────────────────

function createSeededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function generateWaferData(params: {
  diameter: number;
  margin: number;
  dieWidth: number;
  dieHeight: number;
  dieCountInReticle: { x: number; y: number };
  bins: readonly BinDef[];
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
        if (r < cum) {
          bin = b;
          break;
        }
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

// ─── 辅助组件 ──────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${checked ? "bg-primary" : "bg-input"
          }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform ${checked ? "translate-x-4" : "translate-x-0"
            }`}
        />
      </button>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono text-xs">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5 cursor-pointer"
      />
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">{value}</span>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground tracking-wide">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

// ─── 主组件 ────────────────────────────────────────────

type TooltipFieldKey = "dieX" | "dieY" | "reticleX" | "reticleY" | "binType" | "binNum" | "site";

const TOOLTIP_FIELD_LABELS: Record<TooltipFieldKey, string> = {
  dieX: "Die X",
  dieY: "Die Y",
  reticleX: "Reticle X",
  reticleY: "Reticle Y",
  binType: "Bin Type",
  binNum: "Bin #",
  site: "Site",
};

const WaferMapDemo: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<WaferMap | null>(null);
  const isProgrammaticClearRef = useRef(false);

  // ── 控制状态 ──

  const [tooltipFields, setTooltipFields] = useState<Record<TooltipFieldKey, boolean>>({
    dieX: true,
    dieY: true,
    reticleX: false,
    reticleY: false,
    binType: true,
    binNum: true,
    site: false,
  });

  const [notchDirection, setNotchDirection] = useState<"up" | "down" | "left" | "right">("down");
  const [showReticle, setShowReticle] = useState(false);
  const [showReticleLabel, setShowReticleLabel] = useState(true);
  const [clip, setClip] = useState(true);
  const [reticleLineWidth, setReticleLineWidth] = useState(2);
  const [reticleLineColor, setReticleLineColor] = useState("#3a3a3a");
  const [reticleLabelFontSize, setReticleLabelFontSize] = useState(16);
  const [showDieLine, setShowDieLine] = useState(true);
  const [dieLineWidth, setDieLineWidth] = useState(1);
  const [dieLineColor, setDieLineColor] = useState("#ffffff");
  const [brushEnabled, setBrushEnabled] = useState(false);
  const [supportAltSelect, setSupportAltSelect] = useState(true);
  const [brushedCount, setBrushedCount] = useState(0);
  const [activeBins, setActiveBins] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BIN_DEFS.map((b) => [b.key, true])),
  );

  // ── 数据 ──

  const waferData = useMemo(
    () =>
      generateWaferData({
        diameter: 300,
        margin: 3,
        dieWidth: 5,
        dieHeight: 5,
        dieCountInReticle: DIE_COUNT_IN_RETICLE,
        bins: BIN_DEFS,
      }),
    [],
  );

  // ── WaferMap 实例管理 ──

  useEffect(() => {
    if (!containerRef.current) return;
    const wm = new WaferMap(containerRef.current, { zoomEnabled: true });
    instanceRef.current = wm;

    const ro = new ResizeObserver(() => wm.resize());
    ro.observe(containerRef.current);

    const unsubBrush = wm.onBrushChange((shapes?: any[] | null) => {
      setBrushedCount(shapes?.length ?? 0);
      if (isProgrammaticClearRef.current) {
        isProgrammaticClearRef.current = false;
        return;
      }
      // ⛔ 高亮互斥：Brush 实际选中 die → 重置 Legend 为全选
      if (shapes && shapes.length > 0) {
        setActiveBins(Object.fromEntries(BIN_DEFS.map((b) => [b.key, true])));
      }
    });

    return () => {
      unsubBrush();
      ro.disconnect();
      wm.destroy();
      instanceRef.current = null;
    };
  }, []);

  // ── 构建 options ──

  const allBinsActive = useMemo(
    () => Object.values(activeBins).every(Boolean),
    [activeBins],
  );

  const options = useMemo(
    (): WaferMapOptions => ({
      type: "dashboard",
      clip,
      wafer: {
        diameter: 300,
        margin: 3,
        notch: { show: true, direction: notchDirection },
      },
      axis: { show: true, directionX: "right", directionY: "up" },
      center: { dieCountInReticle: DIE_COUNT_IN_RETICLE },
      die: {
        width: 5,
        height: 5,
        bgColor: (item: WaferMapDataItem) => COLOR_MAP[item.k] || "#ccc",
        line: { show: showDieLine, width: dieLineWidth, color: dieLineColor },
      },
      reticle: {
        show: showReticle,
        line: { width: reticleLineWidth, color: reticleLineColor },
        label: {
          show: showReticleLabel,
          fontSize: reticleLabelFontSize,
          color: "#000",
        },
      },
      tooltip: {
        render: ({ data }: { data: WaferMapDataItem }) => {
          const lines: string[] = [];
          if (tooltipFields.dieX) lines.push(`<b>Die X:</b> ${data.dieX}`);
          if (tooltipFields.dieY) lines.push(`<b>Die Y:</b> ${data.dieY}`);
          if (tooltipFields.reticleX) lines.push(`<b>Reticle X:</b> ${data.reticleX}`);
          if (tooltipFields.reticleY) lines.push(`<b>Reticle Y:</b> ${data.reticleY}`);
          if (tooltipFields.binType)
            lines.push(`<b>Bin Type:</b> ${data.binType === "P" ? "Pass" : "Fail"}`);
          if (tooltipFields.binNum) lines.push(`<b>Bin #:</b> ${data.binNum}`);
          if (tooltipFields.site) lines.push(`<b>Site:</b> ${data.site}`);
          if (lines.length === 0)
            lines.push('<i style="color:#999">未选择任何字段</i>');
          return `<div style="padding:2px 0;font-size:12px">${lines.map((l) => `<div style="padding:1px 0">${l}</div>`).join("")}</div>`;
        },
      },
      brush: {
        needBrushHighlight: true,
        supportAltSelected: supportAltSelect,
        styleOptions: {
          area: {
            line: { width: 1, color: "rgba(93,45,205,1)" },
            bgColor: "rgba(93,45,205,0.25)",
          },
        },
      },
      highlightLayer: allBinsActive
        ? undefined
        : {
          show: true,
          maskBgColor: "rgba(255,255,255,0.725)",
          isHighlight: ({
            shape,
          }: {
            shape: { data: WaferMapDataItem };
          }) => {
            return activeBins[shape.data.k]
              ? { die: { bgColor: COLOR_MAP[shape.data.k] } }
              : undefined;
          },
        },
      dataMap: {
        dieX: "dieX",
        dieY: "dieY",
        reticleX: "reticleX",
        reticleY: "reticleY",
        reticleLabel: "reticleLabel",
      },
      data: waferData,
    }),
    [
      clip,
      notchDirection,
      showReticle,
      showReticleLabel,
      reticleLineWidth,
      reticleLineColor,
      reticleLabelFontSize,
      showDieLine,
      dieLineWidth,
      dieLineColor,
      tooltipFields,
      supportAltSelect,
      activeBins,
      allBinsActive,
      waferData,
    ],
  );

  // ── 同步 setOptions ──

  useEffect(() => {
    instanceRef.current?.setOptions(options);
  }, [options]);

  // ── 同步 Brush 启用状态 ──

  useEffect(() => {
    if (!instanceRef.current) return;
    instanceRef.current.changeBrushEnabled(brushEnabled);
    if (!brushEnabled) {
      instanceRef.current.clearBrushedShapes();
      setBrushedCount(0);
    }
  }, [brushEnabled]);

  // ── Legend 操作（⛔ 高亮互斥：Legend 变更时清空 Brush 选中 die，不影响框选开关） ──

  const toggleBin = (key: string) => {
    isProgrammaticClearRef.current = true;
    instanceRef.current?.clearBrushedShapes();
    setBrushedCount(0);
    setActiveBins((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const noneBinsActive = useMemo(
    () => Object.values(activeBins).every((v) => !v),
    [activeBins],
  );

  // ── 渲染 ──

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WaferMap 组件演示</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            @guwave/wafermap-v2 交互功能演示 · 300mm 晶圆
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Die: {waferData.length.toLocaleString()}</Badge>
          {brushEnabled && (
            <Badge variant="secondary">
              圈选: {brushedCount.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* 晶圆图 */}
        <Card className="flex-1 !py-0 overflow-hidden">
          <div ref={containerRef} className="w-full h-[500px] lg:h-[640px]" />
        </Card>

        {/* 控制面板 */}
        <Card className="lg:w-80 xl:w-[340px] shrink-0 !py-0 !gap-0">
          <ScrollArea className="h-[500px] lg:h-[640px]">
            <div className="p-4 space-y-4">
              {/* ── Tooltip 字段 ── */}
              <Section title="Tooltip 显示字段">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {(Object.keys(tooltipFields) as TooltipFieldKey[]).map((field) => (
                    <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tooltipFields[field]}
                        onChange={() =>
                          setTooltipFields((prev) => ({ ...prev, [field]: !prev[field] }))
                        }
                        className="accent-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground">
                        {TOOLTIP_FIELD_LABELS[field]}
                      </span>
                    </label>
                  ))}
                </div>
              </Section>

              <Separator />

              {/* ── Notch 方向 ── */}
              <Section title="Notch 方向">
                <div className="grid grid-cols-4 gap-1.5">
                  {(["up", "down", "left", "right"] as const).map((dir) => (
                    <Button
                      key={dir}
                      size="sm"
                      variant={notchDirection === dir ? "default" : "outline"}
                      onClick={() => setNotchDirection(dir)}
                      className="text-xs h-8 cursor-pointer"
                    >
                      {
                        { up: "↑ 上", down: "↓ 下", left: "← 左", right: "→ 右" }[
                        dir
                        ]
                      }
                    </Button>
                  ))}
                </div>
              </Section>

              <Separator />

              {/* ── Reticle 配置 ── */}
              <Section title="Reticle 配置">
                <Toggle label="显示 Reticle" checked={showReticle} onChange={setShowReticle} />
                <Toggle
                  label="显示 Site 标签"
                  checked={showReticleLabel}
                  onChange={setShowReticleLabel}
                  disabled={!showReticle}
                />
                <Toggle label="裁剪显示（Clip）" checked={clip} onChange={setClip} />
                <RangeControl
                  label="描边粗细"
                  value={reticleLineWidth}
                  min={1}
                  max={6}
                  onChange={setReticleLineWidth}
                  unit="px"
                />
                <ColorControl
                  label="描边颜色"
                  value={reticleLineColor}
                  onChange={setReticleLineColor}
                />
                <RangeControl
                  label="标签字号"
                  value={reticleLabelFontSize}
                  min={6}
                  max={30}
                  onChange={setReticleLabelFontSize}
                  unit="px"
                />
              </Section>

              <Separator />

              {/* ── Die 描边 ── */}
              <Section title="Die 描边">
                <Toggle label="显示描边" checked={showDieLine} onChange={setShowDieLine} />
                <RangeControl
                  label="描边粗细"
                  value={dieLineWidth}
                  min={0.5}
                  max={4}
                  step={0.5}
                  onChange={setDieLineWidth}
                  unit="px"
                />
                <ColorControl label="描边颜色" value={dieLineColor} onChange={setDieLineColor} />
              </Section>

              <Separator />

              {/* ── 圈选 ── */}
              <Section title="圈选（Brush）">
                <Toggle label="启用圈选" checked={brushEnabled} onChange={setBrushEnabled} />
                <Toggle
                  label="Alt 增/减选"
                  checked={supportAltSelect}
                  onChange={setSupportAltSelect}
                />
                {brushEnabled && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">已选中 Die</span>
                    <Badge variant="secondary" className="text-xs">
                      {brushedCount.toLocaleString()}
                    </Badge>
                  </div>
                )}
              </Section>

              <Separator />

              {/* ── Legend 高亮 ── */}
              <Section title="Legend 高亮（Color By）">
                <div className="flex gap-1.5 mb-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-6 px-2 cursor-pointer"
                    onClick={() =>
                      setActiveBins(Object.fromEntries(BIN_DEFS.map((b) => [b.key, true])))
                    }
                    disabled={allBinsActive}
                  >
                    全选
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-6 px-2 cursor-pointer"
                    onClick={() => {
                      isProgrammaticClearRef.current = true;
                      instanceRef.current?.clearBrushedShapes();
                      setBrushedCount(0);
                      setActiveBins(Object.fromEntries(BIN_DEFS.map((b) => [b.key, false])));
                    }}
                    disabled={noneBinsActive}
                  >
                    全不选
                  </Button>
                </div>
                <div className="space-y-2">
                  {BIN_DEFS.map((bin) => (
                    <div
                      key={bin.key}
                      className="flex items-center gap-2.5 cursor-pointer group"
                      onClick={() => toggleBin(bin.key)}
                    >
                      <div
                        className="w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: activeBins[bin.key] ? bin.color : "transparent",
                          borderColor: bin.color,
                        }}
                      >
                        {activeBins[bin.key] && (
                          <svg
                            className="w-3 h-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-sm transition-colors ${activeBins[bin.key]
                            ? "text-foreground"
                            : "text-muted-foreground line-through"
                          }`}
                      >
                        {bin.label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                        {(bin.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default WaferMapDemo;
