import request from './request'

export const categoryApi = {
  list: () => request.get('/api/categories').then(r => r.data),
  adminList: () => request.get('/api/admin/categories').then(r => r.data),
  create: (data) => request.post('/api/admin/categories', data).then(r => r.data),
  update: (id, data) => request.put(`/api/admin/categories/${id}`, data).then(r => r.data),
  delete: (id) => request.delete(`/api/admin/categories/${id}`).then(r => r.data),
}
