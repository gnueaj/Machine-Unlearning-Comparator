import { useContext, useState, memo, useCallback } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  TooltipProps,
} from "recharts";

import { calculateZoom } from "../app/App";
import { getCkaData } from "../utils/data/getCkaData";
import { ExperimentsContext } from "../store/experiments-context";
import { CircleIcon, MultiplicationSignIcon } from "./UI/icons";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "../components/UI/chart";

const PURPLE = "#a855f7";
const EMERALD = "#10b981";
const DOT_SIZE = 12;
const CROSS_SIZE = 20;
const ANIMATION_DURATION = 500;
const LABEL_FONT_SIZE = 10;
const TICK_FONT_WEIGHT = 300;
const ACTIVE_DOT_STROKE_WIDTH = 3;
const ACTIVE_CROSS_STROKE_WIDTH = 2;
const STROKE_WIDTH = 2;
const STROKE_DASHARRAY = "3 3";
const LINEAR = "linear";
const BLACK = "black";
const DATAKEYS = [
  "baselineForgetCka",
  "baselineOtherCka",
  "comparisonForgetCka",
  "comparisonOtherCka",
];
const tickStyle = `
.recharts-cartesian-axis-tick text {
  fill: ${BLACK} !important;
  }
  `;

const AxisTick = memo(({ x, y, payload, hoveredLayer }: TickProps) => (
  <text
    x={x}
    y={y}
    dy={8}
    textAnchor="end"
    transform={`rotate(-45, ${x}, ${y})`}
    fontSize={LABEL_FONT_SIZE}
    fontWeight={hoveredLayer === payload.value ? "bold" : TICK_FONT_WEIGHT}
  >
    {payload.value}
  </text>
));

const chartConfig = {
  layer: {
    label: "Layer",
    color: "#000",
  },
  baselineForgetCka: {
    label: "Baseline (Forget Class)",
    color: PURPLE,
  },
  baselineOtherCka: {
    label: "Baseline (Remain Classes)",
    color: PURPLE,
  },
  comparisonForgetCka: {
    label: "Comparison (Forget Class)",
    color: EMERALD,
  },
  comparisonOtherCka: {
    label: "Comparison (Remain Classes)",
    color: EMERALD,
  },
} satisfies ChartConfig;

type TickProps = {
  x: number;
  y: number;
  payload: any;
  hoveredLayer: string | null;
};

