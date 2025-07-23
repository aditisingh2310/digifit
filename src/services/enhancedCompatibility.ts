class EnhancedCompatibilityService {
  private static instance: EnhancedCompatibilityService;
  private supportedFeatures: SupportedFeatures = {
    webgl: false,
    webgl2: false,
    webassembly: false,
    webworkers: false,
    indexeddb: false,
    serviceworker: false,
    mediadevices: false,
    webrtc: false,
    offscreencanvas: false,
    imagebitmap: false,
    intersectionobserver: false,
    resizeobserver: false
  };
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private polyfillsLoaded: Set<string> = new Set();

  static getInstance(): EnhancedCompatibilityService {
    if (!EnhancedCompatibilityService.instance) {
      EnhancedCompatibilityService.instance = new EnhancedCompatibilityService();
    }
    return EnhancedCompatibilityService.instance;
  }

  async initialize(): Promise<void> {
    await this.detectAllFeatures();
    await this.setupFallbackStrategies();
    await this.loadRequiredPolyfills();
    this.setupBrowserOptimizations();
    this.setupMobileOptimizations();
  }

  private async detectAllFeatures(): Promise<void> {
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

    // OffscreenCanvas Support
    this.supportedFeatures.offscreencanvas = typeof OffscreenCanvas !== 'undefined';

    // ImageBitmap Support
    this.supportedFeatures.imagebitmap = typeof createImageBitmap !== 'undefined';

    // Intersection Observer Support
    this.supportedFeatures.intersectionobserver = 'IntersectionObserver' in window;

    // Resize Observer Support
    this.supportedFeatures.resizeobserver = 'ResizeObserver' in window;
  }

  private async setupFallbackStrategies(): Promise<void> {
    // WebGL Fallback
    if (!this.supportedFeatures.webgl) {
      this.fallbackStrategies.set('webgl', {
        name: 'Canvas 2D Fallback',
        implementation: () => this.createCanvas2DContext(),
        performance: 'low'
      });
    }

    // WebAssembly Fallback
    if (!this.supportedFeatures.webassembly) {
      this.fallbackStrategies.set('webassembly', {
        name: 'JavaScript Fallback',
        implementation: () => this.createJavaScriptProcessor(),
        performance: 'medium'
      });
    }

    // Web Workers Fallback
    if (!this.supportedFeatures.webworkers) {
      this.fallbackStrategies.set('webworkers', {
        name: 'Main Thread Processing',
        implementation: () => this.createMainThreadProcessor(),
        performance: 'low'
      });
    }

    // IndexedDB Fallback
    if (!this.supportedFeatures.indexeddb) {
      this.fallbackStrategies.set('indexeddb', {
        name: 'LocalStorage Fallback',
        implementation: () => this.createLocalStorageAdapter(),
        performance: 'low'
      });
    }

    // Media Devices Fallback
    if (!this.supportedFeatures.mediadevices) {
      this.fallbackStrategies.set('mediadevices', {
        name: 'File Upload Fallback',
        implementation: () => this.createFileUploadInterface(),
        performance: 'low'
      });
    }

    // OffscreenCanvas Fallback
    if (!this.supportedFeatures.offscreencanvas) {
      this.fallbackStrategies.set('offscreencanvas', {
        name: 'Regular Canvas Fallback',
        implementation: () => this.createRegularCanvas(),
        performance: 'medium'
      });
    }
  }

  private async loadRequiredPolyfills(): Promise<void> {
    const polyfillsToLoad = [];

    if (!this.supportedFeatures.intersectionobserver) {
      polyfillsToLoad.push(this.loadIntersectionObserverPolyfill());
    }

    if (!this.supportedFeatures.resizeobserver) {
      polyfillsToLoad.push(this.loadResizeObserverPolyfill());
    }

    if (!('fetch' in window)) {
      polyfillsToLoad.push(this.loadFetchPolyfill());
    }

    if (!('Promise' in window)) {
      polyfillsToLoad.push(this.loadPromisePolyfill());
    }

    await Promise.allSettled(polyfillsToLoad);
  }

  private async loadIntersectionObserverPolyfill(): Promise<void> {
    if (this.polyfillsLoaded.has('intersection-observer')) return;

    try {
      // Create a simple polyfill for IntersectionObserver
      if (!('IntersectionObserver' in window)) {
        (window as any).IntersectionObserver = class IntersectionObserver {
          constructor(callback: Function, options?: any) {
            this.callback = callback;
            this.options = options || {};
            this.targets = new Set();
          }

          observe(target: Element) {
            this.targets.add(target);
            // Simple visibility check
            setTimeout(() => {
              const rect = target.getBoundingClientRect();
              const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
              this.callback([{
                target,
                isIntersecting: isVisible,
                intersectionRatio: isVisible ? 1 : 0
              }]);
            }, 100);
          }

          unobserve(target: Element) {
            this.targets.delete(target);
          }

          disconnect() {
            this.targets.clear();
          }

          private callback: Function;
          private options: any;
          private targets: Set<Element>;
        };
      }
      this.polyfillsLoaded.add('intersection-observer');
    } catch (error) {
      console.warn('Failed to load IntersectionObserver polyfill:', error);
    }
  }

  private async loadResizeObserverPolyfill(): Promise<void> {
    if (this.polyfillsLoaded.has('resize-observer')) return;

    try {
      if (!('ResizeObserver' in window)) {
        (window as any).ResizeObserver = class ResizeObserver {
          constructor(callback: Function) {
            this.callback = callback;
            this.targets = new Set();
          }

          observe(target: Element) {
            this.targets.add(target);
            // Simple resize detection using window resize
            const resizeHandler = () => {
              const rect = target.getBoundingClientRect();
              this.callback([{
                target,
                contentRect: rect
              }]);
            };
            window.addEventListener('resize', resizeHandler);
            (target as any)._resizeHandler = resizeHandler;
          }

          unobserve(target: Element) {
            this.targets.delete(target);
            if ((target as any)._resizeHandler) {
              window.removeEventListener('resize', (target as any)._resizeHandler);
              delete (target as any)._resizeHandler;
            }
          }

          disconnect() {
            this.targets.forEach(target => this.unobserve(target));
          }

          private callback: Function;
          private targets: Set<Element>;
        };
      }
      this.polyfillsLoaded.add('resize-observer');
    } catch (error) {
      console.warn('Failed to load ResizeObserver polyfill:', error);
    }
  }

  private async loadFetchPolyfill(): Promise<void> {
    if (this.polyfillsLoaded.has('fetch')) return;

    try {
      if (!('fetch' in window)) {
        // Simple fetch polyfill using XMLHttpRequest
        (window as any).fetch = function(url: string, options: any = {}) {
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url);
            
            if (options.headers) {
              Object.keys(options.headers).forEach(key => {
                xhr.setRequestHeader(key, options.headers[key]);
              });
            }
            
            xhr.onload = () => {
              resolve({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                statusText: xhr.statusText,
                text: () => Promise.resolve(xhr.responseText),
                json: () => Promise.resolve(JSON.parse(xhr.responseText))
              });
            };
            
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(options.body);
          });
        };
      }
      this.polyfillsLoaded.add('fetch');
    } catch (error) {
      console.warn('Failed to load fetch polyfill:', error);
    }
  }

  private async loadPromisePolyfill(): Promise<void> {
    if (this.polyfillsLoaded.has('promise')) return;

    try {
      if (!('Promise' in window)) {
        // Basic Promise polyfill
        (window as any).Promise = class Promise {
          constructor(executor: Function) {
            this.state = 'pending';
            this.value = undefined;
            this.handlers = [];
            
            const resolve = (value: any) => {
              if (this.state === 'pending') {
                this.state = 'fulfilled';
                this.value = value;
                this.handlers.forEach(handler => handler.onFulfilled(value));
              }
            };
            
            const reject = (reason: any) => {
              if (this.state === 'pending') {
                this.state = 'rejected';
                this.value = reason;
                this.handlers.forEach(handler => handler.onRejected(reason));
              }
            };
            
            try {
              executor(resolve, reject);
            } catch (error) {
              reject(error);
            }
          }

          then(onFulfilled?: Function, onRejected?: Function) {
            return new (window as any).Promise((resolve: Function, reject: Function) => {
              const handler = {
                onFulfilled: (value: any) => {
                  try {
                    const result = onFulfilled ? onFulfilled(value) : value;
                    resolve(result);
                  } catch (error) {
                    reject(error);
                  }
                },
                onRejected: (reason: any) => {
                  try {
                    const result = onRejected ? onRejected(reason) : reason;
                    reject(result);
                  } catch (error) {
                    reject(error);
                  }
                }
              };
              
              if (this.state === 'fulfilled') {
                handler.onFulfilled(this.value);
              } else if (this.state === 'rejected') {
                handler.onRejected(this.value);
              } else {
                this.handlers.push(handler);
              }
            });
          }

          catch(onRejected: Function) {
            return this.then(undefined, onRejected);
          }

          static resolve(value: any) {
            return new (window as any).Promise((resolve: Function) => resolve(value));
          }

          static reject(reason: any) {
            return new (window as any).Promise((resolve: Function, reject: Function) => reject(reason));
          }

          private state: string;
          private value: any;
          private handlers: any[];
        };
      }
      this.polyfillsLoaded.add('promise');
    } catch (error) {
      console.warn('Failed to load Promise polyfill:', error);
    }
  }

  private setupBrowserOptimizations(): void {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('chrome')) {
      this.setupChromeOptimizations();
    } else if (userAgent.includes('firefox')) {
      this.setupFirefoxOptimizations();
    } else if (userAgent.includes('safari')) {
      this.setupSafariOptimizations();
    } else if (userAgent.includes('edge')) {
      this.setupEdgeOptimizations();
    }
  }

  private setupChromeOptimizations(): void {
    // Chrome-specific optimizations
    document.body.style.transform = 'translateZ(0)';
    
    // Enable hardware acceleration for better performance
    const style = document.createElement('style');
    style.textContent = `
      .hardware-accelerated {
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000;
      }
    `;
    document.head.appendChild(style);
  }

  private setupFirefoxOptimizations(): void {
    // Firefox-specific optimizations
    document.documentElement.style.scrollBehavior = 'auto';
    
    // Optimize for Firefox's rendering engine
    const style = document.createElement('style');
    style.textContent = `
      * {
        -moz-osx-font-smoothing: grayscale;
      }
    `;
    document.head.appendChild(style);
  }

  private setupSafariOptimizations(): void {
    // Safari-specific optimizations
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-font-smoothing: antialiased;
        -webkit-tap-highlight-color: transparent;
      }
      
      canvas {
        max-width: 1024px;
        max-height: 768px;
      }
    `;
    document.head.appendChild(style);
  }

  private setupEdgeOptimizations(): void {
    // Edge-specific optimizations
    const style = document.createElement('style');
    style.textContent = `
      * {
        -ms-overflow-style: -ms-autohiding-scrollbar;
      }
    `;
    document.head.appendChild(style);
  }

  private setupMobileOptimizations(): void {
    if (this.isMobile()) {
      // Mobile-specific optimizations
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
      }

      // Optimize touch interactions
      document.addEventListener('touchstart', () => {}, { passive: true });
      document.addEventListener('touchmove', () => {}, { passive: true });
      document.addEventListener('touchend', () => {}, { passive: true });

      // Handle orientation changes
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          window.scrollTo(0, 1);
        }, 100);
      });

      // Reduce quality for mobile
      document.dispatchEvent(new CustomEvent('mobile:optimize', {
        detail: { reduceQuality: true }
      }));
    }
  }

  // Fallback implementations
  private createCanvas2DContext(): CanvasRenderingContext2D {
    const canvas = document.createElement('canvas');
    return canvas.getContext('2d')!;
  }

  private createJavaScriptProcessor(): any {
    return {
      process: (data: any) => {
        // Pure JavaScript implementation
        return this.processWithJavaScript(data);
      }
    };
  }

  private createMainThreadProcessor(): any {
    return {
      postMessage: (data: any) => {
        setTimeout(() => {
          const result = this.processOnMainThread(data);
          document.dispatchEvent(new CustomEvent('worker:message', { detail: result }));
        }, 0);
      }
    };
  }

  private createLocalStorageAdapter(): Storage {
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
          this.clearOldLocalStorageItems();
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key: string) => localStorage.removeItem(key),
      clear: () => localStorage.clear(),
      key: (index: number) => localStorage.key(index),
      length: localStorage.length
    };
  }

  private createFileUploadInterface(): any {
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

  private createRegularCanvas(): HTMLCanvasElement {
    return document.createElement('canvas');
  }

  // Helper methods
  private isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  private processWithJavaScript(data: any): any {
    return data;
  }

  private processOnMainThread(data: any): any {
    return data;
  }

  private clearOldLocalStorageItems(): void {
    const keys = Object.keys(localStorage);
    const oldKeys = keys.filter(key => key.startsWith('virtualfit_cache_'));
    
    oldKeys.sort().slice(0, Math.floor(oldKeys.length / 2)).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Public API
  isFeatureSupported(feature: keyof SupportedFeatures): boolean {
    return this.supportedFeatures[feature];
  }

  getFallbackStrategy(feature: string): FallbackStrategy | null {
    return this.fallbackStrategies.get(feature) || null;
  }

  getCompatibilityScore(): number {
    const totalFeatures = Object.keys(this.supportedFeatures).length;
    const supportedCount = Object.values(this.supportedFeatures).filter(Boolean).length;
    return Math.round((supportedCount / totalFeatures) * 100);
  }

  getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.supportedFeatures.webgl) {
      recommendations.push('Update your browser for better graphics performance');
    }
    
    if (!this.supportedFeatures.webworkers) {
      recommendations.push('Enable JavaScript for full functionality');
    }
    
    if (!this.supportedFeatures.mediadevices) {
      recommendations.push('Allow camera access for live try-on features');
    }
    
    if (this.getCompatibilityScore() < 70) {
      recommendations.push('Consider updating your browser for the best experience');
    }
    
    return recommendations;
  }

  generateCompatibilityReport(): CompatibilityReport {
    return {
      score: this.getCompatibilityScore(),
      supportedFeatures: { ...this.supportedFeatures },
      fallbackStrategies: Array.from(this.fallbackStrategies.entries()).map(([key, strategy]) => ({
        feature: key,
        strategy: strategy.name,
        performance: strategy.performance
      })),
      recommendations: this.getRecommendations(),
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory
      },
      screenInfo: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        orientation: screen.orientation?.type
      }
    };
  }
}

// Interfaces
interface SupportedFeatures {
  webgl: boolean;
  webgl2: boolean;
  webassembly: boolean;
  webworkers: boolean;
  indexeddb: boolean;
  serviceworker: boolean;
  mediadevices: boolean;
  webrtc: boolean;
  offscreencanvas: boolean;
  imagebitmap: boolean;
  intersectionobserver: boolean;
  resizeobserver: boolean;
}

interface FallbackStrategy {
  name: string;
  implementation: () => any;
  performance: 'low' | 'medium' | 'high';
}

interface CompatibilityReport {
  score: number;
  supportedFeatures: SupportedFeatures;
  fallbackStrategies: Array<{
    feature: string;
    strategy: string;
    performance: string;
  }>;
  recommendations: string[];
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
    cookieEnabled: boolean;
    onLine: boolean;
    hardwareConcurrency: number;
    deviceMemory?: number;
  };
  screenInfo: {
    width: number;
    height: number;
    colorDepth: number;
    pixelDepth: number;
    orientation?: string;
  };
}

export default EnhancedCompatibilityService;