<template>
  <div class="verify-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="form-card">
      <h2>{{ msg }}</h2>
      <router-link to="/" class="back-link" v-if="!loading">返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { authApi } from '@/api/auth'

const route = useRoute()
const appStore = useAppStore()
const msg = ref('验证中...')
const loading = ref(true)

onMounted(async () => {
  try {
    const r = await authApi.verifyEmail(route.query.token)
    msg.value = r.message || '邮箱验证成功'
  } catch (e) {
    msg.value = e.response?.data?.message || '验证失败，链接可能已过期'
  } finally { loading.value = false }
})
</script>

<style scoped>
.verify-page { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7fa; }
.dark-mode.verify-page { background: #1a1a2e; }
.form-card { background: white; border-radius: 20px; padding: 40px; width: 400px; max-width: 90vw; box-shadow: 0 4px 30px rgba(0,0,0,0.08); text-align: center; }
.dark-mode .form-card { background: #16213e; }
.form-card h2 { margin: 0; color: #1a1a2e; font-size: 1.3rem; }
.dark-mode .form-card h2 { color: #e0e0e0; }
.back-link { display: inline-block; margin-top: 20px; color: #667eea; text-decoration: none; }
</style>
