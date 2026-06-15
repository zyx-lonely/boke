import request from './request'

export const tagApi = {
  list: () => request.get('/api/tags').then(r => r.data),
  create: (data) => request.post('/api/admin/tags', data).then(r => r.data),
  update: (id, data) => request.put(`/api/admin/tags/${id}`, data).then(r => r.data),
  delete: (id) => request.delete(`/api/admin/tags/${id}`).then(r => r.data),
  batchCreate: (names) => request.post('/api/admin/tags/batch', { names }).then(r => r.data),
  saveResourceTags: (resourceId, data) => request.post(`/api/resources/${resourceId}/tags`, data).then(r => r.data),
}
