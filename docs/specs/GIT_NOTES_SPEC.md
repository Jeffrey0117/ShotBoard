# Git-Based Notes Storage 規格書

## 📋 Executive Summary

### 想法評估：⭐⭐⭐⭐⭐ 非常棒的想法！

**核心價值主張**：使用 Git 作為筆記儲存後端，將軟體開發的版本控制優勢帶入筆記管理領域。

---

## 🎯 為什麼這是一個好想法

### 優勢分析

| 優勢 | 說明 | 商業價值 |
|------|------|---------|
| **版本歷史** | 每次保存都是一個 commit，可追溯所有變更 | 適合知識工作者、研究人員 |
| **分支實驗** | 可用分支嘗試不同的筆記組織方式 | 降低重組織風險 |
| **離線優先** | Git 本地優先，無需網路即可工作 | 隱私保護、隨處可用 |
| **多設備同步** | 透過 remote 同步，支援衝突解決 | 真正的多設備體驗 |
| **開放格式** | Markdown + 純文字，不鎖定用戶 | 長期可用性保證 |
| **差異比對** | Git diff 顯示精確變更 | 回顧與學習 |
| **備份策略** | Push 到 GitHub/GitLab 即雲端備份 | 資料安全 |
| **協作潛力** | 支援 PR/MR 工作流程 | 團隊知識庫 |

### 與競品對比

| 功能 | ShotBoard + Git | Notion | Obsidian | LogSeq |
|------|----------------|--------|----------|--------|
| 版本歷史 | ✅ 完整 Git 歷史 | ⚠️ 有限 | ❌ 外掛 | ❌ 外掛 |
| 離線優先 | ✅ 完全離線 | ❌ 需網路 | ✅ 離線 | ✅ 離線 |
| 開放格式 | ✅ Markdown | ❌ 私有 | ✅ Markdown | ✅ Markdown |
| 衝突解決 | ✅ Git 合併 | ⚠️ 覆蓋 | ❌ 無 | ❌ 無 |
| 白板整合 | ✅ Excalidraw | ⚠️ 有限 | ❌ 外掛 | ❌ 外掛 |
| 簡報功能 | ✅ 內建 | ❌ 無 | ❌ 外掛 | ❌ 外掛 |

---

## ⚠️ 挑戰與解決方案

### 1. 二進制資產處理
**問題**：圖片、白板資料等二進制檔案會讓 Git repo 膨脹

**解決方案**：
- 使用 Git LFS 處理大型資產
- 或將資產存於獨立資料夾，設定 `.gitattributes`
- 白板資料轉為 JSON 格式儲存（Excalidraw 原生支援）

### 2. 自動儲存衝突
**問題**：頻繁自動儲存產生過多 commit

**解決方案**：
- 智慧合併：debounce 儲存，累積變更
- 背景 stash：暫存區快取未完成編輯
- 手動標記：重要版本加 tag

### 3. 非技術用戶
**問題**：Git 概念對一般用戶太複雜

**解決方案**：
- UI 抽象：用「版本」取代「commit」
- 一鍵操作：「儲存版本」、「回到過去」
- 隱藏複雜性：自動處理 merge、rebase

### 4. 合併衝突處理
**問題**：多設備編輯可能產生衝突

**解決方案**：
- 圖形化合併工具
- 三向對比介面
- 衝突標記預覽

---

## 🏗️ 技術架構設計

### 整體架構

```
┌─────────────────────────────────────────────────────────┐
│                    ShotBoard UI                          │
├─────────────────────────────────────────────────────────┤
│  NoteStore  │  PageStore  │  SlideStore  │  GitStore    │
├─────────────────────────────────────────────────────────┤
│              Git Service Layer (isomorphic-git)          │
├─────────────────────────────────────────────────────────┤
│                   File System (Node.js fs)               │
└─────────────────────────────────────────────────────────┘
```

### 目錄結構

```
~/.shotboard/
├── config.json                 # 應用設定
└── notebooks/
    └── {notebook-name}/        # 每個筆記本是一個 Git repo
        ├── .git/
        ├── .gitignore
        ├── .gitattributes      # LFS 設定
        ├── notes/
        │   ├── {note-id}.md    # Markdown 筆記
        │   └── ...
        ├── whiteboards/
        │   ├── {wb-id}.excalidraw.json
        │   └── ...
        ├── assets/
        │   ├── images/
        │   └── files/
        ├── slides/
        │   └── {slide-id}.md
        └── .shotboard/
            ├── metadata.json   # 資料夾結構、標籤等
            └── thumbnails/     # 縮圖快取
```

### 新增 Store: `useGitStore`

