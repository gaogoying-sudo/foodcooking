#!/usr/bin/env node

/**
 * Excel 数据解析器 - 解析飞书导出的 Excel 文件
 * 
 * 功能：
 * 1. 读取 Excel 文件（.xlsx）
 * 2. 解析菜谱数据
 * 3. 转换成标准格式
 * 4. 输出为 JSON
 * 
 * 依赖：npm install xlsx
 */

const fs = require('fs');
const path = require('path');

// 检查 xlsx 模块
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.error('❌ 缺少 xlsx 模块，请运行：npm install xlsx');
  console.error('或者使用 CSV 格式导出');
  process.exit(1);
}

// ============ 配置 ============
const CONFIG = {
  inputFile: '/Users/mac/Downloads/Result_27.xlsx',
  outputDir: path.join(__dirname, '..', 'data'),
  outputFile: 'recipes-excel.json'
};

/**
 * 读取 Excel 文件
 */
function readExcel(filePath) {
  console.log(`📄 读取 Excel 文件：${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // 读取第一个 sheet
  const worksheet = workbook.Sheets[sheetName];
  
  console.log(`📊 Sheet 名称：${sheetName}`);
  
  // 转换成 JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`📈 行数：${jsonData.length}`);
  
  return jsonData;
}

/**
 * 解析 Excel 数据
 * 假设第一行是表头
 */
function parseExcelData(rows) {
  if (rows.length < 2) {
    console.error('❌ 数据行数不足');
    return [];
  }
  
  // 第一行是表头
  const headers = rows[0].map(h => String(h || '').trim());
  console.log(`📋 表头字段：${headers.length} 个`);
  console.log(`   ${headers.join(', ')}`);
  
  const recipes = [];
  
  // 从第二行开始解析数据
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    const recipe = {};
    headers.forEach((header, index) => {
      const value = row[index];
      
      // 跳过空值
      if (value === undefined || value === null || value === '') return;
      
      // 根据字段名转换
      switch (header.toLowerCase()) {
        case 'id':
        case 'recipe_id':
        case 'id（1）':
          recipe.id = parseInt(value) || 0;
          break;
        
        case 'name':
        case 'recipe_name':
          recipe.name = String(value);
          break;
        
        case 'cook_time':
        case 'cooking_time':
        case 'total_time':
          recipe.cooking_time = parseInt(value) || 0;
          break;
        
        case 'max_power':
        case 'power':
          recipe.max_power = parseInt(value) || 12000;
          break;
        
        case 'cook_steps':
        case 'steps':
          try {
            recipe.cook_steps = typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            console.warn(`⚠️ 解析 cook_steps 失败 [行${i+1}]: ${e.message}`);
            recipe.cook_steps = [];
          }
          break;
        
        case 'cooking_ingredient':
        case 'ingredients':
          try {
            recipe.cooking_ingredient = typeof value === 'string' ? JSON.parse(value) : value;
          } catch (e) {
            console.warn(`⚠️ 解析 cooking_ingredient 失败 [行${i+1}]: ${e.message}`);
            recipe.cooking_ingredient = [];
          }
          break;
        
        case 'picture':
        case 'image':
        case 'image_url':
          recipe.picture = String(value);
          break;
        
        case 'portion_size':
        case 'portion':
          recipe.portion_size = parseInt(value) || 1;
          break;
        
        case 'version':
          recipe.version = String(value);
          break;
        
        case 'lang':
        case 'language':
          recipe.lang = String(value);
          break;
        
        default:
          // 其他字段保存到 _extra
          if (!recipe._extra) recipe._extra = {};
          recipe._extra[header] = value;
      }
    });
    
    // 至少需要有 id 或 name
    if (recipe.id || recipe.name) {
      recipes.push(recipe);
    }
  }
  
  return recipes;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Excel 数据解析器启动');
  console.log('================================');
  
  // 检查输入文件
  if (!fs.existsSync(CONFIG.inputFile)) {
    console.error(`❌ 输入文件不存在：${CONFIG.inputFile}`);
    process.exit(1);
  }
  
  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  try {
    // 读取 Excel
    const rows = readExcel(CONFIG.inputFile);
    
    // 解析数据
    const recipes = parseExcelData(rows);
    
    console.log('\n================================');
    console.log(`✅ 解析完成`);
    console.log(`总计：${recipes.length} 条菜谱`);
    
    // 保存输出
    const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
    const outputData = {
      meta: {
        total: recipes.length,
        syncedAt: new Date().toISOString(),
        source: 'excel_export',
        inputFile: CONFIG.inputFile
      },
      recipes: recipes
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n📦 输出文件：${outputPath}`);
    console.log(`📊 文件大小：${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ 完成！');
    
  } catch (e) {
    console.error('❌ 解析失败:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { readExcel, parseExcelData };
