# ComfyUI-Yuan-llama (Qwen-VL 系列)

ComfyUI 的 Qwen VL 推理节点整合包，支持 Qwen3-VL / Qwen3.5-VL / Qwen3.6-VL / Qwen3.8-VL 的 GGUF 模型加载与图文推理。

## 安装方法

1.  将本项目文件夹放入 `ComfyUI/custom_nodes/` 目录下。
2.  安装依赖：
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
- **写作参数**: 目标时长 / 镜头数量(AUTO 或 1-20) / 改写模式(strict·balanced·creative) / 目标长度 / 输出语言 / 提示词模式(官方增强·参考模板融合) / 官方 Skill 协议 / MiniMax 官方创意预设 / 参考模板。
- **官方 H3 Skill（对标 T8）**: 随插件分发 `official_skills/h3-prompt-writing/` 官方 Skill 包（MiniMax-AI/MiniMax-H3，SKILL.md + base-en.txt/ref-en.txt），运行时按生成类型（Ref2VA 用 ref-en.txt，其余用 base-en.txt）注入 system 消息，并叠加「官方 Skill 协议」profile 规则（现有兼容 / 官方严格全英文）。skill 文件缺失时自动跳过，不影响原有功能。
- **纯净输出契约（对标 T8）**: system 消息按 T8 `_build_messages` 组装——通用系统规则（Return only the final prompt, 无 Markdown fence/说明/前后缀）+ 官方 H3 core contract + 官方 Skill + profile/语言/改写/提示词模式/镜头数量规则 + 按生成类型的 H3 字段结构（T2VA: integrated_multimodal_description / overall_soundscape / non_diegetic_music；Ref2VA: subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music，含输出布局示例：`<Subject N> 是 <Picture N> 中的角色` 定义、retention_analysis 每行一标签、[Shot N] At MM:SS.mmm 时间轴；I2VA/FL2VA/L2VA 带首帧对齐句）。输出即为纯净的 H3 格式提示词。参考图片按序标注 `<Picture N>` 供 subject_definitions 引用；并在 user 消息最末尾追加强输出契约指令（只输出最终提示词、无 Markdown 围栏、按生成类型强制字段结构，模型对 user 末尾指令遵循度最高，用于压住格式漂移）。
- **智能显存管理**:
  - **生成后自动卸载模型**: API模型加载器（本地API模型模式）内置开关，生成完成后自动卸载模型并释放显存。
  - **自动重加载机制**: 模型卸载后，再次运行推理节点时，会自动检测并重新加载模型。
- **采样参数（对标 T8，不暴露给用户）**: 温度按改写模式内部固定（strict 0.2 / balanced 0.7 / creative 1.2）；本地 Qwen3.8 自动应用推荐采样；「最大输出长度」已移至 API模型加载器（上下文长度之后，默认 4096），「上下文长度」默认 32768。

#### 安装步骤

1. 将本插件文件夹复制到 ComfyUI 的自定义节点目录：`ComfyUI/custom_nodes/ComfyUI-Yuan-llama/`
2. 进入插件目录，安装必要的 Python 库：
   ```bash
   cd ComfyUI/custom_nodes/ComfyUI-Yuan-llama
   pip install -r requirements.txt
   ```
3. 模型文件（主模型 .gguf 与 mmproj）放入 `ComfyUI/models/LLM/` 目录。

## 鸣谢

- **T8** 的 [comfyui-minimax-h3-prompt-enhancer-T8](https://github.com/T8mars/comfyui-minimax-h3-prompt-enhancer-T8)：本插件「提示词增强器」的 H3 提示词工程框架（system 组装顺序、纯净输出契约、按生成类型的字段结构、官方 H3 Skill 注入）均对标该项目实现，特此鸣谢。
