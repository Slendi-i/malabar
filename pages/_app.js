import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';

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
