<template>
  <header class="header" :class="{ scrolled: isScrolled }">
    <div class="container header-inner">
      <router-link to="/" class="logo"><span class="logo-icon">📦</span><span>{{ appStore.settings.logo_text || '资源分享' }}</span></router-link>
      <button class="mobile-menu-btn" @click="mobileOpen = !mobileOpen" aria-label="菜单">{{ mobileOpen ? '✕' : '☰' }}</button>
      <div class="desktop-nav">
        <nav>
          <router-link to="/" @click="mobileOpen=false">首页</router-link>
          <router-link to="/ranking" @click="mobileOpen=false">排行榜</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/favorites" @click="mobileOpen=false">收藏夹</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/profile" @click="mobileOpen=false">个人中心</router-link>
        </nav>
        <div class="auth-links">
          <button class="theme-toggle" @click="appStore.toggleTheme()" :title="appStore.isDark?'浅色模式':'深色模式'">{{ appStore.isDark ? '☀️' : '🌙' }}</button>
          <template v-if="userStore.isLoggedIn">
            <div class="user-info">
              <div class="user-avatar" @click="fileInput?.click()">{{ userStore.user?.username?.charAt(0)?.toUpperCase()||'U' }}</div>
              <span class="user-name">{{ userStore.user?.username }}</span>
            </div>
            <button class="auth-btn" @click="showChangePw = true">修改密码</button>
            <button class="auth-btn" @click="logout">退出</button>
          </template>
          <template v-else>
            <button class="auth-btn" @click="showLogin = true">登录</button>
            <button v-if="appStore.settings.allow_register !== 'false'" class="auth-btn primary" @click="showRegister = true">注册</button>
          </template>
        </div>
      </div>
      <div class="mobile-drawer" :class="{ open: mobileOpen }" @click.self="mobileOpen=false">
        <nav>
          <router-link to="/" @click="mobileOpen=false">首页</router-link>
          <router-link to="/ranking" @click="mobileOpen=false">排行榜</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/favorites" @click="mobileOpen=false">收藏夹</router-link>
          <router-link v-if="userStore.isLoggedIn" to="/profile" @click="mobileOpen=false">个人中心</router-link>
        </nav>
        <div class="mobile-auth">
          <button class="theme-toggle" @click="appStore.toggleTheme()" :title="appStore.isDark?'浅色模式':'深色模式'">{{ appStore.isDark ? '☀️' : '🌙' }}</button>
          <template v-if="userStore.isLoggedIn">
            <div class="user-info">
              <div class="user-avatar" @click="fileInput?.click()">{{ userStore.user?.username?.charAt(0)?.toUpperCase()||'U' }}</div>
              <span class="user-name">{{ userStore.user?.username }}</span>
            </div>
            <button class="auth-btn" @click="showChangePw = true; mobileOpen=false">修改密码</button>
            <button class="auth-btn" @click="logout(); mobileOpen=false">退出</button>
          </template>
          <template v-else>
            <button class="auth-btn" @click="showLogin = true; mobileOpen=false">登录</button>
            <button v-if="appStore.settings.allow_register !== 'false'" class="auth-btn primary" @click="showRegister = true; mobileOpen=false">注册</button>
          </template>
        </div>
      </div>
      <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="uploadAvatar">
    </div>
  </header>

  <Transition name="modal">
    <div v-if="showLogin" class="modal-overlay" @click.self="showLogin=false" role="dialog" aria-modal="true">
      <div class="modal">
        <h2>用户登录</h2>
        <div class="error-msg" v-if="loginError">{{ loginError }}</div>
        <div class="form-group"><label>用户名</label><input v-model="loginForm.username" placeholder="请输入用户名" @keyup.enter="handleLogin"></div>
        <div class="form-group"><label>密码</label><input v-model="loginForm.password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin"></div>
        <button class="btn btn-primary btn-block" @click="handleLogin" :disabled="loginLoading">{{ loginLoading?'登录中...':'登录' }}</button>
        <p style="text-align:center;margin-top:15px;font-size:13px;color:#999">还没有账号？<a href="#" @click.prevent="showLogin=false;showRegister=true">立即注册</a></p>
        <button class="btn btn-secondary btn-block" @click="showLogin=false">取消</button>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div v-if="showChangePw" class="modal-overlay" @click.self="showChangePw=false" role="dialog" aria-modal="true">
      <div class="modal">
        <h2>修改密码</h2>
        <div class="error-msg" v-if="pwError">{{ pwError }}</div>
        <div class="form-group"><label>旧密码</label><input v-model="pwForm.oldPassword" type="password" placeholder="请输入旧密码" @keyup.enter="handleChangePassword"></div>
        <div class="form-group"><label>新密码</label><input v-model="pwForm.newPassword" type="password" placeholder="至少8位，含大小写和数字" @keyup.enter="handleChangePassword" @input="updatePwStrength2"></div>
        <div v-if="pwForm.newPassword" class="pw-strength">
          <div class="pw-bar" :class="pwStrengthClass2"></div>
          <span class="pw-text">{{ pwStrengthText2 }}</span>
        </div>
        <button class="btn btn-primary btn-block" @click="handleChangePassword" :disabled="pwLoading">{{ pwLoading?'提交中...':'确认修改' }}</button>
        <button class="btn btn-secondary btn-block" @click="showChangePw=false">取消</button>
      </div>
    </div>
  </Transition>

  <Transition name="modal">
    <div v-if="showRegister" class="modal-overlay" @click.self="showRegister=false" role="dialog" aria-modal="true">
      <div class="modal">
        <h2>用户注册</h2>
        <div class="error-msg" v-if="regError">{{ regError }}</div>
        <div class="form-group"><label>用户名</label><input v-model="regForm.username" placeholder="请输入用户名"></div>
        <div class="form-group"><label>邮箱</label><input v-model="regForm.email" placeholder="请输入邮箱"></div>
        <div class="form-group"><label>密码</label><input v-model="regForm.password" type="password" placeholder="至少8位，含大小写和数字" @input="updatePwStrength"></div>
        <div v-if="regForm.password" class="pw-strength">
          <div class="pw-bar" :class="pwStrengthClass"></div>
          <span class="pw-text">{{ pwStrengthText }}</span>
        </div>
        <button class="btn btn-primary btn-block" @click="handleRegister" :disabled="regLoading">{{ regLoading?'注册中...':'注册' }}</button>
        <p style="text-align:center;margin-top:15px;font-size:13px;color:#999">已有账号？<a href="#" @click.prevent="showRegister=false;showLogin=true">立即登录</a></p>
        <button class="btn btn-secondary btn-block" @click="showRegister=false">取消</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const appStore = useAppStore()
