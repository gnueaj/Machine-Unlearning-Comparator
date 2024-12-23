import { useContext, useMemo, useRef, useCallback, useState } from "react";

import ScatterPlot from "../components/ScatterPlot";
import ConnectionLineWrapper from "../components/ConnectionLineWrapper";
import { ExperimentsContext } from "../store/experiments-context";
import { Separator } from "../components/UI/separator";
import { extractSelectedData } from "../utils/data/experiments";
import {
  HelpCircleIcon,
  CursorPointerIcon,
  ScrollVerticalIcon,
  DragIcon,
} from "../components/UI/icons";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogTrigger,
} from "../components/UI/dialog";

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

  const [open, setOpen] = useState(false);

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
    <div
      style={{ height }}
      className="w-full flex justify-start px-1.5 items-center border-[1px] border-solid rounded-[6px] rounded-tr-none relative"
    >
      <ConnectionLineWrapper positionRef={positionRef} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger>
          <HelpCircleIcon className="z-10 w-4 h-4 absolute left-7 top-[7px] cursor-pointer" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-[320px] p-4">
          <DialogHeader className="hidden">
            <DialogTitle></DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div>
              <p className="font-semibold leading-none tracking-tight mb-1.5">
                Embeddings
              </p>
              <p className="text-sm text-muted-foreground">
                The scatter plots present two-dimensional UMAP projections of
                the 512-dimensional penultimate-layer activations. These
                activations were extracted from 2,000 data points in the
                training dataset.
              </p>
            </div>
            <div>
              <p className="font-semibold leading-none tracking-tight mb-1.5">
                Controls
              </p>
              <div className="text-sm flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <CursorPointerIcon />
                  <span>
                    Click{" "}
                    <span className="text-muted-foreground">
                      a point for details
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ScrollVerticalIcon />
                  <span>
                    Scroll{" "}
                    <span className="text-muted-foreground">to zoom</span>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DragIcon />
                  <span>
                    Drag <span className="text-muted-foreground">to pan</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
    </div>
  );
}
