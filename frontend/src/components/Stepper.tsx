import { Check, Dot, Loader2 } from "lucide-react";

import { Button } from "../components/UI/button";
import { Step } from "../views/Progress";
import {
  Stepper,
  StepperDescription,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "../components/UI/stepper";

export default function _Stepper({
  steps,
  activeStep,
  completedSteps,
  isRunning,
}: {
  steps: Step[];
  activeStep: number;
  completedSteps: number[];
  isRunning: boolean;
}) {
  return (
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
  );
}
