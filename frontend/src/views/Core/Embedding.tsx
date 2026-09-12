import { useState, useRef, useCallback, useMemo } from "react";

import ScatterPlot from "../../components/Core/Embeddings/ScatterPlot";
import ConnectionLineWrapper from "../../components/Core/Embeddings/ConnectionLineWrapper";
import Legend from "../../components/Core/Embeddings/Legend";
import { HoverInstance, Position, Prob } from "../../types/embeddings";
import { Separator } from "../../components/UI/separator";
import {
  useModelAExperiment,
  useModelBExperiment,
} from "../../hooks/useModelExperiment";

interface Props {
  modelAPoints: (number | Prob)[][];
  modelBPoints: (number | Prob)[][];
}

export default function Embeddings({ modelAPoints, modelBPoints }: Props) {
  const modelAExperiment = useModelAExperiment();
  const modelBExperiment = useModelBExperiment();

  const [highlight, setHighlight] = useState("All");

  const hoveredInstanceRef = useRef<HoverInstance>(null);
  const positionRef = useRef<Position>({ from: null, to: null });
  const modelARef = useRef<any>(null);
  const modelBRef = useRef<any>(null);

  const modelADataMap = useMemo(() => {
    return new Map(modelAPoints.map((point) => [point[2], point]));
  }, [modelAPoints]);
  const modelBDataMap = useMemo(() => {
    return new Map(modelBPoints.map((point) => [point[2], point]));
  }, [modelBPoints]);

  const handleHover = useCallback(
    (imgIdxOrNull: number | null, source?: "A" | "B", prob?: Prob) => {
      if (imgIdxOrNull === null || !source) {
        if (hoveredInstanceRef.current?.imgIdx !== null) {
          const prevImgIdx = hoveredInstanceRef.current?.imgIdx;
          modelARef.current?.removeHighlight(prevImgIdx);
          modelBRef.current?.removeHighlight(prevImgIdx);
        }

        positionRef.current = { from: null, to: null };
        hoveredInstanceRef.current = null;
        modelARef.current?.updateHoveredInstance(null);
        modelBRef.current?.updateHoveredInstance(null);
        return;
      }

      const isModelA = source === "A";
      const oppositeInstance = isModelA
        ? modelBDataMap.get(imgIdxOrNull)
        : modelADataMap.get(imgIdxOrNull);

      if (!oppositeInstance) return;

      const oppositeProb = oppositeInstance[6] as Prob;

      hoveredInstanceRef.current = {
        imgIdx: imgIdxOrNull,
        source,
        modelAProb: isModelA ? prob : oppositeProb,
        modelBProb: !isModelA ? prob : oppositeProb,
      };

      modelARef.current?.updateHoveredInstance(hoveredInstanceRef.current);
      modelBRef.current?.updateHoveredInstance(hoveredInstanceRef.current);

      if (isModelA) {
        modelBRef.current?.highlightInstance(imgIdxOrNull);
      } else {
        modelARef.current?.highlightInstance(imgIdxOrNull);
      }

      const targetRef = isModelA ? modelBRef : modelARef;
      const currentRef = isModelA ? modelARef : modelBRef;

      if (targetRef.current && currentRef.current) {
        const fromPos = currentRef.current.getInstancePosition(imgIdxOrNull);
        const toPos = targetRef.current.getInstancePosition(imgIdxOrNull);

        positionRef.current = {
          from: { ...fromPos },
          to: { ...toPos },
        };
      }
    },
    [modelADataMap, modelBDataMap]
  );

  return (
    <div className="h-[760px] flex flex-col border rounded-md px-1.5 relative">
      <ConnectionLineWrapper positionRef={positionRef} />
      <Legend highlight={highlight} setHighlight={setHighlight} />
      <div className="flex items-center">
        {modelAExperiment && (
          <ScatterPlot
            mode="A"
            modelType={modelAExperiment.Type}
            highlight={highlight}
            setHighlight={setHighlight}
            data={modelAPoints}
            onHover={handleHover}
            ref={modelARef}
          />
        )}
        <Separator
          orientation="vertical"
          className="h-[630px] w-[1px] mx-1 relative top-3.5"
        />
        {modelBExperiment && (
          <ScatterPlot
            mode="B"
            modelType={modelBExperiment.Type}
            highlight={highlight}
            setHighlight={setHighlight}
            data={modelBPoints}
            onHover={handleHover}
            ref={modelBRef}
          />
        )}
      </div>
    </div>
  );
}
