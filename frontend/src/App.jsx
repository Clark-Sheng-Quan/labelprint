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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 8, color: '#888' }}>
        <div>Missing <code>business_id</code> parameter</div>
        <div style={{ fontSize: 13 }}>Access via <code>?business_id=YOUR_BUSINESS_ID</code></div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {activeTab === 'templates' ? (
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
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter basename="/label">
      <LanguageProvider>
        <Routes>
          <Route path="/" element={<LabelPrintPage />} />
        </Routes>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
