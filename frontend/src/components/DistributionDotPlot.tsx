import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const MARGIN = { top: 40, right: 40, bottom: 50, left: 40 };
const LEGEND_DATA = [
  { label: "denied loan / would default", color: "#808080" },
  { label: "denied loan / would pay back", color: "#404040" },
  { label: "granted loan / defaults", color: "#60a5fa" },
  { label: "granted loan / pays back", color: "#1e40af" },
];

interface DataPoint {
  entropy: number;
  type: "default" | "payback";
  status: "denied" | "granted";
}

const generateData = (): DataPoint[] => {
  const data: DataPoint[] = [];

  for (let i = 0; i < 200; i++) {
    const entropy = Math.round(d3.randomNormal(3, 1)() * 4) / 4;
    data.push({
      entropy,
      type: "default",
      status: entropy < 4 ? "denied" : "granted",
    });
  }

  for (let i = 0; i < 200; i++) {
    const entropy = Math.round(d3.randomNormal(5, 1)() * 4) / 4;
    data.push({
      entropy,
      type: "payback",
      status: entropy < 4 ? "denied" : "granted",
    });
  }

  return data;
};
const DATA = generateData();

const DistributionPlot: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [threshold, setThreshold] = useState(4);
  const width = 600;
  const height = 300;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();

    const xScale = d3
      .scaleLinear()
      .domain([-2, 10])
      .range([MARGIN.left, width - MARGIN.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 30])
      .range([height - MARGIN.bottom, MARGIN.top]);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - MARGIN.bottom})`)
      .call(d3.axisBottom(xScale).ticks(6));

    svg
      .selectAll("circle")
      .data(DATA)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.entropy))
      .attr("cy", (d, i) => {
        const binWidth = 0.25;
        const bin = Math.floor(d.entropy / binWidth);
        const pointsInBin = DATA.filter(
          (p) => Math.floor(p.entropy / binWidth) === bin
        );
        const defaultPoints = pointsInBin.filter((p) => p.type === "default");
        const paybackPoints = pointsInBin.filter((p) => p.type === "payback");

        if (d.type === "default") {
          const position = defaultPoints.indexOf(d);
          return yScale(position + 1);
        } else {
          const position = paybackPoints.indexOf(d) + defaultPoints.length;
          return yScale(position + 1);
        }
      })
      .attr("r", 4)
      .attr("fill", (d) => {
        if (d.entropy < threshold) {
          return d.type === "default" ? "#808080" : "#404040";
        } else {
          return d.type === "default" ? "#60a5fa" : "#1e40af";
        }
      });

    const dragLine = d3.drag().on("drag", (event) => {
      const newX = event.x;
      const newThreshold = xScale.invert(newX);

      if (newThreshold >= -2 && newThreshold <= 10) {
        setThreshold(newThreshold);

        thresholdGroup.attr("transform", `translate(${newX}, 0)`);

        svg
          .selectAll("circle")
          .data<DataPoint>(DATA)
          .attr("fill", (d) => {
            if (d.entropy < newThreshold) {
              return d.type === "default" ? "#808080" : "#404040";
            } else {
              return d.type === "payback" ? "#1e40af" : "#60a5fa";
            }
          });
      }
    });

    const thresholdGroup = svg
      .append("g")
      .attr("transform", `translate(${xScale(threshold)}, 0)`)
      .attr("cursor", "ew-resize")
      .call(dragLine as any);

    thresholdGroup
      .append("line")
      .attr("y1", MARGIN.top)
      .attr("y2", height - MARGIN.bottom)
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    thresholdGroup
      .append("rect")
      .attr("x", -10)
      .attr("y", MARGIN.top)
      .attr("width", 20)
      .attr("height", height - MARGIN.top - MARGIN.bottom)
      .attr("fill", "transparent");

    thresholdGroup
      .append("text")
      .attr("y", MARGIN.top - 10)
      .attr("text-anchor", "middle")
      .text(`threshold: ${threshold.toFixed(1)}`);

    const legend = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, ${height - 20})`);

    LEGEND_DATA.forEach((item, i) => {
      const legendRow = legend
        .append("g")
        .attr("transform", `translate(${i * 200}, 0)`);

      legendRow
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .style("fill", item.color);

      legendRow
        .append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text(item.label)
        .style("font-size", "12px");
    });
  }, [threshold]);

  return <svg ref={svgRef}></svg>;
};

export default DistributionPlot;