```typescript
// src/stores/gitStore.ts
interface GitState {
  // 狀態
  currentNotebook: string | null;
  isInitialized: boolean;
  isDirty: boolean;
  lastCommit: CommitInfo | null;
  remotes: RemoteInfo[];
  branches: BranchInfo[];
  currentBranch: string;

  // 動作
  initNotebook: (name: string) => Promise<void>;
  openNotebook: (path: string) => Promise<void>;

  // 版本控制
  saveVersion: (message?: string) => Promise<string>;  // commit
  getHistory: (limit?: number) => Promise<CommitInfo[]>;
  checkout: (commitHash: string) => Promise<void>;

  // 分支
  createBranch: (name: string) => Promise<void>;
  switchBranch: (name: string) => Promise<void>;
  mergeBranch: (name: string) => Promise<MergeResult>;

  // 同步
  addRemote: (name: string, url: string) => Promise<void>;
  push: (remote?: string) => Promise<void>;
  pull: (remote?: string) => Promise<PullResult>;

  // 衝突處理
  getConflicts: () => ConflictInfo[];
  resolveConflict: (file: string, resolution: 'ours' | 'theirs' | 'merge') => Promise<void>;
}
```

### 核心服務: `GitService`

```typescript
// src/services/gitService.ts
import * as git from 'isomorphic-git';
import * as fs from 'fs';
import http from 'isomorphic-git/http/node';

class GitService {
  private dir: string;

  // 初始化
  async init(dir: string): Promise<void>;
  async clone(url: string, dir: string): Promise<void>;

  // 基本操作
  async add(filepath: string): Promise<void>;
  async commit(message: string, author: Author): Promise<string>;
  async status(): Promise<StatusMatrix>;

  // 歷史
  async log(options?: LogOptions): Promise<CommitObject[]>;
  async diff(commitA: string, commitB: string): Promise<DiffResult>;

  // 分支
  async branch(name: string): Promise<void>;
  async checkout(ref: string): Promise<void>;
  async merge(theirBranch: string): Promise<MergeResult>;

  // 遠端
  async addRemote(name: string, url: string): Promise<void>;
  async push(options: PushOptions): Promise<PushResult>;
  async pull(options: PullOptions): Promise<void>;
  async fetch(options: FetchOptions): Promise<void>;
}
```

### 與現有 Store 整合

```typescript
// src/stores/noteStore.ts (修改)
export const useNoteStore = create<NoteState>((set, get) => ({
  // ... 現有程式碼 ...

  // 新增：與 Git 整合
  saveAndCommit: async (noteId: string, message?: string) => {
    const note = get().notes.get(noteId);
    if (!note) return;

    // 1. 儲存到檔案
    await fileService.writeNote(noteId, note);

    // 2. Git commit
    const gitStore = useGitStore.getState();
    await gitStore.saveVersion(message || `Update: ${note.title}`);
  },

  // 新增：從 Git 載入
  loadFromGit: async (notebookPath: string) => {
    const notes = await fileService.readAllNotes(notebookPath);
    set({ notes: new Map(notes.map(n => [n.id, n])) });
  },
}));
```

---

## 🎨 UI/UX 設計

### 1. 版本歷史面板

```
┌────────────────────────────────────┐
│ 📜 版本歷史          [同步] [設定] │
├────────────────────────────────────┤
│ ○ 現在 - 未儲存變更                 │
│ │                                  │
│ ● 10 分鐘前                        │
│ │ "更新會議筆記"                    │
│ │                                  │
│ ● 昨天 15:30                       │
│ │ "新增專案規劃章節"                │
│ │                                  │
│ ● 2024/12/27                       │
│   "初始版本"                        │
├────────────────────────────────────┤
│ [儲存版本] [比較] [回復]            │
└────────────────────────────────────┘
```

### 2. 儲存版本對話框

```
┌────────────────────────────────────┐
│ 💾 儲存版本                         │
├────────────────────────────────────┤
│ 這次改了什麼？                       │
│ ┌────────────────────────────────┐ │
│ │ 新增會議重點與待辦事項           │ │
│ └────────────────────────────────┘ │
│                                    │
│ 變更摘要：                          │
│ • 修改：會議筆記.md (+15行, -3行)   │
│ • 新增：附件/流程圖.excalidraw      │
│                                    │
│     [取消]  [儲存版本]              │
└────────────────────────────────────┘
```

### 3. 同步面板

```
┌────────────────────────────────────┐
│ ☁️ 雲端同步                         │
├────────────────────────────────────┤
│ 📍 GitHub: my-notes (已連結)        │
│    上次同步：5 分鐘前               │
│                                    │
│ 本地 ●───────────────● 雲端        │
│      ↑ 3 個版本未上傳               │
│                                    │
│ [立即同步] [中斷連結]               │
├────────────────────────────────────┤
│ ＋ 新增雲端位置                      │
│   • GitHub                          │
│   • GitLab                          │
│   • 自訂 Git 伺服器                  │
└────────────────────────────────────┘
```

