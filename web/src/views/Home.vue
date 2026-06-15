<template>
  <div class="home-page" :class="{ 'dark-mode': appStore.isDark }">
    <div class="bg-gradient"></div>
    <div class="bg-particles">
      <div v-for="i in 6" :key="i" class="bg-particle" :style="{ transform: `translate(${heroMouseX * i * 8}px, ${heroMouseY * i * 8}px)` }"></div>
    </div>

    <section class="hero" @mousemove="heroMouseMove">
      <div class="container">
        <div class="hero-content">
          <div class="hero-badge">✨ 优质开源资源分享平台</div>
          <h1><span id="typewriter">{{ displayText }}</span><span class="cursor">|</span></h1>
          <p>汇聚全球优秀开源资源，助力开发者成长，让技术创新更简单</p>
          <div class="hero-stats">
            <div class="stat-item"><span class="stat-value">{{ resourceTotal }}+</span><span class="stat-label">精选资源</span></div>
          </div>
        </div>
      </div>
      <div class="hero-decoration"></div>
    </section>

    <!-- Carousel -->
    <div class="container carousel-container" v-if="carouselItems.length">
      <div class="carousel">
        <div class="carousel-inner" :style="{ transform: `translateX(-${carouselIndex * 100}%)` }">
          <div v-for="(item, i) in carouselItems" :key="i" class="carousel-slide" @click="$router.push(`/detail/${item.id}`)">
            <div class="carousel-content">
              <div class="carousel-badge">{{ item.category_name || '推荐' }}</div>
              <h3>{{ item.title }}</h3>
              <p>{{ (item.summary||'').slice(0, 80) }}{{ (item.summary||'').length > 80 ? '...' : '' }}</p>
              <div class="carousel-meta">
                <span>👁️ {{ item.hits||0 }}</span>
                <span>⭐ {{ item.favorites_count||0 }}</span>
              </div>
            </div>
          </div>
        </div>
        <button class="carousel-btn prev" @click="carouselPrev">‹</button>
        <button class="carousel-btn next" @click="carouselNext">›</button>
        <div class="carousel-dots">
          <span v-for="(_, i) in carouselItems" :key="i" :class="{active: i===carouselIndex}" @click="carouselIndex=i"></span>
        </div>
      </div>
    </div>

    <main class="container main-container">
      <div class="search-bar hero-search">
        <div class="search-icon">🔍</div>
        <input v-model="searchQuery" placeholder="搜索资源名称、描述或分类..." @keyup.enter="doSearch" />
        <button @click="doSearch">搜索</button>
      </div>

      <div class="main-content">
        <div ref="resourcesListRef" class="resources-list">
          <div v-if="loading" class="skeleton-list">
            <div v-for="n in 5" :key="n" class="skeleton-card">
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-line w-30"></div>
              <div class="skeleton-line w-80"></div>
            </div>
          </div>
          <template v-else>
            <div v-if="resources.length === 0" class="empty-state">暂无资源</div>
            <div v-for="r in resources" :key="r.id" class="resource-card fade-in-up" @click="$router.push(`/detail/${r.id}`)">
              <div class="heat-bar-container"><div class="heat-bar-fill" :style="{ width: Math.min(((r.hits||0)+(r.favorites_count||0)*5)/100*100, 100) + '%' }"></div></div>
              <div class="card-header">
                <div class="title">
                  <span v-if="r.pinned" class="badge pinned" style="margin-right:8px">置顶</span>
                  <span v-if="isNew(r)" class="badge new-badge">NEW</span>
                  <router-link :to="`/detail/${r.id}`" @click.stop>{{ r.title }}</router-link>
                </div>
                <span class="heat-indicator" :class="r.hits>=50?'hot':r.hits>=20?'warm':'normal'">{{ r.hits>=50?'🔥':r.hits>=20?'⚡':'📊' }} {{ r.hits||0 }}</span>
              </div>
              <div class="meta">
                <span>{{ r.software_name || '未知软件' }}</span>
                <span>{{ r.category_name || '未分类' }}</span>
                <span class="views">👁️ {{ r.hits||0 }}</span>
              </div>
              <div class="summary">{{ r.summary || '暂无描述' }}</div>
              <div class="tags"><span v-for="t in (r.tags||[]).slice(0,3)" :key="t" class="tag">{{ t }}</span></div>
            </div>
          </template>
          <div class="pagination" v-if="totalPages > 1">
            <button v-if="page > 1" @click="goPage(page-1)">上一页</button>
            <template v-for="p in totalPages" :key="p">
              <button v-if="p===1||p===totalPages||(p>=page-2&&p<=page+2)" :class="{active:p===page}" @click="goPage(p)">{{ p }}</button>
              <button v-else-if="p===page-3||p===page+3" disabled>...</button>
            </template>
            <button v-if="page < totalPages" @click="goPage(page+1)">下一页</button>
          </div>
        </div>

        <aside class="sidebar">
          <div class="sidebar-section">
            <h3>🔥 热门资源</h3>
            <ul>
              <li v-for="r in hotResources" :key="r.id"><router-link :to="`/detail/${r.id}`">{{ r.title }}</router-link></li>
            </ul>
          </div>
          <div class="sidebar-section">
            <h3>✨ 最新更新</h3>
            <ul>
              <li v-for="r in recentResources" :key="r.id"><router-link :to="`/detail/${r.id}`">{{ r.title }}</router-link></li>
            </ul>
          </div>
          <div class="sidebar-section">
            <h3>📁 分类 <span v-if="userStore.isLoggedIn" class="sub-hint">（点击名称筛选，点击+关注）</span></h3>
            <div class="category-tags">
              <span v-for="cat in categories" :key="cat.id" class="tag" :class="{active:selectedCategory===cat.name}" @click="filterByCategory(cat.name)">{{ cat.icon||'📁' }} {{ cat.name }}<button v-if="userStore.isLoggedIn" class="sub-btn" :class="{subscribed:subscribedIds.has(cat.id)}" @click.stop="toggleSubscription(cat.id)" :title="subscribedIds.has(cat.id)?'取消关注':'关注分类'">{{ subscribedIds.has(cat.id) ? '✓' : '+' }}</button></span>
            </div>
          </div>
          <div class="sidebar-section">
            <h3>🏷️ 标签</h3>
            <div class="tag-cloud">
              <span class="tag active" @click="filterByTag('')">全部</span>
              <span v-for="tag in tags.filter(t=>t.resource_count>0)" :key="tag.id" class="tag" :class="{active:currentTag===tag.name}" @click="filterByTag(tag.name)">{{ tag.name }} <small>({{ tag.resource_count }})</small></span>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <transition name="fade">
      <button v-if="showBackTop" class="back-top" @click="scrollToTop">⬆</button>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { resourceApi } from '@/api/resource'
