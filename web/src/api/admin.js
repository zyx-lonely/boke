import request from './request'

export const adminApi = {
  stats: () => request.get('/api/admin/stats').then(r => r.data),
  health: () => request.get('/api/admin/health').then(r => r.data),
  behavior: () => request.get('/api/admin/user-behavior').then(r => r.data),
  logs: (params) => request.get('/api/admin/logs', { params }).then(r => r.data),
  cleanLogs: (days) => request.delete('/api/admin/logs/clean', { params: { days } }).then(r => r.data),
  backup: () => request.get('/api/admin/backup').then(r => r.data),
  upload: (formData) => request.post('/api/admin/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),
}
