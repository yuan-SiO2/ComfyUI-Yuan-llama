const { app } = window.comfyAPI.app;

// ==================== APIModel_Loader（API模型加载器 · 按服务商动态显隐参数）====================
// 服务商模式值需与后端 API_MODES 保持一致
const API_MODEL_SEEDANCE = "贞贞平价小屋（推荐）";
const API_MODEL_WORKSHOP = "贞贞的AI工坊（图片/视频）";
const API_MODEL_OPENAI = "OpenAI兼容接口（备用）";
const API_MODEL_LOCAL = "本地API模型";

// 各服务商模式下的控件显隐规则
const API_MODEL_MODE_WIDGETS = {
    [API_MODEL_SEEDANCE]: {
        show: ["服务商", "API密钥"],
        hide: ["云端BaseURL", "云端模型ID", "模型家族", "主模型", "视觉投影mmproj",
               "启用思考", "推理强度", "上下文长度", "最大输出长度", "GPU层数",
               "输出think块", "生成后自动卸载模型"],
    },
    [API_MODEL_WORKSHOP]: {
        show: ["服务商", "API密钥", "云端模型ID"],
        hide: ["云端BaseURL", "模型家族", "主模型", "视觉投影mmproj",
               "启用思考", "推理强度", "上下文长度", "最大输出长度", "GPU层数",
               "输出think块", "生成后自动卸载模型"],
    },
    [API_MODEL_OPENAI]: {
        show: ["服务商", "API密钥", "云端BaseURL", "云端模型ID"],
        hide: ["模型家族", "主模型", "视觉投影mmproj",
               "启用思考", "推理强度", "上下文长度", "最大输出长度", "GPU层数",
               "输出think块", "生成后自动卸载模型"],
    },
    [API_MODEL_LOCAL]: {
        show: ["服务商", "模型家族", "主模型", "视觉投影mmproj",
               "启用思考", "推理强度", "上下文长度", "最大输出长度", "GPU层数",
               "输出think块", "生成后自动卸载模型"],
        hide: ["API密钥", "云端BaseURL", "云端模型ID"],
    },
};

// 参与显隐控制的所有控件名
const API_MODEL_ALL_WIDGET_NAMES = [...new Set(
    Object.values(API_MODEL_MODE_WIDGETS).flatMap(cfg => [...cfg.show, ...cfg.hide])
)];

// 各服务商对应的 API Key 获取链接
const API_MODEL_SIGNUP = {
    [API_MODEL_SEEDANCE]: {
        label: "🔑 获取贞贞 API Key",
        url: "https://api.seedance.nz/sign-up?aff=j2Gy",
    },
    [API_MODEL_WORKSHOP]: {
        label: "🔑 获取贞贞 API Key",
        url: "https://ai.t8star.org/register?aff=c369b242478",
    },
};

function registerAPIModelLoader(nodeType) {
    // 按 服务商 切换各参数显隐
    const syncModeWidgets = (self) => {
        const modeWidget = self.widgets && self.widgets.find(w => w.name === "服务商");
        if (!modeWidget) return;
        self._lastAPIModelModeValue = modeWidget.value;
        const mode = modeWidget.value;
        const cfg = API_MODEL_MODE_WIDGETS[mode] || API_MODEL_MODE_WIDGETS[API_MODEL_LOCAL];
        const showSet = new Set(cfg.show);
        for (const w of self.widgets) {
            if (!API_MODEL_ALL_WIDGET_NAMES.includes(w.name)) continue;
            w.hidden = !showSet.has(w.name);
        }
        // 获取 API Key 按钮：仅 贞贞平价小屋 / 贞贞的AI工坊 模式显示（平价小屋=API密钥下方；AI工坊=云端模型ID下方）
        const signUp = self._apiModelSignUpWidget;
        if (signUp) {
            const signUpCfg = API_MODEL_SIGNUP[mode];
            signUp.hidden = !signUpCfg;
            if (signUpCfg) {
                signUp.name = signUpCfg.label;
                signUp.label = signUpCfg.label;
            }
        }
        // 保持当前宽度不变，只更新高度
        const currentWidth = self.size ? self.size[0] : self.computeSize()[0];
        self.setSize([currentWidth, self.computeSize()[1]]);
        app.graph.setDirtyCanvas(true, true);
    };

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
        const self = this;
        const modeWidget = self.widgets && self.widgets.find(w => w.name === "服务商");
        if (modeWidget) {
            // 获取贞贞 API Key 按钮：按当前服务商打开对应注册页
            if (!self._apiModelSignUpWidget) {
                const signUp = self.addWidget(
                    "button",
                    "🔑 获取贞贞 API Key",
                    "打开当前渠道注册页面",
                    () => {
                        const m = (self.widgets.find(w => w.name === "服务商") || {}).value;
                        const c = API_MODEL_SIGNUP[m];
                        if (c && c.url) window.open(c.url, "_blank", "noopener,noreferrer");
                    },
                    { serialize: false },
                );
                signUp.serializeValue = () => undefined;
                self._apiModelSignUpWidget = signUp;
            }
            syncModeWidgets(self);

            const origCallback = modeWidget.callback;
            modeWidget.callback = function () {
                if (origCallback) origCallback.apply(this, arguments);
                syncModeWidgets(self);
            };
        }
        return r;
    };

    // 工作流加载时同步一次显隐
    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (info) {
        const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
        syncModeWidgets(this);
        return r;
    };

    // 每帧比对 服务商 值，变化即同步显隐
    const onDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function () {
        const r = onDrawForeground ? onDrawForeground.apply(this, arguments) : undefined;
        if (!this.widgets) return r;
        const modeWidget = this.widgets.find(w => w.name === "服务商");
        if (modeWidget && modeWidget.value !== this._lastAPIModelModeValue) {
            syncModeWidgets(this);
        }
        return r;
    };
}

