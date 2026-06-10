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

export interface TextAnnotation {
  id: string;
  xFrac: number;
  yFrac: number;
  text: string;
  fontSize: number;
  color: string;
  bgColor: string;
  bgAlpha: number;
}

interface SceneStore {
  characters: CharacterState[];
  selectedId: string | null;
  selectedTextId: string | null;
  addCharacterMode: boolean;
  screenshotMode: boolean;
  backgroundDataUrl: string | null;
  drawMode: boolean;
  hasCurves: boolean;
  curveColor: string;
  curveWidth: number;
  clearCurvesSignal: number;
  textMode: boolean;
  textAnnotations: TextAnnotation[];
  textFontSize: number;
  textColor: string;
  textBgColor: string;
  textBgAlpha: number;

  addCharacter: (pos: [number, number, number]) => void;
  removeCharacter: (id: string) => void;
  updateCharacter: (id: string, patch: Partial<CharacterState>) => void;
  selectItem: (id: string | null) => void;
  setAddCharacterMode: (v: boolean) => void;
  setScreenshotMode: (v: boolean) => void;
  setBackgroundImage: (url: string | null) => void;
  setDrawMode: (v: boolean) => void;
  setHasCurves: (v: boolean) => void;
  setCurveColor: (c: string) => void;
  setCurveWidth: (w: number) => void;
  triggerClearCurves: () => void;
  setTextMode: (v: boolean) => void;
  setTextFontSize: (n: number) => void;
  setTextColor: (c: string) => void;
  setTextBgColor: (c: string) => void;
  setTextBgAlpha: (n: number) => void;
  addTextAnnotation: (ann: TextAnnotation) => void;
  updateTextAnnotation: (id: string, patch: Partial<TextAnnotation>) => void;
  removeTextAnnotation: (id: string) => void;
  clearTextAnnotations: () => void;
  selectTextAnnotation: (id: string | null) => void;
}

let charCounter = 0;

export const useSceneStore = create<SceneStore>((set) => ({
  selectedId: null,
  selectedTextId: null,
  addCharacterMode: false,
  screenshotMode: false,
  backgroundDataUrl: null,
  drawMode: false,
  hasCurves: false,
  curveColor: '#ef4444',
  curveWidth: 4,
  clearCurvesSignal: 0,
  textMode: false,
  textAnnotations: [],
  textFontSize: 18,
  textColor: '#ffffff',
  textBgColor: '#000000',
  textBgAlpha: 0.55,
  characters: [],

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
      selectedTextId: null,
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

  selectItem: (id) => set({ selectedId: id, selectedTextId: null }),
  setAddCharacterMode: (v) => set(v ? { addCharacterMode: true, drawMode: false, textMode: false } : { addCharacterMode: false }),
  setScreenshotMode: (v) => set({ screenshotMode: v }),
  setBackgroundImage: (url) => set({ backgroundDataUrl: url }),
  setDrawMode: (v) => set(v ? { drawMode: true, addCharacterMode: false, textMode: false } : { drawMode: false }),
  setHasCurves: (v) => set({ hasCurves: v }),
  setCurveColor: (c) => set({ curveColor: c }),
  setCurveWidth: (w) => set({ curveWidth: w }),
  triggerClearCurves: () => set((s) => ({ clearCurvesSignal: s.clearCurvesSignal + 1, hasCurves: false })),
  setTextMode: (v) => set(v ? { textMode: true, addCharacterMode: false, drawMode: false } : { textMode: false }),
  setTextFontSize: (n) => set({ textFontSize: n }),
  setTextColor: (c) => set({ textColor: c }),
  setTextBgColor: (c) => set({ textBgColor: c }),
  setTextBgAlpha: (n) => set({ textBgAlpha: n }),

  addTextAnnotation: (ann) => set((s) => ({ textAnnotations: [...s.textAnnotations, ann] })),
  updateTextAnnotation: (id, patch) =>
    set((s) => ({
      textAnnotations: s.textAnnotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    })),
  removeTextAnnotation: (id) =>
    set((s) => ({
      textAnnotations: s.textAnnotations.filter((a) => a.id !== id),
      selectedTextId: s.selectedTextId === id ? null : s.selectedTextId,
    })),
  clearTextAnnotations: () => set({ textAnnotations: [], selectedTextId: null }),

  selectTextAnnotation: (id) => set({ selectedTextId: id, selectedId: null }),
}));

export function getSelectedCharacter(store: SceneStore) {
  return store.characters.find((c) => c.id === store.selectedId) ?? null;
}

export function getSelectedTextAnnotation(store: SceneStore) {
  return store.textAnnotations.find((a) => a.id === store.selectedTextId) ?? null;
}
