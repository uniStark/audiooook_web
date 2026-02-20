const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getBookDetail } = require('../services/scanner');
const { getExtension } = require('../utils/parser');

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
 * 流式传输音频文件，支持 Range 请求
 */
router.get('/:bookId/:seasonId/:episodeId', (req, res) => {
  try {
    const { bookId, seasonId, episodeId } = req.params;
    const result = findEpisode(bookId, seasonId, episodeId);
    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }
    streamFile(result.episode.filePath, req, res);
  } catch (e) {
    console.error('Audio streaming error:', e);
    res.status(500).json({ success: false, error: '音频流错误' });
  }
});

/**
 * GET /api/audio/download/:bookId/:seasonId/:episodeId
 * 下载音频文件
 */
router.get('/download/:bookId/:seasonId/:episodeId', (req, res) => {
  try {
    const { bookId, seasonId, episodeId } = req.params;
    const result = findEpisode(bookId, seasonId, episodeId);
    if (result.error) {
      return res.status(404).json({ success: false, error: result.error });
    }

    const { episode } = result;
    const stat = fs.statSync(episode.filePath);
    const mimeType = getMimeType(getExtension(episode.filePath));

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(episode.fileName)}"`);

    fs.createReadStream(episode.filePath).pipe(res);
  } catch (e) {
    console.error('Audio download error:', e);
    res.status(500).json({ success: false, error: '下载失败' });
  }
});

function streamFile(filePath, req, res) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getMimeType(getExtension(filePath));
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
