<template>
  <div class="admin-users">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>用户管理</h3>
          <el-button type="primary" @click="openDialog()">添加用户</el-button>
        </div>
      </template>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="username" label="用户名" width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : row.role === 'editor' ? 'warning' : 'info'" size="small">
              {{ { admin: '管理员', editor: '编辑', user: '用户' }[row.role] || row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-switch :model-value="row.status === 'active'" @change="toggleStatus(row)" size="small" :active-value="true" :inactive-value="false" />
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap" v-if="total > limit">
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="limit" v-model:current-page="page" @current-change="loadData" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑用户' : '添加用户'" width="440px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="60px">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" :disabled="!!editing" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item v-if="!editing" label="密码" prop="password"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role">
            <el-option label="管理员" value="admin" />
            <el-option label="编辑" value="editor" />
            <el-option label="用户" value="user" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { userApi } from '@/api/user'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const items = ref([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const dialogVisible = ref(false)
const editing = ref(null)
const saveLoading = ref(false)
const formRef = ref(null)

const form = ref({ username: '', email: '', password: '', role: 'user' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : '' }

function openDialog(row) {
  editing.value = row || null
  form.value = row ? { ...row, password: '' } : { username: '', email: '', password: '', role: 'user' }
  dialogVisible.value = true
}

async function loadData() {
  loading.value = true
  try { const res = await userApi.list({ page: page.value, limit: limit.value }); items.value = res.items || res.data || res; total.value = res.total || items.value.length } catch { ElMessage.error('加载用户失败'); items.value = [] } finally { loading.value = false }
}

async function handleSave() {
  await formRef.value?.validate()
  saveLoading.value = true
  try {
    if (editing.value) {
      const data = { ...form.value }
      delete data.password
      await userApi.update(editing.value.id, data)
    } else {
      await userApi.create(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch { ElMessage.error('保存失败') } finally { saveLoading.value = false }
}

async function toggleStatus(row) {
  await ElMessageBox.confirm(`确定要${row.status === 'active' ? '禁用' : '启用'}用户"${row.username}"吗？`, '提示', { type: 'warning' })
  const newStatus = row.status === 'active' ? 'disabled' : 'active'
  try {
    await userApi.updateStatus(row.id, newStatus)
    row.status = newStatus
  } catch { ElMessage.error('状态更新失败') }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定要删除用户"${row.username}"吗？`, '提示', { type: 'warning' })
  try {
    await userApi.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch { ElMessage.error('删除失败') }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