### 4. 衝突解決介面

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ 發現衝突：會議筆記.md                                  │
├──────────────────────┬──────────────────────────────────┤
│ 本地版本             │ 雲端版本                          │
├──────────────────────┼──────────────────────────────────┤
│ ## 會議筆記          │ ## 會議筆記                       │
│                      │                                  │
│ ### 待辦事項         │ ### 待辦事項                      │
│ - [x] 完成報告       │ - [ ] 完成報告                    │
│ - [ ] 發送郵件  ←衝突→│ - [x] 發送郵件                    │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│ [使用本地] [使用雲端] [手動合併]                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 依賴套件

```json
{
  "dependencies": {
    "isomorphic-git": "^1.25.0",      // 純 JS Git 實現
    "diff": "^5.1.0",                  // 差異比對
    "diff2html": "^3.4.0",             // 差異視覺化
    "@electron/remote": "^2.1.0"       // Electron 主進程存取
  }
}
```

### 為什麼選 isomorphic-git？

| 特性 | isomorphic-git | 直接呼叫 git CLI |
|------|---------------|-----------------|
| 跨平台 | ✅ 純 JS | ⚠️ 需安裝 Git |
| 包大小 | ~2MB | 0 (外部依賴) |
| 性能 | ⚠️ 中等 | ✅ 原生速度 |
| 功能完整 | ✅ 大部分 | ✅ 完整 |
| 錯誤處理 | ✅ JS 原生 | ⚠️ 需解析輸出 |

**建議**：使用 isomorphic-git 保證用戶無需安裝 Git，降低使用門檻。

---

## 🚀 實施計劃

### Phase 1: 基礎建設 (MVP)

**目標**：單機版本控制

- [ ] 建立 `GitService` 核心服務
- [ ] 建立 `useGitStore` 狀態管理
- [ ] 筆記本初始化為 Git repo
- [ ] 筆記儲存為 .md 檔案
- [ ] 白板儲存為 .excalidraw.json
- [ ] 手動儲存版本（commit）
- [ ] 版本歷史查看
- [ ] 單一版本回復

### Phase 2: 歷史與比對

**目標**：版本視覺化

- [ ] 版本歷史面板 UI
- [ ] 差異比對視圖（diff view）
- [ ] 版本預覽（不實際切換）
- [ ] 檔案層級變更追蹤
- [ ] 版本標記（tag）

### Phase 3: 分支與實驗

**目標**：安全的內容實驗

- [ ] 分支建立與切換
- [ ] 分支合併
- [ ] 衝突偵測與標記
- [ ] 基本衝突解決 UI

### Phase 4: 雲端同步

**目標**：多設備支援

- [ ] 遠端設定介面
- [ ] GitHub/GitLab OAuth 整合
- [ ] Push/Pull 操作
- [ ] 自動同步（可選）
- [ ] 完整衝突解決 UI

### Phase 5: 進階功能

**目標**：專業用戶需求

- [ ] Git LFS 整合
- [ ] 多筆記本管理
- [ ] 協作邀請（透過 repo 權限）
- [ ] 變更通知

---

## 💡 創新機會

### 1. 「時光膠囊」功能
自動在重要時刻（如：月底、專案里程碑）創建帶標記的版本。

### 2. 「知識圖譜版本化」
追蹤筆記間連結的變化，視覺化知識結構演進。

### 3. 「AI 版本摘要」
使用 AI 自動生成 commit message，描述本次變更重點。

### 4. 「協作審閱」
借鑑 PR 工作流程，讓團隊成員可審閱知識庫變更。

---

## 🏁 結論

**Git 筆記儲存**是一個高價值、可行的功能，特別適合：

1. **目標用戶**：開發者、研究人員、知識工作者
2. **核心價值**：版本歷史 + 離線優先 + 開放格式
3. **技術可行性**：isomorphic-git 提供完整支援
4. **差異化優勢**：市面上少有整合 Git 的白板+筆記工具

**建議**：從 Phase 1 開始，先實現單機版本控制，驗證用戶反饋後再擴展。

---

## 📎 附錄

### A. 相關資源
- [isomorphic-git 文檔](https://isomorphic-git.org/)
- [Excalidraw JSON 格式](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/initialdata#excalidrawelements)
- [Git LFS 規格](https://git-lfs.github.com/)

### B. 市場參考
- Obsidian Git Plugin（社群外掛）
- GitJournal（純 Git 筆記 App）
- Dendron（VS Code 知識管理）

---

*文件版本：1.0*
*最後更新：2024/12/28*
