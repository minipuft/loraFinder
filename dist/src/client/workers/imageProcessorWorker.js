"use strict";
/// <reference lib="webworker" />
let gl = null;
async function initWebGL() {
    const canvas = new OffscreenCanvas(1, 1);
    gl = canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported on this browser.');
        return false;
    }
    return true;
}
async function processImageWithWebGL(img, width, height) {
    if (!gl)
        return new ImageData(width, height);
    const canvas = new OffscreenCanvas(width, height);
    gl = canvas.getContext('webgl');
    // Create a texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // Create shaders
    const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0, 1);
      v_texCoord = a_position * 0.5 + 0.5;
    }
  `;
    const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_image;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }
  `;
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    // Set up attributes and uniforms
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // Read pixels
    const pixels = new Uint8ClampedArray(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return new ImageData(pixels, width, height);
}
async function processImageWithCPU(img, width, height) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw new Error('Could not get 2D context');
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    // Apply a simple grayscale effect as an example
    for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        imageData.data[i] = imageData.data[i + 1] = imageData.data[i + 2] = avg;
    }
    return imageData;
}
self.onmessage = async (event) => {
    if (event.data.action === 'processImage') {
        const { id, src, width, height } = event.data;
        let processedImageData;
        if (!gl && !(await initWebGL())) {
            console.warn('WebGL not supported, falling back to CPU processing');
            const img = await fetch(src).then(res => res.blob()).then(blob => createImageBitmap(blob));
            processedImageData = await processImageWithCPU(img, width, height);
        }
        else {
            const img = await fetch(src).then(res => res.blob()).then(blob => createImageBitmap(blob));
            processedImageData = await processImageWithWebGL(img, width, height);
        }
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx?.putImageData(processedImageData, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
        const url = URL.createObjectURL(blob);
        self.postMessage({ action: 'imageProcessed', id, processedImage: url });
    }
};
//# sourceMappingURL=imageProcessorWorker.js.map