# 圆环缺口守球 - 技术文档

## 1. 项目概述

### 1.1 项目简介
**圆环缺口守球（Ring Gap Keeper）** 是一款基于物理引擎的休闲网页游戏。玩家通过拖动鼠标控制带缺口的圆环旋转，阻止内部的小球从缺口逃出。游戏强调物理手感和短局重开的游戏体验，适合碎片化时间娱乐。

### 1.2 核心特性
- **物理真实感**：基于 Matter.js 物理引擎，实现真实的碰撞反弹效果
- **渐进式难度**：20 个关卡，从单球到大环到多球小环双缺口，逐步提升难度
- **视觉特效**：赛博朋克霓虹风格，包含球拖尾、碰撞火花、粒子爆炸等特效
- **离线可用**：PWA 支持，可安装到桌面，离线运行
- **数据持久化**：本地存储最高分、关卡进度和用户设置

### 1.3 目标用户
- 休闲游戏玩家
- 物理游戏爱好者
- 碎片化时间娱乐用户

---

## 2. 技术栈

### 2.1 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.3.3 | 类型安全的开发语言 |
| Vite | 5.0.12 | 构建工具与开发服务器 |
| Matter.js | 0.19.0 | 2D 物理引擎 |
| Howler.js | 2.2.4 | 音频管理库 |
| poly-decomp | 0.3.0 | 多边形分解库（物理引擎依赖） |
| vite-plugin-pwa | 0.17.4 | PWA 支持 |

### 2.2 开发依赖

| 依赖 | 用途 |
|------|------|
| @types/matter-js | Matter.js 类型定义 |
| @types/howler | Howler.js 类型定义 |
| typescript | TypeScript 编译器 |

---

## 3. 项目架构

### 3.1 目录结构

```
src/
├── audio/              # 音频模块
│   └── AudioManager.ts
├── config/             # 配置模块
│   ├── constants.ts    # 游戏常量配置
│   └── levels.json     # 关卡数据
├── core/               # 核心引擎模块
│   ├── InputController.ts  # 输入控制器
│   ├── PhysicsEngine.ts    # 物理引擎
│   └── Renderer.ts         # 渲染器
├── game/               # 游戏逻辑模块
│   ├── LevelManager.ts     # 关卡管理器
│   ├── ParticleSystem.ts   # 粒子系统
│   └── ScoreManager.ts     # 计分管理器
├── storage/            # 存储模块
│   └── StorageManager.ts
├── types/              # 类型定义
│   ├── index.ts        # 核心类型
│   └── poly-decomp.d.ts # 第三方类型声明
├── ui/                 # UI 模块
│   ├── GameOver.ts
│   ├── HUD.ts
│   ├── LevelComplete.ts
│   ├── LevelSelect.ts
│   ├── MainMenu.ts
│   └── UIManager.ts
├── utils/              # 工具函数
│   └── math.ts
├── Game.ts             # 游戏主类
├── main.ts             # 入口文件
└── style.css           # 全局样式
```

### 3.2 架构分层

```
┌─────────────────────────────────────────┐
│              UI 层                       │
│  MainMenu / HUD / LevelSelect / ...      │
├─────────────────────────────────────────┤
│              游戏逻辑层                  │
│  Game / LevelManager / ScoreManager      │
│  ParticleSystem / AudioManager           │
├─────────────────────────────────────────┤
│              核心引擎层                  │
│  PhysicsEngine / Renderer / InputCtrl    │
├─────────────────────────────────────────┤
│              基础设施层                  │
│  StorageManager / Config / Utils         │
└─────────────────────────────────────────┘
```

### 3.3 核心类关系

```
Game (主控制器)
├── PhysicsEngine    (物理引擎)
├── Renderer         (Canvas 渲染)
├── InputController  (鼠标/触控输入)
├── AudioManager     (音效/震动)
├── UIManager        (UI 管理)
├── StorageManager   (本地存储)
├── LevelManager     (关卡数据)
├── ScoreManager     (分数计算)
└── ParticleSystem   (粒子特效)
```