const isScrolled = ref(false)
const mobileOpen = ref(false)
const showLogin = ref(false)
const showRegister = ref(false)
const loginLoading = ref(false)
const regLoading = ref(false)
const loginError = ref('')
const regError = ref('')
const fileInput = ref(null)
const loginForm = ref({ username: '', password: '' })
const regForm = ref({ username: '', email: '', password: '' })
const pwStrengthClass = ref('')
const pwStrengthText = ref('')
const showChangePw = ref(false)
const pwForm = ref({ oldPassword: '', newPassword: '' })
const pwLoading = ref(false)
const pwError = ref('')
const pwStrengthClass2 = ref('')
const pwStrengthText2 = ref('')

function updatePwStrength() {
  const p = regForm.value.password
  let s = 0
  if (p.length >= 8) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^a-zA-Z0-9]/.test(p)) s++
  const map = { 0: ['', ''], 1: ['weak', '弱'], 2: ['medium', '中'], 3: ['strong', '强'], 4: ['very-strong', '非常强'] }
  pwStrengthClass.value = map[s][0]; pwStrengthText.value = map[s][1]
}

function updatePwStrength2() {
  const p = pwForm.value.newPassword
  let s = 0
  if (p.length >= 8) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^a-zA-Z0-9]/.test(p)) s++
  const map = { 0: ['', ''], 1: ['weak', '弱'], 2: ['medium', '中'], 3: ['strong', '强'], 4: ['very-strong', '非常强'] }
  pwStrengthClass2.value = map[s][0]; pwStrengthText2.value = map[s][1]
}

async function handleChangePassword() {
  if (!pwForm.value.oldPassword || !pwForm.value.newPassword) { pwError.value = '请填写完整'; return }
  pwLoading.value = true; pwError.value = ''
  try {
    await authApi.changePassword(pwForm.value.oldPassword, pwForm.value.newPassword)
    showChangePw.value = false; ElMessage.success('密码修改成功')
    pwForm.value = { oldPassword: '', newPassword: '' }
  } catch (e) { pwError.value = e?.response?.data?.message || '修改失败' }
  finally { pwLoading.value = false }
}

async function handleLogin() {
  if (!loginForm.value.username || !loginForm.value.password) { loginError.value = '请输入用户名和密码'; return }
  loginLoading.value = true; loginError.value = ''
  try {
    await userStore.login(loginForm.value.username, loginForm.value.password)
    showLogin.value = false; ElMessage.success('登录成功')
    loginForm.value = { username: '', password: '' }
  } catch (e) { loginError.value = e?.response?.data?.message || '登录失败' }
  finally { loginLoading.value = false }
}

async function handleRegister() {
  if (!regForm.value.username || !regForm.value.password) { regError.value = '请输入用户名和密码'; return }
  regLoading.value = true; regError.value = ''
  try {
    await userStore.register(regForm.value.username, regForm.value.email, regForm.value.password)
    showRegister.value = false; ElMessage.success('注册成功')
    regForm.value = { username: '', email: '', password: '' }
  } catch (e) { regError.value = e?.response?.data?.message || '注册失败' }
  finally { regLoading.value = false }
}

function logout() { userStore.logout(); ElMessage.success('已退出') }