import { categoryApi } from '@/api/category'
import { tagApi } from '@/api/tag'
import { subscriptionApi } from '@/api/subscription'
import { ElMessage } from 'element-plus'

const appStore = useAppStore()
const userStore = useUserStore()
const loading = ref(true)
const resources = ref([])
const page = ref(1)
const limit = ref(10)
const total = ref(0)
const totalPages = ref(0)
const searchQuery = ref('')
const selectedCategory = ref('')
const currentTag = ref('')
const resourceTotal = ref(0)
const hotResources = ref([])
const recentResources = ref([])
const categories = ref([])
const tags = ref([])
const carouselItems = ref([])
const carouselIndex = ref(0)
let carouselTimer = null
const subscribedIds = ref(new Set())
const showBackTop = ref(false)
const resourcesListRef = ref(null)
let scrollTimer = null
let observer = null
const heroMouseX = ref(0)
const heroMouseY = ref(0)

async function loadSubscriptions() {
  try { const subs = await subscriptionApi.list(); subscribedIds.value = new Set(subs.map(s => s.category_id)) } catch {}
}
async function toggleSubscription(catId) {
  try {
    const res = await subscriptionApi.toggle(catId)
    if (res.subscribed) { subscribedIds.value.add(catId); subscribedIds.value = new Set(subscribedIds.value); ElMessage.success('已关注此分类') }
    else { subscribedIds.value.delete(catId); subscribedIds.value = new Set(subscribedIds.value); ElMessage.success('已取消关注') }
  } catch(e) { ElMessage.error(e?.response?.data?.message || '操作失败') }
}

