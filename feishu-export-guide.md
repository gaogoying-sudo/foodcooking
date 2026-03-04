# 飞书表格导出指南

## 方案 1: 导出 JSON（推荐）⭐

### 步骤

1. **打开飞书表格**
   - 访问：https://my.feishu.cn/sheets/NDt4sC5ChhWLddt3m7Vc1OwvnXc

2. **导出数据**
   - 点击右上角 "..." 更多菜单
   - 选择 "导出为" → "JSON 数据"
   - 或 "导出为" → "Excel" 然后转为 JSON

3. **上传到系统**
   - 打开 `index.html`
   - 点击 "📁 导入菜谱数据"
   - 选择导出的 JSON 文件

---

## 方案 2: 手动复制数据

如果表格数据量不大，可以：

### 步骤

1. **全选表格数据**
   - `Cmd + A` (Mac) 或 `Ctrl + A` (Windows)

2. **复制**
   - `Cmd + C` (Mac) 或 `Ctrl + C` (Windows)

3. **粘贴到文本编辑器**
   - 打开 VSCode / 记事本
   - 粘贴数据

4. **保存为 JSON 格式**
   ```json
   [
     {
       "id": 138,
       "name": "辣椒炒肉",
       "cooking_time": 175,
       "cook_steps": [...],
       "cooking_ingredient": [...]
     }
   ]
   ```

---

## 方案 3: 使用飞书 API（高级）

### 需要信息

请提供以下信息，我来配置 API 访问：

1. **App ID**: `cli_xxxxxxxxxxxxx`
2. **App Secret**: `xxxxxxxxxxxxxxxxx`
3. **Tenant Key**: （可选）

### 获取方式

1. 访问 https://open.feishu.cn/app
2. 创建企业自建应用
3. 获取凭证信息

---

## 数据格式要求

### 必需字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | 数字 | 菜谱 ID（唯一） |
| name | 文本 | 菜名 |
| cooking_time | 数字 | 烹饪总时长（秒） |

### 可选字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| picture | 文本/附件 | 图片 URL |
| max_power | 数字 | 最大功率 |
| cook_steps | JSON 数组 | 烹饪步骤 |
| cooking_ingredient | JSON 数组 | 投料明细 |
| steps_images | JSON 数组 | 步骤配图 |
| version | 数字 | 版本号 |
| state | 数字 | 状态（0/1） |

### JSON 字段格式示例

#### cook_steps
```json
[
  {
    "id": 42000,
    "time": 0,
    "type": 3,
    "power": "8000.0",
    "commands": "开始烹饪"
  }
]
```

#### cooking_ingredient
```json
[
  {
    "cookingId": 42633,
    "ingredientsId": "MMYQTY00250",
    "ingredientsDosage": "50",
    "ingredientsUnit": "克"
  }
]
```

---

## 快速测试

如果表格还没准备好，可以先：

1. 点击主页 "📊 加载示例数据" 查看效果
2. 参考示例数据结构整理表格
3. 导出后上传

---

## 需要帮助？

把表格截图发给我，我帮你：
- 分析字段结构
- 生成数据转换脚本
- 配置自动同步
