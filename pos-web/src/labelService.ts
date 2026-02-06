import axios from 'axios';
import { POS_WEB_CONFIG } from './config';

// ============ TYPE DEFINITIONS ============

export type ElementType = 'text' | 'image' | 'qrcode' | 'barcode' | 'line';

export interface TemplateElement {
  id: number;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  color?: string;
  // Image properties
  imageData?: string;
  borderRadius?: number;
  // QR Code properties
  qrcodeContent?: string;
  // Line properties
  strokeColor?: string;
  strokeWidth?: number;
  lineStyle?: string; // 'solid' | 'dashed' | 'dotted'
}

export interface Template {
  id: string;
  businessId: string;
  name: string;
  width: number;
  height: number;
  templateConfig: {
    elements: TemplateElement[];
  };
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ============ IMAGE LOADING ============

export const loadImageFromBase64 = (base64String: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64String;
  });
};

// ============ CANVAS RENDERING ============

export const renderElementToCanvas = async (
  ctx: CanvasRenderingContext2D,
  element: TemplateElement,
  scale: number
) => {
  const x = element.x * scale;
  const y = element.y * scale;
  const w = element.width * scale;
  const h = element.height * scale;

  ctx.save();

  // Handle rotation
  if (element.rotation) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  try {
    if (element.type === 'text') {
      // Render text element
      ctx.fillStyle = element.color || '#000000';
      const fontSizePx = (element.fontSize || 8) * (scale / 4);
      let fontString = '';
      if (element.fontWeight === 'bold') fontString += 'bold ';
      if (element.fontStyle === 'italic') fontString += 'italic ';
      fontString += `${fontSizePx}px ${element.fontFamily || 'Arial'}`;
      ctx.font = fontString;
      ctx.textBaseline = 'top';
      ctx.fillText(element.text || '', x, y);
    } else if (element.type === 'image' && element.imageData) {
      // Render image element from base64
      const img = await loadImageFromBase64(element.imageData);
      ctx.drawImage(img, x, y, w, h);
    } else if (element.type === 'qrcode') {
      // Render QR code element (placeholder or actual rendering)
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[QR Code]', x + w / 2, y + h / 2);
      // TODO: Integrate actual QR code library for rendering
    } else if (element.type === 'barcode') {
      // Render barcode element (placeholder or actual rendering)
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('[Barcode]', x + w / 2, y + h / 2);
      // TODO: Integrate actual barcode library for rendering
    } else if (element.type === 'line') {
      // Render line element
      ctx.strokeStyle = element.strokeColor || '#000000';
      ctx.lineWidth = (element.strokeWidth || 1) * (scale / 4);
      
      if (element.lineStyle === 'dashed') {
        ctx.setLineDash([4, 4]);
      } else if (element.lineStyle === 'dotted') {
        ctx.setLineDash([2, 2]);
      }

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } catch (error) {
    console.error('Error rendering element:', error);
  }

  ctx.restore();
};

export const renderTemplateToCanvas = async (
  canvas: HTMLCanvasElement,
  template: Template,
  scale: number = 8
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  const width = template.width * scale;
  const height = template.height * scale;

  canvas.width = width;
  canvas.height = height;

  // Clear canvas with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw canvas border
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Render all elements in sequence
  const elements = template.templateConfig?.elements || [];
  for (const element of elements) {
    await renderElementToCanvas(ctx, element, scale);
  }
};

// ============ API OPERATIONS ============

export const fetchActiveTemplate = async (businessId?: string): Promise<Template> => {
  try {
    const bid = businessId || POS_WEB_CONFIG.businessId;
    const response = await axios.post(`${POS_WEB_CONFIG.apiBase}/sync`, {
      businessId: bid
    }, {
      headers: {
        'Authorization': `Bearer ${POS_WEB_CONFIG.token}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to sync active template:', error);
    throw error;
  }
};

export const syncActiveTemplate = async (businessId?: string): Promise<Template> => {
  try {
    const template = await fetchActiveTemplate(businessId);
    return template;
  } catch (error) {
    console.error('Failed to sync active template:', error);
    throw error;
  }
};
