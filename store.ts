import { create } from 'zustand';
import { Vector3 } from 'three';
import { GameObject, ObjectType, FeedbackMessage, DecoyVariant, StaticObstacle, RatProfile } from './types';

export type GameStatus = 'intro' | 'playing' | 'won' | 'lost';

export const RATS: RatProfile[] = [
  {
    id: 'barnaby',
    name: '"General" Barnaby',
    role: 'The Veteran',
    description: 'Stoic, grumpy, and unfazed. He moves slowly but with absolute purpose.',
    history: '7 years in the field. Clearing the "Red Sector" is his legacy. Two weeks from retirement.',
    imageUrl: 'https://res.cloudinary.com/dfbcjsw25/image/upload/v1763563627/unnamed_1_s9exfg.jpg',
    stats: {
      speed: 3.0,         // Slow
      staminaDrain: 0.6,  // Very efficient (Tank)
      stability: 2.0,     // Rock solid, barely shakes
      scentRange: 1.0,
    }
  },
  {
    id: 'zola',
    name: 'Zola',
    role: 'The Rookie',
    description: 'Hyperactive, eager to please, and easily distracted. Demining is a game to her.',
    history: 'The runt of the litter. Passed final exam with a record time. First deployment.',
    imageUrl: 'https://res.cloudinary.com/dfbcjsw25/image/upload/v1763563627/unnamed_2_actdnh.jpg',
    stats: {
      speed: 5.5,         // Very Fast
      staminaDrain: 1.5,  // Drains quickly
      stability: 0.5,     // High anxiety shake
      scentRange: 1.5,    // Sees trails from further away
    }
  },
  {
    id: 'ghost',
    name: 'Ghost',
    role: 'The Survivor',
    description: 'Timid, gentle, and cautious. He works to make the "bad smell" go away.',
    history: 'Found near an explosion site. Not trained for treats, but for protection.',
    imageUrl: 'https://res.cloudinary.com/dfbcjsw25/image/upload/v1763563627/unnamed_3_sy16p6.jpg',
    stats: {
      speed: 3.8,         // Balanced
      staminaDrain: 1.0,  // Normal
      stability: 0.8,     // Slightly nervous
      scentRange: 1.2,
    }
  }
];

interface GameState {
  status: GameStatus;
  gameOverReason: 'timeout' | 'explosion' | 'health' | null;
  isScentMode: boolean;
  isBoosting: boolean;
  stamina: number; // 0 to 100
  health: number; // 0 to 100
  ratPosition: Vector3;
  objects: GameObject[];
  staticObstacles: StaticObstacle[];
  trust: number; // 0 to 100
  bananas: number;
  messages: FeedbackMessage[];
  timeLeft: number;
  minesFound: number;
  dangerLevel: number; // 0.0 (safe) to 1.0 (imminent death)
  selectedRat: RatProfile;
  
  // Actions
  startGame: () => void;
  selectRat: (rat: RatProfile) => void;
  setScentMode: (active: boolean) => void;
  setBoosting: (active: boolean) => void;
  updateStamina: (delta: number) => void;
  updateRatPosition: (pos: Vector3) => void;
  generateLevel: () => void;
  scratchLocation: () => void;
  addMessage: (text: string, type: 'success' | 'failure' | 'neutral') => void;
  tickTimer: () => void;
  triggerExplosion: () => void;
  restartGame: () => void;
  setDangerLevel: (level: number) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'intro',
  gameOverReason: null,
  isScentMode: false,
  isBoosting: false,
  stamina: 100,
  health: 100,
  ratPosition: new Vector3(0, 0, 0),
  objects: [],
  staticObstacles: [],
  trust: 50,
  bananas: 0,
  messages: [],
  timeLeft: 60,
  minesFound: 0,
  dangerLevel: 0,
  selectedRat: RATS[0], // Default to Barnaby

  startGame: () => set({ status: 'playing' }),
  
  selectRat: (rat) => set({ selectedRat: rat }),

  setScentMode: (active) => {
      const { stamina } = get();
      // Prevent enabling if no stamina
      if (active && stamina <= 0) return;
      set({ isScentMode: active });
  },

  setBoosting: (active) => {
      const { stamina } = get();
      if (active && stamina <= 0) return;
      set({ isBoosting: active });
  },
  
  updateStamina: (delta) => set((state) => {
    if (state.status !== 'playing') return {};

    let newStamina = state.stamina;
    let newScentMode = state.isScentMode;
    let newBoostMode = state.isBoosting;

    const scentCost = 20;
    const boostCost = 30;
    let drain = 0;

    if (state.isScentMode) drain += scentCost;
    if (state.isBoosting) drain += boostCost;

    // Apply Character Stats Modifier
    drain *= state.selectedRat.stats.staminaDrain;

    if (drain > 0) {
        newStamina -= delta * drain;
        if (newStamina <= 0) {
            newStamina = 0;
            // Disable modes if out of stamina
            if (newScentMode) newScentMode = false;
            if (newBoostMode) newBoostMode = false;
        }
    } else {
        // Regenerate stamina
        newStamina += delta * 15;
        if (newStamina > 100) newStamina = 100;
    }
    return { stamina: newStamina, isScentMode: newScentMode, isBoosting: newBoostMode };
  }),

  updateRatPosition: (pos) => set({ ratPosition: pos }),
  
