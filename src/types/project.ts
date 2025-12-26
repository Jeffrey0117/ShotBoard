export interface Project {
  schemaVersion: string;
  canvas: CanvasState;
  nodes: Node[];
  assets: Record<string, string>;
}

export interface CanvasState {
  viewportX: number;
  viewportY: number;
  zoom: number;
}

export interface Node {
  id: string;
  type: 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  assetRef?: string;
  content?: string;
  fontSize?: number;
}
