# Web Revamp 阶段汇报

## Phase 1

### 时间

- 2026-06-05

### Codex 汇报

- 开始执行 Web 端 `P0-1` 与 `P0-2` 的前端部分。
- 处理首页首屏结构：
  - 去掉旧版强左右分栏感
  - 去掉重复 CTA
  - 去掉 `今晚` / 调查数字类文案
  - 改为更轻的居中式首屏结构
- 处理登录页：
  - 邮箱 placeholder 改为 `请输入邮箱地址`
  - 第三方登录图标改成更正确的品牌样式
  - 增加登录成功提示
  - 收敛左侧文案，弱化时间限定表达
- 保留后续宠物 / Lottie / Three.js 升级空间，不在本阶段强上重动效

### WorkBuddy 汇报

- 后端已存在待合入修复：
  - `auth` JWT 兜底修复
  - `backend/test_api.sh` 联调脚本修正
- 本阶段作为前端配套背景项记录，后续在联调阶段继续确认：
  - 登录注册链路稳定性
  - API URL 环境一致性

### 当前阶段目标

- 首页和登录前体验先达到“可看、可用、方向正确”
- 完成后提交并推送到 `codex/web-current`

### 阶段测试要求

- 首页文案不再出现旧调查数字
- 首页只有一个主 CTA：`开始体验`
- 登录页邮箱输入框文案正确
- 登录页第三方图标样式正确
- 登录成功后出现明确提示

## Phase 2

### 时间

- 2026-06-05

### Codex 汇报

- 继续完成 Web 端 `P0` 剩余的情绪录入页前端重构。
- 重做 [frontend/src/app/mood/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/mood/page.tsx)：
  - 从原来的 5 步强流程改成 `心情 / 记录 / 分析` 3 段式结构
  - 把标签前移到心情选择同一阶段，减少重复点击
  - 把补记日期摘要单独抬到顶部，强化“当前记录的是哪一天”
  - 把文本、图片、语音统一归到记录阶段，降低问卷感
  - 强化分析中的中间态文案，弱化“结果像瞬间模板生成”的体验
  - 让语音转写区默认更可见，录完后更容易看到转写结果
- 调整 [frontend/src/components/record-date-picker.tsx](/private/tmp/moodwave-web-current/frontend/src/components/record-date-picker.tsx)：
  - 优化日历弹层间距和层级
  - 重做选中态 / 今天样式，去掉偏脏的高亮感
- 保持现有接口契约不变，先把 Web 端交互结构和可信度做顺。

### WorkBuddy 汇报

- 下一阶段需要继续接手 Web 端 `P0` 的后端核查与联调部分：
  - 确认语音上传后的真实转写链路是否稳定
  - 确认情绪分析接口是否真实命中 AI，而不是频繁走 fallback
  - 确认图片、语音、文本三种输入在后端汇总分析时的返回一致性
  - 检查分析耗时、错误态文案与接口返回字段，保证前端中间态可被正确驱动

### 当前阶段目标

- 让情绪录入页从“多步骤表单”变成“低负担记录入口”
- 完成 `Codex P0` 的前端收口，并把下一个后端接力点交给 `WorkBuddy`

### 阶段测试要求

- 情绪录入页不再是原来的 5 步连续 `下一步`
- 标签和情绪选择在同一阶段可完成
- 顶部能明确看到当前记录日期
- 录音后用户能更直接看到转写状态或结果
- 分析页存在更明确的处理中间态

## Phase 3

### 时间

- 2026-06-05

### Codex 汇报

- 对接 `WorkBuddy P0` 后端修复，完成 Web 端情绪录入联调收口。
- 更新 [frontend/src/app/mood/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/mood/page.tsx)：
  - 调用 `analyze-mood` 时追加 `image_urls`，启用后端真实图片分析
  - 接入 `voice_status / voice_error`，不再把语音转写失败静默当成“已完成”
  - 为分析阶段补充明确进度条、处理中步骤和最短等待节奏，避免报告卡片瞬间跳出
  - 在分析未完成前不提前展示 fallback 报告，先展示处理过程
