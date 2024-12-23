import { useEffect, useRef } from "react";
import * as d3 from "d3";

import { DataPoint } from "./Discriminator";

const WIDTH = 400;
const HEIGHT = 300;
const MARGIN = { top: 22, right: 5, bottom: 68, left: 20 };
const CIRCLE_SIZE = 3.2;
const TICK_SIZE = 4;
const TICK_STROKE_WIDTH = 1;
const LEGEND_RECT_SIZE = 15;
const LEGEND_FONT_SIZE = "12px";
const THRESHOLD_LINE_WIDTH = 1.5;
const THRESHOLD_LINE_DASH_ARRAY = "4,3";
const THRESHOLD_FONT_SIZE = "14px";
const LIGHT_FONT_WEIGHT = 300;
const CIRCLE_Y_OFFSET = 0.6;

const THRESHOLD_LINE_COLOR = "#ff4d4d";
const GRID_COLOR = "#efefef";
const LIGHT_GRAY = "#808080";
const DARK_GRAY = "#404040";
const LIGHT_BLUE = "#60a5fa";
const DARK_BLUE = "#1e40af";

const PAYBACK = "payback";
const DEFAULT = "default";
const ROBOTO_CONDENSED = "Roboto Condensed";
const LEGEND_DATA = [
  { label: "denied loan / would default", color: LIGHT_GRAY, align: "left" },
  { label: "granted loan / defaults", color: LIGHT_BLUE, align: "right" },
  { label: "denied loan / would pay back", color: DARK_GRAY, align: "left" },
  { label: "granted loan / pays back", color: DARK_BLUE, align: "right" },
];

interface Props {
  data: DataPoint[];
  threshold: number;
  setThreshold: (value: number) => void;
}

