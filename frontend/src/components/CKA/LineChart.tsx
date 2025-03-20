import { useState, memo, useCallback } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  TooltipProps,
} from "recharts";

import { COLORS } from "../../constants/colors";
import { getCkaData } from "../../utils/data/getCkaData";
import { CircleIcon, FatMultiplicationSignIcon } from "../UI/icons";
import { ChartContainer } from "../UI/chart";
import {
  CKA_DATA_KEYS,
  LINE_CHART_TICK_STYLE,
  LINE_CHART_CONFIG,
  LINE_CHART_LEGEND_DATA,
} from "../../constants/correlations";
import {
  STROKE_CONFIG,
  FONT_CONFIG,
  ANIMATION_DURATION,
} from "../../constants/common";
import {
  useModelAExperiment,
  useModelBExperiment,
} from "../../stores/experimentsStore";

const CONFIG = {
  DOT_SIZE: 10,
  CROSS_SIZE: 13,
  ACTIVE_DOT_STROKE_WIDTH: 3,
  ACTIVE_CROSS_STROKE_WIDTH: 2,
  zIndex: 9999,
} as const;

const AxisTick = memo(({ x, y, payload, hoveredLayer }: TickProps) => (
  <text
    x={x}
    y={y}
    dy={8}
    textAnchor="end"
    transform={`rotate(-45, ${x}, ${y})`}
    fontSize={FONT_CONFIG.FONT_SIZE_10}
    fontWeight={
      hoveredLayer === payload.value ? "bold" : FONT_CONFIG.LIGHT_FONT_WEIGHT
    }
  >
    {payload.value}
  </text>
));

type TickProps = {
  x: number;
  y: number;
  payload: any;
  hoveredLayer: string | null;
};

