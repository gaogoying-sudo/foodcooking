/**
 * 数据加载器 - 支持大规模菜谱数据的高效加载
 * 
 * 功能：
 * - 分页加载
 * - 虚拟滚动
 * - 本地缓存
 * - 增量更新
 */

class RecipeDataLoader {
  constructor(options = {}) {
    this.options = {
      pageSize: options.pageSize || 100,
      cacheEnabled: options.cacheEnabled !== false,
      virtualScrollThreshold: options.virtualScrollThreshold || 100,
      storageKey: 'recipeVisualizerData',
      ...options
    };
    
    this.recipes = [];
    this.filteredRecipes = [];
    this.isLoading = false;
    this.pageToken = null;
    this.hasMore = false;
    this.callbacks = {
      onLoad: null,
      onError: null,
      onProgress: null
    };
  }
  
  // 加载本地缓存
  loadFromCache() {
    if (!this.options.cacheEnabled) return [];
    
    try {
      const data = localStorage.getItem(this.options.storageKey);
      if (data) {
        this.recipes = JSON.parse(data);
        this.filteredRecipes = [...this.recipes];
        return this.recipes;
      }
    } catch (e) {
      console.error('Failed to load from cache:', e);
    }
    return [];
  }
  
  // 保存到本地缓存
  saveToCache() {
    if (!this.options.cacheEnabled) return;
    
    try {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.recipes));
    } catch (e) {
      // localStorage 满了，尝试清理旧数据
      if (e.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old data...');
        localStorage.removeItem(this.options.storageKey);
        // 尝试存储前 500 条
        const limited = this.recipes.slice(0, 500);
        localStorage.setItem(this.options.storageKey, JSON.stringify(limited));
      }
    }
  }
  
  // 从 JSON 文件加载
  async loadFromJSON(url) {
    this.isLoading = true;
    this._notifyProgress(0);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      this.recipes = Array.isArray(data) ? data : [data];
      this.filteredRecipes = [...this.recipes];
      
      this.saveToCache();
      this._notifyProgress(100);
      
      return {
        success: true,
        count: this.recipes.length,
        data: this.recipes
      };
    } catch (error) {
      this._notifyError(error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isLoading = false;
    }
  }
  
  // 从文件上传加载
  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      this.isLoading = true;
      this._notifyProgress(0);
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.recipes = Array.isArray(data) ? data : [data];
          this.filteredRecipes = [...this.recipes];
          
          this.saveToCache();
          this._notifyProgress(100);
          this.isLoading = false;
          
          resolve({
            success: true,
            count: this.recipes.length,
            data: this.recipes
          });
        } catch (error) {
          this._notifyError(error);
          this.isLoading = false;
          reject(error);
        }
      };
      
      reader.onerror = () => {
        const error = new Error('Failed to read file');
        this._notifyError(error);
        this.isLoading = false;
        reject(error);
      };
      
      reader.readAsText(file);
    });
  }
  
  // 从飞书表格加载（需要后端代理）
  async loadFromFeishu(config) {
    this.isLoading = true;
    this.pageToken = null;
    this._notifyProgress(0);
    
    const allRecords = [];
    
    try {
      do {
        const params = new URLSearchParams({
          page_size: this.options.pageSize
        });
        
        if (this.pageToken) {
          params.append('page_token', this.pageToken);
        }
        
        const url = `${config.apiUrl || '/api/feishu'}/apps/${config.appToken}/tables/${config.tableId}/records?${params}`;
        
        const response = await fetch(url, {
          headers: config.headers || {}
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const records = data.data?.items || [];
        
        // 转换记录格式
        const transformed = records.map(record => this._transformRecord(record.fields));
        allRecords.push(...transformed);
        
        this.pageToken = data.data?.page_token;
        this.hasMore = !!this.pageToken;
        
        // 更新进度
        const progress = Math.min(90, Math.round((allRecords.length / (config.estimatedTotal || 1000)) * 100));
        this._notifyProgress(progress);
        
      } while (this.hasMore && this.pageToken);
      
      this.recipes = allRecords;
      this.filteredRecipes = [...this.recipes];
      
      this.saveToCache();
      this._notifyProgress(100);
      
      return {
        success: true,
        count: this.recipes.length,
        data: this.recipes
      };
    } catch (error) {
      this._notifyError(error);
      return {
        success: false,
        error: error.message,
        partialData: allRecords
      };
    } finally {
      this.isLoading = false;
    }
  }
  
  // 单条记录转换
  _transformRecord(fields) {
    return {
      id: fields.id,
      name: fields.name,
      picture: this._extractImageUrl(fields.picture),
      cooking_time: fields.cooking_time || 0,
      max_power: fields.max_power || 0,
      cook_steps: this._parseJSON(fields.cook_steps),
      cooking_ingredient: this._parseJSON(fields.cooking_ingredient),
      steps_images: this._parseJSON(fields.steps_images),
      version: fields.version,
      state: fields.state,
      create_time: fields.create_time,
      update_time: fields.update_time,
      // 保留原始字段以便扩展
      _raw: fields
    };
  }
  
  // 提取图片 URL
  _extractImageUrl(pictureField) {
    if (!pictureField) return null;
    if (typeof pictureField === 'string') return pictureField;
    if (Array.isArray(pictureField) && pictureField.length > 0) {
      return pictureField[0].url || pictureField[0].link;
    }
    return null;
  }
  
  // 解析 JSON 字段
  _parseJSON(field) {
    if (!field) return [];
    if (typeof field === 'object') return field;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return [];
      }
    }
    return [];
  }
  
  // 搜索过滤
  search(query, filters = {}) {
    const q = query.toLowerCase().trim();
    
    this.filteredRecipes = this.recipes.filter(recipe => {
      // 文本搜索
      const matchQuery = !q || 
        recipe.name.toLowerCase().includes(q) ||
        recipe.id.toString().includes(q);
      
      // 状态过滤
      const matchState = !filters.state || recipe.state === filters.state;
      
      // 时长过滤
      const matchTime = !filters.maxTime || (recipe.cooking_time || 0) <= filters.maxTime;
      
      return matchQuery && matchState && matchTime;
    });
    
    return this.filteredRecipes;
  }
  
  // 获取分页数据
  getPage(page = 1, pageSize = this.options.pageSize) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return this.filteredRecipes.slice(start, end);
  }
  
  // 获取总数
  getTotal() {
    return this.filteredRecipes.length;
  }
  
  // 获取总页数
  getTotalPages(pageSize = this.options.pageSize) {
    return Math.ceil(this.getTotal() / pageSize);
  }
  
  // 虚拟滚动：获取可视区域数据
  getVisibleData(scrollTop, viewportHeight, itemHeight = 200) {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight);
    const buffer = 5; // 额外加载的缓冲区
    
    return {
      startIndex: Math.max(0, startIndex - buffer),
      endIndex: Math.min(this.getTotal(), endIndex + buffer),
      data: this.filteredRecipes.slice(
        Math.max(0, startIndex - buffer),
        Math.min(this.getTotal(), endIndex + buffer)
      )
    };
  }
  
  // 添加菜谱
  addRecipe(recipe) {
    this.recipes.push(recipe);
    this.filteredRecipes = [...this.recipes];
    this.saveToCache();
    return recipe;
  }
  
  // 更新菜谱
  updateRecipe(id, updates) {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index === -1) return null;
    
    this.recipes[index] = { ...this.recipes[index], ...updates };
    this.filteredRecipes = [...this.recipes];
    this.saveToCache();
    return this.recipes[index];
  }
  
  // 删除菜谱
  deleteRecipe(id) {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index === -1) return false;
    
    this.recipes.splice(index, 1);
    this.filteredRecipes = [...this.recipes];
    this.saveToCache();
    return true;
  }
  
  // 批量导入
  async batchImport(newRecipes, options = {}) {
    const { merge = true, onProgress } = options;
    
    if (merge) {
      // 合并模式：根据 ID 去重
      const existingIds = new Set(this.recipes.map(r => r.id));
      const toAdd = newRecipes.filter(r => !existingIds.has(r.id));
      this.recipes.push(...toAdd);
      
      if (onProgress) {
        onProgress({ added: toAdd.length, skipped: newRecipes.length - toAdd.length });
      }
    } else {
      // 覆盖模式
      this.recipes = newRecipes;
    }
    
    this.filteredRecipes = [...this.recipes];
    this.saveToCache();
    
    return {
      success: true,
      total: this.recipes.length,
      added: merge ? newRecipes.filter(r => !this.recipes.map(r => r.id).includes(r.id)).length : newRecipes.length
    };
  }
  
  // 导出
  exportJSON(filename = 'recipes.json') {
    const blob = new Blob([JSON.stringify(this.recipes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // 清除缓存
  clearCache() {
    localStorage.removeItem(this.options.storageKey);
    this.recipes = [];
    this.filteredRecipes = [];
  }
  
  // 回调设置
  onLoad(callback) {
    this.callbacks.onLoad = callback;
    return this;
  }
  
  onError(callback) {
    this.callbacks.onError = callback;
    return this;
  }
  
  onProgress(callback) {
    this.callbacks.onProgress = callback;
    return this;
  }
  
  // 内部通知
  _notifyProgress(progress) {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress({ progress, isLoading: this.isLoading });
    }
  }
  
  _notifyError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }
  
  // 统计分析
  getStats() {
    const stats = {
      total: this.recipes.length,
      withImages: 0,
      withSteps: 0,
      withIngredients: 0,
      avgCookingTime: 0,
      stateCounts: {}
    };
    
    let totalTime = 0;
    
    this.recipes.forEach(recipe => {
      if (recipe.picture) stats.withImages++;
      if (recipe.cook_steps?.length > 0) stats.withSteps++;
      if (recipe.cooking_ingredient?.length > 0) stats.withIngredients++;
      totalTime += recipe.cooking_time || 0;
      
      const state = recipe.state || 'unknown';
      stats.stateCounts[state] = (stats.stateCounts[state] || 0) + 1;
    });
    
    stats.avgCookingTime = this.recipes.length > 0 
      ? Math.round(totalTime / this.recipes.length) 
      : 0;
    
    return stats;
  }
}

// 导出给全局使用
if (typeof window !== 'undefined') {
  window.RecipeDataLoader = RecipeDataLoader;
}
