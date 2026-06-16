import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('userToken') || localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken')
      localStorage.removeItem('adminToken')
      if (window.location.pathname.startsWith('/admin')) window.location.href = '/admin'
    }
    return Promise.reject(error)
  }
)

export default request
