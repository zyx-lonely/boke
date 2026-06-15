import request from './request'

export const favoriteApi = {
  list: () => request.get('/api/favorites').then(r => r.data),
  check: (resourceId) => request.get(`/api/resources/${resourceId}/favorite/check`).then(r => r.data),
  toggle: (resourceId) => request.post(`/api/resources/${resourceId}/favorite`).then(r => r.data),
  remove: (resourceId) => request.delete(`/api/favorites/${resourceId}`).then(r => r.data),
}
