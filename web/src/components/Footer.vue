<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <p class="footer-copy">&copy; {{ new Date().getFullYear() }} {{ appStore.settings.footer_text || '分享优质开源软件资源' }}</p>
    </div>
  </footer>
</template>

<script setup>
import { useAppStore } from '@/stores/app'
const appStore = useAppStore()
</script>

<style lang="scss" scoped>
.site-footer {
  background: var(--bg-color-overlay);
  border-top: 1px solid var(--border-color-light);
  padding: 28px 0;
  margin-top: auto;
}
.footer-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 32px;
  text-align: center;
}
.footer-copy {
  color: var(--text-color-secondary);
  font-size: 13px;
}
</style>
