class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheItem>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private readonly IMAGE_CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private db: IDBDatabase | null = null;

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
      CacheService.instance.initializeIndexedDB();
    }
    return CacheService.instance;
  }

  private async initializeIndexedDB(): Promise<void> {
    try {
      const request = indexedDB.open('VirtualFitCache', 2);
      
      request.onupgradeneeded = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        
        if (!this.db.objectStoreNames.contains('images')) {
          this.db.createObjectStore('images', { keyPath: 'url' });
        }
        
        if (!this.db.objectStoreNames.contains('data')) {
          this.db.createObjectStore('data', { keyPath: 'key' });
        }
      };
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
      };
    } catch (error) {
      console.warn('Failed to initialize IndexedDB:', error);
    }
  }
  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt, lastAccessed: Date.now() });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed time
    item.lastAccessed = Date.now();
    return item.value as T;
  }

  async setLarge<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      await store.put({
        key,
        value,
        expiresAt: Date.now() + ttl,
        lastAccessed: Date.now()
      });
    } catch (error) {
      console.warn('Failed to cache large data:', error);
    }
  }

  async getLarge<T>(key: string): Promise<T | null> {
    if (!this.db) return null;
    
    try {
      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get(key);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const item = request.result;
          if (!item || Date.now() > item.expiresAt) {
            resolve(null);
          } else {
            resolve(item.value);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Failed to get large cached data:', error);
      return null;
    }
  }
  delete(key: string): void {
    this.cache.delete(key);
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['data'], 'readwrite');
        const store = transaction.objectStore('data');
        store.delete(key);
      } catch (error) {
        console.warn('Failed to delete from IndexedDB:', error);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['data', 'images'], 'readwrite');
        transaction.objectStore('data').clear();
        transaction.objectStore('images').clear();
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
    }
  }

  async cacheImage(url: string, forceRefresh = false): Promise<string> {
    const cacheKey = `image_${url}`;
    
    if (!forceRefresh) {
      const cached = await this.getCachedImage(url);
      if (cached) return cached;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Store in IndexedDB for persistence
      await this.storeCachedImage(url, blob);
      
      // Also store in memory cache
      this.set(cacheKey, objectUrl, this.IMAGE_CACHE_TTL);
      
      return objectUrl;
    } catch (error) {
      console.error('Failed to cache image:', error);
      return url; // Fallback to original URL
    }
  }

  private async getCachedImage(url: string): Promise<string | null> {
    const cacheKey = `image_${url}`;
    
    // Check memory cache first
    const memoryCache = this.get<string>(cacheKey);
    if (memoryCache) return memoryCache;
    
    // Check IndexedDB
    if (!this.db) return null;
    
    try {
      const transaction = this.db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.get(url);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const item = request.result;
          if (!item || Date.now() > item.expiresAt) {
            resolve(null);
          } else {
            const objectUrl = URL.createObjectURL(item.blob);
            this.set(cacheKey, objectUrl, this.IMAGE_CACHE_TTL);
            resolve(objectUrl);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.warn('Failed to get cached image:', error);
      return null;
    }
  }

  private async storeCachedImage(url: string, blob: Blob): Promise<void> {
    if (!this.db) return;
    
    try {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      await store.put({
        url,
        blob,
        expiresAt: Date.now() + this.IMAGE_CACHE_TTL,
        cachedAt: Date.now()
      });
    } catch (error) {
      console.warn('Failed to store cached image:', error);
    }
  }

  // Preload images for better performance
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.cacheImage(url));
    await Promise.allSettled(promises);
  }

  // Get cache statistics
  getCacheStats(): CacheStats {
    const memorySize = this.cache.size;
    const memoryItems = Array.from(this.cache.values());
    const expiredItems = memoryItems.filter(item => Date.now() > item.expiresAt).length;
    
    return {
      memorySize,
      expiredItems,
      hitRate: this.calculateHitRate(),
      totalSize: this.calculateTotalSize()
    };
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private calculateHitRate(): number {
    // This would need to be tracked over time
    return 0.85; // Placeholder
  }

  private calculateTotalSize(): number {
    let size = 0;
    for (const item of this.cache.values()) {
      size += JSON.stringify(item.value).length;
    }
    return size;
  }

  // Smart cleanup based on usage patterns
  smartCleanup(): void {
    const now = Date.now();
    const itemsToDelete: string[] = [];
    
    for (const [key, item] of this.cache.entries()) {
      // Remove expired items
      if (now > item.expiresAt) {
        itemsToDelete.push(key);
      }
      // Remove items not accessed in last hour
      else if (now - item.lastAccessed > 60 * 60 * 1000) {
        itemsToDelete.push(key);
      }
    }
    
    itemsToDelete.forEach(key => this.cache.delete(key));
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
    
    // Also cleanup IndexedDB
    this.cleanupIndexedDB();
  }

  private async cleanupIndexedDB(): Promise<void> {
    if (!this.db) return;
    
    try {
      const now = Date.now();
      const transaction = this.db.transaction(['data', 'images'], 'readwrite');
      
      // Cleanup data store
      const dataStore = transaction.objectStore('data');
      const dataCursor = dataStore.openCursor();
      
      dataCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (now > cursor.value.expiresAt) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      
      // Cleanup images store
      const imagesStore = transaction.objectStore('images');
      const imagesCursor = imagesStore.openCursor();
      
      imagesCursor.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (now > cursor.value.expiresAt) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    } catch (error) {
      console.warn('Failed to cleanup IndexedDB:', error);
    }
  }
}

interface CacheItem {
  value: any;
  expiresAt: number;
  lastAccessed: number;
}

interface CacheStats {
  memorySize: number;
  expiredItems: number;
  hitRate: number;
  totalSize: number;
}

export default CacheService;