import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";

import AttackPlot from "./AttackPlot";
import AttackSuccessFailure from "./AttackSuccessFailure";
import Tooltip from "./Tooltip";
import { useForgetClassStore } from "../../stores/forgetClassStore";
import { useAttackStateStore } from "../../stores/attackStore";
import { THRESHOLD_STRATEGIES } from "../../constants/privacyAttack";
import { Prob } from "../../types/embeddings";
import { calculateZoom } from "../../utils/util";
import { useModelDataStore } from "../../stores/modelDataStore";
import { ENTROPY, UNLEARN, RETRAIN, CONFIDENCE } from "../../constants/common";
import { useThresholdStore } from "../../stores/thresholdStore";
import {
  AttackResult,
  AttackResults,
  AttackData,
  Experiment,
} from "../../types/data";
import {
  Bin,
  Data,
  CategoryType,
  ImageWithLabel,
  Image,
  AttackResultWithType,
} from "../../types/attack";
import {
  useModelAExperiment,
  useModelBExperiment,
} from "../../stores/experimentsStore";

const CONFIG = {
  TOOLTIP_WIDTH: 450,
  TOOLTIP_HEIGHT: 274,
} as const;

interface Props {
  mode: "A" | "B";
  retrainPoints: (number | Prob)[][];
  modelPoints: (number | Prob)[][];
  retrainAttackData: AttackData;
}

