/**
 * 统一路径管理
 *
 * Dev 环境：config.json / metadata.json / user-data.json 放在项目根目录，方便编辑
 * Production 环境：放在 server/data/ 下，通过 Docker volume 持久化
 * 封面等数据始终放在 server/data/
 */

const path = require('path');
const fs = require('fs');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SERVER_DATA_DIR = path.join(__dirname, '..', 'data');

const CONFIG_FILE = IS_PRODUCTION
  ? path.join(SERVER_DATA_DIR, 'config.json')
  : path.join(PROJECT_ROOT, 'config.json');

const METADATA_FILE = IS_PRODUCTION
  ? path.join(SERVER_DATA_DIR, 'metadata.json')
  : path.join(PROJECT_ROOT, 'metadata.json');

const COVERS_DIR = path.join(SERVER_DATA_DIR, 'covers');

const USER_DATA_FILE = IS_PRODUCTION
  ? path.join(SERVER_DATA_DIR, 'user-data.json')
  : path.join(PROJECT_ROOT, 'user-data.json');

function ensureDirs() {
  for (const dir of [SERVER_DATA_DIR, COVERS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

ensureDirs();

module.exports = {
  IS_PRODUCTION,
  PROJECT_ROOT,
  SERVER_DATA_DIR,
  CONFIG_FILE,
  METADATA_FILE,
  COVERS_DIR,
  USER_DATA_FILE,
};
