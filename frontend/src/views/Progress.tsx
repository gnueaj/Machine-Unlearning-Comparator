import { useState, useEffect, useContext, useCallback } from "react";
import { Clock } from "lucide-react";

import View from "../components/View";
import Stepper from "../components/Stepper";
import Title from "../components/Title";
import Indicator from "../components/Indicator";
import { Separator } from "../components/UI/separator";
import { fetchDataFile } from "../utils/api/unlearning";
import { ExperimentsContext } from "../store/experiments-context";
import { RunningStatusContext } from "../store/running-status-context";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { fetchUnlearningStatus, cancelUnlearning } from "../utils/api/requests";
import { VitalIcon } from "../components/UI/icons";
import { ForgetClassContext } from "../store/forget-class-context";
import { getProgressSteps } from "../utils/data/getProgressSteps";

export type Step = {
  step: number;
  title: string;
  description: string;
};

export default function Progress({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { addExperiment } = useContext(ExperimentsContext);
  const { forgetClass } = useContext(ForgetClassContext);
  const { saveComparison } = useContext(BaselineComparisonContext);
  const {
    isRunning,
    status,
    activeStep,
    updateIsRunning,
    completedSteps,
    updateStatus,
    updateActiveStep,
  } = useContext(RunningStatusContext);

  const [umapProgress, setUmapProgress] = useState(0);
  const [ckaProgress, setCkaProgress] = useState(0);
  const [runningTime, setRunningTime] = useState(0);

  const forgetClassExist =
    forgetClass !== undefined && status[forgetClass as number] !== undefined;
  const progress = forgetClassExist
    ? status[forgetClass as number].progress
    : "";
  const steps: Step[] = getProgressSteps(
    status[forgetClass as number],
    completedSteps,
    activeStep,
    umapProgress,
    ckaProgress
  );

  const checkStatus = useCallback(async () => {
    try {
      const unlearningStatus = await fetchUnlearningStatus();

      updateStatus({
        status: unlearningStatus,
        forgetClass: forgetClass as number,
      });

      const progress = unlearningStatus.progress;
      if (progress.includes("Evaluating")) {
        updateActiveStep(2);
      } else if (progress.includes("UMAP") || progress.includes("CKA")) {
        updateActiveStep(3);
      }

      if (!unlearningStatus.is_unlearning) {
        updateIsRunning(false);
        updateActiveStep(0);

        try {
          const newData = await fetchDataFile(
            forgetClass as number,
            unlearningStatus.recent_id as string
          );
          addExperiment(newData);
          saveComparison(newData.id);
        } catch (error) {
          console.error("Failed to fetch data file:", error);
        }
      }
    } catch (error) {
      console.error("Failed to fetch unlearning status:", error);
      updateIsRunning(false);
      await cancelUnlearning();
    }
  }, [
    addExperiment,
    forgetClass,
    saveComparison,
    updateActiveStep,
    updateIsRunning,
    updateStatus,
  ]);

  useEffect(() => {
    let statusIntervalId: NodeJS.Timeout | null = null;
    let timerIntervalId: NodeJS.Timeout | null = null;

    if (isRunning) {
      setRunningTime(0);
      statusIntervalId = setInterval(checkStatus, 1000);
      timerIntervalId = setInterval(() => {
        setRunningTime((prev) => prev + 0.1);
      }, 100);
    }

    return () => {
      if (statusIntervalId) {
        clearInterval(statusIntervalId);
      }
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
      }
    };
  }, [checkStatus, isRunning]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const startTime = Date.now();
    const duration = 10000;

    if (forgetClassExist) {
      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progressValue = Math.min(
          Math.floor((elapsed / duration) * 100),
          100
        );

        if (progress.includes("UMAP")) {
          setUmapProgress(progressValue);
        } else if (progress.includes("CKA")) {
          setCkaProgress(progressValue);
        }

        if (progressValue === 100) {
          clearInterval(intervalId!);
        }
      }, 100);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [forgetClassExist, progress]);

  return (
    <View width={width} height={height} className="border-t-0">
      <Title
        Icon={<VitalIcon />}
        title="Progress"
        AdditionalContent={
          forgetClassExist && (
            <div className="flex items-center gap-1.5 ml-1.5">
              {isRunning || completedSteps.length ? (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div>
                    <div className="flex items-center gap-1 relative top-0.5">
                      <Clock className="text-muted-foreground w-3 h-3" />
                      <span className="text-sm">{runningTime.toFixed(1)}s</span>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )
        }
      />
      {forgetClassExist ? (
        <Stepper
          steps={steps}
          activeStep={activeStep}
          completedSteps={completedSteps}
          isRunning={isRunning}
        />
      ) : (
        <Indicator about="ForgetClass" />
      )}
    </View>
  );
}
