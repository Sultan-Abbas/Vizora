import { useEffect, useRef } from 'react';
import { Play, Pause, Download, Box } from 'lucide-react';
import { useEditorStore } from '../store';

export function Toolbar() {
  const { isPlaying, togglePlayback, playbackSpeed, setPlaybackSpeed, addModel, models, selectedModelId, toggleRigModel, triggerCameraReset } = useEditorStore();
  
  const handleImport = () => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = '.glb,.gltf,.obj,.fbx';
    el.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        addModel(url);
      }
    };
    el.click();
  };

  const handleRig = () => {
    if (selectedModelId) {
      toggleRigModel(selectedModelId);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  const handleExport = () => {
    // Generate a mock BVH format
    const bvhContent = `HIERARCHY\nROOT Hips\n{\n  OFFSET 0.00 0.00 0.00\n  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation\n  JOINT Spine\n  {\n    OFFSET 0.00 10.00 0.00\n    CHANNELS 3 Zrotation Xrotation Yrotation\n    End Site\n    {\n      OFFSET 0.00 10.00 0.00\n    }\n  }\n}\nMOTION\nFrames: 100\nFrame Time: 0.0333333\n0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0 0.0\n`;
    const blob = new Blob([bvhContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'motion_capture.bvh';
    link.href = url;
    link.click();
  };

  return (
    <div className="h-14 border-b border-black flex items-center justify-between px-6 shrink-0 z-10 relative bg-white">
      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlayback}
          className="w-8 h-8 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors"
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
        </button>
        
        <div className="h-4 w-[1px] bg-neutral-200" />
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 w-16">Speed: {playbackSpeed}x</span>
          <input 
            type="range" 
            min="0.25" max="3" step="0.25"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="w-24 h-1 bg-neutral-200 appearance-none accent-black cursor-pointer"
          />
        </div>
        
        <div className="h-4 w-[1px] bg-neutral-200" />
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={triggerCameraReset} className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-2">
          <span>Reset Camera</span>
        </button>
        <button onClick={handleImport} className="text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 border border-black hover:bg-black hover:text-white transition-colors flex items-center gap-2">
          <Box size={12} />
          <span>Import Custom Model</span>
        </button>
        {selectedModel && (
          <button onClick={handleRig} className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 border border-black flex items-center gap-2 ${selectedModel.isRigged ? 'bg-black text-white' : 'hover:bg-black hover:text-white transition-colors'}`}>
            {selectedModel.isRigged ? 'Unrig Model' : 'Rig Selected'}
          </button>
        )}
        <button onClick={handleExport} className="bg-black text-white text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 px-4 py-1.5">
          <Download size={12} />
          <span>Export .BVH</span>
        </button>
      </div>
    </div>
  );
}

export function Timeline() {
  const { currentFrame, totalFrames, setFrame, isPlaying } = useEditorStore();
  const reqRef = useRef<number | undefined>(undefined);
  
  // Advance frames automatically if playing
  useEffect(() => {
    if (!isPlaying) return;
    
    let lastTime = performance.now();
    let elapsed = 0;
    let reqId: number;
    
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      const state = useEditorStore.getState();
      const baseMsPerFrame = 1000 / 30; // 30fps default
      
      elapsed += dt * state.playbackSpeed;
      
      if (elapsed >= baseMsPerFrame) {
        const framesToAdvance = Math.floor(elapsed / baseMsPerFrame);
        elapsed = elapsed % baseMsPerFrame; // Keep remainder
        state.setFrame((state.currentFrame + framesToAdvance) % state.totalFrames);
      }
      
      reqId = requestAnimationFrame(loop);
    };
    
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [isPlaying]);

  return (
    <footer className="h-16 border-t border-black shrink-0 flex flex-col bg-white">
      <div className="h-6 border-b border-black/5 flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z"/></svg>
          <div className="text-[10px] font-bold uppercase tracking-tighter">FRAME {currentFrame.toString().padStart(3, '0')} / {totalFrames.toString().padStart(3, '0')}</div>
        </div>
      </div>
      
      <div className="flex-1 bg-neutral-50 relative cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          setFrame(Math.floor(percent * totalFrames));
      }}>
        {/* Timeline Grid */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundSize: '20px 100%', backgroundImage: 'linear-gradient(to right, black 1px, transparent 1px)' }}></div>
        
        {/* Playhead */}
        <div 
          className="absolute top-0 bottom-0 w-[1px] bg-black z-10 cursor-col-resize mix-blend-difference"
          style={{ left: `${(currentFrame / totalFrames) * 100}%` }}
        >
          <div className="w-3 h-3 bg-black absolute -top-1.5 -left-[5px] rotate-45 select-none pointer-events-none"></div>
        </div>

        {/* Bottom Labels */}
        <div className="absolute bottom-2 left-0 right-0 px-6 flex justify-between text-[8px] font-bold text-neutral-300 pointer-events-none select-none">
          <span>0f</span>
          <span>{Math.floor(totalFrames * 0.2)}f</span>
          <span>{Math.floor(totalFrames * 0.4)}f</span>
          <span>{Math.floor(totalFrames * 0.6)}f</span>
          <span>{Math.floor(totalFrames * 0.8)}f</span>
          <span>{totalFrames}f</span>
        </div>
      </div>
    </footer>
  );
}
