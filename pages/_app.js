import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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

// Создаем тему для Material-UI
const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </ThemeProvider>
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
