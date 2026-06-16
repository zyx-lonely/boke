import request from './request'

export const searchApi = {
  search(q, page = 1, limit = 20) { return request.get('/api/search', { params: { q, page, limit } }).then(r => r.data) },
  archive() { return request.get('/api/archive').then(r => r.data) },
}
