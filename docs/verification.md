# 0.2.0 验证记录

日期：2026-11-18。环境：macOS，Node.js 24.19.0，DSH 0.2.2-rc.1，Ego Lite CLI 指南 2.2.1。

## 已验证

- 启动独立 DSH Web：3082，独立 DSH_HOME 与 plugin-qa Profile。
- 通过 3082 的原生插件管理面板安装旧版并复现 Config ~standard.validate 激活失败。
- 修复 Config 后，面板组件变为运行中；真实 Cordis fiber.state=2。
- 使用真实 Cordis 挂载最新入口，注册 10 个工具；output.render 返回文本内容块数组；卸载后工具数量为0。
- 通过 Ego Lite 可见页面，登录状态 ready；读取2条自己作品；关注弹窗返回脱敏样本；视频标题和15.060998秒时长可读取。
- 评论提取曾出现错误的广域选择结果；改为目标页面 comment-list 内采样并等待加载结束。对页面显示暂无评论的视频复测返回空样本，不把空样本当作零评论证明。
- URL拒绝非HTTPS、凭据、非允许主机及非video路径；对最终跳转路径检查视频一致性。
- 本机无浏览器CLI时返回 BROWSER_NOT_INSTALLED 与可操作说明。
- npm test：10/10；npm run check：通过。新增覆盖失败任务ID恢复、卸载阻止排队操作、持久化去原文和默认脱敏。
- 通过原生插件管理面板卸载目录安装版，安装实际0.2.0 tgz并启用，面板显示0.2.0运行中。
- tgz共15个文件，仅运行代码、manifest、patch、README、locale、icon、LICENSE；不含隔离Profile、pnpm缓存、账号凭据或会话数据。

## 验证边界与剩余工作

- 用户配置 deepseek-v4.1-flash 后完成3082自然语言对话验收：模型调用 dy_login_status 返回ready，dy_works(limit=2)返回自己的两条作品及hasMore:true，dy_video_interpret(simple)返回目标视频标题、15.061秒时长、partial及音画证据缺口。模型正确展示结果。
- 对话验收额外发现并修复两个问题：登录状态输出中的undefined被DSH lossless JSON检查拒绝；全页面视频选择器误收推荐内容。现已删除undefined字段并限定user-post-list容器，安装新包、重启后上述三项对话复测通过。
- 浏览器已有登录态；未执行退出登录、重新扫码、验证码或2FA。本轮用户交接状态由回归测试覆盖，真实未登录流程仍需人工验证。
- 音视频理解、音频转写、完整解读、后台analytics、完整好友通讯录未实现；不能宣称插件满足这些能力。
- 对自己主页4条作品逐一读取评论均为空样本。另从可见精选卡片打开有评论的公开视频，在同一browser transport实际调用comments验证：5条已渲染卡片中正确提取2条正文，不夹带作者、地区或操作按钮。由此修复正文选择器缺失及“加载中”分页尾部导致超时两个问题。该公网视频使用transport验证，未通过dy_comments工具（其workRef仅来自自己的作品）；不等同完整评论或回复采集。
- 仅macOS已验证。Windows、Linux和抖音页面未来变动没有保证。
- Config使用DSH同系Schemastery提供Standard Schema和序列化结构。普通非volatile配置按DSH配置编辑器修改并重载；本插件不注册专用配置页。
- GitHub远端仍需在最终审查后同步新提交；本记录不表示已经发布GitHub Release。
