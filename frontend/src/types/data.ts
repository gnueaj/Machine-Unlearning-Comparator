export interface GapDataItem {
  category: string;
  classLabel: string;
  gap: number;
  fill: string;
  modelAAccuracy: number;
  modelBAccuracy: number;
}

export type Dist = {
  [key: string]: number[];
};

type CKA = {
  layers: string[];
  train: {
    forget_class: number[][];
    other_classes: number[][];
  };
  test: {
    forget_class: number[][];
    other_classes: number[][];
  };
};

export type Point = [
  number,
  number,
  number,
  number,
  number,
  number,
  {
    [key: string]: number;
  }
];

export type AttackValue = {
  img: number;
  entropy: number;
  confidence: number;
};

export type AttackResult = {
  threshold: number;
  fpr: number;
  fnr: number;
  attack_score: number;
};

export type AttackResults = {
  entropy_above_unlearn: AttackResult[];
  entropy_above_retrain: AttackResult[];
  confidence_above_unlearn: AttackResult[];
  confidence_above_retrain: AttackResult[];
};

export type AttackData = {
  values: AttackValue[];
  results: AttackResults;
};

export type ExperimentData = {
  CreatedAt: string;
  ID: string;
  FC: number;
  Type: string;
  Base: string;
  Method: string;
  Epoch: number | string;
  BS: number | string;
  LR: number | string;
  UA: number | string;
  RA: number | string;
  TUA: number | string;
  TRA: number | string;
  PA: number | string;
  RTE: number | string;
  FQS: number | string;
  accs: number[];
  label_dist: Dist;
  conf_dist: Dist;
  t_accs: number[];
  t_label_dist: Dist;
  t_conf_dist: Dist;
  cka: CKA;
  points: Point[];
  attack: AttackData;
};

export type Experiment = Omit<ExperimentData, "points">;

export type Experiments = { [key: string]: ExperimentData };
