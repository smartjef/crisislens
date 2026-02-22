import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx';
import AppShell from './layouts/AppShell.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css'

// NOTE: full React Router v6 AppRouter will replace App in commit 4 (issue #5)
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<div className="p-8 text-2xl font-bold bg-white dark:bg-surface-raised rounded-xl shadow">Dashboard Content Placeholder</div>} />
          <Route path="/map" element={<App />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
