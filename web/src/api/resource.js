import request from './request'

export const resourceApi = {
  list: (params) => request.get('/api/resources', { params }).then(r => r.data),
  detail: (id) => request.get(`/api/resources/${id}`).then(r => r.data),
  hit: (id) => request.post(`/api/resources/${id}/hits`).then(r => r.data),
  hot: (limit = 5) => request.get('/api/resources/hot', { params: { limit } }).then(r => r.data),
  recent: (limit = 5) => request.get('/api/resources/newest', { params: { limit } }).then(r => r.data),
  recommend: (limit = 6) => request.get('/api/resources/recommend', { params: { limit } }).then(r => r.data),
  create: (data) => request.post('/api/admin/resources', data).then(r => r.data),
  update: (id, data) => request.put(`/api/admin/resources/${id}`, data).then(r => r.data),
  delete: (id) => request.delete(`/api/admin/resources/${id}`).then(r => r.data),
  pin: (id, pinned) => request.put(`/api/admin/resources/${id}/pin`, { pinned }).then(r => r.data),
  updateStatus: (id, status) => request.put(`/api/admin/resources/${id}/status`, { status }).then(r => r.data),
  adminList: (params) => request.get('/api/admin/resources', { params }).then(r => r.data),
  rate: (id, data) => request.post(`/api/resources/${id}/rating`, data).then(r => r.data),
  report: (id, data) => request.post(`/api/resources/${id}/report`, data).then(r => r.data),
}
