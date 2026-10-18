import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted font: the app makes no requests to Google Fonts or any other server.
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import App from './App';
import { LanguageProvider } from './i18n';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);
