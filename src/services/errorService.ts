class ErrorService {
  private static instance: ErrorService;
  private errorQueue: ErrorReport[] = [];
  private readonly MAX_QUEUE_SIZE = 100;

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  logError(error: Error, context?: ErrorContext): void {
    const errorReport: ErrorReport = {
      id: this.generateId(),
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.addToQueue(errorReport);
    this.sendToServer(errorReport);
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error logged:', errorReport);
    }
  }

  logWarning(message: string, context?: ErrorContext): void {
    const warningReport: ErrorReport = {
      id: this.generateId(),
      message,
      timestamp: new Date(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: 'warning'
    };

    this.addToQueue(warningReport);
    
    if (import.meta.env.DEV) {
      console.warn('Warning logged:', warningReport);
    }
  }

  async getErrorReports(): Promise<ErrorReport[]> {
    return [...this.errorQueue];
  }

  clearErrors(): void {
    this.errorQueue = [];
  }

  private addToQueue(report: ErrorReport): void {
    this.errorQueue.unshift(report);
    
    if (this.errorQueue.length > this.MAX_QUEUE_SIZE) {
      this.errorQueue = this.errorQueue.slice(0, this.MAX_QUEUE_SIZE);
    }
  }

  private async sendToServer(report: ErrorReport): Promise<void> {
    try {
      // In production, send to error tracking service
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
    } catch (error) {
      // Silently fail to avoid infinite error loops
      console.warn('Failed to send error report to server');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Global error handler setup
  setupGlobalHandlers(): void {
    window.addEventListener('error', (event) => {
      this.logError(new Error(event.message), {
        component: 'Global',
        action: 'Runtime Error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logError(new Error(event.reason), {
        component: 'Global',
        action: 'Unhandled Promise Rejection'
      });
    });
  }
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: ErrorContext;
  userAgent: string;
  url: string;
  level?: 'error' | 'warning' | 'info';
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export default ErrorService;