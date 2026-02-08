import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  HiOutlineTrash, 
  HiOutlineServerStack,
  HiOutlineFolderOpen,
  HiOutlineCloud
} from 'react-icons/hi2';
import { configApi } from '../utils/api';
import { getCacheSize, getAllCachedAudio, removeCachedAudio, setSetting, getSetting } from '../utils/db';
import { formatSize } from '../utils/format';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [cacheSize, setCacheSize] = useState(0);
  const [cachedCount, setCachedCount] = useState(0);
  const [cacheLimitMB, setCacheLimitMB] = useState(300);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadConfig();
    loadCacheInfo();
    loadLocalSettings();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await configApi.getConfig();
      setConfig(res.data);
      if (res.data.cacheSizeMB) {
        setCacheLimitMB(res.data.cacheSizeMB);
      }
    } catch (e) {
      console.error('Failed to load config:', e);
    }
  };

  const loadCacheInfo = async () => {
    const size = await getCacheSize();
    const all = await getAllCachedAudio();
    setCacheSize(size);
    setCachedCount(all.length);
  };

  const loadLocalSettings = async () => {
    const limit = await getSetting('cacheLimitMB', 300);
    setCacheLimitMB(limit);
  };

  const handleClearCache = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      const all = await getAllCachedAudio();
      for (const item of all) {
        await removeCachedAudio(item.key);
      }
      await loadCacheInfo();
    } finally {
      setClearing(false);
    }
  };

  const handleCacheLimitChange = async (value) => {
    const mb = Math.max(50, Math.min(5000, parseInt(value) || 300));
    setCacheLimitMB(mb);
    await setSetting('cacheLimitMB', mb);
    try {
      await configApi.updateConfig({ cacheSizeMB: mb });
    } catch (e) {
      // 离线时忽略
    }
  };

  const cachePercentage = cacheLimitMB > 0 ? Math.min(100, (cacheSize / (cacheLimitMB * 1024 * 1024)) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-container"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">设置</h1>
      </div>

      <div className="space-y-4">
        {/* 服务器信息 */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <HiOutlineServerStack className="w-5 h-5 text-primary-500" />
            <h2 className="font-semibold">服务器</h2>
          </div>
          {config ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-dark-400 flex items-center gap-2">
                  <HiOutlineFolderOpen className="w-4 h-4" />
                  有声书路径
                </span>
                <span className="text-dark-200 text-xs truncate max-w-[200px]">
                  {config.audiobookPath}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-dark-400 flex items-center gap-2">
                  <HiOutlineCloud className="w-4 h-4" />
                  OSS存储
                </span>
                <span className={config.ossEnabled ? 'text-green-500' : 'text-dark-500'}>
                  {config.ossEnabled ? '已启用' : '未配置'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-dark-500">加载中...</p>
          )}
        </div>

        {/* 缓存管理 */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">离线缓存</h2>
            <span className="text-xs text-dark-400">{cachedCount} 个文件</span>
          </div>
          
          {/* 缓存用量条 */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-dark-400">已使用 {formatSize(cacheSize)}</span>
              <span className="text-dark-500">限制 {cacheLimitMB}MB</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  cachePercentage > 90 ? 'bg-red-500' : 
                  cachePercentage > 70 ? 'bg-yellow-500' : 'bg-primary-500'
                }`}
                style={{ width: `${cachePercentage}%` }}
              />
            </div>
          </div>

          {/* 缓存大小设置 */}
          <div className="mb-4">
            <label className="text-sm text-dark-400 mb-2 block">
              缓存大小限制：{cacheLimitMB} MB
            </label>
            <input
              type="range"
              min="50"
              max="5000"
              step="50"
              value={cacheLimitMB}
              onChange={(e) => handleCacheLimitChange(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-dark-500 mt-1">
              <span>50MB</span>
              <span>5GB</span>
            </div>
          </div>

          {/* 清除缓存 */}
          <button
            onClick={handleClearCache}
            disabled={clearing || cacheSize === 0}
            className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {clearing ? (
              <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <HiOutlineTrash className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {clearing ? '清除中...' : '清除所有缓存'}
            </span>
          </button>
        </div>

        {/* 关于 */}
        <div className="glass-card p-4">
          <h2 className="font-semibold mb-3">关于</h2>
          <div className="space-y-2 text-sm text-dark-400">
            <p>AudioBook - 在线听书 v1.0.0</p>
            <p>支持格式：MP3, WMA, WAV, FLAC, AAC, OGG, M4A, OPUS</p>
            <p className="text-dark-500 text-xs mt-2">
              将有声书文件夹按照"小说名/季(章节)/集"的结构放入服务器指定目录即可自动识别
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
