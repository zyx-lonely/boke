<template>
  <div class="admin-comments">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <h3>评论管理</h3>
            <el-select v-model="statusFilter" placeholder="全部" clearable style="width:120px" @change="loadData">
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </div>
          <div v-if="selectedIds.length" class="header-actions">
            <span>已选 {{ selectedIds.length }} 项</span>
            <el-button type="danger" size="small" @click="batchDelete">批量删除</el-button>
          </div>
        </div>
      </template>
      <el-table :data="items" v-loading="loading" stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="resource_title" label="资源" width="150" show-overflow-tooltip />
        <el-table-column prop="username" label="用户" width="100" />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="{ approved: 'success', pending: 'warning', rejected: 'danger' }[row.status]" size="small">
              {{ { approved: '已通过', pending: '待审核', rejected: '已拒绝' }[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="160">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button v-if="row.status !== 'approved'" size="small" text type="success" @click="approve(row)">通过</el-button>
            <el-button v-if="row.status !== 'rejected'" size="small" text type="warning" @click="reject(row)">拒绝</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="table-footer">
        <el-pagination v-model:current-page="page" :page-size="limit" :total="total" layout="prev, pager, next" background @current-change="loadData" />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { commentApi } from '@/api/comment'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const items = ref([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const statusFilter = ref('')
const selectedIds = ref([])

function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '' }
function onSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (statusFilter.value) params.status = statusFilter.value
    const data = await commentApi.adminList(params)
    items.value = data.items || []
    total.value = data.total || 0
  } catch { ElMessage.error('加载评论失败'); items.value = [] } finally { loading.value = false }
}

async function approve(row) {
  try { await commentApi.approve(row.id); row.status = 'approved'; ElMessage.success('已通过') } catch { ElMessage.error('操作失败') }
}

async function reject(row) {
  try { await commentApi.reject(row.id); row.status = 'rejected'; ElMessage.success('已拒绝') } catch { ElMessage.error('操作失败') }
}

async function handleDelete(row) {
  await ElMessageBox.confirm('确定要删除该评论吗？', '提示', { type: 'warning' })
  try { await commentApi.delete(row.id); ElMessage.success('已删除'); loadData() } catch { ElMessage.error('删除失败') }
}

async function batchDelete() {
  await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 条评论吗？`, '提示', { type: 'warning' })
  try { await commentApi.batchDelete(selectedIds.value); ElMessage.success('批量删除成功'); selectedIds.value = []; loadData() } catch { ElMessage.error('批量删除失败') }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.table-footer { display: flex; justify-content: center; margin-top: 16px; }
</style>
