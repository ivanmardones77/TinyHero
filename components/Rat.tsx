import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group, MathUtils, Mesh } from 'three';
import { useGameStore } from '../store';
import { ObjectType } from '../types';

// Procedural sound generator for collision thumps
const playBumpSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    // Low thud: fast pitch drop from 80Hz to 20Hz
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    // Ignore audio errors
  }
};

const Rat: React.FC = () => {
  const ref = useRef<Group>(null);
  
  // Animation Refs
  const bodyRef = useRef<Mesh>(null);
  const noseRef = useRef<Mesh>(null);
  const leftEarRef = useRef<Mesh>(null);
  const rightEarRef = useRef<Mesh>(null);
  const tailRef = useRef<Mesh>(null);

  const updateRatPosition = useGameStore(state => state.updateRatPosition);
  const setScentMode = useGameStore(state => state.setScentMode);
  const setBoosting = useGameStore(state => state.setBoosting);
  const isBoosting = useGameStore(state => state.isBoosting);
  const scratchLocation = useGameStore(state => state.scratchLocation);
  const updateStamina = useGameStore(state => state.updateStamina);
  const triggerExplosion = useGameStore(state => state.triggerExplosion);
  const setDangerLevel = useGameStore(state => state.setDangerLevel);
  const objects = useGameStore(state => state.objects);
  const staticObstacles = useGameStore(state => state.staticObstacles);
  const status = useGameStore(state => state.status);
  const gameOverReason = useGameStore(state => state.gameOverReason);
  
  const { camera } = useThree();
  
  // Movement state
  const keys = useRef<{ [key: string]: boolean }>({});
  const velocity = useRef(new Vector3());
  const baseSpeed = 4.0;
  const boostMultiplier = 2.2;
  
  // Camera state
  const currentLookAt = useRef(new Vector3());
  const shakeIntensity = useRef(0);
  
  // Logic state
  const detonationAccumulator = useRef(0);
  
  // Recoil/Feedback state
  const recoilIntensity = useRef(0);
  const lastBumpTime = useRef(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') setScentMode(true);
      if (e.key === 'Shift') setBoosting(true);
      if (e.code === 'Enter') scratchLocation();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.code === 'Space') setScentMode(false);
      if (e.key === 'Shift') setBoosting(false);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) scratchLocation();
      if (e.button === 2) setScentMode(true);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) setScentMode(false);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [setScentMode, setBoosting, scratchLocation]);

  useFrame((state, delta) => {
    if (!ref.current || status !== 'playing') return;

    updateStamina(delta);

    if (currentLookAt.current.lengthSq() === 0) {
      currentLookAt.current.copy(ref.current.position);
    }

    const move = new Vector3(0, 0, 0);
    
    // CRITICAL FIX: Handle camera direction safely to prevent NaN when looking straight down
    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    
    // Only normalize if length is sufficient, otherwise assume no forward movement component
    if (forward.lengthSq() > 0.001) {
        forward.normalize();
    } else {
        forward.set(0, 0, -1); // Fallback
    }

    const right = new Vector3();
    right.crossVectors(forward, new Vector3(0, 1, 0));
    if (right.lengthSq() > 0.001) {
        right.normalize();
    } else {
        right.set(1, 0, 0); // Fallback
    }

    if (keys.current['ArrowUp'] || keys.current['KeyW']) move.add(forward);
    if (keys.current['ArrowDown'] || keys.current['KeyS']) move.sub(forward);
    if (keys.current['ArrowLeft'] || keys.current['KeyA']) move.sub(right);
    if (keys.current['ArrowRight'] || keys.current['KeyD']) move.add(right);

    const isMoving = move.length() > 0;
    
    // --- Mouse Aiming Logic ---
    state.raycaster.setFromCamera(state.pointer, state.camera);
    const rayDir = state.raycaster.ray.direction.clone();
    rayDir.y = 0;
    
    if (rayDir.lengthSq() > 0.0001) {
        rayDir.normalize();
        const targetRotation = Math.atan2(rayDir.x, rayDir.z);
        const currentRotation = ref.current.rotation.y;
        
        let rotDiff = targetRotation - currentRotation;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        
        ref.current.rotation.y += rotDiff * delta * 10;
    }

    // --- Collision & Explosion Logic ---
    if (isMoving) {
      move.normalize();
    }

    let isColliding = false;
    let closestUnflaggedMineDist = Infinity;
    
    for (const obj of objects) {
      const dist = ref.current.position.distanceTo(obj.position);
      
      if (obj.type === ObjectType.MINE && !obj.flagged) {
          if (dist < closestUnflaggedMineDist) {
              closestUnflaggedMineDist = dist;
          }
      } else {
          if (dist < 0.4) {
              isColliding = true;
              const pushDir = ref.current.position.clone().sub(obj.position).normalize();
              pushDir.y = 0;
              move.add(pushDir.multiplyScalar(5.0));

              if (state.clock.elapsedTime - lastBumpTime.current > 0.4) {
                  lastBumpTime.current = state.clock.elapsedTime;
                  recoilIntensity.current = 1.0;
                  playBumpSound();
              }
          }
      }
    }

    for (const obs of staticObstacles) {
        if (obs.type === 'rock') {
            const dist = ref.current.position.distanceTo(obs.position);
            const threshold = (obs.scale * 0.9) + 0.2; 
            
            if (dist < threshold) {
                isColliding = true;
                const pushDir = ref.current.position.clone().sub(obs.position).normalize();
                pushDir.y = 0;
                move.add(pushDir.multiplyScalar(8.0));
                
                if (state.clock.elapsedTime - lastBumpTime.current > 0.4) {
                    lastBumpTime.current = state.clock.elapsedTime;
                    recoilIntensity.current = 1.0;
                    playBumpSound();
                }
            }
        }
    }

    // --- Rat Sense ---
    let currentDanger = 0;
    if (closestUnflaggedMineDist < 1.5) {
        currentDanger = MathUtils.clamp(1.0 - (closestUnflaggedMineDist - 0.4) / 1.1, 0, 1);
    }
    setDangerLevel(currentDanger);

    if (closestUnflaggedMineDist < 0.5) {
        detonationAccumulator.current += delta;
        // Death trigger threshold increased to 3.0 seconds
        if (detonationAccumulator.current > 3.0) {
            triggerExplosion();
        }
    } else {
        detonationAccumulator.current = Math.max(0, detonationAccumulator.current - delta * 2);
    }

    // --- Shake Logic ---
    let targetShake = isMoving ? 0.5 : 0.0;
    if (isColliding) targetShake = 4.0;
    if (currentDanger > 0.5) {
        targetShake += Math.sin(state.clock.elapsedTime * 10) * (currentDanger * 0.5);
    }
    
    // Increase shake when boosting
    if (isBoosting && isMoving) targetShake += 0.5;

    const lerpSpeed = isColliding ? 20.0 : 3.0;
    shakeIntensity.current = MathUtils.lerp(shakeIntensity.current, targetShake, delta * lerpSpeed);

    // Apply movement
    const currentSpeed = isBoosting ? baseSpeed * boostMultiplier : baseSpeed;

    if (!isNaN(move.x) && !isNaN(move.z)) {
        velocity.current.copy(move).multiplyScalar(currentSpeed * delta);
        ref.current.position.add(velocity.current);
    }

    ref.current.position.x = Math.max(-20, Math.min(20, ref.current.position.x));
    ref.current.position.z = Math.max(-20, Math.min(20, ref.current.position.z));

    updateRatPosition(ref.current.position.clone());

    // --- Animation Logic ---
    const t = state.clock.elapsedTime;
    const isCowering = currentDanger > 0.6;

    if (recoilIntensity.current > 0) {
        recoilIntensity.current = MathUtils.lerp(recoilIntensity.current, 0, delta * 8);
    }

    // Reset base Z position to 0 to prevent recoil drift
    if (bodyRef.current) bodyRef.current.position.z = 0;

    if (isCowering) {
         if (bodyRef.current) {
            // Shivering/Breathing rapidly
            bodyRef.current.position.y = 0.1 + Math.sin(t * 50) * 0.008;
            // Slight rapid body shifts (shaking)
            bodyRef.current.position.x = (Math.random() - 0.5) * 0.01; 
            // Flattened, tense posture
            bodyRef.current.scale.set(1.05, 0.85, 1.05);
         }
         
         // Frantic tail flicking
         if (tailRef.current) {
             tailRef.current.rotation.z = -0.2 + Math.sin(t * 35) * 0.15 + (Math.random() - 0.5) * 0.1;
         }
         
         // Ears pinned back but twitching frantically
         if (leftEarRef.current) {
             leftEarRef.current.rotation.z = -0.9 + (Math.random() * 0.3);
         }
         if (rightEarRef.current) {
             rightEarRef.current.rotation.z = 0.9 - (Math.random() * 0.3);
         }

    } else if (isMoving) {
        const animSpeed = isBoosting ? 30 : 20;
        if (bodyRef.current) {
            bodyRef.current.position.y = 0.15 + Math.sin(t * animSpeed) * 0.02;
            bodyRef.current.scale.set(1.0, 1.0, 1.0);
        }
        if (tailRef.current) tailRef.current.rotation.z = Math.sin(t * (isBoosting ? 25 : 15)) * 0.2; 
        if (leftEarRef.current) leftEarRef.current.rotation.z = -0.6;
        if (rightEarRef.current) rightEarRef.current.rotation.z = 0.6;

    } else {
        if (bodyRef.current) {
             bodyRef.current.scale.y = 1.0 + Math.sin(t * 3) * 0.02; 
             bodyRef.current.scale.x = 1.0 - Math.sin(t * 3) * 0.01;
             bodyRef.current.scale.z = 1.0 - Math.sin(t * 3) * 0.01;
             bodyRef.current.position.y = 0.15 + Math.sin(t * 3) * 0.005; 
        }
        if (noseRef.current) {
             const twitchCycle = Math.sin(t * 2);
             if (twitchCycle > 0.5) {
                const twitch = Math.sin(t * 30) * 0.1;
                noseRef.current.scale.setScalar(1.0 + twitch * 0.5);
                noseRef.current.rotation.z = twitch;
             } else {
                 noseRef.current.scale.setScalar(1.0);
                 noseRef.current.rotation.z = 0;
             }
        }
        if (tailRef.current) tailRef.current.rotation.z = Math.sin(t * 1.5) * 0.08;
        
        if (leftEarRef.current) {
            const baseRot = -0.5;
            if (Math.random() > 0.98) leftEarRef.current.rotation.z = baseRot - 0.2;
            else leftEarRef.current.rotation.z = MathUtils.lerp(leftEarRef.current.rotation.z, baseRot, 0.1);
        }
        if (rightEarRef.current) {
            const baseRot = 0.5;
            if (Math.random() > 0.98) rightEarRef.current.rotation.z = baseRot + 0.2;
            else rightEarRef.current.rotation.z = MathUtils.lerp(rightEarRef.current.rotation.z, baseRot, 0.1);
        }
    }

    // Apply Recoil Overlay
    if (recoilIntensity.current > 0.01 && bodyRef.current) {
        const sq = recoilIntensity.current * 0.4; 
        bodyRef.current.scale.y *= (1.0 - sq);
        bodyRef.current.scale.x *= (1.0 + sq * 0.5);
        bodyRef.current.scale.z *= (1.0 + sq * 0.5);
        bodyRef.current.position.z += sq * 0.2; // Now applied after reset
    }

    // Camera Follow
    // Slightly increase follow distance when boosting for speed effect
    const followDist = isBoosting ? -2.6 : -2.2;
    const cameraOffset = new Vector3(0, 1.0, followDist); 
    cameraOffset.applyAxisAngle(new Vector3(0, 1, 0), ref.current.rotation.y);
    const targetCamPos = ref.current.position.clone().add(cameraOffset);
    camera.position.lerp(targetCamPos, delta * (isBoosting ? 2.0 : 2.5));

    if (shakeIntensity.current > 0.01) {
        const amp = 0.02 * shakeIntensity.current;
        camera.position.y += Math.sin(t * 30) * amp;
        camera.position.x += Math.cos(t * 25) * amp;
        camera.position.z += Math.sin(t * 20) * amp * 0.5;
    }

    const targetLookAt = ref.current.position.clone().add(new Vector3(0, 0.3, 0));
    currentLookAt.current.lerp(targetLookAt, delta * 5.0);
    camera.lookAt(currentLookAt.current);
  });

  return (
    <group ref={ref} position={[0, 0, 0]} visible={gameOverReason !== 'explosion'}>
      <mesh ref={bodyRef} position={[0, 0.15, 0]} rotation={[Math.PI/2, 0, 0]}>
        <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
        <meshStandardMaterial color="#7c6a5a" roughness={0.8} />
      </mesh>
      <mesh ref={noseRef} position={[0, 0.15, 0.2]} rotation={[Math.PI/2, 0, 0]}>
        <coneGeometry args={[0.05, 0.1, 16]} />
        <meshStandardMaterial color="#ffaaaa" />
      </mesh>
      <mesh ref={leftEarRef} position={[0.1, 0.25, 0.1]} rotation={[0, 0, -0.5]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial color="#7c6a5a" />
      </mesh>
      <mesh ref={rightEarRef} position={[-0.1, 0.25, 0.1]} rotation={[0, 0, 0.5]}>
        <sphereGeometry args={[0.05]} />
        <meshStandardMaterial color="#7c6a5a" />
      </mesh>
      <mesh ref={tailRef} position={[0, 0.1, -0.3]} rotation={[Math.PI/2.2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.01, 0.5]} />
        <meshStandardMaterial color="#ffaaaa" />
      </mesh>
    </group>
  );
};

export default Rat;