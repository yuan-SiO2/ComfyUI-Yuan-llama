# -*- coding: utf-8 -*-
import base64
import io
import json
import os
import re
import time

import comfy.model_management as mm
import folder_paths
from PIL import Image

from .yuan_nodes import (
    _QwenStorage,
    _应用qwen38推荐采样,
    _获取qwen38_min_p,
    _调用chat_completion,
    _调用云端chat_completion,
    _清洗think块文本,
    _输出qwen38推理设置日志,
    _重置llm推理状态,
    _缩放图片到最大边,
)
from .skill_core import (
    获取skill as _获取skill,
    读取skill正文 as _读取skill正文,
    读取reference as _读取reference,
)


默认聊天系统提示词 = "你是一个有帮助的AI助手。"
技能标记 = "-skill:"
SKILL状态标记 = re.compile(r"<yuan_skill_state>\s*(\{.*?\})\s*</yuan_skill_state>", re.DOTALL)
SKILL执行协议 = """
你正在通过 ComfyUI 的本地 Skill 执行器工作。严格遵循下方当前 Skill，并遵守以下交互协议：
1. 只完成当前 Skill 能在文本对话中完成的工作。Skill 提到画布、媒体生成、联网工具或 Hub agent 时，不得声称已经执行；应输出对应方案、提示词或说明当前需要连接的 ComfyUI 节点。
2. 信息不足或到达确认门时，先提问并等待用户。每次只推进当前阶段，不得替用户确认。
3. 回复正文之后必须追加一个状态标记，且标记必须是回复的最后内容：
<yuan_skill_state>{"stage":"当前阶段","options":["选项1","选项2"],"load_references":[],"final":false}</yuan_skill_state>
4. 需要用户选择时，options 提供 2 到 6 个可直接作为用户回复的完整选项；开放问题可以使用空数组。
5. Skill 要求读取 reference 时，如果该文件尚未出现在“已加载 references”，必须先把相对路径写入 load_references。执行器会加载文件并让你重新回答，不要猜测文件内容。
6. 只有已经交付当前 Skill 要求的最终文本产物时才设置 final=true。最终产物必须完整写在状态标记之前。
7. 使用简体中文交流和输出；协议字段、H3 固定字段、标签以及用户要求原样保留的内容除外。
""".strip()


def _本地图片文件转data_uri(image_path: str, 最大边长: int) -> str:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"找不到图片文件：{image_path}")
    with Image.open(image_path) as pil:
        if pil.mode != "RGB":
            pil = pil.convert("RGB")
        pil = _缩放图片到最大边(pil, 最大边长)
        buf = io.BytesIO()
        pil.save(buf, format="JPEG", quality=90)
    image_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{image_b64}"


def _规范化图片引用(item) -> dict[str, str] | None:
    if not isinstance(item, dict):
        return None
    filename = os.path.basename(str(item.get("filename") or item.get("name") or "").strip())
    subfolder = str(item.get("subfolder") or "").replace("\\", "/").strip("/")
    image_type = str(item.get("type") or "input").strip().lower()
    if not filename or image_type != "input":
        return None
    if any(part in ("", ".", "..") for part in subfolder.split("/")) and subfolder:
        return None
    return {"filename": filename, "subfolder": subfolder, "type": "input"}


def _解析图片列表(raw_images) -> list[dict[str, str]]:
    if isinstance(raw_images, str):
        if not raw_images.strip():
            return []
        try:
            raw_images = json.loads(raw_images)
        except json.JSONDecodeError as exc:
            raise ValueError(f"待发送图片数据损坏，无法解析：{exc}") from exc
    if not isinstance(raw_images, list):
        return []

    images = []
    for item in raw_images:
        normalized = _规范化图片引用(item)
        if normalized is not None:
            images.append(normalized)
    return images


