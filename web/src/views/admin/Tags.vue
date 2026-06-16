<template>
  <div class="admin-tags">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>标签管理</h3>
          <div>
            <el-button type="primary" @click="openDialog()">添加标签</el-button>
            <el-button @click="showBatch = true">批量添加</el-button>
          </div>
        </div>
      </template>
      <div v-if="loading" style="height:100px"></div>
      <div v-else-if="items.length === 0" class="empty">暂无标签</div>
      <div v-else class="tag-list">
        <el-tag
          v-for="tag in items"
          :key="tag.id"
          closable
          size="large"
          @close="handleDelete(tag)"
          @click="openDialog(tag)"
        >
          {{ tag.name }} ({{ tag.resource_count || 0 }})
        </el-tag>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑标签' : '添加标签'" width="400px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="60px">
        <el-form-item label="名称" prop="name"><el-input v-model="form.name" placeholder="如：开源" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatch" title="批量添加标签" width="440px">
      <el-input v-model="batchNames" type="textarea" :rows="6" placeholder="每行一个标签名称" />
      <template #footer>
        <el-button @click="showBatch = false">取消</el-button>
        <el-button type="primary" :loading="batchLoading" @click="handleBatch">批量添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { tagApi } from '@/api/tag'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const items = ref([])
const dialogVisible = ref(false)
const editing = ref(null)
const saveLoading = ref(false)
const formRef = ref(null)
const showBatch = ref(false)
const batchNames = ref('')
const batchLoading = ref(false)

const form = ref({ name: '' })
const rules = { name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }] }

async function loadData() {
  loading.value = true
  try { items.value = await tagApi.list() } catch { ElMessage.error('加载标签失败'); items.value = [] } finally { loading.value = false }
}

function openDialog(tag) {
  editing.value = tag || null
  form.value = { name: tag?.name || '' }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value?.validate()
  saveLoading.value = true
  try {
    if (editing.value) await tagApi.update(editing.value.id, form.value)
    else await tagApi.create(form.value)
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch { ElMessage.error('保存失败') } finally { saveLoading.value = false }
}

async function handleDelete(tag) {
  await ElMessageBox.confirm(`确定要删除标签"${tag.name}"吗？`, '提示', { type: 'warning' })
  try {
    await tagApi.delete(tag.id)
    ElMessage.success('删除成功')
    loadData()
  } catch { ElMessage.error('删除失败') }
}

async function handleBatch() {
  const names = batchNames.value.split('\n').map(n => n.trim()).filter(Boolean)
  if (names.length === 0) return ElMessage.warning('请输入标签名称')
  batchLoading.value = true
  try {
    const res = await tagApi.batchCreate(names)
    ElMessage.success(`创建 ${res.created?.length || 0} 个，跳过 ${res.skipped?.length || 0} 个`)
    showBatch.value = false
    batchNames.value = ''
    loadData()
  } catch { ElMessage.error('批量创建失败') } finally { batchLoading.value = false }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 0;
  .el-tag {
    cursor: pointer;
    transition: all 0.2s;
    &:hover { opacity: 0.8; }
  }
}
.empty {
  text-align: center;
  padding: 40px;
  color: var(--text-color-secondary);
}
</style>