// ==================== Prompt_Enhancer（提示词增强器 · 按提示词模式动态显隐 创意预设/参考模板）====================
const PROMPT_MODE_STANDARD = "官方增强";
const PROMPT_MODE_TEMPLATE = "参考模板融合";

function registerPromptEnhancer(nodeType) {
    // 官方增强=显示 创意预设；参考模板融合=显示 参考模板
    const syncTemplateWidget = (self) => {
        const modeWidget = self.widgets && self.widgets.find(w => w.name === "提示词模式");
        if (!modeWidget) return;
        self._lastPromptModeValue = modeWidget.value;
        const mode = modeWidget.value;
        for (const w of self.widgets) {
            if (w.name === "创意预设") {
                w.hidden = mode !== PROMPT_MODE_STANDARD;
            } else if (w.name === "参考模板") {
                w.hidden = mode !== PROMPT_MODE_TEMPLATE;
            }
        }
        // 保持当前宽度不变，只更新高度
        const currentWidth = self.size ? self.size[0] : self.computeSize()[0];
        self.setSize([currentWidth, self.computeSize()[1]]);
        app.graph.setDirtyCanvas(true, true);
    };

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
        const self = this;
        const modeWidget = self.widgets && self.widgets.find(w => w.name === "提示词模式");
        if (modeWidget) {
            syncTemplateWidget(self);

            const origCallback = modeWidget.callback;
            modeWidget.callback = function () {
                if (origCallback) origCallback.apply(this, arguments);
                syncTemplateWidget(self);
            };
        }
        return r;
    };

    // 工作流加载时：校验下拉值（非法值重置为默认），再同步显隐
    const onConfigure = nodeType.prototype.onConfigure;
    nodeType.prototype.onConfigure = function (info) {
        const r = onConfigure ? onConfigure.apply(this, arguments) : undefined;
        const self = this;
        if (self.widgets) {
            for (const w of self.widgets) {
                if (w.type === "combo" && w.options && Array.isArray(w.options.values) && w.options.values.length) {
                    const valid = w.options.values.map(String).includes(String(w.value));
                    if (!valid) w.value = w.options.values[0];
                }
            }
        }
        syncTemplateWidget(self);
        return r;
    };

    // 每帧比对 提示词模式 值，变化即同步显隐
    const onDrawForeground = nodeType.prototype.onDrawForeground;
    nodeType.prototype.onDrawForeground = function () {
        const r = onDrawForeground ? onDrawForeground.apply(this, arguments) : undefined;
        if (!this.widgets) return r;
        const modeWidget = this.widgets.find(w => w.name === "提示词模式");
        if (modeWidget && modeWidget.value !== this._lastPromptModeValue) {
            syncTemplateWidget(this);
        }
        return r;
    };
}

app.registerExtension({
    name: "ComfyUI-Yuan-llama",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "APIModel_Loader") {
            registerAPIModelLoader(nodeType);
        }
        if (nodeData.name === "Prompt_Enhancer") {
            registerPromptEnhancer(nodeType);
        }
    },
});
