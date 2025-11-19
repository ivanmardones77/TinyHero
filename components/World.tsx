import React, { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D, PlaneGeometry, MeshStandardMaterial, InstancedBufferAttribute, ShaderMaterial, DoubleSide, MathUtils } from 'three';
import { useGameStore } from '../store';
import { StaticObstacle } from '../types';

type Shader = {
  uniforms: { [key: string]: { value: any } };
  vertexShader: string;
  fragmentShader: string;
}

// --- PROCEDURAL AUDIO SYSTEM ---
const AmbientSound: React.FC = () => {
  const isScentMode = useGameStore(state => state.isScentMode);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const windNodeRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Initialize Audio Engine
  useEffect(() => {
    const initAudio = async () => {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      
      // Master Gain for Scent Mode dampening
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.0; // Start silent, fade in
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // --- 1. WIND ENGINE (Pink/Brown Noise) ---
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0; // Moved declaration before usage
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise approximation
        lastOut = output[i];
        output[i] *= 3.5; // Compensate gain
      }

      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      // Filter to make it sound like wind through grass (Low Pass)
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 400; 
      
      // Wind Gain
      const windGain = ctx.createGain();
      windGain.gain.value = 0.15;

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(masterGain);
      windSource.start();
      windNodeRef.current = windSource;

      // Wind Variation Loop
      const windInterval = setInterval(() => {
         // Modulate filter frequency to simulate gusts
         const now = ctx.currentTime;
         const randomFreq = 200 + Math.random() * 400;
         windFilter.frequency.exponentialRampToValueAtTime(randomFreq, now + 2);
      }, 3000);

      // --- 2. NATURE ENGINE (Insects) ---
      const insectInterval = setInterval(() => {
         if (Math.random() > 0.7) return; // Sparse
         const now = ctx.currentTime;
         
         const osc = ctx.createOscillator();
         const gain = ctx.createGain();
         
         osc.type = 'triangle';
         osc.frequency.setValueAtTime(4000 + Math.random() * 1000, now);
         
         // Short chirp envelope
         gain.gain.setValueAtTime(0, now);
         gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
         gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
         
         osc.connect(gain);
         gain.connect(masterGain);
         
         osc.start(now);
         osc.stop(now + 0.3);
      }, 2000 + Math.random() * 1000);

      // --- 3. WAR ENGINE (Distant Rumbles/Sirens) ---
      const warInterval = setInterval(() => {
          if (Math.random() > 0.2) return; // Very sparse
          const now = ctx.currentTime;
          
          const type = Math.random();
          
          if (type > 0.6) {
              // DISTANT EXPLOSION (Filtered Noise Burst)
              const bombSrc = ctx.createBufferSource();
              bombSrc.buffer = noiseBuffer;
              const bombFilter = ctx.createBiquadFilter();
              bombFilter.type = 'lowpass';
              bombFilter.frequency.value = 150; // Very muffled
              const bombGain = ctx.createGain();
              
              bombGain.gain.setValueAtTime(0, now);
              bombGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
              bombGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0); // Long tail
              
              bombSrc.connect(bombFilter);
              bombFilter.connect(bombGain);
              bombGain.connect(masterGain);
              bombSrc.start(now);
              bombSrc.stop(now + 3.5);
          } else if (type < 0.2) {
              // DISTANT SIREN/SCREAM (Eerie Sine)
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.frequency.setValueAtTime(500, now);
              osc.frequency.exponentialRampToValueAtTime(400, now + 4.0); // Downward slur
              
              gain.gain.setValueAtTime(0, now);
              gain.gain.linearRampToValueAtTime(0.03, now + 1.0);
              gain.gain.linearRampToValueAtTime(0, now + 4.0);
              
              osc.connect(gain);
              gain.connect(masterGain);
              osc.start(now);
              osc.stop(now + 4.0);
          }

      }, 8000);

      // Fade in Master
      masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 2.0);

      return () => {
         clearInterval(windInterval);
         clearInterval(insectInterval);
         clearInterval(warInterval);
         ctx.close();
      };
    };

    initAudio();

    return () => {
        if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  // Dynamic Volume Control based on Scent Mode
  useEffect(() => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const targetVol = isScentMode ? 0.15 : 0.6;
      
      // Smooth crossfade
      masterGainRef.current.gain.cancelScheduledValues(now);
      masterGainRef.current.gain.setTargetAtTime(targetVol, now, 0.5);

  }, [isScentMode]);

  return null;
};

