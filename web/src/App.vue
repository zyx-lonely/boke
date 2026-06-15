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
