import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, ChevronLeft, ChevronRight, Check, CheckCircle2,
  Circle, Play, Pause, Maximize2, PictureInPicture2, Plus, Trash2,
  FileText, Terminal, Send, AlertTriangle, Menu, X, Search,
  Edit3, Cloud, CloudCheck, Layers, Cpu, Globe, Activity, ExternalLink,
  Code2, Building2, Calendar, BookOpen, Undo2, CheckSquare
} from 'lucide-react';
import AuthPage from './AuthPage';
import logoHorizontal from '../assets/logo-horizontal.png';
import { useAuth } from '../context/AuthContext';
import useToast from '../hooks/useToast';

// 3 Curated Tracks with Rich Questions & Code Snippets for the Interactive Preview
const WORKSPACE_SECTIONS = [
  {
    trackIndex: 0,
    path: 'striver-sde-core / dynamic-prog',
    title: 'Dynamic Programming & Sequences',
    company: 'Bloomberg',
    focus: 'Focus: Longest Increasing Subsequence & Binary Search Optimization',
    questions: [
      {
        id: '300. Longest Increasing Subsequence',
        diff: 'Medium',
        diffColor: 'text-amber-400',
        tag: 'O(N log N)',
        status: 'Solved',
        icon: 'check',
        filename: 'solution_lis.cpp',
        execTime: 'Execution: 4ms',
        badge: 'Passed 32/32',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'int lengthOfLIS(vector<int>& nums) {' },
          { indent: 1, code: 'vector<int> tails;' },
          { indent: 1, code: '// Binary search insertion points in monotonic tail array', isComment: true },
          { indent: 1, code: 'for (int x : nums) {' },
          { indent: 2, code: 'auto it = lower_bound(tails.begin(), tails.end(), x);' },
          { indent: 2, code: 'if (it == tails.end()) tails.push_back(x);' },
          { indent: 2, code: 'else *it = x;' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return tails.size();' },
          { indent: 0, code: '}' }
        ]
      },
      {
        id: '354. Russian Doll Envelopes',
        diff: 'Hard',
        diffColor: 'text-rose-400',
        tag: 'Sorting + LIS',
        status: 'Active',
        icon: 'circle',
        filename: 'solution_envelopes.cpp',
        execTime: 'Execution: 4ms',
        badge: 'Passed 32/32',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'int maxEnvelopes(vector<vector<int>>& env) {' },
          { indent: 1, code: '// Sort by width asc, then height desc for monotonic reduction', isComment: true },
          { indent: 1, code: 'sort(env.begin(), env.end(), [](const auto& a, const auto& b) {' },
          { indent: 2, code: 'return a[0] == b[0] ? a[1] > b[1] : a[0] < b[0];' },
          { indent: 1, code: '});' },
          { indent: 1, code: 'vector<int> tails;' },
          { indent: 1, code: 'for (auto& e : env) {' },
          { indent: 2, code: 'auto it = lower_bound(tails.begin(), tails.end(), e[1]);' },
          { indent: 2, code: 'if (it == tails.end()) tails.push_back(e[1]); else *it = e[1];' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return tails.size();' },
          { indent: 0, code: '}' }
        ]
      },
      {
        id: '673. Number of Longest Increasing Subsequences',
        diff: 'Medium',
        diffColor: 'text-amber-400',
        tag: 'DP Count',
        status: 'Queue',
        icon: 'circle',
        filename: 'count_lis.cpp',
        execTime: 'Execution: 9ms',
        badge: 'Passed 44/44',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'int findNumberOfLIS(vector<int>& nums) {' },
          { indent: 1, code: 'vector<int> len(nums.size(), 1), count(nums.size(), 1);' },
          { indent: 1, code: '// Track length and frequency of optimal sub-sequences', isComment: true },
          { indent: 1, code: 'for (int i = 0; i < nums.size(); ++i) {' },
          { indent: 2, code: 'for (int j = 0; j < i; ++j) {' },
          { indent: 3, code: 'if (nums[j] < nums[i]) {' },
          { indent: 4, code: 'if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; count[i] = count[j]; }' },
          { indent: 4, code: 'else if (len[j] + 1 == len[i]) count[i] += count[j];' },
          { indent: 3, code: '}' },
          { indent: 2, code: '}' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return accumulate(count.begin(), count.end(), 0);' },
          { indent: 0, code: '}' }
        ]
      }
    ]
  },
  {
    trackIndex: 1,
    path: 'neetcode-150 / sliding-window',
    title: 'Monotonic Queues & Sliding Window',
    company: 'Amazon',
    focus: 'Focus: Deque Invariance & Extreme Subarray Queries',
    questions: [
      {
        id: '239. Sliding Window Maximum',
        diff: 'Hard',
        diffColor: 'text-rose-400',
        tag: 'Monotonic Deque',
        status: 'Active',
        icon: 'circle',
        filename: 'sliding_max.cpp',
        execTime: 'Execution: 12ms',
        badge: 'Passed 48/48',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'vector<int> maxSlidingWindow(vector<int>& nums, int k) {' },
          { indent: 1, code: 'deque<int> dq; vector<int> res;' },
          { indent: 1, code: '// Maintain descending elements in current window scope', isComment: true },
          { indent: 1, code: 'for (int i = 0; i < nums.size(); ++i) {' },
          { indent: 2, code: 'if (!dq.empty() && dq.front() <= i - k) dq.pop_front();' },
          { indent: 2, code: 'while (!dq.empty() && nums[dq.back()] < nums[i]) dq.pop_back();' },
          { indent: 2, code: 'dq.push_back(i);' },
          { indent: 2, code: 'if (i >= k - 1) res.push_back(nums[dq.front()]);' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return res;' },
          { indent: 0, code: '}' }
        ]
      },
      {
        id: '76. Minimum Window Substring',
        diff: 'Hard',
        diffColor: 'text-rose-400',
        tag: 'Two Pointers',
        status: 'Solved',
        icon: 'check',
        filename: 'min_window.cpp',
        execTime: 'Execution: 6ms',
        badge: 'Passed 268/268',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'string minWindow(string s, string t) {' },
          { indent: 1, code: 'vector<int> map(128, 0); for (char c : t) map[c]++;' },
          { indent: 1, code: '// Sliding right pointer expands, left contracts when valid', isComment: true },
          { indent: 1, code: 'int start = 0, minLen = INT_MAX, count = t.size(), l = 0;' },
          { indent: 1, code: 'for (int r = 0; r < s.size(); ++r) {' },
          { indent: 2, code: 'if (map[s[r]]-- > 0) count--;' },
          { indent: 2, code: 'while (count == 0) {' },
          { indent: 3, code: 'if (r - l + 1 < minLen) { minLen = r - l + 1; start = l; }' },
          { indent: 3, code: 'if (++map[s[l++]] > 0) count++;' },
          { indent: 2, code: '}' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return minLen == INT_MAX ? "" : s.substr(start, minLen);' },
          { indent: 0, code: '}' }
        ]
      },
      {
        id: '424. Longest Repeating Replacement',
        diff: 'Medium',
        diffColor: 'text-amber-400',
        tag: 'Frequency Map',
        status: 'Queue',
        icon: 'circle',
        filename: 'char_replace.cpp',
        execTime: 'Execution: 5ms',
        badge: 'Passed 39/39',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'int characterReplacement(string s, int k) {' },
          { indent: 1, code: 'vector<int> freq(26, 0); int maxFreq = 0, l = 0, maxLen = 0;' },
          { indent: 1, code: 'for (int r = 0; r < s.size(); ++r) {' },
          { indent: 2, code: 'maxFreq = max(maxFreq, ++freq[s[r] - \'A\']);' },
          { indent: 2, code: '// Window length minus most frequent char exceeds budget k', isComment: true },
          { indent: 2, code: 'if ((r - l + 1) - maxFreq > k) freq[s[l++] - \'A\']--;' },
          { indent: 2, code: 'maxLen = max(maxLen, r - l + 1);' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return maxLen;' },
          { indent: 0, code: '}' }
        ]
      }
    ]
  },
  {
    trackIndex: 2,
    path: 'company-banks / google-graphs',
    title: 'Graph Traversals & Topological Ordering',
    company: 'Google',
    focus: 'Focus: Kahn Algorithm, Cycle Detection & Disjoint Set Union',
    questions: [
      {
        id: '207. Course Schedule',
        diff: 'Medium',
        diffColor: 'text-amber-400',
        tag: 'Kahn / BFS',
        status: 'Solved',
        icon: 'check',
        filename: 'kahn_dag.cpp',
        execTime: 'Execution: 7ms',
        badge: 'Passed 52/52',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'bool canFinish(int n, vector<vector<int>>& prereq) {' },
          { indent: 1, code: 'vector<vector<int>> adj(n); vector<int> indeg(n, 0);' },
          { indent: 1, code: 'for (auto& p : prereq) { adj[p[1]].push_back(p[0]); indeg[p[0]]++; }' },
          { indent: 1, code: 'queue<int> q; for (int i = 0; i < n; ++i) if (indeg[i] == 0) q.push(i);' },
          { indent: 1, code: 'int visited = 0;' },
          { indent: 1, code: 'while (!q.empty()) {' },
          { indent: 2, code: 'int u = q.front(); q.pop(); visited++;' },
          { indent: 2, code: 'for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return visited == n;' },
          { indent: 0, code: '}' }
        ]
      },
      {
        id: '684. Redundant Connection',
        diff: 'Medium',
        diffColor: 'text-amber-400',
        tag: 'Union Find (DSU)',
        status: 'Active',
        icon: 'circle',
        filename: 'dsu_redundant.cpp',
        execTime: 'Execution: 3ms',
        badge: 'Passed 39/39',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'vector<int> findRedundantConnection(vector<vector<int>>& edges) {' },
          { indent: 1, code: 'vector<int> parent(edges.size() + 1); iota(parent.begin(), parent.end(), 0);' },
          { indent: 1, code: 'function<int(int)> find = [&](int x) {' },
          { indent: 2, code: 'return parent[x] == x ? x : parent[x] = find(parent[x]);' },
          { indent: 1, code: '};' },
          { indent: 1, code: 'for (auto& e : edges) {' },
          { indent: 2, code: 'int rootA = find(e[0]), rootB = find(e[1]);' },
          { indent: 2, code: 'if (rootA == rootB) return e; // Found cycle edge' },
          { indent: 2, code: 'parent[rootA] = rootB;' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return {};' },
          { indent: 0, code: '}' }
        ]
      },
      {
        id: '127. Word Ladder',
        diff: 'Hard',
        diffColor: 'text-rose-400',
        tag: 'Bidirectional BFS',
        status: 'Queue',
        icon: 'circle',
        filename: 'word_ladder.cpp',
        execTime: 'Execution: 18ms',
        badge: 'Passed 50/50',
        badgeColor: 'text-emerald-400 border-emerald-400/20',
        codeLines: [
          { indent: 0, code: 'int ladderLength(string begin, string end, vector<string>& wordList) {' },
          { indent: 1, code: 'unordered_set<string> dict(wordList.begin(), wordList.end());' },
          { indent: 1, code: 'if (!dict.count(end)) return 0;' },
          { indent: 1, code: 'unordered_set<string> head{begin}, tail{end}; int dist = 2;' },
          { indent: 1, code: '// Bi-directional BFS expansion from both ends simultaneously', isComment: true },
          { indent: 1, code: 'while (!head.empty() && !tail.empty()) {' },
          { indent: 2, code: 'if (head.size() > tail.size()) swap(head, tail);' },
          { indent: 2, code: 'unordered_set<string> nxt;' },
          { indent: 2, code: 'for (string w : head) dict.erase(w);' },
          { indent: 2, code: 'dist++;' },
          { indent: 1, code: '}' },
          { indent: 1, code: 'return 0;' },
          { indent: 0, code: '}' }
        ]
      }
    ]
  }
];

