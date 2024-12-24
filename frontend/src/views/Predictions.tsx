import { useState, useContext } from "react";
import * as d3 from "d3";

import Title from "../components/Title";
import DatasetModeSelector from "../components/DatasetModeSelector";
import BubbleChart from "../components/BubbleChart";
import Indicator from "../components/Indicator";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { ForgetClassContext } from "../store/forget-class-context";
import { Target02Icon, ShortArrow, LongArrow } from "../components/UI/icons";

export const TRAIN = "train";
export const TEST = "test";
export const BUBBLE = "bubble";
export const LABEL_HEATMAP = "label-heatmap";
export const CONFIDENCE_HEATMAP = "confidence-heatmap";

export type ChartModeType = "bubble" | "label-heatmap" | "confidence-heatmap";

export default function Predictions({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { baseline, comparison } = useContext(BaselineComparisonContext);
  const { forgetClass } = useContext(ForgetClassContext);

  const [datasetMode, setDatasetMode] = useState(TRAIN);
  const [hoveredY, setHoveredY] = useState<number | null>(null);

  const forgetClassExist = forgetClass !== undefined;
  const allSelected = baseline !== "" && comparison !== "";

  return (
    <section
      style={{ width, height }}
      className="p-1 flex flex-col border transition-all z-10 relative"
    >
      <div className="flex justify-between">
        <Title Icon={<Target02Icon />} title="Predictions" />
        {forgetClassExist && allSelected && (
          <DatasetModeSelector onValueChange={setDatasetMode} />
        )}
      </div>
      {forgetClassExist ? (
        !allSelected ? (
          <Indicator about="BaselineComparison" />
        ) : (
          <div className="flex items-center relative ml-1.5 top-5">
            <BubbleChart
              mode="Baseline"
              datasetMode={datasetMode}
              hoveredY={hoveredY}
              onHover={(y) => setHoveredY(y)}
              onHoverEnd={() => setHoveredY(null)}
            />
            <BubbleChart
              mode="Comparison"
              datasetMode={datasetMode}
              showYAxis={false}
              hoveredY={hoveredY}
              onHover={(y) => setHoveredY(y)}
              onHoverEnd={() => setHoveredY(null)}
            />
          </div>
        )
      ) : (
        <Indicator about="ForgetClass" />
      )}
      {allSelected && forgetClassExist && <BubbleChartLegend />}
    </section>
  );
}

function BubbleChartLegend() {
  return (
    <div className="flex items-center absolute top-1.5 left-1/2 -translate-x-[50%] gap-11 text-[#666666]">
      <div
        className="grid grid-cols-3 gap-x-2 place-items-center relative left-2.5 text-[10px]"
        style={{ gridTemplateRows: "18px 14px" }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#666666]" />
        <div className="w-3 h-3 rounded-full bg-[#666666]" />
        <div className="w-[18px] h-[18px] rounded-full bg-[#666666]" />
        <span>Less</span>
        <ShortArrow />
        <span>More</span>
        <span className="absolute top-[27px] text-[13px]">Frequent</span>
      </div>
      <div className="flex flex-col items-center gap-1 relative top-0.5">
        <ColorBar />
        <div className="text-nowrap flex items-center gap-2 text-[10px]">
          <span>Less</span>
          <LongArrow />
          <span>More</span>
        </div>
        <span className="absolute top-[25px] text-[13px]">Confident</span>
      </div>
    </div>
  );
}

const ColorBar = () => {
  const steps = 10;
  const colors = Array.from({ length: steps }, (_, i) => {
    const percent = (i / (steps - 1)) * 100;
    const color = d3.interpolateWarm(i / (steps - 1));
    return `${color} ${percent}%`;
  });

  const gradient = `linear-gradient(to right, ${colors.join(", ")})`;

  return (
    <div className="relative w-[110px] h-2.5">
      <div
        className="absolute w-full h-full"
        style={{ background: gradient }}
      />
      <div className="absolute -bottom-[5px] left-0.5">
        <span className="text-[9px] font-bold text-white">0</span>
      </div>
      <div className="absolute -bottom-[5px] right-0.5">
        <span className="text-[9px] font-bold text-[#666666]">1</span>
      </div>
    </div>
  );
};
