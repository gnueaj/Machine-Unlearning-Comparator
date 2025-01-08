import { useMemo, useContext, useState } from "react";

import View from "../components/View";
import Title from "../components/Title";
import Indicator from "../components/Indicator";
import VerticalBarChart from "../components/Accuracies/VerticalBarChart";
import { Chart01Icon } from "../components/UI/icons";
import { ForgetClassContext } from "../store/forget-class-context";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { ExperimentsContext } from "../store/experiments-context";
import { getAccuracyGap } from "../utils/data/getAccuracyGap";

export interface GapDataItem {
  category: string;
  classLabel: string;
  gap: number;
  fill: string;
  baselineAccuracy: number;
  comparisonAccuracy: number;
}

function getMaxGap(gapData: GapDataItem[]) {
  return Number(
    Math.max(...gapData.map((item) => Math.abs(item.gap))).toFixed(3)
  );
}

export default function Accuracies({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { forgetClass } = useContext(ForgetClassContext);
  const { baseline, comparison } = useContext(BaselineComparisonContext);
  const { baselineExperiment, comparisonExperiment } =
    useContext(ExperimentsContext);

  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  const trainAccuracyGap = useMemo(
    () => getAccuracyGap(baselineExperiment?.accs, comparisonExperiment?.accs),
    [baselineExperiment?.accs, comparisonExperiment?.accs]
  );
  const testAccuracyGap = useMemo(
    () =>
      getAccuracyGap(baselineExperiment?.t_accs, comparisonExperiment?.t_accs),
    [baselineExperiment?.t_accs, comparisonExperiment?.t_accs]
  );

  const trainMaxGap = getMaxGap(trainAccuracyGap);
  const testMaxGap = getMaxGap(testAccuracyGap);
  const maxGap = Math.max(trainMaxGap, testMaxGap);

  return (
    <View width={width} height={height} className="border-t-0">
      <Title
        Icon={<Chart01Icon />}
        title="Accuracies"
        customClass="bottom-[2px] right-[1px]"
        AdditionalContent={
          <span className="ml-1">(Comparison - Baseline)</span>
        }
      />
      {forgetClass !== undefined ? (
        baseline === "" || comparison === "" ? (
          <Indicator about="BaselineComparison" />
        ) : (
          <div className="w-full flex items-center relative bottom-0.5">
            <VerticalBarChart
              mode="Training"
              gapData={trainAccuracyGap}
              maxGap={maxGap}
              hoveredClass={hoveredClass}
              setHoveredClass={setHoveredClass}
            />
            <VerticalBarChart
              mode="Test"
              gapData={testAccuracyGap}
              maxGap={maxGap}
              showYAxis={false}
              hoveredClass={hoveredClass}
              setHoveredClass={setHoveredClass}
            />
          </div>
        )
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </View>
  );
}
