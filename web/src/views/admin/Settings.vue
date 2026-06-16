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
      </el-form>
    </el-card>

    <el-card style="margin-top:20px">
      <template #header><h3>SMTP 邮件配置</h3></template>
      <el-form label-width="120px" v-if="form">
        <el-form-item label="SMTP 主机">
          <el-input v-model="form.smtp_host" placeholder="smtp.example.com" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input v-model="form.smtp_port" placeholder="587" />
        </el-form-item>
        <el-form-item label="加密方式">
          <el-switch v-model="form.smtp_secure" :active-value="'true'" :inactive-value="'false'"
            active-text="SSL (465)" inactive-text="TLS (587)" />
        </el-form-item>
        <el-form-item label="发件邮箱">
          <el-input v-model="form.smtp_user" placeholder="noreply@example.com" />
        </el-form-item>
        <el-form-item label="邮箱密码">
          <el-input v-model="form.smtp_pass" type="password" placeholder="SMTP 授权码或密码" show-password />
        </el-form-item>
        <el-form-item label="发件人名称">
          <el-input v-model="form.smtp_from" placeholder="留空则使用发件邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="testing" @click="testEmail">测试邮件</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card style="margin-top:20px">
      <template #header><h3>保存设置</h3></template>
      <el-button type="primary" :loading="saving" @click="save" size="large">保存全部设置</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { settingsApi } from '@/api/settings'
import { ElMessage, ElMessageBox } from 'element-plus'

const form = ref(null)
const saving = ref(false)
const testing = ref(false)

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

async function testEmail() {
  const email = (await ElMessageBox.prompt('输入接收测试邮件的地址', '测试邮件', {
    inputPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    inputErrorMessage: '请输入有效的邮箱'
  })).value
  testing.value = true
  try {
    await settingsApi.testEmail(email, form.value)
    ElMessage.success('测试邮件已发送，请查收')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发送失败')
  } finally { testing.value = false }
}

onMounted(load)
</script>

<style scoped>
.admin-settings { max-width: 640px; }
</style>
