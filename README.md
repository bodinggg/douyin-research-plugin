# 抖音研究助手 / Douyin research assistant

用于 DeepSeek Harness 的独立 Host 插件。0.2.0 提供可用的 Ego Lite 浏览器接入：检查登录、读取自己的可见作品、抽样读取关注列表与评论，以及获取视频页面标题和时长。插件只读，不发布、不点赞、不关注、不回复、不发私信。

## 安装前提

- DeepSeek Harness（本版在 DSH 0.2.2-rc.1 Web 的独立 Profile 中验证）。
- Node.js 22 或更新版本。
- 已安装并启动 Ego Lite，`ego-browser skill` 能正常执行。本版验证 CLI 指南版本为 2.2.1、macOS；其他系统尚未验证。
- 用于自然语言对话的 DSH 模型需由使用者自行配置。插件不包含模型账号或 API Key。

浏览器是明确的外部前提；没有 Ego Lite 时工具返回 `BROWSER_NOT_INSTALLED` 或 `BROWSER_UNAVAILABLE`，不会静默启动其他浏览器。若 GUI 启动环境找不到命令，在插件配置 `channel.executable` 填 ego-browser 的绝对路径。

## 安装

在 DSH 左侧「插件 → 添加插件」中输入：

```text
https://github.com/bodinggg/douyin-research-plugin.git
```

也可输入下载解压后的本地插件目录，或发布的 tgz 本地绝对路径。安装后点击「立即启用」，插件详情应显示「运行中」。第三方插件更新按 DSH 面板提示先卸载再安装新版，必要时重启 DSH；修改源文件不保证正在运行的模块自动更新。

## 第一次使用

1. 确保 Ego Lite 和 CLI 已连通。
2. 在 DSH 对话中说「检查抖音登录状态」。已有登录可直接返回 `ready`。
3. 未登录时说「打开抖音登录」，在 Ego Lite 中亲自扫码或完成验证。
4. 登录后用 Ego Lite 的控制按钮把任务控制权交还给智能体，再说「检查抖音登录状态」。插件不会自行夺回用户控制权。
5. 说「读取我最近两条作品」，或「读取三个关注对象」。关注名称默认脱敏。
6. 把完整链接 `https://www.douyin.com/video/数字ID` 交给智能体读取视频元数据。短链接当前不支持，请先在浏览器展开后复制完整链接。

## 实际能力

| 工具 | 能力与边界 |
|---|---|
| `dy_login_status` / `dy_session_status` | 从自己的主页观察登录状态，返回账号哈希；无法确认时为 unknown |
| `dy_login_start` | 打开登录页面并交还控制权，不读取二维码、密码或 Cookie |
| `dy_session_clear` | 关闭插件自己的浏览器任务并清理引用，不会退出共享浏览器账号 |
| `dy_works` | 当前账号自己主页上的可见作品样本，返回本会话 workRef |
| `dy_following` | 关注弹窗中的可见样本；不把关注关系当作互相关注或好友关系 |
| `dy_comments` | 根据 dy_works 返回的 workRef 读取目标视频已渲染评论内容；不完整抓取、不推断零评论 |
| `dy_video_interpret` | simple 模式仅视频页面标题、时长、播放器状态与证据缺口；始终标记 partial |
| `dy_interpret_detail` | 读取显式开启持久化后的去原文结果 |
| `dy_analytics` | 当前明确返回 CAPABILITY_UNAVAILABLE，不宣称已支持后台分析 |

**本版没有画面理解、音频转写、完整视频解读和好友通讯录能力。** `full` 模式明确拒绝。不能仅凭页面标题得出视频视觉、声音或完整剧情结论。列表受当前网页可见范围限制，不自动全量翻页。抖音网页更新、验证码、地区和账号权限均可能改变可用范围。

## 配置与隐私

默认无需修改配置即可使用 Ego Lite 适配器。`channel.timeoutMs` 可设 1000–120000；默认 45000。`privacy.redactUserNames` 默认启用；设为 false 可在关注列表中看到名称。账号凭据保持在 Ego Lite 中，本包不导出 Cookie、Token 或二维码。

默认 `interpretation.persist: false`。启用时还必须设置 `workspaceRoot`；文件写到该目录下 `.dsh-douyin-research/interpretations/`，文件权限 0600。持久化副本只保留时长、播放器状态、哈希、固定证据缺口与出处，不保存标题、评论、用户名和帧。当前工具返回的页面标题和作品说明可能包含公开原文，DSH 自身会话历史遵循使用者的 DSH 存储设置。

历史配置 `dryRun`、`channel.adapter/baseUrl`、`maxBatch`、`hashIds` 保留兼容，不控制当前只读浏览器行为。`storeRaw`、`storeFrames` 不允许设为 true。完整功能配置不能绕过尚未实现的能力。

## 开发验证

```bash
npm test
npm run check
npm pack --dry-run
```

依赖 DSH 同系的 `@deepseek-ai/schemastery`，没有安装脚本。Config 实现 Standard Schema v1 校验器并提供 DSH 设置表单结构；工具输出为 DSH ContentBlock 数组，卸载会注销工具并取消本代浏览器子进程。浏览器脚本为固定实现，不接受模型提供的可执行脚本或任意 URL。
