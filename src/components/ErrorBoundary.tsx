import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to console for debugging
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack?.substring(0, 500),
        componentStack: errorInfo.componentStack?.substring(0, 500),
        timestamp: new Date().toISOString(),
        url: window.location.href,
      };
      console.error('[ErrorBoundary] Error report:', JSON.stringify(errorReport, null, 2));
    } catch (e) {
      // Ignore reporting errors
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const { compact = false, fallbackTitle, fallbackMessage } = this.props;
      const { error, showDetails } = this.state;

      if (compact) {
        return (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">
                  {fallbackTitle || 'Something went wrong'}
                </span>
              </div>
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-white/10 px-2 py-1 rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
            {fallbackMessage && (
              <p className="text-slate-400 text-xs mt-1">{fallbackMessage}</p>
            )}
          </div>
        );
      }

      return (
        <div className="bg-white/5 backdrop-blur-md border border-red-500/20 rounded-xl p-6 my-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              {fallbackTitle || 'Something went wrong'}
            </h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              {fallbackMessage || 'An unexpected error occurred in this section. You can try again or reload the page.'}
            </p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-slate-900 rounded-lg font-medium hover:bg-[#B8941F] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors border border-white/20"
              >
                Reload Page
              </button>
            </div>

            {/* Error Details Toggle */}
            {error && (
              <div className="mt-4">
                <button
                  onClick={() => this.setState({ showDetails: !showDetails })}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mx-auto transition-colors"
                >
                  <Bug className="w-3 h-3" />
                  {showDetails ? 'Hide' : 'Show'} Error Details
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showDetails && (
                  <div className="mt-3 bg-slate-900/80 rounded-lg p-4 text-left max-h-48 overflow-auto">
                    <p className="text-red-400 text-xs font-mono break-all">
                      {error.message}
                    </p>
                    {error.stack && (
                      <pre className="text-slate-500 text-[10px] mt-2 font-mono whitespace-pre-wrap break-all">
                        {error.stack.substring(0, 800)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallbackTitle?: string;
    fallbackMessage?: string;
    compact?: boolean;
  }
) {
  return function ErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
