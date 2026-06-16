<template>
  <div class="admin-resources">
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-input v-model="searchQuery" placeholder="搜索资源名称..." style="width:200px" @keyup.enter="loadData" clearable @clear="loadData" />
            <el-select v-model="statusFilter" placeholder="全部状态" clearable style="width:120px" @change="loadData">
              <el-option label="已通过" value="approved" />
              <el-option label="待审核" value="pending" />
              <el-option label="已拒绝" value="rejected" />
              <el-option label="仅置顶" value="pinned" />
            </el-select>
            <el-select v-model="categoryFilter" placeholder="全部分类" clearable style="width:140px" @change="loadData">
              <el-option v-for="cat in allCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
            </el-select>
          </div>
          <div class="header-actions" style="display:flex;gap:8px;flex-wrap:wrap">
            <el-button @click="openImportDialog">导入</el-button>
            <el-dropdown @command="exportData">
              <el-button>导出</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="json">导出 JSON</el-dropdown-item>
                  <el-dropdown-item command="csv">导出 CSV</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-button type="primary" @click="openDialog()">添加资源</el-button>
          </div>
        </div>
      </template>

      <el-button v-if="selectedIds.length" type="danger" size="small" style="margin-bottom:12px" @click="batchDelete">批量删除 ({{ selectedIds.length }})</el-button>

      <el-table :data="items" v-loading="loading" stripe @selection-change="onSelectionChange">
        <el-table-column type="selection" width="40" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="software_name" label="软件名称" width="140" show-overflow-tooltip />
        <el-table-column prop="category_name" label="分类" width="100" />
        <el-table-column prop="hits" label="浏览" width="80" sortable />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pinned" label="置顶" width="70">
          <template #default="{ row }">
            <el-switch :model-value="row.pinned" @change="togglePin(row)" size="small" :active-value="1" :inactive-value="0" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="openDialog(row)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd) => handleCommand(cmd, row)">
              <el-button size="small" text>更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="approve" v-if="row.status !== 'approved'">通过</el-dropdown-item>
                  <el-dropdown-item command="reject" v-if="row.status !== 'rejected'">拒绝</el-dropdown-item>
                  <el-dropdown-item command="delete" divided style="color:#f56c6c">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <span class="total-info">共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="page"
          :page-size="limit"
          :total="total"
          layout="prev, pager, next"
          background
          @current-change="loadData"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingResource ? '编辑资源' : '添加资源'" width="720px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="标题" prop="title"><el-input v-model="form.title" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="软件名称" prop="software_name"><el-input v-model="form.software_name" /></el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类" prop="category_id">
              <el-select v-model="form.category_id" placeholder="请选择分类" style="width:100%">
                <el-option v-for="cat in allCategories" :key="cat.id" :label="cat.name" :value="cat.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开源协议"><el-input v-model="form.license" placeholder="如 MIT" /></el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="项目官网">
          <div style="display:flex;gap:8px">
            <el-input v-model="form.project_url" placeholder="https://..." style="flex:1" />
            <el-button size="small" @click="autoFillFromUrl">自动填写</el-button>
          </div>
        </el-form-item>
        <el-form-item label="简介" prop="summary"><el-input v-model="form.summary" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="详细说明">
          <VditorEditor v-model="form.content" placeholder="输入详细说明（支持 Markdown）" :height="360" />
        </el-form-item>
        <el-form-item label="下载地址">
          <div class="drive-list">
            <div v-for="(d, i) in form.cloud_drives" :key="i" class="drive-row">
              <el-select v-model="d.cloud_drive" style="width:120px" placeholder="网盘">
                <el-option label="百度网盘" value="baidu" />
                <el-option label="阿里云盘" value="aliyun" />
                <el-option label="腾讯微云" value="tencent" />
                <el-option label="蓝奏云" value="lanzou" />
                <el-option label="天翼云盘" value="ctyun" />
                <el-option label="夸克网盘" value="kuaike" />
                <el-option label="123云盘" value="123pan" />
                <el-option label="其他" value="other" />
              </el-select>
              <el-input v-model="d.download_url" placeholder="下载链接" style="flex:1" />
              <el-input v-model="d.extraction_code" placeholder="提取码" style="width:100px" />
              <el-button @click="form.cloud_drives.splice(i,1)" type="danger" text>×</el-button>
            </div>
            <el-button size="small" @click="form.cloud_drives.push({cloud_drive:'baidu',download_url:'',extraction_code:''})">+ 添加下载地址</el-button>
          </div>
        </el-form-item>
        <el-form-item label="标签">
          <div class="tag-list">
            <el-tag v-for="(t, i) in form.tags" :key="i" closable @close="form.tags.splice(i,1)">{{ t }}</el-tag>
            <el-select v-model="tagInput" filterable allow-create default-first-option placeholder="添加标签" style="width:140px" @change="addTag" @clear="tagInput=''">
              <el-option v-for="tag in availableTags" :key="tag.id" :label="tag.name" :value="tag.name" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importDialogVisible" title="导入资源" width="600px">
      <div style="margin-bottom:12px">
        <el-radio-group v-model="importFormat">
          <el-radio value="json">JSON</el-radio>
          <el-radio value="csv">CSV</el-radio>
        </el-radio-group>
        <div style="margin-top:8px">
          <el-button size="small" @click="downloadSample(importFormat)">下载示例</el-button>
          <el-upload :auto-upload="false" :show-file-list="false" accept=".json,.csv" @change="handleImportFile">
            <el-button size="small">选择文件</el-button>
          </el-upload>
        </div>
      </div>
      <el-input v-model="importData" type="textarea" :rows="8" placeholder="粘贴导入数据..." />
      <div v-if="importResult" :style="{ color: importResult.success ? '#67c23a' : '#f56c6c', marginTop: '8px' }">{{ importResult.message }}</div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="doImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { resourceApi } from '@/api/resource'
