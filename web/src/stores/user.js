import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('userToken') || '')
  const user = ref(null)
  const isLoggedIn = ref(false)

  function setToken(t) {
    token.value = t
    if (t) localStorage.setItem('userToken', t)
    else localStorage.removeItem('userToken')
  }

  function clearToken() {
    token.value = ''
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('userToken')
  }

  async function checkAuth() {
    if (!token.value) {
      isLoggedIn.value = false
      return
    }
    try {
      const data = await authApi.getMe()
      user.value = data
      isLoggedIn.value = true
    } catch {
      clearToken()
    }
  }

  async function login(username, password) {
    const data = await authApi.login({ username, password })
    setToken(data.token)
    user.value = data.user
    isLoggedIn.value = true
    return data
  }

  async function register(username, email, password) {
    const data = await authApi.register({ username, email, password })
    setToken(data.token)
    user.value = data.user
    isLoggedIn.value = true
    return data
  }

  function logout() {
    clearToken()
  }

  return { token, user, isLoggedIn, login, register, logout, checkAuth, setToken, clearToken }
})
