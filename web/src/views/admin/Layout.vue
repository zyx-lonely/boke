<template>
  <div class="admin-layout" :class="{ 'dark-mode': appStore.isDark }">
    <!-- Login Page -->
    <div v-if="!isLoggedIn" class="login-page">
      <div class="login-box">
        <h1>后台登录</h1>
        <div class="error-msg" v-if="loginError">{{ loginError }}</div>
        <div class="form-group"><label>用户名</label><input v-model="loginForm.username" placeholder="请输入用户名" @keyup.enter="doLogin"></div>
        <div class="form-group"><label>密码</label><input v-model="loginForm.password" type="password" placeholder="请输入密码" @keyup.enter="doLogin"></div>
        <div class="form-group"><label>验证码</label>
          <div style="display:flex;gap:10px;align-items:center">
            <input v-model="loginForm.captcha" placeholder="请输入验证码" style="flex:1" @keyup.enter="doLogin">
            <img v-if="captchaImg" :src="captchaImg" style="cursor:pointer;height:40px;border-radius:6px" @click="loadCaptcha" title="点击刷新">
          </div>
        </div>
        <button class="btn btn-primary" style="width:100%" @click="doLogin" :disabled="loginLoading">{{ loginLoading?'登录中...':'登录' }}</button>
        <p style="text-align:center;margin-top:20px;color:#999;font-size:13px">请使用管理员账号登录</p>
      </div>
    </div>

    <!-- Admin Layout -->
    <template v-else>
      <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen" aria-label="菜单">☰</button>
      <div class="sidebar-overlay" :class="{ show: sidebarOpen }" @click="sidebarOpen=false"></div>
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-header">
          <router-link to="/" class="sidebar-logo">🚀 {{ appStore.settings.site_name || '资源管理' }}</router-link>
        </div>
        <nav class="sidebar-nav">
          <router-link v-for="item in menuItems" :key="item.path" :to="item.path" active-class="active">
            <span class="icon">{{ item.icon }}</span><span>{{ item.label }}</span>
          </router-link>
        </nav>
      </aside>
      <div class="main-area">
        <header class="admin-header">
          <div class="header-left">
            <span class="header-title">{{ currentTitle }}</span>
          </div>
          <div class="header-right">
            <button class="theme-toggle" @click="appStore.toggleTheme()">{{ appStore.isDark?'☀️':'🌙' }}</button>
            <div class="user-info">
              <div class="user-avatar">{{ adminUser?.username?.charAt(0)?.toUpperCase()||'A' }}</div>
              <span>{{ adminUser?.username||'admin' }}</span>
            </div>
            <button class="logout-btn" @click="handleLogout">退出登录</button>
          </div>
        </header>
        <div class="content-wrapper">
          <router-view />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const isLoggedIn = ref(false)
const adminUser = ref(null)
const loginLoading = ref(false)
const loginError = ref('')
const captchaImg = ref('')
const captchaKey = ref('')
const loginForm = ref({ username: '', password: '', captcha: '' })
const sidebarOpen = ref(false)

const menuItems = [
  { path: '/admin/dashboard', icon: '📊', label: '数据统计' },
  { path: '/admin/resources', icon: '📁', label: '资源列表' },
  { path: '/admin/categories', icon: '📂', label: '分类管理' },
  { path: '/admin/tags', icon: '🏷️', label: '标签管理' },
  { path: '/admin/users', icon: '👥', label: '用户管理' },
  { path: '/admin/comments', icon: '💬', label: '评论管理' },
  { path: '/admin/logs', icon: '📋', label: '操作日志' },
  { path: '/admin/backup', icon: '💾', label: '数据备份' },
  { path: '/admin/health', icon: '💓', label: '系统监控' },
  { path: '/admin/behavior', icon: '📈', label: '用户分析' },
  { path: '/admin/settings', icon: '⚙️', label: '系统设置' },
  { path: '/admin/friend-links', icon: '🔗', label: '友情链接' },
]

const currentTitle = computed(() => {
  const item = menuItems.find(m => route.path.startsWith(m.path))
  return item?.label || '后台管理'
})

async function loadCaptcha() {
  try {
    if (captchaImg.value) URL.revokeObjectURL(captchaImg.value)
    const data = await authApi.getCaptcha()
    captchaKey.value = data.key
    captchaImg.value = URL.createObjectURL(data.blob)
  } catch { captchaImg.value = '' }
}

async function checkLogin() {
  const token = localStorage.getItem('adminToken')
  if (!token) return
  try { const user = await authApi.adminMe(); adminUser.value = user; isLoggedIn.value = true } catch { localStorage.removeItem('adminToken') }
}

