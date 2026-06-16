<template>
  <div id="app" :class="{ 'dark-mode': appStore.isDark }">
    <template v-if="!isAdminRoute">
      <AppNavbar />
      <router-view />
      <AppFooter />
    </template>
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import AppNavbar from '@/components/Navbar.vue'
import AppFooter from '@/components/Footer.vue'

const route = useRoute()
const appStore = useAppStore()
const userStore = useUserStore()

const isAdminRoute = computed(() => route.path.startsWith('/admin'))

appStore.initTheme()
appStore.loadSettings()
userStore.checkAuth()

watch(() => appStore.settings.site_name, (val) => { if (val) document.title = val }, { immediate: true })
</script>

<style>
:root {
  --bg: #f5f7fa;
  --card-bg: #ffffff;
  --text: #1a1a2e;
  --text-secondary: #555555;
  --muted: #999999;
  --border: #e0e0e0;
  --primary: #667eea;
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --nav-bg: rgba(255,255,255,0.95);
  --card-shadow: 0 4px 20px rgba(0,0,0,0.06);
}
.dark-mode {
  --bg: #1a1a2e;
  --card-bg: #16213e;
  --text: #e0e0e0;
  --text-secondary: #9ca3af;
  --muted: #6b7280;
  --border: #2d3a5f;
  --nav-bg: rgba(22,33,62,0.95);
  --card-shadow: 0 4px 20px rgba(0,0,0,0.2);
}
body { margin: 0; background: var(--bg); color: var(--text); }
* { box-sizing: border-box; }
a { color: var(--primary); }
</style>