def _解析对话历史(raw_history: str) -> list[dict]:
    if not raw_history or not raw_history.strip():
        return []

    try:
        data = json.loads(raw_history)
    except json.JSONDecodeError as exc:
        raise ValueError(f"对话历史数据损坏，无法解析：{exc}") from exc

    if not isinstance(data, list):
        raise ValueError("对话历史格式无效，应为消息列表。请在节点中清空会话后重试。")

    history = []
    for item in data:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant") or not isinstance(content, str):
            continue
        content = content.strip()
        if content:
            message = {"role": role, "content": content}
            images = _解析图片列表(item.get("images")) if role == "user" else []
            if images:
                message["images"] = images
            try:
                token_count = int(item.get("token_count"))
            except (TypeError, ValueError):
                token_count = -1
            if token_count >= 0:
                message["token_count"] = token_count
            try:
                created_at = int(item.get("created_at"))
            except (TypeError, ValueError):
                created_at = 0
            if created_at > 0:
                message["created_at"] = created_at
            if role == "assistant" and isinstance(item.get("flow_before"), dict):
                flow_before = item["flow_before"]
                message["flow_before"] = {
                    "skill": str(flow_before.get("skill") or ""),
                    "skill_name": str(flow_before.get("skill_name") or "")[:80],
                    "stage": str(flow_before.get("stage") or "未开始")[:40],
                    "loaded_references": [
                        str(reference)
                        for reference in flow_before.get("loaded_references", [])
                        if isinstance(reference, str)
                    ],
                    "final_result": str(flow_before.get("final_result") or ""),
                }
            history.append(message)

    return history


def _按轮数裁剪(history: list[dict], max_rounds: int) -> list[dict]:
    max_messages = max(1, int(max_rounds)) * 2
    trimmed = history[-max_messages:]
    while trimmed and trimmed[0]["role"] == "assistant":
        trimmed.pop(0)
    return trimmed


