import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, InputNumber, Select, message, Radio, Divider, Tooltip, ColorPicker } from 'antd';
import { labelAPI } from '../services/api';
import { useLanguage } from '../locales/LanguageContext';
import {
  SaveOutlined,
  DeleteOutlined,
  CopyOutlined,
  LeftOutlined,
  LayoutOutlined,
  FontSizeOutlined,
  CodeOutlined,
  PictureOutlined,
  BorderOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  QuestionCircleOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  RotateRightOutlined,
  RotateLeftOutlined,
  EditOutlined,
  SearchOutlined,
  MenuOutlined,
  ColumnWidthOutlined,
  UndoOutlined,
  RedoOutlined
} from '@ant-design/icons';
import './LabelEditor.css';

const { TextArea } = Input;

const PARAM_LIST = [
  { name: 'Store Name', key: 'storeName' },
  { name: 'Product Name', key: 'productName' },
  { name: 'Options', key: 'options' },
  { name: 'Unit Price', key: 'unitPrice' },
  { name: 'Order Number', key: 'orderNumber' },
  { name: 'Order Id', key: 'orderId' },
  { name: 'Item Id', key: 'itemId' },
  { name: 'Created At', key: 'createdAt' },
  { name: 'Note', key: 'note' },
  { name: 'Pick Method', key: 'pickMethod' },
];

