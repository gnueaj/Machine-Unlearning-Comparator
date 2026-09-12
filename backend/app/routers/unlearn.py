import os
from fastapi import (
    APIRouter, 
    BackgroundTasks, 
    HTTPException, 
    UploadFile, 
    File, 
    Form
)
from pydantic import BaseModel, Field
from app.services import (
	run_unlearning_retrain,
	run_unlearning_RL,
	run_unlearning_GA,
	run_unlearning_FT,
	run_unlearning_GA_FT,
	run_unlearning_GA_SL_FT,
	run_unlearning_GA_SL_FT_V2,
	run_unlearning_SCRUB,
	run_unlearning_SalUn,
	run_unlearning_custom
)
from app.models import UnlearningStatus


router = APIRouter()
status = UnlearningStatus()

class UnlearningRequest(BaseModel):
    # seed: int = UNLEARN_SEED
    batch_size: int = Field(
        default=128, 
        description="Batch size for unlearning"
    )
    learning_rate: float = Field(
        default=0.001, 
        description="Learning rate for unlearning"
    )
    epochs: int = Field(
        default=3, 
        ge=1, 
        description="Number of unlearning epochs"
    )
    forget_class: int = Field(
        default=4, 
        ge=-1, 
        lt=10, 
        description="Class to forget (0-9), -1 for original"
    )
    base_weights: str = Field(
        default="0000.pth", 
        description="Filename of the weights in unlearned_models folder"
    )
    freeze_first_k_layers: int = Field(
        default=0, 
        ge=0, 
        description="Number of first layers to freeze (0-9)"
    )
    reinit_last_k_layers: int = Field(
        default=0, 
        ge=0, 
        description="Number of last layers to reinitialize (0-9)"
    )

def get_base_weights_path(request: UnlearningRequest) -> str:
    name = (
        f"000{request.forget_class}.pth"
        if request.base_weights == "0000.pth"
        else request.base_weights
    )
    path = f"unlearned_models/{request.forget_class}/{name}"
    if not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail=f"Weights '{path}' not found in unlearned_models/ folder",
        )
    return path

@router.post("/unlearn/ga")
async def start_unlearning_ga(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)

    background_tasks.add_task(run_unlearning_GA, request, status, base_weights_path)
    return {"message": "GA Unlearning started"}

@router.post("/unlearn/rl")
async def start_unlearning_rl(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)

    background_tasks.add_task(run_unlearning_RL, request, status, base_weights_path)
    return {"message": "RL Unlearning started"}

@router.post("/unlearn/ft")
async def start_unlearning_ft(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)
    print(f"start unlearning ft with base_weights_path: {base_weights_path}")
    background_tasks.add_task(run_unlearning_FT, request, status, base_weights_path)
    return {"message": "FT Unlearning started"}

@router.post("/unlearn/ga_ft")
async def start_unlearning_ga_ft(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)
    print(f"start unlearning GA+FT with base_weights_path: {base_weights_path}")
    background_tasks.add_task(run_unlearning_GA_FT, request, status, base_weights_path)
    return {"message": "GA+FT Unlearning started"}

@router.post("/unlearn/ga_sl_ft")
async def start_unlearning_ga_sl_ft(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)
    print(f"start unlearning GA+SL+FT with base_weights_path: {base_weights_path}")
    background_tasks.add_task(run_unlearning_GA_SL_FT, request, status, base_weights_path)
    return {"message": "GA+SL+FT Unlearning started"}

@router.post("/unlearn/ga_sl_ft_v2")
async def start_unlearning_ga_sl_ft_v2(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)
    print(f"start unlearning GA+SL+FT V2 with base_weights_path: {base_weights_path}")
    print(f"Layer modifications - Freeze first {request.freeze_first_k_layers} layers, Reinit last {request.reinit_last_k_layers} layers")
    background_tasks.add_task(run_unlearning_GA_SL_FT_V2, request, status, base_weights_path)
    return {"message": "GA+SL+FT V2 Unlearning started"}

@router.post("/unlearn/scrub")
async def start_unlearning_scrub(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)
    print(f"start unlearning SCRUB with base_weights_path: {base_weights_path}")
    background_tasks.add_task(run_unlearning_SCRUB, request, status, base_weights_path)
    return {"message": "SCRUB Unlearning started"}

@router.post("/unlearn/salun")
async def start_unlearning_salun(
    background_tasks: BackgroundTasks,
    request: UnlearningRequest
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    base_weights_path = get_base_weights_path(request)
    print(f"start unlearning SalUn with base_weights_path: {base_weights_path}")
    background_tasks.add_task(run_unlearning_SalUn, request, status, base_weights_path)
    return {"message": "SalUn Unlearning started"}

@router.post("/unlearn/retrain")
async def start_unlearning_retrain(
    request: UnlearningRequest, 
    background_tasks: BackgroundTasks
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()
    background_tasks.add_task(run_unlearning_retrain, request, status)
    return {"message": "Unlearning (retrain) started"}

@router.get("/unlearn/status")
async def get_unlearning_status():
    return {
        "is_unlearning": status.is_unlearning,
        "progress": status.progress,
        "recent_id": status.recent_id,
        "current_epoch": status.current_epoch,
        "total_epochs": status.total_epochs,
        "current_unlearn_loss": round(status.current_unlearn_loss, 3),
        "current_unlearn_accuracy": round(status.current_unlearn_accuracy, 3),
        "p_training_loss": round(status.p_training_loss, 3),
        "p_training_accuracy": round(status.p_training_accuracy, 3),
        "p_test_loss": round(status.p_test_loss, 3),
        "p_test_accuracy": round(status.p_test_accuracy, 3),
        "method": status.method,
        "estimated_time_remaining": round(status.estimated_time_remaining + 30.0, 2) if status.progress != "idle" else 0,
    }

@router.post("/unlearn/custom")
async def start_unlearning_custom(
    background_tasks: BackgroundTasks,
    forget_class: int = Form(..., ge=-1, lt=10),
    weights_file: UploadFile = File(...),
    base_weights: str = Form("0000.pth") # only name of the weights file
):
    if status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="Unlearning is already in progress"
        )
    status.reset()

    weights_filename = f"custom_weights_{weights_file.filename}"
    weights_path = os.path.join('uploaded_models', weights_filename)
    os.makedirs('uploaded_models', exist_ok=True)
    
    with open(weights_path, "wb") as buffer:
        content = await weights_file.read()
        buffer.write(content)
    
    base_weights = f"000{forget_class}.pth" if base_weights == "0000.pth" else base_weights
    background_tasks.add_task(
        run_unlearning_custom, 
        forget_class, 
        status,
        weights_path,
        base_weights
    )
    
    return {"message": "Custom Unlearning started"}

@router.post("/unlearn/cancel")
async def cancel_unlearning():
    if not status.is_unlearning:
        raise HTTPException(
            status_code=400, 
            detail="No unlearning in progress"
        )
    status.cancel_requested = True
    return {
        "message": "Cancellation requested. Unlearning will stop soon."
    }