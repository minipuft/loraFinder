import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { useAnimationPipeline } from '../animations/AnimationManager'; // Import the hook
import { ColorContext, ImagePalette } from '../contexts/ColorContext'; // Import ColorContext and ImagePalette
import usePrevious from '../hooks/usePrevious'; // ++ IMPORT usePrevious
import styles from '../styles/ParticleBackground.module.scss'; // Reuse or create new styles

// ++ DEFINE SIDEBAR WIDTH (should match TapestrySidebar.module.scss) ++
const SIDEBAR_PIXEL_WIDTH = 220;

// Convert hex color string to vec3 [r, g, b] (normalized 0-1)
const hexToVec3 = (hex: string): [number, number, number] => {
  let r = 0,
    g = 0,
    b = 0;
  // 3 digits
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
    // 6 digits
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return [r / 255, g / 255, b / 255];
};

// Linear interpolation function for arrays (like colors)
const lerpArray = (start: number[], end: number[], t: number): number[] => {
  return start.map((val, i) => val + (end[i] - val) * t);
};

// Linear interpolation for single values
const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

// ++ NEW HELPER: Calculate RGB distance ++
const rgbDistance = (rgb1: [number, number, number], rgb2: [number, number, number]): number => {
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const MAX_RGB_DISTANCE = Math.sqrt(3); // Max distance between two RGB colors (e.g., black and white normalized)

// --- NEW: Helper to calculate 'Forge Energy' ---
const calculateForgeEnergy = (palette: ImagePalette | null): number => {
  if (!palette) return 0.3; // Default low energy if no palette

  const primaryColorHex = palette.base;
  const primaryRGB = hexToVec3(primaryColorHex);
  const primaryBrightness = (primaryRGB[0] + primaryRGB[1] + primaryRGB[2]) / 3.0;

  const maxC = Math.max(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  const minC = Math.min(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  const delta = maxC - minC;
  const primarySaturation = maxC === 0 ? 0 : delta / maxC;

  let energy = primaryBrightness * 0.5 + primarySaturation * 0.5;

  // Use complementary color if available
  const secondaryColorHex = palette.complementary;
  // No need to check if colors.length > 1, complementary is a fixed part of the palette
  // if (palette.complementary) { // This check is implicitly handled by palette.complementary existing
  const secondaryRGB = hexToVec3(secondaryColorHex);
  const colorDelta =
    Math.abs(secondaryRGB[0] - primaryRGB[0]) +
    Math.abs(secondaryRGB[1] - primaryRGB[1]) +
    Math.abs(secondaryRGB[2] - primaryRGB[2]);
  energy += colorDelta * 0.1;
  // }

  return Math.min(Math.max(energy * 1.2 + 0.1, 0.1), 1.0);
};

// ++ NEW HELPER: Calculate Palette Change Drasticness ++
const calculatePaletteChangeDrasticness = (
  prevPalette: ImagePalette | null,
  newPalette: ImagePalette | null,
  prevAnimatedForgeEnergy: number
): number => {
  if (prevPalette === newPalette) return 0; // Strict equality check for same object instance or both null
  if (!prevPalette && !newPalette) return 0; // Both are null, no change
  if (!prevPalette || !newPalette) return 1; // Full change (e.g., from null to palette or vice-versa)

  const prevBaseRgb = hexToVec3(prevPalette.base);
  const newBaseRgb = hexToVec3(newPalette.base);
  const baseColorDiff = rgbDistance(prevBaseRgb, newBaseRgb) / MAX_RGB_DISTANCE;

  const prevCompRgb = hexToVec3(prevPalette.complementary);
  const newCompRgb = hexToVec3(newPalette.complementary);
  const compColorDiff = rgbDistance(prevCompRgb, newCompRgb) / MAX_RGB_DISTANCE;

  const newForgeEnergy = calculateForgeEnergy(newPalette);
  const energyDiff = Math.abs(newForgeEnergy - prevAnimatedForgeEnergy);

  // Weights: baseColor=0.4, compColor=0.3, energy=0.3
  const drasticness = baseColorDiff * 0.4 + compColorDiff * 0.3 + energyDiff * 0.3;

  return Math.min(Math.max(drasticness, 0), 1); // Clamp to 0-1
};

// --- WebGL Shaders (Refined for Aura Effect) ---

// Vertex Shader (Remains the same - simple quad pass-through)
const vertexShaderSource = `
  precision mediump float;
  attribute vec2 a_position; // Vertex position (-1 to 1)
  varying vec2 v_uv;         // Pass UV coordinates (0 to 1) to fragment shader

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_uv = (a_position + 1.0) * 0.5; // Convert clip space to UV space
    v_uv.y = 1.0 - v_uv.y; // Flip Y for texture/canvas coordinate system
  }
`;

// Fragment Shader: Updated with noise functions for a more organic background
const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec3 u_colorTarget1;
  uniform vec3 u_colorTarget2;
  uniform float u_colorMixFactor;
  uniform float u_forgeEnergy;
  uniform vec2 u_echo_center;
  uniform float u_echo_intensity;
  uniform vec3 u_echo_color;
  uniform float u_echo_radius;
  uniform float u_isHovering; // Global image hover
  uniform vec3 u_hoverColor;   // Global image hover color
  uniform vec3 u_hoverComplementaryColor; // ++ NEW: Complementary color of the specific hovered image
  uniform float u_hasHoverComplementary; // ++ NEW: Flag if complementary hover color is available
  uniform vec4 u_sidebar_rect_uv; // x, y_bottom, width, height_full_sidebar (from Phase 2)

  // ++ NEW: Sidebar Interaction Uniforms ++
  uniform vec2 u_sidebar_hover_uv;          // Center UV of hovered item
  uniform float u_sidebar_hover_active;     // 1.0 if active, 0.0 otherwise
  uniform float u_sidebar_hover_height_uv;  // Height of hovered item in UV space
  uniform vec2 u_sidebar_selected_uv;       // Center UV of selected item
  uniform float u_sidebar_selected_active;  // 1.0 if active, 0.0 otherwise
  uniform float u_sidebar_selected_height_uv; // Height of selected item in UV space

  // Constants for Cosmic Tides
  const float BASE_TIDE_STRENGTH = 0.05; // Renamed from TIDE_STRENGTH
  const float TIDE_SCALE = 0.1;
  const float TIDE_TIME_SCALE = 0.005;
  const float SIDEBAR_CALM_FACTOR_HOVER = 0.7;    // How much to calm tides on hover (0-1)
  const float SIDEBAR_CALM_FACTOR_SELECTED = 0.95; // How much to calm tides on select (0-1)

  // Constants for Color Harmony (for background fluid)
  const float ECHO_DESATURATION_FACTOR = 0.75;
  const float ECHO_BRIGHTNESS_SCALE = 0.4;

  // --- METABALL CONSTANTS ---
  const int NUM_METABALLS = 5;
  const float METABALL_BASE_RADIUS = 0.15;
  const float METABALL_THRESHOLD = 0.8;
  const float METABALL_EDGE_SOFTNESS = 0.05;

  // --- Noise and Helper Functions (random, noise, fbm_textured_metaball, applyCosmicTides, deriveEchoColor, toneMapReinhard) ---
  // These functions (random, noise, fbm_textured) are kept as they are useful for animating metaball cores.
  // applyCosmicTides is kept for subtle background warp.
  // deriveEchoColor and toneMapReinhard are kept for coloring and final output.

  float random (vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  float noise (vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  #define OCTAVES_MB 3 // Fewer octaves for metaball movement - less computationally intensive
  vec3 fbm_textured_metaball(vec2 st) { // Simplified fbm for metaball movement
      float value = 0.0;
      float amplitude = 0.5;
      vec2 P = st;
      for (int i = 0; i < OCTAVES_MB; i++) {
          value += amplitude * noise(P);
          P *= 2.0;
          amplitude *= 0.5;
      }
      // No gradient needed for this simpler version
      return vec3(value, 0.0, 0.0); // Only returning value
  }

  vec2 applyCosmicTides(vec2 uv, float time, float dynamic_tide_strength) {
    vec2 scaled_uv = uv * TIDE_SCALE;
    float time_scaled = time * TIDE_TIME_SCALE;
    float displacement_x = fbm_textured_metaball(scaled_uv + vec2(time_scaled * 0.3, time_scaled * 0.2)).x;
    float displacement_y = fbm_textured_metaball(scaled_uv + vec2(time_scaled * 0.1, time_scaled * 0.4) + vec2(5.2, 1.3)).x;
    vec2 displacement_vector = vec2((displacement_x - 0.5) * 2.0, (displacement_y - 0.5) * 2.0) * dynamic_tide_strength; // Use dynamic strength
    return uv + displacement_vector;
  }

  vec3 deriveEchoColor(vec3 primaryColor) {
    float gray = dot(primaryColor, vec3(0.299, 0.587, 0.114));
    vec3 desaturatedColor = mix(primaryColor, vec3(gray), ECHO_DESATURATION_FACTOR);
    return desaturatedColor * ECHO_BRIGHTNESS_SCALE;
  }

  vec3 toneMapReinhard(vec3 color) {
    color = color / (color + vec3(1.0)); // Simple Reinhard
    return pow(color, vec3(1.0/2.2)); // Apply gamma correction
  }

  // --- METABALL CORE ANIMATION ---
  // Animates the core position of a single metaball
  vec2 animateMetaballCore(int index, float time, float energy) {
    float i = float(index);
    // Base path using sinusoidal motion, varied per metaball
    float speed = 0.1 + i * 0.02 + energy * 0.15; // Energy influences speed
    float xRadius = 0.3 + i * 0.03;
    float yRadius = 0.25 + (4.0-i) * 0.03; // Different Y radius for variety

    float x = sin(time * speed + i * 1.5) * xRadius;
    float y = cos(time * speed * 0.8 + i * 2.0) * yRadius; // Slightly different speed for y

    // Add some slower, larger scale noise for drifting, influenced by energy
    float driftSpeed = 0.05 + energy * 0.05;
    vec2 driftNoiseCoord = vec2(i * 10.0, (i+1.0) * 5.0);
    x += (fbm_textured_metaball(driftNoiseCoord + time * driftSpeed * 0.2).x - 0.5) * 0.4 * (0.5 + energy * 0.5);
    y += (fbm_textured_metaball(driftNoiseCoord + time * driftSpeed * 0.2 + vec2(3.1,7.4)).x - 0.5) * 0.4 * (0.5 + energy * 0.5);

    vec2 corePos = vec2(0.5 + x, 0.5 + y); // Center around (0.5, 0.5) in UV space

    return corePos;
  }

  // --- SDF METABALL INFLUENCE CALCULATION ---
  // Calculates the influence of a single metaball at point p
  float sdfMetaball_influence(vec2 p, vec2 corePos, float radius) {
    float distSq = dot(p - corePos, p - corePos);
    // Using Gaussian falloff for smoother merging: exp(-k * distSq)
    // Or simpler inverse square: radius^2 / distSq for sharper influence
    // Let's use inverse square as it's classic for metaballs
    if (distSq == 0.0) return 1000.0; // Avoid division by zero, huge influence if directly on core
    return (radius * radius) / distSq;
  }

  // Helper for smoothstep edge
  float smoothstep_edge(float edge0, float edge1, float x) {
    return smoothstep(edge0, edge1, x);
  }

  void main() {
    float current_tide_strength = BASE_TIDE_STRENGTH;

    // Determine if the current pixel is within the horizontal bounds of the sidebar
    bool is_in_sidebar_column = (
      v_uv.x >= u_sidebar_rect_uv.x &&
      v_uv.x <= u_sidebar_rect_uv.x + u_sidebar_rect_uv.z
    );

    float interaction_intensity = 0.0;

    if (is_in_sidebar_column) {
      // SELECTED ITEM takes precedence and has stronger effect
      if (u_sidebar_selected_active > 0.5) {
        float item_half_height_uv = u_sidebar_selected_height_uv * 0.5;
        float dist_y = abs(v_uv.y - u_sidebar_selected_uv.y);
        // Smooth falloff for the interaction effect, stronger in the middle of the item
        interaction_intensity = smoothstep(item_half_height_uv, item_half_height_uv * 0.8, dist_y) * SIDEBAR_CALM_FACTOR_SELECTED;
      }
      // HOVER ITEM effect if no selection is stronger, or blend if needed (simplifying for now: selected overrides hover intensity calculation for calm)
      else if (u_sidebar_hover_active > 0.5) {
        float item_half_height_uv = u_sidebar_hover_height_uv * 0.5;
        float dist_y = abs(v_uv.y - u_sidebar_hover_uv.y);
        interaction_intensity = smoothstep(item_half_height_uv, item_half_height_uv * 0.8, dist_y) * SIDEBAR_CALM_FACTOR_HOVER;
      }
    }

    current_tide_strength *= (1.0 - interaction_intensity);

    vec2 uv_warped_bg = applyCosmicTides(v_uv, u_time, current_tide_strength);
    vec2 current_uv = uv_warped_bg; // Use the (potentially calmed) warped UVs for subsequent effects

    // -- REMOVE Phase 2 temporary darkening --
    // bool is_in_sidebar_region = (...);
    // if (is_in_sidebar_region) {
    //   moteColor *= 0.8;
    // }

    // --- Calculate base echo glowAmount for later use (color and energy boost) ---
    float echoGlowAmount = 0.0;
    if (u_echo_intensity > 0.0) {
      float echoDist = distance(current_uv, u_echo_center); // Use current_uv
      if (echoDist < u_echo_radius) {
        echoGlowAmount = smoothstep(u_echo_radius, u_echo_radius * 0.1, echoDist);
      }
    }
    // --- End base echo glowAmount calculation ---

    float totalInfluence = 0.0;
    // vec3 moteColor = u_colorTarget1; // Old direct assignment
    // MODIFIED: Slightly tint motes with complementary color based on overall palette energy
    vec3 moteColor = mix(u_colorTarget1, u_colorTarget2, u_forgeEnergy * 0.15);

    for (int i = 0; i < NUM_METABALLS; i++) {
      float effectiveForgeEnergy = u_forgeEnergy;
      // Potentially boost forge energy slightly based on interaction_intensity if pixel is in sidebar item rect
      if (interaction_intensity > 0.0) { // This check is simplified; ideally, re-check if current_uv is within the specific item bounds
          effectiveForgeEnergy += interaction_intensity * 0.2; // Example subtle energy boost
      }

      vec2 corePosNoBoost = animateMetaballCore(i, u_time, u_forgeEnergy); // Base for echo interaction
      if (u_echo_intensity > 0.0) {
        float distToEchoFromCore = distance(corePosNoBoost, u_echo_center);
        if (distToEchoFromCore < u_echo_radius * 1.2) {
          float coreProximityToEchoFactor = smoothstep(u_echo_radius * 1.2, 0.0, distToEchoFromCore);
          effectiveForgeEnergy = max(effectiveForgeEnergy, u_forgeEnergy + coreProximityToEchoFactor * u_echo_intensity * 0.6);
        }
      }
      vec2 corePos = animateMetaballCore(i, u_time, effectiveForgeEnergy);
      float dynamicRadius = METABALL_BASE_RADIUS * (0.8 + effectiveForgeEnergy * 0.5);
      totalInfluence += sdfMetaball_influence(current_uv, corePos, dynamicRadius);
    }

    // The "moteColor *= 0.8" code from phase 2 was removed.
    // If we want to make the calm area subtly brighter via moteColor:
    if (interaction_intensity > 0.0) {
        // Could make moteColor slightly more prominent here if desired
        // This is an alternative/addition to boosting finalColor later
    }

    vec3 quintessenceBase = deriveEchoColor(u_colorTarget1);
    vec3 quintessenceColor = mix(quintessenceBase, u_colorTarget2, u_colorMixFactor * u_colorMixFactor * 0.5);
    float insideFactor = smoothstep_edge(
        METABALL_THRESHOLD - METABALL_EDGE_SOFTNESS,
        METABALL_THRESHOLD + METABALL_EDGE_SOFTNESS,
        totalInfluence
    );
    vec3 finalColor = mix(quintessenceColor, moteColor, insideFactor);

    // Optional: Subtle brightness boost in calm area directly to finalColor
    finalColor += interaction_intensity * 0.05; // e.g. very subtle direct brightness lift

    if (insideFactor > 0.01) {
      float coreProximityFactor = smoothstep(
          METABALL_THRESHOLD,
          METABALL_THRESHOLD + METABALL_EDGE_SOFTNESS * 3.0,
          totalInfluence
      );
      finalColor += moteColor * coreProximityFactor * 0.35;
    }

    const float FUSION_EFFECT_THRESHOLD_OFFSET = METABALL_EDGE_SOFTNESS * 4.0;
    const float FUSION_GLOW_RANGE = METABALL_EDGE_SOFTNESS * 2.5;
    const float FUSION_GLOW_BRIGHTNESS = 0.25;
    float fusionEffectStartThreshold = METABALL_THRESHOLD + FUSION_EFFECT_THRESHOLD_OFFSET;
    if (totalInfluence > fusionEffectStartThreshold) {
        float fusionFactor = smoothstep(
            fusionEffectStartThreshold,
            fusionEffectStartThreshold + FUSION_GLOW_RANGE,
            totalInfluence
        );
        finalColor += moteColor * fusionFactor * FUSION_GLOW_BRIGHTNESS;
    }

    // --- Apply Echo Color based on pre-calculated echoGlowAmount ---
    if (u_echo_intensity > 0.0 && echoGlowAmount > 0.0) {
      finalColor += u_echo_color * echoGlowAmount * u_echo_intensity * 0.8;
    }

    // --- APPLY HOVER EFFECT (Global Image Hover) ---
    // MODIFIED: Use both base and complementary hover colors
    if (u_isHovering > 0.5) {
        vec3 effectiveHoverColor = u_hoverColor; // Default to base hover color
        if (u_hasHoverComplementary > 0.5) {
            // Example: mix base and complementary, or use complementary for a specific effect
            // For now, let's brighten the base and add a hint of complementary
            effectiveHoverColor = u_hoverColor * 1.2 + u_hoverComplementaryColor * 0.3;
        }
        finalColor = mix(finalColor, effectiveHoverColor, u_isHovering * 0.6);
        // Alternative: Tint metaballs with base, quintessence with complementary
        // moteColor = mix(moteColor, u_hoverColor, u_isHovering * 0.5);
        // quintessenceColor = mix(quintessenceColor, u_hoverComplementaryColor, u_isHovering * 0.3);
        // finalColor = mix(quintessenceColor, moteColor, insideFactor); // Recalculate finalColor based on tinted components
    }

    gl_FragColor = vec4(toneMapReinhard(finalColor), 1.0);
  }
`;

// --- Component ---
// Wrapped with forwardRef to accept a ref from Layout.tsx
const AuraBackground = forwardRef<HTMLCanvasElement>((props, forwardedRef) => {
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null); // Keep internal ref for component's own logic

  // Expose the internal canvas ref to the parent component (Layout.tsx)
  useImperativeHandle(forwardedRef, () => internalCanvasRef.current!);

  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null); // Single buffer for a quad
  const attribLocationsRef = useRef<{ [key: string]: number }>({});
  const uniformLocationsRef = useRef<{ [key: string]: WebGLUniformLocation | null }>({});
  const animationFrameRef = useRef<number>();
  const {
    imagePalette,
    echoTrigger,
    hoverState, // This is for global image hover
    // ++ Consume sidebar interaction states from ColorContext ++
    sidebarHoverState,
    sidebarSelectedState,
  } = useContext(ColorContext);

  // Get animation pipeline instance
  const pipeline = useAnimationPipeline('auraBackground');

  // ++ USE PREVIOUS HOOK FOR IMAGE PALETTE ++
  const prevImagePalette = usePrevious(imagePalette);

  // Refs for animated uniform values - GSAP will now manage these
  const animatedColor1 = useRef(hexToVec3(imagePalette?.base || '#041024'));
  const animatedColor2 = useRef(
    hexToVec3(imagePalette?.complementary || imagePalette?.base || '#041024')
  );
  const animatedMixFactor = useRef(imagePalette ? 1.0 : 0.0);
  const animatedForgeEnergy = useRef(calculateForgeEnergy(imagePalette));
  // --- NEW: Ref for animated hover influence ---
  const animatedHoverInfluence = useRef(0.0);

  // Ref for hover complementary color vec3
  const animatedHoverComplementaryColorVec3 = useRef<[number, number, number]>([0, 0, 0]);

  // --- New Ref for Echo Animation State ---
  const activeEcho = useRef<{
    id: string | null;
    triggerParams: { center: [number, number]; colorVec3: [number, number, number] } | null;
    startTime: number;
    durationMs: number;
    canvasRectCache: DOMRect | null;
    echoCenterUvCache: [number, number] | null;
  }>({
    id: null,
    triggerParams: null,
    startTime: 0,
    durationMs: 1500,
    canvasRectCache: null,
    echoCenterUvCache: null,
  });
  // --- End New Ref ---

  // --- WebGL Helper Functions ---
  const createShader = useCallback(
    (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(
          `Shader compile error (${type === gl.VERTEX_SHADER ? 'Vertex' : 'Fragment'}):`,
          gl.getShaderInfoLog(shader)
        );
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    },
    []
  );

  const createProgram = useCallback(
    (
      gl: WebGLRenderingContext,
      vertexShader: WebGLShader,
      fragmentShader: WebGLShader
    ): WebGLProgram | null => {
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
      }
      return program;
    },
    []
  );

  // --- Animation Loop ---
  const renderLoop = useCallback(
    (time: number) => {
      const gl = glRef.current;
      const program = programRef.current;
      if (!gl || !program) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }
      const timeSeconds = time / 1000.0;
      const lerpSpeed = 0.08; // Kept for hover, potentially other non-GSAP animations

      // --- NEW: Animate Hover Influence (still manual lerp for responsiveness) ---
      const targetHoverInfluence = hoverState.isHovering ? 1.0 : 0.0;
      animatedHoverInfluence.current = lerp(
        animatedHoverInfluence.current,
        targetHoverInfluence,
        0.1
      );
      // --- END NEW: Animate Hover Influence ---

      // Update animatedHoverComplementaryColorVec3 based on hoverState
      if (hoverState.isHovering && hoverState.complementaryColor) {
        animatedHoverComplementaryColorVec3.current = hexToVec3(hoverState.complementaryColor);
      } else if (!hoverState.isHovering) {
        // Optionally fade out or reset when not hovering
        animatedHoverComplementaryColorVec3.current = lerpArray(
          animatedHoverComplementaryColorVec3.current,
          [0, 0, 0],
          0.1
        ) as [number, number, number];
      }

      // --- WebGL Rendering Setup ---
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
      const posLocation = attribLocationsRef.current.position;
      if (posLocation !== -1) {
        gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLocation);
      }

      // Set Base Uniforms
      gl.uniform2f(uniformLocationsRef.current.resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(uniformLocationsRef.current.time, timeSeconds);
      gl.uniform3fv(uniformLocationsRef.current.colorTarget1, animatedColor1.current);
      gl.uniform3fv(uniformLocationsRef.current.colorTarget2, animatedColor2.current);
      gl.uniform1f(uniformLocationsRef.current.colorMixFactor, animatedMixFactor.current);
      gl.uniform1f(uniformLocationsRef.current.forgeEnergy, animatedForgeEnergy.current);

      // --- New Echo Uniform Setting ---
      let currentEchoIntensity = 0.0;
      if (
        activeEcho.current.id &&
        activeEcho.current.triggerParams &&
        activeEcho.current.echoCenterUvCache
      ) {
        const elapsedTime = performance.now() - activeEcho.current.startTime;
        const progress = Math.min(1.0, elapsedTime / activeEcho.current.durationMs);

        if (progress < 1.0) {
          // Simple pulse: SIN wave peaks at 0.5 progress, intensity 0.4
          currentEchoIntensity = Math.sin(progress * Math.PI) * 0.4;
        } else {
          // Animation finished, could reset activeEcho.id here if needed
          // activeEcho.current.id = null; // Be careful if trigger happens again quickly
          currentEchoIntensity = 0.0;
        }

        gl.uniform2fv(uniformLocationsRef.current.echoCenter, activeEcho.current.echoCenterUvCache);
        gl.uniform3fv(
          uniformLocationsRef.current.echoColor,
          activeEcho.current.triggerParams.colorVec3
        );
        gl.uniform1f(uniformLocationsRef.current.echoIntensity, currentEchoIntensity);
        gl.uniform1f(uniformLocationsRef.current.echoRadius, 0.15); // Example radius, make uniform if needed
      } else {
        // Ensure intensity is 0 if no active echo
        gl.uniform1f(uniformLocationsRef.current.echoIntensity, 0.0);
        // Optionally set other echo uniforms to defaults if needed, but intensity=0 should suffice
        // gl.uniform2fv(uniformLocationsRef.current.echoCenter, [0.5, 0.5]); // Example default center
        // gl.uniform3fv(uniformLocationsRef.current.echoColor, [0, 0, 0]);
      }
      // --- End New Echo Uniform Setting ---

      // Set Hover Uniforms
      gl.uniform1f(uniformLocationsRef.current.u_isHovering, animatedHoverInfluence.current);
      const baseHoverColorVec3 = hoverState.color ? hexToVec3(hoverState.color) : [0.0, 0.0, 0.0];
      gl.uniform3fv(uniformLocationsRef.current.u_hoverColor, baseHoverColorVec3);

      // ++ SET NEW HOVER COMPLEMENTARY UNIFORMS ++
      gl.uniform3fv(
        uniformLocationsRef.current.u_hoverComplementaryColor,
        animatedHoverComplementaryColorVec3.current
      );
      gl.uniform1f(
        uniformLocationsRef.current.u_hasHoverComplementary,
        hoverState.complementaryColor ? 1.0 : 0.0
      );

      // ++ NEW: Calculate and set sidebar rect uniform ++
      const canvasWidth = gl.canvas.width;
      const canvasHeight = gl.canvas.height;
      if (canvasWidth > 0 && canvasHeight > 0) {
        const sidebarUvX = 0.0; // Assuming sidebar is on the left
        const sidebarUvY = 0.0; // Assuming UV origin is bottom-left
        const sidebarUvWidth = SIDEBAR_PIXEL_WIDTH / canvasWidth;
        const sidebarUvHeight = 1.0; // Full height
        gl.uniform4f(
          uniformLocationsRef.current.u_sidebar_rect_uv,
          sidebarUvX,
          sidebarUvY,
          sidebarUvWidth,
          sidebarUvHeight
        );
      }

      // ++ NEW: Set sidebar interaction uniforms ++
      gl.uniform1f(
        uniformLocationsRef.current.u_sidebar_hover_active,
        sidebarHoverState.isActive ? 1.0 : 0.0
      );
      if (sidebarHoverState.isActive && sidebarHoverState.uv) {
        gl.uniform2fv(uniformLocationsRef.current.u_sidebar_hover_uv, sidebarHoverState.uv);
        gl.uniform1f(
          uniformLocationsRef.current.u_sidebar_hover_height_uv,
          sidebarHoverState.itemHeightUV || 0.0
        );
      } else {
        gl.uniform2fv(uniformLocationsRef.current.u_sidebar_hover_uv, [0.0, 0.0]); // Default if not active
        gl.uniform1f(uniformLocationsRef.current.u_sidebar_hover_height_uv, 0.0);
      }

      gl.uniform1f(
        uniformLocationsRef.current.u_sidebar_selected_active,
        sidebarSelectedState.isActive ? 1.0 : 0.0
      );
      if (sidebarSelectedState.isActive && sidebarSelectedState.uv) {
        gl.uniform2fv(uniformLocationsRef.current.u_sidebar_selected_uv, sidebarSelectedState.uv);
        gl.uniform1f(
          uniformLocationsRef.current.u_sidebar_selected_height_uv,
          sidebarSelectedState.itemHeightUV || 0.0
        );
      } else {
        gl.uniform2fv(uniformLocationsRef.current.u_sidebar_selected_uv, [0.0, 0.0]); // Default if not active
        gl.uniform1f(uniformLocationsRef.current.u_sidebar_selected_height_uv, 0.0);
      }

      // Draw the quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    },
    // ++ Add sidebarHoverState and sidebarSelectedState to renderLoop dependencies ++
    [imagePalette, hoverState, sidebarHoverState, sidebarSelectedState, createShader, createProgram]
    // Note: createShader & createProgram are stable due to useCallback([]) in their definitions.
    // If renderLoop itself was not a dependency of the main useEffect, then those two wouldn't be needed here.
    // However, to be safe, as renderLoop IS a dependency of the main useEffect, we include all its non-primitive dependencies.
  );

  // --- New Effect to Detect Echo Trigger ---
  useEffect(() => {
    if (echoTrigger && echoTrigger.id !== activeEcho.current.id) {
      // Use internalCanvasRef here
      const canvasEl = internalCanvasRef.current;
      if (!canvasEl) return;
      const canvasRect = canvasEl.getBoundingClientRect();

      // Convert viewport center from trigger params to canvas UV coordinates
      const viewportCenter = echoTrigger.params.center;
      const canvasRelativeX = viewportCenter[0] - canvasRect.left;
      const canvasRelativeY = viewportCenter[1] - canvasRect.top;
      const uvX = canvasRelativeX / canvasRect.width;
      const uvY = 1.0 - canvasRelativeY / canvasRect.height; // Flip Y for GLSL uv space

      console.log(
        `[AuraBackground] New Echo Trigger: ${echoTrigger.id}, Viewport: [${viewportCenter[0].toFixed(1)}, ${viewportCenter[1].toFixed(1)}], UV: [${uvX.toFixed(3)}, ${uvY.toFixed(3)}]`
      );

      // Update the activeEcho ref to start the animation in the render loop
      activeEcho.current = {
        id: echoTrigger.id,
        triggerParams: echoTrigger.params,
        startTime: performance.now(),
        durationMs: 1500, // Echo duration
        canvasRectCache: canvasRect, // Store rect used for this conversion
        echoCenterUvCache: [uvX, uvY], // Store calculated UV
      };
    }
  }, [echoTrigger]); // Watch the echoTrigger from context
  // --- End New Effect ---

  // --- Initialization Effect (Updated Uniform Lookups) ---
  useEffect(() => {
    // Use internalCanvasRef here
    const canvasElement = internalCanvasRef.current;
    if (!canvasElement) return;

    const gl = canvasElement.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) {
      console.error('WebGL not supported or context creation failed.');
      return;
    }
    glRef.current = gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;
    programRef.current = program;

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    bufferRef.current = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Look up locations (Core)
    attribLocationsRef.current.position = gl.getAttribLocation(program, 'a_position');
    uniformLocationsRef.current.resolution = gl.getUniformLocation(program, 'u_resolution');
    uniformLocationsRef.current.time = gl.getUniformLocation(program, 'u_time');
    uniformLocationsRef.current.colorTarget1 = gl.getUniformLocation(program, 'u_colorTarget1');
    uniformLocationsRef.current.colorTarget2 = gl.getUniformLocation(program, 'u_colorTarget2');
    uniformLocationsRef.current.colorMixFactor = gl.getUniformLocation(program, 'u_colorMixFactor');
    uniformLocationsRef.current.forgeEnergy = gl.getUniformLocation(program, 'u_forgeEnergy');

    // Add new echo uniform lookups
    uniformLocationsRef.current.echoCenter = gl.getUniformLocation(program, 'u_echo_center');
    uniformLocationsRef.current.echoIntensity = gl.getUniformLocation(program, 'u_echo_intensity');
    uniformLocationsRef.current.echoColor = gl.getUniformLocation(program, 'u_echo_color');
    uniformLocationsRef.current.echoRadius = gl.getUniformLocation(program, 'u_echo_radius'); // Add if radius is uniform

    // --- REINSTATE: Get locations for hover uniforms (global image hover) ---
    uniformLocationsRef.current.u_isHovering = gl.getUniformLocation(program, 'u_isHovering');
    uniformLocationsRef.current.u_hoverColor = gl.getUniformLocation(program, 'u_hoverColor');

    // Get location for sidebar rect uniform (from Phase 2)
    uniformLocationsRef.current.u_sidebar_rect_uv = gl.getUniformLocation(
      program,
      'u_sidebar_rect_uv'
    );

    // ++ NEW: Get locations for sidebar interaction uniforms ++
    uniformLocationsRef.current.u_sidebar_hover_uv = gl.getUniformLocation(
      program,
      'u_sidebar_hover_uv'
    );
    uniformLocationsRef.current.u_sidebar_hover_active = gl.getUniformLocation(
      program,
      'u_sidebar_hover_active'
    );
    uniformLocationsRef.current.u_sidebar_hover_height_uv = gl.getUniformLocation(
      program,
      'u_sidebar_hover_height_uv'
    );
    uniformLocationsRef.current.u_sidebar_selected_uv = gl.getUniformLocation(
      program,
      'u_sidebar_selected_uv'
    );
    uniformLocationsRef.current.u_sidebar_selected_active = gl.getUniformLocation(
      program,
      'u_sidebar_selected_active'
    );
    uniformLocationsRef.current.u_sidebar_selected_height_uv = gl.getUniformLocation(
      program,
      'u_sidebar_selected_height_uv'
    );

    // ... Resize Handling ...
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (glRef.current) {
        glRef.current.canvas.width = width;
        glRef.current.canvas.height = height;
      }
    });
    resizeObserver.observe(canvasElement);

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();

      const currentGl = glRef.current;
      if (currentGl) {
        if (bufferRef.current) currentGl.deleteBuffer(bufferRef.current);
        if (programRef.current) currentGl.deleteProgram(programRef.current);
      }
      glRef.current = null;
      programRef.current = null;
      bufferRef.current = null;
    };
  }, [createShader, createProgram, renderLoop]);

  // ++ NEW Effect to animate palette changes with GSAP (now with Converge & Bloom) ++
  useEffect(() => {
    const currentForgeEnergyBeforeAnimation = animatedForgeEnergy.current;

    const targetColor1Vec = hexToVec3(imagePalette?.base || '#041024');
    const targetColor2Vec = hexToVec3(
      imagePalette?.complementary || imagePalette?.base || '#041024'
    );
    const targetMixVal = imagePalette ? 1.0 : 0.0;
    const targetForgeEnergyVal = calculateForgeEnergy(imagePalette);

    // Define fixed durations for now, can be made dynamic later if needed for smoothness
    const PALETTE_TRANSITION_DURATION = 1.2;
    const ENERGY_TRANSITION_DURATION = 1.2;

    pipeline.clear();

    // --- Directly transition to New Palette & Energy ---
    const startTime = '<';

    pipeline.addStep({
      target: animatedColor1.current,
      preset: 'none',
      vars: {
        0: targetColor1Vec[0],
        1: targetColor1Vec[1],
        2: targetColor1Vec[2],
        duration: PALETTE_TRANSITION_DURATION,
        ease: 'power2.inOut',
      },
      position: startTime,
    });

    pipeline.addStep({
      target: animatedColor2.current,
      preset: 'none',
      vars: {
        0: targetColor2Vec[0],
        1: targetColor2Vec[1],
        2: targetColor2Vec[2],
        duration: PALETTE_TRANSITION_DURATION,
        ease: 'power2.inOut',
      },
      position: '<', // With color1
    });

    pipeline.addStep({
      target: animatedMixFactor,
      preset: 'none',
      vars: {
        current: targetMixVal,
        duration: PALETTE_TRANSITION_DURATION * 0.8, // Slightly faster
        ease: 'sine.inOut',
      },
      position: '<+=0.1', // Stagger after colors start
    });

    pipeline.addStep({
      target: animatedForgeEnergy,
      preset: 'none',
      vars: {
        current: targetForgeEnergyVal,
        duration: ENERGY_TRANSITION_DURATION,
        ease: 'power2.inOut',
      },
      position: '<+=0.1', // Stagger after mix factor
    });

    pipeline
      .play()
      .catch(err => console.warn('[AuraBackground] Palette transition pipeline play error:', err));
  }, [imagePalette, pipeline, prevImagePalette]);

  return (
    <canvas
      // Assign the internal ref to the canvas element
      ref={internalCanvasRef}
      className={styles.particleBackground}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: -1, // Keep behind content
        // backgroundColor: '#041024', // Optional fallback bg
      }}
    />
  );
});

AuraBackground.displayName = 'AuraBackground'; // Good practice for forwardRef components

export default React.memo(AuraBackground);
