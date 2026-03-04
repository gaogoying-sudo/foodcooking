#!/usr/bin/env node

/**
 * 飞书数据同步脚本 - 批量获取菜谱数据
 * 
 * 功能：
 * 1. 分页获取飞书多维表格数据（每页 500 条）
 * 2. 合并所有页面数据
 * 3. 保存到 recipes-v5.json
 * 
 * 配置：
 * - APP_TOKEN: Bqb0bjwJ7aPgbcsilWdcmT9dnWd
 * - TABLE_ID: tbl2mjOTRvC3t4zE
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const CONFIG = {
  appToken: 'Bqb0bjwJ7aPgbcsilWdcmT9dnWd',
  tableId: 'tbl2mjOTRvC3t4zE',
  pageSize: 500,
  outputFile: path.join(__dirname, '..', 'data', 'recipes-v5.json')
};

/**
 * HTTP GET 请求
 */
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`解析 JSON 失败：${e.message}\n原始数据：${data.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

/**
 * 获取单页数据
 */
async function fetchPage(pageToken = null) {
  const options = {
    hostname: 'open.feishu.cn',
    port: 443,
    path: `/open-apis/bitable/v1/apps/${CONFIG.appToken}/tables/${CONFIG.tableId}/records?page_size=${CONFIG.pageSize}${pageToken ? '&page_token=' + pageToken : ''}`,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  const result = await httpRequest(options);
  return result.data || { items: [], has_more: false };
}

/**
 * 批量获取所有数据
 */
async function fetchAllData() {
  console.log('🚀 开始同步飞书数据...');
  console.log(`AppToken: ${CONFIG.appToken}`);
  console.log(`TableId: ${CONFIG.tableId}`);
  console.log('================================');
  
  const allRecords = [];
  let pageToken = null;
  let pageCount = 0;
  
  do {
    pageCount++;
    console.log(`📄 获取第 ${pageCount} 页...`);
    
    try {
      const data = await fetchPage(pageToken);
      const items = data.items || [];
      allRecords.push(...items);
      
      console.log(`   本页 ${items.length} 条，累计 ${allRecords.length} 条`);
      
      pageToken = data.has_more ? data.page_token : null;
      
      // 每 5 页保存一次进度
      if (pageCount % 5 === 0) {
        saveProgress(allRecords, pageCount);
      }
    } catch (e) {
      console.error(`❌ 第 ${pageCount} 页获取失败：${e.message}`);
      throw e;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 200));
    
  } while (pageToken);
  
  console.log('================================');
  console.log(`✅ 完成！共获取 ${allRecords.length} 条菜谱`);
  
  return allRecords;
}

/**
 * 保存进度
 */
function saveProgress(records, pageCount) {
  const outputData = {
    meta: {
      total: records.length,
      syncedAt: new Date().toISOString(),
      source: 'feishu_bitable',
      appToken: CONFIG.appToken,
      tableId: CONFIG.tableId,
      pageCount: pageCount
    },
    recipes: records
  };
  
  const tempFile = CONFIG.outputFile + '.temp';
  fs.writeFileSync(tempFile, JSON.stringify(outputData, null, 2));
  console.log(`💾 进度已保存 (${records.length} 条)`);
}

/**
 * 主函数
 */
async function main() {
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(CONFIG.outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 获取所有数据
    const allRecords = await fetchAllData();
    
    // 保存最终结果
    const outputData = {
      meta: {
        total: allRecords.length,
        syncedAt: new Date().toISOString(),
        source: 'feishu_bitable',
        appToken: CONFIG.appToken,
        tableId: CONFIG.tableId
      },
      recipes: allRecords
    };
    
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(outputData, null, 2));
    console.log(`📦 数据已保存：${CONFIG.outputFile}`);
    
    // 清理临时文件
    const tempFile = CONFIG.outputFile + '.temp';
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
  } catch (e) {
    console.error('❌ 同步失败:', e.message);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchAllData };
