import React, {
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useMemo,
  useCallback,
  useReducer,
} from "react";
import { createRoot, Root } from "react-dom/client";
import { AiOutlineHome } from "react-icons/ai";
import * as d3 from "d3";

import Tooltip from "./Tooltip";
import { useForgetClassStore } from "../../stores/forgetClassStore";
import { useModelDataStore } from "../../stores/modelDataStore";
import { calculateZoom } from "../../utils/util";
import { COLORS } from "../../constants/colors";
import { ANIMATION_DURATION } from "../../constants/common";
import { VIEW_MODES } from "../../constants/embeddings";
import {
  SelectedData,
  HoverInstance,
  Prob,
  SvgElementsRefType,
} from "../../types/embeddings";
import {
  useModelAExperiment,
  useModelBExperiment,
} from "../../stores/experimentsStore";

/**
 * 0 -> ground thruth
 * 1 -> prediction
 * 2 -> img
 * 3 -> ?
 * 4 -> x
 * 5 -> y
 * 6 -> prob
 */

const CONFIG = {
  WIDTH: 600,
  HEIGHT: 640,
  DOT_SIZE: 4,
  CROSS__SIZE: 4,
  MIN_ZOOM: 0.6,
  MAX_ZOOM: 32,
  X_SIZE_DIVIDER: 0.4,
  X_STROKE_WIDTH: 1,
  LOWERED_OPACITY: 0.05,
  HOVERED_STROKE_WIDTH: 2,
  PADDING_RATIO: 0.01,
  TOOLTIP_X_SIZE: 450,
  TOOLTIP_Y_SIZE: 274,
  DEFAULT_CROSS_OPACITY: 0.85,
  DEFAULT_CIRCLE_OPACITY: 0.6,
  MISCLASSIFICATION_CIRCLE_OPACITY: 0.85,
} as const;

interface Props {
  mode: "A" | "B";
  modelType: string;
  highlight: string;
  setHighlight: (highlight: string) => void;
  data: SelectedData;
  onHover: (
    imgIdxOrNull: number | null,
    source?: "A" | "B",
    prob?: Prob
  ) => void;
  hoveredInstance: HoverInstance | null;
}

