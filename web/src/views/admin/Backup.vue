<template>
  <div class="admin-backup">
    <el-card>
      <template #header><h3>数据备份</h3></template>
      <p style="margin-bottom:20px;color:var(--text-color-secondary)">点击下方按钮导出数据库中的所有数据为 JSON 文件。</p>
      <el-button type="primary" :loading="loading" @click="doBackup">
        <el-icon><Download /></el-icon> 导出全部数据
      </el-button>
      <div v-if="result" class="backup-result" :class="result.success ? 'success' : 'error'">
        {{ result.message }}
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { adminApi } from '@/api/admin'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'

const loading = ref(false)
const result = ref(null)

async function doBackup() {
  loading.value = true
  result.value = null
  try {
    const data = await adminApi.backup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    result.value = { success: true, message: '备份下载成功' }
  } catch {
    result.value = { success: false, message: '备份失败' }
  } finally { loading.value = false }
}
</script>

<style lang="scss" scoped>
.backup-result {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  &.success { background: #f0f9eb; color: #67c23a; }
  &.error { background: #fef0f0; color: #f56c6c; }
}
</style>
