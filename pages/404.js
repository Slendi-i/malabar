import Link from 'next/link';

export default function Custom404() {
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
        404
      </h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
        Страница не найдена
      </h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666' }}>
        Запрашиваемая страница не существует
      </p>
      <Link href="/" passHref>
        <button
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
          Вернуться на главную
        </button>
      </Link>
    </div>
  );
}
