/**
 * IndexedDB 工具
 * 用于持久化存储：播放进度、收藏、离线缓存等
 */
import { openDB } from 'idb';

const DB_NAME = 'audiooook';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 播放进度存储
        if (!db.objectStoreNames.contains('playProgress')) {
          db.createObjectStore('playProgress', { keyPath: 'bookId' });
        }
        
        // 收藏存储
        if (!db.objectStoreNames.contains('favorites')) {
          const store = db.createObjectStore('favorites', { keyPath: 'bookId' });
          store.createIndex('addedAt', 'addedAt');
        }
        
        // 离线缓存音频
        if (!db.objectStoreNames.contains('audioCache')) {
          const store = db.createObjectStore('audioCache', { keyPath: 'key' });
          store.createIndex('bookId', 'bookId');
          store.createIndex('cachedAt', 'cachedAt');
        }
        
        // 缓存设置
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// ===== 播放进度 =====

export async function savePlayProgress(bookId, progress) {
  const db = await getDB();
  await db.put('playProgress', {
    bookId,
    ...progress,
    updatedAt: Date.now(),
  });
}

export async function getPlayProgress(bookId) {
  const db = await getDB();
  return db.get('playProgress', bookId);
}

export async function getAllPlayProgress() {
  const db = await getDB();
  return db.getAll('playProgress');
}

// ===== 收藏 =====

export async function addFavorite(bookId, bookInfo) {
  const db = await getDB();
  await db.put('favorites', {
    bookId,
    ...bookInfo,
    addedAt: Date.now(),
  });
}

export async function removeFavorite(bookId) {
  const db = await getDB();
  await db.delete('favorites', bookId);
}

export async function isFavorite(bookId) {
  const db = await getDB();
  const item = await db.get('favorites', bookId);
  return !!item;
}

export async function getAllFavorites() {
  const db = await getDB();
  return db.getAll('favorites');
}

// ===== 离线缓存 =====

export async function cacheAudio(key, bookId, audioBlob, metadata) {
  const db = await getDB();
  await db.put('audioCache', {
    key,
    bookId,
    blob: audioBlob,
    size: audioBlob.size,
    ...metadata,
    cachedAt: Date.now(),
  });
}

export async function getCachedAudio(key) {
  const db = await getDB();
  return db.get('audioCache', key);
}

export async function removeCachedAudio(key) {
  const db = await getDB();
  await db.delete('audioCache', key);
}

export async function getCachedAudioByBook(bookId) {
  const db = await getDB();
  return db.getAllFromIndex('audioCache', 'bookId', bookId);
}

export async function getAllCachedAudio() {
  const db = await getDB();
  return db.getAll('audioCache');
}

export async function getCacheSize() {
  const db = await getDB();
  const all = await db.getAll('audioCache');
  return all.reduce((total, item) => total + (item.size || 0), 0);
}

export async function clearOldCache(maxSizeBytes) {
  const db = await getDB();
  const all = await db.getAll('audioCache');
  
  // 按缓存时间排序，最老的在前
  all.sort((a, b) => a.cachedAt - b.cachedAt);
  
  let totalSize = all.reduce((sum, item) => sum + (item.size || 0), 0);
  
  // 删除最老的缓存直到低于限制
  for (const item of all) {
    if (totalSize <= maxSizeBytes) break;
    await db.delete('audioCache', item.key);
    totalSize -= item.size || 0;
  }
}

// ===== 设置 =====

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getSetting(key, defaultValue = null) {
  const db = await getDB();
  const item = await db.get('settings', key);
  return item ? item.value : defaultValue;
}