  generateLevel: () => {
    const objects: GameObject[] = [];
    // Generate 75 objects to ensure >30 mines are available and density is high
    for (let i = 0; i < 75; i++) {
      const isMine = Math.random() > 0.4; // 60% mines, 40% decoys
      const variants: DecoyVariant[] = ['metal', 'bottle', 'rock'];
      const decoyVariant = variants[Math.floor(Math.random() * variants.length)];

      objects.push({
        id: `obj-${i}`,
        position: new Vector3(
          (Math.random() - 0.5) * 45,
          0, // Buried at ground level
          (Math.random() - 0.5) * 45
        ),
        type: isMine ? ObjectType.MINE : ObjectType.DECOY,
        decoyVariant: isMine ? undefined : decoyVariant,
        discovered: false,
        flagged: false,
      });
    }

    // Generate Static Obstacles
    const staticObstacles: StaticObstacle[] = [];
    
    // Rocks (Collidable)
    for (let i = 0; i < 30; i++) {
        staticObstacles.push({
            id: `rock-${i}`,
            position: new Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40),
            scale: 0.5 + Math.random() * 0.5,
            rotation: Math.random() * Math.PI * 2,
            type: 'rock'
        });
    }
    
    // Bushes (Visual)
    for (let i = 0; i < 20; i++) {
         staticObstacles.push({
            id: `bush-${i}`,
            position: new Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40),
            scale: 0.5 + Math.random() * 0.5,
            rotation: Math.random() * Math.PI * 2,
            type: 'bush'
        });
    }

    // Tank Traps (War Element - Large)
    for (let i = 0; i < 5; i++) {
         staticObstacles.push({
            id: `trap-${i}`,
            position: new Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40),
            scale: 1.0 + Math.random() * 0.2,
            rotation: Math.random() * Math.PI,
            type: 'tankTrap'
        });
    }

    // Fence Posts (War Element - Vertical)
    for (let i = 0; i < 10; i++) {
         staticObstacles.push({
            id: `post-${i}`,
            position: new Vector3((Math.random() - 0.5) * 42, 0, (Math.random() - 0.5) * 42),
            scale: 0.8 + Math.random() * 0.4,
            rotation: (Math.random() - 0.5) * 0.2, // Slight tilt
            type: 'fencePost'
        });
    }

    // Ammo Boxes (War Element - Small/Medium)
    for (let i = 0; i < 6; i++) {
         staticObstacles.push({
            id: `box-${i}`,
            position: new Vector3((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40),
            scale: 1.0,
            rotation: Math.random() * Math.PI * 2,
            type: 'ammoBox'
        });
    }

    set({ 
      objects, 
      staticObstacles,
      trust: 50, 
      bananas: 0, 
      messages: [], 
      timeLeft: 60, 
      minesFound: 0,
      stamina: 100,
      health: 100,
      gameOverReason: null,
      status: 'playing',
      dangerLevel: 0,
      isScentMode: false,
      isBoosting: false
    });
  },

  tickTimer: () => {
    const { status, timeLeft } = get();
    if (status !== 'playing') return;

    if (timeLeft <= 1) {
      set({ status: 'lost', gameOverReason: 'timeout', timeLeft: 0 });
    } else {
      set({ timeLeft: timeLeft - 1 });
    }
  },

  addMessage: (text, type) => {
    const id = Date.now();
    set((state) => ({
      messages: [...state.messages, { id, text, type }].slice(-3) // Keep last 3
    }));
    // Auto remove after 3s
    setTimeout(() => {
      set((state) => ({
        messages: state.messages.filter((m) => m.id !== id)
      }));
    }, 3000);
  },

  triggerExplosion: () => {
      set({ status: 'lost', gameOverReason: 'explosion' });
  },

  setDangerLevel: (level) => {
    set({ dangerLevel: level });
  },

  scratchLocation: () => {
    const { ratPosition, objects, trust, bananas, addMessage, minesFound, status, health } = get();
    
    if (status !== 'playing') return;

    // Find closest object
    let closestObj: GameObject | null = null;
    let minDist = 2.0; // Interaction radius

    objects.forEach(obj => {
      if (obj.flagged) return; // Already handled
      const dist = ratPosition.distanceTo(obj.position);
      if (dist < minDist) {
        minDist = dist;
        closestObj = obj;
      }
    });

    if (closestObj) {
      const obj = closestObj as GameObject;
      
      if (obj.type === ObjectType.MINE) {
        // SUCCESS
        const newMinesFound = minesFound + 1;
        const newTrust = Math.min(100, trust + 10);
        const newHealth = Math.min(100, health + 10); // Heal on success
        
        // Check Win Condition
        if (newMinesFound >= 30) {
            set({
                trust: newTrust,
                health: newHealth,
                bananas: bananas + 1,
                minesFound: newMinesFound,
                objects: objects.map(o => o.id === obj.id ? { ...o, flagged: true } : o),
                status: 'won'
            });
            addMessage("MISSION COMPLETE!", "success");
        } else {
            addMessage("Good job! Safe marked.", "success");
            set({
              trust: newTrust,
              health: newHealth,
              bananas: bananas + 1,
              minesFound: newMinesFound,
              objects: objects.map(o => o.id === obj.id ? { ...o, flagged: true } : o)
            });
        }

      } else {
        // FAILURE - False positive
        let msg = "Just scrap metal. Focus.";
        if (obj.decoyVariant === 'bottle') msg = "Just a glass bottle.";
        if (obj.decoyVariant === 'rock') msg = "Just a rock.";

        const newHealth = health - 20;
        
        if (newHealth <= 0) {
            set({ 
                status: 'lost', 
                gameOverReason: 'health',
                health: 0,
                objects: objects.map(o => o.id === obj.id ? { ...o, flagged: true } : o)
            });
        } else {
            addMessage(msg, "failure");
            set({
              trust: Math.max(0, trust - 15),
              health: newHealth,
              objects: objects.map(o => o.id === obj.id ? { ...o, flagged: true } : o)
            });
        }
      }
    } else {
      // FAILURE - Nothing there
      addMessage("Nothing here...", "neutral");
    }
  },

  restartGame: () => {
      get().generateLevel();
  }
}));