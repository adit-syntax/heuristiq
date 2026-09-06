import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import {
  LayoutDashboard,
  Code2,
  Building2,
  Trophy,
  Sparkles,
  Trash2,
  LogOut,
  User,
  Menu,
  X,
  Sun,
  Moon,
  BookMarked,
  SquareCode,
  Activity,
  StickyNote,
  PenLine,
  CloudOff,
  Search,
  UserRound,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import Landing from './components/Landing';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import useToast from './hooks/useToast';
import logo from './assets/logo-icon.png';
import useUserData from './hooks/useUserData';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './config/firebase';
import './index.css';

// Heavy routes: the 500 kB question sheet, Monaco and Excalidraw stay out of
// the entry bundle until the tab is actually opened.
const DSATracker = lazy(() => import('./components/DSATracker'));
const Companies = lazy(() => import('./components/Companies'));
const ContestTracker = lazy(() => import('./components/ContestTracker'));
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));
const ContestNotifier = lazy(() => import('./components/ContestNotifier'));
const Resources = lazy(() => import('./components/Resources'));
const Playground = lazy(() => import('./components/Playground'));
const Visualizer = lazy(() => import('./components/Visualizer'));
const Notes = lazy(() => import('./components/Notes'));
const Whiteboard = lazy(() => import('./components/Whiteboard'));
const Profile = lazy(() => import('./components/Profile'));
const Feedback = lazy(() => import('./components/Feedback'));
const CodeEditor = lazy(() => import('./components/CodeEditor'));
import FloatingPanel from './components/FloatingPanel';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { id: 'dsa', label: 'DSA Sheet', icon: Code2, primary: true },
  { id: 'companies', label: 'Companies', icon: Building2, primary: true },
  { id: 'contests', label: 'Contests', icon: Trophy },
  { id: 'material', label: 'Material', icon: BookMarked },
  { id: 'playground', label: 'Code', icon: SquareCode, primary: true },
  { id: 'visualizer', label: 'Visualize', icon: Activity },
  { id: 'notes', label: 'Notes', icon: StickyNote, primary: true },
  { id: 'whiteboard', label: 'Board', icon: PenLine, primary: true },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

const TAB_IDS = new Set(TABS.map((t) => t.id));
const readHash = () => {
  const id = window.location.hash.replace('#', '');
  return TAB_IDS.has(id) ? id : 'dashboard';
};

