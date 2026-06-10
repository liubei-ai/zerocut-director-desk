import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useSceneStore, CHARACTER_COLORS, TextAnnotation } from '../lib/sceneStore';
import { createCharacterModel, applyPose, setCharacterColor, CharacterModel } from '../lib/humanoid';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';

const DEG = Math.PI / 180;

// ─── scene builder ────────────────────────────────────────────────────────────

function buildScene(scene: THREE.Scene) {
  scene.background = new THREE.Color(0x08101a);
  scene.fog = new THREE.FogExp2(0x08101a, 0.016);

  const grid = new THREE.GridHelper(60, 60, 0x0d2a40, 0x091d2d);
  grid.userData.sceneChrome = true;
  scene.add(grid);

  const planeMat = new THREE.MeshStandardMaterial({ color: 0x060e18, roughness: 1 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.001;
  plane.receiveShadow = true;
  plane.userData.sceneChrome = true;
  scene.add(plane);

  scene.add(new THREE.AmbientLight(0x3a556a, 3.0));
  const sun = new THREE.DirectionalLight(0xffffff, 4.0);
  sun.position.set(10, 16, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x4488cc, 1.2);
  fill.position.set(-8, 5, -5);
  scene.add(fill);

  const ax = new THREE.AxesHelper(1);
  ax.userData.sceneChrome = true;
  scene.add(ax);
}

// ─── raycasting helpers ───────────────────────────────────────────────────────

function getNDC(e: MouseEvent, renderer: THREE.WebGLRenderer) {
  const rect = renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );
}

function raycastFloor(e: MouseEvent, cam: THREE.Camera, renderer: THREE.WebGLRenderer, floor: THREE.Mesh) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(getNDC(e, renderer), cam);
  const hits = ray.intersectObject(floor);
  return hits[0]?.point ?? null;
}

function raycastCharacter(e: MouseEvent, cam: THREE.Camera, renderer: THREE.WebGLRenderer, roots: THREE.Object3D[]) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(getNDC(e, renderer), cam);
  const hits = ray.intersectObjects(roots, true);
  if (!hits.length) return null;
  let obj: THREE.Object3D | null = hits[0].object;
  while (obj) {
    if (obj.userData.characterId) return obj.userData.characterId as string;
    obj = obj.parent;
  }
  return null;
}

// ─── export helper ────────────────────────────────────────────────────────────

interface DrawnCurve { points: { x: number; y: number }[]; color: string; width: number; }

function exportTransparentPng(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  models: Map<string, CharacterModel>,
  mountEl: HTMLDivElement,
  sel: { x: number; y: number; w: number; h: number },
  drawCanvas?: HTMLCanvasElement | null
) {
  const hasBackground = scene.background instanceof THREE.Texture;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const vW = mountEl.clientWidth;
  const vH = mountEl.clientHeight;

  const off = new THREE.WebGLRenderer({ alpha: !hasBackground, antialias: true, preserveDrawingBuffer: true });
  off.setPixelRatio(dpr);
  off.setSize(vW, vH);
  off.toneMapping = THREE.ACESFilmicToneMapping;
  off.toneMappingExposure = 0.9;
  if (!hasBackground) off.setClearColor(0x000000, 0);

  const savedBg = scene.background;
  const savedFog = scene.fog;
  if (!hasBackground) scene.background = null;
  scene.fog = null;

  const charRoots = new Set(Array.from(models.values()).map((m) => m.root));
  const toRestore: { obj: THREE.Object3D; vis: boolean }[] = [];
  for (const child of scene.children) {
    if (child instanceof THREE.Light) continue;
    if (charRoots.has(child as THREE.Group)) continue;
    if (child.userData.nameLabel) continue;
    toRestore.push({ obj: child, vis: child.visible });
    child.visible = false;
  }

  off.render(scene, camera);

  scene.background = savedBg;
  scene.fog = savedFog;
  for (const { obj, vis } of toRestore) obj.visible = vis;

  const pixX = Math.round(sel.x * dpr);
  const pixY = Math.round(sel.y * dpr);
  const pixW = Math.round(sel.w * dpr);
  const pixH = Math.round(sel.h * dpr);

  const crop = document.createElement('canvas');
  crop.width = pixW;
  crop.height = pixH;
  const ctx = crop.getContext('2d')!;
  ctx.drawImage(off.domElement, -pixX, -pixY);
  if (drawCanvas && drawCanvas.width > 0) {
    ctx.drawImage(drawCanvas, -pixX, -pixY);
  }
  off.dispose();

  crop.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pose-export-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}