export default function LabelEditor({ onBack, currentTemplate, businessId = null }) {
  const POS_BUSINESS_ID = businessId || localStorage.getItem('posBusinessId') || null;
  const { getTranslation } = useLanguage();
  const canvasRef = useRef(null);
  const imageCacheRef = useRef({}); // Cache for loaded images
  const contentInputRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateId, setTemplateId] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(40);
  const [canvasHeight, setCanvasHeight] = useState(30);
  const [topMargin, setTopMargin] = useState(0);
  const [rightMargin, setRightMargin] = useState(0);
  const [bottomMargin, setBottomMargin] = useState(0);
  const [leftMargin, setLeftMargin] = useState(0);
  const [zoom, setZoom] = useState(200); // Initial zoom 200%
  const [activeSidebarItem, setActiveSidebarItem] = useState('params');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize template data when currentTemplate changes
  useEffect(() => {
    if (currentTemplate) {
      setTemplateId(currentTemplate.id);
      setTemplateName(currentTemplate.name || getTranslation('untitled'));
      setCanvasWidth(currentTemplate.width || 30);
      setCanvasHeight(currentTemplate.height || 40);
      setElements(currentTemplate.templateConfig?.elements || []);
    } else {
      setTemplateName(getTranslation('untitled'));
    }
  }, [currentTemplate, getTranslation]);

  // Undo/Redo & Clipboard State
  const [clipboard, setClipboard] = useState(null);
  const [history, setHistory] = useState([]); 
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
       const initial = { elements: [], selectedElement: null };
       setHistory([initial]);
       setHistoryIndex(0);
    }
  }, []);

  const addToHistory = (els, sel) => {
    const snapshot = { elements: JSON.parse(JSON.stringify(els)), selectedElement: sel };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Interaction State
  const [dragState, setDragState] = useState({
    isDragging: false,
    isResizing: false,
    resizeHandle: null, // 'nw', 'ne', 'sw', 'se'
    startX: 0,
    startY: 0,
    initialEl: null, // Snapshot of element before drag/resize
    selectedIds: [], // IDs of selected elements at drag start
    initialEls: {} // Snapshots of all selected elements for multi-select drag
  });
  const [alignGuides, setAlignGuides] = useState({ vertical: [], horizontal: [] });
  const [selectedElements, setSelectedElements] = useState([]); // Array of selected element IDs
  const [selectionBox, setSelectionBox] = useState(null); // { x, y, w, h } for visual selection box

  // Helpers
  const getScale = () => 8 * (zoom / 100);

  const roundTo1Decimal = (num) => Math.round(num * 10) / 10;
  const SNAP_THRESHOLD = 1; // mm

  // Constrain element to canvas bounds (including margins)
  const constrainElement = (el) => {
    const constrained = { ...el };
    
    // Left and top bounds (considering margins)
    if (constrained.x < leftMargin) constrained.x = leftMargin;
    if (constrained.y < topMargin) constrained.y = topMargin;
    
    // Right and bottom bounds (considering margins)
    const maxX = canvasWidth - rightMargin - constrained.width;
    const maxY = canvasHeight - bottomMargin - constrained.height;
    
    if (constrained.x > maxX) constrained.x = maxX;
    if (constrained.y > maxY) constrained.y = maxY;
    
    return constrained;
  };

  const getSnappedPosition = (proposed, currentEl) => {
    let snappedX = proposed.x;
    let snappedY = proposed.y;
    let bestXDiff = SNAP_THRESHOLD + 0.0001;
    let bestYDiff = SNAP_THRESHOLD + 0.0001;
    let guideX = null;
    let guideY = null;

    const others = elements.filter(el => el.id !== currentEl.id);
    others.forEach(other => {
      const otherLeft = other.x;
      const otherRight = other.x + other.width;
      const otherCenter = other.x + other.width / 2;

      const currentLeft = snappedX;
      const currentRight = snappedX + currentEl.width;
      const currentCenter = snappedX + currentEl.width / 2;

      // Position-based X alignment
      const xCandidates = [
        { diff: Math.abs(currentLeft - otherLeft), target: otherLeft, offset: 0 },
        { diff: Math.abs(currentCenter - otherCenter), target: otherCenter, offset: currentEl.width / 2 },
        { diff: Math.abs(currentRight - otherRight), target: otherRight, offset: currentEl.width }
      ];

      xCandidates.forEach(c => {
        if (c.diff <= SNAP_THRESHOLD && c.diff < bestXDiff) {
          bestXDiff = c.diff;
          snappedX = c.target - c.offset;
          guideX = c.target;
        }
      });

      const otherTop = other.y;
      const otherBottom = other.y + other.height;
      const otherMiddle = other.y + other.height / 2;

      const currentTop = snappedY;
      const currentBottom = snappedY + currentEl.height;
      const currentMiddle = snappedY + currentEl.height / 2;

      // Position-based Y alignment
      const yCandidates = [
        { diff: Math.abs(currentTop - otherTop), target: otherTop, offset: 0 },
        { diff: Math.abs(currentMiddle - otherMiddle), target: otherMiddle, offset: currentEl.height / 2 },
        { diff: Math.abs(currentBottom - otherBottom), target: otherBottom, offset: currentEl.height }
      ];

      yCandidates.forEach(c => {
        if (c.diff <= SNAP_THRESHOLD && c.diff < bestYDiff) {
          bestYDiff = c.diff;
          snappedY = c.target - c.offset;
          guideY = c.target;
        }
      });

      // Spacing-based X alignment (gap snapping)
      const leftGapDiff = Math.abs((otherRight) - currentLeft); // Other's right to current's left
      const rightGapDiff = Math.abs(currentRight - otherLeft); // Current's right to other's left

      if (leftGapDiff <= SNAP_THRESHOLD && leftGapDiff < bestXDiff) {
        bestXDiff = leftGapDiff;
        snappedX = otherRight;
        guideX = otherRight;
      }

      if (rightGapDiff <= SNAP_THRESHOLD && rightGapDiff < bestXDiff) {
        bestXDiff = rightGapDiff;
        snappedX = otherLeft - currentEl.width;
        guideX = otherLeft;
      }

      // Spacing-based Y alignment (gap snapping)
      const topGapDiff = Math.abs(otherBottom - currentTop); // Other's bottom to current's top
      const bottomGapDiff = Math.abs(currentBottom - otherTop); // Current's bottom to other's top

      if (topGapDiff <= SNAP_THRESHOLD && topGapDiff < bestYDiff) {
        bestYDiff = topGapDiff;
        snappedY = otherBottom;
        guideY = otherBottom;
      }

      if (bottomGapDiff <= SNAP_THRESHOLD && bottomGapDiff < bestYDiff) {
        bestYDiff = bottomGapDiff;
        snappedY = otherTop - currentEl.height;
        guideY = otherTop;
      }
    });

    return {
      x: snappedX,
      y: snappedY,
      guides: {
        vertical: guideX !== null ? [guideX] : [],
        horizontal: guideY !== null ? [guideY] : []
      }
    };
  };

  const getHandleRects = (el, scale) => {
    const x = el.x * scale;
    const y = el.y * scale;
    const w = el.width * scale;
    const h = el.height * scale;
    const size = 8; // Handle size in pixels
    const offset = size / 2;

    return {
      nw: { x: x - offset, y: y - offset, w: size, h: size },
      ne: { x: x + w - offset, y: y - offset, w: size, h: size },
      sw: { x: x - offset, y: y + h - offset, w: size, h: size },
      se: { x: x + w - offset, y: y + h - offset, w: size, h: size },
    };
  };

  const isPointInRect = (px, py, rect) => {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  };

  // Canvas drawing logic
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const scale = getScale();
    const pxWidth = canvasWidth * scale;
    const pxHeight = canvasHeight * scale;

    canvas.width = pxWidth;
    canvas.height = pxHeight;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pxWidth, pxHeight);

    // Draw elements
    elements.forEach(el => {
      const x = el.x * scale;
      const y = el.y * scale;
      const w = el.width * scale;
      const h = el.height * scale;

      ctx.save();
      
      // Handle Rotation
      if (el.rotation) {
        // Rotate around center of the element
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      if (el.type === 'text') {
        ctx.fillStyle = el.color || '#000000';
        const fontSizePx = el.fontSize * (scale / 4); 
        let fontString = '';
        if (el.fontWeight === 'bold') fontString += 'bold ';
        if (el.fontStyle === 'italic') fontString += 'italic ';
        fontString += `${fontSizePx}px ${el.fontFamily || 'Arial'}`;
        ctx.font = fontString;
        ctx.textBaseline = 'top';

        const lineHeight = fontSizePx * 1.2;
        const maxWidth = w;
        
        // Split text into lines (handling newlines and wrapping)
        const paragraphs = (el.text || '').split('\n');
        let lines = [];

        paragraphs.forEach(paragraph => {
          const words = paragraph.split(''); // Split by char for better wrapping control in canvas? Or by word?
          // Simple char-based wrapping for "distribute" friendliness, but word-based is standard for western text.
          // Let's use word-based for wrapping, but if a word is too long, break it? 
          // For simplicity and CJK support, let's treat string as chars if it contains no spaces, or split by spaces if it does.
          // To be robust: Split by words (spaces) first.
          
          let currentLine = '';
          let wordsArray = paragraph.split(/(?=[ \t\n])|(?<=[ \t\n])/g); // Split keeping delimiters
          // actually standard split ' ' is easier.
          wordsArray = paragraph.split(' ');
          
          // Re-assemble logic:
          // A simpler approach for mixed content: iterate chars? No, too slow.
          // Let's stick to standard word wrapping.
          
          let bufferLine = '';
          for (let n = 0; n < wordsArray.length; n++) {
            const testLine = bufferLine + wordsArray[n] + (n < wordsArray.length - 1 ? ' ' : '');
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
              lines.push(bufferLine);
              bufferLine = wordsArray[n] + (n < wordsArray.length - 1 ? ' ' : '');
            } else {
              bufferLine = testLine;
            }
          }
          lines.push(bufferLine);
        });

        // Draw Lines
        lines.forEach((line, index) => {
           const lineY = y + (index * lineHeight);
           const metrics = ctx.measureText(line);
           const textWidth = metrics.width;
           
           let lineX = x;
           let gap = 0;
           let type = 'normal'; // normal, justify, distribute

           if (el.textAlign === 'center') {
             lineX = x + (w - textWidth) / 2;
             ctx.textAlign = 'left'; 
             ctx.fillText(line, lineX, lineY);
           } else if (el.textAlign === 'right') {
             lineX = x + w - textWidth;
             ctx.textAlign = 'left';
             ctx.fillText(line, lineX, lineY);
           } else if (el.textAlign === 'justify') {
             // Justify: distribute space between words
             if (line.includes(' ')) {
                type = 'justify';
             } else {
                ctx.textAlign = 'left';
                ctx.fillText(line, x, lineY);
             }
           } else if (el.textAlign === 'distribute') {
             // Distribute: distribute space between chars
             type = 'distribute';
           } else {
             // Left
             ctx.textAlign = 'left';
             ctx.fillText(line, x, lineY);
           }

           // Handle Justify / Distribute rendering
           if (type === 'justify') {
              const words = line.split(' ');
              if (words.length > 1) {
                  const totalWordWidth = words.reduce((acc, word) => acc + ctx.measureText(word).width, 0);
                  const totalSpace = maxWidth - totalWordWidth;
                  const spaceWidth = totalSpace / (words.length - 1);
                  let cursorX = x;
                  words.forEach((word, i) => {
                      ctx.fillText(word, cursorX, lineY);
                      cursorX += ctx.measureText(word).width + spaceWidth;
                  });
              } else {
                  ctx.fillText(line, x, lineY);
              }
           } else if (type === 'distribute') {
              const chars = line.split('');
              if (chars.length > 1) {
                  const totalCharWidth = chars.reduce((acc, char) => acc + ctx.measureText(char).width, 0);
                  const totalSpace = maxWidth - totalCharWidth;
                  const spaceWidth = totalSpace / (chars.length - 1);
                  let cursorX = x;
                  chars.forEach((char, i) => {
                      ctx.fillText(char, cursorX, lineY);
                      cursorX += ctx.measureText(char).width + spaceWidth;
                  });
              } else {
                 // Single char centered? or left? Distribute usually fills width. 
                 // If 1 char, maybe center it? or left. Let's do left for safety.
                 ctx.fillText(line, x, lineY); 
              }
           }

           // Decorations (Underline / Strikethrough)
           // We need to re-measure or calculate positions based on alignment
           if (el.textDecoration) {
               ctx.beginPath();
               let decX = lineX;
               let decW = textWidth;
               
               if (type === 'justify' || type === 'distribute') {
                   decX = x;
                   decW = maxWidth; // Covers full width
               }

               if (el.textDecoration.includes('underline')) {
                   ctx.fillRect(decX, lineY + fontSizePx, decW, Math.max(1, fontSizePx / 15));
               }
               if (el.textDecoration.includes('line-through')) {
                   ctx.fillRect(decX, lineY + fontSizePx / 2, decW, Math.max(1, fontSizePx / 15));
               }
           }
        });

      } else if (el.type === 'barcode' || el.type === 'qrcode') {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#666';
        const fontSize = Math.max(h * 0.1);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        if (el.type === 'barcode') {
          ctx.fillText('Barcode', x + w/2, y + h/2 - 5);
        } else {
          const contentName = el.qrcodeContent === 'tea_machine' ? 'Tea Machine' : 'QR';
          ctx.fillText(`${contentName} QR`, x + w/2, y + h/2 - 5);
        }
      } else if (el.type === 'image') {
        // Draw image with rounded corners using clip
        const borderRadius = el.borderRadius || 0;
        
        ctx.save();
        
        // Apply clipping path for rounded corners
        if (borderRadius > 0) {
          const maxRadius = Math.min(w / 2, h / 2);
          const radius = borderRadius >= maxRadius ? maxRadius : borderRadius;
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + w - radius, y);
          ctx.arcTo(x + w, y, x + w, y + radius, radius);
          ctx.lineTo(x + w, y + h - radius);
          ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
          ctx.lineTo(x + radius, y + h);
          ctx.arcTo(x, y + h, x, y + h - radius, radius);
          ctx.lineTo(x, y + radius);
          ctx.arcTo(x, y, x + radius, y, radius);
          ctx.closePath();
          ctx.clip();
        }
        
        // Draw the image
        if (el.imageData) {
          let img = imageCacheRef.current[el.id];
          if (!img) {
            img = new Image();
            img.src = el.imageData;
            imageCacheRef.current[el.id] = img;
          }
          
          if (img.complete || img.naturalWidth) {
            ctx.drawImage(img, x, y, w, h);
          } else {
            // Placeholder while loading
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = '#ccc';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading...', x + w/2, y + h/2 - 5);
          }
        } else {
          // Placeholder
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(x, y, w, h);
          ctx.fillStyle = '#ccc';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Image', x + w/2, y + h/2 - 5);
        }
        
        ctx.restore();
      } else if (el.type === 'line') {
        // Draw line
        ctx.strokeStyle = el.strokeColor || '#000000';
        ctx.lineWidth = el.strokeWidth || 1;
        
        // Apply line style
        if (el.lineStyle === 'dashed') {
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.stroke();
        } else if (el.lineStyle === 'dotted') {
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.stroke();
        } else if (el.lineStyle === 'double') {
          // Double line - draw 2 parallel lines
          const spacing = (el.strokeWidth || 1) + 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x, y - spacing);
          ctx.lineTo(x + w, y - spacing);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y + spacing);
          ctx.lineTo(x + w, y + spacing);
          ctx.stroke();
        } else if (el.lineStyle === 'doubleDashed') {
          // Double dashed line
          const spacing = (el.strokeWidth || 1) + 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(x, y - spacing);
          ctx.lineTo(x + w, y - spacing);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y + spacing);
          ctx.lineTo(x + w, y + spacing);
          ctx.stroke();
        } else if (el.lineStyle === 'doubleDotted') {
          // Double dotted line
          const spacing = (el.strokeWidth || 1) + 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, y - spacing);
          ctx.lineTo(x + w, y - spacing);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, y + spacing);
          ctx.lineTo(x + w, y + spacing);
          ctx.stroke();
        } else {
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y);
          ctx.stroke();
        }
        ctx.setLineDash([]); // Reset line dash
      } else if (el.type === 'shape') {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x, y, w, h);
      }

      // Draw selection border (only if not rotated or handle rotation visually)
      // Note: For simplicity, selection border rotates with the context
      if (selectedElement === el.id || selectedElements.includes(el.id)) {
        ctx.strokeStyle = '#0084ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h); // Draw exactly on border

        // Draw resize handles (only for single selection)
        if (selectedElement === el.id) {
        
        const handles = getHandleRects(el, scale);
        // Recalculate handles based on unrotated coordinates in local space?
        // Actually getHandleRects uses global coords. 
        // If we are rotated, drawing rects at (x,y) works because we are in rotated context.
        // BUT getHandleRects calculates based on el.x, el.y which are global.
        // So we need to use local 0,0 relative to x,y?
        // To simplify: We draw handles at the corners of the box (x,y,w,h) inside the rotated context.
        
        const size = 8;
        const offset = size / 2;
        const handleLocs = [
            { x: x - offset, y: y - offset }, // nw
            { x: x + w - offset, y: y - offset }, // ne
            { x: x - offset, y: y + h - offset }, // sw
            { x: x + w - offset, y: y + h - offset } // se
        ];

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#0084ff';
        ctx.lineWidth = 1;

        handleLocs.forEach(loc => {
           ctx.fillRect(loc.x, loc.y, size, size);
           ctx.strokeRect(loc.x, loc.y, size, size);
        });
        }
      }
      
      ctx.restore();
    });

    // Draw selection box
    if (selectionBox) {
      ctx.save();
      ctx.strokeStyle = '#0084ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      ctx.fillStyle = 'rgba(0, 132, 255, 0.1)';
      ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      ctx.restore();
    }

    // Draw margin boundaries
    if (topMargin > 0 || rightMargin > 0 || bottomMargin > 0 || leftMargin > 0) {
      ctx.save();
      ctx.strokeStyle = '#d3d3d3';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      const marginLeft = leftMargin * scale;
      const marginTop = topMargin * scale;
      const marginRight = rightMargin * scale;
      const marginBottom = bottomMargin * scale;
      
      const marginWidth = pxWidth - marginLeft - marginRight;
      const marginHeight = pxHeight - marginTop - marginBottom;
      
      ctx.strokeRect(marginLeft, marginTop, marginWidth, marginHeight);
      ctx.restore();
    }

    if (alignGuides.vertical.length || alignGuides.horizontal.length) {
      ctx.save();
      ctx.strokeStyle = '#ff4d4f';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      alignGuides.vertical.forEach(xMm => {
        const xPx = xMm * scale;
        ctx.beginPath();
        ctx.moveTo(xPx, 0);
        ctx.lineTo(xPx, pxHeight);
        ctx.stroke();
      });

      alignGuides.horizontal.forEach(yMm => {
        const yPx = yMm * scale;
        ctx.beginPath();
        ctx.moveTo(0, yPx);
        ctx.lineTo(pxWidth, yPx);
        ctx.stroke();
      });

      ctx.restore();
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedElement, selectedElements, canvasWidth, canvasHeight, zoom, alignGuides, selectionBox, topMargin, rightMargin, bottomMargin, leftMargin]);


  // Interaction Handlers
  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleSave = async () => {
    try {
      if (!templateName.trim()) {
        message.error(getTranslation('enterTemplateNameError'));
        return;
      }

      const templateData = {
        name: templateName,
        width: canvasWidth,
        height: canvasHeight,
        templateConfig: { elements }
      };

      if (templateId) {
        // Update existing template
        await labelAPI.updateTemplate(templateId, templateData);
      } else {
        // Create new template
        const response = await labelAPI.createTemplate({
          businessId: POS_BUSINESS_ID,
          ...templateData
        });
        // Update the template ID after creation
        setTemplateId(response.data.data.id);
      }
      
      // Go back to templates list
      onBack();
    } catch (error) {
      console.error(error);
      message.error(getTranslation('saveFailed'));
    }
  };

  const handleMouseDown = (e) => {
    const { x, y } = getMousePos(e);
    const scale = getScale();

    // Note: Hit testing with rotation is complex. 
    // Current simple implementation ignores rotation for hit testing.
    // Ideally, we transform the mouse point into the element's local coordinate system.

    // 1. Check Resize Handles of Selected Element
    if (selectedElement) {
      const el = elements.find(e => e.id === selectedElement);
      if (el) {
        const handles = getHandleRects(el, scale);
        // If rotated, handles are also rotated. This simple hit test fails for rotated elements.
        // Assuming rotation is 0 for resize interactions for now as per prompt request "implement editor...".
        // Robust rotation support requires matrix transforms. 
        
        for (const [key, rect] of Object.entries(handles)) {
          if (isPointInRect(x, y, rect)) {
            setDragState({
              isDragging: false,
              isResizing: true,
              resizeHandle: key,
              startX: x,
              startY: y,
              initialEl: { ...el }
            });
            return;
          }
        }
      }
    }

    // 2. Check Element Hit (Reverse order for z-index)
    let hitElement = null;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      const elX = el.x * scale;
      const elY = el.y * scale;
      const elW = el.width * scale;
      const elH = el.height * scale;

      if (x >= elX && x <= elX + elW && y >= elY && y <= elY + elH) {
        hitElement = el;
        break;
      }
    }

    if (hitElement) {
      // Check if clicking on an already selected element (in multi-select mode)
      const isAlreadySelected = selectedElements.includes(hitElement.id);
      
      if (isAlreadySelected && selectedElements.length > 1) {
        // Keep multi-select, store initial positions of ALL selected elements
        const initialEls = {};
        selectedElements.forEach(id => {
          const el = elements.find(e => e.id === id);
          if (el) {
            initialEls[id] = { ...el };
          }
        });
        setDragState({
          isDragging: true,
          isResizing: false,
          resizeHandle: null,
          startX: x,
          startY: y,
          initialEl: { ...hitElement },
          selectedIds: [...selectedElements],
          initialEls: initialEls
        });
      } else {
        // Single select: clear multi-select and select only this element
        setSelectedElement(hitElement.id);
        setSelectedElements([hitElement.id]);
        setDragState({
          isDragging: true,
          isResizing: false,
          resizeHandle: null,
          startX: x,
          startY: y,
          initialEl: { ...hitElement },
          selectedIds: [],
          initialEls: {}
        });
      }
    } else {
      // Start selection box
      setSelectedElement(null);
      setSelectedElements([]);
      setSelectionBox({ x, y, w: 0, h: 0, startX: x, startY: y });
      setDragState({
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        startX: x,
        startY: y,
        initialEl: null
      });
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getMousePos(e);
    const scale = getScale();
    const canvas = canvasRef.current;

    // Cursor Updates
    let cursor = 'default';
    if (dragState.isResizing) {
       if (['nw', 'se'].includes(dragState.resizeHandle)) cursor = 'nwse-resize';
       else cursor = 'nesw-resize';
    } else if (dragState.isDragging) {
       cursor = 'move';
    } else {
      if (selectedElement) {
        const el = elements.find(e => e.id === selectedElement);
        if (el) {
           const handles = getHandleRects(el, scale);
           let onHandle = false;
           for (const [key, rect] of Object.entries(handles)) {
              if (isPointInRect(x, y, rect)) {
                 cursor = ['nw', 'se'].includes(key) ? 'nwse-resize' : 'nesw-resize';
                 onHandle = true;
                 break;
              }
           }
           if (!onHandle) {
              const elX = el.x * scale;
              const elY = el.y * scale;
              const elW = el.width * scale;
              const elH = el.height * scale;
              if (x >= elX && x <= elX + elW && y >= elY && y <= elY + elH) {
                  cursor = 'move';
              }
           }
        }
      } else {
         for (let i = elements.length - 1; i >= 0; i--) {
            const el = elements[i];
            const elX = el.x * scale;
            const elY = el.y * scale;
            const elW = el.width * scale;
            const elH = el.height * scale;
            if (x >= elX && x <= elX + elW && y >= elY && y <= elY + elH) {
               cursor = 'move';
               break;
            }
         }
      }
    }
    canvas.style.cursor = cursor;

    // Handle selection box drawing (check this BEFORE drag/resize check)
    if (selectionBox && selectionBox.startX !== undefined) {
      const boxX = Math.min(x, selectionBox.startX);
      const boxY = Math.min(y, selectionBox.startY);
      const boxW = Math.abs(x - selectionBox.startX);
      const boxH = Math.abs(y - selectionBox.startY);
      setSelectionBox({ x: boxX, y: boxY, w: boxW, h: boxH, startX: selectionBox.startX, startY: selectionBox.startY });
      return;
    }

    // Logic for Drag/Resize
    if (!dragState.isDragging && !dragState.isResizing) return;

    const dxPx = x - dragState.startX;
    const dyPx = y - dragState.startY;
    const dxMm = dxPx / scale;
    const dyMm = dyPx / scale;

    if (dragState.isDragging && selectedElement && selectedElements.length <= 1) {
      // Single element drag with snapping
      const init = dragState.initialEl;
      const baseX = roundTo1Decimal((init.x || 0) + dxMm);
      const baseY = roundTo1Decimal((init.y || 0) + dyMm);
      const snapped = getSnappedPosition({ x: baseX, y: baseY }, init);
      setAlignGuides(snapped.guides);

      setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
          const updated = {
            ...el,
            x: roundTo1Decimal(snapped.x),
            y: roundTo1Decimal(snapped.y)
          };
          const constrained = constrainElement(updated);
          return constrained;
        }
        return el;
      }));
    } else if (dragState.isDragging && selectedElements.length > 1) {
      // Multi-element drag - use stored initial positions
      setAlignGuides({ vertical: [], horizontal: [] });
      setElements(prev => prev.map(el => {
        if (selectedElements.includes(el.id)) {
          // Use stored initial position from dragState
          const init = dragState.initialEls[el.id];
          if (init) {
            const updated = {
              ...el,
              x: roundTo1Decimal((init.x || 0) + dxMm),
              y: roundTo1Decimal((init.y || 0) + dyMm)
            };
            const constrained = constrainElement(updated);
            return constrained;
          }
        }
        return el;
      }));
    } else if (dragState.isResizing && selectedElement) {
       setAlignGuides({ vertical: [], horizontal: [] });
       setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
           const init = dragState.initialEl;
           let newX = init.x || 0;
           let newY = init.y || 0;
           let newW = Math.max(1, init.width || 1);
           let newH = Math.max(1, init.height || 1);
           
           // For QR code, lock aspect ratio (square)
           const isQRCode = el.type === 'qrcode';

           if (dragState.resizeHandle.includes('e')) {
              newW = Math.max(1, (init.width || 1) + dxMm);
              if (isQRCode) newH = newW;
              // Constrain to right boundary (considering right margin)
              const maxWidth = canvasWidth - rightMargin - newX;
              if (newW > maxWidth) {
                newW = maxWidth;
                if (isQRCode) newH = newW;
              }
           }
           if (dragState.resizeHandle.includes('s')) {
              newH = Math.max(1, (init.height || 1) + dyMm);
              if (isQRCode) newW = newH;
              // Constrain to bottom boundary (considering bottom margin)
              const maxHeight = canvasHeight - bottomMargin - newY;
              if (newH > maxHeight) {
                newH = maxHeight;
                if (isQRCode) newW = newH;
              }
           }
           if (dragState.resizeHandle.includes('w')) {
              const proposedW = (init.width || 1) - dxMm;
              if (proposedW > 1) {
                  let proposedX = (init.x || 0) + dxMm;
                  if (proposedX < leftMargin) proposedX = leftMargin;
                  newX = proposedX;
                  newW = (init.x || 0) + (init.width || 1) - proposedX;
                  if (isQRCode) newH = newW;
              }
           }
           if (dragState.resizeHandle.includes('n')) {
               const proposedH = (init.height || 1) - dyMm;
               if (proposedH > 1) {
                   let proposedY = (init.y || 0) + dyMm;
                   if (proposedY < topMargin) proposedY = topMargin;
                   newY = proposedY;
                   newH = (init.y || 0) + (init.height || 1) - proposedY;
                   if (isQRCode) newW = newH;
               }
           }

           // Final boundary constraints (including margins)
           if (newX < leftMargin) newX = leftMargin;
           if (newY < topMargin) newY = topMargin;
           if (newX + newW > canvasWidth - rightMargin) newW = canvasWidth - rightMargin - newX;
           if (newY + newH > canvasHeight - bottomMargin) newH = canvasHeight - bottomMargin - newY;

           return { 
             ...el, 
             x: roundTo1Decimal(newX), 
             y: roundTo1Decimal(newY), 
             width: roundTo1Decimal(newW), 
             height: roundTo1Decimal(newH) 
           };
        }
        return el;
      }));
    }
  };

  const handleMouseUp = () => {
    // Handle selection box completion
    if (selectionBox && selectionBox.startX !== undefined && (selectionBox.w > 5 || selectionBox.h > 5)) {
      const scale = getScale();
      const selectedIds = elements
        .filter(el => {
          const elX = el.x * scale;
          const elY = el.y * scale;
          const elW = el.width * scale;
          const elH = el.height * scale;
          
          // Check if element is within selection box
          return !(elX + elW < selectionBox.x || elX > selectionBox.x + selectionBox.w ||
                   elY + elH < selectionBox.y || elY > selectionBox.y + selectionBox.h);
        })
        .map(el => el.id);
      
      setSelectedElements(selectedIds);
      if (selectedIds.length > 0) {
        setSelectedElement(selectedIds[0]);
      }
      setSelectionBox(null);
    } else {
      setSelectionBox(null);
    }

    setDragState({
      isDragging: false,
      isResizing: false,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      initialEl: null,
      selectedIds: [],
      initialEls: {}
    });
    setAlignGuides({ vertical: [], horizontal: [] });
  };

  // Keyboard Shortcuts Handler
  const handleKeyDown = (e) => {
    const isMeta = e.ctrlKey || e.metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)

    // Ctrl+C / Cmd+C - Copy
    if (isMeta && e.key === 'c') {
      e.preventDefault();
      const toCopy = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
      if (toCopy.length === 0) return;
      
      const copiedElements = toCopy.map(id => {
        const el = elements.find(elem => elem.id === id);
        return el ? JSON.parse(JSON.stringify(el)) : null;
      }).filter(el => el !== null);
      
      setClipboard(copiedElements.length === 1 ? copiedElements[0] : copiedElements);
      return;
    }

    // Ctrl+X / Cmd+X - Cut
    if (isMeta && e.key === 'x') {
      e.preventDefault();
      const toCut = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
      if (toCut.length === 0) return;
      
      const cutElements = toCut.map(id => {
        const el = elements.find(elem => elem.id === id);
        return el ? JSON.parse(JSON.stringify(el)) : null;
      }).filter(el => el !== null);
      
      setClipboard(cutElements.length === 1 ? cutElements[0] : cutElements);
      const newElements = elements.filter(elem => !toCut.includes(elem.id));
      setElements(newElements);
      setSelectedElement(null);
      setSelectedElements([]);
      addToHistory(newElements, null);
      return;
    }

    // Ctrl+V / Cmd+V - Paste
    if (isMeta && e.key === 'v') {
      e.preventDefault();
      if (!clipboard) {
        message.warning(getTranslation('noClipboardContent'));
        return;
      }
      
      const isArray = Array.isArray(clipboard);
      const itemsToPaste = isArray ? clipboard : [clipboard];
      
      // Generate new IDs and add offset for all pasted elements
      let offset = 0;
      const pastedElements = itemsToPaste.map(item => ({
        ...JSON.parse(JSON.stringify(item)),
        id: Date.now() + offset++,
        x: (item.x || 0) + 2,
        y: (item.y || 0) + 2
      }));
      
      const newElements = [...elements, ...pastedElements];
      setElements(newElements);
      
      // Select all pasted elements
      const pastedIds = pastedElements.map(el => el.id);
      setSelectedElements(pastedIds);
      setSelectedElement(pastedIds[0]);
      
      addToHistory(newElements, pastedIds[0]);
      return;
    }

    // Ctrl+Z / Cmd+Z - Undo
    if (isMeta && e.key === 'z') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const snapshot = history[newIndex];
        setElements(JSON.parse(JSON.stringify(snapshot.elements)));
        setSelectedElement(snapshot.selectedElement);
      }
      return;
    }

    // Ctrl+Y / Cmd+Y - Redo
    if (isMeta && e.key === 'y') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const snapshot = history[newIndex];
        setElements(JSON.parse(JSON.stringify(snapshot.elements)));
        setSelectedElement(snapshot.selectedElement);
      }
      return;
    }

    // Backspace / Delete - Delete selected element(s)
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const toDelete = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
      if (toDelete.length === 0) return;
      
      toDelete.forEach(id => {
        delete imageCacheRef.current[id];
      });
      
      const newElements = elements.filter(el => !toDelete.includes(el.id));
      setElements(newElements);
      setSelectedElement(null);
      setSelectedElements([]);
      addToHistory(newElements, null);
      return;
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('keydown', handleKeyDown);

    return () => {
      if (canvas) canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, elements, clipboard, history, historyIndex]);


  // Element Management
  const addElement = (type, partial = {}) => {
    // Set initial dimensions based on type
    let initialProps = {
      id: Date.now(),
      type,
      x: type === 'line' ? 0 : 5,
      y: 5,
      width: type === 'text' ? 20 : type === 'line' ? (canvasWidth || 30) : 15,
      height: type === 'text' ? 2.8 : type === 'line' ? 1 : 15,
      rotation: 0,
      fontSize: 6,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none', 
      textAlign: 'left',
      fontFamily: 'Arial',
      color: '#000000',
      text: type === 'text' ? 'New Text' : '',
      ...partial
    };
    const newElement = initialProps;
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedElement(newElement.id);
    addToHistory(newElements, newElement.id);
    
    // Auto-focus content input for text elements
    if (type === 'text') {
      setTimeout(() => {
        if (contentInputRef.current) {
          const textarea = contentInputRef.current.resizableTextArea?.textArea || contentInputRef.current;
          textarea?.focus();
          const len = textarea?.value?.length || 0;
          textarea?.setSelectionRange(len, len); // Move cursor to end
        }
      }, 50);
    }
  };

  const updateSelected = (updates) => {
    if (!selectedElement) return;
    setElements(elements.map(el => {
      if (el.id === selectedElement) {
        // Apply rounding to updates if they are numbers
        const roundedUpdates = {};
        for (const [key, value] of Object.entries(updates)) {
           if (['x', 'y', 'width', 'height'].includes(key) && typeof value === 'number') {
             roundedUpdates[key] = roundTo1Decimal(value);
           } else {
             roundedUpdates[key] = value;
           }
        }
        const updated = { ...el, ...roundedUpdates };
        return constrainElement(updated);
      }
      return el;
    }));
  };
  
  const toggleTextDecoration = (type) => {
    if (!selectedElement) return;
    const el = elements.find(e => e.id === selectedElement);
    if (!el) return;
    
    let current = el.textDecoration || 'none';
    let parts = current === 'none' ? [] : current.split(' ');
    
    if (parts.includes(type)) {
      parts = parts.filter(p => p !== type);
    } else {
      parts.push(type);
    }
    
    const newValue = parts.length > 0 ? parts.join(' ') : 'none';
    updateSelected({ textDecoration: newValue });
  };

  const deleteSelected = () => {
    // Delete selected elements (single or multiple)
    const toDelete = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
    if (toDelete.length === 0) return;
    
    toDelete.forEach(id => {
      delete imageCacheRef.current[id];
    });
    
    setElements(elements.filter(el => !toDelete.includes(el.id)));
    setSelectedElement(null);
    setSelectedElements([]);
  };

  const cutSelected = () => {
    // Cut selected elements (single or multiple)
    const toCut = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
    if (toCut.length === 0) return;
    
    const cutElements = toCut.map(id => {
      const el = elements.find(elem => elem.id === id);
      return el ? JSON.parse(JSON.stringify(el)) : null;
    }).filter(el => el !== null);
    
    setClipboard(cutElements.length === 1 ? cutElements[0] : cutElements);
    const newElements = elements.filter(elem => !toCut.includes(elem.id));
    setElements(newElements);
    setSelectedElement(null);
    setSelectedElements([]);
    addToHistory(newElements, null);
  };

  const copySelected = () => {
    // Copy selected elements to clipboard (same as Ctrl+C)
    const toCopy = selectedElements.length > 0 ? selectedElements : (selectedElement ? [selectedElement] : []);
    if (toCopy.length === 0) return;
    
    const copiedElements = toCopy.map(id => {
      const el = elements.find(elem => elem.id === id);
      return el ? JSON.parse(JSON.stringify(el)) : null;
    }).filter(el => el !== null);
    
    setClipboard(copiedElements.length === 1 ? copiedElements[0] : copiedElements);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      message.error(getTranslation('imageSizeLimitExceeded') || 'Image size cannot exceed 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result;
      if (typeof imageData === 'string') {
        addElement('image', {
          imageData,
          width: 15,
          height: 15,
          borderRadius: 0
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const replaceImage = () => {
    if (!selectedElement) return;
    document.getElementById('imageUploadReplace').click();
  };

  const handleImageReplace = (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement) return;

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      message.error(getTranslation('imageSizeLimitExceeded') || 'Image size cannot exceed 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result;
      if (typeof imageData === 'string') {
        // Clear old image cache
        delete imageCacheRef.current[selectedElement];
        updateSelected({ imageData });
      }
    };
    reader.readAsDataURL(file);
  };

  const currentElement = elements.find(el => el.id === selectedElement);

  // Handlers for Toolbar
  const handleZoom = (delta) => {
    setZoom(prev => Math.max(10, Math.min(500, prev + delta)));
  };

  return (
    <div className="label-editor-container">
      {/* 1. Left Icon Bar */}
      <div className="left-icon-bar">
        {[
          { key: 'templates', icon: <LayoutOutlined />, label: getTranslation('templates') },
          { key: 'text', icon: <FontSizeOutlined />, label: getTranslation('text') },
          { key: 'params', icon: <CodeOutlined />, label: getTranslation('parameters') },
          { key: 'image', icon: <PictureOutlined />, label: getTranslation('image') },
          { key: 'shape', icon: <BorderOutlined />, label: getTranslation('shape') },
        ].map(item => (
          <div 
            key={item.key} 
            className={`icon-bar-item ${activeSidebarItem === item.key ? 'active' : ''}`}
            onClick={() => {
              setActiveSidebarItem(item.key);
              setIsSidebarOpen(true);
            }}
          >
            <div className="icon">{item.icon}</div>
            <div className="label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 2. Left Drawer Panel */}
      {isSidebarOpen && (
        <div className="left-drawer">
          {activeSidebarItem === 'params' && (
            <div className="drawer-content">
              <Button block style={{ marginBottom: 16 }}>{getTranslation('parameters')}</Button>
              <Input prefix={<SearchOutlined />} placeholder={getTranslation('search')} style={{ marginBottom: 16 }} />
              <div className="param-list">
                {PARAM_LIST.map(param => (
                  <div 
                    key={param.key} 
                    className="param-item"
                    onClick={() => addElement('text', { text: `#{${param.key}}` })}
                  >
                    {getTranslation(param.key)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSidebarItem === 'templates' && (
            <div className="drawer-content">
              <div style={{ marginTop: 20, textAlign: 'center', color: '#999' }}>
                {getTranslation('noMoreTemplates')}
              </div>
            </div>
          )}
           {activeSidebarItem === 'text' && (
            <div className="drawer-content">
               <Button block onClick={() => addElement('text', { text: getTranslation('plainText') })}>{getTranslation('addNormalText')}</Button>
            </div>
          )}
          {activeSidebarItem === 'image' && (
            <div className="drawer-content">
              <input 
                type="file" 
                accept="image/*"
                id="imageUpload"
                style={{ display: 'none' }}
                onChange={handleImageUpload}
              />
              <Button 
                block 
                onClick={() => document.getElementById('imageUpload').click()}
                style={{ marginBottom: 12 }}
              >
                {getTranslation('selectImage')}
              </Button>
              <Button 
                block 
                onClick={() => addElement('qrcode', { 
                  x: 10, 
                  y: 10, 
                  width: 10, 
                  height: 10,
                  qrcodeContent: 'tea_machine'
                })}
              >
                {getTranslation('addQrCode')}
              </Button>
              <div style={{ marginTop: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>
                {getTranslation('supportedFormats')}
              </div>
            </div>
          )}
          {activeSidebarItem === 'shape' && (
            <div className="drawer-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button 
                  block 
                  style={{ textAlign: 'left', padding: '8px 12px' }}
                  onClick={() => addElement('line', { 
                 
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'solid'
                  })}
                >
                  <div style={{ borderBottom: '2px solid #000', width: '100%' }}></div>
                </Button>
                <Button 
                  block
                  style={{ textAlign: 'left', padding: '8px 12px' }}
                  onClick={() => addElement('line', { 
                   
                   
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'dashed'
                  })}
                >
                  <div style={{ borderBottom: '2px dashed #000', width: '100%' }}></div>
                </Button>
                <Button 
                  block
                  style={{ textAlign: 'left', padding: '8px 12px' }}
                  onClick={() => addElement('line', { 
                  
                     
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'dotted'
                  })}
                >
                  <div style={{ borderBottom: '2px dotted #000', width: '100%' }}></div>
                </Button>
                <Button 
                  block
                  style={{ textAlign: 'left', padding: '8px 12px' }}
                  onClick={() => addElement('line', { 
                    
                    
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'double'
                  })}
                >
                  <div style={{ borderBottom: '5px double #000', width: '100%' }}></div>
                </Button>
                <Button 
                  block
                  style={{ textAlign: 'left', padding: '8px 12px', display: 'flex', alignItems: 'center' }}
                  onClick={() => addElement('line', { 
                    y: 10, 
                    height: 1, 
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'doubleDashed'
                  })}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', height: 12, justifyContent: 'center' }}>
                    <div style={{ borderBottom: '2px dashed #000', width: '100%' }}></div>
                    <div style={{ borderBottom: '2px dashed #000', width: '100%' }}></div>
                  </div>
                </Button>
                <Button 
                  block
                  style={{ textAlign: 'left', padding: '8px 12px', display: 'flex', alignItems: 'center' }}
                  onClick={() => addElement('line', { 
                    
                    
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'doubleDotted'
                  })}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', height: 12, justifyContent: 'center' }}>
                    <div style={{ borderBottom: '2px dotted #000', width: '100%' }}></div>
                    <div style={{ borderBottom: '2px dotted #000', width: '100%' }}></div>
                  </div>
                </Button>
              </div>
            </div>
          )}
          {/* Collapse Button */}
          <div className="drawer-collapse" onClick={() => setIsSidebarOpen(false)}>
            {getTranslation('collapse')} <LeftOutlined style={{ fontSize: 10 }} />
          </div>
        </div>
      )}

      {/* 3. Center Canvas Area */}
      <div className="center-area">
        <div className="center-header">
          <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            <Input 
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              style={{ width: 200 }}
              placeholder={getTranslation('enterTemplateName')}
            />
            <Button.Group>
              <Button
                icon={<UndoOutlined />}
                onClick={() => {
                  if (historyIndex > 0) {
                    const newIndex = historyIndex - 1;
                    setHistoryIndex(newIndex);
                    const snapshot = history[newIndex];
                    setElements(JSON.parse(JSON.stringify(snapshot.elements)));
                    setSelectedElement(snapshot.selectedElement);
                  }
                }}
                disabled={historyIndex <= 0}
              >{getTranslation('undo')}</Button>
              <Button
                icon={<RedoOutlined />}
                onClick={() => {
                  if (historyIndex < history.length - 1) {
                    const newIndex = historyIndex + 1;
                    setHistoryIndex(newIndex);
                    const snapshot = history[newIndex];
                    setElements(JSON.parse(JSON.stringify(snapshot.elements)));
                    setSelectedElement(snapshot.selectedElement);
                  }
                }}
                disabled={historyIndex >= history.length - 1}
              >{getTranslation('redo')}</Button>
            </Button.Group>
          </div>
          <div className="header-actions">
            <Button onClick={onBack}>{getTranslation('cancel')}</Button>
            <Button type="primary" onClick={handleSave}>{getTranslation('save')}</Button>
          </div>
        </div>

        <div className="canvas-wrapper-outer">
          <div className="canvas-body-row">
            <div className="canvas-viewport">
              <canvas 
                ref={canvasRef} 
                className="label-canvas"
                tabIndex={0}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>
          </div>
        </div>

        <div className="center-footer">
          <div className="zoom-controls">
            <Button type="text" icon={<ZoomOutOutlined />} onClick={() => handleZoom(-10)} size="small" />
            <span className="zoom-text">{zoom}%</span>
            <Button type="text" icon={<ZoomInOutlined />} onClick={() => handleZoom(10)} size="small" />
          </div>
          <Button type="text" icon={<QuestionCircleOutlined />}>{getTranslation('help')}</Button>
        </div>
      </div>

      {/* 4. Right Property Panel */}
      <div className="right-properties">
        {currentElement ? (
          // Element Properties
          <div className="properties-content">
            {/* Common Properties for All Elements */}
            <div className="prop-section-title">{getTranslation('parameters')}</div>
            <div className="prop-grid-2">
              <InputNumber 
                addonBefore="X" 
                value={currentElement.x} 
                step={0.1}
                precision={1}
                min={0}
                onChange={v => updateSelected({ x: v || 0 })} 
              />
              <InputNumber 
                addonBefore="Y" 
                value={currentElement.y} 
                step={0.1}
                precision={1}
                min={0}
                onChange={v => updateSelected({ y: v || 0 })} 
              />
              <InputNumber 
                addonBefore="W" 
                value={currentElement.width} 
                step={0.1}
                precision={1}
                min={1}
                disabled={currentElement.type === 'line' && (currentElement.rotation === 90 || currentElement.rotation === 270)}
                onChange={v => {
                  if (currentElement.type === 'qrcode') {
                    updateSelected({ width: v || 1, height: v || 1 });
                  } else {
                    updateSelected({ width: v || 1 });
                  }
                }} 
              />
              <InputNumber 
                addonBefore="H" 
                value={currentElement.height} 
                step={0.1}
                precision={1}
                min={1}
                disabled={currentElement.type === 'line' && (currentElement.rotation === 0 || currentElement.rotation === 180)}
                onChange={v => {
                  if (currentElement.type === 'line') {
                    // For lines, when not rotated 90/270, height is always 1, don't allow changes
                    return;
                  } else if (currentElement.type === 'qrcode') {
                    updateSelected({ width: v || 1, height: v || 1 });
                  } else {
                    updateSelected({ height: v || 1 });
                  }
                }} 
              />
            </div>

            {/* Image Element Properties */}
            {currentElement.type === 'image' && (
              <>
                <div className="prop-section-title" style={{ marginTop: 20 }}>{getTranslation('imageSettings')}</div>
                
                <input 
                  type="file" 
                  accept="image/*"
                  id="imageUploadReplace"
                  style={{ display: 'none' }}
                  onChange={handleImageReplace}
                />
                
                <Button 
                  block 
                  style={{ marginBottom: 12 }}
                  onClick={replaceImage}
                >
                  {getTranslation('replaceImage')}
                </Button>

                <div className="prop-section-title" style={{ marginTop: 20 }}>{getTranslation('borderRadius')}</div>
                <InputNumber 
                  addonBefore="px" 
                  value={currentElement.borderRadius || 0}
                  step={0.5}
                  precision={1}
                  min={0}
                  onChange={v => updateSelected({ borderRadius: v })}
                  style={{ width: '100%' }}
                />
              </>
            )}

            {/* Line Element Properties */}
            {currentElement.type === 'line' && (
              <>
                <div className="prop-section-title" style={{ marginTop: 20 }}>{getTranslation('lineSettings')}</div>
                
                <div className="prop-row">
                  <span style={{ marginRight: 8 }}>{getTranslation('lineStyle')}:</span>
                  <Select 
                    value={currentElement.lineStyle || 'solid'} 
                    style={{ flex: 1 }}
                    onChange={v => updateSelected({ lineStyle: v })}
                    options={[
                      { 
                        value: 'solid', 
                        label: (
                          <div style={{ borderBottom: '2px solid #000', width: 80, height: 0 }}></div>
                        ) 
                      }, 
                      { 
                        value: 'dashed', 
                        label: (
                          <div style={{ borderBottom: '2px dashed #000', width: 80, height: 0 }}></div>
                        ) 
                      },
                      { 
                        value: 'dotted', 
                        label: (
                          <div style={{ borderBottom: '2px dotted #000', width: 80, height: 0 }}></div>
                        ) 
                      },
                      { 
                        value: 'double', 
                        label: (
                          <div style={{ borderBottom: '4px double #000', width: 80, height: 0 }}></div>
                        ) 
                      },
                      { 
                        value: 'doubleDashed', 
                        label: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: 80, height: 12, justifyContent: 'center' }}>
                            <div style={{ borderBottom: '2px dashed #000', width: '100%' }}></div>
                            <div style={{ borderBottom: '2px dashed #000', width: '100%' }}></div>
                          </div>
                        ) 
                      },
                      { 
                        value: 'doubleDotted', 
                        label: (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: 80, height: 12, justifyContent: 'center' }}>
                            <div style={{ borderBottom: '2px dotted #000', width: '100%' }}></div>
                            <div style={{ borderBottom: '2px dotted #000', width: '100%' }}></div>
                          </div>
                        ) 
                      }
                    ]} 
                  />
                </div>

                <div className="prop-row" style={{ marginTop: 12 }}>
                  <span style={{ marginRight: 8 }}>{getTranslation('lineWidth')}:</span>
                  <InputNumber 
                    value={currentElement.strokeWidth || 1} 
                    min={0.5}
                    step={0.5}
                    precision={1}
                    onChange={v => updateSelected({ strokeWidth: v })} 
                    style={{ flex: 1 }}
                  />
                </div>

                <div className="prop-row">
                  <span style={{ marginRight: 8 }}>{getTranslation('strokeColor')}:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <ColorPicker 
                      value={currentElement.strokeColor || '#000000'} 
                      onChange={(color) => updateSelected({ strokeColor: color.toHexString() })}
                      presets={[
                        {
                          label: 'Common',
                          colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff6b6b', '#4ecdc4', '#45b7d1']
                        }
                      ]}
                    />
                    <Input 
                      value={currentElement.strokeColor || '#000000'} 
                      onChange={(e) => updateSelected({ strokeColor: e.target.value })}
                      style={{ flex: 1, padding: '0 4px', fontSize: 12 }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Text Element Properties */}
            {currentElement.type === 'qrcode' && (
              <>
                <div className="prop-section-title" style={{ marginTop: 20 }}>{getTranslation('qrCodeSettings')}</div>
                <div className="prop-row">
                  <span style={{ marginRight: 8 }}>{getTranslation('content')}:</span>
                  <Select 
                    value={currentElement.qrcodeContent || 'tea_machine'} 
                    style={{ flex: 1 }}
                    onChange={v => updateSelected({ qrcodeContent: v })}
                    options={[
                      { value: 'tea_machine', label: 'Tea Machine' }
                    ]}
                  />
                </div>
              </>
            )}

            {currentElement.type === 'text' && (
              <>
                <div className="prop-section-title" style={{ marginTop: 20 }}>{getTranslation('properties')}</div>
                <div className="prop-row">
                  <Select 
                    value={currentElement.fontFamily} 
                    style={{ flex: 1 }}
                    onChange={v => updateSelected({ fontFamily: v })}
                    options={[
                      { value: 'Arial', label: 'Arial' },
                      { value: 'Helvetica', label: 'Helvetica' },
                      { value: 'Times New Roman', label: 'Times New Roman' },
                      { value: 'Courier New', label: 'Courier New' },
                      { value: 'Verdana', label: 'Verdana' },
                      { value: 'Georgia', label: 'Georgia' },
                      { value: 'Comic Sans MS', label: 'Comic Sans MS' },
                      { value: 'Trebuchet MS', label: 'Trebuchet MS' },
                      { value: '等线', label: '等线' }
                    ]} 
                  />
                </div>
                <div className="prop-row">
                  <InputNumber 
                    value={currentElement.fontSize} 
                    onChange={v => updateSelected({ fontSize: v })} 
                    style={{ width: 80 }} 
                  />
                  {/* Color Selection: ColorPicker + Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                     <ColorPicker 
                       value={currentElement.color} 
                       onChange={(color) => updateSelected({ color: color.toHexString() })}
                       presets={[
                         {
                           label: 'Common',
                           colors: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff6b6b', '#4ecdc4', '#45b7d1']
                         }
                       ]}
                     />
                     <Input 
                       value={currentElement.color} 
                       onChange={(e) => updateSelected({ color: e.target.value })}
                       style={{ flex: 1, padding: '0 4px', fontSize: 12 }}
                     />
                  </div>
                </div>

                <div className="prop-toolbar-row">
                   <Button.Group>
                      <Button 
                        icon={<AlignLeftOutlined />} 
                        type={currentElement.textAlign === 'left' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ textAlign: 'left' })}
                      />
                      <Button 
                        icon={<AlignCenterOutlined />} 
                        type={currentElement.textAlign === 'center' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ textAlign: 'center' })}
                      />
                      <Button 
                        icon={<AlignRightOutlined />} 
                        type={currentElement.textAlign === 'right' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ textAlign: 'right' })}
                      />
                      <Button 
                        icon={<MenuOutlined />} 
                        type={currentElement.textAlign === 'justify' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ textAlign: 'justify' })}
                        title="Justify"
                      />
                       <Button 
                        icon={<ColumnWidthOutlined />} 
                        type={currentElement.textAlign === 'distribute' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ textAlign: 'distribute' })}
                        title="Distribute"
                      />
                   </Button.Group>
                </div>
                 <div className="prop-toolbar-row">
                   <Button.Group>
                      <Button 
                        icon={<BoldOutlined />} 
                        type={currentElement.fontWeight === 'bold' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ fontWeight: currentElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      />
                      <Button 
                        icon={<ItalicOutlined />}
                        type={currentElement.fontStyle === 'italic' ? 'primary' : 'default'}
                        onClick={() => updateSelected({ fontStyle: currentElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      />
                      <Button 
                        icon={<UnderlineOutlined />}
                        type={currentElement.textDecoration && currentElement.textDecoration.includes('underline') ? 'primary' : 'default'}
                        onClick={() => toggleTextDecoration('underline')}
                      />
                      <Button 
                        icon={<StrikethroughOutlined />}
                        type={currentElement.textDecoration && currentElement.textDecoration.includes('line-through') ? 'primary' : 'default'}
                        onClick={() => toggleTextDecoration('line-through')} 
                      />
                   </Button.Group>
                </div>
                
                <div className="prop-section-title" style={{ marginTop: 20 }}>{getTranslation('content')}</div>
                <TextArea 
                  ref={contentInputRef}
                  rows={4} 
                  value={currentElement.text}
                  onChange={e => updateSelected({ text: e.target.value })}
                />
                {/* <div className="help-text">修改内容仅用于当前排版预览效果...</div> */}
              </>
            )}

            {/* Common Action Buttons */}
            <div className="prop-toolbar-row" style={{ marginTop: 20 }}>
              <Button block icon={<RotateRightOutlined />} onClick={() => {
                const newRotation = (currentElement.rotation + 90) % 360;
                const updates = { rotation: newRotation };
                // For lines, always swap width and height when rotating
                if (currentElement.type === 'line') {
                  const temp = currentElement.width;
                  updates.width = currentElement.height;
                  updates.height = temp;
                }
                updateSelected(updates);
              }}></Button>
              <Button block icon={<RotateLeftOutlined />} onClick={() => {
                const newRotation = (currentElement.rotation - 90 + 360) % 360;
                const updates = { rotation: newRotation };
                // For lines, always swap width and height when rotating
                if (currentElement.type === 'line') {
                  const temp = currentElement.width;
                  updates.width = currentElement.height;
                  updates.height = temp;
                }
                updateSelected(updates);
              }}></Button>
            </div>

            <div className="prop-toolbar-row">
               <Button block danger onClick={deleteSelected}>{getTranslation('delete')}</Button>
            </div>
          </div>
        ) : (
          // Global Settings
          <div className="properties-content">
            <div className="prop-section-title">{getTranslation('global')}</div>
            <div className="prop-row-spread">{getTranslation('templateSize')}</div>
            <div className="prop-grid-2">
              <InputNumber 
                value={canvasWidth} 
                addonBefore={getTranslation('width')}
                addonAfter="mm"
                onChange={setCanvasWidth} 
              />
               <InputNumber 
                value={canvasHeight} 
                addonBefore={getTranslation('height')}
                addonAfter="mm"
                onChange={setCanvasHeight} 
              />
            </div>

            <div className="prop-row-spread" style={{ marginTop: 20 }}>
              {getTranslation('margins')}
            </div>
            <div className="prop-grid-2">
              <InputNumber 
                value={topMargin} 
                addonBefore="Top"
                addonAfter="mm"
                onChange={setTopMargin}
                min={0}
              />
              <InputNumber 
                value={bottomMargin} 
                addonBefore="Bottom"
                addonAfter="mm"
                onChange={setBottomMargin}
                min={0}
              />
              <InputNumber 
                value={leftMargin} 
                addonBefore="Left"
                addonAfter="mm"
                onChange={setLeftMargin}
                min={0}
              />
              <InputNumber 
                value={rightMargin} 
                addonBefore="Right"
                addonAfter="mm"
                onChange={setRightMargin}
                min={0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

