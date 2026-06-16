<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div v-if="friendLinks.length" class="friend-links">
        <span class="fl-label">友情链接：</span>
        <a v-for="link in friendLinks" :key="link.id" :href="link.url" target="_blank" rel="noopener noreferrer" class="fl-item">{{ link.name }}</a>
      </div>
      <p class="footer-copy">&copy; {{ new Date().getFullYear() }} {{ appStore.settings.footer_text || '分享优质开源软件资源' }}</p>
    </div>
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { friendLinkApi } from '@/api/friendLink'

const appStore = useAppStore()
const friendLinks = ref([])

onMounted(async () => {
  try { friendLinks.value = await friendLinkApi.list() } catch {}
})
</script>

<style scoped>
.site-footer { background: var(--nav-bg, rgba(255,255,255,0.95)); border-top: 1px solid var(--border, #e8eaf0); padding: 28px 0; margin-top: auto; }
.footer-inner { max-width: 1200px; margin: 0 auto; padding: 0 16px; text-align: center; }
.friend-links { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; font-size: 13px; }
.fl-label { color: var(--muted, #999); }
.fl-item { color: var(--primary, #667eea); text-decoration: none; }
.fl-item:hover { text-decoration: underline; }
.footer-copy { color: var(--muted, #999); font-size: 13px; margin: 0; }
</style>