def _估算文本token数(llm, text: str) -> int:
    if not text:
        return 0
    try:
        return len(llm.tokenize(text.encode("utf-8"), add_bos=False))
    except Exception:
        return max(1, len(text.encode("utf-8")) // 3)


def _估算单条消息token数(llm, message: dict) -> int:
    return (
        _估算文本token数(llm, str(message.get("content") or ""))
        + 8
        + len(message.get("images") or []) * 2048
    )


def _估算消息token数(llm, messages: list[dict]) -> int:
    return sum(_估算单条消息token数(llm, message) for message in messages) + 16


def _解析请求时间毫秒(request_id: str) -> int:
    now_ms = int(time.time() * 1000)
    try:
        candidate = int(str(request_id or "").split("-", 1)[0])
    except (TypeError, ValueError):
        return now_ms
    if 946684800000 <= candidate <= now_ms + 300000:
        return candidate
    return now_ms


def _解析请求技能(request_id: str) -> str:
    index = str(request_id or "").find(技能标记)
    if index < 0:
        return ""
    return str(request_id)[index + len(技能标记):].strip()


def _计算上下文预算(max_tokens: int, n_ctx: int) -> tuple[int, int]:
    output_reserve = min(max(32, int(max_tokens)), max(32, int(n_ctx) - 512))
    prompt_budget = max(256, int(n_ctx) - output_reserve - 128)
    return output_reserve, prompt_budget


def _按上下文裁剪(
    llm,
    history: list[dict],
    system_text: str,
    user_text: str,
    max_tokens: int,
    n_ctx: int,
    current_image_count: int = 0,
) -> list[dict]:
    # 为模板控制符留出余量；历史始终按完整的一问一答从最旧处删除。
    _output_reserve, prompt_budget = _计算上下文预算(max_tokens, n_ctx)

    prefix = []
    if system_text:
        prefix.append({"role": "system", "content": system_text})
    suffix = [{"role": "user", "content": user_text}]
    if current_image_count > 0:
        suffix[0]["images"] = [{}] * int(current_image_count)

    trimmed = list(history)
    while trimmed and _估算消息token数(llm, prefix + trimmed + suffix) > prompt_budget:
        trimmed.pop(0)
        if trimmed and trimmed[0]["role"] == "assistant":
            trimmed.pop(0)

    required_tokens = _估算消息token数(llm, prefix + trimmed + suffix)
    if required_tokens > prompt_budget:
        raise ValueError(
            f"当前系统提示词和用户消息约需 {required_tokens} tokens，"
            f"超过可用输入上下文 {prompt_budget}。请提高模型上下文长度或使用更短的对话。"
        )

    return trimmed


def _默认流程状态() -> dict:
    return {"skill": "", "skill_name": "", "stage": "未开始", "loaded_references": [], "final_result": ""}


def _解析流程状态(raw_state: str) -> dict:
    state = _默认流程状态()
    if raw_state and str(raw_state).strip():
        try:
            value = json.loads(raw_state)
        except json.JSONDecodeError:
            value = None
        if isinstance(value, dict):
            state["skill"] = str(value.get("skill") or "")
            state["skill_name"] = str(value.get("skill_name") or "")[:80]
            state["stage"] = str(value.get("stage") or "未开始")[:40]
            state["loaded_references"] = [
                str(item) for item in value.get("loaded_references", []) if isinstance(item, str)
            ]
            state["final_result"] = str(value.get("final_result") or "")
    if state["skill"] and not state["skill_name"]:
        skill = _获取skill(state["skill"])
        if skill is not None:
            state["skill_name"] = skill["name"]
    return state


def _解析skill回复(reply: str) -> tuple[str, dict]:
    matches = list(SKILL状态标记.finditer(reply or ""))
    if not matches:
        return (reply or "").strip(), {}
    match = matches[-1]
    try:
        state = json.loads(match.group(1))
    except json.JSONDecodeError:
        return SKILL状态标记.sub("", reply).strip(), {}
    if not isinstance(state, dict):
        state = {}
    text = (reply[: match.start()] + reply[match.end() :]).strip()
    return text, state


def _规范化选项(value) -> list[str]:
    if not isinstance(value, list):
        return []
    options = []
    for item in value[:6]:
        text = str(item or "").strip()
        if text:
            options.append(text[:240])
    return options


def _解析选项JSON(raw_options: str) -> list[str]:
    try:
        return _规范化选项(json.loads(raw_options or "[]"))
    except json.JSONDecodeError:
        return []


def _构建skill系统提示词(system_text: str, skill_id: str, flow_state: dict) -> str:
    skill = _获取skill(skill_id)
    if skill is None:
        raise ValueError(f"找不到技能：{skill_id}，请重新在输入框中用 / 选择技能。")
    content = _读取skill正文(skill).strip()
    if not content:
        return system_text
    loaded = []
    for relative_path in flow_state.get("loaded_references") or []:
        if relative_path not in skill["references"]:
            continue
        loaded.append(
            f"\n\n===== reference: {relative_path} =====\n{_读取reference(skill, relative_path)}"
        )
    catalogue = "\n".join(f"- {path}" for path in skill["references"]) or "- 无"
    loaded_names = "、".join(flow_state.get("loaded_references") or []) or "无"
    parts = [system_text.strip()]
    parts.append(
        f"当前 Skill：{skill['name']} ({skill_id})\n"
        f"当前流程阶段：{flow_state.get('stage') or '未开始'}\n"
        f"可用 references：\n{catalogue}\n"
        f"已加载 references：{loaded_names}\n\n"
        f"===== SKILL.md =====\n{content}"
    )
    parts.extend(loaded)
    parts.append(SKILL执行协议)
    return "\n\n".join(part for part in parts if part)


def _构建上下文状态(
    llm,
    system_text: str,
    history: list[dict],
    max_tokens: int,
    n_ctx: int,
    max_rounds: int,
    trimmed_messages: int = 0,
) -> dict:
    messages = []
    if system_text:
        messages.append({"role": "system", "content": system_text})
    messages.extend(history)
    used_tokens = _估算消息token数(llm, messages)
    output_reserve, prompt_budget = _计算上下文预算(max_tokens, n_ctx)
    percent = (used_tokens / prompt_budget * 100.0) if prompt_budget > 0 else 0.0
    return {
        "used_tokens": int(used_tokens),
        "prompt_budget": int(prompt_budget),
        "context_limit": int(n_ctx),
        "output_reserve": int(output_reserve),
        "remaining_tokens": max(0, int(prompt_budget) - int(used_tokens)),
        "percent": round(percent, 1),
        "trimmed_messages": max(0, int(trimmed_messages)),
        "current_rounds": sum(1 for message in history if message.get("role") == "user"),
        "max_rounds": max(1, int(max_rounds)),
        "estimated": True,
    }


def _同步Qwen模型(qwen_model):
    need_reload = False
    if _QwenStorage.model is None:
        need_reload = True
    elif qwen_model is not _QwenStorage.model:
        if getattr(qwen_model, "config", None) == getattr(_QwenStorage.model, "config", None):
            qwen_model = _QwenStorage.model
        else:
            need_reload = True

    if need_reload:
        config = getattr(qwen_model, "config", None) or {}
        if not config:
            raise RuntimeError("输入的模型对象缺少配置信息，无法自动重载。请先运行“API模型加载器”。")
        _QwenStorage.load(config)
        qwen_model = _QwenStorage.model

    if qwen_model is None:
        raise RuntimeError("模型对象无效，请检查“API模型加载器”的连接。")
    config = getattr(qwen_model, "config", {}) or {}
    if config.get("mode", "local") == "local" and (
        not hasattr(qwen_model, "llm") or qwen_model.llm is None
    ):
        raise RuntimeError("模型对象内部 llm 实例无效，请检查模型文件或重新加载模型。")

    return qwen_model


def _提取回复(result) -> str:
    try:
        content = result["choices"][0]["message"]["content"]
    except Exception:
        return str(result)

    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts)
    return str(content)


