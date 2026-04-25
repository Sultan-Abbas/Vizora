import { create } from 'zustand';

export type PipelineStatus = 'draft' | 'uploading' | 'preprocessing' | 'extracting' | 'ready' | 'error';

export interface MotionProject {
  id: string;
  name: string;
  status: PipelineStatus;
  videoUrl?: string;
  progress: number;
  motionData?: any[];
}

export interface AppModel {
  id: string;
  url?: string;
  name: string;
  position: [number, number, number];
  isRigged: boolean;
  type: 'skeleton' | 'custom';
}

interface EditorState {
  currentProject: MotionProject | null;
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  playbackSpeed: number;
  models: AppModel[];
  selectedModelId: string | null;
  selectedPart: string | null;
  
  setCurrentProject: (project: MotionProject | null) => void;
  updateProjectProgress: (status: PipelineStatus, progress: number) => void;
  togglePlayback: () => void;
  setFrame: (frame: number) => void;
  setTotalFrames: (total: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  
  tempFile: File | null;
  setTempFile: (file: File | null) => void;
  
  modelPresets: { name: string; url: string; type: 'glb' | 'primitive' }[];
  
  addModel: (url: string, name?: string, isRigged?: boolean) => void;
  toggleRigModel: (id: string) => void;
  updateModelPosition: (id: string, delta: [number, number, number]) => void;
  setSelectedModelId: (id: string | null) => void;
  removeModel: (id: string) => void;

  setSelectedPart: (part: string | null) => void;
  cameraResetTrigger: number;
  triggerCameraReset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentProject: null,
  isPlaying: false,
  currentFrame: 0,
  totalFrames: 100, // mock default
  playbackSpeed: 1,
  models: [],
  selectedModelId: null,
  selectedPart: null,
  cameraResetTrigger: 0,
  tempFile: null,
  setTempFile: (file) => set({ tempFile: file }),

  modelPresets: [
    { name: 'X-Bot (Humanoid)', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Xbot.glb', type: 'glb' },
    { name: 'Y-Bot (Humanoid)', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/YBot.glb', type: 'glb' },
    { name: 'Expressive Robot', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/RobotExpressive/RobotExpressive.glb', type: 'glb' },
    { name: 'Alpha Soldier', url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb', type: 'glb' }
  ],

  setCurrentProject: (project) => set({
    currentProject: project,
    isPlaying: false,
    currentFrame: 0,
    totalFrames: project?.motionData?.length || 100,
    models: project ? [{
      id: 'default-skeleton',
      name: 'Captured Skeleton',
      position: [0, 0, 0],
      isRigged: true,
      type: 'skeleton'
    }] : [],
    selectedModelId: project ? 'default-skeleton' : null
  }),
  updateProjectProgress: (status, progress) => set((state) => ({
    currentProject: state.currentProject ? { ...state.currentProject, status, progress } : null
  })),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setFrame: (frame) => set({ currentFrame: frame }),
  setTotalFrames: (total) => set({ totalFrames: total }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  
  addModel: (url, name, isRigged = false) => set((state) => {
    const customModelsCount = state.models.filter(m => m.type === 'custom').length;
    const newModel: AppModel = {
      id: Date.now().toString(),
      url,
      name: name || `Custom Model ${customModelsCount + 1}`,
      position: [0, 0, 0],
      isRigged: isRigged,
      type: 'custom',
    };
    return { models: [...state.models, newModel], selectedModelId: newModel.id };
  }),
  toggleRigModel: (id) => set((state) => ({
    models: state.models.map(m => m.id === id ? { ...m, isRigged: !m.isRigged } : m)
  })),
  updateModelPosition: (id, delta) => set((state) => ({
    models: state.models.map(m => {
      if (m.id === id) {
        return { ...m, position: [m.position[0] + delta[0], m.position[1] + delta[1], m.position[2] + delta[2]] };
      }
      return m;
    })
  })),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  removeModel: (id) => set((state) => {
    const remainingModels = state.models.filter(m => m.id !== id);
    const newSelectedId = state.selectedModelId === id ? (remainingModels[0]?.id || null) : state.selectedModelId;
    return { models: remainingModels, selectedModelId: newSelectedId };
  }),

  setSelectedPart: (part) => set({ selectedPart: part }),
  triggerCameraReset: () => set((state) => ({ cameraResetTrigger: state.cameraResetTrigger + 1 }))
}));
