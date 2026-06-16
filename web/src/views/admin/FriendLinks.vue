<template>
  <div class="admin-friend-links">
    <el-card>
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3>友情链接</h3>
          <el-button type="primary" @click="openForm()">添加链接</el-button>
        </div>
      </template>
      <el-table :data="links" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="url" label="链接" min-width="200">
          <template #default="{ row }"><a :href="row.url" target="_blank">{{ row.url }}</a></template>
        </el-table-column>
        <el-table-column prop="sort_order" label="排序" width="70" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }"><el-tag :type="row.status==='active'?'success':'info'">{{ row.status==='active'?'启用':'禁用' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" @click="openForm(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editId ? '编辑' : '添加' + '友情链接'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required><el-input v-model="form.name" placeholder="站点名称" /></el-form-item>
        <el-form-item label="链接" required><el-input v-model="form.url" placeholder="https://example.com" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" placeholder="简短描述" /></el-form-item>
        <el-form-item label="Logo"><el-input v-model="form.logo" placeholder="Logo 图片链接（可选）" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="disabled" />
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
import { friendLinkApi } from '@/api/friendLink'
import { ElMessage, ElMessageBox } from 'element-plus'

const links = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const saveLoading = ref(false)
const editId = ref(null)
const form = ref({ name: '', url: '', description: '', logo: '', sort_order: 0, status: 'active' })

async function load() {
  loading.value = true
  try { links.value = await friendLinkApi.adminList() }
  catch { ElMessage.error('加载失败') } finally { loading.value = false }
}

function openForm(row) {
  if (row) {
    editId.value = row.id
    form.value = { name: row.name, url: row.url, description: row.description || '', logo: row.logo || '', sort_order: row.sort_order || 0, status: row.status }
  } else {
    editId.value = null
    form.value = { name: '', url: '', description: '', logo: '', sort_order: 0, status: 'active' }
  }
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.value.name || !form.value.url) { ElMessage.warning('名称和链接不能为空'); return }
  saveLoading.value = true
  try {
    if (editId.value) await friendLinkApi.update(editId.value, form.value)
    else await friendLinkApi.create(form.value)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load()
  } catch { ElMessage.error('保存失败') } finally { saveLoading.value = false }
}

function handleDelete(row) {
  ElMessageBox.confirm('确定删除「' + row.name + '」？', '提示').then(async () => {
    try {
      await friendLinkApi.remove(row.id)
      ElMessage.success('已删除')
      await load()
    } catch { ElMessage.error('删除失败') }
  }).catch(() => {})
}

onMounted(load)
</script>
