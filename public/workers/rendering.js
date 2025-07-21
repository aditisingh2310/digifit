// Rendering Web Worker
self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'render-scene':
        renderScene(data, id);
        break;
      case 'apply-lighting':
        applyLighting(data, id);
        break;
      case 'generate-shadows':
        generateShadows(data, id);
        break;
      case 'composite-layers':
        compositeLayers(data, id);
        break;
      case 'apply-effects':
        applyEffects(data, id);
        break;
      default:
        throw new Error(`Unknown rendering type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      id
    });
  }
};

function renderScene(data, id) {
  const { userImage, clothingItems, pose, lightingSettings } = data;
  
  // Simulate scene rendering
  setTimeout(() => {
    const renderResult = {
      compositeImage: generateMockComposite(),
      renderTime: 150 + Math.random() * 100,
      quality: 'high',
      layers: clothingItems.length + 1 // user + clothing items
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'render-scene',
      data: renderResult,
      id
    });
  }, 200 + Math.random() * 300);
}

function applyLighting(data, id) {
  const { scene, lightingSettings } = data;
  const { brightness, contrast, warmth, scenario } = lightingSettings;
  
  // Simulate lighting application
  setTimeout(() => {
    const lightingResult = {
      adjustedScene: scene,
      lightingMap: generateLightingMap(scenario),
      shadowMap: generateShadowMap(),
      ambientOcclusion: generateAmbientOcclusion(),
      processingTime: 80 + Math.random() * 50
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'apply-lighting',
      data: lightingResult,
      id
    });
  }, 100 + Math.random() * 150);
}

function generateShadows(data, id) {
  const { objects, lightDirection, lightIntensity } = data;
  
  // Simulate shadow generation
  setTimeout(() => {
    const shadowResult = {
      shadowMask: generateShadowMask(),
      shadowIntensity: lightIntensity * 0.6,
      shadowDirection: lightDirection,
      softness: calculateShadowSoftness(lightIntensity),
      processingTime: 60 + Math.random() * 40
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'generate-shadows',
      data: shadowResult,
      id
    });
  }, 80 + Math.random() * 120);
}

function compositeLayers(data, id) {
  const { layers, blendModes, opacities } = data;
  
  // Simulate layer compositing
  setTimeout(() => {
    const compositeResult = {
      finalImage: generateMockComposite(),
      layerCount: layers.length,
      blendingTime: 40 + Math.random() * 30,
      totalPixels: 1920 * 1080, // Mock resolution
      compressionRatio: 0.85
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'composite-layers',
      data: compositeResult,
      id
    });
  }, 60 + Math.random() * 90);
}

function applyEffects(data, id) {
  const { image, effects } = data;
  
  // Simulate effect application
  setTimeout(() => {
    const effectsResult = {
      processedImage: image,
      appliedEffects: effects.map(effect => ({
        name: effect.name,
        intensity: effect.intensity,
        processingTime: 20 + Math.random() * 15
      })),
      totalProcessingTime: effects.length * 25 + Math.random() * 50
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'apply-effects',
      data: effectsResult,
      id
    });
  }, effects.length * 30 + Math.random() * 100);
}

// Helper functions
function generateMockComposite() {
  // Generate a mock composite image data URL
  const canvas = new OffscreenCanvas(400, 600);
  const ctx = canvas.getContext('2d');
  
  // Create a gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, 600);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#e0e0e0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 400, 600);
  
  // Add some mock content
  ctx.fillStyle = '#333';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Rendered Scene', 200, 300);
  
  return canvas.convertToBlob().then(blob => {
    return URL.createObjectURL(blob);
  });
}

function generateLightingMap(scenario) {
  const lightingMaps = {
    natural: {
      ambient: 0.3,
      directional: 0.7,
      color: [1.0, 0.95, 0.8],
      direction: [0.5, -1.0, 0.5]
    },
    indoor: {
      ambient: 0.4,
      directional: 0.6,
      color: [0.9, 0.9, 1.0],
      direction: [0.0, -1.0, 0.0]
    },
    evening: {
      ambient: 0.2,
      directional: 0.8,
      color: [1.0, 0.7, 0.4],
      direction: [-0.5, -0.8, 0.3]
    },
    bright: {
      ambient: 0.5,
      directional: 0.5,
      color: [1.0, 1.0, 0.95],
      direction: [0.0, -1.0, 0.0]
    }
  };
  
  return lightingMaps[scenario] || lightingMaps.natural;
}

function generateShadowMap() {
  // Generate mock shadow map data
  const shadowMap = new Array(100 * 100).fill(0);
  
  // Add some shadow patterns
  for (let i = 0; i < shadowMap.length; i++) {
    const x = i % 100;
    const y = Math.floor(i / 100);
    
    // Create a simple shadow pattern
    const distance = Math.sqrt((x - 50) ** 2 + (y - 70) ** 2);
    shadowMap[i] = Math.max(0, 1 - distance / 30);
  }
  
  return {
    data: shadowMap,
    width: 100,
    height: 100,
    format: 'float32'
  };
}

function generateAmbientOcclusion() {
  // Generate mock ambient occlusion data
  const aoMap = new Array(100 * 100).fill(0);
  
  for (let i = 0; i < aoMap.length; i++) {
    const x = i % 100;
    const y = Math.floor(i / 100);
    
    // Create ambient occlusion pattern
    const edgeDistance = Math.min(x, y, 100 - x, 100 - y);
    aoMap[i] = Math.min(1, edgeDistance / 20);
  }
  
  return {
    data: aoMap,
    width: 100,
    height: 100,
    intensity: 0.3
  };
}

function generateShadowMask() {
  // Generate a mock shadow mask
  const mask = new Array(200 * 300).fill(0);
  
  // Create shadow shape
  for (let i = 0; i < mask.length; i++) {
    const x = i % 200;
    const y = Math.floor(i / 200);
    
    // Simple elliptical shadow
    const centerX = 100;
    const centerY = 250;
    const radiusX = 60;
    const radiusY = 40;
    
    const distance = ((x - centerX) / radiusX) ** 2 + ((y - centerY) / radiusY) ** 2;
    mask[i] = distance <= 1 ? 0.6 * (1 - distance) : 0;
  }
  
  return {
    data: mask,
    width: 200,
    height: 300
  };
}

function calculateShadowSoftness(lightIntensity) {
  // Calculate shadow softness based on light intensity
  return Math.max(0.1, Math.min(1.0, 1.0 - lightIntensity * 0.8));
}