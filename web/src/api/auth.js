import request from './request'

export const authApi = {
  login: (data) => request.post('/api/auth/login', data).then(r => r.data),
  register: (data) => request.post('/api/auth/register', data).then(r => r.data),
  getMe: () => request.get('/api/auth/me').then(r => r.data),
  uploadAvatar: (formData) => request.post('/api/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data),
  getCaptcha: () => request.get('/api/captcha?_=' + Date.now(), { responseType: 'blob' }).then(r => ({
    blob: r.data,
    key: r.headers['x-captcha-key'],
  })),
  changePassword: (oldPassword, newPassword) => request.post('/api/auth/change-password', { oldPassword, newPassword }).then(r => r.data),
  adminLogin: (data) => request.post('/api/admin/login', data).then(r => r.data),
  adminMe: () => request.get('/api/admin/me').then(r => r.data),
}