const ScatterPlot = forwardRef(
  (
    {
      mode,
      modelType,
      highlight,
      setHighlight,
      data,
      onHover,
      hoveredInstance,
    }: Props,
    ref
  ) => {
    const forgetClass = useForgetClassStore((state) => state.forgetClass);
    const modelA = useModelDataStore((state) => state.modelA);
    const modelB = useModelDataStore((state) => state.modelB);
    const modelAExperiment = useModelAExperiment();
    const modelBExperiment = useModelBExperiment();

    const elementMapRef = useRef(new Map<number, Element>());
    const hoveredInstanceRef = useRef<HoverInstance | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, undefined>>();
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<Root | null>(null);
    const fetchControllerRef = useRef<AbortController | null>(null);
    const svgElements = useRef<SvgElementsRefType>({
      svg: null,
      gMain: null,
      gDot: null,
      circles: null,
      crosses: null,
    });

    const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

    useEffect(() => {
      hoveredInstanceRef.current = hoveredInstance;
    }, [hoveredInstance]);

    useEffect(() => {
      const refHolder = document.createElement("div");
      refHolder.setAttribute("data-ref-holder", "true");
      document.body.appendChild(refHolder);

      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "data-hovered-instance"
          ) {
            const newValue = refHolder.getAttribute("data-hovered-instance");
            if (newValue) {
              hoveredInstanceRef.current = JSON.parse(newValue);
              forceUpdate();
            }
          }
        });
      });

      observer.observe(refHolder, {
        attributes: true,
      });

      if (ref) {
        (ref as any).current = {
          ...((ref as any).current || {}),
          updateHoveredInstance: (instance: HoverInstance | null) => {
            hoveredInstanceRef.current = instance;
            refHolder.setAttribute(
              "data-hovered-instance",
              instance ? JSON.stringify(instance) : ""
            );
          },
        };
      }

      return () => {
        observer.disconnect();
        document.body.removeChild(refHolder);
      };
    }, [ref]);

    const isModelA = mode === "A";
    const id = isModelA ? modelA : modelB;
    const idExist = id !== "";

    const x = useMemo(() => {
      if (data.length === 0) {
        return d3.scaleLinear().domain([0, 1]).range([0, CONFIG.WIDTH]);
      }

      return d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d[4] as number) as [number, number])
        .nice()
        .range([0, CONFIG.WIDTH]);
    }, [data]);

    const y = useMemo(() => {
      if (data.length === 0) {
        return d3.scaleLinear().domain([0, 1]).range([CONFIG.HEIGHT, 0]);
      }

      const [min, max] = d3.extent(data, (d) => d[5] as number) as [
        number,
        number
      ];
      const padding = (max - min) * CONFIG.PADDING_RATIO;

      return d3
        .scaleLinear()
        .domain([min - padding, max + padding])
        .nice()
        .range([CONFIG.HEIGHT, 0]);
    }, [data]);

    const z = useMemo(
      () =>
        d3
          .scaleOrdinal<number, string>()
          .domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
          .range(d3.schemeTableau10),
      []
    );

    const handleZoom = useCallback(
      (transform: d3.ZoomTransform) => {
        if (!svgElements.current.gMain) return;

        svgElements.current.gMain.attr("transform", transform.toString());

        if (svgElements.current.circles) {
          svgElements.current.circles.attr("r", CONFIG.DOT_SIZE / transform.k);
        }

        if (svgElements.current.crosses) {
          svgElements.current.crosses.attr("transform", (d) => {
            const xPos = x(d[4] as number);
            const yPos = y(d[5] as number);
            const scale = 1 / transform.k;
            return `translate(${xPos},${yPos}) scale(${scale}) rotate(45)`;
          });
        }
      },
      [x, y]
    );

    const zoom = d3
      .zoom<SVGSVGElement, undefined>()
      .scaleExtent([CONFIG.MIN_ZOOM, CONFIG.MAX_ZOOM])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, undefined>) => {
        handleZoom(event.transform);
      });

    const resetZoom = () => {
      if (zoomRef.current && svgRef.current) {
        d3.select(svgRef.current)
          .transition()
          .duration(ANIMATION_DURATION)
          .call(zoomRef.current.transform as any, d3.zoomIdentity);
      }
    };

    useEffect(() => {
      const elementMap = elementMapRef.current;
      const tooltip = tooltipRef.current;
      const fetchController = fetchControllerRef.current;
      const root = rootRef.current;

      return () => {
        if (elementMap) elementMap.clear();
        if (tooltip) tooltip.remove();
        if (fetchController) fetchController.abort();
        if (root) root.unmount();
      };
    }, []);

    const showTooltip = (event: MouseEvent, content: JSX.Element) => {
      if (!containerRef.current) return;

      if (tooltipRef.current) {
        rootRef.current?.unmount();
        tooltipRef.current.remove();
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const zoom = calculateZoom();

      let xPos = (event.clientX - containerRect.left) / zoom + 10;
      let yPos = (event.clientY - containerRect.top) / zoom + 10;

      if (yPos + CONFIG.TOOLTIP_Y_SIZE > containerRect.height / zoom) {
        yPos =
          (event.clientY - containerRect.top) / zoom -
          CONFIG.TOOLTIP_Y_SIZE -
          10;
        if (yPos < 0) {
          yPos = 0;
        }
      }

      const tooltipDiv = document.createElement("div");
      tooltipDiv.style.position = "absolute";
      tooltipDiv.style.left = `${xPos}px`;
      tooltipDiv.style.top = `${yPos}px`;
      tooltipDiv.style.pointerEvents = "none";
      tooltipDiv.style.backgroundColor = "white";
      tooltipDiv.style.padding = "5px";
      tooltipDiv.style.border = "1px solid rgba(0, 0, 0, 0.25)";
      tooltipDiv.style.borderRadius = "4px";
      tooltipDiv.style.zIndex = "30";
      tooltipDiv.className = "shadow-xl";

      containerRef.current.appendChild(tooltipDiv);
      tooltipRef.current = tooltipDiv;

      rootRef.current = createRoot(tooltipDiv);
      rootRef.current.render(content);
    };

    const hideTooltip = useCallback(() => {
      if (tooltipRef.current) {
        rootRef.current?.unmount();
        tooltipRef.current.remove();
        tooltipRef.current = null;
        rootRef.current = null;
      }
    }, []);

    useEffect(() => {
      const handleClickOutside = () => {
        hideTooltip();
      };

      document.addEventListener("click", handleClickOutside);

      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    }, [hideTooltip]);

    const handleInstanceClick = useCallback(
      async (event: MouseEvent, d: (number | Prob)[]) => {
        event.stopPropagation();

        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort();
        }

        const prob = d[6] as Prob;
        const controller = new AbortController();
        fetchControllerRef.current = controller;

        try {
          if (controller.signal.aborted) return;

          const currentHoveredInstance = hoveredInstanceRef.current;

          const barChartData = isModelA
            ? {
                modelA: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(prob[idx] || 0),
                })),
                modelB: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(currentHoveredInstance?.modelBProb?.[idx] || 0),
                })),
              }
            : {
                modelA: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(currentHoveredInstance?.modelAProb?.[idx] || 0),
                })),
                modelB: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(prob[idx] || 0),
                })),
              };

          const tooltipContent =
            !modelAExperiment || !modelBExperiment ? (
              <></>
            ) : (
              <Tooltip
                imageUrl={`${process.env.PUBLIC_URL}/cifar10_images/${d[2]}.png`}
                data={d}
                barChartData={barChartData}
                forgetClass={forgetClass}
                isModelA={isModelA}
              />
            );

          showTooltip(event, tooltipContent);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          console.error("Failed to fetch tooltip data:", err);
        }
      },
      [forgetClass, isModelA, modelAExperiment, modelBExperiment]
    );

    const shouldLowerOpacity = useCallback(
      (d: (number | Prob)[]) => {
        const isForgettingData = d[0] === forgetClass;
        const isRemainData = !isForgettingData;

        if (highlight === VIEW_MODES[1].label /* Target to Forget */) {
          return isRemainData;
        } else if (
          highlight === VIEW_MODES[2].label /* Correctly Forgotten */
        ) {
          return isRemainData || (isForgettingData && d[0] === d[1]);
        } else if (highlight === VIEW_MODES[3].label /* Not Forgotten */) {
          const isForgettingSuccess = isForgettingData && d[1] !== forgetClass;
          return isRemainData || isForgettingSuccess;
        } else if (highlight === VIEW_MODES[4].label /* Overly Forgotten */) {
          const isMisclassified = isRemainData && d[0] !== d[1];
          return !isMisclassified;
        }
      },
      [forgetClass, highlight]
    );

    const handleMouseEnter = useCallback(
      (event: MouseEvent, d: (number | Prob)[]) => {
        const imgIdx = d[2] as number;
        const prob = d[6] as Prob;

        onHover(imgIdx, mode, prob);

        const element = event.currentTarget as Element;
        d3.select(element)
          .style("stroke", COLORS.BLACK)
          .style("stroke-width", CONFIG.HOVERED_STROKE_WIDTH)
          .raise();
      },
      [mode, onHover]
    );

    const handleMouseLeave = useCallback(
      (event: MouseEvent) => {
        onHover(null, mode);

        const element = event.currentTarget as Element;
        const selection = d3.select(element);
        const d = selection.datum() as (number | Prob)[];

        if (element.tagName === "circle") {
          const originalOpacity = shouldLowerOpacity(d)
            ? CONFIG.LOWERED_OPACITY
            : highlight === VIEW_MODES[4].label
            ? CONFIG.MISCLASSIFICATION_CIRCLE_OPACITY
            : CONFIG.DEFAULT_CIRCLE_OPACITY;
          selection
            .style("stroke", null)
            .style("stroke-width", null)
            .style("stroke-opacity", null)
            .style("fill-opacity", originalOpacity);
        } else {
          const colorStr = z(d[1] as number);
          const color = d3.color(colorStr);
          const originalOpacity = shouldLowerOpacity(d)
            ? CONFIG.LOWERED_OPACITY
            : CONFIG.DEFAULT_CROSS_OPACITY;
          selection
            .style(
              "stroke",
              color ? color.darker().darker().toString() : COLORS.BLACK
            )
            .style("stroke-width", CONFIG.X_STROKE_WIDTH)
            .style("stroke-opacity", originalOpacity);
        }
      },
      [highlight, mode, onHover, shouldLowerOpacity, z]
    );

    const transformedData = useMemo(() => {
      const forgetData = data.filter((d) => d[0] === forgetClass);
      const remainData = data.filter((d) => d[0] !== forgetClass);
      return { forgetData, remainData };
    }, [data, forgetClass]);

    const initializeSvg = useCallback(() => {
      if (!svgRef.current) return;

      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", [0, 0, CONFIG.WIDTH, CONFIG.HEIGHT])
        .attr("width", CONFIG.WIDTH)
        .attr("height", CONFIG.HEIGHT)
        .attr("preserveAspectRatio", "xMidYMid meet");

      const gMain = svg.append("g");

      gMain
        .append("rect")
        .attr("width", CONFIG.WIDTH)
        .attr("height", CONFIG.HEIGHT)
        .style("fill", "none")
        .style("pointer-events", "all");

      const gDot = gMain.append("g");

      svgElements.current = {
        svg,
        gMain,
        gDot,
        circles: null,
        crosses: null,
      };
    }, []);

    const updateElements = useCallback(() => {
      if (!svgElements.current.gDot) return;

      const { gDot } = svgElements.current;

      const currentTransform = svgRef.current
        ? d3.zoomTransform(svgRef.current)
        : d3.zoomIdentity;

      svgElements.current.circles = gDot
        .selectAll<SVGCircleElement, (number | Prob)[]>("circle")
        .data(transformedData.remainData)
        .join("circle")
        .attr("cx", (d) => x(d[4] as number))
        .attr("cy", (d) => y(d[5] as number))
        .attr("r", CONFIG.DOT_SIZE / currentTransform.k)
        .attr("fill", (d) => z(d[1] as number))
        .style("fill-opacity", (d) =>
          shouldLowerOpacity(d)
            ? CONFIG.LOWERED_OPACITY
            : highlight === VIEW_MODES[4].label
            ? CONFIG.MISCLASSIFICATION_CIRCLE_OPACITY
            : CONFIG.DEFAULT_CIRCLE_OPACITY
        )
        .style("cursor", "pointer")
        .style("vector-effect", "non-scaling-stroke")
        .style("pointer-events", (d) =>
          shouldLowerOpacity(d) ? "none" : "auto"
        )
        .each(function (d) {
          elementMapRef.current.set(d[2] as number, this);
        });

      svgElements.current.crosses = gDot
        .selectAll<SVGPathElement, (number | Prob)[]>("path")
        .data(transformedData.forgetData)
        .join("path")
        .attr("transform", (d) => {
          const xPos = x(d[4] as number);
          const yPos = y(d[5] as number);
          const scale = 1 / currentTransform.k;
          return `translate(${xPos},${yPos}) scale(${scale}) rotate(45)`;
        })
        .attr(
          "d",
          d3
            .symbol()
            .type(d3.symbolCross)
            .size(Math.pow(CONFIG.CROSS__SIZE / CONFIG.X_SIZE_DIVIDER, 2))
        )
        .style("fill", (d) => z(d[1] as number))
        .style("stroke", (d) => {
          const color = d3.color(z(d[1] as number));
          return color ? color.darker().darker().toString() : "black";
        })
        .style("stroke-width", CONFIG.X_STROKE_WIDTH)
        .style("fill-opacity", (d) =>
          shouldLowerOpacity(d)
            ? CONFIG.LOWERED_OPACITY
            : CONFIG.DEFAULT_CROSS_OPACITY
        )
        .style("stroke-opacity", (d) =>
          shouldLowerOpacity(d)
            ? CONFIG.LOWERED_OPACITY
            : CONFIG.DEFAULT_CROSS_OPACITY
        )
        .style("cursor", "pointer")
        .style("pointer-events", (d) =>
          shouldLowerOpacity(d) ? "none" : "auto"
        )
        .each(function (d) {
          elementMapRef.current.set(d[2] as number, this);
        });

      if (svgElements.current.circles) {
        svgElements.current.circles
          .on("click", handleInstanceClick)
          .on("mouseenter", handleMouseEnter)
          .on("mouseleave", handleMouseLeave);
      }

      if (svgElements.current.crosses) {
        svgElements.current.crosses
          .on("click", handleInstanceClick)
          .on("mouseenter", handleMouseEnter)
          .on("mouseleave", handleMouseLeave);
      }
    }, [
      handleInstanceClick,
      handleMouseEnter,
      handleMouseLeave,
      shouldLowerOpacity,
      transformedData.forgetData,
      transformedData.remainData,
      highlight,
      x,
      y,
      z,
    ]);

    useEffect(() => {
      if (!svgRef.current || data.length === 0 || !idExist) {
        if (svgRef.current) {
          d3.select(svgRef.current).selectAll("*").remove();
          svgElements.current = {
            svg: null,
            gMain: null,
            gDot: null,
            circles: null,
            crosses: null,
          };
        }
        return;
      }

      elementMapRef.current.clear();

      if (!svgElements.current.svg) {
        initializeSvg();
      }

      const svg = svgElements.current.svg;
      const currentNode = svgRef.current;

      if (!svg) return;
      svg.style("cursor", "grab");

      const handleMouseDown = () => {
        svg.style("cursor", "grabbing");
      };

      const handleMouseUp = () => {
        svg.style("cursor", "grab");
      };

      if (currentNode) {
        currentNode.addEventListener("mousedown", handleMouseDown);
        currentNode.addEventListener("mouseup", handleMouseUp, true);
        window.addEventListener("mouseup", handleMouseUp);

        zoomRef.current = zoom;
        svg.call(zoom as any);
      }

      updateElements();

      return () => {
        if (currentNode) {
          currentNode.removeEventListener("mousedown", handleMouseDown);
          currentNode.removeEventListener("mouseup", handleMouseUp, true);
          window.removeEventListener("mouseup", handleMouseUp);

          if (svgElements.current.svg) {
            svgElements.current.svg.on(".zoom", null);
          }
        }

        if (svgElements.current.circles) {
          svgElements.current.circles
            .on("click", null)
            .on("mouseenter", null)
            .on("mouseleave", null);
        }
        if (svgElements.current.crosses) {
          svgElements.current.crosses
            .on("click", null)
            .on("mouseenter", null)
            .on("mouseleave", null);
        }
      };
    }, [data.length, idExist, initializeSvg, updateElements, zoom]);

    useEffect(() => {
      setHighlight("All");
    }, [setHighlight, data]);

    useImperativeHandle(ref, () => ({
      reset: resetZoom,
      getInstancePosition: (imgIdx: number) => {
        const datum = data.find((d) => d[2] === imgIdx);
        if (datum && svgRef.current) {
          const svgElement = svgRef.current;
          const point = svgElement.createSVGPoint();

          const svgX = x(datum[4] as number);
          const svgY = y(datum[5] as number);

          const transform = d3.zoomTransform(svgElement);

          point.x = transform.applyX(svgX);
          point.y = transform.applyY(svgY);

          const ctm = svgElement.getScreenCTM();
          if (ctm) {
            const transformedPoint = point.matrixTransform(ctm);
            return {
              x: transformedPoint.x,
              y: transformedPoint.y,
            };
          }
        }
        return null;
      },
      updateHoveredInstance: (instance: HoverInstance | null) => {
        hoveredInstanceRef.current = instance;
      },
      highlightInstance: (imgIdx: number) => {
        const element = elementMapRef.current.get(imgIdx);
        if (element) {
          d3.select(element)
            .style("stroke", COLORS.BLACK)
            .style("stroke-width", CONFIG.HOVERED_STROKE_WIDTH)
            .style("stroke-opacity", 1)
            .raise();
        }
      },
      removeHighlight: (imgIdx: number) => {
        const element = elementMapRef.current.get(imgIdx);
        if (element) {
          const selection = d3.select(element);
          const d = selection.datum() as (number | Prob)[];
          const isCircle = element.tagName === "circle";

          if (isCircle) {
            const originalOpacity = shouldLowerOpacity(d)
              ? CONFIG.LOWERED_OPACITY
              : highlight === VIEW_MODES[4].label
              ? CONFIG.MISCLASSIFICATION_CIRCLE_OPACITY
              : CONFIG.DEFAULT_CIRCLE_OPACITY;
            selection
              .style("stroke", null)
              .style("stroke-width", null)
              .style("fill-opacity", originalOpacity);
          } else {
            const colorStr = z(d[1] as number);
            const color = d3.color(colorStr);
            const originalOpacity = shouldLowerOpacity(d)
              ? CONFIG.LOWERED_OPACITY
              : CONFIG.DEFAULT_CROSS_OPACITY;
            selection
              .style("stroke", color ? color.darker().toString() : COLORS.BLACK)
              .style("stroke-width", CONFIG.X_STROKE_WIDTH)
              .style("fill-opacity", originalOpacity)
              .style("stroke-opacity", originalOpacity);
          }
        }
      },
    }));

    return (
      <div className="h-[650px] flex flex-col justify-start items-center relative">
        {idExist && (
          <AiOutlineHome
            className="cursor-pointer absolute top-6 left-2 z-10"
            onClick={resetZoom}
          />
        )}
        <div className="flex items-center relative px-3.5 bg-white z-10">
          {isModelA ? (
            <span style={{ color: COLORS.EMERALD }}>
              Model A ({modelType}, {modelA})
            </span>
          ) : (
            <span style={{ color: COLORS.PURPLE }}>
              Model B ({modelType}, {modelB})
            </span>
          )}
        </div>
        <div className="w-[632px] h-[633px] flex flex-col justify-center items-center">
          <div
            ref={containerRef}
            className="w-full h-full flex justify-center items-center"
          >
            <svg ref={svgRef} className="w-full h-full" />
          </div>
        </div>
      </div>
    );
  }
);

export default React.memo(ScatterPlot);
