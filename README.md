# 智能菜谱 R&D 系统 - Recipe Visualizer

**当前版本：** V13.2.6（2026-03-07）  
**部署链接：** https://fcclawuse.vercel.app/index-v13.2.6.html  
**Git 仓库：** https://github.com/gaogoying-sudo/foodcooking

---

## 📊 完整版本历史

### V13.2.x 系列 - AI 识图与数据加载完善

| 版本 | 日期 | 功能 | 文件 | 状态 |
|------|------|------|------|------|
| V13.2.6 | 2026-03-07 | 语法修复版 - 修复 JavaScript 语法错误，确保脚本正常执行 | index-v13.2.6.html | ✅ 最新 |
| V13.2.5 | 2026-03-07 | 删除重复 init 函数 - 修复函数重复定义问题 | index-v13.2.5.html | ⚠️ 已弃用 |
| V13.2.4 | 2026-03-07 | 数据加载 +AI 识图修复 - 添加调试日志，双重事件绑定 | index-v13.2.4.html | ⚠️ 已弃用 |
| V13.2.3 | 2026-03-07 | AI 识图预览修复 - 增强 CSS/JS，添加 visibility/opacity | index-v13.2.3.html | ⚠️ 已弃用 |
| V13.2.2 | 2026-03-07 | 完整版 - 点击修复 + 功能完善 | index-v13.2.2.html | ⚠️ 已弃用 |
| V13.2.1 | 2026-03-06 | 点击修复版 - 修复按钮宽度 + 全维度展示 + 功率曲线 | index-v13.2.1.html | ⚠️ 已弃用 |
| V13.2 | 2026-03-06 | 功能完整版 - 整合所有功能模块 | index-v13.2.html | ⚠️ 已弃用 |

### V13.x 系列 - 完整功能集成

| 版本 | 日期 | 功能 | 文件 |
|------|------|------|------|
| V13.1 | 2026-03-06 | 菜谱库完整版 - 修复按钮宽度 + 全维度展示 + 功率曲线 | index-v13.1.html |
| V13 | 2026-03-05 | 基础版 - 完整重构（9 项需求） | index-v13.html |

### V12.x 系列 - 定版与修复

| 版本 | 日期 | 功能 | 文件 |
|------|------|------|------|
| V12.1 | 2026-03-05 | 修复版 - 3 个问题修复 | index-v12.1.html |
| V12 | 2026-03-05 | 定版 - 完整重构（9 项需求） | index-v12.html |

### V7-V11 系列 - 功能迭代

| 版本 | 日期 | 功能 | 文件 |
|------|------|------|------|
| V11 | 2026-03-05 | 完整维度版 - 保存维度文档 DIMENSIONS.md | index-v11.html |
| V10 | 2026-03-05 | 完整版 - 整合所有功能模块 | index-v10.html |
| V9 | 2026-03-05 | AI 识别版 - AI 图片识别 + 完整 9 大维度 + 进度条 | index-v9.html |
| V8-img | 2026-03-05 | 图片识别版 | index-v8-img.html |
| V8 | 2026-03-04 | 标准版 | index-v8.html |
| V7 | 2026-03-04 | 优化版 | index-v7.html |

### V1-V6 系列 - 基础版本

| 版本 | 日期 | 功能 | 文件 |
|------|------|------|------|
| V6 | 2026-03-04 | SOP 时间轴 - 瀑布流时间轴可视化 | index-v6.html |
| V5 | 2026-03-04 | 虚拟滚动 - 支持 10000+ 数据 | index-v5.html |
| V4 | 2026-03-03 | 集成版 - 功能集成 | index-v4.html |
| V3 | 2026-03-03 | 功能版 - 基础功能完善 | index-v3.html |
| V2 | 2026-03-03 | 精简版 - 维度分析 | index-v2.html |
| V1 | 2026-03-03 | 极速版 - 初始版本 | index.html |

---

## 🎯 核心功能清单

### AI 图片识别（V9+）
- 🤖 通义千问 qwen-vl-plus API 集成
- 📷 支持 JPG/PNG/WEBP 格式，最大 10MB
- 🔍 菜品识别 + 维度分析
- 💰 Token 消耗统计

### 菜谱数据管理
- 📊 支持 13,510 道完整菜谱数据
- 🗂️ 数据源：`data/processed/recipe-profiles.json` (64MB)
- 📋 示例数据：`data/recipes.json` (20KB, 5 个辣椒炒肉变体)
- 🏷️ 维度字典：`data/dimension-dictionary-full.json` (43KB, 95 个维度)

### 可视化模块
1. **AI 图片识别** - 上传→预览→识别→结果
2. **菜谱列表** - 虚拟滚动，支持 10000+ 数据
3. **瀑布流详情** - 时间轴 + 功率曲线 SVG
4. **维度网络** - 关系分析图
5. **维度管理器** - 95 个维度配置
6. **统计看板** - Token 消耗统计

### 版本切换
- 📦 支持 20+ 历史版本切换
- 🔗 Vercel 固定域名部署
- ⚡ 自动部署（Git push 触发）

---

## 🚀 部署到 Vercel

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录 Vercel
vercel login

