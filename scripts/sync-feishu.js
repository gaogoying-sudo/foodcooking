#!/usr/bin/env node
/**
 * 飞书菜谱数据同步器 - V5
 * 获取全部 13469 条菜谱数据
 */

const fs = require('fs');
const path = require('path');

// 配置
const APP_TOKEN = 'Bqb0bjwJ7aPgbcsilWdcmT9dnWd';
const TABLE_ID = 'tbl2mjOTRvC3t4zE';
const OUTPUT_FILE = path.join(__dirname, 'data', 'recipes-v5.json');
const PAGE_SIZE = 500;

// 模拟飞书 API 响应（实际应该调用 API）
async function fetchPage(pageToken = null) {
    // TODO: 实际调用飞书 API
    // 这里先模拟数据结构
    return {
        records: [],
        has_more: false,
        page_token: null,
        total: 13469
    };
}

async function syncAllRecipes() {
    console.log('🚀 开始同步飞书菜谱数据...');
    console.log(`📊 目标：获取全部 13469 条记录`);
    
    const allRecipes = [];
    let pageToken = null;
    let pageCount = 0;
    
    do {
        pageCount++;
        console.log(`📄 获取第 ${pageCount} 页...`);
        
        const response = await fetchPage(pageToken);
        allRecipes.push(...response.records);
        
        pageToken = response.page_token;
        console.log(`✅ 已获取 ${allRecipes.length} 条记录`);
        
    } while (pageToken);
    
    // 保存数据
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
    console.log(`💾 数据已保存到：${OUTPUT_FILE}`);
    console.log(`✨ 同步完成！共 ${allRecipes.length} 条菜谱`);
}

syncAllRecipes().catch(console.error);
