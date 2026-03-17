# PetMap Native / PetMap v2

## Project identity
- 这是一个 React Native + Expo 的宠物友好地点地图 App
- 当前不是从零开发阶段，而是 Figma 驱动的 UI 落地阶段
- 主要目标：发现、收藏、提交、管理宠物友好地点，并逐步接入活动 / Service 生态

## Communication rules
- 用户用中文沟通
- 用户不是专业工程师
- 需要手把手、最小改动、结构化推进
- 先读现有实现，再改代码
- 不要把项目状态回退到早期阶段
- 不要擅自重构稳定主链路

## Current workflow
- Figma 先行设计
- AI 根据设计稿输出实现方案并修改代码
- 用户 review 结果
- 再进行下一轮最小改动
- 每次改动尽量单独一个 feature branch
- 改完后必须跑类型检查

## Mandatory output format for coding tasks
Always reply in this structure:
A. 修改文件列表
B. 每个文件改了什么
C. 为什么这样改
D. 风险点
E. 手动测试步骤
F. 所有修改文件的完整代码

## Mandatory coding rules
- 必须给出所有修改文件的完整代码
- 不要只给 diff
- 优先最小改动原则
- 不轻易拆新组件
- 不轻易改 schema / store / types
- 不轻易重构已稳定主链路
- 先命中设计稿，再谈抽象
- 每次改动前先说明会改哪些文件
- 如果理解不确定，先总结理解，再动手
- 不要改与本任务无关的页面/逻辑

## Required validation
After edits, always run:
npx tsc --noEmit

Then clearly state whether it passed.

## Important project context
- Map 主页面是核心主链路
- 已完成：marker、自定义 marker、BottomSheet 三态、Favorites 第一版、My Spots 第一版、Service 首页第一版、Weekly Pick -> 活动页跳转
- 当前继续推进 Service 相关详情页与整体 UI 落地
- 现有页面和交互应尽量复用：
  - Favorites
  - My Spots
  - Explore 的 spot card 视觉语言
  - Map 页现有交互链路

## Important files
- app/(tabs)/index.tsx
- app/(tabs)/explore.tsx
- app/(tabs)/services.tsx
- app/my-favorites.tsx
- app/my-spots.tsx
- app/activity/[activityKey].tsx
- components/map/*
- store/petmap-store.tsx
- types/spot.ts

## Design priority
- Figma 命中率优先
- spacing / hierarchy / overlap / card language / icon style 要尽量贴近设计稿
- 不要用“差不多”替代明确设计要求

## Git workflow
- 在新分支上工作
- 不直接在 main 上改
- 改完后由用户 review，再决定 commit / merge