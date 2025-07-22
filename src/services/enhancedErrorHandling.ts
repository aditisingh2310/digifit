class EnhancedErrorHandling {
  private static instance: EnhancedErrorHandling;
  private errorQueue: ErrorReport[] = [];
  private retryQueue: RetryableOperation[] = [];
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private readonly MAX_QUEUE_SIZE = 200;
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

  static getInstance(): EnhancedErrorHandling {
    if (!EnhancedErrorHandling.instance) {
      EnhancedErrorHandling.instance = new EnhancedErrorHandling();
    }
    return EnhancedErrorHandling.instance;
  }

  constructor() {
    this.setupGlobalHandlers();
    this.startRetryProcessor();
  }

  // Enhanced error logging with context and recovery suggestions
  logError(error: Error, context?: ErrorContext): ErrorReport {
    const errorReport: ErrorReport = {
      id: this.generateId(),
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      severity: this.determineSeverity(error, context),
      category: this.categorizeError(error, context),
      recoveryActions: this.generateRecoveryActions(error, context),
      userImpact: this.assessUserImpact(error, context)
    };

    this.addToQueue(errorReport);
    this.handleErrorRecovery(errorReport);
    
    // Send to monitoring service
    this.sendToMonitoring(errorReport);
    
    return errorReport;
  }

  // Automatic error recovery system
  private async handleErrorRecovery(errorReport: ErrorReport): Promise<void> {
    const { category, context } = errorReport;

    switch (category) {
      case 'network':
        await this.handleNetworkError(errorReport);
        break;
      case 'ai-processing':
        await this.handleAIError(errorReport);
        break;
      case 'rendering':
        await this.handleRenderingError(errorReport);
        break;
      case 'memory':
        await this.handleMemoryError(errorReport);
        break;
      case 'permission':
        await this.handlePermissionError(errorReport);
        break;
      default:
        await this.handleGenericError(errorReport);
    }
  }

  private async handleNetworkError(errorReport: ErrorReport): Promise<void> {
    const operation = errorReport.context?.operation;
    if (operation && this.isRetryable(operation)) {
      this.addToRetryQueue({
        id: this.generateId(),
        operation,
        context: errorReport.context,
        attempts: 0,
        maxAttempts: 5,
        nextRetry: Date.now() + this.RETRY_DELAYS[0]
      });
    }

    // Enable offline mode if needed
    if (errorReport.message.includes('fetch')) {
      this.enableOfflineMode();
    }
  }

  private async handleAIError(errorReport: ErrorReport): Promise<void> {
    // Fallback to simpler AI models or mock data
    if (errorReport.message.includes('model')) {
      this.enableAIFallback();
    }

    // Reduce AI processing quality
    if (errorReport.message.includes('memory') || errorReport.message.includes('timeout')) {
      this.reduceAIQuality();
    }
  }

  private async handleRenderingError(errorReport: ErrorReport): Promise<void> {
    // Fallback to canvas 2D if WebGL fails
    if (errorReport.message.includes('WebGL')) {
      this.enableCanvas2DFallback();
    }

    // Reduce rendering quality
    if (errorReport.message.includes('memory') || errorReport.message.includes('performance')) {
      this.reduceRenderingQuality();
    }
  }

  private async handleMemoryError(errorReport: ErrorReport): Promise<void> {
    // Clear caches
    this.clearCaches();
    
    // Reduce quality settings
    this.reduceQualitySettings();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  private async handlePermissionError(errorReport: ErrorReport): Promise<void> {
    // Show user-friendly permission request
    if (errorReport.message.includes('camera')) {
      this.showCameraPermissionDialog();
    }
    
    if (errorReport.message.includes('microphone')) {
      this.showMicrophonePermissionDialog();
    }
  }

  private async handleGenericError(errorReport: ErrorReport): Promise<void> {
    // Log for investigation
    console.error('Unhandled error category:', errorReport);
    
    // Show user notification
    this.showUserNotification(errorReport);
  }

  // Circuit breaker pattern for failing operations
  createCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    const breaker = new CircuitBreaker(config);
    this.circuitBreakers.set(name, breaker);
    return breaker;
  }

  async executeWithCircuitBreaker<T>(
    name: string, 
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker ${name} not found`);
    }

    try {
      return await breaker.execute(operation);
    } catch (error) {
      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  // Retry mechanism with exponential backoff
  private addToRetryQueue(operation: RetryableOperation): void {
    this.retryQueue.push(operation);
  }

  private startRetryProcessor(): void {
    setInterval(() => {
      this.processRetryQueue();
    }, 1000);
  }

  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const readyOperations = this.retryQueue.filter(op => op.nextRetry <= now);

    for (const operation of readyOperations) {
      try {
        await this.executeRetryableOperation(operation);
        this.removeFromRetryQueue(operation.id);
      } catch (error) {
        operation.attempts++;
        
        if (operation.attempts >= operation.maxAttempts) {
          this.removeFromRetryQueue(operation.id);
          this.logError(new Error(`Max retries exceeded for operation: ${operation.operation}`), {
            component: 'RetryProcessor',
            action: 'processRetryQueue',
            operation: operation.operation
          });
        } else {
          const delay = this.RETRY_DELAYS[Math.min(operation.attempts, this.RETRY_DELAYS.length - 1)];
          operation.nextRetry = now + delay;
        }
      }
    }
  }

  private async executeRetryableOperation(operation: RetryableOperation): Promise<void> {
    // Execute the retryable operation based on its type
    switch (operation.operation) {
      case 'api-call':
        await this.retryApiCall(operation.context);
        break;
      case 'image-load':
        await this.retryImageLoad(operation.context);
        break;
      case 'ai-processing':
        await this.retryAIProcessing(operation.context);
        break;
      default:
        throw new Error(`Unknown retryable operation: ${operation.operation}`);
    }
  }

  private removeFromRetryQueue(id: string): void {
    this.retryQueue = this.retryQueue.filter(op => op.id !== id);
  }

  // Recovery actions
  private enableOfflineMode(): void {
    document.dispatchEvent(new CustomEvent('app:offline-mode', { detail: { enabled: true } }));
  }

  private enableAIFallback(): void {
    document.dispatchEvent(new CustomEvent('ai:fallback-mode', { detail: { enabled: true } }));
  }

  private reduceAIQuality(): void {
    document.dispatchEvent(new CustomEvent('ai:reduce-quality'));
  }

  private enableCanvas2DFallback(): void {
    document.dispatchEvent(new CustomEvent('rendering:canvas2d-fallback'));
  }

  private reduceRenderingQuality(): void {
    document.dispatchEvent(new CustomEvent('rendering:reduce-quality'));
  }

  private clearCaches(): void {
    document.dispatchEvent(new CustomEvent('cache:clear-all'));
  }

  private reduceQualitySettings(): void {
    document.dispatchEvent(new CustomEvent('quality:reduce-all'));
  }

  private showCameraPermissionDialog(): void {
    document.dispatchEvent(new CustomEvent('permission:camera-request'));
  }

  private showMicrophonePermissionDialog(): void {
    document.dispatchEvent(new CustomEvent('permission:microphone-request'));
  }

  private showUserNotification(errorReport: ErrorReport): void {
    document.dispatchEvent(new CustomEvent('notification:error', { 
      detail: { 
        message: this.getUserFriendlyMessage(errorReport),
        actions: errorReport.recoveryActions
      } 
    }));
  }

  // Helper methods
  private determineSeverity(error: Error, context?: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    if (error.message.includes('network') || error.message.includes('fetch')) return 'medium';
    if (error.message.includes('permission')) return 'high';
    if (error.message.includes('memory') || error.message.includes('crash')) return 'critical';
    if (context?.component === 'AI' || context?.component === 'VirtualTryOn') return 'high';
    return 'medium';
  }

  private categorizeError(error: Error, context?: ErrorContext): string {
    if (error.message.includes('network') || error.message.includes('fetch')) return 'network';
    if (error.message.includes('permission')) return 'permission';
    if (error.message.includes('memory')) return 'memory';
    if (error.message.includes('WebGL') || error.message.includes('canvas')) return 'rendering';
    if (context?.component === 'AI' || error.message.includes('model')) return 'ai-processing';
    return 'general';
  }

  private generateRecoveryActions(error: Error, context?: ErrorContext): string[] {
    const actions: string[] = [];
    const category = this.categorizeError(error, context);

    switch (category) {
      case 'network':
        actions.push('Check internet connection', 'Try again in a moment', 'Enable offline mode');
        break;
      case 'permission':
        actions.push('Grant required permissions', 'Refresh the page', 'Use alternative input method');
        break;
      case 'memory':
        actions.push('Close other browser tabs', 'Refresh the page', 'Use lower quality settings');
        break;
      case 'rendering':
        actions.push('Update your browser', 'Enable hardware acceleration', 'Use compatibility mode');
        break;
      case 'ai-processing':
        actions.push('Try a different photo', 'Use fewer clothing items', 'Reduce AI quality settings');
        break;
      default:
        actions.push('Refresh the page', 'Try again', 'Contact support if problem persists');
    }

    return actions;
  }

  private assessUserImpact(error: Error, context?: ErrorContext): 'low' | 'medium' | 'high' {
    const severity = this.determineSeverity(error, context);
    const category = this.categorizeError(error, context);

    if (category === 'ai-processing' || category === 'rendering') return 'high';
    if (severity === 'critical') return 'high';
    if (severity === 'high') return 'medium';
    return 'low';
  }

  private getUserFriendlyMessage(errorReport: ErrorReport): string {
    const { category, message } = errorReport;

    switch (category) {
      case 'network':
        return 'Connection issue detected. Please check your internet connection.';
      case 'permission':
        return 'Permission required. Please allow access to continue.';
      case 'memory':
        return 'Running low on memory. Try closing other tabs or reducing quality.';
      case 'rendering':
        return 'Display issue detected. Try updating your browser or enabling hardware acceleration.';
      case 'ai-processing':
        return 'AI processing encountered an issue. Try a different photo or reduce the number of items.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private isRetryable(operation: string): boolean {
    const retryableOperations = ['api-call', 'image-load', 'ai-processing'];
    return retryableOperations.includes(operation);
  }

  private async retryApiCall(context: any): Promise<void> {
    // Implement API call retry logic
    console.log('Retrying API call:', context);
  }

  private async retryImageLoad(context: any): Promise<void> {
    // Implement image load retry logic
    console.log('Retrying image load:', context);
  }

  private async retryAIProcessing(context: any): Promise<void> {
    // Implement AI processing retry logic
    console.log('Retrying AI processing:', context);
  }

  private setupGlobalHandlers(): void {
    // Enhanced global error handlers
    window.addEventListener('error', (event) => {
      this.logError(new Error(event.message), {
        component: 'Global',
        action: 'Runtime Error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        operation: 'runtime'
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        component: 'Global',
        action: 'Unhandled Promise Rejection',
        operation: 'promise'
      });
    });

    // Resource loading errors
    document.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        this.logError(new Error(`Resource failed to load: ${target.tagName}`), {
          component: 'ResourceLoader',
          action: 'Load Error',
          resource: target.tagName,
          src: (target as any).src || (target as any).href
        });
      }
    }, true);
  }

  private addToQueue(errorReport: ErrorReport): void {
    this.errorQueue.unshift(errorReport);
    
    if (this.errorQueue.length > this.MAX_QUEUE_SIZE) {
      this.errorQueue = this.errorQueue.slice(0, this.MAX_QUEUE_SIZE);
    }
  }

  private async sendToMonitoring(errorReport: ErrorReport): Promise<void> {
    try {
      // Send to error monitoring service (e.g., Sentry, LogRocket)
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      });
    } catch (error) {
      // Silently fail to avoid infinite error loops
      console.warn('Failed to send error report to monitoring service');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Public API
  getErrorReports(): ErrorReport[] {
    return [...this.errorQueue];
  }

  getErrorStats(): ErrorStats {
    const now = Date.now();
    const last24h = this.errorQueue.filter(e => now - e.timestamp.getTime() < 24 * 60 * 60 * 1000);
    
    return {
      total: this.errorQueue.length,
      last24h: last24h.length,
      byCategory: this.groupByCategory(last24h),
      bySeverity: this.groupBySeverity(last24h),
      retryQueueSize: this.retryQueue.length
    };
  }

  private groupByCategory(errors: ErrorReport[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupBySeverity(errors: ErrorReport[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// Circuit Breaker implementation
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      timeout: 60000,
      monitoringPeriod: 10000,
      ...config
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }
}

// Interfaces
interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: ErrorContext;
  userAgent: string;
  url: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  recoveryActions: string[];
  userImpact: 'low' | 'medium' | 'high';
}

interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  operation?: string;
  [key: string]: any;
}

interface RetryableOperation {
  id: string;
  operation: string;
  context: any;
  attempts: number;
  maxAttempts: number;
  nextRetry: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
}

interface ErrorStats {
  total: number;
  last24h: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  retryQueueSize: number;
}

export default EnhancedErrorHandling;