// Helper to create custom blade geometry
const createBladeGeometry = (width: number, height: number, curve: number) => {
    const geo = new PlaneGeometry(width, height, 1, 4);
    geo.translate(0, height / 2, 0); // Pivot at bottom
    
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // Normalized height (0 at bottom, 1 at top)
      const y = pos.getY(i);
      // Clamp alpha to avoid negative values
      const alpha = Math.max(0, y / height);
      
      // Taper width to a point at the top
      const x = pos.getX(i);
      pos.setX(i, x * (1.0 - Math.pow(alpha, 0.5))); 
      
      // Add natural curve (bending backward slightly)
      pos.setZ(i, Math.pow(alpha, 2) * curve);
    }
    geo.computeVertexNormals();
    return geo;
};

const GrassBatch: React.FC<{
  count: number;
  width: number;
  height: number;
  baseColor: string;
  scentColor: string;
  curveStrength: number;
  scaleSpread: number;
  swayFactor: number; // Multiplier for wind effect
}> = ({ count, width, height, baseColor, scentColor, curveStrength, scaleSpread, swayFactor }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const isScentMode = useGameStore(state => state.isScentMode);

  const geometry = useMemo(() => createBladeGeometry(width, height, curveStrength), [width, height, curveStrength]);

  // Initial Placement
  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 45;
      const s = 1.0 - scaleSpread + Math.random() * (scaleSpread * 2); // Scale variation
      const rot = Math.random() * Math.PI * 2;
      const lean = (Math.random() - 0.5) * 0.4; // Initial random lean

      dummy.position.set(x, 0, z);
      dummy.rotation.set(lean, rot, 0);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, dummy, scaleSpread]);

  // Shader Injection
  const onBeforeCompile = useMemo(() => {
    return (shader: Shader) => {
      shader.uniforms.uTime = { value: 0 };
      
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
          vec4 instWorldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          
          float time = uTime;
          
          // Wind Calculation
          // Large Wave
          float wind = sin(time * 0.5 + instWorldPos.x * 0.2 + instWorldPos.z * 0.1);
          // Turbulence
          wind += sin(time * 1.5 + instWorldPos.z * 0.5) * 0.2;
          // Micro flutter
          wind += sin(time * 3.0 + instWorldPos.x * 1.0) * 0.05;

          // Height influence (sway more at top)
          // Use hardcoded height from prop approximation or normalize by known geometry height
          float normalizedHeight = position.y / ${height.toFixed(2)};
          float leanFactor = smoothstep(0.0, 1.0, normalizedHeight);
          
          // Sway Strength specific to this grass type
          float swayStrength = 0.15 * ${swayFactor.toFixed(2)};

          transformed.x += wind * leanFactor * swayStrength;
          transformed.z += wind * 0.5 * leanFactor * swayStrength;
        `
      );
    };
  }, [height, swayFactor]);

  useFrame((state) => {
    if (materialRef.current?.userData?.shader) {
        materialRef.current.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime();
    }

    if (materialRef.current) {
        const targetColor = isScentMode ? new Color(scentColor) : new Color(baseColor);
        materialRef.current.color.lerp(targetColor, 0.1);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]}>
      <meshStandardMaterial 
        ref={materialRef}
        color={baseColor} 
        side={DoubleSide} 
        roughness={0.8} 
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
};

const Grass: React.FC = () => {
  return (
    <>
      {/* Type 1: Standard Grass - Medium height, abundant, yellowish-green */}
      <GrassBatch 
        count={12000} 
        width={0.1} 
        height={0.8} 
        baseColor="#aa9933" 
        scentColor="#1a2640"
        curveStrength={0.15} 
        scaleSpread={0.3} 
        swayFactor={1.0}
      />

      {/* Type 2: Tall Dry Stalks - Very tall, thin, sparse, dry beige */}
      <GrassBatch 
        count={4000} 
        width={0.07} 
        height={1.3} 
        baseColor="#ccb066" 
        scentColor="#2a3650"
        curveStrength={0.1} 
        scaleSpread={0.2} 
        swayFactor={1.4} // Sways more
      />

      {/* Type 3: Undergrowth - Short, wide blades, darker/greener */}
      <GrassBatch 
        count={8000} 
        width={0.14} 
        height={0.5} 
        baseColor="#6b7c38" 
        scentColor="#112233"
        curveStrength={0.25} 
        scaleSpread={0.4} 
        swayFactor={0.6} // Sways less
      />
    </>
  );
};

const Debris: React.FC = () => {
    const count = 400;
    const materialRef = useRef<ShaderMaterial>(null);
    const { isScentMode } = useGameStore();

    const [offsets, randoms] = useMemo(() => {
        const off = new Float32Array(count * 3);
        const rnd = new Float32Array(count * 3); // speed, rotation speed, scale
        for(let i=0; i<count; i++) {
            off[i*3] = (Math.random() - 0.5) * 50;
            off[i*3+1] = Math.random() * 10; // Start at random heights
            off[i*3+2] = (Math.random() - 0.5) * 50;

            rnd[i*3] = 1.0 + Math.random() * 2.0; // Speed
            rnd[i*3+1] = (Math.random() - 0.5) * 10.0; // Tumble speed
            rnd[i*3+2] = 0.5 + Math.random() * 0.5; // Scale
        }
        return [off, rnd];
    }, []);

    useFrame((state) => {
        if(materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
            const targetColor = isScentMode ? new Color(0.5, 0.6, 0.8) : new Color(0.6, 0.5, 0.4);
            materialRef.current.uniforms.uColor.value.lerp(targetColor, 0.1);
        }
    });

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor: { value: new Color(0.6, 0.5, 0.4) }
    }), []);

    const vertexShader = `
        uniform float uTime;
        attribute vec3 aOffset;
        attribute vec3 aRandom;
        varying vec2 vUv;

        void main() {
            vUv = uv;
            
            float speed = aRandom.x;
            float tumble = aRandom.y;
            float scale = aRandom.z;

            // Wind direction (mostly X, slightly Z)
            vec3 windDir = vec3(2.0, -0.5, 0.5);
            
            // Calculate wrapped position
            vec3 pos = aOffset + windDir * uTime * speed;
            
            // Wrap logic: confines particles to a 50x10x50 box centered at 0
            vec3 boxSize = vec3(50.0, 12.0, 50.0);
            vec3 boxCenter = vec3(0.0, 6.0, 0.0); // Centered slightly up
            
            pos = mod(pos, boxSize) - (boxSize * 0.5);
            // Offset back to desired center area if needed, but mod handles relative motion
            // Adjust Y to keep them above ground mostly
            pos.y += 5.0; 
            pos.y = mod(pos.y, 10.0);

            // Turbulence
            pos.x += sin(uTime * 2.0 + aOffset.z) * 0.5;
            pos.y += cos(uTime * 1.5 + aOffset.x) * 0.5;

            // Tumble rotation (modify vertex position)
            float rot = uTime * tumble;
            float c = cos(rot);
            float s = sin(rot);
            mat2 m = mat2(c, -s, s, c);
            
            vec3 localPos = position * scale * 0.15; // Scale down the geometry
            localPos.xy = m * localPos.xy;
            localPos.xz = m * localPos.xz; // Double rotation for 3D tumble

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos + localPos, 1.0);
        }
    `;

    const fragmentShader = `
        uniform vec3 uColor;
        void main() {
            gl_FragColor = vec4(uColor, 0.8);
        }
    `;

    return (
        <instancedMesh args={[undefined, undefined, count]}>
            <planeGeometry args={[1, 1]}>
                <instancedBufferAttribute attach="attributes-aOffset" args={[offsets, 3]} />
                <instancedBufferAttribute attach="attributes-aRandom" args={[randoms, 3]} />
            </planeGeometry>
            <shaderMaterial 
                ref={materialRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                side={DoubleSide}
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

const TankTraps: React.FC<{ data: StaticObstacle[] }> = ({ data }) => {
    return (
        <>
            {data.map((d) => (
                <group key={d.id} position={[d.position.x, d.position.y + 0.5, d.position.z]} rotation={[0, d.rotation, 0]} scale={d.scale}>
                    {/* Czech Hedgehog Construction: 3 Intersecting Beams */}
                    <mesh rotation={[Math.PI/4, 0, Math.PI/4]}>
                        <cylinderGeometry args={[0.08, 0.08, 2.5]} />
                        <meshStandardMaterial color="#4a3c31" roughness={0.9} />
                    </mesh>
                    <mesh rotation={[-Math.PI/4, 0, -Math.PI/4]}>
                        <cylinderGeometry args={[0.08, 0.08, 2.5]} />
                        <meshStandardMaterial color="#4a3c31" roughness={0.9} />
                    </mesh>
                    <mesh rotation={[0, Math.PI/2, Math.PI/2]}>
                        <cylinderGeometry args={[0.08, 0.08, 2.5]} />
                        <meshStandardMaterial color="#4a3c31" roughness={0.9} />
                    </mesh>
                </group>
            ))}
        </>
    )
}

const FencePosts: React.FC<{ data: StaticObstacle[] }> = ({ data }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
  
    useLayoutEffect(() => {
      if (!meshRef.current) return;
      data.forEach((d, i) => {
          dummy.position.copy(d.position).setY(0.6 * d.scale);
          dummy.rotation.set(d.rotation, 0, d.rotation); // Slight wobble
          dummy.scale.set(d.scale, d.scale, d.scale);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data, dummy]);
  
    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
        <cylinderGeometry args={[0.08, 0.08, 1.5]} />
        <meshStandardMaterial color="#5c4033" roughness={1} />
      </instancedMesh>
    );
};

const AmmoBoxes: React.FC<{ data: StaticObstacle[] }> = ({ data }) => {
    const meshRef = useRef<InstancedMesh>(null);
    const dummy = useMemo(() => new Object3D(), []);
  
    useLayoutEffect(() => {
      if (!meshRef.current) return;
      data.forEach((d, i) => {
          dummy.position.copy(d.position).setY(0.15);
          dummy.rotation.set(0, d.rotation, 0);
          dummy.scale.set(d.scale, d.scale, d.scale);
          dummy.updateMatrix();
          meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data, dummy]);
  
    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
        <boxGeometry args={[0.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#4b5320" roughness={0.6} />
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
  const trapData = useMemo(() => staticObstacles.filter(o => o.type === 'tankTrap'), [staticObstacles]);
  const postData = useMemo(() => staticObstacles.filter(o => o.type === 'fencePost'), [staticObstacles]);
  const boxData = useMemo(() => staticObstacles.filter(o => o.type === 'ammoBox'), [staticObstacles]);
  
  return (
    <>
      <AmbientSound />

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
      
      {/* Static Obstacles */}
      <Rocks data={rockData} />
      <Bushes data={bushData} />
      <TankTraps data={trapData} />
      <FencePosts data={postData} />
      <AmmoBoxes data={boxData} />
      
      {/* Spread detail around ALL obstacles */}
      <Pebbles obstacles={staticObstacles} /> 
      <DryWeeds obstacles={staticObstacles} />
      
      <Grass />
      <Debris />
    </>
  );
};

export default World;