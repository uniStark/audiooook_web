const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { 
  scanAudiobooks, 
  getBookDetail, 
  getCoverPath, 
  updateBookMetadata 
} = require('../services/scanner');

/**
 * GET /api/books
 * 获取所有有声书列表
 */
router.get('/', (req, res) => {
  try {
    const books = scanAudiobooks();
    // 返回简化的书籍列表（不含完整的episodes数据）
    const bookList = books.map(book => ({
      id: book.id,
      name: book.name,
      folderName: book.folderName,
      description: book.description,
      hasCover: book.hasCoverFile || !!book.cover,
      skipIntro: book.skipIntro,
      skipOutro: book.skipOutro,
      seasonCount: book.seasons.length,
      totalEpisodes: book.totalEpisodes,
    }));
    res.json({ success: true, data: bookList });
  } catch (e) {
    console.error('Failed to scan audiobooks:', e);
    res.status(500).json({ success: false, error: '扫描有声书失败' });
  }
});

/**
 * GET /api/books/:bookId
 * 获取单本书详情（含季和集信息）
 */
router.get('/:bookId', (req, res) => {
  try {
    const book = getBookDetail(req.params.bookId);
    if (!book) {
      return res.status(404).json({ success: false, error: '书籍不存在' });
    }
    
    // 不返回文件系统路径（安全考虑）
    const safeBook = {
      ...book,
      path: undefined,
      seasons: book.seasons.map(s => ({
        ...s,
        path: undefined,
        episodes: s.episodes.map(e => ({
          ...e,
          filePath: undefined,
        })),
      })),
    };
    
    res.json({ success: true, data: safeBook });
  } catch (e) {
    console.error('Failed to get book detail:', e);
    res.status(500).json({ success: false, error: '获取书籍详情失败' });
  }
});

/**
 * GET /api/books/:bookId/cover
 * 获取封面图片
 */
router.get('/:bookId/cover', (req, res) => {
  try {
    const coverPath = getCoverPath(req.params.bookId);
    if (coverPath && fs.existsSync(coverPath)) {
      return res.sendFile(coverPath);
    }
    // 返回默认封面（空的SVG）
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#1e293b"/>
      <text x="100" y="90" text-anchor="middle" font-size="60" fill="#f59e0b">📚</text>
      <text x="100" y="140" text-anchor="middle" font-size="14" fill="#94a3b8" font-family="sans-serif">有声书</text>
    </svg>`);
  } catch (e) {
    res.status(500).json({ success: false, error: '获取封面失败' });
  }
});

/**
 * PUT /api/books/:bookId/metadata
 * 更新书籍元数据（自定义名称、简介、跳过片头片尾等）
 */
router.put('/:bookId/metadata', (req, res) => {
  try {
    const { customName, description, skipIntro, skipOutro, customCover } = req.body;
    const updates = {};
    
    if (customName !== undefined) updates.customName = customName;
    if (description !== undefined) updates.description = description;
    if (skipIntro !== undefined) updates.skipIntro = Number(skipIntro) || 0;
    if (skipOutro !== undefined) updates.skipOutro = Number(skipOutro) || 0;
    if (customCover !== undefined) updates.customCover = customCover;
    
    const meta = updateBookMetadata(req.params.bookId, updates);
    res.json({ success: true, data: meta });
  } catch (e) {
    console.error('Failed to update metadata:', e);
    res.status(500).json({ success: false, error: '更新元数据失败' });
  }
});

/**
 * POST /api/books/:bookId/cover
 * 上传自定义封面
 */
router.post('/:bookId/cover', express.raw({ type: 'image/*', limit: '5mb' }), (req, res) => {
  try {
    const dataDir = path.join(__dirname, '..', 'data', 'covers');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const contentType = req.headers['content-type'] || 'image/jpeg';
    const ext = contentType.split('/')[1] || 'jpg';
    const coverFile = path.join(dataDir, `${req.params.bookId}.${ext}`);
    
    fs.writeFileSync(coverFile, req.body);
    updateBookMetadata(req.params.bookId, { customCover: coverFile });
    
    res.json({ success: true, message: '封面上传成功' });
  } catch (e) {
    console.error('Failed to upload cover:', e);
    res.status(500).json({ success: false, error: '上传封面失败' });
  }
});

module.exports = router;
