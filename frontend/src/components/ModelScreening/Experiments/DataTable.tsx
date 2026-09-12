import { useState, useEffect, useMemo } from "react";
import {
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  CellContext,
} from "@tanstack/react-table";

import TableHeader from "./TableHeader";
import TableBody from "./TableBody";
import { ExperimentData } from "../../../types/data";
import { ScrollArea } from "../../UI/scroll-area";
import { RadioGroup, RadioGroupItem } from "../../UI/radio-group";
import { cn } from "../../../utils/util";
import { columns } from "./Columns";
import { COLORS } from "../../../constants/colors";
import { Experiment } from "../../../types/data";
import { useModelDataStore } from "../../../stores/modelDataStore";
import { useExperimentsStore } from "../../../stores/experimentsStore";

interface Props {
  isExpanded: boolean;
}

export default function DataTable({ isExpanded }: Props) {
  const { modelA, modelB, saveModelA, saveModelB } = useModelDataStore();
  const experiments = useExperimentsStore((state) => state.experiments);

  const [sorting, setSorting] = useState<SortingState>([]);

  const tableData = useMemo(() => {
    const experimentsArray = Object.values(experiments);
    if (experimentsArray.length === 0) return [];

    if (sorting.length > 0) {
      const { id, desc } = sorting[0];
      const validRows = experimentsArray.filter((exp) => {
        const val = exp[id as keyof Experiment];
        return val !== "N/A" && val !== "NaN" && val !== undefined;
      });
      const undefinedRows = experimentsArray.filter((exp) => {
        const val = exp[id as keyof Experiment];
        return val === "N/A" || val === "NaN" || val === undefined;
      });

      validRows.sort((a, b) => {
        const aVal = a[id as keyof Experiment];
        const bVal = b[id as keyof Experiment];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return aVal - bVal;
        }
        return String(aVal).localeCompare(String(bVal));
      });

      if (desc) {
        validRows.reverse();
      }

      return [...validRows, ...undefinedRows];
    } else {
      return experimentsArray.sort((a, b) => {
        const aSpecial = a.ID.length < 4;
        const bSpecial = b.ID.length < 4;
        if (aSpecial && bSpecial) {
          return a.ID.localeCompare(b.ID);
        }
        if (aSpecial && !bSpecial) return 1;
        if (!aSpecial && bSpecial) return -1;
        return (
          new Date(a.CreatedAt).getTime() - new Date(b.CreatedAt).getTime()
        );
      });
    }
  }, [experiments, sorting]);

  const modifiedColumns = columns.map((column) => {
    if (column.id !== "A" && column.id !== "B") {
      return column;
    }

    const isModelAColumn = column.id === "A";
    const currentSelection = isModelAColumn ? modelA : modelB;
    const saveModel = isModelAColumn ? saveModelA : saveModelB;
    const disabledValue = isModelAColumn ? modelB : modelA;

    return {
      ...column,
      cell: ({ row }: CellContext<ExperimentData, unknown>) => {
        const isSelected = currentSelection === row.id;
        const radioDistance = isModelAColumn ? "left-1" : "left-0.5";
        return (
          <RadioGroup
            className="flex justify-center items-center"
            value={isSelected ? row.id : ""}
            onValueChange={saveModel}
          >
            <RadioGroupItem
              value={row.id}
              className={cn(
                "w-[18px] h-[18px] rounded-full relative " + radioDistance,
                isSelected && "[&_svg]:h-3 [&_svg]:w-3"
              )}
              checked={isSelected}
              disabled={disabledValue === row.id}
              color={isModelAColumn ? COLORS.EMERALD : COLORS.PURPLE}
            />
          </RadioGroup>
        );
      },
    };
  });

  const table = useReactTable({
    getRowId: (row: ExperimentData) => row.ID,
    data: tableData as ExperimentData[],
    columns: modifiedColumns,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting },
  });

  useEffect(() => {
    const modelAExists = Object.values(experiments).some(
      (experiment) => experiment.ID === modelA
    );
    if (!modelAExists) {
      if (tableData.length > 0) {
        saveModelA(tableData[0].ID);
        saveModelB(tableData[1].ID);
      } else {
        saveModelA("");
        saveModelB("");
      }
    }
  }, [experiments, modelA, saveModelA, saveModelB, tableData]);

  return (
    <div className="w-full overflow-visible">
      <TableHeader table={table} />
      {isExpanded ? (
        <div className="w-[1008px] absolute top-[79px] z-[49] bg-white shadow-xl">
          <TableBody table={table} />
        </div>
      ) : (
        <ScrollArea className="w-full h-[166px] border-b">
          <TableBody table={table} />
        </ScrollArea>
      )}
    </div>
  );
}
