'use client'

import { useState, useEffect, useRef, useMemo, type ComponentType } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { patchFetch, clearApiCache } from '@/lib/apiCache'
import CustomersPage from './customers/page'
import ProductsPage from './products/page'
import PackagesPage from './packages/page'
import DspMappingPage from './dsp-mapping/page'
import CallbackLogsPage from './callback-logs/page'
import ReportLogsPage from './report-logs/page'
import EventsWhitelistPage from './events-whitelist/page'
import MenusPage from './menus/page'
import RolesPage from './roles/page'
import UsersPage from './users/page'
import AuditLogsPage from './audit-logs/page'

const PAGE_MAP: Record<string, ComponentType> = {
  '/dashboard/customers': CustomersPage,
  '/dashboard/products': ProductsPage,
  '/dashboard/packages': PackagesPage,
  '/dashboard/dsp-mapping': DspMappingPage,
  '/dashboard/callback-logs': CallbackLogsPage,
  '/dashboard/report-logs': ReportLogsPage,
  '/dashboard/events-whitelist': EventsWhitelistPage,
  '/dashboard/menus': MenusPage,
  '/dashboard/roles': RolesPage,
  '/dashboard/users': UsersPage,
  '/dashboard/audit-logs': AuditLogsPage,
}

interface UserInfo {
  id: number
  username: string
  real_name: string
  role_id: number
  role_name: string
  menu_permissions: number[]
}

interface MenuItem {
  id: number
  name: string
  path: string
  icon: string
  parent_id: number
}

const defaultMenus: MenuItem[] = [
  { id: 2, name: '系统管理', path: '', icon: 'settings', parent_id: 0 },
  { id: 3, name: '菜单管理', path: '/dashboard/menus', icon: 'menu', parent_id: 2 },
  { id: 4, name: '角色管理', path: '/dashboard/roles', icon: 'shield', parent_id: 2 },
  { id: 5, name: '用户管理', path: '/dashboard/users', icon: 'users', parent_id: 2 },
  { id: 14, name: '操作日志', path: '/dashboard/audit-logs', icon: 'clipboard-list', parent_id: 2 },
  { id: 15, name: '回传token管理', path: '/dashboard/events-whitelist', icon: 'shield-check', parent_id: 2 },
  { id: 6, name: '产品管理', path: '', icon: 'package', parent_id: 0 },
  { id: 7, name: '客户管理', path: '/dashboard/customers', icon: 'building', parent_id: 6 },
  { id: 8, name: '产品管理', path: '/dashboard/products', icon: 'box', parent_id: 6 },
  { id: 9, name: '包体管理', path: '/dashboard/packages', icon: 'archive', parent_id: 6 },
  { id: 10, name: '转发管理', path: '', icon: 'share', parent_id: 0 },
  { id: 11, name: '包映射配置', path: '/dashboard/dsp-mapping', icon: 'link', parent_id: 10 },
  { id: 12, name: '事件回传日志', path: '/dashboard/callback-logs', icon: 'refresh', parent_id: 10 },
  { id: 13, name: '报表拉取日志', path: '/dashboard/report-logs', icon: 'file-text', parent_id: 10 },
]

