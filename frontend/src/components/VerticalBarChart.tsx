import { useMemo, useContext, useCallback, memo } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ReferenceLine,
  Label,
  Tooltip,
  TooltipProps,
} from "recharts";

import { forgetClassNames } from "../constants/forgetClassNames";
import { TABLEAU10 } from "../constants/tableau10";
import { ChartContainer, type ChartConfig } from "./UI/chart";
import { ForgetClassContext } from "../store/forget-class-context";
import { GapDataItem } from "../views/Accuracies";
import {
  BaselineNeuralNetworkIcon,
  ComparisonNeuralNetworkIcon,
} from "./UI/icons";

const TOOLTIP_FIX_LENGTH = 3;
const LABEL_FONT_SIZE = 10;
const TICK_FONT_WEIGHT = 300;
const BLACK = "black";

const chartConfig = {
  value: {
    label: "Gap",
  },
  A: {
    label: "airplane",
    color: TABLEAU10[0],
  },
  B: {
    label: "automobile",
    color: TABLEAU10[1],
  },
  C: {
    label: "bird",
    color: TABLEAU10[2],
  },
  D: {
    label: "cat",
    color: TABLEAU10[3],
  },
  E: {
    label: "deer",
    color: TABLEAU10[4],
  },
  F: {
    label: "dog",
    color: TABLEAU10[5],
  },
  G: {
    label: "frog",
    color: TABLEAU10[6],
  },
  H: {
    label: "horse",
    color: TABLEAU10[7],
  },
  I: {
    label: "ship",
    color: TABLEAU10[8],
  },
  J: {
    label: "truck",
    color: TABLEAU10[9],
  },
} satisfies ChartConfig;

interface Props {
  mode: "Training" | "Test";
  gapData: GapDataItem[];
  maxGap: number;
  showYAxis?: boolean;
  hoveredClass: string | null;
  setHoveredClass: (value: string | null) => void;
}

type TickProps = {
  x: number;
  y: number;
  payload: any;
  hoveredClass: string | null;
  forgetClass: number;
};

const AxisTick = memo(
  ({ x, y, payload, hoveredClass, forgetClass }: TickProps) => {
    const label = chartConfig[payload.value as keyof typeof chartConfig]?.label;
    const isForgetClass = label === forgetClassNames[forgetClass];
    const formattedLabel = isForgetClass ? `${label}\u00A0(X)` : label;

    return (
      <text
        x={x}
        y={y}
        dy={4}
        textAnchor="end"
        fontSize={LABEL_FONT_SIZE}
        fontWeight={hoveredClass === payload.value ? "bold" : TICK_FONT_WEIGHT}
      >
        {formattedLabel}
      </text>
    );
  }
);

export default function VerticalBarChart({
  mode,
  gapData,
  maxGap,
  showYAxis = true,
  hoveredClass,
  setHoveredClass,
}: Props) {
  const { forgetClass } = useContext(ForgetClassContext);

  const renderTick = useCallback(
    (props: any) => (
      <AxisTick
        {...props}
        hoveredClass={hoveredClass}
        forgetClass={forgetClass as number}
      />
    ),
    [hoveredClass, forgetClass]
  );

  const remainGapAvgValue = useMemo(() => {
    const remainingData = gapData.filter(
      (datum) =>
        forgetClassNames[+datum.classLabel] !==
        forgetClassNames[forgetClass as number]
    );

    return remainingData.length
      ? remainingData.reduce((sum, datum) => sum + datum.gap, 0) /
          remainingData.length
      : 0;
  }, [gapData, forgetClass]);
  const remainGapAvg = Number(remainGapAvgValue.toFixed(3));

  return (
    <div className="flex flex-col justify-center items-center relative">
      <span
        className={`text-[15px] relative ${
          mode === "Training" ? "left-[30px]" : "left-0"
        }`}
      >
        {mode} Dataset
      </span>
      <ChartContainer
        config={chartConfig}
        className={`${showYAxis ? "w-[265px]" : "w-[205px]"} h-[232px]`}
      >
        <BarChart
          accessibilityLayer
          data={gapData}
          layout="vertical"
          margin={{
            left: 8,
            right: 8,
            top: 12,
            bottom: 2,
          }}
          onMouseMove={(state: any) => {
            if (state?.activePayload) {
              setHoveredClass(state.activePayload[0].payload.category);
            }
          }}
          onMouseLeave={() => setHoveredClass(null)}
        >
          <YAxis
            limitingConeAngle={30}
            dataKey="category"
            type="category"
            tickLine={false}
            axisLine={{ stroke: BLACK }}
            interval={0}
            fontSize={LABEL_FONT_SIZE}
            fontWeight={TICK_FONT_WEIGHT}
            tick={showYAxis ? renderTick : false}
            width={showYAxis ? 60 : 1}
            tickMargin={-1}
            tickFormatter={(value) => {
              const label =
                chartConfig[value as keyof typeof chartConfig]?.label;
              const isForgetClass =
                label === forgetClassNames[forgetClass as number];
              return isForgetClass ? `${label}\u00A0(X)` : label;
            }}
            style={{ whiteSpace: "nowrap" }}
          />
          <XAxis
            dataKey="value"
            type="number"
            axisLine={{ stroke: BLACK }}
            domain={[-maxGap, maxGap]}
            tickFormatter={(value) => value.toString()}
            fontSize={LABEL_FONT_SIZE}
            ticks={[-maxGap, 0, maxGap]}
          >
            <Label
              fill={BLACK}
              className="-translate-y-2 text-xs"
              value={`← Baseline High | Comparison High →`}
              offset={-1}
              dx={8.5}
              position="bottom"
            />
          </XAxis>
          <ReferenceLine x={0} stroke="#777" />
          <Tooltip cursor={false} content={<CustomTooltip />} />
          <Bar dataKey="gap" layout="vertical" barSize={12} />
          <ReferenceLine
            x={remainGapAvg}
            stroke="#777"
            strokeDasharray="3 3"
            label={{
              value: `avg (remain): ${remainGapAvg}`,
              position: "top",
              fontSize: LABEL_FONT_SIZE,
              fill: BLACK,
              offset: 3.5,
            }}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (active && payload && payload.length) {
    const data = payload[0].payload as GapDataItem;
    return (
      <div className="rounded-lg border border-border/50 bg-white px-2 py-1 text-sm shadow-xl">
        <div className="flex items-center">
          <BaselineNeuralNetworkIcon className="mr-1" />
          <p>
            Baseline:{" "}
            <span className="font-semibold">
              {data.baselineAccuracy.toFixed(TOOLTIP_FIX_LENGTH)}
            </span>
          </p>
        </div>
        <div className="flex items-center">
          <ComparisonNeuralNetworkIcon className="mr-1" />
          <p>
            Comparison:{" "}
            <span className="font-semibold">
              {data.comparisonAccuracy.toFixed(TOOLTIP_FIX_LENGTH)}
            </span>
          </p>
        </div>
        <p>
          Difference:{" "}
          <span className="font-semibold">
            {data.gap.toFixed(TOOLTIP_FIX_LENGTH)}
          </span>
        </p>
      </div>
    );
  }
  return null;
}
