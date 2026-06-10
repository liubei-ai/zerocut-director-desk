import * as THREE from 'three';

export type PoseId = 'stand' | 'tpose' | 'walk' | 'sit' | 'arms_up' | 'action' | 'crouch' | 'point';

export interface JointRotations {
  leftUpperArm: THREE.Euler;
  rightUpperArm: THREE.Euler;
  leftLowerArm: THREE.Euler;
  rightLowerArm: THREE.Euler;
  leftUpperLeg: THREE.Euler;
  rightUpperLeg: THREE.Euler;
  leftLowerLeg: THREE.Euler;
  rightLowerLeg: THREE.Euler;
  head: THREE.Euler;
  torso: THREE.Euler;
}

function e(x: number, y: number, z: number) {
  return new THREE.Euler(
    THREE.MathUtils.degToRad(x),
    THREE.MathUtils.degToRad(y),
    THREE.MathUtils.degToRad(z)
  );
}

export const POSES: Record<PoseId, { label: string; rotations: JointRotations }> = {
  stand: {
    label: '站立',
    rotations: {
      leftUpperArm: e(0, 0, -10),
      rightUpperArm: e(0, 0, 10),
      leftLowerArm: e(0, 0, 0),
      rightLowerArm: e(0, 0, 0),
      leftUpperLeg: e(0, 0, 0),
      rightUpperLeg: e(0, 0, 0),
      leftLowerLeg: e(0, 0, 0),
      rightLowerLeg: e(0, 0, 0),
      head: e(0, 0, 0),
      torso: e(0, 0, 0),
    },
  },
  tpose: {
    label: 'T形站立',
    rotations: {
      leftUpperArm: e(0, 0, -90),
      rightUpperArm: e(0, 0, 90),
      leftLowerArm: e(0, 0, 0),
      rightLowerArm: e(0, 0, 0),
      leftUpperLeg: e(0, 0, 0),
      rightUpperLeg: e(0, 0, 0),
      leftLowerLeg: e(0, 0, 0),
      rightLowerLeg: e(0, 0, 0),
      head: e(0, 0, 0),
      torso: e(0, 0, 0),
    },
  },
  walk: {
    label: '行走',
    rotations: {
      leftUpperArm: e(30, 0, -8),
      rightUpperArm: e(-30, 0, 8),
      leftLowerArm: e(10, 0, 0),
      rightLowerArm: e(5, 0, 0),
      leftUpperLeg: e(-30, 0, 0),
      rightUpperLeg: e(30, 0, 0),
      leftLowerLeg: e(10, 0, 0),
      rightLowerLeg: e(-20, 0, 0),
      head: e(0, 10, 0),
      torso: e(5, 0, 0),
    },
  },
  sit: {
    label: '坐姿',
    rotations: {
      leftUpperArm: e(0, 0, -20),
      rightUpperArm: e(0, 0, 20),
      leftLowerArm: e(-80, 0, 0),
      rightLowerArm: e(-80, 0, 0),
      leftUpperLeg: e(-90, 0, -5),
      rightUpperLeg: e(-90, 0, 5),
      leftLowerLeg: e(90, 0, 0),
      rightLowerLeg: e(90, 0, 0),
      head: e(0, 0, 0),
      torso: e(0, 0, 0),
    },
  },
  arms_up: {
    label: '举臂',
    rotations: {
      leftUpperArm: e(-150, 0, -15),
      rightUpperArm: e(-150, 0, 15),
      leftLowerArm: e(20, 0, 0),
      rightLowerArm: e(20, 0, 0),
      leftUpperLeg: e(0, 0, -5),
      rightUpperLeg: e(0, 0, 5),
      leftLowerLeg: e(0, 0, 0),
      rightLowerLeg: e(0, 0, 0),
      head: e(-20, 0, 0),
      torso: e(-10, 0, 0),
    },
  },
  action: {
    label: '动作姿势',
    rotations: {
      leftUpperArm: e(-60, 0, -30),
      rightUpperArm: e(20, 0, 60),
      leftLowerArm: e(40, 0, 0),
      rightLowerArm: e(60, 0, 0),
      leftUpperLeg: e(-20, 0, -10),
      rightUpperLeg: e(40, 0, 5),
      leftLowerLeg: e(10, 0, 0),
      rightLowerLeg: e(-30, 0, 0),
      head: e(0, -30, 0),
      torso: e(0, -20, 0),
    },
  },
  crouch: {
    label: '蹲伏',
    rotations: {
      leftUpperArm: e(20, 0, -30),
      rightUpperArm: e(20, 0, 30),
      leftLowerArm: e(-40, 0, 0),
      rightLowerArm: e(-40, 0, 0),
      leftUpperLeg: e(-60, 0, -8),
      rightUpperLeg: e(-60, 0, 8),
      leftLowerLeg: e(80, 0, 0),
      rightLowerLeg: e(80, 0, 0),
      head: e(-10, 0, 0),
      torso: e(30, 0, 0),
    },
  },
  point: {
    label: '指向',
    rotations: {
      leftUpperArm: e(0, 0, -10),
      rightUpperArm: e(-80, 0, 0),
      leftLowerArm: e(0, 0, 0),
      rightLowerArm: e(0, 0, 0),
      leftUpperLeg: e(0, 0, 0),
      rightUpperLeg: e(0, 0, 0),
      leftLowerLeg: e(0, 0, 0),
      rightLowerLeg: e(0, 0, 0),
      head: e(0, -20, 0),
      torso: e(0, -10, 0),
    },
  },
};
