import request from './request'

export const searchApi = {
  search(q) { return request.get('/api/search', { params: { q } }).then(r => r.data) },
  archive() { return request.get('/api/archive').then(r => r.data) },
}
