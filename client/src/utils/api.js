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
  
  // 获取音频流URL
  getAudioUrl: (bookId, seasonId, episodeId) =>
    `${API_BASE}/audio/${bookId}/${seasonId}/${episodeId}`,
  
  // 获取音频下载URL
  getDownloadUrl: (bookId, seasonId, episodeId) =>
    `${API_BASE}/audio/download/${bookId}/${seasonId}/${episodeId}`,
};

// 配置相关API
export const configApi = {
  getConfig: () => request('/config'),
  updateConfig: (data) => request('/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};
