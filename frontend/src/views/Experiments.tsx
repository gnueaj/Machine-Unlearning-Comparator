import React, { useContext, useState, useEffect } from "react";

import Title from "../components/Title";
import Indicator from "../components/Indicator";
import DataTable from "../components/DataTable";
import Unlearning from "../components/Unlearning";
import Defense from "../components/Defense";
import Button from "../components/Button";
import { columns } from "../components/Columns";
import { PlusIcon, SettingsIcon } from "../components/UI/icons";
import { RunningStatusContext } from "../store/running-status-context";
import { ForgetClassContext } from "../store/forget-class-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../components/UI/dialog";

const UNLEARNING = "unlearning";
const DEFENSE = "defense";

type ModeType = "unlearning" | "defense";

export default function Experiments({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const { forgetClass, selectedForgetClasses } = useContext(ForgetClassContext);
  const { isRunning } = useContext(RunningStatusContext);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ModeType>(UNLEARNING);

  useEffect(() => {
    if (isRunning) setOpen(false);
  }, [isRunning]);

  const isUnlearning = mode === UNLEARNING;
  const isDefense = mode === DEFENSE;

  const handleAddExpClick = () => {
    setOpen(true);
  };

  const handleExperimentModeChange = (e: React.MouseEvent<HTMLDivElement>) => {
    setMode(e.currentTarget.id as ModeType);
  };

  return (
    <section
      style={{ width, height }}
      className="p-1 relative border border-t-0 border-l-0"
    >
      <div className="flex justify-between items-center mb-1">
        <Title Icon={<SettingsIcon />} title="Experiments" />
        {forgetClass !== undefined && (
          <Dialog
            open={open}
            onOpenChange={(value: boolean) => {
              setOpen(value);
            }}
          >
            <DialogTrigger disabled={true}>
              <Button
                onClick={handleAddExpClick}
                content={
                  <>
                    <PlusIcon color="#d1d5db" className="w-2.5 h-2.5 mr-1.5" />
                    <span className="text-gray-300">Add Experiment</span>
                  </>
                }
                className="px-2.5 mr-0.5 bg-gray-100 hover:bg-gray-100 cursor-not-allowed"
              />
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] p-4">
              <DialogHeader className="hidden">
                <DialogTitle>Run</DialogTitle>
                <DialogDescription>Running Configuration</DialogDescription>
              </DialogHeader>
              <div className="w-full flex items-center mt-2">
                <div
                  id={UNLEARNING}
                  onClick={handleExperimentModeChange}
                  className={`w-full h-8 relative flex items-center cursor-pointer ${
                    isDefense && "text-gray-400"
                  }`}
                >
                  <button className="font-semibold w-full">Unlearning</button>
                  <div
                    className={`absolute w-full h-0.5 bg-black bottom-0 ${
                      isDefense && "bg-gray-400 h-[1px]"
                    }`}
                  />
                </div>
                <div
                  id={DEFENSE}
                  onClick={handleExperimentModeChange}
                  className={`w-full h-8 relative flex items-center cursor-pointer ${
                    isUnlearning && "text-gray-400"
                  }`}
                >
                  <button className="font-semibold w-full">Defense</button>
                  <div
                    className={`absolute w-full h-0.5 bg-black bottom-0 ${
                      isUnlearning && "bg-gray-400 h-[1px]"
                    }`}
                  />
                </div>
              </div>
              {isUnlearning ? <Unlearning /> : <Defense />}
            </DialogContent>
          </Dialog>
        )}
      </div>
      {selectedForgetClasses.length === 0 ? (
        <Indicator about="ForgetClass" />
      ) : (
        <DataTable columns={columns} />
      )}
    </section>
  );
}