export default function _LineChart({ dataset }: { dataset: string }) {
  const { baselineExperiment, comparisonExperiment } =
    useContext(ExperimentsContext);

  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  const renderTick = useCallback(
    (props: any) => <AxisTick {...props} hoveredLayer={hoveredLayer} />,
    [hoveredLayer]
  );

  if (!baselineExperiment || !comparisonExperiment) return null;

  const ckaData = getCkaData(dataset, baselineExperiment, comparisonExperiment);
  const layers = ckaData.map((data) => data.layer);

  return (
    <div className="relative bottom-1.5 right-3.5">
      <style>{tickStyle}</style>
      <CustomLegend />
      <p className="text-[15px] text-center relative top-1 mb-1.5 ml-12">
        Per-layer Similarity Before/After Unlearning
      </p>
      <ChartContainer
        className="w-[492px] h-[251px]"
        config={chartConfig}
        style={{ position: "relative" }}
      >
        <LineChart
          accessibilityLayer
          data={ckaData}
          margin={{
            top: 7,
            right: 20,
            bottom: 34,
            left: 0,
          }}
          onMouseMove={(state: any) => {
            if (state?.activePayload) {
              setHoveredLayer(state.activePayload[0].payload.layer);
            }
          }}
          onMouseLeave={() => setHoveredLayer(null)}
        >
          <CartesianGrid />
          <XAxis
            dataKey="layer"
            tickLine={false}
            axisLine={{ stroke: BLACK }}
            tickMargin={-2}
            angle={-45}
            tick={renderTick}
            ticks={layers}
            label={{
              value: "ResNet18 Layers",
              position: "center",
              dx: 34,
              dy: 30,
              style: {
                fontSize: 12,
                textAnchor: "end",
                fill: BLACK,
              },
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={{ stroke: BLACK }}
            domain={[0, 1]}
            interval={0}
            tick={{
              fontSize: LABEL_FONT_SIZE,
              fontWeight: TICK_FONT_WEIGHT,
            }}
            ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
            tickMargin={-2}
            label={{
              value: "CKA Similarity",
              angle: -90,
              position: "center",
              dx: -4,
              style: {
                fontSize: 12,
                textAnchor: "middle",
                fill: BLACK,
              },
            }}
          />
          <ChartTooltip
            cursor={false}
            content={<CustomTooltip />}
            wrapperStyle={{ zIndex: 9999 }}
          />
          {DATAKEYS.map((key, idx) => {
            const isBaselineLine = key.includes("baseline");
            const dotColor = isBaselineLine ? PURPLE : EMERALD;
            const isForgetLine = key.includes("Forget");
            const dotSize = isForgetLine ? CROSS_SIZE : DOT_SIZE;
            const activeDotStyle = {
              stroke: BLACK,
              strokeWidth: isForgetLine
                ? ACTIVE_CROSS_STROKE_WIDTH
                : ACTIVE_DOT_STROKE_WIDTH,
            };

            return (
              <Line
                key={idx}
                dataKey={key}
                type={LINEAR}
                stroke={chartConfig[key as keyof typeof chartConfig].color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={isBaselineLine ? undefined : STROKE_DASHARRAY}
                animationDuration={ANIMATION_DURATION}
                dot={({ cx, cy }) =>
                  isForgetLine ? (
                    <MultiplicationSignIcon
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
                    <MultiplicationSignIcon
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
  const zoom = calculateZoom();

  if (active && payload && payload.length) {
    return (
      <div
        style={{ zoom, zIndex: 9999 }}
        className="rounded-lg border border-border/50 bg-white px-2 py-1 text-sm shadow-xl"
      >
        <div className="flex items-center leading-[18px]">
          <CircleIcon className="w-3 h-3 mr-1" style={{ color: PURPLE }} />
          <p>
            Base. (Remain):{" "}
            <span className="font-semibold">{payload[1].value}</span>
          </p>
        </div>
        <div className="flex items-center leading-[18px]">
          <CircleIcon className="w-3 h-3 mr-1" color={EMERALD} />
          <p>
            Comp. (Remain):{" "}
            <span className="font-semibold">{payload[3].value}</span>
          </p>
        </div>
        <div className="flex items-center leading-[18px]">
          <MultiplicationSignIcon
            className="w-4 h-4 -ml-0.5 mr-0.5"
            style={{ color: PURPLE }}
          />
          <p>
            Base. (Forget):{" "}
            <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
        <div className="flex items-center leading-[18px]">
          <MultiplicationSignIcon
            className="w-4 h-4 -ml-0.5 mr-0.5"
            color={EMERALD}
          />
          <p>
            Comp. (Forget):{" "}
            <span className="font-semibold">{payload[2].value}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

function CustomLegend() {
  return (
    <div className="absolute top-32 left-[72px] text-xs leading-4 z-10">
      <div className="flex items-center py-0.5">
        <div className="relative">
          <CircleIcon
            className={`mr-2 relative right-[1px]`}
            style={{ color: PURPLE, width: DOT_SIZE, height: DOT_SIZE }}
          />
          <div
            className="absolute top-1/2 w-[18px] h-[1px]"
            style={{
              backgroundColor: PURPLE,
              transform: "translate(-4px, -50%)",
            }}
          />
        </div>
        <span>Baseline (Remain Classes)</span>
      </div>
      <div className="flex items-center py-0.5">
        <div className="relative">
          <CircleIcon
            className={`mr-2 relative right-[1px]`}
            style={{ color: EMERALD, width: DOT_SIZE, height: DOT_SIZE }}
          />
          <div
            className="absolute top-1/2 w-[18px]"
            style={{
              borderTop: `1px dashed ${EMERALD}`,
              transform: "translate(-4px, -50%)",
            }}
          />
        </div>
        <span>Comparison (Remain Classes)</span>
      </div>
      <div className="flex items-center">
        <div className="relative">
          <MultiplicationSignIcon
            width={CROSS_SIZE}
            height={CROSS_SIZE}
            color={PURPLE}
            className="relative right-[5px]"
          />
          <div
            className="absolute top-1/2 w-[18px] h-[1px]"
            style={{
              backgroundColor: PURPLE,
              transform: "translate(-4px, -50%)",
            }}
          />
        </div>
        <span>Baseline (Forget Class)</span>
      </div>
      <div className="mb-1 flex items-center">
        <div className="relative">
          <MultiplicationSignIcon
            width={CROSS_SIZE}
            height={CROSS_SIZE}
            color={EMERALD}
            className="relative right-[5px]"
          />
          <div
            className="absolute top-1/2 w-[18px]"
            style={{
              borderTop: `1px dashed ${EMERALD}`,
              transform: "translate(-4px, -50%)",
            }}
          />
        </div>
        <span>Comparison (Forget Class)</span>
      </div>
    </div>
  );
}
