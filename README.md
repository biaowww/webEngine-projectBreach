# 空裂 · Web Demo — 第1阶段战役

> 《空裂》第1阶段 Phaser 3 浏览器 Demo，展示世界地图 → 城市 → 战役路线图 → 战斗的完整游玩流程。

---

## 快速开始

```bash
# 用任意静态文件服务器启动（推荐 serve 或 http-server）
npx serve .
# 然后在浏览器打开 http://localhost:3000
```

无需构建步骤，无需安装依赖，双击 `index.html` 或通过本地服务器访问即可。

> **注意**：须通过 HTTP 服务器访问（不能直接 `file://` 双击打开），原因是 Phaser CDN 资源须在同源环境下加载。

---

## 游玩流程

```
世界地图 (WorldMapScene)
  └─ 点击 "位面城" 节点
        ↓
     位面城 (CityScene)
       └─ 点击 "位面城议会 → 进入战役"
             ↓
          战役开始 (CampaignStartScene)  — 英雄 / 圣物展示
             ↓
          战役地图 (CampaignMapScene)   — 4场战斗节点路线图
             ↓
           战斗 (BattleScene)           — 主战斗
             ↓
          战斗结果 (ResultScene)        — 胜负弹窗
             ↓
          战斗间 (BetweenBattleScene)   — 奖励 / 换兵
             ↓
          战役结算 (CampaignEndScene)   — 全局胜利或失败
```

---

## 操作说明

| 操作 | 说明 |
|------|------|
| 战斗前拖拽棋子 | 自由调整己方阵型（仅下半场 4 行） |
| **W 键** | 手动释放 W 技能（满蓝时自动释放） |
| **R 键** | 手动触发大招 |
| 点击 "开战" | 锁定阵型，战斗开始 |
| 30 秒后 | 自动进入加时赛（双方全体攻击 +50%） |

---

## 项目结构

```
webEngine-projectBreach/
├── index.html                      # 入口页；加载 Phaser CDN 及全部脚本
├── src/
│   ├── main.js                     # Phaser Game 配置与启动
│   ├── data/
│   │   ├── pieceData.js            # 棋子定义、初始阵型、圣物列表
│   │   ├── campaignData.js         # 战役 4 场战斗数据（敌方阵容）
│   │   └── synergyData.js          # 羁绊标签定义
│   ├── entities/
│   │   ├── Piece.js                # 基础棋子类（HP / 攻击 / 移动 / 视觉）
│   │   └── Hero.js                 # 英雄类，继承 Piece（蓝条 / W 技能 / 大招）
│   ├── systems/
│   │   ├── BattleSystem.js         # 战斗 tick 循环（100ms/tick）
│   │   └── CampaignState.js        # 全局战役状态单例
│   ├── scenes/
│   │   ├── WorldMapScene.js        # 世界地图（7 地区节点）
│   │   ├── CityScene.js            # 位面城内部（议会 / 学校）
│   │   ├── CampaignStartScene.js   # 战役开始预览
│   │   ├── CampaignMapScene.js     # 战役节点地图
│   │   ├── BattleScene.js          # 主战斗场景
│   │   ├── BetweenBattleScene.js   # 战斗间奖励 / 换兵
│   │   ├── CampaignEndScene.js     # 战役结算（胜利 / 失败）
│   │   └── ResultScene.js          # 单场战斗结果弹窗
│   └── utils/
│       └── autoPlacement.js        # 自动摆放算法
├── assets/
│   └── sprites/                    # 图片资源（如有）
└── docs/
    ├── COMBAT_GDD.md               # 战斗设计文档
    ├── COMBAT_DATA.csv             # 战斗数值表
    └── PROJECT_DESIGN.md           # 完整项目设计文档（含 AI 生成说明）
```

---

## 技术栈

| 项目 | 版本 / 说明 |
|------|------------|
| [Phaser 3](https://phaser.io/) | 3.70.0（CDN 加载） |
| 渲染器 | AUTO（WebGL 优先，降级 Canvas） |
| 构建工具 | 无（原生 `<script>` 标签） |
| 运行环境 | 现代浏览器（Chrome / Firefox / Safari） |

---

## Demo 限制（第1阶段开放内容）

- **地区**：仅「位面城」可进入；其余 6 个地区为演示占位
- **英雄**：仅西德尼可出战；布鲁及其他英雄锁定
- **战役**：4 场战斗；2 条命制；携带 1 件随机圣物
- **圣物**：共 5 件，每次战役随机分配一件

---

## 开发备注

### 输入坐标修复
原版 CSS 对 `#canvas-wrapper` 应用了 `transform: perspective(1400px) rotateX(6deg)` 以产生"棋盘倾斜"效果。该 3D 变换会导致 `getBoundingClientRect()` 返回扭曲的值，进而破坏 Phaser 的鼠标坐标映射，使点击无法命中任何交互对象。已将该变换移除，改用 `box-shadow` 实现视觉深度感。

### 游戏循环
配置 `fps.forceSetTimeOut: true`，使用 `setTimeout` 驱动游戏循环（替代 `requestAnimationFrame`），确保在 RAF 被浏览器节流的环境（标签页后台、某些浏览器扩展上下文）中仍可正常运行。
