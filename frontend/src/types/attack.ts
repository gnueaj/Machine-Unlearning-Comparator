import { AttackResult } from "./data";

export interface Bin {
  img_idx: number;
  value: number;
}

export type AttackResultWithType = AttackResult & { type: string };

export type Data = {
  retrainData: Bin[];
  unlearnData: Bin[];
  lineChartData: AttackResultWithType[];
} | null;

export type CategoryType = "unlearn" | "retrain";

export interface ImageWithLabel {
  index: number;
  label: number;
  base64: string;
}

export type Image = Omit<ImageWithLabel, "label">;

export interface TooltipData {
  img_idx: number;
  value: number;
  type: CategoryType;
}

export interface TooltipPosition {
  x: number;
  y: number;
}
