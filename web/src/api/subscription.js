import request from './request'

export const subscriptionApi = {
  list: () => request.get('/api/subscriptions').then(r => r.data),
  toggle: (categoryId) => request.post('/api/subscriptions', { category_id: categoryId }).then(r => r.data),
  check: (categoryId) => request.get(`/api/subscriptions/check/${categoryId}`).then(r => r.data),
}