const NOTE_SNIPPETS = [
  {
    title: 'day 4 notes: graph cycles',
    badge: 'google-graphs',
    line1: 'Topological sort via Kahn algorithm:',
    line2: '// Cycle exists if processed vertices count < total vertices in DAG',
    code: 'vector<int> indeg(n, 0);\nfor(auto& p : prereq) indeg[p[0]]++;\n// Push 0 in-degree nodes to queue...',
    words: '36 words • 218 characters'
  },
  {
    title: 'day 2 notes: sliding window',
    badge: 'sliding-window',
    line1: 'Monotonic deque for window maximum:',
    line2: '// Keep elements in strictly decreasing order inside active k-window',
    code: 'while(!dq.empty() && nums[dq.back()] < nums[i]) dq.pop_back();\ndq.push_back(i);',
    words: '31 words • 194 characters'
  },
  {
    title: 'day 1 notes: foundations',
    badge: 'introduction',
    line1: 'Initial complexity checklist:',
    line2: '// Focus on memory locality, call stack depth, and monotonic sequences',
    code: 'const track = "Heuristiq Quiet Workspace";\nconsole.log(`Ready for offline practice on ${track}`);',
    words: '28 words • 186 characters'
  }
];

const TUTOR_PHRASES = [
  '"Notice how we prune smaller candidates from the back in O(1)..."',
  '"Notice how the union-find structure handles edge cycles here in O(α(N))..."',
  '"Watch the left window pointer contract as soon as our condition is satisfied."',
  '"The indegree queue tracks vertices free of dependencies — Kahn\'s BFS in action."',
  '"Observe the binary search insertion point into our monotonic tail array."'
];

