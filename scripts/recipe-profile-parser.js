#!/usr/bin/env node

/**
 * RecipeProfile 解析器 - V6 核心组件
 * 
 * 功能：
 * 1. 从飞书原始数据解析出标准 RecipeProfile 结构
 * 2. cook_steps 去重（按 recipeId,time,type,commands,power 唯一键）
 * 3. cooking_ingredient 去重（按 recipeId,cookingId,ingredientsId 唯一键）
 * 4. 计算结构化特征（total_time, step_count, manual_count 等）
 * 5. 风险标记（重复投料、剂量冲突等）
 * 
 * 输入：飞书原始 JSON
 * 输出：标准 RecipeProfile JSON
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const CONFIG = {
  inputDir: path.join(__dirname, '..', 'data'),
  outputDir: path.join(__dirname, '..', 'data', 'processed'),
  inputFile: 'recipes-v5.json',
  outputFile: 'recipe-profiles.json'
};

// ============ 工具函数 ============

/**
 * 唯一键生成
 */
function generateStepKey(step) {
  return `${step.recipeId || ''}|${step.time || ''}|${step.type || ''}|${step.commands || ''}|${step.power || ''}`;
}

function generateIngredientKey(ing) {
  return `${ing.recipeId || ''}|${ing.cookingId || ''}|${ing.ingredientsId || ''}`;
}

/**
 * cook_steps 去重
 * 策略：按唯一键去重，保留第一条
 */
function dedupSteps(steps) {
  if (!Array.isArray(steps)) return [];
  
  const seen = new Map();
  const result = [];
  
  for (const step of steps) {
    const key = generateStepKey(step);
    if (!seen.has(key)) {
      seen.set(key, step);
      result.push(step);
    }
  }
  
  return result;
}

/**
 * cooking_ingredient 去重
 * 策略：按唯一键去重，保留第一条
 */
function dedupIngredients(ingredients) {
  if (!Array.isArray(ingredients)) return [];
  
  const seen = new Map();
  const result = [];
  
  for (const ing of ingredients) {
    const key = generateIngredientKey(ing);
    if (!seen.has(key)) {
      seen.set(key, ing);
      result.push(ing);
    }
  }
  
  return result;
}

/**
 * 解析时间轴事件
 */
function parseTimeline(steps, ingredients) {
  const controls = [];
  const manual_ops = [];
  const auto_dosing = [];
  
  // 解析控制事件（type 3 = 功率控制）
  steps.forEach(step => {
    if (step.type === 3 && step.power) {
      controls.push({
        t: step.time || 0,
        power: parseFloat(step.power) || 0,
        speed: parseFloat(step.speed) || 0,
        mode: step.mode || 0,
        position: step.position || '',
        commands: step.commands || ''
      });
    }
    
    // 解析手动操作（type 1）
    if (step.type === 1 && step.commands) {
      manual_ops.push({
        t: step.time || 0,
        text: step.commands,
        automatic: step.automatic === '1'
      });
    }
    
    // 解析自动投料（type 2）
    if (step.type === 2 && step.commands && step.automatic === '1') {
      auto_dosing.push({
        t: step.time || 0,
        text: step.commands,
        automatic: true
      });
    }
  });
  
  // 解析食材明细
  const ingredientDetails = ingredients.map(ing => ({
    t: 0, // 需要关联到 step 的 time
    ingredientsId: ing.ingredientsId || '',
    dosage: parseFloat(ing.ingredientsDosage) || 0,
    unit: ing.ingredientsUnit || '克',
    automatic: ing.insideand === '1'
  }));
  
  return { controls, manual_ops, auto_dosing, ingredientDetails };
}

/**
 * 计算结构化特征
 */
function calculateFeatures(steps, ingredients, timeline) {
  const total_time = Math.max(...steps.map(s => s.thedofTime || s.time || 0), 0);
  const step_count = steps.length;
  const manual_count = timeline.manual_ops.length;
  const auto_dosing_count = timeline.auto_dosing.length;
  const power_switch_count = countPowerSwitches(timeline.controls);
  const concurrent_event_max = countConcurrentEvents(steps);
  
  // 风险标记
  const risk_flags = [];
  
  // 检查重复投料
  const ingredientMap = new Map();
  ingredients.forEach(ing => {
    const key = `${ing.cookingId}|${ing.ingredientsId}`;
    if (ingredientMap.has(key)) {
      risk_flags.push({
        type: 'duplicate_ingredient',
        recipeId: ing.recipeId,
        cookingId: ing.cookingId,
        ingredientsId: ing.ingredientsId,
        message: `食材 ${ing.ingredientsId} 重复投放`
      });
    }
    ingredientMap.set(key, ing);
  });
  
  // 检查剂量冲突
  // TODO: 比较 commands 中的剂量与 ingredients 明细
  
  return {
    total_time,
    step_count,
    manual_count,
    auto_dosing_count,
    power_switch_count,
    concurrent_event_max,
    auto_dosing_ratio: step_count > 0 ? (auto_dosing_count / step_count).toFixed(2) : 0,
    risk_flags
  };
}

