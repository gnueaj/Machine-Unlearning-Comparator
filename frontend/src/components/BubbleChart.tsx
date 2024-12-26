import { useState, useContext, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3";

import {
  BaselineNeuralNetworkIcon,
  ComparisonNeuralNetworkIcon,
} from "./UI/icons";
import { calculateZoom } from "../app/App";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { ForgetClassContext } from "../store/forget-class-context";
import { ExperimentsContext } from "../store/experiments-context";
import { extractBubbleChartData } from "../utils/data/experiments";
import { forgetClassNames } from "../constants/forgetClassNames";

const TOTAL_SIZE = 255;
const MIN_BUBBLE_SIZE = 1;
const MAX_BUBBLE_SIZE = 90;
const BASIC_FONT_WEIGHT = 300;

type ModeType = "Baseline" | "Comparison";

interface Props {
  mode: ModeType;
  datasetMode: string;
  hoveredY: number | null;
  onHover: (y: number) => void;
  onHoverEnd: () => void;
  showYAxis?: boolean;
}

export default function BubbleChart({
  mode,
  datasetMode,
  hoveredY,
  onHover,
  onHoverEnd,
  showYAxis = true,
}: Props) {
  const { baseline, comparison } = useContext(BaselineComparisonContext);
  const { forgetClass } = useContext(ForgetClassContext);
  const { baselineExperiment, comparisonExperiment } =
    useContext(ExperimentsContext);

  const [tooltip, setTooltip] = useState({
    display: false,
    x: 0,
    y: 0,
    content: {
      groundTruth: 0,
      prediction: 0,
      label: 0,
      conf: 0,
    },
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const zoom = calculateZoom();
  const isBaseline = mode === "Baseline";
  const id = isBaseline ? baseline : comparison;
  const experiment = isBaseline ? baselineExperiment : comparisonExperiment;

  const handleMouseOut = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      setTooltip((prev) => ({
        ...prev,
        display: false,
      }));
      onHoverEnd();
    },
    [onHoverEnd]
  );

  useEffect(() => {
    if (!experiment || !svgRef.current) return;

    const data = extractBubbleChartData(datasetMode, experiment);

    const margin = {
      top: 22,
      right: 0,
      bottom: 44,
      left: 64,
    };
    const width = TOTAL_SIZE - margin.left - margin.right;
    const height = TOTAL_SIZE - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", TOTAL_SIZE)
      .attr("height", TOTAL_SIZE)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear().domain([-0.5, 9.5]).range([0, width]);

    const yScale = d3.scaleLinear().domain([-0.5, 9.5]).range([0, height]);

    const colorScale = d3
      .scaleSequential()
      .domain([0, 1])
      .interpolator(d3.interpolateWarm);

    const sizeScale = d3
      .scaleLinear()
      .domain([0, 1])
      .range([MIN_BUBBLE_SIZE, MAX_BUBBLE_SIZE]);

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(d3.range(0, 10))
      .tickSize(0)
      .tickFormat((d) => forgetClassNames[d as number]);

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(d3.range(0, 10))
      .tickSize(0)
      .tickPadding(0)
      .tickFormat((d) =>
        d === forgetClass
          ? forgetClassNames[d as number] + " (X)"
          : forgetClassNames[d as number]
      );

    svg
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .call((g) => {
        g.select(".domain").attr("stroke", "#000").attr("stroke-width", 1);
        g.selectAll(".tick text")
          .attr("transform", "rotate(-45)")
          .style("text-anchor", "end")
          .style("font-family", "Roboto Condensed")
          .style("font-weight", BASIC_FONT_WEIGHT)
          .attr("dx", "-.3em")
          .attr("dy", ".4em");
      });

    if (showYAxis) {
      svg
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .call((g) => {
          g.select(".domain").attr("stroke", "#000").attr("stroke-width", 1);
          g.selectAll(".tick text")
            .attr("dx", "-.5em")
            .style("font-family", "Roboto Condensed");
        });
    } else {
      svg
        .append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .call((g) => {
          g.select(".domain").attr("stroke", "#000").attr("stroke-width", 1);
          g.selectAll(".tick text")
            .style("font-family", "Roboto Condensed")
            .remove();
        });
    }

    svg
      .selectAll("rect")
      .data(data)
      .join("rect")
      .attr("x", (d) => xScale(d.x) - 10)
      .attr("y", (d) => yScale(d.y) - 10)
      .attr("width", 20)
      .attr("height", 20)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "transparent")
      .on("mouseover", (event, d: any) => {
        event.stopPropagation();

        d3.select(event.target).attr("fill", "rgba(128, 128, 128, 0.2)");

        const rect = event.target.getBoundingClientRect();
        const tooltipWidth = tooltipRef.current?.offsetWidth || 100;

        const rightSpace = window.innerWidth - rect.right;
        const leftSpace = rect.left;

        let xPos =
          rightSpace >= tooltipWidth + 20
            ? (rect.right + 10) / zoom
            : (leftSpace - tooltipWidth - 10) / zoom;

        let yPos = (rect.top + rect.height / 2) / zoom;

        setTooltip({
          display: true,
          x: xPos,
          y: yPos,
          content: {
            groundTruth: d.y,
            prediction: d.x,
            label: d.label,
            conf: d.conf,
          },
        });

        svg
          .selectAll(".x-axis .tick text")
          .style("font-weight", (t: any) =>
            t === d.x ? "bold" : BASIC_FONT_WEIGHT
          );

        onHover(d.y);
      })
      .on("mouseout", (event) => {
        d3.select(event.target).attr("fill", "transparent");
        handleMouseOut(event);
      });

    svg
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", (d) => (d.label >= 0.002 ? Math.sqrt(sizeScale(d.label)) : 0))
      .attr("fill", (d) => colorScale(d.conf))
      .attr("opacity", 0.7)
      .style("pointer-events", "none");

    if (!svgRef.current) return;

    d3.select(svgRef.current)
      .selectAll(".y-axis .tick text")
      .style("font-weight", (t: any) => {
        return t === hoveredY ? "bold" : BASIC_FONT_WEIGHT;
      });
  }, [
    datasetMode,
    experiment,
    forgetClass,
    handleMouseOut,
    hoveredY,
    onHover,
    showYAxis,
    zoom,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (svgRef.current && tooltip.display) {
        const svgRect = svgRef.current.getBoundingClientRect();
        const isOutside =
          event.clientX < svgRect.left ||
          event.clientX > svgRect.right ||
          event.clientY < svgRect.top ||
          event.clientY > svgRect.bottom;

        if (isOutside) {
          handleMouseOut(event);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseOut, tooltip.display]);

  if (!experiment) return null;

  return (
    <div
      className={`flex flex-col items-center relative ${
        showYAxis ? "z-10" : "right-[48px] z-0"
      }`}
    >
      <div
        className={`flex items-center text-[15px] text-nowrap absolute left-1/2 -translate-x-[22%]`}
      >
        {isBaseline ? (
          <BaselineNeuralNetworkIcon className="mr-1" />
        ) : (
          <ComparisonNeuralNetworkIcon className="mr-1" />
        )}
        <span>
          {mode} ({id})
        </span>
      </div>
      {showYAxis && (
        <span className="absolute top-[42%] left-1 -rotate-90 text-nowrap -mx-7 text-xs">
          Ground Truth
        </span>
      )}
      <svg ref={svgRef}></svg>
      {tooltip.display &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`w-auto h-auto bg-white px-1.5 py-1 whitespace-nowrap rounded-lg text-[#333] text-sm z-10 border border-border/50 shadow-xl transition-all duration-500 ease-in-out ${
              tooltip.display ? "opacity-100" : "opacity-0"
            }`}
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translateY(-50%)",
              pointerEvents: "none",
              zIndex: 10,
              zoom,
            }}
          >
            <div>
              <span>Ground Truth</span>:{" "}
              <span className="font-semibold">
                {forgetClassNames[tooltip.content.groundTruth]}
              </span>
            </div>
            <div>
              <span>Prediction</span>:{" "}
              <span className="font-semibold">
                {forgetClassNames[tooltip.content.prediction]}
              </span>
            </div>
            <div>
              <span>Proportion</span>:{" "}
              <span className="font-semibold">
                {tooltip.content.label.toFixed(3)}
              </span>
            </div>
            <div>
              <span>Confidence</span>:{" "}
              <span className="font-semibold">
                {tooltip.content.conf.toFixed(3)}
              </span>
            </div>
          </div>,
          document.body
        )}
      <span className="absolute -bottom-0.5 left-[calc(50%+5px)] text-xs">
        Prediction
      </span>
    </div>
  );
}