# 3. 部署
cd /Users/mac/.openclaw/workspace/recipe-visualizer
vercel --prod
```

**部署配置：**
- 输出目录：`.`（根目录）
- 安装命令：`npm install`（无需依赖）
- 构建命令：无（纯 HTML/CSS/JS）

---

## 📁 数据结构

### 核心数据文件
```
data/
├── recipes.json                      # 示例数据（5 条，20KB）
├── recipes-full.json                 # 完整数据（36 条，4.8KB）
├── recipes-v5.json                   # V5 测试数据（9 条）
├── reference-recipes.json            # 参考菜谱（190 条）
├── dimension-dictionary.json         # 维度字典（339 行）
├── dimension-dictionary-full.json    # 完整维度字典（121 行，43KB）
└── processed/
    ├── recipe-profiles.json          # V6 标准数据（13,510 条，64MB）
    ├── recipe-profiles.json.gz       # 压缩版本（3.1MB）
    └── parse-stats.json              # 解析统计
```

### 菜谱数据字段（51 字段）
- 基础信息：id, name, picture, cooking_time, max_power
- 烹饪步骤：cook_steps（时间轴，功率曲线）
- 食材信息：cooking_ingredient（投料控制）
- 步骤图片：steps_images（SOP 可视化）
- 维度标签：scene, business, experience, people, region, complexity

---

## 📈 版本演进路线

### Phase 1: 基础可视化（V1-V6）
- V1-V3: 基础功能搭建
- V4-V5: 虚拟滚动，支持大数据
- V6: SOP 时间轴可视化

### Phase 2: 功能完善（V7-V12）
- V7-V8: 优化与标准化
- V9: AI 图片识别集成
- V10-V11: 维度分析系统
- V12: 完整重构（9 项需求）

### Phase 3: AI 增强（V13+）
- V13: 完整功能集成
- V13.1: 菜谱库完善
- V13.2: 功能整合
- V13.2.1-V13.2.6: AI 识图与数据加载修复

---

## 🔗 访问链接

### 最新版本
- **V13.2.6:** https://fcclawuse.vercel.app/index-v13.2.6.html

### 历史版本
- **V13.2.5:** https://fcclawuse.vercel.app/index-v13.2.5.html
- **V13.2.4:** https://fcclawuse.vercel.app/index-v13.2.4.html
- **V13.2.3:** https://fcclawuse.vercel.app/index-v13.2.3.html
- **V13:** https://fcclawuse.vercel.app/index-v13.html
- **V12:** https://fcclawuse.vercel.app/index-v12.html

---

## 🛠️ 开发说明

### 技术栈
- **纯 HTML/CSS/JS** - 无依赖，轻量级
- **Chart.js** - 功率曲线绘制
- **Pako** - 数据压缩/解压
- **通义千问 API** - AI 图片识别

### 本地开发
```bash
# 1. 克隆仓库
git clone https://github.com/gaogoying-sudo/foodcooking.git
cd foodcooking

# 2. 启动本地服务器
python3 -m http.server 8000

# 3. 访问
open http://localhost:8000/index-v13.2.6.html
```

### 版本发布流程
1. 开发新功能 → 创建 `index-vX.Y.Z.html`
2. 本地测试功能 → 验证 6 大核心模块
3. Git 提交 → `git add . && git commit -m "feat: Vx.y.z 描述"`
4. 推送部署 → `git push origin main`
5. Vercel 自动部署 → 等待 1-2 分钟
6. 验证外网访问 → 测试功能完整性
7. 更新 README.md → 记录版本变更

---

## 📝 更新日志

### V13.2.6 (2026-03-07)
- 🔧 修复 JavaScript 语法错误
- ✅ 确保脚本正常执行
- 📝 更新 README 完整版本历史

### V13.2.5 (2026-03-07)
- 🐛 删除重复 init 函数定义
- 🔧 修复函数重复定义问题

### V13.2.4 (2026-03-07)
- 🔧 修复数据加载问题
- 🤖 修复 AI 识图功能绑定
- 📝 添加调试日志
- 🔒 双重事件绑定（onchange + addEventListener）

### V13.2.3 (2026-03-07)
- 🐛 修复 AI 识图图片预览不显示
- 🎨 增强 CSS（visibility/opacity）
- 📝 添加 console.log 调试日志

### V13.2.2 (2026-03-07)
- ✨ 点击修复 + 功能完善
- 📦 包含 V13.2/V13.2.1/V13.2.2

### V13.2.1 (2026-03-06)
- 🐛 修复按钮宽度
- 📊 全维度展示
- 📈 功率曲线绘制

### V13.2 (2026-03-06)
- ✨ 功能完整版
- 🔄 整合所有功能模块

### V13.1 (2026-03-06)
- 📋 菜谱库完整版
- 🐛 修复按钮宽度
- 📊 全维度展示

### V13 (2026-03-05)
- ✨ 完整重构（9 项需求）
- 🎯 核心功能集成

---

## 📞 联系方式

- **GitHub:** https://github.com/gaogoying-sudo/foodcooking
- **Vercel:** https://fcclawuse.vercel.app
- **负责人:** #cook Agent

---

**最后更新：** 2026-03-07 21:35  
**维护状态：** 🟢 活跃开发中
