import { useState, useEffect, useRef } from 'react';
import { useSceneStore, CHARACTER_COLORS, getSelectedCharacter } from '../lib/sceneStore';
import { POSES, PoseId } from '../lib/poses';
import { User } from 'lucide-react';

function NumInput({
  label, value, onChange, step = 0.1,
}: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  const fmt = (n: number) => step >= 1 ? Math.round(n).toString() : n.toFixed(2);
  const [local, setLocal] = useState(() => fmt(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(fmt(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(n);
    else setLocal(fmt(value));
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[#4a6a7a] text-[10px] w-3">{label}</span>
      <input
        type="number"
        step={step}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => { focused.current = true; }}
        onBlur={(e) => { focused.current = false; commit(e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
        className="bg-[#0d1820] border border-[#1e2d3d] text-[#aac4d4] text-xs px-2 py-1 rounded w-20 outline-none focus:border-[#2a5a8a]"
      />
    </div>
  );
}

export default function PropertiesPanel() {
  const store = useSceneStore();
  const char = getSelectedCharacter(store);

  if (!char) {
    return (
      <div className="w-64 flex-shrink-0 bg-[#111820] border-l border-[#1e2d3d] flex flex-col h-full">
        <div className="px-3 py-3 border-b border-[#1e2d3d]">
          <span className="text-[#8babc4] text-sm font-medium">属性</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#3a5a6a] text-xs">
          未选中任何对象
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-[#111820] border-l border-[#1e2d3d] flex flex-col h-full overflow-y-auto">
      <CharacterProperties char={char} store={store} />
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <div className="px-3 py-2 mt-2 border-b border-[#1e2d3d]">
      <span className="text-[#4a6a7a] text-[10px] uppercase tracking-wider">{title}</span>
    </div>
  );
}

function CharacterProperties({ char, store }: { char: ReturnType<typeof getSelectedCharacter> & object; store: ReturnType<typeof useSceneStore> }) {
  if (!char) return null;
  return (
    <>
      <div className="px-3 py-3 border-b border-[#1e2d3d] flex items-center gap-2">
        <User size={14} className="text-[#4a9eff]" />
        <span className="text-[#8babc4] text-sm font-medium">角色属性</span>
      </div>

      <Section title="基本信息" />
      <div className="px-3 py-2 flex flex-col gap-2">
        <div>
          <label className="text-[#4a6a7a] text-[10px] block mb-1">名称</label>
          <input
            value={char.name}
            onChange={(e) => store.updateCharacter(char.id, { name: e.target.value })}
            className="w-full bg-[#0d1820] border border-[#1e2d3d] text-[#aac4d4] text-xs px-2 py-1.5 rounded outline-none focus:border-[#2a5a8a]"
          />
        </div>
      </div>

      <Section title="位置" />
      <div className="px-3 py-2 flex flex-col gap-2">
        <NumInput
          label="X"
          value={char.position[0]}
          onChange={(v) => store.updateCharacter(char.id, { position: [v, char.position[1], char.position[2]] })}
        />
        <NumInput
          label="Y"
          value={char.position[1]}
          onChange={(v) => store.updateCharacter(char.id, { position: [char.position[0], v, char.position[2]] })}
        />
        <NumInput
          label="Z"
          value={char.position[2]}
          onChange={(v) => store.updateCharacter(char.id, { position: [char.position[0], char.position[1], v] })}
        />
      </div>

      <Section title="旋转 (度)" />
      <div className="px-3 py-3 flex flex-col gap-3">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <div key={axis}>
            <div className="flex justify-between mb-1">
              <span className="text-[#4a6a7a] text-[10px]">{axis}</span>
              <span className="text-[#6a9ab4] text-[10px] tabular-nums">{Math.round(char.rotation[i])}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={char.rotation[i]}
              onChange={(e) => {
                const next = [...char.rotation] as [number, number, number];
                next[i] = parseFloat(e.target.value);
                store.updateCharacter(char.id, { rotation: next });
              }}
              className="w-full accent-blue-500"
            />
          </div>
        ))}
      </div>

      <Section title="颜色" />
      <div className="px-3 py-2">
        <div className="grid grid-cols-4 gap-1.5">
          {CHARACTER_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => store.updateCharacter(char.id, { colorId: c.id })}
              title={c.label}
              className={`w-full aspect-square rounded transition-transform hover:scale-110 ${
                char.colorId === c.id ? 'ring-2 ring-white ring-offset-1 ring-offset-[#111820] scale-110' : ''
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      <Section title="姿势" />
      <div className="px-3 py-2">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.entries(POSES) as [PoseId, { label: string }][]).map(([id, p]) => (
            <button
              key={id}
              onClick={() => store.updateCharacter(char.id, { pose: id })}
              className={`py-1.5 px-2 rounded text-[11px] transition-colors ${
                char.pose === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#1a2a3a] text-[#6a9ab4] hover:bg-[#1e3348] hover:text-[#aac4d4] border border-[#1e3a5a]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
