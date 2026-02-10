import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { LanguageProvider } from './locales/LanguageContext';
import LabelEditor from './pages/LabelEditor';
import LabelTemplates from './pages/LabelTemplates';
import './App.css';

function LabelPrintPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Read business_id from URL query params
    const bid = searchParams.get('business_id');
    if (bid) {
      setBusinessId(bid);
      localStorage.setItem('posBusinessId', bid);
    } else {
      // Fallback to localStorage if available
      const stored = localStorage.getItem('posBusinessId');
      if (stored) {
        setBusinessId(stored);
      }
    }
  }, [searchParams]);

  if (!businessId) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>;
  }

  return activeTab === 'templates' ? (
    <LabelTemplates 
      onEditTemplate={(template) => {
        setCurrentTemplate(template);
        setActiveTab('editor');
      }}
      businessId={businessId}
    />
  ) : (
    <LabelEditor 
      onBack={() => setActiveTab('templates')} 
      currentTemplate={currentTemplate}
      businessId={businessId}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Routes>
          <Route path="/label" element={<LabelPrintPage />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
