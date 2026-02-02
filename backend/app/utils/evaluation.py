import torch
import numpy as np
import torch.nn.functional as F
import matplotlib.pyplot as plt
import seaborn as sns
import os
from datetime import datetime
from contextlib import contextmanager

from cka import compute_cka
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, transforms
from app.config import UMAP_DATA_SIZE
from app.models import get_resnet18


@contextmanager
def model_eval_mode(model):
    """Context manager to temporarily set model to eval mode and restore original state."""
    was_training = model.training
    model.eval()
    try:
        yield model
    finally:
        if was_training:
            model.train()


async def get_layer_activations_and_predictions(
    model, data_loader, device, num_samples=UMAP_DATA_SIZE
):
    activations = []
    predictions = []
    probabilities = []
    sample_count = 0

    def hook_fn(module, input, output):
        activations.append(output.detach().cpu().numpy())

    with model_eval_mode(model):
        hook = model.avgpool.register_forward_hook(hook_fn)

        with torch.no_grad():
            for inputs, labels in data_loader:
                inputs = inputs.to(device)
                labels = labels.to(device)

                outputs = model(inputs)
                _, predicted = outputs.max(1)
                predictions.extend(predicted.cpu().numpy())

                temperature = 2.0
                scaled_outputs = outputs / temperature
                probs = F.softmax(scaled_outputs, dim=1)
                probabilities.extend(probs.cpu().numpy())

                sample_count += inputs.size(0)
                if sample_count >= num_samples:
                    break

        hook.remove()

        activations = np.concatenate(activations, axis=0)[:num_samples].reshape(
            num_samples, -1
        )
        predictions = np.array(predictions)
        probabilities = np.array(probabilities)

    return activations, predictions, probabilities


# For training and retraining
async def evaluate_model(model, data_loader, criterion, device):
    total_loss = 0
    correct = 0
    total = 0
    class_correct = [0] * 10
    class_total = [0] * 10

    with model_eval_mode(model):
        with torch.no_grad():
            for data in data_loader:
                images, labels = data[0].to(device), data[1].to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                total_loss += loss.item()
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

                c = (predicted == labels).squeeze()
                for i in range(len(labels)):
                    label = labels[i]
                    class_correct[label] += c[i].item()
                    class_total[label] += 1

    accuracy = correct / total
    class_accuracies = {
        i: (class_correct[i] / class_total[i] if class_total[i] > 0 else 0.0)
        for i in range(10)
    }
    avg_loss = total_loss / len(data_loader)
    print(f"Total correct: {correct}, Total samples: {total}")
    print(f"Overall accuracy: {accuracy:.3f}")
    for i in range(10):
        print(
            f"Class {i} correct: {class_correct[i]}, "
            f"total: {class_total[i]}, "
            f"accuracy: {class_accuracies[i]:.4f}"
        )
    return avg_loss, accuracy, class_accuracies


