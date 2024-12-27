import React, { useContext, useState } from "react";

import Button from "./Button";
import Slider from "./Slider";
import { Input } from "./UI/input";
import { Label } from "./UI/label";
import { HyperparametersIcon, EraserIcon, PlusIcon } from "./UI/icons";
import { RunningStatusContext } from "../store/running-status-context";
import { ForgetClassContext } from "../store/forget-class-context";
import { UNLEARNING_METHODS } from "../constants/unlearning";
import { getDefaultUnlearningConfig } from "../utils/config/unlearning";
import { UnlearningConfigurationData } from "../types/settings";
import {
  executeMethodUnlearning,
  executeCustomUnlearning,
} from "../utils/api/unlearning";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./UI/select";

const CUSTOM = "custom";
const LEARNING_RATE = [
  "1e-5",
  "5e-5",
  "1e-4",
  "5e-4",
  "1e-3",
  "5e-3",
  "1e-2",
  "5e-2",
  "1e-1",
];

export default function Unlearning() {
  const { forgetClass } = useContext(ForgetClassContext);
  const { updateIsRunning, initStatus, updateActiveStep } =
    useContext(RunningStatusContext);

  const [epochs, setEpochs] = useState([10]);
  const [learningRateIdx, setLearningRateIdx] = useState([6]);
  const [batchSizeLog, setBatchSizeLog] = useState([6]);
  const [method, setMethod] = useState("ft");

  const isCustom = method === CUSTOM;

  const handleMethodSelection = (value: string) => {
    setMethod(value);
    if (value !== CUSTOM) {
      const { epochs, learning_rate, batch_size } =
        getDefaultUnlearningConfig(value);
      setEpochs([epochs]);
      setLearningRateIdx([learning_rate]);
      setBatchSizeLog([batch_size]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const fd = new FormData(e.currentTarget);

    const config = Object.fromEntries(fd.entries());

    const runningConfig: UnlearningConfigurationData = {
      method: config.method as string,
      forget_class: forgetClass as number,
      epochs: epochs[0],
      learning_rate: parseFloat(LEARNING_RATE[learningRateIdx[0]]),
      batch_size: Math.pow(2, batchSizeLog[0]),
    };

    updateIsRunning(true);
    initStatus(forgetClass as number);
    updateActiveStep(1);

    isCustom
      ? await executeCustomUnlearning(
          config.custom_file as File,
          forgetClass as number
        )
      : await executeMethodUnlearning(runningConfig);
  };

  return (
    <form
      className="w-full h-full flex flex-col items-start justify-between"
      onSubmit={handleSubmit}
    >
      <div className="w-full grid grid-cols-2 gap-y-2">
        <div className="flex items-center mb-1">
          <EraserIcon className="w-4 h-4 mr-1 scale-110" />
          <Label className="text-base text-nowrap" htmlFor="method">
            Method
          </Label>
        </div>
        <Select
          defaultValue="ft"
          onValueChange={handleMethodSelection}
          name="method"
        >
          <SelectTrigger className="h-[25px] text-base">
            <SelectValue placeholder={UNLEARNING_METHODS[0]} />
          </SelectTrigger>
          <SelectContent>
            {UNLEARNING_METHODS.map((method, idx) => {
              const chunks = method.split("-");
              const value =
                chunks.length === 1
                  ? chunks[0].toLowerCase()
                  : (chunks[0][0] + chunks[1][0]).toLowerCase();
              return (
                <SelectItem key={idx} value={value}>
                  {method}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      {isCustom ? (
        <div className="w-full grid grid-cols-2 gap-y-2">
          <div className="flex items-center mb-1">
            <HyperparametersIcon className="w-3.5" />
            <p className="ml-1 text-nowrap">Custom File</p>
          </div>
          <Input
            type="file"
            name="custom_file"
            accept=".pth"
            className="h-[25px] py-0.5 px-[7px] cursor-pointer"
          />
        </div>
      ) : (
        <div>
          <div className="flex items-center mb-2">
            <HyperparametersIcon className="w-3.5 ml-[1px] mr-[5px]" />
            <p>Hyperparameters</p>
          </div>
          <div className="ml-10 grid grid-cols-[auto,1fr] grid-rows-3 gap-y-2">
            <span className="text-sm">Epochs</span>
            <Slider
              name="epochs"
              value={epochs}
              setValue={setEpochs}
              min={1}
              max={20}
              step={1}
            />
            <span className="text-sm">Learning Rate</span>
            <Slider
              name="learning_rate"
              value={learningRateIdx}
              setValue={setLearningRateIdx}
              min={0}
              max={8}
              step={1}
              displayValue={`${LEARNING_RATE[learningRateIdx[0]]}`}
            />
            <span className="text-sm">Batch Size</span>
            <Slider
              name="batch_size"
              setValue={setBatchSizeLog}
              value={batchSizeLog}
              min={0}
              max={9}
              step={1}
              displayValue={Math.pow(2, batchSizeLog[0])}
            />
          </div>
        </div>
      )}
      <Button
        content={
          <>
            <PlusIcon className="w-3 h-3 mr-1.5" color="white" />
            <span className="text-base">Run and Add an Experiment</span>
          </>
        }
        className="w-full flex items-center mt-4"
      />
    </form>
  );
}