---

## 4. 核心模块详解

### 4.1 Game 类 ([Game.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/Game.ts))

**职责**：游戏主控制器，协调整个游戏流程。

**核心状态**：
```typescript
type GameState = 'MENU' | 'LEVEL_SELECT' | 'COUNTDOWN' | 
                 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'LEVEL_COMPLETE';
```

**核心方法**：

| 方法 | 功能 |
|------|------|
| `startGame(levelId)` | 启动指定关卡，初始化物理引擎和游戏状态 |
| `gameLoop()` | 主游戏循环，驱动更新和渲染 |
| `update(deltaTime)` | 游戏逻辑更新，包括碰撞检测、分数计算、失败检测 |
| `render(deltaTime)` | 渲染当前游戏画面 |
| `handleCollision(event)` | 处理物理碰撞事件 |
| `handleGameOver(info)` | 处理游戏失败逻辑（慢动作 + 结算） |
| `handleLevelComplete()` | 处理关卡完成逻辑 |

**游戏循环时序**：
```
每一帧 (~16ms):
├─ 计算 deltaTime
├─ 根据状态执行更新
│  ├─ COUNTDOWN: 更新倒计时
│  └─ PLAYING: 
│     ├─ 更新分数和存活时间
│     ├─ 更新粒子系统
│     ├─ 更新旋转缺口
│     ├─ 检测失败条件
│     ├─ 检测关卡完成
│     └─ 更新球拖尾
└─ 渲染画面
   ├─ 清空画布
   ├─ 绘制圆环（带缺口脉冲）
   ├─ 绘制小球（带拖尾）
   ├─ 绘制粒子和 Combo 文字
   └─ 绘制倒计时（如果需要）
```

### 4.2 PhysicsEngine 类 ([PhysicsEngine.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/core/PhysicsEngine.ts))

**职责**：封装 Matter.js 物理引擎，提供游戏所需的物理能力。

**核心配置**：
```typescript
PHYSICS = {
  gravity: 0.6,                    // 重力加速度
  defaultRestitution: 0.92,        // 默认弹性系数
  defaultFriction: 0.002,          // 默认摩擦系数
  defaultFrictionAir: 0.001,       // 默认空气阻力
  ringThickness: 20,               // 圆环厚度
  ballRadius: 12,                  // 小球半径
  maxBallSpeed: 18,                // 最大球速
  minBallSpeed: 2                  // 最小球速
}
```

**核心能力**：

1. **圆环构建** (`createRing()`)
   - 根据缺口配置将圆环切分为多个弧段
   - 使用 `Bodies.fromVertices()` 创建静态刚体
   - 支持旋转缺口（动态重建圆环）

2. **小球管理** (`createBalls()`)
   - 创建多个小球，按角度均匀分布初始位置
   - 每个小球分配独立颜色
   - 设置 `isBullet: true` 防止高速穿透

3. **碰撞检测** (`setupCollisionDetection()`)
   - 监听 Matter.js `collisionStart` 事件
   - 识别球与圆环的碰撞
   - 计算碰撞法线和速度，触发回调

4. **缺口旋转** (`rotateRing(deltaAngle)`)
   - 更新所有缺口的角度
   - 动态销毁并重建圆环刚体
   - 清除碰撞对以避免物理引擎异常

5. **失败检测** (`checkFailure()`)
   - 检测小球是否超出圆环边界
   - 判断逃逸位置是否在缺口范围内
   - 返回失败原因和位置信息

6. **缺口预警** (`checkBallNearGap()`)
   - 检测小球是否靠近缺口（< 15°）
   - 返回脉冲强度值用于视觉反馈

### 4.3 Renderer 类 ([Renderer.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/core/Renderer.ts))

**职责**：Canvas 2D 渲染，负责所有视觉呈现。

**核心能力**：

1. **高分屏适配** (`resize()`)
   - 根据 `devicePixelRatio` 调整 Canvas 分辨率
   - 保持画面清晰度

