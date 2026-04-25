import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Film, Clock, ArrowRight, Trash2, Pencil, Check, X } from 'lucide-react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';

import { useEditorStore } from '../store';

interface ProjectInput {
  id: string;
  name: string;
  status: string;
  createdAt: any;
}

export function Dashboard() {
  const [projects, setProjects] = useState<ProjectInput[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProjectInput[];
      setProjects(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'projects');
    });

    return () => unsubscribe();
  }, []);

  const createProject = async (file: File) => {
    if (!auth.currentUser) return;
    setIsUploading(true);
    
    try {
      // Set temporary file for processing
      useEditorStore.getState().setTempFile(file);
      
      const docRef = await addDoc(collection(db, 'projects'), {
        userId: auth.currentUser.uid,
        name: file.name.replace(/\.[^/.]+$/, ""), // remove extension
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      navigate(`/editor/${docRef.id}`);
    } catch (e: any) {
      console.error(e);
      handleFirestoreError(e, OperationType.CREATE, 'projects');
    } finally {
      setIsUploading(false);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', id));
      setDeletingId(null);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `projects/${id}`);
    }
  };

  const startEditing = (e: React.MouseEvent, proj: ProjectInput) => {
    e.stopPropagation();
    setEditingId(proj.id);
    setEditingName(proj.name);
  };

  const saveRename = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editingName.trim()) return;
    try {
      await updateDoc(doc(db, 'projects', id), {
        name: editingName.trim(),
        updatedAt: serverTimestamp()
      });
      setEditingId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    }
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      createProject(file);
    } else if (file) {
      alert("Please select a valid video file.");
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-[#fafafa]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12 border-b border-black pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Your Projects</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 mt-2">
              Note: Video processing uses client-side TensorFlow (BlazePose) to extract 3D landmarks securely.
            </p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span className="font-medium">New Project</span>
          </button>
          <input 
            type="file" 
            accept="video/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>

        {projects.length === 0 && !isUploading ? (
          <div className="border border-dashed border-black/20 p-16 flex flex-col items-center justify-center text-center bg-neutral-50 cursor-pointer hover:border-black transition-colors group" onClick={() => fileInputRef.current?.click()}>
            <div className="h-16 w-16 border border-black/10 bg-white justify-center items-center mb-6 group-hover:scale-110 transition-transform hidden sm:flex">
              <Upload size={20} className="text-black" />
            </div>
            <h3 className="text-[10px] uppercase font-bold tracking-widest mb-2 text-black">Upload a video</h3>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest max-w-sm">
              Drag and drop an mp4, mov, or webm file to start extracting motion data.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div 
                key={proj.id} 
                onClick={() => navigate(`/editor/${proj.id}`)}
                className="group bg-white border border-black p-6 flex flex-col justify-between cursor-pointer hover:bg-neutral-50 transition-colors h-48"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-black/10 pb-4">
                    <div className="flex items-center gap-2">
                       <Film size={14} className="text-black" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Project</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="hidden group-hover:flex items-center gap-1 mr-2 transition-opacity">
                        <button onClick={(e) => startEditing(e, proj)} className="p-1 hover:bg-neutral-200 text-neutral-500 hover:text-black transition-colors rounded">
                          <Pencil size={12} />
                        </button>
                        {deletingId === proj.id ? (
                          <div className="flex items-center gap-1 bg-red-50 text-red-600 px-1 rounded border border-red-200" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[8px] font-bold uppercase">Confirm?</span>
                            <button onClick={(e) => deleteProject(e, proj.id)} className="p-0.5 hover:bg-red-200 rounded"><Check size={10} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(null); }} className="p-0.5 hover:bg-red-200 rounded"><X size={10} /></button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setDeletingId(proj.id); }} className="p-1 hover:bg-red-100 text-neutral-500 hover:text-red-500 transition-colors rounded">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      {proj.status === 'ready' ? (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-black border border-black px-1.5 py-0.5">Ready</span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500 border border-neutral-300 px-1.5 py-0.5">{proj.status}</span>
                      )}
                    </div>
                  </div>
                  {editingId === proj.id ? (
                    <form onSubmit={(e) => saveRename(e, proj.id)} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input 
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        type="text" 
                        value={editingName} 
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full border-b-2 border-black outline-none font-black text-lg tracking-tighter uppercase px-1 py-0.5 bg-transparent"
                      />
                      <button type="submit" className="p-1 text-green-600 hover:bg-green-50"><Check size={16} /></button>
                      <button type="button" onClick={cancelRename} className="p-1 text-red-600 hover:bg-red-50"><X size={16} /></button>
                    </form>
                  ) : (
                    <h3 className="font-black text-lg tracking-tighter uppercase leading-tight truncate pr-8" title={proj.name}>{proj.name}</h3>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>{proj.createdAt?.seconds ? new Date(proj.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                  </div>
                  <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-black" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
