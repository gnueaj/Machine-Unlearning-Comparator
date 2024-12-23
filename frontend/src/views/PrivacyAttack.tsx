import { useState, useContext } from "react";
import * as d3 from "d3";

import DistributionDotPlot from "../components/DistributionDotPlot";
import PieChart from "../components/PieChart";
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

export default function PrivacyAttack({ height }: { height: number }) {
  const { comparison } = useContext(BaselineComparisonContext);

  const [threshold, setThreshold] = useState(4);

  return (
    <div
      style={{ height }}
      className="w-full flex justify-evenly items-center border-[1px] border-solid border-[rgba(0, 0, 0, 0.2)] rounded-[6px]"
    >
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="text-[15px]">
            Retrain vs Comparison {comparison !== "" && `(${comparison})`}
          </p>
          <DistributionDotPlot
            data={DATA}
            threshold={threshold}
            setThreshold={setThreshold}
          />
        </div>
        <div className="flex items-center gap-16">
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
    </div>
  );
}
