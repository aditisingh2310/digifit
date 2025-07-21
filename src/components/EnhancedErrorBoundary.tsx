import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Send, ChevronDown, ChevronUp } from 'lucide-react';
import ErrorService from '../services/errorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  isReporting: boolean;
  reportSent: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private errorService: ErrorService;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isReporting: false,
      reportSent: false
    };
    this.errorService = ErrorService.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to service
    this.errorService.logError(error, {
      component: 'ErrorBoundary',
      action: 'componentDidCatch',
      errorInfo: errorInfo.componentStack,
      retryCount: this.retryCount
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery for certain error types
    this.attemptAutoRecovery(error);
  }

  private attemptAutoRecovery(error: Error): void {
    // Check if error is recoverable
    if (this.isRecoverableError(error) && this.retryCount < this.maxRetries) {
      setTimeout(() => {
        this.retryCount++;
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null
        });
      }, 1000 * Math.pow(2, this.retryCount)); // Exponential backoff
    }
  }

  private isRecoverableError(error: Error): boolean {
    const recoverableErrors = [
      'ChunkLoadError',
      'NetworkError',
      'TimeoutError',
      'AbortError'
    ];

    return recoverableErrors.some(type => 
      error.name.includes(type) || error.message.includes(type)
    );
  }

  private handleRetry = (): void => {
    this.retryCount++;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      reportSent: false
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private toggleDetails = (): void => {
    this.setState(prev => ({
      showDetails: !prev.showDetails
    }));
  };

  private handleReportError = async (): Promise<void> => {
    if (!this.state.error) return;

    this.setState({ isReporting: true });

    try {
      // Collect additional context
      const context = {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        retryCount: this.retryCount,
        componentStack: this.state.errorInfo?.componentStack,
        errorBoundary: true
      };

      // Send detailed error report
      await this.sendErrorReport(this.state.error, context);
      
      this.setState({ 
        reportSent: true,
        isReporting: false 
      });
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
      this.setState({ isReporting: false });
    }
  };

  private async sendErrorReport(error: Error, context: any): Promise<void> {
    // In a real implementation, this would send to an error reporting service
    const report = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      severity: this.getErrorSeverity(error),
      category: this.getErrorCategory(error)
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Error report sent:', report);
  }

  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (error.name.includes('ChunkLoadError')) return 'medium';
    if (error.name.includes('NetworkError')) return 'medium';
    if (error.message.includes('AI') || error.message.includes('model')) return 'high';
    if (error.message.includes('WebGL') || error.message.includes('canvas')) return 'high';
    return 'medium';
  }

  private getErrorCategory(error: Error): string {
    if (error.name.includes('ChunkLoadError')) return 'loading';
    if (error.name.includes('NetworkError')) return 'network';
    if (error.message.includes('AI')) return 'ai-processing';
    if (error.message.includes('WebGL')) return 'rendering';
    return 'general';
  }

  private getErrorSuggestions(error: Error): string[] {
    const suggestions: string[] = [];

    if (error.name.includes('ChunkLoadError')) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Check your internet connection');
      suggestions.push('Clear your browser cache');
    } else if (error.name.includes('NetworkError')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
    } else if (error.message.includes('WebGL')) {
      suggestions.push('Update your browser');
      suggestions.push('Enable hardware acceleration');
      suggestions.push('Try a different browser');
    } else if (error.message.includes('AI') || error.message.includes('model')) {
      suggestions.push('Try uploading a different photo');
      suggestions.push('Ensure good lighting in your photo');
      suggestions.push('Try reducing the number of selected items');
    }

    if (suggestions.length === 0) {
      suggestions.push('Try refreshing the page');
      suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const suggestions = this.getErrorSuggestions(this.state.error);
      const severity = this.getErrorSeverity(this.state.error);

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border border-gray-200">
            {/* Header */}
            <div className={`p-6 border-b border-gray-200 ${
              severity === 'critical' ? 'bg-red-50' :
              severity === 'high' ? 'bg-orange-50' :
              'bg-yellow-50'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  severity === 'critical' ? 'bg-red-100' :
                  severity === 'high' ? 'bg-orange-100' :
                  'bg-yellow-100'
                }`}>
                  <AlertTriangle className={`${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    'text-yellow-600'
                  }`} size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Oops! Something went wrong
                  </h1>
                  <p className="text-gray-600 mt-1">
                    We encountered an unexpected error. Don't worry, we're here to help!
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-2">Error Details</h3>
                <p className="text-gray-700 text-sm font-mono bg-white p-3 rounded border">
                  {this.state.error.message}
                </p>
              </div>

              {/* Suggestions */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Try these solutions:</h3>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={this.handleRetry}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  <span>Try Again</span>
                </button>

                <button
                  onClick={this.handleReload}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  <span>Reload Page</span>
                </button>

                {!this.state.reportSent && (
                  <button
                    onClick={this.handleReportError}
                    disabled={this.state.isReporting}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    {this.state.isReporting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    <span>
                      {this.state.isReporting ? 'Sending...' : 'Report Error'}
                    </span>
                  </button>
                )}

                {this.state.reportSent && (
                  <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                    <span>✓ Error reported successfully</span>
                  </div>
                )}
              </div>

              {/* Technical Details (Collapsible) */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Bug size={16} />
                  <span>Technical Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Error Stack</h4>
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto text-gray-700">
                        {this.state.error.stack}
                      </pre>
                    </div>

                    {this.state.errorInfo && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Component Stack</h4>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto text-gray-700">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Environment</h4>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><strong>Browser:</strong> {navigator.userAgent}</p>
                        <p><strong>URL:</strong> {window.location.href}</p>
                        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                        <p><strong>Retry Count:</strong> {this.retryCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default EnhancedErrorBoundary;