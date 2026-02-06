import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Spin, Empty } from 'antd';
import { ReloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { fetchActiveTemplate, syncActiveTemplate } from './service';
import { POS_WEB_CONFIG } from './config';
import './pos.css';

interface TemplateElement {
  id: number;
  type: 'text' | 'image' | 'qrcode' | 'barcode' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  color?: string;
  imageData?: string;
  borderRadius?: number;
  qrcodeContent?: string;
  strokeColor?: string;
  strokeWidth?: number;
  lineStyle?: string;
}

interface Template {
  id: number;
  name: string;
  width: number;
  height: number;
  templateConfig: {
    elements: TemplateElement[];
  };
}

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

  const renderTemplate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 8; // Scale factor for better visibility
    const width = template!.width * scale;
    const height = template!.height * scale;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    // Render elements
    const elements = template!.templateConfig.elements || [];
    elements.forEach((el) => {
      const x = el.x * scale;
      const y = el.y * scale;
      const w = el.width * scale;
      const h = el.height * scale;

      ctx.save();

      // Handle rotation
      if (el.rotation) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (el.type === 'text') {
        ctx.fillStyle = el.color || '#000000';
        const fontSizePx = (el.fontSize || 8) * (scale / 4);
        let fontString = '';
        if (el.fontWeight === 'bold') fontString += 'bold ';
        if (el.fontStyle === 'italic') fontString += 'italic ';
        fontString += `${fontSizePx}px ${el.fontFamily || 'Arial'}`;
        ctx.font = fontString;
        ctx.textBaseline = 'top';

        // Simple text rendering (no wrapping for preview)
        ctx.fillText(el.text || '', x, y);
      } else if (el.type === 'image' && el.imageData) {
        // Draw image placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[Image]', x + w / 2, y + h / 2);
      } else if (el.type === 'qrcode') {
        // Draw QR code placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[QR Code]', x + w / 2, y + h / 2);
      } else if (el.type === 'barcode') {
        // Draw barcode placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('[Barcode]', x + w / 2, y + h / 2);
      } else if (el.type === 'line') {
        ctx.strokeStyle = el.strokeColor || '#000000';
        ctx.lineWidth = (el.strokeWidth || 1) * (scale / 4);
        
        if (el.lineStyle === 'dashed') {
          ctx.setLineDash([4, 4]);
        } else if (el.lineStyle === 'dotted') {
          ctx.setLineDash([2, 2]);
        }

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
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