- 补了 [backend/src/api/upload.py](/private/tmp/moodwave-web-current/backend/src/api/upload.py) 的日志对象初始化，
  避免语音转写异常时因为 `logger` 未定义再次变成 500。

### WorkBuddy 汇报

- 已推送 `80e6b81`：
  - 修复 AI 分析 `json` 作用域问题
  - 新增 `POST /api/ai/analyze-images`
  - `analyze-mood` 支持 `image_urls`
  - 上传响应新增 `voice_status / voice_error`
- 当前联调结论：
  - 后端新字段和新能力已被前端消费
  - 图片、语音、文字三路输入的前端透传链路已补齐

### 当前阶段目标

- 完成 `P0` 的前后端协作闭环，让情绪录入页的“多模态 + AI 分析真实性”体验达到可验收状态

### 阶段测试要求

- 上传图片后，前端会把 `image_urls` 传给 `analyze-mood`
- 语音转写失败时，页面会明确显示失败状态或原因
- AI 分析阶段会先显示进度条和处理中说明，不会瞬间直接出现报告
- 前后端静态检查通过后再提交推送到 `codex/web-current`

## Phase 4

### 时间

- 2026-06-06

### Codex 汇报

- 开始执行 `P1` 前半段，先完成登录后首页重排与登录页左侧灵音形象升级。
- 更新 [frontend/src/app/dashboard/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/dashboard/page.tsx)：
  - 收掉首页拥挤卡片感
  - 删除低优先级的“重新查看新手引导”
  - 把主入口收敛为 `写下此刻 / 看看趋势 / 找伙伴聊聊`
  - 缩短说明文案，让首页更像治愈型应用首页而不是信息面板
- 更新 [frontend/src/app/login/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/login/page.tsx)：
  - 把左侧主视觉切成更接近 iOS 原型气质的悬浮灵体宠物舞台
  - 清理残留的 `今晚` 文案
  - 让左侧文案和说明卡片围绕“先陪伴、再记录、再整理”展开
- 更新 [frontend/src/components/companion-avatar.tsx](/private/tmp/moodwave-web-current/frontend/src/components/companion-avatar.tsx)：
  - 为 Hero 形象加入轻量悬浮、呼吸、轨道文案气泡等动画
  - 保持为纯前端可替换方案，后续可平滑替换成正式 `Lottie` 资产
- 顺手推进 [frontend/src/app/music/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/music/page.tsx) 的 `P1-5` 第一轮：
  - 把“AI 服务暂时没有接住请求”这类技术感异常文案换成更柔和的产品表达
  - 缩小播放进度条圆点，减轻播放器感
  - 把标题和听后感区的文案收拢到“情绪空间”方向

### WorkBuddy 汇报

- 本阶段无需新增接口开发，主要保持 Dashboard / Login 依赖链路稳定
- 后续 `P1-3` / `P1-5` 需要继续配合伙伴角色配置与音乐页接口稳定性

### 当前阶段目标

- 完成 `P1-1` 与 `P1-2` 的视觉方向落地，并推进 `P1-5` 第一轮收口，为后续伙伴页和音乐页重构打基础

### 阶段测试要求

- 登录页左侧不再是旧的静态吉祥物观感
- 登录后首页主入口明确，不再保留低优先级引导入口
- 音乐页不再直接暴露生硬技术异常文案，进度条控制更轻一点
- 前端检查通过后再提交推送到 `codex/web-current`

## Phase 5

### 时间

- 2026-06-06

### Codex 汇报

- 完成 `P1-3` 灵音伙伴页宠物体系第一轮重做，并把整轮 `P1` 收口到可回退状态。
- 更新 [frontend/src/app/companion/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/companion/page.tsx)：
  - 把顶部展示区从普通头像 + 文案，改成更像桌宠舞台的悬浮宠物主视觉
  - 移动端顶部也换成悬浮宠物入口，不再继续沿用方框头像观感
  - 装扮页签把角色选择从方框列表改成宠物胶囊式选择器
