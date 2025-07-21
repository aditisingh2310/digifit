import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, Share2, RotateCcw, Camera, Layers, Maximize2, Settings, 
  Zap, Eye, Sliders, Palette, Sun, Moon, Lightbulb, Sparkles,
  Target, Ruler, Shirt, User, Brain, Cpu, Gauge
} from 'lucide-react';
import { fabric } from 'fabric';
import { AdvancedAIService, AdvancedBodyPose, AdvancedBodySegmentation, FacialFeatures } from '../services/advancedAIService';
import { ClothingItem, LightingSettings } from '../types';
import ErrorService from '../services/errorService';
import CacheService from '../services/cacheService';

interface AdvancedVirtualTryOnProps {
  userPhoto: string;
  selectedItems: ClothingItem[];
  lightingSettings: LightingSettings;
  onRemoveItem: (itemId: string) => void;
  onSaveSession?: (sessionData: any) => void;
}

export const AdvancedVirtualTryOn: React.FC<AdvancedVirtualTryOnProps> = ({
  userPhoto,
  selectedItems,
  lightingSettings,
  onRemoveItem,
  onSaveSession
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bodyPose, setBodyPose] = useState<AdvancedBodyPose | null>(null);
  const [bodySegmentation, setBodySegmentation] = useState<AdvancedBodySegmentation | null>(null);
  const [facialFeatures, setFacialFeatures] = useState<FacialFeatures | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [qualitySettings, setQualitySettings] = useState({
    resolution: 'ultra' as const,
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
    fps: 0,
    processingTime: 0,
    memoryUsage: 0,
    aiAccuracy: 0
  });

  const aiService = AdvancedAIService.getInstance();
  const errorService = ErrorService.getInstance();
  const cacheService = CacheService.getInstance();

  useEffect(() => {
    initializeFabricCanvas();
    initializeAI();
    
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (userPhoto && selectedItems.length > 0) {
      processAdvancedVirtualTryOn();
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

  const initializeAI = async () => {
    try {
      await aiService.initialize();
    } catch (error) {
      errorService.logError(error as Error, {
        component: 'AdvancedVirtualTryOn',
        action: 'initializeAI'
      });
    }
  };

  const processAdvancedVirtualTryOn = async () => {
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
        const pose = await aiService.detectAdvancedBodyPose(img);
        setBodyPose(pose);
        setPerformanceMetrics(prev => ({ ...prev, aiAccuracy: pose.confidence * 100 }));
      }

      // Step 3: Enhanced body segmentation
      if (aiSettings.bodySegmentation) {
        setProcessingStage('Performing enhanced body segmentation...');
        setProcessingProgress(40);
        const segmentation = await aiService.segmentBody(img);
        setBodySegmentation(segmentation as AdvancedBodySegmentation);
      }

      // Step 4: Facial feature analysis
      if (aiSettings.facialAnalysis) {
        setProcessingStage('Analyzing facial features...');
        setProcessingProgress(55);
        try {
          const features = await aiService.detectFacialFeatures(img);
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
        component: 'AdvancedVirtualTryOn',
        action: 'processAdvancedVirtualTryOn',
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

  const renderAdvancedClothingItems = async (
    userImg: HTMLImageElement, 
    pose: AdvancedBodyPose, 
    segmentation: AdvancedBodySegmentation,
    facialFeatures?: FacialFeatures | null
  ) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Add user photo as background with enhanced processing
    const cachedUserPhoto = await cacheService.cacheImage(userPhoto);
    const userFabricImg = await fabric.Image.fromURL(cachedUserPhoto);
    
    // Apply user-specific adjustments based on facial features
    if (facialFeatures) {
      this.applyFacialColorCorrection(userFabricImg, facialFeatures);
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
        // Use advanced AI service for superior fitting
        const fitResult = await aiService.performAdvancedClothingFit(
          pose, 
          item, 
          segmentation,
          facialFeatures || undefined
        );
        
        const cachedClothingImage = await cacheService.cacheImage(item.overlayImage);
        const clothingImg = await fabric.Image.fromURL(cachedClothingImage);
        
        // Apply advanced transformations
        const transform = fitResult.transformMatrix;
        
        clothingImg.set({
          left: transform[12] || 0,
          top: transform[13] || 0,
          scaleX: Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) || 0.5,
          scaleY: Math.sqrt(transform[4] * transform[4] + transform[5] * transform[5]) || 0.5,
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
          this.applyMaterialPhysics(clothingImg, item, fitResult);
        }

        // Apply wrinkle effects if enabled
        if (qualitySettings.wrinkles && fitResult.wrinkleMap) {
          this.applyWrinkleEffects(clothingImg, fitResult.wrinkleMap);
        }

        canvas.add(clothingImg);
        canvas.bringToFront(clothingImg);
      } catch (error) {
        errorService.logWarning(`Failed to load clothing item: ${item.name}`, {
          component: 'AdvancedVirtualTryOn',
          action: 'renderAdvancedClothingItems',
          itemId: item.id
        });
      }
    }

    canvas.renderAll();
  };

  const applyAdvancedLightingAndMaterials = async () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const { brightness, contrast, warmth, scenario } = lightingSettings;

    // Get advanced lighting configuration
    const lightingConfig = this.getAdvancedLightingConfiguration(scenario);
    
    // Apply advanced filters to all objects
    canvas.getObjects().forEach((obj, index) => {
      if (obj.type === 'image') {
        const filters = [];

        // Advanced brightness with gamma correction
        if (brightness !== 100) {
          filters.push(new fabric.Image.filters.Brightness({
            brightness: (brightness - 100) / 100 * lightingConfig.brightnessMultiplier
          }));
          
          filters.push(new fabric.Image.filters.Gamma({
            gamma: [1 + (brightness - 100) / 200, 1 + (brightness - 100) / 200, 1 + (brightness - 100) / 200]
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
          filters.push(new fabric.Image.filters.Noise({ noise: 20 }));
        } else if (scenario === 'bright') {
          filters.push(new fabric.Image.filters.Saturation({ saturation: 0.3 }));
          filters.push(new fabric.Image.filters.HueRotation({ rotation: 0.02 }));
        } else if (scenario === 'indoor') {
          filters.push(new fabric.Image.filters.ColorMatrix({
            matrix: [
              0.9, 0.1, 0.1, 0, 0,
              0.1, 0.9, 0.1, 0, 0,
              0.1, 0.1, 0.9, 0, 0,
              0, 0, 0, 1, 0
            ]
          }));
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
    
    // Apply advanced anti-aliasing
    if (qualitySettings.antiAliasing) {
      canvas.imageSmoothingEnabled = true;
      canvas.imageSmoothingQuality = 'high';
    }
    
    // Apply reflection effects
    if (qualitySettings.reflections) {
      await this.addAdvancedReflectionEffects(canvas);
    }
    
    // Apply depth of field effect
    if (qualitySettings.resolution === 'ultra') {
      await this.addDepthOfFieldEffect(canvas);
    }
    
    canvas.renderAll();
  };

  private getAdvancedLightingConfiguration(scenario: string) {
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
  }

  private applyFacialColorCorrection(img: fabric.Image, features: FacialFeatures) {
    // Apply color correction based on skin tone
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
    } else if (skinTone.undertone === 'cool') {
      img.filters = img.filters || [];
      img.filters.push(new fabric.Image.filters.ColorMatrix({
        matrix: [
          0.98, 0.02, 0.05, 0, 0,
          0.02, 1.0, 0.02, 0, 0,
          0.05, 0.02, 1.02, 0, 0,
          0, 0, 0, 1, 0
        ]
      }));
    }
  }

  private applyMaterialPhysics(img: fabric.Image, item: ClothingItem, fitResult: any) {
    // Apply material-specific physics simulation
    const materialType = this.getMaterialType(item);
    
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
        if (img.filters) {
          img.filters.push(new fabric.Image.filters.Brightness({ brightness: -0.1 }));
        }
        break;
    }
  }

  private applyWrinkleEffects(img: fabric.Image, wrinkleMap: any) {
    // Apply realistic wrinkle effects based on pose and material
    if (img.filters) {
      img.filters.push(new fabric.Image.filters.Noise({ 
        noise: wrinkleMap.intensity * 15 
      }));
    }
  }

  private getMaterialType(item: ClothingItem): string {
    // Determine material type from item tags or category
    if (item.tags.includes('silk')) return 'silk';
    if (item.tags.includes('denim')) return 'denim';
    if (item.tags.includes('leather')) return 'leather';
    return 'cotton';
  }

  private async addAdvancedReflectionEffects(canvas: fabric.Canvas) {
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
        
        // Add gradient mask for realistic reflection fade
        reflection.filters = reflection.filters || [];
        reflection.filters.push(new fabric.Image.filters.Gradient({
          gradient: {
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
            colorStops: [
              { offset: 0, color: 'rgba(255,255,255,0.8)' },
              { offset: 1, color: 'rgba(255,255,255,0)' }
            ]
          }
        }));
        
        canvas.add(reflection);
        canvas.sendToBack(reflection);
      }
    });
  }

  private async addDepthOfFieldEffect(canvas: fabric.Canvas) {
    // Add subtle depth of field effect for ultra quality
    const objects = canvas.getObjects();
    
    objects.forEach((obj, index) => {
      if (obj.type === 'image' && index > 1) {
        if (obj.filters) {
          obj.filters.push(new fabric.Image.filters.Blur({ blur: 0.5 }));
        }
      }
    });
  }

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
        component: 'AdvancedVirtualTryOn',
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
        component: 'AdvancedVirtualTryOn',
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
                        <span>Memory Usage:</span>
                        <span>{Math.round(performanceMetrics.memoryUsage / 1024 / 1024)}MB</span>
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
                        {bodyPose.posture.recommendations.slice(0, 3).map((rec, index) => (
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