2. **背景渲染** (`clear()`)
   - 深色径向渐变背景
   - 动态圆环装饰动画

3. **圆环绘制** (`drawRing()`)
   - 霓虹发光效果 (`shadowBlur`)
   - 缺口两端高亮警示点
   - 球靠近时缺口红色脉冲警告

4. **小球绘制** (`drawBall()`)
   - 径向渐变球体（高光 + 主体 + 阴影）
   - 动态拖尾效果（根据速度调整长度和透明度）

5. **特效绘制**
   - `drawParticles()`: 粒子系统渲染
   - `drawComboText()`: Combo 飘字
   - `drawLevelCompleteFlash()`: 过关闪光
   - `drawSlowMotionOverlay()`: 失败慢动作遮罩
   - `drawCountdown()`: 倒计时动画

### 4.4 InputController 类 ([InputController.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/core/InputController.ts))

**职责**：统一处理鼠标和触控输入。

**支持的事件**：

| 事件 | 回调参数 | 用途 |
|------|----------|------|
| `onMove` | `(current, delta)` | 鼠标/触控移动，用于旋转圆环 |
| `onDrag` | `(start, end)` | 拖动开始和持续 |
| `onDragEnd` | `(start, end)` | 拖动结束 |
| `onClick` | `(position)` | 点击事件 |

**核心逻辑**：
- 同时支持鼠标和触控事件
- 自动处理坐标转换（客户端坐标 → Canvas 坐标）
- 支持暂停/恢复输入
- 防止重复绑定和内存泄漏

### 4.5 LevelManager 类 ([LevelManager.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/game/LevelManager.ts))

**职责**：关卡数据管理，难度递进控制。

**关卡数据结构** ([levels.json](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/config/levels.json))：
```typescript
interface LevelConfig {
  id: number;                    // 关卡 ID
  name: string;                  // 关卡名称
  ballCount: number;             // 小球数量
  ringRadius: 'small' | 'medium' | 'large';  // 圆环大小
  gaps: GapConfig[];             // 缺口配置
  restitution: number;           // 弹性系数
  friction: number;              // 摩擦系数
  frictionAir: number;           // 空气阻力
  goal: {
    type: 'HITS' | 'SURVIVE';
    hitCount?: number;           // 目标反弹次数
    surviveSeconds?: number;     // 目标存活时间
  };
  description: string;           // 关卡描述
}

interface GapConfig {
  startAngle: number;            // 缺口起始角度（弧度）
  angleWidth: number;            // 缺口宽度（弧度）
  rotationSpeed?: number;        // 旋转速度（弧度/秒）
}
```

**关卡难度递进规律**：
1. **1-3 关**：单球，大环，熟悉操作
2. **4-5 关**：双球，提升碰撞目标
3. **6 关**：引入旋转缺口
4. **7-8 关**：三球，缩小圆环
5. **9 关**：双缺口
6. **10 关**：BOSS 关，四球
7. **11-20 关**：多维度难度叠加（多球 + 小环 + 多缺口 + 高速旋转）

### 4.6 ScoreManager 类 ([ScoreManager.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/game/ScoreManager.ts))

**职责**：分数计算、连击系统、存活时间统计。

**计分规则**：
```
基础分 = 100 分 / 次碰撞
连击加成 = 基础分 × 连击倍数
连击倍数 = min(3秒内碰撞次数, 5)
关卡奖励 = 球数 × 200 分
```

**连击系统** (`ComboSystem`)：
- 3秒内连续碰撞累计连击
- 最高 5 倍连击加成
- 超时自动重置连击计数

### 4.7 ParticleSystem 类 ([ParticleSystem.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/game/ParticleSystem.ts))

**职责**：管理所有粒子特效。

**粒子类型**：

