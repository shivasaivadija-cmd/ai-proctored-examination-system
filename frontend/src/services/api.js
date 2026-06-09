import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 — only force logout on protected endpoints, never on login/register
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || ''
    const is401 = err.response?.status === 401
    const isLoginOrRegister = url.includes('/auth/login') || url.includes('/auth/register') ||
      url.includes('/auth/forgot') || url.includes('/auth/reset') || url.includes('/auth/verify')
    // Only force logout on protected API calls, never on login/register attempts
    if (is401 && !isLoginOrRegister) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetToken: (reset_token) => api.post('/auth/verify-reset-token', { reset_token }),
  resetPassword: (reset_token, new_password) => api.post('/auth/reset-password', { reset_token, new_password }),
}

// ── Interview ─────────────────────────────────────────────────────────────────
export const interviewAPI = {
  startInterview: (data) => api.post('/interview/start-interview', data),
  generateQuestion: (session_id) => api.post('/interview/generate-question', { session_id }),
  prefetchQuestions: (session_id) => api.post('/interview/prefetch-questions', { session_id }),
  submitAnswer: (data) => api.post('/interview/submit-answer', data),
  getFeedback: (session_id) => api.post('/interview/feedback', { session_id }),
  getHistory: () => api.get('/interview/history'),
  getSessionDetails: (session_id) => api.get(`/interview/session/${session_id}`),
}

// ── Resume ────────────────────────────────────────────────────────────────────
export const resumeAPI = {
  uploadResume: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/resume/upload-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  generateResumeQuestion: (data) => api.post('/resume/resume-question', data),
}

// ── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getStudents: () => api.get('/admin/students'),
  getSessions: () => api.get('/admin/sessions'),
  getViolations: () => api.get('/admin/violations'),
  getStudentDetail: (id) => api.get(`/admin/student/${id}`),
  makeAdmin: (email) => api.post(`/admin/make-admin?email=${encodeURIComponent(email)}`),
  reportViolation: (data) => api.post('/admin/violation', data),
}

export const getProctorWsUrl = (sessionId = null) => {
  const token = localStorage.getItem('token') || ''
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const base = `${protocol}//${window.location.host}/api/interview/ws/proctor`
  const path = sessionId ? `${base}/${sessionId}` : base
  return `${path}?token=${encodeURIComponent(token)}`
}

export default api
