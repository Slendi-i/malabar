import Link from 'next/link';

export default function Custom500() {
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
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: '#151515' }}>
        500
      </h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
        Внутренняя ошибка сервера
      </h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
        Произошла ошибка на сервере. Попробуйте обновить страницу
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
          fontWeight: '600',
          marginRight: '1rem'
        }}
        onMouseOver={(e) => e.target.style.backgroundColor = '#333'}
        onMouseOut={(e) => e.target.style.backgroundColor = '#151515'}
      >
        Обновить страницу
      </button>
      <Link href="/" passHref>
        <button
          style={{
            padding: '12px 24px',
            fontSize: '1.1rem',
            backgroundColor: 'transparent',
            color: '#151515',
            border: '2px solid #151515',
            borderRadius: '6px',
            cursor: 'pointer',
            fontFamily: 'Raleway, sans-serif',
            fontWeight: '600'
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
      </Link>
    </div>
  );
}
