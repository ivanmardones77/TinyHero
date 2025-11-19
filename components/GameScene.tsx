import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import Rat from './Rat';
import World from './World';
import Objects from './Objects';
import { useGameStore } from '../store';

const GameScene: React.FC = () => {
  const isScentMode = useGameStore((state) => state.isScentMode);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1, 2], fov: 60, near: 0.1, far: 30 }}
      style={{ background: isScentMode ? '#110522' : '#C2B280', transition: 'background 0.5s' }}
    >
      <Suspense fallback={null}>
        <World />
        <Rat />
        <Objects />
        <Preload all />
      </Suspense>
    </Canvas>
  );
};

export default GameScene;