function isNew(r) {
  if (!r.created_at) return false
  return Date.now() - new Date(r.created_at).getTime() < 48 * 60 * 60 * 1000
}

function heroMouseMove(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  heroMouseX.value = (e.clientX - rect.left) / rect.width - 0.5
  heroMouseY.value = (e.clientY - rect.top) / rect.height - 0.5
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

function handleScroll() {
  showBackTop.value = window.scrollY > 400
}

function setupScrollAnimation() {
  nextTick(() => {
    if (observer) observer.disconnect()
    const cards = resourcesListRef.value?.querySelectorAll('.resource-card')
    if (!cards?.length) return
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target) }
      })
    }, { threshold: 0.1 })
    cards.forEach(c => observer.observe(c))
  })
}

const typewriterTexts = ['发现优秀的开源软件', '探索无限可能', '释放你的创造力', '构建美好未来']
const displayText = ref('')
let twIndex = 0, charIndex = 0, isDeleting = false, twTimer = null

function typewriter() {
  const current = typewriterTexts[twIndex]
  displayText.value = isDeleting ? current.substring(0, charIndex - 1) : current.substring(0, charIndex + 1)
  charIndex += isDeleting ? -1 : 1
  let speed = isDeleting ? 50 : 100
  if (!isDeleting && charIndex === current.length) { speed = 2000; isDeleting = true }
  else if (isDeleting && charIndex === 0) { isDeleting = false; twIndex = (twIndex + 1) % typewriterTexts.length; speed = 500 }
  twTimer = setTimeout(typewriter, speed)
}
function carouselNext() { if(carouselItems.value.length) carouselIndex.value = (carouselIndex.value + 1) % carouselItems.value.length }
function carouselPrev() { if(carouselItems.value.length) carouselIndex.value = (carouselIndex.value - 1 + carouselItems.value.length) % carouselItems.value.length }
function startCarousel() { carouselTimer = setInterval(carouselNext, 5000) }

async function loadResources() {
  loading.value = true
  try {
    const params = { page: page.value, limit: limit.value }
    if (searchQuery.value) params.q = searchQuery.value
    if (selectedCategory.value) params.category = selectedCategory.value
    if (currentTag.value) params.tag = currentTag.value
    const data = await resourceApi.list(params)
    resources.value = data.items || []
    total.value = data.total || 0
    totalPages.value = data.totalPages || 0
  } catch { ElMessage.error('加载资源失败'); resources.value = [] } finally { loading.value = false; nextTick(setupScrollAnimation) }
}

function doSearch() { page.value = 1; selectedCategory.value = ''; currentTag.value = ''; loadResources() }
function goPage(p) { page.value = p; loadResources(); window.scrollTo({ top: 0, behavior: 'smooth' }) }
function filterByCategory(cat) { selectedCategory.value = selectedCategory.value === cat ? '' : cat; currentTag.value = ''; searchQuery.value = ''; page.value = 1; loadResources() }
function filterByTag(tag) { currentTag.value = currentTag.value === tag ? '' : tag; selectedCategory.value = ''; searchQuery.value = ''; page.value = 1; loadResources() }

