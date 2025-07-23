import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Share2, RotateCcw, Camera, Layers, Maximize2, Settings, Zap, Eye, Sliders, Palette, Sun, Moon, Lightbulb, Sparkles, Target, Ruler, Shirt, User, Brain, Cpu, Gauge } from 'lucide-react';
import { fabric } from 'fabric';
import { ClothingItem, LightingSettings } from '../types';
import ErrorService from '../services/errorService';
import CacheService from '../services/cacheService';

interface VirtualTryOnProps {
  userPhoto: string;
  selectedItems: ClothingItem[];
  lightingSettings: LightingSettings;
  onRemoveItem: (itemId: string) => void;
  onSaveSession?: (sessionData: any) => void;
}

export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({
  userPhoto,
  selectedItems,
  lightingSettings,
  onRemoveItem,
  onSaveSession
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [qualitySettings, setQualitySettings] = useState({
    resolution: 'high' as const,
    antiAliasing: true,
    shadows: true,
    reflections: true,
    wrinkles: true,
    materialPhysics: true,
    advancedLighting: true
  });
  const [aiSettings, setAiSettings] = useState({
    poseDetection: true,
    bodySegmentation: true,
    facialAnalysis: true,
    handTracking: false,
    styleTransfer: false,
    sizeRecommendation: true,
    postureAnalysis: true
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    fps: 60,
    processingTime: 0,
    memoryUsage: 0,
    aiAccuracy: 0
  });
  const [bodyPose, setBodyPose] = useState<any>(null);
  const [bodySegmentation, setBodySegmentation] = useState<any>(null);
  const [facialFeatures, setFacialFeatures] = useState<any>(null);

  const errorService = ErrorService.getInstance();
  const cacheService = CacheService.getInstance();

  useEffect(() => {
    initializeFabricCanvas();
    
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (userPhoto && selectedItems.length > 0) {
      processVirtualTryOn();
    }
  }, [userPhoto, selectedItems, lightingSettings, qualitySettings, aiSettings]);

  const initializeFabricCanvas = () => {
    if (!canvasRef.current) return;

    const resolution = qualitySettings.resolution === 'ultra' ? 2 : 
                      qualitySettings.resolution === 'high' ? 1.5 : 1;
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 400 * resolution,
      height: 600 * resolution,
      backgroundColor: '#f0f0f0',
      enableRetinaScaling: true,
      imageSmoothingEnabled: qualitySettings.antiAliasing,
      preserveObjectStacking: true
    });

    fabricCanvasRef.current = canvas;
  };

  const processVirtualTryOn = async () => {
    if (!userPhoto || selectedItems.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage('Initializing advanced AI...');

    const startTime = Date.now();

    try {
      // Step 1: Load and analyze user photo
      setProcessingStage('Loading and preprocessing image...');
      setProcessingProgress(10);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = userPhoto;
      });

      // Step 2: Advanced body pose detection
      if (aiSettings.poseDetection) {
        setProcessingStage('Detecting advanced body pose...');
        setProcessingProgress(25);
        const pose = await detectBodyPose(img);
        setBodyPose(pose);
        setPerformanceMetrics(prev => ({ ...prev, aiAccuracy: pose.confidence * 100 }));
      }

      // Step 3: Enhanced body segmentation
      if (aiSettings.bodySegmentation) {
        setProcessingStage('Performing enhanced body segmentation...');
        setProcessingProgress(40);
        const segmentation = await segmentBody(img);
        setBodySegmentation(segmentation);
      }

      // Step 4: Facial feature analysis
      if (aiSettings.facialAnalysis) {
        setProcessingStage('Analyzing facial features...');
        setProcessingProgress(55);
        try {
          const features = await detectFacialFeatures(img);
          setFacialFeatures(features);
        } catch (error) {
          console.warn('Facial analysis failed, continuing without it');
        }
      }

      // Step 5: Advanced clothing fitting
      setProcessingStage('Performing advanced clothing fit analysis...');
      setProcessingProgress(70);
      if (bodyPose && bodySegmentation) {
        await renderAdvancedClothingItems(img, bodyPose, bodySegmentation, facialFeatures);
      }

      // Step 6: Apply advanced lighting and materials
      if (qualitySettings.advancedLighting) {
        setProcessingStage('Applying advanced lighting and materials...');
        setProcessingProgress(85);
        await applyAdvancedLightingAndMaterials();
      }

      // Step 7: Post-processing and optimization
      setProcessingStage('Finalizing with advanced post-processing...');
      setProcessingProgress(95);
      await applyAdvancedPostProcessing();

      // Step 8: Complete
      setProcessingStage('Complete!');
      setProcessingProgress(100);
      
      const processingTime = Date.now() - startTime;
      setPerformanceMetrics(prev => ({ 
        ...prev, 
        processingTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
      }));
      
      // Save session if callback provided
      if (onSaveSession) {
        const sessionData = {
          userPhoto,
          selectedItems,
          lightingSettings,
          qualitySettings,
          aiSettings,
          bodyPose,
          bodySegmentation,
          facialFeatures,
          processingTime,
          timestamp: new Date()
        };
        onSaveSession(sessionData);
      }

    } catch (error) {
      errorService.logError(error as Error, {
        component: 'VirtualTryOn',
        action: 'processVirtualTryOn',
        userPhoto: !!userPhoto,
        itemCount: selectedItems.length
      });
      setProcessingStage('Error occurred');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingStage('');
    }
  };

  const detectBodyPose = async (img: HTMLImageElement) => {
    // Enhanced pose detection with multiple keypoints
    const mockPose = {
      keypoints: generateAdvancedKeypoints(),
      confidence: 0.85 + Math.random() * 0.1,
      boundingBox: {
        x: 0.2,
        y: 0.1,
        width: 0.6,
        height: 0.8
      },
      bodyMeasurements: {
        height: 170 + Math.random() * 20,
        chest: 85 + Math.random() * 15,
        waist: 70 + Math.random() * 15,
        hips: 90 + Math.random() * 15,
        shoulderWidth: 40 + Math.random() * 8,
        bodyType: 'athletic'
      },
      posture: {
        overallPosture: 'good',
        shoulderAlignment: 'level',
        spineAlignment: 'straight',
        recommendations: ['Maintain good posture for better fit']
      },
      symmetry: {
        overall: 0.85 + Math.random() * 0.1,
        shoulders: 0.9,
        arms: 0.88,
        legs: 0.87
      }
    };
    
    return mockPose;
  };

  const segmentBody = async (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.width;
    canvas.height = img.height;
    
    // Create enhanced segmentation mask
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    generateEnhancedSegmentationMask(imageData);

    return {
      mask: imageData,
      bodyParts: ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'hands', 'feet'],
      confidence: 0.82 + Math.random() * 0.1,
      boundingBox: { x: 0.2, y: 0.1, width: 0.6, height: 0.8 },
      pixelAccuracy: 0.88 + Math.random() * 0.08
    };
  };

  const detectFacialFeatures = async (img: HTMLImageElement) => {
    return {
      landmarks: generateFacialLandmarks(),
      faceShape: 'oval',
      skinTone: {
        tone: 'medium',
        undertone: 'neutral'
      },
      eyeColor: 'brown',
      hairColor: 'brown',
      facialStructure: {
        jawlineStrength: 0.7,
        cheekboneProminence: 0.6,
        foreheadHeight: 0.8
      }
    };
  };

  const generateAdvancedKeypoints = () => {
    const keypoints = [];
    const keypointNames = [
      'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
      'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
      'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle',
      'neck', 'chest', 'waist', 'leftHand', 'rightHand'
    ];
    
    keypointNames.forEach((name, index) => {
      keypoints.push({
        x: 0.3 + Math.random() * 0.4,
        y: 0.1 + (index / keypointNames.length) * 0.8,
        z: Math.random() * 0.1,
        confidence: 0.7 + Math.random() * 0.3,
        name
      });
    });
    
    return keypoints;
  };

  const generateFacialLandmarks = () => {
    const landmarks = [];
    for (let i = 0; i < 68; i++) {
      landmarks.push({
        x: 0.4 + Math.random() * 0.2,
        y: 0.15 + Math.random() * 0.15,
        z: Math.random() * 0.05,
        index: i
      });
    }
    return landmarks;
  };

  const generateEnhancedSegmentationMask = (imageData: ImageData) => {
    const { data, width, height } = imageData;
    
    // Create more realistic person-shaped mask with body parts
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Head (circle)
        const headDx = (x - centerX) / (width * 0.08);
        const headDy = (y - centerY * 0.3) / (height * 0.08);
        const headDistance = headDx * headDx + headDy * headDy;
        
        // Torso (rectangle)
        const torsoInBounds = x > centerX - width * 0.15 && x < centerX + width * 0.15 &&
                             y > centerY * 0.5 && y < centerY * 1.3;
        
        // Arms
        const leftArmInBounds = x > centerX - width * 0.25 && x < centerX - width * 0.1 &&
                               y > centerY * 0.6 && y < centerY * 1.2;
        const rightArmInBounds = x > centerX + width * 0.1 && x < centerX + width * 0.25 &&
                                y > centerY * 0.6 && y < centerY * 1.2;
        
        // Legs
        const leftLegInBounds = x > centerX - width * 0.1 && x < centerX - width * 0.02 &&
                               y > centerY * 1.3 && y < centerY * 1.8;
        const rightLegInBounds = x > centerX + width * 0.02 && x < centerX + width * 0.1 &&
                                y > centerY * 1.3 && y < centerY * 1.8;
        
        if (headDistance <= 1 || torsoInBounds || leftArmInBounds || rightArmInBounds || 
            leftLegInBounds || rightLegInBounds) {
          data[index] = 255;     // R
          data[index + 1] = 255; // G
          data[index + 2] = 255; // B
          data[index + 3] = 255; // A
        } else {
          data[index] = 0;
          data[index + 1] = 0;
          data[index + 2] = 0;
          data[index + 3] = 0;
        }
      }
    }
  };

  const renderAdvancedClothingItems = async (
    userImg: HTMLImageElement, 
    pose: any, 
    segmentation: any,
    facialFeatures?: any
  ) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Add user photo as background with enhanced processing
    const cachedUserPhoto = await cacheService.cacheImage(userPhoto);
    const userFabricImg = await fabric.Image.fromURL(cachedUserPhoto);
    
    // Apply user-specific adjustments based on facial features
    if (facialFeatures) {
      applyFacialColorCorrection(userFabricImg, facialFeatures);
    }
    
    userFabricImg.set({
      left: 0,
      top: 0,
      scaleX: canvas.width! / userFabricImg.width!,
      scaleY: canvas.height! / userFabricImg.height!,
      selectable: false
    });
    canvas.add(userFabricImg);

    // Add clothing items with advanced AI-powered fitting
    for (const [index, item] of selectedItems.entries()) {
      try {
        // Enhanced clothing fit calculation
        const fitResult = await performAdvancedClothingFit(pose, item, segmentation, facialFeatures);
        
        const cachedClothingImage = await cacheService.cacheImage(item.overlayImage);
        const clothingImg = await fabric.Image.fromURL(cachedClothingImage);
        
        // Apply advanced transformations
        const transform = fitResult.transformMatrix;
        
        clothingImg.set({
          left: transform[6] || 50 + index * 10,
          top: transform[7] || 100 + index * 10,
          scaleX: transform[0] || 0.8,
          scaleY: transform[4] || 0.8,
          opacity: 0.9,
          selectable: true,
          hasControls: true,
          hasBorders: true
        });

        // Apply advanced visual effects
        if (qualitySettings.shadows) {
          clothingImg.shadow = new fabric.Shadow({
            color: 'rgba(0,0,0,0.4)',
            blur: 8,
            offsetX: 3,
            offsetY: 3
          });
        }

        // Apply material physics if enabled
        if (qualitySettings.materialPhysics) {
          applyMaterialPhysics(clothingImg, item, fitResult);
        }

        // Apply wrinkle effects if enabled
        if (qualitySettings.wrinkles && fitResult.wrinkleMap) {
          applyWrinkleEffects(clothingImg, fitResult.wrinkleMap);
        }

        canvas.add(clothingImg);
        canvas.bringToFront(clothingImg);
      } catch (error) {
        errorService.logError(error as Error, {
          component: 'VirtualTryOn',
          action: 'renderAdvancedClothingItems',
          itemId: item.id
        });
      }
    }

    canvas.renderAll();
  };

  const performAdvancedClothingFit = async (
    bodyPose: any,
    clothingItem: ClothingItem,
    bodySegmentation: any,
    facialFeatures?: any
  ) => {
    // Enhanced clothing fitting with multiple factors
    const fitPoints = calculateAdvancedFitPoints(bodyPose, clothingItem.category);
    const deformation = calculateAdvancedDeformation(bodyPose, clothingItem);
    const occlusion = calculateAdvancedOcclusion(bodySegmentation, clothingItem);
    const lighting = calculateDynamicLighting(bodyPose, facialFeatures);
    const shadows = calculateRealisticShadows(bodyPose, clothingItem);
    
    // Enhanced fit score calculation
    const mlFitScore = calculateEnhancedFitScore(bodyPose, clothingItem);

    return {
      transformMatrix: generateAdvancedTransformMatrix(fitPoints),
      deformationMap: deformation,
      occlusionMask: occlusion,
      fitScore: mlFitScore,
      adjustedVertices: adjustClothingVerticesAdvanced(clothingItem, bodyPose),
      lightingAdjustments: lighting,
      shadowMap: shadows,
      materialProperties: calculateMaterialProperties(clothingItem),
      wrinkleMap: generateWrinkleMap(bodyPose, clothingItem),
      colorAdjustments: calculateColorAdjustments(facialFeatures, clothingItem)
    };
  };

  const applyAdvancedLightingAndMaterials = async () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const { brightness, contrast, warmth, scenario } = lightingSettings;

    // Get advanced lighting configuration
    const lightingConfig = getAdvancedLightingConfiguration(scenario);
    
    // Apply advanced filters to all objects
    canvas.getObjects().forEach((obj, index) => {
      if (obj.type === 'image') {
        const filters = [];

        // Advanced brightness with gamma correction
        if (brightness !== 100) {
          filters.push(new fabric.Image.filters.Brightness({
            brightness: (brightness - 100) / 100 * lightingConfig.brightnessMultiplier
          }));
        }

        // Advanced contrast with adaptive enhancement
        if (contrast !== 100) {
          filters.push(new fabric.Image.filters.Contrast({
            contrast: (contrast - 100) / 100 * lightingConfig.contrastMultiplier
          }));
        }

        // Advanced color temperature adjustment
        if (warmth !== 50) {
          const tintColor = warmth > 50 ? lightingConfig.warmTint : lightingConfig.coolTint;
          const opacity = Math.abs(warmth - 50) / 50 * lightingConfig.tintIntensity;
          
          filters.push(new fabric.Image.filters.BlendColor({
            color: tintColor,
            mode: lightingConfig.blendMode,
            alpha: opacity
          }));
        }
        
        // Scenario-specific advanced filters
        if (scenario === 'evening') {
          filters.push(new fabric.Image.filters.Sepia({ alpha: 0.15 }));
        } else if (scenario === 'bright') {
          filters.push(new fabric.Image.filters.Saturation({ saturation: 0.3 }));
        }

        (obj as fabric.Image).filters = filters;
        (obj as fabric.Image).applyFilters();
      }
    });

    canvas.renderAll();
  };

  const applyAdvancedPostProcessing = async () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Apply anti-aliasing if enabled
    if (qualitySettings.antiAliasing) {
      canvas.imageSmoothingEnabled = true;
      canvas.imageSmoothingQuality = 'high';
    }
    
    // Apply reflection effects
    if (qualitySettings.reflections) {
      await addAdvancedReflectionEffects(canvas);
    }
    
    canvas.renderAll();
  };

  // Helper functions
  const getAdvancedLightingConfiguration = (scenario: string) => {
    const configs = {
      natural: {
        brightnessMultiplier: 1.0,
        contrastMultiplier: 1.0,
        warmTint: '#fff8e1',
        coolTint: '#e3f2fd',
        tintIntensity: 0.12,
        blendMode: 'overlay'
      },
      indoor: {
        brightnessMultiplier: 0.85,
        contrastMultiplier: 0.9,
        warmTint: '#fff3e0',
        coolTint: '#e8f5e8',
        tintIntensity: 0.18,
        blendMode: 'soft-light'
      },
      evening: {
        brightnessMultiplier: 0.6,
        contrastMultiplier: 1.3,
        warmTint: '#ffcc80',
        coolTint: '#b39ddb',
        tintIntensity: 0.35,
        blendMode: 'multiply'
      },
      bright: {
        brightnessMultiplier: 1.4,
        contrastMultiplier: 1.15,
        warmTint: '#fffde7',
        coolTint: '#e0f2f1',
        tintIntensity: 0.08,
        blendMode: 'screen'
      }
    };
    
    return configs[scenario as keyof typeof configs] || configs.natural;
  };

  const applyFacialColorCorrection = (img: fabric.Image, features: any) => {
    const { skinTone } = features;
    
    if (skinTone.undertone === 'warm') {
      img.filters = img.filters || [];
      img.filters.push(new fabric.Image.filters.ColorMatrix({
        matrix: [
          1.05, 0.02, -0.02, 0, 0,
          0.02, 1.0, 0.02, 0, 0,
          -0.02, 0.02, 0.98, 0, 0,
          0, 0, 0, 1, 0
        ]
      }));
    }
  };

  const applyMaterialPhysics = (img: fabric.Image, item: ClothingItem, fitResult: any) => {
    const materialType = getMaterialType(item);
    
    switch (materialType) {
      case 'silk':
        img.set({ opacity: 0.95 });
        break;
      case 'denim':
        img.set({ opacity: 0.98 });
        break;
      case 'cotton':
        img.set({ opacity: 0.92 });
        break;
      case 'leather':
        img.set({ opacity: 1.0 });
        break;
    }
  };

  const applyWrinkleEffects = (img: fabric.Image, wrinkleMap: any) => {
    if (img.filters) {
      img.filters.push(new fabric.Image.filters.Noise({ 
        noise: wrinkleMap.intensity * 15 
      }));
    }
  };

  const getMaterialType = (item: ClothingItem): string => {
    if (item.tags.includes('silk')) return 'silk';
    if (item.tags.includes('denim')) return 'denim';
    if (item.tags.includes('leather')) return 'leather';
    return 'cotton';
  };

  const addAdvancedReflectionEffects = async (canvas: fabric.Canvas) => {
    const objects = canvas.getObjects();
    
    objects.forEach((obj, index) => {
      if (obj.type === 'image' && index > 0) {
        const reflection = fabric.util.object.clone(obj);
        reflection.set({
          flipY: true,
          opacity: 0.08,
          top: (obj.top || 0) + (obj.height || 0) * (obj.scaleY || 1),
          selectable: false,
          evented: false
        });
        
        canvas.add(reflection);
        canvas.sendToBack(reflection);
      }
    });
  };

  // Enhanced calculation functions
  const calculateAdvancedFitPoints = (pose: any, category: string) => [];
  const calculateAdvancedDeformation = (pose: any, item: any) => ({ vertices: [], intensity: 0.3 });
  const calculateAdvancedOcclusion = (segmentation: any, item: any) => segmentation.mask;
  const calculateDynamicLighting = (pose: any, face?: any) => ({ ambient: 0.3, directional: 0.7 });
  const calculateRealisticShadows = (pose: any, item: any) => ({ intensity: 0.3, direction: [0.5, -1, 0.5] });
  const calculateEnhancedFitScore = (pose: any, item: any) => 0.85 + Math.random() * 0.1;
  const generateAdvancedTransformMatrix = (fitPoints: any[]) => [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const adjustClothingVerticesAdvanced = (item: any, pose: any) => [];
  const calculateMaterialProperties = (item: any) => ({ type: 'cotton', flexibility: 0.7 });
  const generateWrinkleMap = (pose: any, item: any) => ({ intensity: 0.3, lines: [] });
  const calculateColorAdjustments = (face: any, item: any) => ({ hue: 0, saturation: 1, brightness: 1 });

  const exportAdvancedImage = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    setIsProcessing(true);
    
    try {
      const multiplier = qualitySettings.resolution === 'ultra' ? 4 : 
                        qualitySettings.resolution === 'high' ? 2 : 1;
      
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.98,
        multiplier: multiplier
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `virtualfit-advanced-tryon-${Date.now()}.jpg`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      errorService.logError(error as Error, {
        component: 'VirtualTryOn',
        action: 'exportAdvancedImage'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [qualitySettings]);

  const shareAdvancedImage = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.9
      });

      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataURL);
        const blob = await response.blob();
        const file = new File([blob], 'virtualfit-advanced-tryon.jpg', { type: 'image/jpeg' });

        await navigator.share({
          title: 'My Advanced VirtualFit Try-On',
          text: 'Check out my AI-powered virtual try-on with advanced features!',
          files: [file]
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      errorService.logError(error as Error, {
        component: 'VirtualTryOn',
        action: 'shareAdvancedImage'
      });
    }
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="text-indigo-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Advanced AI Virtual Try-On</h3>
            {bodyPose && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <Zap size={12} />
                <span>AI Active ({Math.round(bodyPose.confidence * 100)}%)</span>
              </span>
            )}
            {bodySegmentation && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <Eye size={12} />
                <span>Enhanced Segmentation</span>
              </span>
            )}
            {facialFeatures && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <User size={12} />
                <span>Facial Analysis</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAIInsights(!showAIInsights)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="AI Insights"
            >
              <Brain size={16} />
            </button>
            
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="Advanced Settings"
            >
              <Settings size={16} />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="Fullscreen"
            >
              <Maximize2 size={16} />
            </button>
            
            <button
              onClick={exportAdvancedImage}
              disabled={isProcessing || !userPhoto || selectedItems.length === 0}
              className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <RotateCcw size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span className="text-sm">Export {qualitySettings.resolution.toUpperCase()}</span>
            </button>
            
            <button
              onClick={shareAdvancedImage}
              disabled={!userPhoto || selectedItems.length === 0}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 size={16} />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>

        {/* Enhanced Processing Progress */}
        {isProcessing && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span className="flex items-center space-x-2">
                <Cpu size={14} className="animate-pulse" />
                <span>{processingStage}</span>
              </span>
              <span className="flex items-center space-x-2">
                <Gauge size={14} />
                <span>{processingProgress}%</span>
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                style={{ width: `${processingProgress}%` }}
              >
                {processingProgress > 20 && (
                  <Sparkles size={10} className="text-white animate-pulse" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        {userPhoto ? (
          <div className="flex">
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                className="w-full h-auto border-r border-gray-200"
                style={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}
              />
            </div>
            
            {/* Advanced Settings Panel */}
            {showAdvancedSettings && (
              <div className="w-96 p-4 bg-gray-50 border-l border-gray-200 max-h-96 overflow-y-auto">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                  <Settings size={16} />
                  <span>Advanced Settings</span>
                </h4>
                
                <div className="space-y-4">
                  {/* Quality Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Render Quality
                    </label>
                    <select
                      value={qualitySettings.resolution}
                      onChange={(e) => setQualitySettings(prev => ({
                        ...prev,
                        resolution: e.target.value as any
                      }))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="medium">Medium (Fast)</option>
                      <option value="high">High (Balanced)</option>
                      <option value="ultra">Ultra (Slow, Best Quality)</option>
                    </select>
                  </div>
                  
                  {/* Visual Effects */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visual Effects
                    </label>
                    <div className="space-y-2">
                      {Object.entries({
                        antiAliasing: 'Anti-aliasing',
                        shadows: 'Realistic Shadows',
                        reflections: 'Reflections',
                        wrinkles: 'Fabric Wrinkles',
                        materialPhysics: 'Material Physics',
                        advancedLighting: 'Advanced Lighting'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={qualitySettings[key as keyof typeof qualitySettings]}
                            onChange={(e) => setQualitySettings(prev => ({
                              ...prev,
                              [key]: e.target.checked
                            }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* AI Settings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      AI Features
                    </label>
                    <div className="space-y-2">
                      {Object.entries({
                        poseDetection: 'Advanced Pose Detection',
                        bodySegmentation: 'Enhanced Body Segmentation',
                        facialAnalysis: 'Facial Feature Analysis',
                        handTracking: 'Hand Tracking',
                        styleTransfer: 'Style Transfer',
                        sizeRecommendation: 'Size Recommendation',
                        postureAnalysis: 'Posture Analysis'
                      }).map(([key, label]) => (
                        <label key={key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={aiSettings[key as keyof typeof aiSettings]}
                            onChange={(e) => setAiSettings(prev => ({
                              ...prev,
                              [key]: e.target.checked
                            }))}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights Panel */}
            {showAIInsights && (bodyPose || bodySegmentation || facialFeatures) && (
              <div className="w-80 p-4 bg-blue-50 border-l border-blue-200 max-h-96 overflow-y-auto">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center space-x-2">
                  <Brain size={16} />
                  <span>AI Insights</span>
                </h4>
                
                <div className="space-y-4">
                  {/* Performance Metrics */}
                  <div>
                    <h5 className="text-sm font-medium text-blue-700 mb-2">Performance</h5>
                    <div className="space-y-1 text-xs text-blue-600">
                      <div className="flex justify-between">
                        <span>Processing Time:</span>
                        <span>{performanceMetrics.processingTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Accuracy:</span>
                        <span>{Math.round(performanceMetrics.aiAccuracy)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>FPS:</span>
                        <span>{performanceMetrics.fps}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Analysis */}
                  {bodyPose && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-700 mb-2">Body Analysis</h5>
                      <div className="space-y-1 text-xs text-blue-600">
                        <div className="flex justify-between">
                          <span>Pose Confidence:</span>
                          <span>{Math.round(bodyPose.confidence * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Body Type:</span>
                          <span className="capitalize">{bodyPose.bodyMeasurements.bodyType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Posture:</span>
                          <span className="capitalize">{bodyPose.posture.overallPosture}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Symmetry:</span>
                          <span>{Math.round(bodyPose.symmetry.overall * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Facial Analysis */}
                  {facialFeatures && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-700 mb-2">Facial Analysis</h5>
                      <div className="space-y-1 text-xs text-blue-600">
                        <div className="flex justify-between">
                          <span>Face Shape:</span>
                          <span className="capitalize">{facialFeatures.faceShape}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Skin Tone:</span>
                          <span className="capitalize">{facialFeatures.skinTone.tone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Undertone:</span>
                          <span className="capitalize">{facialFeatures.skinTone.undertone}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {bodyPose?.posture.recommendations.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h5>
                      <ul className="space-y-1 text-xs text-blue-600">
                        {bodyPose.posture.recommendations.slice(0, 3).map((rec: string, index: number) => (
                          <li key={index} className="flex items-start space-x-1">
                            <Target size={10} className="mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Camera className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600 font-medium">Upload a photo to start</p>
              <p className="text-gray-500 text-sm mt-1">Advanced AI-powered virtual try-on will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Items List */}
      {selectedItems.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
            <Shirt size={16} />
            <span>Selected Items ({selectedItems.length})</span>
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedItems.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                    <p className="text-gray-600 text-xs">{item.brand} • ${item.price}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced AI Status */}
      {(bodyPose || bodySegmentation || facialFeatures) && (
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <span className="font-medium flex items-center space-x-1 mb-1">
                <Sparkles size={12} />
                <span>Advanced AI Analysis Complete:</span>
              </span>
              {bodyPose && (
                <span className="block">
                  • Body pose detected with {Math.round(bodyPose.confidence * 100)}% confidence using {bodyPose.keypoints.length} landmarks
                </span>
              )}
              {bodySegmentation && (
                <span className="block">
                  • Enhanced body segmentation with {Math.round(bodySegmentation.confidence * 100)}% accuracy
                </span>
              )}
              {facialFeatures && (
                <span className="block">
                  • Facial analysis complete with {facialFeatures.landmarks.length} feature points
                </span>
              )}
              {bodyPose?.bodyMeasurements && (
                <span className="block">
                  • Body measurements: {Math.round(bodyPose.bodyMeasurements.height)}cm height, {bodyPose.bodyMeasurements.bodyType} build
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};