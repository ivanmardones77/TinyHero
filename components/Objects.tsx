import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { ObjectType, DecoyVariant } from '../types';
import { Mesh, Color, ShaderMaterial } from 'three';
import './shaders/ScentMaterial';

// Extend ThreeElements interface to include scentMaterial
declare module '@react-three/fiber' {
  interface ThreeElements {
    scentMaterial: {
      attach?: string;
      args?: any[];
      ref?: any;
      key?: any;
      time?: number;
      color?: Color;
      intensity?: number;
      transparent?: boolean;
      depthWrite?: boolean;
      side?: number;
      [key: string]: any;
    };
  }
}

// Fallback for global JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      scentMaterial: any;
    }
  }
}

const Explosion: React.FC = () => {
    const gameOverReason = useGameStore(state => state.gameOverReason);
    const ratPosition = useGameStore(state => state.ratPosition);
    const ref = useRef<Mesh>(null);

    useFrame((state, delta) => {
        if (gameOverReason === 'explosion' && ref.current) {
            // Expand linearly
            const expansionSpeed = 15.0; // Meters per second
            const currentScale = ref.current.scale.x;
            const newScale = currentScale + expansionSpeed * delta;
            ref.current.scale.setScalar(newScale);
            // Fade logic could be added here
        }
    });

    if (gameOverReason !== 'explosion') return null;

    return (
        <mesh ref={ref} position={ratPosition} scale={[0.1, 0.1, 0.1]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#ff4400" transparent opacity={0.9} />
        </mesh>
    );
};

const DecoyMesh: React.FC<{ variant?: DecoyVariant }> = ({ variant }) => {
  if (variant === 'bottle') {
    return (
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, Math.random()]}>
        <cylinderGeometry args={[0.05, 0.05, 0.25, 8]} />
        <meshStandardMaterial color="#556b2f" roughness={0.3} />
      </mesh>
    );
  }
  if (variant === 'rock') {
     return (
      <mesh position={[0, 0.08, 0]} rotation={[Math.random(), Math.random(), Math.random()]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <meshStandardMaterial color="#5a5048" roughness={0.9} />
      </mesh>
    );
  }
  // Metal / Default
  return (
      <mesh position={[0, 0.02, 0]} rotation={[0, Math.random(), 0]}>
        <boxGeometry args={[0.25, 0.05, 0.2]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
  );
};

interface WorldObjectProps {
    position: [number, number, number];
    type: ObjectType;
    flagged: boolean;
    variant?: DecoyVariant;
}

const WorldObject: React.FC<WorldObjectProps> = ({ position, type, flagged, variant }) => {
  const materialRef = useRef<any>(null);
  const isScentMode = useGameStore(state => state.isScentMode);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.time += delta;
      // Smoothly interpolate intensity based on mode
      const target = isScentMode && !flagged ? 1.0 : 0.0;
      materialRef.current.intensity += (target - materialRef.current.intensity) * delta * 5.0;
    }
  });

  // Violet for mines, dull orange/rust for decoys
  const color = type === ObjectType.MINE ? new Color(0.6, 0.0, 1.0) : new Color(0.8, 0.4, 0.1);

  return (
    <group position={position}>
      {/* Visible Mesh for Decoys (Always visible unless buried context implies otherwise, but gameplay wise we want collision visual) */}
      {type === ObjectType.DECOY && <DecoyMesh variant={variant} />}

      {/* Scent Plume (Visible in Scent Mode) */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.1, 0.4, 2.0, 16, 4, true]} />
        <scentMaterial 
            ref={materialRef} 
            transparent 
            depthWrite={false} 
            color={color} 
            side={2} // Double side
        />
      </mesh>

      {/* Flag Visual (Appears when marked) */}
      {flagged && (
        <group>
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
                <meshStandardMaterial color="#444" />
            </mesh>
            <mesh position={[0.2, 0.8, 0]} rotation={[0, 0, -0.2]}>
                <planeGeometry args={[0.4, 0.3]} />
                <meshStandardMaterial color={type === ObjectType.MINE ? "#22c55e" : "#ef4444"} side={2} />
            </mesh>
        </group>
      )}
    </group>
  );
};

const Objects: React.FC = () => {
  const objects = useGameStore(state => state.objects);

  return (
    <>
      {objects.map((obj) => (
        <WorldObject 
            key={obj.id} 
            position={[obj.position.x, obj.position.y, obj.position.z]} 
            type={obj.type}
            flagged={obj.flagged}
            variant={obj.decoyVariant}
        />
      ))}
      <Explosion />
    </>
  );
};

export default Objects;