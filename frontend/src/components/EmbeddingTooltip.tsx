import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

import {
  BaselineNeuralNetworkIcon,
  ComparisonNeuralNetworkIcon,
} from "./UI/icons";
import { forgetClassNames } from "../constants/forgetClassNames";
import { Prob } from "../views/Embeddings";

const BLACK = "black";
const LOW_OPACITY = 0.6;
const HIGH_OPACITY = 1;
const TICK_PADDING = 6;
const BAR_HEIGHT = 8;
const SELECT_CHART_FONT_SIZE = "8px";
const UNSELECT_CHART_FONT_SIZE = "7.5px";
const LEGEND_X = 11;
const LEGEND_Y = 7;
const LEGEND_X_OFFSET = 113;
const LEGEND_GAP = 55;
const LEGEND_FONT_SIZE = "10px";
const GRID_LINE_COLOR = "#f0f3f8";
const GRAY_COLOR = "#898989";
const TICK_FONT_SIZE = "10px";
const TICK_FONT_WEIGHT = 300;
const ROBOTO_CONDENSED = "Roboto Condensed";
const LEGEND_RECT_SIZE = 8;
const margin = { top: 14, right: 30, bottom: 30, left: 60 };

interface Props {
  width: number;
  height: number;
  imageUrl: string;
  data: (number | Prob)[];
  barChartData: {
    baseline: { class: number; value: number }[];
    comparison: { class: number; value: number }[];
  };
  forgetClass: number;
  isBaseline: boolean;
}

