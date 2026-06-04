import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Spin, Empty, Input, Form, Modal } from 'antd';
import { ReloadOutlined, PrinterOutlined, CodeOutlined } from '@ant-design/icons';
import {
  fetchActiveTemplate,
  syncActiveTemplate,
  renderTemplateToCanvas,
  fetchTSPL,
  fetchRenderRaw,
  extractPlaceholders,
  Template,
} from './labelService';
import { POS_WEB_CONFIG } from './config';
import './pos.css';

export default function POSPrintPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [orderData, setOrderData] = useState<Record<string, string>>({});
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [tsplModal, setTsplModal] = useState<string | null>(null);
  const [rawModal, setRawModal] = useState<string | null>(null);

  useEffect(() => { loadTemplate(); }, []);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await fetchActiveTemplate(POS_WEB_CONFIG.businessId);
      setTemplate(data);
      const keys = extractPlaceholders(data);
      setPlaceholders(keys);
      setOrderData(Object.fromEntries(keys.map(k => [k, ''])));
    } catch {
      message.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setRefreshing(true);
      const data = await syncActiveTemplate(POS_WEB_CONFIG.businessId);
      setTemplate(data);
      const keys = extractPlaceholders(data);
      setPlaceholders(keys);
      setOrderData(Object.fromEntries(keys.map(k => [k, ''])));
      message.success('Template synced');
    } catch {
      message.error('Failed to sync template');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!template) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderTemplateToCanvas(canvas, template).catch(console.error);
  }, [template]);

  const getTSPL = async () => {
    if (!template) return null;
    try {
      return await fetchTSPL(POS_WEB_CONFIG.businessId, orderData);
    } catch {
      message.error('Failed to generate TSPL');
      return null;
    }
  };

  const handlePreview = async () => {
    const tspl = await getTSPL();
    if (tspl) setTsplModal(tspl);
  };

  const handleDownload = async () => {
    const tspl = await getTSPL();
    if (!tspl) return;
    const blob = new Blob([tspl], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'label.tspl';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handlePrint = async () => {
    if (!template) return;
    if (!('serial' in navigator)) {
      message.error('Web Serial API not supported — use Chrome/Edge over HTTPS or localhost');
      return;
    }
    try {
      setPrinting(true);
      const tspl = await getTSPL();
      if (!tspl) return;
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable.getWriter();
      await writer.write(new TextEncoder().encode(tspl));
      writer.releaseLock();
      await port.close();
      message.success('Sent to printer');
    } catch (error: any) {
      if (error?.name === 'NotFoundError') return;
      message.error('Print failed: ' + (error?.message || error));
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return <div className="pos-container"><Spin size="large" /></div>;

  if (!template) {
    return (
      <div className="pos-container">
        <Empty description="No active template found" />
        <Button type="primary" onClick={loadTemplate} style={{ marginTop: 16 }}>Load Template</Button>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>POS Print Preview</h1>
        <div className="pos-actions">
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={handleSync}>Sync</Button>
          <Button onClick={async () => {
            try {
              const raw = await fetchRenderRaw(POS_WEB_CONFIG.businessId, orderData);
              setRawModal(JSON.stringify(raw, null, 2));
            } catch { message.error('Failed to fetch raw response'); }
          }}>Raw API</Button>
          <Button icon={<CodeOutlined />} onClick={handlePreview}>TSPL</Button>
          <Button onClick={handleDownload}>Download</Button>
          <Button type="primary" icon={<PrinterOutlined />} loading={printing} onClick={handlePrint}>Print</Button>
        </div>
      </div>

      <div className="pos-info">
        <p><strong>Template:</strong> {template.name}</p>
        <p><strong>Size:</strong> {template.width}mm × {template.height}mm</p>
      </div>

      {placeholders.length > 0 && (
        <div className="pos-order-data">
          <h3>Order Data</h3>
          <Form layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
            {placeholders.map(key => (
              <Form.Item key={key} label={key} style={{ marginBottom: 8 }}>
                <Input
                  value={orderData[key] || ''}
                  onChange={e => setOrderData(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${key}`}
                  style={{ width: 160 }}
                />
              </Form.Item>
            ))}
          </Form>
        </div>
      )}

      <div className="pos-preview">
        <canvas
          ref={canvasRef}
          className="pos-canvas"
          style={{ border: '1px solid #ddd', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
        />
      </div>

      <Modal
        title="Raw API Response (/label/sync)"
        open={rawModal !== null}
        onCancel={() => setRawModal(null)}
        footer={[
          <Button key="copy" onClick={() => { navigator.clipboard.writeText(rawModal || ''); message.success('Copied'); }}>Copy</Button>,
          <Button key="close" onClick={() => setRawModal(null)}>Close</Button>,
        ]}
        width={700}
      >
        <pre style={{ fontSize: 12, background: '#f5f5f5', padding: 12, borderRadius: 4, overflowX: 'auto', maxHeight: 500, overflowY: 'auto' }}>
          {rawModal}
        </pre>
      </Modal>

      <Modal
        title="Raw TSPL"
        open={tsplModal !== null}
        onCancel={() => setTsplModal(null)}
        footer={[
          <Button key="copy" onClick={() => { navigator.clipboard.writeText(tsplModal || ''); message.success('Copied'); }}>
            Copy
          </Button>,
          <Button key="close" onClick={() => setTsplModal(null)}>Close</Button>,
        ]}
        width={600}
      >
        <pre style={{ fontSize: 12, background: '#f5f5f5', padding: 12, borderRadius: 4, overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
          {tsplModal?.replace(/\r\n/g, '\n')}
        </pre>
      </Modal>
    </div>
  );
}
