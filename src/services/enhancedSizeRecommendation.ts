class EnhancedSizeRecommendationService {
  private static instance: EnhancedSizeRecommendationService;
  private sizeDatabase: SizeDatabase;
  private mlModel: any = null;
  private userSizeHistory: Map<string, SizeHistory> = new Map();

  static getInstance(): EnhancedSizeRecommendationService {
    if (!EnhancedSizeRecommendationService.instance) {
      EnhancedSizeRecommendationService.instance = new EnhancedSizeRecommendationService();
    }
    return EnhancedSizeRecommendationService.instance;
  }

  constructor() {
    this.sizeDatabase = new SizeDatabase();
    this.initializeMLModel();
  }

  private async initializeMLModel(): Promise<void> {
    try {
      // Load size recommendation ML model
      this.mlModel = await this.loadSizeModel();
    } catch (error) {
      console.warn('ML model not available, using rule-based approach');
    }
  }

  private async loadSizeModel(): Promise<any> {
    // Mock ML model for size recommendation
    return {
      predict: (features: number[]) => {
        // Simulate ML prediction
        const sizeIndex = Math.floor(Math.random() * 6);
        const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        return {
          size: sizes[sizeIndex],
          confidence: 0.7 + Math.random() * 0.3,
          fitType: 'regular'
        };
      }
    };
  }

  async recommendSize(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    userPreferences: SizePreferences,
    userId?: string
  ): Promise<SizeRecommendation> {
    try {
      // Get user's size history if available
      const sizeHistory = userId ? this.userSizeHistory.get(userId) : null;
      
      // Use ML model if available
      if (this.mlModel) {
        return await this.mlSizeRecommendation(bodyMeasurements, clothingItem, userPreferences, sizeHistory);
      }
      
      // Fallback to enhanced rule-based approach
      return this.ruleBasedSizeRecommendation(bodyMeasurements, clothingItem, userPreferences, sizeHistory);
    } catch (error) {
      console.error('Size recommendation failed:', error);
      return this.fallbackSizeRecommendation(clothingItem);
    }
  }

  private async mlSizeRecommendation(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    userPreferences: SizePreferences,
    sizeHistory?: SizeHistory
  ): Promise<SizeRecommendation> {
    // Prepare features for ML model
    const features = this.prepareFeaturesForML(bodyMeasurements, clothingItem, userPreferences, sizeHistory);
    
    // Get prediction from ML model
    const prediction = this.mlModel.predict(features);
    
    // Generate all size options with confidence scores
    const allSizes = this.generateAllSizeOptions(bodyMeasurements, clothingItem, prediction);
    
    // Calculate fit analysis
    const fitAnalysis = this.analyzeFit(bodyMeasurements, clothingItem, prediction.size);
    
    // Generate adjustment suggestions
    const adjustmentSuggestions = this.generateAdjustmentSuggestions(bodyMeasurements, clothingItem, prediction);

    return {
      recommendedSize: {
        size: prediction.size,
        confidence: prediction.confidence,
        fitType: prediction.fitType
      },
      allSizes,
      fitAnalysis,
      adjustmentSuggestions,
      reasoning: this.generateReasoning(bodyMeasurements, clothingItem, prediction)
    };
  }

  private ruleBasedSizeRecommendation(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    userPreferences: SizePreferences,
    sizeHistory?: SizeHistory
  ): Promise<SizeRecommendation> {
    // Enhanced rule-based size recommendation
    const brandSizing = this.sizeDatabase.getBrandSizing(clothingItem.brand);
    const categorySizing = this.sizeDatabase.getCategorySizing(clothingItem.category);
    
    // Calculate size based on body measurements
    let recommendedSize = this.calculateSizeFromMeasurements(
      bodyMeasurements, 
      clothingItem, 
      brandSizing, 
      categorySizing
    );
    
    // Adjust based on user preferences
    recommendedSize = this.adjustForUserPreferences(recommendedSize, userPreferences);
    
    // Adjust based on size history
    if (sizeHistory) {
      recommendedSize = this.adjustForSizeHistory(recommendedSize, sizeHistory, clothingItem);
    }
    
    // Generate all size options
    const allSizes = this.generateAllSizeOptionsRuleBased(bodyMeasurements, clothingItem);
    
    // Calculate fit analysis
    const fitAnalysis = this.analyzeFit(bodyMeasurements, clothingItem, recommendedSize.size);
    
    // Generate suggestions
    const adjustmentSuggestions = this.generateAdjustmentSuggestions(bodyMeasurements, clothingItem, recommendedSize);

    return Promise.resolve({
      recommendedSize,
      allSizes,
      fitAnalysis,
      adjustmentSuggestions,
      reasoning: this.generateReasoning(bodyMeasurements, clothingItem, recommendedSize)
    });
  }

  private prepareFeaturesForML(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    userPreferences: SizePreferences,
    sizeHistory?: SizeHistory
  ): number[] {
    const features = [
      bodyMeasurements.height / 200,
      bodyMeasurements.chest / 120,
      bodyMeasurements.waist / 100,
      bodyMeasurements.hips / 120,
      bodyMeasurements.shoulderWidth / 50,
      this.encodeFitPreference(userPreferences.preferredFit),
      clothingItem.price / 200,
      this.encodeBrand(clothingItem.brand),
      this.encodeCategory(clothingItem.category)
    ];
    
    // Add size history features if available
    if (sizeHistory) {
      features.push(...this.encodeSizeHistory(sizeHistory, clothingItem));
    }
    
    return features;
  }

  private calculateSizeFromMeasurements(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    brandSizing: BrandSizing,
    categorySizing: CategorySizing
  ): SizeOption {
    const { category } = clothingItem;
    
    let primaryMeasurement: number;
    let sizingChart: any;
    
    // Determine primary measurement based on category
    switch (category) {
      case 'tops':
      case 'dresses':
        primaryMeasurement = bodyMeasurements.chest;
        sizingChart = brandSizing.tops || categorySizing.tops;
        break;
      case 'bottoms':
        primaryMeasurement = bodyMeasurements.waist;
        sizingChart = brandSizing.bottoms || categorySizing.bottoms;
        break;
      case 'outerwear':
        primaryMeasurement = Math.max(bodyMeasurements.chest, bodyMeasurements.shoulderWidth * 2);
        sizingChart = brandSizing.outerwear || categorySizing.outerwear;
        break;
      default:
        primaryMeasurement = bodyMeasurements.chest;
        sizingChart = this.getDefaultSizingChart();
    }
    
    // Find best fitting size
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    let bestSize = 'M';
    let bestFit = Infinity;
    
    for (const size of sizes) {
      if (sizingChart[size]) {
        const sizeMeasurement = sizingChart[size].chest || sizingChart[size].waist || sizingChart[size].measurement;
        const difference = Math.abs(primaryMeasurement - sizeMeasurement);
        
        if (difference < bestFit) {
          bestFit = difference;
          bestSize = size;
        }
      }
    }
    
    // Calculate confidence based on fit
    const confidence = Math.max(0.5, 1 - (bestFit / primaryMeasurement));
    
    // Determine fit type
    const fitType = this.determineFitType(bestFit, primaryMeasurement);
    
    return {
      size: bestSize,
      confidence,
      fitType
    };
  }

  private adjustForUserPreferences(sizeOption: SizeOption, preferences: SizePreferences): SizeOption {
    const { preferredFit } = preferences;
    const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const currentIndex = sizes.indexOf(sizeOption.size);
    
    let adjustedIndex = currentIndex;
    
    switch (preferredFit) {
      case 'tight':
        adjustedIndex = Math.max(0, currentIndex - 1);
        break;
      case 'loose':
        adjustedIndex = Math.min(sizes.length - 1, currentIndex + 1);
        break;
      case 'regular':
      default:
        // No adjustment needed
        break;
    }
    
    return {
      ...sizeOption,
      size: sizes[adjustedIndex],
      fitType: preferredFit
    };
  }

  private adjustForSizeHistory(
    sizeOption: SizeOption,
    sizeHistory: SizeHistory,
    clothingItem: ClothingItem
  ): SizeOption {
    const brandHistory = sizeHistory.brands[clothingItem.brand];
    const categoryHistory = sizeHistory.categories[clothingItem.category];
    
    if (brandHistory && brandHistory.length > 0) {
      // Use brand-specific history
      const avgSize = this.calculateAverageSize(brandHistory);
      return this.blendSizeRecommendations(sizeOption, { size: avgSize, confidence: 0.8, fitType: 'regular' });
    }
    
    if (categoryHistory && categoryHistory.length > 0) {
      // Use category-specific history
      const avgSize = this.calculateAverageSize(categoryHistory);
      return this.blendSizeRecommendations(sizeOption, { size: avgSize, confidence: 0.6, fitType: 'regular' });
    }
    
    return sizeOption;
  }

  private generateAllSizeOptions(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    prediction: any
  ): SizeOption[] {
    const sizes = clothingItem.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
    return sizes.map(size => {
      const confidence = this.calculateSizeConfidence(bodyMeasurements, clothingItem, size);
      const fitType = this.calculateFitType(bodyMeasurements, clothingItem, size);
      
      return {
        size,
        confidence,
        fitType
      };
    });
  }

  private generateAllSizeOptionsRuleBased(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem
  ): SizeOption[] {
    const sizes = clothingItem.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    
    return sizes.map(size => {
      const confidence = this.calculateSizeConfidence(bodyMeasurements, clothingItem, size);
      const fitType = this.calculateFitType(bodyMeasurements, clothingItem, size);
      
      return {
        size,
        confidence,
        fitType
      };
    });
  }

  private analyzeFit(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    size: string
  ): FitAnalysis {
    return {
      chest: this.analyzeMeasurementFit(bodyMeasurements.chest, this.getExpectedMeasurement(clothingItem, size, 'chest')),
      waist: this.analyzeMeasurementFit(bodyMeasurements.waist, this.getExpectedMeasurement(clothingItem, size, 'waist')),
      hips: this.analyzeMeasurementFit(bodyMeasurements.hips, this.getExpectedMeasurement(clothingItem, size, 'hips')),
      shoulders: this.analyzeMeasurementFit(bodyMeasurements.shoulderWidth, this.getExpectedMeasurement(clothingItem, size, 'shoulders')),
      length: this.analyzeLengthFit(bodyMeasurements, clothingItem, size),
      overall: 'good'
    };
  }

  private generateAdjustmentSuggestions(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    sizeOption: SizeOption
  ): string[] {
    const suggestions: string[] = [];
    
    if (sizeOption.confidence < 0.7) {
      suggestions.push('Consider trying multiple sizes for the best fit');
    }
    
    if (sizeOption.fitType === 'tight') {
      suggestions.push('This size may be snug - consider sizing up for comfort');
    } else if (sizeOption.fitType === 'loose') {
      suggestions.push('This size may be loose - consider sizing down for a fitted look');
    }
    
    // Category-specific suggestions
    if (clothingItem.category === 'dresses') {
      suggestions.push('Pay attention to bust and hip measurements for dresses');
    } else if (clothingItem.category === 'bottoms') {
      suggestions.push('Consider your preferred rise and leg fit');
    }
    
    // Material-specific suggestions
    if (clothingItem.tags.includes('stretch')) {
      suggestions.push('This item has stretch - you may prefer a more fitted size');
    }
    
    return suggestions;
  }

  private generateReasoning(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    sizeOption: SizeOption
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`Based on your ${clothingItem.category} measurements`);
    reasoning.push(`${clothingItem.brand} sizing tends to run ${this.getBrandSizingTendency(clothingItem.brand)}`);
    reasoning.push(`This ${sizeOption.fitType} fit aligns with the item's design`);
    
    if (sizeOption.confidence > 0.8) {
      reasoning.push('High confidence recommendation based on precise measurements');
    }
    
    return reasoning;
  }

  // Helper methods
  private encodeFitPreference(fit: string): number {
    const mapping = { 'tight': 0.2, 'regular': 0.5, 'loose': 0.8 };
    return mapping[fit as keyof typeof mapping] || 0.5;
  }

  private encodeBrand(brand: string): number {
    // Simple brand encoding
    return brand.length / 20;
  }

  private encodeCategory(category: string): number {
    const mapping = { 'tops': 0.2, 'bottoms': 0.4, 'dresses': 0.6, 'outerwear': 0.8 };
    return mapping[category as keyof typeof mapping] || 0.5;
  }

  private encodeSizeHistory(sizeHistory: SizeHistory, clothingItem: ClothingItem): number[] {
    // Encode size history features
    return [0.5, 0.5, 0.5]; // Placeholder
  }

  private determineFitType(difference: number, measurement: number): string {
    const ratio = difference / measurement;
    if (ratio < 0.05) return 'perfect';
    if (ratio < 0.1) return 'good';
    if (ratio < 0.15) return 'acceptable';
    return 'poor';
  }

  private calculateSizeConfidence(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    size: string
  ): number {
    // Calculate confidence for specific size
    const expectedMeasurement = this.getExpectedMeasurement(clothingItem, size, 'chest');
    const difference = Math.abs(bodyMeasurements.chest - expectedMeasurement);
    return Math.max(0.3, 1 - (difference / bodyMeasurements.chest));
  }

  private calculateFitType(
    bodyMeasurements: BodyMeasurements,
    clothingItem: ClothingItem,
    size: string
  ): string {
    const expectedMeasurement = this.getExpectedMeasurement(clothingItem, size, 'chest');
    const difference = bodyMeasurements.chest - expectedMeasurement;
    
    if (difference > 5) return 'tight';
    if (difference < -5) return 'loose';
    return 'regular';
  }

  private getExpectedMeasurement(clothingItem: ClothingItem, size: string, type: string): number {
    // Get expected measurement for size
    const baseMeasurements = {
      'XS': { chest: 80, waist: 65, hips: 85 },
      'S': { chest: 85, waist: 70, hips: 90 },
      'M': { chest: 90, waist: 75, hips: 95 },
      'L': { chest: 95, waist: 80, hips: 100 },
      'XL': { chest: 100, waist: 85, hips: 105 },
      'XXL': { chest: 105, waist: 90, hips: 110 }
    };
    
    return baseMeasurements[size as keyof typeof baseMeasurements]?.[type as keyof typeof baseMeasurements.M] || 90;
  }

  private analyzeMeasurementFit(bodyMeasurement: number, expectedMeasurement: number): string {
    const difference = Math.abs(bodyMeasurement - expectedMeasurement);
    const ratio = difference / bodyMeasurement;
    
    if (ratio < 0.05) return 'perfect';
    if (ratio < 0.1) return 'good';
    if (ratio < 0.15) return 'acceptable';
    return 'poor';
  }

  private analyzeLengthFit(bodyMeasurements: BodyMeasurements, clothingItem: ClothingItem, size: string): string {
    // Analyze length fit based on body proportions
    return 'good';
  }

  private getDefaultSizingChart(): any {
    return {
      'XS': { chest: 80, waist: 65, hips: 85 },
      'S': { chest: 85, waist: 70, hips: 90 },
      'M': { chest: 90, waist: 75, hips: 95 },
      'L': { chest: 95, waist: 80, hips: 100 },
      'XL': { chest: 100, waist: 85, hips: 105 },
      'XXL': { chest: 105, waist: 90, hips: 110 }
    };
  }

  private calculateAverageSize(sizeEntries: any[]): string {
    // Calculate average size from history
    return 'M'; // Simplified
  }

  private blendSizeRecommendations(option1: SizeOption, option2: SizeOption): SizeOption {
    // Blend two size recommendations
    return option1.confidence > option2.confidence ? option1 : option2;
  }

  private getBrandSizingTendency(brand: string): string {
    const tendencies: Record<string, string> = {
      'StyleCo': 'true to size',
      'Elegance': 'small',
      'DenimCo': 'large',
      'ProFit': 'true to size',
      'FreeSpirit': 'large',
      'MinimalCo': 'small'
    };
    
    return tendencies[brand] || 'true to size';
  }

  private fallbackSizeRecommendation(clothingItem: ClothingItem): SizeRecommendation {
    return {
      recommendedSize: {
        size: 'M',
        confidence: 0.5,
        fitType: 'regular'
      },
      allSizes: clothingItem.sizes.map(size => ({
        size,
        confidence: 0.5,
        fitType: 'regular'
      })),
      fitAnalysis: {
        chest: 'good',
        waist: 'good',
        hips: 'good',
        shoulders: 'good',
        length: 'good',
        overall: 'good'
      },
      adjustmentSuggestions: ['Try the item on for best fit'],
      reasoning: ['Standard size recommendation']
    };
  }

  // Public API
  async recordSizeFeedback(
    userId: string,
    clothingItem: ClothingItem,
    selectedSize: string,
    actualFit: string,
    feedback: string
  ): Promise<void> {
    const userHistory = this.userSizeHistory.get(userId) || {
      brands: {},
      categories: {},
      overall: []
    };
    
    // Update brand history
    if (!userHistory.brands[clothingItem.brand]) {
      userHistory.brands[clothingItem.brand] = [];
    }
    userHistory.brands[clothingItem.brand].push({
      size: selectedSize,
      fit: actualFit,
      feedback,
      timestamp: new Date()
    });
    
    // Update category history
    if (!userHistory.categories[clothingItem.category]) {
      userHistory.categories[clothingItem.category] = [];
    }
    userHistory.categories[clothingItem.category].push({
      size: selectedSize,
      fit: actualFit,
      feedback,
      timestamp: new Date()
    });
    
    this.userSizeHistory.set(userId, userHistory);
  }

  getSizeHistory(userId: string): SizeHistory | null {
    return this.userSizeHistory.get(userId) || null;
  }
}

