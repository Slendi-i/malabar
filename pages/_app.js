import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Редиректы доменов и SSL
if (typeof window !== 'undefined') {
  const hostname = window.location.hostname.toLowerCase();
  const protocol = window.location.protocol;
  const pathname = window.location.pathname;
  const search = window.location.search;
  
  // Редирект со старого домена на новый
  if (hostname.includes('vet-klinika-moscow.ru')) {
    const newUrl = `https://malabar-event.ru${pathname}${search}`;
    console.log('🔄 Редирект со старого домена:', newUrl);
    window.location.replace(newUrl);
  }
  // Редирект с www на без www для нового домена
  else if (hostname === 'www.malabar-event.ru') {
    const newUrl = `https://malabar-event.ru${pathname}${search}`;
    console.log('🔄 Редирект с www на без www:', newUrl);
    window.location.replace(newUrl);
  }
  // Принудительный HTTPS для основного домена
  else if (hostname === 'malabar-event.ru' && protocol === 'http:') {
    const newUrl = `https://malabar-event.ru${pathname}${search}`;
    console.log('🔄 Редирект на HTTPS:', newUrl);
    window.location.replace(newUrl);
  }
  
  // Скрываем фронтенд-логи вне локальной среды (localhost)
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocal && hostname !== 'malabar-event.ru') {
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
