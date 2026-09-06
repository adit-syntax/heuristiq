# ⚡ Heuristiq — Comprehensive DSA Prep & Engineering Workspace

<div align="center">

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase_Auth_%26_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Monaco Editor](https://img.shields.io/badge/Monaco_Editor-1E1E1E?style=for-the-badge&logo=visualstudiocode&logoColor=007ACC)
![Excalidraw](https://img.shields.io/badge/Excalidraw-6965DB?style=for-the-badge&logo=excalidraw&logoColor=white)
![Wandbox](https://img.shields.io/badge/Wandbox_API-Compiler-blueviolet?style=for-the-badge)

**An all-in-one, offline-first engineering workstation for Data Structures & Algorithms, interview prep, algorithm visualization, and competitive programming.**

[Features](#-key-features) • [Architecture](#-system-architecture) • [Tech Stack](#-tech-stack--tooling) • [Future Roadmap](#-future-roadmap--engineering-initiatives) • [Setup](#-getting-started) • [Security](#-security--storage-model)

</div>

---

## 📖 Overview

**Heuristiq** is a modern, high-performance web platform built to replace fragmented DSA study workflows. Instead of juggling separate browser tabs for problem sheets, code editors, whiteboards, notes, contest trackers, and analytics, Heuristiq brings everything together into a cohesive, keyboard-first, distraction-free environment.

Built with an **offline-first caching architecture**, user progress, notes, code drafts, and canvas diagrams are persisted locally in `localStorage` first and asynchronously synchronized with Google Cloud Firestore upon authentication.

---

## 🛠️ Tech Stack & Tooling

### Core Technologies

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Concurrent rendering, hooks-based modular architecture |
| **Build Tool** | **Vite 7** | Lightning-fast HMR and optimized Rollup code-splitting |
| **Styling & Theme** | **Tailwind CSS 4** | Glassmorphism, tailored HSL color tokens, dark/light aesthetics |
| **Code Editor** | **Monaco Editor** | The VS Code editor engine running directly in the browser |
| **Remote Compiler** | **Wandbox Sandbox API** | Zero-auth remote sandboxed code execution for C++, Java, Python, JS, C |
| **Canvas & Sketching** | **Excalidraw** | Embedded vector whiteboard with multi-scene autosaving |
| **Cloud & Database** | **Firebase Auth & Firestore** | Google OAuth, Email/Password auth, and real-time cloud document sync |
| **Icons & Typography** | **Lucide React & Akira** | Modern geometric iconography and custom display fonts |
| **Formula Rendering** | **KaTeX** | Ultra-fast LaTeX math rendering for algorithm complexity |

---

## 🏗️ System Architecture

Heuristiq follows a decoupled, client-centric architecture. The client handles state management, local indexing, and offline persistence, while Firebase provides secure document storage and authentication.

```mermaid
graph TD
    User([User Browser]) --> UI[Heuristiq SPA / React 19]
    
    subgraph Client Workstation
        UI --> Router[Hash Router & Tab Switcher]
        UI --> Search[Search Index & Cmd+K Palette]
        UI --> Editor[Monaco Code Runner]
        UI --> Visualizer[Algorithm Step Simulator]
        UI --> Canvas[Excalidraw Whiteboard]
        
        Router --> Cache[(Local Storage Cache)]
        Search --> Cache
        Editor --> Wandbox[Wandbox API Execution Sandbox]
    end

    subgraph Cloud Persistence & Services
        Cache -.->|Debounced Sync| SyncEngine[useSyncedDoc Engine]
        SyncEngine --> Firestore[(Cloud Firestore)]
        UI --> FirebaseAuth[Firebase Authentication]
        UI --> EmailJS[EmailJS Feedback Pipeline]
        UI --> ContestAPI[Live Contest Calendar Feeds]
    end
```

### Data Flow & Offline-First Synchronization

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React App
    participant LS as LocalStorage (Instant)
    participant Bus as Custom Event Bus
    participant FS as Cloud Firestore

    User->>App: Solves problem / Edits code / Modifies note
    App->>LS: Write payload immediately (0ms delay)
    App->>Bus: Dispatch localized update event
    App-->>User: Optimistic UI update with zero latency
    
    critical Cloud Sync
        App->>App: Debounce changes (800ms)
        alt User Signed In
            App->>FS: Upsert document to users/{uid}/data/...
            FS-->>App: Sync acknowledgment
        else Guest Mode
            App->>App: Keep cached locally without sync
        end
    end
```

---

## 🌟 Key Features

### 1. 10 Curated Problem Sheets & Canonical Deduplication
* **Striver A2Z DSA Sheet:** 455+ structured problems covering arrays to dynamic programming.
* **Top Industry Collections:** Blind 75, NeetCode 150, CodeStoryWithMIK, Top Interview 150, CSES Problem Set, CP-31 (800–1600 rated), and SQL 50.
* **Canonical Identity System (CID):** Cross-sheet deduplication ensures that solving "Two Sum" in Blind 75 automatically reflects as solved in Striver A2Z and NeetCode 150.

### 2. 50+ Top Tech Companies Question Tracker
* Real company-tagged question registries compiled for **Google, Amazon, Meta, Microsoft, Apple, Uber, Netflix, Bloomberg, Oracle, Salesforce, and 40+ others**.
* Filter questions by company frequency, difficulty, and completion status.

### 3. In-App Monaco Code Runner
* Integrated VS Code Monaco Editor supporting **C++, Java, Python, JavaScript, and C**.
* Execute code directly against custom test inputs using the Wandbox sandbox runtime.
* Code drafts autosave locally per question.

### 4. Interactive Algorithm Visualizer
* Visual, step-by-step simulations for understanding inner algorithmic mechanics:
  * **Sorting:** Bubble Sort, Selection Sort, Insertion Sort, Merge Sort, Quick Sort.
  * **Searching:** Linear Search, Binary Search.
  * **Pathfinding & Graphs:** Breadth-First Search (BFS) and Depth-First Search (DFS) on grid topologies.
* Play, pause, step forward/backward, and adjust execution speed dynamically.

### 5. Multi-Board Whiteboard (Excalidraw)
* Hand-drawn vector canvas for sketching tree traversals, graph cycles, system architectures, and memory layouts.
* Available both as a dedicated workspace and as a **global floating canvas modal** accessible from any tab.

### 6. Analytics & Solve Streaks Dashboard
* Comprehensive visual metrics: total questions solved, category completion breakdown, weekly activity bar charts, consistency calendars, and daily todos.

### 7. Contest Calendar & Live Tracker
* Real-time schedule monitoring upcoming contests across **Codeforces, LeetCode, CodeChef, and AtCoder**.
* Global sticky banner alerting developers to active or imminent contests with direct links.

### 8. Keyboard-First Navigation & Global Search
* Hit `Ctrl + K` (or `Cmd + K`) anywhere to summon the command palette.
* Search instantaneously through all 1,000+ problems, roadmaps, and company registries with fuzzy matching.

---

## 🚀 Future Roadmap & Engineering Initiatives

Heuristiq is evolving into a full-scale collaborative developer ecosystem. The following high-impact features are slated for upcoming releases:

### 🎮 1. Real-Time Multiplayer Collaborative IDE
> **A simplified Google Docs + VS Code multiplayer platform where multiple engineers can edit, discuss, and execute code simultaneously.**

* **Collaborative Coding Rooms:** Instantly spin up a private room with shareable invite codes and cryptographic room tokens.
* **Simultaneous Multi-User File Editing:** Multiple users editing the exact same file in real-time with zero lag.
* **Live Presence & Cursors:** Color-coded cursor positions, text selections, and user tags for every active participant.
* **In-Room Chat & Audio:** Low-latency chat and voice channels embedded directly inside the coding session.
* **Simultaneous Code Execution:** Shared stdout/stderr console allowing any participant to run the code and review test results together.
* **Granular Room Permissions:** Host, Editor, and Spectator roles to prevent unauthorized tampering during interview or pairing sessions.
* **Version History & Session Recording:** Time-travel debugging with full session recording and playback to review how a solution evolved step-by-step.
* **The Engineering Challenge (The "Hard Part"):**
  * Implementing **WebSockets** coupled with **Conflict-free Replicated Data Types (CRDTs / Yjs)** or **Operational Transformation (OT)** algorithms.
  * Handling network jitter, causal consistency, split-brain reconnections, and race conditions so concurrent edits from users with high-latency connections never overwrite or clobber each other.

---

### 🧠 2. Context-Aware AI Question Assistant
* **Socratic Hint Engine:** Step-by-step hints and algorithmic guidance tailored to the user's specific progress without spoiling the entire solution.
* **Draft Code Diagnostician:** Analyzes user code in the Monaco Editor to spot subtle off-by-one errors, infinite loops, and unhandled edge cases.
* **Complexity Auditor:** Explains time and space complexity with Big-O breakdown based on the user's written implementation.

---

### 📚 3. RAG Pipeline for Lecture Summaries & Study Material
* **Retrieval-Augmented Generation (RAG):** Integration with YouTube video playlists (Striver, Love Babbar, CodeStoryWithMIK).
* **Vector Semantic Search:** Video transcripts and study guides chunked and vectorized (ChromaDB / Pinecone embeddings).
* **Instant Concept Extraction:** Query any video or study doc to get concise TL;DR summaries, key pseudocode, and timestamp deep-links directly to the explanation.

---

### ⚔️ 4. Competitive Programming Arena & 1v1 Code Battles
* **Live Head-to-Head Showdowns:** Real-time 1v1 matches where participants race to solve DSA problems within time constraints.
* **Elo-Based Matchmaking:** Dynamic leaderboard and skill ratings adjusting with wins and losses.
* **Automated Judge Pipeline:** Automated test case validation with memory and time limit enforcement.

---

### 👥 5. Developer Social Graph & Community Hub
* **Follow / Following System:** Follow peers, track their daily solve streaks, and view activity feeds.
* **Direct & Group Messaging:** Real-time chat for discussing problem strategies, interview experiences, and company hiring trends.
* **Solution Sharing & Peer Code Reviews:** Publish documented solutions for community feedback, upvotes, and alternative approaches.

---

### 🏛️ 6. Core Computer Science, MCQs & System Design
* **Core CS Foundations:** Dedicated revision sheets and notes for **Operating Systems (OS), Database Management Systems (DBMS), Computer Networks (CN), and Object-Oriented Programming (OOPS)**.
* **Timed MCQ Bank:** Quiz engine with explanations covering standard placement and GATE-level CS concepts.
* **System Design Interactive Primer:** High-Level Design (HLD) and Low-Level Design (LLD) architectural templates, visual blueprints, and case studies (Rate Limiter, URL Shortener, Chat System, Video Streaming).

---

### 🔬 7. Next-Gen Algorithm Visualizations
* **Dynamic Programming Matrix Visualizer:** Visual 2D table fill-ups showcasing memoization and tabulation state transitions.
* **Tree & Graph Topologies:** Interactive node manipulation for Red-Black Trees, AVL rotations, Tries, Segment Trees, and Dijkstra's / Floyd-Warshall algorithms.

---

## 💻 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/adit-syntax/heuristiq.git
   cd heuristiq
   ```

2. **Navigate to the frontend workspace & install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.

4. **Run production build:**
   ```bash
   npm run build
   ```

5. **Run live checks & unit tests:**
   ```bash
   npm run check
   ```

---

## 🔒 Security & Storage Model

| Data Domain | Guest Mode | Authenticated User |
| :--- | :--- | :--- |
| **Progress & Solves** | `localStorage` (`heuristiq_solved`) | Synced to `users/{uid}/data/progress` |
| **User Notes** | `localStorage` (`heuristiq_notes`) | Synced to `users/{uid}/data/notes` |
| **Code Drafts** | `localStorage` (`heuristiq_code`) | Synced to `users/{uid}/data/code` |
| **Whiteboard Canvases** | `localStorage` (`heuristiq_boards`) | Synced to `users/{uid}/data/boards` |

### Cloud Security Rules
Firestore rules enforce that every document in `users/{userId}/data/{docId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`. Guest mode operates completely locally without exposing data over the wire.

To deploy Firestore rules:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 👤 Author & Contributor

**Aditya Singh**
* GitHub: [@adit-syntax](https://github.com/adit-syntax)
* Email: [aditsyntax@gmail.com](mailto:aditsyntax@gmail.com)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — feel free to use, modify, and build upon this project.
