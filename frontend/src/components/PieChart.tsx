import { useEffect, useRef } from "react";
import * as d3 from "d3";

import { DataPoint } from "./Discriminator";

const WIDTH = 160;
const HEIGHT = 160;
const RADIUS = Math.min(WIDTH, HEIGHT) / 2.5;
const COLORS = {
  deniedDefault: "#808080",
  deniedPayback: "#404040",
  grantedDefault: "#60a5fa",
  grantedPayback: "#1e40af",
};

type PieDataPoint = {
  label: string;
  value: number;
  color: string;
};

interface Props {
  data: DataPoint[];
  threshold: number;
}

export default function PieChartDisplay({ data, threshold }: Props) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const processedData = processData(data, threshold);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 2})`);

    const pie = d3
      .pie<PieDataPoint>()
      .value((d) => d.value)
      .sort(null);

    const arc = d3
      .arc<d3.PieArcDatum<PieDataPoint>>()
      .innerRadius(0)
      .outerRadius(RADIUS);

    g.selectAll("path")
      .data(pie(processedData))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (d) => d.data.color);
  }, [data, threshold]);

  return <svg ref={svgRef} width={WIDTH} height={HEIGHT}></svg>;
}

function processData(data: DataPoint[], threshold: number) {
  return [
    {
      label: "denied loan / would default",
      value: data.filter((d) => d.entropy < threshold && d.type === "default")
        .length,
      color: COLORS.deniedDefault,
    },
    {
      label: "denied loan / would pay back",
      value: data.filter((d) => d.entropy < threshold && d.type === "payback")
        .length,
      color: COLORS.deniedPayback,
    },
    {
      label: "granted loan / defaults",
      value: data.filter((d) => d.entropy >= threshold && d.type === "default")
        .length,
      color: COLORS.grantedDefault,
    },
    {
      label: "granted loan / pays back",
      value: data.filter((d) => d.entropy >= threshold && d.type === "payback")
        .length,
      color: COLORS.grantedPayback,
    },
  ];
}