/**
 * 计算功率切换次数
 */
function countPowerSwitches(controls) {
  if (controls.length < 2) return 0;
  
  let count = 0;
  let lastPower = controls[0].power;
  
  for (const ctrl of controls) {
    if (ctrl.power !== lastPower) {
      count++;
      lastPower = ctrl.power;
    }
  }
  
  return count;
}

/**
 * 计算同一 time 的最大并发事件数
 */
function countConcurrentEvents(steps) {
  const timeMap = new Map();
  
  steps.forEach(step => {
    const t = step.time || 0;
    timeMap.set(t, (timeMap.get(t) || 0) + 1);
  });
  
  return Math.max(...timeMap.values(), 0);
}

/**
 * 食材汇总
 */
function summarizeIngredients(ingredients) {
  const summary = new Map();
  
  ingredients.forEach(ing => {
    const id = ing.ingredientsId || 'unknown';
    const dosage = parseFloat(ing.ingredientsDosage) || 0;
    
    if (!summary.has(id)) {
      summary.set(id, {
        ingredientsId: id,
        total_dosage: 0,
        unit: ing.ingredientsUnit || '克',
        auto_count: 0,
        manual_count: 0
      });
    }
    
    const item = summary.get(id);
    item.total_dosage += dosage;
    if (ing.insideand === '1') {
      item.auto_count++;
    } else {
      item.manual_count++;
    }
  });
  
  return Array.from(summary.values());
}

/**
 * 提取旋钮候选
 */
function extractKnobCandidates(recipe) {
  const knobs = [];
  
  // 根据食材推断
  const ingredients = recipe.cooking_ingredient || [];
  const steps = recipe.cook_steps || [];
  
  // 辣度：辣椒/花椒/辣酱
  if (ingredients.some(i => i.ingredientsId?.includes('辣椒') || i.ingredientsId?.includes('花椒'))) {
    knobs.push('辣度');
  }
  
  // 咸度：盐/生抽/蚝油
  if (ingredients.some(i => i.ingredientsId?.includes('盐') || i.ingredientsId?.includes('生抽') || i.ingredientsId?.includes('蚝油'))) {
    knobs.push('咸度');
  }
  
  // 油量：油类食材
  if (ingredients.some(i => i.ingredientsId?.includes('油'))) {
    knobs.push('油量');
  }
  
  // 甜度：糖/蜂蜜
  if (ingredients.some(i => i.ingredientsId?.includes('糖') || i.ingredientsId?.includes('蜜'))) {
    knobs.push('甜度');
  }
  
  // 嫩度：肉类 + 功率控制
  const hasMeat = ingredients.some(i => i.ingredientsId?.includes('肉') || i.ingredientsId?.includes('猪') || i.ingredientsId?.includes('牛'));
  const hasPowerControl = steps.some(s => s.type === 3 && s.power);
  if (hasMeat && hasPowerControl) {
    knobs.push('嫩度');
  }
  
  // 默认至少包含基础旋钮
  if (knobs.length === 0) {
    knobs.push('咸度', '油量');
  }
  
  return [...new Set(knobs)];
}

/**
 * 解析单条菜谱
 */
function parseRecipe(rawRecipe) {
  const fields = rawRecipe.fields || rawRecipe;
  
  // 解析 JSON 字段
  let steps = [];
  let ingredients = [];
  
  try {
    if (typeof fields.cook_steps === 'string') {
      steps = JSON.parse(fields.cook_steps);
    } else if (Array.isArray(fields.cook_steps)) {
      steps = fields.cook_steps;
    }
  } catch (e) {
    console.warn(`解析 cook_steps 失败：${e.message}`);
  }
  
  try {
    if (typeof fields.cooking_ingredient === 'string') {
      ingredients = JSON.parse(fields.cooking_ingredient);
    } else if (Array.isArray(fields.cooking_ingredient)) {
      ingredients = fields.cooking_ingredient;
    }
  } catch (e) {
    console.warn(`解析 cooking_ingredient 失败：${e.message}`);
  }
  
  // 去重
  const dedupedSteps = dedupSteps(steps);
  const dedupedIngredients = dedupIngredients(ingredients);
  
  // 解析时间轴
  const timeline = parseTimeline(dedupedSteps, dedupedIngredients);
  
  // 计算特征
  const features = calculateFeatures(dedupedSteps, dedupedIngredients, timeline);
  
  // 食材汇总
  const ingredients_summary = summarizeIngredients(dedupedIngredients);
  
  // 旋钮候选
  const knobs_candidates = extractKnobCandidates(fields);
  
  // 构建 RecipeProfile
  const profile = {
    meta: {
      id: fields.id || fields['id（1）'] || fields.recipe_id || 0,
      name: fields.name || '未命名',
      picture: fields.picture || '',
      version: fields.version || '1',
      lang: fields.lang || 'cn',
      portion_size: fields.portion_size || 1,
      cook_time: fields.cook_time || fields.cooking_time || 0,
      max_power: fields.max_power || 12000
    },
    timeline: {
      controls: timeline.controls,
      manual_ops: timeline.manual_ops,
      auto_dosing: timeline.auto_dosing
    },
    features: features,
    ingredients_summary: ingredients_summary,
    knobs_candidates: knobs_candidates,
    _raw: {
      steps_count: steps.length,
      ingredients_count: ingredients.length,
      deduped_steps_count: dedupedSteps.length,
      deduped_ingredients_count: dedupedIngredients.length
    }
  };
  
  return profile;
}

