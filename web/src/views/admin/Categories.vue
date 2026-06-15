<template>
  <div class="admin-categories">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>分类管理</h3>
          <el-button type="primary" @click="openDialog()">添加分类</el-button>
        </div>
      </template>
      <el-table :data="items" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="分类名称" width="150">
          <template #default="{ row }">{{ row.icon || '' }} {{ row.name }}</template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sort_order" label="排序" width="80" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">{{ row.status === 'active' ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resource_count" label="资源数" width="80" />
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑分类' : '添加分类'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" placeholder="如：开发工具" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" placeholder="如：🛠️" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <div class="quick-templates">
          <span>快速模板：</span>
          <el-button v-for="t in templates" :key="t.name" size="small" @click="applyTemplate(t)">{{ t.icon }} {{ t.name }}</el-button>
        </div>
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
import { categoryApi } from '@/api/category'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const items = ref([])
const dialogVisible = ref(false)
const editing = ref(null)
const saveLoading = ref(false)
const formRef = ref(null)

const templates = [
  { name: '开发工具', icon: '🛠️', description: '编程开发和IDE工具' },
  { name: '前端开发', icon: '🎨', description: 'HTML/CSS/JavaScript' },
  { name: '后端开发', icon: '⚙️', description: '服务器端技术' },
  { name: '数据库', icon: '🗄️', description: '数据库管理' },
  { name: 'DevOps', icon: '🚀', description: '部署运维' },
]

const form = ref({ name: '', icon: '', description: '', sort_order: 0, status: 'active' })
const rules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

function applyTemplate(t) {
  form.value.name = t.name
  form.value.icon = t.icon
  form.value.description = t.description
}

function openDialog(row) {
  editing.value = row || null
  form.value = row ? { ...row } : { name: '', icon: '', description: '', sort_order: 0, status: 'active' }
  dialogVisible.value = true
}

async function loadData() {
  loading.value = true
  try { items.value = await categoryApi.adminList() } catch { ElMessage.error('加载分类失败'); items.value = [] } finally { loading.value = false }
}

async function handleSave() {
  await formRef.value?.validate()
  saveLoading.value = true
  try {
    if (editing.value) await categoryApi.update(editing.value.id, form.value)
    else await categoryApi.create(form.value)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch { ElMessage.error('保存失败') } finally { saveLoading.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定要删除分类"${row.name}"吗？`, '提示', { type: 'warning' })
  try {
    await categoryApi.delete(row.id)
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
.quick-templates {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 10px;
  border-top: 1px solid var(--border-color-light);
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-color-secondary);
}
</style>
