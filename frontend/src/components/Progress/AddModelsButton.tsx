import UnlearningConfiguration from "./UnlearningConfiguration";
import Button from "../CustomButton";
import { PlusIcon } from "../UI/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../UI/dialog";

export default function AddExperimentsButton() {
  return (
    <Dialog>
      <DialogTrigger disabled={true}>
        <Button className="w-[255px] mb-1 bg-gray-100 hover:bg-gray-100 cursor-not-allowed">
          <PlusIcon color="#d1d5db" className="w-3 h-3 mr-1.5" />
          <span className="text-base font-medium text-gray-300">
            Open Model Builder
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-fit min-w-[340px] p-4">
        <DialogHeader>
          <DialogTitle>Model Builder</DialogTitle>
        </DialogHeader>
        <UnlearningConfiguration />
      </DialogContent>
    </Dialog>
  );
}
