// Image Processing Web Worker
self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'resize-image':
        resizeImage(data, id);
        break;
      case 'apply-filters':
        applyFilters(data, id);
        break;
      case 'optimize-image':
        optimizeImage(data, id);
        break;
      case 'extract-colors':
        extractColors(data, id);
        break;
      case 'enhance-lighting':
        enhanceLighting(data, id);
        break;
      default:
        throw new Error(`Unknown processing type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      id
    });
  }
};

function resizeImage(data, id) {
  const { imageData, targetWidth, targetHeight } = data;
  
  // Create canvas for processing
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  
  // Create image bitmap from data
  createImageBitmap(imageData).then(bitmap => {
    // Draw resized image
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    
    // Get processed image data
    const processedData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'resize-image',
      data: processedData,
      id
    });
  }).catch(error => {
    self.postMessage({
      type: 'error',
      error: error.message,
      id
    });
  });
}

function applyFilters(data, id) {
  const { imageData, filters } = data;
  const { width, height } = imageData;
  const processedData = new ImageData(width, height);
  
  // Apply filters to image data
  for (let i = 0; i < imageData.data.length; i += 4) {
    let r = imageData.data[i];
    let g = imageData.data[i + 1];
    let b = imageData.data[i + 2];
    let a = imageData.data[i + 3];
    
    // Apply each filter
    filters.forEach(filter => {
      switch (filter.type) {
        case 'brightness':
          const brightness = filter.value;
          r = Math.min(255, Math.max(0, r + brightness));
          g = Math.min(255, Math.max(0, g + brightness));
          b = Math.min(255, Math.max(0, b + brightness));
          break;
          
        case 'contrast':
          const contrast = filter.value;
          r = Math.min(255, Math.max(0, (r - 128) * contrast + 128));
          g = Math.min(255, Math.max(0, (g - 128) * contrast + 128));
          b = Math.min(255, Math.max(0, (b - 128) * contrast + 128));
          break;
          
        case 'saturation':
          const saturation = filter.value;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = Math.min(255, Math.max(0, gray + saturation * (r - gray)));
          g = Math.min(255, Math.max(0, gray + saturation * (g - gray)));
          b = Math.min(255, Math.max(0, gray + saturation * (b - gray)));
          break;
          
        case 'hue':
          // Simplified hue adjustment
          const hueShift = filter.value;
          [r, g, b] = adjustHue(r, g, b, hueShift);
          break;
      }
    });
    
    processedData.data[i] = r;
    processedData.data[i + 1] = g;
    processedData.data[i + 2] = b;
    processedData.data[i + 3] = a;
  }
  
  self.postMessage({
    type: 'processing:complete',
    subtype: 'apply-filters',
    data: processedData,
    id
  });
}

function optimizeImage(data, id) {
  const { imageData, quality = 0.8, format = 'jpeg' } = data;
  
  // Create canvas for optimization
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  
  // Put image data on canvas
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to blob with specified quality
  canvas.convertToBlob({
    type: `image/${format}`,
    quality: quality
  }).then(blob => {
    self.postMessage({
      type: 'processing:complete',
      subtype: 'optimize-image',
      data: blob,
      id
    });
  }).catch(error => {
    self.postMessage({
      type: 'error',
      error: error.message,
      id
    });
  });
}

function extractColors(data, id) {
  const { imageData, numColors = 5 } = data;
  const colors = [];
  const colorCounts = new Map();
  
  // Sample colors from image
  for (let i = 0; i < imageData.data.length; i += 16) { // Sample every 4th pixel
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    
    // Quantize colors to reduce variations
    const quantizedR = Math.floor(r / 32) * 32;
    const quantizedG = Math.floor(g / 32) * 32;
    const quantizedB = Math.floor(b / 32) * 32;
    
    const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
    colorCounts.set(colorKey, (colorCounts.get(colorKey) || 0) + 1);
  }
  
  // Get most common colors
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, numColors)
    .map(([color, count]) => {
      const [r, g, b] = color.split(',').map(Number);
      return {
        rgb: [r, g, b],
        hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
        count
      };
    });
  
  self.postMessage({
    type: 'processing:complete',
    subtype: 'extract-colors',
    data: sortedColors,
    id
  });
}

function enhanceLighting(data, id) {
  const { imageData, lightingSettings } = data;
  const { brightness, contrast, warmth } = lightingSettings;
  
  const processedData = new ImageData(imageData.width, imageData.height);
  
  for (let i = 0; i < imageData.data.length; i += 4) {
    let r = imageData.data[i];
    let g = imageData.data[i + 1];
    let b = imageData.data[i + 2];
    let a = imageData.data[i + 3];
    
    // Apply brightness
    if (brightness !== 100) {
      const brightnessFactor = brightness / 100;
      r = Math.min(255, Math.max(0, r * brightnessFactor));
      g = Math.min(255, Math.max(0, g * brightnessFactor));
      b = Math.min(255, Math.max(0, b * brightnessFactor));
    }
    
    // Apply contrast
    if (contrast !== 100) {
      const contrastFactor = contrast / 100;
      r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
      g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
      b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));
    }
    
    // Apply warmth
    if (warmth !== 50) {
      const warmthFactor = (warmth - 50) / 50;
      if (warmthFactor > 0) {
        // Add warmth (more red/yellow)
        r = Math.min(255, r + warmthFactor * 20);
        g = Math.min(255, g + warmthFactor * 10);
        b = Math.max(0, b - warmthFactor * 15);
      } else {
        // Add coolness (more blue)
        r = Math.max(0, r + warmthFactor * 15);
        g = Math.max(0, g + warmthFactor * 10);
        b = Math.min(255, b - warmthFactor * 20);
      }
    }
    
    processedData.data[i] = r;
    processedData.data[i + 1] = g;
    processedData.data[i + 2] = b;
    processedData.data[i + 3] = a;
  }
  
  self.postMessage({
    type: 'processing:complete',
    subtype: 'enhance-lighting',
    data: processedData,
    id
  });
}

// Helper functions
function adjustHue(r, g, b, hueShift) {
  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  if (diff !== 0) {
    if (max === r) {
      h = ((g - b) / diff) % 6;
    } else if (max === g) {
      h = (b - r) / diff + 2;
    } else {
      h = (r - g) / diff + 4;
    }
  }
  
  h = (h * 60 + hueShift) % 360;
  if (h < 0) h += 360;
  
  const l = (max + min) / 2;
  const s = diff === 0 ? 0 : diff / (1 - Math.abs(2 * l - 1));
  
  // Convert back to RGB
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  
  let rNew, gNew, bNew;
  
  if (h < 60) {
    [rNew, gNew, bNew] = [c, x, 0];
  } else if (h < 120) {
    [rNew, gNew, bNew] = [x, c, 0];
  } else if (h < 180) {
    [rNew, gNew, bNew] = [0, c, x];
  } else if (h < 240) {
    [rNew, gNew, bNew] = [0, x, c];
  } else if (h < 300) {
    [rNew, gNew, bNew] = [x, 0, c];
  } else {
    [rNew, gNew, bNew] = [c, 0, x];
  }
  
  return [
    Math.round((rNew + m) * 255),
    Math.round((gNew + m) * 255),
    Math.round((bNew + m) * 255)
  ];
}