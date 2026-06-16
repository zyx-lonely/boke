<template>
  <div class="detail-page" :class="{ 'dark-mode': appStore.isDark }">
    <div v-if="loading" class="container" style="padding-top:80px"><div class="loading">加载中...</div></div>
    <template v-else-if="resource">
      <div class="container detail-container">
        <button class="back-btn" @click="$router.back()">← 返回</button>
        <div class="detail-header">
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <span v-if="resource.pinned" class="badge pinned">置顶</span>
            <span class="badge category">{{ resource.category_name || '未分类' }}</span>
          </div>
          <h1>{{ resource.title }}</h1>
          <div class="meta">
            <span v-if="resource.software_name">📦 {{ resource.software_name }}</span>
            <span v-if="resource.license">📄 {{ resource.license }}</span>
            <span>👁️ {{ resource.hits || 0 }} 浏览</span>
            <span>⭐ {{ favoriteCount }} 收藏</span>
          </div>
          <div class="tags" v-if="resource.tags?.length">
            <span v-for="t in resource.tags" :key="t" class="tag">{{ t }}</span>
          </div>
        </div>

        <div class="detail-body">
          <div class="detail-main">
            <div class="section-card">
              <h3>简介</h3>
              <p>{{ resource.summary }}</p>
            </div>
            <div v-if="resource.content" class="section-card">
              <h3>详细说明</h3>
              <div class="rich-content" v-html="sanitizedContent" ref="richContent"></div>
            </div>
            <div v-if="resource.cloud_drives?.length" class="section-card">
              <h3>下载地址</h3>
              <div v-for="(d,i) in resource.cloud_drives" :key="i" class="drive-item" @click="openDrive(d)">
                <span class="drive-icon">⬇️</span>
                <div class="drive-info">
                  <span class="drive-name">{{ d.cloud_drive||d.name||`下载地址 ${i+1}` }}</span>
                  <span class="drive-url">{{ d.download_url||d.url }}</span>
                </div>
                <span class="drive-arrow">→</span>
              </div>
            </div>

            <div class="section-card">
              <h3>评分</h3>
              <div class="rating-area">
                <div class="stars-display">
                  <span v-for="s in 5" :key="s" class="star" :class="{filled:s<=(hoverRating||userRating||resource.rating||0)}" @mouseenter="hoverRating=s" @mouseleave="hoverRating=0" @click="submitRating(s)">★</span>
                  <span class="rating-text">{{ resource.rating||'暂无评分' }}</span>
                  <span class="rating-count">({{ resource.rating_count||0 }} 人评价)</span>
                </div>
                <div v-if="ratingCommentVisible" class="rating-form">
                  <el-input v-model="ratingComment" type="textarea" :rows="2" placeholder="说说你的评价（可选）" />
                  <el-button type="primary" size="small" style="margin-top:8px" @click="submitRatingComment">提交评价</el-button>
                </div>
              </div>
            </div>

            <div class="section-card">
              <h3>评论 ({{ commentCount }})</h3>
              <div v-if="userStore.isLoggedIn" class="comment-form">
                <textarea v-model="newComment" rows="3" placeholder="发表评论..."></textarea>
                <button class="btn btn-primary" :disabled="commentLoading" @click="submitComment">{{ commentLoading?'发送中...':'发表评论' }}</button>
              </div>
              <div v-else class="login-hint"><router-link to="/">登录</router-link>后再评论</div>
              <div class="comment-list">
                <template v-for="c in topLevelComments" :key="c.id">
                  <div class="comment-item">
                    <div class="comment-header">
                      <div class="comment-avatar">{{ (c.username||'U').charAt(0).toUpperCase() }}</div>
                      <div><span class="comment-author">{{ c.username||'匿名' }}</span><span class="comment-time">{{ formatTime(c.created_at) }}</span></div>
                    </div>
                    <div class="comment-body">{{ c.content }}</div>
                    <div class="comment-actions">
                      <button class="action-btn small" @click="toggleReply(c)">💬 回复</button>
                      <button class="action-btn small" @click="likeComment(c)">👍 {{ c.likes||0 }}</button>
                    </div>
                    <div v-if="replyTarget?.id===c.id" class="reply-form">
                      <textarea v-model="replyContent" rows="2" placeholder="回复 {{ c.username }}..."></textarea>
                      <div class="reply-actions">
                        <button class="btn btn-primary btn-sm" :disabled="replyLoading" @click="submitReply(c)">{{ replyLoading?'发送中...':'回复' }}</button>
                        <button class="btn btn-sm" @click="replyTarget=null;replyContent=''">取消</button>
                      </div>
                    </div>
                    <div v-if="childComments(c.id)?.length" class="replies">
                      <div v-for="r in childComments(c.id)" :key="r.id" class="reply-item">
                        <div class="comment-header">
                          <div class="comment-avatar small">{{ (r.username||'U').charAt(0).toUpperCase() }}</div>
                          <div><span class="comment-author">{{ r.username||'匿名' }}</span><span class="comment-time">{{ formatTime(r.created_at) }}</span></div>
                        </div>
                        <div class="comment-body">{{ r.content }}</div>
                        <div class="comment-actions">
                          <button class="action-btn small" @click="likeComment(r)">👍 {{ r.likes||0 }}</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <div v-if="topLevelComments.length===0" class="no-comments">暂无评论，快来抢沙发吧</div>
              </div>
            </div>
          </div>
          <aside class="detail-sidebar">
            <div class="sidebar-card">
              <button class="action-btn" :class="{favorited:isFavorited}" @click="toggleFavorite">{{ isFavorited ? '⭐ 已收藏' : '☆ 收藏' }}</button>
              <a v-if="resource.project_url" :href="resource.project_url" target="_blank" class="action-btn success">🔗 项目官网</a>
              <button class="action-btn" @click="shareResource">📤 分享</button>
              <button v-if="userStore.isLoggedIn" class="action-btn danger" @click="showReport=true">🚨 举报</button>
            </div>
            <div class="sidebar-card info-card">
              <h4>资源信息</h4>
              <div class="info-row"><span>分类</span><span>{{ resource.category_name||'未分类' }}</span></div>
              <div class="info-row" v-if="resource.software_name"><span>软件</span><span>{{ resource.software_name }}</span></div>
              <div class="info-row" v-if="resource.license"><span>协议</span><span>{{ resource.license }}</span></div>
              <div class="info-row"><span>浏览</span><span>{{ resource.hits||0 }}</span></div>
              <div class="info-row"><span>收藏</span><span>{{ favoriteCount }}</span></div>
              <div class="info-row"><span>评分</span><span>{{ resource.rating||'-' }} ({{ resource.rating_count||0 }})</span></div>
            </div>
          </aside>
        </div>
      </div>
    </template>

    <Transition name="modal">
      <div v-if="showReport" class="rpt-overlay" @click.self="showReport=false" role="dialog" aria-modal="true">
        <div class="modal">
          <h2>举报资源</h2>
          <div class="form-group"><label>举报原因</label>
            <select v-model="reportReason" class="form-select">
              <option value="">请选择</option>
              <option value="spam">垃圾广告</option>
              <option value="copyright">侵犯版权</option>
              <option value="inappropriate">内容不当</option>
              <option value="inaccurate">信息不准确</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group"><label>补充说明（可选）</label><textarea v-model="reportDesc" class="form-textarea" rows="3" placeholder="请详细描述问题..."></textarea></div>
          <div class="modal-actions"><button class="action-btn" @click="showReport=false">取消</button><button class="action-btn danger" :disabled="!reportReason||reportLoading" @click="submitReport">{{ reportLoading?'提交中...':'提交举报' }}</button></div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { resourceApi } from '@/api/resource'
import { commentApi } from '@/api/comment'
import { favoriteApi } from '@/api/favorite'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import DOMPurify from 'dompurify'

const route = useRoute()
const appStore = useAppStore()
const userStore = useUserStore()
const resource = ref(null)
const loading = ref(true)
const comments = ref([])
const newComment = ref('')
const commentLoading = ref(false)
const isFavorited = ref(false)
const favoriteCount = ref(0)
const hoverRating = ref(0)
const userRating = ref(0)
const ratingComment = ref('')
const ratingCommentVisible = ref(false)
const replyTarget = ref(null)
const replyContent = ref('')
const replyLoading = ref(false)
const richContent = ref(null)
const showReport = ref(false)
const reportReason = ref('')
const reportDesc = ref('')
const reportLoading = ref(false)

const topLevelComments = computed(() => comments.value.filter(c => !c.parent_id))
const childComments = (parentId) => comments.value.filter(c => c.parent_id === parentId)
const commentCount = computed(() => comments.value.length)
const sanitizedContent = computed(() => {
  if (!resource.value?.content) return ''
  return DOMPurify.sanitize(resource.value.content)
})

function formatTime(t) { return t ? new Date(t).toLocaleString('zh-CN') : '' }
function openDrive(d) { const url = d?.download_url||d?.url; if(url) window.open(url,'_blank') }

