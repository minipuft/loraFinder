import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { ColorContext } from '../contexts/ColorContext'; // Import ColorContext
import styles from '../styles/ParticleBackground.module.scss'; // Reuse or create new styles

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
  varying vec2 v_uv; // UV coordinates from vertex shader

  uniform vec2 u_resolution;    // Canvas resolution
  uniform float u_time;        // Time for animations
  uniform vec3 u_colorTarget1;  // Base color 1
  uniform vec3 u_colorTarget2;  // Base color 2
  uniform float u_colorMixFactor; // Mix factor for base colors

  // Hover state uniforms
  uniform bool u_isHovering;
  uniform vec2 u_hoverPos;      // Normalized hover position (0-1)
  uniform vec3 u_hoverColor;    // Optional: Color associated with hover

  // --- Noise Functions ---
  // Simple pseudo-random number generator
  float random (vec2 st) {
      // Adjusted seed based on example, can be tweaked
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  // Basic Value Noise function
  float noise (vec2 st) {
      vec2 i = floor(st); // Integer part
      vec2 f = fract(st); // Fractional part

      // Get random values for the 4 corners surrounding the point
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));

      // Smoothly interpolate between the corner values (smoothstep)
      vec2 u = f * f * (3.0 - 2.0 * f);
      // Interpolate horizontally, then vertically
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // Fractional Brownian Motion (fBm) - layering noise
  #define OCTAVES 4 // Number of noise layers (adjust for detail/performance)
  float fbm (vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 0.0;
      // Loop through octaves, adding noise at different frequencies/amplitudes
      for (int i = 0; i < OCTAVES; i++) {
          value += amplitude * noise(st);
          st *= 2.0; // Double frequency for next octave
          amplitude *= 0.5; // Halve amplitude for next octave
      }
      return value;
  }
  // --- End Noise Functions ---

  // Function to calculate distance from hover point (same as before)
  float getHoverDist(vec2 pos) {
    float aspectRatio = u_resolution.x / u_resolution.y;
    vec2 diff = pos - u_hoverPos;
    diff.x *= aspectRatio;
    return distance(vec2(0.0), diff);
  }

  void main() {
    // --- Calculate Base Aura Color using Noise ---
    // Scale UV and add time for animation. Adjust scale (e.g., * 3.0) for noise detail.
    vec2 noisyCoord = v_uv * 2.5 + vec2(u_time * 0.02, u_time * 0.03); // Slow movement
    float noisePattern = fbm(noisyCoord);

    // Base color blend - mix between target colors
    vec3 baseColor = mix(u_colorTarget1, u_colorTarget2, u_colorMixFactor);

    // Modulate the base color blend using the noise pattern
    // Mix based on noise value AND vertical position for variety
    vec3 auraColor = mix(baseColor, mix(u_colorTarget1, u_colorTarget2, v_uv.y * 0.8 + 0.1), noisePattern * 0.6);
    // Add subtle contrast/brightness variation based on noise
    auraColor *= (0.9 + noisePattern * 0.2);

    // --- Hover Effect (Applied on top of aura) ---
    vec3 finalColor = auraColor;
    if (u_isHovering) {
      float dist = getHoverDist(v_uv);
      // Ripple/glow effect - use smoothstep for soft edges
      float hoverIntensity = smoothstep(0.20, 0.0, dist); // Increased radius slightly

      // Make the glow slightly colored (e.g., whitish or based on u_hoverColor if available)
      vec3 glowColor = vec3(0.8, 0.8, 0.9); // Whitish glow
      // Optionally use u_hoverColor: mix(glowColor, u_hoverColor, 0.5)

      // Additive blend for glow, stronger near center
      finalColor += glowColor * hoverIntensity * 0.6; // Adjust intensity multiplier

      // Optional: Slight displacement/warp effect (more complex)
      // vec2 displacement = normalize(v_uv - u_hoverPos) * hoverIntensity * 0.01;
      // Recalculate noise/color at v_uv - displacement ? (performance cost)
    }

    // Ensure color values stay within valid range
    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }
`;

// --- Component ---
const AuraBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null); // Single buffer for a quad
  const attribLocationsRef = useRef<{ [key: string]: number }>({});
  const uniformLocationsRef = useRef<{ [key: string]: WebGLUniformLocation | null }>({});
  const animationFrameRef = useRef<number>();
  const { dominantColors, hoverState } = useContext(ColorContext);

  // Refs for animated uniform values (colors and hover state)
  const animatedColor1 = useRef(hexToVec3(dominantColors[0] || '#041024'));
  const animatedColor2 = useRef(hexToVec3(dominantColors[1] || dominantColors[0] || '#041024'));
  const animatedMixFactor = useRef(dominantColors.length > 1 ? 1.0 : 0.0);
  const animatedHoverPos = useRef<[number, number] | null>(
    hoverState.position ? [hoverState.position.x, hoverState.position.y] : null
  );
  const animatedIsHovering = useRef(hoverState.isHovering ? 1.0 : 0.0); // Use float for smooth transition

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

      // --- Smooth Animation Logic (Lerping) ---
      const lerpSpeed = 0.08; // Adjust for desired transition speed

      // Animate Colors
      const targetColor1 = hexToVec3(dominantColors[0] || '#041024');
      const targetColor2 = hexToVec3(dominantColors[1] || dominantColors[0] || '#041024');
      const targetMix = dominantColors.length > 1 ? 1.0 : 0.0;
      animatedColor1.current = lerpArray(animatedColor1.current, targetColor1, lerpSpeed) as [
        number,
        number,
        number,
      ];
      animatedColor2.current = lerpArray(animatedColor2.current, targetColor2, lerpSpeed) as [
        number,
        number,
        number,
      ];
      animatedMixFactor.current = lerp(animatedMixFactor.current, targetMix, lerpSpeed);

      // Animate Hover State
      const targetIsHovering = hoverState.isHovering ? 1.0 : 0.0;
      animatedIsHovering.current = lerp(
        animatedIsHovering.current,
        targetIsHovering,
        lerpSpeed * 2
      ); // Faster hover transition

      if (hoverState.isHovering && hoverState.position) {
        const targetPos: [number, number] = [hoverState.position.x, hoverState.position.y];
        if (!animatedHoverPos.current) {
          animatedHoverPos.current = targetPos; // Snap if starting from null
        } else {
          animatedHoverPos.current = lerpArray(
            animatedHoverPos.current,
            targetPos,
            lerpSpeed * 2
          ) as [number, number];
        }
      } else {
        // Optionally, let the hover position fade out or just keep the last known position
        // For now, we'll just use the latest position when hovering is true
      }

      // --- WebGL Rendering ---
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      // No need to clear if drawing a full-screen quad that covers everything
      // gl.clearColor(0, 0, 0, 0);
      // gl.clear(gl.COLOR_BUFFER_BIT);

      // Log context state and calculated animation values
      // console.log('[AuraBackground Loop] Context HoverState:', hoverState);
      // console.log('[AuraBackground Loop] Animated Hover:', { isHovering: animatedIsHovering.current, pos: animatedHoverPos.current });

      gl.useProgram(program);

      // Bind the quad buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
      const posLocation = attribLocationsRef.current.position;
      if (posLocation !== -1) {
        gl.vertexAttribPointer(posLocation, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLocation);
      }

      // Set Uniforms
      gl.uniform2f(uniformLocationsRef.current.resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(uniformLocationsRef.current.time, timeSeconds);
      gl.uniform3fv(uniformLocationsRef.current.colorTarget1, animatedColor1.current);
      gl.uniform3fv(uniformLocationsRef.current.colorTarget2, animatedColor2.current);
      gl.uniform1f(uniformLocationsRef.current.colorMixFactor, animatedMixFactor.current);

      // Hover Uniforms
      gl.uniform1f(
        uniformLocationsRef.current.isHovering,
        animatedIsHovering.current > 0.01 ? 1.0 : 0.0
      ); // Use threshold for bool
      if (animatedHoverPos.current) {
        gl.uniform2fv(uniformLocationsRef.current.hoverPos, animatedHoverPos.current);
      }
      // gl.uniform3fv(uniformLocationsRef.current.hoverColor, hoverState.color ? hexToVec3(hoverState.color) : [0,0,0]); // TODO: Add hover color logic

      // Draw the quad (2 triangles)
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    },
    [dominantColors, hoverState]
  ); // Dependencies for lerp targets

  // --- Initialization Effect ---
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const gl = canvasElement.getContext('webgl', { alpha: false, antialias: true }); // alpha: false maybe faster? antialias: true for smoother gradients
    if (!gl) {
      console.error('WebGL not supported or context creation failed.');
      return;
    }
    glRef.current = gl;

    // Compile shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    // Link program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;
    programRef.current = program;

    // Detach and delete shaders after linking
    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // --- Create Buffer for Fullscreen Quad ---
    // Vertices for two triangles covering the screen (-1 to 1)
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    bufferRef.current = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // --- Look up locations ---
    attribLocationsRef.current.position = gl.getAttribLocation(program, 'a_position');
    uniformLocationsRef.current.resolution = gl.getUniformLocation(program, 'u_resolution');
    uniformLocationsRef.current.time = gl.getUniformLocation(program, 'u_time');
    uniformLocationsRef.current.colorTarget1 = gl.getUniformLocation(program, 'u_colorTarget1');
    uniformLocationsRef.current.colorTarget2 = gl.getUniformLocation(program, 'u_colorTarget2');
    uniformLocationsRef.current.colorMixFactor = gl.getUniformLocation(program, 'u_colorMixFactor');
    uniformLocationsRef.current.isHovering = gl.getUniformLocation(program, 'u_isHovering');
    uniformLocationsRef.current.hoverPos = gl.getUniformLocation(program, 'u_hoverPos');
    uniformLocationsRef.current.hoverColor = gl.getUniformLocation(program, 'u_hoverColor');

    // --- Resize Handling ---
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (glRef.current) {
        glRef.current.canvas.width = width;
        glRef.current.canvas.height = height;
      }
    });
    resizeObserver.observe(canvasElement);

    // Start render loop
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    // --- Cleanup ---
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
    // Add renderLoop to dependencies if its definition relies on changing props/state from outside
  }, [createShader, createProgram, renderLoop]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.particleBackground} // Reuse style or create AuraBackground.module.scss
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
};

export default React.memo(AuraBackground);
