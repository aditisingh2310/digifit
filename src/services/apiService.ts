import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.virtualfit.com';

class ApiService {
  private static instance: ApiService;
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Clothing API
  async getClothingItems(filters?: ClothingFilters): Promise<ClothingItem[]> {
    try {
      const response = await this.axiosInstance.get('/clothing', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch clothing items:', error);
      // Fallback to mock data for demo
      return this.getMockClothingItems();
    }
  }

  async getClothingItem(id: string): Promise<ClothingItem> {
    try {
      const response = await this.axiosInstance.get(`/clothing/${id}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch clothing item:', error);
      throw error;
    }
  }

  async searchClothing(query: string): Promise<ClothingItem[]> {
    try {
      const response = await this.axiosInstance.get('/clothing/search', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to search clothing:', error);
      return [];
    }
  }

  // User API
  async getUserProfile(): Promise<UserProfile> {
    try {
      const response = await this.axiosInstance.get('/user/profile');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await this.axiosInstance.put('/user/profile', profile);
      return response.data;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  // Try-on API
  async processTryOn(data: TryOnRequest): Promise<TryOnResult> {
    try {
      const formData = new FormData();
      formData.append('userPhoto', data.userPhoto);
      formData.append('clothingItems', JSON.stringify(data.clothingItems));
      formData.append('lightingSettings', JSON.stringify(data.lightingSettings));

      const response = await this.axiosInstance.post('/tryon/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000 // Longer timeout for AI processing
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to process try-on:', error);
      // Return mock result for demo
      return this.getMockTryOnResult();
    }
  }

  async saveTryOnSession(session: TryOnSession): Promise<string> {
    try {
      const response = await this.axiosInstance.post('/tryon/sessions', session);
      return response.data.sessionId;
    } catch (error) {
      console.error('Failed to save try-on session:', error);
      return 'mock-session-id';
    }
  }

  // Analytics API
  async getAnalytics(timeRange: string): Promise<AnalyticsData> {
    try {
      const response = await this.axiosInstance.get('/analytics', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return this.getMockAnalytics();
    }
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await this.axiosInstance.post('/analytics/events', event);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // Mock data methods for demo/fallback
  private getMockClothingItems(): ClothingItem[] {
    return [
      {
        id: '1',
        name: 'Classic White Button Shirt',
        category: 'tops',
        style: 'classic',
        colors: ['white', 'light-blue'],
        brand: 'StyleCo',
        price: 89,
        image: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=500',
        overlayImage: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=300',
        tags: ['professional', 'versatile', 'cotton'],
        rating: 4.5,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        inStock: true,
        inventory: 150
      }
    ];
  }

  private getMockTryOnResult(): TryOnResult {
    return {
      processedImage: 'data:image/jpeg;base64,mock-processed-image',
      confidence: 0.85,
      processingTime: 2.3,
      recommendations: []
    };
  }

  private getMockAnalytics(): AnalyticsData {
    return {
      totalTryOns: 12450,
      conversionRate: 73.2,
      averageSessionTime: 5.4,
      topCategories: ['dresses', 'tops', 'bottoms'],
      revenueImpact: 245000
    };
  }
}

export interface ClothingFilters {
  category?: string;
  style?: string;
  priceMin?: number;
  priceMax?: number;
  colors?: string[];
  brands?: string[];
  sizes?: string[];
  inStock?: boolean;
}

export interface ClothingItem {
  id: string;
  name: string;
  category: string;
  style: string;
  colors: string[];
  brand: string;
  price: number;
  image: string;
  overlayImage: string;
  tags: string[];
  rating: number;
  sizes: string[];
  inStock: boolean;
  inventory: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: any;
  measurements?: any;
  createdAt: string;
}

export interface TryOnRequest {
  userPhoto: File | string;
  clothingItems: string[];
  lightingSettings: any;
}

export interface TryOnResult {
  processedImage: string;
  confidence: number;
  processingTime: number;
  recommendations: any[];
}

export interface TryOnSession {
  userPhoto: string;
  selectedItems: any[];
  lightingSettings: any;
  timestamp: Date;
}

export interface AnalyticsData {
  totalTryOns: number;
  conversionRate: number;
  averageSessionTime: number;
  topCategories: string[];
  revenueImpact: number;
}

export interface AnalyticsEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export default ApiService;