// ─── selection rect type ──────────────────────────────────────────────────────

interface SelRect { x: number; y: number; w: number; h: number }

function normalizeRect(a: { x: number; y: number }, b: { x: number; y: number }): SelRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  };
}

// ─── name label sprites ───────────────────────────────────────────────────────

const LABEL_Y_OFFSET = 2.05;

function makeNameCanvas(name: string, colorHex: string): HTMLCanvasElement {
  const W = 320, H = 76;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const r = 14;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(W - r, 0);
  ctx.arcTo(W, 0, W, r, r); ctx.lineTo(W, H - r);
  ctx.arcTo(W, H, W - r, H, r); ctx.lineTo(r, H);
  ctx.arcTo(0, H, 0, H - r, r); ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r); ctx.closePath();
  ctx.fillStyle = 'rgba(3, 12, 26, 0.84)';
  ctx.fill();
  ctx.strokeStyle = colorHex + 'bb';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ddeeff';
  ctx.font = 'bold 36px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, W / 2, H / 2);
  return c;
}

function createNameSprite(name: string, colorHex: string): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(makeNameCanvas(name, colorHex)),
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.4, 0.33, 1);
  sprite.userData.nameLabel = true;
  return sprite;
}

function refreshNameSprite(sprite: THREE.Sprite, name: string, colorHex: string) {
  const mat = sprite.material as THREE.SpriteMaterial;
  mat.map?.dispose();
  mat.map = new THREE.CanvasTexture(makeNameCanvas(name, colorHex));
  mat.needsUpdate = true;
}

