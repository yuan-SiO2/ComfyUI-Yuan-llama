from .nodes import (
    API模型加载器,
    提示词增强器,
)

NODE_CLASS_MAPPINGS = {
    "APIModel_Loader": API模型加载器,
    "Prompt_Enhancer": 提示词增强器,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "APIModel_Loader": "API模型加载器",
    "Prompt_Enhancer": "提示词增强器",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
