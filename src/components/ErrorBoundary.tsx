import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * 全局错误边界：任何渲染异常都不应让用户看到白屏，
 * 给出中文说明、重试与回到首页两条恢复路径（对应文档“失败有明确提示”）。
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : '未知渲染异常',
    };
  }

  componentDidCatch(error: unknown, info: unknown) {
    if (typeof console !== 'undefined') {
      console.error('[ErrorBoundary] 页面渲染异常：', error, info);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  private handleHome = () => {
    try {
      window.localStorage.clear();
    } catch {
      // 隐私模式下忽略
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900">页面暂时无法显示</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              遇到了一处未预期的界面异常，您的数据已安全保存在本机。
              您可以重试加载；若反复出现，可恢复演示数据后重新进入。
            </p>
            <p className="text-[11px] font-mono text-slate-400 break-words">
              错误信息：{this.state.message}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              重新加载
            </button>
            <button
              onClick={this.handleHome}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center gap-1.5 transition-colors"
            >
              <Home className="w-4 h-4" />
              恢复演示数据
            </button>
          </div>
        </div>
      </div>
    );
  }
}
