class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fps: 0,
    memoryUsage: 0,
    loadTime: 0,
    renderTime: 0,
    aiProcessingTime: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    errorRate: 0
  };
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.startFPSMonitoring();
    this.startMemoryMonitoring();
    this.startNetworkMonitoring();
    
    console.log('Performance monitoring started');
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    console.log('Performance monitoring stopped');
  }

  private setupPerformanceObservers(): void {
    // Navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              this.metrics.loadTime = entry.loadEventEnd - entry.loadEventStart;
            }
          });
        });
        
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (error) {
        console.warn('Navigation observer not supported');
      }

      // Resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name.includes('/api/')) {
              this.metrics.networkLatency = entry.responseEnd - entry.requestStart;
            }
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource observer not supported');
      }

      // Long task monitoring
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > 50) {
              console.warn('Long task detected:', entry.duration + 'ms');
              this.recordLongTask(entry);
            }
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported');
      }

      // Layout shift monitoring
      try {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.value > 0.1) {
              console.warn('Layout shift detected:', entry.value);
              this.recordLayoutShift(entry);
            }
          });
        });
        
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutShiftObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported');
      }
    }
  }

  private startFPSMonitoring(): void {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = (currentTime: number) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        
        // Trigger performance adjustment if FPS is low
        if (this.metrics.fps < 30) {
          this.triggerPerformanceOptimization();
        }
      }
      
      if (this.isMonitoring) {
        requestAnimationFrame(measureFPS);
      }
    };
    
    requestAnimationFrame(measureFPS);
  }

  private startMemoryMonitoring(): void {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = Math.round(
          (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        );
        
        // Trigger memory cleanup if usage is high
        if (this.metrics.memoryUsage > 80) {
          this.triggerMemoryCleanup();
        }
      }
      
      if (this.isMonitoring) {
        setTimeout(measureMemory, 5000); // Check every 5 seconds
      }
    };
    
    measureMemory();
  }

  private startNetworkMonitoring(): void {
    // Monitor network connection
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        this.recordNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
      };
      
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }
  }

  // Performance measurement methods
  measureRenderTime(startTime: number): void {
    this.metrics.renderTime = performance.now() - startTime;
  }

  measureAIProcessingTime(startTime: number): void {
    this.metrics.aiProcessingTime = performance.now() - startTime;
  }

  recordCacheHit(hit: boolean): void {
    // Simple cache hit rate calculation
    const currentRate = this.metrics.cacheHitRate;
    this.metrics.cacheHitRate = (currentRate * 0.9) + (hit ? 0.1 : 0);
  }

  recordError(): void {
    // Simple error rate calculation
    this.metrics.errorRate = Math.min(this.metrics.errorRate + 0.01, 1);
  }

  recordSuccess(): void {
    // Decrease error rate on success
    this.metrics.errorRate = Math.max(this.metrics.errorRate - 0.001, 0);
  }

  // Performance optimization triggers
  private triggerPerformanceOptimization(): void {
    document.dispatchEvent(new CustomEvent('performance:optimize', {
      detail: {
        reason: 'low-fps',
        fps: this.metrics.fps,
        recommendations: [
          'Reduce rendering quality',
          'Disable shadows and reflections',
          'Use lower resolution textures'
        ]
      }
    }));
  }

  private triggerMemoryCleanup(): void {
    document.dispatchEvent(new CustomEvent('performance:memory-cleanup', {
      detail: {
        reason: 'high-memory-usage',
        usage: this.metrics.memoryUsage,
        recommendations: [
          'Clear image caches',
          'Dispose unused AI models',
          'Reduce concurrent processing'
        ]
      }
    }));
  }

  private recordLongTask(entry: any): void {
    document.dispatchEvent(new CustomEvent('performance:long-task', {
      detail: {
        duration: entry.duration,
        startTime: entry.startTime,
        name: entry.name
      }
    }));
  }

  private recordLayoutShift(entry: any): void {
    document.dispatchEvent(new CustomEvent('performance:layout-shift', {
      detail: {
        value: entry.value,
        sources: entry.sources
      }
    }));
  }

  private recordNetworkInfo(info: any): void {
    document.dispatchEvent(new CustomEvent('performance:network-change', {
      detail: info
    }));
  }

  // Core Web Vitals measurement
  measureCoreWebVitals(): CoreWebVitals {
    const vitals: CoreWebVitals = {
      lcp: 0, // Largest Contentful Paint
      fid: 0, // First Input Delay
      cls: 0, // Cumulative Layout Shift
      fcp: 0, // First Contentful Paint
      ttfb: 0 // Time to First Byte
    };

    // Measure LCP
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP measurement not supported');
      }

      // Measure FID
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            vitals.fid = entry.processingStart - entry.startTime;
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID measurement not supported');
      }

      // Measure CLS
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          vitals.cls = clsValue;
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS measurement not supported');
      }
    }

    return vitals;
  }

  // Performance reporting
  generatePerformanceReport(): PerformanceReport {
    const vitals = this.measureCoreWebVitals();
    
    return {
      timestamp: new Date(),
      metrics: { ...this.metrics },
      coreWebVitals: vitals,
      deviceInfo: this.getDeviceInfo(),
      recommendations: this.generateRecommendations()
    };
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory,
      connection: (navigator as any).connection,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      }
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.metrics.fps < 30) {
      recommendations.push('Consider reducing rendering quality for better performance');
    }
    
    if (this.metrics.memoryUsage > 70) {
      recommendations.push('High memory usage detected - consider clearing caches');
    }
    
    if (this.metrics.loadTime > 3000) {
      recommendations.push('Slow loading detected - optimize asset loading');
    }
    
    if (this.metrics.aiProcessingTime > 5000) {
      recommendations.push('AI processing is slow - consider using lighter models');
    }
    
    if (this.metrics.errorRate > 0.1) {
      recommendations.push('High error rate detected - check error logs');
    }
    
    return recommendations;
  }

  // Public API
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getPerformanceScore(): number {
    // Calculate overall performance score (0-100)
    let score = 100;
    
    // FPS penalty
    if (this.metrics.fps < 60) score -= (60 - this.metrics.fps) * 0.5;
    
    // Memory penalty
    if (this.metrics.memoryUsage > 50) score -= (this.metrics.memoryUsage - 50) * 0.3;
    
    // Load time penalty
    if (this.metrics.loadTime > 2000) score -= (this.metrics.loadTime - 2000) / 100;
    
    // Error rate penalty
    score -= this.metrics.errorRate * 50;
    
    return Math.max(0, Math.min(100, score));
  }

  isPerformanceGood(): boolean {
    return this.getPerformanceScore() > 70;
  }
}

// Interfaces
interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  aiProcessingTime: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface DeviceInfo {
  userAgent: string;
  platform: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: any;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
}

interface PerformanceReport {
  timestamp: Date;
  metrics: PerformanceMetrics;
  coreWebVitals: CoreWebVitals;
  deviceInfo: DeviceInfo;
  recommendations: string[];
}

export default PerformanceMonitor;