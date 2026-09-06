import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [jump, setJump] = useState({}); // { dsaQuery?, companySlug?, notesQuery? }
  const [theme, setTheme] = useState(() => localStorage.getItem('preptracker-theme') || 'dark');

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
    const read = async () => {
      try {
        const p = JSON.parse(localStorage.getItem(`preptracker-profile-${user?.id || 'guest'}`) || 'null');
        if (live) {
          if (p?.avatar) { setAvatarUrl(p.avatar); setAvatarError(false); }
          else { setAvatarUrl(user?.photoURL || ''); setAvatarError(false); }
          if (p?.name) setProfileName(p.name);
          else setProfileName(user?.name || user?.displayName || '');
          return;
        }
      } catch { /* ignore */ }
      if (live) {
        setAvatarUrl(user?.photoURL || '');
        setAvatarError(false);
        setProfileName(user?.name || user?.displayName || '');
      }
    };
    read();
    return () => { live = false; };
  }, [user, activeTab]); // re-read on tab change so it updates right after a save

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

  const navItem = (tab, onClick) => {
    const active = activeTab === tab.id;
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

  return (
    <div className="min-h-screen bg-app text-fg">
      {/* ============ Desktop sidebar ============ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-panel md:flex">
        <div className="px-5 pb-4 pt-6">
          <Brand onClick={() => goTo('dashboard')} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {TABS.map((tab) => navItem(tab, () => goTo(tab.id)))}
        </nav>

        <div className="space-y-3 border-t border-line p-4">
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
      <div className="md:pl-64">
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

      {/* Global whiteboard - reachable from any tab. Hidden on the whiteboard
          tab itself so only one copy of the boards document is ever mounted. */}
      {activeTab !== 'whiteboard' && (
        <button
          onClick={() => setBoardOpen(true)}
          title="Open whiteboard"
          className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-accent-hi to-accent-deep text-white shadow-lg shadow-accent/30 transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        >
          <PenLine className="size-5" />
        </button>
      )}

      {boardOpen && activeTab !== 'whiteboard' && (
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
