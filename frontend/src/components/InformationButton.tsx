import { useState } from "react";

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

export default function InformationButton() {
  const [open, setOpen] = useState(false);

  return (
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
              The scatter plots present two-dimensional UMAP projections of the
              512-dimensional penultimate-layer activations. These activations
              were extracted from 2,000 data points in the training dataset.
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
                  Scroll <span className="text-muted-foreground">to zoom</span>
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
  );
}
