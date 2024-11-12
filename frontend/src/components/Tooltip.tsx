import { useEffect, useRef, useContext } from "react";
import * as d3 from "d3";

import { ForgetClassContext } from "../store/forget-class-context";
import { forgetClassNames } from "../constants/forgetClassNames";
import { Prob } from "../views/Embeddings";

const BASELINE_OPACITY = 0.7;
const COMPARISON_OPACITY = 1;

interface Props {
  width: number;
  height: number;
  imageUrl: string;
  data: (number | Prob)[];
  barChartData: {
    baseline: { class: number; value: number }[];
    comparison: { class: number; value: number }[];
  };
}

export default function Tooltip({
  width,
  height,
  imageUrl,
  data,
  barChartData,
}: Props) {
  const { forgetClass } = useContext(ForgetClassContext);

  const svgRef = useRef(null);

  const groundTruthIdx = Number(data[2]);
  const predictionIdx = Number(data[3]);

  const groundTruth = forgetClassNames[groundTruthIdx];
  const prediction = forgetClassNames[predictionIdx];

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 300;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 30, left: 85 };
    const barHeight = 12;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    const defs = svg.append("defs");
    const pattern = defs
      .append("pattern")
      .attr("id", "stripe")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 3)
      .attr("height", 3)
      .attr("patternTransform", "rotate(-45)");

    pattern
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 3)
      .attr("stroke", "black")
      .attr("stroke-width", 2);

    const xScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(barChartData.baseline.map((d) => forgetClassNames[d.class]))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    const colors = d3.schemeTableau10;

    const g = svg.append("g");

    g.selectAll(".bar-baseline")
      .data(barChartData.baseline)
      .join("rect")
      .attr("class", "bar-baseline")
      .attr("x", margin.left)
      .attr("y", (d) => yScale(forgetClassNames[d.class]) ?? 0)
      .attr("height", barHeight)
      .attr("width", (d) => xScale(d.value) - margin.left)
      .attr("fill", (_, i) => colors[i])
      .attr("opacity", BASELINE_OPACITY);

    g.selectAll(".bar-comparison")
      .data(barChartData.comparison)
      .join("g")
      .attr("class", "bar-comparison")
      .each(function (_, i: number) {
        const g = d3.select(this);

        g.append("rect")
          .attr("x", margin.left)
          .attr(
            "y",
            (d) =>
              (yScale(
                forgetClassNames[(d as { class: number; value: number }).class]
              ) ?? 0) +
              barHeight -
              6
          )
          .attr("height", barHeight)
          .attr(
            "width",
            (d) =>
              xScale((d as { class: number; value: number }).value) -
              margin.left
          )
          .attr("fill", colors[i])
          .attr("opacity", COMPARISON_OPACITY);

        g.append("rect")
          .attr("x", margin.left)
          .attr(
            "y",
            (d) =>
              (yScale(
                forgetClassNames[(d as { class: number; value: number }).class]
              ) ?? 0) +
              barHeight -
              6
          )
          .attr("height", barHeight)
          .attr(
            "width",
            (d) =>
              xScale((d as { class: number; value: number }).value) -
              margin.left
          )
          .attr("fill", "url(#stripe)")
          .attr("opacity", 0.5);
      });

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickFormat((d) => d.toString());

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "13px")
      .style("font-family", "Roboto Condensed");

    const yAxis = d3.axisLeft(yScale);
    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)
      .selectAll("text")
      .style("font-size", "13px")
      .style("font-family", "Roboto Condensed");
  }, [barChartData, forgetClass]);

  return (
    <div
      style={{ width: `${width}px`, height: `${height}px` }}
      className="flex items-center"
    >
      <div className="mt-2 mr-2">
        <div className="flex justify-center">
          <img src={imageUrl} alt="cifar-10" width="160" height="160" />
        </div>
        <div className="text-sm mt-1">
          <span className="font-semibold">Ground Truth</span>: {groundTruth}
        </div>
        <div className="text-sm flex flex-col">
          <span className="font-semibold">Prediction</span>
          <p>
            <span className="font-semibold">Baseline</span>: {prediction}
          </p>
          <p>
            <span className="font-semibold">Comparison</span>: {prediction}
          </p>
        </div>
      </div>
      <div className="relative z-50">
        <svg ref={svgRef} className="w-full max-w-4xl" />
        <p className="text-xs absolute bottom-0 right-[70px]">
          Confidence Score
        </p>
      </div>
    </div>
  );
}