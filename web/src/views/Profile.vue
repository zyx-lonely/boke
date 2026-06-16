<template>
  <div class="profile-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="container" style="padding-top:80px;padding-bottom:40px">
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else-if="user">
        <div class="profile-header">
          <div class="avatar-section">
            <div class="avatar-large">{{ user.username?.charAt(0)?.toUpperCase() || 'U' }}</div>
            <h2>{{ user.username }}</h2>
            <span class="role-tag" :class="user.role">{{ roleLabel }}</span>
          </div>
          <div class="profile-meta">
            <div class="meta-item"><span>邮箱</span><span>{{ user.email || '未设置' }}
              <span v-if="user.email" :class="user.email_verified ? 'verified' : 'unverified'">
                {{ user.email_verified ? '已验证' : '未验证' }}
              </span>
            </span></div>
            <div class="meta-item"><span>注册时间</span><span>{{ formatDate(user.created_at) }}</span></div>
          </div>
        </div>

        <div class="profile-body">
          <div class="section-card">
            <h3>编辑资料</h3>
            <div class="form-row">
              <label>邮箱</label>
              <div class="email-row">
                <input v-model="editEmail" class="form-input" placeholder="请输入邮箱" />
                <button v-if="user.email && !user.email_verified" class="btn btn-sm btn-outline" :disabled="sendingVerify" @click="resendVerify">
                  {{ sendingVerify ? '发送中...' : '重新发送验证邮件' }}
                </button>
              </div>
            </div>
            <button class="btn btn-primary" :disabled="saveLoading" @click="saveProfile">{{ saveLoading ? '保存中...' : '保存' }}</button>
          </div>

          <div class="section-card">
            <h3>我的动态</h3>
            <div class="stat-row">
              <div class="stat-card" @click="$router.push('/favorites')">
                <span class="stat-num">{{ favoriteCount }}</span>
                <span class="stat-label">收藏的资源</span>
              </div>
              <div class="stat-card" @click="$router.push('/my-comments')">
                <span class="stat-num">{{ commentCount }}</span>
                <span class="stat-label">我的评论</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { profileApi } from '@/api/profile'
import { ElMessage } from 'element-plus'

const appStore = useAppStore()
const userStore = useUserStore()
const loading = ref(true)
const user = ref(null)
const editEmail = ref('')
const saveLoading = ref(false)
const sendingVerify = ref(false)
const favoriteCount = ref(0)
const commentCount = ref(0)

const roleLabel = computed(() => ({ admin: '管理员', editor: '编辑', user: '用户' }[user.value?.role] || ''))

function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '' }

async function loadData() {
  loading.value = true
  try {
    user.value = await profileApi.get()
    editEmail.value = user.value.email || ''
    const [favs, comments] = await Promise.all([
      profileApi.getFavorites().catch(() => []),
      profileApi.getComments().catch(() => [])
    ])
    favoriteCount.value = favs.length
    commentCount.value = comments.length
  } catch { ElMessage.error('加载失败') } finally { loading.value = false }
}

async function saveProfile() {
  saveLoading.value = true
  try {
    await profileApi.update({ email: editEmail.value })
    user.value.email = editEmail.value
    if (editEmail.value) { user.value.email_verified = 0 }
    ElMessage.success('保存成功')
  } catch { ElMessage.error('保存失败') } finally { saveLoading.value = false }
}

async function resendVerify() {
  sendingVerify.value = true
  try {
    await profileApi.resendVerification()
    ElMessage.success('验证邮件已发送，请查收')
  } catch (e) { ElMessage.error(e?.response?.data?.message || '发送失败') }
  finally { sendingVerify.value = false }
}

onMounted(loadData)
</script>

<style scoped>
.profile-page { min-height: 100vh; background: #f5f7fa; }
.dark-mode.profile-page { background: #1a1a2e; }
.loading { display: flex; justify-content: center; padding: 80px; color: #999; }
.profile-header { background: white; border-radius: 20px; padding: 40px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); display: flex; gap: 40px; align-items: center; }
.dark-mode .profile-header { background: #16213e; }
.avatar-section { text-align: center; flex-shrink: 0; }
.avatar-large { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; margin: 0 auto 12px; }
.avatar-section h2 { margin: 0 0 8px; font-size: 1.5rem; color: #1a1a2e; }
.dark-mode .avatar-section h2 { color: #e0e0e0; }
.role-tag { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.role-tag.admin { background: #fef0f0; color: #f56c6c; }
.role-tag.editor { background: #fdf6ec; color: #e6a23c; }
.role-tag.user { background: #f0f9eb; color: #67c23a; }
.profile-meta { flex: 1; }
.meta-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.dark-mode .meta-item { border-bottom-color: #2d3a5f; }
.meta-item span:first-child { color: #999; }
.meta-item span:last-child { color: #333; font-weight: 500; }
.dark-mode .meta-item span:last-child { color: #e0e0e0; }
.profile-body { display: flex; flex-direction: column; gap: 20px; }
.section-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.dark-mode .section-card { background: #16213e; }
.section-card h3 { font-size: 1.1rem; font-weight: 600; color: #1a1a2e; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #f0f0f5; }
.dark-mode .section-card h3 { color: #e0e0e0; border-bottom-color: #2d3a5f; }
.form-row { margin-bottom: 16px; }
.form-row label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; font-size: 14px; }
.dark-mode .form-row label { color: #9ca3af; }
.email-row { display: flex; gap: 8px; align-items: center; }
.email-row .form-input { flex: 1; }
.form-input { width: 100%; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
.dark-mode .form-input { background: #0f3460; border-color: #2d3a5f; color: #e0e0e0; }
.form-input:focus { outline: none; border-color: #667eea; }
.btn { padding: 10px 24px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 4px 18px rgba(102,126,234,0.4); }
.btn-sm { padding: 6px 14px; font-size: 12px; white-space: nowrap; }
.btn-outline { background: transparent; border: 1px solid #667eea; color: #667eea; }
.btn-outline:hover { background: #667eea; color: white; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.stat-card { padding: 24px; border-radius: 12px; background: #f8f9fa; text-align: center; cursor: pointer; transition: all 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.dark-mode .stat-card { background: #0f3460; }
.stat-num { display: block; font-size: 2rem; font-weight: 700; color: #667eea; }
.stat-label { display: block; font-size: 13px; color: #999; margin-top: 4px; }
.verified { display:inline-block;padding:1px 8px;border-radius:8px;background:#f0f9eb;color:#67c23a;font-size:11px;margin-left:6px; }
.unverified { display:inline-block;padding:1px 8px;border-radius:8px;background:#fdf6ec;color:#e6a23c;font-size:11px;margin-left:6px; }

@media (max-width: 600px) {
  .profile-header { flex-direction: column; text-align: center; }
  .stat-row { grid-template-columns: 1fr; }
}
</style>
