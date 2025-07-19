import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Share2, RotateCcw, Camera, Layers, Maximize2, Settings, Zap, Eye } from 'lucide-react';
import { fabric } from 'fabric';
import { RealAIService, EnhancedBodyPose, EnhancedBodySegmentation } from '../services/realAIService';
import { ClothingItem, LightingSettings } from '../types';
import ErrorService from '../services/errorService';
import CacheService from '../services/cacheService';

interface EnhancedVirtualTryOnProps {
  userPhoto: string;
  selectedItems: ClothingItem[];
  lightingSettings: LightingSettings;
  onRemoveItem: (itemId: string) => void;
  onSaveSession?: (sessionData: any) => void;
}

export const EnhancedVirtualTryOn: React.FC<EnhancedVirtualTryOnProps> = ({
  userPhoto,
  selectedItems,
  lightingSettings,
  onRemoveItem,
  onSaveSession
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bodyPose, setBodyPose] = useState<EnhancedBodyPose | null>(null);
  const [bodySegmentation, setBodySegmentation] = useState<EnhancedBodySegmentation | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [qualitySettings, setQualitySettings] = useState({
    resolution: 'high' as const,
    antiAliasing: true,
    shadows: true,
    reflections: false
  });
  const aiService = RealAIService.getInstance();
  const errorService = ErrorService.getInstance();
  const cacheService = CacheService.getInstance();

  useEffect(() => {
    initializeFabricCanvas();
    // Initialize AI service
    aiService.initialize().catch(error => {
      errorService.logError(error, {
        component: 'EnhancedVirtualTryOn',
        action: 'initializeAI'
      });
    });
    
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
  }, [userPhoto, selectedItems, lightingSettings]);

  const initializeFabricCanvas = () => {
    if (!canvasRef.current) return;

    const resolution = qualitySettings.resolution === 'ultra' ? 2 : 
                      qualitySettings.resolution === 'high' ? 1.5 : 1;
    
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 400 * resolution,
      height: 600 * resolution,
      backgroundColor: '#f0f0f0',
      enableRetinaScaling: true,
      imageSmoothingEnabled: qualitySettings.antiAliasing
    });

    fabricCanvasRef.current = canvas;
  };

  const processVirtualTryOn = async () => {
    if (!userPhoto || selectedItems.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingStage('Initializing...');

    try {
      // Step 1: Load and analyze user photo
      setProcessingStage('Loading image...');
      setProcessingProgress(20);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = userPhoto;
      });

      // Step 2: Detect body pose
      setProcessingStage('Detecting body pose...');
      setProcessingProgress(40);
      const pose = await aiService.detectBodyPose(img);
      setBodyPose(pose);

      // Step 3: Segment body
      setProcessingStage('Segmenting body...');
      setProcessingProgress(40);
      const segmentation = await aiService.segmentBody(img);
      setBodySegmentation(segmentation);

      // Step 4: Process clothing items with AI fitting
      setProcessingStage('Fitting clothing...');
      setProcessingProgress(60);
      await renderClothingItemsAdvanced(img, pose, segmentation);

      // Step 5: Apply advanced lighting effects
      setProcessingStage('Applying lighting...');
      setProcessingProgress(80);
      await applyAdvancedLightingEffects();

      // Step 6: Post-processing
      setProcessingStage('Finalizing...');
      setProcessingProgress(95);
      await applyPostProcessing();

      // Step 7: Complete
      setProcessingStage('Complete!');
      setProcessingProgress(100);
      
      // Save session if callback provided
      if (onSaveSession) {
        const sessionData = {
          userPhoto,
          selectedItems,
          lightingSettings,
          qualitySettings,
          bodyPose: pose,
          bodySegmentation: segmentation,
          timestamp: new Date()
        };
        onSaveSession(sessionData);
      }

    } catch (error) {
      errorService.logError(error as Error, {
        component: 'EnhancedVirtualTryOn',
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

  const renderClothingItemsAdvanced = async (
    userImg: HTMLImageElement, 
    pose: EnhancedBodyPose, 
    segmentation: EnhancedBodySegmentation
  ) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Add user photo as background
    const cachedUserPhoto = await cacheService.cacheImage(userPhoto);
    const userFabricImg = await fabric.Image.fromURL(cachedUserPhoto);
    userFabricImg.set({
      left: 0,
      top: 0,
      scaleX: canvas.width! / userFabricImg.width!,
      scaleY: canvas.height! / userFabricImg.height!,
      selectable: false
    });
    canvas.add(userFabricImg);

    // Add clothing items with AI-powered fitting
    for (const [index, item] of selectedItems.entries()) {
      try {
        // Use AI service to fit clothing to body
        const fitResult = await aiService.fitClothingToBody(pose, item, segmentation);
        
        const cachedClothingImage = await cacheService.cacheImage(item.overlayImage);
        const clothingImg = await fabric.Image.fromURL(cachedClothingImage);
        
        // Apply AI-calculated transformations
        const transform = fitResult.transformMatrix;
        
        clothingImg.set({
          left: transform[6] || 0,
          top: transform[7] || 0,
          scaleX: transform[0] || 0.5,
          scaleY: transform[4] || 0.5,
          opacity: 0.85,
          selectable: true,
          hasControls: true,
          hasBorders: true,
          shadow: qualitySettings.shadows ? new fabric.Shadow({
            color: 'rgba(0,0,0,0.3)',
            blur: 5,
            offsetX: 2,
            offsetY: 2
          }) : undefined
        });

        // Apply deformation if available
        if (fitResult.deformationMap.vertices.length > 0) {
          // Apply mesh deformation (advanced feature)
          this.applyMeshDeformation(clothingImg, fitResult.deformationMap);
        }

        canvas.add(clothingImg);
        canvas.bringToFront(clothingImg);
      } catch (error) {
        errorService.logWarning(`Failed to load clothing item: ${item.name}`, {
          component: 'EnhancedVirtualTryOn',
          action: 'renderClothingItemsAdvanced',
          itemId: item.id
        });
      }
    }

    canvas.renderAll();
  };

  const applyAdvancedLightingEffects = async () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const { brightness, contrast, warmth } = lightingSettings;

    // Apply advanced lighting based on scenario
    const lightingConfig = this.getLightingConfiguration(scenario);
    
    // Apply filters to all objects with enhanced algorithms
    canvas.getObjects().forEach((obj, index) => {
      if (obj.type === 'image') {
        const filters = [];

        // Brightness filter
        if (brightness !== 100) {
          filters.push(new fabric.Image.filters.Brightness({
            brightness: (brightness - 100) / 100 * lightingConfig.brightnessMultiplier
          }));
        }

        // Contrast filter
        if (contrast !== 100) {
          filters.push(new fabric.Image.filters.Contrast({
            contrast: (contrast - 100) / 100 * lightingConfig.contrastMultiplier
          }));
        }

        // Advanced warmth filter
        if (warmth !== 50) {
          const tintColor = warmth > 50 ? lightingConfig.warmTint : lightingConfig.coolTint;
          const opacity = Math.abs(warmth - 50) / 50 * lightingConfig.tintIntensity;
          
          filters.push(new fabric.Image.filters.BlendColor({
            color: tintColor,
            mode: lightingConfig.blendMode,
            alpha: opacity
          }));
        }
        
        // Add scenario-specific filters
        if (scenario === 'evening') {
          filters.push(new fabric.Image.filters.Sepia({
            alpha: 0.1
          }));
        } else if (scenario === 'bright') {
          filters.push(new fabric.Image.filters.Saturation({
            saturation: 0.2
          }));
        }

        (obj as fabric.Image).filters = filters;
        (obj as fabric.Image).applyFilters();
      }
    });

    canvas.renderAll();
  };

  const applyPostProcessing = async () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    // Apply anti-aliasing if enabled
    if (qualitySettings.antiAliasing) {
      canvas.imageSmoothingEnabled = true;
      canvas.imageSmoothingQuality = 'high';
    }
    
    // Apply additional post-processing effects
    if (qualitySettings.reflections) {
      await this.addReflectionEffects(canvas);
    }
    
    canvas.renderAll();
  };

  private getLightingConfiguration(scenario: string) {
    const configs = {
      natural: {
        brightnessMultiplier: 1.0,
        contrastMultiplier: 1.0,
        warmTint: '#fff4e6',
        coolTint: '#e6f3ff',
        tintIntensity: 0.15,
        blendMode: 'overlay'
      },
      indoor: {
        brightnessMultiplier: 0.9,
        contrastMultiplier: 0.8,
        warmTint: '#fff2d9',
        coolTint: '#e6f0ff',
        tintIntensity: 0.2,
        blendMode: 'soft-light'
      },
      evening: {
        brightnessMultiplier: 0.7,
        contrastMultiplier: 1.2,
        warmTint: '#ffcc80',
        coolTint: '#b3d9ff',
        tintIntensity: 0.3,
        blendMode: 'multiply'
      },
      bright: {
        brightnessMultiplier: 1.3,
        contrastMultiplier: 1.1,
        warmTint: '#fff9e6',
        coolTint: '#e6f7ff',
        tintIntensity: 0.1,
        blendMode: 'screen'
      }
    };
    
    return configs[scenario as keyof typeof configs] || configs.natural;
  }

  private applyMeshDeformation(clothingImg: fabric.Image, deformationMap: any) {
    // Advanced mesh deformation implementation
    // This would require custom fabric.js extensions
    console.log('Applying mesh deformation:', deformationMap);
  }

  private async addReflectionEffects(canvas: fabric.Canvas) {
    // Add subtle reflection effects for enhanced realism
    const objects = canvas.getObjects();
    
    objects.forEach((obj, index) => {
      if (obj.type === 'image' && index > 0) { // Skip background
        // Create a subtle reflection effect
        const reflection = fabric.util.object.clone(obj);
        reflection.set({
          flipY: true,
          opacity: 0.1,
          top: (obj.top || 0) + (obj.height || 0),
          selectable: false
        });
        canvas.add(reflection);
        canvas.sendToBack(reflection);
      }
    });
  }
  const exportImage = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    setIsProcessing(true);
    
    try {
      const multiplier = qualitySettings.resolution === 'ultra' ? 4 : 
                        qualitySettings.resolution === 'high' ? 2 : 1;
      
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.95,
        multiplier: multiplier
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `virtualfit-tryon-${Date.now()}.jpg`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      errorService.logError(error as Error, {
        component: 'EnhancedVirtualTryOn',
        action: 'exportImage'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [qualitySettings]);

  const shareImage = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.8
      });

      if (navigator.share && navigator.canShare) {
        // Convert data URL to blob for sharing
        const response = await fetch(dataURL);
        const blob = await response.blob();
        const file = new File([blob], 'virtualfit-tryon.jpg', { type: 'image/jpeg' });

        await navigator.share({
          title: 'My VirtualFit Try-On',
          text: 'Check out my AI-powered virtual try-on!',
          files: [file]
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      errorService.logError(error as Error, {
        component: 'EnhancedVirtualTryOn',
        action: 'shareImage'
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
            <h3 className="text-lg font-semibold text-gray-800">AI-Powered Virtual Try-On</h3>
            {bodyPose && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <Zap size={12} />
                <span>AI Active ({Math.round(bodyPose.confidence * 100)}%)</span>
              </span>
            )}
            {bodySegmentation && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <Eye size={12} />
                <span>Body Segmented</span>
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <Settings size={16} />
            </button>
            
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <Maximize2 size={16} />
            </button>
            
            <button
              onClick={exportImage}
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
              onClick={shareImage}
              disabled={!userPhoto || selectedItems.length === 0}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 size={16} />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>{processingStage}</span>
              <span>{processingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
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
              <div className="w-80 p-4 bg-gray-50 border-l border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Quality & AI Settings</h4>
                
                <div className="space-y-4">
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
                      <option value="low">Low (Fast)</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="ultra">Ultra (Slow)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={qualitySettings.antiAliasing}
                        onChange={(e) => setQualitySettings(prev => ({
                          ...prev,
                          antiAliasing: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Anti-aliasing</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={qualitySettings.shadows}
                        onChange={(e) => setQualitySettings(prev => ({
                          ...prev,
                          shadows: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Realistic Shadows</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={qualitySettings.reflections}
                        onChange={(e) => setQualitySettings(prev => ({
                          ...prev,
                          reflections: e.target.checked
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Reflections</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Clothing Opacity
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.1"
                      defaultValue="0.8"
                      className="w-full"
                      onChange={(e) => {
                        // Update clothing opacity
                        if (fabricCanvasRef.current) {
                          fabricCanvasRef.current.getObjects().forEach(obj => {
                            if (obj.type === 'image' && obj !== fabricCanvasRef.current!.getObjects()[0]) {
                              obj.set('opacity', parseFloat(e.target.value));
                            }
                          });
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Blend Mode
                    </label>
                    <select 
                      className="w-full p-2 border border-gray-300 rounded-md"
                      onChange={(e) => {
                        // Update blend mode
                        if (fabricCanvasRef.current) {
                          fabricCanvasRef.current.getObjects().forEach(obj => {
                            if (obj.type === 'image' && obj !== fabricCanvasRef.current!.getObjects()[0]) {
                              obj.set('globalCompositeOperation', e.target.value);
                            }
                          });
                          fabricCanvasRef.current.renderAll();
                        }
                      }}
                    >
                      <option value="source-over">Normal</option>
                      <option value="multiply">Multiply</option>
                      <option value="overlay">Overlay</option>
                      <option value="soft-light">Soft Light</option>
                      <option value="hard-light">Hard Light</option>
                      <option value="screen">Screen</option>
                      <option value="color-dodge">Color Dodge</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <Camera className="mx-auto text-gray-400 mb-3" size={48} />
              <p className="text-gray-600 font-medium">Upload a photo to start</p>
              <p className="text-gray-500 text-sm mt-1">AI-powered virtual try-on will appear here</p>
            </div>
          </div>
        )}
      </div>

      {/* Selected Items List */}
      {selectedItems.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Selected Items ({selectedItems.length})
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

      {/* AI Insights */}
      {(bodyPose || bodySegmentation) && (
        <div className="px-4 pb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <span className="font-medium">AI Analysis:</span> 
              {bodyPose && ` Body pose detected with ${Math.round(bodyPose.confidence * 100)}% confidence using ${bodyPose.keypoints.length} landmarks.`}
              {bodySegmentation && ` Body segmentation completed with ${Math.round(bodySegmentation.confidence * 100)}% accuracy.`}
              {bodyPose?.bodyMeasurements && ` Estimated height: ${Math.round(bodyPose.bodyMeasurements.height)}cm.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};