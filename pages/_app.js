import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';

// Скрываем фронтенд-логи вне локальной среды (localhost)
if (typeof window !== 'undefined') {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) {
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
  }
}

function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

// Добавляем getInitialProps для правильной работы error handling
MyApp.getInitialProps = async (appContext) => {
  // Вызываем getInitialProps у страницы, если она есть
  let pageProps = {};
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(appContext.ctx);
  }
  return { pageProps };
};

export default MyApp;
