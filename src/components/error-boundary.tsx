import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-rose-50 text-rose-900">
          <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-lg border border-rose-200">
            <h2 className="text-lg font-bold text-rose-700 mb-2">Aplikasi Error</h2>
            <p className="text-sm mb-4">Terjadi kesalahan pada aplikasi. Silakan screenshot pesan ini dan laporkan ke admin.</p>
            <pre className="text-xs bg-rose-100 p-3 rounded overflow-auto mb-4 border border-rose-200">
              {this.state.error?.message}
            </pre>
            <button
              className="w-full py-2 bg-rose-600 text-white rounded font-medium hover:bg-rose-700 transition-colors"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Reset Aplikasi & Login Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
