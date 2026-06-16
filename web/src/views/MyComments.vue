<template>
  <div class="my-comments-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="container" style="padding-top:80px;padding-bottom:40px">
      <button class="back-btn" @click="$router.back()">← 返回</button>
      <h2 style="margin:16px 0">我的评论</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!comments.length" class="empty">暂无评论</div>
      <div v-else class="comment-list">
        <div v-for="c in comments" :key="c.id" class="comment-card">
          <div class="comment-resource">{{ c.resource_title || '未知资源' }}</div>
          <div class="comment-body">{{ c.content }}</div>
          <div class="comment-footer">
            <span class="comment-status" :class="c.status">{{ statusLabel(c.status) }}</span>
            <span class="comment-time">{{ formatDate(c.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { profileApi } from '@/api/profile'
import { ElMessage } from 'element-plus'

const appStore = useAppStore()
const comments = ref([])
const loading = ref(true)

function statusLabel(s) {
  return { approved: '已通过', pending: '待审核', rejected: '已拒绝' }[s] || s
}
function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '' }

onMounted(async () => {
  try { comments.value = await profileApi.getComments() }
  catch { ElMessage.error('加载失败') } finally { loading.value = false }
})
</script>

<style scoped>
.my-comments-page { min-height: 100vh; background: #f5f7fa; }
.dark-mode.my-comments-page { background: #1a1a2e; }
.loading { text-align: center; padding: 40px; color: #999; }
.empty { text-align: center; padding: 40px; color: #999; }
.back-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; background: white; border: 1px solid #e0e0e0; border-radius: 10px; color: #555; font-size: 14px; cursor: pointer; }
.back-btn:hover { border-color: #667eea; color: #667eea; }
.comment-list { display: flex; flex-direction: column; gap: 12px; }
.comment-card { background: white; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.dark-mode .comment-card { background: #16213e; }
.comment-resource { font-size: 13px; color: #667eea; margin-bottom: 8px; font-weight: 500; }
.comment-body { color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 8px; }
.dark-mode .comment-body { color: #9ca3af; }
.comment-footer { display: flex; gap: 12px; align-items: center; font-size: 12px; color: #999; }
.comment-status { padding: 2px 10px; border-radius: 10px; font-weight: 500; font-size: 11px; }
.comment-status.approved { background: #f0f9eb; color: #67c23a; }
.comment-status.pending { background: #fdf6ec; color: #e6a23c; }
.comment-status.rejected { background: #fef0f0; color: #f56c6c; }
</style>