import { categoryApi } from '@/api/category'
import { tagApi } from '@/api/tag'
import { adminApi } from '@/api/admin'
import request from '@/api/request'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const items = ref([])
const page = ref(1)
const limit = ref(20)
const total = ref(0)
const searchQuery = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const allCategories = ref([])
const selectedIds = ref([])

const dialogVisible = ref(false)
const editingResource = ref(null)
const saveLoading = ref(false)
const formRef = ref(null)

const tagInput = ref('')
const allTags = ref([])
const availableTags = ref([])

const importDialogVisible = ref(false)
const importFormat = ref('json')
const importData = ref('')
const importLoading = ref(false)
const importResult = ref(null)

const form = ref({ title: '', software_name: '', category_id: null, license: '', project_url: '', summary: '', content: '', status: 'pending', cloud_drives: [], tags: [] })
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  summary: [{ required: true, message: '请输入简介', trigger: 'blur' }],
}

function statusType(s) {
  return { approved: 'success', pending: 'warning', rejected: 'danger' }[s] || 'info'
}
function statusLabel(s) {
  return { approved: '已通过', pending: '待审核', rejected: '已拒绝' }[s] || s
}
function onSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

async function loadData() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (searchQuery.value) params.q = searchQuery.value
    if (statusFilter.value === 'pinned') params.status = 'approved'
    else if (statusFilter.value) params.status = statusFilter.value
    params.pinned = statusFilter.value === 'pinned' ? true : undefined
    if (categoryFilter.value) params.category_id = categoryFilter.value
    const data = await resourceApi.adminList(params)
    items.value = data.items || []
    total.value = data.total || 0
  } catch { ElMessage.error('加载资源失败'); items.value = [] } finally { loading.value = false }
}

function openDialog(row) {
  editingResource.value = row || null
  if (row) {
    form.value = { title: row.title||'', software_name: row.software_name||'', category_id: row.category_id||null, license: row.license||'', project_url: row.project_url||'', summary: row.summary||'', content: row.content||'', status: row.status||'pending', cloud_drives: row.cloud_drives||[], tags: row.tags||[] }
  } else {
    form.value = { title: '', software_name: '', category_id: null, license: '', project_url: '', summary: '', content: '', status: 'pending', cloud_drives: [], tags: [] }
  }
  availableTags.value = allTags.value.filter(t => !form.value.tags.includes(t.name))
  dialogVisible.value = true
}

function addTag(val) {
  if (val && !form.value.tags.includes(val)) { form.value.tags.push(val); availableTags.value = allTags.value.filter(t => !form.value.tags.includes(t.name)) }
  tagInput.value = ''
}