export default React.memo(function EmbeddingTooltip({
  width,
  height,
  imageUrl,
  data,
  barChartData,
  forgetClass,
  isBaseline,
}: Props) {
  const svgRef = useRef(null);

  const legendRectColor = d3.schemeTableau10[9];

  const groundTruthIdx = Number(data[2]);
  const predictionIdx = barChartData.baseline.reduce((maxObj, currentObj) =>
    currentObj.value > maxObj.value ? currentObj : maxObj
  ).class;

  const groundTruth = forgetClassNames[groundTruthIdx];
  const baselinePrediction = forgetClassNames[predictionIdx];
  const comparisonIdx = barChartData.comparison.reduce((maxObj, currentObj) =>
    currentObj.value > maxObj.value ? currentObj : maxObj
  ).class;
  const comparisonPrediction = forgetClassNames[comparisonIdx];

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 260;
    const height = 260;

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
      .attr("stroke", BLACK)
      .attr("stroke-width", 2)
      .attr("opacity", !isBaseline ? HIGH_OPACITY : LOW_OPACITY);

    const legendPattern = defs
      .append("pattern")
      .attr("id", "stripe-legend")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("width", 3)
      .attr("height", 3)
      .attr("patternTransform", "rotate(-45)");

    legendPattern
      .append("rect")
      .attr("width", 3)
      .attr("height", 3)
      .attr("fill", legendRectColor);

    legendPattern
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 3)
      .attr("stroke", BLACK)
      .attr("stroke-width", 2);

    const basleineLegend = svg
      .append("g")
      .attr("class", "legend")
      .attr(
        "transform",
        `translate(${width - margin.right - LEGEND_X_OFFSET}, 1)`
      );

    basleineLegend
      .append("rect")
      .attr("width", LEGEND_RECT_SIZE)
      .attr("height", LEGEND_RECT_SIZE)
      .attr("fill", legendRectColor)
      .attr("stroke", isBaseline ? BLACK : "none");

    basleineLegend
      .append("text")
      .attr("x", LEGEND_X)
      .attr("y", LEGEND_Y)
      .text("Baseline")
      .style("font-size", LEGEND_FONT_SIZE)
      .style("font-family", ROBOTO_CONDENSED);

    const comparisonLegend = basleineLegend
      .append("g")
      .attr("transform", `translate(${LEGEND_GAP}, 0)`);

    comparisonLegend
      .append("rect")
      .attr("width", LEGEND_RECT_SIZE)
      .attr("height", LEGEND_RECT_SIZE)
      .attr("fill", legendRectColor);

    comparisonLegend
      .append("rect")
      .attr("width", LEGEND_RECT_SIZE)
      .attr("height", LEGEND_RECT_SIZE)
      .attr("fill", "url(#stripe-legend)")
      .attr("stroke", !isBaseline ? BLACK : "none");

    comparisonLegend
      .append("text")
      .attr("x", LEGEND_X)
      .attr("y", LEGEND_Y)
      .text("Comparison")
      .style("font-size", LEGEND_FONT_SIZE)
      .style("font-family", ROBOTO_CONDENSED);

    const xScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(barChartData.baseline.map((d) => forgetClassNames[d.class]))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    const gridLines = svg.append("g").attr("class", "grid-lines");

    const xAxisTicks = d3.range(0, 1.2, 0.2);

    gridLines
      .selectAll("line")
      .data(xAxisTicks)
      .enter()
      .append("line")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", GRID_LINE_COLOR)
      .attr("stroke-width", 1);

    const colors = d3.schemeTableau10;

    const g = svg.append("g");

    g.selectAll(".bar-baseline-group")
      .data(barChartData.baseline)
      .join("g")
      .attr("class", "bar-baseline-group")
      .each(function (d, i) {
        const g = d3.select(this);
        const barWidth = xScale(d.value) - margin.left;
        const y = yScale(forgetClassNames[d.class]) ?? 0;

        g.append("rect")
          .attr("class", "bar-baseline")
          .attr("x", margin.left)
          .attr("y", y)
          .attr("height", BAR_HEIGHT)
          .attr("width", barWidth)
          .attr("fill", colors[i])
          .attr("opacity", isBaseline ? HIGH_OPACITY : LOW_OPACITY)
          .attr("stroke", isBaseline ? BLACK : "none")
          .attr("stroke-width", isBaseline ? 1 : 0);

        g.append("text")
          .attr("x", margin.left + barWidth + 4)
          .attr("y", y + BAR_HEIGHT / 2)
          .attr("dy", "0.35em")
          .attr(
            "font-size",
            isBaseline ? SELECT_CHART_FONT_SIZE : UNSELECT_CHART_FONT_SIZE
          )
          .attr("font-family", ROBOTO_CONDENSED)
          .attr("fill", isBaseline ? BLACK : GRAY_COLOR)
          .text(d.value);
      });

    g.selectAll(".bar-comparison-group")
      .data(barChartData.comparison)
      .join("g")
      .attr("class", "bar-comparison-group")
      .each(function (d: { class: number; value: number }, i: number) {
        const g = d3.select(this);
        const barWidth = xScale(d.value) - margin.left;
        const y = (yScale(forgetClassNames[d.class]) ?? 0) + BAR_HEIGHT;

        g.append("rect")
          .attr("x", margin.left)
          .attr("y", y)
          .attr("height", BAR_HEIGHT)
          .attr("width", barWidth)
          .attr("fill", colors[i])
          .attr("opacity", !isBaseline ? HIGH_OPACITY : LOW_OPACITY)
          .attr("stroke", !isBaseline ? BLACK : "none")
          .attr("stroke-width", !isBaseline ? 1 : 0);

        g.append("rect")
          .attr("x", margin.left)
          .attr("y", y)
          .attr("height", BAR_HEIGHT)
          .attr("width", barWidth)
          .attr("fill", "url(#stripe)")
          .attr("opacity", 0.5);

        g.append("text")
          .attr("x", margin.left + barWidth + 4)
          .attr("y", y + BAR_HEIGHT / 2)
          .attr("dy", "0.35em")
          .attr(
            "font-size",
            !isBaseline ? SELECT_CHART_FONT_SIZE : UNSELECT_CHART_FONT_SIZE
          )
          .attr("font-family", ROBOTO_CONDENSED)
          .attr("fill", !isBaseline ? BLACK : GRAY_COLOR)
          .text(d.value);
      });

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(5)
      .tickSize(0)
      .tickPadding(TICK_PADDING)
      .tickFormat((d) => d.toString());

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", TICK_FONT_SIZE)
      .style("font-weight", TICK_FONT_WEIGHT)
      .style("font-family", ROBOTO_CONDENSED);

    svg.select(".domain").remove();

    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(TICK_PADDING);

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)
      .selectAll("text")
      .style("font-size", TICK_FONT_SIZE)
      .style("font-weight", TICK_FONT_WEIGHT)
      .style("font-family", ROBOTO_CONDENSED)
      .text((d: any) => {
        const classIndex = forgetClassNames.indexOf(d);
        return classIndex === forgetClass ? `${d} (X)` : d;
      });
  }, [barChartData, forgetClass, isBaseline, legendRectColor]);

  return (
    <div
      style={{ width, height }}
      className="flex justify-center items-center z-100"
    >
      <div className="text-sm">
        <img src={imageUrl} alt="cifar-10" width="176" height="176" />
        <div className="mt-1">
          <span>Ground Truth:</span>{" "}
          <span className="font-semibold">{groundTruth}</span>
        </div>
        <div className="flex flex-col">
          <p>Predicted Class</p>
          <p className="flex items-center text-nowrap">
            <BaselineNeuralNetworkIcon className="mr-1" />
            <span className="mr-0.5">Baseline:</span>
            <span className="font-semibold">{baselinePrediction}</span>
          </p>
          <p className="flex items-center text-nowrap">
            <ComparisonNeuralNetworkIcon className="mr-1" />
            <span className="mr-0.5">Comparison:</span>
            <span className="font-semibold">{comparisonPrediction}</span>
          </p>
        </div>
      </div>
      <div>
        <svg ref={svgRef} className="w-full" />
        <p className="text-xs absolute bottom-1 right-[calc(26%)] translate-x-1/2">
          Confidence Score
        </p>
      </div>
    </div>
  );
});
