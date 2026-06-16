import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/api/request'

const themes = {
  light: {
    label: '默认浅色',
    bg: '#f5f7fa',
    cardBg: '#ffffff',
    text: '#1a1a2e',
    textSecondary: '#555555',
    muted: '#999999',
    border: '#e0e0e0',
    primary: '#667eea',
    primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    navBg: 'rgba(255,255,255,0.95)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  dark: {
    label: '深色模式',
    bg: '#1a1a2e',
    cardBg: '#16213e',
    text: '#e0e0e0',
    textSecondary: '#9ca3af',
    muted: '#6b7280',
    border: '#2d3a5f',
    primary: '#667eea',
    primaryGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    navBg: 'rgba(22,33,62,0.95)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  ocean: {
    label: '海洋蓝',
    bg: '#eef5ff',
    cardBg: '#ffffff',
    text: '#1a365d',
    textSecondary: '#2d5a8e',
    muted: '#7ba3c7',
    border: '#c4daf0',
    primary: '#2b6cb0',
    primaryGradient: 'linear-gradient(135deg, #2b6cb0 0%, #4299e1 100%)',
    navBg: 'rgba(255,255,255,0.95)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  forest: {
    label: '森林绿',
    bg: '#f0faf0',
    cardBg: '#ffffff',
    text: '#1f3d2e',
    textSecondary: '#3d6b4f',
    muted: '#8bba9a',
    border: '#c8e6d0',
    primary: '#38a169',
    primaryGradient: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
    navBg: 'rgba(255,255,255,0.95)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
  sunset: {
    label: '日落橙',
    bg: '#fff8f0',
    cardBg: '#ffffff',
    text: '#3d2e1f',
    textSecondary: '#8e6b4f',
    muted: '#c7a98a',
    border: '#f0dcc4',
    primary: '#dd6b20',
    primaryGradient: 'linear-gradient(135deg, #dd6b20 0%, #ed8936 100%)',
    navBg: 'rgba(255,255,255,0.95)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.06)',
  },
}

export const useAppStore = defineStore('app', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')

  const isDark = computed(() => theme.value === 'dark')
  const currentTheme = computed(() => themes[theme.value] || themes.light)
  const themeList = computed(() => Object.entries(themes).map(([key, t]) => ({ key, ...t })))

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
    if (saved && themes[saved]) theme.value = saved
    applyTheme()
  }

  function setTheme(name) {
    if (!themes[name]) return
    theme.value = name
    localStorage.setItem('theme', name)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function applyTheme() {
    const t = themes[theme.value] || themes.light
    const root = document.documentElement
    Object.entries(t).forEach(([key, val]) => {
      if (key === 'label') return
      const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(cssVar, val)
    })
    if (theme.value === 'dark') root.classList.add('dark-mode')
    else root.classList.remove('dark-mode')
  }

  return { theme, isDark, currentTheme, themeList, settings, loadSettings, initTheme, setTheme, toggleTheme }
})
