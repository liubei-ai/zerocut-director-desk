import { MousePointer, User, Pencil, ImageDown, ImagePlus, X, Eraser, HelpCircle, RotateCcw, Copy, Check, Type } from 'lucide-react';
import { useRef, useState } from 'react';
import { useSceneStore } from '../lib/sceneStore';

const POV_PROMPT = '画面中的红色线条与箭头仅为镜头运动轨迹的示意参考，最终输出的视频中必须完全清除这些标记，采用第一人称FPV视角，进行超高速、电影级的一镜到底拍摄，严格依照图示红色路径运行，不得偏移、跳跃或简化路径。沿途建筑需呈现清晰的结构、合理的轮廓以及强烈的纹理质感。整体画面追求写实风格，运动平滑稳定，速度感十足，空间连续明确，且不出现重复的建筑。特别注意：最终成片里不得残留任何红线或箭头涂鸦。';

type Tool = 'select' | 'character' | 'draw' | 'text';

const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer size={16} />, label: '选择' },
  { id: 'character', icon: <User size={16} />, label: '角色' },
  { id: 'draw', icon: <Pencil size={16} />, label: '画线' },
  { id: 'text', icon: <Type size={16} />, label: '文字' },
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d]">
          <h2 className="text-white font-semibold text-base">使用说明</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-[#4a6a7a] hover:bg-[#1a2a3a] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
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

          <section>
            <h3 className="flex items-center gap-2 text-amber-400 font-medium mb-2">
              <Type size={14} />
              文字标注
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li>点击工具栏 <strong className="text-white">文字</strong> 按钮激活文字模式</li>
              <li>在画布任意位置 <strong className="text-white">点击</strong>，输入文字后按 <kbd className="bg-[#1a2a3a] border border-[#2a4a6a] rounded px-1.5 py-0.5 text-[11px] text-[#aac4d4]">Enter</kbd> 或点击其他位置确认</li>
              <li>工具栏中可更改 <strong className="text-white">字号</strong>、<strong className="text-white">文字颜色</strong> 和 <strong className="text-white">背景颜色 / 透明度</strong></li>
              <li>文字模式下每个标注左上角会出现 <strong className="text-white">×</strong> 按钮，点击可单独删除</li>
              <li>点击 <strong className="text-white">清除</strong> 删除所有文字标注</li>
            </ul>
          </section>

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

          <section>
            <h3 className="flex items-center gap-2 text-[#22c55e] font-medium mb-2">
              <ImageDown size={14} />
              导出 PNG
            </h3>
            <ul className="space-y-1.5 text-[#8babc4]">
              <li>点击工具栏 <strong className="text-white">导出 PNG</strong> 进入截图模式</li>
              <li><strong className="text-white">导出全图</strong>：右上角按钮，一键导出完整画面</li>
              <li><strong className="text-white">框选导出</strong>：在画布上拖拽选定区域，松开后点击"导出选区 PNG"</li>
              <li>无背景图时导出透明背景；有背景图时包含背景图像；绘制的线条与文字标注也会一并导出</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Toolbar() {
  const [showHelp, setShowHelp] = useState(() => !localStorage.getItem('helpSeen'));
  const [copied, setCopied] = useState(false);
  const store = useSceneStore();
  const hasCurves = useSceneStore((s) => s.hasCurves);
  const addCharacterMode = useSceneStore((s) => s.addCharacterMode);
  const drawMode = useSceneStore((s) => s.drawMode);
  const textMode = useSceneStore((s) => s.textMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive active tool from store — stays in sync with external activations (e.g. ScenePanel)
  const active: Tool = drawMode ? 'draw' : textMode ? 'text' : addCharacterMode ? 'character' : 'select';

  const closeHelp = () => {
    localStorage.setItem('helpSeen', '1');
    setShowHelp(false);
  };

  const handleTool = (id: Tool) => {
    store.setAddCharacterMode(id === 'character');
    store.setDrawMode(id === 'draw');
    store.setTextMode(id === 'text');
  };

  const handleCopyPov = () => {
    navigator.clipboard.writeText(POV_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
                active === tool.id
                  ? tool.id === 'draw'
                    ? 'bg-red-600 text-white'
                    : tool.id === 'text'
                    ? 'bg-amber-500 text-white'
                    : 'bg-blue-600 text-white'
                  : 'text-[#4a6a7a] hover:bg-[#1a2a3a] hover:text-[#8babc4]'
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Center: contextual controls */}
        <div className="flex items-center gap-3">
          {/* Draw controls */}
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

          {/* Text annotation controls */}
          {active === 'text' && (
            <div className="flex items-center gap-2 bg-[#0d1820] border border-[#2a1e0a] rounded-lg px-3 py-1">
              <span className="text-[#6a5a2a] text-[10px] uppercase tracking-wider">字号</span>
              <input
                type="number"
                min={10}
                max={72}
                step={1}
                value={store.textFontSize}
                onChange={(e) => store.setTextFontSize(Math.max(10, Math.min(72, parseInt(e.target.value) || 18)))}
                className="w-12 bg-[#1a2a3a] border border-[#2a3a4a] rounded text-[#aac4d4] text-[11px] text-center px-1 py-0.5 tabular-nums"
                title="字号"
              />
              <span className="text-[#6a5a2a] text-[10px] uppercase tracking-wider ml-1">文字</span>
              <input
                type="color"
                value={store.textColor}
                onChange={(e) => store.setTextColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                title="文字颜色"
              />
              <span className="text-[#6a5a2a] text-[10px] uppercase tracking-wider ml-1">背景</span>
              <input
                type="color"
                value={store.textBgColor}
                onChange={(e) => store.setTextBgColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                title="背景颜色"
              />
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(store.textBgAlpha * 100)}
                onChange={(e) => store.setTextBgAlpha(parseInt(e.target.value) / 100)}
                className="w-16 accent-amber-500"
                title="背景透明度"
              />
              <span className="text-amber-400 text-[10px] tabular-nums w-7">{Math.round(store.textBgAlpha * 100)}%</span>
              <button
                onClick={() => store.clearTextAnnotations()}
                title="清除所有文字标注"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-amber-500 hover:text-amber-300 hover:bg-[#2a1e0a] text-[10px] border border-[#3a2a0a] hover:border-[#5a3a0a] transition-colors ml-1"
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

        {/* Right: POV copy + help + export */}
        <div className="flex items-center gap-2">
          {hasCurves && (
            <button
              onClick={handleCopyPov}
              title="复制 POV 提示词"
              className={`flex items-center gap-1.5 px-3 h-8 rounded text-xs font-medium transition-all ${
                copied
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-[#2a1a1a] text-[#ef9090] hover:bg-[#3a1a1a] hover:text-[#ffbbbb] border border-[#4a1a1a]'
              }`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? '已复制' : '复制 POV 提示词'}
            </button>
          )}
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
