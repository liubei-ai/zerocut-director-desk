import { MousePointer, User, Pencil, ImageDown, ImagePlus, X, Eraser, HelpCircle, RotateCcw, Move, ZoomIn } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSceneStore } from '../lib/sceneStore';

type Tool = 'select' | 'character' | 'draw';

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer size={16} />, label: '选择' },
  { id: 'character', icon: <User size={16} />, label: '角色' },
  { id: 'draw', icon: <Pencil size={16} />, label: '画线' },
];

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[520px] max-h-[80vh] overflow-y-auto bg-[#0d1820] border border-[#1e3a5a] rounded-xl shadow-2xl text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d]">
          <h2 className="text-white font-semibold text-base">使用说明</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#4a6a7a] hover:bg-[#1a2a3a] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">

          {/* Camera */}
          <section>
            <h3 className="flex items-center gap-2 text-[#4a9eff] font-medium mb-2">
              <RotateCcw size={14} />
              视角操控
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li className="flex gap-3"><kbd className="shrink-0 bg-[#1a2a3a] border border-[#2a4a6a] rounded px-2 py-0.5 text-[11px] text-[#aac4d4]">左键拖拽</kbd><span>旋转视角</span></li>
              <li className="flex gap-3"><kbd className="shrink-0 bg-[#1a2a3a] border border-[#2a4a6a] rounded px-2 py-0.5 text-[11px] text-[#aac4d4]">右键拖拽</kbd><span>平移视角</span></li>
              <li className="flex gap-3"><kbd className="shrink-0 bg-[#1a2a3a] border border-[#2a4a6a] rounded px-2 py-0.5 text-[11px] text-[#aac4d4]">滚轮</kbd><span>缩放，也可拖动左下角滑条调整</span></li>
            </ul>
          </section>

          {/* Characters */}
          <section>
            <h3 className="flex items-center gap-2 text-[#4a9eff] font-medium mb-2">
              <User size={14} />
              角色
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li>点击工具栏 <strong className="text-white">角色</strong> 按钮，然后在场景地面点击放置新角色</li>
              <li>点击已有角色将其选中，右侧面板可修改姿势、颜色、位置</li>
              <li><kbd className="bg-[#1a2a3a] border border-[#2a4a6a] rounded px-1.5 py-0.5 text-[11px] text-[#aac4d4]">Ctrl</kbd> <strong className="text-white">+ 拖拽角色</strong> 可在场景中自由移动该角色的位置</li>
              <li>左侧角色列表可重命名或删除角色</li>
            </ul>
          </section>

          {/* Draw */}
          <section>
            <h3 className="flex items-center gap-2 text-[#ef4444] font-medium mb-2">
              <Pencil size={14} />
              画线
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li>点击工具栏 <strong className="text-white">画线</strong> 按钮激活绘制模式（视角操控暂时关闭）</li>
              <li>在画布上 <strong className="text-white">拖拽鼠标</strong> 即可沿轨迹绘制曲线</li>
              <li>工具栏中可更改 <strong className="text-white">线条颜色</strong>（默认红色）和 <strong className="text-white">粗细</strong>（1–20）</li>
              <li>点击 <strong className="text-white">清除</strong> 删除所有已绘线条</li>
              <li>点击 <strong className="text-white">选择</strong> 退出画线模式并恢复视角操控</li>
            </ul>
          </section>

          {/* Background */}
          <section>
            <h3 className="flex items-center gap-2 text-[#4a9eff] font-medium mb-2">
              <ImagePlus size={14} />
              背景图
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li>点击工具栏 <strong className="text-white">背景图</strong> 按钮上传本地图片（JPG / PNG / WebP 均可）</li>
              <li>背景图加载后地面与网格自动隐藏，角色渲染于背景之上</li>
              <li>点击缩略图右侧的 <strong className="text-white">×</strong> 可移除背景，恢复默认场景</li>
            </ul>
          </section>

          {/* Export */}
          <section>
            <h3 className="flex items-center gap-2 text-[#22c55e] font-medium mb-2">
              <ImageDown size={14} />
              导出 PNG
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li>点击工具栏 <strong className="text-white">导出 PNG</strong> 进入截图模式</li>
              <li><strong className="text-white">导出全图</strong>：右上角按钮，一键导出完整画面</li>
              <li><strong className="text-white">框选导出</strong>：在画布上拖拽选定区域，松开后点击"导出选区 PNG"</li>
              <li>无背景图时导出透明背景；有背景图时包含背景图像；绘制的线条也会一并导出</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
}

export default function Toolbar() {
  const [active, setActive] = useState<Tool>('select');
  const [showHelp, setShowHelp] = useState(() => !localStorage.getItem('helpSeen'));
  const store = useSceneStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeHelp = () => {
    localStorage.setItem('helpSeen', '1');
    setShowHelp(false);
  };

  const handleTool = (id: Tool) => {
    setActive(id);
    store.setAddCharacterMode(id === 'character');
    store.setDrawMode(id === 'draw');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      if (url) store.setBackgroundImage(url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      {showHelp && <HelpModal onClose={closeHelp} />}

      <div className="h-12 flex-shrink-0 bg-[#0e161f] border-t border-[#1e2d3d] flex items-center justify-between px-4">
        {/* Left: tool buttons */}
        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleTool(tool.id)}
              title={tool.label}
              className={`w-9 h-9 flex items-center justify-center rounded transition-colors ${
                active === tool.id || (tool.id === 'character' && store.addCharacterMode)
                  ? tool.id === 'draw' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  : 'text-[#4a6a7a] hover:bg-[#1a2a3a] hover:text-[#8babc4]'
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Center: contextual controls */}
        <div className="flex items-center gap-3">
          {/* Draw controls — visible when draw tool active */}
          {active === 'draw' && (
            <div className="flex items-center gap-2 bg-[#0d1820] border border-[#2a1a1a] rounded-lg px-3 py-1">
              <span className="text-[#6a4a4a] text-[10px] uppercase tracking-wider">颜色</span>
              <input
                type="color"
                value={store.curveColor}
                onChange={(e) => store.setCurveColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                title="线条颜色"
              />
              <span className="text-[#6a4a4a] text-[10px] uppercase tracking-wider ml-1">粗细</span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={store.curveWidth}
                onChange={(e) => store.setCurveWidth(parseInt(e.target.value))}
                className="w-20 accent-red-500"
              />
              <span className="text-[#ef4444] text-[10px] tabular-nums w-4">{store.curveWidth}</span>
              <button
                onClick={() => store.triggerClearCurves()}
                title="清除所有线条"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[#ef4444] hover:text-red-300 hover:bg-[#2a1a1a] text-[10px] border border-[#3a1a1a] hover:border-[#5a1a1a] transition-colors ml-1"
              >
                <Eraser size={11} />
                清除
              </button>
            </div>
          )}

          {/* Background controls */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {store.backgroundDataUrl ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded border border-[#2a5a8a] overflow-hidden flex-shrink-0"
                style={{ backgroundImage: `url(${store.backgroundDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
              <span className="text-[#4a9eff] text-xs">背景图已加载</span>
              <button
                onClick={() => store.setBackgroundImage(null)}
                title="移除背景图"
                className="w-5 h-5 flex items-center justify-center rounded text-[#ef4444] hover:bg-[#2a1a1a] transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              title="上传背景图"
              className="flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium transition-colors bg-[#1a2a3a] text-[#6a9ab4] hover:bg-[#1e3348] hover:text-[#aac4d4] border border-[#1e3a5a]"
            >
              <ImagePlus size={14} />
              背景图
            </button>
          )}
        </div>

        {/* Right: help + export */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            title="使用说明"
            className="w-9 h-9 flex items-center justify-center rounded text-[#4a6a7a] hover:bg-[#1a2a3a] hover:text-[#8babc4] transition-colors"
          >
            <HelpCircle size={16} />
          </button>
          <button
            onClick={() => store.setScreenshotMode(!store.screenshotMode)}
            title={store.backgroundDataUrl ? '导出含背景 PNG' : '导出透明背景 PNG'}
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
      </div>
    </>
  );
}
