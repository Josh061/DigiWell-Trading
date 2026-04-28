
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { LanguageProvider } from './contexts/LanguageContext'

// Global error handlers to prevent cross-origin "Script error." from crashing the app
// These catch errors from iframes, third-party scripts, and cross-origin resources
window.addEventListener('error', (event) => {
  // Suppress cross-origin "Script error." events (filename empty, lineno 0)
  if (event.message === 'Script error.' && !event.filename && event.lineno === 0) {
    event.preventDefault();
    console.warn('[Global] Suppressed cross-origin script error (harmless)');
    return;
  }
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  // Suppress common non-critical promise rejections
  if (reason && typeof reason === 'object') {
    const msg = reason.message || String(reason);
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('AbortError') ||
      msg.includes('The operation was aborted') ||
      msg.includes('Load failed') ||
      msg.includes('Script error')
    ) {
      event.preventDefault();
      console.warn('[Global] Suppressed non-critical promise rejection:', msg);
      return;
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </AuthProvider>
);
