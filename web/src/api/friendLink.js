import request from './request'

export const friendLinkApi = {
  list() { return request.get('/api/friend-links').then(r => r.data) },
  adminList() { return request.get('/api/admin/friend-links').then(r => r.data) },
  create(data) { return request.post('/api/admin/friend-links', data).then(r => r.data) },
  update(id, data) { return request.put('/api/admin/friend-links/' + id, data).then(r => r.data) },
  remove(id) { return request.delete('/api/admin/friend-links/' + id).then(r => r.data) },
}
