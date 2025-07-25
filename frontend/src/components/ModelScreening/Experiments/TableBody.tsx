import React, { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Table as TableType, flexRender } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import * as d3 from "d3";

import Tooltip from "./Tooltip";
import { columns } from "./Columns";
import { COLUMN_WIDTHS } from "./Columns";
import { COLORS } from "../../../constants/colors";
import { ExperimentData, EpochMetrics } from "../../../types/data";
import { useForgetClassStore } from "../../../stores/forgetClassStore";
import { PerformanceMetrics } from "../../../types/experiments";
import { Experiments } from "../../../types/data";
import { Table, TableBody, TableCell, TableRow } from "../../UI/table";
import { useExperimentsStore } from "../../../stores/experimentsStore";
import { fetchAllExperimentsData } from "../../../utils/api/modelScreening";
import { calculatePerformanceMetrics } from "../../../utils/data/experiments";
import { useRunningStatusStore } from "../../../stores/runningStatusStore";
import { useModelDataStore } from "../../../stores/modelDataStore";
import { cn } from "../../../utils/util";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "../../UI/context-menu";
import {
  deleteRow,
  downloadJSON,
  downloadPTH,
} from "../../../utils/api/modelScreening";

const CONFIG = {
  TEMPORARY_ROW_BG_COLOR: "#F0F6FA",
  COLOR_MAPPING_THRESHOLD: 0.8,
  COLOR_MAPPING_RTE_THRESHOLD: 160,
  COLOR_TEMPERATURE_HIGH: 0.72,
  COLOR_TEMPERATURE_LOW: 0.03,
};

interface Props {
  table: TableType<ExperimentData>;
}

