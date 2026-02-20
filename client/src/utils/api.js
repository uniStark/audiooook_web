const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
}

// 书籍相关API
export const bookApi = {
  // 获取所有书籍
  getBooks: () => request('/books'),
  
  // 获取单本书详情
  getBook: (bookId) => request(`/books/${bookId}`),
  
  // 获取封面URL
  getCoverUrl: (bookId) => `${API_BASE}/books/${bookId}/cover`,
  
  // 更新书籍元数据
  updateMetadata: (bookId, data) => request(`/books/${bookId}/metadata`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  // 上传自定义封面
  uploadCover: (bookId, file) => {
    return fetch(`${API_BASE}/books/${bookId}/cover`, {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    }).then(res => res.json());
  },
  
  // 获取音频流URL
  getAudioUrl: (bookId, seasonId, episodeId) =>
    `${API_BASE}/audio/${bookId}/${seasonId}/${episodeId}`,
  
  // 获取音频下载URL
  getDownloadUrl: (bookId, seasonId, episodeId) =>
    `${API_BASE}/audio/download/${bookId}/${seasonId}/${episodeId}`,

  // 获取格式转换进度
  getConversionStatus: (bookId) =>
    request(`/books/${bookId}/conversion-status`),
};

// 用户数据API（服务端持久化：收藏、播放进度、用户设置）
export const userApi = {
  // 收藏
  getFavorites: () => request('/user/favorites'),
  addFavorite: (bookId, data) => request(`/user/favorites/${bookId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeFavorite: (bookId) => request(`/user/favorites/${bookId}`, { method: 'DELETE' }),
  // 播放进度
  getAllProgress: () => request('/user/progress'),
  saveProgress: (bookId, data) => request(`/user/progress/${bookId}`, { method: 'PUT', body: JSON.stringify(data) }),
  // 用户设置
  getSettings: () => request('/user/settings'),
  saveSettings: (data) => request(`/user/settings`, { method: 'PUT', body: JSON.stringify(data) }),
};

// 配置相关API
export const configApi = {
  getConfig: () => request('/config'),
  updateConfig: (data) => request('/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  // 浏览服务器目录
  browseDir: (dirPath) => request(`/config/browse?path=${encodeURIComponent(dirPath || '')}`),
};
