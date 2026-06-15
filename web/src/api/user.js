import request from './request'

export const userApi = {
  list: (params) => request.get('/api/admin/users', { params }).then(r => r.data),
  create: (data) => request.post('/api/admin/users', data).then(r => r.data),
  update: (id, data) => request.put(`/api/admin/users/${id}`, data).then(r => r.data),
  delete: (id) => request.delete(`/api/admin/users/${id}`).then(r => r.data),
  updateStatus: (id, status) => request.put(`/api/admin/users/${id}`, { status }).then(r => r.data),
  resetPassword: (id, password) => request.post(`/api/admin/users/${id}/reset-password`, { password }).then(r => r.data),
}
