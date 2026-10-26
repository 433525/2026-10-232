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
      <div className="nl-crash">
        <div className="nl-crash__card">
          <div className="nl-crash__icon">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>

          <h2 className="nl-crash__title">页面暂时无法显示</h2>
          <p className="nl-crash__text">
            遇到了一处未预期的界面异常，您的数据已安全保存在本机。
            您可以重试加载；若反复出现，可恢复演示数据后重新进入。
          </p>
          <p className="nl-crash__detail">错误信息：{this.state.message}</p>

          <div className="nl-crash__actions">
            <button type="button" onClick={this.handleRetry} className="nl-btn nl-btn--primary">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              重新加载
            </button>
            <button type="button" onClick={this.handleHome} className="nl-btn nl-btn--ghost">
              <Home className="h-4 w-4" aria-hidden="true" />
              恢复演示数据
            </button>
          </div>
        </div>
      </div>
    );
  }
}