onMounted(async () => {
  typewriter()
  const [hot, recent, cats, tagData, carousel] = await Promise.all([
    resourceApi.hot(5).catch(() => []),
    resourceApi.recent(5).catch(() => []),
    categoryApi.list().catch(() => []),
    tagApi.list().catch(() => []),
    resourceApi.recommend(6).catch(() => []),
  ])
  hotResources.value = hot; recentResources.value = recent; categories.value = cats; tags.value = tagData
  carouselItems.value = Array.isArray(carousel) ? carousel : (carousel.items||[]); if(carouselItems.value.length) startCarousel()
  const allData = await resourceApi.list({ page: 1, limit: 1 }).catch(() => ({ total: 0 }))
  resourceTotal.value = allData.total
  loadResources()
  if (localStorage.getItem('userToken')) loadSubscriptions()
  window.addEventListener('scroll', handleScroll, { passive: true })
})
onUnmounted(() => {
  if (twTimer) clearTimeout(twTimer)
  if (carouselTimer) clearInterval(carouselTimer)
  if (observer) observer.disconnect()
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.home-page { min-height: 100vh; }
.bg-gradient { position: fixed; top: 0; left: 0; right: 0; height: 300px; background: linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.1) 50%, rgba(240,147,251,0.08) 100%); z-index: -1; }
.dark-mode .bg-gradient { background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.05) 50%, rgba(240,147,251,0.03) 100%); }
.bg-particles { position: fixed; inset: 0; z-index: -2; overflow: hidden; }
.bg-particle { position: absolute; width: 6px; height: 6px; background: rgba(102,126,234,0.3); border-radius: 50%; animation: floatP 15s infinite ease-in-out; }
.bg-particle:nth-child(1) { left: 10%; top: 20%; }
.bg-particle:nth-child(2) { left: 20%; top: 60%; animation-delay: 2s; width: 8px; height: 8px; }
.bg-particle:nth-child(3) { left: 30%; top: 40%; animation-delay: 4s; }
.bg-particle:nth-child(4) { left: 50%; top: 80%; animation-delay: 1s; width: 10px; height: 10px; }
.bg-particle:nth-child(5) { left: 70%; top: 30%; animation-delay: 3s; }
.bg-particle:nth-child(6) { left: 85%; top: 70%; animation-delay: 5s; width: 7px; height: 7px; }
@keyframes floatP { 0%,100% { transform: translateY(0) scale(1); opacity: 0.3; } 50% { transform: translateY(-30px) scale(1.2); opacity: 0.6; } }
.dark-mode .bg-particle { background: rgba(102,126,234,0.15); }

/* Hero */
.hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); color: white; padding: 60px 0 80px; position: relative; overflow: hidden; }
.hero-decoration { position: absolute; top: -50%; right: -20%; width: 800px; height: 800px; background: rgba(255,255,255,0.08); border-radius: 50%; filter: blur(40px); }
.hero-content { position: relative; z-index: 1; }
.hero-badge { display: inline-block; padding: 8px 20px; background: rgba(255,255,255,0.2); border-radius: 20px; font-size: 13px; margin-bottom: 20px; backdrop-filter: blur(10px); }
.hero h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 16px; line-height: 1.3; }
.cursor { animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0; } }
.hero p { font-size: 1.1rem; color: rgba(255,255,255,0.9); margin-bottom: 32px; max-width: 600px; }
.hero-stats { display: flex; gap: 48px; }
.stat-item { text-align: center; }
.stat-value { display: block; font-size: 2rem; font-weight: 700; }
.stat-label { font-size: 14px; color: rgba(255,255,255,0.8); }

/* Carousel */
.carousel-container { margin-top: -20px; position: relative; z-index: 10; margin-bottom: 20px; }
.carousel { position: relative; border-radius: 16px; overflow: hidden; background: white; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
.dark-mode .carousel { background: #16213e; }
.carousel-inner { display: flex; transition: transform 0.5s ease; }
.carousel-slide { min-width: 100%; padding: 28px 36px; cursor: pointer; }
.carousel-content { max-width: 600px; }
.carousel-badge { display: inline-block; padding: 4px 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 8px; font-size: 12px; margin-bottom: 12px; }
.carousel-content h3 { font-size: 1.4rem; font-weight: 600; margin-bottom: 8px; color: #1a1a2e; }
.dark-mode .carousel-content h3 { color: #e0e0e0; }
.carousel-content p { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
.dark-mode .carousel-content p { color: #9ca3af; }
.carousel-meta { display: flex; gap: 20px; color: #999; font-size: 13px; }
.carousel-btn { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.9); border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #333; transition: all 0.2s; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 2; }
.carousel-btn:hover { background: white; transform: translateY(-50%) scale(1.1); }
.carousel-btn.prev { left: 12px; }
.carousel-btn.next { right: 12px; }
.carousel-dots { display: flex; justify-content: center; gap: 6px; padding: 0 0 16px; }
.carousel-dots span { width: 8px; height: 8px; border-radius: 50%; background: #ddd; cursor: pointer; transition: all 0.2s; }
.carousel-dots span.active { background: #667eea; width: 24px; border-radius: 4px; }

/* Main */
.main-container { position: relative; z-index: 10; }
.search-bar { display: flex; gap: 12px; padding: 16px; background: white; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); align-items: center; }
.dark-mode .search-bar { background: #16213e; box-shadow: 0 8px 30px rgba(0,0,0,0.3); }
.search-icon { font-size: 18px; color: #999; }
.hero-search input { flex: 1; padding: 14px 16px; border: none; border-radius: 12px; font-size: 14px; background: #f5f7fa; }
.dark-mode .hero-search input { background: #0f3460; color: #e0e0e0; }
.hero-search input:focus { outline: none; background: #f0f2f5; }
.hero-search button { padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 15px rgba(102,126,234,0.4); }
.hero-search button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102,126,234,0.5); }

.main-content { display: grid; grid-template-columns: 1fr 280px; gap: 24px; margin: 24px 0; }
.resources-list { display: flex; flex-direction: column; gap: 16px; }
.empty-state { text-align: center; padding: 40px; color: #999; }
.loading { display: flex; justify-content: center; padding: 40px; color: #999; font-size: 14px; }

.resource-card { background: white; border-radius: 20px; padding: 24px; padding-top: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); transition: all 0.35s cubic-bezier(0.4,0,0.2,1); border: 1px solid transparent; position: relative; overflow: hidden; cursor: pointer; }
.resource-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2, #f093fb); opacity: 0; transition: opacity 0.3s; }
.resource-card:hover::before { opacity: 1; }
.resource-card:hover { transform: translateY(-6px); box-shadow: 0 12px 40px rgba(102,126,234,0.18); border-color: rgba(102,126,234,0.15); }
.dark-mode .resource-card { background: #16213e; border-color: #2d3a5f; }
.dark-mode .resource-card:hover { border-color: #4a6cf7; }
.dark-mode .resource-card .title { color: #e0e0e0; }
.dark-mode .resource-card .summary { color: #9ca3af; }
.dark-mode .resource-card .meta span { background: #2d3a5f; color: #9ca3af; }
.heat-bar-container { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: #f0f2f5; border-radius: 20px 20px 0 0; overflow: hidden; }
.heat-bar-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2, #f093fb); border-radius: 20px 20px 0 0; transition: width 0.5s; }
.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.title { font-size: 1.3rem; font-weight: 600; color: #1a1a2e; line-height: 1.4; flex: 1; }
.title a { color: inherit; text-decoration: none; }
.title a:hover { color: #667eea; }
.heat-indicator { display: flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(255,87,87,0.1); border-radius: 12px; font-size: 12px; color: #ff5757; font-weight: 600; white-space: nowrap; }
.heat-indicator.hot { background: rgba(255,87,87,0.2); color: #ff3838; }
.heat-indicator.warm { background: rgba(255,150,87,0.2); color: #ff9638; }
.heat-indicator.normal { background: rgba(102,126,234,0.1); color: #667eea; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; font-size: 12px; }
.meta span { padding: 4px 10px; background: #f0f4ff; color: #4a6cf7; border-radius: 12px; font-weight: 500; }
.meta .views { background: #fff3e6; color: #ff9500; }
.summary { color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { padding: 6px 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
.tag:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
.tag.active { box-shadow: 0 2px 10px rgba(102,126,234,0.4); }
.badge { padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; }
.badge.pinned { background: linear-gradient(135deg, #fff3cd, #ffeeba); color: #856404; }

.sidebar { background: white; border-radius: 20px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; align-self: start; }
.dark-mode .sidebar { background: #16213e; border-color: #2d3a5f; }
.sidebar-section { margin-bottom: 28px; }
.sidebar-section:last-child { margin-bottom: 0; }
.sidebar h3 { margin-bottom: 18px; color: #1a1a2e; font-size: 1.15rem; font-weight: 600; padding-bottom: 12px; border-bottom: 2px solid #f0f2f5; }
.dark-mode .sidebar h3 { color: #e0e0e0; border-bottom-color: #2d3a5f; }
.sidebar ul { list-style: none; }
.sidebar li a { color: #555; font-size: 14px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 10px 12px; border-radius: 10px; transition: all 0.25s; }
.sidebar li a:hover { color: #667eea; background: rgba(102,126,234,0.1); transform: translateX(4px); }
.dark-mode .sidebar li a { color: #9ca3af; }
.dark-mode .sidebar li a:hover { color: #e0e0e0; background: rgba(102,126,234,0.2); }
.sidebar .tag { display: inline-flex; align-items: center; gap: 4px; padding: 8px 16px; background: linear-gradient(135deg, #f0f4ff, #f5f0ff); border-radius: 25px; margin: 4px; font-size: 13px; color: #555; font-weight: 500; transition: all 0.25s; }
.sidebar .tag:hover { background: linear-gradient(135deg, #667eea, #764ba2); color: white; transform: translateY(-2px); box-shadow: 0 4px 15px rgba(102,126,234,0.4); }
.category-tags, .tag-cloud { display: flex; flex-wrap: wrap; gap: 6px; }
.sub-hint { font-size: 11px; font-weight: 400; color: #999; }
.sub-btn { background: none; border: 1px solid #667eea; border-radius: 10px; color: #667eea; font-size: 12px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin-left: 4px; padding: 0; line-height: 1; transition: all 0.2s; }
.sub-btn:hover { background: #667eea; color: white; }
.sub-btn.subscribed { background: #667eea; color: white; border-color: #667eea; }

.pagination { display: flex; justify-content: center; gap: 8px; margin: 32px 0; }
.pagination button { padding: 10px 16px; border: 1px solid #e0e0e0; background: white; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
.pagination button:hover:not(:disabled) { border-color: #667eea; color: #667eea; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination .active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-color: #667eea; }



/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 16px; }
.skeleton-card { background: white; border-radius: 20px; padding: 28px 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.dark-mode .skeleton-card { background: #16213e; }
.skeleton-line { height: 16px; background: linear-gradient(90deg, #eee 25%, #f5f5f5 50%, #eee 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px; margin-bottom: 12px; }
.dark-mode .skeleton-line { background: linear-gradient(90deg, #2d3a5f 25%, #3a4a75 50%, #2d3a5f 75%); background-size: 200% 100%; }
.skeleton-line:last-child { margin-bottom: 0; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.w-30 { width: 30%; }
.skeleton-line.w-80 { width: 80%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Scroll animation */
.fade-in-up { opacity: 0; transform: translateY(30px); transition: opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1); }
.fade-in-up.visible { opacity: 1; transform: translateY(0); }
.fade-in-up:nth-child(2) { transition-delay: 0.1s; }
.fade-in-up:nth-child(3) { transition-delay: 0.2s; }
.fade-in-up:nth-child(4) { transition-delay: 0.3s; }
.fade-in-up:nth-child(5) { transition-delay: 0.4s; }
.fade-in-up:nth-child(6) { transition-delay: 0.5s; }

/* New badge */
.new-badge { background: linear-gradient(135deg, #ff6b6b, #ee5a24); color: white; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; margin-right: 6px; vertical-align: middle; animation: pulseNew 2s infinite; }
@keyframes pulseNew { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }

/* Back to top */
.back-top { position: fixed; bottom: 40px; right: 40px; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; font-size: 20px; cursor: pointer; z-index: 999; box-shadow: 0 4px 16px rgba(102,126,234,0.4); transition: all 0.3s; }
.back-top:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(102,126,234,0.5); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Particle parallax on mouse move */
.bg-particle { transition: transform 0.3s ease-out; }

@media (max-width: 768px) {
  .main-content { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.8rem; }
  .hero-stats { gap: 24px; }
  .back-top { bottom: 20px; right: 20px; width: 40px; height: 40px; font-size: 16px; }
}
</style>
