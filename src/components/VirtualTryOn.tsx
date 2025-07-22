@@ .. @@
 import React, { useState, useRef, useEffect } from 'react';
 import { Download, Share2, RotateCcw, Camera, Layers } from 'lucide-react';
 import { ClothingItem, LightingSettings } from '../types';
+import ErrorService from '../services/errorService';

 interface VirtualTryOnProps {
   userPhoto: string;
   selectedItems: ClothingItem[];
   lightingSettings: LightingSettings;
   onRemoveItem: (itemId: string) => void;
 }

 export const VirtualTryOn: React.FC<VirtualTryOnProps> = ({
   userPhoto,
   selectedItems,
   lightingSettings,
   onRemoveItem
 }) => {
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const [isProcessing, setIsProcessing] = useState(false);
+  const [processingStage, setProcessingStage] = useState('');
+  const [processingProgress, setProcessingProgress] = useState(0);
+  const [error, setError] = useState<string | null>(null);
+  const errorService = ErrorService.getInstance();
+
+  useEffect(() => {
+    if (userPhoto && selectedItems.length > 0) {
+      processVirtualTryOn();
+    }
+  }, [userPhoto, selectedItems, lightingSettings]);
+
+  const processVirtualTryOn = async () => {
+    setIsProcessing(true);
+    setError(null);
+    setProcessingProgress(0);
+    setProcessingStage('Initializing...');
+
+    try {
+      // Step 1: Load user image
+      setProcessingStage('Loading image...');
+      setProcessingProgress(20);
+      
+      const img = new Image();
+      img.crossOrigin = 'anonymous';
+      
+      await new Promise((resolve, reject) => {
+        img.onload = resolve;
+        img.onerror = () => reject(new Error('Failed to load user image'));
+        img.src = userPhoto;
+      });
+
+      // Step 2: Process with canvas
+      setProcessingStage('Processing virtual try-on...');
+      setProcessingProgress(50);
+      
+      await renderVirtualTryOn(img);
+      
+      // Step 3: Apply lighting effects
+      setProcessingStage('Applying lighting effects...');
+      setProcessingProgress(80);
+      
+      await applyLightingEffects();
+      
+      // Step 4: Complete
+      setProcessingStage('Complete!');
+      setProcessingProgress(100);
+      
+      setTimeout(() => {
+        setProcessingStage('');
+        setProcessingProgress(0);
+      }, 1000);
+      
+    } catch (error) {
+      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
+      setError(errorMessage);
+      errorService.logError(error as Error, {
+        component: 'VirtualTryOn',
+        action: 'processVirtualTryOn',
+        userPhoto: !!userPhoto,
+        itemCount: selectedItems.length
+      });
+    } finally {
+      setIsProcessing(false);
+    }
+  };
+
+  const renderVirtualTryOn = async (userImg: HTMLImageElement) => {
+    if (!canvasRef.current) return;
+
+    const canvas = canvasRef.current;
+    const ctx = canvas.getContext('2d');
+    if (!ctx) throw new Error('Canvas context not available');
+
+    // Set canvas size
+    canvas.width = 400;
+    canvas.height = 600;
+
+    // Draw user photo
+    ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);
+
+    // Draw clothing items
+    for (const [index, item] of selectedItems.entries()) {
+      try {
+        const clothingImg = new Image();
+        clothingImg.crossOrigin = 'anonymous';
+        
+        await new Promise((resolve, reject) => {
+          clothingImg.onload = resolve;
+          clothingImg.onerror = () => reject(new Error(`Failed to load clothing item: ${item.name}`));
+          clothingImg.src = item.overlayImage;
+        });
+
+        // Apply basic positioning and blending
+        ctx.globalAlpha = 0.8;
+        ctx.globalCompositeOperation = 'multiply';
+        
+        // Simple positioning based on item category
+        let x = 0, y = 0, width = canvas.width, height = canvas.height;
+        
+        switch (item.category) {
+          case 'tops':
+            y = canvas.height * 0.2;
+            height = canvas.height * 0.5;
+            break;
+          case 'bottoms':
+            y = canvas.height * 0.5;
+            height = canvas.height * 0.5;
+            break;
+          case 'dresses':
+            y = canvas.height * 0.2;
+            height = canvas.height * 0.7;
+            break;
+          case 'outerwear':
+            y = canvas.height * 0.15;
+            height = canvas.height * 0.6;
+            break;
+        }
+        
+        ctx.drawImage(clothingImg, x, y, width, height);
+        
+      } catch (error) {
+        console.warn(`Failed to render clothing item: ${item.name}`, error);
+        errorService.logWarning(`Failed to render clothing item: ${item.name}`, {
+          component: 'VirtualTryOn',
+          action: 'renderVirtualTryOn',
+          itemId: item.id
+        });
+      }
+    }
+
+    // Reset canvas state
+    ctx.globalAlpha = 1;
+    ctx.globalCompositeOperation = 'source-over';
+  };
+
+  const applyLightingEffects = async () => {
+    if (!canvasRef.current) return;
+
+    const canvas = canvasRef.current;
+    const ctx = canvas.getContext('2d');
+    if (!ctx) return;
+
+    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
+    const data = imageData.data;
+
+    const { brightness, contrast, warmth } = lightingSettings;
+
+    // Apply lighting adjustments
+    for (let i = 0; i < data.length; i += 4) {
+      let r = data[i];
+      let g = data[i + 1];
+      let b = data[i + 2];
+
+      // Apply brightness
+      if (brightness !== 100) {
+        const brightnessFactor = brightness / 100;
+        r = Math.min(255, Math.max(0, r * brightnessFactor));
+        g = Math.min(255, Math.max(0, g * brightnessFactor));
+        b = Math.min(255, Math.max(0, b * brightnessFactor));
+      }
+
+      // Apply contrast
+      if (contrast !== 100) {
+        const contrastFactor = contrast / 100;
+        r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128));
+        g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128));
+        b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128));
+      }
+
+      // Apply warmth
+      if (warmth !== 50) {
+        const warmthFactor = (warmth - 50) / 50;
+        if (warmthFactor > 0) {
+          r = Math.min(255, r + warmthFactor * 20);
+          g = Math.min(255, g + warmthFactor * 10);
+          b = Math.max(0, b - warmthFactor * 15);
+        } else {
+          r = Math.max(0, r + warmthFactor * 15);
+          g = Math.max(0, g + warmthFactor * 10);
+          b = Math.min(255, b - warmthFactor * 20);
+        }
+      }
+
+      data[i] = r;
+      data[i + 1] = g;
+      data[i + 2] = b;
+    }
+
+    ctx.putImageData(imageData, 0, 0);
+  };

   // Apply lighting effects based on settings
   const getLightingStyle = () => {
@@ .. @@
   const exportImage = async () => {
     setIsProcessing(true);
-    // Simulate processing time
-    setTimeout(() => {
+    
+    try {
+      if (!canvasRef.current) {
+        throw new Error('Canvas not available for export');
+      }
+
+      const canvas = canvasRef.current;
+      const dataURL = canvas.toDataURL('image/jpeg', 0.9);
+      
+      // Create download link
+      const link = document.createElement('a');
+      link.download = `virtualfit-tryon-${Date.now()}.jpg`;
+      link.href = dataURL;
+      document.body.appendChild(link);
+      link.click();
+      document.body.removeChild(link);
+      
+    } catch (error) {
+      const errorMessage = error instanceof Error ? error.message : 'Export failed';
+      setError(errorMessage);
+      errorService.logError(error as Error, {
+        component: 'VirtualTryOn',
+        action: 'exportImage'
+      });
+    } finally {
       setIsProcessing(false);
-      // In a real app, this would generate and download the composed image
-      alert('Image exported! (Demo mode)');
-    }, 2000);
+    }
   };

   const shareImage = () => {
-    // In a real app, this would share the composed image
-    if (navigator.share) {
-      navigator.share({
-        title: 'My Virtual Try-On',
-        text: 'Check out my virtual try-on!',
-        url: window.location.href
-      });
-    } else {
-      alert('Sharing feature would be available here!');
+    try {
+      if (!canvasRef.current) {
+        throw new Error('Canvas not available for sharing');
+      }
+
+      const canvas = canvasRef.current;
+      
+      if (navigator.share && navigator.canShare) {
+        canvas.toBlob(async (blob) => {
+          if (blob) {
+            const file = new File([blob], 'virtualfit-tryon.jpg', { type: 'image/jpeg' });
+            
+            try {
+              await navigator.share({
+                title: 'My Virtual Try-On',
+                text: 'Check out my AI-powered virtual try-on!',
+                files: [file]
+              });
+            } catch (shareError) {
+              // Fallback to URL sharing
+              await navigator.share({
+                title: 'My Virtual Try-On',
+                text: 'Check out my virtual try-on!',
+                url: window.location.href
+              });
+            }
+          }
+        }, 'image/jpeg', 0.8);
+      } else {
+        // Fallback: copy to clipboard
+        navigator.clipboard.writeText(window.location.href).then(() => {
+          alert('Link copied to clipboard!');
+        }).catch(() => {
+          alert('Sharing not supported on this device');
+        });
+      }
+    } catch (error) {
+      const errorMessage = error instanceof Error ? error.message : 'Sharing failed';
+      setError(errorMessage);
+      errorService.logError(error as Error, {
+        component: 'VirtualTryOn',
+        action: 'shareImage'
+      });
     }
   };

   return (
@@ .. @@
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
               <span className="text-sm">Export</span>
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
+
+        {/* Processing Progress */}
+        {isProcessing && (
+          <div className="mt-3">
+            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
+              <span>{processingStage}</span>
+              <span>{processingProgress}%</span>
+            </div>
+            <div className="w-full bg-gray-200 rounded-full h-2">
+              <div 
+                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
+                style={{ width: `${processingProgress}%` }}
+              />
+            </div>
+          </div>
+        )}
+
+        {/* Error Display */}
+        {error && (
+          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
+            <p className="text-red-800 text-sm">{error}</p>
+            <button
+              onClick={() => setError(null)}
+              className="text-red-600 hover:text-red-800 text-xs mt-1"
+            >
+              Dismiss
+            </button>
+          </div>
+        )}
       </div>

       <div className="relative">
         {userPhoto ? (
-          <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
-            {/* User Photo with Lighting Effects */}
-            <img
-              src={userPhoto}
-              alt="User"
-              className="w-full h-full object-cover"
-              style={getLightingStyle()}
-            />
-            
-            {/* Clothing Overlays */}
-            {selectedItems.map((item, index) => (
-              <div
-                key={item.id}
-                className="absolute inset-0 pointer-events-none"
-                style={{
-                  zIndex: 10 + index,
-                  ...getLightingStyle()
-                }}
-              >
-                <img
-                  src={item.overlayImage}
-                  alt={item.name}
-                  className="w-full h-full object-cover mix-blend-multiply opacity-80"
-                />
-              </div>
-            ))}
-            
-            {/* Loading Overlay */}
-            {isProcessing && (
-              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
-                <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
-                  <RotateCcw className="animate-spin text-indigo-600" size={20} />
-                  <span className="text-gray-800 font-medium">Processing...</span>
-                </div>
-              </div>
-            )}
+          <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden flex items-center justify-center">
+            <canvas
+              ref={canvasRef}
+              className="max-w-full max-h-full object-contain"
+              style={{ 
+                filter: isProcessing ? 'blur(2px)' : 'none',
+                transition: 'filter 0.3s ease'
+              }}
+            />
+            
+            {/* Processing Overlay */}
+            {isProcessing && (
+              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
+                <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-3 max-w-xs">
+                  <RotateCcw className="animate-spin text-indigo-600" size={24} />
+                  <div className="text-center">
+                    <p className="text-gray-800 font-medium">{processingStage}</p>
+                    <p className="text-gray-600 text-sm">{processingProgress}%</p>
+                  </div>
+                  <div className="w-full bg-gray-200 rounded-full h-2">
+                    <div 
+                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
+                      style={{ width: `${processingProgress}%` }}
+                    />
+                  </div>
+                </div>
+              </div>
+            )}
           </div>
         ) : (
           <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
             <div className="text-center">
               <Camera className="mx-auto text-gray-400 mb-3" size={48} />
               <p className="text-gray-600 font-medium">Upload a photo to start</p>
-              <p className="text-gray-500 text-sm mt-1">Your virtual try-on will appear here</p>
+              <p className="text-gray-500 text-sm mt-1">Your AI-powered virtual try-on will appear here</p>
             </div>
           </div>
         )}
       </div>
@@ .. @@
       {/* Lighting Info */}
       <div className="px-4 pb-4">
         <div className="bg-gray-50 rounded-lg p-3">
           <p className="text-xs text-gray-600">
             <span className="font-medium">Current Lighting:</span> {lightingSettings.scenario.charAt(0).toUpperCase() + lightingSettings.scenario.slice(1)} 
             • Brightness: {lightingSettings.brightness}% 
             • Warmth: {lightingSettings.warmth}%
+            {error && <span className="text-red-600 ml-2">• Error: {error}</span>}
           </p>
         </div>
       </div>
     </div>
   );
 };