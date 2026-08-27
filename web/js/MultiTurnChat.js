const { app } = window.comfyAPI.app;
const { api } = window.comfyAPI.api;

const NODE_CLASS = "MultiTurnChat";
const CHAT_MIN_HEIGHT = 320;
const CHAT_NODE_CHROME_HEIGHT = 78;
const CHAT_WIDGET_PADDING = 10;
// 用户输入框最大高度占聊天区总高度的比例
const INPUT_MAX_RATIO = 0.4;

function injectStyles() {
    if (document.getElementById("yuan-mt-chat-styles")) return;

    const style = document.createElement("style");
    style.id = "yuan-mt-chat-styles";
    style.textContent = `
        .yuan-mt-chat {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            min-height: 320px;
            color: #e6e6e9;
            background: #1b1b1d;
            background-image: radial-gradient(#26262a 1px, transparent 1px);
            background-size: 12px 12px;
            border-radius: 8px;
            overflow: hidden;
            font: 13px/1.45 "PingFang SC", "Microsoft YaHei", "Segoe UI", Arial, sans-serif;
        }
        .yuan-mt-chat__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex: 0 0 auto;
            min-height: 34px;
            padding: 0 10px;
            background: #222226;
            border-bottom: 1px solid #333338;
        }
        .yuan-mt-chat__header-left {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
        }
        .yuan-mt-chat__title {
            color: #e8e8ea;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
        }
        .yuan-mt-chat__clear {
            padding: 3px 10px;
            color: #ffffff;
            background: #e84c4c;
            border: 0;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
        }
        .yuan-mt-chat__clear:hover:not(:disabled) {
            background: #f25c5c;
        }
        .yuan-mt-chat__clear:disabled {
            cursor: default;
            opacity: 0.5;
        }
        .yuan-mt-chat__context {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .yuan-mt-chat__context-ring {
            position: relative;
            display: grid;
            width: 26px;
            height: 26px;
            flex: 0 0 26px;
            place-items: center;
            border-radius: 50%;
            background: conic-gradient(#07c160 0deg, #3a3a40 0deg);
        }
        .yuan-mt-chat__context-ring::after {
            position: absolute;
            inset: 3px;
            content: "";
            border-radius: 50%;
            background: #222226;
        }
        .yuan-mt-chat__context-percent {
            position: relative;
            z-index: 1;
            color: #c8c8cc;
            font-size: 8px;
            font-weight: 700;
        }
        .yuan-mt-chat__context-meta {
            display: flex;
            flex-direction: column;
            min-width: 0;
            line-height: 1.15;
            text-align: right;
        }
        .yuan-mt-chat__context-tokens {
            color: #a0a0a6;
            font-size: 10px;
            white-space: nowrap;
        }
        .yuan-mt-chat__context-rounds {
            color: #7a7a80;
            font-size: 9px;
            white-space: nowrap;
        }
        .yuan-mt-chat__messages {
            flex: 1 1 auto;
            min-height: 0;
            overflow-y: auto;
            padding: 6px 0 10px;
            scrollbar-width: thin;
        }
        .yuan-mt-chat__empty {
            display: grid;
            height: 100%;
            place-items: center;
            color: #66666c;
            font-size: 13px;
        }
        .yuan-mt-chat__row {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            padding: 6px 10px;
        }
        .yuan-mt-chat__row--user {
            justify-content: flex-end;
        }
        .yuan-mt-chat__avatar {
            display: grid;
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            place-items: center;
            border-radius: 6px;
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
        }
        .yuan-mt-chat__avatar--assistant {
            background: linear-gradient(135deg, #07c160, #05914f);
        }
        .yuan-mt-chat__avatar--user {
            background: linear-gradient(135deg, #5aa7f5, #3b82f6);
        }
        .yuan-mt-chat__col {
            display: flex;
            flex-direction: column;
            min-width: 0;
            max-width: 78%;
        }
        .yuan-mt-chat__row--user .yuan-mt-chat__col {
            align-items: flex-end;
        }
        .yuan-mt-chat__bubble {
            padding: 8px 10px;
            background: #2e2e33;
            border-radius: 2px 10px 10px 10px;
            box-shadow: 0 1px 1px rgba(0, 0, 0, 0.25);
            overflow-wrap: anywhere;
            white-space: pre-wrap;
        }
        .yuan-mt-chat__row--user .yuan-mt-chat__bubble {
            background: #3f6d50;
            border-radius: 10px 2px 10px 10px;
        }
        .yuan-mt-chat__message-content {
            min-width: 0;
            font-size: 14px;
            line-height: 1.55;
            color: #e6e6e9;
        }
        .yuan-mt-chat__row--user .yuan-mt-chat__message-content {
            color: #e9f5ec;
        }
        .yuan-mt-chat__code {
            overflow-x: auto;
            margin: 6px 0 2px;
            padding: 8px 10px;
            color: #e6edf3;
            background: #0e1013;
            border: 1px solid #3a3d42;
            border-radius: 6px;
            white-space: pre;
            scrollbar-width: thin;
            font: 12px/1.5 Consolas, "Courier New", monospace;
        }
        .yuan-mt-chat__code-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            min-height: 20px;
            margin: -2px -3px 5px;
        }
        .yuan-mt-chat__code-language {
            color: #8f9aa6;
            font: 10px/1.2 Arial, sans-serif;
        }
        .yuan-mt-chat__code-copy {
            width: 22px;
            height: 20px;
            padding: 0;
            color: #aeb4bd;
            background: transparent;
            border: 0;
            border-radius: 4px;
            cursor: pointer;
            font: 15px/20px Arial, sans-serif;
        }
        .yuan-mt-chat__code-copy:hover {
            color: #ffffff;
            background: #3b3e43;
        }
        .yuan-mt-chat__meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            width: 100%;
            margin-top: 2px;
            color: #808086;
            font-size: 10px;
        }
        .yuan-mt-chat__meta-left {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
            overflow: hidden;
            white-space: nowrap;
        }
        .yuan-mt-chat__meta-time {
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .yuan-mt-chat__meta-right {
            display: flex;
            align-items: center;
            flex: 0 0 auto;
        }
        .yuan-mt-chat__meta-btn {
            padding: 0 2px;
            color: #8a8a90;
            background: transparent;
            border: 0;
            cursor: pointer;
            font-size: 10px;
        }
        .yuan-mt-chat__meta-btn:hover {
            color: #d0d0d4;
        }
        .yuan-mt-chat__meta-btn--recall {
            color: #e89292;
        }
        .yuan-mt-chat__meta-btn--recall:hover {
            color: #f25c5c;
        }
        /* Skill 流程状态栏与可点击选项 */
        .yuan-mt-chat__flow {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 0 0 auto;
            min-height: 22px;
            padding: 2px 10px 0;
            color: #9a9aa0;
            font-size: 10px;
        }
        .yuan-mt-chat__stage {
            max-width: 120px;
            overflow: hidden;
            padding: 2px 6px;
            color: #f4c982;
            background: #332b1d;
            border: 1px solid #765d32;
            border-radius: 4px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .yuan-mt-chat__skill-label {
            flex: 1 1 auto;
            min-width: 0;
            overflow: hidden;
            color: #8fe0b8;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .yuan-mt-chat__options {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            flex: 0 0 auto;
            padding: 0 10px;
        }
        .yuan-mt-chat__options:empty {
            display: none;
        }
        .yuan-mt-chat__option {
            max-width: 100%;
            min-height: 26px;
            padding: 3px 9px;
            color: #e5edf6;
            background: #303d4b;
            border: 1px solid #4b657d;
            border-radius: 5px;
            cursor: pointer;
            font: inherit;
            font-size: 12px;
            text-align: left;
            overflow-wrap: anywhere;
        }
        .yuan-mt-chat__option:hover:not(:disabled) {
            background: #3c5268;
        }
        .yuan-mt-chat__option:disabled {
            cursor: default;
            opacity: 0.55;
        }
        .yuan-mt-chat__composer {
            position: relative;
            display: flex;
            align-items: flex-end;
            gap: 8px;
            flex: 0 0 auto;
            padding: 8px 10px;
            background: #222226;
            border-top: 1px solid #333338;
        }
        .yuan-mt-chat__input-wrap {
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
            gap: 4px;
            min-width: 0;
        }
        .yuan-mt-chat__input-resize {
            flex: 0 0 auto;
            height: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: ns-resize;
            user-select: none;
            touch-action: none;
        }
        .yuan-mt-chat__input-resize::before {
            content: "";
            width: 36px;
            height: 3px;
            border-radius: 2px;
            background: #4a4a50;
        }
        .yuan-mt-chat__input-resize:hover::before,
        .yuan-mt-chat__input-resize.resizing::before {
            background: #7cc4ff;
        }
        .yuan-mt-chat__attachments {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
        }
        .yuan-mt-chat__attachments:empty {
            display: none;
        }
        .yuan-mt-chat__attachment {
            position: relative;
            display: inline-block;
            width: 56px;
            height: 42px;
            padding: 0;
            background: #263c33;
            border: 1px solid #416957;
            border-radius: 6px;
            overflow: hidden;
            cursor: grab;
        }
        .yuan-mt-chat__attachment.dragging {
            opacity: 0.45;
        }
        .yuan-mt-chat__attachment.drag-over {
            border-color: #07c160;
            box-shadow: 0 0 0 1px #07c160;
        }
        .yuan-mt-chat__attachment img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .yuan-mt-chat__attachment-index {
            position: absolute;
            left: 2px;
            bottom: 2px;
            padding: 0 3px;
            background: rgba(0, 0, 0, 0.55);
            border-radius: 3px;
            color: #ffffff;
            font-size: 10px;
            line-height: 14px;
        }
        .yuan-mt-chat__attachment-remove {
            position: absolute;
            top: 0;
            right: 0;
            width: 16px;
            height: 16px;
            padding: 0;
            background: rgba(0, 0, 0, 0.5);
            border: 0;
            border-radius: 0 0 0 4px;
            color: #ffffff;
            cursor: pointer;
            font-size: 12px;
            line-height: 14px;
        }
        .yuan-mt-chat__attachment-remove:hover {
            background: rgba(232, 76, 76, 0.8);
        }
        /* 用户消息图像卡牌徽标：多图堆叠成手持卡牌状，点击预览 */
        .yuan-mt-chat__images-badge {
            position: relative;
            display: inline-flex;
            flex: 0 0 auto;
            width: 44px;
            height: 34px;
            margin-top: 3px;
            padding: 0;
            background: transparent;
            border: 0;
            cursor: pointer;
        }
        .yuan-mt-chat__images-badge-thumb {
            position: absolute;
            bottom: 2px;
            left: 50%;
            width: 30px;
            height: 24px;
            margin-left: -15px;
            object-fit: cover;
            background: #0e0e10;
            border: 1px solid #4a4a50;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
            transform-origin: 50% 100%;
        }
        .yuan-mt-chat__images-badge-count {
            position: absolute;
            top: 0;
            right: 0;
            padding: 0 4px;
            color: #ff5252;
            background: rgba(0, 0, 0, 0.55);
            border-radius: 4px;
            font-size: 11px;
            font-weight: 800;
            line-height: 15px;
            pointer-events: none;
        }
        /* 图像预览灯箱：挂在 document.body，全屏查看发送的图片 */
        .yuan-mt-chat__lightbox {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: grid;
            place-items: center;
            padding: 48px;
            background: rgba(0, 0, 0, 0.78);
            box-sizing: border-box;
        }
        .yuan-mt-chat__lightbox-frame {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            max-width: 100%;
            max-height: 100%;
        }
        .yuan-mt-chat__lightbox-img {
            display: block;
            max-width: 88vw;
            max-height: 80vh;
            object-fit: contain;
            background: #0e0e10;
            border: 1px solid #3a3a40;
            border-radius: 6px;
            box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
        }
        .yuan-mt-chat__lightbox-caption {
            color: #c8c8cc;
            font-size: 12px;
        }
        .yuan-mt-chat__lightbox-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 36px;
            height: 36px;
            padding: 0;
            color: #e6e6e9;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #4a4a50;
            border-radius: 50%;
            cursor: pointer;
            font-size: 22px;
            line-height: 34px;
        }
        .yuan-mt-chat__lightbox-close:hover {
            background: rgba(232, 76, 76, 0.8);
        }
        .yuan-mt-chat__lightbox-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 56px;
            padding: 0;
            color: #ffffff;
            background: rgba(0, 0, 0, 0.45);
            border: 1px solid #4a4a50;
            border-radius: 8px;
            cursor: pointer;
            font-size: 26px;
            line-height: 52px;
        }
        .yuan-mt-chat__lightbox-nav:hover {
            background: rgba(0, 0, 0, 0.7);
        }
        .yuan-mt-chat__lightbox-nav--prev {
            left: 16px;
        }
        .yuan-mt-chat__lightbox-nav--next {
            right: 16px;
        }
        .yuan-mt-chat__at-panel {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 58px;
            display: none;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px;
            background: #26262a;
            border: 1px solid #3a3a40;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 10;
        }
        .yuan-mt-chat__at-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            padding: 4px;
            background: transparent;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            color: #cccccc;
            font-size: 10px;
        }
        .yuan-mt-chat__at-item:hover {
            background: #333338;
        }
        .yuan-mt-chat__at-item img {
            width: 56px;
            height: 42px;
            object-fit: cover;
            border: 1px solid #44444c;
            border-radius: 4px;
        }
        .yuan-mt-chat__at-hint {
            padding: 6px 12px;
            color: #8a8a90;
            font-size: 11px;
        }
        .yuan-mt-chat__skill-panel {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 58px;
            display: none;
            flex-direction: column;
            gap: 4px;
            max-height: 220px;
            padding: 6px;
            overflow-y: auto;
            background: #26262a;
            border: 1px solid #3a3a40;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 10;
        }
        .yuan-mt-chat__skill-item {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
            padding: 7px 9px;
            background: transparent;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
            color: #cccccc;
            font-size: 11px;
            text-align: left;
        }
        .yuan-mt-chat__skill-item:hover {
            background: #333338;
        }
        .yuan-mt-chat__skill-name {
            color: #8fe0b8;
            font-size: 12px;
            font-weight: 600;
        }
        .yuan-mt-chat__skill-desc {
            color: #8a8a90;
            font-size: 10px;
        }
        .yuan-mt-chat__skill-empty {
            padding: 10px;
            color: #8a8a90;
            font-size: 11px;
        }
        .yuan-mt-chat__skill-token {
            display: inline-flex;
            align-items: center;
            margin: 0 2px;
            padding: 0 6px;
            background: #1e3a5f;
            color: #7cc4ff;
            border: 1px solid #3d6fa5;
            border-radius: 4px;
            font-size: 11px;
            line-height: 1.6;
            white-space: nowrap;
            vertical-align: middle;
            user-select: none;
            cursor: default;
        }
        .yuan-mt-chat__at-token {
            display: inline-flex;
            align-items: center;
            margin: 0 2px;
            padding: 0 6px;
            background: #5a4a1e;
            color: #ffd166;
            border: 1px solid #a5823d;
            border-radius: 4px;
            font-size: 11px;
            line-height: 1.6;
            white-space: nowrap;
            vertical-align: middle;
            user-select: none;
            cursor: default;
        }
        .yuan-mt-chat__input {
            box-sizing: border-box;
            width: 100%;
            min-height: 38px;
            padding: 8px 10px;
            color: #e8e8ea;
            background: #2c2c31;
            border: 1px solid #3a3a40;
            border-radius: 8px;
            outline: none;
            font: inherit;
            line-height: 1.4;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .yuan-mt-chat__input:focus {
            border-color: #07c160;
        }
        .yuan-mt-chat__input:empty::before {
            content: attr(data-placeholder);
            color: #66666c;
            pointer-events: none;
        }
        .yuan-mt-chat__icon {
            display: grid;
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            place-items: center;
            background: #2c2c31;
            border: 1px solid #3a3a40;
            border-radius: 50%;
            color: #a0a0a6;
            font-size: 20px;
            cursor: pointer;
        }
        .yuan-mt-chat__icon:hover:not(:disabled) {
            background: #34343a;
        }
        .yuan-mt-chat__icon:disabled {
            cursor: default;
            opacity: 0.5;
        }
        .yuan-mt-chat__send {
            min-width: 58px;
            height: 38px;
            flex: 0 0 auto;
            padding: 0 12px;
            background: #07c160;
            border: 0;
            border-radius: 8px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
        }
        .yuan-mt-chat__send:hover:not(:disabled) {
            background: #06ad56;
        }
        .yuan-mt-chat__send:disabled {
            cursor: default;
            opacity: 0.5;
        }
        .yuan-mt-chat__footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex: 0 0 auto;
            min-height: 20px;
            padding: 0 10px 6px;
            background: #222226;
            color: #9a9aa0;
            font-size: 10px;
        }
        .yuan-mt-chat__status {
            flex: 0 0 auto;
            color: #9a9aa0;
            font-size: 10px;
        }
        .yuan-mt-chat__status[data-state="busy"] {
            color: #07c160;
        }
        .yuan-mt-chat__status[data-state="error"] {
            color: #e84c4c;
        }
    `;
    document.head.appendChild(style);
}

function firstValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parseHistory(raw) {
    try {
        const value = JSON.parse(raw || "[]");
        if (!Array.isArray(value)) return [];
        return value.filter((item) =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
        );
    } catch (_) {
        return [];
    }
}

function parseImages(raw) {
    try {
        const value = JSON.parse(raw || "[]");
        if (!Array.isArray(value)) return [];
        return value.filter((item) =>
            item &&
            typeof (item.filename ?? item.name) === "string" &&
            (item.filename ?? item.name)
        ).map((item) => ({
            filename: item.filename ?? item.name,
            subfolder: item.subfolder || "",
            type: "input",
        }));
    } catch (_) {
        return [];
    }
}

function parseContextState(raw) {
    if (raw && typeof raw === "object") return raw;
    try {
        const value = JSON.parse(raw || "{}");
        return value && typeof value === "object" ? value : {};
    } catch (_) {
        return {};
    }
}

function parseFlowState(raw) {
    try {
        const value = JSON.parse(raw || "{}");
        return value && typeof value === "object" ? value : {};
    } catch (_) {
        return {};
    }
}

function parseOptions(raw) {
    try {
        const value = JSON.parse(raw || "[]");
        return Array.isArray(value)
            ? value.filter((item) => typeof item === "string" && item.trim())
            : [];
    } catch (_) {
        return [];
    }
}

