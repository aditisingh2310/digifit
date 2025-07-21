class CompatibilityManager {
  private static instance: CompatibilityManager;
  private supportedFeatures: SupportedFeatures = {
    webgl: false,
    webgl2: false,
    webassembly: false,
    webworkers: false,
    indexeddb: false,
    serviceworker: false,
    mediadevices: false,
    webrtc: false
  };
  private fallbackStrategies: FallbackStrategies = {};

  static getInstance(): CompatibilityManager {
    if (!CompatibilityManager.instance) {
      CompatibilityManager.instance = new CompatibilityManager();
    }
    return CompatibilityManager.instance;
  }

  async initialize(): Promise<void> {
    await this.detectFeatureSupport();
    this.setupFallbackStrategies();
    this.setupPolyfills();
  }

  private async detectFeatureSupport(): Promise<void> {
    // WebGL Support
    const canvas = document.createElement('canvas');
    this.supportedFeatures.webgl = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    this.supportedFeatures.webgl2 = !!canvas.getContext('webgl2');

    // WebAssembly Support
    this.supportedFeatures.webassembly = typeof WebAssembly === 'object';

    // Web Workers Support
    this.supportedFeatures.webworkers = typeof Worker !== 'undefined';

    // IndexedDB Support
    this.supportedFeatures.indexeddb = 'indexedDB' in window;

    // Service Worker Support
    this.supportedFeatures.serviceworker = 'serviceWorker' in navigator;

    // Media Devices Support
    this.supportedFeatures.mediadevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    // WebRTC Support
    this.supportedFeatures.webrtc = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
  }

  private setupFallbackStrategies(): void {
    // WebGL Fallback
    if (!this.supportedFeatures.webgl) {
      this.fallbackStrategies.webgl = {
        strategy: 'canvas2d',
        implementation: this.setupCanvas2DFallback.bind(this)
      };
    }

    // WebAssembly Fallback
    if (!this.supportedFeatures.webassembly) {
      this.fallbackStrategies.webassembly = {
        strategy: 'javascript',
        implementation: this.setupJavaScriptFallback.bind(this)
      };
    }

    // Web Workers Fallback
    if (!this.supportedFeatures.webworkers) {
      this.fallbackStrategies.webworkers = {
        strategy: 'mainthread',
        implementation: this.setupMainThreadFallback.bind(this)
      };
    }

    // IndexedDB Fallback
    if (!this.supportedFeatures.indexeddb) {
      this.fallbackStrategies.indexeddb = {
        strategy: 'localstorage',
        implementation: this.setupLocalStorageFallback.bind(this)
      };
    }

    // Media Devices Fallback
    if (!this.supportedFeatures.mediadevices) {
      this.fallbackStrategies.mediadevices = {
        strategy: 'fileupload',
        implementation: this.setupFileUploadFallback.bind(this)
      };
    }
  }

  private setupPolyfills(): void {
    // Intersection Observer Polyfill
    if (!('IntersectionObserver' in window)) {
      this.loadPolyfill('intersection-observer');
    }

    // ResizeObserver Polyfill
    if (!('ResizeObserver' in window)) {
      this.loadPolyfill('resize-observer');
    }

    // Web Animations API Polyfill
    if (!('animate' in Element.prototype)) {
      this.loadPolyfill('web-animations');
    }

    // Fetch Polyfill for older browsers
    if (!('fetch' in window)) {
      this.loadPolyfill('fetch');
    }
  }

  private async loadPolyfill(polyfillName: string): Promise<void> {
    try {
      switch (polyfillName) {
        case 'intersection-observer':
          await import('intersection-observer');
          break;
        case 'resize-observer':
          await import('resize-observer-polyfill');
          break;
        case 'web-animations':
          await import('web-animations-js');
          break;
        case 'fetch':
          await import('whatwg-fetch');
          break;
      }
    } catch (error) {
      console.warn(`Failed to load polyfill: ${polyfillName}`, error);
    }
  }

  // Fallback Implementations
  private setupCanvas2DFallback(): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Implement basic 2D rendering fallback
    return ctx;
  }

  private setupJavaScriptFallback(): any {
    // Implement JavaScript-based computation fallback
    return {
      process: (data: any) => {
        // Pure JavaScript implementation
        return this.processWithJavaScript(data);
      }
    };
  }

  private setupMainThreadFallback(): any {
    // Process on main thread instead of web workers
    return {
      postMessage: (data: any) => {
        // Process immediately on main thread
        setTimeout(() => {
          const result = this.processOnMainThread(data);
          document.dispatchEvent(new CustomEvent('worker:message', { detail: result }));
        }, 0);
      }
    };
  }

  private setupLocalStorageFallback(): Storage {
    // Use localStorage as IndexedDB fallback
    return {
      ...localStorage,
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Handle quota exceeded
          this.clearOldLocalStorageItems();
          localStorage.setItem(key, value);
        }
      }
    } as Storage;
  }

  private setupFileUploadFallback(): any {
    // File upload fallback for camera access
    return {
      getUserMedia: () => {
        return Promise.reject(new Error('Camera not supported, please upload a file'));
      },
      createFileInput: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        return input;
      }
    };
  }

  // Browser-specific optimizations
  setupBrowserOptimizations(): void {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Chrome')) {
      this.setupChromeOptimizations();
    } else if (userAgent.includes('Firefox')) {
      this.setupFirefoxOptimizations();
    } else if (userAgent.includes('Safari')) {
      this.setupSafariOptimizations();
    } else if (userAgent.includes('Edge')) {
      this.setupEdgeOptimizations();
    }
  }

  private setupChromeOptimizations(): void {
    // Chrome-specific optimizations
    if ('chrome' in window) {
      // Enable hardware acceleration
      document.body.style.transform = 'translateZ(0)';
    }
  }

  private setupFirefoxOptimizations(): void {
    // Firefox-specific optimizations
    // Disable smooth scrolling for better performance
    document.documentElement.style.scrollBehavior = 'auto';
  }

  private setupSafariOptimizations(): void {
    // Safari-specific optimizations
    // Handle Safari's unique WebGL context limitations
    if (this.supportedFeatures.webgl) {
      // Reduce WebGL context size for Safari
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.style.maxWidth = '1024px';
        canvas.style.maxHeight = '768px';
      }
    }
  }

  private setupEdgeOptimizations(): void {
    // Edge-specific optimizations
    // Handle Edge's unique behavior
  }

  // Mobile-specific optimizations
  setupMobileOptimizations(): void {
    if (this.isMobile()) {
      // Reduce quality for mobile devices
      document.dispatchEvent(new CustomEvent('mobile:optimize'));
      
      // Disable hover effects on mobile
      document.body.classList.add('mobile-device');
      
      // Optimize touch interactions
      this.setupTouchOptimizations();
      
      // Handle orientation changes
      this.setupOrientationHandling();
    }
  }

  private isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private setupTouchOptimizations(): void {
    // Optimize for touch interactions
    document.addEventListener('touchstart', () => {}, { passive: true });
    document.addEventListener('touchmove', () => {}, { passive: true });
    document.addEventListener('touchend', () => {}, { passive: true });
  }

  private setupOrientationHandling(): void {
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('orientation:change'));
      }, 100);
    });
  }

  // Utility methods
  private processWithJavaScript(data: any): any {
    // Implement JavaScript-based processing
    return data;
  }

  private processOnMainThread(data: any): any {
    // Process data on main thread
    return data;
  }

  private clearOldLocalStorageItems(): void {
    // Clear old localStorage items to free space
    const keys = Object.keys(localStorage);
    const oldKeys = keys.filter(key => key.startsWith('virtualfit_cache_'));
    
    // Remove oldest items first
    oldKeys.sort().slice(0, Math.floor(oldKeys.length / 2)).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Public API
  isFeatureSupported(feature: keyof SupportedFeatures): boolean {
    return this.supportedFeatures[feature];
  }

  getFallbackStrategy(feature: keyof SupportedFeatures): FallbackStrategy | null {
    return this.fallbackStrategies[feature] || null;
  }

  getCompatibilityReport(): CompatibilityReport {
    return {
      supportedFeatures: { ...this.supportedFeatures },
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      screenInfo: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth
      },
      performanceInfo: {
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        connection: (navigator as any).connection
      }
    };
  }
}

interface SupportedFeatures {
  webgl: boolean;
  webgl2: boolean;
  webassembly: boolean;
  webworkers: boolean;
  indexeddb: boolean;
  serviceworker: boolean;
  mediadevices: boolean;
  webrtc: boolean;
}

interface FallbackStrategy {
  strategy: string;
  implementation: () => any;
}

interface FallbackStrategies {
  [key: string]: FallbackStrategy;
}

interface CompatibilityReport {
  supportedFeatures: SupportedFeatures;
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
    onLine: boolean;
  };
  screenInfo: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
  };
  performanceInfo: {
    hardwareConcurrency: number;
    deviceMemory?: number;
    connection?: any;
  };
}

export default CompatibilityManager;