<template>
  <div class="archive-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="container" style="padding-top:80px;padding-bottom:40px">
      <h2 style="margin-bottom:24px">文章归档</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!groups.length" class="empty">暂无内容</div>
      <div v-else class="archive-list">
        <div v-for="g in groups" :key="g.month" class="archive-group">
          <div class="group-header" @click="g.open = !g.open">
            <span class="group-month">{{ g.month }}</span>
            <span class="group-count">{{ g.count }} 篇</span>
            <span class="toggle">{{ g.open ? '▾' : '▸' }}</span>
          </div>
          <div v-show="g.open" class="group-items">
            <router-link v-for="item in g.items" :key="item.id" :to="'/detail/' + item.id" class="archive-item">
              <span class="item-title">{{ item.title }}</span>
              <span class="item-date">{{ formatDate(item.created_at) }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { searchApi } from '@/api/search'

const appStore = useAppStore()
const groups = ref([])
const loading = ref(true)

function formatDate(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : '' }

onMounted(async () => {
  try {
    const data = await searchApi.archive()
    groups.value = data.map(g => ({ ...g, open: false }))
    if (groups.value.length) groups.value[0].open = true
  } catch {} finally { loading.value = false }
})
</script>

<style scoped>
.archive-page { min-height: 100vh; background: #f5f7fa; }
.dark-mode.archive-page { background: #1a1a2e; }
.loading, .empty { text-align: center; padding: 60px; color: #999; }
.archive-group { margin-bottom: 12px; }
.group-header { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: white; border-radius: 10px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.dark-mode .group-header { background: #16213e; }
.group-month { font-size: 1.1rem; color: #667eea; }
.group-count { color: #999; font-size: 13px; margin-left: auto; }
.toggle { color: #999; font-size: 14px; }
.group-items { margin-top: 6px; margin-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.archive-item { display: flex; justify-content: space-between; padding: 10px 16px; background: white; border-radius: 8px; text-decoration: none; transition: all 0.15s; }
.dark-mode .archive-item { background: #16213e; }
.archive-item:hover { background: #f0f2f5; }
.dark-mode .archive-item:hover { background: #1a2744; }
.item-title { color: #333; font-size: 14px; }
.dark-mode .item-title { color: #e0e0e0; }
.item-date { color: #999; font-size: 12px; }
</style>
