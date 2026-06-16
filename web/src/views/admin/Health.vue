<template>
  <div class="admin-health">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>系统健康监控</h3>
          <el-button type="primary" size="small" @click="loadData">刷新</el-button>
        </div>
      </template>
      <div v-if="loading" v-loading="loading" style="height:200px"></div>
      <template v-else-if="data">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="服务器状态">
            <el-tag :type="data.status === 'ok' ? 'success' : 'danger'">{{ data.status === 'ok' ? '正常' : '异常' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="运行时间">{{ data.uptime || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="内存使用">{{ data.memory?.heapUsed || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="内存总量">{{ data.memory?.heapTotal || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="CPU 使用率">{{ data.cpu?.usage || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="Node.js 版本">{{ data.nodeVersion || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="数据库连接">
            <el-tag :type="data.database?.connected ? 'success' : 'danger'">
              {{ data.database?.connected ? '已连接' : '断开' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="活跃连接数">{{ data.database?.activeConnections !== undefined ? data.database.activeConnections : 'N/A' }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <div v-else class="empty">暂无监控数据</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const data = ref(null)

async function loadData() {
  loading.value = true
  try { data.value = await adminApi.health() } catch { ElMessage.error('加载监控数据失败'); data.value = null } finally { loading.value = false }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.empty { text-align: center; padding: 40px; color: var(--text-color-secondary); }
</style>
