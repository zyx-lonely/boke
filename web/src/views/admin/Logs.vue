<template>
  <div class="admin-logs">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>操作日志</h3>
          <div style="display:flex;gap:8px">
            <el-dropdown @command="exportLogs">
              <el-button size="small">导出</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="csv">CSV</el-dropdown-item>
                  <el-dropdown-item command="json">JSON</el-dropdown-item>
                  <el-dropdown-item command="xlsx">Excel</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="danger" size="small" @click="openCleanDialog">清理旧日志</el-button>
          </div>
        </div>
      </template>

      <div class="filter-bar">
        <el-input v-model="filters.username" placeholder="搜索用户名" style="width:140px" clearable @keyup.enter="loadData" />
        <el-input v-model="filters.action" placeholder="搜索操作类型" style="width:140px" clearable @keyup.enter="loadData" />
        <el-select v-model="filters.resource_type" placeholder="全部类型" clearable style="width:120px" @change="loadData">
          <el-option label="用户" value="user" />
          <el-option label="资源" value="resource" />
          <el-option label="评论" value="comment" />
          <el-option label="分类" value="category" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" @change="onDateChange" />
        <el-button type="primary" @click="loadData">搜索</el-button>
      </div>

      <el-table :data="items" v-loading="loading" stripe size="small">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="操作人" width="100" />
        <el-table-column prop="action" label="操作类型" width="120" />
        <el-table-column prop="resource_type" label="目标类型" width="80" />
        <el-table-column prop="resource_id" label="目标ID" width="70" />
        <el-table-column prop="details" label="详情" min-width="180" show-overflow-tooltip />
        <el-table-column prop="ip_address" label="IP" width="130" />
        <el-table-column prop="created_at" label="操作时间" width="170">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination v-model:current-page="page" :page-size="limit" :total="total" layout="prev, pager, next" background @current-change="loadData" />
      </div>
    </el-card>

    <el-dialog v-model="cleanDialogVisible" title="清理旧日志" width="400px">
      <el-alert type="warning" :closable="false" style="margin-bottom:16px">此操作将永久删除旧日志数据，无法恢复！</el-alert>
      <el-select v-model="cleanDays" style="width:100%">
        <el-option :value="7" label="保留最近 7 天" />
        <el-option :value="14" label="保留最近 14 天" />
        <el-option :value="30" label="保留最近 30 天" />
        <el-option :value="60" label="保留最近 60 天" />
        <el-option :value="90" label="保留最近 90 天" />
      </el-select>
      <template #footer>
        <el-button @click="cleanDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="cleanLoading" @click="doClean">确认清理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const items = ref([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const dateRange = ref(null)
const filters = reactive({ username: '', action: '', resource_type: '', start_date: '', end_date: '' })

const cleanDialogVisible = ref(false)
const cleanDays = ref(30)
const cleanLoading = ref(false)

function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '' }
function onDateChange(val) {
  filters.start_date = val?.[0] || ''
  filters.end_date = val?.[1] || ''
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value, ...filters }
    const data = await adminApi.logs(params)
    items.value = data.items || []
    total.value = data.total || 0
  } catch { ElMessage.error('加载日志失败'); items.value = [] } finally { loading.value = false }
}

function openCleanDialog() { cleanDialogVisible.value = true }

async function doClean() {
  await ElMessageBox.confirm('确定要清理旧日志吗？此操作无法恢复！', '警告', { type: 'warning' })
  cleanLoading.value = true
  try {
    await adminApi.cleanLogs(cleanDays.value)
    ElMessage.success('清理成功')
    cleanDialogVisible.value = false
    loadData()
  } catch { ElMessage.error('清理失败') } finally { cleanLoading.value = false }
}

function exportLogs(format) {
  const params = new URLSearchParams({ format, ...filters })
  window.open(`/api/admin/logs/export?${params.toString()}`, '_blank')
  ElMessage.success(`正在导出 ${format.toUpperCase()} 日志，请检查下载`)
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }
.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.table-footer { display: flex; justify-content: center; margin-top: 16px; }
</style>
