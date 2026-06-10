import * as THREE from 'three';
import { POSES, PoseId } from './poses';

export interface CharacterModel {
  root: THREE.Group;
  joints: {
    torso: THREE.Group;
    head: THREE.Group;
    leftUpperArm: THREE.Group;
    rightUpperArm: THREE.Group;
    leftLowerArm: THREE.Group;
    rightLowerArm: THREE.Group;
    leftUpperLeg: THREE.Group;
    rightUpperLeg: THREE.Group;
    leftLowerLeg: THREE.Group;
    rightLowerLeg: THREE.Group;
  };
  bodyMat: THREE.MeshToonMaterial;
  accentMat: THREE.MeshToonMaterial;
}

function box(w: number, h: number, d: number): THREE.BoxGeometry {
  return new THREE.BoxGeometry(w, h, d, 1, 1, 1);
}

function sphere(r: number, seg = 12): THREE.SphereGeometry {
  return new THREE.SphereGeometry(r, seg, seg);
}

function cylinder(rTop: number, rBot: number, h: number, seg = 8): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, seg);
}

// Dimensions (in metres, character ~1.7 m tall)
const DIM = {
  headR: 0.135,
  neckH: 0.06,
  torsoW: 0.32,
  torsoH: 0.42,
  torsoD: 0.18,
  hipW: 0.28,
  hipH: 0.12,
  hipD: 0.18,
  uArmW: 0.09, uArmH: 0.24,
  lArmW: 0.075, lArmH: 0.21,
  handR: 0.055,
  uLegW: 0.11, uLegH: 0.27,
  lLegW: 0.09, lLegH: 0.25,
  footW: 0.14, footH: 0.065, footD: 0.22,
};

