<template>
  <div class="forgot-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="form-card">
      <h2>忘记密码</h2>
      <p class="desc">输入注册时使用的邮箱，我们将发送重置链接</p>
      <form @submit.prevent="submit">
        <input v-model="email" type="email" class="input" placeholder="请输入邮箱" required />
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? '发送中...' : '发送重置链接' }}
        </button>
      </form>
      <p v-if="msg" class="msg success">{{ msg }}</p>
      <p v-if="err" class="msg error">{{ err }}</p>
      <router-link to="/" class="back-link">返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { authApi } from '@/api/auth'

const appStore = useAppStore()
const email = ref('')
const loading = ref(false)
const msg = ref('')
const err = ref('')

async function submit() {
  loading.value = true; msg.value = ''; err.value = ''
  try {
    const r = await authApi.forgotPassword(email.value)
    msg.value = r.message || '如果该邮箱已注册，将收到重置密码邮件'
  } catch (e) {
    err.value = e.response?.data?.message || '发送失败'
  } finally { loading.value = false }
}
</script>

<style scoped>
.forgot-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7fa; }
.dark-mode.forgot-page { background: #1a1a2e; }
.form-card { background: white; border-radius: 20px; padding: 40px; width: 400px; max-width: 90vw; box-shadow: 0 4px 30px rgba(0,0,0,0.08); text-align: center; }
.dark-mode .form-card { background: #16213e; }
.form-card h2 { margin: 0 0 8px; color: #1a1a2e; font-size: 1.5rem; }
.dark-mode .form-card h2 { color: #e0e0e0; }
.desc { color: #999; font-size: 14px; margin-bottom: 24px; }
.input { width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 10px; font-size: 14px; margin-bottom: 16px; box-sizing: border-box; }
.dark-mode .input { background: #0f3460; border-color: #2d3a5f; color: #e0e0e0; }
.btn { width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.btn:disabled { opacity: 0.6; }
.msg { margin-top: 12px; font-size: 14px; padding: 8px 12px; border-radius: 8px; }
.msg.success { background: #f0f9eb; color: #67c23a; }
.msg.error { background: #fef0f0; color: #f56c6c; }
.back-link { display: inline-block; margin-top: 16px; color: #667eea; text-decoration: none; font-size: 13px; }
</style>
