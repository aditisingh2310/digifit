import React, { useState, useRef, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CameraOff, RotateCcw, Download, Settings, Zap, Eye, Play, Pause, Square } from 'lucide-react';
import { ClothingItem, LightingSettings } from '../types';
import RealTimeProcessingService from '../services/realTimeProcessing';

interface RealTimeTryOnProps {
  selectedItems: ClothingItem[];
  lightingSettings: LightingSettings;
  onCapture: (imageSrc: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export const RealTimeTryOn: React.FC<RealTimeTryOnProps> = ({
  selectedItems,
  lightingSettings,
  onCapture,
  isActive,
  onToggle
}) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({
    resolution: 'hd' as 'vga' | 'hd' | 'fhd',
    frameRate: 30,
    autoFocus: true,
    exposureCompensation: 0,
    whiteBalance: 'auto' as 'auto' | 'daylight' | 'fluorescent' | 'incandescent'
  });
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    fps: 0,
    processingTime: 0,
    accuracy: 0
  });
  const [currentPose, setCurrentPose] = useState<any>(null);
  const [currentSegmentation, setCurrentSegmentation] = useState<any>(null);

  const realTimeService = RealTimeProcessingService.getInstance();

  useEffect(() => {
    if (isActive) {
      realTimeService.initialize();
    }
    
    return () => {
      if (isRealTimeMode) {
        setIsRealTimeMode(false);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (isRealTimeMode && isActive) {
      startRealTimeProcessing();
    }
  }, [isRealTimeMode, isActive, selectedItems]);

  const getVideoConstraints = () => {
    const resolutions = {
      vga: { width: 640, height: 480 },
      hd: { width: 1280, height: 720 },
      fhd: { width: 1920, height: 1080 }
    };
    
    return {
      ...resolutions[cameraSettings.resolution],
      facingMode: facingMode,
      frameRate: cameraSettings.frameRate,
      focusMode: cameraSettings.autoFocus ? 'continuous' : 'manual',
      exposureCompensation: cameraSettings.exposureCompensation,
      whiteBalanceMode: cameraSettings.whiteBalance
    };
  };

  const capture = useCallback(() => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    
    setTimeout(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        onCapture(imageSrc);
      }
      setIsCapturing(false);
    }, 100);
  }, [onCapture]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleRealTimeMode = () => {
    setIsRealTimeMode(!isRealTimeMode);
  };

  const startRealTimeProcessing = () => {
    if (!webcamRef.current || !isRealTimeMode) return;
    
    const processFrame = async () => {
      if (!isRealTimeMode || !webcamRef.current) return;
      
      const video = webcamRef.current.video;
      if (video && video.readyState === 4) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const startTime = Date.now();
          
          const result = await realTimeService.processRealTime(imageData, {
            enablePoseDetection: true,
            enableBodySegmentation: true,
            enableClothingFit: selectedItems.length > 0,
            clothingItems: selectedItems,
            quality: 'medium'
          });
          
          const processingTime = Date.now() - startTime;
          
          // Update metrics
          setRealTimeMetrics(prev => ({
            fps: Math.round(1000 / Math.max(processingTime, 16)),
            processingTime,
            accuracy: result.pose?.confidence * 100 || 0
          }));
          
          // Update pose and segmentation
          setCurrentPose(result.pose);
          setCurrentSegmentation(result.segmentation);
          
          // Render results on canvas
          if (canvasRef.current) {
            renderRealTimeResults(result);
          }
          
        } catch (error) {
          console.error('Real-time processing error:', error);
        }
      }
      
      if (isRealTimeMode) {
        requestAnimationFrame(processFrame);
      }
    };
    
    requestAnimationFrame(processFrame);
  };

  const renderRealTimeResults = (result: any) => {
    if (!canvasRef.current || !webcamRef.current?.video) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const video = webcamRef.current.video;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw pose keypoints if available
    if (result.pose && result.pose.keypoints) {
      this.drawPoseKeypoints(ctx, result.pose.keypoints, canvas.width, canvas.height);
    }
    
    // Draw body segmentation if available
    if (result.segmentation && result.segmentation.mask) {
      this.drawBodySegmentation(ctx, result.segmentation.mask);
    }
    
    // Draw clothing fit if available
    if (result.clothingFit && selectedItems.length > 0) {
      this.drawClothingFit(ctx, result.clothingFit, selectedItems);
    }
  };

  private drawPoseKeypoints(ctx: CanvasRenderingContext2D, keypoints: any[], width: number, height: number) {
    ctx.strokeStyle = '#00ff00';
    ctx.fillStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    // Draw keypoints
    keypoints.forEach(keypoint => {
      if (keypoint.confidence > 0.5) {
        const x = keypoint.x * width;
        const y = keypoint.y * height;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
    
    // Draw skeleton connections
    const connections = [
      ['leftShoulder', 'rightShoulder'],
      ['leftShoulder', 'leftElbow'],
      ['leftElbow', 'leftWrist'],
      ['rightShoulder', 'rightElbow'],
      ['rightElbow', 'rightWrist'],
      ['leftShoulder', 'leftHip'],
      ['rightShoulder', 'rightHip'],
      ['leftHip', 'rightHip'],
      ['leftHip', 'leftKnee'],
      ['leftKnee', 'leftAnkle'],
      ['rightHip', 'rightKnee'],
      ['rightKnee', 'rightAnkle']
    ];
    
    connections.forEach(([start, end]) => {
      const startPoint = keypoints.find(kp => kp.name === start);
      const endPoint = keypoints.find(kp => kp.name === end);
      
      if (startPoint && endPoint && startPoint.confidence > 0.5 && endPoint.confidence > 0.5) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x * width, startPoint.y * height);
        ctx.lineTo(endPoint.x * width, endPoint.y * height);
        ctx.stroke();
      }
    });
  }

  private drawBodySegmentation(ctx: CanvasRenderingContext2D, mask: ImageData) {
    // Draw segmentation mask with transparency
    ctx.globalAlpha = 0.3;
    ctx.putImageData(mask, 0, 0);
    ctx.globalAlpha = 1.0;
  }

  private drawClothingFit(ctx: CanvasRenderingContext2D, clothingFit: any, items: ClothingItem[]) {
    // Draw clothing fit visualization
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    
    items.forEach((item, index) => {
      const fit = clothingFit[index];
      if (fit && fit.boundingBox) {
        const { x, y, width, height } = fit.boundingBox;
        ctx.strokeRect(x * ctx.canvas.width, y * ctx.canvas.height, 
                      width * ctx.canvas.width, height * ctx.canvas.height);
        
        // Draw fit score
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '16px Arial';
        ctx.fillText(`${item.name}: ${Math.round(fit.score * 100)}%`, 
                    x * ctx.canvas.width, y * ctx.canvas.height - 5);
      }
    });
  }

  const startRecording = () => {
    setIsRecording(true);
    // Implement video recording functionality
  };

  const stopRecording = () => {
    setIsRecording(false);
    // Stop recording and save video
  };

  if (!isActive) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center">
        <Camera className="mx-auto text-gray-400 mb-3" size={48} />
        <p className="text-gray-600 font-medium mb-4">Real-Time Virtual Try-On</p>
        <p className="text-gray-500 text-sm mb-4">
          Experience live virtual try-on with AI-powered pose detection and clothing fitting
        </p>
        <button
          onClick={onToggle}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Start Camera
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-800">Live Camera Try-On</h3>
            {isRealTimeMode && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <Zap size={12} />
                <span>Real-time AI ({realTimeMetrics.fps} FPS)</span>
              </span>
            )}
            {currentPose && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center space-x-1">
                <Eye size={12} />
                <span>Pose: {Math.round(currentPose.confidence * 100)}%</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleRealTimeMode}
              className={`p-2 rounded-lg transition-colors ${
                isRealTimeMode 
                  ? 'bg-green-100 text-green-800' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
              title="Toggle Real-time Processing"
            >
              <Zap size={16} />
            </button>
            
            <button
              onClick={switchCamera}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="Switch Camera"
            >
              <RotateCcw size={16} />
            </button>
            
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-100"
                title="Start Recording"
              >
                <Play size={16} />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-100"
                title="Stop Recording"
              >
                <Square size={16} />
              </button>
            )}
            
            <button
              onClick={capture}
              disabled={isCapturing}
              className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              <span className="text-sm">Capture</span>
            </button>
            
            <button
              onClick={onToggle}
              className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-red-100"
              title="Stop Camera"
            >
              <CameraOff size={16} />
            </button>
          </div>
        </div>
        
        {/* Camera Settings */}
        <div className="mt-3 flex items-center space-x-4 text-sm">
          <select
            value={cameraSettings.resolution}
            onChange={(e) => setCameraSettings(prev => ({
              ...prev,
              resolution: e.target.value as any
            }))}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="vga">VGA (640x480)</option>
            <option value="hd">HD (1280x720)</option>
            <option value="fhd">FHD (1920x1080)</option>
          </select>
          
          <select
            value={cameraSettings.frameRate}
            onChange={(e) => setCameraSettings(prev => ({
              ...prev,
              frameRate: parseInt(e.target.value)
            }))}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value={15}>15 FPS</option>
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </select>
          
          <select
            value={cameraSettings.whiteBalance}
            onChange={(e) => setCameraSettings(prev => ({
              ...prev,
              whiteBalance: e.target.value as any
            }))}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="auto">Auto WB</option>
            <option value="daylight">Daylight</option>
            <option value="fluorescent">Fluorescent</option>
            <option value="incandescent">Incandescent</option>
          </select>
          
          <label className="flex items-center text-xs">
            <input
              type="checkbox"
              checked={cameraSettings.autoFocus}
              onChange={(e) => setCameraSettings(prev => ({
                ...prev,
                autoFocus: e.target.checked
              }))}
              className="mr-1"
            />
            Auto Focus
          </label>
        </div>

        {/* Real-time Metrics */}
        {isRealTimeMode && (
          <div className="mt-3 flex items-center space-x-4 text-xs text-gray-600">
            <span>FPS: {realTimeMetrics.fps}</span>
            <span>Processing: {realTimeMetrics.processingTime}ms</span>
            <span>Accuracy: {Math.round(realTimeMetrics.accuracy)}%</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="relative">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={getVideoConstraints()}
            className="w-full h-auto"
            mirrored={facingMode === 'user'}
          />
          
          {/* Overlay canvas for real-time visualization */}
          {isRealTimeMode && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ mixBlendMode: 'multiply' }}
            />
          )}
        </div>
        
        {isCapturing && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <p className="text-gray-800 font-medium">Capturing...</p>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>Recording</span>
          </div>
        )}

        {/* Enhanced overlay guides */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Head guide */}
          <div className="absolute top-1/6 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-white rounded-full opacity-70 animate-pulse"></div>
            <p className="text-white text-xs mt-1 text-center font-medium shadow-lg">Head</p>
          </div>
          
          {/* Shoulder guides */}
          <div className="absolute top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white rounded-full opacity-50"></div>
          </div>
          <div className="absolute top-1/3 right-1/3 transform translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-white rounded-full opacity-50"></div>
          </div>
          
          {/* Body center guide */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-10 h-10 border-2 border-white rounded-full opacity-70"></div>
            <p className="text-white text-xs mt-1 text-center font-medium shadow-lg">Body Center</p>
          </div>
          
          {/* Frame guide */}
          <div className="absolute inset-4 border-2 border-white border-dashed opacity-30 rounded-lg"></div>
          
          {/* Real-time processing indicator */}
          {isRealTimeMode && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Live AI Processing
            </div>
          )}
          
          {/* Clothing items overlay */}
          {selectedItems.length > 0 && (
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
              <p className="text-sm font-medium">Trying on {selectedItems.length} item(s)</p>
              <div className="flex space-x-2 mt-1">
                {selectedItems.slice(0, 3).map(item => (
                  <div key={item.id} className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                    {item.name}
                  </div>
                ))}
                {selectedItems.length > 3 && (
                  <div className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                    +{selectedItems.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Performance overlay */}
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {cameraSettings.resolution.toUpperCase()} • {cameraSettings.frameRate}fps
          {isRealTimeMode && ` • AI: ${realTimeMetrics.fps}fps`}
        </div>
      </div>

      <div className="p-4 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <p>
            Position yourself in the frame for optimal results
            {isRealTimeMode && ' • Real-time AI analysis active'}
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Camera Active</span>
            </div>
            {isRealTimeMode && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>AI Processing</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};