import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4">
            <div className="max-w-md text-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                出错了
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                抱歉，页面加载时出现了问题。请尝试刷新页面或使用其他设备访问。
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                {this.state.error?.message && (
                  <p>错误信息: {this.state.error.message}</p>
                )}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
              >
                刷新页面
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}