| 类型 | 触发时机 | 效果 |
|------|----------|------|
| 碰撞火花 | 球撞圆环时 | 沿法线方向 15 个粒子飞散 |
| 爆炸粒子 | 游戏失败时 | 沿逃逸方向 30 个粒子爆炸 |
| 庆祝粒子 | 过关时 | 从中心向外 50 个彩色粒子 |
| Combo 飘字 | 连击 ≥2 时 | 文字向上浮动消失 |

**粒子更新逻辑**：
- 位置更新：`x += vx × (deltaTime / 16)`
- 速度衰减：`vx *= 0.98`
- 生命衰减：`life -= deltaTime`
- 自动清理生命周期结束的粒子

### 4.8 AudioManager 类 ([AudioManager.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/audio/AudioManager.ts))

**职责**：音效生成与播放、震动反馈。

**音效系统**：
- 使用 Web Audio API 动态生成音效
- 编码为 Base64 WAV 格式供 Howler.js 播放
- 无需外部音频文件

**音效类型**：

| 类型 | 波形 | 频率 | 触发时机 |
|------|------|------|----------|
| 碰撞 | sine | 800Hz → 200Hz | 球碰撞圆环，音高随速度变化 |
| 过关 | sine 琶音 | C5-E5-G5-C6 | 关卡完成 |
| 失败 | sawtooth 下行 | 400Hz → 200Hz | 游戏失败 |
| Combo | square | 1200Hz → 600Hz | 连击触发 |
| 点击 | sine | 600Hz | 按钮点击 |

**震动反馈**：
- 碰撞：10ms 短震动
- 过关：[100, 50, 100] 节奏震动
- 失败：200ms 长震动

### 4.9 StorageManager 类 ([StorageManager.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/storage/StorageManager.ts))

**职责**：本地数据持久化。

**存储数据结构**：
```typescript
interface GameSaveData {
  highScore: number;              // 历史最高分
  highestLevel: number;           // 到达过的最高关卡
  unlockedLevel: number;          // 已解锁的最高关卡
  settings: GameSettings;         // 用户设置
  levelScores: Record<number, number>;  // 各关卡最高分
}

interface GameSettings {
  soundEnabled: boolean;          // 音效开关
  vibrationEnabled: boolean;      // 震动开关
  musicVolume: number;            // 音乐音量
  sfxVolume: number;              // 音效音量
}
```

**存储键值**：`ring_gap_keeper_save` (localStorage)

### 4.10 UIManager 类 ([UIManager.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/ui/UIManager.ts))

**职责**：UI 状态管理，各界面切换。

**界面组件**：
- `MainMenu` - 主菜单（开始、选关、设置、帮助）
- `LevelSelect` - 关卡选择（20 关网格展示）
- `HUD` - 游戏内抬头显示（分数、关卡、暂停按钮）
- `GameOver` - 失败结算（分数、最高分、重试）
- `LevelComplete` - 过关结算（奖励、下一关）

**状态切换逻辑**：
```
MENU → LEVEL_SELECT → COUNTDOWN → PLAYING 
                                      ↓
                                 ┌────┴────┐
                                 ↓         ↓
                           GAME_OVER   LEVEL_COMPLETE
                                 ↓         ↓
                              MENU       MENU/NEXT
```

---

## 5. 核心数据流程

### 5.1 游戏启动流程

```
用户点击"开始游戏"
    ↓
Game.startGame(levelId)
    ├─ LevelManager.getLevel() → 读取关卡配置
    ├─ ScoreManager.reset() → 重置分数
    ├─ ParticleSystem.clear() → 清理粒子
    ├─ PhysicsEngine.setupLevel()
    │   ├─ 创建圆环刚体
    │   └─ 创建小球刚体
    ├─ 状态切换为 COUNTDOWN
    └─ 启动 gameLoop()
        ├─ 倒计时 3 → 2 → 1 → GO!
        └─ 状态切换为 PLAYING
```

### 5.2 输入处理流程