const Loading = ({ label = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-24">
    <div className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    <p className="text-sm text-subtle">{label}</p>
  </div>
);

const Brand = ({ onClick }) => (
  <button onClick={onClick} title="Dashboard" className="flex shrink-0 items-center gap-2 sm:gap-3 rounded-xl p-1 transition-transform hover:scale-[1.03] active:scale-95">
    <img src={logo} alt="Heuristiq" className="size-8 sm:size-10 rounded-xl" />
    <span className="brand-title font-akira select-none text-xs sm:text-base font-extrabold uppercase tracking-tight">
      Heuristiq
    </span>
  </button>
);

const extractInitials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  if (parts.length === 1) {
    return (parts[0].length > 1 ? parts[0].slice(0, 2) : parts[0]).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function AppContent() {
  const { user, isAuthenticated, isGuest, isFirebaseConfigured, logout, loading: authLoading } = useAuth();
  // The hash is the source of truth so a refresh or a shared link lands on the same tab.
  const [activeTab, setActiveTab] = useState(readHash);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [jump, setJump] = useState({}); // { dsaQuery?, companySlug?, notesQuery? }
  const [theme, setTheme] = useState(() => localStorage.getItem('preptracker-theme') || 'dark');

  // Desktop sidebar collapse & auto-collapse on inactivity
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('preptracker-sidebar-collapsed') === 'true';
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  const isSidebarOpen = !sidebarCollapsed || sidebarHovered;

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('preptracker-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // Reset inactivity timer: auto-collapses sidebar after 20s of no interaction on sidebar
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only arm auto-collapse if sidebar is currently uncollapsed
    if (!sidebarCollapsed) {
      inactivityTimerRef.current = setTimeout(() => {
        setSidebarCollapsed(true);
        localStorage.setItem('preptracker-sidebar-collapsed', 'true');
      }, 20000);
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // Window activity detection to start inactivity timer if user works outside sidebar
  useEffect(() => {
    const onUserActivity = (e) => {
      const sidebarEl = document.getElementById('desktop-sidebar');
      if (sidebarEl && !sidebarEl.contains(e.target)) {
        resetInactivityTimer();
      }
    };
    window.addEventListener('click', onUserActivity);
    window.addEventListener('keydown', onUserActivity);
    return () => {
      window.removeEventListener('click', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
    };
  }, [resetInactivityTimer]);

  const handleSidebarMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (sidebarCollapsed) {
      setSidebarHovered(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarHovered(false);
      resetInactivityTimer();
    }, 250);
  };

  // Ctrl+K / Cmd+K opens global search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Global-search routing: navigate + pass a jump payload to the target tab.
  const onSearchSelect = (item) => {
    if (item.type === 'problem') {
      setActiveSheet(item.sheetId);
      setJump({ dsaQuery: item.title });
      goTo('dsa');
    } else if (item.type === 'company') {
      setJump({ companySlug: item.slug });
      goTo('companies');
    } else if (item.type === 'note') {
      setJump({ notesQuery: item.title });
      goTo('notes');
    }
  };

  useEffect(() => {
    const onHashChange = () => setActiveTab(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const goTo = useCallback((id) => {
    window.location.hash = id;
    setActiveTab(id);
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('preptracker-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Sidebar avatar: mirrors the Profile page's doc (Firestore or local).
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileName, setProfileName] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let live = true;

    // 1. Initial fast local read for instant rendering
    try {
      const p = JSON.parse(localStorage.getItem(`preptracker-profile-${user?.id || 'guest'}`) || 'null');
      if (live) {
        if (p?.avatar) {
          setAvatarUrl(p.avatar);
          setAvatarError(false);
        } else if (user?.photoURL) {
          setAvatarUrl(user.photoURL);
          setAvatarError(false);
        }
        if (p?.name) setProfileName(p.name);
        else if (user?.name || user?.displayName) setProfileName(user.name || user.displayName);
      }
    } catch { /* ignore */ }

    // 2. Real-time sync with Firestore profile document
    let unsubFirestore = null;
    if (isFirebaseConfigured && user?.id && !isGuest && db) {
      try {
        unsubFirestore = onSnapshot(
          doc(db, 'users', user.id, 'data', 'profile'),
          (snap) => {
            if (!live) return;
            if (snap.exists()) {
              const data = snap.data();
              if (data?.avatar) {
                setAvatarUrl(data.avatar);
                setAvatarError(false);
              } else {
                setAvatarUrl(user?.photoURL || '');
                setAvatarError(false);
              }
              if (data?.name) setProfileName(data.name);

              try {
                localStorage.setItem(`preptracker-profile-${user.id}`, JSON.stringify(data));
              } catch { /* quota full */ }
            }
          },
          (err) => {
            console.warn('Profile snapshot subscription warning:', err);
          }
        );
      } catch (err) {
        console.warn('Firestore snapshot setup warning:', err);
      }
    }

    // 3. Custom event listener from Profile save
    const onProfileUpdate = (e) => {
      if (!live) return;
      const next = e.detail;
      if (!next) return;
      if (next.avatar !== undefined) {
        setAvatarUrl(next.avatar || user?.photoURL || '');
        setAvatarError(false);
      }
      if (next.name) {
        setProfileName(next.name);
      }
    };
    window.addEventListener('profile-updated', onProfileUpdate);

    return () => {
      live = false;
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener('profile-updated', onProfileUpdate);
    };
  }, [user?.id, user?.photoURL, user?.name, user?.displayName, isGuest, isFirebaseConfigured, activeTab]);

  const {
    data,
    loading: dataLoading,
    setGoal,
    setActiveSheet,
    updateDSAStatus,
    getDSAStatus,
    markSolvedBatch,
    updateQuestionNote,
    getQuestionNote,
    updateQuestionTags,
    getQuestionTags,
    toggleFollowCompany,
    getCompanySolvedCount,
    getWeeklyData,
    resetData,
    updateDailyNote,
    addDailyTodo,
    toggleDailyTodo,
    deleteDailyTodo,
  } = useUserData();

  const mobileCoreTabs = useMemo(() => [
    TABS.find((t) => t.id === 'dashboard'),
    TABS.find((t) => t.id === 'dsa'),
    TABS.find((t) => t.id === 'companies'),
    TABS.find((t) => t.id === 'playground'),
  ].filter(Boolean), []);
  const coreTabIds = useMemo(() => new Set(mobileCoreTabs.map((t) => t.id)), [mobileCoreTabs]);
  const { toast, confirm } = useToast();

  const handleReset = async () => {
    if (await confirm('Reset all progress?', {
      body: 'This action cannot be undone.',
      confirmLabel: 'Reset everything',
      danger: true,
    })) {
      resetData();
      toast('Progress reset', { kind: 'danger' });
    }
  };

  const handleLogout = async () => {
    if (await confirm('Log out?', { confirmLabel: 'Log out' })) {
      logout();
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app">
        <div className="size-10 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="text-sm text-subtle">Loading Heuristiq...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  const displayName = profileName || user?.name || user?.displayName || 'Guest';
  const initials = extractInitials(displayName);

  const navItem = (tab, onClick, isCollapsedRail = false) => {
    const active = activeTab === tab.id;
    if (isCollapsedRail) {
      return (
        <button
          key={tab.id}
          onClick={onClick}
          title={tab.label}
          className={`group relative flex size-11 mx-auto items-center justify-center rounded-xl transition-all
            ${active
              ? 'bg-accent/15 text-accent-hi shadow-xs'
              : 'text-muted hover:bg-raised/70 hover:text-fg'}`}
        >
          <tab.icon className={`size-5 shrink-0 ${active ? 'text-accent-hi' : 'text-subtle group-hover:text-fg'}`} />
          {active && (
            <span className="absolute left-1 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-accent-hi" />
          )}
        </button>
      );
    }

    return (
      <button
        key={tab.id}
        onClick={onClick}
        className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors
          ${active
            ? 'bg-accent/12 text-accent-hi'
            : 'text-muted hover:bg-raised/60 hover:text-fg'}`}
      >
        <tab.icon className={`size-4.5 shrink-0 ${active ? 'text-accent-hi' : 'text-subtle group-hover:text-fg'}`} />
        <span className="truncate">{tab.label}</span>
        {active && <span className="ml-auto size-1.5 rounded-full bg-accent-hi" />}
      </button>
    );
  };

  const actionButtons = (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => setSearchOpen(true)}
        title="Global search (Ctrl+K)"
        className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
      >
        <Search className="size-4.5" />
      </button>
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
      >
        {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </button>
      <button
        onClick={handleReset}
        title="Reset all progress"
        className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
      >
        <Trash2 className="size-4.5" />
      </button>
      <button
        onClick={handleLogout}
        title="Logout"
        className="flex size-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-rose-500/10 hover:text-rose-400"
      >
        <LogOut className="size-4.5" />
      </button>
    </div>
  );

  const collapsedActionButtons = (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={() => setSearchOpen(true)}
        title="Global search (Ctrl+K)"
        className="flex size-8.5 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
      >
        <Search className="size-4" />
      </button>
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex size-8.5 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
      >
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      <button
        onClick={handleLogout}
        title="Logout"
        className="flex size-8.5 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-rose-500/10 hover:text-rose-400"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-app text-fg">
      {/* ============ Desktop sidebar ============ */}
      <aside
        id="desktop-sidebar"
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onMouseMove={() => {
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        }}
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-panel transition-all duration-300 ease-in-out md:flex
          ${isSidebarOpen ? 'w-64' : 'w-20'}
          ${sidebarCollapsed && sidebarHovered ? 'z-50 shadow-2xl ring-1 ring-accent/20' : ''}`}
      >
        {/* Sidebar Header */}
        <div className={`pb-3 pt-5 transition-all duration-300 ${isSidebarOpen ? 'px-4' : 'px-2'}`}>
          {isSidebarOpen ? (
            <div className="flex items-center justify-between">
              <Brand onClick={() => goTo('dashboard')} />
              <button
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Pin sidebar open" : "Collapse sidebar"}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
              >
                {sidebarCollapsed ? <PanelLeftOpen className="size-4.5 text-accent-hi" /> : <PanelLeftClose className="size-4.5" />}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => goTo('dashboard')}
                title="Heuristiq Dashboard"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl p-1 transition-transform hover:scale-105 active:scale-95"
              >
                <img src={logo} alt="Heuristiq" className="size-8 rounded-lg" />
              </button>
              <button
                onClick={toggleSidebar}
                title="Expand sidebar"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-raised hover:text-fg"
              >
                <PanelLeftOpen className="size-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className={`flex-1 space-y-1 overflow-y-auto ${isSidebarOpen ? 'px-3' : 'px-2'}`}>
          {TABS.map((tab) => navItem(tab, () => goTo(tab.id), !isSidebarOpen))}
        </nav>

        {/* Sidebar Footer */}
        <div className={`border-t border-line transition-all duration-300 ${isSidebarOpen ? 'p-4 space-y-3' : 'py-3 px-2 flex flex-col items-center gap-3'}`}>
          {isSidebarOpen ? (
            <>
              <a href="#profile" onClick={(e) => { e.preventDefault(); goTo('profile'); }} className="group flex items-center gap-3" title="Open profile">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    onError={() => setAvatarError(true)}
                    className="size-9 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent-hi transition-colors group-hover:bg-accent/25 select-none">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold transition-colors group-hover:text-accent-hi">{displayName}</p>
                  <p className="truncate text-xs text-subtle">{user?.email || 'Local data only'}</p>
                </div>
              </a>
              {actionButtons}
            </>
          ) : (
            <>
              <a href="#profile" onClick={(e) => { e.preventDefault(); goTo('profile'); }} className="group flex items-center justify-center" title={`Open profile (${displayName})`}>
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    onError={() => setAvatarError(true)}
                    className="size-9 shrink-0 rounded-full border border-line object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent-hi transition-transform group-hover:scale-105 select-none">
                    {initials}
                  </div>
                )}
              </a>
              {collapsedActionButtons}
            </>
          )}
        </div>
      </aside>

      {/* ============ Mobile top header ============ */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-app/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand onClick={() => goTo('dashboard')} />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            title="Global search (Ctrl+K)"
            className="flex size-9 items-center justify-center rounded-lg text-subtle hover:text-fg"
          >
            <Search className="size-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="flex size-9 items-center justify-center rounded-lg text-subtle hover:text-fg"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-9 items-center justify-center rounded-lg text-muted hover:text-fg"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </header>

      {/* ============ Mobile drawer ============ */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-panel p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-4">
              <Brand onClick={() => goTo('dashboard')} />
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {TABS.map((tab) => navItem(tab, () => goTo(tab.id)))}
            </nav>
            <div className="space-y-3 border-t border-line pt-4">
              <a href="#profile" onClick={(e) => { e.preventDefault(); goTo('profile'); setMobileMenuOpen(false); }} className="group flex items-center gap-3" title="Open profile">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    onError={() => setAvatarError(true)}
                    className="size-9 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-sm font-semibold text-accent-hi select-none">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold transition-colors group-hover:text-accent-hi">{displayName}</p>
                  <p className="truncate text-xs text-subtle">{user?.email || 'Local data only'}</p>
                </div>
              </a>
              {actionButtons}
            </div>
          </div>
        </div>
      )}

      {/* ============ Content ============ */}
      <div className={`transition-[padding] duration-300 ease-in-out ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <main className="mx-auto max-w-6xl px-3 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-8">
          {/* Local-only warning: progress is saved, but only on this device. */}
          {(isGuest || !isFirebaseConfigured) && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
              <CloudOff className="size-4 shrink-0" />
              <span>
                {isFirebaseConfigured
                  ? 'Guest mode: progress is saved on this device only. Log in to sync across devices.'
                  : 'Cloud sync is not configured (missing Firebase env vars). Everything is saved locally.'}
              </span>
            </div>
          )}

          <ErrorBoundary key={activeTab}>
            <Suspense fallback={<Loading />}>
              {activeTab === 'dashboard' && (
                <Dashboard
                  data={data}
                  getDSAStatus={getDSAStatus}
                  setGoal={setGoal}
                  setActiveSheet={setActiveSheet}
                  getWeeklyData={getWeeklyData}
                  userName={user?.name}
                  updateDailyNote={updateDailyNote}
                  addDailyTodo={addDailyTodo}
                  toggleDailyTodo={toggleDailyTodo}
                  deleteDailyTodo={deleteDailyTodo}
                />
              )}

              {activeTab === 'dsa' && (
                <DSATracker
                  updateDSAStatus={updateDSAStatus}
                  getDSAStatus={getDSAStatus}
                  updateQuestionNote={updateQuestionNote}
                  getQuestionNote={getQuestionNote}
                  updateQuestionTags={updateQuestionTags}
                  getQuestionTags={getQuestionTags}
                  theme={theme}
                  sheetId={data.activeSheet}
                  onSheetChange={setActiveSheet}
                  jumpQuery={jump.dsaQuery}
                />
              )}

              {activeTab === 'companies' && (
                <Companies
                  updateDSAStatus={updateDSAStatus}
                  getDSAStatus={getDSAStatus}
                  updateQuestionNote={updateQuestionNote}
                  getQuestionNote={getQuestionNote}
                  updateQuestionTags={updateQuestionTags}
                  getQuestionTags={getQuestionTags}
                  toggleFollowCompany={toggleFollowCompany}
                  getCompanySolvedCount={getCompanySolvedCount}
                  followedCompanies={data.followedCompanies || []}
                  dsaProgress={data.dsaProgress}
                  jumpSlug={jump.companySlug}
                  theme={theme}
                />
              )}

              {activeTab === 'contests' && <ContestTracker />}

              {activeTab === 'material' && <Resources />}
              {activeTab === 'playground' && <Playground theme={theme} />}
              {activeTab === 'visualizer' && <Visualizer />}
              {activeTab === 'notes' && <Notes jumpQuery={jump.notesQuery} />}
              {activeTab === 'whiteboard' && <Whiteboard theme={theme} />}
              {activeTab === 'profile' && <Profile markSolvedBatch={markSolvedBatch} />}
              {activeTab === 'feedback' && <Feedback />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {searchOpen && (
        <ErrorBoundary>
          <Suspense fallback={<Loading label="Loading search..." />}>
            <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onSelect={onSearchSelect} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* ============ Global quick floating tools (Code, Notes, Whiteboard) ============ */}
      <div className="fixed bottom-20 right-3.5 z-40 flex flex-col items-center gap-2.5 md:bottom-6 md:right-6">
        {/* Code Playground floating toggle */}
        <button
          onClick={() => setCodeOpen((v) => !v)}
          title={codeOpen ? "Close floating code" : "Open Code Playground (Floating)"}
          className={`group relative flex size-11 items-center justify-center rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${
            codeOpen
              ? 'bg-accent text-white shadow-accent/40 ring-2 ring-accent-hi/40'
              : 'border border-line/80 bg-panel/90 text-subtle shadow-black/40 backdrop-blur-md hover:border-accent/50 hover:bg-raised hover:text-accent-hi'
          }`}
        >
          <SquareCode className="size-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Code Playground</span>
        </button>

        {/* Notes floating toggle */}
        <button
          onClick={() => setNotesOpen((v) => !v)}
          title={notesOpen ? "Close floating notes" : "Open Notes (Floating)"}
          className={`group relative flex size-11 items-center justify-center rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${
            notesOpen
              ? 'bg-accent text-white shadow-accent/40 ring-2 ring-accent-hi/40'
              : 'border border-line/80 bg-panel/90 text-subtle shadow-black/40 backdrop-blur-md hover:border-accent/50 hover:bg-raised hover:text-accent-hi'
          }`}
        >
          <StickyNote className="size-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Notes</span>
        </button>

        {/* Draw / Whiteboard floating toggle */}
        <button
          onClick={() => setBoardOpen((v) => !v)}
          title={boardOpen ? "Close floating whiteboard" : "Open Whiteboard (Floating)"}
          className={`group relative flex size-11 items-center justify-center rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 ${
            boardOpen
              ? 'bg-accent text-white shadow-accent/40 ring-2 ring-accent-hi/40'
              : 'bg-gradient-to-br from-accent-hi to-accent-deep text-white shadow-accent/30 hover:shadow-accent/50'
          }`}
        >
          <PenLine className="size-5 transition-transform group-hover:scale-110" />
          <span className="sr-only">Whiteboard</span>
        </button>
      </div>

      {/* Floating Code Playground Panel */}
      {codeOpen && (
        <FloatingPanel
          title="Code Playground"
          icon={<SquareCode className="size-4 shrink-0 text-accent-hi" />}
          initialWidth={860}
          initialHeight={620}
          minW={480}
          minH={360}
          keepAspect={false}
          allowOffscreen
          onClose={() => setCodeOpen(false)}
          bodyClassName="overflow-y-auto"
        >
          <div className="h-full p-2">
            <ErrorBoundary>
              <Suspense fallback={<Loading label="Loading code editor..." />}>
                <CodeEditor storageKey="playground" theme={theme} fill />
              </Suspense>
            </ErrorBoundary>
          </div>
        </FloatingPanel>
      )}

      {/* Floating Notes Panel */}
      {notesOpen && (
        <ErrorBoundary>
          <Suspense fallback={<Loading label="Loading notes..." />}>
            <Notes floating onClose={() => setNotesOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Floating Whiteboard Panel */}
      {boardOpen && (
        <ErrorBoundary>
          <Suspense fallback={<Loading label="Loading whiteboard..." />}>
            <Whiteboard theme={theme} floating onClose={() => setBoardOpen(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* ============ Mobile bottom nav ============ */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-panel/95 px-1 py-1.5 backdrop-blur md:hidden">
        {mobileCoreTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => goTo(tab.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10px] sm:text-[11px] font-medium transition-colors
                ${active ? 'font-semibold text-accent-hi' : 'text-subtle hover:text-fg'}`}
            >
              <tab.icon className={`size-5 shrink-0 ${active ? 'text-accent-hi' : 'text-subtle'}`} />
              <span className="max-w-[62px] truncate">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-1 flex-col items-center gap-1 py-1 text-[10px] sm:text-[11px] font-medium transition-colors
            ${!coreTabIds.has(activeTab) ? 'font-semibold text-accent-hi' : 'text-subtle hover:text-fg'}`}
        >
          {(() => {
            const currentTab = TABS.find((t) => t.id === activeTab);
            const Icon = !coreTabIds.has(activeTab) && currentTab ? currentTab.icon : Menu;
            return (
              <>
                <Icon className={`size-5 shrink-0 ${!coreTabIds.has(activeTab) ? 'text-accent-hi' : 'text-subtle'}`} />
                <span className="max-w-[62px] truncate">{!coreTabIds.has(activeTab) && currentTab ? currentTab.label : 'More'}</span>
              </>
            );
          })()}
        </button>
      </nav>

      {/* In-app contest alerts (toasts when a contest is <=15 min away or
          just started) - always mounted, runs quietly in the background. */}
      {isAuthenticated && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ContestNotifier />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
