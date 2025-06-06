import React, { useState, useEffect } from "react";

import HyperparameterInput from "./HyperparameterInput";
import {
  EPOCH,
  LEARNING_RATE,
  BATCH_SIZE,
} from "../../../constants/experiments";
import { Badge } from "../../UI/badge";
import { getDefaultUnlearningConfig } from "../../../utils/config/unlearning";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  method: string;
  epochsList: string[];
  learningRateList: string[];
  batchSizeList: string[];
  setEpoch: (epoch: string[]) => void;
  setLearningRate: (lr: string[]) => void;
  setBatchSize: (bs: string[]) => void;
  onPlusClick: (id: string, value: string) => void;
  onBadgeClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function MethodUnlearning({
  method,
  epochsList,
  learningRateList,
  batchSizeList,
  setEpoch,
  setLearningRate,
  setBatchSize,
  onPlusClick,
  onBadgeClick,
  ...props
}: Props) {
  const [initialValues, setInitialValues] = useState(["10", "0.01", "64"]);

  useEffect(() => {
    const { epoch, learning_rate, batch_size } =
      getDefaultUnlearningConfig(method);

    setInitialValues([epoch, learning_rate, batch_size]);
    setEpoch([epoch]);
    setLearningRate([learning_rate]);
    setBatchSize([batch_size]);
  }, [method, setBatchSize, setEpoch, setLearningRate]);

  return (
    <div className="w-full">
      <p className="mb-[3px]">Hyperparameters</p>
      <div className="w-full pl-5 grid gap-y-2.5">
        <div className="grid gap-y-2.5">
          <HyperparameterInput
            title="Epoch"
            initialValue={initialValues[0]}
            paramList={epochsList}
            onPlusClick={onPlusClick}
            {...props}
          />
          {epochsList.length > 0 && (
            <div className="flex gap-x-2">
              {epochsList.map((epoch, idx) => (
                <Badge
                  id={EPOCH}
                  key={idx}
                  onClick={onBadgeClick}
                  className="px-2 py-1 text-xs cursor-pointer bg-[#E2E8F0] hover:bg-[#d1d7ef] text-black"
                >
                  {epoch}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-y-2.5">
          <HyperparameterInput
            title="Learning Rate"
            initialValue={initialValues[1]}
            paramList={learningRateList}
            onPlusClick={onPlusClick}
            {...props}
          />
          {learningRateList.length > 0 && (
            <div className="flex gap-x-2">
              {learningRateList.map((rate, idx) => (
                <Badge
                  id={LEARNING_RATE}
                  key={idx}
                  onClick={onBadgeClick}
                  className="px-2 py-1 text-xs cursor-pointer bg-[#E2E8F0] hover:bg-[#d1d7ef] text-black"
                >
                  {rate}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-y-2.5">
          <HyperparameterInput
            title="Batch Size"
            initialValue={initialValues[2]}
            paramList={batchSizeList}
            onPlusClick={onPlusClick}
            {...props}
          />
          {batchSizeList.length > 0 && (
            <div className="flex gap-x-2 mb-1.5">
              {batchSizeList.map((batch, idx) => (
                <Badge
                  id={BATCH_SIZE}
                  key={idx}
                  onClick={onBadgeClick}
                  className="px-2 py-1 text-xs cursor-pointer bg-[#E2E8F0] hover:bg-[#d1d7ef] text-black"
                >
                  {batch}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
