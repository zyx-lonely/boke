import request from './request'

export const commentApi = {
  listByResource: (resourceId, params) =>
    request.get(`/api/resources/${resourceId}/comments`, { params }).then(r => r.data),
  create: (resourceId, data) =>
    request.post(`/api/resources/${resourceId}/comments`, data).then(r => r.data),
  delete: (id) => request.delete(`/api/admin/comments/${id}`).then(r => r.data),
  like: (id) => request.post(`/api/comments/${id}/like`).then(r => r.data),
  adminList: (params) => request.get('/api/admin/comments', { params }).then(r => r.data),
  approve: (id) => request.put(`/api/admin/comments/${id}/approve`).then(r => r.data),
  reject: (id) => request.put(`/api/admin/comments/${id}/reject`).then(r => r.data),
  batchDelete: (ids) => request.delete('/api/admin/comments/batch', { data: { ids } }).then(r => r.data),
}
