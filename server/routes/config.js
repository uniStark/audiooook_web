const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { isOSSConfigured, getOSSConfig } = require('../services/oss');
const { getAudiobookPath } = require('../services/scanner');

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
    const { cacheSizeMB } = req.body;
    
    if (cacheSizeMB !== undefined) {
      currentConfig.cacheSizeMB = Math.max(50, Math.min(5000, Number(cacheSizeMB)));
    }
    
    saveConfig(currentConfig);
    res.json({ success: true, data: currentConfig });
  } catch (e) {
    console.error('Failed to update config:', e);
    res.status(500).json({ success: false, error: '更新配置失败' });
  }
});

module.exports = router;
