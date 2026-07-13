import axios from 'axios'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function resolveAssetUrl(url?: string | null) {
  if (!url) return ''
  if (/^https?:\/\//.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url
  return `${API_URL}${url.startsWith('/') ? url : `/${url}`}`
}

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 45000, // 45 秒超时（多模态分析可能较慢）
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器：每次请求自动注入 JWT token
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('moodwave-auth')
    if (token) {
      try {
        const { state } = JSON.parse(token)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return config
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
  weekly: (params?: any) => apiClient.get('/api/analytics/weekly', { params }),
  summary: (params?: any) => apiClient.get('/api/analytics/summary', { params }),
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
  recommend: (moodType?: string, params?: { music_goal?: string; recent_context?: string }) =>
    apiClient.get('/api/music/recommend', { params: { mood_type: moodType, ...params } }),
  mockGenerateAsset: (data: { prompt: string; title?: string }) =>
    apiClient.post('/api/music/assets/mock-generate', data),
  favorite: (data: any) => apiClient.post('/api/music/favorite', data),
  favorites: () => apiClient.get('/api/music/favorites'),
}

// AI 对话接口
export const aiAPI = {
  chatUrl: () => `${API_URL}/api/ai/chat`,
  analyzeMood: (data: any, config?: any) => apiClient.post('/api/ai/analyze-mood', data, config),
}

// 灵音伙伴接口
export const companionAPI = {
  greeting: (params?: { character?: string }) => apiClient.get('/api/companion/greeting', { params }),
  memories: (params?: { memory_type?: string; limit?: number }) => apiClient.get('/api/companion/memories', { params }),
  createMemory: (data: { content: string; source?: string; memory_type?: string; mood_context?: string | null; tags?: string[] }) =>
    apiClient.post('/api/companion/memories', data),
  updateMemory: (id: number, data: { content?: string; source?: string; memory_type?: string; mood_context?: string | null; tags?: string[] }) =>
    apiClient.put(`/api/companion/memories/${id}`, data),
  deleteMemory: (id: number) => apiClient.delete(`/api/companion/memories/${id}`),
  generateMemories: () => apiClient.post('/api/companion/memories/generate'),
  conversations: () => apiClient.get('/api/companion/conversations'),
  createConversation: (data: { title?: string; character?: string }) =>
    apiClient.post('/api/companion/conversations', data),
  updateConversation: (id: number, data: { title: string }) =>
    apiClient.patch(`/api/companion/conversations/${id}`, data),
  conversationMessages: (id: number) => apiClient.get(`/api/companion/conversations/${id}/messages`),
  sendMessageUrl: (id: number) => `${API_URL}/api/companion/conversations/${id}/messages`,
  sendAgentMessageUrl: (id: number) => `${API_URL}/api/companion/conversations/${id}/messages-agent`,
  deleteConversation: (id: number) => apiClient.delete(`/api/companion/conversations/${id}`),
  agentStatus: () => apiClient.get('/api/ai/agent-status'),
}

// 个人主页接口
export const profileAPI = {
  export: (format: 'json' | 'csv', scope = 'all', include = 'records,summary,profile,favorites') =>
    apiClient.get('/api/profile/export', {
      params: { format, scope, include },
      responseType: format === 'csv' ? 'blob' : 'json',
    }),
  exportFull: (data: { format: 'json' | 'csv'; scope: string; include: string[] }) =>
    apiClient.post('/api/profile/export', data, {
      responseType: data.format === 'csv' ? 'blob' : 'json',
    }),
}

// 文件上传接口
export const uploadAPI = {
  images: (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return apiClient.post('/api/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  voice: (file: File | Blob) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/api/upload/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  avatar: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/api/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// 健康检查
export const healthCheck = () => apiClient.get('/api/health')

// 认证接口（裸请求，不走拦截器，避免循环）
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    axios.post(`${API_URL}/api/auth/register`, data),
  login: (data: { email: string; password: string }) =>
    axios.post(`${API_URL}/api/auth/login`, data),
  me: (token: string) =>
    axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateMe: (token: string, data: any) =>
    axios.patch(`${API_URL}/api/auth/me`, data, {
      headers: { Authorization: `Bearer ${token}` },
    }),
}

export default apiClient
