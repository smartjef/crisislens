import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AuthProvider from './providers/AuthProvider.jsx';
import './index.css';
/* leaflet removed — map now uses MapLibre GL (bundled CSS imported inside MapLibreMap.jsx) */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
