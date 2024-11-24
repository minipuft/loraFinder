import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import styles from "../../client/styles/ParticleBackground.module.scss";
import { throttle } from 'lodash-es';
import logger from "../../shared/utils/logger";
const ParticleBackground = () => {
    const canvasRef = useRef(null);
    const NUM_STARS = 5000;
    useEffect(() => {
        const initWebGL = () => {
            if (!canvasRef.current)
                return;
            const gl = canvasRef.current.getContext("webgl2");
            if (!gl) {
                logger.error("WebGL 2 not supported");
                return;
            }
            // Create shaders
            const vertexShaderSource = `
        attribute vec3 position;
        attribute vec4 color;
        varying vec4 vColor;
        uniform float time;
        void main() {
          float angle = time * 0.1 + float(gl_InstanceID);
          float shimmer = (sin(angle) * 0.5 + 0.5) * 0.3;
          gl_Position = vec4(position, 1.0);
          vColor = color * (1.0 + shimmer);
        }
      `;
            const fragmentShaderSource = `
        precision mediump float;
        varying vec4 vColor;
        void main() {
          float star = smoothstep(0.5, 0.0, length(vColor.rgb));
          gl_FragColor = vec4(vColor.rgb * star, star);
        }
      `;
            const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
            const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
            if (!vertexShader || !fragmentShader) {
                logger.error("Failed to create shaders");
                return;
            }
            // Create program
            const program = createProgram(gl, vertexShader, fragmentShader);
            if (!program) {
                logger.error("Failed to create shader program");
                return;
            }
            // Set up attributes and uniforms
            const positionAttribute = gl.getAttribLocation(program, "position");
            const colorAttribute = gl.getAttribLocation(program, "color");
            const timeUniform = gl.getUniformLocation(program, "time");
            if (positionAttribute === -1 || colorAttribute === -1 || timeUniform === null) {
                logger.error("Failed to get attribute or uniform locations");
                return;
            }
            // Create buffers
            const starBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
            const starData = new Float32Array(NUM_STARS * 7);
            for (let i = 0; i < NUM_STARS; i++) {
                const baseIndex = i * 7;
                starData[baseIndex] = Math.random() * 2 - 1; // x
                starData[baseIndex + 1] = Math.random() * 2 - 1; // y
                starData[baseIndex + 2] = Math.random(); // z
                starData[baseIndex + 3] = Math.random(); // r
                starData[baseIndex + 4] = Math.random(); // g
                starData[baseIndex + 5] = Math.random(); // b
                starData[baseIndex + 6] = Math.random() * 0.5 + 0.5; // a
            }
            gl.bufferData(gl.ARRAY_BUFFER, starData, gl.STATIC_DRAW);
            const handleMouseMove = throttle((event) => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect)
                    return;
                const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
                const starData = new Float32Array(NUM_STARS * 7);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, starData);
                for (let i = 0; i < NUM_STARS; i++) {
                    const baseIndex = i * 7;
                    starData[baseIndex] += (x - starData[baseIndex]) * 0.01;
                    starData[baseIndex + 1] += (y - starData[baseIndex + 1]) * 0.01;
                }
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, starData);
            }, 16);
            window.addEventListener("mousemove", handleMouseMove);
            const startTime = performance.now();
            const animate = () => {
                const now = performance.now();
                const time = (now - startTime) / 1000; // Convert to seconds
                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.useProgram(program);
                gl.uniform1f(timeUniform, time);
                gl.bindBuffer(gl.ARRAY_BUFFER, starBuffer);
                gl.enableVertexAttribArray(positionAttribute);
                gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 28, 0);
                gl.enableVertexAttribArray(colorAttribute);
                gl.vertexAttribPointer(colorAttribute, 4, gl.FLOAT, false, 28, 12);
                gl.drawArrays(gl.POINTS, 0, NUM_STARS);
                requestAnimationFrame(animate);
            };
            animate();
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                handleMouseMove.cancel();
            };
        };
        initWebGL();
    }, []);
    return _jsx("canvas", { ref: canvasRef, className: styles.particleBackground });
};
const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    if (!shader) {
        logger.error("Unable to create shader");
        return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        logger.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
};
const createProgram = (gl, vertexShader, fragmentShader) => {
    if (!vertexShader || !fragmentShader) {
        logger.error("Invalid shaders");
        return null;
    }
    const program = gl.createProgram();
    if (!program) {
        logger.error("Unable to create program");
        return null;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        logger.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
        return null;
    }
    return program;
};
export default ParticleBackground;
//# sourceMappingURL=ParticleBackground.js.map