import { useState } from "react";

import Subtitle from "../components/Subtitle";
import Indicator from "../components/Indicator";
import LineChart from "../components/CKA/LineChart";
import DatasetModeSelector from "../components/DatasetModeSelector";
import { useModelDataStore } from "../stores/modelDataStore";
import { useForgetClassStore } from "../stores/forgetClassStore";
import { TRAIN } from "../constants/common";

export default function LayerWiseSimilarity() {
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const modelA = useModelDataStore((state) => state.modelA);
  const modelB = useModelDataStore((state) => state.modelB);

  const [selectedDataset, setSelectedDataset] = useState(TRAIN);

  const areAllModelsSelected = modelA !== "" && modelB !== "";
  const forgetClassExist = forgetClass !== -1;

  return (
    <div className="h-[322.5px] relative top-1">
      <div className="flex justify-between">
        <Subtitle title="Layer-Wise Similarity" className="left-0.5" />
        {forgetClassExist && areAllModelsSelected && (
          <DatasetModeSelector
            dataset={selectedDataset}
            onValueChange={setSelectedDataset}
          />
        )}
      </div>
      {forgetClassExist ? (
        areAllModelsSelected ? (
          <div className="relative bottom-[3px]">
            <p className="w-fit text-center text-[15px] mb-0.5 relative left-[106px]">
              Similarity Between Before and After Unlearning
            </p>
            <LineChart dataset={selectedDataset} />
          </div>
        ) : (
          <Indicator about="AB" />
        )
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </div>
  );
}
