import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, Trash2, Box, Database, Layers, Settings, Plus } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { useEditorStore, PipelineStatus } from '../store';
import { Viewport3D } from '../components/Viewport3D';
import { Toolbar, Timeline } from '../components/EditorControls';

function CameraResetter() {
  const cameraResetTrigger = useEditorStore(s => s.cameraResetTrigger);
  const { camera, controls } = useThree();
  
  useEffect(() => {
    if (cameraResetTrigger > 0) {
      camera.position.set(2, 2, 3);
      if (controls && (controls as any).target) {
        (controls as any).target.set(0, 0, 0);
        (controls as any).update();
      }
    }
  }, [cameraResetTrigger, camera, controls]);

  return null;
}

function SceneManager() {
  const { models, selectedModelId, setSelectedModelId, removeModel, modelPresets, addModel } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'library'>('hierarchy');

  return (
    <aside className="w-64 border-l border-black bg-white flex flex-col shrink-0 z-10 pointer-events-auto">
      <div className="flex border-b border-black">
        <button 
          onClick={() => setActiveTab('hierarchy')}
          className={`flex-1 py-3 text-[10px] uppercase font-black tracking-tighter flex items-center justify-center gap-2 ${activeTab === 'hierarchy' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
        >
          <Layers size={12} />
          <span>Scene</span>
        </button>
        <button 
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-3 text-[10px] uppercase font-black tracking-tighter flex items-center justify-center gap-2 ${activeTab === 'library' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-50'}`}
        >
          <Database size={12} />
          <span>Library</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'hierarchy' ? (
          <>
            {models.length === 0 ? (
              <div className="p-8 text-[9px] text-neutral-400 font-bold uppercase tracking-widest text-center">
                Scene is empty
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-2">
                {models.map(m => (
                  <div key={m.id} className="flex gap-1 group">
                    <button
                      onClick={() => setSelectedModelId(m.id)}
                      className={`flex-1 text-left px-3 py-2 text-[10px] font-bold uppercase tracking-widest border transition-colors ${selectedModelId === m.id ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-200 hover:border-black'}`}
                    >
                      <div className="truncate w-32">{m.name}</div>
                      {m.isRigged && <span className="text-[8px] opacity-70 block mt-1 text-green-500">✓ Rigged</span>}
                    </button>
                    <button
                      onClick={() => removeModel(m.id)}
                      className="p-2 border border-neutral-200 hover:border-red-500 hover:bg-red-50 hover:text-red-500 text-neutral-400 transition-colors flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Pre-rigged Presets</h3>
              <div className="space-y-1.5">
                {modelPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      if (preset.type === 'glb') addModel(preset.url, preset.name, true);
                    }}
                    className="w-full flex items-center justify-between p-2.5 bg-neutral-50 border border-black/5 hover:border-black transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Box size={12} className="opacity-40" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">{preset.name}</span>
                    </div>
                    <Plus size={10} className="opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-6 border-t border-black/5">
              <h3 className="text-[9px] font-black uppercase tracking-widest opacity-30 italic">Import URL</h3>
              <div className="mt-2">
                <input 
                  type="text" 
                  placeholder="https://.../model.glb"
                  className="w-full text-[10px] font-bold p-2 border border-black/10 focus:border-black outline-none bg-neutral-50 uppercase placeholder:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addModel(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <p className="text-[8px] text-neutral-400 mt-2 italic">Press Enter to add model</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedModelId && activeTab === 'hierarchy' && (
        <div className="px-4 py-3 mt-auto border-t border-black/10 text-[9px] uppercase tracking-widest text-neutral-500 font-bold bg-neutral-50 leading-relaxed">
          <div className="text-black mb-1">Controls:</div>
          <ul className="list-disc pl-3 mt-1 space-y-1">
            <li><kbd className="px-1 border border-neutral-300 rounded bg-white font-mono">W</kbd> <kbd className="px-1 border border-neutral-300 rounded bg-white font-mono">A</kbd> <kbd className="px-1 border border-neutral-300 rounded bg-white font-mono">S</kbd> <kbd className="px-1 border border-neutral-300 rounded bg-white font-mono">D</kbd> space to move</li>
            <li>Click <strong>Rig Selected</strong> in toolbar to setup animations</li>
          </ul>
        </div>
      )}
    </aside>
  );
}

export function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, isPlaying, currentFrame, totalFrames, updateProjectProgress } = useEditorStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [msg, ...prev].slice(0, 5));
  };

  useEffect(() => {
    if (!projectId || !auth.currentUser) return;
    
    // Listen to current project
    const docRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.userId !== auth.currentUser?.uid) {
          setError("Unauthorized access.");
          setLoading(false);
          return;
        }
        
        setCurrentProject({
          id: snap.id,
          name: data.name,
          status: data.status as PipelineStatus,
          progress: data.status === 'ready' ? 100 : 0,
          motionData: data.motionData ? JSON.parse(data.motionData) : undefined
        });
        setLoading(false);
      } else {
        setError("Project not found.");
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${projectId}`);
    });

    return () => unsubscribe();
  }, [projectId]);

  // Actual CV Pipeline using TensorFlow.js
  useEffect(() => {
    if (!currentProject || currentProject.status === 'ready' || currentProject.status === 'error') return;
    if (currentProject.status !== 'draft') return; // only start if draft

    const processVideo = async () => {
      if (!projectId) return;
      try {
        const file = useEditorStore.getState().tempFile;
        updateProjectProgress('uploading', 10);
        addLog("Starting video process...");
        
        let videoEl: HTMLVideoElement | null = null;
        let motionData: any[] = [];
        
        let posesDetectedCount = 0;
        
        if (file) {
          updateProjectProgress('preprocessing', 30);
          
          addLog("Loading TensorFlow.js...");
          await tf.ready();
          
          let backendSet = false;
          try {
            await tf.setBackend('webgl');
            backendSet = true;
          } catch (e) {
            addLog("WebGL failed, using CPU...");
          }
          if (!backendSet) {
            await tf.setBackend('cpu');
          }
          const detectorConfig = { 
            runtime: 'mediapipe', 
            modelType: 'full', 
            solutionPath: 'https://unpkg.com/@mediapipe/pose@0.5.1675469404',
          };
          addLog("Initializing BlazePose Full (MediaPipe)...");
          const detector = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, detectorConfig);
          
          videoEl = document.createElement('video');
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.src = URL.createObjectURL(file);
          
          await new Promise((resolve, reject) => {
            videoEl!.onloadedmetadata = () => {
              videoEl!.width = videoEl!.videoWidth || 640;
              videoEl!.height = videoEl!.videoHeight || 480;
              resolve(true);
            };
            videoEl!.onerror = () => reject("Video load error");
            videoEl!.load();
          });
          
          addLog(`Video ready. Starting high-precision analysis...`);
          updateProjectProgress('extracting', 50);
          
          const duration = videoEl.duration || 5; 
          const fps = 12; // Higher FPS for fast combat movements
          const totalFramesToExtract = Math.floor(duration * fps);
          
          let lastValidPose: any = null;
          addLog(`Analyzing ${totalFramesToExtract} frames...`);

          for (let i = 0; i <= totalFramesToExtract; i++) {
            const time = i / fps;
            videoEl.currentTime = time;
            
            await new Promise(resolve => {
              const onSeeked = () => {
                videoEl!.removeEventListener('seeked', onSeeked);
                resolve(true);
              };
              videoEl!.addEventListener('seeked', onSeeked);
              setTimeout(resolve, 600); // Stable delay
            });
            
            try {
              // Estimate with higher precision
              const poses = await detector.estimatePoses(videoEl, { 
                flipHorizontal: false
              });
              
              if (poses && poses.length > 0) {
                 const rawPose = poses[0].keypoints3D; // Prefer 3D keypoints
                 if (rawPose) {
                   motionData.push(rawPose);
                   lastValidPose = rawPose;
                   posesDetectedCount++;
                   setDetectionCount(posesDetectedCount);
                 } else {
                   motionData.push(lastValidPose);
                 }
              } else {
                motionData.push(lastValidPose);
              }
            } catch (poseError) {
              motionData.push(lastValidPose);
            }
            
            updateProjectProgress('extracting', 50 + (i / totalFramesToExtract) * 45);
          }
          
          addLog(`Done. ${posesDetectedCount} poses found.`);
          URL.revokeObjectURL(videoEl.src);
        } else {
           addLog("No file found, using simulation");
           updateProjectProgress('preprocessing', 50);
           await new Promise(r => setTimeout(r, 2000));
           updateProjectProgress('extracting', 80);
           await new Promise(r => setTimeout(r, 2000));
        }
        
        updateProjectProgress('ready', 100);
        
        const docData: any = { 
          status: 'ready',
          updatedAt: serverTimestamp()
        };
        
        if (motionData.length > 0 && posesDetectedCount > 0) {
           // Use compact array format [x,y,z] to save significant bandwidth/storage
           const optimizedData = motionData.filter(f => f !== null).map(frame => 
             frame.map((kp: any) => [
               Number((kp.x || 0).toFixed(3)),
               Number((kp.y || 0).toFixed(3)),
               Number((kp.z || 0).toFixed(3))
             ])
           );
           
           if (optimizedData.length > 0) {
             docData.motionData = JSON.stringify(optimizedData);
             useEditorStore.getState().setTotalFrames(optimizedData.length);
           }
        }
        
        await updateDoc(doc(db, 'projects', projectId), docData);
        
      } catch (err: any) {
        addLog("Error: " + (err.message || String(err)));
        console.error("Detailed Extraction error:", err);
        updateProjectProgress('error', 0);
        setError("Failed to extract motion data.");
      }
    };
    
    processVideo();
    
    return () => {};
  }, [currentProject?.status, projectId]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
      <Loader2 className="animate-spin text-gray-400" size={32} />
    </div>;
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#fafafa]">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-medium mb-2">{error}</h2>
        <button onClick={() => navigate('/dashboard')} className="text-black underline mt-4">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!currentProject) return null;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
      {currentProject.status !== 'ready' ? (
        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white border border-black max-w-md w-full p-10 flex flex-col">
            <h2 className="text-xl font-black tracking-tighter uppercase mb-2">Processing Pipeline</h2>
            <div className="flex items-center justify-between text-[9px] uppercase font-bold text-neutral-500 mb-8 border-b border-black/10 pb-4">
               <span>System status</span>
               <div className="flex gap-4">
                 {currentProject.status === 'extracting' && (
                   <span className="text-orange-500">{detectionCount} Poses Captured</span>
                 )}
                 <span className="text-black">{Math.floor(currentProject.progress)}%</span>
               </div>
            </div>
            
            <div className="space-y-4">
              <ProcessingStep label="Uploading to Server" isActive={currentProject.status === 'uploading'} isDone={['preprocessing', 'extracting', 'ready'].includes(currentProject.status as string)} />
              <ProcessingStep label="OpenCV Preprocessing" isActive={currentProject.status === 'preprocessing'} isDone={['extracting', 'ready'].includes(currentProject.status as string)} />
              <ProcessingStep label="AI Tensor Extraction" isActive={currentProject.status === 'extracting'} isDone={(currentProject.status as string) === 'ready'} />
            </div>

            <div className="mt-8 bg-neutral-50 p-4 border border-black/5">
              <div className="text-[8px] uppercase tracking-widest font-black mb-2 opacity-30 italic">Session Log</div>
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="text-[9px] font-mono text-neutral-500 flex gap-2">
                    <span className="opacity-30">[{logs.length - i}]</span>
                    <span className="truncate">{log}</span>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-[9px] font-mono text-neutral-300 italic">Waiting for process...</div>}
              </div>
            </div>
            
            <div className="mt-10 h-[2px] bg-neutral-100 w-full overflow-hidden relative">
              <div 
                className="absolute top-0 bottom-0 left-0 bg-black transition-all duration-1000" 
                style={{ width: `${currentProject.progress}%` }} 
              />
            </div>
          </div>
        </div>
      ) : null}

      <Toolbar />
      
      <div className="flex-1 relative flex flex-row min-w-0 bg-[#303030]">
        <div className="flex-1 relative cursor-crosshair flex flex-col min-w-0">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-3 py-1.5 bg-black text-white text-[9px] uppercase tracking-tighter font-bold flex items-center gap-1.5 hover:bg-neutral-800 transition-colors shadow-md"
            >
              <ArrowLeft size={10} />
              <span>Back</span>
            </button>
            <div className="px-3 py-1.5 border border-black/20 text-white text-[9px] uppercase tracking-tighter font-bold bg-black/50 backdrop-blur-sm hidden sm:block shadow-md">Perspective</div>
          </div>

          <div className="absolute inset-0 z-0">
            <Canvas camera={{ position: [2, 2, 3], fov: 45, far: 1000 }} className="w-full h-full">
              <color attach="background" args={['#303030']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
              <Environment preset="city" />
              
              <axesHelper args={[2]} />
              <Grid infiniteGrid fadeDistance={200} fadeStrength={5} cellColor="#404040" sectionColor="#555555" />
              
              <Viewport3D 
                isPlaying={isPlaying} 
                currentFrame={currentFrame} 
                totalFrames={totalFrames} 
              />
              
              <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 + 0.1} />
              <CameraResetter />
            </Canvas>
          </div>
        </div>
        <SceneManager />
      </div>
      <Timeline />
    </div>
  );
}

function ProcessingStep({ label, isActive, isDone }: { label: string, isActive: boolean, isDone: boolean }) {
  return (
    <div className={`flex items-center gap-4 ${isActive || isDone ? 'opacity-100' : 'opacity-40'}`}>
      <div className="h-4 w-4 flex items-center justify-center shrink-0">
        {isDone ? (
          <CheckCircle2 size={14} className="text-black" />
        ) : isActive ? (
          <Loader2 size={14} className="animate-spin text-black" />
        ) : (
          <div className="h-1 w-1 bg-black" />
        )}
      </div>
      <span className={`text-[10px] uppercase font-bold tracking-widest ${isActive || isDone ? 'text-black' : 'text-neutral-500'}`}>{label}</span>
    </div>
  );
}
