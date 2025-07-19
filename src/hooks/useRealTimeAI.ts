import { useState, useEffect, useCallback, useRef } from 'react';
import { RealAIService, EnhancedBodyPose, EnhancedBodySegmentation } from '../services/realAIService';
import { ClothingItem } from '../types';
import ErrorService from '../services/errorService';

export const useRealTimeAI = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPose, setCurrentPose] = useState<EnhancedBodyPose | null>(null);
  const [currentSegmentation, setCurrentSegmentation] = useState<EnhancedBodySegmentation | null>(null);
  const [processingQueue, setProcessingQueue] = useState<ImageData[]>([]);
  const [performance, setPerformance] = useState({
    fps: 0,
    avgProcessingTime: 0,
    totalFrames: 0
  });

  const aiService = RealAIService.getInstance();
  const errorService = ErrorService.getInstance();
  const processingRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const processingTimesRef = useRef<number[]>([]);

  useEffect(() => {
    initializeAI();
    return () => {
      // Cleanup
      setProcessingQueue([]);
    };
  }, []);

  const initializeAI = async () => {
    try {
      await aiService.initialize();
      setIsInitialized(true);
    } catch (error) {
      errorService.logError(error as Error, {
        component: 'useRealTimeAI',
        action: 'initialize'
      });
    }
  };

  const processFrame = useCallback(async (imageData: ImageData) => {
    if (!isInitialized || processingRef.current) return;

    // Add to queue if processing
    if (isProcessing) {
      setProcessingQueue(prev => [...prev.slice(-2), imageData]); // Keep only last 3 frames
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    
    const startTime = Date.now();

    try {
      // Convert ImageData to HTMLImageElement
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);

      const img = new Image();
      img.src = canvas.toDataURL();
      
      await new Promise(resolve => {
        img.onload = resolve;
      });

      // Process pose detection
      const pose = await aiService.detectBodyPose(img);
      setCurrentPose(pose);

      // Process segmentation (less frequently for performance)
      if (frameCountRef.current % 5 === 0) {
        const segmentation = await aiService.segmentBody(img);
        setCurrentSegmentation(segmentation);
      }

      // Update performance metrics
      const processingTime = Date.now() - startTime;
      processingTimesRef.current.push(processingTime);
      
      if (processingTimesRef.current.length > 30) {
        processingTimesRef.current = processingTimesRef.current.slice(-30);
      }

      const avgProcessingTime = processingTimesRef.current.reduce((a, b) => a + b, 0) / processingTimesRef.current.length;
      
      frameCountRef.current++;
      const now = Date.now();
      const timeDiff = now - lastFrameTimeRef.current;
      
      if (timeDiff >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / timeDiff);
        setPerformance({
          fps,
          avgProcessingTime: Math.round(avgProcessingTime),
          totalFrames: frameCountRef.current
        });
        lastFrameTimeRef.current = now;
        frameCountRef.current = 0;
      }

    } catch (error) {
      errorService.logError(error as Error, {
        component: 'useRealTimeAI',
        action: 'processFrame'
      });
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
      
      // Process next frame in queue
      if (processingQueue.length > 0) {
        const nextFrame = processingQueue[processingQueue.length - 1];
        setProcessingQueue([]);
        setTimeout(() => processFrame(nextFrame), 16); // ~60fps limit
      }
    }
  }, [isInitialized, isProcessing, processingQueue]);

  const fitClothingRealTime = useCallback(async (
    clothingItems: ClothingItem[]
  ): Promise<RealTimeFitResult[]> => {
    if (!currentPose || !currentSegmentation) {
      return [];
    }

    try {
      const fitResults = await Promise.all(
        clothingItems.map(item => 
          aiService.fitClothingToBody(currentPose, item, currentSegmentation)
        )
      );

      return fitResults.map((result, index) => ({
        item: clothingItems[index],
        fitResult: result,
        confidence: result.fitScore,
        realTimeOptimized: true
      }));
    } catch (error) {
      errorService.logError(error as Error, {
        component: 'useRealTimeAI',
        action: 'fitClothingRealTime'
      });
      return [];
    }
  }, [currentPose, currentSegmentation]);

  const getRealtimeRecommendations = useCallback(async (
    userProfile: any,
    context: any
  ) => {
    if (!currentPose) return [];

    try {
      const bodyMeasurements = currentPose.bodyMeasurements;
      // This would typically fetch from a smaller, faster model
      // or use cached recommendations updated less frequently
      return [];
    } catch (error) {
      errorService.logError(error as Error, {
        component: 'useRealTimeAI',
        action: 'getRealtimeRecommendations'
      });
      return [];
    }
  }, [currentPose]);

  const optimizeForRealTime = useCallback((enabled: boolean) => {
    // Adjust processing frequency and quality for real-time performance
    if (enabled) {
      // Reduce processing frequency, lower quality settings
      processingTimesRef.current = [];
      frameCountRef.current = 0;
    }
  }, []);

  return {
    isInitialized,
    isProcessing,
    currentPose,
    currentSegmentation,
    performance,
    processFrame,
    fitClothingRealTime,
    getRealtimeRecommendations,
    optimizeForRealTime
  };
};

export interface RealTimeFitResult {
  item: ClothingItem;
  fitResult: any;
  confidence: number;
  realTimeOptimized: boolean;
}