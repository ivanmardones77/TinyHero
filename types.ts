import { Vector3 } from 'three';
import React from 'react';

// Extend JSX.IntrinsicElements to include R3F elements and custom ones
// This ensures TS recognizes <mesh>, <group>, etc. without standard R3F type augmentation issues
declare global {
  namespace JSX {
    interface IntrinsicElements {
      scentMaterial: any;
      [elemName: string]: any;
    }
  }
}

export enum ObjectType {
  MINE = 'MINE',
  DECOY = 'DECOY', // Old cans, scrap metal
}

export type DecoyVariant = 'metal' | 'bottle' | 'rock';

export interface GameObject {
  id: string;
  position: Vector3;
  type: ObjectType;
  decoyVariant?: DecoyVariant;
  discovered: boolean;
  flagged: boolean;
}

export interface StaticObstacle {
  id: string;
  position: Vector3;
  scale: number;
  rotation: number;
  type: 'rock' | 'bush' | 'tankTrap' | 'fencePost' | 'ammoBox';
}

export interface FeedbackMessage {
  id: number;
  text: string;
  type: 'success' | 'failure' | 'neutral';
}

export interface RatProfile {
  id: string;
  name: string;
  role: string;
  description: string;
  history: string;
  imageUrl: string;
  stats: {
    speed: number;        // Base movement speed
    staminaDrain: number; // Multiplier (1.0 is normal, lower is better)
    stability: number;    // Resistance to camera shake/anxiety (1.0 is normal, higher is better)
    scentRange: number;   // Detection radius multiplier
  };
}