import { lazy, Suspense } from 'react';
import ScenePanel from './components/ScenePanel';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';

const Viewport3D = lazy(() => import('./components/Viewport3D'));

export default function App() {
  return (
    <div className="w-screen h-screen bg-[#0a0f18] flex flex-col overflow-hidden font-sans select-none">
      <header className="h-10 flex-shrink-0 bg-[#0e161f] border-b border-[#1e2d3d] flex items-center px-4 z-20">
        <span className="text-[#4a9eff] text-sm font-bold tracking-wide">3D导演台</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ScenePanel />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-[#0a0f18] text-[#3a5a6a] text-sm">
                加载场景...
              </div>
            }
          >
            <Viewport3D />
          </Suspense>
          <Toolbar />
        </div>

        <PropertiesPanel />
      </div>
    </div>
  );
}
