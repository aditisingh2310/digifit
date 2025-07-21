// Enhanced type definitions for advanced features

export interface AdvancedUser extends User {
  bodyMeasurements?: AdvancedBodyMeasurements;
  facialFeatures?: FacialFeatures;
  styleProfile?: StyleProfile;
  sizeHistory?: SizeHistory;
  preferences: EnhancedStylePreferences;
}

export interface AdvancedBodyMeasurements {
  height: number;
  weight?: number;
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
  armLength: number;
  legLength: number;
  neckCircumference: number;
  bicepCircumference: number;
  forearmCircumference: number;
  thighCircumference: number;
  calfCircumference: number;
  footLength: number;
  torsoLength: number;
  inseam: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  bodyType: BodyType;
  posture?: PostureType;
  symmetryScore?: number;
}

export interface FacialFeatures {
  faceShape: FaceShape;
  skinTone: SkinTone;
  eyeColor: string;
  hairColor: string;
  facialStructure: FacialStructure;
  landmarks: FacialLandmark[];
}

export interface FacialLandmark {
  x: number;
  y: number;
  z: number;
  type: string;
  confidence: number;
}

export interface FacialStructure {
  jawlineStrength: number;
  cheekboneProminence: number;
  foreheadHeight: number;
  eyeSpacing: number;
  noseShape: string;
  lipFullness: number;
}

export interface SkinTone {
  tone: 'very-light' | 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark' | 'very-dark';
  undertone: 'warm' | 'cool' | 'neutral' | 'olive';
  saturation: number;
  luminance: number;
}

export interface FaceShape {
  type: 'oval' | 'round' | 'square' | 'heart' | 'diamond' | 'oblong' | 'triangle';
  confidence: number;
  measurements: {
    faceLength: number;
    faceWidth: number;
    jawWidth: number;
    foreheadWidth: number;
    cheekboneWidth: number;
  };
}

export interface StyleProfile {
  dominantStyles: ClothingStyle[];
  colorPalette: ColorPalette;
  preferredFit: FitPreference;
  lifestyleFactors: LifestyleFactors;
  fashionPersonality: FashionPersonality;
}

export interface ColorPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  neutral: string[];
  seasonal: SeasonalColors;
}

export interface SeasonalColors {
  spring: string[];
  summer: string[];
  fall: string[];
  winter: string[];
}

export interface FitPreference {
  overall: 'very-tight' | 'tight' | 'fitted' | 'regular' | 'relaxed' | 'loose' | 'oversized';
  chest: 'tight' | 'fitted' | 'regular' | 'loose';
  waist: 'tight' | 'fitted' | 'regular' | 'loose';
  hips: 'tight' | 'fitted' | 'regular' | 'loose';
  sleeves: 'tight' | 'fitted' | 'regular' | 'loose';
  length: 'short' | 'regular' | 'long';
}

export interface LifestyleFactors {
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  workEnvironment: 'office' | 'remote' | 'retail' | 'outdoor' | 'creative' | 'healthcare';
  socialLevel: 'introvert' | 'ambivert' | 'extrovert';
  travelFrequency: 'never' | 'rarely' | 'occasionally' | 'frequently' | 'constantly';
  budget: 'budget' | 'moderate' | 'premium' | 'luxury';
}

export interface FashionPersonality {
  type: 'classic' | 'trendy' | 'bohemian' | 'edgy' | 'romantic' | 'minimalist' | 'eclectic';
  riskTolerance: 'conservative' | 'moderate' | 'adventurous';
  brandLoyalty: 'high' | 'medium' | 'low';
  sustainabilityFocus: 'high' | 'medium' | 'low';
}

export interface SizeHistory {
  [brand: string]: {
    [category: string]: {
      size: string;
      fit: 'too-small' | 'small' | 'perfect' | 'large' | 'too-large';
      date: Date;
      notes?: string;
    }[];
  };
}

export interface EnhancedStylePreferences extends StylePreferences {
  colorAnalysis?: ColorAnalysis;
  bodyTypeRecommendations?: BodyTypeRecommendations;
  personalityAlignment?: PersonalityAlignment;
  seasonalPreferences?: SeasonalPreferences;
  accessoryPreferences?: AccessoryPreferences;
}

export interface ColorAnalysis {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  subtype: string;
  bestColors: string[];
  worstColors: string[];
  neutrals: string[];
  metals: 'gold' | 'silver' | 'both';
}

export interface BodyTypeRecommendations {
  silhouettes: string[];
  patterns: string[];
  necklines: string[];
  sleeves: string[];
  hemlines: string[];
  fabricTypes: string[];
  avoidPatterns: string[];
  avoidSilhouettes: string[];
}

