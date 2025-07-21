// AI Processing Web Worker
self.onmessage = function(e) {
  const { type, data, id } = e.data;
  
  try {
    switch (type) {
      case 'pose-detection':
        processPoseDetection(data, id);
        break;
      case 'body-segmentation':
        processBodySegmentation(data, id);
        break;
      case 'clothing-fit':
        processClothingFit(data, id);
        break;
      case 'style-recommendation':
        processStyleRecommendation(data, id);
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

function processPoseDetection(imageData, id) {
  // Simulate pose detection processing
  setTimeout(() => {
    const mockPose = {
      keypoints: generateMockKeypoints(),
      confidence: 0.85 + Math.random() * 0.1,
      boundingBox: {
        x: 0.2,
        y: 0.1,
        width: 0.6,
        height: 0.8
      }
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'pose-detection',
      data: mockPose,
      id
    });
  }, 500 + Math.random() * 1000);
}

function processBodySegmentation(imageData, id) {
  // Simulate body segmentation processing
  setTimeout(() => {
    const mockSegmentation = {
      mask: new Array(imageData.width * imageData.height).fill(0).map(() => Math.random() > 0.5 ? 255 : 0),
      confidence: 0.82 + Math.random() * 0.1,
      bodyParts: ['torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg']
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'body-segmentation',
      data: mockSegmentation,
      id
    });
  }, 800 + Math.random() * 1200);
}

function processClothingFit(data, id) {
  // Simulate clothing fit analysis
  const { pose, clothing, segmentation } = data;
  
  setTimeout(() => {
    const mockFitResult = {
      fitScore: 0.75 + Math.random() * 0.2,
      transformMatrix: generateTransformMatrix(),
      deformationMap: generateDeformationMap(),
      recommendations: generateFitRecommendations()
    };
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'clothing-fit',
      data: mockFitResult,
      id
    });
  }, 1200 + Math.random() * 1500);
}

function processStyleRecommendation(data, id) {
  // Simulate style recommendation processing
  const { userProfile, bodyMeasurements, availableItems } = data;
  
  setTimeout(() => {
    const mockRecommendations = availableItems.slice(0, 8).map(item => ({
      item,
      score: Math.random(),
      reasons: ['Great fit for your body type', 'Matches your style preferences'],
      confidence: 0.7 + Math.random() * 0.3
    })).sort((a, b) => b.score - a.score);
    
    self.postMessage({
      type: 'processing:complete',
      subtype: 'style-recommendation',
      data: mockRecommendations,
      id
    });
  }, 600 + Math.random() * 800);
}

// Helper functions
function generateMockKeypoints() {
  const keypoints = [];
  const keypointNames = [
    'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
    'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
    'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
    'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
  ];
  
  keypointNames.forEach((name, index) => {
    keypoints.push({
      x: 0.3 + Math.random() * 0.4,
      y: 0.1 + (index / keypointNames.length) * 0.8,
      confidence: 0.7 + Math.random() * 0.3,
      name
    });
  });
  
  return keypoints;
}

function generateTransformMatrix() {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

function generateDeformationMap() {
  return {
    vertices: new Array(100).fill(0).map(() => Math.random()),
    intensity: 0.3 + Math.random() * 0.4
  };
}

function generateFitRecommendations() {
  const recommendations = [
    'Perfect fit for your body type',
    'Consider sizing up for a more comfortable fit',
    'This style complements your proportions well',
    'Great choice for your preferred style'
  ];
  
  return recommendations.slice(0, 2 + Math.floor(Math.random() * 2));
}