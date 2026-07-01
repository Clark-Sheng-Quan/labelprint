import React, { useState, useEffect } from 'react';
import { Button, message, Spin } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { fetchTSPL } from './labelService';
import { POS_WEB_CONFIG } from './config';
import './pos.css';

export default function POSPrintPreview() {
  const [tspl, setTspl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchTSPL(POS_WEB_CONFIG.businessId);
      setTspl(data);
    } catch {
      message.error('Failed to fetch TSPL');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!tspl) return;
    navigator.clipboard.writeText(tspl);
    message.success('Copied');
  };

  if (loading) return <div className="pos-container"><Spin size="large" /></div>;

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>Label TSPL Preview</h1>
        <div className="pos-actions">
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <Button icon={<CopyOutlined />} onClick={handleCopy}>Copy</Button>
        </div>
      </div>

      <pre style={{
        background: '#f5f5f5',
        padding: 16,
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.6,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        border: '1px solid #ddd',
        marginTop: 16,
      }}>
        {tspl?.replace(/\r\n/g, '\n') || '(empty)'}
      </pre>
    </div>
  );
}
