const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { isOSSConfigured, getOSSConfig } = require('../services/oss');
const { getAudiobookPath, setAudiobookPath } = require('../services/scanner');

const CONFIG_FILE = path.join(__dirname, '..', 'data', 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load config:', e);
  }
  return getDefaultConfig();
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

function getDefaultConfig() {
  return {
    cacheSizeMB: 300,
    audiobookPath: getAudiobookPath(),
    ossEnabled: isOSSConfigured(),
  };
}

/**
 * GET /api/config
 * 获取服务端配置
 */
router.get('/', (req, res) => {
  const config = loadConfig();
  res.json({
    success: true,
    data: {
      ...config,
      ossEnabled: isOSSConfigured(),
      audiobookPath: getAudiobookPath(),
    },
  });
});

/**
 * PUT /api/config
 * 更新服务端配置
 */
router.put('/', (req, res) => {
  try {
    const currentConfig = loadConfig();
    const { cacheSizeMB, audiobookPath } = req.body;

    if (cacheSizeMB !== undefined) {
      currentConfig.cacheSizeMB = Math.max(50, Math.min(5000, Number(cacheSizeMB)));
    }

    if (audiobookPath !== undefined) {
      const resolved = path.resolve(audiobookPath);
      if (!fs.existsSync(resolved)) {
        return res.status(400).json({ success: false, error: '目录不存在: ' + resolved });
      }
      if (!fs.statSync(resolved).isDirectory()) {
        return res.status(400).json({ success: false, error: '路径不是目录: ' + resolved });
      }
      currentConfig.audiobookPath = resolved;
      setAudiobookPath(resolved);
    }

    saveConfig(currentConfig);
    res.json({ success: true, data: { ...currentConfig, audiobookPath: getAudiobookPath() } });
  } catch (e) {
    console.error('Failed to update config:', e);
    res.status(500).json({ success: false, error: '更新配置失败' });
  }
});

/**
 * GET /api/config/browse
 * 浏览服务器目录（用于选择有声书路径）
 * query: path - 要浏览的目录路径，默认为根目录
 */
router.get('/browse', (req, res) => {
  try {
    let targetPath = req.query.path || '';

    // 默认起始目录
    if (!targetPath) {
      if (process.platform === 'win32') {
        targetPath = 'C:\\';
      } else {
        targetPath = '/';
      }
    }

    const resolved = path.resolve(targetPath);

    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: '目录不存在' });
    }

    if (!fs.statSync(resolved).isDirectory()) {
      return res.status(400).json({ success: false, error: '不是目录' });
    }

    // 读取子目录
    const entries = [];
    try {
      const items = fs.readdirSync(resolved, { withFileTypes: true });
      for (const item of items) {
        // 只列出目录，跳过隐藏目录和系统目录
        if (!item.isDirectory()) continue;
        if (item.name.startsWith('.')) continue;
        if (['node_modules', 'proc', 'sys', 'dev', '$Recycle.Bin', 'System Volume Information'].includes(item.name)) continue;

        // 检查是否有读取权限
        const fullPath = path.join(resolved, item.name);
        try {
          fs.accessSync(fullPath, fs.constants.R_OK);
          entries.push({
            name: item.name,
            path: fullPath,
          });
        } catch {
          // 无权限，跳过
        }
      }
    } catch (e) {
      return res.status(403).json({ success: false, error: '无法读取目录: ' + e.message });
    }

    // 按名称排序
    entries.sort((a, b) => a.name.localeCompare(b.name));

    // 计算父目录
    const parentPath = path.dirname(resolved);
    const hasParent = parentPath !== resolved; // 根目录时 dirname === 自身

    // 检查当前目录是否包含有声书（含音频文件的子目录）
    let hasAudioContent = false;
    try {
      const items = fs.readdirSync(resolved, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          hasAudioContent = true;
          break;
        }
      }
    } catch { /* ignore */ }

    // Windows 下列出可用盘符
    let drives = null;
    if (process.platform === 'win32' && (resolved === path.parse(resolved).root)) {
      drives = [];
      for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const drivePath = letter + ':\\';
        if (fs.existsSync(drivePath)) {
          drives.push({ name: letter + ':', path: drivePath });
        }
      }
    }

    res.json({
      success: true,
      data: {
        current: resolved,
        parent: hasParent ? parentPath : null,
        entries,
        drives,
        hasAudioContent,
      },
    });
  } catch (e) {
    console.error('Browse error:', e);
    res.status(500).json({ success: false, error: '浏览目录失败' });
  }
});

module.exports = router;
