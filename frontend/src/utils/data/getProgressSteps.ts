import { UnlearningStatus } from "../../types/experiments";

const TO_FIXED_LENGTH = 3;
const UMAP = "UMAP";
const CKA = "CKA";
const UNLEARNING = "Unlearning";
const IDLE = "Idle";

export const getProgressSteps = (
  status: UnlearningStatus | null,
  activeStep: number,
  umapProgress: number,
  ckaProgress: number
) => {
  if (!status) {
    return [
      {
        step: 1,
        title: "Unlearn",
        description: `Method: **-** | Epochs: **-**\nCurrent Unlearning Accuracy: **-**`,
      },
      {
        step: 2,
        title: "Evaluate",
        description: `Training Accuracy: **-**\nTest Accuracy: **-**`,
      },
      {
        step: 3,
        title: "Analyze",
        description: `Computing UMAP Embedding\nCalculating CKA Values`,
      },
    ];
  }

  const method = status && status.method ? status.method : "";
  const progress = status.progress;
  const currentUnlearnAccuracy = status.current_unlearn_accuracy;
  const currentEpoch = status.current_epoch;
  const totalEpochs = status.total_epochs;
  const trainingAccuracy = status.p_training_accuracy;
  const testAccuracy = status.p_test_accuracy;
  const completedSteps = status.completed_steps;

  return [
    {
      step: 1,
      title: "Unlearn",
      description: `Method: **${method ? method : "-"}** | Epoch: **${
        !completedSteps.includes(1) ? "-" : currentEpoch + "/" + totalEpochs
      }**\nCurrent Unlearning Accuracy: **${
        completedSteps.includes(1) &&
        (currentEpoch > 1 || (totalEpochs === 1 && completedSteps.includes(2)))
          ? currentUnlearnAccuracy === 0
            ? 0
            : currentUnlearnAccuracy.toFixed(TO_FIXED_LENGTH)
          : "-"
      }**`,
    },
    {
      step: 2,
      title: "Evaluate",
      description: `Training Accuracy: **${
        completedSteps.includes(3) ||
        (completedSteps.includes(2) && progress.includes("Test"))
          ? trainingAccuracy === 0
            ? 0
            : trainingAccuracy.toFixed(TO_FIXED_LENGTH)
          : "-"
      }**\nTest Accuracy: **${
        completedSteps.includes(3)
          ? testAccuracy === 0
            ? 0
            : testAccuracy.toFixed(TO_FIXED_LENGTH)
          : "-"
      }**`,
    },
    {
      step: 3,
      title: "Analyze",
      description: `${
        (activeStep === 3 &&
          (progress.includes(UMAP) || progress.includes(CKA))) ||
        (completedSteps.includes(3) &&
          (progress === IDLE || progress === UNLEARNING))
          ? `Computing UMAP Embedding... **${
              !progress.includes(UMAP) ? "100" : umapProgress
            }%**`
          : "Computing UMAP Embedding"
      }\n${
        (activeStep === 3 && progress.includes(CKA)) ||
        (completedSteps.includes(3) &&
          (progress === IDLE || progress === UNLEARNING))
          ? `Calculating CKA Values... **${
              progress === IDLE || progress === UNLEARNING ? "100" : ckaProgress
            }%**`
          : "Calculating CKA Values"
      }\n${
        completedSteps.includes(3) &&
        (progress === IDLE || progress === UNLEARNING)
          ? `Done! Model ID: **${status.recent_id}**`
          : ""
      }`,
    },
  ];
};
