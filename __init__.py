from .yuan_nodes import (
    API模型加载器,
    提示词增强器,
)
from .multi_turn_chat import 多轮对话
from .skill_core import register_routes

register_routes()

NODE_CLASS_MAPPINGS = {
    "APIModel_Loader": API模型加载器,
    "Prompt_Enhancer": 提示词增强器,
    "MultiTurnChat": 多轮对话,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "APIModel_Loader": "API模型加载器",
    "Prompt_Enhancer": "提示词增强器",
    "MultiTurnChat": "多轮对话",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
