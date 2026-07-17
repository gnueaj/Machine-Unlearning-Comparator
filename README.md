# Machine Unlearning Comparator

[![YouTube](https://img.shields.io/badge/Intro-YouTube-red?logo=youtube&logoColor=white)](https://youtu.be/yAyAYp2msDk?si=Q-8IgVlrk8uSBceu)
[![Demo](https://img.shields.io/badge/Demo-Live-green?logo=react&logoColor=white)](https://gnueaj.github.io/Machine-Unlearning-Comparator/)
[![Paper](https://img.shields.io/badge/Paper-TVCG-b31b1b?logo=read-the-docs&logoColor=white)](https://ieeexplore.ieee.org/document/11364307)
[![GitHub Stars](https://img.shields.io/github/stars/gnueaj/Machine-Unlearning-Comparator?style=social)](https://github.com/gnueaj/Machine-Unlearning-Comparator)

📢 **[Jul 2026]** Check out our follow-up work, **[Unlearning Depth Score](https://github.com/gnueaj/unlearning-depth-score)** — going beyond output-level metrics to measure unlearning depth!


![Teaser Animation](https://github.com/user-attachments/assets/fc7d992e-7770-44c7-89bc-8e5596a9f3ff)
Unlearning Comparator is a web-based visual analytics system for the comparative evaluation of Machine Unlearning (MU) methods. <br>

![Unlearning Comparator Workflow](https://github.com/user-attachments/assets/a76837a6-df39-42c1-adb1-8a976ca41fe3)
This system helps researchers systematically compare MU methods based on three core principles: **accuracy, efficiency, and privacy**. The workflow is structured into four stages: **Build → Screen → Contrast → Attack**.

## ✨ Key Features

- **Multi-Level Visual Comparison**
  - Analyze model behavior from class, instance, and layer-level perspectives.
  - Includes: `Class-wise Accuracy chart`, `Prediction Matrix`, `Embedding Space`, and `Layer-wise Similarity chart`.

- **Interactive Privacy Audits**
  - Simulate **Membership Inference Attacks (MIAs)** to verify data removal.

![Privacy Attack Visualization](https://github.com/user-attachments/assets/3acd62ff-5c2e-4ab9-be84-71a38e4e07c9)

---

## 🔧 Built-in Methods

| Method                   | Description                                                                                                                 |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Fine-Tuning (FT)**     | Fine-tunes the model only on the **retain set**.                                                                            |
| **Gradient Ascent (GA)** | Adjusts model parameters to **maximize loss** on the forget set.                                                            |
| **Random Labeling (RL)** | Assigns **random labels** to the forget set and then fine-tunes the model.                                                  |
| **SCRUB**                | Uses a **teacher-student distillation** framework to maximize loss on the forget set while minimizing it on the retain set. |
| **SalUn**                | **Masks weights** influenced by the forget set before applying random labeling and targeted fine-tuning.                    |

---

## 🔌 Add Your Own Method

Implement and register your own MU methods via a Python hook for direct comparison within the system.

💡 **Tip**: Ask [Claude Code](https://claude.ai/code) for a boilerplate template to get started quickly!

---

## ⚡ Quick Start

### Backend

```bash
# 1. Install deps & activate environment
hatch shell
# 2. Run the API server
hatch run start
```

### Frontend

```bash
# 1 Install deps
pnpm install
# 2 Launch the UI
pnpm start
```

---

## ⚙️ Configuration

### UMAP Visualization

Adjust UMAP parameters for `Embedding Space` visualization in [backend/app/config/settings.py](backend/app/config/settings.py):

- `UMAP_N_NEIGHBORS`: Lower (5-10) for local clusters, higher (11-20) for global structure
- `UMAP_MIN_DIST`: Lower (0.1-0.3) for tighter clusters, higher (0.5-0.9) for even spacing

---

## 🔗 Related Resources

- **ResNet-18 CIFAR-10 MU checkpoints** → <https://huggingface.co/jaeunglee/resnet18-cifar10-unlearning>
- **ResNet-18 FashionMNIST MU checkpoints** → <https://huggingface.co/Yurim0507/resnet18-fashionmnist-unlearning>
- **ViT-Base CIFAR-10 MU checkpoints** → <https://huggingface.co/Yurim0507/vit-base-16-cifar10-unlearning>

---

## 📚 Citation

If you use this tool in your research, please cite our paper:

```bibtex
@article{lee2026unlearning,
  title   = {{Unlearning Comparator}: A Visual Analytics System for Comparative Evaluation of Machine Unlearning Methods},
  author  = {Lee, Jaeung and Yu, Suhyeon and Jang, Yurim and Woo, Simon S. and Jo, Jaemin},
  journal = {IEEE Transactions on Visualization and Computer Graphics},
  volume  = {32},
  number  = {3},
  pages   = {2852--2867},
  year    = {2026},
  doi     = {10.1109/TVCG.2026.3658325}
}
```

<a href="https://www.star-history.com/?repos=gnueaj%2FMachine-Unlearning-Comparator&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=gnueaj/Machine-Unlearning-Comparator&type=date&theme=dark&legend=top-left&sealed_token=0AxbyoEmFlqBym-nzLogEQUbf_kJq3W-u2D83wKdyFkZ4lBss-M3Wiv7IIk0Tv1NvloaW_I5yUJWHIRT71AaQQDjXrSR6vAuTw0M3AUbmEu4wLmNj3NxzS5XZLCjirAuK4LosdgbLU8Yh2bdUS-ZmSo4JsjTzFSxbCMJnnJEPFNl8c9G5cqMtSQYn2ur" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=gnueaj/Machine-Unlearning-Comparator&type=date&legend=top-left&sealed_token=0AxbyoEmFlqBym-nzLogEQUbf_kJq3W-u2D83wKdyFkZ4lBss-M3Wiv7IIk0Tv1NvloaW_I5yUJWHIRT71AaQQDjXrSR6vAuTw0M3AUbmEu4wLmNj3NxzS5XZLCjirAuK4LosdgbLU8Yh2bdUS-ZmSo4JsjTzFSxbCMJnnJEPFNl8c9G5cqMtSQYn2ur" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=gnueaj/Machine-Unlearning-Comparator&type=date&legend=top-left&sealed_token=0AxbyoEmFlqBym-nzLogEQUbf_kJq3W-u2D83wKdyFkZ4lBss-M3Wiv7IIk0Tv1NvloaW_I5yUJWHIRT71AaQQDjXrSR6vAuTw0M3AUbmEu4wLmNj3NxzS5XZLCjirAuK4LosdgbLU8Yh2bdUS-ZmSo4JsjTzFSxbCMJnnJEPFNl8c9G5cqMtSQYn2ur" />
 </picture>
</a>
