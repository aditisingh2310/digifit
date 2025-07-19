import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  Eye,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Zap,
  Target,
  DollarSign,
  Clock,
  Smartphone,
  Monitor,
  Globe
} from 'lucide-react';
import EnhancedApiService from '../services/enhancedApiService';

interface AdvancedAnalyticsDashboardProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  timeRange,
  onTimeRangeChange
}) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetrics, setSelectedMetrics] = useState(['conversion', 'engagement', 'revenue']);
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'performance' | 'ai-insights'>('overview');
  const [realTimeData, setRealTimeData] = useState<any>(null);

  const apiService = EnhancedApiService.getInstance();

  useEffect(() => {
    loadAnalyticsData();
    const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getAnalyticsAdvanced({
        startDate: getStartDate(timeRange),
        endDate: new Date().toISOString(),
        metrics: selectedMetrics,
        dimensions: ['date', 'device', 'category', 'user_segment']
      });
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealTimeData = async () => {
    try {
      const data = await apiService.getAnalyticsAdvanced({
        startDate: new Date(Date.now() - 60000).toISOString(), // Last minute
        endDate: new Date().toISOString(),
        metrics: ['active_users', 'try_ons', 'conversions'],
        dimensions: ['minute']
      });
      setRealTimeData(data);
    } catch (error) {
      console.error('Failed to load real-time data:', error);
    }
  };

  const getStartDate = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const kpiCards = [
    {
      title: 'Total Try-Ons',
      value: analyticsData?.overview?.totalTryOns?.toLocaleString() || '0',
      change: '+24.5%',
      trend: 'up',
      icon: <Eye size={24} />,
      color: 'blue'
    },
    {
      title: 'Conversion Rate',
      value: `${analyticsData?.overview?.conversionRate || 0}%`,
      change: '+8.2%',
      trend: 'up',
      icon: <Target size={24} />,
      color: 'green'
    },
    {
      title: 'Revenue Impact',
      value: `$${(analyticsData?.overview?.revenueImpact || 0).toLocaleString()}`,
      change: '+31.7%',
      trend: 'up',
      icon: <DollarSign size={24} />,
      color: 'purple'
    },
    {
      title: 'Avg Session Time',
      value: `${analyticsData?.overview?.averageSessionTime || 0}m`,
      change: '+12.3%',
      trend: 'up',
      icon: <Clock size={24} />,
      color: 'orange'
    },
    {
      title: 'Mobile Usage',
      value: '78.3%',
      change: '+5.7%',
      trend: 'up',
      icon: <Smartphone size={24} />,
      color: 'indigo'
    },
    {
      title: 'AI Accuracy',
      value: '94.2%',
      change: '+2.1%',
      trend: 'up',
      icon: <Zap size={24} />,
      color: 'yellow'
    }
  ];

  const conversionFunnelData = [
    { step: 'Page Views', users: 10000, rate: 100 },
    { step: 'Photo Uploads', users: 3500, rate: 35 },
    { step: 'Try-Ons', users: 2800, rate: 28 },
    { step: 'Add to Cart', users: 1400, rate: 14 },
    { step: 'Purchases', users: 980, rate: 9.8 }
  ];

  const devicePerformanceData = [
    { device: 'Mobile', tryOns: 4500, conversion: 8.2, avgTime: 4.1 },
    { device: 'Desktop', tryOns: 2800, conversion: 12.5, avgTime: 6.8 },
    { device: 'Tablet', tryOns: 1200, conversion: 10.1, avgTime: 5.2 }
  ];

  const aiInsightsData = [
    { metric: 'Pose Detection', accuracy: 96.5, confidence: 94.2 },
    { metric: 'Body Segmentation', accuracy: 93.8, confidence: 91.5 },
    { metric: 'Clothing Fit', accuracy: 89.2, confidence: 87.8 },
    { metric: 'Style Matching', accuracy: 91.7, confidence: 89.3 },
    { metric: 'Size Prediction', accuracy: 88.5, confidence: 86.1 }
  ];

  const cohortData = [
    { week: 'Week 1', retention: [100, 85, 72, 65, 58, 52, 48] },
    { week: 'Week 2', retention: [100, 88, 75, 68, 61, 55, 51] },
    { week: 'Week 3', retention: [100, 90, 78, 71, 64, 58, 54] },
    { week: 'Week 4', retention: [100, 87, 74, 67, 60, 54, 50] }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin" size={20} />
          <span>Loading advanced analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          {realTimeData && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Data</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => onTimeRangeChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={loadAnalyticsData}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart size={16} /> },
            { id: 'behavior', label: 'User Behavior', icon: <Users size={16} /> },
            { id: 'performance', label: 'Performance', icon: <TrendingUp size={16} /> },
            { id: 'ai-insights', label: 'AI Insights', icon: <Zap size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((kpi, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                <p className={`text-sm mt-1 ${kpi.trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.change}
                </p>
              </div>
              <div className={`text-${kpi.color}-600`}>{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnelData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="step" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="users" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Device Performance */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={devicePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tryOns" name="Try-Ons" />
                <YAxis dataKey="conversion" name="Conversion %" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Devices" dataKey="conversion" fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'behavior' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Journey Heatmap */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Journey Heatmap</h3>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-600">Interactive heatmap visualization</p>
            </div>
          </div>

          {/* Cohort Analysis */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cohort Retention</h3>
            <div className="space-y-2">
              {cohortData.map((cohort, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-16 text-xs text-gray-600">{cohort.week}</span>
                  <div className="flex space-x-1 flex-1">
                    {cohort.retention.map((rate, i) => (
                      <div
                        key={i}
                        className="h-6 flex-1 rounded"
                        style={{
                          backgroundColor: `rgba(79, 70, 229, ${rate / 100})`,
                        }}
                        title={`${rate}%`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Load Time</span>
                <span className="font-semibold">1.2s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">AI Processing Time</span>
                <span className="font-semibold">2.8s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Error Rate</span>
                <span className="font-semibold text-green-600">0.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Uptime</span>
                <span className="font-semibold text-green-600">99.9%</span>
              </div>
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Usage</h3>
            <div className="h-64 bg-gradient-to-br from-green-50 to-blue-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Globe size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">World map visualization</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ai-insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Model Performance */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={aiInsightsData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Accuracy"
                  dataKey="accuracy"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Confidence"
                  dataKey="confidence"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* AI Recommendations Impact */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations Impact</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Recommendation Accuracy</span>
                <span className="font-semibold">87.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Click-through Rate</span>
                <span className="font-semibold">23.7%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Conversion Lift</span>
                <span className="font-semibold text-green-600">+34.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Revenue per Recommendation</span>
                <span className="font-semibold">$12.45</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Activity Feed */}
      {realTimeData && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {realTimeData.activeUsers || 0}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {realTimeData.tryOns || 0}
              </div>
              <div className="text-sm text-gray-600">Try-ons/min</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {realTimeData.conversions || 0}
              </div>
              <div className="text-sm text-gray-600">Conversions/min</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};