async function loadData() {
  loading.value = true
  try {
    const id = route.params.id
    const [res, commentData] = await Promise.all([resourceApi.detail(id), commentApi.listByResource(id).catch(()=>[])])
    resource.value = res
    comments.value = Array.isArray(commentData) ? commentData : (commentData.items||[])
    resourceApi.hit(id).catch(()=>{})
    const favData = await favoriteApi.check(id).catch(()=>({favorited:false,count:0}))
    isFavorited.value = favData.favorited; favoriteCount.value = favData.count
  } catch { } finally { loading.value = false }
}

async function submitComment() {
  if(!newComment.value.trim()) return
  commentLoading.value = true
  try {
    await commentApi.create(route.params.id, {content:newComment.value.trim(), username:userStore.user?.username||'匿名', email:userStore.user?.email||''})
    newComment.value = ''; ElMessage.success('评论已提交，等待审核')
    const data = await commentApi.listByResource(route.params.id)
    comments.value = Array.isArray(data)?data:(data.items||[])
  } catch(e) { ElMessage.error('评论提交失败') } finally { commentLoading.value = false }
}

async function submitReply(c) {
  if(!replyContent.value.trim()) return
  replyLoading.value = true
  try {
    await commentApi.create(route.params.id, {content:replyContent.value.trim(), username:userStore.user?.username||'匿名', email:userStore.user?.email||'', parent_id: c.id})
    replyContent.value = ''; replyTarget.value = null; ElMessage.success('回复已提交，等待审核')
    const data = await commentApi.listByResource(route.params.id)
    comments.value = Array.isArray(data)?data:(data.items||[])
  } catch{} finally { replyLoading.value = false }
}

function toggleReply(c) { replyTarget.value = replyTarget.value?.id===c.id ? null : c; replyContent.value = '' }

async function toggleFavorite() {
  try {
    const res = await favoriteApi.toggle(route.params.id)
    isFavorited.value = res.favorited; favoriteCount.value = res.count
    ElMessage.success(res.favorited?'已收藏':'已取消收藏')
  } catch(e) { ElMessage.error('操作失败') }
}

async function likeComment(c) { try { await commentApi.like(c.id); c.likes=(c.likes||0)+1 } catch(e) { ElMessage.error('点赞失败') } }

let ratingTimer = null
async function submitRating(s) {
  if(!userStore.isLoggedIn) { ElMessage.warning('请先登录'); return }
  userRating.value = s
  clearTimeout(ratingTimer)
  ratingTimer = setTimeout(async () => {
    try {
      const res = await resourceApi.rate(route.params.id, { rating: s })
      if(res) { resource.value.rating = res.rating; resource.value.rating_count = res.rating_count }
    } catch(e) { ElMessage.error('评分失败') }
  }, 500)
  ratingCommentVisible.value = true
}
async function submitRatingComment() {
  if(!ratingComment.value.trim()) return
  try {
    await resourceApi.rate(route.params.id, { rating: userRating.value, comment: ratingComment.value.trim() })
    ElMessage.success('评价已提交')
    ratingComment.value = ''; ratingCommentVisible.value = false
  } catch{}
}

async function submitReport() {
  if (!reportReason.value) return
  reportLoading.value = true
  try {
    await resourceApi.report(resource.value.id, { reason: reportReason.value, description: reportDesc.value })
    ElMessage.success('举报已提交，感谢您的反馈')
    showReport.value = false; reportReason.value = ''; reportDesc.value = ''
  } catch(e) { ElMessage.error(e?.response?.data?.message || '举报失败') }
  finally { reportLoading.value = false }
}

