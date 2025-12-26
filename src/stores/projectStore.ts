import { create } from 'zustand';
import type { Project, Node, CanvasState } from '../types/project';

interface ProjectState {
  projectPath: string | null;
  isDirty: boolean;
  canvas: CanvasState;
  nodes: Node[];
  assets: Record<string, string>;
  insertImage: (dataUrl: string) => string;
  setDirty: (dirty: boolean) => void;
  loadProject: (data: Project) => void;
  saveProject: () => Project;
  updateCanvas: (canvas: Partial<CanvasState>) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  removeNode: (id: string) => void;
  setProjectPath: (path: string | null) => void;
}

const generateId = () => `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useProjectStore = create<ProjectState>((set, get) => ({
  projectPath: null,
  isDirty: false,
  canvas: { viewportX: 0, viewportY: 0, zoom: 1 },
  nodes: [],
  assets: {},

  insertImage: (dataUrl: string) => {
    const assetId = `asset_${Date.now()}`;
    const nodeId = generateId();
    const newNode: Node = {
      id: nodeId,
      type: 'image',
      x: 100,
      y: 100,
      width: 400,
      height: 300,
      rotation: 0,
      assetRef: assetId,
    };
    set((state) => ({
      assets: { ...state.assets, [assetId]: dataUrl },
      nodes: [...state.nodes, newNode],
      isDirty: true,
    }));
    return nodeId;
  },

  setDirty: (dirty: boolean) => set({ isDirty: dirty }),

  loadProject: (data: Project) => {
    set({
      canvas: data.canvas,
      nodes: data.nodes,
      assets: data.assets,
      isDirty: false,
    });
  },

  saveProject: () => {
    const { canvas, nodes, assets } = get();
    return { schemaVersion: '1.0.0', canvas, nodes, assets };
  },

  updateCanvas: (canvasUpdate: Partial<CanvasState>) => {
    set((state) => ({
      canvas: { ...state.canvas, ...canvasUpdate },
      isDirty: true,
    }));
  },

  updateNode: (id: string, updates: Partial<Node>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, ...updates } : node
      ),
      isDirty: true,
    }));
  },

  removeNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      isDirty: true,
    }));
  },

  setProjectPath: (path: string | null) => set({ projectPath: path }),
}));