export interface PersonalityAlignment {
  mbtiType?: string;
  styleArchetype: string;
  colorPersonality: string;
  fashionGoals: string[];
}

export interface SeasonalPreferences {
  spring: ClothingPreference;
  summer: ClothingPreference;
  fall: ClothingPreference;
  winter: ClothingPreference;
}

export interface ClothingPreference {
  colors: string[];
  fabrics: string[];
  styles: string[];
  accessories: string[];
}

export interface AccessoryPreferences {
  jewelry: JewelryPreferences;
  bags: BagPreferences;
  shoes: ShoePreferences;
  scarves: boolean;
  hats: boolean;
  belts: boolean;
}

export interface JewelryPreferences {
  metals: ('gold' | 'silver' | 'rose-gold' | 'platinum')[];
  styles: ('minimalist' | 'statement' | 'vintage' | 'modern')[];
  types: ('earrings' | 'necklaces' | 'bracelets' | 'rings' | 'watches')[];
}

export interface BagPreferences {
  sizes: ('mini' | 'small' | 'medium' | 'large' | 'oversized')[];
  styles: ('tote' | 'crossbody' | 'clutch' | 'backpack' | 'satchel')[];
  materials: ('leather' | 'canvas' | 'synthetic' | 'fabric')[];
}

export interface ShoePreferences {
  heelHeights: ('flat' | 'low' | 'medium' | 'high')[];
  styles: ('sneakers' | 'boots' | 'heels' | 'flats' | 'sandals')[];
  comfort: 'high' | 'medium' | 'low';
}

export interface AdvancedClothingItem extends ClothingItem {
  materialComposition: MaterialComposition;
  sustainability: SustainabilityInfo;
  careInstructions: CareInstructions;
  sizeChart: SizeChart;
  fitModel: FitModel;
  colorVariants: ColorVariant[];
  seasonality: Seasonality;
  versatilityScore: number;
  trendScore: number;
  qualityScore: number;
}

export interface MaterialComposition {
  primary: Material;
  secondary?: Material;
  lining?: Material;
  stretch: number; // 0-100%
  breathability: number; // 0-100%
  durability: number; // 0-100%
  wrinkleResistance: number; // 0-100%
}

export interface Material {
  type: string;
  percentage: number;
  origin?: string;
  certifications?: string[];
}

export interface SustainabilityInfo {
  ecoRating: number; // 0-100%
  carbonFootprint: number;
  waterUsage: number;
  recycledContent: number; // 0-100%
  ethicalProduction: boolean;
  certifications: string[];
}

export interface CareInstructions {
  washing: WashingInstructions;
  drying: DryingInstructions;
  ironing: IroningInstructions;
  storage: StorageInstructions;
  professionalCleaning: boolean;
}

export interface WashingInstructions {
  temperature: number; // Celsius
  cycle: 'delicate' | 'normal' | 'heavy';
  detergent: 'mild' | 'normal' | 'special';
  bleach: boolean;
  handWash: boolean;
}

export interface DryingInstructions {
  method: 'air-dry' | 'tumble-dry' | 'flat-dry' | 'hang-dry';
  temperature: 'low' | 'medium' | 'high' | 'no-heat';
  directSunlight: boolean;
}

export interface IroningInstructions {
  temperature: 'low' | 'medium' | 'high' | 'no-iron';
  steam: boolean;
  pressCloth: boolean;
}

export interface StorageInstructions {
  method: 'hang' | 'fold' | 'roll';
  environment: 'dry' | 'humid' | 'climate-controlled';
  protection: string[];
}

export interface SizeChart {
  measurements: {
    [size: string]: {
      chest?: number;
      waist?: number;
      hips?: number;
      length?: number;
      shoulderWidth?: number;
      sleeveLength?: number;
    };
  };
  fitType: 'slim' | 'regular' | 'relaxed' | 'oversized';
  stretchFactor: number;
}

export interface FitModel {
  height: number;
  chest: number;
  waist: number;
  hips: number;
  size: string;
  fit: 'tight' | 'fitted' | 'regular' | 'loose';
}

export interface ColorVariant {
  name: string;
  hex: string;
  rgb: [number, number, number];
  availability: boolean;
  seasonality: ('spring' | 'summer' | 'fall' | 'winter')[];
}

export interface Seasonality {
  primary: ('spring' | 'summer' | 'fall' | 'winter')[];
  secondary: ('spring' | 'summer' | 'fall' | 'winter')[];
  yearRound: boolean;
}