def _图片引用转data_uri(image_ref: dict[str, str], max_edge: int) -> str:
    input_root = os.path.realpath(folder_paths.get_input_directory())
    image_path = os.path.realpath(
        os.path.join(input_root, image_ref.get("subfolder", ""), image_ref["filename"])
    )
    try:
        is_inside_input = os.path.commonpath([input_root, image_path]) == input_root
    except ValueError:
        is_inside_input = False
    if not is_inside_input:
        raise ValueError("图片路径超出 ComfyUI input 目录。")
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"找不到对话图片：{image_path}")
    return _本地图片文件转data_uri(image_path, int(max_edge))


def _构建用户内容(text: str, images: list[dict[str, str]], max_edge: int):
    if not images:
        return text
    content = [{"type": "text", "text": text}]
    for image_ref in images:
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": _图片引用转data_uri(image_ref, max_edge)},
            }
        )
    return content


def _构建模型历史(history: list[dict], max_edge: int) -> list[dict]:
    messages = []
    for item in history:
        images = item.get("images") or []
        if item["role"] == "user" and images:
            messages.append({"role": "user", "content": _构建用户内容(item["content"], images, max_edge)})
        else:
            messages.append({"role": item["role"], "content": item["content"]})
    return messages


def _构建返回(
    history: list[dict],
    reply: str,
    *,
    sent: bool = False,
    context_state: dict | None = None,
    flow_state: dict | None = None,
    options=None,
):
    history_json = json.dumps(history, ensure_ascii=False, separators=(",", ":"))
    state = flow_state or _默认流程状态()
    ui = {
        "对话历史JSON": [history_json],
        "助手回复": [reply],
        "流程状态JSON": [json.dumps(state, ensure_ascii=False, separators=(",", ":"))],
        "选项JSON": [json.dumps(_规范化选项(options), ensure_ascii=False)],
        "已发送": [bool(sent)],
    }
    if context_state is not None:
        ui["上下文状态JSON"] = [json.dumps(context_state, ensure_ascii=False, separators=(",", ":"))]
    return {
        "ui": ui,
        "result": (),
    }


