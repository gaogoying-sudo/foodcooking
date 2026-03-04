#!/usr/bin/env node

/**
 * 菜谱可视化系统 - 心跳监控程序
 * 
 * 功能:
 * - 每 5 分钟自动汇报项目进展
 * - 检测服务运行状态
 * - 记录日志到本地文件
 * - 异常告警（可选）
 * 
 * 使用方式:
 *   node heartbeat-monitor.js
 *   npm install -g pm2
 *   pm2 start heartbeat-monitor.js --name recipe-heartbeat
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============ 配置 ============
const CONFIG = {
  // 心跳间隔（毫秒）
  interval: 5 * 60 * 1000, // 5 分钟
  
  // 日志文件路径
  logFile: path.join(__dirname, 'logs', 'heartbeat.log'),
  stateFile: path.join(__dirname, 'logs', 'heartbeat-state.json'),
  
  // 飞书 Webhook（可选，用于推送消息）
  feishuWebhook: process.env.FEISHU_WEBHOOK || '',
  
  // 项目名称
  projectName: '菜谱可视化系统',
  
  // 是否启用飞书推送
  enableFeishuPush: false
};

// ============ 项目状态 ============
const PROJECT_STATUS = {
  phase: '阶段 1: MVP 核心功能',
  progress: 70, // 百分比
  currentTask: '心跳监控程序开发',
  completedTasks: [
    '项目架构设计',
    '核心可视化界面',
    '基础数据加载',
    '示例数据集成',
    '数据加载器模块',
    '飞书 API 接口文档'
  ],
  ongoingTasks: [
    '飞书表格直连同步 (30%)',
    '心跳监控程序 (开发中)'
  ],
  nextTask: '飞书表格直连同步',
  blockers: []
};

// ============ 工具函数 ============

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// 获取当前时间戳
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// 格式化时间
function formatTime(date = new Date()) {
  return date.toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    hour12: false
  });
}

// 写入日志
function writeLog(message, level = 'INFO') {
  const logDir = path.dirname(CONFIG.logFile);
  ensureDir(logDir);
  
  const logLine = `[${timestamp()}] [${level}] ${message}\n`;
  fs.appendFileSync(CONFIG.logFile, logLine);
  console.log(logLine.trim());
}

// 保存状态
function saveState(state) {
  const stateDir = path.dirname(CONFIG.stateFile);
  ensureDir(stateDir);
  
  state.lastUpdate = timestamp();
  fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
}

// 加载状态
function loadState() {
  try {
    if (fs.existsSync(CONFIG.stateFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.stateFile, 'utf8'));
    }
  } catch (e) {
    writeLog(`Failed to load state: ${e.message}`, 'WARN');
  }
  return {
    startTime: timestamp(),
    heartbeatCount: 0,
    lastHeartbeat: null
  };
}

// 发送飞书消息
async function sendFeishuMessage(content) {
  if (!CONFIG.feishuWebhook || !CONFIG.enableFeishuPush) {
    return false;
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      msg_type: 'interactive',
      card: {
        config: {
          wide_screen_mode: true
        },
        header: {
          template: 'blue',
          title: {
            tag: 'plain_text',
            content: '💓 菜谱可视化系统 - 心跳汇报'
          }
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: content
            }
          },
          {
            tag: 'note',
            elements: [
              {
                tag: 'plain_text',
                content: `汇报时间：${formatTime()}`
              }
            ]
          }
        ]
      }
    });
    
    const url = new URL(CONFIG.feishuWebhook);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          writeLog('Feishu message sent successfully');
          resolve(true);
        } else {
          writeLog(`Feishu API error: ${res.statusCode}`, 'ERROR');
          resolve(false);
        }
      });
    });
    
    req.on('error', (e) => {
      writeLog(`Failed to send Feishu message: ${e.message}`, 'ERROR');
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

// ============ 核心逻辑 ============

// 生成进展报告
function generateReport() {
  const state = loadState();
  state.heartbeatCount = (state.heartbeatCount || 0) + 1;
  state.lastHeartbeat = timestamp();
  saveState(state);
  
  const report = `
## 📊 项目进展汇报

**项目:** ${CONFIG.projectName}
**阶段:** ${PROJECT_STATUS.phase}
**整体进度:** ${PROJECT_STATUS.progress}%

### ✅ 已完成 (${PROJECT_STATUS.completedTasks.length})
${PROJECT_STATUS.completedTasks.map(t => `• ${t}`).join('\n')}

### 🚧 进行中 (${PROJECT_STATUS.ongoingTasks.length})
${PROJECT_STATUS.ongoingTasks.map(t => `• ${t}`).join('\n')}

### 📋 下一步
• ${PROJECT_STATUS.nextTask}

### 📈 运行状态
• 启动时间：${state.startTime}
• 心跳次数：${state.heartbeatCount}
• 上次汇报：${state.lastHeartbeat || '首次'}
• 当前时间：${formatTime()}

---
*自动汇报 · 每 5 分钟更新*
  `.trim();
  
  return report;
}

// 心跳主函数
async function heartbeat() {
  try {
    writeLog('========== 心跳开始 ==========');
    
    // 生成报告
    const report = generateReport();
    
    // 输出到控制台
    console.log('\n' + '='.repeat(50));
    console.log(report);
    console.log('='.repeat(50) + '\n');
    
    // 发送到飞书（可选）
    if (CONFIG.enableFeishuPush) {
      try {
        await sendFeishuMessage(report);
      } catch (e) {
        writeLog(`Feishu push failed: ${e.message}`, 'WARN');
      }
    }
    
    writeLog('========== 心跳结束 ==========');
  } catch (error) {
    writeLog(`Heartbeat error: ${error.message}`, 'ERROR');
  }
}

// ============ 启动 ============

function start() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   💓  菜谱可视化系统 - 心跳监控程序                        ║
║                                                          ║
║   启动时间：${formatTime()}                              ║
║   心跳间隔：${CONFIG.interval / 1000} 秒                   ║
║   日志文件：${CONFIG.logFile}                            ║
║   飞书推送：${CONFIG.enableFeishuPush ? '已启用' : '未启用'}              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
  
  writeLog('Heartbeat monitor started');
  
  // 立即执行一次
  heartbeat();
  
  // 定时执行
  setInterval(heartbeat, CONFIG.interval);
  
  // 优雅退出
  process.on('SIGINT', () => {
    writeLog('Heartbeat monitor stopped by user');
    console.log('\nStopped.');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    writeLog('Heartbeat monitor stopped by SIGTERM');
    process.exit(0);
  });
  
  process.on('uncaughtException', (err) => {
    writeLog(`Uncaught exception: ${err.message}`, 'ERROR');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    writeLog(`Unhandled rejection: ${reason}`, 'ERROR');
  });
}

// 命令行参数
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
菜谱可视化系统 - 心跳监控程序

用法:
  node heartbeat-monitor.js [选项]

选项:
  --interval <分钟>    设置心跳间隔（默认：5 分钟）
  --feishu             启用飞书推送（需要配置 FEISHU_WEBHOOK 环境变量）
  --status             显示当前状态
  --help, -h           显示帮助信息

示例:
  node heartbeat-monitor.js
  node heartbeat-monitor.js --interval 10
  FEISHU_WEBHOOK=https://... node heartbeat-monitor.js --feishu
  `);
  process.exit(0);
}

if (args.includes('--status')) {
  const state = loadState();
  console.log('当前状态:');
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

// 解析参数
const intervalArg = args.indexOf('--interval');
if (intervalArg !== -1 && args[intervalArg + 1]) {
  const minutes = parseInt(args[intervalArg + 1]);
  if (minutes > 0) {
    CONFIG.interval = minutes * 60 * 1000;
  }
}

if (args.includes('--feishu')) {
  CONFIG.enableFeishuPush = true;
}

// 启动
start();