// ─── text annotation rendering ────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function drawTextAnnotations(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, annotations: TextAnnotation[]) {
  for (const ann of annotations) {
    const x = ann.xFrac * canvas.offsetWidth;
    const y = ann.yFrac * canvas.offsetHeight;
    ctx.save();
    ctx.font = `bold ${ann.fontSize}px system-ui, "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(ann.text);
    const textW = metrics.width;
    const textH = ann.fontSize * 1.3;
    const pad = 6;
    ctx.fillStyle = `rgba(${hexToRgb(ann.bgColor)},${ann.bgAlpha})`;
    const rx = 4;
    const bx = x - pad, by = y - pad, bw = textW + pad * 2, bh = textH + pad * 2;
    ctx.beginPath();
    ctx.moveTo(bx + rx, by);
    ctx.lineTo(bx + bw - rx, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + rx, rx);
    ctx.lineTo(bx + bw, by + bh - rx);
    ctx.arcTo(bx + bw, by + bh, bx + bw - rx, by + bh, rx);
    ctx.lineTo(bx + rx, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - rx, rx);
    ctx.lineTo(bx, by + rx);
    ctx.arcTo(bx, by, bx + rx, by, rx);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ann.color;
    ctx.fillText(ann.text, x, y);
    ctx.restore();
  }
}

// ─── component ────────────────────────────────────────────────────────────────

interface PendingInput { xFrac: number; yFrac: number; cssX: number; cssY: number; }

export default function Viewport3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelsRef = useRef<Map<string, CharacterModel>>(new Map());
  const nameSpritesRef = useRef<Map<string, { sprite: THREE.Sprite; name: string; color: string }>>(new Map());
  const controlsRef = useRef<OrbitControls | null>(null);
  const [cameraDistance, setCameraDistance] = useState(19.3);

  // 2D drawing canvas
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const curvesRef = useRef<DrawnCurve[]>([]);
  const currentCurveRef = useRef<DrawnCurve | null>(null);
  const isDrawingRef = useRef(false);
  const renderCanvas2DRef = useRef<() => void>(() => {});
  const drawMode = useSceneStore((s) => s.drawMode);
  const clearCurvesSignal = useSceneStore((s) => s.clearCurvesSignal);
  const textMode = useSceneStore((s) => s.textMode);
  const textAnnotations = useSceneStore((s) => s.textAnnotations);
  const removeTextAnnotation = useSceneStore((s) => s.removeTextAnnotation);

  // Pending text input state
  const [pendingInput, setPendingInput] = useState<PendingInput | null>(null);
  const pendingInputRef = useRef<HTMLInputElement>(null);

  // Screenshot selection state
  const [selState, setSelState] = useState<'idle' | 'drawing' | 'done'>('idle');
  const selStart = useRef({ x: 0, y: 0 });
  const [selRect, setSelRect] = useState<SelRect | null>(null);

  const screenshotMode = useSceneStore((s) => s.screenshotMode);
  const setScreenshotMode = useSceneStore((s) => s.setScreenshotMode);
  const addMode = useSceneStore((s) => s.addCharacterMode);

  useEffect(() => {
    if (!screenshotMode) {
      setSelState('idle');
      setSelRect(null);
    }
  }, [screenshotMode]);

  // Re-render canvas when text annotations change
  useEffect(() => {
    renderCanvas2DRef.current();
  }, [textAnnotations]);

  // ── Overlay mouse handlers ──────────────────────────────────────────────────
  const onOverlayMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!screenshotMode) return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    selStart.current = pt;
    setSelState('drawing');
    setSelRect({ x: pt.x, y: pt.y, w: 0, h: 0 });
  }, [screenshotMode]);

  const onOverlayMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (selState !== 'drawing') return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setSelRect(normalizeRect(selStart.current, pt));
  }, [selState]);

  const onOverlayMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (selState !== 'drawing') return;
    const rect = overlayRef.current!.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const r = normalizeRect(selStart.current, pt);
    if (r.w < 10 || r.h < 10) {
      setSelState('idle');
      setSelRect(null);
    } else {
      setSelRect(r);
      setSelState('done');
    }
  }, [selState]);

  const handleExport = useCallback(() => {
    if (!selRect || !sceneRef.current || !cameraRef.current || !mountRef.current) return;
    exportTransparentPng(sceneRef.current, cameraRef.current, modelsRef.current, mountRef.current, selRect, drawCanvasRef.current);
  }, [selRect]);

  const handleExportFull = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !mountRef.current) return;
    const { clientWidth: w, clientHeight: h } = mountRef.current;
    exportTransparentPng(sceneRef.current, cameraRef.current, modelsRef.current, mountRef.current, { x: 0, y: 0, w, h }, drawCanvasRef.current);
  }, []);

  // ── 2D drawing helpers ──────────────────────────────────────────────────────
  const renderCanvas2D = useCallback(() => {
    const ctx = drawCtxRef.current;
    const canvas = drawCanvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    const drawCurve = (curve: DrawnCurve) => {
      if (curve.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = curve.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(curve.points[0].x, curve.points[0].y);
      for (let i = 1; i < curve.points.length; i++) ctx.lineTo(curve.points[i].x, curve.points[i].y);
      ctx.stroke();
      ctx.restore();
    };
    for (const curve of curvesRef.current) drawCurve(curve);
    if (currentCurveRef.current) drawCurve(currentCurveRef.current);
    drawTextAnnotations(ctx, canvas, useSceneStore.getState().textAnnotations);
  }, []);
  renderCanvas2DRef.current = renderCanvas2D;

  const handleDrawMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = useSceneStore.getState();
    if (!s.drawMode) return;
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    isDrawingRef.current = true;
    currentCurveRef.current = {
      points: [{ x: e.clientX - rect.left, y: e.clientY - rect.top }],
      color: s.curveColor,
      width: s.curveWidth,
    };
  }, []);

  const handleDrawMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentCurveRef.current) return;
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    currentCurveRef.current.points.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    renderCanvas2D();
  }, [renderCanvas2D]);

  const handleDrawMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentCurveRef.current && currentCurveRef.current.points.length > 1) {
      curvesRef.current.push(currentCurveRef.current);
      useSceneStore.getState().setHasCurves(true);
    }
    currentCurveRef.current = null;
    renderCanvas2D();
  }, [renderCanvas2D]);

  // ── Text mode click handler ─────────────────────────────────────────────────
  const handleTextCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = useSceneStore.getState();
    if (!s.textMode || pendingInput) return;
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    setPendingInput({ cssX, cssY, xFrac: cssX / rect.width, yFrac: cssY / rect.height });
  }, [pendingInput]);

  const confirmPendingText = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed && pendingInput) {
      const s = useSceneStore.getState();
      s.addTextAnnotation({
        id: `text-${Date.now()}`,
        xFrac: pendingInput.xFrac,
        yFrac: pendingInput.yFrac,
        text: trimmed,
        fontSize: s.textFontSize,
        color: s.textColor,
        bgColor: s.textBgColor,
        bgAlpha: s.textBgAlpha,
      });
    }
    setPendingInput(null);
  }, [pendingInput]);

  useEffect(() => {
    curvesRef.current = [];
    currentCurveRef.current = null;
    isDrawingRef.current = false;
    renderCanvas2D();
  }, [clearCurvesSignal, renderCanvas2D]);

  // ── Three.js init ───────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current!;

    const scene = new THREE.Scene();
    buildScene(scene);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    mount.appendChild(renderer.domElement);

    const drawCanvas = drawCanvasRef.current!;
    const initDrawCanvas = () => {
      drawCanvas.width = mount.clientWidth * dpr;
      drawCanvas.height = mount.clientHeight * dpr;
      drawCanvas.style.width = mount.clientWidth + 'px';
      drawCanvas.style.height = mount.clientHeight + 'px';
      const ctx2d = drawCanvas.getContext('2d')!;
      ctx2d.scale(dpr, dpr);
      drawCtxRef.current = ctx2d;
    };
    initDrawCanvas();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.minDistance = 2;
    controls.maxDistance = 80;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controlsRef.current = controls;

    const syncZoom = () => {
      setCameraDistance(Math.round(camera.position.distanceTo(controls.target) * 10) / 10);
    };
    controls.addEventListener('change', syncZoom);
    syncZoom();

    let lastBgUrl: string | null = null;
    const applyBackground = (url: string | null) => {
      if (url === lastBgUrl) return;
      lastBgUrl = url;
      if (url) {
        new THREE.TextureLoader().load(url, (texture) => {
          if (scene.background instanceof THREE.Texture) scene.background.dispose();
          texture.colorSpace = THREE.SRGBColorSpace;
          scene.background = texture;
          scene.fog = null;
          for (const child of scene.children) {
            if (child.userData.sceneChrome) child.visible = false;
          }
        });
      } else {
        if (scene.background instanceof THREE.Texture) scene.background.dispose();
        scene.background = new THREE.Color(0x08101a);
        scene.fog = new THREE.FogExp2(0x08101a, 0.016);
        for (const child of scene.children) {
          if (child.userData.sceneChrome) child.visible = true;
        }
      }
    };
    applyBackground(useSceneStore.getState().backgroundDataUrl);
    const unsubBg = useSceneStore.subscribe((s) => applyBackground(s.backgroundDataUrl));

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    scene.add(floorMesh);

    const models = modelsRef.current;
    const nameSprites = nameSpritesRef.current;

    function syncCharacters() {
      const { characters, selectedId } = useSceneStore.getState();
      const currentIds = new Set(characters.map((c) => c.id));

      for (const [id, model] of models) {
        if (!currentIds.has(id)) {
          scene.remove(model.root);
          models.delete(id);
        }
      }

      for (const [id, entry] of nameSprites) {
        if (!currentIds.has(id)) {
          scene.remove(entry.sprite);
          (entry.sprite.material as THREE.SpriteMaterial).map?.dispose();
          (entry.sprite.material as THREE.SpriteMaterial).dispose();
          nameSprites.delete(id);
        }
      }

      for (const char of characters) {
        const colorHex = CHARACTER_COLORS.find((c) => c.id === char.colorId)?.hex ?? '#3b82f6';
        if (!models.has(char.id)) {
          const model = createCharacterModel(colorHex);
          model.root.userData.characterId = char.id;
          scene.add(model.root);
          models.set(char.id, model);
        }
        const model = models.get(char.id)!;
        setCharacterColor(model, colorHex);
        applyPose(model, char.pose);
        model.root.position.set(...char.position);
        const [rx, ry, rz] = char.rotation;
        model.root.rotation.set(rx * DEG, ry * DEG, rz * DEG);

        const hl = selectedId === char.id ? 0x1a3a5a : 0x000000;
        model.bodyMat.emissive?.set(hl);
        model.accentMat.emissive?.set(hl);

        const existing = nameSprites.get(char.id);
        if (!existing) {
          const sprite = createNameSprite(char.name, colorHex);
          sprite.position.set(char.position[0], char.position[1] + LABEL_Y_OFFSET, char.position[2]);
          scene.add(sprite);
          nameSprites.set(char.id, { sprite, name: char.name, color: colorHex });
        } else {
          if (existing.name !== char.name || existing.color !== colorHex) {
            refreshNameSprite(existing.sprite, char.name, colorHex);
            existing.name = char.name;
            existing.color = colorHex;
          }
          existing.sprite.position.set(
            char.position[0],
            char.position[1] + LABEL_Y_OFFSET,
            char.position[2]
          );
        }
      }
    }

    syncCharacters();
    const unsubscribe = useSceneStore.subscribe(syncCharacters);

    let dragging = false;
    let dragCharId: string | null = null;
    let dragOffsetX = 0;
    let dragOffsetZ = 0;

    function onMouseDown(e: MouseEvent) {
      const s = useSceneStore.getState();
      if (s.screenshotMode) return;
      if (!e.ctrlKey) return;
      e.preventDefault();
      const roots = Array.from(models.values()).map((m) => m.root);
      const hitId = raycastCharacter(e, camera, renderer, roots);
      if (!hitId) return;
      s.selectItem(hitId);
      const floorPt = raycastFloor(e, camera, renderer, floorMesh);
      if (!floorPt) return;
      const char = s.characters.find((c) => c.id === hitId);
      if (!char) return;
      dragOffsetX = char.position[0] - floorPt.x;
      dragOffsetZ = char.position[2] - floorPt.z;
      dragging = true;
      dragCharId = hitId;
      controls.enabled = false;
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging || !dragCharId) return;
      const floorPt = raycastFloor(e, camera, renderer, floorMesh);
      if (!floorPt) return;
      const s = useSceneStore.getState();
      const char = s.characters.find((c) => c.id === dragCharId);
      if (!char) return;
      s.updateCharacter(dragCharId, {
        position: [floorPt.x + dragOffsetX, char.position[1], floorPt.z + dragOffsetZ],
      });
    }

    function onMouseUp() {
      if (dragging) {
        dragging = false;
        dragCharId = null;
        controls.enabled = true;
      }
    }

    function onClick(e: MouseEvent) {
      if (e.ctrlKey) return;
      const s = useSceneStore.getState();
      if (s.screenshotMode) return;
      if (s.addCharacterMode) {
        const pt = raycastFloor(e, camera, renderer, floorMesh);
        if (pt) s.addCharacter([pt.x, 0, pt.z]);
        return;
      }
      const roots = Array.from(models.values()).map((m) => m.root);
      const charId = raycastCharacter(e, camera, renderer, roots);
      s.selectItem(charId);
    }

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    const unsubScreenshot = useSceneStore.subscribe((s) => {
      if (!dragging) controls.enabled = !s.screenshotMode && !s.drawMode && !s.textMode;
    });

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      initDrawCanvas();
      renderCanvas2DRef.current();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      unsubscribe();
      unsubScreenshot();
      unsubBg();
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      controls.removeEventListener('change', syncZoom);
      controlsRef.current = null;
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      models.clear();
      for (const entry of nameSprites.values()) {
        (entry.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (entry.sprite.material as THREE.SpriteMaterial).dispose();
      }
      nameSprites.clear();
    };
  }, []);

  const canvasActive = (drawMode || textMode) && !screenshotMode;

  return (
    <div ref={mountRef} className="relative flex-1 w-full h-full bg-[#08101a] overflow-hidden">
      {/* 2D draw canvas */}
      <canvas
        ref={drawCanvasRef}
        className="absolute inset-0 z-10"
        style={{
          pointerEvents: canvasActive ? 'auto' : 'none',
          cursor: drawMode ? 'crosshair' : textMode ? 'text' : 'default',
        }}
        onMouseDown={handleDrawMouseDown}
        onMouseMove={handleDrawMouseMove}
        onMouseUp={handleDrawMouseUp}
        onMouseLeave={handleDrawMouseUp}
        onClick={handleTextCanvasClick}
      />

      {/* Text annotation delete buttons — shown in text mode */}
      {textMode && !screenshotMode && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {textAnnotations.map((ann) => (
            <button
              key={ann.id}
              title="删除此标注"
              className="absolute pointer-events-auto w-5 h-5 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md transition-colors"
              style={{
                left: `${ann.xFrac * 100}%`,
                top: `${ann.yFrac * 100}%`,
                transform: 'translate(-100%, -100%)',
              }}
              onClick={() => removeTextAnnotation(ann.id)}
            >
              <X size={10} />
            </button>
          ))}
        </div>
      )}

      {/* Inline text input */}
      {pendingInput && (
        <div
          className="absolute z-30"
          style={{
            left: `${pendingInput.xFrac * 100}%`,
            top: `${pendingInput.yFrac * 100}%`,
          }}
        >
          <input
            ref={pendingInputRef}
            autoFocus
            type="text"
            placeholder="输入文字…"
            className="outline-none rounded px-2 py-1 min-w-[120px] max-w-[320px]"
            style={{
              fontSize: useSceneStore.getState().textFontSize,
              color: useSceneStore.getState().textColor,
              backgroundColor: `rgba(${hexToRgb(useSceneStore.getState().textBgColor)},${useSceneStore.getState().textBgAlpha})`,
              border: '1.5px dashed rgba(255,255,255,0.5)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmPendingText(e.currentTarget.value);
              if (e.key === 'Escape') setPendingInput(null);
            }}
            onBlur={(e) => confirmPendingText(e.target.value)}
          />
        </div>
      )}

      {/* Hint labels */}
      {addMode && !screenshotMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-lg pointer-events-none z-20 shadow-xl border border-blue-400/30">
          点击场景地面放置角色
        </div>
      )}
      {drawMode && !screenshotMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-lg pointer-events-none z-20 shadow-xl border border-red-400/30">
          在画布上拖拽绘制曲线
        </div>
      )}
      {textMode && !screenshotMode && !pendingInput && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-600/90 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-lg pointer-events-none z-20 shadow-xl border border-amber-400/30">
          点击任意位置添加文字标注
        </div>
      )}
      {!screenshotMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#2a4a5a] text-[11px] pointer-events-none">
          按住 Ctrl 拖拽角色 · 左键点选 · 滚轮缩放
        </div>
      )}

      {/* Zoom control */}
      {!screenshotMode && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#0d1820]/90 border border-[#1e2d3d] rounded-lg px-3 py-1.5 backdrop-blur-sm z-20">
          <ZoomOut size={13} className="text-[#4a6a7a] flex-shrink-0" />
          <input
            type="range"
            min={2}
            max={80}
            step={0.5}
            value={cameraDistance}
            onChange={(e) => {
              const d = parseFloat(e.target.value);
              const controls = controlsRef.current;
              const camera = cameraRef.current;
              if (!controls || !camera) return;
              const dir = camera.position.clone().sub(controls.target).normalize();
              camera.position.copy(controls.target).addScaledVector(dir, d);
              controls.update();
            }}
            className="w-28 accent-blue-500 cursor-pointer"
          />
          <ZoomIn size={13} className="text-[#4a6a7a] flex-shrink-0" />
          <span className="text-[#4a9eff] text-[11px] tabular-nums w-8 text-right">{cameraDistance.toFixed(1)}</span>
        </div>
      )}

      {/* Screenshot overlay */}
      {screenshotMode && (
        <div
          ref={overlayRef}
          className="absolute inset-0 z-20 cursor-crosshair select-none"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onMouseDown={onOverlayMouseDown}
          onMouseMove={onOverlayMouseMove}
          onMouseUp={onOverlayMouseUp}
        >
          {selState === 'idle' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-white/80 text-sm">拖拽框选导出区域</p>
              <p className="text-white/40 text-xs mt-1">或点击右上角"导出全图"一键导出完整画面</p>
            </div>
          )}

          {selRect && selRect.w > 2 && selRect.h > 2 && (
            <>
              <div className="absolute left-0 right-0 top-0" style={{ height: selRect.y, background: 'rgba(0,0,0,0.3)' }} />
              <div className="absolute left-0 right-0" style={{ top: selRect.y + selRect.h, bottom: 0, background: 'rgba(0,0,0,0.3)' }} />
              <div className="absolute" style={{ left: 0, top: selRect.y, width: selRect.x, height: selRect.h, background: 'rgba(0,0,0,0.3)' }} />
              <div className="absolute" style={{ left: selRect.x + selRect.w, right: 0, top: selRect.y, height: selRect.h, background: 'rgba(0,0,0,0.3)' }} />

              <div
                className="absolute"
                style={{
                  left: selRect.x,
                  top: selRect.y,
                  width: selRect.w,
                  height: selRect.h,
                  border: '2px dashed rgba(255,255,255,0.8)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                }}
              />

              <div
                className="absolute text-[10px] text-white/60 pointer-events-none"
                style={{ left: selRect.x + 4, top: selRect.y + 4 }}
              >
                {Math.round(selRect.w)} × {Math.round(selRect.h)}
              </div>

              {selState === 'done' && (
                <div
                  className="absolute flex gap-2"
                  style={{
                    left: selRect.x + selRect.w / 2,
                    top: selRect.y + selRect.h + 10,
                    transform: 'translateX(-50%)',
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded shadow-lg transition-colors"
                  >
                    <Download size={12} />
                    导出选区 PNG
                  </button>
                  <button
                    onClick={() => { setSelState('idle'); setSelRect(null); }}
                    className="flex items-center gap-1 px-2 py-1.5 bg-[#1a2a3a] hover:bg-[#1e3348] text-[#6a9ab4] text-xs rounded shadow-lg transition-colors border border-[#1e3a5a]"
                  >
                    <X size={12} />
                    重选
                  </button>
                </div>
              )}
            </>
          )}

          <div
            className="absolute top-3 right-3 flex items-center gap-2"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { handleExportFull(); setScreenshotMode(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/90 hover:bg-emerald-600 text-white text-xs font-medium rounded border border-emerald-500/40 transition-colors shadow-lg"
            >
              <Download size={12} />
              导出全图
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e161f]/90 hover:bg-[#1a2a3a] text-[#6a9ab4] text-xs rounded border border-[#1e3a5a] transition-colors"
              onClick={() => setScreenshotMode(false)}
            >
              <X size={12} />
              退出截图
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
