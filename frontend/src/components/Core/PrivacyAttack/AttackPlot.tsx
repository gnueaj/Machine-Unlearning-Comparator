import { useRef, useEffect, useCallback, useState } from "react";
import * as d3 from "d3";

import { COLORS, TABLEAU10 } from "../../../constants/colors";
import { FONT_CONFIG } from "../../../constants/common";
import { AttackResult } from "../../../types/data";
import { Bin, Data, CategoryType } from "../../../types/attack";
import { getButterflyLegendData } from "../../../utils/data/getButterflyLegendData";
import { useForgetClassStore } from "../../../stores/forgetClassStore";
import { useModelDataStore } from "../../../stores/modelDataStore";
import { useAttackStateStore } from "../../../stores/attackStore";
import { UNLEARN, RETRAIN, ENTROPY } from "../../../constants/common";
import {
  LINE_GRAPH_LEGEND_DATA,
  THRESHOLD_STRATEGIES,
} from "../../../constants/privacyAttack";
import {
  useModelAExperiment,
  useModelBExperiment,
} from "../../../hooks/useModelExperiment";

const CONFIG = {
  FONT_FAMILY: "Roboto Condensed",
  BLACK: "black",
  RED: "#e41a1c",
  BLUE: "#377eb8",
  GREEN: "#4daf4a",
  VERTICAL_LINE_COLOR: "#efefef",
  THRESHOLD_LINE_COLOR: "#a5a5a5",
  THRESHOLD_LINE_DASH: "5,2",
  THRESHOLD_LINE_WIDTH: 1.2,
  ENTROPY_SCOPE_MIN: 0,
  ENTROPY_SCOPE_MAX: 2.5,
  ENTROPY_THRESHOLD_STEP: 0.05,
  CONFIDENCE_SCOPE_MIN: -2.5,
  CONFIDENCE_SCOPE_MAX: 10,
  CONFIDENCE_THRESHOLD_STEP: 0.25,
  BUTTERFLY_CIRCLE_RADIUS: 3.3,
  OPACITY_ABOVE_THRESHOLD: 1,
  OPACITY_BELOW_THRESHOLD: 0.3,
  BUTTERFLY_CHART_X_AXIS_TICK_STEP: 10,
  BUTTERFLY_CHART_LEGEND_VERTICAL_SPACING: 14,
  BUTTERFLY_CHART_LEGEND_TEXT_GAP: 6,
  BUTTERFLY_CHART_LEGEND_SQUARE_SIZE: 12,
  BUTTERFLY_CHART_LEGEND_SQUARE_POSITIONS: [-7, 7],
  BUTTERFLY_CHART_WIDTH: 450,
  LINE_CHART_WIDTH: 170,
  HEIGHT: 396,
  LINE_WIDTH: 2,
  STROKE_WIDTH: 0.8,
  BUTTERFLY_MARGIN: { top: 16, right: 9, bottom: 28, left: 36 },
  LINE_MARGIN: { top: 16, right: 6, bottom: 28, left: 10 },
  ATTACK_SCORE_X_LIMIT_FOR_INFO_GROUP: 0.43,
  ENTROPY_THRESHOLD_Y_LIMIT_FOR_INFO_GROUP: 2.15,
  CONFIDENCE_THRESHOLD_Y_LIMIT_FOR_INFO_GROUP: 8.25,
} as const;

function createBins(
  bins: Bin[],
  binSize: number,
  thresholdMax: number,
  isMetricEntropy: boolean
) {
  const binsMap: Record<string, Bin[]> = {};
  bins.forEach((bin) => {
    const clampedValue = isMetricEntropy
      ? bin.value
      : bin.value > thresholdMax
      ? 9.75
      : bin.value;
    const key = (Math.floor(clampedValue / binSize) * binSize).toFixed(2);
    binsMap[key] = binsMap[key] || [];
    binsMap[key].push(bin);
  });
  return Object.keys(binsMap)
    .map((key) => ({ threshold: +key, bins: binsMap[key] }))
    .sort((a, b) => a.threshold - b.threshold);
}

function getIntersections(
  data: AttackResult[],
  xAccessor: (d: AttackResult) => number,
  th: number,
  xScale: d3.ScaleLinear<number, number>,
  yScale: d3.ScaleLinear<number, number>
) {
  const intersections: { x: number; y: number }[] = [];
  const yTh = yScale(th);
  for (let i = 0; i < data.length - 1; i++) {
    const d1 = data[i];
    const d2 = data[i + 1];
    const y1 = yScale(d1.threshold);
    const y2 = yScale(d2.threshold);
    if ((y1 - yTh) * (y2 - yTh) < 0) {
      const x1 = xScale(xAccessor(d1));
      const x2 = xScale(xAccessor(d2));
      const t = (yTh - y1) / (y2 - y1);
      const xIntersect = x1 + t * (x2 - x1);
      intersections.push({ x: xIntersect, y: yTh });
    } else if (y1 === yTh) {
      intersections.push({ x: xScale(xAccessor(d1)), y: yTh });
    }
  }
  return intersections;
}

function createThresholdGroup(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xRange: [number, number],
  yScale: d3.ScaleLinear<number, number>,
  thresholdValue: number,
  isStrategyCustom: boolean,
  isAboveThresholdUnlearn: boolean,
  isModelA: boolean
) {
  const group = g
    .append("g")
    .attr("class", "threshold-group")
    .attr("transform", `translate(0, ${yScale(thresholdValue)})`)
    .style("cursor", isStrategyCustom ? "ns-resize" : "default");

  group
    .append("rect")
    .attr("x", xRange[0])
    .attr("y", -5)
    .attr("width", xRange[1] - xRange[0])
    .attr("height", 10)
    .attr("fill", "transparent");

  group
    .append("line")
    .attr("class", "threshold-line")
    .attr("stroke", CONFIG.BLACK)
    .attr("stroke-width", CONFIG.THRESHOLD_LINE_WIDTH)
    .attr("stroke-dasharray", CONFIG.THRESHOLD_LINE_DASH)
    .attr("stroke-linecap", "round")
    .attr("x1", xRange[0])
    .attr("x2", xRange[1])
    .attr("y1", 0)
    .attr("y2", 0);

  const upText = group
    .append("text")
    .attr("class", "threshold-label-up")
    .attr("x", -198)
    .attr("y", -4.5)
    .attr("text-anchor", "start")
    .attr("font-size", FONT_CONFIG.FONT_SIZE_12);
  upText.append("tspan").attr("fill", CONFIG.BLACK).text("↑ Pred as ");
  upText
    .append("tspan")
    .attr(
      "fill",
      isAboveThresholdUnlearn
        ? isModelA
          ? COLORS.EMERALD
          : COLORS.PURPLE
        : COLORS.DARK_GRAY
    )
    .text(
      isAboveThresholdUnlearn ? (isModelA ? "Model A" : "Model B") : "Retrained"
    );

  const downText = group
    .append("text")
    .attr("class", "threshold-label-down")
    .attr("x", -198)
    .attr("y", 12)
    .attr("text-anchor", "start")
    .attr("font-size", FONT_CONFIG.FONT_SIZE_12);
  downText.append("tspan").attr("fill", CONFIG.BLACK).text("↓ Pred as ");
  downText
    .append("tspan")
    .attr(
      "fill",
      isAboveThresholdUnlearn
        ? COLORS.DARK_GRAY
        : isModelA
        ? COLORS.EMERALD
        : COLORS.PURPLE
    )
    .text(
      isAboveThresholdUnlearn ? "Retrained" : isModelA ? "Model A" : "Model B"
    );

  return group;
}

