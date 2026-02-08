const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getBookDetail } = require('../services/scanner');
const { needsTranscode, getExtension } = require('../utils/parser');

// 转码缓存目录
const TRANSCODE_CACHE_DIR = path.join(__dirname, '..', 'data', 'transcode-cache');
if (!fs.existsSync(TRANSCODE_CACHE_DIR)) {
  fs.mkdirSync(TRANSCODE_CACHE_DIR, { recursive: true });
}

// 正在转码中的文件（防止并发重复转码）
const transcodingInProgress = new Map();

/**
 * 获取转码缓存文件路径
 */
function getTranscodeCachePath(bookId, seasonId, episodeId) {
  return path.join(TRANSCODE_CACHE_DIR, `${bookId}_${seasonId}_${episodeId}.mp3`);
}

/**
 * 确保转码缓存文件存在（不存在则转码）
 * 返回缓存文件路径
 */
async function ensureTranscoded(filePath, bookId, seasonId, episodeId) {
  const cachePath = getTranscodeCachePath(bookId, seasonId, episodeId);
  
  // 已有缓存，直接返回
  if (fs.existsSync(cachePath)) {
    // 校验缓存文件大小是否合理（>1KB说明不是损坏文件）
    const stat = fs.statSync(cachePath);
    if (stat.size > 1024) {
      return cachePath;
    }
    // 缓存文件损坏，删除后重新转码
    fs.unlinkSync(cachePath);
  }

  // 检查是否正在转码中
  const cacheKey = `${bookId}_${seasonId}_${episodeId}`;
  if (transcodingInProgress.has(cacheKey)) {
    // 等待正在进行的转码完成
    return transcodingInProgress.get(cacheKey);
  }

  // 开始转码
  const transcodePromise = new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    const tempPath = cachePath + '.tmp';

    console.log(`[Transcode] 开始转码: ${path.basename(filePath)} -> MP3`);
    const startTime = Date.now();

    const ffmpeg = spawn('ffmpeg', [
      '-i', filePath,
      '-f', 'mp3',
      '-ab', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-y',           // 覆盖已有文件
      '-v', 'quiet',
      tempPath,
    ]);

    ffmpeg.on('close', (code) => {
      transcodingInProgress.delete(cacheKey);
      if (code === 0 && fs.existsSync(tempPath)) {
        // 转码成功，重命名为正式缓存文件
        fs.renameSync(tempPath, cachePath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Transcode] 转码完成 (${elapsed}s): ${path.basename(filePath)}`);
        resolve(cachePath);
      } else {
        // 清理临时文件
        try { fs.unlinkSync(tempPath); } catch {}
        reject(new Error(`转码失败 (exit code: ${code})`));
      }
    });

    ffmpeg.on('error', (err) => {
      transcodingInProgress.delete(cacheKey);
      try { fs.unlinkSync(tempPath); } catch {}
      reject(err);
    });
  });

  transcodingInProgress.set(cacheKey, transcodePromise);
  return transcodePromise;
}

/**
 * 查找音频集的信息
 */
function findEpisode(bookId, seasonId, episodeId) {
  const book = getBookDetail(bookId);
  if (!book) return { error: '书籍不存在' };

  const season = book.seasons.find(s => s.id === seasonId);
  if (!season) return { error: '季不存在' };

  const episode = season.episodes.find(e => e.id === episodeId);
  if (!episode) return { error: '集不存在' };

  if (!fs.existsSync(episode.filePath)) return { error: '音频文件不存在' };

  return { book, season, episode };
}

/**
 * GET /api/audio/:bookId/:seasonId/:episodeId
 * 流式传输音频文件，支持Range请求（拖拽进度条）
 */
router.get('/:bookId/:seasonId/:episodeId', async (req, res) => {
  try {
    const { bookId, seasonId, episodeId } = req.params;
    const result = findEpisode(bookId, seasonId, episodeId);
    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }

    const { episode } = result;

    // 需要转码的格式：先转码到缓存文件，再以标准文件方式提供（支持Range）
    if (needsTranscode(episode.fileName)) {
      try {
        const cachedFile = await ensureTranscoded(episode.filePath, bookId, seasonId, episodeId);
        return streamDirectly(cachedFile, req, res);
      } catch (e) {
        console.error('Transcode error:', e);
        return res.status(500).json({ success: false, error: '音频转码失败，请确认已安装ffmpeg' });
      }
    }

    // 直接流式传输
    return streamDirectly(episode.filePath, req, res);
  } catch (e) {
    console.error('Audio streaming error:', e);
    res.status(500).json({ success: false, error: '音频流错误' });
  }
});

/**
 * GET /api/audio/download/:bookId/:seasonId/:episodeId
 * 下载音频文件（用于离线缓存）
 */
router.get('/download/:bookId/:seasonId/:episodeId', async (req, res) => {
  try {
    const { bookId, seasonId, episodeId } = req.params;
    const result = findEpisode(bookId, seasonId, episodeId);
    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }

    const { episode } = result;
    let servePath = episode.filePath;
    let serveName = episode.fileName;

    // 转码后下载
    if (needsTranscode(episode.fileName)) {
      try {
        servePath = await ensureTranscoded(episode.filePath, bookId, seasonId, episodeId);
        serveName = path.basename(episode.fileName, path.extname(episode.fileName)) + '.mp3';
      } catch (e) {
        return res.status(500).json({ success: false, error: '转码失败' });
      }
    }

    const stat = fs.statSync(servePath);
    const ext = getExtension(servePath);
    const mimeType = getMimeType(ext);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(serveName)}"`);
    
    fs.createReadStream(servePath).pipe(res);
  } catch (e) {
    console.error('Audio download error:', e);
    res.status(500).json({ success: false, error: '下载失败' });
  }
});

/**
 * 直接流式传输音频（支持Range请求）
 */
function streamDirectly(filePath, req, res) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = getExtension(filePath);
  const mimeType = getMimeType(ext);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(filePath).pipe(res);
  }
}

/**
 * 获取MIME类型
 */
function getMimeType(ext) {
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
    '.wma': 'audio/x-ms-wma',
    '.opus': 'audio/opus',
    '.ape': 'audio/ape',
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

module.exports = router;