/**
 * 批量解析
 */
function parseAllRecipes(inputData) {
  const recipes = inputData.recipes || inputData.records || inputData;
  const profiles = [];
  const stats = {
    total: recipes.length,
    success: 0,
    failed: 0,
    errors: []
  };
  
  console.log(`开始解析 ${recipes.length} 条菜谱...`);
  
  recipes.forEach((recipe, index) => {
    try {
      const profile = parseRecipe(recipe);
      profiles.push(profile);
      stats.success++;
      
      if ((index + 1) % 1000 === 0) {
        console.log(`已解析 ${index + 1}/${recipes.length} 条`);
      }
    } catch (e) {
      stats.failed++;
      stats.errors.push({
        index,
        recipeId: recipe.fields?.id || recipe.fields?.['id（1）'] || 'unknown',
        error: e.message
      });
      console.warn(`解析失败 [${index}]: ${e.message}`);
    }
  });
  
  return { profiles, stats };
}

// ============ 主函数 ============

async function main() {
  console.log('🚀 RecipeProfile 解析器启动');
  console.log('================================');
  
  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // 读取输入文件（支持多种格式）
  const inputFiles = [
    path.join(CONFIG.inputDir, 'recipes-excel.json'),  // 新增：Excel 解析结果
    path.join(CONFIG.inputDir, 'recipes-full.json'),
    path.join(CONFIG.inputDir, 'recipes.json'),
    path.join(CONFIG.inputDir, CONFIG.inputFile)
  ].filter(f => fs.existsSync(f));
  
  if (inputFiles.length === 0) {
    console.error('❌ 未找到输入文件');
    process.exit(1);
  }
  
  console.log(`找到 ${inputFiles.length} 个输入文件`);
  
  const allProfiles = [];
  const totalStats = { total: 0, success: 0, failed: 0, errors: [] };
  
  for (const inputPath of inputFiles) {
    console.log(`\n📄 处理：${inputPath}`);
    
    let inputData;
    try {
      const content = fs.readFileSync(inputPath, 'utf-8');
      inputData = JSON.parse(content);
    } catch (e) {
      console.error(`读取失败：${e.message}`);
      continue;
    }
    
    // 批量解析
    const { profiles, stats } = parseAllRecipes(inputData);
    allProfiles.push(...profiles);
    
    totalStats.total += stats.total;
    totalStats.success += stats.success;
    totalStats.failed += stats.failed;
    totalStats.errors.push(...stats.errors);
  }
  
  const profiles = allProfiles;
  const stats = totalStats;
  
  // 输出统计
  console.log('================================');
  console.log('✅ 解析完成');
  console.log(`总计：${stats.total} 条`);
  console.log(`成功：${stats.success} 条`);
  console.log(`失败：${stats.failed} 条`);
  
  if (stats.errors.length > 0) {
    console.log('\n错误详情：');
    stats.errors.slice(0, 10).forEach(err => {
      console.log(`  [${err.index}] Recipe ${err.recipeId}: ${err.error}`);
    });
  }
  
  // 保存输出
  const outputPath = path.join(CONFIG.outputDir, CONFIG.outputFile);
  const outputData = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: CONFIG.inputFile,
      total: stats.total,
      success: stats.success,
      failed: stats.failed
    },
    profiles: profiles
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\n📦 输出文件：${outputPath}`);
  
  // 保存统计信息
  const statsPath = path.join(CONFIG.outputDir, 'parse-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`📊 统计文件：${statsPath}`);
  
  console.log('\n✅ 完成！');
}

// 运行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { parseRecipe, parseAllRecipes };