function circleOpacity(
  yPos: number,
  thresholdY: number,
  isAboveThresholdUnlearn: boolean
) {
  const isCircleAboveThreshold = yPos < thresholdY;
  return isAboveThresholdUnlearn
    ? isCircleAboveThreshold
      ? CONFIG.OPACITY_ABOVE_THRESHOLD
      : CONFIG.OPACITY_BELOW_THRESHOLD
    : isCircleAboveThreshold
    ? CONFIG.OPACITY_BELOW_THRESHOLD
    : CONFIG.OPACITY_ABOVE_THRESHOLD;
}

function setThresholdLabelText(
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  isAboveThresholdUnlearn: boolean,
  isModelA: boolean
) {
  const modelLabel = isModelA ? "Model A" : "Model B";
  const modelColor = isModelA ? COLORS.EMERALD : COLORS.PURPLE;

  group
    .select(".threshold-label-up tspan:nth-child(2)")
    .attr("fill", isAboveThresholdUnlearn ? modelColor : COLORS.DARK_GRAY)
    .text(isAboveThresholdUnlearn ? modelLabel : "Retrained");

  group
    .select(".threshold-label-down tspan:nth-child(2)")
    .attr("fill", isAboveThresholdUnlearn ? COLORS.DARK_GRAY : modelColor)
    .text(isAboveThresholdUnlearn ? "Retrained" : modelLabel);
}

function applyCircleOpacities(
  svg: SVGSVGElement | null,
  hoveredId: number | null,
  thresholdValue: number,
  isAboveThresholdUnlearn: boolean,
  yScale: d3.ScaleLinear<number, number> | null
) {
  if (!svg || !yScale) return;
  const thY = yScale(thresholdValue);
  d3.select(svg)
    .selectAll<SVGCircleElement, Bin>(".retrain-circle, .unlearn-circle")
    .each(function (d) {
      const sel = d3.select(this);
      const opacity =
        hoveredId !== null
          ? d.img_idx === hoveredId
            ? CONFIG.OPACITY_ABOVE_THRESHOLD
            : CONFIG.OPACITY_BELOW_THRESHOLD
          : circleOpacity(+sel.attr("cy"), thY, isAboveThresholdUnlearn);
      sel.attr("fill-opacity", opacity).attr("stroke-opacity", opacity);
    });
}

function applyHoverLabels(
  svg: SVGSVGElement | null,
  hoveredId: number | null,
  metric: string
) {
  if (!svg) return;
  const gB = d3.select(svg).select(".butterfly-plot");
  gB.selectAll(".hovered-label").remove();
  if (hoveredId === null) return;

  gB.selectAll<SVGCircleElement, Bin>("circle")
    .filter((d) => d != null && d.img_idx === hoveredId)
    .each(function (d) {
      const cx = d3.select(this).attr("cx");
      const cy = d3.select(this).attr("cy");
      const cxNum = parseFloat(cx);
      const offset = 4;
      const textAnchor = cxNum < 0 ? "end" : "start";
      const labelX = cxNum < 0 ? cxNum - offset : cxNum + offset;
      const labelY = Number(cy) - offset;
      gB.append("text")
        .attr("class", "hovered-label")
        .attr("x", labelX)
        .attr("y", labelY)
        .attr("text-anchor", textAnchor)
        .attr("font-size", "12px")
        .attr("fill", CONFIG.BLACK)
        .attr(
          "style",
          "text-shadow: -0.5px -0.5px 0 white, 0.5px -0.5px 0 white, -0.5px 0.5px 0 white, 0.5px 0.5px 0 white;"
        )
        .text(
          `${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${d.value}`
        );
    });
  gB.selectAll(".hovered-label").raise();
}

function paintButterflyLegend(
  gB: d3.Selection<any, unknown, null, undefined>,
  isAboveThresholdUnlearn: boolean,
  isModelA: boolean,
  isLegendVisible: boolean
) {
  gB.select(".butterfly-legend-group").remove();

  const BUTTERFLY_LEGEND_DATA = getButterflyLegendData(
    isAboveThresholdUnlearn,
    isModelA
  );

  const butterflyLegendGroup = gB
    .append("g")
    .attr("class", "butterfly-legend-group")
    .attr("transform", "translate(-3, 21)")
    .style("display", isLegendVisible ? "block" : "none");

  butterflyLegendGroup
    .insert("rect", ":first-child")
    .attr("x", -172)
    .attr("y", -18.5)
    .attr("width", 350)
    .attr("height", 36)
    .attr("fill", "white")
    .attr("opacity", 0.6)
    .attr("stroke", "#d6d6d6")
    .attr("stroke-width", 1.5)
    .attr("rx", 2)
    .attr("ry", 2);

  let leftCounter = 0;
  let rightCounter = 0;
  BUTTERFLY_LEGEND_DATA.forEach((item) => {
    let xPos, yPos;
    if (item.side === "left") {
      xPos = CONFIG.BUTTERFLY_CHART_LEGEND_SQUARE_POSITIONS[0];
      yPos =
        leftCounter === 0
          ? CONFIG.BUTTERFLY_CHART_LEGEND_VERTICAL_SPACING / 2
          : -CONFIG.BUTTERFLY_CHART_LEGEND_VERTICAL_SPACING / 2;
      leftCounter++;
    } else {
      xPos = CONFIG.BUTTERFLY_CHART_LEGEND_SQUARE_POSITIONS[1];
      yPos =
        rightCounter === 0
          ? CONFIG.BUTTERFLY_CHART_LEGEND_VERTICAL_SPACING / 2
          : -CONFIG.BUTTERFLY_CHART_LEGEND_VERTICAL_SPACING / 2;
      rightCounter++;
    }

    butterflyLegendGroup
      .append("rect")
      .attr("x", xPos)
      .attr("y", yPos - CONFIG.BUTTERFLY_CHART_LEGEND_SQUARE_SIZE / 2)
      .attr("width", CONFIG.BUTTERFLY_CHART_LEGEND_SQUARE_SIZE)
      .attr("height", CONFIG.BUTTERFLY_CHART_LEGEND_SQUARE_SIZE)
      .attr("fill", item.color);

    if (item.side === "left") {
      butterflyLegendGroup
        .append("text")
        .attr("x", xPos - CONFIG.BUTTERFLY_CHART_LEGEND_TEXT_GAP)
        .attr("y", yPos)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
        .text(item.label);
    } else {
      butterflyLegendGroup
        .append("text")
        .attr(
          "x",
          xPos +
            CONFIG.BUTTERFLY_CHART_LEGEND_SQUARE_SIZE +
            CONFIG.BUTTERFLY_CHART_LEGEND_TEXT_GAP
        )
        .attr("y", yPos)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
        .text(item.label);
    }
  });
}

