<template>
  <div class="admin-behavior">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>用户行为分析</h3>
          <el-button type="primary" size="small" @click="loadData">刷新</el-button>
        </div>
      </template>
      <div v-if="loading" v-loading="loading" style="height:200px"></div>
      <template v-else-if="data">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>最活跃用户</span></template>
              <div v-for="(user, idx) in (data.activeUsers || [])" :key="idx" class="list-item">
                <span class="item-rank">{{ idx + 1 }}</span>
                <span class="item-name">{{ user.username }}</span>
                <span class="item-count">{{ user.action_count }} 次操作</span>
              </div>
              <div v-if="!data.activeUsers?.length" class="no-data">暂无数据</div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>最热门资源</span></template>
              <div v-for="(r, idx) in (data.popularResources || [])" :key="idx" class="list-item">
                <span class="item-rank">{{ idx + 1 }}</span>
                <span class="item-name">{{ r.title }}</span>
                <span class="item-count">{{ r.hits }} 浏览</span>
              </div>
              <div v-if="!data.popularResources?.length" class="no-data">暂无数据</div>
            </el-card>
          </el-col>
        </el-row>
        <el-row :gutter="20" style="margin-top:20px">
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>操作类型分布</span></template>
              <div v-for="(item, idx) in (data.actionDistribution || [])" :key="idx" class="bar-item">
                <div class="bar-label">{{ item.action }}</div>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: getBarWidth(item.count, data.actionDistribution) + '%' }"></div>
                </div>
                <div class="bar-value">{{ item.count }}</div>
              </div>
              <div v-if="!data.actionDistribution?.length" class="no-data">暂无数据</div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <template #header><span>每日访问趋势</span></template>
              <div v-if="data.dailyTraffic?.length" class="trend-chart">
                <div v-for="(item, idx) in data.dailyTraffic" :key="idx" class="trend-bar" :style="{ height: getTrendHeight(item.count, data.dailyTraffic) + '%' }" :title="`${item.date}: ${item.count}`">
                  <span class="trend-tooltip">{{ item.count }}</span>
                </div>
              </div>
              <div v-else class="no-data">暂无数据</div>
            </el-card>
          </el-col>
        </el-row>
      </template>
      <div v-else class="empty">暂无行为数据</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const data = ref(null)

function getBarWidth(count, arr) {
  const max = Math.max(...arr.map(a => a.count), 1)
  return (count / max) * 100
}
function getTrendHeight(count, arr) {
  const max = Math.max(...arr.map(t => t.count), 1)
  return Math.max((count / max) * 100, 4)
}

async function loadData() {
  loading.value = true
  try { data.value = await adminApi.behavior() } catch { ElMessage.error('加载分析数据失败'); data.value = null } finally { loading.value = false }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.empty, .no-data { text-align: center; padding: 30px; color: var(--text-color-secondary); }
.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color-extra-light);
  &:last-child { border-bottom: none; }
}
.item-rank { width: 24px; text-align: center; font-weight: 700; color: var(--primary-color); }
.item-name { flex: 1; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-count { font-size: 12px; color: var(--text-color-secondary); }
.bar-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.bar-label { width: 80px; font-size: 12px; text-align: right; color: var(--text-color-secondary); }
.bar-track { flex: 1; height: 16px; background: var(--border-color-extra-light); border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #409eff, #79bbff); border-radius: 4px; }
.bar-value { width: 40px; font-size: 12px; color: var(--text-color-secondary); text-align: right; }
.trend-chart { display: flex; align-items: flex-end; gap: 3px; height: 120px; }
.trend-bar {
  flex: 1; min-width: 8px; background: linear-gradient(180deg, #67c23a, #95d475);
  border-radius: 3px 3px 0 0; position: relative; cursor: pointer;
  &:hover .trend-tooltip { opacity: 1; }
}
.trend-tooltip {
  position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
  font-size: 10px; background: #333; color: white; padding: 2px 4px;
  border-radius: 3px; opacity: 0; transition: opacity 0.2s; white-space: nowrap;
}
</style>
