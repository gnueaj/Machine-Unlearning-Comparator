import { useContext, useMemo, useRef, useCallback } from "react";

import View from "../components/View";
import InformationButton from "../components/InformationButton";
import ScatterPlot from "../components/ScatterPlot";
import ConnectionLineWrapper from "../components/ConnectionLineWrapper";
import { ExperimentsContext } from "../store/experiments-context";
import { Separator } from "../components/UI/separator";
import { extractSelectedData } from "../utils/data/experiments";

export type Coordinate = { x: number; y: number };
type Position = {
  from: Coordinate | null;
  to: Coordinate | null;
};
export type Mode = "Baseline" | "Comparison";
export type HovereInstance = {
  imgIdx: number;
  source: Mode;
  baselineProb?: Prob;
  comparisonProb?: Prob;
} | null;
export type Prob = { [key: string]: number };
export type SelectedData = (number | Prob)[][];

export default function Embeddings({ height }: { height: number }) {
  const { baselineExperiment, comparisonExperiment } =
    useContext(ExperimentsContext);

  const hoveredInstanceRef = useRef<HovereInstance>(null);
  const positionRef = useRef<Position>({ from: null, to: null });
  const baselineRef = useRef<any>(null);
  const comparisonRef = useRef<any>(null);

  const extractedBaselineData = useMemo(
    () => extractSelectedData(baselineExperiment),
    [baselineExperiment]
  );
  const extractedComparisonData = useMemo(
    () => extractSelectedData(comparisonExperiment),
    [comparisonExperiment]
  );

  const baselineDataMap = useMemo(() => {
    return new Map(extractedBaselineData.map((d) => [d[4], d]));
  }, [extractedBaselineData]);
  const comparisonDataMap = useMemo(() => {
    return new Map(extractedComparisonData.map((d) => [d[4], d]));
  }, [extractedComparisonData]);

  const handleHover = useCallback(
    (imgIdxOrNull: number | null, source?: Mode, prob?: Prob) => {
      if (imgIdxOrNull === null || !source) {
        if (hoveredInstanceRef.current?.imgIdx !== null) {
          const prevImgIdx = hoveredInstanceRef.current?.imgIdx;
          baselineRef.current?.removeHighlight(prevImgIdx);
          comparisonRef.current?.removeHighlight(prevImgIdx);
        }

        positionRef.current = { from: null, to: null };
        hoveredInstanceRef.current = null;
        baselineRef.current?.updateHoveredInstance(null);
        comparisonRef.current?.updateHoveredInstance(null);
        return;
      }

      const isBaseline = source === "Baseline";
      const oppositeInstance = isBaseline
        ? comparisonDataMap.get(imgIdxOrNull)
        : baselineDataMap.get(imgIdxOrNull);

      if (!oppositeInstance) return;

      const oppositeProb = oppositeInstance[5] as Prob;

      hoveredInstanceRef.current = {
        imgIdx: imgIdxOrNull,
        source,
        baselineProb: isBaseline ? prob : oppositeProb,
        comparisonProb: !isBaseline ? prob : oppositeProb,
      };

      baselineRef.current?.updateHoveredInstance(hoveredInstanceRef.current);
      comparisonRef.current?.updateHoveredInstance(hoveredInstanceRef.current);

      if (isBaseline) {
        comparisonRef.current?.highlightInstance(imgIdxOrNull);
      } else {
        baselineRef.current?.highlightInstance(imgIdxOrNull);
      }

      const targetRef = isBaseline ? comparisonRef : baselineRef;
      const currentRef = isBaseline ? baselineRef : comparisonRef;

      if (targetRef.current && currentRef.current) {
        const fromPos = currentRef.current.getInstancePosition(imgIdxOrNull);
        const toPos = targetRef.current.getInstancePosition(imgIdxOrNull);

        positionRef.current = {
          from: { ...fromPos },
          to: { ...toPos },
        };
      }
    },
    [baselineDataMap, comparisonDataMap]
  );

  return (
    <View
      height={height}
      className="w-full flex items-center rounded-[6px] px-1.5 rounded-tr-none"
    >
      <ConnectionLineWrapper positionRef={positionRef} />
      <InformationButton />
      <ScatterPlot
        mode="Baseline"
        height={height}
        data={extractedBaselineData}
        onHover={handleHover}
        hoveredInstance={hoveredInstanceRef.current}
        ref={baselineRef}
      />
      <Separator orientation="vertical" className="h-[612px] w-[1px] mx-1.5" />
      <ScatterPlot
        mode="Comparison"
        height={height}
        data={extractedComparisonData}
        onHover={handleHover}
        hoveredInstance={hoveredInstanceRef.current}
        ref={comparisonRef}
      />
    </View>
  );
}
