import request from './request'

export const profileApi = {
  get() { return request.get('/api/user/profile').then(r => r.data) },
  update(data) { return request.put('/api/user/profile', data).then(r => r.data) },
  getComments() { return request.get('/api/user/comments').then(r => r.data) },
  getFavorites() { return request.get('/api/user/favorites').then(r => r.data) },
}
