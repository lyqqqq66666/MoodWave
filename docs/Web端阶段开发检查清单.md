# Web 端阶段开发检查清单

本清单服务于 `codex/web-current` 分支的阶段式提交。每完成一个阶段，都按下面顺序执行，保证可以独立回退。

## 1. 提交前检查

在仓库根目录运行：

```bash
sh scripts/review-web-phase.sh
```

默认包含：

- 前端 `type-check`
- 前端 `lint`
- 后端 `python3 -m compileall backend/src`
- 手动 UI 回归检查清单输出

如果本地后端服务已经启动，且希望顺带跑一轮接口冒烟，可执行：

```bash
RUN_LIVE_API_SMOKE=1 sh scripts/check-backend.sh
```

## 2. Code Review 关注点

- Landing / Login 是否继续保持“问题导向 + 引导进入”，没有回到数据堆砌。
- Dashboard 是否仍然是一屏一个主动作，没有重新长成信息面板墙。
- Mood Step 1 是否保持“默认今天 + 可选其他日期”。
- Companion 是否只向用户展示对话内容与柔和状态文案，不暴露 agent 节点执行过程。
- 所有角色形象、名称、文案是否继续沿用 Web 当前的小灵音体系。
- 新增接口或状态变更时，是否兼顾游客态、登录态、接口失败态。

## 3. Git 流程

每个阶段都只提交到现有 Web 分支：

```bash
git add <files>
git commit -m "phaseX: <summary>"
git push origin codex/web-current
```

不要把这轮 Web 改动提交到 iOS 分支。

## 4. Hook 启用

仓库已经提供 `.githooks/pre-commit`，本地启用一次即可：

```bash
git config core.hooksPath .githooks
```

启用后，每次 `git commit` 会自动执行前后端检查。
