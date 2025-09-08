import { useEffect } from 'react';

function Error({ statusCode }) {
  useEffect(() => {
    // Логируем ошибку для отладки только в development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error page rendered with statusCode:', statusCode);
    }
  }, [statusCode]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'Raleway, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: '#151515' }}>
        {statusCode ? `${statusCode} - ` : ''}Что-то пошло не так
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
        Произошла ошибка при загрузке страницы
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          fontSize: '1.1rem',
          backgroundColor: '#151515',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontFamily: 'Raleway, sans-serif',
          fontWeight: '600'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#333'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#151515'}
      >
        Обновить страницу
      </button>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          padding: '12px 24px',
          fontSize: '1.1rem',
          backgroundColor: 'transparent',
          color: '#151515',
          border: '2px solid #151515',
          borderRadius: '6px',
          cursor: 'pointer',
          fontFamily: 'Raleway, sans-serif',
          fontWeight: '600',
          marginTop: '1rem'
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#151515';
          e.target.style.color = 'white';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#151515';
        }}
      >
        На главную
      </button>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
