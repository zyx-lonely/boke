<template>
  <div class="ranking-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="container" style="padding-top:80px;padding-bottom:40px">
      <h1 class="page-title">🏆 排行榜</h1>
      <div class="tabs">
        <button v-for="t in tabOptions" :key="t.value" class="tab" :class="{active: activeTab===t.value}" @click="switchTab(t.value)">{{ t.label }}</button>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else>
        <div v-if="items.length===0" class="empty-state">暂无数据</div>
        <div v-for="(r,i) in items" :key="r.id" class="rank-item" @click="$router.push(`/detail/${r.id}`)">
          <div class="rank-num" :class="{top3:i<3}">{{ i+1 }}</div>
          <div class="rank-info">
            <div class="rank-title"><span v-if="r.pinned" class="badge pinned">置顶</span>{{ r.title }}</div>
            <div class="rank-meta">
              <span>{{ r.category_name||'未分类' }}</span>
              <span>👁️ {{ r.hits||0 }}</span>
              <span>⭐ {{ r.favorites_count||0 }}</span>
              <span>💬 {{ r.comments_count||0 }}</span>
            </div>
          </div>
        </div>
        <div v-if="hasMore" class="load-more">
          <button class="btn btn-more" :disabled="loadingMore" @click="loadMore">{{ loadingMore ? '加载中...' : '加载更多' }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { ElMessage } from 'element-plus'
import { rankingApi } from '@/api/ranking'

const appStore = useAppStore()
const activeTab = ref('views')
const loading = ref(true)
const loadingMore = ref(false)
const items = ref([])
const offset = ref(0)
const hasMore = ref(true)
const limit = 10

const tabOptions = [
  { label: '🔥 浏览量', value: 'views' },
  { label: '⭐ 收藏数', value: 'favorites' },
  { label: '💬 评论数', value: 'comments' },
]

async function loadData(reset = true) {
  if (reset) { loading.value = true; items.value = []; offset.value = 0; hasMore.value = true }
  else loadingMore.value = true
  try {
    const data = await rankingApi.list({ type: activeTab.value, limit, offset: offset.value })
    const newItems = data.items || []
    if (reset) items.value = newItems
    else items.value = [...items.value, ...newItems]
    hasMore.value = newItems.length >= limit
    offset.value += limit
  } catch { ElMessage.error('加载排行榜失败'); items.value = [] } finally { loading.value = false; loadingMore.value = false }
}

async function loadMore() { if (!loadingMore.value && hasMore.value) await loadData(false) }

function switchTab(t) { activeTab.value = t; loadData(true) }
onMounted(() => loadData(true))
</script>

<style scoped>
.ranking-page { min-height: 100vh; background: #f5f7fa; }
.dark-mode .ranking-page { background: #1a1a2e; }
.page-title { font-size: 2rem; font-weight: 700; color: #1a1a2e; margin-bottom: 24px; }
.dark-mode .page-title { color: #e0e0e0; }
.tabs { display: flex; gap: 12px; margin-bottom: 24px; }
.tab { padding: 10px 24px; background: white; border: 2px solid #e8eaf0; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: #555; }
.tab.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-color: transparent; box-shadow: 0 4px 15px rgba(102,126,234,0.35); }
.tab:hover:not(.active) { border-color: #667eea; color: #667eea; }
.dark-mode .tab { background: #16213e; border-color: #2d3a5f; color: #9ca3af; }
.rank-item { display: flex; align-items: center; gap: 20px; padding: 18px 24px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); margin-bottom: 10px; cursor: pointer; transition: all 0.25s; }
.rank-item:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(102,126,234,0.15); }
.dark-mode .rank-item { background: #16213e; border-color: #2d3a5f; }
.rank-num { font-size: 1.3rem; font-weight: 700; color: #999; min-width: 40px; text-align: center; }
.rank-num.top3 { background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 1.5rem; }
.rank-info { flex: 1; min-width: 0; }
.rank-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; color: #1a1a2e; }
.dark-mode .rank-title { color: #e0e0e0; }
.badge { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
.badge.pinned { background: linear-gradient(135deg, #fff3cd, #ffeeba); color: #856404; }
.rank-meta { display: flex; gap: 16px; color: #888; font-size: 13px; }
.load-more { text-align: center; margin-top: 20px; }
.btn-more { padding: 12px 40px; background: white; border: 2px solid #e8eaf0; border-radius: 12px; font-size: 14px; font-weight: 500; cursor: pointer; color: #555; transition: all 0.2s; }
.btn-more:hover { border-color: #667eea; color: #667eea; }
.empty-state { text-align: center; padding: 60px; color: #999; }
.loading { text-align: center; padding: 40px; color: #999; }

</style>