export default function DistributionPlot({
  data,
  threshold,
  setThreshold,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3
      .select(svgRef.current)
      .attr("width", WIDTH)
      .attr("height", HEIGHT);

    svg.selectAll("*").remove();

    const xScale = d3
      .scaleLinear()
      .domain([-2, 10])
      .range([MARGIN.left, WIDTH - MARGIN.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 30])
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    const grid = svg.append("g").attr("class", "grid");

    // x-axis grid
    grid
      .append("g")
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickSize(-(HEIGHT - MARGIN.top - MARGIN.bottom))
          .tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke", GRID_COLOR)
          .attr("stroke-width", TICK_STROKE_WIDTH)
      );

    // y-axis grid
    grid
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, 0)`)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(7)
          .tickSize(-WIDTH + MARGIN.left + MARGIN.right)
          .tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick line")
          .attr("stroke", GRID_COLOR)
          .attr("stroke-width", TICK_STROKE_WIDTH)
      );

    // x-axis
    svg
      .append("g")
      .attr("transform", `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(TICK_SIZE))
      .call((g) =>
        g.selectAll(".tick line").attr("stroke-width", TICK_STROKE_WIDTH)
      )
      .call((g) =>
        g.selectAll(".tick text").style("font-family", ROBOTO_CONDENSED)
      );

    // y-axis
    svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left}, 0)`)
      .call(d3.axisLeft(yScale).ticks(7).tickSize(TICK_SIZE))
      .call((g) =>
        g.selectAll(".tick line").attr("stroke-width", TICK_STROKE_WIDTH)
      )
      .call((g) =>
        g.selectAll(".tick text").style("font-family", ROBOTO_CONDENSED)
      );

    svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.entropy))
      .attr("cy", (d, i) => {
        const binWidth = 0.25;
        const bin = Math.floor(d.entropy / binWidth);
        const pointsInBin = data.filter(
          (p) => Math.floor(p.entropy / binWidth) === bin
        );
        const paybackPoints = pointsInBin.filter((p) => p.type === PAYBACK);
        const defaultPoints = pointsInBin.filter((p) => p.type === DEFAULT);

        if (d.type === PAYBACK) {
          const position = paybackPoints.indexOf(d);
          return yScale(position + CIRCLE_Y_OFFSET);
        } else {
          if (defaultPoints.length > paybackPoints.length) {
            const position = defaultPoints.indexOf(d);
            if (position >= paybackPoints.length) {
              return yScale(position + CIRCLE_Y_OFFSET);
            } else {
              return yScale(position + CIRCLE_Y_OFFSET);
            }
          } else {
            const position = defaultPoints.indexOf(d);
            return yScale(position + CIRCLE_Y_OFFSET);
          }
        }
      })
      .attr("r", CIRCLE_SIZE)
      .attr("fill", (d) => {
        if (d.entropy < threshold) {
          return d.type === DEFAULT ? LIGHT_GRAY : DARK_GRAY;
        } else {
          return d.type === DEFAULT ? LIGHT_BLUE : DARK_BLUE;
        }
      })
      .attr("stroke", (d) => {
        if (d.entropy < threshold) {
          return d.type === DEFAULT ? "#777777" : "#303030";
        } else {
          return d.type === DEFAULT ? "#4a83c8" : "#152c7a";
        }
      })
      .attr("stroke-width", "1");

    const dragLine = d3.drag().on("drag", (event) => {
      const newX = event.x;
      const newThreshold = Math.round(xScale.invert(newX) * 20) / 20;

      if (newThreshold >= -2 && newThreshold <= 10) {
        setThreshold(newThreshold);
        thresholdGroup.attr(
          "transform",
          `translate(${xScale(newThreshold)}, 0)`
        );

        svg
          .selectAll("circle")
          .data<DataPoint>(data)
          .attr("fill", (d) => {
            if (d.entropy < newThreshold) {
              return d.type === DEFAULT ? LIGHT_GRAY : DARK_GRAY;
            } else {
              return d.type === PAYBACK ? DARK_BLUE : LIGHT_BLUE;
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
      .attr("y2", HEIGHT - MARGIN.bottom)
      .attr("stroke", THRESHOLD_LINE_COLOR)
      .attr("stroke-width", THRESHOLD_LINE_WIDTH)
      .attr("stroke-dasharray", THRESHOLD_LINE_DASH_ARRAY);

    thresholdGroup
      .append("rect")
      .attr("x", -10)
      .attr("y", MARGIN.top)
      .attr("width", 20)
      .attr("height", HEIGHT - MARGIN.top - MARGIN.bottom)
      .attr("fill", "transparent");

    thresholdGroup
      .append("text")
      .attr("y", MARGIN.top - 10)
      .attr("text-anchor", "middle")
      .attr("font-weight", LIGHT_FONT_WEIGHT)
      .attr("font-size", THRESHOLD_FONT_SIZE)
      .text(`Threshold: ${threshold.toFixed(2)}`);

    const legend = svg
      .append("g")
      .attr(
        "transform",
        `translate(${WIDTH / 2 + 10}, ${HEIGHT - MARGIN.bottom + 30})`
      );

    const legendHeight = 20;

    LEGEND_DATA.forEach((item, i) => {
      const y = Math.floor(i / 2) * legendHeight;
      const x = item.align === "left" ? 0 : WIDTH - 200;

      const legendItem = legend
        .append("g")
        .attr("transform", `translate(${x}, ${y})`);

      legendItem
        .append("rect")
        .attr("width", LEGEND_RECT_SIZE)
        .attr("height", LEGEND_RECT_SIZE)
        .attr("y", 0)
        .attr("fill", item.color);

      legendItem
        .append("text")
        .attr("x", 25)
        .attr("y", LEGEND_RECT_SIZE / 2)
        .attr("dy", "0.35em")
        .text(item.label)
        .style("font-size", LEGEND_FONT_SIZE)
        .style("font-family", ROBOTO_CONDENSED)
        .style("font-weight", LIGHT_FONT_WEIGHT);
    });
  }, [data, setThreshold, threshold]);

  return <svg ref={svgRef}></svg>;
}