const Landing = () => {
  const { continueAsGuest, isFirebaseConfigured, loginWithGoogle } = useAuth();
  const { toast } = useToast();

  // Auth UI state
  const [signInOpen, setSignInOpen] = useState(false);
  const [authCardOpen, setAuthCardOpen] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile Workspace Preview sub-tab: 'code' | 'tasks' | 'notes'
  const [mobilePreviewTab, setMobilePreviewTab] = useState('code');

  // Interactive Hero & Workspace state
  const [currentSectionIdx, setCurrentSectionIdx] = useState(2); // Google Graphs by default
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(1); // Redundant Connection by default

  // Tasks Widget State
  const [tasks, setTasks] = useState([
    { id: 't1', text: 'Master DSU rank & path compression', checked: false },
    { id: 't2', text: 'Dry-run Kahn algorithm cycle in DAG', checked: true },
    { id: 't3', text: 'Solve 2 BFS queue problems', checked: false },
    { id: 't4', text: 'Review monotonic sliding window invariant', checked: false }
  ]);
  const [taskInput, setTaskInput] = useState('');

  // Notes Widget State
  const [currentNoteIdx, setCurrentNoteIdx] = useState(0);
  const [notesAutosaveState, setNotesAutosaveState] = useState('Saved');
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Picture-in-Picture Tutor Subtitle State
  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [subtitleVisible, setSubtitleVisible] = useState(true);

  // Feedback Form State
  const [feedback, setFeedback] = useState({
    name: '',
    email: '',
    title: '',
    description: ''
  });

  // Current selected section & question
  const currentSection = WORKSPACE_SECTIONS[currentSectionIdx];
  const currentQuestion = currentSection.questions[currentQuestionIdx];
  const currentNote = NOTE_SNIPPETS[currentNoteIdx];

  // Gentle auto-cycling of questions if not recently interacted
  const autoCycleRef = useRef(null);

  const resetAutoCycle = () => {
    if (autoCycleRef.current) clearInterval(autoCycleRef.current);
    autoCycleRef.current = setInterval(() => {
      setCurrentQuestionIdx((prevQ) => {
        const sec = WORKSPACE_SECTIONS[currentSectionIdx];
        if (prevQ + 1 < sec.questions.length) return prevQ + 1;
        setCurrentSectionIdx((prevSec) => (prevSec + 1) % WORKSPACE_SECTIONS.length);
        return 0;
      });
    }, 7000);
  };

  useEffect(() => {
    resetAutoCycle();
    return () => {
      if (autoCycleRef.current) clearInterval(autoCycleRef.current);
    };
  }, [currentSectionIdx]);

  // Tutor subtitles rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setSubtitleVisible(false);
      setTimeout(() => {
        setSubtitleIdx((prev) => (prev + 1) % TUTOR_PHRASES.length);
        setSubtitleVisible(true);
      }, 300);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation for [J/K]
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'j' || e.key === 'J') {
        navigateQuestion(1);
      } else if (e.key === 'k' || e.key === 'K') {
        navigateQuestion(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSectionIdx, currentQuestionIdx]);

  const navigateQuestion = (delta) => {
    resetAutoCycle();
    const sec = WORKSPACE_SECTIONS[currentSectionIdx];
    let nextQ = currentQuestionIdx + delta;
    if (nextQ >= sec.questions.length) {
      const nextSec = (currentSectionIdx + 1) % WORKSPACE_SECTIONS.length;
      setCurrentSectionIdx(nextSec);
      setCurrentQuestionIdx(0);
    } else if (nextQ < 0) {
      const prevSec = (currentSectionIdx - 1 + WORKSPACE_SECTIONS.length) % WORKSPACE_SECTIONS.length;
      setCurrentSectionIdx(prevSec);
      setCurrentQuestionIdx(WORKSPACE_SECTIONS[prevSec].questions.length - 1);
    } else {
      setCurrentQuestionIdx(nextQ);
    }
  };

  const selectSection = (idx) => {
    resetAutoCycle();
    setCurrentSectionIdx(idx);
    setCurrentQuestionIdx(0);
  };

  const selectQuestion = (idx) => {
    resetAutoCycle();
    setCurrentQuestionIdx(idx);
  };

  // Task toggles
  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, checked: !t.checked } : t))
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = (e) => {
    e?.preventDefault();
    if (!taskInput.trim()) return;
    const newTask = {
      id: 't_' + Date.now(),
      text: taskInput.trim(),
      checked: false
    };
    setTasks((prev) => [newTask, ...prev]);
    setTaskInput('');
  };

  // Note actions
  const switchNote = (idx) => {
    setNotesAutosaveState('Saving...');
    setCurrentNoteIdx(idx);
    setTimeout(() => {
      setNotesAutosaveState('Autosaved');
    }, 600);
  };

  const deleteActiveNote = () => {
    setShowUndoToast(true);
    setTimeout(() => setShowUndoToast(false), 4000);
  };

  // Auth actions
  const onGuest = () => {
    continueAsGuest();
    toast('Guest mode active — storage is local to this browser session', { kind: 'info', duration: 5000 });
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    const result = await loginWithGoogle();
    setGoogleBusy(false);
    if (!result.success) toast(result.error, { kind: 'danger' });
  };

  const onSendFeedback = (e) => {
    e.preventDefault();
    setSignInOpen(true);
    toast('You must be logged in first to submit feedback. Please sign in.', { kind: 'info', duration: 5000 });
  };

  return (
    <div className="min-h-screen bg-[#08090D] text-[#F8FAFC] font-sans antialiased selection:bg-[#DE4444] selection:text-white overflow-x-hidden">
      
      {/* ============================================================ */}
      {/* 1. TOP APP BAR / RESPONSIVE NAVIGATION                       */}
      {/* ============================================================ */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#08090D]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-15 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-8 lg:gap-10">
            <a href="#" className="flex items-center gap-2.5 group shrink-0">
              <img
                src={logoHorizontal}
                alt="Heuristiq"
                className="h-8 sm:h-10 w-auto object-contain brightness-125 contrast-125"
              />
              <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-zinc-500 font-medium uppercase hidden sm:inline-block border-l border-white/10 pl-2.5 sm:pl-3">
                Workspace
              </span>
            </a>
            <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-xs font-mono tracking-wider uppercase text-zinc-400">
              <a href="#sheets" className="hover:text-white transition-colors duration-200">Sheets</a>
              <a href="#roadmap" className="hover:text-white transition-colors duration-200">Roadmap</a>
              <a href="#architecture" className="hover:text-white transition-colors duration-200">Architecture</a>
              <a href="#workflow" className="hover:text-white transition-colors duration-200">Workspace</a>
              <a href="#feedback" className="hover:text-white transition-colors duration-200">Feedback</a>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#preview"
              className="hidden lg:inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              <span>Explore Engine</span>
              <span className="text-zinc-600">/</span>
            </a>

            <button
              onClick={() => setSignInOpen(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-mono font-medium tracking-wide text-white bg-[#DE4444] hover:bg-[#c93636] transition-all shadow-[0_0_18px_rgba(222,68,68,0.3)] active:scale-95 shrink-0"
            >
              <span>Launch<span className="hidden sm:inline"> Workspace</span></span>
              <ArrowRight className="size-3.5" />
            </button>

            {/* Mobile menu hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white bg-white/[0.03] border border-white/10 shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/[0.08] bg-[#0A0C12] px-5 py-4 space-y-2.5 font-mono text-xs uppercase tracking-wider animate-fade-in">
            <a
              href="#sheets"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-zinc-300 hover:text-white transition-colors"
            >
              Sheets
            </a>
            <a
              href="#roadmap"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-zinc-300 hover:text-white transition-colors"
            >
              Roadmap
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-zinc-300 hover:text-white transition-colors"
            >
              Architecture
            </a>
            <a
              href="#workflow"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-zinc-300 hover:text-white transition-colors"
            >
              Workspace
            </a>
            <a
              href="#feedback"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-zinc-300 hover:text-white transition-colors"
            >
              Feedback
            </a>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/* 2. MAIN HERO CONTAINER                                        */}
      {/* ============================================================ */}
      <main className="relative pt-24 sm:pt-36 lg:pt-40">
        {/* Backdrop radial lights */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-[760px] h-[350px] sm:h-[400px] bg-gradient-to-b from-[#DE4444]/[0.08] via-transparent to-transparent blur-[110px] sm:blur-[130px] pointer-events-none -z-10" />
        <div className="absolute top-36 sm:top-44 left-1/2 -translate-x-1/2 w-full h-[550px] grid-pattern -z-20 opacity-60 pointer-events-none" />

        <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          {/* Tag badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.025] border border-white/[0.08] mb-6 sm:mb-7 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DE4444] animate-pulse" />
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-zinc-300 font-medium">
              ELEVATE INSIGHT
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-white leading-[1.12] sm:leading-[1.08] max-w-4xl">
            Your favorite sheet, contest and note.{' '}
            <span className="text-[#F87171] block sm:inline">One quiet workspace.</span>
          </h1>

          {/* Editorial Subtitle */}
          <p className="mt-4 sm:mt-6 text-sm sm:text-lg md:text-xl text-zinc-400 max-w-2xl font-light leading-relaxed px-1">
            The question lists you already prep from, the contests you already compete in — tracked, annotated and paced in one place.
          </p>

          {/* Dual CTAs */}
          <div className="mt-8 sm:mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => setSignInOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 rounded-lg text-sm font-mono font-medium tracking-wide text-white bg-[#DE4444] hover:bg-[#c93636] transition-all shadow-[0_2px_22px_rgba(222,68,68,0.35)] active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight className="size-4" />
            </button>
            <a
              href="#preview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-lg text-sm font-mono text-zinc-300 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 transition-all"
            >
              <span>See how it works</span>
              <span className="text-zinc-500">→</span>
            </a>
          </div>

          {/* Live Sheets Banner Pills (Interactive with Active Indicator) */}
          <div className="mt-9 sm:mt-10 flex flex-wrap items-center justify-center gap-2 max-w-3xl" id="sheets">
            <button
              onClick={() => selectSection(0)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                currentSectionIdx === 0
                  ? 'bg-[#DE4444]/10 border border-[#DE4444]/50 text-white shadow-[0_0_12px_rgba(222,68,68,0.2)]'
                  : 'bg-white/[0.02] border border-white/[0.07] text-zinc-300 hover:border-[#DE4444]/50'
              }`}
            >
              <span className={currentSectionIdx === 0 ? 'text-[#F87171] font-medium' : 'text-zinc-300'}>
                Top DSA Sheet
              </span>
              <span className="text-zinc-500 text-[11px]">456</span>
            </button>

            <button
              onClick={() => selectSection(1)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                currentSectionIdx === 1
                  ? 'bg-[#DE4444]/10 border border-[#DE4444]/50 text-white shadow-[0_0_12px_rgba(222,68,68,0.2)]'
                  : 'bg-white/[0.02] border border-white/[0.07] text-zinc-300 hover:border-[#DE4444]/50'
              }`}
            >
              <span className={currentSectionIdx === 1 ? 'text-[#F87171] font-medium' : 'text-zinc-300'}>
                NeetCode 150
              </span>
              <span className="text-zinc-500 text-[11px]">150</span>
            </button>

            <button
              onClick={() => selectSection(2)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-mono transition-all cursor-pointer ${
                currentSectionIdx === 2
                  ? 'bg-[#DE4444]/10 border border-[#DE4444]/50 text-white shadow-[0_0_12px_rgba(222,68,68,0.2)]'
                  : 'bg-white/[0.02] border border-white/[0.07] text-zinc-300 hover:border-[#DE4444]/50'
              }`}
            >
              <span className={currentSectionIdx === 2 ? 'text-[#F87171] font-medium' : 'text-zinc-300'}>
                290+ Company Banks
              </span>
              <span className="text-[10px] px-1 rounded bg-[#DE4444]/15 text-[#F87171]">Google</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.07] text-xs font-mono text-zinc-300">
              <span className="text-zinc-300">Blind 75</span>
              <span className="text-zinc-500 text-[11px]">75</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.07] text-xs font-mono text-zinc-300">
              <span className="text-[#F87171] font-medium">System Design</span>
              <span className="text-[10px] px-1 rounded bg-[#DE4444]/15 text-[#F87171]">Roadmap</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.07] text-xs font-mono text-zinc-300">
              <span className="text-zinc-300">Core CS Fundamentals</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.07] text-xs font-mono text-zinc-300">
              <span className="text-zinc-300">CP Ladder</span>
              <span className="text-zinc-500 text-[11px]">1600+</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. CLEAN HERO WORKSPACE FRAME (Responsive Engine Preview)    */}
          {/* ============================================================ */}
          <div
            className="w-full mt-10 sm:mt-12 rounded-xl border border-white/[0.08] bg-[#0A0C11] shadow-2xl overflow-hidden text-left relative"
            id="preview"
          >
            {/* Chrome Bar */}
            <div className="h-10 px-3 sm:px-4 bg-[#08090D] border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.14] inline-block shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08] inline-block shrink-0" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08] inline-block shrink-0" />
                <span className="ml-2 sm:ml-3 font-mono text-[10px] sm:text-[11px] text-zinc-500 tracking-wider truncate">
                  heuristiq.app / <span className="text-zinc-400">{currentSection.path}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-4 font-mono text-[10px] sm:text-[11px] text-zinc-500 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  @aditsyntax
                </span>
                <span className="inline-flex items-center gap-1 text-zinc-400">
                  <Cloud className="size-3 text-emerald-400" />
                  IndexedDB
                </span>
              </div>
            </div>

            {/* Mobile-Only Feature Sub-Tab Toolbar (< md) */}
            <div className="md:hidden flex items-center border-b border-white/[0.06] bg-[#07080C] px-2 py-1.5 text-xs font-mono gap-1">
              <button
                onClick={() => setMobilePreviewTab('code')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  mobilePreviewTab === 'code'
                    ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Code & Run
              </button>
              <button
                onClick={() => setMobilePreviewTab('tasks')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  mobilePreviewTab === 'tasks'
                    ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tasks ({tasks.filter((t) => t.checked).length}/{tasks.length})
              </button>
              <button
                onClick={() => setMobilePreviewTab('notes')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  mobilePreviewTab === 'notes'
                    ? 'bg-white/[0.08] text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Notes ({NOTE_SNIPPETS.length})
              </button>
            </div>

            {/* Editor Interior Grid */}
            <div className="grid grid-cols-12 min-h-[460px] relative bg-[#090B10]">
              
              {/* Left Slim Navigation (Visible on md+, or when 'tasks' tab active on mobile) */}
              <div
                className={`${
                  mobilePreviewTab === 'tasks' ? 'col-span-12 flex' : 'hidden md:flex'
                } md:col-span-3 border-r border-white/[0.05] p-4 sm:p-5 flex-col justify-between bg-[#07080D]/80`}
              >
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                    <span>Curated Track</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-400 border border-white/5">
                      Auto-sync
                    </span>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs">
                    <button
                      onClick={() => selectSection(0)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-all ${
                        currentSectionIdx === 0
                          ? 'bg-white/[0.04] text-white border-l-2 border-[#DE4444]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>Top DSA Sheet</span>
                      <span className="text-[10px] text-zinc-500">84 / 456</span>
                    </button>

                    <button
                      onClick={() => selectSection(1)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-all ${
                        currentSectionIdx === 1
                          ? 'bg-white/[0.04] text-white border-l-2 border-[#DE4444]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>NeetCode 150</span>
                      <span className="text-[10px] text-zinc-600">150</span>
                    </button>

                    <button
                      onClick={() => selectSection(2)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-all ${
                        currentSectionIdx === 2
                          ? 'bg-white/[0.04] text-white border-l-2 border-[#DE4444]'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>290+ Company Banks</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#DE4444]/15 text-[#F87171]">
                        Google
                      </span>
                    </button>

                    <div className="flex items-center justify-between px-3 py-2 rounded text-zinc-500">
                      <span>CP-31 Ladder</span>
                      <span className="text-[10px] text-zinc-600">1600+</span>
                    </div>
                  </div>

                  {/* Pace Target */}
                  <div className="pt-3 sm:pt-4 border-t border-white/[0.05]">
                    <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                      Pace Target
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-zinc-400">Daily goal</span>
                        <span className="font-mono text-zinc-200 font-medium">4 problems</span>
                      </div>
                      <div className="w-full bg-white/[0.05] h-1 rounded-full mt-2.5 overflow-hidden">
                        <div className="bg-[#DE4444] h-full rounded-full transition-all duration-700 w-3/4" />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Tasks Widget */}
                  <div className="pt-3 sm:pt-4 border-t border-white/[0.05]">
                    <div className="rounded-xl bg-[#090A0F] border border-[#DE4444]/25 p-3 sm:p-3.5 font-mono text-xs shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#DE4444]/15 text-[#F87171] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="size-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[11px] tracking-wider uppercase text-zinc-200">
                                Tasks To Be Done
                              </span>
                              <span className="px-1.5 py-0.5 rounded-full bg-[#DE4444]/25 text-[#F87171] text-[9px] font-medium">
                                Today
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">
                              {tasks.filter((t) => t.checked).length} of {tasks.length} completed
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Add task input */}
                      <form onSubmit={addTask} className="flex items-center gap-1.5 mb-2.5">
                        <input
                          type="text"
                          value={taskInput}
                          onChange={(e) => setTaskInput(e.target.value)}
                          placeholder="Add task for today..."
                          className="w-full bg-[#121318] border border-[#DE4444]/60 focus:border-[#DE4444] rounded-lg px-2.5 sm:px-3 py-1.5 text-zinc-200 text-[11px] placeholder-zinc-500 focus:outline-none transition-colors"
                        />
                        <button
                          type="submit"
                          className="w-7 h-7 shrink-0 rounded-lg bg-[#DE4444]/25 hover:bg-[#DE4444]/40 text-[#F87171] flex items-center justify-center transition-transform active:scale-95"
                          title="Add task"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </form>

                      {/* Task item list */}
                      <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-0.5 scrollbar-hide">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-white/[0.04] text-zinc-300 hover:border-white/10 transition-all duration-200 group ${
                              task.checked ? 'bg-[#121318]/50 text-zinc-500' : 'bg-[#121318]'
                            }`}
                          >
                            <div
                              onClick={() => toggleTask(task.id)}
                              className="flex items-center gap-2.5 min-w-0 pr-2 cursor-pointer select-none"
                            >
                              <span
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                  task.checked
                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                    : 'border-white/20 hover:border-[#DE4444]'
                                }`}
                              >
                                {task.checked && <Check className="size-3" />}
                              </span>
                              <span className={`text-[11px] truncate ${task.checked ? 'line-through text-zinc-500' : 'font-medium'}`}>
                                {task.text}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="text-zinc-600 hover:text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0 p-1"
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-zinc-500 flex items-center justify-between pt-3 border-t border-white/[0.05] mt-4">
                  <span>Judge0 Sandbox</span>
                  <span className="text-emerald-400 text-[10px] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>

              {/* Main Canvas with Rows, Code Runner & Notes Module */}
              <div
                className={`${
                  mobilePreviewTab === 'tasks' ? 'hidden md:flex' : 'flex'
                } col-span-12 md:col-span-9 p-3 sm:p-5 lg:p-7 flex-col justify-between`}
              >
                <div className="w-full">
                  {/* Problem Section Header (shown on desktop or when 'code' active on mobile) */}
                  <div className={`${mobilePreviewTab === 'notes' ? 'hidden md:flex' : 'flex'} flex-wrap items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-white/[0.05]`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider text-zinc-200 truncate max-w-[200px] xs:max-w-none">
                          {currentSection.title}
                        </h3>
                        <span className="px-1.5 sm:px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-[#F87171] text-[9px] sm:text-[10px] font-mono shrink-0">
                          {currentSection.company}
                        </span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 font-mono truncate">{currentSection.focus}</p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <button
                          onClick={() => navigateQuestion(-1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                          title="Previous Question [K]"
                        >
                          <ChevronLeft className="size-3.5 sm:size-4" />
                        </button>
                        <button
                          onClick={() => navigateQuestion(1)}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                          title="Next Question [J]"
                        >
                          <ChevronRight className="size-3.5 sm:size-4" />
                        </button>
                        <span className="text-[10px] text-zinc-500 font-mono hidden md:inline ml-1">[J/K]</span>
                      </div>
                      <span className="font-mono text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded bg-white/[0.03] border border-white/[0.06] text-zinc-400 flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        C++ 20
                      </span>
                    </div>
                  </div>

                  {/* Problem Rows (shown on desktop or when 'code' active on mobile) */}
                  <div className={`${mobilePreviewTab === 'notes' ? 'hidden md:block' : 'block'} space-y-1.5 sm:space-y-2 font-mono text-xs mt-3 sm:mt-4`}>
                    {currentSection.questions.map((q, idx) => {
                      const isActive = idx === currentQuestionIdx;
                      return (
                        <div
                          key={q.id}
                          onClick={() => selectQuestion(idx)}
                          className={`flex items-center justify-between px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-md transition-all duration-300 cursor-pointer group ${
                            isActive
                              ? 'bg-white/[0.04] border border-[#DE4444]/60 text-white active-row-indicator'
                              : 'bg-white/[0.015] border border-white/[0.04] text-zinc-400 hover:bg-white/[0.03] hover:border-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {q.status === 'Solved' ? (
                              <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-400 shrink-0" />
                            ) : isActive ? (
                              <Circle className="size-3.5 sm:size-4 text-[#DE4444] fill-[#DE4444]/20 shrink-0" />
                            ) : (
                              <Circle className="size-3.5 sm:size-4 text-zinc-600 shrink-0" />
                            )}
                            <span className={`font-medium truncate text-xs sm:text-sm ${isActive ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                              {q.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 sm:gap-4 text-zinc-500 text-[10px] sm:text-[11px] shrink-0">
                            <span className={q.diffColor}>{q.diff}</span>
                            <span className="hidden sm:inline text-zinc-400">{q.tag}</span>
                            {isActive ? (
                              <span className="text-[#F87171] flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DE4444] animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className={q.status === 'Solved' ? 'text-zinc-400' : 'text-zinc-500'}>
                                {q.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Code Runner Box (shown on desktop or when 'code' active on mobile) */}
                  <div className={`${mobilePreviewTab === 'notes' ? 'hidden md:block' : 'block'} mt-3 sm:mt-4 rounded-lg border border-white/[0.07] bg-[#07080C] p-3 sm:p-4 font-mono text-xs relative overflow-hidden`}>
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.05] text-zinc-400 text-[10px] sm:text-[11px]">
                      <div className="flex items-center gap-1.5 sm:gap-2 truncate mr-2">
                        <span className="text-zinc-300 font-medium">Judge0</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-zinc-400 truncate">{currentQuestion.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 font-mono text-[10px] sm:text-[11px] shrink-0">
                        <span className="text-zinc-500 hidden xs:inline">{currentQuestion.execTime}</span>
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium flex items-center gap-1 sm:gap-1.5 border ${currentQuestion.badgeColor}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {currentQuestion.badge}
                        </span>
                      </div>
                    </div>

                    <div className="text-zinc-400 space-y-1 text-[10px] sm:text-[11px] leading-relaxed min-h-[120px] sm:min-h-[140px] select-text overflow-x-auto pb-1 scrollbar-hide">
                      {currentQuestion.codeLines.map((line, lIdx) => (
                        <div
                          key={lIdx}
                          style={{ paddingLeft: `${line.indent * 1}rem` }}
                          className={`whitespace-nowrap ${line.isComment ? 'text-zinc-500' : 'text-zinc-300'}`}
                        >
                          {line.code}
                          {lIdx === currentQuestion.codeLines.length - 1 && (
                            <span className="inline-block w-1.5 h-3 bg-[#DE4444] ml-1.5 animate-cursor-blink align-middle" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Notes Module (shown on desktop or when 'notes' active on mobile) */}
                  <div className={`${mobilePreviewTab === 'code' ? 'hidden md:block' : 'block'} mt-4 sm:mt-5 rounded-xl border border-white/[0.08] bg-[#090A0F] overflow-hidden shadow-2xl font-mono relative`}>
                    <div className="p-3 sm:p-4 border-b border-white/[0.06] flex items-center justify-between bg-[#08090D]">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#DE4444]/15 text-[#F87171] flex items-center justify-center shrink-0">
                          <FileText className="size-3.5 sm:size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-white">Notes</span>
                            <span className="text-[11px] sm:text-xs text-zinc-500 font-normal">
                              {NOTE_SNIPPETS.length} notes
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-zinc-500 text-[10px] sm:text-xs flex items-center gap-1">
                          <Cloud className="size-3 text-zinc-400" />
                          <span>{notesAutosaveState}</span>
                        </span>
                        <button
                          onClick={() => switchNote((currentNoteIdx + 1) % NOTE_SNIPPETS.length)}
                          className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-mono font-medium text-white bg-[#DE4444] hover:bg-[#c93636] transition-all flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="size-3" /> New note
                        </button>
                      </div>
                    </div>

                    {/* Notes Split Layout */}
                    <div className="grid grid-cols-12 min-h-[220px]">
                      {/* Left Notes List */}
                      <div className="col-span-12 md:col-span-5 border-b md:border-b-0 md:border-r border-white/[0.05] p-3 space-y-2 bg-[#08090D]/50">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Search notes..."
                            className="w-full bg-[#121318] border border-white/10 rounded-md px-2.5 sm:px-3 py-1 text-zinc-200 text-[11px] placeholder-zinc-500 focus:outline-none"
                          />
                          <button className="px-2 py-1 rounded bg-[#DE4444]/15 border border-[#DE4444]/40 text-[#F87171] text-[10px] font-medium flex items-center gap-1 shrink-0">
                            <Edit3 className="size-3" /> Done
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              defaultChecked
                              className="rounded bg-[#121318] border-white/20 text-[#DE4444] w-3 h-3"
                            />
                            <span>Select all (3)</span>
                          </label>
                          <button
                            onClick={deleteActiveNote}
                            className="text-zinc-500 hover:text-[#F87171] flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="size-3" /> Delete
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-1 text-[11px]">
                          {NOTE_SNIPPETS.map((snippet, sIdx) => {
                            const isNoteActive = sIdx === currentNoteIdx;
                            return (
                              <div
                                key={snippet.title}
                                onClick={() => switchNote(sIdx)}
                                className={`p-2 sm:p-2.5 rounded-lg cursor-pointer flex flex-col gap-0.5 transition-all ${
                                  isNoteActive
                                    ? 'bg-[#DE4444]/10 border border-[#DE4444]/40 text-white'
                                    : 'bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`font-medium truncate ${isNoteActive ? 'text-white' : 'text-zinc-300'}`}>
                                    {snippet.title}
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ml-1 ${isNoteActive ? 'bg-[#DE4444]/20 text-[#F87171]' : 'bg-white/[0.05] text-zinc-400'}`}>
                                    {snippet.badge}
                                  </span>
                                </div>
                                <span className="text-[10px] text-zinc-500 truncate">{snippet.line1}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Note Viewer */}
                      <div className="col-span-12 md:col-span-7 p-3 sm:p-4 bg-[#090B10] flex flex-col justify-between relative">
                        <div>
                          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05]">
                            <div className="min-w-0 pr-2">
                              <h4 className="text-xs sm:text-sm font-bold text-zinc-200 truncate">{currentNote.title}</h4>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                                <span>Doc</span>
                                <span className="text-zinc-700">•</span>
                                <span className="px-1.5 py-0.5 rounded bg-[#DE4444]/15 text-[#F87171] truncate">
                                  {currentNote.badge}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300">
                                Write
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded text-zinc-500 hover:text-zinc-300 cursor-pointer">
                                Preview
                              </span>
                            </div>
                          </div>

                          {/* Markdown Format Bar */}
                          <div className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] text-zinc-400 text-xs overflow-x-auto scrollbar-hide">
                            <span className="px-1 py-0.5 font-bold hover:text-white cursor-pointer">B</span>
                            <span className="px-1 py-0.5 italic hover:text-white cursor-pointer">I</span>
                            <Code2 className="size-3 hover:text-white cursor-pointer" />
                            <span className="text-zinc-700">|</span>
                            <span className="text-[10px] text-zinc-500 hover:text-white cursor-pointer">H1</span>
                            <span className="text-[10px] text-zinc-500 hover:text-white cursor-pointer">H2</span>
                            <span className="text-zinc-700">|</span>
                            <Edit3 className="size-3 hover:text-white cursor-pointer" />
                          </div>

                          {/* Simulated Typing Editor */}
                          <div className="pt-2 sm:pt-3 text-[10px] sm:text-[11px] text-zinc-300 leading-relaxed font-mono space-y-1.5">
                            <div className="text-zinc-200">{currentNote.line1}</div>
                            <div className="text-zinc-500 text-[10px]">{currentNote.line2}</div>
                            <div className="p-2 sm:p-2.5 rounded bg-white/[0.02] border border-white/[0.04] text-[#F87171] relative font-mono text-[9px] sm:text-[10px] whitespace-pre-wrap overflow-x-auto">
                              {currentNote.code}
                              <span className="inline-block w-1.5 h-3 bg-[#DE4444] ml-1 align-middle animate-cursor-blink" />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-zinc-500 mt-2">
                          <span className="truncate mr-2">{currentNote.words}</span>
                          <span className="flex items-center gap-1 text-emerald-400 shrink-0">
                            <CheckCircle2 className="size-3" /> Autosaved
                          </span>
                        </div>

                        {/* Floating Undo Toast */}
                        {showUndoToast && (
                          <div className="absolute bottom-3 right-3 bg-[#141822] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono shadow-2xl flex items-center gap-2.5 z-20 animate-fade-in">
                            <span className="text-zinc-300 text-[10px]">Deleted note</span>
                            <button
                              onClick={() => setShowUndoToast(false)}
                              className="text-[#F87171] hover:text-white font-medium text-[10px] uppercase tracking-wider underline flex items-center gap-1"
                            >
                              <Undo2 className="size-3" /> Undo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 4. MANIFESTO & PHILOSOPHY STATEMENT                           */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-28 md:py-32 border-t border-white/[0.06] mt-16 sm:mt-24" id="manifesto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="font-mono text-xs text-[#DE4444] tracking-[0.2em] uppercase mb-4 sm:mb-6 font-semibold">
              00 / Manifesto
            </div>
            <blockquote className="text-xl sm:text-3xl md:text-5xl font-light text-zinc-100 tracking-[-0.025em] leading-[1.3] sm:leading-[1.25]">
              Beyond algorithms. Beyond messy tabs.{' '}
              <span className="text-zinc-500">
                Heuristiq is evolving into the complete quiet workspace for data structures, scalable system design, core computer science, and real-world engineering intuition.
              </span>
            </blockquote>
            <p className="mt-6 sm:mt-8 text-sm sm:text-base md:text-lg text-zinc-400 font-light leading-relaxed max-w-2xl">
              We stripped away distracting badges, XP counters, and cluttered feeds. From fundamental tree traversals to distributed message queues, database internals, and concurrency patterns, everything is designed to prepare you for high-impact technical rounds without cognitive fatigue.
            </p>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 5. CORE ARCHITECTURE / 6 REFINED PILLARS                      */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 border-t border-white/[0.06] bg-[#0A0C11]/50" id="architecture">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-3 sm:gap-4">
              <div>
                <div className="font-mono text-xs text-zinc-400 tracking-[0.2em] uppercase mb-2 sm:mb-3">
                  Engine Architecture
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Quiet by architecture.
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-mono text-zinc-500">ENGINEERED FOR DEEP COGNITIVE WORK</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Pillar 1 */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className="font-mono text-xs text-[#DE4444] tracking-wider uppercase mb-3 sm:mb-4">01 / Practice</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">Curated Problem Sheets.</h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Work through handpicked problem sets covering Blind 75, NeetCode, Core SDE tracks, and CP ladders with clear progress tracking.
                </p>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex flex-wrap items-center gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-[11px] text-zinc-400">
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">Blind 75</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">NeetCode 150</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">Top Sheets</span>
                </div>
              </div>

              {/* Pillar 2 */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className="font-mono text-xs text-[#DE4444] tracking-wider uppercase mb-3 sm:mb-4">02 / Real Interviews</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">290+ Company Question Banks.</h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Filter top asked questions asked recently by Google, Amazon, Meta, Uber, Bloomberg, and Goldman Sachs.
                </p>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex items-center gap-2 font-mono text-[10px] sm:text-[11px] text-zinc-400">
                  <span className="text-[#F87171] font-medium">Google</span>
                  <span className="text-zinc-600">/</span>
                  <span>Meta</span>
                  <span className="text-zinc-600">/</span>
                  <span>Amazon</span>
                  <span className="text-zinc-600">/</span>
                  <span>Uber</span>
                </div>
              </div>

              {/* Pillar 3 */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className="font-mono text-xs text-[#DE4444] tracking-wider uppercase mb-3 sm:mb-4">03 / Fast Execution</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">Built-in Code Runner.</h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Compile C++, Python, Java, and TypeScript instantly against your custom test cases right on the same screen.
                </p>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex items-center gap-3 font-mono text-[10px] sm:text-[11px] text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Custom Tests</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Instant Run</span>
                </div>
              </div>

              {/* Pillar 4 */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className="font-mono text-xs text-[#DE4444] tracking-wider uppercase mb-3 sm:mb-4">04 / Visual Learning</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">Interactive Algorithm Steps.</h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Step through BFS, Dijkstra, tree traversals, and recursion visually to understand how logic flows before coding.
                </p>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex items-center gap-3 font-mono text-[10px] sm:text-[11px] text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>Step-by-Step</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>Visual States</span>
                </div>
              </div>

              {/* Pillar 5 */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className="font-mono text-xs text-[#DE4444] tracking-wider uppercase mb-3 sm:mb-4">05 / Calendar</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">Live Contest Calendar.</h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Never miss an upcoming contest from LeetCode, Codeforces, or AtCoder, automatically converted to your local time.
                </p>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex items-center gap-2 font-mono text-[10px] sm:text-[11px] text-zinc-400">
                  <span>LeetCode</span>
                  <span className="text-zinc-600">●</span>
                  <span>Codeforces</span>
                  <span className="text-zinc-600">●</span>
                  <span>AtCoder</span>
                </div>
              </div>

              {/* Pillar 6 */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300">
                <div className="font-mono text-xs text-[#DE4444] tracking-wider uppercase mb-3 sm:mb-4">06 / Sync</div>
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">1-Click Profile Sync.</h3>
                <p className="mt-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Your notes and code stay saved on your device offline. Simply link your public username to sync solved problems.
                </p>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] flex items-center gap-3 font-mono text-[10px] sm:text-[11px] text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Offline First</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Zero Passwords</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 6. CLEAN WORKSPACE SHOWCASE (Floating Whiteboard & Video PiP)*/}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 border-t border-white/[0.06]" id="workflow">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-3xl mb-10 sm:mb-16">
              <div className="font-mono text-xs text-zinc-400 tracking-[0.2em] uppercase mb-2 sm:mb-3">
                Designed for Focus
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                Floating tools. Zero window shuffling.
              </h2>
              <p className="mt-2.5 sm:mt-3 text-zinc-400 font-light text-sm sm:text-base md:text-lg">
                Keep lectures, intuition notes, and whiteboard scratchpads floating in picture-in-picture right beside your code.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
              
              {/* Feature 1: Draggable Whiteboard & Scratchpad */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="font-mono text-xs text-zinc-400 tracking-wider uppercase">
                      Infinite Canvas
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#DE4444]" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Draggable Whiteboard & Scratchpad.</h3>
                  <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    Sketch pointer movements, tree rotations, or monotonic queue states on an infinite canvas with markdown intuition notes autosaved directly to local storage.
                  </p>
                </div>

                <div className="mt-6 sm:mt-8 p-3.5 sm:p-4 rounded-lg bg-[#07090E] border border-white/[0.05] font-mono text-xs">
                  <div className="flex items-center justify-between text-zinc-500 pb-2 border-b border-white/[0.05] mb-2.5 sm:mb-3">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Edit3 className="size-3.5 text-[#F87171]" />
                      scratchpad.canvas
                    </span>
                    <span className="text-zinc-600 text-[10px]">Autosaved to IndexedDB</span>
                  </div>
                  <div className="text-zinc-400 space-y-1.5 sm:space-y-2 text-[10px] sm:text-[11px] overflow-x-auto">
                    <div className="text-zinc-300"># Monotonic Queue Sliding Window Property</div>
                    <div className="text-zinc-500">// Elements stored in strictly descending order</div>
                    <div className="p-2 sm:p-2.5 rounded bg-white/[0.02] border border-white/[0.04] text-zinc-300 font-mono text-[10px] sm:text-[11px] leading-relaxed">
                      <div>[1, 3, -1, -3, 5, 3, 6, 7] &nbsp;k = 3</div>
                      <div className="text-[#F87171] mt-1">Deque indices: &lt;1 (3), 2 (-1)&gt; → Current Window Max: 3</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 2: Lecture Companion Mode with Animated Avatar & Audio Wave */}
              <div className="p-5 sm:p-7 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="font-mono text-xs text-zinc-400 tracking-wider uppercase">
                      Picture-in-Picture Tutor
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono text-[10px] text-zinc-400">Stream Live</span>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Curated video explanations right beside your code.
                  </h3>
                  <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-400 font-light leading-relaxed">
                    Watch top tutor problem breakdowns without switching tabs. The draggable mini-player floats right next to your editor with synced code walkthroughs.
                  </p>
                </div>

                {/* Picture-in-Picture Stream Pane */}
                <div className="mt-6 sm:mt-8 rounded-lg bg-[#06080C] border border-white/[0.07] font-mono text-xs overflow-hidden shadow-2xl relative">
                  {/* Stream Header Bar */}
                  <div className="flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 bg-[#090B10] border-b border-white/[0.05] text-zinc-400 text-[10px] sm:text-[11px]">
                    <div className="flex items-center gap-1.5 sm:gap-2 truncate pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DE4444] animate-ping shrink-0" />
                      <span className="text-zinc-200 font-medium truncate">lecture-stream.pip</span>
                      <span className="text-zinc-600 hidden xs:inline">/</span>
                      <span className="text-zinc-400 truncate hidden xs:inline">LC 239 Max</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-400 border border-white/[0.06] text-[9px] uppercase tracking-wider">
                        1080p
                      </span>
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Synced
                      </span>
                    </div>
                  </div>

                  {/* Visualizer Canvas with Responsive Avatar & Subtitles */}
                  <div className="p-3 sm:p-4 bg-[#080A10] relative min-h-[200px] sm:min-h-[220px] flex flex-col justify-between">
                    {/* Code walkthrough line */}
                    <div className="text-[10px] sm:text-[11px] font-mono leading-relaxed select-none text-zinc-400/90 mb-2 sm:mb-3">
                      <div>
                        <span className="text-[#F87171]">while</span> (!dq.empty() && nums[dq.back()] &lt; nums[i])
                      </div>
                      <div className="pl-3 sm:pl-4 text-zinc-300 flex items-center gap-2 mt-0.5 truncate">
                        <span>dq.pop_back(); <span className="text-zinc-500">// Prune</span></span>
                      </div>
                      <div className="text-zinc-400 mt-0.5">dq.push_back(i);</div>
                    </div>

                    {/* Sliding Window Array Visualizer */}
                    <div className="p-2.5 sm:p-3 rounded-lg bg-[#05060A] border border-white/[0.05] pr-20 sm:pr-32 relative">
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-zinc-400 mb-1.5 sm:mb-2">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-[#DE4444] font-medium">WINDOW [L, R]</span>
                          <span className="text-zinc-500 font-mono">k=3</span>
                        </div>
                        <span className="text-emerald-400 font-mono">Max=3</span>
                      </div>

                      <div className="relative py-1">
                        <div className="absolute top-0 bottom-0 w-[42px] xs:w-[50px] sm:w-[68px] border border-[#DE4444]/70 bg-[#DE4444]/10 rounded pointer-events-none animate-sliding-window" />
                        <div className="grid grid-cols-6 gap-1 sm:gap-1.5 text-center text-[11px] sm:text-xs font-mono">
                          <div className="py-0.5 sm:py-1 rounded bg-white/[0.02] text-zinc-300 border border-white/[0.03]">1</div>
                          <div className="py-0.5 sm:py-1 rounded bg-white/[0.02] text-zinc-200 border border-white/[0.03]">3</div>
                          <div className="py-0.5 sm:py-1 rounded bg-white/[0.02] text-zinc-400 border border-white/[0.03]">-1</div>
                          <div className="py-0.5 sm:py-1 rounded bg-white/[0.02] text-zinc-400 border border-white/[0.03]">-3</div>
                          <div className="py-0.5 sm:py-1 rounded bg-white/[0.02] text-zinc-300 border border-white/[0.03]">5</div>
                          <div className="py-0.5 sm:py-1 rounded bg-white/[0.02] text-zinc-300 border border-white/[0.03]">3</div>
                        </div>
                      </div>
                    </div>

                    {/* Closed Captions Bar */}
                    <div className="mt-2 pr-20 sm:pr-32">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded bg-black/60 border border-white/10 backdrop-blur-md text-[9px] sm:text-[10px] text-zinc-300 max-w-full">
                        <span className="text-[#F87171] font-bold flex items-center gap-1 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#DE4444]" />
                          CC:
                        </span>
                        <span className={`font-mono truncate transition-opacity duration-300 ${subtitleVisible ? 'opacity-100' : 'opacity-0'}`}>
                          {TUTOR_PHRASES[subtitleIdx]}
                        </span>
                      </div>
                    </div>

                    {/* Responsive Instructor Circular Feed Overlay */}
                    <div className="absolute right-2 sm:right-3.5 bottom-2 sm:bottom-3.5 flex flex-col items-center">
                      <div className="relative w-15 h-15 sm:w-22 sm:h-22 rounded-full p-0.5 bg-gradient-to-tr from-[#DE4444]/80 via-[#F87171]/40 to-transparent shadow-[0_0_24px_rgba(222,68,68,0.28)] animate-tutor-float">
                        <img
                          src="https://lh3.googleusercontent.com/aida/AEtjO1VHNBCzDf3OQSFANOApHdju-G9WmyKyIpSW7BuNaZulJT62AbG1hHm-5MWR5wPhhp25AFtzhGyPDPQwgkBrBkrWVs2u56XItRKotpM9KXnWVTs-yHc7xSNDC6xAAo8f1Jx6fIGcbuV45R8AUo_ghHzpy59m4eICC108PRlDbH6M25cIYeSZjLG2ZSdwbpcOdh2HJ1FWkV2olFEi47NbVv_czlaDuFuwC2pIhrZCtXkbUSFvSBo9Rs0-gVsj"
                          alt="Tutor Feed"
                          className="w-full h-full object-cover rounded-full brightness-105 contrast-105"
                        />
                        {/* Audio Equalizer */}
                        <div className="absolute top-0 right-0 px-1 py-0.5 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 flex items-end gap-[1.5px] h-3.5 sm:h-4">
                          <span className="w-[1.5px] sm:w-[2px] bg-[#F87171] rounded-full anim-bar-1 inline-block" />
                          <span className="w-[1.5px] sm:w-[2px] bg-[#F87171] rounded-full anim-bar-2 inline-block" />
                          <span className="w-[1.5px] sm:w-[2px] bg-emerald-400 rounded-full anim-bar-3 inline-block" />
                          <span className="w-[1.5px] sm:w-[2px] bg-[#F87171] rounded-full anim-bar-4 inline-block" />
                        </div>
                        {/* Online indicator */}
                        <span className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#08090D] flex items-center justify-center">
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping absolute" />
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 relative" />
                        </span>
                      </div>
                      <span className="mt-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[8px] sm:text-[9px] font-mono text-zinc-300 border border-white/10 flex items-center gap-1 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DE4444] animate-pulse" />
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Video Scrubber & Controls */}
                  <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-[#07080D] border-t border-white/[0.05]">
                    <div className="w-full bg-white/[0.06] h-1 rounded-full overflow-hidden relative">
                      <div className="bg-[#DE4444] h-full rounded-full animate-video-scrub" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1.5 sm:mt-2 font-mono">
                      <div className="flex items-center gap-2">
                        <Pause className="size-3 text-zinc-200" />
                        <span>14:20 / 22:45</span>
                      </div>
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-300 text-[9px]">1.25x</span>
                        <PictureInPicture2 className="size-3 hover:text-white cursor-pointer" />
                        <Maximize2 className="size-3 hover:text-white cursor-pointer" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 7. ROADMAP / ENGINEERING SCOPE                               */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 border-t border-white/[0.06] bg-[#07080C] relative" id="roadmap">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-16 gap-3 sm:gap-4">
              <div>
                <div className="font-mono text-xs text-[#DE4444] tracking-[0.2em] uppercase mb-2 sm:mb-3">
                  Engineering Scope & Roadmaps
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
                  Built for the full software engineering journey.
                </h2>
              </div>
              <p className="text-xs sm:text-sm font-mono text-zinc-500">
                FROM FIRST PRINCIPLES TO DISTRIBUTED ARCHITECTURE
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Track 1 */}
              <div className="p-5 sm:p-6 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#DE4444] uppercase tracking-wider font-semibold">Track 01</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active Now</span>
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">DSA & Problem Solving</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    Curated sheets, 290+ company banks, instant sandboxed code runner, and visual algorithm walkthroughs.
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] font-mono text-[10px] sm:text-[11px] text-zinc-400 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">Blind 75</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">NeetCode</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">Company Tags</span>
                </div>
              </div>

              {/* Track 2 */}
              <div className="p-5 sm:p-6 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#F87171] uppercase tracking-wider font-semibold">Track 02</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#DE4444]/10 text-[#F87171] border border-[#DE4444]/25">In Preview</span>
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">System Design (HLD & LLD)</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    Design YouTube, TinyURL, Uber backend, and rate limiters with interactive architecture diagrams and trade-off checklists.
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] font-mono text-[10px] sm:text-[11px] text-zinc-400 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">Scalability</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">Caching</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">Schema Design</span>
                </div>
              </div>

              {/* Track 3 */}
              <div className="p-5 sm:p-6 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Track 03</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/10">Upcoming</span>
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Core CS Fundamentals</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    Operating systems, database internals, computer networks, and concurrency patterns made intuitive and testable.
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] font-mono text-[10px] sm:text-[11px] text-zinc-400 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">OS & Threads</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">DBMS Indexing</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">TCP/IP</span>
                </div>
              </div>

              {/* Track 4 */}
              <div className="p-5 sm:p-6 rounded-xl bg-[#0E1117] border border-white/[0.06] hover:border-white/15 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Track 04</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/10">Upcoming</span>
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">Full-Stack Case Studies</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-light">
                    Real-world production engineering breakdowns, API design principles, and end-to-end architecture walkthroughs.
                  </p>
                </div>
                <div className="mt-5 pt-3.5 border-t border-white/[0.05] font-mono text-[10px] sm:text-[11px] text-zinc-400 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">REST & gRPC</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">Microservices</span>
                  <span className="px-2 py-0.5 rounded bg-white/[0.02] border border-white/5">DevOps</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 8. FEEDBACK & SUGGESTIONS MODULE                              */}
        {/* ============================================================ */}
        <section className="py-16 sm:py-24 border-t border-white/[0.06] bg-[#090B10]" id="feedback">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#DE4444]/10 border border-[#DE4444]/25 flex items-center justify-center text-[#F87171] shrink-0">
                <Send className="size-4" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">Feedback & Suggestions</h2>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">Bugs, ideas, missing sheets — direct to engineering.</p>
              </div>
            </div>

            {/* Note that user must be logged in first */}
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs font-mono text-amber-400">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> You must be logged in first to submit feedback. This form is for demo preview —{' '}
                <button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                  className="underline text-white hover:text-amber-300 font-medium cursor-pointer"
                >
                  log in here
                </button>{' '}
                to submit feedback directly to engineering.
              </span>
            </div>

            <div className="mt-6 p-4 sm:p-6 lg:p-8 rounded-xl bg-[#0E1117] border border-white/[0.06] shadow-2xl">
              <form onSubmit={onSendFeedback} className="space-y-4 sm:space-y-5 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-zinc-400 uppercase text-[10px] tracking-wider mb-1.5 sm:mb-2">Your name</label>
                    <input
                      type="text"
                      value={feedback.name}
                      onChange={(e) => setFeedback((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Alex Chen"
                      className="w-full bg-[#07080C] border border-white/10 rounded-lg px-3 sm:px-3.5 py-2 sm:py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#DE4444] text-xs transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 uppercase text-[10px] tracking-wider mb-1.5 sm:mb-2">Your email *</label>
                    <input
                      type="email"
                      required
                      value={feedback.email}
                      onChange={(e) => setFeedback((f) => ({ ...f, email: e.target.value }))}
                      placeholder="alex.chen@example.com"
                      className="w-full bg-[#07080C] border border-white/10 rounded-lg px-3 sm:px-3.5 py-2 sm:py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#DE4444] text-xs transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[10px] tracking-wider mb-1.5 sm:mb-2">Title</label>
                  <input
                    type="text"
                    value={feedback.title}
                    onChange={(e) => setFeedback((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Short summary — e.g. Add Striver 79 Sheet or CSES Tree Algorithms"
                    className="w-full bg-[#07080C] border border-white/10 rounded-lg px-3 sm:px-3.5 py-2 sm:py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#DE4444] text-xs transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 uppercase text-[10px] tracking-wider mb-1.5 sm:mb-2">Description *</label>
                  <textarea
                    rows={4}
                    required
                    value={feedback.description}
                    onChange={(e) => setFeedback((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What happened, what you expected, or what you'd love to see..."
                    className="w-full bg-[#07080C] border border-white/10 rounded-lg px-3 sm:px-3.5 py-2 sm:py-2.5 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#DE4444] text-xs transition-colors leading-relaxed resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 sm:pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-mono font-medium tracking-wide text-white bg-[#DE4444] hover:bg-[#c93636] transition-all shadow-[0_0_18px_rgba(222,68,68,0.3)] active:scale-95"
                  >
                    <Send className="size-3.5" />
                    <span>Send feedback</span>
                  </button>
                  <span className="text-[10px] text-zinc-500 font-mono">Response time ~ 24h</span>
                </div>
              </form>
            </div>

            {/* Transparency Note */}
            <div className="mt-5 sm:mt-6 p-3.5 sm:p-4 rounded-xl bg-[#07080C] border border-white/[0.04] text-[10px] sm:text-[11px] font-mono text-zinc-500 space-y-1.5">
              <div className="text-zinc-300 font-medium text-xs mb-1">How your data is handled:</div>
              <div className="flex items-start gap-2">
                <span className="text-zinc-600">●</span>
                <span>Everything in Heuristiq is saved to your device first (works offline), then synced when signed in.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-zinc-600">●</span>
                <span>Code runs on sandboxed Wandbox/Judge0 servers; transmitted only upon trigger.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-zinc-600">●</span>
                <span>Zero third-party trackers, zero advertising cookies.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* 9. UNDERSTATED BOTTOM CTA                                     */}
        {/* ============================================================ */}
        <section className="py-20 sm:py-28 border-t border-white/[0.06] relative overflow-hidden" id="launch">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[600px] h-[250px] sm:h-[280px] bg-[#DE4444]/[0.08] blur-[100px] sm:blur-[130px] pointer-events-none" />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <span className="font-mono text-xs text-[#DE4444] uppercase tracking-[0.2em] font-semibold">
              Ready to begin
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[-0.03em] mt-3 leading-snug sm:leading-tight">
              Ready to master software engineering?<br className="hidden sm:inline" /> Open your workspace in one click.
            </h2>
            <p className="mt-3.5 sm:mt-4 text-zinc-400 text-xs sm:text-base font-light max-w-md mx-auto">
              Experience interview preparation without the noise. Start solving directly in your browser with zero setup required.
            </p>
            <div className="mt-7 sm:mt-9 flex items-center justify-center gap-4">
              <button
                onClick={() => setSignInOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 sm:px-8 py-3.5 rounded-lg text-sm font-mono font-medium tracking-wide text-white bg-[#DE4444] hover:bg-[#c93636] transition-all shadow-[0_2px_26px_rgba(222,68,68,0.35)] active:scale-95"
              >
                <Terminal className="size-4" />
                <span>Enter Heuristiq</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ============================================================ */}
      {/* 10. MINIMALIST RESPONSIVE FOOTER                              */}
      {/* ============================================================ */}
      <footer className="w-full border-t border-white/[0.06] py-10 sm:py-12 bg-[#06070B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <img
              src={logoHorizontal}
              alt="Heuristiq"
              className="h-8 sm:h-10 w-auto object-contain brightness-125 contrast-125"
            />
            <span className="font-mono text-xs text-zinc-500">
              © {new Date().getFullYear()} Heuristiq. Engineered for quiet execution.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-mono text-xs text-zinc-500">
            <a href="#manifesto" className="hover:text-zinc-300 transition-colors">Manifesto</a>
            <a href="#sheets" className="hover:text-zinc-300 transition-colors">Sheets</a>
            <a href="#feedback" className="hover:text-zinc-300 transition-colors">Feedback</a>
            <a href="#launch" onClick={() => setSignInOpen(true)} className="hover:text-zinc-300 transition-colors">Sign in</a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 mt-6 border-t border-white/[0.04] text-center text-xs text-zinc-500 font-mono">
          Not affiliated with any platform it tracks.
        </div>
      </footer>

      {/* ============================================================ */}
      {/* 11. AUTHENTICATION MODAL & SEAMLESS ONBOARDING FLOW           */}
      {/* ============================================================ */}
      {signInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setSignInOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0F131C] p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] font-sans max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#DE4444]/15 text-[#F87171] flex items-center justify-center shrink-0">
                  <Terminal className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Launch Workspace</h3>
                  <p className="text-xs text-zinc-400">Choose your preferred entry method</p>
                </div>
              </div>
              <button
                onClick={() => setSignInOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3.5 font-mono text-xs">
              {/* Option 1: Google OAuth */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-white">Google Cloud Account</span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Check className="size-3" /> Auto Sync
                  </span>
                </div>
                <p className="text-zinc-400 text-[10px] sm:text-[11px] mb-3 leading-relaxed">
                  Seamlessly sync solved problems, bookmarks, whiteboard drawings, and notes across all your devices.
                </p>
                {isFirebaseConfigured ? (
                  <button
                    onClick={onGoogle}
                    disabled={googleBusy}
                    className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-white hover:bg-zinc-100 px-4 py-2.5 text-xs font-semibold text-zinc-900 transition-all shadow-sm border border-zinc-200 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    <svg viewBox="0 0 18 18" className="size-4 shrink-0" aria-hidden="true">
                      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.614Z" />
                      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.181l-2.91-2.258c-.805.54-1.835.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
                      <path fill="#FBBC05" d="M3.963 10.706A5.414 5.414 0 0 1 3.681 9c0-.592.102-1.168.282-1.706V4.962H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.038l3.007-2.332Z" />
                      <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.454 3.441 1.345l2.581-2.581C13.464.892 11.427 0 9 0A9 9 0 0 0 .956 4.962l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
                    </svg>
                    <span>{googleBusy ? 'Connecting...' : 'Continue with Google'}</span>
                  </button>
                ) : (
                  <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[10px] sm:text-[11px] text-amber-400">
                    Firebase Cloud Sync not configured on this local instance.
                  </p>
                )}
              </div>

              {/* Option 2: Guest Mode */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-white">Guest Session</span>
                  <span className="text-[10px] text-zinc-400">Instant Access</span>
                </div>
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 sm:px-3 py-2 text-[10px] leading-relaxed text-amber-400">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  <span>Saves to your browser storage (IndexedDB). Clearing cache will wipe progress.</span>
                </div>
                <button
                  onClick={onGuest}
                  className="w-full rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors active:scale-95"
                >
                  Continue as Guest
                </button>
              </div>

              {/* Option 3: Email & Password */}
              <div className="pt-1.5 text-center">
                <button
                  onClick={() => {
                    setSignInOpen(false);
                    setAuthCardOpen(true);
                  }}
                  className="text-xs text-[#F87171] hover:text-white transition-colors underline"
                >
                  Prefer email & password? Sign in here
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email/Password Modal */}
      {authCardOpen && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto bg-black/80 p-3 sm:p-4 backdrop-blur-md"
          onClick={() => setAuthCardOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <AuthPage />
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