function lineChartLayout() {
  const wL =
    CONFIG.LINE_CHART_WIDTH -
    CONFIG.LINE_MARGIN.left -
    CONFIG.LINE_MARGIN.right;
  const hL =
    CONFIG.HEIGHT - CONFIG.LINE_MARGIN.top - CONFIG.LINE_MARGIN.bottom;
  return { wL, hL };
}

function updateIntersections(
  gL: d3.Selection<any, unknown, null, undefined>,
  attackData: AttackResult[],
  thresholdValue: number,
  xScaleL: d3.ScaleLinear<number, number>,
  yScaleL: d3.ScaleLinear<number, number>
) {
  const intGroup = gL.select(".intersection-group");
  intGroup.selectAll("circle").remove();

  const addDots = (
    accessor: (d: AttackResult) => number,
    fill: string,
    className?: string
  ) => {
    getIntersections(
      attackData,
      accessor,
      thresholdValue,
      xScaleL,
      yScaleL
    ).forEach((pt) => {
      const circle = intGroup
        .append("circle")
        .attr("cx", pt.x)
        .attr("cy", pt.y)
        .attr("r", CONFIG.BUTTERFLY_CIRCLE_RADIUS)
        .attr("fill", fill)
        .attr("stroke", CONFIG.BLACK)
        .attr("stroke-width", 1);
      if (className) circle.attr("class", className);
    });
  };

  addDots((d) => d.attack_score, CONFIG.RED, "intersection-red");
  addDots((d) => d.fpr, CONFIG.BLUE);
  addDots((d) => d.fnr, CONFIG.GREEN);
}

function updateInfoGroup(
  gL: d3.Selection<any, unknown, null, undefined>,
  attackData: AttackResult[],
  thresholdValue: number,
  xScaleL: d3.ScaleLinear<number, number>,
  yScaleL: d3.ScaleLinear<number, number>,
  isMetricEntropy: boolean,
  strategy: string
) {
  const currentData = attackData.reduce(
    (prev, curr) =>
      Math.abs(curr.threshold - thresholdValue) <
      Math.abs(prev.threshold - thresholdValue)
        ? curr
        : prev,
    attackData[0]
  );

  const redInts = getIntersections(
    attackData,
    (d) => d.attack_score,
    thresholdValue,
    xScaleL,
    yScaleL
  );
  const attackIntersectPos =
    redInts.length > 0
      ? redInts[0]
      : { x: xScaleL(0), y: yScaleL(thresholdValue) };
  const infoGroupXPos =
    currentData.attack_score >= CONFIG.ATTACK_SCORE_X_LIMIT_FOR_INFO_GROUP
      ? xScaleL(CONFIG.ATTACK_SCORE_X_LIMIT_FOR_INFO_GROUP)
      : attackIntersectPos.x;
  const effectiveThreshold = isMetricEntropy
    ? Math.min(thresholdValue, CONFIG.ENTROPY_THRESHOLD_Y_LIMIT_FOR_INFO_GROUP)
    : Math.min(
        thresholdValue,
        CONFIG.CONFIDENCE_THRESHOLD_Y_LIMIT_FOR_INFO_GROUP
      );
  const infoGroupYPos = yScaleL(effectiveThreshold);

  const infoGroup = gL.select(".info-group");
  infoGroup.attr(
    "transform",
    `translate(${infoGroupXPos + 4}, ${infoGroupYPos - 47})`
  );
  infoGroup
    .select(".info-threshold")
    .attr(
      "fill",
      strategy === THRESHOLD_STRATEGIES[3].strategy ? "red" : CONFIG.BLACK
    )
    .text(`Threshold: ${thresholdValue.toFixed(2)}`);
  infoGroup
    .select(".info-attack-score")
    .attr(
      "fill",
      strategy === THRESHOLD_STRATEGIES[1].strategy ? "red" : CONFIG.BLACK
    )
    .text(`Attack Score: ${currentData.attack_score.toFixed(3)}`);
  infoGroup.select(".info-fpr").text(`FPR: ${currentData.fpr.toFixed(3)}`);
  infoGroup.select(".info-fnr").text(`FNR: ${currentData.fnr.toFixed(3)}`);

  return currentData.attack_score;
}

interface Props {
  mode: "A" | "B";
  thresholdValue: number;
  hoveredId: number | null;
  data: Data;
  onThresholdLineDrag: (value: number) => void;
  onUpdateAttackScore: (score: number) => void;
  setHoveredId: (val: number | null) => void;
  onElementClick: (
    event: React.MouseEvent,
    elementData: Bin & { type: CategoryType }
  ) => void;
}

