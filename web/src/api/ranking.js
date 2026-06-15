import request from './request'

export const rankingApi = {
  list: (params) => request.get('/api/rankings', { params }).then(r => r.data),
}
