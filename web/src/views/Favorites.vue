<template>
  <div class="favorites-page page-container">
    <h1 class="page-title">我的收藏</h1>

    <div class="filters">
      <el-input v-model="searchQuery" placeholder="搜索收藏的资源..." clearable style="width:300px" @input="applyFilters" />
      <div class="tag-filters">
        <el-tag :type="activeTag===''?'primary':'info'" effect="plain" style="cursor:pointer" @click="activeTag='';applyFilters()">全部</el-tag>
        <el-tag v-for="t in allTags" :key="t" :type="activeTag===t?'primary':'info'" effect="plain" style="cursor:pointer" @click="activeTag=t;applyFilters()">{{ t }}</el-tag>
      </div>
    </div>

    <div v-if="loading" class="loading-area">
      <el-skeleton :rows="4" animated />
    </div>
    <template v-else>
      <div v-if="filteredItems.length === 0" class="empty-state">
        <el-empty :description="searchQuery||activeTag ? '没有匹配的收藏' : '暂无收藏'">
          <el-button type="primary" @click="$router.push('/')">去发现资源</el-button>
        </el-empty>
      </div>
      <div v-else class="favorites-grid">
        <el-card v-for="item in filteredItems" :key="item.id" class="favorite-card" shadow="hover" @click="$router.push(`/detail/${item.id}`)">
          <div class="card-title">
            <el-tag v-if="item.pinned" type="danger" size="small" effect="dark">置顶</el-tag>
            {{ item.title }}
          </div>
          <div class="card-meta">
            <el-tag size="small" type="info">{{ item.category_name || '未分类' }}</el-tag>
            <span><el-icon><View /></el-icon> {{ item.hits || 0 }}</span>
          </div>
          <p class="card-summary">{{ item.summary || '暂无描述' }}</p>
          <div class="card-tags" v-if="item.tags?.length">
            <el-tag v-for="t in item.tags.slice(0,4)" :key="t" size="small" effect="plain" round>{{ t }}</el-tag>
          </div>
          <div class="card-footer">
            <el-button type="danger" size="small" text @click.stop="removeFavorite(item.id)">
              <el-icon><Delete /></el-icon> 取消收藏
            </el-button>
          </div>
        </el-card>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { favoriteApi } from '@/api/favorite'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Delete } from '@element-plus/icons-vue'

const loading = ref(true)
const items = ref([])
const searchQuery = ref('')
const activeTag = ref('')

const allTags = computed(() => {
  const tagSet = new Set()
  items.value.forEach(item => (item.tags||[]).forEach(t => tagSet.add(t)))
  return Array.from(tagSet)
})

const filteredItems = computed(() => {
  let result = items.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(i => (i.title||'').toLowerCase().includes(q) || (i.summary||'').toLowerCase().includes(q) || (i.software_name||'').toLowerCase().includes(q))
  }
  if (activeTag.value) {
    result = result.filter(i => (i.tags||[]).includes(activeTag.value))
  }
  return result
})

async function loadFavorites() {
  loading.value = true
  try {
    const data = await favoriteApi.list()
    items.value = data?.items ?? data ?? []
  } catch { ElMessage.error('加载收藏失败'); items.value = [] } finally {
    loading.value = false
  }
}

async function removeFavorite(id) {
  await ElMessageBox.confirm('确定要取消收藏吗？', '提示', { type: 'warning' })
  try {
    await favoriteApi.remove(id)
    items.value = items.value.filter(i => i.id !== id)
    ElMessage.success('已取消收藏')
  } catch { ElMessage.error('取消收藏失败') }
}

onMounted(loadFavorites)
</script>

<style lang="scss" scoped>
.favorites-page {
  padding-top: 80px;
  min-height: 80vh;
}
.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.tag-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}
.favorite-card {
  cursor: pointer;
  transition: all 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: var(--box-shadow); }
}
.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  color: var(--text-color-secondary);
  font-size: 13px;
}
.card-summary {
  color: var(--text-color-secondary);
  font-size: 13px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 10px;
  line-height: 1.6;
}
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}
.card-footer {
  display: flex;
  justify-content: flex-end;
}
.empty-state {
  padding: 60px 0;
}
</style>
