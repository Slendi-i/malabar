import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Обновляем состояние для отображения fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Логируем ошибку
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI при ошибке
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'Raleway, sans-serif',
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#dc3545' }}>
            🚨 Произошла ошибка
          </h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: '#6c757d' }}>
            Приложение столкнулось с неожиданной проблемой
          </p>
          
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            maxWidth: '600px',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#721c24' }}>Детали ошибки:</h3>
            <pre style={{
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                fontSize: '1.1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Raleway, sans-serif',
                fontWeight: '600'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
            >
              Обновить страницу
            </button>
            
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              style={{
                padding: '12px 24px',
                fontSize: '1.1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'Raleway, sans-serif',
                fontWeight: '600'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
            >
              Попробовать снова
            </button>
          </div>

          <p style={{ 
            fontSize: '0.9rem', 
            color: '#6c757d', 
            marginTop: '20px',
            maxWidth: '500px'
          }}>
            Если проблема повторяется, попробуйте очистить кэш браузера или обратитесь к администратору
          </p>
        </div>
      );
    }

    // Обычный рендер дочерних компонентов
    return this.props.children;
  }
}

export default ErrorBoundary;
