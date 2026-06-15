import request from './request'

export const settingsApi = {
  get() {
    return request.get('/api/settings').then(r => r.data)
  },
  adminGet() {
    return request.get('/api/admin/settings').then(r => r.data)
  },
  update(data) {
    return request.put('/api/admin/settings', data).then(r => r.data)
  }
}
