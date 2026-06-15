<template>
  <div class="dashboard">
    <div class="stat-cards">
      <el-card v-for="stat in statCards" :key="stat.label" class="stat-card" shadow="hover">
        <div class="stat-icon" :style="{ background: stat.color }">
          <el-icon :size="24"><component :is="iconMap[stat.icon]" /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </el-card>
    </div>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card header="分类分布">
          <div class="chart-bars">
            <div v-for="item in categoryStats" :key="item.name" class="bar-item">
              <div class="bar-label">{{ item.name }}</div>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: getBarWidth(item.count) + '%' }"></div>
              </div>
              <div class="bar-value">{{ item.count }}</div>
            </div>
            <div v-if="categoryStats.length === 0" class="no-data">暂无数据</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="评论状态">
          <div class="comment-stats-grid">
            <div class="cs-item"><div class="cs-value" style="color:#67c23a">{{ commentStats.approved||0 }}</div><div class="cs-label">已通过</div></div>
            <div class="cs-item"><div class="cs-value" style="color:#e6a23c">{{ commentStats.pending||0 }}</div><div class="cs-label">待审核</div></div>
            <div class="cs-item"><div class="cs-value" style="color:#f56c6c">{{ commentStats.rejected||0 }}</div><div class="cs-label">已拒绝</div></div>
            <div class="cs-item"><div class="cs-value" style="color:#409eff">{{ commentStats.total||0 }}</div><div class="cs-label">总数</div></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <el-card header="热门资源 TOP 10">
          <div class="top-list">
            <div v-for="(item, idx) in topResources" :key="item.id" class="top-item">
              <span class="top-rank" :class="{ top3: idx < 3 }">{{ idx + 1 }}</span>
              <span class="top-title">{{ item.title }}</span>
              <span class="top-hits">{{ item.hits }}</span>
            </div>
            <div v-if="topResources.length === 0" class="no-data">暂无数据</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card header="最近添加">
          <div class="top-list">
            <div v-for="item in recentResources" :key="item.id" class="top-item">
              <span class="top-title">{{ item.title }}</span>
              <span class="top-time">{{ formatDate(item.created_at) }}</span>
            </div>
            <div v-if="recentResources.length === 0" class="no-data">暂无数据</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="8">
        <el-card header="资源增长 (30天)">
          <div class="trend-chart">
            <div v-for="(item, idx) in resourceTrend" :key="idx" class="trend-bar" :style="{ height: getTrendHeight(item.count) + '%' }" :title="`${item.date}: ${item.count}`">
              <span class="trend-tooltip">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="用户增长 (30天)">
          <div class="trend-chart">
            <div v-for="(item, idx) in userTrend" :key="idx" class="trend-bar" :style="{ height: getTrendHeight2(item.count) + '%' }" :title="`${item.date}: ${item.count}`" style="background:linear-gradient(180deg,#67c23a,#b3e19d)">
              <span class="trend-tooltip">{{ item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card header="每日浏览 (30天)">
          <div class="trend-chart">
            <div v-for="(item, idx) in hitsTrend" :key="idx" class="trend-bar" :style="{ height: getTrendHeight3(item.hits||item.count) + '%' }" :title="`${item.date}: ${item.hits||item.count}`" style="background:linear-gradient(180deg,#e6a23c,#f5d78e)">
              <span class="trend-tooltip">{{ item.hits||item.count }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { resourceApi } from '@/api/resource'
import { ElMessage } from 'element-plus'
import { Folder, Top, View, Files, ChatDotRound, User } from '@element-plus/icons-vue'

const iconMap = { Folder, Top, View, Files, ChatDotRound, User }
const stats = ref({})
const categoryStats = ref([])
const topResources = ref([])
const recentResources = ref([])
const resourceTrend = ref([])
const userTrend = ref([])
const hitsTrend = ref([])
const commentStats = ref({})

const statCards = ref([])

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('zh-CN') : ''
}

function getBarWidth(count) {
  const max = Math.max(...categoryStats.value.map(c => c.count), 1)
  return (count / max) * 100
}

function getTrendHeight(count) {
  const max = Math.max(...resourceTrend.value.map(t => t.count), 1)
  return Math.max((count / max) * 100, 4)
}
function getTrendHeight2(count) {
  const max = Math.max(...userTrend.value.map(t => t.count), 1)
  return Math.max((count / max) * 100, 4)
}
function getTrendHeight3(count) {
  const max = Math.max(...hitsTrend.value.map(t => t.hits||t.count), 1)
  return Math.max((count / max) * 100, 4)
}

async function loadData() {
  try {
    const data = await adminApi.stats()
    stats.value = data
    statCards.value = [
      { label: '总资源', value: data.totalResources || 0, icon: 'Folder', color: '#409eff' },
      { label: '已置顶', value: data.pinnedResources || 0, icon: 'Top', color: '#e6a23c' },
      { label: '总浏览', value: data.totalHits || 0, icon: 'View', color: '#67c23a' },
      { label: '分类数', value: data.totalCategories || 0, icon: 'Files', color: '#f56c6c' },
      { label: '评论数', value: data.totalComments || 0, icon: 'ChatDotRound', color: '#909399' },
      { label: '用户数', value: data.totalUsers || 0, icon: 'User', color: '#b37feb' },
    ]
    categoryStats.value = data.categoryDistribution || []
    topResources.value = data.topResources || []
    recentResources.value = data.recentResources || []
    resourceTrend.value = data.resourceTrend || []
    userTrend.value = data.userTrend || []
    hitsTrend.value = data.hitsTrend || data.dailyHits || []
    commentStats.value = data.commentStats || data.comments || {}
  } catch(e) { ElMessage.error('加载统计数据失败') }

  if (topResources.value.length === 0) {
    try { topResources.value = await resourceApi.hot(10) } catch { ElMessage.error('加载热门资源失败') } }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 14px;
  }
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
}
.stat-label {
  font-size: 13px;
  color: var(--text-color-secondary);
}
.chart-row { margin-bottom: 20px; }

.chart-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bar-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-label {
  width: 80px;
  font-size: 13px;
  text-align: right;
  flex-shrink: 0;
}
.bar-track {
  flex: 1;
  height: 18px;
  background: var(--border-color-extra-light);
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #79bbff);
  border-radius: 4px;
  transition: width 0.5s;
}
.bar-value {
  width: 40px;
  font-size: 13px;
  color: var(--text-color-secondary);
  text-align: right;
}
.comment-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.cs-item {
  text-align: center;
  padding: 16px;
  background: var(--border-color-extra-light);
  border-radius: 8px;
}
.cs-value {
  font-size: 28px;
  font-weight: 700;
}
.cs-label {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin-top: 4px;
}
.top-list {
  display: flex;
  flex-direction: column;
}
.top-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color-extra-light);
  &:last-child { border-bottom: none; }
}
.top-rank {
  width: 24px;
  text-align: center;
  font-weight: 700;
  color: var(--text-color-secondary);
  &.top3 { color: var(--primary-color); }
}
.top-title {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.top-hits, .top-time {
  font-size: 12px;
  color: var(--text-color-secondary);
}
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 150px;
  padding-top: 20px;
}
.trend-bar {
  flex: 1;
  min-width: 8px;
  background: linear-gradient(180deg, #409eff, #79bbff);
  border-radius: 3px 3px 0 0;
  position: relative;
  transition: height 0.5s;
  cursor: pointer;
  &:hover .trend-tooltip { opacity: 1; }
}
.trend-tooltip {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  background: #333;
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.2s;
  white-space: nowrap;
}
.no-data {
  text-align: center;
  padding: 30px;
  color: var(--text-color-secondary);
}
</style>
