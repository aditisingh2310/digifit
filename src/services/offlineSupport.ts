class OfflineSupport {
  private static instance: OfflineSupport;
  private isOnline = navigator.onLine;
  private offlineQueue: OfflineOperation[] = [];
  private syncInProgress = false;
  private serviceWorker: ServiceWorker | null = null;

  static getInstance(): OfflineSupport {
    if (!OfflineSupport.instance) {
      OfflineSupport.instance = new OfflineSupport();
    }
    return OfflineSupport.instance;
  }

  constructor() {
    this.setupNetworkListeners();
    this.initializeServiceWorker();
    this.setupPeriodicSync();
  }

  async initialize(): Promise<void> {
    // Register service worker for offline caching
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.serviceWorker = registration.active;
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }

    // Setup offline data storage
    await this.setupOfflineStorage();
    
    // Load offline queue from storage
    await this.loadOfflineQueue();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onNetworkOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onNetworkOffline();
    });
  }

  private async onNetworkOnline(): Promise<void> {
    console.log('Network connection restored');
    document.dispatchEvent(new CustomEvent('network:online'));
    
    // Sync offline operations
    await this.syncOfflineOperations();
    
    // Update UI
    this.updateNetworkStatus(true);
  }

  private onNetworkOffline(): void {
    console.log('Network connection lost');
    document.dispatchEvent(new CustomEvent('network:offline'));
    
    // Update UI
    this.updateNetworkStatus(false);
    
    // Enable offline mode
    this.enableOfflineMode();
  }

  private updateNetworkStatus(online: boolean): void {
    document.dispatchEvent(new CustomEvent('network:status', { 
      detail: { online } 
    }));
  }

  private enableOfflineMode(): void {
    // Show offline indicator
    this.showOfflineIndicator();
    
    // Switch to offline-first data sources
    document.dispatchEvent(new CustomEvent('app:offline-mode', { 
      detail: { enabled: true } 
    }));
  }

  private showOfflineIndicator(): void {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50';
    indicator.innerHTML = `
      <div class="flex items-center justify-center space-x-2">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <span>You're offline. Some features may be limited.</span>
      </div>
    `;
    
    document.body.appendChild(indicator);
  }

  private hideOfflineIndicator(): void {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  // Queue operations for offline sync
  queueOperation(operation: OfflineOperation): void {
    operation.id = this.generateId();
    operation.timestamp = Date.now();
    operation.status = 'pending';
    
    this.offlineQueue.push(operation);
    this.saveOfflineQueue();
    
    // Try to execute immediately if online
    if (this.isOnline) {
      this.executeOperation(operation);
    }
  }

  private async executeOperation(operation: OfflineOperation): Promise<void> {
    try {
      operation.status = 'executing';
      
      switch (operation.type) {
        case 'save-session':
          await this.executeSaveSession(operation);
          break;
        case 'upload-image':
          await this.executeUploadImage(operation);
          break;
        case 'track-analytics':
          await this.executeTrackAnalytics(operation);
          break;
        case 'sync-preferences':
          await this.executeSyncPreferences(operation);
          break;
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
      
      operation.status = 'completed';
      this.removeFromQueue(operation.id);
      
    } catch (error) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      operation.retryCount = (operation.retryCount || 0) + 1;
      
      if (operation.retryCount >= 3) {
        operation.status = 'failed-permanent';
      }
    }
    
    this.saveOfflineQueue();
  }

  private async syncOfflineOperations(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    
    try {
      const pendingOperations = this.offlineQueue.filter(op => 
        op.status === 'pending' || (op.status === 'failed' && (op.retryCount || 0) < 3)
      );
      
      for (const operation of pendingOperations) {
        await this.executeOperation(operation);
        
        // Add delay between operations to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Hide offline indicator if all operations synced
      if (this.offlineQueue.filter(op => op.status === 'pending').length === 0) {
        this.hideOfflineIndicator();
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Offline storage management
  private async setupOfflineStorage(): Promise<void> {
    try {
      // Setup IndexedDB for offline data
      const request = indexedDB.open('VirtualFitOffline', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'userId' });
        }
        
        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'id' });
        }
      };
      
    } catch (error) {
      console.warn('Failed to setup offline storage:', error);
    }
  }

  async saveOfflineSession(sessionData: any): Promise<string> {
    const sessionId = this.generateId();
    
    try {
      const request = indexedDB.open('VirtualFitOffline', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        
        store.put({
          id: sessionId,
          data: sessionData,
          timestamp: Date.now(),
          synced: false
        });
      };
      
      // Queue for sync when online
      this.queueOperation({
        id: sessionId,
        type: 'save-session',
        data: sessionData,
        timestamp: Date.now(),
        status: 'pending'
      });
      
    } catch (error) {
      console.error('Failed to save offline session:', error);
    }
    
    return sessionId;
  }

  async getOfflineSessions(): Promise<any[]> {
    try {
      const request = indexedDB.open('VirtualFitOffline', 1);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['sessions'], 'readonly');
          const store = transaction.objectStore('sessions');
          const getAllRequest = store.getAll();
          
          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result.map(item => item.data));
          };
          
          getAllRequest.onerror = () => {
            reject(getAllRequest.error);
          };
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get offline sessions:', error);
      return [];
    }
  }

  // Service Worker integration
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.showUpdateAvailableNotification();
            }
          });
        }
      });
      
    } catch (error) {
      console.warn('Service Worker initialization failed:', error);
    }
  }

  private showUpdateAvailableNotification(): void {
    document.dispatchEvent(new CustomEvent('app:update-available'));
  }

  // Periodic background sync
  private setupPeriodicSync(): void {
    // Sync every 5 minutes when online
    setInterval(() => {
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.syncOfflineOperations();
      }
    }, 5 * 60 * 1000);
  }

  // Operation executors
  private async executeSaveSession(operation: OfflineOperation): Promise<void> {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private async executeUploadImage(operation: OfflineOperation): Promise<void> {
    const formData = new FormData();
    formData.append('image', operation.data.file);
    formData.append('metadata', JSON.stringify(operation.data.metadata));
    
    const response = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private async executeTrackAnalytics(operation: OfflineOperation): Promise<void> {
    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private async executeSyncPreferences(operation: OfflineOperation): Promise<void> {
    const response = await fetch('/api/users/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  // Queue management
  private async loadOfflineQueue(): Promise<void> {
    try {
      const stored = localStorage.getItem('virtualfit-offline-queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  private saveOfflineQueue(): void {
    try {
      localStorage.setItem('virtualfit-offline-queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private removeFromQueue(id: string): void {
    this.offlineQueue = this.offlineQueue.filter(op => op.id !== id);
    this.saveOfflineQueue();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Public API
  isOffline(): boolean {
    return !this.isOnline;
  }

  getQueueStatus(): QueueStatus {
    return {
      total: this.offlineQueue.length,
      pending: this.offlineQueue.filter(op => op.status === 'pending').length,
      failed: this.offlineQueue.filter(op => op.status === 'failed').length,
      completed: this.offlineQueue.filter(op => op.status === 'completed').length,
      syncing: this.syncInProgress
    };
  }

  clearQueue(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }

  // Force sync
  async forcSync(): Promise<void> {
    if (this.isOnline) {
      await this.syncOfflineOperations();
    } else {
      throw new Error('Cannot sync while offline');
    }
  }
}

// Interfaces
interface OfflineOperation {
  id: string;
  type: 'save-session' | 'upload-image' | 'track-analytics' | 'sync-preferences';
  data: any;
  timestamp: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'failed-permanent';
  error?: string;
  retryCount?: number;
}

interface QueueStatus {
  total: number;
  pending: number;
  failed: number;
  completed: number;
  syncing: boolean;
}

export default OfflineSupport;