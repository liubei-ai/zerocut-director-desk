import { create } from 'zustand';
import { PoseId } from './poses';

export const CHARACTER_COLORS = [
  { id: 'blue', label: '蓝色', hex: '#3b82f6' },
  { id: 'red', label: '红色', hex: '#ef4444' },
  { id: 'green', label: '绿色', hex: '#22c55e' },
  { id: 'orange', label: '橙色', hex: '#f97316' },
  { id: 'purple', label: '紫色', hex: '#a855f7' },
  { id: 'yellow', label: '黄色', hex: '#eab308' },
  { id: 'cyan', label: '青色', hex: '#06b6d4' },
  { id: 'pink', label: '粉色', hex: '#ec4899' },
];

export interface CharacterState {
  id: string;
  name: string;
  colorId: string;
  pose: PoseId;
  position: [number, number, number];
  /** Euler angles in degrees (X, Y, Z) */
  rotation: [number, number, number];
}

interface SceneStore {
  characters: CharacterState[];
  selectedId: string | null;
  addCharacterMode: boolean;
  screenshotMode: boolean;

  addCharacter: (pos: [number, number, number]) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, patch: Partial<CharacterState>) => void;
  selectItem: (id: string | null) => void;
  setAddCharacterMode: (v: boolean) => void;
  setScreenshotMode: (v: boolean) => void;
}

let charCounter = 0;

export const useSceneStore = create<SceneStore>((set) => ({
  selectedId: null,
  addCharacterMode: false,
  screenshotMode: false,
  characters: [
    {
      id: 'char-1',
      name: '角色A',
      colorId: 'blue',
      pose: 'stand',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    },
  ],

  addCharacter: (pos) => {
    charCounter++;
    const id = `char-${Date.now()}`;
    const colorId = CHARACTER_COLORS[charCounter % CHARACTER_COLORS.length].id;
    set((s) => ({
      characters: [
        ...s.characters,
        {
          id,
          name: `角色${String.fromCharCode(64 + s.characters.length + 1)}`,
          colorId,
          pose: 'stand',
          position: pos,
          rotation: [0, 0, 0],
        },
      ],
      selectedId: id,
      addCharacterMode: false,
    }));
  },

  removeCharacter: (id) =>
    set((s) => ({
      characters: s.characters.filter((c) => c.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  updateCharacter: (id, patch) =>
    set((s) => ({
      characters: s.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  selectItem: (id) => set({ selectedId: id }),
  setAddCharacterMode: (v) => set({ addCharacterMode: v }),
  setScreenshotMode: (v) => set({ screenshotMode: v }),
}));

export function getSelectedCharacter(store: SceneStore) {
  return store.characters.find((c) => c.id === store.selectedId) ?? null;
}