export default function _LineChart({ dataset }: { dataset: string }) {
  const modelAExperiment = useModelAExperiment();
  const modelBExperiment = useModelBExperiment();

  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  const renderTick = useCallback(
    (props: any) => <AxisTick {...props} hoveredLayer={hoveredLayer} />,
    [hoveredLayer]
  );

  if (!modelAExperiment || !modelBExperiment) return null;

  const ckaData = getCkaData(dataset, modelAExperiment, modelBExperiment);
  const layers = ckaData.map((data) => data.layer);

  return (
    <div className="relative">
      <style>{LINE_CHART_TICK_STYLE}</style>
      <CustomLegend />
      <ChartContainer
        className="w-[460px] h-[266px] relative"
        config={LINE_CHART_CONFIG}
      >
        <LineChart
          accessibilityLayer
          data={ckaData}
          margin={{
            top: 8,
            right: 7,
            bottom: 30,
            left: -24,
          }}
          onMouseMove={(state: any) => {
            if (state?.activePayload) {
              setHoveredLayer(state.activePayload[0].payload.layer);
            }
          }}
          onMouseLeave={() => setHoveredLayer(null)}
        >
          <CartesianGrid stroke={COLORS.GRID_COLOR} />
          <XAxis
            dataKey="layer"
            tickLine={false}
            axisLine={{ stroke: COLORS.BLACK }}
            tickMargin={-2}
            angle={-45}
            tick={renderTick}
            ticks={layers}
            label={{
              value: "ResNet18 Layers",
              position: "center",
              dy: 36,
              style: {
                fontSize: FONT_CONFIG.FONT_SIZE_13,
                fill: COLORS.BLACK,
              },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: COLORS.BLACK }}
            domain={[0, 1]}
            interval={0}
            tick={{
              fontSize: FONT_CONFIG.FONT_SIZE_10,
              fontWeight: FONT_CONFIG.LIGHT_FONT_WEIGHT,
            }}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
            tickMargin={-2}
            label={{
              value: "CKA Value",
              angle: -90,
              position: "center",
              style: {
                fontSize: FONT_CONFIG.FONT_SIZE_13,
                fill: COLORS.BLACK,
              },
            }}
          />
          <Tooltip
            cursor={false}
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: CONFIG.zIndex }}
          />
          {CKA_DATA_KEYS.map((key, idx) => {
            const isModelALine = key.startsWith("modelA");
            const dotColor = isModelALine ? COLORS.EMERALD : COLORS.PURPLE;
            const isForgetLine = key.includes("Forget");
            const dotSize = isForgetLine ? CONFIG.CROSS_SIZE : CONFIG.DOT_SIZE;
            const activeDotStyle = {
              stroke: COLORS.BLACK,
              strokeWidth: isForgetLine
                ? CONFIG.ACTIVE_CROSS_STROKE_WIDTH
                : CONFIG.ACTIVE_DOT_STROKE_WIDTH,
            };

            return (
              <Line
                key={idx}
                dataKey={key}
                type="linear"
                stroke={
                  LINE_CHART_CONFIG[key as keyof typeof LINE_CHART_CONFIG].color
                }
                strokeWidth={STROKE_CONFIG.DEFAULT_STROKE_WIDTH}
                strokeDasharray={
                  isForgetLine ? STROKE_CONFIG.STROKE_DASHARRAY : undefined
                }
                animationDuration={ANIMATION_DURATION}
                dot={({ cx, cy }) =>
                  isForgetLine ? (
                    <FatMultiplicationSignIcon
                      x={cx - dotSize / 2}
                      y={cy - dotSize / 2}
                      width={dotSize}
                      height={dotSize}
                      color={dotColor}
                    />
                  ) : (
                    <CircleIcon
                      x={cx - dotSize / 2}
                      y={cy - dotSize / 2}
                      width={dotSize}
                      height={dotSize}
                      color={dotColor}
                    />
                  )
                }
                activeDot={(props: any) =>
                  isForgetLine ? (
                    <FatMultiplicationSignIcon
                      x={props.cx - dotSize / 2}
                      y={props.cy - dotSize / 2}
                      width={dotSize}
                      height={dotSize}
                      color={dotColor}
                      style={activeDotStyle}
                    />
                  ) : (
                    <CircleIcon
                      x={props.cx - dotSize / 2}
                      y={props.cy - dotSize / 2}
                      width={dotSize}
                      height={dotSize}
                      color={dotColor}
                      style={activeDotStyle}
                    />
                  )
                }
              />
            );
          })}
        </LineChart>
      </ChartContainer>
    </div>
  );
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{ zIndex: CONFIG.zIndex }}
        className="rounded-lg border border-border/50 bg-white px-2.5 py-1.5 text-sm shadow-xl"
      >
        <p className="leading-5">
          <span style={{ color: COLORS.EMERALD }}>Model A </span>(Retain) CKA:{" "}
          <span className="font-semibold">{payload[1].value}</span>
        </p>
        <p className="leading-5">
          <span style={{ color: COLORS.PURPLE }}>Model B </span>(Retain) CKA:{" "}
          <span className="font-semibold">{payload[3].value}</span>
        </p>
        <p className="leading-5">
          <span style={{ color: COLORS.EMERALD }}>Model A </span>(Forget) CKA:{" "}
          <span className="font-semibold">{payload[0].value}</span>
        </p>
        <p className="leading-5">
          <span style={{ color: COLORS.PURPLE }}>Model B </span>(Forget) CKA:{" "}
          <span className="font-semibold">{payload[2].value}</span>
        </p>
      </div>
    );
  }
  return null;
}

function CustomLegend() {
  const modelAExperiment = useModelAExperiment();
  const modelBExperiment = useModelBExperiment();

  const CIRCLE = "circle";

  return (
    <div className="absolute bottom-[68px] left-[45px] text-xs leading-4 z-10 border-[2px] border-[#EFEFEF] rounded-[4px] pl-2.5 pr-1.5 py-0.5 bg-white/60">
      {LINE_CHART_LEGEND_DATA.map((item, i) => {
        const Icon =
          item.type === CIRCLE ? CircleIcon : FatMultiplicationSignIcon;
        const experiment = i % 2 === 0 ? modelAExperiment : modelBExperiment;

        return (
          <div key={i} className={`flex items-center ${item.spacing}`}>
            <div className="relative">
              <Icon
                className={`z-10 ${item.type === CIRCLE ? "mr-2" : "mr-0.5"}`}
                style={{
                  color: item.color,
                  width:
                    item.type === CIRCLE ? CONFIG.DOT_SIZE : CONFIG.CROSS_SIZE,
                }}
              />
              <div
                className="absolute top-1/2 w-[18px] h-[1px]"
                style={{
                  transform: `translate(${i > 1 ? "-3.8px" : "-4px"}, -50%)`,
                  ...(i > 1
                    ? { borderTop: `2px dashed ${item.color}` }
                    : { backgroundColor: item.color }),
                }}
              />
            </div>
            <span style={i > 1 ? { marginLeft: "6px" } : undefined}>
              <span style={{ color: item.color }}>
                {item.label} ({experiment.Type}, {experiment.ID}){" "}
              </span>
              <span>{i < 2 ? "Retain" : "Forget"}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
