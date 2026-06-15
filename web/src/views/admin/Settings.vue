<template>
  <div class="admin-settings">
    <el-card>
      <template #header><h3>系统设置</h3></template>
      <el-form label-width="120px" v-if="form">
        <el-form-item label="网站名称">
          <el-input v-model="form.site_name" placeholder="网站名称" />
        </el-form-item>
        <el-form-item label="网站描述">
          <el-input v-model="form.site_description" type="textarea" :rows="3" placeholder="网站描述" />
        </el-form-item>
        <el-form-item label="网站地址">
          <el-input v-model="form.site_url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="Logo 文字">
          <el-input v-model="form.logo_text" placeholder="导航栏显示的站点名称" />
        </el-form-item>
        <el-form-item label="页脚文字">
          <el-input v-model="form.footer_text" placeholder="底部版权描述" />
        </el-form-item>
        <el-form-item label="允许注册">
          <el-switch v-model="form.allow_register" :active-value="'true'" :inactive-value="'false'" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { settingsApi } from '@/api/settings'
import { ElMessage } from 'element-plus'

const form = ref(null)
const saving = ref(false)

async function load() {
  try { form.value = await settingsApi.adminGet() }
  catch { ElMessage.error('加载设置失败') }
}

async function save() {
  saving.value = true
  try {
    await settingsApi.update(form.value)
    ElMessage.success('保存成功')
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
.admin-settings { max-width: 640px; }
</style>
