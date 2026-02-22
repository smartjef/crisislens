import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './router/AppRouter.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Replaced pathname-sniffing and provisional elements with robust React Router (Issue #48)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
