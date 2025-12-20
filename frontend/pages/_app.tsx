import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { LanguageProvider } from '../contexts/LanguageContext';

function OasisApp({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <Component {...pageProps} />
    </LanguageProvider>
  );
}

export default OasisApp;

