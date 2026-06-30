# WZ EXO 外骨骼控制 App — UI 特征文档（Flutter → uni-app 迁移参考）

> 本文档基于 Flutter App `wz-exoskeleton-control` 提取全部 UI 设计特征，
> 用于指导开发同风格类型的 uni-app（H5 / 微信小程序 / 各平台小程序）。
> 日期：2026-06-26

---

## 目录

1. [设计系统（Design Tokens）](#1-设计系统design-tokens)
2. [Typography 字体规范](#2-typography-字体规范)
3. [布局系统](#3-布局系统)
4. [通用 UI 组件](#4-通用-ui-组件)
5. [页面级别的 UI 特征](#5-页面级别的-ui-特征)
6. [交互动画 & 过渡规范](#6-交互动画--过渡规范)
7. [Haptic / 触觉反馈](#7-haptic--触觉反馈)
8. [空状态 & 异常状态](#8-空状态--异常状态)
9. [页面路由 & 导航过渡](#9-页面路由--导航过渡)
10. [uni-app 迁移实现建议](#10-uni-app-迁移实现建议)

---

## 1. 设计系统（Design Tokens）

### 1.1 色彩系统（核心 13 色）

所有颜色均定义在一个 `AppColors` 常量类中（`lib/core/theme/app_colors.dart`），
采用**紫色系 + 毛玻璃**的科技感主题。

| Token 名称   | 色值           | 用途                             |
|-------------|---------------|----------------------------------|
| `bg`        | `#F8F2FF`     | 页面背景色（浅紫白）                |
| `card`      | `#FFFFFF`     | 卡片背景色（纯白）                  |
| `cardSoft`  | `#F0E2FF`     | 卡片次级背景 / 滑块非激活轨道        |
| `primary`   | `#6120A8`     | 主色 — 按钮、选中态、强调文字        |
| `cyan`      | `#C45BFF`     | 辅色 — 点缀、开关激活、渐变点缀       |
| `textMain`  | `#28123E`     | 主要文字色                          |
| `textSub`   | `#85689D`     | 次要文字色 / hint 文字              |
| `success`   | `#28C76F`     | 成功状态色（绿）                    |
| `warning`   | `#FFB547`     | 警告状态色（橙）                    |
| `danger`    | `#FF5C7A`     | 危险/错误状态色（红）               |
| `border`    | `#E6D3F8`     | 边框色（浅紫）                      |
| `bubble`    | `#FFEEF8`     | 粉色气泡底色（用于背景装饰）          |
| `lavender`  | `#9A55F6`     | 渐变辅助色（语言切换按钮 2 次色）     |

### 1.2 统计页独立色板

统计页（StatisticsPage）使用独立于主系统的色板：

| Token           | 色值         | 用途                   |
|----------------|-------------|------------------------|
| `_purple`      | `#7F77DD`   | 卡片主强调色、进度条      |
| `_purpleDark`  | `#6B5ED8`   | 深紫 — 百分比文字         |
| `_green`       | `#1D9E75`   | 正向指标（步幅变化正增长） |
| `_red`         | `#E53935`   | 负向指标（步幅变化负增长） |
| `_heatEmpty`~`_heatDarkest` | 黄绿色系 | 活动热力图色阶 5 级 |
| `_resistanceOrange` | `#FF7043` | 阻力模式专用强调色 |
| `_progressGray` | `#E8E8E8` | 进度环背景 |
| `_bg`          | `#F5F5F7`   | 统计页背景色（浅灰） |

### 1.3 阴影系统

```css
/* SciCard 阴影 */
box-shadow: 
  0 14px 26px rgba(97, 32, 168, 0.12),   /* primary 半透明投影 */
  0 4px 0 rgba(255, 238, 248, 0.8);        /* 粉色底光 */

/* GlassPanel 阴影（三层） */
box-shadow: 
  0 12px 28px <accent-color at 0.12>,      /* 主题色辉光 */
  0 10px 24px rgba(0, 0, 0, 0.08),         /* 下沉阴影 */
  0 -2px 8px rgba(255, 255, 255, 0.6);     /* 顶部高光 */

/* Dialog 阴影 */
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), spread-radius: -8px;
```

### 1.4 圆角系统

| 层级      | 圆角值   | 使用场景                        |
|----------|---------|--------------------------------|
| 极小     | 3px     | 热力图格子                        |
| 小       | 10-12px | SensorTile、小型标签              |
| 中       | 16-20px | 设置项卡片、模式过滤条、Segment    |
| 大       | 24-30px | SciCard、按钮、Dialog             |
| 极大     | 32px    | 模式切换条容器、Dialog 容器        |
| 全圆     | 999px   | 圆形按钮、滑块轨道                |

---

## 2. Typography 字体规范

### 2.1 字体族

- **主字体**：`.SF Pro Text`（iOS 系统字体）
- uni-app 替代：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

### 2.2 字号 & 字重体系

| 层级             | 字号   | 字重   | 颜色               | 使用场景                  |
|-----------------|--------|--------|--------------------|--------------------------|
| Logo/Splash     | 30px   | 900    | `textMain`         | 启动页标题                |
| 页面标题         | 22px   | 800-900| `textMain`         | 控制页模式名、Dialog 标题  |
| AppBar 标题      | 20px   | 800    | `textMain`         | 导航栏标题                |
| 卡片标题          | 16-17px| 800    | `textMain`         | Profile 设置项标题        |
| 正文 / 按钮      | 15px   | 700-800| `textMain`/white   | 按钮文字、普通正文         |
| 次要文字          | 13-14px| 500-600| `textSub`          | 描述、副标题              |
| 小标签 / 辅助    | 10-12px| 700-800| `textSub`          | SensorTile 标签、模式 Tab  |
| 仪表盘大数字      | 36px   | 700    | `textPrimary`      | 步数、卡路里大数字         |
| 指标气泡          | 18px   | 900    | `textMain`         | MetricBubble 数值         |

### 2.3 行高规范

- 正文行高：`1.4` ~ `1.5`
- 标题行高：`1.2`
- 大数字行高：`1.0`

---

## 3. 布局系统

### 3.1 内边距规范

| 位置              | 值        |
|------------------|-----------|
| 页面水平 padding  | 18px      |
| 统计页水平 padding| 12px (宽屏) / 8px (窄屏 <360px) |
| 列表上下间距       | 14px      |
| 卡片内部 padding   | 18-20px   |
| 底部安全区域       | 40-118px  |

### 3.2 页面结构

所有 Feature 页面遵循统一结构：

```
Scaffold
├── AppBar (transparent bg, 0 elevation, scrolledUnderElevation: 0)
│   ├── leading: chevron_left_rounded 图标返回按钮
│   └── title: 页面标题
└── Body
    └── ListView / SafeArea
        └── Cards / Sections (上下间距 12-14px)
```

### 3.3 控制页布局（特殊）

```
Scaffold
└── Stack
    ├── Positioned.fill → ControlChromeBackground（渐变背景）
    └── SafeArea
        └── ListView (padding: 18px左右, 62px顶部, 118px底部)
            ├── CurrentStatusCard（当前状态毛玻璃卡片）
            ├── SensorMetricsRow（3 列传感器指标）
            ├── RealtimeJointPanel（左右腿关节角度）
            ├── [AnimatedLevelSelectorSlot]
            │   └── LevelSelector × 1~2（滑块选择器）
            ├── CentralDashboard（中央控制面板）
            └── ModeSwitchBar（模式切换条）
```

---

## 4. 通用 UI 组件

### 4.1 PrimaryButton — 全宽主按钮

| 属性             | 值                    |
|-----------------|-----------------------|
| 宽度             | 100%                  |
| 高度             | 54px                  |
| 圆角             | 24px                  |
| 背景色(默认)      | `#6120A8`             |
| 文字色           | white                 |
| 文字字重          | 700                   |
| 左图标           | `bolt_rounded` (default) |
| 禁用背景色        | `#E6D3F8`              |

### 4.2 SciCard — 卡片容器

| 属性       | 值                    |
|-----------|-----------------------|
| 背景色     | white, opacity 0.92   |
| 圆角       | 30px                  |
| 边框       | 1.4px solid `#E6D3F8` |
| 内边距     | 18px                  |
| 阴影       | 见 1.3 节              |

### 4.3 GlassPanel — 毛玻璃面板

| 属性       | 值                           |
|-----------|------------------------------|
| 背景       | white, opacity 0.45~0.58     |
| 模糊       | BackdropFilter blur(24~28px) |
| 圆角       | 22~32px                      |
| 边框       | 1.2~1.5px solid white 0.74~0.85 |
| 阴影       | 三层阴影（见 1.3）             |

**关键实现：** 在 uni-app 中可用 CSS `backdrop-filter: blur(24px)`，需注意浏览器/小程序兼容性（微信小程序需 `enable-backdrop-filter` 配置）。

### 4.4 CustomDialog — 弹窗

| 属性           | 值                 |
|---------------|--------------------|
| 容器圆角        | 32px               |
| 入场动画        | scale 0.8→1.0 + fade 0→1, 300ms, easeOutCubic |
| 图标容器        | 64×64px 圆形，透明度 10% 主题色 |
| 标题字重        | 900                |
| 消息文字色      | textSub 0.9 透明度   |
| 按钮圆角        | 16px               |
| 主按钮背景      | primary / 自定义色   |
| 次按钮背景      | grey 12% 透明度     |

### 4.5 Toast — 轻提示

| 属性           | 值                      |
|---------------|-------------------------|
| 位置           | 顶部（top + safeArea padding） |
| 入场动画        | slide: 右→左位移 300ms, easeOutCubic |
| 宽度           | 屏幕宽度 50%             |
| 圆角           | 左圆角 28px（右上角直边） |
| 类型 4 种       | success(绿), error(红), warning(橙), info(紫) |
| 自动消失        | 2s 后                   |
| 交互           | 支持右滑关闭（>60px 触发） |

### 4.6 RoundIconButton — 圆形图标按钮

| 属性       | 值                     |
|-----------|------------------------|
| 尺寸       | 56×56px (默认) / 70×70px (大号) |
| 背景色     | white, opacity 0.62~0.72 |
| 图标色     | textMain                |
| 禁用态     | opacity 0.3            |

### 4.7 BlinkWidget — 闪烁组件

| 属性      | 值                     |
|----------|------------------------|
| 闪烁周期   | 600ms                  |
| 动画      | opacity 0.15↔1.0, 300ms |
| 激活态     | active = true 时启动    |

### 4.8 WideModeSwitch — 宽开关控件

| 属性       | 值                    |
|-----------|-----------------------|
| 尺寸       | 100×40px              |
| 圆角       | 20px                  |
| 激活背景    | accent 色              |
| 非激活背景  | white 0.86 透明度       |
| 滑块       | 32×32px 白色圆形        |
| 滑到位     | 280ms, easeOutBack 回弹 |
| loading态  | 滑块处显示加载动画        |

### 4.9 MetricBubble — 指标气泡

| 属性       | 值                          |
|-----------|-----------------------------|
| 尺寸       | 82×82px                     |
| 外圈       | 环形进度条                   |
| 内圈       | 72px 白色圆形，带主题色阴影    |
| 文字       | 18px 900 数值 + 11px 800 标签 |
| 动画       | progress 变化 400ms easeOutCubic |

### 4.10 FaultActionButton — 故障/操作按钮

| 属性       | 值                          |
|-----------|-----------------------------|
| 样式       | filled tonal                |
| 尺寸       | 60×60px                     |
| 背景色     | 主题色 12% 透明度             |
| 图标尺寸   | 40px                         |

---

## 5. 页面级别的 UI 特征

### 5.1 SplashPage — 启动页

| 特征           | 描述                        |
|---------------|----------------------------|
| 默认           | 黑色启动视频 `boot.mov`（1.3倍速播完跳转） |
| 回退           | 渐变背景动画（#FFFBF7 → #F8F2FF → #F1E0FF）|
| 入场动画       | logo scale 0.72→1.0, easeOutBack, 1300ms |
| 进度条         | 窄圆角 LinearProgressIndicator, 宽 156px |

### 5.2 DashboardPage — 设备中心

| 特征             | 描述                        |
|-----------------|----------------------------|
| 状态机           | idle → scanning → found → connecting → connected |
| 扫描动画         | 2s 周期雷达动画                |
| 对话框           | 蓝牙请求、新设备、已配对设备三个对话框 |
| 初始化门禁        | 先填身体参数 → 蓝牙检查 → 自动扫描 |

### 5.3 ControlPage — 控制页（核心）

| 特征              | 描述                        |
|------------------|----------------------------|
| 背景              | 三色渐变 #FCFDFF → #F2FBF8 → #F8F4FF |
| 滚动             | ListView，顶部设备栏随滚动透明 |
| 模式切换          | AnimatedPositioned 滑条 260ms easeOutCubic |
| 等级滑块          | 1-10 级，带触觉反馈，防抖 300ms |
| 中央仪表盘        | 自定义光环 + 产品图 + 4 个 MetricBubble |
| 摔倒告警          | 全屏覆盖层，红色渐变，不可穿透 |
| Debug 面板        | 5 次点击顶部区域触发调试覆盖层 |

### 5.4 StatisticsPage — 统计页

| 特征              | 描述                        |
|------------------|----------------------------|
| 背景              | #F5F5F7 浅灰                |
| 模式过滤          | 4 段滑动选择器（All/透明/助力/锻炼）|
| 7 个卡片区块       | 当日步数、运动趋势、双指标卡、模式效益、近 7 日均值、步态对称性、个人最佳 |
| 热力图            | 14 天活动色阶网格，5 级强度 |
| 柱状图            | 近 7 天步数柱状图 + 均值虚线 |
| 步态对称性         | 分数 + 徽章 + 双色分段条 |

### 5.5 ProfilePage — 个人中心

| 特征              | 描述                        |
|------------------|----------------------------|
| 背景              | #F5F5F7 浅灰                |
| 5 个卡片          | 个人资料、运动目标（3 环）、偏好设置、设备管理、系统设置 |
| 目标环            | 圆环进度，入场 700ms easeOutCubic |
| 底部弹窗          | 透明背景底部弹窗用于编辑偏好 |
| 个人头像          | 圆形渐变头像（#D8CCFF → #9BE7D6）|

### 5.6 SettingsPage — 设置页

| 特征              | 描述                        |
|------------------|----------------------------|
| 背景              | #F5F5F7 浅灰                |
| extendBodyBehindAppBar | true                  |
| 2 个卡片           | 语言设置、版本信息            |
| 语言切换          | AnimatedPositioned 滑条 + 渐变指示器 220ms |
| 圆点指示器        | 10px 紫色圆点作为 section 标题装饰 |

### 5.7 模式专用颜色

统计页模式过滤条颜色：
| 过滤项       | 色值         |
|-------------|-------------|
| 全部         | `#888888`   |
| 透明 / 散步   | `#43CDB7`   |
| 助力         | `#746AF2`   |
| 锻炼         | `#D96AF0`   |

---

## 6. 交互动画 & 过渡规范

### 6.1 动画曲线

| 曲线                    | 使用场景                        |
|------------------------|--------------------------------|
| `easeOutCubic`         | 绝大多数动画（260-360ms 标准）    |
| `easeInOutCubic`       | 双方向动画（光环角度变化 700ms）  |
| `easeOutBack`          | 弹性效果（开关滑块 280ms, 等级选择器 220ms） |
| `easeInCubic`          | 退出动画的 reverse 曲线           |

### 6.2 动画时长

| 时长      | 使用场景                       |
|----------|-------------------------------|
| 180ms    | 内容切换                       |
| 220ms    | 语言切换滑条、等级滑块视觉        |
| 260ms    | 模式切换滑条、内容切换            |
| 280ms    | 开关滑块弹性到位                 |
| 300ms    | 页面滑动、Dialog 入场、Toast 滑入 |
| 360ms    | 主导航页面切换                   |
| 400ms    | MetricBubble progress 变化      |
| 600ms    | 闪烁周期                        |
| 700ms    | 中央仪表盘光环角度、目标环入场    |
| 1300ms   | Splash 页 Logo 动画              |

### 6.3 页面过渡效果

**子页面滑动（右进左出）：**
```
进入: 从右向左滑入, 300ms easeOutCubic
退出: 向左滑出至 -0.3 偏移, 250ms easeInCubic
```

**主导航卡片过渡：**
```
进入: 轻微缩放 + 位移 + 圆角变化, 360ms
退出: 轻微缩小 + 淡出, 300ms
```

---

## 7. Haptic / 触觉反馈

| 操作                       | 反馈级别           |
|---------------------------|-------------------|
| 等级滑块 1-3 级             | 轻触               |
| 等级滑块 4-7 级             | 中触               |
| 等级滑块 8-10 级            | 强触               |

> uni-app 中可调用 `uni.vibrateShort()` 配合不同 type 参数。

---

## 8. 空状态 & 异常状态

### 8.1 空状态样式

```
图标容器: 68×68px, 主题色 30% 透明度, 圆角 20px
图标: 34px, 主题色
标题: 20px, 700
描述: 14px, line-height 1.5, 次要色
按钮: 主题色背景, 圆角 12px, 48px 高
```

### 8.2 故障状态

```
标题: 红色 "运行异常"
图标: 警告图标(红色, 闪烁)
右侧按钮: 刷新/清除故障
```

### 8.3 未连接状态

```
标题: "请先连接设备" (22px 900)
描述: 提示文字 (次要色)
按钮: 返回设备中心
```

### 8.4 摔倒告警覆盖层

```
背景: 红色渐变 #D32F2F 0.92 → #B71C1C 0.96
警告图标: 100px 白色圆形背景 15% 透明度
标题: 30px 900 白色 "检测到摔倒"
数据面板: 白色 8% 透明度背景, 圆角 20px
确认按钮: 白色背景, 红色文字, 圆角 20px, 56px 高
```

---

## 9. 页面路由 & 导航过渡

### 9.1 路由结构

```
/splash                         → 启动页
/dashboard                      → 设备中心
  /control                      → 控制页
    /records                    → 历史记录
  /statistics                   → 统计页
    /trend                      → 运动趋势
    /steps                      → 步数详情
    /calories                   → 卡路里详情
  /settings                     → 设置页
    /devices                    → 设备管理
  /profile                      → 个人中心
    /info                       → 资料信息
    /user-settings              → 用户设置
```

### 9.2 导航栏规范

- AppBar 背景透明，0 elevation
- 标题默认靠左（统计页居中）
- 返回按钮使用 `chevron_left` 图标

---

## 10. uni-app 迁移实现建议

### 10.1 CSS 变量（设计 Token）

```css
:root {
  --color-bg: #F8F2FF;
  --color-primary: #6120A8;
  --color-cyan: #C45BFF;
  --color-lavender: #9A55F6;
  --color-text-main: #28123E;
  --color-text-sub: #85689D;
  --color-success: #28C76F;
  --color-warning: #FFB547;
  --color-danger: #FF5C7A;
  --color-card: #FFFFFF;
  --color-card-soft: #F0E2FF;
  --color-border: #E6D3F8;
  --color-bubble: #FFEEF8;
  --color-stats-bg: #F5F5F7;
  --color-purple: #7F77DD;
  --color-green: #1D9E75;
  --color-red: #E53935;
  
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 30px;
  --radius-full: 999px;
  
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

### 10.2 毛玻璃效果实现

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.58);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 32px;
  border: 1.2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 
    0 12px 28px rgba(97, 32, 168, 0.12),
    0 10px 24px rgba(0, 0, 0, 0.08),
    0 -2px 8px rgba(255, 255, 255, 0.6);
}
```

### 10.3 关键动画曲线映射

| Flutter 曲线        | CSS cubic-bezier                  |
|-------------------|-----------------------------------|
| `easeOutCubic`    | `cubic-bezier(0.215, 0.61, 0.355, 1)` |
| `easeInOutCubic`  | `cubic-bezier(0.645, 0.045, 0.355, 1)` |
| `easeOutBack`     | `cubic-bezier(0.34, 1.2, 0.64, 1)`    |

### 10.4 组件迁移对照表

| Flutter 组件              | uni-app 实现方案                         |
|--------------------------|----------------------------------------|
| `PrimaryButton`           | `<button>` 自定义样式                    |
| `SciCard`                | `<view class="sci-card">` CSS 实现       |
| `GlassPanel`             | `<view class="glass-panel">` CSS 实现    |
| `CustomDialog`           | `<uni-popup>` 或自定义弹窗组件            |
| `Toast`                  | `uni.showToast()` 或自定义 Toast 组件     |
| `RoundIconButton`        | `<view class="round-btn">` + icon        |
| `MetricBubble`           | `<view>` CSS 圆环 + 数值文字              |
| `LevelSelector`          | `<slider>` 或自定义拖动条                  |
| `ModeSwitchBar`          | `<scroll-view>` + `<view>` 滑动指示器     |
| `WideModeSwitch`         | `<switch>` + 自定义样式                   |
| `BlinkWidget`            | CSS `@keyframes blink` 动画              |
| `FallAlertOverlay`       | 全屏 `<view>` + 固定定位                  |
| 环形进度                  | CSS `conic-gradient` / SVG              |
| 热力图                    | CSS grid + 色块                          |
| 柱状图                    | CSS flex + 百分比高度                     |

### 10.5 图标建议

推荐使用 **IconFont** 从 Material Icons 选取常用图标生成自定义 iconfont，包括：
`chevron_left`, `chevron_right`, `bolt`, `bluetooth`, `devices`,
`directions_walk`, `accessibility_new`, `warning_amber`, `error`,
`check_circle`, `arrow_back`, `add`, `remove`, `person`, `settings`,
`info`, `schedule`, `local_fire_department`, `trending_up`,
`bar_chart`, `insights`, `compare_arrows`, `layers`, `terrain`,
`thermostat`, `my_location`, `refresh`, `list_alt`, `language`,
`translate`, `auto_awesome`, `calendar_today`, `pause_circle`,
`play_arrow`

### 10.6 特殊注意事项

1. **`backdrop-filter` 兼容性**：微信小程序需 `enable-backdrop-filter: true`，低版本做降级（纯色半透明背景）
2. **环形进度**：CSS `conic-gradient()` / SVG `<circle>` stroke-dasharray
3. **覆盖层**：固定定位 `<view>` + `z-index` + 条件渲染
4. **触觉反馈**：`uni.vibrateShort()`
5. **页面过渡**：`uni.navigateTo` 默认动画或 `animation-type: slide-in-right`
6. **安全区域**：`env(safe-area-inset-top/bottom)` + `uni.getSystemInfoSync().safeArea`

---

## 附：Flutter 源码文件索引

| 文件路径 | 内容 |
|---------|------|
| `lib/core/theme/app_colors.dart` | 颜色系统定义 |
| `lib/core/theme/app_theme.dart` | 主题配置 |
| `lib/core/widgets/primary_button.dart` | 全宽主按钮 |
| `lib/core/widgets/sci_card.dart` | 基础卡片容器 |
| `lib/core/widgets/custom_dialog.dart` | 弹窗组件 |
| `lib/core/widgets/toast.dart` | 轻提示组件 |
| `lib/app/routes.dart` | 路由配置 + 页面过渡动画 |
| `lib/features/splash/splash_page.dart` | 启动页 |
| `lib/features/dashboard/dashboard_page.dart` | 设备中心 |
| `lib/features/control/control_page.dart` | 控制页（核心交互） |
| `lib/features/control/widgets/` | 全部控制页子组件（12 个） |
| `lib/features/statistics/statistics_page.dart` | 统计页（含 7 种数据卡片） |
| `lib/features/statistics/mode_filter_bar.dart` | 模式过滤滑条 |
| `lib/features/profile/profile_page.dart` | 个人中心 |
| `lib/features/settings/settings_page.dart` | 设置页 |

---

> 本文档由 AI 自动分析 Flutter 源码生成，涵盖了全部 UI 视觉特征和交互行为。
