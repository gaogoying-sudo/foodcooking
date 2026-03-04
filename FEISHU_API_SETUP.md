# 飞书开放平台 API 配置教程

**目标：** 获取飞书 API 访问权限，让菜谱可视化系统能读取你的表格数据

**预计时间：** 10-15 分钟

---

## 📋 准备工作

- ✅ 飞书账号（管理员权限或有应用创建权限）
- ✅ 飞书桌面客户端或网页版
- ✅ 浏览器

---

## 步骤 1: 访问飞书开放平台

### 1.1 打开开发者后台
访问：https://open.feishu.cn/

### 1.2 登录
- 点击右上角 "登录"
- 使用你的飞书账号扫码或密码登录

---

## 步骤 2: 创建企业自建应用

### 2.1 进入应用管理
- 登录后，点击顶部导航 "应用开发" → "企业自建应用"

### 2.2 创建应用
- 点击 "+ 创建应用"
- 填写应用信息：
  - **应用名称：** 菜谱可视化系统
  - **应用图标：** 随便选一个（或上传）
  - **应用描述：** 用于读取菜谱表格数据

### 2.3 记录 App ID
- 创建成功后，进入应用详情页
- **复制 App ID**（格式：`cli_xxxxxxxxxxxxx`）
- 这个稍后要用！

---

## 步骤 3: 配置应用权限

### 3.1 进入权限管理
- 在应用详情页，点击左侧 "权限管理"

### 3.2 添加权限
需要添加以下权限：

| 权限名称 | 权限标识 | 用途 |
|----------|----------|------|
| 获取云空间文件列表 | `drive:files` | 访问表格文件 |
| 读取云空间文件内容 | `drive:files:readonly` | 读取表格数据 |
| 访问多维表格 | `bitable:tables` | 读取多维表格 |
| 以应用身份访问多维表格 | `bitable:tables:app_access` | 应用级访问 |

### 3.3 申请权限
- 点击 "申请权限" 或 "添加权限"
- 搜索上述权限标识
- 勾选后点击 "确定"

### 3.4 发布应用
- 点击左侧 "版本管理与发布"
- 点击 "发布应用"
- 填写版本信息（随便写）
- 点击 "发布"

---

## 步骤 4: 获取凭证信息

### 4.1 进入凭证管理
- 在应用详情页，点击左侧 "凭证管理"

### 4.2 获取 App Secret
- 点击 "App Secret" 旁的 "查看" 或 "重置"
- **复制 App Secret**（一串随机字符）
- ⚠️ 这个只显示一次，务必保存好！

### 4.3 获取 Access Token（两种方式）

#### 方式 A: 使用 Tenant Access Token（推荐）
适用于访问企业内公开资源

**获取方法：**
```bash
curl -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "cli_xxxxxxxxxxxxx",
    "app_secret": "xxxxxxxxxxxxxxxxx"
  }'
```

**返回示例：**
```json
{
  "code": 0,
  "msg": "success",
  "tenant_access_token": "t-xxxxxxxxxxxxxxxxx",
  "expire": 7200
}
```

#### 方式 B: 使用 User Access Token
适用于访问个人资源

需要在应用中配置回调 URL，较复杂，暂不推荐。

---

## 步骤 5: 将应用添加到飞书（可选）

如果表格在个人空间，需要：

### 5.1 进入应用版本
- 点击 "版本管理与发布"
- 点击最新版本

### 5.2 添加可见范围
- 点击 "添加可见范围"
- 选择你自己
- 保存

### 5.3 在飞书中启用应用
- 打开飞书客户端
- 左侧边栏找到 "应用"
- 找到 "菜谱可视化系统"
- 点击启用

---

## 步骤 6: 获取表格 ID

### 6.1 打开表格
访问：https://my.feishu.cn/sheets/NDt4sC5ChhWLddt3m7Vc1OwvnXc

### 6.2 提取表格信息
从 URL 中提取：
- **Token:** `NDt4sC5ChhWLddt3m7Vc1OwvnXc`
- **Table ID:** 打开表格后，查看 URL 中的 `?table=xxxxxxxx` 参数

---

## 步骤 7: 测试 API 访问

### 7.1 获取 Access Token
```bash
# 替换为你的 App ID 和 App Secret
curl -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "你的 App ID",
    "app_secret": "你的 App Secret"
  }'
```

### 7.2 测试读取表格
```bash
# 替换 Token 和表格 ID
curl -X GET "https://open.feishu.cn/open-apis/bitable/v1/apps/NDt4sC5ChhWLddt3m7Vc1OwvnXc/tables" \
  -H "Authorization: Bearer 你的 Access Token"
```

### 7.3 成功响应
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "items": [
      {
        "table_id": "tblxxxxxxxxxxxxxx",
        "name": "菜谱数据"
      }
    ]
  }
}
```

---

## 步骤 8: 配置到系统中

### 8.1 打开配置界面
- 刷新浏览器中的 `index.html`
- 点击 "🔗 飞书表格同步"

### 8.2 填写配置
- **表格 URL:** `https://my.feishu.cn/sheets/NDt4sC5ChhWLddt3m7Vc1OwvnXc`
- **App ID:** `cli_xxxxxxxxxxxxx`
- **App Secret:** `xxxxxxxxxxxxxxxxx`
- **Access Token:** `t-xxxxxxxxxxxxxxxxx`（如有）

### 8.3 保存配置
- 点击 "保存配置"
- 系统会测试连接

---

## 🔧 快速命令参考

### 获取 Tenant Access Token
```bash
curl -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "cli_xxx",
    "app_secret": "xxx"
  }'
```

### 获取表格列表
```bash
curl -X GET "https://open.feishu.cn/open-apis/bitable/v1/apps/TOKEN/tables" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 获取表格数据
```bash
curl -X GET "https://open.feishu.cn/open-apis/bitable/v1/apps/TOKEN/tables/TABLE_ID/records?page_size=100" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## ⚠️ 常见问题

### Q1: 权限申请失败
**原因：** 账号没有管理员权限  
**解决：** 联系飞书管理员审批，或使用个人应用

### Q2: API 返回 403
**原因：** 权限未发布或 Token 过期  
**解决：** 检查应用是否发布，重新获取 Token

### Q3: 读取不到表格数据
**原因：** 表格不在应用可见范围  
**解决：** 将表格分享给应用，或设置公开访问

### Q4: Token 有效期多久？
**回答：** Tenant Access Token 默认 2 小时  
**解决：** 系统会自动刷新，或手动重新获取

---

## 📝 信息收集表

配置完成后，把以下信息发给我：

| 信息 | 值 | 备注 |
|------|-----|------|
| App ID | `cli_xxx` | 必填 |
| App Secret | `xxx` | 必填（私下发） |
| Access Token | `t-xxx` | 可选（可自动生成） |
| 表格 Token | `NDt4sC5ChhWLddt3m7Vc1OwvnXc` | 已有 |
| Table ID | `tbl_xxx` | 打开表格后获取 |

---

## 🎯 下一步

拿到凭证后，我会：

1. ✅ 编写后端代理脚本（Node.js）
2. ✅ 配置自动数据同步
3. ✅ 测试读取表格数据
4. ✅ 生成可视化界面

---

## 📞 需要帮助？

遇到问题随时截图发给我，我会：
- 远程协助配置
- 生成自动化脚本
- 处理权限问题

**开始配置吧！有问题随时问！** 🚀
