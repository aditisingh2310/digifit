import React, { useState, useEffect } from 'react';
import { Activity, Zap, AlertTriangle, CheckCircle, Settings, X } from 'lucide-react';
import PerformanceMonitor from '../utils/performanceMonitor';

export const PerformanceIndicator: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [performanceScore, setPerformanceScore] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const performanceMonitor = PerformanceMonitor.getInstance();

  useEffect(() => {
    // Start monitoring
    performanceMonitor.startMonitoring();

    // Update metrics every 2 seconds
    const interval = setInterval(() => {
      const currentMetrics = performanceMonitor.getMetrics();
      const score = performanceMonitor.getPerformanceScore();
      const report = performanceMonitor.generatePerformanceReport();
      
      setMetrics(currentMetrics);
      setPerformanceScore(score);
      setRecommendations(report.recommendations);
    }, 2000);

    // Listen for performance events
    const handlePerformanceEvent = (event: CustomEvent) => {
      console.log('Performance event:', event.type, event.detail);
    };

    document.addEventListener('performance:optimize', handlePerformanceEvent as EventListener);
    document.addEventListener('performance:memory-cleanup', handlePerformanceEvent as EventListener);

    return () => {
      clearInterval(interval);
      document.removeEventListener('performance:optimize', handlePerformanceEvent as EventListener);
      document.removeEventListener('performance:memory-cleanup', handlePerformanceEvent as EventListener);
    };
  }, []);

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceIcon = (score: number) => {
    if (score >= 80) return <CheckCircle size={16} />;
    if (score >= 60) return <Zap size={16} />;
    return <AlertTriangle size={16} />;
  };

  if (!metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Compact indicator */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg transition-all ${getPerformanceColor(performanceScore)}`}
        >
          {getPerformanceIcon(performanceScore)}
          <span className="font-medium text-sm">{Math.round(performanceScore)}</span>
        </button>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="text-indigo-600" size={20} />
                <h3 className="font-semibold text-gray-800">Performance</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 text-gray-600 hover:text-gray-800 rounded"
                >
                  <Settings size={16} />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 text-gray-600 hover:text-gray-800 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Overall Score</span>
                <span className={`font-bold ${getPerformanceColor(performanceScore).split(' ')[0]}`}>
                  {Math.round(performanceScore)}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    performanceScore >= 80 ? 'bg-green-500' :
                    performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${performanceScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 max-h-64 overflow-y-auto">
            {/* Metrics */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">FPS</span>
                <span className={`font-medium ${metrics.fps >= 30 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.fps}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <span className={`font-medium ${metrics.memoryUsage <= 70 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.memoryUsage}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Load Time</span>
                <span className={`font-medium ${metrics.loadTime <= 3000 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(metrics.loadTime)}ms
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AI Processing</span>
                <span className={`font-medium ${metrics.aiProcessingTime <= 5000 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(metrics.aiProcessingTime)}ms
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Network Latency</span>
                <span className={`font-medium ${metrics.networkLatency <= 200 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(metrics.networkLatency)}ms
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cache Hit Rate</span>
                <span className={`font-medium ${metrics.cacheHitRate >= 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {Math.round(metrics.cacheHitRate * 100)}%
                </span>
              </div>
            </div>

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start">
                      <span className="text-yellow-500 mr-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Settings */}
            {showSettings && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Performance Settings</h4>
                <div className="space-y-2">
                  <label className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    Auto-optimize performance
                  </label>
                  <label className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    Reduce quality on low FPS
                  </label>
                  <label className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2" defaultChecked />
                    Clear cache on high memory
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};