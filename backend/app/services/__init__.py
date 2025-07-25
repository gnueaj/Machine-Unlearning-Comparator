"""
Services package for managing model training and unlearning operations.

This package provides modules for training neural networks and implementing various unlearning methods.
The service modules define recipes that are executed by separate threads to handle the actual computation.

Available services:
    train: Model training with configurable hyperparameters
    unlearn_GA: Unlearning using gradient ascent method
    unlearn_RL: Unlearning using random labeling method  
    unlearn_FT: Unlearning using fine-tuning method
    unlearn_GA_FT: Unlearning using combined GA+FT method
    unlearn_GA_SL_FT: Unlearning using GA+SL+FT method with second logit
    unlearn_SCRUB: Unlearning using SCRUB method
    unlearn_SalUn: Unlearning using SalUn gradient saliency method
    unlearn_custom: Custom unlearning method for inference

Each service module follows a similar pattern:
1. Takes training/unlearning parameters as input
2. Sets up the model, data, and optimization components
3. Passes the configuration to a dedicated execution thread
4. Provides status tracking and result handling
"""

from .train import run_training
from .unlearn_GA import run_unlearning_GA
from .unlearn_RL import run_unlearning_RL
from .unlearn_FT import run_unlearning_FT
from .unlearn_GA_FT import run_unlearning_GA_FT
from .unlearn_GA_SL_FT import run_unlearning_GA_SL_FT
from .unlearn_SCRUB import run_unlearning_SCRUB
from .unlearn_SalUn import run_unlearning_SalUn
from .unlearn_retrain import run_unlearning_retrain
from .unlearn_custom import run_unlearning_custom

__all__ = ['run_training', 'run_unlearning_GA', 'run_unlearning_RL', 'run_unlearning_FT', 'run_unlearning_GA_FT', 'run_unlearning_GA_SL_FT', 'run_unlearning_SCRUB', 'run_unlearning_SalUn', 'run_unlearning_retrain', 'run_unlearning_custom']