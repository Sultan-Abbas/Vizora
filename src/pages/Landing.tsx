import { useAuthStore } from '../lib/firebase';
import { Navigate } from 'react-router-dom';

export function Landing() {
  const { user, login } = useAuthStore();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-black selection:bg-black selection:text-white font-sans">
      <div className="max-w-md w-full space-y-12 text-center">
        <div className="space-y-6 flex flex-col items-center">
          <div className="h-16 w-16 border-2 border-black mx-auto transform rotate-45 mb-8" />
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mt-4">
            VIZORA
          </h1>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-relaxed">
            AI-powered motion capture from video. Extract rigs, edit keyframes, and export to Blender right from your browser.
          </p>
        </div>

        <button
          onClick={login}
          className="bg-black text-white px-8 py-4 text-[10px] uppercase font-bold tracking-widest hover:bg-gray-900 transition-colors w-full flex justify-center items-center gap-3 group"
        >
          <span>Continue with Google</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>

        <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
          Geometric Balance
        </div>
      </div>
    </div>
  );
}
