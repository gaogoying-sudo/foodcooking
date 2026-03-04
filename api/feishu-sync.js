# 飞书表格数据同步接口

## 概述

本模块提供从飞书多维表格（Bitable）批量导入菜谱数据的功能，支持上万条数据的高效加载。

## 数据结构要求

### 飞书表格字段规范

| 字段名 | 字段类型 | 必填 | 说明 |
|--------|----------|------|------|
| id | 数字 | ✅ | 菜谱 ID（主键） |
| name | 文本 | ✅ | 菜名 |
| picture | 附件/文本 | ❌ | 菜谱图片 URL |
| cooking_time | 数字 | ✅ | 烹饪总时长（秒） |
| max_power | 数字 | ❌ | 最大功率（W） |
| cook_steps | 多行文本/JSON | ✅ | 烹饪步骤（JSON 数组） |
| cooking_ingredient | 多行文本/JSON | ✅ | 投料明细（JSON 数组） |
| steps_images | 多行文本/JSON | ❌ | 步骤配图（JSON 数组） |
| version | 数字 | ❌ | 版本号 |
| state | 单选 | ❌ | 状态（0=下架，1=上架） |
| create_time | 日期时间 | ❌ | 创建时间 |
| update_time | 日期时间 | ❌ | 更新时间 |

### JSON 字段格式

#### cook_steps 格式
```json
[
  {
    "id": 42000,
    "time": 0,
    "type": 3,
    "power": "8000.0",
    "speed": "2.0",
    "commands": "开始烹饪",
    "automatic": "1",
    "position": "3",
    "direction": "1.0"
  }
]
```

#### cooking_ingredient 格式
```json
[
  {
    "id": 1975352,
    "recipeId": 138,
    "cookingId": 42633,
    "ingredientsId": "MMYQTY00250",
    "ingredientsDosage": "50",
    "ingredientsUnit": "克"
  }
]
```

#### steps_images 格式
```json
[
  {
    "id": 10309,
    "index": "1",
    "description": "螺丝椒滚刀切块长 5mm*宽 2cm",
    "image": "https://..."
  }
]
```

## API 接口

### 1. 从飞书表格加载数据

```javascript
// 配置
const config = {
  appToken: 'bascnXXXXXXXXXXXXXX',  // 从飞书表格 URL 获取
  tableId: 'tblXXXXXXXXXXXXXX',     // 表格 ID
  pageSize: 100,                     // 每页数量（最大 500）
  fields: ['id', 'name', 'cook_steps', ...]  // 需要的字段
};

// 加载所有数据
async function loadAllRecipes(config) {
  const allRecords = [];
  let pageToken = null;
  
  do {
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records?page_size=${config.pageSize}${pageToken ? '&page_token=' + pageToken : ''}`,
      {
        headers: {
          'Authorization': 'Bearer ' + config.accessToken
        }
      }
    );
    
    const data = await response.json();
    allRecords.push(...data.data.items);
    pageToken = data.data.page_token;
    
  } while (pageToken);
  
  return allRecords.map(record => transformRecord(record));
}
```

### 2. 数据转换

```javascript
function transformRecord(record) {
  const fields = record.fields;
  
  return {
    id: fields.id,
    name: fields.name,
    picture: fields.picture?.[0]?.url || fields.picture,
    cooking_time: fields.cooking_time,
    max_power: fields.max_power,
    cook_steps: parseJSON(fields.cook_steps),
    cooking_ingredient: parseJSON(fields.cooking_ingredient),
    steps_images: parseJSON(fields.steps_images),
    version: fields.version,
    state: fields.state,
    create_time: fields.create_time,
    update_time: fields.update_time
  };
}

function parseJSON(str) {
  if (!str) return [];
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
```

### 3. 批量导入接口

```javascript
// 提供给前端调用的接口
class RecipeImporter {
  constructor() {
    this.recipes = [];
    this.isLoading = false;
    this.progress = 0;
  }
  
  async importFromFeishu(config) {
    this.isLoading = true;
    this.progress = 0;
    
    try {
      const recipes = await loadAllRecipes(config);
      this.recipes = recipes;
      this.progress = 100;
      
      // 保存到本地存储
      localStorage.setItem('recipeVisualizerData', JSON.stringify(recipes));
      
      return {
        success: true,
        count: recipes.length,
        data: recipes
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isLoading = false;
    }
  }
  
  async importFromJSON(url) {
    const response = await fetch(url);
    const data = await response.json();
    this.recipes = Array.isArray(data) ? data : [data];
    return { success: true, count: this.recipes.length };
  }
  
  exportToJSON(filename = 'recipes.json') {
    const blob = new Blob([JSON.stringify(this.recipes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }
}
```

## 性能优化

### 1. 分页加载
- 每页 100-500 条记录
- 滚动到底部自动加载下一页
- 显示加载进度

### 2. 虚拟滚动
- 只渲染可视区域的菜谱卡片
- 大数据量时启用（>100 条）

### 3. 数据缓存
- 本地存储（localStorage）缓存
- IndexedDB 存储大量数据（>1000 条）
- 增量更新，避免全量刷新

### 4. 懒加载
- 详情数据点击时加载
- 图片延迟加载
- 非关键数据异步加载

## 使用示例

### 方式 1：直接在页面中配置
```html
<script>
const importer = new RecipeImporter();

// 配置飞书表格
const config = {
  appToken: 'bascnXXXXXXXXXXXXXX',
  tableId: 'tblXXXXXXXXXXXXXX',
  accessToken: 'YOUR_ACCESS_TOKEN'  // 需要后端代理
};

// 导入数据
importer.importFromFeishu(config).then(result => {
  if (result.success) {
    console.log(`成功导入 ${result.count} 个菜谱`);
    renderRecipeList();
  }
});
</script>
```

### 方式 2：通过后端 API 代理
```javascript
// 后端 Node.js 示例
app.get('/api/recipes', async (req, res) => {
  const { page = 1, pageSize = 100 } = req.query;
  
  const response = await fetch(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records?page=${page}&page_size=${pageSize}`,
    {
      headers: {
        'Authorization': 'Bearer ' + ACCESS_TOKEN
      }
    }
  );
  
  const data = await response.json();
  res.json(data);
});
```

## 安全注意事项

1. **Access Token 保护**
   - 不要在前端代码中硬编码 Token
   - 使用后端代理或环境变量
   - 定期刷新 Token

2. **权限控制**
   - 飞书应用需要相应权限
   - 只读取必要的字段
   - 设置合理的访问频率

3. **数据验证**
   - 验证导入数据的格式
   - 过滤恶意内容
   - 限制单次导入数量

## 后续扩展

- [ ] 支持实时同步（Webhook）
- [ ] 支持数据编辑回写
- [ ] 支持多表格合并
- [ ] 支持数据版本对比
- [ ] 支持批量操作（删除/更新）
