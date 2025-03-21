import { Column } from "@tanstack/react-table";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../UI/hover-card";
import { Button } from "../UI/button";
import { UnfoldMoreIcon } from "../UI/icons";
import { ExperimentData } from "../../types/data";

const handleSorting = (column: Column<ExperimentData, unknown>) => {
  const currentSort = column.getIsSorted();
  if (!currentSort) {
    column.toggleSorting(true);
  } else if (currentSort === "desc") {
    column.toggleSorting(false);
  } else if (currentSort === "asc") {
    column.clearSorting();
  }
};

export const EpochHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <Button
      className="w-full px-0 h-[34px] flex justify-start"
      variant="ghost"
      onClick={() => handleSorting(column)}
    >
      Epoch
      <UnfoldMoreIcon
        className="w-4 text-muted-foreground"
        sortOrder={sortOrder}
      />
    </Button>
  );
};

export const BSHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px] flex justify-start"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          BS
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Batch Size
      </HoverCardContent>
    </HoverCard>
  );
};

export const LRHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px] flex justify-start"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          LR
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Learning Rate
      </HoverCardContent>
    </HoverCard>
  );
};

export const UAHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px]"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          UA
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Unlearning Accuracy
      </HoverCardContent>
    </HoverCard>
  );
};

export const RAHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px]"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          RA
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Retaining Accuracy
      </HoverCardContent>
    </HoverCard>
  );
};

export const TUAHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px]"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          TUA
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Test Unlearning Accuracy
      </HoverCardContent>
    </HoverCard>
  );
};

export const TRAHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px]"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          TRA
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Test Retaining Accuracy
      </HoverCardContent>
    </HoverCard>
  );
};

export const RTEHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px]"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          RT
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Run-Time
      </HoverCardContent>
    </HoverCard>
  );
};

export const FQSHeader = ({
  column,
}: {
  column: Column<ExperimentData, unknown>;
}) => {
  const sortOrder = column.getIsSorted() || null;
  return (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger>
        <Button
          className="w-full px-0 h-[34px]"
          variant="ghost"
          onClick={() => handleSorting(column)}
        >
          FQS
          <UnfoldMoreIcon
            className="w-4 text-muted-foreground"
            sortOrder={sortOrder}
          />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto px-3 py-2" side="top">
        Forgetting Quality Score
      </HoverCardContent>
    </HoverCard>
  );
};