```
用户拖动鼠标
    ↓
InputController.handleMouseMove()
    ├─ 计算位置增量 delta
    └─ 触发 onMove 回调
        ↓
Game.setupInputHandlers() 回调
    ├─ 计算当前角度和上一角度
    ├─ 计算角度差 deltaAngle
    ├─ 应用灵敏度系数
    └─ PhysicsEngine.rotateRing(deltaAngle)
        ├─ 更新所有缺口角度
        └─ 重建圆环刚体
```

### 5.3 碰撞处理流程

```
物理引擎检测到碰撞
    ↓
PhysicsEngine.collisionStart 事件
    ├─ 识别碰撞双方（球 + 圆环）
    ├─ 计算碰撞法线和速度
    └─ 触发 onCollision 回调
        ↓
Game.handleCollision()
    ├─ ScoreManager.addHitScore() → 计算分数和连击
    ├─ AudioManager.playCollision() → 播放碰撞音效
    ├─ AudioManager.vibrate(10) → 短震动
    ├─ ParticleSystem.spawnCollisionParticles() → 火花粒子
    └─ 连击 ≥2 时
        ├─ AudioManager.play('combo') → Combo 音效
        └─ ParticleSystem.spawnComboText() → 飘字
```

### 5.4 失败处理流程

```
PhysicsEngine.checkFailure() 检测到球从缺口逃出
    ↓
Game.handleGameOver()
    ├─ 启用慢动作（0.3 倍速，持续 0.3s）
    ├─ ParticleSystem.spawnExplosionParticles() → 爆炸粒子
    └─ setTimeout() 延迟后
        ├─ 状态切换为 GAME_OVER
        ├─ PhysicsEngine.stop() → 停止物理模拟
        ├─ AudioManager.play('game_over') → 失败音效
        ├─ StorageManager.setHighScore() → 保存最高分
        └─ UIManager.showGameOver() → 显示结算界面
```

### 5.5 关卡完成流程

```
Game.checkLevelComplete() 检测到达到目标
    ↓
Game.handleLevelComplete()
    ├─ 状态切换为 LEVEL_COMPLETE
    ├─ PhysicsEngine.stop() → 停止物理模拟
    ├─ AudioManager.play('level_complete') → 过关音效
    ├─ ParticleSystem.spawnLevelCompleteParticles() → 庆祝粒子
    ├─ 计算关卡奖励
    ├─ StorageManager 保存分数和进度
    ├─ LevelManager.unlockNextLevel() → 解锁下一关
    └─ UIManager.showLevelComplete() → 显示过关界面
```

---

## 6. 关键技术实现

### 6.1 圆环物理构建

**问题**：Matter.js 不支持原生的"带缺口圆环"刚体。

**解决方案**：
1. 将圆环沿圆周切分为多个弧段（排除缺口部分）
2. 每个弧段使用顶点法创建独立的静态刚体
3. 所有弧段组合形成完整的带缺口圆环

**代码实现**（[PhysicsEngine.ts#L112-L179](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/core/PhysicsEngine.ts#L112-L179)）：
```typescript
private createRingSegments(): Matter.Body[] {
  // 1. 将缺口转换为 [0, 2π) 范围
  // 2. 计算圆环的有效弧段（缺口以外的部分）
  // 3. 对每个弧段，使用内外顶点创建多边形刚体
  // 4. 设置为静态刚体，不参与物理运动
}
```

### 6.2 旋转缺口的实现

**问题**：缺口旋转时需要动态更新圆环形状。

**解决方案**：
1. 每帧更新缺口角度（`updateGapRotation`）
2. 当缺口位置变化时，销毁所有旧的圆环刚体
3. 使用新的缺口位置重新创建圆环刚体
4. 清除物理引擎的碰撞对缓存，防止异常

**性能优化**：
- 仅在缺口实际移动时才重建
- 批量操作减少 DOM/物理引擎交互

### 6.3 小球逃逸检测

**问题**：如何准确判断小球是从缺口逃出而非正常碰撞。

**解决方案**：
1. 每帧检测所有小球到圆心的距离
2. 如果距离 > 圆环半径 + 小球半径，说明球已逃出
3. 计算小球位置相对于圆心的角度
4. 判断该角度是否落在任意缺口的角度范围内
5. 如果在缺口范围内 → `gap_escape`（游戏失败）

**代码实现**（[PhysicsEngine.ts#L316-L338](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/core/PhysicsEngine.ts#L316-L338)）。

### 6.4 拖尾效果实现

**问题**：实现随速度变化的动态拖尾。

**解决方案**：
1. 每帧记录小球位置到拖尾数组
2. 根据当前速度计算拖尾长度（速度越快拖尾越长）
3. 拖尾点的透明度和大小也随速度变化
4. 超出最大长度时移除最旧的点
5. 渲染时使用渐变色和发光效果

**代码实现**（[Game.ts#L406-L433](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/Game.ts#L406-L433)）。

### 6.5 动态音效生成

**问题**：不使用外部音频文件，减少资源依赖。

**解决方案**：
1. 使用 Web Audio API 的 `OscillatorNode` 创建不同波形
2. 使用 `GainNode` 控制音量包络（ADSR）
3. 生成的音频数据编码为 WAV 格式
4. 转换为 Base64 Data URL 供 Howler.js 播放

**优点**：
- 零外部音频资源
- 可根据游戏状态动态调整音高
- 包体更小，加载更快

### 6.6 PWA 支持

**配置**（[vite.config.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/vite.config.ts)）：
- 使用 `vite-plugin-pwa` 自动生成 Service Worker
- 配置 manifest.json 支持安装到桌面
- 预缓存所有静态资源，支持离线运行
- 自动更新策略（`registerType: 'autoUpdate'`）

---

## 7. 配置说明

### 7.1 游戏常量 ([constants.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/config/constants.ts))

**颜色配置** (`COLORS`)：
- 赛博朋克风格配色
- 主色：霓虹青蓝 `#00f5ff`、霓虹粉紫 `#ff00ff`
- 警示色：霓虹红 `#ff3366`
- 成功色：霓虹绿 `#00ff88`

**物理参数** (`PHYSICS`)：
- 重力、弹性、摩擦系数等可调整
- 调大 `gravity` 增加游戏难度
- 调小 `defaultRestitution` 减少反弹感

**游戏参数** (`GAME`)：
- `trailLength`: 拖尾最大长度（60）
- `particleCount`: 每次碰撞粒子数（15）
- `gapWarningAngle`: 缺口预警角度（15°）
- `ringRotationSensitivity`: 旋转灵敏度（0.003）

### 7.2 关卡配置 ([levels.json](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/config/levels.json))

**新增关卡**：在数组末尾添加新的关卡对象，确保 `id` 唯一且递增。

**角度单位**：所有角度使用**弧度**，`π 弧度 = 180°`。

常用角度转换：
| 角度 | 弧度 |
|------|------|
| 30° | 0.5236 |
| 45° | 0.7854 |
| 60° | 1.0472 |
| 90° | 1.5708 |
| 120° | 2.0944 |
| 180° | 3.1416 |

---

## 8. 开发规范

### 8.1 代码风格

- **TypeScript 严格模式**：启用 `strict: true`
- **命名规范**：
  - 类名：`PascalCase`（如 `PhysicsEngine`）
  - 方法/变量：`camelCase`（如 `handleCollision`）
  - 常量：`UPPER_SNAKE_CASE`（如 `DEFAULT_RESTITUTION`）
- **无注释代码**：代码应自文档化，避免不必要的注释
- **单一职责**：每个类/方法只做一件事

### 8.2 模块依赖原则

```
✅ 允许：高层 → 低层
Game → PhysicsEngine
Game → Renderer

❌ 禁止：低层 → 高层
PhysicsEngine → Game （应使用回调/事件）

✅ 允许：同级通过事件通信
PhysicsEngine.onCollision(callback)
```

### 8.3 类型定义

- 所有公共 API 必须显式声明类型
- 使用 `interface` 定义数据结构
- 使用 `type` 定义联合类型和类型别名
- 避免使用 `any`，必要时使用 `unknown`

### 8.4 性能优化

1. **Canvas 渲染**：
   - 避免在渲染循环中创建新对象
   - 使用 `shadowBlur` 时注意性能开销
   - 粒子数量控制在合理范围

2. **物理引擎**：
   - 避免频繁重建刚体（如缺口旋转）
   - 合理设置迭代次数（当前：位置 20，速度 20）
   - 使用 `isBullet` 防止高速穿透

3. **内存管理**：
   - 及时清理事件监听器
   - 粒子和拖尾数组限制最大长度
   - 游戏结束时停止物理引擎

---

## 9. 构建与部署

### 9.1 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（热更新）
npm run dev

# 类型检查 + 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 9.2 构建输出

```
dist/
├── index.html              # 入口 HTML
├── manifest.webmanifest    # PWA 清单
├── registerSW.js           # Service Worker 注册
├── sw.js                   # Service Worker
├── workbox-*.js            # Workbox 运行时
└── assets/
    ├── index-*.css         # 样式（~10KB）
    └── index-*.js          # 脚本（~182KB，gzip ~52KB）
```

### 9.3 部署

由于是纯前端 SPA，可部署到任何静态托管服务：

- **Vercel** / **Netlify**：自动部署，支持 PWA
- **GitHub Pages**：需注意路径配置
- **Nginx**：常规静态文件托管

**Nginx 配置示例**：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 10. 故障排除

### 10.1 常见问题

**Q: 小球穿透圆环怎么办？**
- 检查 `PHYSICS.maxBallSpeed` 是否过大
- 确认小球设置了 `isBullet: true`
- 增加物理引擎迭代次数

**Q: 缺口旋转时卡顿？**
- 减少每次重建的刚体数量
- 考虑使用 `Body.rotate()` 替代重建（仅适用于整体旋转）

**Q: 移动端触控不灵敏？**
- 检查 `InputController` 的触摸事件处理
- 确保 `preventDefault()` 正确调用防止页面滚动

**Q: 音效无法播放？**
- 检查浏览器自动播放策略（需用户先交互）
- 确认 `AudioContext` 在用户手势后创建

### 10.2 调试技巧

1. **物理调试**：临时添加渲染代码，绘制所有刚体的碰撞边界
2. **性能分析**：使用 Chrome DevTools Performance 面板分析帧率
3. **状态日志**：在 `Game.update()` 中添加状态变更日志
4. **物理慢放**：`PhysicsEngine.setSpeed(0.1)` 观察碰撞细节

---

## 11. 扩展方向

### 11.1 功能扩展

- [ ] 新增关卡目标类型：存活时间（`SURVIVE`）
- [ ] 新增关卡目标类型：混合模式（`HYBRID`）
- [ ] 新增道具系统（减速、扩大圆环等）
- [ ] 新增每日挑战模式
- [ ] 新增排行榜（需后端支持）

### 11.2 技术优化

- [ ] 使用 Web Worker 隔离物理引擎计算
- [ ] 实现圆环刚体的增量更新（避免全量重建）
- [ ] 添加单元测试覆盖核心逻辑
- [ ] 集成 E2E 测试确保游戏流程正确

---

## 附录

### A. 核心类型定义 ([types/index.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/types/index.ts))

完整的 TypeScript 类型定义，涵盖所有核心数据结构。

### B. 数学工具函数 ([utils/math.ts](file:///Users/ext.feixuan3/Desktop/solo/pro_9/src/utils/math.ts))

- `normalizeAngle(angle)`: 角度归一化到 `[-π, π]`
- `isAngleInRange(angle, start, end)`: 判断角度是否在区间内
- `angleDistance(a1, a2)`: 计算两个角度的最短距离
- `distance(p1, p2)`: 计算两点距离
- `randomRange(min, max)`: 生成范围内随机数

---

**文档版本**: v1.0.0  
**最后更新**: 2026-06-13  
**维护者**: 开发团队