def visualize_logits_distribution(all_logits, class_logits, save_dir="aaai_exp"):
    """
    Visualize and save logits distribution analysis

    Args:
        all_logits: numpy array of all logits (n_samples, n_classes)
        class_logits: list of numpy arrays, each containing logits for samples of that class
        save_dir: directory to save the visualizations and data
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs(save_dir, exist_ok=True)

    # 1. True Class logits statistics
    plt.figure(figsize=(12, 8))
    plt.subplot(2, 2, 1)

    # Calculate statistics for true class logits
    true_class_stats = {"mean": [], "std": [], "max": [], "min": []}

    for i in range(10):
        if len(class_logits[i]) > 0:
            # Get ALL logits for samples with true label i (all classes 0-9)
            all_logits_for_class = class_logits[i].flatten()
            true_class_stats["mean"].append(np.mean(all_logits_for_class))
            true_class_stats["std"].append(np.std(all_logits_for_class))
            true_class_stats["max"].append(np.max(all_logits_for_class))
            true_class_stats["min"].append(np.min(all_logits_for_class))
        else:
            true_class_stats["mean"].append(0)
            true_class_stats["std"].append(0)
            true_class_stats["max"].append(0)
            true_class_stats["min"].append(0)

    # Add overall statistics for all logits
    overall_logits = all_logits.flatten()
    true_class_stats["mean"].append(np.mean(overall_logits))
    true_class_stats["std"].append(np.std(overall_logits))
    true_class_stats["max"].append(np.max(overall_logits))
    true_class_stats["min"].append(np.min(overall_logits))

    # Plot statistics
    x = np.arange(11)  # Now includes overall statistics
    width = 0.2

    bars1 = plt.bar(
        x - 1.5 * width, true_class_stats["mean"], width, label="Mean", alpha=0.8
    )
    bars2 = plt.bar(
        x - 0.5 * width, true_class_stats["std"], width, label="Std Dev", alpha=0.8
    )
    bars3 = plt.bar(
        x + 0.5 * width, true_class_stats["max"], width, label="Max", alpha=0.8
    )
    bars4 = plt.bar(
        x + 1.5 * width, true_class_stats["min"], width, label="Min", alpha=0.8
    )

    # Add value labels on bars
    for i, (bar1, bar2, bar3, bar4) in enumerate(zip(bars1, bars2, bars3, bars4)):
        plt.text(
            bar1.get_x() + bar1.get_width() / 2.0,
            bar1.get_height() + 0.1,
            f"{true_class_stats['mean'][i]:.2f}",
            ha="center",
            va="bottom",
            fontsize=8,
        )
        plt.text(
            bar2.get_x() + bar2.get_width() / 2.0,
            bar2.get_height() + 0.1,
            f"{true_class_stats['std'][i]:.2f}",
            ha="center",
            va="bottom",
            fontsize=8,
        )
        plt.text(
            bar3.get_x() + bar3.get_width() / 2.0,
            bar3.get_height() + 0.1,
            f"{true_class_stats['max'][i]:.2f}",
            ha="center",
            va="bottom",
            fontsize=8,
        )
        plt.text(
            bar4.get_x() + bar4.get_width() / 2.0,
            bar4.get_height() + 0.1,
            f"{true_class_stats['min'][i]:.2f}",
            ha="center",
            va="bottom",
            fontsize=8,
        )

    plt.xlabel("True Class")
    plt.ylabel("Logit Value")
    plt.title("All Logits Statistics per True Class (+ Overall)")
    plt.legend()
    class_labels = [f"Class {i}" for i in range(10)] + ["Overall"]
    plt.xticks(x, class_labels, rotation=45)
    plt.grid(True, alpha=0.3)

    # 2. Mean logits per class
    plt.subplot(2, 2, 2)
    mean_logits_per_class = []
    for i in range(10):
        if len(class_logits[i]) > 0:
            mean_logits_per_class.append(np.mean(class_logits[i], axis=0))
        else:
            mean_logits_per_class.append(np.zeros(10))
    mean_logits_per_class = np.array(mean_logits_per_class)
    sns.heatmap(mean_logits_per_class, annot=True, fmt=".2f", cmap="RdBu_r", center=0)
    plt.title("Mean Logits per True Class")
    plt.xlabel("Predicted Class")
    plt.ylabel("True Class")

    # 3. Logits distribution histogram for each class
    plt.subplot(2, 2, 3)
    colors = plt.cm.tab10(np.linspace(0, 1, 10))
    for i in range(10):
        if len(class_logits[i]) > 0:
            logits_for_true_class = class_logits[i][:, i]  # Logits for true class
            plt.hist(
                logits_for_true_class,
                alpha=0.6,
                label=f"Class {i}",
                color=colors[i],
                bins=30,
            )
    plt.xlabel("Logit Value for True Class")
    plt.ylabel("Frequency")
    plt.title("Distribution of True Class Logits")
    plt.legend(bbox_to_anchor=(1.05, 1), loc="upper left")

    # 4. Standard deviation of logits per class
    plt.subplot(2, 2, 4)
    std_logits_per_class = []
    for i in range(10):
        if len(class_logits[i]) > 0:
            std_logits_per_class.append(np.std(class_logits[i], axis=0))
        else:
            std_logits_per_class.append(np.zeros(10))
    std_logits_per_class = np.array(std_logits_per_class)
    sns.heatmap(std_logits_per_class, annot=True, fmt=".2f", cmap="YlOrRd")
    plt.title("Standard Deviation of Logits per True Class")
    plt.xlabel("Predicted Class")
    plt.ylabel("True Class")

    plt.tight_layout()
    plt.savefig(
        f"{save_dir}/logits_distribution_{timestamp}.png", dpi=300, bbox_inches="tight"
    )
    plt.close()

    # Save raw logits data
    logits_data = {
        "all_logits": all_logits,
        "class_logits": class_logits,
        "mean_logits_per_class": mean_logits_per_class,
        "std_logits_per_class": std_logits_per_class,
        "true_class_stats": true_class_stats,
        "timestamp": timestamp,
    }
    np.save(f"{save_dir}/logits_data_{timestamp}.npy", logits_data)

    print(
        f"Logits distribution visualization saved to {save_dir}/logits_distribution_{timestamp}.png"
    )
    print(f"Logits data saved to {save_dir}/logits_data_{timestamp}.npy")

    return timestamp


async def evaluate_model_with_distributions(model, data_loader, criterion, device):
    total_loss = 0
    correct = 0
    total = 0
    class_correct = [0] * 10
    class_total = [0] * 10
    label_distribution = np.zeros(
        (10, 10)
    )  # Ground truth vs predicted class distribution
    confidence_sum = np.zeros(
        (10, 10)
    )  # Ground truth vs sum of confidence for all classes

    # Collect logits for each class
    all_logits = []  # Store all logits for distribution visualization
    class_logits = [[] for _ in range(10)]  # Store logits for each class separately

    with model_eval_mode(model):
        with torch.no_grad():
            for data in data_loader:
                images, labels = data[0].to(device), data[1].to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                total_loss += loss.item()

                # Collect raw logits before softmax
                all_logits.append(outputs.cpu().numpy())

                # Collect logits for each class
                for i in range(labels.size(0)):
                    label = labels[i].item()
                    class_logits[label].append(outputs[i].cpu().numpy())

                temperature = 1.0
                scaled_outputs = outputs / temperature
                probabilities = F.softmax(scaled_outputs, dim=1)
                _, predicted = torch.max(probabilities, 1)

                total += labels.size(0)
                correct += (predicted == labels).sum().item()
                for i in range(labels.size(0)):
                    label = labels[i].item()
                    pred = predicted[i].item()

                    class_total[label] += 1
                    if label == pred:
                        class_correct[label] += 1

                    label_distribution[label][pred] += 1
                    confidence_sum[label] += probabilities[i].cpu().numpy()

    # Convert logits to numpy arrays
    all_logits = np.concatenate(all_logits, axis=0)
    class_logits = [np.array(logits) for logits in class_logits if len(logits) > 0]

    # Visualize logits distribution
    # visualize_logits_distribution(all_logits, class_logits)

    accuracy = correct / total
    class_accuracies = {
        i: (class_correct[i] / class_total[i] if class_total[i] > 0 else 0.0)
        for i in range(10)
    }
    avg_loss = total_loss / len(data_loader)

    label_distribution = label_distribution / label_distribution.sum(
        axis=1, keepdims=True
    )
    confidence_distribution = confidence_sum / np.array(class_total)[:, np.newaxis]
    return (
        avg_loss,
        accuracy,
        class_accuracies,
        label_distribution,
        confidence_distribution,
    )


async def calculate_cka_similarity(model_after, forget_class, device, batch_size=1000):
    # Load original model from file
    model_before = get_resnet18().to(device)
    original_model_path = f"unlearned_models/{forget_class}/000{forget_class}.pth"
    print(f"Loading original model from: {original_model_path}")
    model_before.load_state_dict(torch.load(original_model_path, map_location=device))

    # Create clean data loaders without augmentation for consistent CKA calculation
    base_transforms = transforms.Compose(
        [
            transforms.ToTensor(),
            transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2023, 0.1994, 0.2010)),
        ]
    )

    clean_train_set = datasets.CIFAR10(
        root="./data", train=True, download=False, transform=base_transforms
    )
    clean_test_set = datasets.CIFAR10(
        root="./data", train=False, download=False, transform=base_transforms
    )

    train_loader = DataLoader(
        clean_train_set, batch_size=batch_size, shuffle=False, num_workers=0
    )
    test_loader = DataLoader(
        clean_test_set, batch_size=batch_size, shuffle=False, num_workers=0
    )

    # List of layers to analyze in ResNet18 model
    # conv1: First convolutional layer
    # layerX.Y: ResNet block Y in group X
    # fc: Final fully connected layer
    detailed_layers = [
        "conv1",
        "layer1.0",
        "layer1.1",
        "layer2.0",
        "layer2.1",
        "layer3.0",
        "layer3.1",
        "layer4.0",
        "layer4.1",
        "fc",
    ]

    def filter_loader(loader, is_train=False):
        targets = loader.dataset.targets
        targets = (
            torch.tensor(targets) if not isinstance(targets, torch.Tensor) else targets
        )

        forget_indices = (targets == forget_class).nonzero(as_tuple=True)[0]
        other_indices = (targets != forget_class).nonzero(as_tuple=True)[0]

        if is_train:
            forget_samples = len(forget_indices) // 10
            other_samples = len(other_indices) // 10
        else:
            forget_samples = len(forget_indices) // 2
            other_samples = len(other_indices) // 2

        # Fix random seed for consistent CKA sampling - use forget_class as part of seed
        seed = 42 + forget_class  # Consistent per forget class
        torch.manual_seed(seed)
        np.random.seed(seed)

        # Sort indices for complete determinism
        forget_indices_sorted = torch.sort(forget_indices)[0]
        other_indices_sorted = torch.sort(other_indices)[0]

        forget_sampled = forget_indices_sorted[:forget_samples]
        other_sampled = other_indices_sorted[:other_samples]

        forget_loader = DataLoader(
            Subset(loader.dataset, forget_sampled),
            batch_size=loader.batch_size,
            shuffle=False,
            num_workers=0,
            pin_memory=True,
        )

        other_loader = DataLoader(
            Subset(loader.dataset, other_sampled),
            batch_size=loader.batch_size,
            shuffle=False,
            num_workers=0,
            pin_memory=True,
        )

        return forget_loader, other_loader

    forget_class_train_loader, other_classes_train_loader = filter_loader(
        train_loader, is_train=True
    )
    forget_class_test_loader, other_classes_test_loader = filter_loader(
        test_loader, is_train=False
    )

    # Load retrain model for additional CKA comparison
    retrain_model = None
    retrain_model_path = f"unlearned_models/{forget_class}/a00{forget_class}.pth"
    retrain_model_loaded = False

    if os.path.exists(retrain_model_path):
        try:
            retrain_model = get_resnet18().to(device)
            retrain_model.load_state_dict(
                torch.load(retrain_model_path, map_location=device)
            )
            retrain_model_loaded = True
            print(f"Loaded retrain model from {retrain_model_path}")
        except Exception as e:
            print(f"Error loading retrain model: {e}")
            retrain_model = None
            retrain_model_loaded = False
    else:
        print(f"Retrain model not found at {retrain_model_path}")
        retrain_model_loaded = False

    dataloaders = [
        forget_class_train_loader,
        other_classes_train_loader,
        forget_class_test_loader,
        other_classes_test_loader,
    ]

    original_results = compute_cka(
        model_before, model_after, dataloaders, layers=detailed_layers, device=device
    )
    retrain_results = compute_cka(
        retrain_model, model_after, dataloaders, layers=detailed_layers, device=device
    )

    def format_cka_results(results):
        if results is None:
            return None
        return [
            [round(float(value), 3) for value in layer_results]
            for layer_results in results.tolist()
        ]

    # Clean up models to free memory
    if retrain_model_loaded and retrain_model is not None:
        del retrain_model
        torch.cuda.empty_cache() if device.type == "cuda" else None

    # Clean up original model
    if model_before is not None:
        del model_before
        torch.cuda.empty_cache() if device.type == "cuda" else None

    return {
        "similarity": {
            "layers": detailed_layers,
            "train": {
                "forget_class": format_cka_results(original_results[0]),
                "other_classes": format_cka_results(original_results[1]),
            },
            "test": {
                "forget_class": format_cka_results(original_results[2]),
                "other_classes": format_cka_results(original_results[3]),
            },
        },
        "similarity_retrain": {
            "layers": detailed_layers,
            "train": {
                "forget_class": format_cka_results(retrain_results[0]),
                "other_classes": format_cka_results(retrain_results[1]),
            },
            "test": {
                "forget_class": format_cka_results(retrain_results[2]),
                "other_classes": format_cka_results(retrain_results[3]),
            },
        }
        if retrain_model_loaded
        else None,
    }
