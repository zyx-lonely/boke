import request from './request'

export const notificationApi = {
  list() { return request.get('/api/notifications').then(r => r.data) },
  read(id) { return request.post('/api/notifications/read', { id }).then(r => r.data) },
  readAll() { return request.post('/api/notifications/read', {}).then(r => r.data) },
}
