import { useState } from 'react';
import { Search, User, Plus, Trash2 } from 'lucide-react';
import { useSceneStore, CHARACTER_COLORS } from '../lib/sceneStore';

export default function ScenePanel() {
  const [query, setQuery] = useState('');
  const store = useSceneStore();

  const filteredChars = store.characters.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-52 flex-shrink-0 bg-[#111820] border-r border-[#1e2d3d] flex flex-col h-full">
      <div className="px-3 py-3 border-b border-[#1e2d3d]">
        <span className="text-[#8babc4] text-sm font-medium">场景</span>
      </div>

      <div className="px-3 py-2 border-b border-[#1e2d3d]">
        <div className="flex items-center gap-2 bg-[#0d1820] border border-[#1e2d3d] rounded px-2 py-1">
          <Search size={12} className="text-[#4a6a7a]" />
          <input
            className="bg-transparent text-[#8babc4] text-xs outline-none flex-1 placeholder:text-[#3a5a6a]"
            placeholder="搜索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <div className="px-3 py-1.5 flex items-center justify-between group">
          <span className="text-[#4a6a7a] text-[10px] uppercase tracking-wider">角色</span>
          <button
            onClick={() => store.setAddCharacterMode(true)}
            className="opacity-0 group-hover:opacity-100 text-[#4a9eff] hover:text-white transition-opacity"
          >
            <Plus size={12} />
          </button>
        </div>
        {filteredChars.map((char) => {
          const color = CHARACTER_COLORS.find((c) => c.id === char.colorId)?.hex ?? '#3b82f6';
          return (
            <div
              key={char.id}
              onClick={() => store.selectItem(char.id)}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer group transition-colors ${
                store.selectedId === char.id
                  ? 'bg-[#1a3a5a] text-white'
                  : 'text-[#7a9ab4] hover:bg-[#141e28] hover:text-[#aac4d4]'
              }`}
            >
              <User size={13} className="flex-shrink-0" style={{ color }} />
              <span className="text-xs flex-1 truncate">{char.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); store.removeCharacter(char.id); }}
                className="opacity-0 group-hover:opacity-100 text-[#ef4444] hover:text-red-300 transition-opacity"
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-[#1e2d3d]">
        <button
          onClick={() => store.setAddCharacterMode(!store.addCharacterMode)}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-medium transition-colors ${
            store.addCharacterMode
              ? 'bg-blue-600 text-white'
              : 'bg-[#1a2a3a] text-[#4a9eff] hover:bg-[#1e3348] border border-[#1e3a5a]'
          }`}
        >
          <Plus size={13} />
          添加角色
        </button>
      </div>
    </div>
  );
}
