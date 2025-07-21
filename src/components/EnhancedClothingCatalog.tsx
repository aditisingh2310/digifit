import React, { useState, useEffect, useMemo } from 'react';
import { 
  Heart, Star, Filter, Search, Grid, List, SlidersHorizontal,
  Zap, Target, TrendingUp, Eye, ShoppingBag, Sparkles
} from 'lucide-react';
import { ClothingItem, ClothingCategory, ClothingStyle } from '../types';
import { AdvancedAIService } from '../services/advancedAIService';
import { mockClothingItems } from '../utils/mockData';

interface EnhancedClothingCatalogProps {
  onItemSelect: (item: ClothingItem) => void;
  selectedItems: ClothingItem[];
  userProfile?: any;
  bodyMeasurements?: any;
}

export const EnhancedClothingCatalog: React.FC<EnhancedClothingCatalogProps> = ({ 
  onItemSelect, 
  selectedItems,
  userProfile,
  bodyMeasurements
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | 'all'>('all');
  const [selectedStyle, setSelectedStyle] = useState<ClothingStyle | 'all'>('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 300]);
  const [sortBy, setSortBy] = useState<'relevance' | 'price' | 'rating' | 'popularity'>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  const [aiRecommendations, setAiRecommendations] = useState<ClothingItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [favoriteItems, setFavoriteItems] = useState<Set<string>>(new Set());

  const aiService = AdvancedAIService.getInstance();

  const categories: (ClothingCategory | 'all')[] = ['all', 'tops', 'bottoms', 'dresses', 'outerwear', 'accessories'];
  const styles: (ClothingStyle | 'all')[] = ['all', 'casual', 'formal', 'business', 'trendy', 'classic', 'bohemian', 'minimalist'];

  useEffect(() => {
    if (userProfile && bodyMeasurements && showAIRecommendations) {
      generateAIRecommendations();
    }
  }, [userProfile, bodyMeasurements, showAIRecommendations]);

  const generateAIRecommendations = async () => {
    if (!userProfile || !bodyMeasurements) return;

    setIsLoadingRecommendations(true);
    try {
      const context = {
        season: getCurrentSeason(),
        occasion: 'casual',
        weather: 'mild',
        timeOfDay: 'afternoon'
      };

      const recommendations = await aiService.generateSmartRecommendations(
        userProfile,
        bodyMeasurements,
        mockClothingItems,
        context
      );

      setAiRecommendations(recommendations.map(rec => rec.item));
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const getCurrentSeason = (): 'spring' | 'summer' | 'fall' | 'winter' => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  const filteredItems = useMemo(() => {
    let items = mockClothingItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           item.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStyle = selectedStyle === 'all' || item.style === selectedStyle;
      const matchesPrice = item.price >= priceRange[0] && item.price <= priceRange[1];
      
      return matchesSearch && matchesCategory && matchesStyle && matchesPrice;
    });

    // Apply sorting
    switch (sortBy) {
      case 'price':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'rating':
        items.sort((a, b) => b.rating - a.rating);
        break;
      case 'popularity':
        items.sort((a, b) => (b as any).popularity || 0 - (a as any).popularity || 0);
        break;
      case 'relevance':
      default:
        // Keep original order or apply relevance scoring
        break;
    }

    return items;
  }, [searchTerm, selectedCategory, selectedStyle, priceRange, sortBy]);

  const isSelected = (item: ClothingItem) => selectedItems.some(selected => selected.id === item.id);
  const isFavorite = (item: ClothingItem) => favoriteItems.has(item.id);
  const isRecommended = (item: ClothingItem) => aiRecommendations.some(rec => rec.id === item.id);

  const toggleFavorite = (item: ClothingItem) => {
    const newFavorites = new Set(favoriteItems);
    if (newFavorites.has(item.id)) {
      newFavorites.delete(item.id);
    } else {
      newFavorites.add(item.id);
    }
    setFavoriteItems(newFavorites);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedStyle('all');
    setPriceRange([0, 300]);
    setSortBy('relevance');
  };

  const ItemCard: React.FC<{ item: ClothingItem }> = ({ item }) => (
    <div
      className={`group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer relative ${
        isSelected(item) ? 'ring-2 ring-indigo-500 shadow-xl' : ''
      }`}
      onClick={() => onItemSelect(item)}
    >
      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex flex-col space-y-1">
        {isRecommended(item) && (
          <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <Sparkles size={10} />
            <span>AI Pick</span>
          </span>
        )}
        {item.rating >= 4.5 && (
          <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
            <Star size={10} fill="currentColor" />
            <span>Top Rated</span>
          </span>
        )}
      </div>

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(item);
        }}
        className="absolute top-2 right-2 z-10 bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Heart 
          size={16} 
          className={`${isFavorite(item) ? 'text-red-500 fill-current' : 'text-gray-600'} hover:text-red-500`} 
        />
      </button>

      <div className="relative overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isSelected(item) && (
          <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
            <div className="bg-indigo-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
              <Target size={14} />
              <span>Selected</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-1">{item.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{item.brand}</p>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-gray-900">${item.price}</span>
          <div className="flex items-center space-x-1">
            <Star size={14} className="text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600">{item.rating}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* AI Insights */}
        {isRecommended(item) && (
          <div className="mt-2 p-2 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-700 flex items-center space-x-1">
              <Zap size={10} />
              <span>Perfect match for your style and body type</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const ItemListCard: React.FC<{ item: ClothingItem }> = ({ item }) => (
    <div
      className={`group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer flex ${
        isSelected(item) ? 'ring-2 ring-indigo-500' : ''
      }`}
      onClick={() => onItemSelect(item)}
    >
      <div className="relative w-24 h-24 flex-shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {isRecommended(item) && (
          <div className="absolute top-1 left-1">
            <span className="bg-purple-500 text-white px-1 py-0.5 rounded text-xs flex items-center space-x-1">
              <Sparkles size={8} />
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-3 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-800">{item.name}</h3>
          <p className="text-sm text-gray-600">{item.brand}</p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="font-bold text-gray-900">${item.price}</span>
            <div className="flex items-center space-x-1">
              <Star size={12} className="text-yellow-400 fill-current" />
              <span className="text-xs text-gray-600">{item.rating}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item);
            }}
            className="p-1"
          >
            <Heart 
              size={14} 
              className={`${isFavorite(item) ? 'text-red-500 fill-current' : 'text-gray-400'} hover:text-red-500`} 
            />
          </button>
          {isSelected(item) && (
            <Target size={16} className="text-indigo-500" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* AI Recommendations Section */}
      {showAIRecommendations && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="text-purple-600" size={20} />
              <h3 className="text-lg font-semibold text-purple-800">AI Recommendations</h3>
            </div>
            <button
              onClick={() => setShowAIRecommendations(false)}
              className="text-purple-600 hover:text-purple-700 text-sm"
            >
              Hide
            </button>
          </div>
          
          {isLoadingRecommendations ? (
            <div className="flex items-center space-x-2 text-purple-600">
              <Zap className="animate-pulse" size={16} />
              <span>Generating personalized recommendations...</span>
            </div>
          ) : aiRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiRecommendations.slice(0, 4).map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <p className="text-purple-700">Upload a photo to get personalized AI recommendations!</p>
          )}
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search clothing items, brands, or styles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <SlidersHorizontal size={20} />
            <span>Filters</span>
          </button>
          
          <div className="flex items-center bg-white border border-gray-300 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-800">Advanced Filters</h4>
            <button
              onClick={clearFilters}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ClothingCategory | 'all')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value as ClothingStyle | 'all')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              >
                {styles.map(style => (
                  <option key={style} value={style}>
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              >
                <option value="relevance">Relevance</option>
                <option value="price">Price: Low to High</option>
                <option value="rating">Highest Rated</option>
                <option value="popularity">Most Popular</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range: ${priceRange[0]} - ${priceRange[1]}
              </label>
              <input
                type="range"
                min="0"
                max="300"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          Showing {filteredItems.length} of {mockClothingItems.length} items
          {selectedItems.length > 0 && (
            <span className="ml-2 text-indigo-600 font-medium">
              • {selectedItems.length} selected
            </span>
          )}
        </p>
        
        {favoriteItems.size > 0 && (
          <p className="text-gray-600 flex items-center space-x-1">
            <Heart size={14} className="text-red-500" />
            <span>{favoriteItems.size} favorites</span>
          </p>
        )}
      </div>

      {/* Items Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <ItemListCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <ShoppingBag className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg mb-2">No items found matching your criteria</p>
          <p className="text-gray-400 mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={clearFilters}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};