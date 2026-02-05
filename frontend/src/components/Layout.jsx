import React, { useState } from 'react';
import './Layout.css';
import LabelEditor from '../pages/LabelEditor';
import LabelTemplates from '../pages/LabelTemplates';
import { useLanguage } from '../locales/LanguageContext';

export default function LabelPrintLayout() {
  const { language, switchLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState('templates');
  const [currentTemplate, setCurrentTemplate] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('posToken');
    localStorage.removeItem('posEmail');
    window.location.reload();
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="hide-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', scrollbarWidth: 'none', minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box', minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              <div style={{ width: '100%', height: '100%', display: 'flex', minHeight: 0 }}>
                {/* Left Sidebar */}
                <div id="Portal_LabelTab" className="Styling_ManagemntTab" style={{ height: '100%', zIndex: 11, background: 'rgb(245, 245, 249)', paddingTop: '23px' }}>
                  <div className="hide-scroll" style={{ overflowY: 'auto', maxHeight: '100%', position: 'relative', scrollbarWidth: 'none' }}>
                    <div style={{ padding: '15px', background: 'rgb(42, 36, 56)', marginBottom: '17px', borderRadius: '0px', boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 6px' }}>
                      {/* <div style={{ width: '100%', color: 'white', fontSize: '15px', fontWeight: '650', padding: '0px', margin: '0px' }}>
                        标签编辑器
                      </div> */}
                      <div style={{ width: '100%', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '400', paddingTop: '5px', margin: '0px' }}>
                        Label Printer
                      </div>
                    </div>

                    <div style={{ padding: '0 15px' }}>
                      <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px', marginBottom: '10px', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '5px' }}>
                        {localStorage.getItem('posEmail') || '用户'}
                      </div>
                      
                      {/* Language Switcher */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', marginBottom: '8px' }}>
                        <button 
                          onClick={() => switchLanguage('en')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: language === 'en' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          EN
                        </button>
                        <button 
                          onClick={() => switchLanguage('zh')}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: language === 'zh' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          中文
                        </button>
                      </div>
                      
                      <button onClick={handleLogout} className="logout-btn" style={{
                        width: '100%',
                        padding: '10px',
                        marginTop: '12px',
                        background: 'rgba(255, 59, 48, 0.2)',
                        color: '#ff3b30',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                      }}>
                        Logout
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Container */}
                <div id="RightContainerBackend" className="Styling_RightManagement" style={{ flex: 1, background: 'rgb(245, 245, 249)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div className="hide-scroll" style={{ flex: 1, position: 'relative', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Management Container - with padding */}
                    <div id="managementContainer_label" className="Styling_managentContainer" style={{ gap: '20px', padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                      {/* Navigation - inside managementContainer with sticky */}
                      <div style={{ width: '100%', position: 'sticky', top: 0, zIndex: 5, flexShrink: 0 }}>
                        <div className="Styling_NavigationContainer" style={{ minHeight: '50px', display: 'flex', alignItems: 'center', background: 'white', borderBottom: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 3px' }}>
                          <div style={{ display: 'flex', minHeight: '60px', gap: 0, paddingRight: '30px' }}>
                            <div
                              className="Styling_item_Container active"
                              onClick={() => setActiveTab('templates')}
                              style={{
                                fontSize: '15px',
                                background: 'white',
                                border: '0.1px solid rgba(0, 0, 0, 0.1)',
                                padding: '12px 20px',
                                cursor: 'pointer',
                                borderBottom: '3px solid #007aff',
                                transition: 'all 0.2s',
                                color: '#000',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Label Templates
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tab Content */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                        {activeTab === 'editor' && (
                          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                            <LabelEditor 
                              onBack={() => setActiveTab('templates')} 
                              currentTemplate={currentTemplate}
                            />
                          </div>
                        )}
                        {activeTab === 'templates' && (
                          <div style={{ flex: 1, display: 'flex', minHeight: 0, overflowY: 'auto' }}>
                            <LabelTemplates 
                              onEditTemplate={(template) => {
                                setCurrentTemplate(template);
                                setActiveTab('editor');
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