export interface AdvancedTryOnSession extends TryOnSession {
  bodyPose?: AdvancedBodyPose;
  facialFeatures?: FacialFeatures;
  aiInsights?: AIInsights;
  performanceMetrics?: PerformanceMetrics;
  qualitySettings?: QualitySettings;
  environmentalFactors?: EnvironmentalFactors;
}

export interface AdvancedBodyPose {
  keypoints: BodyKeypoint[];
  confidence: number;
  boundingBox: BoundingBox;
  bodyAngles: BodyAngles;
  posture: PostureAnalysis;
  symmetry: BodySymmetry;
  measurements: AdvancedBodyMeasurements;
}

export interface BodyKeypoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
  name: string;
  visibility: number;
}

export interface BodyAngles {
  neck: number;
  leftShoulder: number;
  rightShoulder: number;
  leftElbow: number;
  rightElbow: number;
  spine: number;
  leftHip: number;
  rightHip: number;
  leftKnee: number;
  rightKnee: number;
}

export interface PostureAnalysis {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  headPosition: 'forward' | 'neutral' | 'back';
  shoulderAlignment: 'level' | 'left-high' | 'right-high';
  spineAlignment: 'straight' | 'curved' | 'twisted';
  recommendations: string[];
}

export interface BodySymmetry {
  overall: number; // 0-1
  shoulders: number;
  arms: number;
  torso: number;
  legs: number;
  recommendations: string[];
}

export interface AIInsights {
  fitPredictions: FitPrediction[];
  styleRecommendations: StyleRecommendation[];
  sizeRecommendations: SizeRecommendation[];
  colorAnalysis: ColorAnalysisResult;
  bodyTypeAnalysis: BodyTypeAnalysis;
  confidenceScores: ConfidenceScores;
}

export interface FitPrediction {
  area: 'chest' | 'waist' | 'hips' | 'shoulders' | 'length';
  prediction: 'too-tight' | 'tight' | 'perfect' | 'loose' | 'too-loose';
  confidence: number;
  reasoning: string;
}

export interface StyleRecommendation {
  item: AdvancedClothingItem;
  score: number;
  reasons: string[];
  category: 'perfect-match' | 'good-match' | 'alternative' | 'experimental';
}

export interface SizeRecommendation {
  size: string;
  confidence: number;
  fitType: 'tight' | 'fitted' | 'regular' | 'loose';
  adjustments: string[];
}

export interface ColorAnalysisResult {
  harmony: number; // 0-1
  contrast: number; // 0-1
  seasonalAlignment: number; // 0-1
  recommendations: string[];
}

export interface BodyTypeAnalysis {
  primaryType: BodyType;
  secondaryType?: BodyType;
  confidence: number;
  characteristics: string[];
  recommendations: BodyTypeRecommendations;
}

export interface ConfidenceScores {
  poseDetection: number;
  bodySegmentation: number;
  facialAnalysis: number;
  clothingFit: number;
  overall: number;
}

export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage?: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface QualitySettings {
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  antiAliasing: boolean;
  shadows: boolean;
  reflections: boolean;
  materialPhysics: boolean;
  advancedLighting: boolean;
  postProcessing: boolean;
}

export interface EnvironmentalFactors {
  lighting: LightingConditions;
  background: BackgroundType;
  cameraQuality: CameraQuality;
  stability: StabilityMetrics;
}

export interface LightingConditions {
  type: 'natural' | 'artificial' | 'mixed';
  intensity: number; // 0-100%
  direction: 'front' | 'side' | 'back' | 'top' | 'mixed';
  color: 'warm' | 'neutral' | 'cool';
  uniformity: number; // 0-100%
}

export interface BackgroundType {
  type: 'plain' | 'textured' | 'busy' | 'outdoor' | 'indoor';
  contrast: number; // 0-100%
  distractionLevel: number; // 0-100%
}

export interface CameraQuality {
  resolution: string;
  stability: number; // 0-100%
  focus: number; // 0-100%
  exposure: number; // 0-100%
  colorAccuracy: number; // 0-100%
}

export interface StabilityMetrics {
  handShake: number; // 0-100%
  bodyMovement: number; // 0-100%
  cameraMovement: number; // 0-100%
}

// Extended existing types
export type BodyType = 'ectomorph' | 'mesomorph' | 'endomorph' | 'pear' | 'apple' | 'hourglass' | 'rectangle' | 'inverted-triangle' | 'athletic' | 'petite' | 'tall' | 'plus-size';

export type PostureType = 'excellent' | 'good' | 'forward-head' | 'rounded-shoulders' | 'anterior-pelvic-tilt' | 'posterior-pelvic-tilt' | 'scoliosis' | 'kyphosis' | 'lordosis';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}