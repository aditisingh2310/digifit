import React, { useState, useEffect } from 'react';
import { Ruler, Target, TrendingUp, AlertCircle, CheckCircle, Shirt, User, Camera, Zap } from 'lucide-react';
import { ClothingItem } from '../types';
import EnhancedSizeRecommendationService from '../services/enhancedSizeRecommendation';

interface AdvancedSizeGuideProps {
  clothingItem: ClothingItem;
  bodyMeasurements?: any;
  userPreferences?: any;
  userId?: string;
  onSizeSelect: (size: string) => void;
}

export const AdvancedSizeGuide: React.FC<AdvancedSizeGuideProps> = ({
  clothingItem,
  bodyMeasurements,
  userPreferences,
  userId,
  onSizeSelect
}) => {
  const [recommendation, setRecommendation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [sizeHistory, setSizeHistory] = useState<any>(null);

  const sizeService = EnhancedSizeRecommendationService.getInstance();

  useEffect(() => {
    if (bodyMeasurements) {
      generateSizeRecommendation();
      loadSizeHistory();
    }
  }, [clothingItem, bodyMeasurements]);

  const generateSizeRecommendation = async () => {
    if (!bodyMeasurements) return;

    setIsLoading(true);
    try {
      const sizePrefs = {
        preferredFit: userPreferences?.preferredFit || 'regular',
        priorityAreas: userPreferences?.priorityAreas || ['chest', 'waist']
      };

      const rec = await sizeService.recommendSize(
        bodyMeasurements,
        clothingItem,
        sizePrefs,
        userId
      );
      
      setRecommendation(rec);
      setSelectedSize(rec.recommendedSize.size);
    } catch (error) {
      console.error('Failed to generate size recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSizeHistory = async () => {
    if (userId) {
      const history = sizeService.getSizeHistory(userId);
      setSizeHistory(history);
    }
  };

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    onSizeSelect(size);
  };

  const submitFeedback = async () => {
    if (userId && selectedSize && userFeedback) {
      await sizeService.recordSizeFeedback(
        userId,
        clothingItem,
        selectedSize,
        userFeedback,
        'User feedback from size guide'
      );
      setUserFeedback('');
      alert('Thank you for your feedback!');
    }
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

  const getSizeChartData = () => {
    // Enhanced size chart with detailed measurements
    return {
      'XS': { chest: '80-84', waist: '64-68', hips: '88-92', length: '58' },
      'S': { chest: '84-88', waist: '68-72', hips: '92-96', length: '60' },
      'M': { chest: '88-92', waist: '72-76', hips: '96-100', length: '62' },
      'L': { chest: '92-96', waist: '76-80', hips: '100-104', length: '64' },
      'XL': { chest: '96-100', waist: '80-84', hips: '104-108', length: '66' },
      'XXL': { chest: '100-104', waist: '84-88', hips: '108-112', length: '68' }
    };
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
          <h3 className="text-lg font-semibold text-gray-800">Advanced Size Guide</h3>
        </div>
        <div className="text-center py-8">
          <Camera className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600 font-medium mb-2">Upload a photo for AI-powered size recommendations</p>
          <p className="text-gray-500 text-sm">Get personalized size suggestions based on your body measurements</p>
        </div>
      </div>
    );
  }

  const sizeChartData = getSizeChartData();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="text-indigo-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Smart Size Recommendation</h3>
            <Zap className="text-yellow-500" size={16} />
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSizeChart(!showSizeChart)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {showSizeChart ? 'Hide' : 'Show'} Size Chart
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
        </div>

        {/* Recommended Size */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-indigo-100 p-4 rounded-full">
              <Shirt className="text-indigo-600" size={32} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Recommended Size for {clothingItem.name}</p>
              <p className="text-3xl font-bold text-gray-900">
                {recommendation.recommendedSize.size}
              </p>
              <p className={`text-sm font-medium ${getConfidenceColor(recommendation.recommendedSize.confidence)}`}>
                {Math.round(recommendation.recommendedSize.confidence * 100)}% confidence
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${getFitColor(recommendation.recommendedSize.fitType)}`}>
              <CheckCircle size={14} className="inline mr-1" />
              {recommendation.recommendedSize.fitType.charAt(0).toUpperCase() + recommendation.recommendedSize.fitType.slice(1)} Fit
            </div>
          </div>
          
          {/* Reasoning */}
          {recommendation.reasoning && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <h5 className="text-sm font-medium text-blue-800 mb-2">Why this size?</h5>
              <ul className="space-y-1">
                {recommendation.reasoning.map((reason: string, index: number) => (
                  <li key={index} className="text-sm text-blue-700 flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* All Size Options */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">All Available Sizes</h4>
          <div className="grid grid-cols-3 gap-2">
            {recommendation.allSizes.map((sizeOption: any) => (
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

        {/* Size Chart */}
        {showSizeChart && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Size Chart (cm)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">Size</th>
                    <th className="text-left p-2">Chest</th>
                    <th className="text-left p-2">Waist</th>
                    <th className="text-left p-2">Hips</th>
                    <th className="text-left p-2">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(sizeChartData).map(([size, measurements]) => (
                    <tr key={size} className={`border-b ${selectedSize === size ? 'bg-indigo-50' : ''}`}>
                      <td className="p-2 font-medium">{size}</td>
                      <td className="p-2">{measurements.chest}</td>
                      <td className="p-2">{measurements.waist}</td>
                      <td className="p-2">{measurements.hips}</td>
                      <td className="p-2">{measurements.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Adjustment Suggestions */}
        {recommendation.adjustmentSuggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-1">
              <TrendingUp size={14} />
              <span>Fit Optimization Tips</span>
            </h4>
            <div className="space-y-2">
              {recommendation.adjustmentSuggestions.map((suggestion: string, index: number) => (
                <div key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                  <AlertCircle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Size History */}
        {sizeHistory && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Your Size History</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">This Brand</p>
                  <p className="font-medium">
                    {sizeHistory.brands[clothingItem.brand] ? 
                      `Usually ${sizeHistory.brands[clothingItem.brand][0]?.size || 'N/A'}` : 
                      'No history'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">This Category</p>
                  <p className="font-medium">
                    {sizeHistory.categories[clothingItem.category] ? 
                      `Usually ${sizeHistory.categories[clothingItem.category][0]?.size || 'N/A'}` : 
                      'No history'
                    }
                  </p>
                </div>
              </div>
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
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
            </div>

            {/* Fit Analysis Details */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Fit Analysis for Size {selectedSize}</h5>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {Object.entries(recommendation.fitAnalysis).map(([area, fit]) => (
                    <div key={area} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{area}:</span>
                      <span className={`font-medium ${
                        fit === 'perfect' ? 'text-green-600' :
                        fit === 'good' ? 'text-blue-600' :
                        fit === 'acceptable' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {fit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Section */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Help us improve</h4>
          <div className="space-y-3">
            <select
              value={userFeedback}
              onChange={(e) => setUserFeedback(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">How did this size work for you?</option>
              <option value="too-small">Too small</option>
              <option value="small">A bit small</option>
              <option value="perfect">Perfect fit</option>
              <option value="large">A bit large</option>
              <option value="too-large">Too large</option>
            </select>
            
            {userFeedback && (
              <button
                onClick={submitFeedback}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Submit Feedback
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-gray-50 px-6 py-4">
        <button
          onClick={() => onSizeSelect(selectedSize)}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Select Size {selectedSize}
        </button>
      </div>
    </div>
  );
};