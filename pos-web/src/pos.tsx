import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Spin, Empty } from 'antd';
import { ReloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { fetchActiveTemplate, syncActiveTemplate, renderTemplateToCanvas, Template } from './labelService';
import { POS_WEB_CONFIG } from './config';
import './pos.css';

export default function POSPrintPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch and render template on mount
  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await fetchActiveTemplate(POS_WEB_CONFIG.businessId);
      setTemplate(data);
      message.success('Template loaded successfully');
    } catch (error) {
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
      message.success('Template synced successfully');
    } catch (error) {
      message.error('Failed to sync template');
    } finally {
      setRefreshing(false);
    }
  };

  // Render template on canvas
  useEffect(() => {
    if (!template) return;
    renderTemplate();
  }, [template]);

  const renderTemplate = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;

    try {
      await renderTemplateToCanvas(canvas, template);
    } catch (error) {
      console.error('Error rendering template:', error);
      message.error('Failed to render template');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="pos-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="pos-container">
        <Empty description="No active template found" />
        <Button
          type="primary"
          onClick={loadTemplate}
          style={{ marginTop: 16 }}
        >
          Load Template
        </Button>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <div className="pos-header">
        <h1>POS Print Preview</h1>
        <div className="pos-actions">
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleSync}
          >
            Sync
          </Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
          >
            Print
          </Button>
        </div>
      </div>

      <div className="pos-info">
        <p>
          <strong>Template:</strong> {template.name}
        </p>
        <p>
          <strong>Size:</strong> {template.width}mm × {template.height}mm
        </p>
      </div>

      <div className="pos-preview">
        <canvas
          ref={canvasRef}
          className="pos-canvas"
          style={{
            border: '1px solid #ddd',
            backgroundColor: '#fff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        />
      </div>
    </div>
  );
}
