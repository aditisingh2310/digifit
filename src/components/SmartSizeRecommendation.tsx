import React, { useState, useEffect } from 'react';
import { Ruler, Target, TrendingUp, AlertCircle, CheckCircle, Shirt, User } from 'lucide-react';
import { AdvancedAIService, AdvancedBodyMeasurements, SizeRecommendation } from '../services/advancedAIService';
import { ClothingItem } from '../types';

interface SmartSizeRecommendationProps {
  clothingItem: ClothingItem;
  bodyMeasurements?: AdvancedBodyMeasurements;
  userPreferences?: any;
  onSizeSelect: (size: string) => void;
}

export const SmartSizeRecommendation: React.FC<SmartSizeRecommendationProps> = ({
  clothingItem,
  bodyMeasurements,
  userPreferences,
  onSizeSelect
}) => {
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const aiService = AdvancedAIService.getInstance();

  useEffect(() => {
    if (bodyMeasurements) {
      generateSizeRecommendation();
    }
  }, [clothingItem, bodyMeasurements]);

  const generateSizeRecommendation = async () => {
    if (!bodyMeasurements) return;

    setIsLoading(true);
    try {
      const sizePrefs = {
        preferredFit: userPreferences?.preferredFit || 'regular',
        priorityAreas: userPreferences?.priorityAreas || ['chest', 'waist'],
        previousSizes: userPreferences?.previousSizes || {}
      };

      const rec = await aiService.recommendOptimalSize(
        bodyMeasurements,
        clothingItem,
        sizePrefs
      );
      
      setRecommendation(rec);
      setSelectedSize(rec.recommendedSize.size);
    } catch (error) {
      console.error('Failed to generate size recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    onSizeSelect(size);
  };

  const getFitColor = (fitType: string) => {
    switch (fitType) {
      case 'perfect': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'tight': return 'text-orange-600 bg-orange-100';
      case 'loose': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-2 mb-4">
          <Ruler className="text-indigo-600 animate-pulse" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Analyzing Size...</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-2 mb-4">
          <Ruler className="text-gray-400" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Size Recommendation</h3>
        </div>
        <p className="text-gray-600">Upload a photo to get AI-powered size recommendations</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="text-indigo-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Smart Size Recommendation</h3>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Recommended Size */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-indigo-100 p-3 rounded-full">
              <Shirt className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recommended Size</p>
              <p className="text-2xl font-bold text-gray-900">
                {recommendation.recommendedSize.size}
              </p>
              <p className={`text-sm font-medium ${getConfidenceColor(recommendation.recommendedSize.confidence)}`}>
                {Math.round(recommendation.recommendedSize.confidence * 100)}% confidence
              </p>
            </div>
          </div>
          
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getFitColor(recommendation.recommendedSize.fitType)}`}>
            <CheckCircle size={14} className="mr-1" />
            {recommendation.recommendedSize.fitType.charAt(0).toUpperCase() + recommendation.recommendedSize.fitType.slice(1)} Fit
          </div>
        </div>

        {/* All Size Options */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">All Available Sizes</h4>
          <div className="grid grid-cols-3 gap-2">
            {recommendation.allSizes.map((sizeOption) => (
              <button
                key={sizeOption.size}
                onClick={() => handleSizeSelect(sizeOption.size)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedSize === sizeOption.size
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{sizeOption.size}</p>
                  <p className={`text-xs ${getConfidenceColor(sizeOption.confidence)}`}>
                    {Math.round(sizeOption.confidence * 100)}%
                  </p>
                  <p className="text-xs text-gray-600 capitalize">{sizeOption.fitType}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Adjustment Suggestions */}
        {recommendation.adjustmentSuggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-1">
              <TrendingUp size={14} />
              <span>Fit Optimization Tips</span>
            </h4>
            <div className="space-y-2">
              {recommendation.adjustmentSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <AlertCircle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Analysis */}
        {showDetails && bodyMeasurements && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-1">
              <User size={14} />
              <span>Body Measurements Analysis</span>
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Height</p>
                <p className="font-medium">{Math.round(bodyMeasurements.height)} cm</p>
              </div>
              <div>
                <p className="text-gray-600">Chest</p>
                <p className="font-medium">{Math.round(bodyMeasurements.chest)} cm</p>
              </div>
              <div>
                <p className="text-gray-600">Waist</p>
                <p className="font-medium">{Math.round(bodyMeasurements.waist)} cm</p>
              </div>
              <div>
                <p className="text-gray-600">Hips</p>
                <p className="font-medium">{Math.round(bodyMeasurements.hips)} cm</p>
              </div>
              <div>
                <p className="text-gray-600">Body Type</p>
                <p className="font-medium capitalize">{bodyMeasurements.bodyType}</p>
              </div>
              <div>
                <p className="text-gray-600">Shoulder Width</p>
                <p className="font-medium">{Math.round(bodyMeasurements.shoulderWidth)} cm</p>
              </div>
            </div>

            {/* Fit Analysis Details */}
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Fit Analysis</h5>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chest Fit:</span>
                    <span className="font-medium text-green-600">Perfect</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Waist Fit:</span>
                    <span className="font-medium text-blue-600">Good</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Length:</span>
                    <span className="font-medium text-green-600">Perfect</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shoulders:</span>
                    <span className="font-medium text-green-600">Perfect</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="bg-gray-50 px-6 py-4">
        <button
          onClick={() => onSizeSelect(selectedSize)}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Select Size {selectedSize}
        </button>
      </div>
    </div>
  );
};