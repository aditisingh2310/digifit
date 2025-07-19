import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, CameraOff, RotateCcw, Download, Settings, Zap } from 'lucide-react';

interface RealTimeCameraProps {
  onCapture: (imageSrc: string) => void;
  isActive: boolean;
  onToggle: () => void;
  onRealTimeProcess?: (imageData: ImageData) => void;
}

export const RealTimeCamera: React.FC<RealTimeCameraProps> = ({
  onCapture,
  isActive,
  onToggle,
  onRealTimeProcess
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({
    resolution: 'hd' as 'vga' | 'hd' | 'fhd',
    frameRate: 30,
    autoFocus: true
  });

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
      focusMode: cameraSettings.autoFocus ? 'continuous' : 'manual'
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
    if (!isRealTimeMode && onRealTimeProcess) {
      startRealTimeProcessing();
    }
  };

  const startRealTimeProcessing = () => {
    if (!webcamRef.current || !onRealTimeProcess) return;
    
    const processFrame = () => {
      if (!isRealTimeMode) return;
      
      const video = webcamRef.current?.video;
      if (video) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx?.drawImage(video, 0, 0);
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        
        if (imageData) {
          onRealTimeProcess(imageData);
        }
      }
      
      if (isRealTimeMode) {
        requestAnimationFrame(processFrame);
      }
    };
    
    requestAnimationFrame(processFrame);
  };
  if (!isActive) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center">
        <Camera className="mx-auto text-gray-400 mb-3" size={48} />
        <p className="text-gray-600 font-medium mb-4">Real-Time Camera Try-On</p>
        <p className="text-gray-500 text-sm mb-4">
          Experience live virtual try-on with AI-powered pose detection
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
                <span>Real-time AI</span>
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
      </div>

      <div className="relative">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={getVideoConstraints()}
          className="w-full h-auto"
          mirrored={facingMode === 'user'}
        />
        
        {isCapturing && (
          <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 shadow-lg">
              <p className="text-gray-800 font-medium">Capturing...</p>
            </div>
          </div>
        )}

        {/* Enhanced overlay guides */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Head guide */}
          <div className="absolute top-1/6 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-6 h-6 border-2 border-white rounded-full opacity-70 animate-pulse"></div>
            <p className="text-white text-xs mt-1 text-center font-medium">Head</p>
          </div>
          
          {/* Shoulder guides */}
          <div className="absolute top-1/3 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-white rounded-full opacity-50"></div>
          </div>
          <div className="absolute top-1/3 right-1/3 transform translate-x-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-white rounded-full opacity-50"></div>
          </div>
          
          {/* Body center guide */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-white rounded-full opacity-70"></div>
            <p className="text-white text-xs mt-1 text-center font-medium">Body Center</p>
          </div>
          
          {/* Frame guide */}
          <div className="absolute inset-4 border-2 border-white border-dashed opacity-30 rounded-lg"></div>
          
          {/* Real-time processing indicator */}
          {isRealTimeMode && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Live AI Processing
            </div>
          )}
        </div>
        
        {/* Performance overlay */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {cameraSettings.resolution.toUpperCase()} • {cameraSettings.frameRate}fps
          {isRealTimeMode && ' • AI Active'}
        </div>
      </div>

      <div className="p-4 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <p>
            Position yourself in the frame for optimal results
          </p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Camera Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};