export default function AttackAnalytics({
  mode,
  retrainPoints,
  modelPoints,
  retrainAttackData,
}: Props) {
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const modelA = useModelDataStore((state) => state.modelA);
  const modelB = useModelDataStore((state) => state.modelB);
  const modelAExperiment = useModelAExperiment();
  const modelBExperiment = useModelBExperiment();
  const { strategyThresholds, initializeThresholds, setStrategyThresholds } =
    useThresholdStore();
  const { metric, strategy, worstCaseModel, setMetric, setStrategy } =
    useAttackStateStore();

  const [thresholdValue, setThresholdValue] = useState(1.25);
  const [attackScore, setAttackScore] = useState(0);
  const [data, setData] = useState<Data>(null);
  const [images, setImages] = useState<Image[]>();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [dataMetric, setDataMetric] = useState(metric);

  const computedThresholdData = data?.lineChartData.find(
    (d) => Math.abs(d.threshold - thresholdValue) < 0.001
  );

  const isModelA = mode === "A";
  const isMetricEntropy = metric === ENTROPY;
  const isAboveThresholdUnlearn = computedThresholdData?.type === UNLEARN;

  const prevMetricRef = useRef(metric);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<any>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const prevModelA = useRef(modelA);
  const prevModelB = useRef(modelB);
  const containerRef = useRef<HTMLDivElement>(null);

  const imageMap = useMemo(() => {
    if (!images) return new Map<number, Image>();
    const map = new Map<number, Image>();
    images.forEach((img) => map.set(img.index, img));
    return map;
  }, [images]);

  const handleThresholdLineDrag = (newThreshold: number) => {
    if (strategy === THRESHOLD_STRATEGIES[0].strategy) {
      setThresholdValue(newThreshold);
    }
  };

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

    if (yPos + CONFIG.TOOLTIP_HEIGHT > containerRect.height / zoom) {
      yPos =
        (event.clientY - containerRect.top) / zoom - CONFIG.TOOLTIP_HEIGHT - 10;
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

  const handleElementClick = useCallback(
    async (
      event: React.MouseEvent,
      elementData: Bin & { type: CategoryType }
    ) => {
      event.stopPropagation();

      if (
        !containerRef.current ||
        retrainPoints.length === 0 ||
        modelPoints.length === 0
      ) {
        return;
      }

      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      fetchControllerRef.current = controller;

      try {
        if (controller.signal.aborted) return;

        const retrainedPoint = retrainPoints.find((point) => {
          return point[2] === elementData.img_idx;
        }) as (number | Prob)[];
        const unlearnedPoint = modelPoints.find((point) => {
          return point[2] === elementData.img_idx;
        }) as (number | Prob)[];

        const retrainProb = retrainedPoint![6] as Prob;
        const unlearnProb = unlearnedPoint![6] as Prob;

        const barChartData = {
          retrainedModelData: Array.from({ length: 10 }, (_, idx) => ({
            class: idx,
            value: Number(retrainProb[idx] || 0),
          })),
          modelData: Array.from({ length: 10 }, (_, idx) => ({
            class: idx,
            value: Number(unlearnProb[idx] || 0),
          })),
        };

        const tooltipContent = (
          <Tooltip
            width={CONFIG.TOOLTIP_WIDTH}
            height={CONFIG.TOOLTIP_HEIGHT}
            imageUrl={`${process.env.PUBLIC_URL}/cifar10_images/${elementData.img_idx}.png`}
            data={unlearnedPoint}
            barChartData={barChartData}
            isModelA={isModelA}
            clickedType={elementData.type}
          />
        );

        showTooltip((event as any).nativeEvent || event, tooltipContent);
      } catch (error) {
        console.error(`Failed to fetch tooltip data: ${error}`);
      }
    },
    [isModelA, retrainPoints, modelPoints]
  );

  useEffect(() => {
    initializeThresholds(isMetricEntropy);
  }, [isMetricEntropy, initializeThresholds]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch(
          `${process.env.PUBLIC_URL}/images_metadata.json`
        );
        const data = await res.json();
        const images: ImageWithLabel[] = data.images;
        const filteredImages = images.filter(
          (img) => img.label === forgetClass
        );
        const finalImages: Image[] = filteredImages.map(
          ({ label, ...rest }) => rest
        );
        setImages(finalImages);
      } catch (error) {
        console.error(`Error fetching subset images: ${error}`);
      }
    };
    fetchImages();
  }, [forgetClass]);

  const getLineChartData = useCallback(
    (experiment: Experiment) => {
      if (!experiment) return [];

      const unlearnKey = `${metric}_above_unlearn` as keyof AttackResults;
      const retrainKey = `${metric}_above_retrain` as keyof AttackResults;
      const unlearnData = experiment.attack.results[unlearnKey];
      const retrainData = experiment.attack.results[retrainKey];

      if (
        !unlearnData ||
        !retrainData ||
        unlearnData.length !== retrainData.length
      )
        return [];

      const lineChartData: AttackResultWithType[] = [];
      for (let i = 0; i < unlearnData.length; i++) {
        if (unlearnData[i].attack_score > retrainData[i].attack_score) {
          lineChartData.push({ ...unlearnData[i], type: UNLEARN });
        } else {
          lineChartData.push({ ...retrainData[i], type: CONFIDENCE });
        }
      }

      return lineChartData;
    },
    [metric]
  );

  useEffect(() => {
    const getAttackData = async () => {
      const experiment = isModelA ? modelAExperiment : modelBExperiment;

      if (!retrainAttackData || !experiment) {
        setData({
          retrainData: [],
          unlearnData: [],
          lineChartData: [],
        });
        return;
      }

      const retrainAttackValues = retrainAttackData.values;
      let retrainExperimentValues: Bin[] = [];
      retrainAttackValues.forEach((item) => {
        retrainExperimentValues.push({
          img_idx: item.img,
          value: isMetricEntropy ? item.entropy : item.confidence,
        });
      });

      let modelExperimentValues: Bin[] = [];
      const modelExperimentAttackValues = experiment.attack.values;
      modelExperimentAttackValues.forEach((item) => {
        modelExperimentValues.push({
          img_idx: item.img,
          value: isMetricEntropy ? item.entropy : item.confidence,
        });
      });

      const lineChartData = getLineChartData(
        isModelA ? modelAExperiment : modelBExperiment
      );

      if (prevMetricRef.current !== metric) {
        if (!strategy.startsWith("BEST_ATTACK")) {
          setThresholdValue(isMetricEntropy ? 1.25 : 3.75);
        }
        prevMetricRef.current = metric;
      }

      setData({
        retrainData: retrainExperimentValues,
        unlearnData: modelExperimentValues,
        lineChartData,
      });
      setDataMetric(metric);
    };
    getAttackData();
  }, [
    getLineChartData,
    isMetricEntropy,
    isModelA,
    metric,
    modelAExperiment,
    modelBExperiment,
    retrainAttackData,
    strategy,
  ]);

  const findMaxAttackData = (lineData: AttackResult[]) => {
    return lineData.reduce(
      (prev, curr) => (curr.attack_score > prev.attack_score ? curr : prev),
      lineData[0]
    );
  };

  useEffect(() => {
    if (!data) return;

    // 1. Custom
    const customThreshold = isMetricEntropy ? 1.25 : 3.75;

    // 2. Max Attack Score
    let maxAttackScoreThreshold = thresholdValue;
    if (data.lineChartData.length > 0) {
      const maxAttackData = findMaxAttackData(data.lineChartData);
      maxAttackScoreThreshold = maxAttackData.threshold;
    }

    // 3. Max Success Rate
    let maxSuccessRateThreshold = thresholdValue;
    const allValues = [...data.retrainData, ...data.unlearnData];
    if (allValues.length > 0) {
      const step = isMetricEntropy ? 0.05 : 0.25;
      const candidateSet = new Set<number>();
      allValues.forEach((datum) => {
        const base = Math.floor(datum.value / step) * step;
        candidateSet.add(base);
        candidateSet.add(base + step);
      });
      const candidates = Array.from(candidateSet).sort((a, b) => a - b);

      let bestCandidate = thresholdValue;
      let bestSuccessCount = -Infinity;
      candidates.forEach((candidate) => {
        const successCount = isAboveThresholdUnlearn
          ? data.retrainData.filter((datum) => datum.value <= candidate)
              .length +
            data.unlearnData.filter((datum) => datum.value >= candidate).length
          : data.retrainData.filter((datum) => datum.value >= candidate)
              .length +
            data.unlearnData.filter((datum) => datum.value <= candidate).length;
        if (successCount > bestSuccessCount) {
          bestSuccessCount = successCount;
          bestCandidate = candidate;
        }
      });
      maxSuccessRateThreshold = bestCandidate;
    }

    // 4. Common Threshold
    let commonThreshold = thresholdValue;

    const modelALineChartData = isModelA
      ? data.lineChartData
      : getLineChartData(modelAExperiment);
    const modelBLineChartData = !isModelA
      ? data.lineChartData
      : getLineChartData(modelBExperiment);

    const combinedLineChartData = [
      ...modelALineChartData,
      ...modelBLineChartData,
    ];

    if (combinedLineChartData.length > 0) {
      const thresholdGroups: { [commonThresholdKey: number]: number } = {};
      combinedLineChartData.forEach((item) => {
        thresholdGroups[item.threshold] =
          (thresholdGroups[item.threshold] || 0) + item.attack_score;
      });
      const bestThresholdEntry = Object.entries(thresholdGroups).reduce(
        (best, [t, sum]) => {
          const thresholdCandidate = parseFloat(t);
          return sum > best.sum ? { th: thresholdCandidate, sum } : best;
        },
        { th: thresholdValue, sum: -Infinity }
      );
      commonThreshold = bestThresholdEntry.th;
    }

    const newThresholds = [
      customThreshold,
      maxAttackScoreThreshold,
      maxSuccessRateThreshold,
      commonThreshold,
    ];

    const modeKey = isModelA ? "A" : "B";
    const currentThresholds = strategyThresholds[modeKey];
    const isEqual =
      currentThresholds &&
      currentThresholds.length === newThresholds.length &&
      currentThresholds.every((v, i) => v === newThresholds[i]);
    if (isEqual) return;

    setStrategyThresholds(modeKey, newThresholds);
  }, [
    data,
    getLineChartData,
    isAboveThresholdUnlearn,
    isMetricEntropy,
    isModelA,
    modelAExperiment,
    modelBExperiment,
    setStrategyThresholds,
    strategyThresholds,
    thresholdValue,
  ]);

  useEffect(() => {
    const handleClickOutside = () => {
      hideTooltip();
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [hideTooltip]);

  useEffect(() => {
    if (prevModelA.current !== modelA || prevModelB.current !== modelB) {
      setMetric(ENTROPY);
      setStrategy(THRESHOLD_STRATEGIES[0].strategy);
      prevModelA.current = modelA;
      prevModelB.current = modelB;
    }
  }, [modelA, modelB, setMetric, setStrategy]);

  useEffect(() => {
    if (strategy === THRESHOLD_STRATEGIES[0].strategy) {
      setThresholdValue(isMetricEntropy ? 1.25 : 3.75);
    }
  }, [isMetricEntropy, strategy]);

  useEffect(() => {
    if (strategy === "BEST_ATTACK") {
      const isModelAWorstCase = worstCaseModel === "A";
      if (
        (isModelAWorstCase && isModelA) ||
        (!isModelAWorstCase && !isModelA)
      ) {
        let bestResult = {
          metric,
          threshold: thresholdValue,
          attack_score: 0,
        };
        const metrics = [ENTROPY, CONFIDENCE];
        const directions = [UNLEARN, RETRAIN];
        metrics.forEach((m) => {
          directions.forEach((d) => {
            const key = `${m}_above_${d}` as keyof AttackResults;
            const experimentAttackData = isModelAWorstCase
              ? modelAExperiment
              : modelBExperiment;
            const lineData = experimentAttackData
              ? experimentAttackData.attack.results[key] || []
              : [];
            if (lineData.length > 0) {
              const maxAttackData = findMaxAttackData(lineData);
              if (maxAttackData.attack_score > bestResult.attack_score) {
                bestResult = {
                  metric: m,
                  threshold: maxAttackData.threshold,
                  attack_score: maxAttackData.attack_score,
                };
              }
            }
          });
        });
        setMetric(bestResult.metric);
        setThresholdValue(bestResult.threshold);
        setStrategy(THRESHOLD_STRATEGIES[1].strategy);
      }
    } else if (strategy !== THRESHOLD_STRATEGIES[0].strategy) {
      const modeKey = isModelA ? "A" : "B";
      let index = 1;
      if (strategy === THRESHOLD_STRATEGIES[1].strategy) {
        index = 1;
      } else if (strategy === THRESHOLD_STRATEGIES[2].strategy) {
        index = 2;
      } else if (strategy === THRESHOLD_STRATEGIES[3].strategy) {
        index = 3;
      }
      const newThreshold = strategyThresholds[modeKey][index];
      if (newThreshold !== thresholdValue) {
        setThresholdValue(newThreshold);
      }
    }
  }, [
    isModelA,
    metric,
    modelAExperiment,
    modelBExperiment,
    setMetric,
    setStrategy,
    strategy,
    strategyThresholds,
    thresholdValue,
    worstCaseModel,
  ]);

  return (
    <div className="w-[635px] h-full relative flex flex-col" ref={containerRef}>
      {data && dataMetric === metric && (
        <>
          <AttackPlot
            mode={mode}
            thresholdValue={thresholdValue}
            hoveredId={hoveredId}
            data={data}
            onThresholdLineDrag={handleThresholdLineDrag}
            onUpdateAttackScore={setAttackScore}
            setHoveredId={setHoveredId}
            onElementClick={handleElementClick}
          />
          <AttackSuccessFailure
            mode={mode}
            thresholdValue={thresholdValue}
            hoveredId={hoveredId}
            data={data}
            imageMap={imageMap}
            attackScore={attackScore}
            setHoveredId={setHoveredId}
            onElementClick={handleElementClick}
          />
        </>
      )}
    </div>
  );
}
