const { app } = window.comfyAPI.app;

// ==================== APIModel_Loader（API模型加载器 · 服务商模式切换，动态显隐参数）====================
// 与后端 nodes.py 中的 API_MODES 常量保持一致
const API_MODEL_SEEDANCE = "贞贞平价小屋（推荐）";
const API_MODEL_WORKSHOP = "贞贞的AI工坊（图片/视频）";
const API_MODEL_OPENAI = "OpenAI兼容接口（备用）";
const API_MODEL_LOCAL = "本地API模型";

// 各服务商模式下的 widget 显隐规则（widget 名与后端 INPUT_TYPES 的 key 一致）
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

// 参与显隐控制的所有 widget 名
const API_MODEL_ALL_WIDGET_NAMES = [...new Set(
    Object.values(API_MODEL_MODE_WIDGETS).flatMap(cfg => [...cfg.show, ...cfg.hide])
)];

function registerAPIModelLoader(nodeType) {
    // 根据 服务商 切换各参数的显隐；只隐藏不删除，避免 widgets_values 索引错位
    const syncModeWidgets = (self) => {
        const modeWidget = self.widgets && self.widgets.find(w => w.name === "服务商");
        if (!modeWidget) return;
        self._lastAPIModelModeValue = modeWidget.value;
        const cfg = API_MODEL_MODE_WIDGETS[modeWidget.value] || API_MODEL_MODE_WIDGETS[API_MODEL_LOCAL];
        const showSet = new Set(cfg.show);
        for (const w of self.widgets) {
            if (!API_MODEL_ALL_WIDGET_NAMES.includes(w.name)) continue;
            w.hidden = !showSet.has(w.name);
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

    // V3 (Nodes 2.0)：Vue 下拉组件直接改 widget.value、不走原生 callback，
    // 每帧轻量比对 服务商 值，变化即同步显隐（V2 下与 callback 路径幂等）
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

app.registerExtension({
    name: "ComfyUI-Yuan-llama",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "APIModel_Loader") {
            registerAPIModelLoader(nodeType);
        }
    },
});
