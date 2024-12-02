import { useState, useContext } from "react";

import Indicator from "../components/Indicator";
import LineChart from "../components/LineChart";
import DatasetModeSelector from "../components/DatasetModeSelector";
import { Layers02Icon } from "../components/UI/icons";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { ForgetClassContext } from "../store/forget-class-context";
import { TRAIN } from "./Predictions";

export default function Correlations({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { baseline, comparison } = useContext(BaselineComparisonContext);
  const { selectedForgetClasses } = useContext(ForgetClassContext);

  const [dataset, setDataset] = useState(TRAIN);

  const allSelected = baseline !== "" && comparison !== "";

  return (
    <section
      style={{ width, height }}
      className="px-1 flex flex-col border relative"
    >
      <div className="flex justify-between">
        <div className="flex items-center">
          <Layers02Icon />
          <h5 className="font-semibold ml-[3px] text-lg">
            Layer-Wise Correlations
          </h5>
        </div>
        {allSelected && <DatasetModeSelector onValueChange={setDataset} />}
      </div>
      {selectedForgetClasses.length > 0 ? (
        allSelected ? (
          <LineChart dataset={dataset} />
        ) : (
          <Indicator about="BaselineComparison" />
        )
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </section>
  );
}
