class AdvancedImageProcessingService {
  private static instance: AdvancedImageProcessingService;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private webglCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  static getInstance(): AdvancedImageProcessingService {
    if (!AdvancedImageProcessingService.instance) {
      AdvancedImageProcessingService.instance = new AdvancedImageProcessingService();
    }
    return AdvancedImageProcessingService.instance;
  }

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.webglCanvas = document.createElement('canvas');
    this.initializeWebGL();
  }

  private initializeWebGL(): void {
    try {
      this.gl = this.webglCanvas.getContext('webgl') || this.webglCanvas.getContext('experimental-webgl');
      if (this.gl) {
        console.log('WebGL initialized for advanced image processing');
      }
    } catch (error) {
      console.warn('WebGL not available, falling back to Canvas 2D');
    }
  }

  async enhanceImage(
    imageUrl: string,
    enhancements: ImageEnhancements
  ): Promise<string> {
    try {
      const image = await this.loadImage(imageUrl);
      
      if (this.gl && enhancements.useWebGL) {
        return await this.enhanceWithWebGL(image, enhancements);
      } else {
        return await this.enhanceWithCanvas2D(image, enhancements);
      }
    } catch (error) {
      console.error('Image enhancement failed:', error);
      return imageUrl; // Return original on failure
    }
  }

  private async loadImage(url: string): Promise<HTMLImageElement> {
    // Check cache first
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  private async enhanceWithWebGL(
    image: HTMLImageElement,
    enhancements: ImageEnhancements
  ): Promise<string> {
    if (!this.gl) throw new Error('WebGL not available');

    const gl = this.gl;
    
    // Setup WebGL viewport
    this.webglCanvas.width = image.width;
    this.webglCanvas.height = image.height;
    gl.viewport(0, 0, image.width, image.height);

    // Create and compile shaders
    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.getVertexShaderSource());
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.getFragmentShaderSource(enhancements));
    
    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    // Create shader program
    const program = this.createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
      throw new Error('Failed to create shader program');
    }

    // Setup geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1,
    ]), gl.STATIC_DRAW);

    // Create texture from image
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Use shader program
    gl.useProgram(program);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    this.setEnhancementUniforms(gl, program, enhancements);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Convert to data URL
    return this.webglCanvas.toDataURL('image/jpeg', 0.95);
  }

  private async enhanceWithCanvas2D(
    image: HTMLImageElement,
    enhancements: ImageEnhancements
  ): Promise<string> {
    this.canvas.width = image.width;
    this.canvas.height = image.height;

    // Draw original image
    this.ctx.drawImage(image, 0, 0);

    // Apply enhancements
    if (enhancements.brightness !== 1) {
      this.adjustBrightness(enhancements.brightness);
    }

    if (enhancements.contrast !== 1) {
      this.adjustContrast(enhancements.contrast);
    }

    if (enhancements.saturation !== 1) {
      this.adjustSaturation(enhancements.saturation);
    }

    if (enhancements.sharpness > 0) {
      this.applySharpen(enhancements.sharpness);
    }

    if (enhancements.denoise > 0) {
      this.applyDenoise(enhancements.denoise);
    }

    if (enhancements.colorCorrection) {
      this.applyColorCorrection(enhancements.colorCorrection);
    }

    return this.canvas.toDataURL('image/jpeg', 0.95);
  }

  private adjustBrightness(factor: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] * factor));     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor)); // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private adjustContrast(factor: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // R
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // G
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // B
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private adjustSaturation(factor: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate grayscale value
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply saturation
      data[i] = Math.min(255, Math.max(0, gray + factor * (r - gray)));
      data[i + 1] = Math.min(255, Math.max(0, gray + factor * (g - gray)));
      data[i + 2] = Math.min(255, Math.max(0, gray + factor * (b - gray)));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applySharpen(intensity: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Sharpening kernel
    const kernel = [
      0, -intensity, 0,
      -intensity, 1 + 4 * intensity, -intensity,
      0, -intensity, 0
    ];

    const output = new Uint8ClampedArray(data.length);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          output[idx] = Math.min(255, Math.max(0, sum));
        }
        // Copy alpha channel
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    const newImageData = new ImageData(output, width, height);
    this.ctx.putImageData(newImageData, 0, 0);
  }

  private applyDenoise(intensity: number): void {
    // Simple bilateral filter for denoising
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const output = new Uint8ClampedArray(data.length);

    const radius = Math.floor(intensity * 3);
    const sigmaColor = intensity * 50;
    const sigmaSpace = intensity * 50;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let weightSum = 0;
          let valueSum = 0;
          const centerIdx = (y * width + x) * 4 + c;
          const centerValue = data[centerIdx];

          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const ny = Math.min(height - 1, Math.max(0, y + dy));
              const nx = Math.min(width - 1, Math.max(0, x + dx));
              const idx = (ny * width + nx) * 4 + c;
              const value = data[idx];

              const spatialWeight = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaSpace * sigmaSpace));
              const colorWeight = Math.exp(-Math.pow(value - centerValue, 2) / (2 * sigmaColor * sigmaColor));
              const weight = spatialWeight * colorWeight;

              weightSum += weight;
              valueSum += weight * value;
            }
          }

          output[centerIdx] = valueSum / weightSum;
        }
        // Copy alpha channel
        output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
      }
    }

    const newImageData = new ImageData(output, width, height);
    this.ctx.putImageData(newImageData, 0, 0);
  }

  private applyColorCorrection(correction: ColorCorrection): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Apply color matrix transformation
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, Math.max(0, r * correction.redGain + correction.redOffset));
      data[i + 1] = Math.min(255, Math.max(0, g * correction.greenGain + correction.greenOffset));
      data[i + 2] = Math.min(255, Math.max(0, b * correction.blueGain + correction.blueOffset));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  // WebGL shader methods
  private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  private getVertexShaderSource(): string {
    return `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
  }

  private getFragmentShaderSource(enhancements: ImageEnhancements): string {
    return `
      precision mediump float;
      uniform sampler2D u_texture;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      uniform float u_sharpness;
      varying vec2 v_texCoord;
      
      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
        
        // Apply brightness
        color.rgb *= u_brightness;
        
        // Apply contrast
        color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
        
        // Apply saturation
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(gray), color.rgb, u_saturation);
        
        // Clamp values
        color.rgb = clamp(color.rgb, 0.0, 1.0);
        
        gl_FragColor = color;
      }
    `;
  }

  private setEnhancementUniforms(gl: WebGLRenderingContext, program: WebGLProgram, enhancements: ImageEnhancements): void {
    const textureLocation = gl.getUniformLocation(program, 'u_texture');
    const brightnessLocation = gl.getUniformLocation(program, 'u_brightness');
    const contrastLocation = gl.getUniformLocation(program, 'u_contrast');
    const saturationLocation = gl.getUniformLocation(program, 'u_saturation');
    const sharpnessLocation = gl.getUniformLocation(program, 'u_sharpness');

    gl.uniform1i(textureLocation, 0);
    gl.uniform1f(brightnessLocation, enhancements.brightness);
    gl.uniform1f(contrastLocation, enhancements.contrast);
    gl.uniform1f(saturationLocation, enhancements.saturation);
    gl.uniform1f(sharpnessLocation, enhancements.sharpness);
  }

  // Advanced processing methods
  async upscaleImage(imageUrl: string, factor: number): Promise<string> {
    const image = await this.loadImage(imageUrl);
    
    this.canvas.width = image.width * factor;
    this.canvas.height = image.height * factor;
    
    // Use bicubic interpolation for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);
    
    return this.canvas.toDataURL('image/jpeg', 0.95);
  }

  async removeBackground(imageUrl: string): Promise<string> {
    const image = await this.loadImage(imageUrl);
    
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);
    
    // Simple background removal (would use AI in production)
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Remove pixels similar to corner colors (simple approach)
    const cornerColor = [data[0], data[1], data[2]];
    const threshold = 50;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const distance = Math.sqrt(
        Math.pow(r - cornerColor[0], 2) +
        Math.pow(g - cornerColor[1], 2) +
        Math.pow(b - cornerColor[2], 2)
      );
      
      if (distance < threshold) {
        data[i + 3] = 0; // Make transparent
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0);
    return this.canvas.toDataURL('image/png');
  }

  async extractColors(imageUrl: string, numColors: number = 5): Promise<ColorPalette> {
    const image = await this.loadImage(imageUrl);
    
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);
    
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Color quantization using k-means clustering
    const colors = this.extractDominantColors(data, numColors);
    
    return {
      dominant: colors[0],
      palette: colors,
      complementary: this.generateComplementaryColors(colors[0]),
      analogous: this.generateAnalogousColors(colors[0])
    };
  }

  private extractDominantColors(data: Uint8ClampedArray, numColors: number): RGB[] {
    const colorCounts = new Map<string, { count: number; rgb: RGB }>();
    
    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      if (a > 128) { // Only consider non-transparent pixels
        // Quantize colors to reduce variations
        const qr = Math.floor(r / 32) * 32;
        const qg = Math.floor(g / 32) * 32;
        const qb = Math.floor(b / 32) * 32;
        
        const key = `${qr},${qg},${qb}`;
        const existing = colorCounts.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          colorCounts.set(key, { count: 1, rgb: [qr, qg, qb] });
        }
      }
    }
    
    // Sort by frequency and return top colors
    return Array.from(colorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, numColors)
      .map(item => item.rgb);
  }

  private generateComplementaryColors(color: RGB): RGB[] {
    const [r, g, b] = color;
    return [
      [255 - r, 255 - g, 255 - b]
    ];
  }

  private generateAnalogousColors(color: RGB): RGB[] {
    // Generate analogous colors by shifting hue
    const hsl = this.rgbToHsl(color);
    const analogous: RGB[] = [];
    
    for (let i = 1; i <= 2; i++) {
      const hue1 = (hsl[0] + i * 30) % 360;
      const hue2 = (hsl[0] - i * 30 + 360) % 360;
      
      analogous.push(this.hslToRgb([hue1, hsl[1], hsl[2]]));
      analogous.push(this.hslToRgb([hue2, hsl[1], hsl[2]]));
    }
    
    return analogous;
  }

  private rgbToHsl(rgb: RGB): HSL {
    const [r, g, b] = rgb.map(x => x / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6;
      else if (max === g) h = (b - r) / diff + 2;
      else h = (r - g) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    
    const l = (max + min) / 2;
    const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));
    
    return [h, Math.round(s * 100), Math.round(l * 100)];
  }

  private hslToRgb(hsl: HSL): RGB {
    const [h, s, l] = [hsl[0], hsl[1] / 100, hsl[2] / 100];
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  // Cleanup
  dispose(): void {
    this.imageCache.clear();
  }
}

// Interfaces
interface ImageEnhancements {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  denoise: number;
  useWebGL: boolean;
  colorCorrection?: ColorCorrection;
}

interface ColorCorrection {
  redGain: number;
  redOffset: number;
  greenGain: number;
  greenOffset: number;
  blueGain: number;
  blueOffset: number;
}

type RGB = [number, number, number];
type HSL = [number, number, number];

interface ColorPalette {
  dominant: RGB;
  palette: RGB[];
  complementary: RGB[];
  analogous: RGB[];
}

export default AdvancedImageProcessingService;