// Supporting classes
class SizeDatabase {
  private brandSizing: Map<string, BrandSizing> = new Map();
  private categorySizing: Map<string, CategorySizing> = new Map();

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Initialize with known brand sizing data
    this.brandSizing.set('StyleCo', {
      tops: this.getStandardSizing(),
      bottoms: this.getStandardSizing(),
      outerwear: this.getStandardSizing()
    });
    
    // Initialize category sizing
    this.categorySizing.set('tops', {
      tops: this.getStandardSizing()
    });
  }

  private getStandardSizing(): any {
    return {
      'XS': { chest: 80, waist: 65, hips: 85 },
      'S': { chest: 85, waist: 70, hips: 90 },
      'M': { chest: 90, waist: 75, hips: 95 },
      'L': { chest: 95, waist: 80, hips: 100 },
      'XL': { chest: 100, waist: 85, hips: 105 },
      'XXL': { chest: 105, waist: 90, hips: 110 }
    };
  }

  getBrandSizing(brand: string): BrandSizing {
    return this.brandSizing.get(brand) || {
      tops: this.getStandardSizing(),
      bottoms: this.getStandardSizing(),
      outerwear: this.getStandardSizing()
    };
  }

  getCategorySizing(category: string): CategorySizing {
    return this.categorySizing.get(category) || {
      [category]: this.getStandardSizing()
    };
  }
}

// Interfaces
interface BodyMeasurements {
  height: number;
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
}

interface ClothingItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  sizes: string[];
  tags: string[];
  price: number;
}

interface SizePreferences {
  preferredFit: 'tight' | 'regular' | 'loose';
  priorityAreas: string[];
}

interface SizeOption {
  size: string;
  confidence: number;
  fitType: string;
}

interface SizeRecommendation {
  recommendedSize: SizeOption;
  allSizes: SizeOption[];
  fitAnalysis: FitAnalysis;
  adjustmentSuggestions: string[];
  reasoning: string[];
}

interface FitAnalysis {
  chest: string;
  waist: string;
  hips: string;
  shoulders: string;
  length: string;
  overall: string;
}

interface SizeHistory {
  brands: Record<string, any[]>;
  categories: Record<string, any[]>;
  overall: any[];
}

interface BrandSizing {
  tops: any;
  bottoms: any;
  outerwear: any;
}

interface CategorySizing {
  [key: string]: any;
}

export default EnhancedSizeRecommendationService;