const iconMap: Record<string, React.ReactNode> = {
  settings: <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />,
  menu: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />,
  shield: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />,
  users: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
  logout: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />,
  chevron: <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />,
  package: <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />,
  building: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />,
  box: <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-2.25-1.313M21 7.5v2.25m0-2.25-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3 2.25-1.313M12 12l-2.25-1.313M12 12v2.25m0 6 8.25-4.765m-8.25 4.765L3.75 15.485m8.25-1.235L3.75 9.75m16.5 5.735V9.75M3.75 9.75v5.735m16.5-5.735L12 3.75 3.75 9.75" />,
  archive: <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />,
  share: <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />,
  'shield-check': <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 22 2.25M21.75 12H18a2.25 2.25 0 0 0-2.25 2.25v6a2.25 2.25 0 0 0 2.25 2.25h3.75a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-3.75Z" />,
  link: <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />,
  refresh: <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M2.985 19.644l3.181 3.182" />,
  'file-text': <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />,
  'clipboard-list': <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />,
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set([2, 6, 10]))
  const [user, setUser] = useState<UserInfo | null>(null)
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [menusLoaded, setMenusLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  // 主题：菜单选中色 + 创建/保存按钮底色共用 --primary，可切换 橙/紫/蓝 三色。
  const [theme, setTheme] = useState<'orange' | 'purple' | 'blue'>('orange')
  // 跳过挂载瞬间的首次写入，避免把默认橙色回写、覆盖 localStorage 里已存的紫色
  const themeInitRef = useRef(true)
  // Initialize empty so SSR and the client's first render match; restore from
  // localStorage after mount to avoid a hydration mismatch.
  const [openedTabs, setOpenedTabs] = useState<{ path: string; name: string }[]>([])
  // Per-page nonce: only the *current* page's nonce changes on manual refresh,
  // forcing a remount of just that page. Other pages keep their stable key so
  // they are never remounted when switching between them.
  const [pageNonces, setPageNonces] = useState<Record<string, number>>({})
  // Local "active tab" — drives which page is shown. We deliberately do NOT use
  // Next.js route navigation (Link / router.push) for menu switching: that would
  // trigger a client-side RSC fetch (?_rsc=…) on every switch, plus a code-split
  // chunk load on first visit. Instead we keep every visited page mounted
  // (keep-alive) and simply toggle its visibility, so switching tabs makes ZERO
  // network requests. The URL no longer changes with the menu; deep-linking only
  // affects the very first render (we seed activeTab from the initial pathname).
  const [activeTab, setActiveTab] = useState<string>(pathname ?? '/dashboard/menus')

  // 是否已完成从 localStorage 的恢复。在恢复完成前，持久化 effect 不写入，
  // 以免初次挂载时把内存默认值 /dashboard 覆盖掉已记住的选中项（会导致刷新后
  // 永远回退到「菜单管理」）。
  const restoredRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    patchFetch()
    clearApiCache()

    // 刷新前选中的菜单（URL 不随菜单变化，故用 localStorage 记忆当前 tab）。
    // 在挂载时同步恢复，不依赖异步 fetch，避免恢复前被默认值覆盖。
    let storedTab: string | null = null
    try {
      storedTab = localStorage.getItem('dashboard-active-tab')
    } catch { /* ignore */ }
    if (storedTab && storedTab.startsWith('/dashboard/')) {
      setActiveTab(storedTab)
      restoredRef.current = true
    }

    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/menus').then(r => r.json()),
    ]).then(([meData, menusData]) => {
      if (meData.user) setUser(meData.user)
      const allMenus: any[] = menusData.data || []
      setMenus(allMenus)
      setMenusLoaded(true)

      // 根据权限过滤菜单，找到第一个有权限的可访问页面。
      // 注意：必须与侧边栏 filteredMenus 保持同一套权限逻辑——
      // 超级管理员(role_id=1)或权限数组为空时取「全部菜单」，否则按 menu_permissions
      // 过滤。否则会出现「侧边栏能显示、但刷新恢复时被 accessible 排除」的不一致
      // （例如超级管理员的 menu_permissions 漏了操作日志 id=14，刷新会回退到第一个菜单）。
      const userData = meData.user
      const userPerms = userData?.menu_permissions || []
      const isSuperAdmin = userData?.role_id === 1
      const accessible = (isSuperAdmin || !userPerms || userPerms.length === 0)
        ? allMenus.filter(m => m.path)
        : allMenus.filter(m => userPerms.includes(m.id) && m.path)

      if (accessible.length > 0) {
        setActiveTab(prev => {
          // 如果当前页面（含恢复的 storedTab）不在可访问列表里，跳转到第一个可访问页面
          if (!accessible.some(m => prev.startsWith(m.path))) {
            return accessible[0].path
          }
          return prev
        })
      }
      // 标记恢复完成，之后才允许把 activeTab 写回 localStorage
      restoredRef.current = true
    })
    try {
      const raw = localStorage.getItem('dashboard-opened-tabs')
      if (raw) setOpenedTabs(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // 记忆当前选中的菜单，刷新后可恢复。restoredRef 为 false 时不写入，
  // 以免初次挂载把默认 /dashboard 覆盖掉已记住的选中项。
  useEffect(() => {
    if (!restoredRef.current) return
    try { localStorage.setItem('dashboard-active-tab', activeTab) } catch { /* ignore */ }
  }, [activeTab])

  // 主题：刷新后从 localStorage 恢复，并持久化。初始默认橙色（与 SSR 一致，避免水合错位）。
  useEffect(() => {
    try {
      const t = localStorage.getItem('dashboard-theme')
      if (t === 'orange' || t === 'purple' || t === 'blue') setTheme(t)
    } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    if (themeInitRef.current) {
      themeInitRef.current = false
      return
    }
    try { localStorage.setItem('dashboard-theme', theme) } catch { /* ignore */ }
  }, [theme])

  // Persist opened tabs across page refresh (F5)
  useEffect(() => {
    try { localStorage.setItem('dashboard-opened-tabs', JSON.stringify(openedTabs)) } catch { /* ignore */ }
  }, [openedTabs])

  // Manual refresh: clear cache and bump only the current page's nonce, so
  // only that page is remounted + re-fetches. Other cached pages stay untouched.
  function handleRefresh() {
    clearApiCache()
    if (activeTab) {
      setPageNonces(prev => ({ ...prev, [activeTab]: (prev[activeTab] ?? 0) + 1 }))
    }
  }

  // Menu name mapping
  const breadcrumbMap: Record<string, string> = {
    menus: '菜单管理',
    roles: '角色管理',
    users: '用户管理',
    customers: '客户管理',
    products: '产品管理',
    packages: '包体管理',
    'dsp-mapping': '包映射配置',
    'callback-logs': '事件回传日志',
    'report-logs': '报表拉取日志',
    'audit-logs': '操作日志',
    'events-whitelist': '回传token管理',
  }

  // Track opened tabs
  useEffect(() => {
    const menu = menus.find(m => activeTab.startsWith(m.path) && m.path !== '')
    if (!menu) return
    const name = breadcrumbMap[menu.path.split('/').pop() || ''] || menu.name
    setOpenedTabs(prev => {
      if (prev.some(t => t.path === menu.path)) return prev
      return [...prev, { path: menu.path, name }]
    })
  }, [activeTab])

  // Auto-expand parent menu when a child is active
  useEffect(() => {
    const activeMenu = menus.find(m => m.path !== '' && activeTab.startsWith(m.path))
    if (!activeMenu) return
    const parent = menus.find(m => m.id === activeMenu.parent_id)
    if (!parent) return
    setExpandedMenus(prev => {
      if (prev.has(parent.id)) return prev
      return new Set([...prev, parent.id])
    })
  }, [activeTab])

  function closeTab(path: string) {
    setOpenedTabs(prev => {
      const next = prev.filter(t => t.path !== path)
      if (activeTab.startsWith(path) && next.length > 0) {
        setActiveTab(next[next.length - 1].path)
      }
      return next
    })
  }

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    router.push('/login')
  }

  function toggleMenu(id: number) {
    setExpandedMenus(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function isActive(path: string) {
    return activeTab.startsWith(path) && path !== ''
  }

  // Filter menus based on role permissions
  const filteredMenus = useMemo(() => {
    // 超级管理员（role_id=1）拥有所有权限
    if (!user || user.role_id === 1 || !user.menu_permissions || user.menu_permissions.length === 0) {
      return menus
    }
    return menus.filter(m => user.menu_permissions.includes(m.id))
  }, [menus, user])

  const parentMenus = filteredMenus.filter(m => m.parent_id === 0)
  const getChildren = (parentId: number) => filteredMenus.filter(m => m.parent_id === parentId)

  // Find current menu and its parent (based on the local active tab)
  const currentMenu = menus.find(m => activeTab.startsWith(m.path) && m.path !== '')
  const parentMenu = currentMenu ? menus.find(m => m.id === currentMenu.parent_id) : null
  const breadcrumbs = [
    ...(parentMenu ? [parentMenu.name] : []),
    ...(currentMenu && breadcrumbMap[currentMenu.path.split('/').pop() || ''] ? [breadcrumbMap[currentMenu.path.split('/').pop() || '']] : []),
  ]

  const navItems = useMemo(() => parentMenus.map(parent => {
    const children = getChildren(parent.id)
    const hasChildren = children.length > 0
    const expanded = expandedMenus.has(parent.id)
    const activeChild = children.find(c => isActive(c.path))
    const activeParent = activeChild || (activeTab === parent.path)

    return (
      <div key={parent.id}>
        <button
          onClick={() => hasChildren ? toggleMenu(parent.id) : setActiveTab(parent.path)}
          className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left transition-colors ${
            activeParent
              ? 'text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <svg className="h-4.5 w-4.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            {iconMap[parent.icon]}
          </svg>
          {!collapsed && (
            <>
              <span className="flex-1 text-[15px] font-medium tracking-wide">{parent.name}</span>
              {hasChildren && (
                <svg className={`h-3 w-3 text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  {iconMap.chevron}
                </svg>
              )}
            </>
          )}
        </button>

        {/* Children */}
        {hasChildren && expanded && !collapsed && (
          <div className="ml-3 mt-0.5 space-y-0.5">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setActiveTab(child.path)}
                className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-[15px] transition-colors ${
                  isActive(child.path)
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isActive(child.path) ? 'bg-green-500' : 'bg-[var(--primary)] opacity-30'}`} />
                <span className="tracking-wide">{child.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }), [parentMenus, activeTab, expandedMenus, collapsed])

  // Keep-alive via component mapping: every visited page is mounted exactly
  // once and stays mounted (hidden when inactive). Switching tabs just un-hides
  // the target page (and hides the others) — no remount, no RSC fetch, no /api
  // re-fetch. Keys are STABLE (path + per-page nonce) and never change on a
  // plain tab switch, so React never destroys/recreates the page component.
  // Only a manual refresh bumps the current page's nonce, forcing a single-page
  // remount + re-fetch.
  const visitedRef = useRef<Set<string>>(new Set())
  if (activeTab) visitedRef.current.add(activeTab)

  const cachedPages = Array.from(visitedRef.current).map(p => {
    const Comp = PAGE_MAP[p]
    if (!Comp) return null
    return (
      <div
        key={`${p}-${pageNonces[p] ?? 0}`}
        className="h-full overflow-auto p-6 text-lg text-gray-700"
        style={{ display: p === activeTab ? 'block' : 'none' }}
      >
        <Comp />
      </div>
    )
  })

  return (
    <div data-theme={theme} className="flex h-screen overflow-hidden">
      {/* Soft gradient background */}
      <div className="pointer-events-none fixed inset-0" style={{
        background: `
          radial-gradient(ellipse 80% 120% at 0% 100%, rgba(165,180,252,0.25) 0%, transparent 60%),
          radial-gradient(ellipse 80% 120% at 100% 0%, rgba(251,207,232,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 60% 60% at 50% 50%, rgba(224,242,254,0.12) 0%, transparent 60%),
          #f0f4f8
        `
      }} />

      {/* Sidebar */}
      <aside className={`relative z-10 flex flex-shrink-0 flex-col border-r border-white/10 bg-slate-900/85 backdrop-blur-xl transition-all duration-200 ${collapsed ? 'w-[56px]' : 'w-[200px]'}`}>
        {/* Logo */}
        <div className="flex h-[52px] items-center border-b border-white/10 px-4">
          {collapsed ? (
            <div className="flex w-full justify-center">
              <span className="font-display text-base font-bold text-[var(--primary)]">M</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center border border-amber-500/25">
                  <span className="font-display text-xs font-bold text-[var(--primary)]">M</span>
                </div>
                <span className="text-xs tracking-[0.2em] text-slate-400">Mintegral</span>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {!menusLoaded ? (
            <div className="px-3 py-4 text-[13px] text-slate-500">加载中...</div>
          ) : navItems}
        </nav>

        {/* Bottom - Collapse */}
        <div className="border-t border-white/10">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center py-2.5 text-slate-500 hover:text-slate-300"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M8.25 4.5 15 12 8.25 19.5' : 'M15 19.5 8.25 12 15 4.5'} />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="relative z-20 flex h-[52px] shrink-0 items-center justify-between border-b border-gray-200/60 bg-white/70 backdrop-blur-xl px-6">
          <div className="flex items-center gap-3 text-[15px] tracking-[0.1em] text-gray-400">
            <span className="h-2 w-2 rounded-full bg-green-500/60" />
            {breadcrumbs.join(' / ')}
          </div>

          {/* Right - User dropdown */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-[15px] font-medium text-zinc-900 shadow-sm">
                    {user.real_name?.[0] || user.username[0].toUpperCase()}
                  </div>
                  {/* Name + Role */}
                  <div className="flex flex-col items-start">
                    <span className="text-[15px] font-medium leading-tight text-gray-700">
                      {user.real_name || user.username}
                    </span>
                    <span className="text-[13px] leading-tight text-gray-400">
                      {user.role_name || '—'}
                    </span>
                  </div>
                  {/* Chevron */}
                  <svg
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-lg border border-gray-200 bg-white py-2 shadow-lg z-50">
                    {/* 主题切换 */}
                    <div className="border-b border-gray-100 px-2 pb-1.5 pt-1">
                      <div className="px-2 pb-1 text-[12px] text-gray-400">主题配色</div>
                      <button
                        onClick={() => setTheme('orange')}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[14px] text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: 'var(--color-amber-500)' }} />
                          橙色
                        </span>
                        {theme === 'orange' && (
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setTheme('purple')}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[14px] text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: '#a855f7' }} />
                          紫色
                        </span>
                        {theme === 'purple' && (
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setTheme('blue')}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[14px] text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: '#3b82f6' }} />
                          蓝色
                        </span>
                        {theme === 'blue' && (
                          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={async () => {
                        setDropdownOpen(false)
                        await handleLogout()
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-[15px] text-red-500 transition-colors hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        {iconMap.logout}
                      </svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Tab Bar */}
        {openedTabs.length > 0 && (
          <div className="flex shrink-0 items-center gap-0.5 border-b border-gray-200/60 bg-white/50 backdrop-blur-xl px-2 overflow-x-auto">
            {openedTabs.map(tab => {
              const active = activeTab.startsWith(tab.path)
              return (
                <div
                  key={tab.path}
                  className={`group flex shrink-0 items-center gap-1.5 rounded-t-md px-3 py-1.5 text-[13px] cursor-pointer transition-colors border-x border-t border-transparent mx-0.5 ${
                    active
                      ? 'bg-white text-gray-700 border-gray-200/60 border-b-2 border-b-green-500 -mb-px'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                  }`}
                  onClick={() => setActiveTab(tab.path)}
                >
                  <span className="max-w-[120px] truncate">{tab.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.path) }}
                    className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-100 transition-colors hover:bg-gray-200 hover:text-gray-600"
                  >
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Content - keep-alive: visited pages stay mounted so switching back
            never remounts the page component or re-fetches its data. The active
            page is forced to remount only on manual refresh (its wrapper key
            changes with the per-page nonce). */}
        <div className="flex-1 overflow-hidden">
          {cachedPages}
          {/* Fallback for any route not in PAGE_MAP (keeps `children` used) */}
          {!PAGE_MAP[pathname ?? ''] && children}
        </div>
      </main>
    </div>
  )
}
