#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const APP_TOKEN = 'Bqb0bjwJ7aPgbcsilWdcmT9dnWd';
const TABLE_ID = 'tbl2mjOTRvC3t4zE';
const PAGE_SIZE = 500;
const OUTPUT_FILE = path.join(__dirname, 'data', 'recipes-v5.json');

let allRecipes = [];
let pageToken = null;
let pageCount = 0;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function fetchPage(token = null) {
  const postData = { page_size: PAGE_SIZE };
  if (token) postData.page_token = token;
  
  const options = {
    hostname: 'open.feishu.cn',
    port: 443,
    path: `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  };
  
  const res = await request(options, null);
  return res.data || { items: [], has_more: false };
}

async function main() {
  console.log('🚀 开始获取飞书数据...');
  
  do {
    pageCount++;
    console.log(`📄 获取第 ${pageCount} 页...`);
    
    try {
      const data = await fetchPage(pageToken);
      const items = data.items || [];
      allRecipes = allRecipes.concat(items);
      console.log(`✅ 已获取 ${allRecipes.length} 条记录`);
      
      pageToken = data.has_more ? data.page_token : null;
      
      // 每页保存一次，防止中断丢失
      if (pageCount % 5 === 0) {
        saveProgress();
      }
    } catch (e) {
      console.error('❌ 获取失败:', e.message);
      pageToken = null;
    }
  } while (pageToken);
  
  saveProgress();
  console.log(`✨ 完成！共获取 ${allRecipes.length} 条菜谱`);
}

function saveProgress() {
  const output = {
    meta: {
      total: allRecipes.length,
      syncedAt: new Date().toISOString(),
      source: 'feishu_bitable',
      appToken: APP_TOKEN,
      tableId: TABLE_ID
    },
    recipes: allRecipes
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`💾 已保存到 ${OUTPUT_FILE}`);
}

main().catch(console.error);