export default function MyTableBody({ table }: Props) {
  const { modelA, modelB, saveModelA, saveModelB } = useModelDataStore();
  const forgetClass = useForgetClassStore((state) => state.forgetClass);
  const isRunning = useRunningStatusStore((state) => state.isRunning);
  const experiments = useExperimentsStore((state) => state.experiments);
  const saveExperiments = useExperimentsStore((state) => state.saveExperiments);
  const setIsExperimentsLoading = useExperimentsStore(
    (state) => state.setIsExperimentsLoading
  );

  const [tooltipData, setTooltipData] = useState<{
    epochMetrics: EpochMetrics;
    experimentId: string;
    position: { x: number; y: number };
  } | null>(null);

  const tooltipRef = useRef<HTMLDivElement>(null);

  const performanceMetrics = calculatePerformanceMetrics(
    experiments
  ) as PerformanceMetrics;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setTooltipData(null);
      }
    };

    if (tooltipData) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [tooltipData]);

  const handleRowClick = (e: React.MouseEvent, experimentId: string) => {
    const tableCell = (e.target as HTMLElement).closest("td");
    if (tableCell) {
      const row = tableCell.closest("tr");
      if (row) {
        const cells = Array.from(row.children);
        const cellIndex = cells.indexOf(tableCell);

        const totalColumns = cells.length;
        const isModelAColumn = cellIndex === totalColumns - 2;
        const isModelBColumn = cellIndex === totalColumns - 1;

        if (isModelAColumn || isModelBColumn) {
          return;
        }
      }
    }

    const experiment = experiments[experimentId];
    if (experiment?.epoch_metrics) {
      const appContainer = document.getElementById("app-container");
      if (appContainer) {
        const containerRect = appContainer.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left + 60;
        const relativeY = e.clientY - containerRect.top + 10;

        setTooltipData({
          epochMetrics: experiment.epoch_metrics,
          experimentId,
          position: {
            x: relativeX,
            y: relativeY,
          },
        });
      }
    }
  };

  const maxTRA = useMemo(
    () =>
      d3.max(table.getRowModel().rows, (row) => {
        const val = row.original.TRA;
        return typeof val === "number" ? val : 0;
      }) || 1,
    [table]
  );

  const traScale = useMemo(
    () =>
      d3
        .scaleSequential()
        .interpolator((t) =>
          d3.interpolateGreens(
            CONFIG.COLOR_TEMPERATURE_LOW + t * CONFIG.COLOR_TEMPERATURE_HIGH
          )
        )
        .domain([CONFIG.COLOR_MAPPING_THRESHOLD, maxTRA])
        .clamp(true),
    [maxTRA]
  );
  const greenScaleLower = useMemo(
    () =>
      d3
        .scaleSequential()
        .interpolator((t) =>
          d3.interpolateGreens(
            CONFIG.COLOR_TEMPERATURE_LOW + t * CONFIG.COLOR_TEMPERATURE_HIGH
          )
        )
        .domain([1 - CONFIG.COLOR_MAPPING_THRESHOLD, 0])
        .clamp(true),
    []
  );
  const greenScaleHigher = useMemo(
    () =>
      d3
        .scaleSequential()
        .interpolator((t) =>
          d3.interpolateGreens(
            CONFIG.COLOR_TEMPERATURE_LOW + t * CONFIG.COLOR_TEMPERATURE_HIGH
          )
        )
        .domain([CONFIG.COLOR_MAPPING_THRESHOLD, 1])
        .clamp(true),
    []
  );
  const blueScale = useMemo(
    () =>
      d3
        .scaleSequential()
        .interpolator((t) =>
          d3.interpolateBlues(
            CONFIG.COLOR_TEMPERATURE_LOW + t * CONFIG.COLOR_TEMPERATURE_HIGH
          )
        )
        .domain([CONFIG.COLOR_MAPPING_RTE_THRESHOLD, 0])
        .clamp(true),
    []
  );
  const orangeScale = useMemo(
    () =>
      d3
        .scaleSequential()
        .interpolator((t) =>
          d3.interpolateOranges(
            CONFIG.COLOR_TEMPERATURE_LOW + t * CONFIG.COLOR_TEMPERATURE_HIGH
          )
        )
        .domain([0, 1])
        .clamp(true),
    []
  );

  const getCellStyle = (
    cell: any,
    isTemporaryRow: boolean
  ): React.CSSProperties => {
    const columnId = cell.column.id;
    const columnWidth = COLUMN_WIDTHS[columnId as keyof typeof COLUMN_WIDTHS];
    let style: React.CSSProperties = {
      width: `${columnWidth}px`,
      minWidth: `${columnWidth}px`,
    };

    if (columnId in performanceMetrics) {
      const value = cell.getValue() as "N/A" | number;
      const borderStyle = "1px solid rgb(229 231 235)";
      let backgroundColor: string, textColor: string | undefined;

      if (value === "N/A") {
        backgroundColor = "white";
      } else {
        if (columnId === "RTE") {
          if (value <= CONFIG.COLOR_MAPPING_RTE_THRESHOLD) {
            backgroundColor = blueScale(value);
            textColor =
              value <= CONFIG.COLOR_MAPPING_RTE_THRESHOLD * 0.4
                ? COLORS.WHITE
                : COLORS.BLACK;
          } else {
            backgroundColor = blueScale(CONFIG.COLOR_MAPPING_RTE_THRESHOLD);
            textColor = COLORS.BLACK;
          }
        } else {
          if (columnId === "UA" || columnId === "TUA") {
            if (value <= 1 - CONFIG.COLOR_MAPPING_THRESHOLD) {
              backgroundColor = greenScaleLower(value);
              textColor = value <= 0.1 ? COLORS.WHITE : COLORS.BLACK;
            } else {
              backgroundColor = greenScaleLower(
                1 - CONFIG.COLOR_MAPPING_THRESHOLD
              );
              textColor = COLORS.BLACK;
            }
          } else if (columnId === "FQS") {
            backgroundColor = orangeScale(value);
            textColor = value >= 0.6 ? COLORS.WHITE : COLORS.BLACK;
          } else if (columnId === "TRA") {
            backgroundColor = traScale(value);
            textColor = value >= maxTRA * 0.92 ? COLORS.WHITE : COLORS.BLACK;
          } else {
            if (value >= CONFIG.COLOR_MAPPING_THRESHOLD) {
              backgroundColor = greenScaleHigher(value);
              textColor = value >= 0.92 ? COLORS.WHITE : COLORS.BLACK;
            } else {
              backgroundColor = greenScaleHigher(
                CONFIG.COLOR_MAPPING_THRESHOLD
              );
              textColor = COLORS.BLACK;
            }
          }
        }
      }

      style = {
        ...style,
        borderLeft: columnId === "UA" ? borderStyle : "none",
        borderRight: borderStyle,
        backgroundColor,
        color: textColor,
      };
    }

    if (isTemporaryRow) {
      style.backgroundColor = CONFIG.TEMPORARY_ROW_BG_COLOR;
    }

    return style;
  };

  const handleDeleteRow = async (id: string) => {
    try {
      await deleteRow(forgetClass, id);
      setIsExperimentsLoading(true);
      const allExperiments: Experiments = await fetchAllExperimentsData(
        forgetClass
      );
      if ("detail" in allExperiments) {
        saveExperiments({});
      } else {
        Object.values(allExperiments).forEach((experiment) => {
          if (experiment && "points" in experiment) {
            delete experiment.points;
          }
        });

        const sortedExperiments = Object.fromEntries(
          Object.entries(allExperiments).sort(([id1], [id2]) =>
            id1.localeCompare(id2)
          )
        );

        saveExperiments(sortedExperiments);

        if (id === modelA) {
          if (!modelB.startsWith("000")) {
            saveModelA(`000${forgetClass}`);
          } else if (!modelB.startsWith("a00")) {
            saveModelA(`a00${forgetClass}`);
          } else {
            const nextModelAExperiment = Object.values(sortedExperiments).find(
              (experiment) => experiment.ID !== modelB
            );
            saveModelA(nextModelAExperiment!.ID);
          }
        } else if (id === modelB) {
          if (!modelA.startsWith("000")) {
            saveModelB(`000${forgetClass}`);
          } else if (!modelA.startsWith("a00")) {
            saveModelB(`a00${forgetClass}`);
          } else {
            const nextModelBExperiment = Object.values(sortedExperiments).find(
              (experiment) => experiment.ID !== modelA
            );
            saveModelB(nextModelBExperiment!.ID);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete the row:", error);
    } finally {
      setIsExperimentsLoading(false);
    }
  };

  const handleDownloadJSON = async (id: string) => {
    try {
      const json = await downloadJSON(forgetClass, id);
      const jsonString = JSON.stringify(json, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download the JSON file:", error);
    }
  };

  const handleDownloadPTH = async (id: string) => {
    try {
      await downloadPTH(forgetClass, id);
    } catch (error) {
      console.error("Failed to download the PTH file:", error);
    }
  };

  return (
    <div className="relative" data-table-container>
      <Table className="w-full table-fixed">
        <TableBody
          className={cn(
            "text-sm",
            table.getRowModel().rows?.length <= 5 &&
              "[&_tr:last-child]:border-b"
          )}
        >
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, rowIdx) => {
              const isTemporaryRow = row.id === "-";
              let isRunningRow = false;
              if (isTemporaryRow) {
                const temporaryExperimentEntries = Object.entries(
                  experiments
                ).filter(([key]) => key.length < 4);
                const tempIndex = temporaryExperimentEntries.findIndex(
                  ([, experiment]) => experiment === row.original
                );
                isRunningRow = tempIndex === 0;
              }

              return (
                <ContextMenu key={rowIdx}>
                  <ContextMenuTrigger className="contents">
                    <TableRow
                      id={row.id}
                      className="!border-b cursor-pointer"
                      data-state={row.getIsSelected() && "selected"}
                      onClick={(event) =>
                        !isTemporaryRow && handleRowClick(event, row.id)
                      }
                    >
                      {row.getVisibleCells().map((cell) => {
                        const columnId = cell.column.id;
                        const cellStyle = getCellStyle(cell, isTemporaryRow);

                        const cellContent =
                          isRunningRow && columnId === "ID" ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )
                          );

                        return (
                          <TableCell key={cell.id} style={cellStyle}>
                            {cellContent}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </ContextMenuTrigger>
                  {!isTemporaryRow && (
                    <ContextMenuContent className="z-50">
                      {!row.id.startsWith("000") &&
                        !row.id.startsWith("a00") &&
                        !isRunning && (
                          <ContextMenuItem
                            onClick={() => handleDeleteRow(row.id)}
                          >
                            Delete
                          </ContextMenuItem>
                        )}
                      <ContextMenuItem
                        onClick={() => handleDownloadJSON(row.id)}
                      >
                        Download JSON
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleDownloadPTH(row.id)}
                      >
                        Download PTH
                      </ContextMenuItem>
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              );
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-[178px] text-center text-gray-500 text-[15px]"
              >
                No data found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {tooltipData &&
        createPortal(
          <div
            ref={tooltipRef}
            className="absolute z-[60]"
            style={{
              left: tooltipData.position.x,
              top: tooltipData.position.y,
            }}
          >
            <Tooltip
              epochMetrics={tooltipData.epochMetrics}
              experimentId={tooltipData.experimentId}
            />
          </div>,
          document.getElementById("app-container") || document.body
        )}
    </div>
  );
}
