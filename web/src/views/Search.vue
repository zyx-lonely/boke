<template>
  <div class="search-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="container" style="padding-top:80px;padding-bottom:40px">
      <div class="search-bar">
        <input v-model="keyword" class="search-input" placeholder="搜索资源..." @keyup.enter="doSearch(1)" ref="inputRef" />
        <button class="btn btn-primary" @click="doSearch(1)" :disabled="loading">搜索</button>
      </div>
      <div v-if="loading" class="loading">搜索中...</div>
      <div v-else-if="searched">
        <p class="result-count">共找到 <strong>{{ total }}</strong> 条结果</p>
        <div v-if="rows.length" class="resource-list">
          <router-link v-for="r in rows" :key="r.id" :to="'/detail/' + r.id" class="resource-card">
            <h3>{{ r.title }} <small v-if="r.software_name" style="color:#999;font-weight:400"> — {{ r.software_name }}</small></h3>
            <p class="summary">{{ r.summary }}</p>
            <div class="meta">
              <span>❤️ {{ r.hits }} 次浏览</span>
              <span>{{ formatDate(r.created_at) }}</span>
            </div>
          </router-link>
        </div>
        <div v-else class="empty">未找到相关资源</div>
        <div v-if="totalPages > 1" class="pagination">
          <button :disabled="page <= 1" @click="doSearch(page - 1)">上一页</button>
          <span class="page-info">{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="doSearch(page + 1)">下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { searchApi } from '@/api/search'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const keyword = ref('')
const rows = ref([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const loading = ref(false)
const searched = ref(false)
const inputRef = ref(null)

function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '' }

async function doSearch(p) {
  if (!keyword.value.trim()) return
  page.value = Math.max(1, p || 1)
  loading.value = true; searched.value = true
  router.replace({ query: { q: keyword.value.trim(), page: page.value } })
  try {
    const r = await searchApi.search(keyword.value.trim(), page.value)
    rows.value = r.rows; total.value = r.total
    totalPages.value = Math.max(1, Math.ceil(total.value / 20))
    if (r.page) page.value = r.page
  } catch { rows.value = []; total.value = 0; totalPages.value = 1 } finally { loading.value = false }
}

onMounted(() => {
  if (route.query.q) { keyword.value = route.query.q; doSearch(parseInt(route.query.page) || 1) }
  setTimeout(() => inputRef.value?.focus(), 100)
})
</script>

<style scoped>
.search-page { min-height: 100vh; background: #f5f7fa; }
.dark-mode.search-page { background: #1a1a2e; }
.search-bar { display: flex; gap: 12px; margin-bottom: 24px; }
.search-input { flex: 1; padding: 14px 18px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; }
.dark-mode .search-input { background: #16213e; border-color: #2d3a5f; color: #e0e0e0; }
.search-input:focus { outline: none; border-color: #667eea; }
.btn { padding: 12px 28px; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
.loading, .empty { text-align: center; padding: 60px; color: #999; }
.result-count { color: #666; font-size: 14px; margin-bottom: 16px; }
.resource-list { display: flex; flex-direction: column; gap: 12px; }
.resource-card { display: block; background: white; border-radius: 12px; padding: 18px 22px; text-decoration: none; transition: all 0.2s; }
.dark-mode .resource-card { background: #16213e; }
.resource-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.resource-card h3 { margin: 0 0 8px; color: #1a1a2e; font-size: 1.1rem; }
.dark-mode .resource-card h3 { color: #e0e0e0; }
.summary { color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.meta { display: flex; gap: 16px; font-size: 12px; color: #999; }
.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; }
.pagination button { padding: 8px 20px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer; font-size: 14px; }
.dark-mode .pagination button { background: #16213e; border-color: #2d3a5f; color: #e0e0e0; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 14px; color: #666; }
</style>
