import { MousePointer, Move, RotateCw, Maximize2, Camera, User, Grid, ScanLine, ImageDown } from 'lucide-react';
import { useState } from 'react';
import { useSceneStore } from '../lib/sceneStore';

type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'camera' | 'character' | 'grid' | 'frame';

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer size={16} />, label: '选择' },
  { id: 'move', icon: <Move size={16} />, label: '移动' },
  { id: 'rotate', icon: <RotateCw size={16} />, label: '旋转' },
  { id: 'scale', icon: <Maximize2 size={16} />, label: '缩放' },
  { id: 'camera', icon: <Camera size={16} />, label: '摄像机' },
  { id: 'character', icon: <User size={16} />, label: '角色' },
  { id: 'grid', icon: <Grid size={16} />, label: '网格' },
  { id: 'frame', icon: <ScanLine size={16} />, label: '取景框' },
];

export default function Toolbar() {
  const [active, setActive] = useState<Tool>('select');
  const store = useSceneStore();

  const handleTool = (id: Tool) => {
    setActive(id);
    if (id === 'character') {
      store.setAddCharacterMode(true);
    }
  };

  return (
    <div className="h-12 flex-shrink-0 bg-[#0e161f] border-t border-[#1e2d3d] flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleTool(tool.id)}
            title={tool.label}
            className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
              active === tool.id || (tool.id === 'character' && store.addCharacterMode)
                ? 'bg-blue-600 text-white'
                : 'text-[#4a6a7a] hover:bg-[#1a2a3a] hover:text-[#8babc4]'
            }`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Export button — right side */}
      <button
        onClick={() => store.setScreenshotMode(!store.screenshotMode)}
        title="导出透明背景 PNG"
        className={`flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium transition-colors ${
          store.screenshotMode
            ? 'bg-emerald-600 text-white'
            : 'bg-[#1a2a3a] text-[#6a9ab4] hover:bg-[#1e3348] hover:text-[#aac4d4] border border-[#1e3a5a]'
        }`}
      >
        <ImageDown size={14} />
        导出 PNG
      </button>
    </div>
  );
}
