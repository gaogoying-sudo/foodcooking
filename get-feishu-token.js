#!/usr/bin/env node

/**
 * 飞书 API 凭证获取工具
 * 
 * 用法:
 *   node get-feishu-token.js
 * 
 * 需要配置环境变量或输入 App ID 和 App Secret
 */

const https = require('https');
const readline = require('readline');

// 配置
const FEISHU_API = {
  tenantToken: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
  userInfo: 'https://open.feishu.cn/open-apis/auth/v3/user_info',
  bitableTables: 'https://open.feishu.cn/open-apis/bitable/v1/apps'
};

// 读取命令行输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer));
  });
}

// HTTP POST 请求
function postRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// HTTP GET 请求
function getRequest(url, token) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// 获取 Tenant Access Token
async function getTenantToken(appId, appSecret) {
  console.log('\n📝 正在获取 Tenant Access Token...');
  
  const response = await postRequest(FEISHU_API.tenantToken, {
    app_id: appId,
    app_secret: appSecret
  });

  if (response.code === 0) {
    console.log('✅ Token 获取成功！');
    console.log(`   Token: ${response.tenant_access_token}`);
    console.log(`   有效期：${response.expire}秒 (${response.expire / 3600}小时)`);
    return response.tenant_access_token;
  } else {
    console.log('❌ Token 获取失败！');
    console.log(`   错误码：${response.code}`);
    console.log(`   错误信息：${response.msg}`);
    throw new Error(response.msg);
  }
}

// 测试 Token（获取用户信息）
async function testToken(token) {
  console.log('\n🧪 正在测试 Token...');
  
  const response = await getRequest(FEISHU_API.userInfo, token);
  
  if (response.code === 0) {
    console.log('✅ Token 有效！');
    console.log(`   用户 ID: ${response.data?.user_id}`);
    console.log(`   用户姓名：${response.data?.name}`);
    console.log(`   用户邮箱：${response.data?.email}`);
    return true;
  } else {
    console.log('❌ Token 无效！');
    console.log(`   错误码：${response.code}`);
    console.log(`   错误信息：${response.msg}`);
    return false;
  }
}

// 获取表格列表
async function getBitableTables(token, appToken) {
  console.log(`\n📊 正在获取表格列表 (${appToken})...`);
  
  const url = `${FEISHU_API.bitableTables}/${appToken}/tables`;
  const response = await getRequest(url, token);
  
  if (response.code === 0) {
    console.log('✅ 表格获取成功！');
    if (response.data?.items?.length > 0) {
      console.log(`   找到 ${response.data.items.length} 个表格:`);
      response.data.items.forEach((table, i) => {
        console.log(`   ${i + 1}. ${table.name} (ID: ${table.table_id})`);
      });
      return response.data.items;
    } else {
      console.log('   ⚠️  未找到表格');
      return [];
    }
  } else {
    console.log('❌ 表格获取失败！');
    console.log(`   错误码：${response.code}`);
    console.log(`   错误信息：${response.msg}`);
    console.log('\n💡 可能原因：');
    console.log('   1. 应用没有多维表格权限');
    console.log('   2. 表格不在应用可见范围');
    console.log('   3. App Token 不正确');
    return [];
  }
}

// 获取表格数据
async function getBitableRecords(token, appToken, tableId, pageSize = 10) {
  console.log(`\n📋 正在获取表格数据 (${tableId})...`);
  
  const url = `${FEISHU_API.bitableTables}/${appToken}/tables/${tableId}/records?page_size=${pageSize}`;
  const response = await getRequest(url, token);
  
  if (response.code === 0) {
    console.log('✅ 数据获取成功！');
    if (response.data?.items?.length > 0) {
      console.log(`   找到 ${response.data.items.length} 条记录`);
      
      // 显示第一条记录的结构
      const firstRecord = response.data.items[0];
      console.log('\n   第一条记录字段:');
      Object.keys(firstRecord.fields || {}).forEach(field => {
        const value = firstRecord.fields[field];
        const preview = JSON.stringify(value).substring(0, 50);
        console.log(`   - ${field}: ${preview}...`);
      });
      
      return response.data.items;
    } else {
      console.log('   ⚠️  表格为空');
      return [];
    }
  } else {
    console.log('❌ 数据获取失败！');
    console.log(`   错误码：${response.code}`);
    console.log(`   错误信息：${response.msg}`);
    return [];
  }
}

// 生成配置文件
function generateConfig(appId, appSecret, token, appToken, tableId) {
  const config = {
    feishu: {
      appId: appId,
      appSecret: appSecret,
      accessToken: token,
      appToken: appToken,
      tableId: tableId,
      apiUrl: 'https://open.feishu.cn/open-apis'
    },
    generatedAt: new Date().toISOString()
  };

  const content = `// 飞书 API 配置文件
// 由 get-feishu-token.js 自动生成
// 生成时间：${config.generatedAt}

module.exports = ${JSON.stringify(config, null, 2)};
`;

  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(__dirname, 'feishu-config.js');
  
  fs.writeFileSync(configPath, content);
  console.log(`\n💾 配置文件已生成：${configPath}`);
  console.log('   ⚠️  注意：此文件包含敏感信息，请勿上传到 Git！');
  
  return configPath;
}

// 主函数
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀  飞书 API 凭证获取工具                                ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);

  try {
    // 获取输入
    console.log('请输入飞书应用信息：\n');
    
    const appId = await question('App ID (cli_xxx): ');
    const appSecret = await question('App Secret: ');
    const appToken = await question('表格 App Token (NDt4sC5ChhWLddt3m7Vc1OwvnXc): ');
    
    if (!appId || !appSecret) {
      console.log('\n❌ App ID 和 App Secret 必填！');
      process.exit(1);
    }

    // 获取 Token
    const token = await getTenantToken(appId, appSecret);

    // 测试 Token
    const isValid = await testToken(token);
    if (!isValid) {
      process.exit(1);
    }

    // 获取表格列表
    if (appToken) {
      const tables = await getBitableTables(token, appToken);
      
      if (tables.length > 0) {
        const tableId = await question('\nTable ID (留空使用第一个): ');
        const selectedTableId = tableId || tables[0].table_id;
        
        // 获取示例数据
        await getBitableRecords(token, appToken, selectedTableId, 5);
        
        // 生成配置文件
        generateConfig(appId, appSecret, token, appToken, selectedTableId);
      }
    }

    // 输出配置信息
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  ✅ 配置完成！                                            ║
╠══════════════════════════════════════════════════════════╣
║  请在菜谱可视化系统中配置以下信息：                        ║
╠══════════════════════════════════════════════════════════╣
║  表格 URL: https://my.feishu.cn/sheets/${appToken}
║  App ID: ${appId}
║  Access Token: ${token}
║                                                          ║
║  ⚠️  App Secret 请妥善保管，不要泄露！                     ║
╚══════════════════════════════════════════════════════════╝
    `);

  } catch (error) {
    console.log(`\n❌ 发生错误：${error.message}`);
    console.log('\n💡 请检查：');
    console.log('   1. App ID 和 App Secret 是否正确');
    console.log('   2. 应用权限是否已发布');
    console.log('   3. 网络连接是否正常');
    process.exit(1);
  } finally {
    rl.close();
  }
}

// 运行
main();