async function uploadAvatar(e) {
  const file = e.target.files?.[0]; if (!file) return
  const fd = new FormData(); fd.append('avatar', file)
  try { const res = await authApi.uploadAvatar(fd); if (res.ok) { userStore.user.avatar = res.avatar; ElMessage.success('头像更新成功') } } catch { ElMessage.error('头像上传失败') }
  e.target.value = ''
}

function onScroll() { isScrolled.value = window.scrollY > 20 }
onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 14px 0; box-shadow: 0 2px 20px rgba(0,0,0,0.08); transition: background 0.3s, box-shadow 0.3s; }
.header.scrolled { background: rgba(255,255,255,0.98); box-shadow: 0 4px 25px rgba(0,0,0,0.1); }
.dark-mode .header { background: rgba(26,26,46,0.95); }
.header-inner { display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 16px; }
.logo { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
.dark-mode .logo { color: #e0e0e0; }
.logo-icon { font-size: 1.6rem; }
.mobile-menu-btn { display: none; background: none; border: none; font-size: 24px; cursor: pointer; padding: 4px 8px; color: #555; }
.desktop-nav { display: flex; align-items: center; gap: 2rem; }
.desktop-nav nav { display: flex; gap: 2rem; }
.desktop-nav nav a, .mobile-drawer nav a { color: #555; text-decoration: none; font-weight: 500; font-size: 14px; transition: all 0.2s; padding: 8px 14px; border-radius: 8px; white-space: nowrap; }
.desktop-nav nav a:hover, .mobile-drawer nav a:hover { color: #667eea; background: rgba(102,126,234,0.08); }
.auth-links { display: flex; gap: 10px; align-items: center; }
.mobile-drawer { display: none; position: fixed; top: 56px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 200; }
.mobile-drawer.open { display: flex; flex-direction: column; }
.theme-toggle { background: rgba(255,255,255,0.2); border: none; border-radius: 8px; padding: 8px; cursor: pointer; font-size: 16px; transition: all 0.2s; }
.theme-toggle:hover { background: rgba(255,255,255,0.3); }
.auth-btn { padding: 9px 18px; background: #f5f7fa; border-radius: 8px; font-size: 14px; font-weight: 500; color: #555; border: 1px solid #e8eaf0; cursor: pointer; transition: all 0.2s; }
.auth-btn:hover { background: #f0f2f5; transform: translateY(-1px); }
.auth-btn.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; box-shadow: 0 4px 15px rgba(102,126,234,0.35); }
.auth-btn.primary:hover { box-shadow: 0 6px 20px rgba(102,126,234,0.45); }
.user-info { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 34px; height: 34px; border-radius: 50%; background: rgba(102,126,234,0.2); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #667eea; cursor: pointer; }
.user-name { font-size: 14px; font-weight: 500; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 20px; padding: 40px; width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal { transform: translateY(30px); }
.modal-leave-to .modal { transform: translateY(-30px); }
.dark-mode .modal { background: #16213e; }
.modal h2 { text-align: center; margin-bottom: 24px; color: #333; font-size: 1.5rem; }
.dark-mode .modal h2 { color: #e0e0e0; }
.modal h2::after { content: ''; display: block; width: 60px; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); margin: 12px auto 0; border-radius: 2px; }
.error-msg { color: #dc3545; text-align: center; margin-bottom: 15px; font-size: 14px; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; }
.dark-mode .form-group label { color: #9ca3af; }
.form-group input { width: 100%; padding: 12px 15px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; transition: border-color 0.2s; }
.form-group input:focus { outline: none; border-color: #667eea; }
.dark-mode .form-group input { background: #0f3460; border-color: #2d3a5f; color: #e0e0e0; }
.btn { padding: 12px 26px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 4px 18px rgba(102,126,234,0.4); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(102,126,234,0.5); }
.btn-secondary { background: #f8f9fa; color: #555; border: 1px solid #dee2e6; }
.btn-secondary:hover { background: #e9ecef; }
.btn-block { width: 100%; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.pw-strength { margin-bottom: 18px; }
.pw-bar { height: 4px; border-radius: 2px; margin-bottom: 4px; transition: all 0.3s; }
.pw-bar.weak { width: 25%; background: #f56c6c; }
.pw-bar.medium { width: 50%; background: #e6a23c; }
.pw-bar.strong { width: 75%; background: #67c23a; }
.pw-bar.very-strong { width: 100%; background: #409eff; }
.pw-text { font-size: 12px; color: #999; }

@media (max-width: 768px) {
  .mobile-menu-btn { display: block; }
  .desktop-nav { display: none; }
  .mobile-drawer nav { background: white; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
  .dark-mode .mobile-drawer nav { background: #1a1a2e; }
  .mobile-drawer nav a { display: block; padding: 14px 16px; border-radius: 10px; font-size: 15px; }
  .mobile-drawer .mobile-auth { background: white; padding: 8px 16px 16px; display: flex; gap: 10px; align-items: center; border-radius: 0 0 16px 16px; margin-top: -8px; }
  .dark-mode .mobile-drawer .mobile-auth { background: #1a1a2e; }
  .modal { margin: 0 16px; padding: 24px; }
}
</style>
