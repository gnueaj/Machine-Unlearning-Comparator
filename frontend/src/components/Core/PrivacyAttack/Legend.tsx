import React from "react";

import { Button } from "../../UI/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../UI/tabs";
import { useThresholdStore } from "../../../stores/thresholdStore";
import { useAttackStateStore } from "../../../stores/attackStore";
import { THRESHOLD_STRATEGIES } from "../../../constants/privacyAttack";
import { RadioGroup, RadioGroupItem } from "../../UI/radio-group";
import { Separator } from "../../UI/separator";
import { Label } from "../../UI/label";
import { COLORS } from "../../../constants/colors";
import { ENTROPY, CONFIDENCE } from "../../../constants/common";
import { cn } from "../../../utils/util";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../UI/hover-card";

export default function Legend() {
  const strategyThresholds = useThresholdStore(
    (state) => state.strategyThresholds
  );
  const { metric, strategy, setMetric, setStrategy, setWorstCaseModel } =
    useAttackStateStore();

  const isEntropyChecked = metric === ENTROPY;
  const displayStrategy =
    strategy === "BEST_ATTACK" ? THRESHOLD_STRATEGIES[1].strategy : strategy;

  return (
    <div className="w-full flex justify-between px-3.5 pt-2 pb-[18px] text-sm z-10 relative top-1">
      <div className="flex items-center gap-5 relative top-0.5">
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger>
            <Button
              style={{ backgroundColor: COLORS.EMERALD }}
              className="w-[140px] h-[70px] text-xl font-medium leading-5 rounded-md"
              onClick={() => {
                setStrategy("BEST_ATTACK");
                setWorstCaseModel("A");
              }}
            >
              Model A
              <br />
              Worst Case
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto px-2.5 py-1.5" side="top">
            Automatically picks Metric, Threshold
            <br />
            Direction, and Strategy yielding the
            <br />
            lowest privacy score.
          </HoverCardContent>
        </HoverCard>
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger>
            <Button
              style={{ backgroundColor: COLORS.PURPLE }}
              className="w-[140px] h-[70px] text-xl font-medium leading-5 rounded-md"
              onClick={() => {
                setStrategy("BEST_ATTACK");
                setWorstCaseModel("B");
              }}
            >
              Model B
              <br />
              Worst Case
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-auto px-2.5 py-1.5" side="top">
            Automatically picks Metric, Threshold
            <br />
            Direction, and Strategy yielding the
            <br />
            lowest privacy score.
          </HoverCardContent>
        </HoverCard>
      </div>
      <div className="flex flex-col">
        <p className="text-lg font-medium">Metric</p>
        <RadioGroup
          className="flex flex-col gap-1"
          value={metric}
          onValueChange={setMetric}
        >
          <div className="flex items-center space-x-[5px]">
            <RadioGroupItem
              className="w-3 h-3"
              value={ENTROPY}
              id={ENTROPY}
              color="#4d4d4d"
              checked={isEntropyChecked}
            />
            <Label className="text-sm text-[#4d4d4d]" htmlFor={ENTROPY}>
              Output Entropy
            </Label>
          </div>
          <div className="flex items-center space-x-[5px]">
            <RadioGroupItem
              className="w-3 h-3"
              value={CONFIDENCE}
              id={CONFIDENCE}
              color="#4d4d4d"
              checked={!isEntropyChecked}
            />
            <Label className="text-sm text-[#4d4d4d]" htmlFor={CONFIDENCE}>
              Top-1 Confidence
            </Label>
          </div>
        </RadioGroup>
      </div>
      <div className="flex">
        <div className="mr-4">
          <p className="text-lg font-medium">Strategy</p>
          <p className="w-[120px] text-[13px] font-light">
            Choose how thresholds are determined:
          </p>
        </div>
        <Tabs
          value={displayStrategy}
          onValueChange={(val: string) => setStrategy(val)}
          className="relative top-0.5"
        >
          <TabsList className="h-12">
            {THRESHOLD_STRATEGIES.map((s, idx) => (
              <React.Fragment key={idx}>
                <TabsTrigger
                  value={s.strategy}
                  style={{ width: s.length }}
                  className="h-10 data-[state=active]:bg-neutral-dark data-[state=active]:text-white"
                >
                  <HoverCard openDelay={0} closeDelay={0}>
                    <HoverCardTrigger>
                      <p className="leading-[13px]">
                        {s.strategy}
                        <br />
                        <span className="text-[11px]">
                          {idx !== 0
                            ? `(A: ${strategyThresholds["A"][idx].toFixed(
                                2
                              )}, B: ${strategyThresholds["B"][idx].toFixed(
                                2
                              )})`
                            : ""}
                        </span>
                      </p>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="w-auto px-2.5 py-1.5 font-normal"
                      side="top"
                    >
                      {s.explanation}
                    </HoverCardContent>
                  </HoverCard>
                </TabsTrigger>
                {idx < THRESHOLD_STRATEGIES.length - 1 && (
                  <Separator
                    orientation="vertical"
                    className={cn(
                      "w-[1.5px] h-5",
                      s.strategy === strategy ||
                        THRESHOLD_STRATEGIES[idx + 1].strategy === strategy
                        ? "bg-muted"
                        : "bg-[#d2d5d9]"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </TabsList>
          {THRESHOLD_STRATEGIES.map((s, idx) => (
            <TabsContent
              key={idx}
              value={s.strategy}
              className="absolute -bottom-0.5 left-0 text-sm font-light"
            >
              {s.explanation}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Separator
        orientation="horizontal"
        className="w-[calc(100%+12.8px)] h-[1px] absolute -bottom-0.5 -right-1.5"
      />
    </div>
  );
}