async function shareResource() {
  const url = window.location.href
  if(navigator.share) {
    try { await navigator.share({ title: resource.value.title, url }) } catch{}
  } else {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制到剪贴板')
  }
}

function lazyLoadImages() {
  setTimeout(() => {
    const el = richContent.value
    if (!el) return
    el.querySelectorAll('img').forEach(img => {
      const observer = new IntersectionObserver(([entry]) => {
        if(entry.isIntersecting) { img.style.opacity = '1'; observer.unobserve(img) }
      }, { rootMargin: '50px' })
      if(img.complete) img.style.opacity = '1'
      else { img.style.opacity = '0'; img.style.transition = 'opacity 0.3s' }
      observer.observe(img)
    })
  }, 200)
}

onMounted(() => { loadData(); lazyLoadImages() })
</script>

<style scoped>
.detail-page { min-height: 100vh; background: #f5f7fa; }
.dark-mode .detail-page { background: #1a1a2e; }
.detail-container { padding-top: 80px; padding-bottom: 40px; }

.detail-header { background: white; border-radius: 20px; padding: 32px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.dark-mode .detail-header { background: #16213e; }
.detail-header h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; line-height: 1.3; }
.dark-mode .detail-header h1 { color: #e0e0e0; }
.meta { display: flex; flex-wrap: wrap; gap: 16px; color: #666; font-size: 14px; margin-bottom: 16px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { padding: 6px 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 20px; font-size: 12px; font-weight: 600; }
.badge { padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.badge.pinned { background: linear-gradient(135deg, #fff3cd, #ffeeba); color: #856404; }
.badge.category { background: #f0f4ff; color: #4a6cf7; }

.detail-body { display: grid; grid-template-columns: 1fr 280px; gap: 24px; }
.detail-main { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.detail-sidebar { display: flex; flex-direction: column; gap: 16px; align-self: start; position: sticky; top: 80px; }

.section-card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
.dark-mode .section-card { background: #16213e; }
.section-card h3 { font-size: 1.1rem; font-weight: 600; color: #1a1a2e; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #f0f0f5; display: flex; align-items: center; gap: 8px; }
.dark-mode .section-card h3 { color: #e0e0e0; border-bottom-color: #2d3a5f; }
.section-card p { color: #666; line-height: 1.8; font-size: 15px; }
.dark-mode .section-card p { color: #9ca3af; }
.rich-content { line-height: 1.8; color: #666; font-size: 15px; }
.rich-content :deep(img) { max-width: 100%; border-radius: 8px; margin: 10px 0; }

.stars-display { display: flex; align-items: center; gap: 6px; }
.star { font-size: 28px; color: #ddd; cursor: pointer; transition: color 0.2s, transform 0.2s; }
.star.filled { color: #f5a623; }
.star:hover { transform: scale(1.2); }
.rating-text { margin-left: 8px; font-size: 16px; font-weight: 600; color: #f5a623; }
.rating-count { font-size: 13px; color: #999; }

.drive-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #f8f9fa; border-radius: 12px; cursor: pointer; transition: all 0.2s; margin-bottom: 8px; }
.drive-item:last-child { margin-bottom: 0; }
.drive-item:hover { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.drive-icon { font-size: 20px; }
.drive-info { flex: 1; min-width: 0; }
.drive-name { display: block; font-weight: 500; font-size: 14px; }
.drive-url { display: block; font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.drive-item:hover .drive-url { color: rgba(255,255,255,0.7); }
.drive-arrow { font-size: 16px; opacity: 0.5; }

.comment-form { margin-bottom: 24px; }
.comment-form textarea { width: 100%; padding: 14px; border: 1px solid #e0e0e0; border-radius: 12px; font-size: 14px; font-family: inherit; resize: vertical; margin-bottom: 10px; transition: border-color 0.2s; }
.comment-form textarea:focus { outline: none; border-color: #667eea; }
.dark-mode .comment-form textarea { background: #0f3460; border-color: #2d3a5f; color: #e0e0e0; }
.btn { padding: 12px 24px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s; }
.btn-sm { padding: 8px 16px; font-size: 13px; }
.btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; box-shadow: 0 4px 18px rgba(102,126,234,0.4); }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 25px rgba(102,126,234,0.5); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.login-hint { text-align: center; padding: 16px; color: #999; background: #f8f9fa; border-radius: 12px; margin-bottom: 20px; }

.comment-item { padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
.comment-item:last-child { border-bottom: none; }
.dark-mode .comment-item { border-bottom-color: #2d3a5f; }
.comment-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.comment-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
.comment-avatar.small { width: 26px; height: 26px; font-size: 11px; }
.comment-author { font-weight: 600; font-size: 14px; margin-right: 8px; }
.comment-time { color: #999; font-size: 12px; }
.comment-body { color: #666; font-size: 14px; line-height: 1.7; padding-left: 42px; }
.dark-mode .comment-body { color: #9ca3af; }
.comment-actions { padding-left: 42px; margin-top: 6px; display: flex; gap: 8px; }
.action-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 16px; background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; width: 100%; text-decoration: none; color: #555; }
.action-btn.small { padding: 6px 12px; font-size: 13px; width: auto; }
.action-btn:hover { background: #f0f2f5; transform: translateY(-1px); }
.action-btn.favorited { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-color: transparent; }
.action-btn.success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; border-color: transparent; }
.action-btn.danger { color: #dc3545; }
.action-btn.danger:hover { background: #fce4e4; border-color: #dc3545; }

.rpt-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 20px; padding: 32px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.modal-enter-active, .modal-leave-active { transition: opacity 0.25s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform 0.25s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal { transform: translateY(30px); }
.modal-leave-to .modal { transform: translateY(-30px); }
.back-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; margin-bottom: 16px; background: white; border: 1px solid #e0e0e0; border-radius: 10px; color: #555; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.back-btn:hover { background: #f5f7fa; border-color: #667eea; color: #667eea; transform: translateX(-2px); }
.dark-mode .back-btn { background: #16213e; border-color: #2d3a5f; color: #9ca3af; }
.dark-mode .back-btn:hover { border-color: #667eea; color: #667eea; }
.modal h2 { text-align: center; margin-bottom: 24px; color: #333; font-size: 1.4rem; }
.modal h2::after { content: ''; display: block; width: 50px; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); margin: 10px auto 0; border-radius: 2px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; font-size: 14px; }
.form-select { width: 100%; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; background: white; }
.form-textarea { width: 100%; padding: 10px 14px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; }
.modal-actions { display: flex; gap: 10px; margin-top: 20px; }
.modal-actions .action-btn { flex: 1; }

.reply-form { padding: 12px 0 12px 42px; }
.reply-form textarea { width: 100%; padding: 10px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 13px; font-family: inherit; resize: vertical; }
.dark-mode .reply-form textarea { background: #0f3460; border-color: #2d3a5f; color: #e0e0e0; }
.reply-actions { display: flex; gap: 8px; margin-top: 8px; }
.replies { padding-left: 42px; }
.reply-item { padding: 12px; background: #f8f9fa; border-radius: 10px; margin-bottom: 8px; }
.dark-mode .reply-item { background: #0f3460; }

.sidebar-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px; }
.dark-mode .sidebar-card { background: #16213e; }
.info-card h4 { font-size: 15px; font-weight: 600; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; }
.dark-mode .info-card h4 { color: #e0e0e0; border-bottom-color: #2d3a5f; }
.info-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
.info-row:last-child { border-bottom: none; }
.info-row span:first-child { color: #999; }
.info-row span:last-child { font-weight: 500; }
.dark-mode .info-row { border-bottom-color: #2d3a5f; }
.dark-mode .info-row span:first-child { color: #6b7280; }
.dark-mode .info-row span:last-child { color: #e0e0e0; }
.no-comments { text-align: center; padding: 24px; color: #999; }
.loading { display: flex; justify-content: center; padding: 40px; color: #999; }


@media (max-width: 768px) {
  .detail-body { grid-template-columns: 1fr; }
  .detail-sidebar { position: static; }
  .comment-body, .comment-actions { padding-left: 0; }
}
</style>