- 更新 [frontend/src/components/companion-avatar.tsx](/private/tmp/moodwave-web-current/frontend/src/components/companion-avatar.tsx)：
  - 新增 `CompanionPetOrb`
  - 用无边框悬浮宠物形态承接伙伴页顶部展示和形象选择
  - 保持后续可继续替换正式 `Lottie` 资产

### WorkBuddy 汇报

- 本阶段无需新增后端接口修改
- 后续如果要继续推进角色配置持久化、角色资源映射或音乐页元数据细化，再由 WorkBuddy 跟进

### 当前阶段目标

- 完成 `P1` 的核心前端改版：登录页、登录后首页、灵音伙伴页、音乐页第一轮统一到更治愈、更像产品成品的方向

### 阶段测试要求

- 灵音伙伴页不再出现明显的方框角色选择观感
- 顶部主形象和角色选择区统一成桌宠 / 悬浮宠物表达
- 前端检查通过后提交推送到 `codex/web-current`

## Phase 6

### 时间

- 2026-06-06

### Codex 汇报

- 开始执行 `P2` 的前端增强版本，不等待正式美术资产先卡住整体进度。
- 更新 [frontend/src/config/companion-characters.ts](/private/tmp/moodwave-web-current/frontend/src/config/companion-characters.ts)：
  - 把角色配置扩展成更完整的资产定义层
  - 新增 `species / sceneTitle / orbitPills / expressions`
  - 为后续 `Lottie` 或正式角色素材接入预留统一配置位
- 更新 [frontend/src/components/companion-avatar.tsx](/private/tmp/moodwave-web-current/frontend/src/components/companion-avatar.tsx)：
  - 把首页 / 登录页 / 伙伴页共享的宠物舞台升级成更明显的悬浮主视觉
  - `CompanionHeroMascot` 改为直接消费角色资产配置
  - `CompanionPetOrb` 增加轨道提示语与更强的光晕层次
- 更新 [frontend/src/app/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/page.tsx)：
  - 首页主视觉升级成更强的动态灵音舞台
  - 用更轻的能力标签和功能说明承接首屏，而不是堆叠文字
- 更新 [frontend/src/app/music/page.tsx](/private/tmp/moodwave-web-current/frontend/src/app/music/page.tsx)：
  - 把音乐房间进一步往“情绪空间”方向推进
  - 强化主可视化区的环形氛围层和场景状态 chip
  - 把右侧播放器头部换成宠物陪伴入口，减少传统播放器观感
  - 听后感区同步换成悬浮宠物表现，统一角色语言

### WorkBuddy 汇报

- 本阶段暂不要求新增后端接口。
- 下一阶段如果继续做正式角色资源映射、音乐参数细化或角色资源配置持久化，可由 WorkBuddy 接手：
  - 角色资源路径字段
  - 音乐可视化参数映射字段
  - 更细的情绪空间推荐元数据

### 当前阶段目标

- 完成 `P2-1 / P2-2 / P2-3` 的前端第一轮增强，让首页主视觉、角色体系和音乐页空间感进入可展示、可回退状态。

### 阶段测试要求

- 首页首屏出现更明显的动态灵音主视觉
- 角色配置层不再只是名字和颜色，而是具备统一资产描述能力
- 音乐页主视觉区比 `P1` 更像情绪空间，而不是普通播放器
- 前端检查通过后提交推送到 `codex/web-current`

### Phase 6 补充

- 继续把首页、登录页和灵音伙伴页的角色从“代码拼出来的抽象头像”切成更接近 iOS 原型图气质的图片化宠物资产。
- 新增 `frontend/public/mascots/*.svg`：
  - `奶桃喵 / 月月喵 / 樱桃兔 / 暖暖鸭 / 航航犬 / 焦糖狐 / 星团团`
- 首页和登录页主标题重新收紧排版，避免中文大标题因为字号过大出现单独一两个字断行的情况。
- 伙伴页对话气泡和游客态仍残留的 `CompanionAvatar` 已继续替换成 `CompanionPetOrb`，进一步去掉方框头像感。
- 再次微调首页与登录页标题密度，并压缩登录页整体高度，去掉桌面端右侧滚动条；同时重做伙伴页配色选择器的选中态和色块显示。
