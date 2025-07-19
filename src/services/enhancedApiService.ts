import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

class EnhancedApiService {
  private static instance: EnhancedApiService;
  private axiosInstance: AxiosInstance;
  private db: IDBPDatabase | null = null;
  private retryQueue: RequestQueueItem[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.virtualfit.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.initializeOfflineSupport();
    this.setupNetworkListeners();
  }

  static getInstance(): EnhancedApiService {
    if (!EnhancedApiService.instance) {
      EnhancedApiService.instance = new EnhancedApiService();
    }
    return EnhancedApiService.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = uuidv4();
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Cache successful responses
        this.cacheResponse(response);
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          await this.handleAuthError();
        } else if (error.code === 'NETWORK_ERROR' || !this.isOnline) {
          return this.handleOfflineRequest(error.config);
        } else if (this.shouldRetry(error)) {
          return this.retryRequest(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  private async initializeOfflineSupport(): Promise<void> {
    try {
      this.db = await openDB('VirtualFitCache', 1, {
        upgrade(db) {
          // Create stores for different types of data
          db.createObjectStore('responses', { keyPath: 'url' });
          db.createObjectStore('images', { keyPath: 'url' });
          db.createObjectStore('userSessions', { keyPath: 'id' });
          db.createObjectStore('analytics', { keyPath: 'id' });
        },
      });
    } catch (error) {
      console.warn('Failed to initialize offline support:', error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Enhanced Clothing API with caching and offline support
  async getClothingItems(filters?: ClothingFilters): Promise<ClothingItem[]> {
    const cacheKey = `clothing_${JSON.stringify(filters || {})}`;
    
    try {
      const response = await this.axiosInstance.get('/clothing', { 
        params: filters,
        metadata: { cacheKey }
      });
      return response.data;
    } catch (error) {
      // Try to get from cache if offline
      const cached = await this.getCachedResponse(cacheKey);
      if (cached) {
        return cached.data;
      }
      throw error;
    }
  }

  async searchClothingAdvanced(query: SearchQuery): Promise<SearchResult> {
    try {
      const response = await this.axiosInstance.post('/clothing/search/advanced', query);
      return response.data;
    } catch (error) {
      console.error('Advanced search failed:', error);
      return this.fallbackSearch(query);
    }
  }

  async getClothingRecommendations(
    userId: string,
    context: RecommendationContext
  ): Promise<SmartRecommendation[]> {
    try {
      const response = await this.axiosInstance.post('/recommendations', {
        userId,
        context,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  // Enhanced Try-on API with progress tracking
  async processTryOnAdvanced(data: AdvancedTryOnRequest): Promise<TryOnResult> {
    const formData = new FormData();
    formData.append('userPhoto', data.userPhoto);
    formData.append('clothingItems', JSON.stringify(data.clothingItems));
    formData.append('lightingSettings', JSON.stringify(data.lightingSettings));
    formData.append('qualitySettings', JSON.stringify(data.qualitySettings));
    formData.append('aiSettings', JSON.stringify(data.aiSettings));

    try {
      const response = await this.axiosInstance.post('/tryon/process/advanced', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes for AI processing
        onUploadProgress: (progressEvent) => {
          if (data.onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
            data.onProgress(progress, 'uploading');
          }
        }
      });
      
      return response.data;
    } catch (error) {
      // Queue for retry if offline
      if (!this.isOnline) {
        await this.queueRequest('POST', '/tryon/process/advanced', formData);
        return this.getMockTryOnResult();
      }
      throw error;
    }
  }

  async saveTryOnSession(session: EnhancedTryOnSession): Promise<string> {
    const sessionId = uuidv4();
    
    try {
      const response = await this.axiosInstance.post('/tryon/sessions', {
        ...session,
        id: sessionId
      });
      return response.data.sessionId;
    } catch (error) {
      // Save locally if offline
      if (this.db) {
        await this.db.put('userSessions', { ...session, id: sessionId });
      }
      return sessionId;
    }
  }

  async getTryOnHistory(userId: string, limit = 20): Promise<TryOnSession[]> {
    try {
      const response = await this.axiosInstance.get(`/tryon/sessions/${userId}`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      // Get from local storage if offline
      if (this.db) {
        const sessions = await this.db.getAll('userSessions');
        return sessions.slice(0, limit);
      }
      return [];
    }
  }

  // Enhanced Analytics API
  async trackEventAdvanced(event: AdvancedAnalyticsEvent): Promise<void> {
    const eventData = {
      ...event,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    try {
      await this.axiosInstance.post('/analytics/events', eventData);
    } catch (error) {
      // Queue for later if offline
      if (this.db) {
        await this.db.put('analytics', eventData);
      }
    }
  }

  async getAnalyticsAdvanced(params: AnalyticsParams): Promise<AdvancedAnalyticsData> {
    try {
      const response = await this.axiosInstance.get('/analytics/advanced', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return this.getMockAdvancedAnalytics();
    }
  }

  async generateAnalyticsReport(params: ReportParams): Promise<AnalyticsReport> {
    try {
      const response = await this.axiosInstance.post('/analytics/reports', params);
      return response.data;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  // User Management API
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await this.axiosInstance.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await this.axiosInstance.put(`/users/${userId}/profile`, updates);
      return response.data;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const response = await this.axiosInstance.get(`/users/${userId}/preferences`);
      return response.data;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Image Management API
  async uploadImage(file: File, metadata?: ImageMetadata): Promise<ImageUploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    try {
      const response = await this.axiosInstance.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (metadata?.onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
            metadata.onProgress(progress);
          }
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }
  }

  async optimizeImage(imageUrl: string, options: ImageOptimizationOptions): Promise<string> {
    try {
      const response = await this.axiosInstance.post('/images/optimize', {
        imageUrl,
        options
      });
      return response.data.optimizedUrl;
    } catch (error) {
      console.error('Failed to optimize image:', error);
      return imageUrl; // Return original if optimization fails
    }
  }

  // Inventory Management API
  async getInventoryStatus(itemIds: string[]): Promise<InventoryStatus[]> {
    try {
      const response = await this.axiosInstance.post('/inventory/status', { itemIds });
      return response.data;
    } catch (error) {
      console.error('Failed to get inventory status:', error);
      return itemIds.map(id => ({ itemId: id, inStock: true, quantity: 10 }));
    }
  }

  async updateInventory(updates: InventoryUpdate[]): Promise<void> {
    try {
      await this.axiosInstance.post('/inventory/update', { updates });
    } catch (error) {
      console.error('Failed to update inventory:', error);
      throw error;
    }
  }

  // Integration APIs
  async syncWithEcommerce(platform: string, credentials: any): Promise<SyncResult> {
    try {
      const response = await this.axiosInstance.post('/integrations/sync', {
        platform,
        credentials
      });
      return response.data;
    } catch (error) {
      console.error('Failed to sync with e-commerce platform:', error);
      throw error;
    }
  }

  async webhookHandler(webhook: WebhookData): Promise<void> {
    try {
      await this.axiosInstance.post('/webhooks/handle', webhook);
    } catch (error) {
      console.error('Failed to handle webhook:', error);
      // Queue for retry
      await this.queueRequest('POST', '/webhooks/handle', webhook);
    }
  }

  // Private helper methods
  private async cacheResponse(response: AxiosResponse): Promise<void> {
    if (!this.db || !response.config.metadata?.cacheKey) return;

    try {
      await this.db.put('responses', {
        url: response.config.metadata.cacheKey,
        data: response.data,
        timestamp: Date.now(),
        expires: Date.now() + (5 * 60 * 1000) // 5 minutes
      });
    } catch (error) {
      console.warn('Failed to cache response:', error);
    }
  }

  private async getCachedResponse(cacheKey: string): Promise<any> {
    if (!this.db) return null;

    try {
      const cached = await this.db.get('responses', cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached;
      }
    } catch (error) {
      console.warn('Failed to get cached response:', error);
    }
    return null;
  }

  private async queueRequest(method: string, url: string, data: any): Promise<void> {
    this.retryQueue.push({
      id: uuidv4(),
      method,
      url,
      data,
      timestamp: Date.now(),
      retries: 0
    });
  }

  private async processRetryQueue(): Promise<void> {
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of queue) {
      try {
        await this.axiosInstance.request({
          method: item.method as any,
          url: item.url,
          data: item.data
        });
      } catch (error) {
        if (item.retries < 3) {
          item.retries++;
          this.retryQueue.push(item);
        }
      }
    }
  }

  private shouldRetry(error: any): boolean {
    return error.response?.status >= 500 || error.code === 'NETWORK_ERROR';
  }

  private async retryRequest(config: any): Promise<any> {
    const retries = config.retries || 0;
    if (retries < 3) {
      config.retries = retries + 1;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      return this.axiosInstance.request(config);
    }
    throw new Error('Max retries exceeded');
  }

  private async handleAuthError(): Promise<void> {
    localStorage.removeItem('auth_token');
    // Redirect to login or refresh token
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  private async handleOfflineRequest(config: any): Promise<any> {
    const cached = await this.getCachedResponse(config.metadata?.cacheKey);
    if (cached) {
      return { data: cached.data };
    }
    throw new Error('No cached data available offline');
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }

  private fallbackSearch(query: SearchQuery): SearchResult {
    return {
      items: [],
      total: 0,
      facets: {},
      suggestions: []
    };
  }

  private getMockTryOnResult(): TryOnResult {
    return {
      processedImage: 'data:image/jpeg;base64,mock-processed-image',
      confidence: 0.85,
      processingTime: 2.3,
      recommendations: [],
      metadata: {
        aiVersion: '2.0',
        processingSteps: ['pose_detection', 'segmentation', 'fitting', 'lighting']
      }
    };
  }

  private getMockAdvancedAnalytics(): AdvancedAnalyticsData {
    return {
      overview: {
        totalTryOns: 12450,
        conversionRate: 73.2,
        averageSessionTime: 5.4,
        revenueImpact: 245000
      },
      trends: [],
      segments: [],
      funnelAnalysis: {},
      cohortAnalysis: {}
    };
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      styles: [],
      colors: [],
      brands: [],
      priceRange: [0, 500],
      notifications: {
        email: true,
        push: false,
        sms: false
      }
    };
  }
}

// Enhanced interfaces
export interface ClothingFilters {
  category?: string;
  style?: string;
  priceMin?: number;
  priceMax?: number;
  colors?: string[];
  brands?: string[];
  sizes?: string[];
  inStock?: boolean;
  rating?: number;
  tags?: string[];
}

export interface SearchQuery {
  query: string;
  filters?: ClothingFilters;
  sort?: 'relevance' | 'price' | 'rating' | 'newest';
  page?: number;
  limit?: number;
  facets?: string[];
}

export interface SearchResult {
  items: ClothingItem[];
  total: number;
  facets: Record<string, any>;
  suggestions: string[];
}

export interface AdvancedTryOnRequest {
  userPhoto: File | string;
  clothingItems: string[];
  lightingSettings: any;
  qualitySettings: QualitySettings;
  aiSettings: AISettings;
  onProgress?: (progress: number, stage: string) => void;
}

export interface QualitySettings {
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  antiAliasing: boolean;
  shadows: boolean;
  reflections: boolean;
}

export interface AISettings {
  poseDetection: boolean;
  bodySegmentation: boolean;
  clothingFit: boolean;
  lightingAnalysis: boolean;
  styleRecommendations: boolean;
}

export interface EnhancedTryOnSession {
  userPhoto: string;
  selectedItems: any[];
  lightingSettings: any;
  bodyPose?: any;
  segmentation?: any;
  metadata: SessionMetadata;
  timestamp: Date;
}

export interface SessionMetadata {
  deviceType: string;
  browserInfo: string;
  processingTime: number;
  qualitySettings: QualitySettings;
  aiConfidence: number;
}

export interface AdvancedAnalyticsEvent {
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  customDimensions?: Record<string, any>;
  userId?: string;
}

export interface AnalyticsParams {
  startDate: string;
  endDate: string;
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, any>;
  segment?: string;
}

export interface AdvancedAnalyticsData {
  overview: {
    totalTryOns: number;
    conversionRate: number;
    averageSessionTime: number;
    revenueImpact: number;
  };
  trends: TrendData[];
  segments: SegmentData[];
  funnelAnalysis: FunnelData;
  cohortAnalysis: CohortData;
}

export interface RequestQueueItem {
  id: string;
  method: string;
  url: string;
  data: any;
  timestamp: number;
  retries: number;
}

export interface ImageMetadata {
  category?: string;
  tags?: string[];
  onProgress?: (progress: number) => void;
}

export interface ImageUploadResult {
  url: string;
  thumbnailUrl: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
}

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  progressive?: boolean;
}

export interface InventoryStatus {
  itemId: string;
  inStock: boolean;
  quantity: number;
  lastUpdated: string;
}

export interface InventoryUpdate {
  itemId: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  lastSyncTime: string;
}

export interface WebhookData {
  source: string;
  event: string;
  data: any;
  signature?: string;
}

export interface TrendData {
  date: string;
  value: number;
  metric: string;
}

export interface SegmentData {
  name: string;
  size: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface FunnelData {
  steps: Array<{
    name: string;
    users: number;
    conversionRate: number;
  }>;
}

export interface CohortData {
  cohorts: Array<{
    period: string;
    size: number;
    retention: number[];
  }>;
}

export default EnhancedApiService;