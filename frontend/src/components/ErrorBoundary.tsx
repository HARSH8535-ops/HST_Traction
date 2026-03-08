import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      errorMsg: ""
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.state.errorMsg.includes("ENCRYPTION_KEY environment variable is not set")) {
        return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-2xl max-w-lg text-center shadow-2xl backdrop-blur-md">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-4">Critical Security Error</h1>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                The application cannot start securely because the <code className="bg-black/50 px-2 py-1 rounded text-red-400 font-mono text-xs">ENCRYPTION_KEY</code> environment variable is missing.
              </p>
              <div className="text-left bg-black/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono space-y-2">
                <p>1. Copy .env.example to .env</p>
                <p>2. Set a secure ENCRYPTION_KEY value</p>
                <p>3. Restart the development server</p>
              </div>
            </div>
          </div>
        );
      }

      // Generic error fallback
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
          <h1 className="text-xl font-bold mb-4">Something went wrong</h1>
          <p className="text-slate-400 text-sm">{this.state.errorMsg}</p>
        </div>
      );
    }

    return this.props.children as ReactNode;
  }
}