function formatTokenCount(value) {
    const tokens = Math.max(0, Number(value) || 0);
    if (tokens < 1000) return String(Math.round(tokens));
    const scaled = tokens / 1000;
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}k`;
}

function formatMessageTime(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (part) => String(part).padStart(2, "0");
    const now = new Date();
    const sameDay =
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();
    const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    return sameDay ? clock : `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock.slice(0, 5)}`;
}

function buildImageUrl(ref) {
    const filename = ref?.filename ?? ref?.name ?? "";
    if (!filename) return "";
    const type = ref?.type || "input";
    let url = `/view?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}`;
    if (ref?.subfolder) url += `&subfolder=${encodeURIComponent(ref.subfolder)}`;
    return url;
}

function addClass(element, cls) {
    const names = String(element.className || "").split(/\s+/).filter(Boolean);
    if (!names.includes(cls)) names.push(cls);
    element.className = names.join(" ");
}

function removeClass(element, cls) {
    const names = String(element.className || "")
        .split(/\s+/)
        .filter(Boolean)
        .filter((name) => name !== cls);
    element.className = names.join(" ");
}

async function uploadChatImage(file, index) {
    const safeName = String(file.name || "image.png").replace(/[^a-zA-Z0-9._-]+/g, "_");
    const uploadName = `yuan_chat_${Date.now()}_${index}_${safeName}`;
    const body = new FormData();
    body.append("image", file, uploadName);
    body.append("type", "input");
    body.append("subfolder", "yuan_chat");
    body.append("overwrite", "false");

    const response = await api.fetchApi("/upload/image", { method: "POST", body });
    if (!response?.ok) throw new Error(`图片上传失败 (${response?.status || "unknown"})`);
    const result = await response.json();
    return {
        filename: result.name || uploadName,
        subfolder: result.subfolder || "yuan_chat",
        type: "input",
    };
}

function hideBackendWidget(widget) {
    if (!widget) return;
    widget.type = `converted-widget:yuan-mt-chat-${widget.name}`;
    widget.computeSize = () => [0, -4];
    widget.serializeValue = async () => widget.value;
    if (widget.inputEl) widget.inputEl.style.display = "none";
    if (widget.element) widget.element.style.display = "none";
}

function createElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    if (text) element.textContent = text;
    return element;
}

function createMessageContent(text, onCopy) {
    const content = createElement("div", "yuan-mt-chat__message-content");
    const source = String(text || "");
    const fence = /```([^\n`]*)\n([\s\S]*?)```/g;
    let cursor = 0;
    let match;

    while ((match = fence.exec(source)) !== null) {
        if (match.index > cursor) content.append(document.createTextNode(source.slice(cursor, match.index)));
        const pre = createElement("pre", "yuan-mt-chat__code");
        const language = match[1].trim();
        const codeText = match[2].replace(/\n$/, "");
        const codeHeader = createElement("div", "yuan-mt-chat__code-header");
        if (language) codeHeader.append(createElement("span", "yuan-mt-chat__code-language", language));
        const copyCodeButton = createElement("button", "yuan-mt-chat__code-copy", "⧉");
        copyCodeButton.type = "button";
        copyCodeButton.title = "复制代码块";
        copyCodeButton.setAttribute("aria-label", "复制代码块");
        copyCodeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            onCopy?.(codeText);
        });
        codeHeader.append(copyCodeButton);
        pre.append(codeHeader);
        const code = document.createElement("code");
        code.textContent = codeText;
        pre.append(code);
        content.append(pre);
        cursor = fence.lastIndex;
    }

    if (cursor < source.length) content.append(document.createTextNode(source.slice(cursor)));
    return content;
}

function isPromptLink(value, output) {
    if (!Array.isArray(value) || value.length !== 2) return false;
    const sourceId = value[0];
    const outputSlot = value[1];
    const validSource =
        typeof sourceId === "number" ||
        (typeof sourceId === "string" && /^\d+$/.test(sourceId));
    return (
        validSource &&
        typeof outputSlot === "number" &&
        Number.isFinite(outputSlot) &&
        Boolean(output?.[String(sourceId)] ?? output?.[Number(sourceId)])
    );
}

function collectPromptLinks(value, output, result = new Set()) {
    if (isPromptLink(value, output)) {
        result.add(String(value[0]));
        return result;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectPromptLinks(item, output, result);
    } else if (value && typeof value === "object") {
        for (const item of Object.values(value)) collectPromptLinks(item, output, result);
    }
    return result;
}

async function buildChatOnlyPrompt(node) {
    const prompt = await app.graphToPrompt();
    const output = prompt?.output;
    const targetId = String(node.id);
    if (!output || !(output[targetId] ?? output[Number(targetId)])) {
        throw new Error("当前聊天节点不在可执行提示中，请检查模型连接。");
    }

    const keep = new Set();
    const addWithAncestors = (nodeId) => {
        const id = String(nodeId);
        if (keep.has(id)) return;
        const apiNode = output[id] ?? output[Number(id)];
        if (!apiNode) return;
        keep.add(id);
        for (const sourceId of collectPromptLinks(apiNode.inputs || {}, output)) {
            addWithAncestors(sourceId);
        }
    };
    addWithAncestors(targetId);

    const scopedOutput = {};
    for (const [id, apiNode] of Object.entries(output)) {
        if (keep.has(String(id))) scopedOutput[id] = apiNode;
    }
    prompt.output = scopedOutput;
    return prompt;
}

