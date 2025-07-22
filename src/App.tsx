import React, { useState } from 'react';
import { Shirt, Sparkles, Sun, Camera, User } from 'lucide-react';
import { EnhancedErrorBoundary } from './components/EnhancedErrorBoundary';
import PerformanceOptimizer from './services/performanceOptimizer';
import AccuracyEnhancer from './services/accuracyEnhancer';
import CompatibilityManager from './services/compatibilityManager';
import ScalabilityManager from './services/scalabilityManager';
import OfflineSupport from './services/offlineSupport';
import EnhancedErrorHandling from './services/enhancedErrorHandling';
import PerformanceMonitor from './utils/performanceMonitor';
import { PerformanceIndicator } from './components/PerformanceIndicator';
import { PhotoUpload } from './components/PhotoUpload';
import { ClothingCatalog } from './components/ClothingCatalog';
import { VirtualTryOn } from './components/VirtualTryOn';
import { AIPreferences } from './components/AIPreferences';
import { LightAdjustment } from './components/LightAdjustment';
import { ClothingItem, StylePreferences, LightingSettings } from './types';
import { mockUser } from './utils/mockData';

function App() {
  const [userPhoto, setUserPhoto] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
  const [activeTab, setActiveTab] = useState<'tryon' | 'catalog' | 'preferences' | 'lighting'>('tryon');
  const [preferences, setPreferences] = useState<StylePreferences>(mockUser.preferences);
  const [lightingSettings, setLightingSettings] = useState<LightingSettings>({
    brightness: 100,
    contrast: 100,
    warmth: 50,
    scenario: 'natural',
    intensity: 80
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPerformanceIndicator, setShowPerformanceIndicator] = useState(true);

  // Initialize enhanced services
  React.useEffect(() => {
    const initializeServices = async () => {
      try {
        const performanceOptimizer = PerformanceOptimizer.getInstance();
        const accuracyEnhancer = AccuracyEnhancer.getInstance();
        const compatibilityManager = CompatibilityManager.getInstance();
        const scalabilityManager = ScalabilityManager.getInstance();
        const offlineSupport = OfflineSupport.getInstance();
        const errorHandling = EnhancedErrorHandling.getInstance();
        const performanceMonitor = PerformanceMonitor.getInstance();

        // Initialize all services
        await Promise.all([
          performanceOptimizer.optimizeForDevice(),
          accuracyEnhancer.enhanceAccuracy(),
          compatibilityManager.initialize(),
          scalabilityManager.initialize(),
          offlineSupport.initialize()
        ]);

        // Setup browser and mobile optimizations
        compatibilityManager.setupBrowserOptimizations();
        compatibilityManager.setupMobileOptimizations();

        // Setup error handling
        errorHandling.setupGlobalHandlers();

        // Start performance monitoring
        performanceMonitor.startMonitoring();

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize enhanced services:', error);
        // Continue with basic functionality
        setIsInitialized(true);
      }
    };

    initializeServices();

    // Setup network listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleItemSelect = (item: ClothingItem) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id);
    if (isSelected) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      // Limit to 3 items for better performance
      if (selectedItems.length < 3) {
        setSelectedItems([...selectedItems, item]);
      } else {
        // Replace the oldest item
        setSelectedItems([...selectedItems.slice(1), item]);
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  const tabs = [
    { id: 'tryon', label: 'Try-On', icon: <Camera size={20} /> },
    { id: 'catalog', label: 'Catalog', icon: <Shirt size={20} /> },
    { id: 'preferences', label: 'AI Preferences', icon: <Sparkles size={20} /> },
    { id: 'lighting', label: 'Lighting', icon: <Sun size={20} /> }
  ];

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing VirtualFit...</p>
          <p className="text-sm text-gray-500 mt-2">Optimizing for your device</p>
        </div>
      </div>
    );
  }

  return (
    <EnhancedErrorBoundary>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
            </svg>
            <span>You're offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`bg-white shadow-sm border-b border-gray-200 ${isOffline ? 'mt-10' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Shirt className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">VirtualFit</h1>
                <p className="text-sm text-gray-600">
                  AI-Powered Virtual Try-On
                  {isOffline && <span className="text-yellow-600 ml-2">(Offline Mode)</span>}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Sparkles size={16} className="text-indigo-500" />
                <span>{isOffline ? 'Limited AI' : 'AI Enhanced'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User size={16} className="text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{mockUser.name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Navigation & Photo Upload */}
          <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <nav className="space-y-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    {tab.icon}
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Photo Upload */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Photo</h3>
              <PhotoUpload onPhotoSelect={setUserPhoto} currentPhoto={userPhoto} />
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Items Tried</span>
                  <span className="font-semibold text-indigo-600">{selectedItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Lighting Mode</span>
                  <span className="font-semibold text-emerald-600 capitalize">{lightingSettings.scenario}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">AI Preferences</span>
                  <span className="font-semibold text-purple-600">{preferences.preferredStyles.length} styles</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'tryon' && (
              <VirtualTryOn
                userPhoto={userPhoto}
                selectedItems={selectedItems}
                lightingSettings={lightingSettings}
                onRemoveItem={handleRemoveItem}
              />
            )}

            {activeTab === 'catalog' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Clothing Catalog</h2>
                <ClothingCatalog
                  onItemSelect={handleItemSelect}
                  selectedItems={selectedItems}
                />
              </div>
            )}

            {activeTab === 'preferences' && (
              <AIPreferences
                preferences={preferences}
                onPreferencesChange={setPreferences}
              />
            )}

            {activeTab === 'lighting' && (
              <LightAdjustment
                lightingSettings={lightingSettings}
                onLightingChange={setLightingSettings}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              &copy; 2025 VirtualFit. Powered by advanced AI technology for the best virtual try-on experience.
            </p>
          </div>
        </div>
      </footer>

      {/* Performance Indicator */}
      {showPerformanceIndicator && <PerformanceIndicator />}
    </div>
    </EnhancedErrorBoundary>
  );
}

export default App;