export function createCharacterModel(color: string): CharacterModel {
  const bodyMat = new THREE.MeshToonMaterial({ color: new THREE.Color(color) });
  const accentMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(color).multiplyScalar(0.6),
  });
  const eyeWhiteMat = new THREE.MeshToonMaterial({ color: 0xffffff });
  const eyePupilMat = new THREE.MeshToonMaterial({ color: 0x111111 });
  const mouthMat = new THREE.MeshToonMaterial({ color: 0x222222 });

  function m(geo: THREE.BufferGeometry, mat: THREE.MeshToonMaterial): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // --- Head ---
  const headJoint = new THREE.Group();
  const headMesh = m(sphere(DIM.headR), bodyMat);
  headMesh.scale.set(1, 1.1, 1);
  headMesh.position.y = DIM.headR;
  headJoint.add(headMesh);
  // Eyes
  const eyeWhiteGeo = sphere(0.032, 8);
  const eyePupilGeo = sphere(0.018, 6);
  const leW = m(eyeWhiteGeo, eyeWhiteMat);
  const reW = m(eyeWhiteGeo, eyeWhiteMat);
  const leP = m(eyePupilGeo, eyePupilMat);
  const reP = m(eyePupilGeo, eyePupilMat);
  leW.position.set(0.055, DIM.headR * 1.1, DIM.headR * 0.88);
  reW.position.set(-0.055, DIM.headR * 1.1, DIM.headR * 0.88);
  leP.position.set(0.055, DIM.headR * 1.1, DIM.headR * 0.97);
  reP.position.set(-0.055, DIM.headR * 1.1, DIM.headR * 0.97);
  headJoint.add(leW, reW, leP, reP);
  // Smile
  for (let i = -1; i <= 1; i++) {
    const sm = m(sphere(0.012, 5), mouthMat);
    sm.position.set(i * 0.035, DIM.headR * 0.72, DIM.headR * 0.93);
    sm.position.y += i === 0 ? -0.01 : 0.006;
    headJoint.add(sm);
  }

  // --- Torso ---
  const torsoJoint = new THREE.Group();
  const torsoMesh = m(box(DIM.torsoW, DIM.torsoH, DIM.torsoD), bodyMat);
  torsoMesh.position.y = DIM.torsoH / 2;
  torsoJoint.add(torsoMesh);
  // Chest detail stripe
  const stripe = m(box(DIM.torsoW * 0.5, DIM.torsoH * 0.25, DIM.torsoD * 1.01), accentMat);
  stripe.position.y = DIM.torsoH * 0.6;
  torsoJoint.add(stripe);

  // Head sits on top of torso
  headJoint.position.y = DIM.torsoH + DIM.neckH;
  torsoJoint.add(headJoint);

  // --- Hips ---
  const hipMesh = m(box(DIM.hipW, DIM.hipH, DIM.hipD), accentMat);
  hipMesh.position.y = -DIM.hipH / 2;
  torsoJoint.add(hipMesh);

  // --- Left upper arm (pivot = shoulder) ---
  const leftUpperArmJoint = new THREE.Group();
  const luaM = m(box(DIM.uArmW, DIM.uArmH, DIM.uArmW), bodyMat);
  luaM.position.y = -DIM.uArmH / 2;
  leftUpperArmJoint.add(luaM);
  leftUpperArmJoint.position.set(DIM.torsoW / 2 + DIM.uArmW / 2 + 0.01, DIM.torsoH - 0.03, 0);
  torsoJoint.add(leftUpperArmJoint);

  // --- Left lower arm (pivot = elbow) ---
  const leftLowerArmJoint = new THREE.Group();
  const llamM = m(box(DIM.lArmW, DIM.lArmH, DIM.lArmW), accentMat);
  llamM.position.y = -DIM.lArmH / 2;
  leftLowerArmJoint.add(llamM);
  // Left hand
  const lHand = m(sphere(DIM.handR, 8), bodyMat);
  lHand.position.y = -DIM.lArmH - DIM.handR * 0.6;
  leftLowerArmJoint.add(lHand);
  leftLowerArmJoint.position.y = -DIM.uArmH;
  leftUpperArmJoint.add(leftLowerArmJoint);

  // --- Right upper arm ---
  const rightUpperArmJoint = new THREE.Group();
  const ruaM = m(box(DIM.uArmW, DIM.uArmH, DIM.uArmW), bodyMat);
  ruaM.position.y = -DIM.uArmH / 2;
  rightUpperArmJoint.add(ruaM);
  rightUpperArmJoint.position.set(-(DIM.torsoW / 2 + DIM.uArmW / 2 + 0.01), DIM.torsoH - 0.03, 0);
  torsoJoint.add(rightUpperArmJoint);

  // --- Right lower arm ---
  const rightLowerArmJoint = new THREE.Group();
  const rlaM = m(box(DIM.lArmW, DIM.lArmH, DIM.lArmW), accentMat);
  rlaM.position.y = -DIM.lArmH / 2;
  rightLowerArmJoint.add(rlaM);
  const rHand = m(sphere(DIM.handR, 8), bodyMat);
  rHand.position.y = -DIM.lArmH - DIM.handR * 0.6;
  rightLowerArmJoint.add(rHand);
  rightLowerArmJoint.position.y = -DIM.uArmH;
  rightUpperArmJoint.add(rightLowerArmJoint);

  // --- Left upper leg (pivot = hip) ---
  const leftUpperLegJoint = new THREE.Group();
  const lulM = m(box(DIM.uLegW, DIM.uLegH, DIM.uLegW * 1.1), bodyMat);
  lulM.position.y = -DIM.uLegH / 2;
  leftUpperLegJoint.add(lulM);
  leftUpperLegJoint.position.set(DIM.hipW / 4, -DIM.hipH, 0);
  torsoJoint.add(leftUpperLegJoint);

  // --- Left lower leg (pivot = knee) ---
  const leftLowerLegJoint = new THREE.Group();
  const lllM = m(box(DIM.lLegW, DIM.lLegH, DIM.lLegW * 1.1), accentMat);
  lllM.position.y = -DIM.lLegH / 2;
  leftLowerLegJoint.add(lllM);
  // Left foot
  const lFoot = m(box(DIM.footW, DIM.footH, DIM.footD), bodyMat);
  lFoot.position.set(0, -DIM.lLegH - DIM.footH / 2, DIM.footD * 0.18);
  leftLowerLegJoint.add(lFoot);
  leftLowerLegJoint.position.y = -DIM.uLegH;
  leftUpperLegJoint.add(leftLowerLegJoint);

  // --- Right upper leg ---
  const rightUpperLegJoint = new THREE.Group();
  const rulM = m(box(DIM.uLegW, DIM.uLegH, DIM.uLegW * 1.1), bodyMat);
  rulM.position.y = -DIM.uLegH / 2;
  rightUpperLegJoint.add(rulM);
  rightUpperLegJoint.position.set(-DIM.hipW / 4, -DIM.hipH, 0);
  torsoJoint.add(rightUpperLegJoint);

  // --- Right lower leg ---
  const rightLowerLegJoint = new THREE.Group();
  const rllM = m(box(DIM.lLegW, DIM.lLegH, DIM.lLegW * 1.1), accentMat);
  rllM.position.y = -DIM.lLegH / 2;
  rightLowerLegJoint.add(rllM);
  const rFoot = m(box(DIM.footW, DIM.footH, DIM.footD), bodyMat);
  rFoot.position.set(0, -DIM.lLegH - DIM.footH / 2, DIM.footD * 0.18);
  rightLowerLegJoint.add(rFoot);
  rightLowerLegJoint.position.y = -DIM.uLegH;
  rightUpperLegJoint.add(rightLowerLegJoint);

  // --- Root: lift so feet are at y=0 ---
  const root = new THREE.Group();
  const groundY = DIM.hipH + DIM.uLegH + DIM.lLegH + DIM.footH;
  torsoJoint.position.y = groundY;
  root.add(torsoJoint);

  return {
    root,
    joints: {
      torso: torsoJoint,
      head: headJoint,
      leftUpperArm: leftUpperArmJoint,
      rightUpperArm: rightUpperArmJoint,
      leftLowerArm: leftLowerArmJoint,
      rightLowerArm: rightLowerArmJoint,
      leftUpperLeg: leftUpperLegJoint,
      rightUpperLeg: rightUpperLegJoint,
      leftLowerLeg: leftLowerLegJoint,
      rightLowerLeg: rightLowerLegJoint,
    },
    bodyMat,
    accentMat,
  };
}

export function applyPose(model: CharacterModel, poseId: PoseId) {
  const pose = POSES[poseId];
  if (!pose) return;
  const r = pose.rotations;
  const j = model.joints;
  j.torso.rotation.copy(r.torso);
  j.head.rotation.copy(r.head);
  j.leftUpperArm.rotation.copy(r.leftUpperArm);
  j.rightUpperArm.rotation.copy(r.rightUpperArm);
  j.leftLowerArm.rotation.copy(r.leftLowerArm);
  j.rightLowerArm.rotation.copy(r.rightLowerArm);
  j.leftUpperLeg.rotation.copy(r.leftUpperLeg);
  j.rightUpperLeg.rotation.copy(r.rightUpperLeg);
  j.leftLowerLeg.rotation.copy(r.leftLowerLeg);
  j.rightLowerLeg.rotation.copy(r.rightLowerLeg);
}

export function setCharacterColor(model: CharacterModel, color: string) {
  const c = new THREE.Color(color);
  model.bodyMat.color.copy(c);
  model.accentMat.color.copy(c.clone().multiplyScalar(0.6));
}
