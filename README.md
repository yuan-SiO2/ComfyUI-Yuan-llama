# ComfyUI-Yuan-llama (Qwen-VL 系列)

ComfyUI 的 Qwen VL 推理节点整合包，支持 Qwen3-VL / Qwen3.5-VL / Qwen3.6-VL / Qwen3.8-VL 的 GGUF 模型加载与图文推理。

## 安装方法

1.  将本项目文件夹放入 `ComfyUI/custom_nodes/` 目录下。
2.  安装依赖：llama-cpp-python 请按「[安装步骤](##安装步骤)」从 JamePeng 预编译 releases 按你的环境（CUDA / Python 版本 / 平台）选择 wheel 安装，其余依赖执行：
    ```bash
    pip install -r requirements.txt
    ```
3.  重启 ComfyUI。

## 节点列表

- **API模型加载器**: 支持服务商模式切换（参考 MiniMax H3 提示词增强器）：
  - **贞贞平价小屋（推荐）**：云端 OpenAI 兼容接口（bytedance/doubao-seed-evolving）
  - **贞贞的AI工坊（图片/视频）**：云端 OpenAI 兼容接口（默认 gemini-3.5-flash，可自定义模型 ID）
  - **OpenAI兼容接口（备用）**：任意 OpenAI 兼容端点（需填 Base URL 与模型 ID）
  - **本地API模型**：加载 Qwen3-VL, Qwen3.5-VL, Qwen3.6-VL 或 Qwen3.8-VL GGUF 模型
  - 切换服务商后，无关参数自动隐藏
- **提示词增强器**: 接收加载器的「API模型」端口，进行图片/视频理解推理，输出增强后的文本（云端/本地模式均适用）

### 提示词增强器 (Prompt Enhancer)

#### 主要特性

- **支持模型**: Qwen3-VL, Qwen3.5-VL, Qwen3.6-VL, **Qwen3.8-VL** (GGUF 格式)，以及云端服务商模型。
- **多模态能力**: 支持加载视觉投影模型 (mmproj)，实现图文混合输入。「视觉投影mmproj」默认「自动匹配」：按主模型文件名前缀自动匹配同目录 mmproj（无匹配时不启用，适合纯文本模型），不再提供「无」选项。
- **生成类型**（对标 MiniMax H3 提示词增强器）:
  - **T2VA（文生音视频）**: 纯文字生成，不连接任何参考媒体。
  - **I2VA（首帧图生音视频）**: 从「参考图片」列表取前 1 张作为首帧。
  - **FL2VA（首尾帧生音视频）**: 从「参考图片」列表取前 2 张（第 1 张=首帧、第 2 张=尾帧）。
  - **L2VA（尾帧图生音视频）**: 从「参考图片」列表取最后 1 张作为尾帧。
  - **Ref2VA（参考图/视频生音视频）**: 参考图片取全部（最多 9 张）和/或「参考视频」（ComfyUI 原生 VIDEO）。
- **写作参数**: 目标时长 / 镜头数量(AUTO 或 1-20) / 改写模式(strict·balanced·creative) / 目标长度 / 输出语言 / 提示词模式(官方增强·参考模板融合) / 官方 Skill 协议 / MiniMax 官方创意预设 / 参考模板。提示词模式仿照加载器「服务商模式切换」做动态显隐：「官方增强」只显示「MiniMax 官方创意预设」；「参考模板融合」只显示「参考模板」输入框；后端仅在官方增强模式下注入创意预设。
- **官方 Skill（动态选用）**: 「官方Skill」下拉自动发现 `official_skills/` 目录下所有 Skill（目录含 SKILL.md 即被识别，前端下拉随目录实时刷新），默认官方 MiniMax H3 包（h3-prompt-writing），也可切换其他 Skill 或「不注入（仅核心规则）」。运行时注入所选 Skill 的 SKILL.md + 按生成类型选 guide reference（Ref2VA 优先 ref 文件，其余优先 base/guide 文件），并叠加「官方 Skill 协议」profile 规则（现有兼容 / 官方严格全英文）。Skill 缺失或不可读时自动跳过，不影响原有功能。
- **纯净输出契约（对标 T8）**: system 消息按 T8 `_build_messages` 组装——通用系统规则（Return only the final prompt, 无 Markdown fence/说明/前后缀）+ 官方 H3 core contract + 官方 Skill + profile/语言/改写/提示词模式/镜头数量规则 + 按生成类型的 H3 字段结构（T2VA: integrated_multimodal_description / overall_soundscape / non_diegetic_music；Ref2VA: subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music，含输出布局示例：`<Subject N> 是 <Picture N> 中的角色` 定义、retention_analysis 每行一标签、[Shot N] At MM:SS.mmm 时间轴；I2VA/FL2VA/L2VA 带首帧对齐句）。输出即为纯净的 H3 格式提示词。参考图片按序标注 `<Picture N>` 供 subject_definitions 引用；并在 user 消息最末尾追加强输出契约指令（只输出最终提示词、无 Markdown 围栏、按生成类型强制字段结构，模型对 user 末尾指令遵循度最高，用于压住格式漂移）。
- **智能显存管理**:
  - **生成后自动卸载模型**: API模型加载器（本地API模型模式）内置开关，生成完成后自动卸载模型并释放显存。
  - **自动重加载机制**: 模型卸载后，再次运行推理节点时，会自动检测并重新加载模型。
- **采样参数（对标 T8，不暴露给用户）**: 温度按改写模式内部固定（strict 0.2 / balanced 0.7 / creative 1.2）；本地 Qwen3.8 自动应用推荐采样；「最大输出长度」已移至 API模型加载器（上下文长度之后，默认 4096），「上下文长度」默认 32768。

#### 安装步骤

1. 将本插件文件夹复制到 ComfyUI 的自定义节点目录：`ComfyUI/custom_nodes/ComfyUI-Yuan-llama/`
2. 安装核心推理引擎 **llama-cpp-python**：从 [JamePeng 预编译 releases](https://github.com/JamePeng/llama-cpp-python/releases) 下载与你的环境匹配的 wheel（无需编译），三个维度都要匹配：
   - **平台**：`win_amd64` / `linux_x86_64` / `macos`（Metal）
   - **CUDA 版本**：`cu124` / `cu126` / `cu128`（按你显卡驱动支持的 CUDA 选择；无 N 卡选 CPU 版）
   - **Python 版本**：`cp310` / `cp311` / `cp312`…（必须与 ComfyUI 使用的 Python 版本一致）
   - CPU 支持 AVX2 时优先选 `-AVX2-` 版本（`-Basic-` 无 AVX 指令加速）
   例如 Windows + CUDA 12.8 + Python 3.12：
   ```bash
   pip install https://github.com/JamePeng/llama-cpp-python/releases/download/v0.3.35-cu128-Basic-win-20260406/llama_cpp_python-0.3.35+cu128.basic-cp312-cp312-win_amd64.whl
   ```
3. 安装其余依赖（requirements.txt 不再包含 llama-cpp-python，避免官方源覆盖预编译 wheel）：
   ```bash
   cd ComfyUI/custom_nodes/ComfyUI-Yuan-llama
   pip install -r requirements.txt
   ```
4. 模型文件（主模型 .gguf 与 mmproj）放入 `ComfyUI/models/LLM/` 目录。

## 鸣谢

- **T8** 的 [comfyui-minimax-h3-prompt-enhancer-T8](https://github.com/T8mars/comfyui-minimax-h3-prompt-enhancer-T8)：本插件「提示词增强器」的 H3 提示词工程框架（system 组装顺序、纯净输出契约、按生成类型的字段结构、官方 H3 Skill 注入）均对标该项目实现，特此鸣谢。
- **tl2012tl** 的 [comfyUI-llama-TE](https://github.com/tl2012tl/comfyUI-llama-TE)：本插件「多轮对话」节点（连续多轮对话、Skill 加载器：自动读取 SKILL.md / 按需加载 references / Skill 流程状态记录、可点击选项继续推进、需求确认与最终结果标记）均对标该项目实现，特此鸣谢。
