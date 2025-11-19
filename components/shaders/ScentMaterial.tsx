import { shaderMaterial } from '@react-three/drei';
import { Color } from 'three';
import { extend } from '@react-three/fiber';

// A sophisticated shader that creates an ethereal, swirling energy trail
// Uses Fractal Brownian Motion (FBM) for gas-like texture
const ScentMaterial = shaderMaterial(
  {
    time: 0,
    color: new Color(0.2, 0.0, 0.5),
    intensity: 0, // 0 = invisible, 1 = visible
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vPosition;
    uniform float time;

    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Swirling motion that gets stronger with height (vortex effect)
      float angle = time * 0.8 + pos.y * 3.0;
      // Non-linear spread: widens more at the top
      float offsetStrength = pow(pos.y, 1.2) * 0.15; 
      
      pos.x += sin(angle) * offsetStrength;
      pos.z += cos(angle) * offsetStrength;
      
      // Internal micro-turbulence
      float turbulence = sin(pos.y * 10.0 - time * 3.0) * 0.03;
      pos.x += turbulence;
      pos.z += turbulence * 0.5;

      vElevation = pos.y;
      vPosition = pos;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float intensity;
    varying vec2 vUv;
    varying float vElevation;

    // Pseudo-random function
    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    // Value noise
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    // Fractal Brownian Motion - creates wispy, cloud-like details
    float fbm(vec2 st) {
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        // Rotation matrix to reduce grid artifacts
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        for (int i = 0; i < 3; ++i) {
            v += a * noise(st);
            st = rot * st * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
      if (intensity < 0.01) discard;

      // Coordinate system for the noise
      // Stretch vertically to simulate rising gas
      vec2 coord = vUv * vec2(3.0, 8.0); 
      
      // Flow upwards over time
      coord.y -= time * 1.2; 

      // Generate primary FBM noise pattern
      float n = fbm(coord);
      
      // Secondary layer moving differently for parallax/depth feel
      float n2 = fbm(coord * 1.5 + vec2(time * 0.5, 0.0));
      
      // Combine noise layers
      float finalNoise = mix(n, n2, 0.4);

      // Shape the plume: Fade out at edges (x) and top/bottom (y)
      float horizontalFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
      horizontalFade = smoothstep(0.2, 0.8, horizontalFade);
      
      // Soft fade at top and bottom
      float verticalFade = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
      
      // Calculate final alpha based on noise and shape
      float alpha = smoothstep(0.3, 0.7, finalNoise) * horizontalFade * verticalFade;
      
      // --- COLOR BANDING & SHIFTING LOGIC ---
      
      // 1. Base Color: Darker version of the uniform color
      vec3 baseColor = color * 0.5;
      
      // 2. Banding: Create rising sine-wave bands that are distorted by the noise
      // The 'finalNoise * 1.5' term makes the bands wiggle with the smoke texture
      float bandPhase = vUv.y * 25.0 - time * 2.0 + finalNoise * 1.5;
      float bands = sin(bandPhase);
      // Sharpness of the bands
      float bandFactor = smoothstep(0.4, 0.6, bands);
      
      // Band color is brighter and slightly saturated
      vec3 bandColor = color * 1.3 + vec3(0.1); 
      
      // 3. Core Intensity: The densest parts of the noise are white-hot
      float coreIntensity = smoothstep(0.6, 0.9, finalNoise);
      vec3 coreColor = vec3(1.0, 1.0, 1.0);
      
      // Mix layers: Base -> Bands -> Core
      vec3 finalColor = mix(baseColor, bandColor, bandFactor);
      finalColor = mix(finalColor, coreColor, coreIntensity * 0.6);
      
      // 4. Vertical Dissipation Shift
      // Add a slight cool/blue tint as it rises to simulate mixing with air
      finalColor += vec3(0.05, 0.1, 0.2) * vUv.y;

      // Add a subtle electric pulse to the emission strength
      float pulse = 1.0 + sin(time * 4.0) * 0.15;
      finalColor *= pulse;

      gl_FragColor = vec4(finalColor, alpha * intensity);
    }
  `
);

extend({ ScentMaterial });

export default ScentMaterial;