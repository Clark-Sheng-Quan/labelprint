import React from 'react';
import ReactDOM from 'react-dom/client';
import POSPrintPreview from './pos';
import './pos.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <POSPrintPreview />
  </React.StrictMode>
);