async function doLogin() {
  loginLoading.value = true; loginError.value = ''
  try {
    const data = await authApi.adminLogin({ ...loginForm.value, captchaKey: captchaKey.value })
    localStorage.setItem('adminToken', data.token)
    adminUser.value = { username: data.username, role: data.role }
    isLoggedIn.value = true; ElMessage.success('登录成功')
  } catch (e) { loginError.value = e?.response?.data?.message || '登录失败'; loadCaptcha() }
  finally { loginLoading.value = false }
}

function handleLogout() { localStorage.removeItem('adminToken'); isLoggedIn.value = false; adminUser.value = null; router.push('/admin') }

onMounted(async () => { await checkLogin(); if (!isLoggedIn.value) loadCaptcha() })
watch(isLoggedIn, (v) => { if (!v) loadCaptcha() })
</script>

<style scoped>
.admin-layout { min-height: 100vh; }

/* Login Page */
.login-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative; }
.login-page::before { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }
.login-box { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 100%; max-width: 420px; position: relative; z-index: 1; animation: fadeInUp 0.5s ease-out; }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
.login-box h1 { text-align: center; margin-bottom: 30px; color: #333; font-size: 1.8rem; font-weight: 700; }
.login-box h1::after { content: ''; display: block; width: 60px; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); margin: 15px auto 0; border-radius: 2px; }
.error-msg { color: #dc3545; text-align: center; margin-bottom: 15px; font-size: 14px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; }
.form-group input { width: 100%; padding: 12px 15px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
.form-group input:focus { outline: none; border-color: #667eea; }
.btn { padding: 12px 26px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 4px 18px rgba(102,126,234,0.4); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(102,126,234,0.5); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Admin Sidebar */
.sidebar { width: 240px; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 20px 0; flex-shrink: 0; position: fixed; top: 0; left: 0; bottom: 0; overflow-y: auto; z-index: 50; }
.sidebar::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 200px; background: linear-gradient(180deg, rgba(102,126,234,0.2) 0%, transparent 100%); }
.sidebar-header { padding: 0 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; position: relative; }
.sidebar-logo { font-size: 1.3rem; font-weight: bold; color: white; text-decoration: none; display: flex; align-items: center; gap: 12px; }
.sidebar-nav { display: flex; flex-direction: column; gap: 4px; padding: 0 12px; }
.sidebar-nav a { display: flex; align-items: center; gap: 12px; padding: 14px 18px; color: rgba(255,255,255,0.75); text-decoration: none; border-radius: 10px; transition: all 0.3s; position: relative; font-size: 14px; }
.sidebar-nav a::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 0; background: linear-gradient(180deg, #667eea, #764ba2); border-radius: 2px; transition: height 0.3s; }
.sidebar-nav a:hover, .sidebar-nav a.router-link-active { background: rgba(102,126,234,0.25); color: white; }
.sidebar-nav a:hover::before, .sidebar-nav a.router-link-active::before { height: 24px; }
.sidebar-nav .icon { width: 20px; font-size: 18px; text-align: center; }

/* Admin Main */
.main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; margin-left: 240px; }
.admin-header { background: white; padding: 18px 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; }
.dark-mode .admin-header { background: #16213e; }
.header-title { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; }
.dark-mode .header-title { color: #e0e0e0; }
.header-right { display: flex; align-items: center; gap: 18px; }
.theme-toggle { background: none; border: none; font-size: 20px; cursor: pointer; padding: 6px; border-radius: 8px; transition: background 0.2s; }
.theme-toggle:hover { background: #f0f0f0; }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 15px; font-weight: bold; box-shadow: 0 4px 12px rgba(102,126,234,0.3); }
.logout-btn { padding: 10px 18px; background: #f8f9fa; color: #555; border-radius: 8px; cursor: pointer; border: none; font-size: 13px; font-weight: 500; transition: all 0.2s; }
.logout-btn:hover { background: #e9ecef; transform: translateY(-1px); }
.content-wrapper { padding: 24px 28px; overflow-y: auto; flex: 1; background: #f0f2f5; }
.dark-mode .content-wrapper { background: #1a1a2e; }
.sidebar-toggle { display: none; position: fixed; top: 12px; left: 12px; z-index: 60; background: #667eea; color: white; border: none; border-radius: 8px; padding: 8px 12px; font-size: 20px; cursor: pointer; }
.sidebar-overlay { display: none; }

@media (max-width: 768px) {
  .sidebar-toggle { display: block; }
  .sidebar { transform: translateX(-100%); transition: transform 0.3s; }
  .sidebar.open { transform: translateX(0); }
  .sidebar-overlay.show { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 49; }
  .main-area { margin-left: 0; }
  .admin-header { padding: 14px 16px; padding-left: 56px; }
  .header-title { font-size: 1.1rem; }
  .content-wrapper { padding: 16px; }
}
</style>