function setupChatNode(node) {
    injectStyles();
    node.properties ||= {};

    // 节点尺寸边界：宽高均可自由调节，超出最小/最大边界时自动收拢
    const MIN_NODE_WIDTH = 360;
    const MAX_NODE_WIDTH = 1920;
    const MIN_NODE_HEIGHT = 420;
    const MAX_NODE_HEIGHT = 2700;
    const clampNodeSize = () => {
        if (!node.size) return;
        const width = Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, node.size[0]));
        const height = Math.max(MIN_NODE_HEIGHT, Math.min(MAX_NODE_HEIGHT, node.size[1]));
        if (width !== node.size[0] || height !== node.size[1]) {
            node.size = [width, height];
            return true;
        }
        return false;
    };

    const userWidget = node.widgets?.find((widget) => widget.name === "用户消息");
    const historyWidget = node.widgets?.find((widget) => widget.name === "对话历史JSON");
    const requestWidget = node.widgets?.find((widget) => widget.name === "请求ID");
    const currentImagesWidget = node.widgets?.find((widget) => widget.name === "当前图片JSON");
    if (!userWidget || !historyWidget || !requestWidget || !currentImagesWidget || typeof node.addDOMWidget !== "function") return;

    hideBackendWidget(userWidget);
    hideBackendWidget(historyWidget);
    hideBackendWidget(requestWidget);
    hideBackendWidget(currentImagesWidget);
    const flowWidget = node.widgets?.find((widget) => widget.name === "流程状态JSON");
    if (flowWidget) hideBackendWidget(flowWidget);
    const optionsWidget = node.widgets?.find((widget) => widget.name === "选项JSON");
    if (optionsWidget) hideBackendWidget(optionsWidget);

    const root = createElement("div", "yuan-mt-chat");
    const header = createElement("div", "yuan-mt-chat__header");
    const headerLeft = createElement("div", "yuan-mt-chat__header-left");
    const headerTitle = createElement("span", "yuan-mt-chat__title", "多轮对话");
    const clearButton = createElement("button", "yuan-mt-chat__clear", "清空会话");
    const contextMeter = createElement("div", "yuan-mt-chat__context");
    const contextRing = createElement("div", "yuan-mt-chat__context-ring");
    const contextPercent = createElement("span", "yuan-mt-chat__context-percent", "--");
    const contextMeta = createElement("div", "yuan-mt-chat__context-meta");
    const contextTokens = createElement("span", "yuan-mt-chat__context-tokens", "已用约 --");
    const contextRounds = createElement("span", "yuan-mt-chat__context-rounds", "轮数 --/--");
    const messages = createElement("div", "yuan-mt-chat__messages");
    const flowBar = createElement("div", "yuan-mt-chat__flow");
    const stageLabel = createElement("span", "yuan-mt-chat__stage", "未开始");
    const skillLabel = createElement("span", "yuan-mt-chat__skill-label", "普通对话");
    const optionsRow = createElement("div", "yuan-mt-chat__options");
    const composer = createElement("div", "yuan-mt-chat__composer");
    const imageButton = createElement("button", "yuan-mt-chat__icon", "+");
    const inputWrap = createElement("div", "yuan-mt-chat__input-wrap");
    const attachments = createElement("div", "yuan-mt-chat__attachments");
    const atPanel = createElement("div", "yuan-mt-chat__at-panel");
    const skillPanel = createElement("div", "yuan-mt-chat__skill-panel");
    const input = createElement("div", "yuan-mt-chat__input");
    input.contentEditable = "true";
    const sendButton = createElement("button", "yuan-mt-chat__send", "发送");
    const footer = createElement("div", "yuan-mt-chat__footer");
    const status = createElement("div", "yuan-mt-chat__status", "准备就绪");
    const fileInput = document.createElement("input");

    input.setAttribute("data-placeholder", "输入消息，Enter 发送，Shift+Enter 换行");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    imageButton.type = "button";
    sendButton.type = "button";
    clearButton.type = "button";
    imageButton.title = "插入图片";
    const inputResizeHandle = createElement("div", "yuan-mt-chat__input-resize");
    inputResizeHandle.title = "上下拖动调整输入框高度（最高为总高度的 40%）";
    inputResizeHandle.setAttribute("aria-label", "调整输入框高度");
    inputWrap.append(attachments, inputResizeHandle, input);
    composer.append(imageButton, inputWrap, sendButton, atPanel, skillPanel);
    contextRing.append(contextPercent);
    contextMeta.append(contextTokens, contextRounds);
    contextMeter.append(contextRing, contextMeta);
    headerLeft.append(headerTitle, clearButton);
    header.append(headerLeft, contextMeter);
    flowBar.append(stageLabel, skillLabel);
    footer.append(status);
    root.append(header, flowBar, messages, optionsRow, composer, footer, fileInput);

    for (const eventName of ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "wheel"]) {
        root.addEventListener(eventName, (event) => event.stopPropagation());
    }

    // 用户消息左侧的图像卡牌徽标：多图堆叠成手持卡牌状，右下角显示图片数量
    const createImagesBadge = (images, count) => {
        const badge = createElement("button", "yuan-mt-chat__images-badge");
        badge.type = "button";
        badge.title = `${count} 张图片，点击预览`;
        badge.setAttribute("aria-label", `预览 ${count} 张图片`);
        const list = Array.isArray(images) ? images : [];
        const thumbCount = Math.min(list.length, 3);
        const center = (thumbCount - 1) / 2;
        list.slice(0, 3).forEach((imageRef, index) => {
            const thumb = document.createElement("img");
            thumb.className = "yuan-mt-chat__images-badge-thumb";
            thumb.src = buildImageUrl(imageRef);
            thumb.alt = `图${index + 1}`;
            thumb.style.zIndex = String(index + 1);
            if (thumbCount > 1) {
                thumb.style.transform = `rotate(${(index - center) * 9}deg)`;
            }
            badge.append(thumb);
        });
        const countLabel = createElement("span", "yuan-mt-chat__images-badge-count", `×${count}`);
        badge.append(countLabel);
        badge.addEventListener("click", (event) => {
            event.stopPropagation();
            openImageLightbox(list);
        });
        return badge;
    };

    // 全屏灯箱预览发送的图片：左右切换、Esc 关闭、点遮罩关闭
    let activeLightbox = null;
    const closeImageLightbox = () => {
        if (!activeLightbox) return;
        document.removeEventListener("keydown", activeLightbox.keyHandler, true);
        activeLightbox.element.remove();
        activeLightbox = null;
    };
    const openImageLightbox = (images, startIndex = 0) => {
        const list = (Array.isArray(images) ? images : []).filter((ref) => buildImageUrl(ref));
        if (!list.length) return;
        closeImageLightbox();

        const overlay = createElement("div", "yuan-mt-chat__lightbox");
        const frame = createElement("div", "yuan-mt-chat__lightbox-frame");
        const img = document.createElement("img");
        img.className = "yuan-mt-chat__lightbox-img";
        img.alt = "图片预览";
        const caption = createElement("div", "yuan-mt-chat__lightbox-caption");
        const closeButton = createElement("button", "yuan-mt-chat__lightbox-close", "×");
        closeButton.type = "button";
        closeButton.title = "关闭预览 (Esc)";
        const prevButton = createElement("button", "yuan-mt-chat__lightbox-nav yuan-mt-chat__lightbox-nav--prev", "‹");
        prevButton.type = "button";
        prevButton.title = "上一张 (←)";
        const nextButton = createElement("button", "yuan-mt-chat__lightbox-nav yuan-mt-chat__lightbox-nav--next", "›");
        nextButton.type = "button";
        nextButton.title = "下一张 (→)";

        let currentIndex = Math.min(list.length - 1, Math.max(0, Number(startIndex) || 0));
        const renderPreview = () => {
            const ref = list[currentIndex];
            img.src = buildImageUrl(ref);
            caption.textContent = `${currentIndex + 1} / ${list.length}`;
            caption.title = ref.filename;
            prevButton.style.visibility = list.length > 1 ? "visible" : "hidden";
            nextButton.style.visibility = list.length > 1 ? "visible" : "hidden";
        };

        const keyHandler = (event) => {
            if (!activeLightbox || activeLightbox.element !== overlay) return;
            if (event.key === "Escape") {
                event.stopPropagation();
                closeImageLightbox();
            } else if (event.key === "ArrowLeft" && list.length > 1) {
                event.stopPropagation();
                currentIndex = (currentIndex - 1 + list.length) % list.length;
                renderPreview();
            } else if (event.key === "ArrowRight" && list.length > 1) {
                event.stopPropagation();
                currentIndex = (currentIndex + 1) % list.length;
                renderPreview();
            }
        };

        closeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            closeImageLightbox();
        });
        prevButton.addEventListener("click", (event) => {
            event.stopPropagation();
            currentIndex = (currentIndex - 1 + list.length) % list.length;
            renderPreview();
        });
        nextButton.addEventListener("click", (event) => {
            event.stopPropagation();
            currentIndex = (currentIndex + 1) % list.length;
            renderPreview();
        });
        // 点击遮罩空白处关闭
        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) closeImageLightbox();
        });

        frame.append(img, caption);
        overlay.append(frame, closeButton, prevButton, nextButton);
        document.body.append(overlay);
        document.addEventListener("keydown", keyHandler, true);
        activeLightbox = { element: overlay, keyHandler };
        renderPreview();
    };

    const render = () => {
        const history = parseHistory(historyWidget.value);
        messages.replaceChildren();
        if (!history.length) {
            messages.append(createElement("div", "yuan-mt-chat__empty", "开始聊天吧"));
            return;
        }

        history.forEach((item, index) => {
            const imageCount = Array.isArray(item.images) ? item.images.length : 0;
            const row = createElement("div", `yuan-mt-chat__row yuan-mt-chat__row--${item.role}`);
            const avatar = createElement(
                "div",
                `yuan-mt-chat__avatar yuan-mt-chat__avatar--${item.role}`,
                item.role === "user" ? "我" : "AI"
            );
            avatar.title = item.role === "user" ? "用户" : "助手";
            const col = createElement("div", "yuan-mt-chat__col");
            const bubble = createElement("div", "yuan-mt-chat__bubble");
            bubble.append(createMessageContent(item.content, copyText));

            const meta = createElement("div", "yuan-mt-chat__meta");
            const metaLeft = createElement("span", "yuan-mt-chat__meta-left");
            const formattedTime = formatMessageTime(item.created_at);
            if (formattedTime) {
                const timeLabel = createElement("span", "yuan-mt-chat__meta-time", formattedTime);
                timeLabel.title = new Date(Number(item.created_at)).toLocaleString();
                metaLeft.append(timeLabel);
            }
            const tokenCount = Number(item.token_count);
            if (Number.isFinite(tokenCount) && tokenCount >= 0) {
                const tokenLabel = createElement(
                    "span",
                    "yuan-mt-chat__meta-tokens",
                    `${Math.round(tokenCount)}t`
                );
                tokenLabel.title = imageCount
                    ? "包含文本、消息模板开销和图片视觉 token 估算"
                    : "使用当前模型 tokenizer 统计，并包含少量消息模板开销";
                metaLeft.append(tokenLabel);
            }
            const metaRight = createElement("span", "yuan-mt-chat__meta-right");
            const copyMessageButton = createElement("button", "yuan-mt-chat__meta-btn", "复制");
            copyMessageButton.type = "button";
            copyMessageButton.title = "复制这条消息";
            copyMessageButton.addEventListener("click", (event) => {
                event.stopPropagation();
                copyText(item.content);
            });
            metaRight.append(copyMessageButton);
            const recallButton = createElement("button", "yuan-mt-chat__meta-btn yuan-mt-chat__meta-btn--recall", "撤回");
            recallButton.type = "button";
            recallButton.title = "撤回这条消息";
            recallButton.addEventListener("click", (event) => {
                event.stopPropagation();
                recallMessage(index);
            });
            metaRight.append(recallButton);
            if (item.role === "assistant" && index === history.length - 1) {
                const regenerateButton = createElement("button", "yuan-mt-chat__meta-btn", "重新生成");
                regenerateButton.type = "button";
                regenerateButton.title = "重新生成这条消息";
                regenerateButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    regenerateLastReply();
                });
                metaRight.append(regenerateButton);
            }
            meta.append(metaLeft, metaRight);
            col.append(bubble, meta);
            if (item.role === "user") {
                // 附带图片的用户消息：气泡左侧显示图像卡牌徽标，点击预览
                if (imageCount > 0) {
                    row.append(createImagesBadge(item.images, imageCount), col, avatar);
                } else {
                    row.append(col, avatar);
                }
            } else {
                row.append(avatar, col);
            }
            messages.append(row);
        });
        messages.scrollTop = messages.scrollHeight;
    };

    const renderFlow = () => {
        const state = parseFlowState(flowWidget?.value);
        stageLabel.textContent = String(state.stage || "未开始");
        stageLabel.title = stageLabel.textContent;
        skillLabel.textContent = state.skill_name || state.skill || "普通对话";
        skillLabel.title = skillLabel.textContent;
        optionsRow.replaceChildren();
        parseOptions(optionsWidget?.value || "[]").forEach((value) => {
            const button = createElement("button", "yuan-mt-chat__option", value);
            button.type = "button";
            button.title = "发送此选项";
            button.addEventListener("click", () => {
                if (node.__yuanMtChatBusy) return;
                setInputText(value);
                send();
            });
            optionsRow.append(button);
        });
    };

    const renderContext = () => {
        const state = parseContextState(node.properties.qwenContextState);
        const usedTokens = Math.max(0, Number(state.used_tokens) || 0);
        const promptBudget = Math.max(0, Number(state.prompt_budget) || 0);
        const contextLimit = Math.max(0, Number(state.context_limit) || 0);
        const outputReserve = Math.max(0, Number(state.output_reserve) || 0);
        const trimmedMessages = Math.max(0, Number(state.trimmed_messages) || 0);
        const currentRounds = Math.max(0, Number(state.current_rounds) || 0);
        const maxRounds = Math.max(0, Number(state.max_rounds) || 0);
        const remainingTokens = Math.max(0, Number(state.remaining_tokens) || 0);

        if (!promptBudget || !contextLimit) {
            contextPercent.textContent = "--";
            contextTokens.textContent = "已用约 --";
            contextRounds.textContent = "轮数 --/--";
            contextRing.style.background = "conic-gradient(#07c160 0deg, #e0e0e0 0deg)";
            contextMeter.title = "完成一次回复后显示上下文占用估算";
            return;
        }

        const rawPercent = usedTokens / promptBudget * 100;
        const displayPercent = Math.max(0, Math.round(rawPercent));
        const ringPercent = Math.min(100, Math.max(0, rawPercent));
        const color = rawPercent >= 90 ? "#e84c4c" : rawPercent >= 75 ? "#e6a23c" : "#07c160";
        contextPercent.textContent = `${displayPercent}%`;
        contextTokens.textContent = `已用约 ${formatTokenCount(usedTokens)}`;
        contextRounds.textContent = `轮数 ${currentRounds}/${maxRounds || "--"}`;
        contextRing.style.background = `conic-gradient(${color} ${ringPercent * 3.6}deg, #e0e0e0 0deg)`;
        contextMeter.title = [
            `当前已使用约 ${Math.round(usedTokens)} tokens`,
            `当前剩余约 ${Math.round(remainingTokens)} tokens`,
            `模型上下文上限 ${Math.round(contextLimit)} tokens`,
            `已预留输出 ${Math.round(outputReserve)} tokens`,
            `当前保留历史 ${Math.round(currentRounds)} / ${Math.round(maxRounds)} 轮`,
            trimmedMessages > 0 ? `本轮因上下文不足裁剪了 ${trimmedMessages} 条历史消息` : "本轮未裁剪历史消息",
        ].join("\n");
    };

    let dragIndex = null;
    const clearDragState = () => {
        dragIndex = null;
        for (const child of attachments.children || []) {
            removeClass(child, "dragging");
            removeClass(child, "drag-over");
        }
    };
    const reorderImages = (from, to) => {
        const next = parseImages(currentImagesWidget.value);
        if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) return;
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        currentImagesWidget.value = JSON.stringify(next);
        renderAttachments();
        node.graph?.setDirtyCanvas?.(true, true);
    };

    const renderAttachments = () => {
        const images = parseImages(currentImagesWidget.value);
        attachments.replaceChildren();
        images.forEach((imageRef, index) => {
            const chip = createElement("span", "yuan-mt-chat__attachment");
            chip.title = `${imageRef.filename}\n点击预览\n在输入框输入 @ 选择引用\n拖拽可调整顺序`;
            const thumb = document.createElement("img");
            thumb.src = buildImageUrl(imageRef);
            thumb.alt = `图${index + 1}`;
            const indexLabel = createElement("span", "yuan-mt-chat__attachment-index", `${index + 1}`);
            const removeButton = createElement("button", "yuan-mt-chat__attachment-remove", "×");
            removeButton.type = "button";
            removeButton.title = `移除图片${index + 1}`;
            removeButton.addEventListener("click", (event) => {
                event.stopPropagation();
                const next = parseImages(currentImagesWidget.value);
                next.splice(index, 1);
                currentImagesWidget.value = JSON.stringify(next);
                renderAttachments();
                node.graph?.setDirtyCanvas?.(true, true);
            });
            // 点击缩略图预览该图，灯箱优先显示所点击的图片
            chip.addEventListener("click", (event) => {
                event.stopPropagation();
                openImageLightbox(images, index);
            });
            chip.draggable = true;
            chip.addEventListener("dragstart", (event) => {
                dragIndex = index;
                addClass(chip, "dragging");
                try { event.dataTransfer?.setData?.("text/plain", String(index)); } catch (_) { /* ignore */ }
                event.stopPropagation();
            });
            chip.addEventListener("dragover", (event) => {
                if (dragIndex === null || dragIndex === index) return;
                event.preventDefault();
                addClass(chip, "drag-over");
            });
            chip.addEventListener("dragleave", () => {
                removeClass(chip, "drag-over");
            });
            chip.addEventListener("drop", (event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                event.stopPropagation();
                reorderImages(dragIndex, index);
                clearDragState();
            });
            chip.addEventListener("dragend", clearDragState);
            chip.append(thumb, indexLabel, removeButton);
            attachments.append(chip);
        });
    };

    const hideAtPanel = () => {
        atPanel.style.display = "none";
        atPanel.replaceChildren();
    };

    const showAtPanel = () => {
        const images = parseImages(currentImagesWidget.value);
        atPanel.replaceChildren();
        if (!images.length) {
            const hint = createElement("div", "yuan-mt-chat__at-hint", "暂无图片，点击 + 或拖拽图片到输入框后即可 @ 引用");
            atPanel.append(hint);
            atPanel.style.display = "flex";
            return;
        }
        images.forEach((imageRef, index) => {
            const item = createElement("button", "yuan-mt-chat__at-item");
            item.type = "button";
            item.title = `${imageRef.filename}\n插入 @图${index + 1}`;
            const thumb = document.createElement("img");
            thumb.src = buildImageUrl(imageRef);
            thumb.alt = `图${index + 1}`;
            const label = createElement("span", "", `@图${index + 1}`);
            item.append(thumb, label);
            // 阻止按钮抢焦点，保留输入框光标，保证单次点击即可选中并正确定位
            item.addEventListener("pointerdown", (event) => event.preventDefault());
            item.addEventListener("click", () => insertAtReference(index + 1));
            atPanel.append(item);
        });
        atPanel.style.display = "flex";
    };

    let skillsCache = null;
    const loadSkills = async () => {
        if (skillsCache) return skillsCache;
        try {
            const response = await api.fetchApi("/yuan_llama/official_skills");
            if (!response?.ok) throw new Error(`技能列表加载失败 (HTTP ${response?.status || "unknown"})`);
            skillsCache = await response.json();
            if (!Array.isArray(skillsCache)) skillsCache = [];
        } catch (error) {
            skillsCache = [];
            status.textContent = `技能加载失败：${error?.message || error}`;
            status.dataset.state = "error";
        }
        return skillsCache;
    };

    const hideSkillPanel = () => {
        skillPanel.style.display = "none";
        skillPanel.replaceChildren();
    };

    const getActiveSkillId = () => String(node.properties.activeSkill || "").trim();

    // ---- contenteditable 输入框辅助函数 ----

    // 序列化输入框为纯文本：块级元素/换行转 \n，技能 token 文本不参与发送，@图 token 文本保留参与发送
    const getInputText = () => {
        const parts = [];
        const walk = (current) => {
            if (current.nodeType === Node.TEXT_NODE) {
                parts.push(current.nodeValue);
                return;
            }
            if (current.nodeType !== Node.ELEMENT_NODE) return;
            if (current.classList && current.classList.contains("yuan-mt-chat__skill-token")) return;
            if (current.classList && current.classList.contains("yuan-mt-chat__at-token")) {
                parts.push(current.textContent);
                return;
            }
            const tag = String(current.tagName || "").toUpperCase();
            if (tag === "BR") {
                parts.push("\n");
                return;
            }
            if (tag === "DIV" || tag === "P" || tag === "LI") parts.push("\n");
            for (const child of current.childNodes) walk(child);
            if (tag === "DIV" || tag === "P" || tag === "LI") parts.push("\n");
        };
        walk(input);
        return parts.join("").replace(/\n{3,}/g, "\n\n");
    };

    // 设置输入框纯文本（清除全部内容后重建），并保留/恢复技能 token，同时持久化文本供工作流切换恢复
    const setInputText = (text) => {
        while (input.firstChild) input.removeChild(input.firstChild);
        if (text) input.appendChild(document.createTextNode(text));
        node.properties.inputText = text || "";
        renderActiveSkill();
        autoResizeInput();
    };

    // 光标前文本（用于 "/" 触发技能面板判断）
    const getTextBeforeCaret = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return getInputText();
        const range = selection.getRangeAt(0);
        if (!input.contains(range.startContainer)) return getInputText();
        const pre = document.createRange();
        pre.selectNodeContents(input);
        pre.setEnd(range.startContainer, range.startOffset);
        return pre.toString();
    };

    // 在光标处插入技能 token（contenteditable=false，退格可整体删除）。
    // 与 @图N 的 insertAtReference 同套原子替换写法：若光标前一字符是触发面板的 "/"，
    // 把它一并选中后删除并插入 token，避免先删 "/" 再插入导致的首次点击失败。
    const insertSkillToken = (skillId) => {
        const token = createElement("span", "yuan-mt-chat__skill-token", `/${skillId}`);
        token.contentEditable = "false";
        token.dataset.skillId = skillId;
        const selection = window.getSelection();
        let insertRange;
        if (selection && selection.rangeCount > 0 && input.contains(selection.getRangeAt(0).startContainer)) {
            insertRange = selection.getRangeAt(0).cloneRange();
        } else {
            insertRange = document.createRange();
            insertRange.selectNodeContents(input);
            insertRange.collapse(false);
        }
        // 光标前一字符是 "/" 时替换掉它，避免出现 "//"；token 文本本身以 "/" 开头，视觉上仍是 "/skill名"
        const isReplacing =
            insertRange.startContainer.nodeType === Node.TEXT_NODE &&
            insertRange.startOffset > 0 &&
            insertRange.startContainer.nodeValue[insertRange.startOffset - 1] === "/";
        if (isReplacing) insertRange.setStart(insertRange.startContainer, insertRange.startOffset - 1);
        insertRange.deleteContents();
        insertRange.insertNode(token);
        insertRange.setStartAfter(token);
        insertRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(insertRange);
        autoResizeInput();
    };

    const renderActiveSkill = () => {
        const skillId = getActiveSkillId();
        const existing = input.querySelector(".yuan-mt-chat__skill-token");
        if (!skillId) {
            if (existing) existing.remove();
            return;
        }
        if (existing) {
            if (existing.dataset.skillId !== skillId) {
                existing.textContent = `/${skillId}`;
                existing.dataset.skillId = skillId;
            }
            return;
        }
        insertSkillToken(skillId);
    };

    // 用户退格/删除技能 token 时同步清除 activeSkill（程序性改动在回调触发前已落定，不影响）
    const skillSyncObserver = new MutationObserver(() => {
        const token = input.querySelector(".yuan-mt-chat__skill-token");
        if (!token && getActiveSkillId()) {
            node.properties.activeSkill = "";
            node.graph?.setDirtyCanvas?.(true, true);
            status.textContent = "已清除技能";
        }
    });
    skillSyncObserver.observe(input, { childList: true, subtree: true });

    const selectSkill = (skillId) => {
        node.properties.activeSkill = skillId;
        // 插入 /skillId token；若光标前一字符是刚输入的 "/"，insertSkillToken 会原子替换它，
        // 视觉上仍是 "/skill名"，不会出现 "//"
        renderActiveSkill();
        hideSkillPanel();
        input.focus();
        node.graph?.setDirtyCanvas?.(true, true);
        const skill = Array.isArray(skillsCache) ? skillsCache.find((item) => item.id === skillId) : null;
        status.textContent = `已启用技能：${skill?.name || skillId}`;
    };

    const showSkillPanel = async () => {
        const skills = await loadSkills();
        skillPanel.replaceChildren();
        if (!skills.length) {
            skillPanel.append(createElement("div", "yuan-mt-chat__skill-empty", "official_skills 目录下暂无技能"));
        } else {
            skills.forEach((skill) => {
                const item = createElement("button", "yuan-mt-chat__skill-item");
                item.type = "button";
                item.title = `${skill.name}\n${skill.description || "无描述"}`.trim();
                item.append(
                    createElement("span", "yuan-mt-chat__skill-name", `/ ${skill.id}`),
                    createElement("span", "yuan-mt-chat__skill-desc", skill.description || "无描述")
                );
                // 阻止按钮抢焦点，保留输入框光标；在 pointerdown（交互第一个事件）即完成选中，
                // 保证单击一次即生效，click 仅作兜底避免重复处理
                let selectedOnPointer = false;
                item.addEventListener("pointerdown", (event) => {
                    if (event.button !== 0) return;
                    event.preventDefault();
                    selectedOnPointer = true;
                    selectSkill(skill.id);
                });
                item.addEventListener("click", () => {
                    if (selectedOnPointer) return;
                    selectSkill(skill.id);
                });
                skillPanel.append(item);
            });
        }
        skillPanel.style.display = "flex";
    };

    // 在输入框光标处插入 @图N 引用；若光标前一字符是刚输入的 @ 则直接替换它
    const insertAtReference = (num) => {
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        let insertRange;
        if (range && input.contains(range.startContainer)) {
            insertRange = range.cloneRange();
        } else {
            insertRange = document.createRange();
            insertRange.selectNodeContents(input);
            insertRange.collapse(false);
        }
        const isReplacing =
            insertRange.startContainer.nodeType === Node.TEXT_NODE &&
            insertRange.startOffset > 0 &&
            insertRange.startContainer.nodeValue[insertRange.startOffset - 1] === "@";
        if (isReplacing) insertRange.setStart(insertRange.startContainer, insertRange.startOffset - 1);
        // @图N 以黄色 token 插入，contenteditable=false，退格可整体删除
        const token = createElement("span", "yuan-mt-chat__at-token", `@图${num}`);
        token.contentEditable = "false";
        token.dataset.ref = String(num);
        insertRange.deleteContents();
        insertRange.insertNode(token);
        const space = document.createTextNode(" ");
        insertRange.setStartAfter(token);
        insertRange.insertNode(space);
        insertRange.setStartAfter(space);
        insertRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(insertRange);
        autoResizeInput();
        hideAtPanel();
        input.focus();
    };

    const copyText = async (value) => {
        if (!value) {
            status.textContent = "暂无可复制内容";
            status.dataset.state = "error";
            return false;
        }
        try {
            await navigator.clipboard.writeText(value);
        } catch (_) {
            const textarea = document.createElement("textarea");
            textarea.value = value;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.append(textarea);
            textarea.select();
            document.execCommand("copy");
            textarea.remove();
        }
        status.textContent = "已复制这条消息";
        status.dataset.state = "idle";
        return true;
    };

    const regenerateLastReply = () => {
        if (node.__yuanMtChatBusy) return;
        const history = parseHistory(historyWidget.value);
        const assistantIndex = history.length - 1;
        const userIndex = assistantIndex - 1;
        if (
            assistantIndex < 1 ||
            history[assistantIndex]?.role !== "assistant" ||
            history[userIndex]?.role !== "user"
        ) return;

        const userMessage = history[userIndex];
        const assistantMessage = history[assistantIndex];
        historyWidget.value = JSON.stringify(history.slice(0, userIndex));
        setInputText(userMessage.content);
        currentImagesWidget.value = JSON.stringify(userMessage.images || []);
        if (flowWidget) {
            const fallbackState = parseFlowState(flowWidget.value);
            fallbackState.final_result = "";
            fallbackState.stage = "重新生成";
            flowWidget.value = JSON.stringify(assistantMessage.flow_before || fallbackState);
        }
        if (optionsWidget) optionsWidget.value = "[]";
        render();
        renderFlow();
        renderAttachments();
        send();
    };

    const recallMessage = (index) => {
        if (node.__yuanMtChatBusy) return;
        const history = parseHistory(historyWidget.value);
        const item = history[index];
        if (!item) return;

        // 撤回用户消息时，连同紧随的助手回复及之后所有轮次一并撤回
        const removed = item.role === "user"
            ? history.splice(index)
            : history.splice(index, 1);

        // 被撤回的用户消息文字回填输入框，图片重新回到上传区
        const recalled = removed.find((message) => message.role === "user" && message.content);
        if (recalled) {
            const prev = getInputText();
            const recalledImages = Array.isArray(recalled.images) ? recalled.images : [];
            const baseIndex = parseImages(currentImagesWidget.value).length;
            let recalledText = recalled.content;
            // 上传区已有图片时，@图N 引用按新位置重新编号，保证再次发送引用仍然对应
            if (baseIndex > 0 && recalledImages.length) {
                recalledText = recalledText.replace(/@图(\d+)/g, (match, num) => {
                    const index = Number(num);
                    return index >= 1 && index <= recalledImages.length
                        ? `@图${baseIndex + index}`
                        : match;
                });
            }
            // 拼接回填时清理两端换行并归一化连续换行，避免产生多余空行
            const joined = `${prev ? `${prev.replace(/\n+$/, "")}\n` : ""}${recalledText.replace(/^\n+/, "")}`;
            setInputText(joined.replace(/\n{3,}/g, "\n\n"));
            if (recalledImages.length) {
                const current = parseImages(currentImagesWidget.value);
                current.push(...recalledImages);
                currentImagesWidget.value = JSON.stringify(current);
                renderAttachments();
            }
        }

        historyWidget.value = JSON.stringify(history);
        render();
        node.graph?.setDirtyCanvas?.(true, true);

        // 同步刷新上下文占用仪表
        const state = node.properties.qwenContextState;
        if (state) {
            const removedTokens = removed.reduce(
                (sum, message) => sum + (Number(message.token_count) || 0),
                0
            );
            if (removedTokens > 0) {
                state.used_tokens = Math.max(0, (Number(state.used_tokens) || 0) - removedTokens);
            }
            state.current_rounds = history.filter((message) => message.role === "user").length;
            renderContext();
        }
        status.textContent = item.role === "user" ? "已撤回这条消息" : "已撤回助手回复";
    };

    const setBusy = (busy, message = busy ? "正在生成..." : "准备就绪", state = busy ? "busy" : "idle") => {
        node.__yuanMtChatBusy = busy;
        sendButton.disabled = busy;
        imageButton.disabled = busy;
        clearButton.disabled = busy;
        input.disabled = busy;
        optionsRow.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
        status.textContent = message;
        status.dataset.state = state;
    };

    let manualInputHeight = null;
    // 输入框最大高度：总高度的 40%，且不低于最小高度
    const getInputMaxHeight = () => {
        const total = root.clientHeight || root.offsetHeight || 400;
        return Math.max(38, Math.floor(total * INPUT_MAX_RATIO));
    };

    const autoResizeInput = () => {
        if (manualInputHeight) return;
        input.style.height = "auto";
        const nextHeight = Math.min(getInputMaxHeight(), Math.max(38, input.scrollHeight));
        input.style.height = `${nextHeight}px`;
    };

    // 上下拖动调高手柄：自由调节输入框高度，不超过总高度的 40%
    let inputDragActive = false;
    let inputDragStartY = 0;
    let inputDragStartHeight = 0;
    inputResizeHandle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        inputDragActive = true;
        inputDragStartY = event.clientY;
        inputDragStartHeight = manualInputHeight ?? input.offsetHeight;
        inputResizeHandle.classList.add("resizing");
        inputResizeHandle.setPointerCapture?.(event.pointerId);
    });
    inputResizeHandle.addEventListener("pointermove", (event) => {
        if (!inputDragActive) return;
        // 向上拖动增大高度，向下拖动减小高度
        const deltaY = inputDragStartY - event.clientY;
        const next = Math.max(38, Math.min(getInputMaxHeight(), inputDragStartHeight + deltaY));
        manualInputHeight = next;
        input.style.height = `${next}px`;
        event.preventDefault();
    });
    const endInputResize = (event) => {
        if (!inputDragActive) return;
        inputDragActive = false;
        inputResizeHandle.classList.remove("resizing");
        inputResizeHandle.releasePointerCapture?.(event.pointerId);
        persistInputHeight();
    };
    inputResizeHandle.addEventListener("pointerup", endInputResize);
    inputResizeHandle.addEventListener("pointercancel", endInputResize);
    // 双击调高手柄恢复内容自适应
    inputResizeHandle.addEventListener("dblclick", () => {
        manualInputHeight = null;
        autoResizeInput();
        persistInputHeight();
    });

    // 将手动高度写入 node.properties，随工作流 JSON 一起保存/恢复
    // （后端无任何持久化逻辑，高度由前端承载；切换工作流后靠 ComfyUI 序列化 properties 还原）
    const persistInputHeight = () => {
        if (manualInputHeight) {
            node.properties.inputHeight = Math.round(manualInputHeight);
        } else {
            delete node.properties.inputHeight;
        }
        node.graph?.setDirtyCanvas?.(true, true);
    };
    // 读取工作流中保存的手动高度并应用到输入框
    const restoreInputHeight = () => {
        const stored = Number(node.properties.inputHeight);
        if (Number.isFinite(stored) && stored >= 38) {
            manualInputHeight = Math.min(stored, getInputMaxHeight());
            input.style.height = `${manualInputHeight}px`;
        }
    };
    // 恢复工作流中保存的输入框文本（无保存内容时不改动当前输入框）
    const restoreInputText = () => {
        const saved = typeof node.properties.inputText === "string" ? node.properties.inputText : "";
        if (saved) setInputText(saved);
    };

    const send = async () => {
        const text = getInputText().trim();
        if (!text || node.__yuanMtChatBusy) return;

        userWidget.value = text;
        const skillId = getActiveSkillId();
        const skillSuffix = skillId ? `-skill:${skillId}` : "";
        requestWidget.value = `${Date.now()}-${Math.random().toString(36).slice(2)}${skillSuffix}`;
        setBusy(true);
        node.graph?.setDirtyCanvas?.(true, true);

        try {
            const prompt = await buildChatOnlyPrompt(node);
            await api.queuePrompt(0, prompt);
            status.textContent = "已加入队列...";
        } catch (error) {
            setBusy(false, `加入队列失败：${error?.message || error}`, "error");
        }
    };

    sendButton.addEventListener("click", send);
    imageButton.addEventListener("click", () => fileInput.click());
    input.addEventListener("input", () => {
        node.properties.inputText = getInputText();
        autoResizeInput();
    });
    fileInput.addEventListener("change", async () => {
        const files = Array.from(fileInput.files || []);
        fileInput.value = "";
        if (!files.length || node.__yuanMtChatBusy) return;

        setBusy(true, "正在上传图片...");
        try {
            const current = parseImages(currentImagesWidget.value);
            const startIndex = current.length;
            for (let index = 0; index < files.length; index += 1) {
                current.push(await uploadChatImage(files[index], startIndex + index));
            }
            currentImagesWidget.value = JSON.stringify(current);
            renderAttachments();
            setBusy(false, `已插入 ${files.length} 张图片`);
            node.graph?.setDirtyCanvas?.(true, true);
            input.focus();
        } catch (error) {
            setBusy(false, `插入图片失败：${error?.message || error}`, "error");
        }
    });
    clearButton.addEventListener("click", () => {
        historyWidget.value = "[]";
        userWidget.value = "";
        requestWidget.value = `${Date.now()}-clear`;
        currentImagesWidget.value = "[]";
        if (flowWidget) flowWidget.value = "{}";
        if (optionsWidget) optionsWidget.value = "[]";
        node.properties.qwenContextState = {};
        setInputText("");
        render();
        renderFlow();
        renderContext();
        renderAttachments();
        setBusy(false, "会话已清空");
        node.graph?.setDirtyCanvas?.(true, true);
    });
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
            event.preventDefault();
            send();
        } else if (event.key === "Escape") {
            hideAtPanel();
            hideSkillPanel();
        }
    });
    // 光标前紧邻 "@" 时弹出图N选择面板（用 input 事件检测，兼容输入法场景）
    const maybeOpenAtPanel = () => {
        if (document.activeElement !== input) return;
        const before = getTextBeforeCaret();
        if (!before.endsWith("@")) return;
        hideSkillPanel();
        showAtPanel();
    };
    input.addEventListener("keyup", (event) => {
        if (event.key === "@") {
            maybeOpenAtPanel();
        } else if (event.key === "/") {
            const before = getTextBeforeCaret();
            if (before.trim() === "/") {
                hideAtPanel();
                showSkillPanel();
            }
        }
    });
    input.addEventListener("input", maybeOpenAtPanel);
    // 点击面板以外区域时收起 @ 与技能选择面板
    root.addEventListener("pointerdown", (event) => {
        if (!event.target) return;
        const insideAt = atPanel.contains ? atPanel.contains(event.target) : false;
        const insideSkill = skillPanel.contains ? skillPanel.contains(event.target) : false;
        if (!insideAt && !insideSkill) {
            hideAtPanel();
            hideSkillPanel();
        }
    });

    let domWidget = null;
    const isHiddenBackend = (widget) =>
        typeof widget.type === "string" && widget.type.startsWith("converted-widget:");

    // 除隐藏的后端 widget 外，其余可见设置控件占用节点高度，需从聊天区高度中扣除
    const computeSettingsHeight = () => {
        let total = 0;
        for (const widget of node.widgets || []) {
            if (widget === domWidget || isHiddenBackend(widget)) continue;
            let height = 26;
            try {
                const size = widget.computeSize ? widget.computeSize(node.size?.[0] || 360) : null;
                if (Array.isArray(size)) height = Number(size[1]) || 26;
            } catch (_) { /* ignore */ }
            total += height;
        }
        return total;
    };

    const getChatHeight = () => Math.max(
        CHAT_MIN_HEIGHT,
        (node.size?.[1] || 470) - CHAT_NODE_CHROME_HEIGHT - computeSettingsHeight()
    );

    domWidget = node.addDOMWidget("yuan_multi_turn_chat", "yuan_multi_turn_chat", root, {
        getMinHeight: () => CHAT_MIN_HEIGHT + CHAT_WIDGET_PADDING,
        getMaxHeight: () => undefined,
        getHeight: () => getChatHeight() + CHAT_WIDGET_PADDING,
        hideOnZoom: false,
        serialize: false,
    });

    const updateChatLayout = (size = node.size) => {
        const nodeHeight = Number(size?.[1] ?? node.size?.[1] ?? 470);
        const chatHeight = Math.max(CHAT_MIN_HEIGHT, nodeHeight - CHAT_NODE_CHROME_HEIGHT - computeSettingsHeight());
        root.style.height = `${chatHeight}px`;
        root.style.minHeight = `${CHAT_MIN_HEIGHT}px`;
        // 节点变矮后，手动调高的输入框同步收拢到新的 40% 上限内
        if (manualInputHeight) {
            const maxHeight = getInputMaxHeight();
            if (manualInputHeight > maxHeight) {
                manualInputHeight = maxHeight;
                input.style.height = `${maxHeight}px`;
            }
        }
        node.graph?.setDirtyCanvas?.(true, true);
    };

    domWidget.computeSize = (width) => {
        const chatHeight = getChatHeight();
        const effectiveWidth = Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, width || node.size?.[0] || 430));
        return [effectiveWidth, chatHeight + CHAT_WIDGET_PADDING];
    };
    domWidget.afterResize = () => updateChatLayout();
    const domWidgetIndex = node.widgets.indexOf(domWidget);
    if (domWidgetIndex > 0) {
        node.widgets.splice(domWidgetIndex, 1);
        node.widgets.unshift(domWidget);
    }

    const originalOnResize = node.onResize;
    node.onResize = function (size) {
        const result = originalOnResize?.apply(this, arguments);
        clampNodeSize();
        updateChatLayout(size || this.size);
        return result;
    };

    const originalOnExecuted = node.onExecuted;
    node.onExecuted = function (output) {
        originalOnExecuted?.apply(this, arguments);
        const rawHistory = firstValue(output?.对话历史JSON);
        if (typeof rawHistory === "string") historyWidget.value = rawHistory;
        const rawFlow = firstValue(output?.流程状态JSON);
        if (flowWidget && typeof rawFlow === "string") flowWidget.value = rawFlow;
        const rawOptions = firstValue(output?.选项JSON);
        if (optionsWidget) optionsWidget.value = typeof rawOptions === "string" ? rawOptions : "[]";
        const rawContextState = firstValue(output?.上下文状态JSON);
        if (typeof rawContextState === "string") {
            node.properties.qwenContextState = parseContextState(rawContextState);
        }
        const sent = Boolean(firstValue(output?.已发送));
        if (sent) {
            userWidget.value = "";
            currentImagesWidget.value = "[]";
            // 清除已启用技能，避免 setInputText 内部的 renderActiveSkill 又把 /skill token 插回输入框
            node.properties.activeSkill = "";
            setInputText("");
        }
        render();
        renderFlow();
        renderContext();
        renderAttachments();
        setBusy(false);
        this.graph?.setDirtyCanvas?.(true, true);
    };

    const originalOnConfigure = node.onConfigure;
    node.onConfigure = function () {
        const result = originalOnConfigure?.apply(this, arguments);
        window.setTimeout(() => {
            render();
            renderFlow();
            renderContext();
            renderAttachments();
            renderActiveSkill();
            restoreInputHeight();
            restoreInputText();
        }, 0);
        return result;
    };

    const handleExecutionFailure = (event) => {
        if (!node.__yuanMtChatBusy) return;
        setBusy(false, "生成失败，请查看 ComfyUI 日志", "error");
    };
    api.addEventListener("execution_error", handleExecutionFailure);
    api.addEventListener("execution_interrupted", handleExecutionFailure);

    const originalOnRemoved = node.onRemoved;
    node.onRemoved = function () {
        api.removeEventListener("execution_error", handleExecutionFailure);
        api.removeEventListener("execution_interrupted", handleExecutionFailure);
        return originalOnRemoved?.apply(this, arguments);
    };

    const initialWidth = Math.max(node.size?.[0] || 0, 430);
    const initialHeight = Math.max(
        node.size?.[1] || 0,
        CHAT_MIN_HEIGHT + CHAT_NODE_CHROME_HEIGHT + computeSettingsHeight() + 40
    );
    node.setSize([initialWidth, initialHeight]);
    clampNodeSize();
    updateChatLayout(node.size);

    window.setTimeout(() => {
        updateChatLayout();
        restoreInputHeight();
        restoreInputText();
        render();
        renderFlow();
        renderContext();
        renderAttachments();
        renderActiveSkill();
        loadSkills().then(renderActiveSkill);
    }, 0);
}

app.registerExtension({
    name: "ComfyUI-Yuan-llama.MultiTurnChat",
    nodeCreated(node) {
        if (node.constructor?.comfyClass === NODE_CLASS) setupChatNode(node);
    },
});
