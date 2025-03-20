import React, { useMemo } from "react";
import { Table as TableType, flexRender } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import * as d3 from "d3";

import { columns } from "./Columns";
import { COLUMN_WIDTHS } from "./Columns";
import { COLORS } from "../../constants/colors";
import { ExperimentData } from "../../types/data";
import { PerformanceMetrics } from "../../types/experiments";
import { Table, TableBody, TableCell, TableRow } from "../UI/table";
import { useExperimentsStore } from "../../stores/experimentsStore";
import { calculatePerformanceMetrics } from "../../utils/data/experiments";
import { ContextMenu, ContextMenuTrigger } from "../UI/context-menu";

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

export default function _TableBody({ table }: Props) {
  const experiments = useExperimentsStore((state) => state.experiments);

  const performanceMetrics = calculatePerformanceMetrics(
    experiments
  ) as PerformanceMetrics;

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
    let style: React.CSSProperties = { width: `${columnWidth}px` };

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
              value <= CONFIG.COLOR_MAPPING_RTE_THRESHOLD / 2
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
            textColor = value >= maxTRA * 0.95 ? COLORS.WHITE : COLORS.BLACK;
          } else {
            if (value >= CONFIG.COLOR_MAPPING_THRESHOLD) {
              backgroundColor = greenScaleHigher(value);
              textColor = value >= 0.9 ? COLORS.WHITE : COLORS.BLACK;
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

  return (
    <Table className="w-full table-fixed">
      <TableBody
        className={`text-sm ${
          table.getRowModel().rows?.length <= 5 && "[&_tr:last-child]:border-b"
        }`}
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
                    className="!border-b"
                    data-state={row.getIsSelected() && "selected"}
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
  );
}
