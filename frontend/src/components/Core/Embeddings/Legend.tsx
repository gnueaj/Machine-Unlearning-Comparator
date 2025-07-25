import React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../UI/tabs";
import { Separator } from "../../UI/separator";
import { TABLEAU10 } from "../../../constants/colors";
import { CircleIcon, FatMultiplicationSignIcon } from "../../common/icons";
import { VIEW_MODES } from "../../../constants/embeddings";
import { useClasses } from "../../../hooks/useClasses";
import { useForgetClassStore } from "../../../stores/forgetClassStore";
import { useBaseConfigStore } from "../../../stores/baseConfigStore";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../../UI/hover-card";
import { cn } from "../../../utils/util";

interface Props {
  highlight: string;
  setHighlight: (mode: string) => void;
}

export default function EmbeddingsLegend({ highlight, setHighlight }: Props) {
  const classes = useClasses();
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const dataset = useBaseConfigStore((state) => state.dataset);

  const isDatasetCIFAR10 = dataset === "CIFAR-10";
  const oddIndices = classes.filter((_, idx) => idx % 2 === 0);
  const evenIndices = classes.filter((_, idx) => idx % 2 !== 0);

  return (
    <div className="w-full flex justify-between px-3.5 pb-[18px] text-sm z-10 relative top-3">
      <div className="flex">
        <div
          className={cn("flex flex-col", {
            "mr-[35px]": isDatasetCIFAR10,
            "mr-[27px]": !isDatasetCIFAR10,
          })}
        >
          <p className="text-lg font-medium mb-1">True Class</p>
          <ul className="flex flex-col gap-1">
            <li className="flex items-center text-nowrap">
              <CircleIcon className="w-2 h-2 mr-1.5 relative left-[1px]" />
              <span>Retain</span>
            </li>
            <li className="flex items-center">
              <FatMultiplicationSignIcon className="w-2.5 h-2.5 mr-1" />
              <span>Forget</span>
            </li>
          </ul>
        </div>
        <div className="flex flex-col">
          <p className="text-lg font-medium mb-1">Predicted Class</p>
          <div
            style={{
              gridTemplateColumns: isDatasetCIFAR10
                ? "115px 80px 80px 80px 78px"
                : "92px 94px 86px 93px 68px",
            }}
            className="grid gap-y-1"
          >
            {oddIndices.map((name, idx) => {
              const originalIdx = idx * 2;
              return (
                <li key={originalIdx} className="flex items-center">
                  <div
                    style={{ backgroundColor: TABLEAU10[originalIdx] }}
                    className="w-3 h-4 mr-[5px]"
                  />
                  <span>
                    {forgetClass === originalIdx ? name + " (\u2716)" : name}
                  </span>
                </li>
              );
            })}
            {evenIndices.map((name, idx) => {
              const originalIdx = idx * 2 + 1;
              return (
                <li key={originalIdx} className="flex items-center">
                  <div
                    style={{ backgroundColor: TABLEAU10[originalIdx] }}
                    className="w-3 h-4 mr-[5px]"
                  />
                  <span>
                    {forgetClass === originalIdx ? name + " (\u2716)" : name}
                  </span>
                </li>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex">
        <div className="mr-4">
          <p className="text-lg font-medium mb-[5px]">Highlight</p>
          <p className="w-[102px] text-sm font-light">
            Choose a category to emphasize:
          </p>
        </div>
        <Tabs
          value={highlight}
          onValueChange={setHighlight}
          className="relative top-0.5"
        >
          <TabsList className="h-12">
            {VIEW_MODES.map((mode, idx) => (
              <React.Fragment key={idx}>
                <TabsTrigger
                  value={mode.label}
                  style={{ width: mode.length }}
                  className="h-10 data-[state=active]:bg-neutral-dark data-[state=active]:text-white"
                >
                  <HoverCard openDelay={0} closeDelay={0}>
                    <HoverCardTrigger>{mode.label}</HoverCardTrigger>
                    <HoverCardContent
                      className="w-auto px-2.5 py-1.5 font-normal"
                      side="top"
                    >
                      {mode.explanation}
                    </HoverCardContent>
                  </HoverCard>
                </TabsTrigger>
                {idx < VIEW_MODES.length - 1 && (
                  <Separator
                    orientation="vertical"
                    className={cn(
                      "w-[1.5px] h-5",
                      mode.label === highlight ||
                        VIEW_MODES[idx + 1].label === highlight
                        ? "bg-muted"
                        : "bg-[#d2d5d9]"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </TabsList>
          {VIEW_MODES.map((mode, idx) => (
            <TabsContent
              key={idx}
              value={mode.label}
              className="absolute bottom-0.5 left-0 text-sm font-light"
            >
              {mode.explanation}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <Separator
        orientation="horizontal"
        className="w-[calc(100%+12.8px)] h-[1px] absolute bottom-0 -right-1.5"
      />
    </div>
  );
}
