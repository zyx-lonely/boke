import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/api/request'

export const useAppStore = defineStore('app', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')

  const isDark = computed(() => theme.value === 'dark')

  const settings = ref({
    site_name: '资源分享博客',
    site_description: '分享优质开源软件资源',
    site_url: '',
    allow_register: 'true',
    logo_text: '资源分享',
    footer_text: '分享优质开源软件资源'
  })

  async function loadSettings() {
    try {
      const data = await request.get('/api/settings')
      if (data?.data) settings.value = { ...settings.value, ...data.data }
      else if (data) settings.value = { ...settings.value, ...data }
    } catch {}
  }

  function initTheme() {
    const saved = localStorage.getItem('theme')
    if (saved) theme.value = saved
    applyTheme()
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }

  function applyTheme() {
    if (theme.value === 'dark') {
      document.documentElement.classList.add('dark-mode')
    } else {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  return { theme, isDark, settings, loadSettings, initTheme, toggleTheme }
})