export default function AttackPlot({
  mode,
  thresholdValue,
  hoveredId,
  data,
  onThresholdLineDrag,
  onUpdateAttackScore,
  setHoveredId,
  onElementClick,
}: Props) {
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const modelA = useModelDataStore((state) => state.modelA);
  const modelB = useModelDataStore((state) => state.modelB);
  const modelAExperiment = useModelAExperiment();
  const modelBExperiment = useModelBExperiment();
  const metric = useAttackStateStore((state) => state.metric);
  const strategy = useAttackStateStore((state) => state.strategy);

  const [isLegendVisible, setIsLegendVisible] = useState(true);
  const [isLineLegendVisible, setIsLineLegendVisible] = useState(true);

  const butterflyRef = useRef<SVGSVGElement | null>(null);
  const lineRef = useRef<SVGSVGElement | null>(null);
  const panOffset = useRef(0);
  const butterflyThresholdRef = useRef<SVGGElement | null>(null);
  const lineYScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const lineXScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null);
  const prevStrategy = useRef(strategy);
  const prevAboveUnlearnForLegend = useRef<boolean | null>(null);
  const lineThresholdRef = useRef<SVGGElement | null>(null);
  const butterflyYScaleRef = useRef<d3.ScaleLinear<number, number> | null>(
    null
  );

  const hoveredIdRef = useRef(hoveredId);
  const thresholdValueRef = useRef(thresholdValue);
  const isAboveThresholdUnlearnRef = useRef(false);
  const isLegendVisibleRef = useRef(isLegendVisible);
  const isLineLegendVisibleRef = useRef(isLineLegendVisible);
  const metricRef = useRef(metric);
  const strategyRef = useRef(strategy);
  const setHoveredIdRef = useRef(setHoveredId);
  const onElementClickRef = useRef(onElementClick);
  const onThresholdLineDragRef = useRef(onThresholdLineDrag);
  const onUpdateAttackScoreRef = useRef(onUpdateAttackScore);
  const thresholdMinRef = useRef(0);
  const thresholdMaxRef = useRef(0);
  const thresholdStepRef = useRef(0);

  const retrainJson = data?.retrainData;
  const unlearnJson = data?.unlearnData;
  const attackData = data?.lineChartData;

  const computedThresholdData = attackData?.find(
    (d) => Math.abs(d.threshold - thresholdValue) < 0.001
  );

  const isModelA = mode === "A";
  const isMetricEntropy = metric === ENTROPY;
  const isAboveThresholdUnlearn = computedThresholdData?.type === UNLEARN;
  const isStrategyCustom = strategy === THRESHOLD_STRATEGIES[0].strategy;

  const thresholdMin = isMetricEntropy
    ? CONFIG.ENTROPY_SCOPE_MIN
    : CONFIG.CONFIDENCE_SCOPE_MIN;
  const thresholdMax = isMetricEntropy
    ? CONFIG.ENTROPY_SCOPE_MAX
    : CONFIG.CONFIDENCE_SCOPE_MAX;
  const thresholdStep = isMetricEntropy
    ? CONFIG.ENTROPY_THRESHOLD_STEP
    : CONFIG.CONFIDENCE_THRESHOLD_STEP;

  hoveredIdRef.current = hoveredId;
  thresholdValueRef.current = thresholdValue;
  isAboveThresholdUnlearnRef.current = isAboveThresholdUnlearn;
  isLegendVisibleRef.current = isLegendVisible;
  isLineLegendVisibleRef.current = isLineLegendVisible;
  metricRef.current = metric;
  strategyRef.current = strategy;
  setHoveredIdRef.current = setHoveredId;
  onElementClickRef.current = onElementClick;
  onThresholdLineDragRef.current = onThresholdLineDrag;
  onUpdateAttackScoreRef.current = onUpdateAttackScore;
  thresholdMinRef.current = thresholdMin;
  thresholdMaxRef.current = thresholdMax;
  thresholdStepRef.current = thresholdStep;

  const drawButterflyChart = useCallback(() => {
    if (
      !data ||
      !retrainJson ||
      !unlearnJson ||
      !attackData ||
      !butterflyRef.current
    )
      return;

    const binSize = isMetricEntropy
      ? CONFIG.ENTROPY_THRESHOLD_STEP
      : CONFIG.CONFIDENCE_THRESHOLD_STEP;
    const retrainBins = createBins(
      data.retrainData,
      binSize,
      thresholdMax,
      isMetricEntropy
    );
    const unlearnBins = createBins(
      data.unlearnData,
      binSize,
      thresholdMax,
      isMetricEntropy
    );
    const maxCountRetrain = d3.max(retrainBins, (d) => d.bins.length) || 0;
    const maxCountUnlearn = d3.max(unlearnBins, (d) => d.bins.length) || 0;

    const wB =
      CONFIG.BUTTERFLY_CHART_WIDTH -
      CONFIG.BUTTERFLY_MARGIN.left -
      CONFIG.BUTTERFLY_MARGIN.right;
    const halfWB = wB / 2;
    const hB =
      CONFIG.HEIGHT -
      CONFIG.BUTTERFLY_MARGIN.top -
      CONFIG.BUTTERFLY_MARGIN.bottom;
    const circleDiameter =
      2 * CONFIG.BUTTERFLY_CIRCLE_RADIUS + CONFIG.STROKE_WIDTH;
    const halfCircles = halfWB / circleDiameter;
    const maxDisplayCircles = Math.floor(halfCircles);
    const extraRetrain =
      maxCountRetrain > maxDisplayCircles
        ? maxCountRetrain - maxDisplayCircles
        : 0;
    const extraUnlearn =
      maxCountUnlearn > maxDisplayCircles
        ? maxCountUnlearn - maxDisplayCircles
        : 0;

    const xScaleB = d3
      .scaleLinear()
      .domain([
        -halfCircles + panOffset.current,
        halfCircles + panOffset.current,
      ])
      .range([-halfWB, halfWB]);

    const yScaleB = d3
      .scaleLinear()
      .domain([thresholdMin, thresholdMax])
      .range([hB, 0]);

    butterflyYScaleRef.current = yScaleB;

    // Initialize SVG
    const svgB = d3
      .select(butterflyRef.current)
      .attr("width", CONFIG.BUTTERFLY_CHART_WIDTH)
      .attr("height", CONFIG.HEIGHT);
    svgB.selectAll("*").remove();
    const gB = svgB
      .append("g")
      .attr("class", "butterfly-plot")
      .attr(
        "transform",
        `translate(${CONFIG.BUTTERFLY_MARGIN.left + halfWB}, ${
          CONFIG.BUTTERFLY_MARGIN.top
        })`
      );

    gB.append("clipPath")
      .attr("id", "clip-butterfly")
      .append("rect")
      .attr("x", -halfWB)
      .attr("y", -hB)
      .attr("width", wB)
      .attr("height", 2 * hB);

    const backgroundGroup = gB.append("g").attr("class", "background");
    backgroundGroup
      .append("rect")
      .attr("class", "panning-overlay")
      .attr("x", -halfWB)
      .attr("y", 0)
      .attr("width", wB)
      .attr("height", hB)
      .attr("fill", "transparent")
      .call(
        d3.drag<SVGRectElement, unknown>().on("drag", (event) => {
          panOffset.current -= event.dx / circleDiameter;
          const maxPanLeft = extraRetrain;
          const maxPanRight = extraUnlearn;
          panOffset.current = Math.max(
            -maxPanLeft,
            Math.min(maxPanRight, panOffset.current)
          );
          xScaleB.domain([
            -halfCircles + panOffset.current,
            halfCircles + panOffset.current,
          ]);

          const tickStep = CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP;
          const newTickMin =
            Math.ceil((-halfCircles + panOffset.current) / tickStep) * tickStep;
          const newTickMax =
            Math.floor((halfCircles + panOffset.current) / tickStep) * tickStep;
          const newTicks = d3.range(
            newTickMin,
            newTickMax + tickStep,
            tickStep
          );

          xAxisB.call(
            d3
              .axisBottom(xScaleB)
              .tickSize(0)
              .tickValues(newTicks)
              .tickFormat((d) => Math.abs(+d).toString())
          );

          xAxisB.selectAll(".tick").each(function () {
            d3.select(this).select("line.grid-line").remove();
            d3.select(this)
              .append("line")
              .attr("class", "grid-line")
              .attr("y1", -hB)
              .attr("y2", 0)
              .attr("stroke", CONFIG.VERTICAL_LINE_COLOR);
          });

          gB.selectAll(".retrain-circle").attr("cx", function () {
            const origX = +d3.select(this).attr("data-original-x");
            const newX = xScaleB(origX);
            d3.select(this).attr(
              "visibility",
              newX < -200 ? "hidden" : "visible"
            );
            return newX;
          });
          gB.selectAll(".unlearn-circle").attr("cx", function () {
            const origX = +d3.select(this).attr("data-original-x");
            const newX = xScaleB(origX);
            d3.select(this).attr(
              "visibility",
              newX < -200 ? "hidden" : "visible"
            );
            return newX;
          });
        })
      )
      .on("wheel", (event) => {
        event.preventDefault();

        const scrollFactor = 40;
        panOffset.current -= event.deltaY / scrollFactor;
        const maxPanLeft = extraRetrain;
        const maxPanRight = extraUnlearn;
        panOffset.current = Math.max(
          -maxPanLeft,
          Math.min(maxPanRight, panOffset.current)
        );

        xScaleB.domain([
          -halfCircles + panOffset.current,
          halfCircles + panOffset.current,
        ]);

        const tickStep = CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP;
        const newTickMin =
          Math.ceil((-halfCircles + panOffset.current) / tickStep) * tickStep;
        const newTickMax =
          Math.floor((halfCircles + panOffset.current) / tickStep) * tickStep;
        const newTicks = d3.range(newTickMin, newTickMax + tickStep, tickStep);

        xAxisB.call(
          d3
            .axisBottom(xScaleB)
            .tickSize(0)
            .tickValues(newTicks)
            .tickFormat((d) => Math.abs(+d).toString())
        );

        xAxisB.selectAll(".tick").each(function () {
          d3.select(this).select("line.grid-line").remove();
          d3.select(this)
            .append("line")
            .attr("class", "grid-line")
            .attr("y1", -hB)
            .attr("y2", 0)
            .attr("stroke", CONFIG.VERTICAL_LINE_COLOR);
        });

        gB.selectAll(".retrain-circle").attr("cx", function () {
          const origX = +d3.select(this).attr("data-original-x");
          const newX = xScaleB(origX);
          d3.select(this).attr(
            "visibility",
            newX < -200 ? "hidden" : "visible"
          );
          return newX;
        });
        gB.selectAll(".unlearn-circle").attr("cx", function () {
          const origX = +d3.select(this).attr("data-original-x");
          const newX = xScaleB(origX);
          d3.select(this).attr(
            "visibility",
            newX < -200 ? "hidden" : "visible"
          );
          return newX;
        });
      });

    const tickMin =
      Math.ceil(-halfCircles / CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP) *
      CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP;
    const tickMax =
      Math.floor(halfCircles / CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP) *
      CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP;
    const ticks = d3.range(
      tickMin,
      tickMax + CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP,
      CONFIG.BUTTERFLY_CHART_X_AXIS_TICK_STEP
    );

    // X-axis
    const xAxisB = gB
      .append("g")
      .attr("class", "x-axis-b")
      .attr("transform", `translate(0, ${hB})`)
      .call(
        d3
          .axisBottom(xScaleB)
          .tickSize(0)
          .tickValues(ticks)
          .tickFormat((d) => Math.abs(+d).toString())
      );

    xAxisB.selectAll(".tick text").attr("dy", "9px");

    xAxisB.selectAll(".tick").each(function () {
      d3.select(this)
        .append("line")
        .attr("class", "grid-line")
        .attr("y1", -hB)
        .attr("y2", 0)
        .attr("stroke", CONFIG.VERTICAL_LINE_COLOR);
    });

    xAxisB.attr("clip-path", "url(#clip-butterfly)");

    // Y-Axis
    gB.append("g")
      .attr("class", "y-axis")
      .attr("transform", `translate(${-halfWB}, 0)`)
      .call((g) => d3.axisLeft(yScaleB).ticks(isMetricEntropy ? 5 : 6)(g));
    gB.append("text")
      .attr("class", "y-axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -hB / 2 - 1)
      .attr("y", -218)
      .attr("font-size", FONT_CONFIG.FONT_SIZE_13)
      .attr("font-family", CONFIG.FONT_FAMILY)
      .attr("fill", CONFIG.BLACK)
      .attr("text-anchor", "middle")
      .text(isMetricEntropy ? "Entropy" : "Top-1 Confidence");

    const currentHoveredId = hoveredIdRef.current;
    const currentThreshold = thresholdValueRef.current;
    const currentAboveUnlearn = isAboveThresholdUnlearnRef.current;

    retrainBins.forEach((bin) => {
      const yPos = yScaleB(bin.threshold + binSize / 2);
      bin.bins.forEach((currentBin, i) => {
        const opacity =
          currentHoveredId !== null
            ? currentBin.img_idx === currentHoveredId
              ? CONFIG.OPACITY_ABOVE_THRESHOLD
              : CONFIG.OPACITY_BELOW_THRESHOLD
            : circleOpacity(
                yPos,
                yScaleB(currentThreshold),
                currentAboveUnlearn
              );
        const originalXDomain = -(bin.bins.length - 1 - i + 0.5);
        gB.append("circle")
          .attr("clip-path", "url(#clip-butterfly)")
          .datum(currentBin)
          .attr("class", "retrain-circle")
          .attr("fill", COLORS.DARK_GRAY)
          .attr("cx", xScaleB(originalXDomain))
          .attr("cy", yPos)
          .attr("r", CONFIG.BUTTERFLY_CIRCLE_RADIUS)
          .attr("fill-opacity", opacity)
          .attr(
            "stroke",
            d3.color(COLORS.DARK_GRAY)?.darker().toString() ?? COLORS.DARK_GRAY
          )
          .attr("stroke-width", CONFIG.STROKE_WIDTH)
          .attr("stroke-opacity", opacity)
          .attr("cursor", "pointer")
          .attr("data-original-x", originalXDomain)
          .on("mouseover", (_, d) => setHoveredIdRef.current(d.img_idx))
          .on("mouseout", () => setHoveredIdRef.current(null))
          .on("click", (event, d) =>
            onElementClickRef.current(event, { ...d, type: RETRAIN })
          );
      });
    });

    unlearnBins.forEach((bin) => {
      const yPos = yScaleB(bin.threshold + binSize / 2);
      const color = isModelA ? COLORS.EMERALD : COLORS.PURPLE;
      bin.bins.forEach((currentBin, i) => {
        const opacity =
          currentHoveredId !== null
            ? currentBin.img_idx === currentHoveredId
              ? CONFIG.OPACITY_ABOVE_THRESHOLD
              : CONFIG.OPACITY_BELOW_THRESHOLD
            : circleOpacity(
                yPos,
                yScaleB(currentThreshold),
                currentAboveUnlearn
              );
        const originalXDomain = i + 0.5;
        gB.append("circle")
          .attr("clip-path", "url(#clip-butterfly)")
          .datum(currentBin)
          .attr("class", "unlearn-circle")
          .attr("fill", color)
          .attr("cx", xScaleB(originalXDomain))
          .attr("cy", yPos)
          .attr("r", CONFIG.BUTTERFLY_CIRCLE_RADIUS)
          .attr("fill-opacity", opacity)
          .attr("stroke", d3.color(color)?.darker().toString() ?? color)
          .attr("stroke-width", CONFIG.STROKE_WIDTH)
          .attr("stroke-opacity", opacity)
          .attr("cursor", "pointer")
          .attr("data-original-x", originalXDomain)
          .on("mouseover", (_, d) => setHoveredIdRef.current(d.img_idx))
          .on("mouseout", () => setHoveredIdRef.current(null))
          .on("click", (event, d) =>
            onElementClickRef.current(event, { ...d, type: UNLEARN })
          );
      });
    });

    paintButterflyLegend(
      gB,
      currentAboveUnlearn,
      isModelA,
      isLegendVisibleRef.current
    );

    const buttonGroup = svgB
      .append("g")
      .attr("class", "legend-toggle-button")
      .attr("transform", `translate(${CONFIG.BUTTERFLY_CHART_WIDTH - 217}, 10)`)
      .style("cursor", "pointer")
      .on("click", () => {
        setIsLegendVisible((prev) => !prev);
      });
    buttonGroup
      .append("rect")
      .attr("x", -8)
      .attr("y", -8)
      .attr("width", 32)
      .attr("height", 16)
      .attr("fill", "transparent");
    buttonGroup
      .append("title")
      .text(isLegendVisibleRef.current ? "Hide Legend" : "Show Legend");
    buttonGroup.attr(
      "aria-label",
      isLegendVisibleRef.current ? "Hide Legend" : "Show Legend"
    );

    d3.select(butterflyRef.current).on("mousemove", (event) => {
      if (!(event.target instanceof SVGCircleElement)) {
        setHoveredIdRef.current(null);
      }
    });

    applyHoverLabels(butterflyRef.current, currentHoveredId, metricRef.current);

    const thresholdGroupButterfly = createThresholdGroup(
      gB,
      [-halfWB, halfWB],
      yScaleB,
      currentThreshold,
      isStrategyCustom,
      currentAboveUnlearn,
      isModelA
    );

    butterflyThresholdRef.current =
      thresholdGroupButterfly.node() as SVGGElement;
  }, [
    attackData,
    data,
    isMetricEntropy,
    isModelA,
    isStrategyCustom,
    retrainJson,
    thresholdMax,
    thresholdMin,
    unlearnJson,
  ]);

  const drawLineChart = useCallback(() => {
    if (!attackData || !lineRef.current) return;
    const { wL, hL } = lineChartLayout();
    const currentThreshold = thresholdValueRef.current;
    const currentAboveUnlearn = isAboveThresholdUnlearnRef.current;
    const xScaleL = d3.scaleLinear().domain([0, 1.05]).range([0, wL]);
    const yScaleL = d3
      .scaleLinear()
      .domain([thresholdMin, thresholdMax])
      .range([hL, 0])
      .clamp(true);

    lineYScaleRef.current = yScaleL;
    lineXScaleRef.current = xScaleL;

    const svgL = d3
      .select(lineRef.current)
      .attr("width", CONFIG.LINE_CHART_WIDTH)
      .attr("height", CONFIG.HEIGHT);
    svgL.selectAll("*").remove();
    const gL = svgL
      .append("g")
      .attr("class", "line-plot")
      .attr(
        "transform",
        `translate(${CONFIG.LINE_MARGIN.left},${CONFIG.LINE_MARGIN.top})`
      );

    const lineButtonGroup = svgL
      .append("g")
      .attr("class", "line-legend-toggle-button")
      .attr("transform", `translate(${CONFIG.LINE_CHART_WIDTH - 94}, 10)`)
      .style("cursor", "pointer")
      .on("click", () => {
        setIsLineLegendVisible((prev) => !prev);
      });
    lineButtonGroup
      .append("rect")
      .attr("x", -8)
      .attr("y", -8)
      .attr("width", 32)
      .attr("height", 16)
      .attr("fill", "transparent");
    lineButtonGroup
      .append("title")
      .text(isLineLegendVisibleRef.current ? "Hide Legend" : "Show Legend");
    lineButtonGroup.attr(
      "aria-label",
      isLineLegendVisibleRef.current ? "Hide Legend" : "Show Legend"
    );

    // Define the glow filter
    const defs = gL.append("defs");
    const glowFilter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%")
      .attr("filterUnits", "userSpaceOnUse");
    glowFilter
      .append("feGaussianBlur")
      .attr("in", "SourceGraphic")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    defs
      .append("clipPath")
      .attr("id", `aboveThreshold-${mode}`)
      .append("rect")
      .attr("class", "clip-above")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", wL)
      .attr("height", yScaleL(currentThreshold));
    defs
      .append("clipPath")
      .attr("id", `belowThreshold-${mode}`)
      .append("rect")
      .attr("class", "clip-below")
      .attr("x", 0)
      .attr("y", yScaleL(currentThreshold))
      .attr("width", wL)
      .attr("height", hL - yScaleL(currentThreshold));

    // X-axis
    const xAxisL = gL
      .append("g")
      .attr("transform", `translate(0, ${hL})`)
      .call(
        d3
          .axisBottom(xScaleL)
          .tickSize(0)
          .tickSizeOuter(0)
          .tickValues(d3.range(0, 1.0001, 0.25))
          .tickFormat(d3.format(".2f"))
      );

    xAxisL.selectAll(".tick").each(function () {
      d3.select(this)
        .append("line")
        .attr("class", "grid-line")
        .attr("y1", -hL)
        .attr("y2", 0)
        .attr("stroke", CONFIG.VERTICAL_LINE_COLOR);
    });

    xAxisL
      .append("text")
      .attr("class", "axis-label")
      .attr("x", wL / 2)
      .attr("y", 16)
      .attr("font-size", FONT_CONFIG.FONT_SIZE_13)
      .attr("font-family", CONFIG.FONT_FAMILY)
      .attr("fill", CONFIG.BLACK)
      .attr("text-anchor", "middle")
      .text("Value");

    xAxisL.selectAll("text").attr("dy", "9px");

    // Y-Axis
    gL.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", hL)
      .attr("stroke", CONFIG.BLACK)
      .attr("stroke-width", 1);

    // Functions for drawing lines
    const attackLine = d3
      .line<AttackResult>()
      .x((d) => xScaleL(d.attack_score))
      .y((d) => yScaleL(d.threshold));
    const fprLine = d3
      .line<AttackResult>()
      .x((d) => xScaleL(d.fpr))
      .y((d) => yScaleL(d.threshold));
    const fnrLine = d3
      .line<AttackResult>()
      .x((d) => xScaleL(d.fnr))
      .y((d) => yScaleL(d.threshold));

    // Draw Attack, FPR, FNR lines
    gL.append("path")
      .datum(attackData)
      .attr("class", "line-attack-above")
      .attr("fill", "none")
      .attr("stroke", TABLEAU10[2])
      .attr("stroke-width", CONFIG.LINE_WIDTH)
      .attr(
        "stroke-opacity",
        currentAboveUnlearn
          ? CONFIG.OPACITY_ABOVE_THRESHOLD
          : CONFIG.OPACITY_BELOW_THRESHOLD
      )
      .attr("d", attackLine)
      .attr("clip-path", `url(#aboveThreshold-${mode})`)
      .attr("filter", "url(#glow)");
    gL.append("path")
      .datum(attackData)
      .attr("class", "line-attack-below")
      .attr("fill", "none")
      .attr("stroke", TABLEAU10[2])
      .attr("stroke-width", CONFIG.LINE_WIDTH)
      .attr(
        "stroke-opacity",
        currentAboveUnlearn
          ? CONFIG.OPACITY_BELOW_THRESHOLD
          : CONFIG.OPACITY_ABOVE_THRESHOLD
      )
      .attr("d", attackLine)
      .attr("clip-path", `url(#belowThreshold-${mode})`)
      .attr("filter", "url(#glow)");

    gL.append("path")
      .datum(attackData)
      .attr("class", "line-fpr-above")
      .attr("fill", "none")
      .attr("stroke", TABLEAU10[0])
      .attr("stroke-width", CONFIG.LINE_WIDTH)
      .attr(
        "stroke-opacity",
        currentAboveUnlearn
          ? CONFIG.OPACITY_ABOVE_THRESHOLD
          : CONFIG.OPACITY_BELOW_THRESHOLD
      )
      .attr("d", fprLine)
      .attr("clip-path", `url(#aboveThreshold-${mode})`);
    gL.append("path")
      .datum(attackData)
      .attr("class", "line-fpr-below")
      .attr("fill", "none")
      .attr("stroke", TABLEAU10[0])
      .attr("stroke-width", CONFIG.LINE_WIDTH)
      .attr(
        "stroke-opacity",
        currentAboveUnlearn
          ? CONFIG.OPACITY_BELOW_THRESHOLD
          : CONFIG.OPACITY_ABOVE_THRESHOLD
      )
      .attr("d", fprLine)
      .attr("clip-path", `url(#belowThreshold-${mode})`);

    gL.append("path")
      .datum(attackData)
      .attr("class", "line-fnr-above")
      .attr("fill", "none")
      .attr("stroke", TABLEAU10[4])
      .attr("stroke-width", CONFIG.LINE_WIDTH)
      .attr(
        "stroke-opacity",
        currentAboveUnlearn
          ? CONFIG.OPACITY_ABOVE_THRESHOLD
          : CONFIG.OPACITY_BELOW_THRESHOLD
      )
      .attr("d", fnrLine)
      .attr("clip-path", `url(#aboveThreshold-${mode})`);
    gL.append("path")
      .datum(attackData)
      .attr("class", "line-fnr-below")
      .attr("fill", "none")
      .attr("stroke", TABLEAU10[4])
      .attr("stroke-width", CONFIG.LINE_WIDTH)
      .attr(
        "stroke-opacity",
        currentAboveUnlearn
          ? CONFIG.OPACITY_BELOW_THRESHOLD
          : CONFIG.OPACITY_ABOVE_THRESHOLD
      )
      .attr("d", fnrLine)
      .attr("clip-path", `url(#belowThreshold-${mode})`);

    // Draw a legend
    const lineChartLegendGroup = gL
      .append("g")
      .attr("class", "line-legend-group")
      .attr("transform", `translate(${wL - 37}, -1.5)`)
      .style("display", isLineLegendVisibleRef.current ? "block" : "none");

    lineChartLegendGroup
      .append("rect")
      .attr("x", -104)
      .attr("y", 0)
      .attr("width", 122)
      .attr("height", 42)
      .attr("fill", "white")
      .attr("opacity", 0.6)
      .attr("stroke", "#d6d6d6")
      .attr("stroke-width", 1.5)
      .attr("rx", 2)
      .attr("ry", 2);

    LINE_GRAPH_LEGEND_DATA.forEach((item, i) => {
      const yPos = 10 + i * 12;
      const legendItemGroup = lineChartLegendGroup
        .append("g")
        .attr("transform", `translate(-98, ${yPos})`);
      const lineElement = legendItemGroup
        .append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 14)
        .attr("y2", 0)
        .attr("stroke", item.color)
        .attr("stroke-width", 2);
      if (item.color === TABLEAU10[2]) {
        lineElement.attr("filter", "url(#glow)");
      }
      legendItemGroup
        .append("text")
        .attr("class", "line-legend-" + item.color)
        .attr("x", 20)
        .attr("y", 3)
        .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
        .text(item.label);
    });

    const thresholdGroupLine = createThresholdGroup(
      gL,
      [-3, wL],
      yScaleL,
      currentThreshold,
      isStrategyCustom,
      currentAboveUnlearn,
      isModelA
    );

    lineThresholdRef.current = thresholdGroupLine.node() as SVGGElement;

    gL.append("g").attr("class", "intersection-group");
    updateIntersections(
      gL,
      attackData,
      currentThreshold,
      xScaleL,
      yScaleL
    );

    const textShadowStyle =
      "text-shadow: -0.5px -0.5px 0 white, 0.5px -0.5px 0 white, -0.5px 0.5px 0 white, 0.5px 0.5px 0 white;";
    const infoGroup = gL.append("g").attr("class", "info-group");
    infoGroup
      .append("text")
      .attr("class", "info-threshold")
      .attr("text-anchor", "start")
      .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
      .attr("style", textShadowStyle);
    infoGroup
      .append("text")
      .attr("class", "info-attack-score")
      .attr("text-anchor", "start")
      .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
      .attr("dy", "1.2em")
      .attr("style", textShadowStyle);
    infoGroup
      .append("text")
      .attr("class", "info-fpr")
      .attr("text-anchor", "start")
      .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
      .attr("dy", "2.4em")
      .attr("style", textShadowStyle);
    infoGroup
      .append("text")
      .attr("class", "info-fnr")
      .attr("text-anchor", "start")
      .attr("font-size", FONT_CONFIG.FONT_SIZE_12)
      .attr("dy", "3.6em")
      .attr("style", textShadowStyle);

    onUpdateAttackScoreRef.current(
      updateInfoGroup(
        gL,
        attackData,
        currentThreshold,
        xScaleL,
        yScaleL,
        isMetricEntropy,
        strategyRef.current
      )
    );
  }, [
    attackData,
    isMetricEntropy,
    isModelA,
    isStrategyCustom,
    mode,
    thresholdMax,
    thresholdMin,
  ]);

  useEffect(() => {
    if (
      prevStrategy.current !== THRESHOLD_STRATEGIES[0].strategy &&
      strategy === THRESHOLD_STRATEGIES[0].strategy
    ) {
      panOffset.current = 0;
    }
    prevStrategy.current = strategy;
  }, [strategy]);

  useEffect(() => {
    if (!data) return;
    drawButterflyChart();
    drawLineChart();
  }, [data, attackData, metric, strategy, modelA, modelB, drawButterflyChart, drawLineChart]);

  useEffect(() => {
    applyCircleOpacities(
      butterflyRef.current,
      hoveredId,
      thresholdValueRef.current,
      isAboveThresholdUnlearnRef.current,
      butterflyYScaleRef.current
    );
    applyHoverLabels(butterflyRef.current, hoveredId, metricRef.current);
  }, [hoveredId]);

  useEffect(() => {
    if (!butterflyRef.current || !lineRef.current) return;
    if (!lineYScaleRef.current || !lineXScaleRef.current) return;
    if (!attackData || attackData.length === 0) return;

    const { hL } = lineChartLayout();
    const yScaleL = lineYScaleRef.current;
    const xScaleL = lineXScaleRef.current;
    const gL = d3.select(lineRef.current).select(".line-plot");
    const gB = d3.select(butterflyRef.current).select(".butterfly-plot");

    if (butterflyThresholdRef.current && butterflyYScaleRef.current) {
      const group = d3.select(butterflyThresholdRef.current);
      group.attr(
        "transform",
        `translate(0, ${butterflyYScaleRef.current(thresholdValue)})`
      );
      setThresholdLabelText(group, isAboveThresholdUnlearn, isModelA);
    }
    if (lineThresholdRef.current) {
      const group = d3.select(lineThresholdRef.current);
      group.attr("transform", `translate(0, ${yScaleL(thresholdValue)})`);
      setThresholdLabelText(group, isAboveThresholdUnlearn, isModelA);
    }

    const aboveY = yScaleL(thresholdValue);
    gL.select(".clip-above").attr("height", aboveY);
    gL.select(".clip-below")
      .attr("y", aboveY)
      .attr("height", hL - aboveY);

    const aboveOp = isAboveThresholdUnlearn
      ? CONFIG.OPACITY_ABOVE_THRESHOLD
      : CONFIG.OPACITY_BELOW_THRESHOLD;
    const belowOp = isAboveThresholdUnlearn
      ? CONFIG.OPACITY_BELOW_THRESHOLD
      : CONFIG.OPACITY_ABOVE_THRESHOLD;
    gL.selectAll(".line-attack-above, .line-fpr-above, .line-fnr-above").attr(
      "stroke-opacity",
      aboveOp
    );
    gL.selectAll(".line-attack-below, .line-fpr-below, .line-fnr-below").attr(
      "stroke-opacity",
      belowOp
    );

    const strokeOpacity = isAboveThresholdUnlearn
      ? CONFIG.OPACITY_ABOVE_THRESHOLD
      : CONFIG.OPACITY_BELOW_THRESHOLD;
    d3.select(butterflyRef.current)
      .selectAll(".threshold-line")
      .attr("stroke", CONFIG.BLACK)
      .attr("stroke-opacity", strokeOpacity);
    d3.select(lineRef.current)
      .selectAll(".threshold-line")
      .attr("stroke", CONFIG.BLACK)
      .attr("stroke-opacity", strokeOpacity);

    updateIntersections(gL, attackData, thresholdValue, xScaleL, yScaleL);
    onUpdateAttackScoreRef.current(
      updateInfoGroup(
        gL,
        attackData,
        thresholdValue,
        xScaleL,
        yScaleL,
        isMetricEntropy,
        strategy
      )
    );

    if (
      !gB.empty() &&
      prevAboveUnlearnForLegend.current !== isAboveThresholdUnlearn
    ) {
      paintButterflyLegend(
        gB,
        isAboveThresholdUnlearn,
        isModelA,
        isLegendVisibleRef.current
      );
      prevAboveUnlearnForLegend.current = isAboveThresholdUnlearn;
    }

    applyCircleOpacities(
      butterflyRef.current,
      hoveredIdRef.current,
      thresholdValue,
      isAboveThresholdUnlearn,
      butterflyYScaleRef.current
    );
  }, [
    thresholdValue,
    isAboveThresholdUnlearn,
    isMetricEntropy,
    isModelA,
    attackData,
    strategy,
  ]);

  useEffect(() => {
    d3.select(butterflyRef.current)
      .select(".butterfly-legend-group")
      .style("display", isLegendVisible ? "block" : "none");
    d3.select(butterflyRef.current)
      .select(".legend-toggle-button title")
      .text(isLegendVisible ? "Hide Legend" : "Show Legend");
    d3.select(butterflyRef.current)
      .select(".legend-toggle-button")
      .attr("aria-label", isLegendVisible ? "Hide Legend" : "Show Legend");
  }, [isLegendVisible]);

  useEffect(() => {
    d3.select(lineRef.current)
      .select(".line-legend-group")
      .style("display", isLineLegendVisible ? "block" : "none");
    d3.select(lineRef.current)
      .select(".line-legend-toggle-button title")
      .text(isLineLegendVisible ? "Hide Legend" : "Show Legend");
    d3.select(lineRef.current)
      .select(".line-legend-toggle-button")
      .attr(
        "aria-label",
        isLineLegendVisible ? "Hide Legend" : "Show Legend"
      );
  }, [isLineLegendVisible]);

  useEffect(() => {
    if (!butterflyThresholdRef.current || !lineThresholdRef.current) return;
    if (!isStrategyCustom) return;

    let dragOffset = 0;

    const dragHandler = d3
      .drag<SVGGElement, unknown>()
      .on("start", function (event) {
        const container = d3.select(butterflyRef.current);
        const [, pointerY] = d3.pointer(event, container.node());
        const currentTransform = d3.select(this).attr("transform");
        const currentY = currentTransform
          ? +currentTransform.replace(/translate\(0,\s*|\)/g, "")
          : 0;
        dragOffset = pointerY - currentY;
      })
      .on("drag", function (event) {
        const container = d3.select(butterflyRef.current);
        const [, pointerY] = d3.pointer(event, container.node());
        const newY = pointerY - dragOffset;
        const newThresholdRaw = butterflyYScaleRef.current!.invert(newY);
        const step = thresholdStepRef.current;
        const clamped = Math.max(
          thresholdMinRef.current,
          Math.min(
            thresholdMaxRef.current,
            Math.round(newThresholdRaw / step) * step
          )
        );

        onThresholdLineDragRef.current(clamped);

        if (butterflyYScaleRef.current && butterflyThresholdRef.current) {
          d3.select(butterflyThresholdRef.current).attr(
            "transform",
            `translate(0, ${butterflyYScaleRef.current(clamped)})`
          );
        }
        if (lineYScaleRef.current && lineThresholdRef.current) {
          d3.select(lineThresholdRef.current).attr(
            "transform",
            `translate(0, ${lineYScaleRef.current(clamped)})`
          );
        }
      });

    d3.select(butterflyThresholdRef.current).call(dragHandler);
    d3.select(lineThresholdRef.current).call(dragHandler);
  }, [isStrategyCustom, data, attackData, metric, strategy, modelA, modelB]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center relative bottom-[7px] px-3.5 bg-white z-10">
        <span style={{ color: COLORS.DARK_GRAY }}>
          Retrained Model (a00{forgetClass})
        </span>
        <span className="mx-1.5">vs.</span>
        <span style={{ color: isModelA ? COLORS.EMERALD : COLORS.PURPLE }}>
          {isModelA ? "Model A" : "Model B"} (
          {isModelA ? modelAExperiment.Type : modelBExperiment.Type}
          {", "}
          {isModelA ? modelA : modelB})
        </span>
      </div>
      <div className="flex relative bottom-3">
        <svg ref={butterflyRef}></svg>
        <svg ref={lineRef} className="relative right-3.5"></svg>
        <p className="absolute -bottom-0.5 left-[123.5px] text-[13px]">
          ← <span style={{ color: COLORS.DARK_GRAY }}>Retrained</span> Samples |{" "}
          <span style={{ color: isModelA ? COLORS.EMERALD : COLORS.PURPLE }}>
            {isModelA ? "Model A" : "Model B"}
          </span>{" "}
          Samples →
        </p>
      </div>
    </div>
  );
}
