import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/detail/:id',
    name: 'Detail',
    component: () => import('@/views/Detail.vue'),
  },
  {
    path: '/ranking',
    name: 'Ranking',
    component: () => import('@/views/Ranking.vue'),
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/Favorites.vue'),
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
  },
  {
    path: '/my-comments',
    name: 'MyComments',
    component: () => import('@/views/MyComments.vue'),
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPassword.vue'),
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPassword.vue'),
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('@/views/VerifyEmail.vue'),
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/views/Search.vue'),
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('@/views/Archive.vue'),
  },
  {
    path: '/admin',
    component: () => import('@/views/admin/Layout.vue'),
    redirect: '/admin/dashboard',
    children: [
      { path: 'dashboard', name: 'AdminDashboard', component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'resources', name: 'AdminResources', component: () => import('@/views/admin/Resources.vue') },
      { path: 'categories', name: 'AdminCategories', component: () => import('@/views/admin/Categories.vue') },
      { path: 'tags', name: 'AdminTags', component: () => import('@/views/admin/Tags.vue') },
      { path: 'users', name: 'AdminUsers', component: () => import('@/views/admin/Users.vue') },
      { path: 'comments', name: 'AdminComments', component: () => import('@/views/admin/Comments.vue') },
      { path: 'logs', name: 'AdminLogs', component: () => import('@/views/admin/Logs.vue') },
      { path: 'backup', name: 'AdminBackup', component: () => import('@/views/admin/Backup.vue') },
      { path: 'health', name: 'AdminHealth', component: () => import('@/views/admin/Health.vue') },
      { path: 'behavior',    name: 'AdminBehavior',    component: () => import('@/views/admin/Behavior.vue') },
      { path: 'settings',    name: 'AdminSettings',    component: () => import('@/views/admin/Settings.vue') },
      { path: 'friend-links', name: 'AdminFriendLinks', component: () => import('@/views/admin/FriendLinks.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  if (to.path.startsWith('/admin')) {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      next('/')
      return
    }
  }
  next()
})

export default router
