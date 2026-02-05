import React from 'react';
import { LanguageProvider } from './locales/LanguageContext';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <div className="app">
        <Layout />
      </div>
    </LanguageProvider>
  );
}

export default App;
