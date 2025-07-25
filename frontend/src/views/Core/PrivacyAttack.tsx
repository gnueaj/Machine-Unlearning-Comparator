import { useState, useEffect } from "react";

import Indicator from "../../components/common/Indicator";
import Legend from "../../components/Core/PrivacyAttack/Legend";
import AttackAnalytics from "../../components/Core/PrivacyAttack/AttackAnalytics";
import { Prob } from "../../types/embeddings";
import { Separator } from "../../components/UI/separator";
import { useModelDataStore } from "../../stores/modelDataStore";
import { fetchFileData } from "../../utils/api/common";
import { useForgetClassStore } from "../../stores/forgetClassStore";
import { useAttackStateStore } from "../../stores/attackStore";
import { ExperimentData } from "../../types/data";
import { ENTROPY, UNLEARN } from "../../constants/common";
import { THRESHOLD_STRATEGIES } from "../../constants/privacyAttack";

interface Props {
  modelAPoints: (number | Prob)[][];
  modelBPoints: (number | Prob)[][];
}

export default function PrivacyAttack({ modelAPoints, modelBPoints }: Props) {
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const modelA = useModelDataStore((state) => state.modelA);
  const modelB = useModelDataStore((state) => state.modelB);
  const setMetric = useAttackStateStore((state) => state.setMetric);
  const setDirection = useAttackStateStore((state) => state.setDirection);
  const setStrategy = useAttackStateStore((state) => state.setStrategy);

  const [retrainData, setRetrainData] = useState<ExperimentData>();

  const isModelAOriginal = modelA.startsWith("000");
  const isModelBOriginal = modelB.startsWith("000");

  useEffect(() => {
    setMetric(ENTROPY);
    setDirection(UNLEARN);
    setStrategy(THRESHOLD_STRATEGIES[0].strategy);
  }, [setDirection, setMetric, setStrategy]);

  useEffect(() => {
    async function loadRetrainData() {
      if (forgetClass === -1) return;
      try {
        const data = await fetchFileData(forgetClass, `a00${forgetClass}`);
        setRetrainData(data);
      } catch (error) {
        console.error(`Failed to fetch an retrained data file: ${error}`);
      }
    }
    loadRetrainData();
  }, [forgetClass]);

  return (
    <div className="h-[760px] flex flex-col border rounded-md px-1.5">
      <Legend />
      <div className="flex items-center">
        {!retrainData ? (
          <Indicator text="Failed to fetch retrain data" />
        ) : isModelAOriginal ? (
          <Indicator text="Please select an unlearned model to compare the attack results" />
        ) : (
          <AttackAnalytics
            mode="A"
            retrainPoints={retrainData.points}
            modelPoints={modelAPoints}
            retrainAttackData={retrainData.attack}
          />
        )}
        <Separator
          orientation="vertical"
          className="h-[630px] w-[1px] mx-1 relative top-3.5"
        />
        {!retrainData ? (
          <Indicator text="Failed to fetch retrain data" />
        ) : isModelBOriginal ? (
          <Indicator text="Please select an unlearned model to compare the attack results" />
        ) : (
          <AttackAnalytics
            mode="B"
            retrainPoints={retrainData.points}
            modelPoints={modelBPoints}
            retrainAttackData={retrainData.attack}
          />
        )}
      </div>
    </div>
  );
}
