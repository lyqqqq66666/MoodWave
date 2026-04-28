import axios from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 情绪相关接口
export const moodAPI = {
  create: (data: any) => apiClient.post('/api/moods', data),
  list: (params?: any) => apiClient.get('/api/moods', { params }),
  get: (id: string) => apiClient.get(`/api/moods/${id}`),
  update: (id: string, data: any) => apiClient.put(`/api/moods/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/moods/${id}`),
}

// 情绪分析接口
export const analyticsAPI = {
  weekly: () => apiClient.get('/api/analytics/weekly'),
  summary: () => apiClient.get('/api/analytics/summary'),
  analyze: (data: any) => apiClient.post('/api/analytics/analyze', data),
}

// 解忧角帖子接口
export const postsAPI = {
  list: (params?: any) => apiClient.get('/api/posts', { params }),
  create: (data: any) => apiClient.post('/api/posts', data),
  like: (id: string | number) => apiClient.post(`/api/posts/${id}/like`),
  comment: (id: string | number, content: string) =>
    apiClient.post(`/api/posts/${id}/comment`, { content }),
}

// 音乐推荐接口
export const musicAPI = {
  recommend: (moodType?: string) =>
    apiClient.get('/api/music/recommend', { params: { mood_type: moodType } }),
}

// AI 对话接口
export const aiAPI = {
  chatUrl: () => `${API_URL}/api/ai/chat`,
}

// 健康检查
export const healthCheck = () => apiClient.get('/api/health')

export default apiClient
