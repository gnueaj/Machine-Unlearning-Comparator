import { useState, useEffect, useContext, useCallback } from "react";
import { Check, Dot, Loader2 } from "lucide-react";

import { Button } from "../components/UI/button";
import { fetchDataFile } from "../utils/api/unlearning";
import { ExperimentsContext } from "../store/experiments-context";
import { RunningStatusContext } from "../store/running-status-context";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { fetchUnlearningStatus, cancelUnlearning } from "../utils/api/requests";
import { VitalIcon } from "../components/UI/icons";
import { ForgetClassContext } from "../store/forget-class-context";
import { getProgressSteps } from "../utils/data/getProgressSteps";
import {
  Stepper,
  StepperDescription,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "../components/UI/stepper";

export default function Progress({ height }: { height: number }) {
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

  const progress = status.progress;
  const steps = getProgressSteps(
    status,
    completedSteps,
    activeStep,
    umapProgress,
    ckaProgress
  );

  const checkStatus = useCallback(async () => {
    try {
      const unlearningStatus = await fetchUnlearningStatus();

      updateStatus(unlearningStatus);

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

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [progress]);

  return (
    <section style={{ height }} className="w-[280px] p-1 relative border">
      <div className="flex items-center">
        <VitalIcon />
        <h5 className="font-semibold ml-1 text-lg">Progress</h5>
        <span className="ml-1 text-sm">
          {isRunning || completedSteps.length
            ? `(${runningTime.toFixed(1)}s)`
            : ""}
        </span>
      </div>
      <Stepper className="mx-auto mt-0.5 flex w-full flex-col justify-start gap-1.5">
        {steps.map((step, idx) => {
          const isNotLastStep = idx !== steps.length - 1;

          let state: "completed" | "active" | "inactive";
          if (step.step < activeStep) state = "completed";
          else if (step.step === activeStep) state = "active";
          else state = "inactive";

          return (
            <StepperItem
              key={idx}
              className="relative flex w-full items-start gap-2"
            >
              {isNotLastStep && (
                <StepperSeparator className="absolute left-[15px] top-6 block h-[calc(100%)] w-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary">
                  <div />
                </StepperSeparator>
              )}
              <StepperTrigger className="p-1 cursor-default">
                <Button className="w-6 h-6 p-0 rounded-full z-10 cursor-default hover:bg-[#0F172A]">
                  {state === "completed" ||
                  (completedSteps.length && !isRunning) ? (
                    <Check className="size-4" />
                  ) : state === "active" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (!completedSteps.length || isRunning) &&
                    state === "inactive" ? (
                    <Dot className="size-4" />
                  ) : null}
                </Button>
              </StepperTrigger>
              <div className="flex flex-col">
                <StepperTitle className="font-semibold transition text-sm">
                  {step.title}
                </StepperTitle>
                <StepperDescription className="text-muted-foreground whitespace-pre-line transition text-sm leading-[17px]">
                  {step.description.split("\n").map((el, idx) => (
                    <p key={idx} className="text-black">
                      {el
                        .split("**")
                        .map((part, partIdx) =>
                          partIdx % 2 === 1 ? (
                            <strong key={partIdx}>{part}</strong>
                          ) : (
                            part
                          )
                        )}
                    </p>
                  ))}
                </StepperDescription>
              </div>
            </StepperItem>
          );
        })}
      </Stepper>
    </section>
  );
}
