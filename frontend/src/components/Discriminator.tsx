import { useState, useContext } from "react";
import * as d3 from "d3";

import DistributionDotPlot from "./DistributionDotPlot";
import PieChart from "./PieChart";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";

export type DataPoint = {
  entropy: number;
  type: "default" | "payback";
  status: "denied" | "granted";
};

const generateData = (): DataPoint[] => {
  const data: DataPoint[] = [];

  for (let i = 0; i < 200; i++) {
    const entropy = Math.round(d3.randomNormal(2.5, 1)() * 4) / 4;
    data.push({
      entropy,
      type: "default",
      status: entropy < 4 ? "denied" : "granted",
    });
  }

  for (let i = 0; i < 200; i++) {
    const entropy = Math.round(d3.randomNormal(5.5, 1)() * 4) / 4;
    data.push({
      entropy,
      type: "payback",
      status: entropy < 4 ? "denied" : "granted",
    });
  }

  return data;
};
const DATA = generateData();

interface Props {
  mode: "Baseline" | "Comparison";
}

export default function Discriminator({ mode }: Props) {
  const { baseline, comparison } = useContext(BaselineComparisonContext);

  const [threshold, setThreshold] = useState(4);

  const id = mode === "Baseline" ? baseline : comparison;

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col items-center">
        <p className="text-[15px]">
          Retrain vs {mode} {id !== "" && `(${id})`}
        </p>
        <DistributionDotPlot
          data={DATA}
          threshold={threshold}
          setThreshold={setThreshold}
        />
      </div>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center">
          <p className="text-[15px]">False Positive Ratio</p>
          <p className="text-sm font-light">
            Lorem ipsum dolor sit amet
            <br />
            consectetur adipisicing elit.
          </p>
          <PieChart data={DATA} threshold={threshold} />
        </div>
        <div className="flex flex-col items-center">
          <p className="text-[15px]">False Negative Ratio</p>
          <p className="text-sm font-light">
            Lorem ipsum dolor sit amet
            <br />
            consectetur adipisicing elit.
          </p>
          <PieChart data={DATA} threshold={threshold} />
        </div>
      </div>
      <p className="font-bold text-[15px]">Forgetting Quality: 0.8165</p>
    </div>
  );
}
