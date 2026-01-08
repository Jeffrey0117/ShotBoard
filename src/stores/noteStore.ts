/**
 * Note Management Store
 * Zustand store for managing notes, folders, tags, and search
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  Note,
  Folder,
  Tag,
  EmbeddedWhiteboard,
  NoteAsset,
  NoteSortOption,
  EditorViewMode,
  SearchResult,
  SearchMatch,
  FileTreeNode,
  ExcalidrawSceneData,
} from '../types/note';

// Default tag colors
const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

// ID generation
const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Current ISO timestamp
const now = () => new Date().toISOString();

interface NoteStoreState {
  // Data
  notes: Map<string, Note>;
  folders: Map<string, Folder>;
  tags: Map<string, Tag>;
  whiteboards: Map<string, EmbeddedWhiteboard>;
  assets: Map<string, NoteAsset>;

  // UI State
  activeNoteId: string | null;
  selectedFolderId: string | null;
  filterTagIds: string[];
  searchQuery: string;
  sortOption: NoteSortOption;
  editorViewMode: EditorViewMode;
  hasUnsavedChanges: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';

  // Sidebar state
  sidebarWidth: number;
  isSidebarCollapsed: boolean;

  // Search history
  searchHistory: string[];

  // Workspace state
  workspacePath: string | null;
  isLoading: boolean;
  loadError: string | null;
}

interface NoteStoreActions {
  // Note operations
  createNote: (folderId?: string, title?: string) => string;
  updateNote: (id: string, updates: Partial<Pick<Note, 'title' | 'content' | 'tagIds' | 'frontMatter'>>) => void;
  deleteNote: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  moveNote: (noteId: string, targetFolderId: string) => void;
  duplicateNote: (id: string) => string;

  // Folder operations
  createFolder: (name: string, parentId?: string | null) => string;
  updateFolder: (id: string, updates: Partial<Pick<Folder, 'name' | 'order'>>) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (folderId: string, targetParentId: string | null) => void;
  toggleFolderExpanded: (id: string) => void;

  // Tag operations
  createTag: (name: string, color?: string) => string;
  updateTag: (id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) => void;
  deleteTag: (id: string) => void;
  addTagToNote: (noteId: string, tagId: string) => void;
  removeTagFromNote: (noteId: string, tagId: string) => void;

  // Whiteboard operations
  createWhiteboard: (noteId: string) => string;
  updateWhiteboard: (id: string, sceneData: ExcalidrawSceneData) => void;
  deleteWhiteboard: (id: string) => void;

  // Asset operations
  addAsset: (noteId: string, fileName: string, mimeType: string, size: number, relativePath: string) => string;
  deleteAsset: (id: string) => void;

  // UI state operations
  setActiveNote: (id: string | null) => void;
  setSelectedFolder: (id: string | null) => void;
  setFilterTags: (tagIds: string[]) => void;
  toggleFilterTag: (tagId: string) => void;
  setSearchQuery: (query: string) => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  setSortOption: (option: NoteSortOption) => void;
  setEditorViewMode: (mode: EditorViewMode) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved' | 'error') => void;

  // Search
  searchNotes: (query: string) => SearchResult[];

  // File tree
  getFileTree: () => FileTreeNode[];
  getFilteredNotes: () => Note[];
  getSortedNotes: (notes: Note[]) => Note[];

  // Helpers
  getNoteById: (id: string) => Note | undefined;
  getFolderById: (id: string) => Folder | undefined;
  getTagById: (id: string) => Tag | undefined;
  getNotesInFolder: (folderId: string) => Note[];
  getNotesByTag: (tagId: string) => Note[];
  getAllTags: () => Tag[];
  getTagUsageCount: (tagId: string) => number;

  // Persistence helpers
  exportState: () => ExportedState;
  importState: (state: ExportedState) => void;
  reset: () => void;

  // Workspace operations
  setWorkspacePath: (path: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
}

interface ExportedState {
  notes: Note[];
  folders: Folder[];
  tags: Tag[];
  whiteboards: EmbeddedWhiteboard[];
  assets: NoteAsset[];
}

type NoteStore = NoteStoreState & NoteStoreActions;

// Initial state
const initialState: NoteStoreState = {
  notes: new Map(),
  folders: new Map(),
  tags: new Map(),
  whiteboards: new Map(),
  assets: new Map(),
  activeNoteId: null,
  selectedFolderId: null,
  filterTagIds: [],
  searchQuery: '',
  sortOption: 'updated-desc',
  editorViewMode: 'split',
  hasUnsavedChanges: false,
  saveStatus: 'saved',
  sidebarWidth: 280,
  isSidebarCollapsed: false,
  searchHistory: [],
  workspacePath: null,
  isLoading: false,
  loadError: null,
};

// Create default root folder
const createDefaultRootFolder = (): Folder => ({
  id: 'folder_root',
  name: 'Notes',
  parentId: null,
  order: 0,
  isExpanded: true,
  createdAt: now(),
  updatedAt: now(),
});

export const useNoteStore = create<NoteStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Initialize with root folder
    folders: new Map([['folder_root', createDefaultRootFolder()]]),

    // ===== Note Operations =====

    createNote: (folderId = 'folder_root', title) => {
      const id = generateId('note');
      const timestamp = now();
      const noteTitle = title || `Untitled Note ${new Date().toLocaleDateString()}`;

      const note: Note = {
        id,
        title: noteTitle,
        content: `# ${noteTitle}\n\n`,
        folderId,
        tagIds: [],
        embeddedWhiteboardIds: [],
        embeddedAssetIds: [],
        frontMatter: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
      };

      set((state) => {
        const newNotes = new Map(state.notes);
        newNotes.set(id, note);
        return {
          notes: newNotes,
          activeNoteId: id,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });

      return id;
    },

    updateNote: (id, updates) => {
      set((state) => {
        const note = state.notes.get(id);
        if (!note) return state;

        const updatedNote = {
          ...note,
          ...updates,
          updatedAt: now(),
        };

        const newNotes = new Map(state.notes);
        newNotes.set(id, updatedNote);

        return {
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    deleteNote: (id) => {
      set((state) => {
        const note = state.notes.get(id);
        if (!note) return state;

        const updatedNote = {
          ...note,
          isDeleted: true,
          deletedAt: now(),
        };

        const newNotes = new Map(state.notes);
        newNotes.set(id, updatedNote);

        return {
          notes: newNotes,
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    permanentlyDeleteNote: (id) => {
      set((state) => {
        const newNotes = new Map(state.notes);
        newNotes.delete(id);

        return {
          notes: newNotes,
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    restoreNote: (id) => {
      set((state) => {
        const note = state.notes.get(id);
        if (!note) return state;

        const updatedNote = {
          ...note,
          isDeleted: false,
          deletedAt: undefined,
          updatedAt: now(),
        };

        const newNotes = new Map(state.notes);
        newNotes.set(id, updatedNote);

        return {
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    moveNote: (noteId, targetFolderId) => {
      set((state) => {
        const note = state.notes.get(noteId);
        if (!note) return state;

        const updatedNote = {
          ...note,
          folderId: targetFolderId,
          updatedAt: now(),
        };

        const newNotes = new Map(state.notes);
        newNotes.set(noteId, updatedNote);

        return {
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    duplicateNote: (id) => {
      const state = get();
      const note = state.notes.get(id);
      if (!note) return '';

      const newId = generateId('note');
      const timestamp = now();

      const duplicatedNote: Note = {
        ...note,
        id: newId,
        title: `${note.title} (Copy)`,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        deletedAt: undefined,
      };

      set((state) => {
        const newNotes = new Map(state.notes);
        newNotes.set(newId, duplicatedNote);
        return {
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });

      return newId;
    },

    // ===== Folder Operations =====

    createFolder: (name, parentId = null) => {
      const id = generateId('folder');
      const timestamp = now();

      const folder: Folder = {
        id,
        name,
        parentId,
        order: get().folders.size,
        isExpanded: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      set((state) => {
        const newFolders = new Map(state.folders);
        newFolders.set(id, folder);
        return {
          folders: newFolders,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });

      return id;
    },

    updateFolder: (id, updates) => {
      set((state) => {
        const folder = state.folders.get(id);
        if (!folder) return state;

        const updatedFolder = {
          ...folder,
          ...updates,
          updatedAt: now(),
        };

        const newFolders = new Map(state.folders);
        newFolders.set(id, updatedFolder);

        return {
          folders: newFolders,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    deleteFolder: (id) => {
      if (id === 'folder_root') return; // Cannot delete root folder

      set((state) => {
        const newFolders = new Map(state.folders);
        const newNotes = new Map(state.notes);

        // Move notes in this folder to root
        newNotes.forEach((note, noteId) => {
          if (note.folderId === id) {
            newNotes.set(noteId, {
              ...note,
              folderId: 'folder_root',
              updatedAt: now(),
            });
          }
        });

        // Move subfolders to root
        newFolders.forEach((folder, folderId) => {
          if (folder.parentId === id) {
            newFolders.set(folderId, {
              ...folder,
              parentId: null,
              updatedAt: now(),
            });
          }
        });

        newFolders.delete(id);

        return {
          folders: newFolders,
          notes: newNotes,
          selectedFolderId: state.selectedFolderId === id ? null : state.selectedFolderId,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    moveFolder: (folderId, targetParentId) => {
      if (folderId === 'folder_root') return;

      set((state) => {
        const folder = state.folders.get(folderId);
        if (!folder) return state;

        // Prevent moving folder into itself or its descendants
        let current = targetParentId;
        while (current) {
          if (current === folderId) return state;
          const parentFolder = state.folders.get(current);
          current = parentFolder?.parentId ?? null;
        }

        const updatedFolder = {
          ...folder,
          parentId: targetParentId,
          updatedAt: now(),
        };

        const newFolders = new Map(state.folders);
        newFolders.set(folderId, updatedFolder);

        return {
          folders: newFolders,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    toggleFolderExpanded: (id) => {
      set((state) => {
        const folder = state.folders.get(id);
        if (!folder) return state;

        const updatedFolder = {
          ...folder,
          isExpanded: !folder.isExpanded,
        };

        const newFolders = new Map(state.folders);
        newFolders.set(id, updatedFolder);

        return { folders: newFolders };
      });
    },

    // ===== Tag Operations =====

    createTag: (name, color) => {
      const id = generateId('tag');
      const tagColor = color || TAG_COLORS[get().tags.size % TAG_COLORS.length];

      const tag: Tag = {
        id,
        name,
        color: tagColor,
        createdAt: now(),
      };

      set((state) => {
        const newTags = new Map(state.tags);
        newTags.set(id, tag);
        return {
          tags: newTags,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });

      return id;
    },

    updateTag: (id, updates) => {
      set((state) => {
        const tag = state.tags.get(id);
        if (!tag) return state;

        const updatedTag = {
          ...tag,
          ...updates,
        };

        const newTags = new Map(state.tags);
        newTags.set(id, updatedTag);

        return {
          tags: newTags,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    deleteTag: (id) => {
      set((state) => {
        const newTags = new Map(state.tags);
        newTags.delete(id);

        // Remove tag from all notes
        const newNotes = new Map(state.notes);
        newNotes.forEach((note, noteId) => {
          if (note.tagIds.includes(id)) {
            newNotes.set(noteId, {
              ...note,
              tagIds: note.tagIds.filter((tagId) => tagId !== id),
              updatedAt: now(),
            });
          }
        });

        return {
          tags: newTags,
          notes: newNotes,
          filterTagIds: state.filterTagIds.filter((tagId) => tagId !== id),
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    addTagToNote: (noteId, tagId) => {
      set((state) => {
        const note = state.notes.get(noteId);
        if (!note || note.tagIds.includes(tagId)) return state;

        const updatedNote = {
          ...note,
          tagIds: [...note.tagIds, tagId],
          updatedAt: now(),
        };

        const newNotes = new Map(state.notes);
        newNotes.set(noteId, updatedNote);

        return {
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    removeTagFromNote: (noteId, tagId) => {
      set((state) => {
        const note = state.notes.get(noteId);
        if (!note) return state;

        const updatedNote = {
          ...note,
          tagIds: note.tagIds.filter((id) => id !== tagId),
          updatedAt: now(),
        };

        const newNotes = new Map(state.notes);
        newNotes.set(noteId, updatedNote);

        return {
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    // ===== Whiteboard Operations =====

    createWhiteboard: (noteId) => {
      const id = generateId('wb');
      const timestamp = now();

      const whiteboard: EmbeddedWhiteboard = {
        id,
        noteId,
        sceneData: {
          elements: [],
          appState: {},
          files: {},
        },
        displayWidth: 800,
        displayHeight: 400,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      set((state) => {
        const newWhiteboards = new Map(state.whiteboards);
        newWhiteboards.set(id, whiteboard);

        // Add whiteboard ID to note
        const note = state.notes.get(noteId);
        if (note) {
          const newNotes = new Map(state.notes);
          newNotes.set(noteId, {
            ...note,
            embeddedWhiteboardIds: [...note.embeddedWhiteboardIds, id],
            updatedAt: timestamp,
          });

          return {
            whiteboards: newWhiteboards,
            notes: newNotes,
            hasUnsavedChanges: true,
            saveStatus: 'unsaved',
          };
        }

        return {
          whiteboards: newWhiteboards,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });

      return id;
    },

    updateWhiteboard: (id, sceneData) => {
      set((state) => {
        const whiteboard = state.whiteboards.get(id);
        if (!whiteboard) return state;

        const updatedWhiteboard = {
          ...whiteboard,
          sceneData,
          updatedAt: now(),
        };

        const newWhiteboards = new Map(state.whiteboards);
        newWhiteboards.set(id, updatedWhiteboard);

        return {
          whiteboards: newWhiteboards,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    deleteWhiteboard: (id) => {
      set((state) => {
        const whiteboard = state.whiteboards.get(id);
        if (!whiteboard) return state;

        const newWhiteboards = new Map(state.whiteboards);
        newWhiteboards.delete(id);

        // Remove whiteboard ID from note
        const note = state.notes.get(whiteboard.noteId);
        if (note) {
          const newNotes = new Map(state.notes);
          newNotes.set(whiteboard.noteId, {
            ...note,
            embeddedWhiteboardIds: note.embeddedWhiteboardIds.filter((wbId) => wbId !== id),
            updatedAt: now(),
          });

          return {
            whiteboards: newWhiteboards,
            notes: newNotes,
            hasUnsavedChanges: true,
            saveStatus: 'unsaved',
          };
        }

        return {
          whiteboards: newWhiteboards,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    // ===== Asset Operations =====

    addAsset: (noteId, fileName, mimeType, size, relativePath) => {
      const id = generateId('asset');

      const asset: NoteAsset = {
        id,
        fileName,
        mimeType,
        size,
        relativePath,
        createdAt: now(),
      };

      set((state) => {
        const newAssets = new Map(state.assets);
        newAssets.set(id, asset);

        // Add asset ID to note
        const note = state.notes.get(noteId);
        if (note) {
          const newNotes = new Map(state.notes);
          newNotes.set(noteId, {
            ...note,
            embeddedAssetIds: [...note.embeddedAssetIds, id],
            updatedAt: now(),
          });

          return {
            assets: newAssets,
            notes: newNotes,
            hasUnsavedChanges: true,
            saveStatus: 'unsaved',
          };
        }

        return {
          assets: newAssets,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });

      return id;
    },

    deleteAsset: (id) => {
      set((state) => {
        const newAssets = new Map(state.assets);
        newAssets.delete(id);

        // Remove asset ID from all notes
        const newNotes = new Map(state.notes);
        newNotes.forEach((note, noteId) => {
          if (note.embeddedAssetIds.includes(id)) {
            newNotes.set(noteId, {
              ...note,
              embeddedAssetIds: note.embeddedAssetIds.filter((assetId) => assetId !== id),
              updatedAt: now(),
            });
          }
        });

        return {
          assets: newAssets,
          notes: newNotes,
          hasUnsavedChanges: true,
          saveStatus: 'unsaved',
        };
      });
    },

    // ===== UI State Operations =====

    setActiveNote: (id) => set({ activeNoteId: id }),

    setSelectedFolder: (id) => set({ selectedFolderId: id }),

    setFilterTags: (tagIds) => set({ filterTagIds: tagIds }),

    toggleFilterTag: (tagId) => {
      set((state) => ({
        filterTagIds: state.filterTagIds.includes(tagId)
          ? state.filterTagIds.filter((id) => id !== tagId)
          : [...state.filterTagIds, tagId],
      }));
    },

    setSearchQuery: (query) => set({ searchQuery: query }),

    addToSearchHistory: (query) => {
      if (!query.trim()) return;

      set((state) => {
        const history = state.searchHistory.filter((q) => q !== query);
        return {
          searchHistory: [query, ...history].slice(0, 10), // Keep last 10
        };
      });
    },

    clearSearchHistory: () => set({ searchHistory: [] }),

    setSortOption: (option) => set({ sortOption: option }),

    setEditorViewMode: (mode) => set({ editorViewMode: mode }),

    setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),

    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

    setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

    setSaveStatus: (status) => set({ saveStatus: status }),

    // ===== Search =====

    searchNotes: (query) => {
      const state = get();
      if (!query.trim()) return [];

      const queryLower = query.toLowerCase();
      const results: SearchResult[] = [];

      state.notes.forEach((note) => {
        if (note.isDeleted) return;

        const matches: SearchMatch[] = [];
        let score = 0;

        // Title match
        const titleLower = note.title.toLowerCase();
        const titleIndex = titleLower.indexOf(queryLower);
        if (titleIndex !== -1) {
          score += 0.5;
          matches.push({
            field: 'title',
            value: note.title,
            indices: [[titleIndex, titleIndex + query.length - 1]],
          });
        }

        // Content match
        const contentLower = note.content.toLowerCase();
        const contentIndex = contentLower.indexOf(queryLower);
        if (contentIndex !== -1) {
          score += 0.3;
          // Get context around match
          const start = Math.max(0, contentIndex - 30);
          const end = Math.min(note.content.length, contentIndex + query.length + 30);
          const context = note.content.slice(start, end);
          matches.push({
            field: 'content',
            value: context,
            indices: [[contentIndex - start, contentIndex - start + query.length - 1]],
          });
        }

        // Tag match
        const matchingTags = note.tagIds
          .map((tagId) => state.tags.get(tagId))
          .filter((tag) => tag && tag.name.toLowerCase().includes(queryLower));

        if (matchingTags.length > 0) {
          score += 0.2;
          matchingTags.forEach((tag) => {
            if (tag) {
              matches.push({
                field: 'tags',
                value: tag.name,
                indices: [[0, tag.name.length - 1]],
              });
            }
          });
        }

        if (matches.length > 0) {
          results.push({ note, score, matches });
        }
      });

      // Sort by score descending
      return results.sort((a, b) => b.score - a.score);
    },

    // ===== File Tree =====

    getFileTree: () => {
      const state = get();
      const tree: FileTreeNode[] = [];

      // Build folder tree recursively
      const buildFolderNode = (folder: Folder, depth: number): FileTreeNode => {
        const children: FileTreeNode[] = [];

        // Add subfolders
        state.folders.forEach((subFolder) => {
          if (subFolder.parentId === folder.id) {
            children.push(buildFolderNode(subFolder, depth + 1));
          }
        });

        // Add notes in this folder
        state.notes.forEach((note) => {
          if (note.folderId === folder.id && !note.isDeleted) {
            children.push({
              id: note.id,
              type: 'note',
              name: note.title,
              depth: depth + 1,
              isSelected: note.id === state.activeNoteId,
              updatedAt: note.updatedAt,
              tagIds: note.tagIds,
            });
          }
        });

        // Sort children: folders first, then notes by updated time
        children.sort((a, b) => {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          if (a.type === 'note' && b.type === 'note') {
            return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
          }
          return a.name.localeCompare(b.name);
        });

        return {
          id: folder.id,
          type: 'folder',
          name: folder.name,
          children,
          isExpanded: folder.isExpanded,
          isSelected: folder.id === state.selectedFolderId,
          depth,
        };
      };

      // Start with root folders
      state.folders.forEach((folder) => {
        if (folder.parentId === null) {
          tree.push(buildFolderNode(folder, 0));
        }
      });

      return tree;
    },

    getFilteredNotes: () => {
      const state = get();
      let notes = Array.from(state.notes.values()).filter((note) => !note.isDeleted);

      // Filter by folder
      if (state.selectedFolderId) {
        notes = notes.filter((note) => note.folderId === state.selectedFolderId);
      }

      // Filter by tags
      if (state.filterTagIds.length > 0) {
        notes = notes.filter((note) =>
          state.filterTagIds.every((tagId) => note.tagIds.includes(tagId))
        );
      }

      return get().getSortedNotes(notes);
    },

    getSortedNotes: (notes) => {
      const { sortOption } = get();

      return [...notes].sort((a, b) => {
        switch (sortOption) {
          case 'name-asc':
            return a.title.localeCompare(b.title);
          case 'name-desc':
            return b.title.localeCompare(a.title);
          case 'updated-asc':
            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          case 'updated-desc':
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          case 'created-asc':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'created-desc':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
    },

    // ===== Helpers =====

    getNoteById: (id) => get().notes.get(id),

    getFolderById: (id) => get().folders.get(id),

    getTagById: (id) => get().tags.get(id),

    getNotesInFolder: (folderId) =>
      Array.from(get().notes.values()).filter(
        (note) => note.folderId === folderId && !note.isDeleted
      ),

    getNotesByTag: (tagId) =>
      Array.from(get().notes.values()).filter(
        (note) => note.tagIds.includes(tagId) && !note.isDeleted
      ),

    getAllTags: () => Array.from(get().tags.values()),

    getTagUsageCount: (tagId) =>
      Array.from(get().notes.values()).filter(
        (note) => note.tagIds.includes(tagId) && !note.isDeleted
      ).length,

    // ===== Persistence =====

    exportState: () => {
      const state = get();
      return {
        notes: Array.from(state.notes.values()),
        folders: Array.from(state.folders.values()),
        tags: Array.from(state.tags.values()),
        whiteboards: Array.from(state.whiteboards.values()),
        assets: Array.from(state.assets.values()),
      };
    },

    importState: (data) => {
      set({
        notes: new Map(data.notes.map((n) => [n.id, n])),
        folders: new Map(data.folders.map((f) => [f.id, f])),
        tags: new Map(data.tags.map((t) => [t.id, t])),
        whiteboards: new Map(data.whiteboards.map((w) => [w.id, w])),
        assets: new Map(data.assets.map((a) => [a.id, a])),
        hasUnsavedChanges: false,
        saveStatus: 'saved',
      });
    },

    reset: () => {
      set({
        ...initialState,
        folders: new Map([['folder_root', createDefaultRootFolder()]]),
      });
    },

    // ===== Workspace Operations =====

    setWorkspacePath: (path) => set({ workspacePath: path }),

    setIsLoading: (loading) => set({ isLoading: loading }),

    setLoadError: (error) => set({ loadError: error }),
  }))
);

// Selectors for optimized re-renders
export const selectActiveNote = (state: NoteStore) =>
  state.activeNoteId ? state.notes.get(state.activeNoteId) : null;

export const selectAllTags = (state: NoteStore) => Array.from(state.tags.values());

export const selectFilteredNotes = (state: NoteStore) => state.getFilteredNotes();

export const selectFileTree = (state: NoteStore) => state.getFileTree();
