import React, {
  useState,
  useEffect,
  useContext,
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

import EmbeddingTooltip from "./EmbeddingTooltip";
import { calculateZoom } from "../app/App";
import { API_URL } from "../constants/common";
import { ForgetClassContext } from "../store/forget-class-context";
import { BaselineComparisonContext } from "../store/baseline-comparison-context";
import { Mode, SelectedData, HovereInstance, Prob } from "../views/Embeddings";
import {
  BaselineNeuralNetworkIcon,
  ComparisonNeuralNetworkIcon,
} from "./UI/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./UI/select";

const VIEW_MODES: ViewModeType[] = [
  "All Instances",
  "Forgetting Target",
  "Forgetting Failed",
];
const CONFIG = {
  width: 630,
  height: 630,
  dotSize: 4,
  minZoom: 0.6,
  maxZoom: 32,
  XSizeDivider: 0.4,
  XStrokeWidth: 1,
  crossSize: 4,
  loweredOpacity: 0.1,
  hoveredStrokeWidth: 2,
  paddingRatio: 0.01,
  tooltipXSize: 450,
  tooltipYSize: 274,
  defaultCrossOpacity: 0.85,
  defaultCircleOpacity: 0.6,
} as const;
const BLACK = "black";
const ZOOM_RESET_DURATION = 500;
const UNLEARNING_TARGET = "Forgetting Target";
const UNLEARNING_FAILED = "Forgetting Failed";

export type ViewModeType =
  | "All Instances"
  | "Forgetting Target"
  | "Forgetting Failed";

interface Props {
  mode: Mode;
  height: number;
  data: SelectedData;
  onHover: (imgIdxOrNull: number | null, source?: Mode, prob?: Prob) => void;
  hoveredInstance: HovereInstance | null;
}

const ScatterPlot = forwardRef(
  ({ mode, height, data, onHover, hoveredInstance }: Props, ref) => {
    const { baseline, comparison } = useContext(BaselineComparisonContext);
    const { forgetClass } = useContext(ForgetClassContext);

    const [viewMode, setViewMode] = useState<ViewModeType>(VIEW_MODES[0]);

    const elementMapRef = useRef(new Map<number, Element>());
    const hoveredInstanceRef = useRef<HovereInstance | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, undefined>>();
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const rootRef = useRef<Root | null>(null);
    const fetchControllerRef = useRef<AbortController | null>(null);
    const svgElements = useRef<{
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
      gMain: d3.Selection<SVGGElement, unknown, null, undefined> | null;
      gDot: d3.Selection<SVGGElement, unknown, null, undefined> | null;
      circles: d3.Selection<
        SVGCircleElement,
        (number | Prob)[],
        SVGGElement,
        undefined
      > | null;
      crosses: d3.Selection<
        SVGPathElement,
        (number | Prob)[],
        SVGGElement,
        undefined
      > | null;
    }>({
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
          updateHoveredInstance: (instance: HovereInstance | null) => {
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

    const isBaseline = mode === "Baseline";
    const id = isBaseline ? baseline : comparison;
    const idExist = id !== "";

    const x = useMemo(() => {
      if (data.length === 0) {
        return d3.scaleLinear().domain([0, 1]).range([0, CONFIG.width]);
      }

      return d3
        .scaleLinear()
        .domain(d3.extent(data, (d) => d[0] as number) as [number, number])
        .nice()
        .range([0, CONFIG.width]);
    }, [data]);

    const y = useMemo(() => {
      if (data.length === 0) {
        return d3.scaleLinear().domain([0, 1]).range([CONFIG.height, 0]);
      }

      const [min, max] = d3.extent(data, (d) => d[1] as number) as [
        number,
        number
      ];
      const padding = (max - min) * CONFIG.paddingRatio;

      return d3
        .scaleLinear()
        .domain([min - padding, max + padding])
        .nice()
        .range([CONFIG.height, 0]);
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
          svgElements.current.circles.attr("r", CONFIG.dotSize / transform.k);
        }

        if (svgElements.current.crosses) {
          svgElements.current.crosses.attr("transform", (d) => {
            const xPos = x(d[0] as number);
            const yPos = y(d[1] as number);
            const scale = 1 / transform.k;
            return `translate(${xPos},${yPos}) scale(${scale}) rotate(45)`;
          });
        }
      },
      [x, y]
    );

    const zoom = d3
      .zoom<SVGSVGElement, undefined>()
      .scaleExtent([CONFIG.minZoom, CONFIG.maxZoom])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, undefined>) => {
        handleZoom(event.transform);
      });

    useEffect(() => {
      if (!svgElements.current.svg) return;

      const svg = svgElements.current.svg;
      svg.style("cursor", "grab");

      const handleMouseDown = () => {
        svg.style("cursor", "grabbing");
      };

      const handleMouseUp = () => {
        svg.style("cursor", "grab");
      };

      const node = svg.node();
      if (node) {
        node.addEventListener("mousedown", handleMouseDown);
        node.addEventListener("mouseup", handleMouseUp, true);
        window.addEventListener("mouseup", handleMouseUp);

        zoomRef.current = zoom;
        svg.call(zoom as any);
      }

      return () => {
        if (node) {
          node.removeEventListener("mousedown", handleMouseDown);
          node.removeEventListener("mouseup", handleMouseUp, true);
          window.removeEventListener("mouseup", handleMouseUp);
          svg.on(".zoom", null);
        }
      };
    }, [zoom]);

    const resetZoom = () => {
      if (zoomRef.current && svgRef.current) {
        d3.select(svgRef.current)
          .transition()
          .duration(ZOOM_RESET_DURATION)
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

      if (yPos + CONFIG.tooltipYSize > containerRect.height / zoom) {
        yPos =
          (event.clientY - containerRect.top) / zoom - CONFIG.tooltipYSize - 10;
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

        const imgIdx = d[4] as number;
        onHover(imgIdx, mode, d[5] as Prob);

        if (fetchControllerRef.current) {
          fetchControllerRef.current.abort();
        }

        const controller = new AbortController();
        fetchControllerRef.current = controller;

        try {
          const response = await fetch(`${API_URL}/image/cifar10/${d[4]}`, {
            signal: controller.signal,
          });

          if (!response.ok) throw new Error("Failed to fetch image");

          const blob = await response.blob();
          if (controller.signal.aborted) return;

          const prob = d[5] as Prob;
          const imageUrl = URL.createObjectURL(blob);

          const currentHoveredInstance = hoveredInstanceRef.current;

          const barChartData = isBaseline
            ? {
                baseline: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(prob[idx] || 0),
                })),
                comparison: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(
                    currentHoveredInstance?.comparisonProb?.[idx] || 0
                  ),
                })),
              }
            : {
                baseline: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(
                    currentHoveredInstance?.baselineProb?.[idx] || 0
                  ),
                })),
                comparison: Array.from({ length: 10 }, (_, idx) => ({
                  class: idx,
                  value: Number(prob[idx] || 0),
                })),
              };

          const tooltipContent = (
            <EmbeddingTooltip
              width={CONFIG.tooltipXSize}
              height={CONFIG.tooltipYSize}
              imageUrl={imageUrl}
              data={d}
              barChartData={barChartData}
              forgetClass={forgetClass!}
              isBaseline={isBaseline}
            />
          );

          showTooltip(event, tooltipContent);

          return () => {
            URL.revokeObjectURL(imageUrl);
          };
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
          console.error("Failed to fetch tooltip data:", err);
        }
      },
      [forgetClass, isBaseline, mode, onHover]
    );

    const handleMouseEnter = useCallback(
      (event: MouseEvent, d: (number | Prob)[]) => {
        onHover(d[4] as number, mode, d[5] as Prob);

        const element = event.currentTarget as Element;
        d3.select(element)
          .attr("stroke", BLACK)
          .attr("stroke-width", CONFIG.hoveredStrokeWidth)
          .raise();
      },
      [mode, onHover]
    );

    const shouldLowerOpacity = useCallback(
      (d: (number | Prob)[]) => {
        const dataCondition =
          d[2] !== forgetClass && viewMode === UNLEARNING_TARGET;
        const classCondition =
          d[3] !== forgetClass && viewMode === UNLEARNING_FAILED;
        return dataCondition || classCondition;
      },
      [forgetClass, viewMode]
    );

    const handleMouseLeave = useCallback(
      (event: MouseEvent) => {
        onHover(null, mode);

        const element = event.currentTarget as Element;
        const selection = d3.select(element);
        const d = selection.datum() as (number | Prob)[];

        if (element.tagName === "circle") {
          selection
            .attr("stroke", null)
            .attr("stroke-width", null)
            .style(
              "opacity",
              shouldLowerOpacity(d)
                ? CONFIG.loweredOpacity
                : CONFIG.defaultCircleOpacity
            );
        } else {
          const colorStr = z(d[3] as number);
          const color = d3.color(colorStr);
          selection
            .attr("stroke", color ? color.darker().toString() : BLACK)
            .attr("stroke-width", CONFIG.XStrokeWidth)
            .style(
              "opacity",
              shouldLowerOpacity(d)
                ? CONFIG.loweredOpacity
                : CONFIG.defaultCrossOpacity
            );
        }
      },
      [mode, onHover, shouldLowerOpacity, z]
    );

    const transformedData = useMemo(() => {
      const forgetClassData = data.filter((d) => d[2] === forgetClass);
      const normalData = data.filter((d) => d[2] !== forgetClass);
      return { forgetClassData, normalData };
    }, [data, forgetClass]);

    const initializeSvg = useCallback(() => {
      if (!svgRef.current) return;

      const svg = d3
        .select(svgRef.current)
        .attr("viewBox", [0, 0, CONFIG.width, CONFIG.height])
        .attr("width", CONFIG.width)
        .attr("height", CONFIG.height)
        .attr("preserveAspectRatio", "xMidYMid meet");

      const gMain = svg.append("g");

      gMain
        .append("rect")
        .attr("width", CONFIG.width)
        .attr("height", CONFIG.height)
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

      svgElements.current.circles = gDot
        .selectAll<SVGCircleElement, (number | Prob)[]>("circle")
        .data(transformedData.normalData)
        .join("circle")
        .attr("cx", (d) => x(d[0] as number))
        .attr("cy", (d) => y(d[1] as number))
        .attr("r", CONFIG.dotSize)
        .attr("fill", (d) => z(d[3] as number))
        .style("cursor", "pointer")
        .style("opacity", CONFIG.defaultCircleOpacity)
        .style("vector-effect", "non-scaling-stroke")
        .each(function (d) {
          elementMapRef.current.set(d[4] as number, this);
        });

      svgElements.current.crosses = gDot
        .selectAll<SVGPathElement, (number | Prob)[]>("path")
        .data(transformedData.forgetClassData)
        .join("path")
        .attr(
          "transform",
          (d) =>
            `translate(${x(d[0] as number)},${y(d[1] as number)}) rotate(45)`
        )
        .attr(
          "d",
          d3
            .symbol()
            .type(d3.symbolCross)
            .size(Math.pow(CONFIG.crossSize / CONFIG.XSizeDivider, 2))
        )
        .attr("fill", (d) => z(d[3] as number))
        .attr("stroke", (d) => {
          const color = d3.color(z(d[3] as number));
          return color ? color.darker().darker().toString() : "black";
        })
        .attr("stroke-width", CONFIG.XStrokeWidth)
        .style("cursor", "pointer")
        .style("opacity", CONFIG.defaultCrossOpacity)
        .each(function (d) {
          elementMapRef.current.set(d[4] as number, this);
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
      transformedData,
      x,
      y,
      z,
      handleInstanceClick,
      handleMouseEnter,
      handleMouseLeave,
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

      updateElements();

      return () => {
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
    }, [data.length, idExist, initializeSvg, updateElements]);

    useEffect(() => {
      if (!svgElements.current.circles && !svgElements.current.crosses) return;

      const updateOpacity = (selection: d3.Selection<any, any, any, any>) => {
        selection
          .style("opacity", (d: any) =>
            shouldLowerOpacity(d)
              ? CONFIG.loweredOpacity
              : selection.node()?.tagName === "circle"
              ? CONFIG.defaultCircleOpacity
              : CONFIG.defaultCrossOpacity
          )
          .style("pointer-events", (d: any) =>
            shouldLowerOpacity(d) ? "none" : "auto"
          );
      };

      if (svgElements.current.circles) {
        updateOpacity(svgElements.current.circles);
      }
      if (svgElements.current.crosses) {
        updateOpacity(svgElements.current.crosses);
      }
    }, [shouldLowerOpacity]);

    useEffect(() => {
      if (!hoveredInstance) return;

      const currentElementMap = elementMapRef.current;

      if (hoveredInstance.source !== mode) {
        const element = currentElementMap.get(hoveredInstance.imgIdx);
        if (element) {
          const selection = d3.select(element);
          selection
            .attr("stroke", BLACK)
            .attr("stroke-width", CONFIG.hoveredStrokeWidth);
        }
      }

      return () => {
        if (hoveredInstance.source !== mode) {
          const element = currentElementMap.get(hoveredInstance.imgIdx);
          if (element) {
            const selection = d3.select(element);
            if (element.tagName === "circle") {
              selection
                .attr("stroke", null)
                .attr("stroke-width", null)
                .style("opacity", CONFIG.defaultCircleOpacity);
            } else {
              const d = selection.datum() as (number | Prob)[];
              const colorStr = z(d[3] as number);
              const color = d3.color(colorStr);
              selection
                .attr("stroke", color ? color.darker().toString() : BLACK)
                .attr("stroke-width", CONFIG.XStrokeWidth)
                .style("opacity", CONFIG.defaultCrossOpacity);
            }
          }
        }
      };
    }, [hoveredInstance, mode, z]);

    useEffect(() => {
      setViewMode(VIEW_MODES[0]);
    }, [data]);

    useImperativeHandle(ref, () => ({
      reset: resetZoom,
      getInstancePosition: (imgIdx: number) => {
        const datum = data.find((d) => d[4] === imgIdx);
        if (datum && svgRef.current) {
          const svgElement = svgRef.current;
          const point = svgElement.createSVGPoint();

          const svgX = x(datum[0] as number);
          const svgY = y(datum[1] as number);

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
      updateHoveredInstance: (instance: HovereInstance | null) => {
        hoveredInstanceRef.current = instance;
      },
      highlightInstance: (imgIdx: number) => {
        const element = elementMapRef.current.get(imgIdx);
        if (element) {
          const selection = d3.select(element);
          const d = selection.datum() as (number | Prob)[];

          if (!shouldLowerOpacity(d)) {
            selection
              .attr("stroke", BLACK)
              .attr("stroke-width", CONFIG.hoveredStrokeWidth)
              .raise();
          }
        }
      },
      removeHighlight: (imgIdx: number) => {
        const element = elementMapRef.current.get(imgIdx);
        if (element) {
          const selection = d3.select(element);
          const d = selection.datum() as (number | Prob)[];
          const isCircle = element.tagName === "circle";
          const opacityValue = shouldLowerOpacity(d)
            ? CONFIG.loweredOpacity
            : isCircle
            ? CONFIG.defaultCircleOpacity
            : CONFIG.defaultCrossOpacity;

          if (isCircle) {
            selection
              .attr("stroke", null)
              .attr("stroke-width", null)
              .style("opacity", opacityValue);
          } else {
            const colorStr = z(d[3] as number);
            const color = d3.color(colorStr);
            selection
              .attr("stroke", color ? color.darker().toString() : BLACK)
              .attr("stroke-width", CONFIG.XStrokeWidth)
              .style("opacity", opacityValue);
          }
        }
      },
    }));

    return (
      <div
        style={{ height }}
        className="flex flex-col justify-start items-center relative"
      >
        {idExist && (
          <div>
            <AiOutlineHome
              className="mr-1 cursor-pointer absolute top-2 left-0 z-10"
              onClick={resetZoom}
            />
            <div className="flex items-center absolute z-10 right-0 top-6">
              <span className="mr-1.5 text-sm">View:</span>
              <ViewModeSelect viewMode={viewMode} setViewMode={setViewMode} />
            </div>
          </div>
        )}
        <div className="text-[15px] mt-1 flex items-center">
          {isBaseline ? (
            <BaselineNeuralNetworkIcon className="mr-1" />
          ) : (
            <ComparisonNeuralNetworkIcon className="mr-1" />
          )}
          <span>
            {mode} {idExist ? `(${id})` : ""}
          </span>
        </div>
        <div className="w-[638px] h-[607px] flex flex-col justify-center items-center">
          <div
            ref={containerRef}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
    );
  }
);

export default React.memo(ScatterPlot);

interface ViewModeSelectorProps {
  viewMode: ViewModeType;
  setViewMode: (val: ViewModeType) => void;
}

const ViewModeSelect = React.memo(
  ({ viewMode, setViewMode }: ViewModeSelectorProps) => {
    return (
      <Select
        value={viewMode}
        defaultValue={VIEW_MODES[0]}
        onValueChange={(value: ViewModeType) => setViewMode(value)}
      >
        <SelectTrigger className="w-36 h-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIEW_MODES.map((viewMode, idx) => (
            <SelectItem key={idx} value={viewMode}>
              {viewMode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);