async function handleSave() {
  await formRef.value?.validate()
  saveLoading.value = true
  try {
    if (editingResource.value) {
      await resourceApi.update(editingResource.value.id, form.value)
      await saveTags(editingResource.value.id, form.value.tags)
    } else {
      const res =       await resourceApi.create(form.value)
      if (res?.id) await saveTags(res.id, form.value.tags)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch(e) { ElMessage.error('保存失败') } finally { saveLoading.value = false }
}

async function saveTags(resourceId, tagNames) {
  if (!tagNames?.length) return
  const ids = []
  for (const name of tagNames) {
    let tag = allTags.value.find(t => t.name === name)
    if (!tag) {
      try { tag = await tagApi.create({ name }) } catch { continue }
    }
    if (tag?.id) ids.push(tag.id)
  }
  if (ids.length) {
    try { await tagApi.saveResourceTags(resourceId, { tag_ids: ids }) } catch { ElMessage.error('标签保存失败') }
  }
}

async function togglePin(row) {
  await ElMessageBox.confirm(`确定要${row.pinned ? '取消' : ''}置顶此资源吗？`, '提示', { type: 'warning' })
  try {
    await resourceApi.pin(row.id, !row.pinned)
    row.pinned = !row.pinned
  } catch(e) { ElMessage.error('操作失败') }
}

async function handleCommand(cmd, row) {
  try {
    if (cmd === 'delete') {
      await ElMessageBox.confirm('确定要删除该资源吗？', '提示', { type: 'warning' })
      await resourceApi.delete(row.id)
      ElMessage.success('删除成功')
      loadData()
    } else if (cmd === 'approve') {
      await resourceApi.updateStatus(row.id, 'approved')
      row.status = 'approved'
    } else if (cmd === 'reject') {
      await resourceApi.updateStatus(row.id, 'rejected')
      row.status = 'rejected'
    }
  } catch { ElMessage.error('操作失败') }
}

async function batchDelete() {
  if (!selectedIds.value.length) return
  await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 个资源吗？`, '提示', { type: 'warning' })
  try {
    for (const id of selectedIds.value) await resourceApi.delete(id)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    loadData()
  } catch { ElMessage.error('批量删除失败') }
}

async function autoFillFromUrl() {
  const url = form.value.project_url?.trim()
  if (!url) { ElMessage.warning('请先输入项目官网地址'); return }
  try {
    const parsed = new URL(url)
    let title = '', software = '', category = '', license = '', summary = ''

    if (parsed.hostname.includes('github.com')) {
      const parts = parsed.pathname.split('/').filter(p => p)
      if (parts.length >= 2) {
        software = parts[1]; title = software.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const apiRes = await fetch(`https://api.github.com/repos/${parts[0]}/${parts[1]}`)
        if (apiRes.ok) {
          const data = await apiRes.json()
          summary = data.description || ''; license = data.license?.name || ''
          if (data.language) { const ml = {JavaScript:'前端开发',TypeScript:'前端开发',Python:'后端开发',Java:'后端开发',Go:'后端开发',Rust:'系统编程','C++':'系统编程',PHP:'后端开发',Ruby:'后端开发'}; category = ml[data.language] || '开发工具' }
        }
      }
    } else if (parsed.hostname.includes('gitee.com')) {
      const parts = parsed.pathname.split('/').filter(p => p)
      if (parts.length >= 2) { software = parts[1]; title = software.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
    } else if (parsed.hostname.includes('npmjs.com')) {
      const pkg = parsed.pathname.split('/').filter(p => p)[0] || ''
      if (pkg) { software = pkg; title = pkg; category = '前端开发' }
    } else if (parsed.hostname.includes('pypi.org')) {
      const pkg = parsed.pathname.split('/').filter(p => p)[1] || ''
      if (pkg) { software = pkg; title = pkg; category = '后端开发' }
    } else {
      software = parsed.hostname.replace('www.','').split('.')[0]; title = software
    }

    if (title && !form.value.title) form.value.title = title
    if (software && !form.value.software_name) form.value.software_name = software
    if (license && !form.value.license) form.value.license = license
    if (summary && !form.value.summary) form.value.summary = summary
    if (category) {
      const match = allCategories.value.find(c => c.name.includes(category))
      if (match) form.value.category_id = match.id
    }
    ElMessage.success('自动填写完成')
  } catch { ElMessage.error('自动填写失败') }
}

async function uploadImage() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return
    previewUrl.value = URL.createObjectURL(file)
    const fd = new FormData(); fd.append('images', file)
    try {
      const res = await adminApi.upload(fd)
      if (res?.files?.length) {
        form.value.content += (form.value.content ? '\n' : '') + `<img src="${res.files[0].url}" style="max-width:100%">`
        URL.revokeObjectURL(previewUrl.value)
        previewUrl.value = ''
        ElMessage.success('图片已插入')
      }
    } catch { ElMessage.error('上传失败'); URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
  }
  input.click()
}

function openImportDialog() { importDialogVisible.value = true; importData.value = ''; importResult.value = null }
function downloadSample(format) {
  const sample = format === 'json'
    ? JSON.stringify([{title:'示例资源',software_name:'VS Code',category:'开发工具',license:'MIT',project_url:'https://code.visualstudio.com/',summary:'简介',content:'说明'}], null, 2)
    : 'title,software_name,category,license,project_url,summary\n"VS Code","VS Code","开发工具","MIT","https://code.visualstudio.com/","简介"'
  const blob = new Blob([sample], { type: format === 'json' ? 'application/json' : 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `sample.${format}`; a.click()
}
function handleImportFile(uploadFile) {
  const reader = new FileReader()
  reader.onload = (e) => { importData.value = e.target.result }
  reader.readAsText(uploadFile.raw)
}
async function doImport() {
  if (!importData.value.trim()) { ElMessage.warning('请提供导入数据'); return }
  importLoading.value = true; importResult.value = null
  try {
    let endpoint, body
    if (importFormat.value === 'csv') { endpoint = '/api/admin/import/csv'; body = { csvData: importData.value } }
    else { endpoint = '/api/admin/import/json'; body = { jsonData: JSON.parse(importData.value) } }
    const res = await request.post(endpoint, body).then(r => r.data)
    importResult.value = { success: true, message: `导入成功` }
    ElMessage.success('导入成功'); importDialogVisible.value = false; loadData()
  } catch (e) { importResult.value = { success: false, message: `导入失败: ${e.message}` } }
  finally { importLoading.value = false }
}

onMounted(async () => {
  allCategories.value = await categoryApi.adminList().catch(() => [])
  allTags.value = await tagApi.list().catch(() => [])
  loadData()
})
</script>

<style lang="scss" scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.header-left {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
.total-info {
  font-size: 13px;
  color: var(--text-color-secondary);
}
.drive-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.drive-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
</style>
