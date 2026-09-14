import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Uncaught Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-ink">
          <div className="max-w-md w-full border border-line bg-paper p-6 shadow-sm">
            <h2 className="text-lg font-bold mb-2">Terjadi Gangguan Tampilan</h2>
            <p className="text-sm text-mute mb-4">
              Terjadi kesalahan kecil pada antarmuka saat memproses data. Anda dapat me-refresh halaman untuk melanjutkan kembali pekerjaan Anda tanpa kehilangan data yang sudah tersimpan.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs bg-ink/5 p-3 rounded mb-4 overflow-x-auto text-mute font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="e-btn e-btn-solid text-xs py-2 px-4 cursor-pointer"
              >
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="e-btn text-xs py-2 px-4 cursor-pointer"
              >
                Coba Lanjutkan
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