class 多轮对话:
    # 采样与处理参数不暴露给用户（同提示词增强器）：内部使用固定默认值，
    # 最大输出长度/输出think块/生成后自动卸载模型 由 API模型加载器 统一管理。
    隐藏最大历史轮数 = 100
    隐藏最大边长 = 1024
    隐藏温度 = 0.7
    隐藏top_p = 0.9
    隐藏top_k = 20
    隐藏重复惩罚 = 1.0
    隐藏频率惩罚 = 0.0
    隐藏存在惩罚 = 0.0

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "API模型": ("QWENLLAMA",),
                "用户消息": ("STRING", {"default": "", "multiline": True}),
                "对话历史JSON": ("STRING", {"default": "[]", "multiline": True}),
                "请求ID": ("STRING", {"default": ""}),
                "当前图片JSON": ("STRING", {"default": "[]", "multiline": True}),
                "流程状态JSON": ("STRING", {"default": "{}", "multiline": True}),
                "选项JSON": ("STRING", {"default": "[]", "multiline": True}),
            },
        }

    RETURN_TYPES = ()
    RETURN_NAMES = ()
    FUNCTION = "run"
    CATEGORY = "Yuan Tool/llama"
    OUTPUT_NODE = True

    def run(
        self,
        API模型,
        用户消息,
        对话历史JSON,
        请求ID,
        当前图片JSON,
        流程状态JSON="{}",
        选项JSON="[]",
    ):
        request_created_at = _解析请求时间毫秒(请求ID)
        max_rounds = int(self.隐藏最大历史轮数)
        max_edge = int(self.隐藏最大边长)
        history = _按轮数裁剪(_解析对话历史(对话历史JSON), max_rounds)
        current_images = _解析图片列表(当前图片JSON)
        user_text = (用户消息 or "").strip()
        flow_state = _解析流程状态(流程状态JSON)
        flow_state_before = {
            **flow_state,
            "loaded_references": list(flow_state["loaded_references"]),
        }
        options_before = _解析选项JSON(选项JSON)

        # 无新消息时（节点空跑/重放）仅回显上一轮结果与选项
        if not user_text:
            last_reply = next(
                (item["content"] for item in reversed(history) if item["role"] == "assistant"),
                "",
            )
            return _构建返回(
                history,
                last_reply,
                flow_state=flow_state,
                options=options_before,
            )

        qwen_model = _同步Qwen模型(API模型)
        config = getattr(qwen_model, "config", {}) or {}
        云端模式 = config.get("mode", "local") != "local"
        llm = qwen_model.llm if hasattr(qwen_model, "llm") else None

        # 采样参数固定默认值；最大输出长度/输出think块 从 API模型加载器 配置读取
        max_tokens = int(config.get("最大输出长度", 1024))
        输出think块 = bool(config.get("输出think块", False))
        温度 = float(self.隐藏温度)
        top_p = float(self.隐藏top_p)
        top_k = int(self.隐藏top_k)
        重复惩罚 = float(self.隐藏重复惩罚)
        频率惩罚 = float(self.隐藏频率惩罚)
        存在惩罚 = float(self.隐藏存在惩罚)

        for history_item in history:
            if "token_count" not in history_item:
                history_item["token_count"] = _估算单条消息token数(llm, history_item)
        history_image_count = sum(len(item.get("images") or []) for item in history)
        if (history_image_count or current_images) and not 云端模式:
            chat_handler = getattr(llm, "chat_handler", None) if llm is not None else None
            if chat_handler is None:
                raise RuntimeError("图片对话需要加载对应的视觉投影 mmproj。")

        # 技能解析：优先沿用流程状态中的技能；请求里带了新的 -skill: 则切换并重置流程
        system_text = 默认聊天系统提示词
        skill = None
        skill_id = str(flow_state.get("skill") or "").strip()
        requested_skill = _解析请求技能(请求ID)
        if requested_skill and requested_skill != skill_id:
            skill_id = requested_skill
            flow_state = _默认流程状态()
        if skill_id:
            flow_state["skill"] = skill_id
            skill = _获取skill(skill_id)
            if skill is None:
                raise ValueError(f"找不到技能：{skill_id}，请重新在输入框中用 / 选择技能。")
            flow_state["skill_name"] = skill["name"]
            system_text = _构建skill系统提示词(system_text, skill_id, flow_state)

        n_ctx = int(config.get("n_ctx", 8192))
        history_before_context_trim = len(history)
        history = _按上下文裁剪(
            llm,
            history,
            system_text,
            user_text,
            max_tokens,
            n_ctx,
            current_image_count=len(current_images),
        )
        trimmed_message_count = history_before_context_trim - len(history)

        if 云端模式:
            chat_url = config.get("chat_url")
            api_key = config.get("api_key")
            cloud_model = config.get("cloud_model")
            if not chat_url or not api_key or not cloud_model:
                raise RuntimeError("云端模式缺少服务商配置，请重新运行“API模型加载器”。")
            params = {
                "max_tokens": max_tokens,
                "temperature": 温度,
                "top_p": top_p,
            }
        else:
            effective_temperature, effective_top_p, effective_top_k = _应用qwen38推荐采样(
                qwen_model,
                温度,
                top_p,
                top_k,
            )
            _输出qwen38推理设置日志(qwen_model)
            params = {
                "max_tokens": max_tokens,
                "temperature": effective_temperature,
                "top_p": effective_top_p,
                "top_k": effective_top_k,
                "repeat_penalty": 重复惩罚,
                "frequency_penalty": 频率惩罚,
                "presence_penalty": 存在惩罚,
                "stream": False,
                "stop": ["</s>"],
            }
            qwen38_min_p = _获取qwen38_min_p(qwen_model)
            if qwen38_min_p is not None:
                params["min_p"] = qwen38_min_p

        # 两次机会：模型要求加载 references 时，加载后重建提示词并重试一次
        reply = ""
        skill_state = {}
        for attempt in range(2):
            messages = []
            if system_text:
                messages.append({"role": "system", "content": system_text})
            messages.extend(_构建模型历史(history, max_edge))
            messages.append({"role": "user", "content": _构建用户内容(user_text, current_images, max_edge)})

            if 云端模式:
                reply_text = _调用云端chat_completion(
                    chat_url=chat_url,
                    api_key=api_key,
                    model=cloud_model,
                    messages=messages,
                    params=params,
                )
            else:
                _重置llm推理状态(llm)
                result = _调用chat_completion(llm, messages=messages, params=params)
                reply_text = _提取回复(result)

            if not 输出think块:
                reply_text = _清洗think块文本(reply_text)
            reply, skill_state = _解析skill回复(reply_text.lstrip().removeprefix(": ").strip())
            if skill is None:
                break
            requested = []
            for item in skill_state.get("load_references", []):
                if (
                    isinstance(item, str)
                    and item in skill["references"]
                    and item not in flow_state["loaded_references"]
                ):
                    requested.append(item)
            if not requested or attempt == 1:
                break
            flow_state["loaded_references"].extend(requested)
            system_text = _构建skill系统提示词(默认聊天系统提示词, skill_id, flow_state)
            history_before_reference_trim = len(history)
            history = _按上下文裁剪(
                llm,
                history,
                system_text,
                user_text,
                max_tokens,
                n_ctx,
                current_image_count=len(current_images),
            )
            trimmed_message_count += history_before_reference_trim - len(history)

        if mm.processing_interrupted():
            raise mm.InterruptProcessingException()

        user_history_item = {
            "role": "user",
            "content": user_text,
            "created_at": request_created_at,
        }
        if current_images:
            user_history_item["images"] = current_images
        user_history_item["token_count"] = _估算单条消息token数(llm, user_history_item)
        assistant_history_item = {
            "role": "assistant",
            "content": reply,
            "flow_before": flow_state_before,
            "token_count": _估算单条消息token数(llm, {"role": "assistant", "content": reply}),
            "created_at": int(time.time() * 1000),
        }
        for history_item in history:
            history_item.pop("flow_before", None)
        history.extend([user_history_item, assistant_history_item])
        history = _按轮数裁剪(history, max_rounds)

        if skill is not None:
            flow_state["stage"] = str(skill_state.get("stage") or flow_state.get("stage") or "进行中")[:40]
            options = _规范化选项(skill_state.get("options"))
            if bool(skill_state.get("final")):
                flow_state["final_result"] = reply
        else:
            options = []

        context_state = _构建上下文状态(
            llm,
            system_text,
            history,
            max_tokens,
            n_ctx,
            max_rounds,
            trimmed_messages=trimmed_message_count,
        )
        if bool(config.get("生成后自动卸载模型")):
            _QwenStorage.unload()
        return _构建返回(
            history,
            reply,
            sent=True,
            context_state=context_state,
            flow_state=flow_state,
            options=options,
        )
