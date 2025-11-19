import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D, PlaneGeometry, MeshStandardMaterial } from 'three';
import { useGameStore } from '../store';
import { StaticObstacle } from '../types';

type Shader = {
  uniforms: { [key: string]: { value: any } };
  vertexShader: string;
  fragmentShader: string;
}

const Grass: React.FC = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const count = 20000; // Lush density
  const isScentMode = useGameStore(state => state.isScentMode);

  // Create a custom tapered and curved grass blade geometry
  const geometry = useMemo(() => {
    // Taller, thinner blade: width 0.1, height 0.8
    const geo = new PlaneGeometry(0.1, 0.8, 1, 4);
    // Move pivot to bottom of blade (center was 0, height 0.8 -> move up 0.4)
    geo.translate(0, 0.4, 0);
    
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // Normalized height (0 at bottom, 1 at top)
      const y = pos.getY(i);
      // Clamp alpha to avoid negative values due to floating point precision (prevents NaN in Math.pow)
      const alpha = Math.max(0, y / 0.8);
      
      // Taper width to a point at the top
      const x = pos.getX(i);
      pos.setX(i, x * (1.0 - Math.pow(alpha, 0.5))); // Non-linear taper for leaf shape
      
      // Add natural curve (bending backward slightly)
      // Z offset increases with height square
      pos.setZ(i, Math.pow(alpha, 2) * 0.15);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Initial Placement (Run once)
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 45;
      const s = 0.8 + Math.random() * 0.6; // Random scale
      const rot = Math.random() * Math.PI * 2;
      const lean = (Math.random() - 0.5) * 0.5; // Initial random lean

      dummy.position.set(x, 0, z);
      // Static rotation: lean on X, random Y rot
      dummy.rotation.set(lean, rot, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy]);

  // Shader Injection for Wind Animation
  const onBeforeCompile = useMemo(() => {
    return (shader: Shader) => {
      shader.uniforms.uTime = { value: 0 };
      
      // Store shader reference on material userData to update it later
      if (materialRef.current) {
         materialRef.current.userData.shader = shader;
      }

      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
          vec3 transformed = vec3( position );
          
          // Get world position of the instance (approximate from matrix)
          // Renamed to instWorldPos to avoid redefinition error with standard Three.js 'worldPosition'
          vec4 instWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          
          // Wind Logic
          float time = uTime;
          
          // Wave 1: Large sweeping wind
          float wind = sin(time * 0.5 + instWorldPos.x * 0.2 + instWorldPos.z * 0.1);
          
          // Wave 2: Faster local turbulence
          wind += sin(time * 1.5 + instWorldPos.z * 0.5) * 0.2;
          
          // Apply Sway only to the top of the blade
          // Geometry y is 0 to 0.8
          float leanFactor = smoothstep(0.0, 0.8, position.y);
          
          // Apply displacement
          float swayStrength = 0.15;
          transformed.x += wind * leanFactor * swayStrength;
          transformed.z += wind * 0.5 * leanFactor * swayStrength; // Add some z movement for 3D feel
        `
      );
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Update Shader Time Uniform
    if (materialRef.current?.userData?.shader) {
        materialRef.current.userData.shader.uniforms.uTime.value = time;
    }

    // Color shift based on mode
    if (materialRef.current) {
        const targetColor = isScentMode ? new Color(0.1, 0.15, 0.25) : new Color(0.7, 0.65, 0.15);
        materialRef.current.color.lerp(targetColor, 0.1);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial 
        ref={materialRef}
        color="#aa9933" 
        side={2} 
        roughness={0.8} 
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
};

const Rocks: React.FC<{ data: StaticObstacle[] }> = ({ data }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    data.forEach((d, i) => {
        // Rocks sit slightly in the ground
        dummy.position.copy(d.position).setY(0.1 * d.scale);
        // Random tumble calculated ONCE here, not every frame
        dummy.rotation.set(Math.random() * Math.PI, d.rotation, Math.random() * Math.PI); 
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#5a5048" roughness={0.9} />
    </instancedMesh>
  );
};

const Bushes: React.FC<{ data: StaticObstacle[] }> = ({ data }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    data.forEach((d, i) => {
        dummy.position.copy(d.position).setY(0.3 * d.scale);
        dummy.rotation.set(0, d.rotation, 0);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [data, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
      {/* Sharp, thorny looking geometry */}
      <tetrahedronGeometry args={[0.8, 1]} />
      <meshStandardMaterial color="#3d2e22" roughness={1} />
    </instancedMesh>
  );
};

// Scattered small pebbles around ALL obstacles to blend them into the ground
const Pebbles: React.FC<{ obstacles: StaticObstacle[] }> = ({ obstacles }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    
    const pebblesData = useMemo(() => {
        const data: { x: number; z: number; s: number; rot: number }[] = [];
        obstacles.forEach(obs => {
            // 5 to 8 pebbles per obstacle
            const count = 5 + Math.floor(Math.random() * 4);
            for(let i=0; i<count; i++) {
                const angle = Math.random() * Math.PI * 2;
                // Distribute slightly further for bushes than rocks
                const baseDist = obs.type === 'bush' ? 1.2 : 0.8;
                const dist = baseDist + Math.random() * 1.0; 
                data.push({
                    x: obs.position.x + Math.cos(angle) * dist,
                    z: obs.position.z + Math.sin(angle) * dist,
                    s: 0.05 + Math.random() * 0.08, // Small size
                    rot: Math.random() * Math.PI * 2
                });
            }
        });
        return data;
    }, [obstacles]);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        pebblesData.forEach((d, i) => {
            dummy.position.set(d.x, 0.03, d.z); // Sit on ground
            dummy.rotation.set(Math.random() * Math.PI, d.rot, Math.random() * Math.PI);
            dummy.scale.set(d.s, d.s, d.s);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [pebblesData, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, pebblesData.length]}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
        </instancedMesh>
    );
}

// Sparse weeds around obstacles
const DryWeeds: React.FC<{ obstacles: StaticObstacle[] }> = ({ obstacles }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    
    const weedData = useMemo(() => {
        const data: { x: number; z: number; s: number; rot: number }[] = [];
        obstacles.forEach(obs => {
            // 2 to 4 weeds per obstacle
            const count = 2 + Math.floor(Math.random() * 3);
            for(let i=0; i<count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 0.8 + Math.random() * 1.0; 
                data.push({
                    x: obs.position.x + Math.cos(angle) * dist,
                    z: obs.position.z + Math.sin(angle) * dist,
                    s: 0.2 + Math.random() * 0.3, 
                    rot: Math.random() * Math.PI * 2
                });
            }
        });
        return data;
    }, [obstacles]);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        weedData.forEach((d, i) => {
            dummy.position.set(d.x, 0, d.z);
            dummy.rotation.set(0, d.rot, 0);
            dummy.scale.set(d.s, d.s * 0.5, d.s); // Flattened
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [weedData, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, weedData.length]}>
            {/* Flattened cone to look like a tuft */}
            <coneGeometry args={[0.4, 0.5, 5]} />
            <meshStandardMaterial color="#3d3020" roughness={1} />
        </instancedMesh>
    );
}

const GroundPatches: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    const count = 120; // Increased count

    const data = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 48,
            z: (Math.random() - 0.5) * 48,
            s: 1.5 + Math.random() * 3.0,
            rot: Math.random() * Math.PI
        }));
    }, []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        data.forEach((d, i) => {
            dummy.position.set(d.x, 0.01, d.z); 
            dummy.rotation.set(-Math.PI / 2, 0, d.rot);
            dummy.scale.set(d.s, d.s, 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <circleGeometry args={[1, 8]} />
            {/* Dark transparent patches to vary ground color */}
            <meshStandardMaterial color="#2a1810" transparent opacity={0.5} roughness={1} depthWrite={false} />
        </instancedMesh>
    );
}

const LightPatches: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    const count = 80;

    const data = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 48,
            z: (Math.random() - 0.5) * 48,
            s: 1.0 + Math.random() * 2.0,
            rot: Math.random() * Math.PI
        }));
    }, []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        data.forEach((d, i) => {
            dummy.position.set(d.x, 0.015, d.z); 
            dummy.rotation.set(-Math.PI / 2, 0, d.rot);
            dummy.scale.set(d.s, d.s, 1);
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <circleGeometry args={[0.8, 7]} />
            {/* Lighter dry earth patches */}
            <meshStandardMaterial color="#8c7b6c" transparent opacity={0.3} roughness={1} depthWrite={false} />
        </instancedMesh>
    );
}

const Twigs: React.FC = () => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
    const count = 500; // High density of micro detail

    const data = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 48,
            z: (Math.random() - 0.5) * 48,
            scale: 0.5 + Math.random() * 0.5,
            rot: Math.random() * Math.PI * 2
        }));
    }, []);

    useLayoutEffect(() => {
        if (!meshRef.current) return;
        data.forEach((d, i) => {
            dummy.position.set(d.x, 0.02, d.z);
            // Lie flat on ground with random Y rotation
            dummy.rotation.set(Math.PI / 2, d.rot, 0); 
            dummy.scale.set(1, d.scale, 1); // Scale length (Y is length for cylinder)
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <cylinderGeometry args={[0.008, 0.008, 0.3, 4]} />
            <meshStandardMaterial color="#3e3228" roughness={1} />
        </instancedMesh>
    );
}

const Tracks: React.FC = () => {
  // Render two subtle parallel paths to look like old tire tracks
  return (
    <group position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Track 1 */}
      <mesh position={[-2, 0, 0]}>
        <planeGeometry args={[1.5, 50]} />
        <meshStandardMaterial color="#4a332a" transparent opacity={0.6} roughness={1} />
      </mesh>
      {/* Track 2 */}
      <mesh position={[2, 0, 0]}>
        <planeGeometry args={[1.5, 50]} />
        <meshStandardMaterial color="#4a332a" transparent opacity={0.6} roughness={1} />
      </mesh>
       {/* Crossing Track */}
       <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI/3]}>
        <planeGeometry args={[1.2, 60]} />
        <meshStandardMaterial color="#4a332a" transparent opacity={0.4} roughness={1} />
      </mesh>
    </group>
  );
};

const World: React.FC = () => {
  const isScentMode = useGameStore(state => state.isScentMode);
  const staticObstacles = useGameStore(state => state.staticObstacles);

  const rockData = useMemo(() => staticObstacles.filter(o => o.type === 'rock'), [staticObstacles]);
  const bushData = useMemo(() => staticObstacles.filter(o => o.type === 'bush'), [staticObstacles]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isScentMode ? 0.2 : 0.6} />
      <directionalLight 
        position={[10, 20, 5]} 
        intensity={isScentMode ? 0.5 : 1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      
      {/* Fog for atmosphere */}
      <fog attach="fog" args={[isScentMode ? '#110522' : '#C2B280', 2, 18]} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>

      <Tracks />
      <GroundPatches />
      <LightPatches />
      <Twigs />
      <Rocks data={rockData} />
      {/* Spread detail around ALL obstacles */}
      <Pebbles obstacles={staticObstacles} /> 
      <Bushes data={bushData} />
      <DryWeeds obstacles={staticObstacles} />
      <Grass />
    </>
  );
};

export default World;