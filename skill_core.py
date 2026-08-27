# -*- coding: utf-8 -*-
"""Skill 服务与 HTTP 路由。

合并自：skill_service.py、skill_routes.py。
- 被 __init__.py 导入：发现skills / 获取skill / 读取skill正文 / 读取reference / register_routes。
"""
import os
import re
import sys
from typing import Any

# ==================== Skill 服务（原 skill_service.py）====================

SKILLS_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "official_skills")


def _读取文本(path: str) -> str:
    with open(path, "r", encoding="utf-8-sig") as file:
        return file.read()


def _解析前置信息(text: str) -> dict[str, str]:
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end < 0:
        return {}

    values = {}
    lines = text[3:end].splitlines()
    index = 0
    while index < len(lines):
        match = re.match(r"^([\w-]+):\s*(.*)$", lines[index])
        if not match:
            index += 1
            continue
        key, value = match.groups()
        if value in ("|", ">"):
            index += 1
            parts = []
            while index < len(lines) and (not lines[index].strip() or lines[index][:1].isspace()):
                parts.append(lines[index].strip())
                index += 1
            values[key] = " ".join(part for part in parts if part)
            continue
        values[key] = value.strip().strip("\"'")
        index += 1
    return values


def _列出references(skill_dir: str) -> list[str]:
    files = []
    for reference_dir_name in ("references", "reference"):
        reference_dir = os.path.join(skill_dir, reference_dir_name)
        if not os.path.isdir(reference_dir):
            continue
        for root, _, names in os.walk(reference_dir):
            for name in names:
                if os.path.splitext(name)[1].lower() not in (".md", ".txt", ".yaml", ".yml", ".json"):
                    continue
                relative = os.path.relpath(os.path.join(root, name), skill_dir).replace("\\", "/")
                files.append(relative)
    return sorted(files)


def 发现skills() -> list[dict]:
    if not os.path.isdir(SKILLS_DIR):
        return []

    skills = []
    for skill_id in sorted(os.listdir(SKILLS_DIR)):
        if not re.fullmatch(r"[A-Za-z0-9._-]+", skill_id):
            continue
        skill_dir = os.path.join(SKILLS_DIR, skill_id)
        content_path = os.path.join(skill_dir, "SKILL.md")
        if not os.path.isfile(content_path):
            continue
        metadata = _解析前置信息(_读取文本(content_path))
        skills.append(
            {
                "id": skill_id,
                "name": metadata.get("name") or skill_id,
                "description": metadata.get("description") or "",
                "references": _列出references(skill_dir),
            }
        )
    return skills


def 获取skill(skill_id: str) -> dict | None:
    return next((skill for skill in 发现skills() if skill["id"] == skill_id), None)


def 读取skill正文(skill: dict) -> str:
    return _读取文本(os.path.join(SKILLS_DIR, skill["id"], "SKILL.md"))


def 读取reference(skill: dict, relative_path: str) -> str:
    normalized = str(relative_path or "").replace("\\", "/").strip("/")
    if normalized not in skill["references"]:
        raise ValueError(f"Skill reference 不存在：{normalized}")
    skill_dir = os.path.realpath(os.path.join(SKILLS_DIR, skill["id"]))
    path = os.path.realpath(os.path.join(skill_dir, normalized))
    if os.path.commonpath([skill_dir, path]) != skill_dir:
        raise ValueError("Skill reference 路径超出 Skill 目录。")
    return _读取文本(path)


# ==================== HTTP 路由（原 skill_routes.py）====================

_REGISTERED = False


def register_routes() -> None:
    global _REGISTERED
    if _REGISTERED:
        return
    server_module = sys.modules.get("server")
    if server_module is None:
        return
    try:
        from aiohttp import web
    except ImportError:
        return
    PromptServer = getattr(server_module, "PromptServer", None)
    if PromptServer is None:
        return
    prompt_server = getattr(PromptServer, "instance", None)
    if prompt_server is None:
        return

    async def 技能列表(_request: Any) -> Any:
        return web.json_response(发现skills(), headers={"Cache-Control": "no-store"})

    async def 技能内容(request: Any) -> Any:
        skill_id = str(request.query.get("skill") or "").strip()
        skill = 获取skill(skill_id)
        if skill is None:
            return web.json_response({"error": f"找不到技能：{skill_id}"}, status=404)
        return web.json_response({"id": skill["id"], "name": skill["name"], "content": 读取skill正文(skill)})

    try:
        prompt_server.routes.get("/yuan_llama/official_skills")(技能列表)
        prompt_server.routes.get("/yuan_llama/official_skills/content")(技能内容)
    except RuntimeError as exc:
        if "already registered" not in str(exc).lower():
            raise
    _REGISTERED = True


__all__ = ["发现skills", "获取skill", "读取skill正文", "读取reference", "register_routes"]
