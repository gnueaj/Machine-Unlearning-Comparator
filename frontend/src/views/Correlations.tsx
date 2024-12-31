import { useState, useContext } from "react";

import View from "../components/View";
import Title from "../components/Title";
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
  const { forgetClass } = useContext(ForgetClassContext);

  const [dataset, setDataset] = useState(TRAIN);

  const forgetClassExist = forgetClass !== undefined;
  const allSelected = baseline !== "" && comparison !== "";

  return (
    <View width={width} height={height}>
      <div className="flex justify-between">
        <Title
          Icon={<Layers02Icon />}
          title="Layer-Wise Correlations"
          customClass="bottom-[2px]"
        />
        {forgetClassExist && allSelected && (
          <DatasetModeSelector onValueChange={setDataset} />
        )}
      </div>
      {forgetClassExist ? (
        allSelected ? (
          <LineChart dataset={dataset} />
        ) : (
          <Indicator about="BaselineComparison" />
        )
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </View>
  );
}
