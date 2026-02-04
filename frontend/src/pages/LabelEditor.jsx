import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, InputNumber, Select, message, Radio, Divider, Tooltip, ColorPicker } from 'antd';
import { labelAPI } from '../services/api';
import { POS_BUSINESS_ID } from '../config/constants';
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
  ColumnWidthOutlined
} from '@ant-design/icons';
import './LabelEditor.css';

const { TextArea } = Input;

const PARAM_LIST = [
  { name: '店名', key: 'shopName' },
  { name: '商品名称', key: 'productName' },
  { name: '单价', key: 'price' },
  { name: '会员价', key: 'memberPrice' },
  { name: '批发价', key: 'wholesalePrice' },
  { name: '条码', key: 'barcode' },
  { name: '商品条码', key: 'productBarcode' },
  { name: 'KDS识别码', key: 'kdsCode' },
  { name: '制作暗码', key: 'productionCode' },
];

export default function LabelEditor({ onBack, currentTemplate }) {
  const canvasRef = useRef(null);
  const imageCacheRef = useRef({}); // Cache for loaded images
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateName, setTemplateName] = useState('未命名');
  const [templateId, setTemplateId] = useState(null);
  const [canvasWidth, setCanvasWidth] = useState(60);
  const [canvasHeight, setCanvasHeight] = useState(40);
  const [zoom, setZoom] = useState(200); // Initial zoom 200%
  const [activeSidebarItem, setActiveSidebarItem] = useState('params');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize template data when currentTemplate changes
  useEffect(() => {
    if (currentTemplate) {
      setTemplateId(currentTemplate.id);
      setTemplateName(currentTemplate.name || '未命名');
      setCanvasWidth(currentTemplate.width || 60);
      setCanvasHeight(currentTemplate.height || 40);
      setElements(currentTemplate.templateConfig?.elements || []);
    }
  }, [currentTemplate]);

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
    initialEl: null // Snapshot of element before drag/resize
  });

  // Helpers
  const getScale = () => 8 * (zoom / 100);

  const roundTo1Decimal = (num) => Math.round(num * 10) / 10;

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
             // Justify: distribute space between words. 
             // Last line acts like left align usually.
             if (index < lines.length - 1 && line.includes(' ')) {
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
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(el.type === 'barcode' ? 'Barcode' : 'QR', x + w/2, y + h/2 - 5);
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
        
        // Apply line style (solid or dashed)
        if (el.lineStyle === 'dashed') {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      } else if (el.type === 'shape') {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x, y, w, h);
      }

      // Draw selection border (only if not rotated or handle rotation visually)
      // Note: For simplicity, selection border rotates with the context
      if (selectedElement === el.id) {
        ctx.strokeStyle = '#0084ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h); // Draw exactly on border

        // Draw resize handles
        // We draw handles *without* rotation context to keep them axis-aligned? 
        // No, standard behavior is handles rotate with element.
        
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
      
      ctx.restore();
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [elements, selectedElement, canvasWidth, canvasHeight, zoom]);


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
        message.error('请输入模板名称');
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
        message.success('保存成功');
      } else {
        // Create new template
        const response = await labelAPI.createTemplate({
          businessId: POS_BUSINESS_ID,
          ...templateData
        });
        message.success('创建成功');
        // Update the template ID after creation
        setTemplateId(response.data.data.id);
      }
      
      // Go back to templates list
      onBack();
    } catch (error) {
      console.error(error);
      message.error('保存失败');
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
      setSelectedElement(hitElement.id);
      setDragState({
        isDragging: true,
        isResizing: false,
        resizeHandle: null,
        startX: x,
        startY: y,
        initialEl: { ...hitElement }
      });
    } else {
      setSelectedElement(null);
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

    // Logic for Drag/Resize
    if (!dragState.isDragging && !dragState.isResizing) return;

    const dxPx = x - dragState.startX;
    const dyPx = y - dragState.startY;
    const dxMm = dxPx / scale;
    const dyMm = dyPx / scale;

    if (dragState.isDragging && selectedElement) {
      setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
          return {
            ...el,
            x: Math.max(0, roundTo1Decimal((dragState.initialEl.x || 0) + dxMm)),
            y: Math.max(0, roundTo1Decimal((dragState.initialEl.y || 0) + dyMm))
          };
        }
        return el;
      }));
    } else if (dragState.isResizing && selectedElement) {
       setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
           const init = dragState.initialEl;
           let newX = Math.max(0, init.x || 0);
           let newY = Math.max(0, init.y || 0);
           let newW = Math.max(1, init.width || 1);
           let newH = Math.max(1, init.height || 1);

           if (dragState.resizeHandle.includes('e')) {
              newW = Math.max(1, (init.width || 1) + dxMm);
           }
           if (dragState.resizeHandle.includes('s')) {
              newH = Math.max(1, (init.height || 1) + dyMm);
           }
           if (dragState.resizeHandle.includes('w')) {
              const proposedW = (init.width || 1) - dxMm;
              if (proposedW > 1) {
                  newX = Math.max(0, (init.x || 0) + dxMm);
                  newW = proposedW;
              }
           }
           if (dragState.resizeHandle.includes('n')) {
               const proposedH = (init.height || 1) - dyMm;
               if (proposedH > 1) {
                   newY = Math.max(0, (init.y || 0) + dyMm);
                   newH = proposedH;
               }
           }

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
    setDragState({
      isDragging: false,
      isResizing: false,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      initialEl: null
    });
  };

  // Keyboard Shortcuts Handler
  const handleKeyDown = (e) => {
    const isMeta = e.ctrlKey || e.metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)

    // Ctrl+C / Cmd+C - Copy
    if (isMeta && e.key === 'c') {
      e.preventDefault();
      if (selectedElement) {
        const el = elements.find(elem => elem.id === selectedElement);
        if (el) {
          setClipboard(JSON.parse(JSON.stringify(el)));
          message.success('已复制');
        }
      }
      return;
    }

    // Ctrl+X / Cmd+X - Cut
    if (isMeta && e.key === 'x') {
      e.preventDefault();
      if (selectedElement) {
        const el = elements.find(elem => elem.id === selectedElement);
        if (el) {
          setClipboard(JSON.parse(JSON.stringify(el)));
          const newElements = elements.filter(elem => elem.id !== selectedElement);
          setElements(newElements);
          setSelectedElement(null);
          addToHistory(newElements, null);
          message.success('已剪切');
        }
      }
      return;
    }

    // Ctrl+V / Cmd+V - Paste
    if (isMeta && e.key === 'v') {
      e.preventDefault();
      if (clipboard) {
        const newElement = {
          ...JSON.parse(JSON.stringify(clipboard)),
          id: Date.now(), // Generate new ID to avoid duplication
          x: clipboard.x + 2, // Slight offset so pasted element is visible
          y: clipboard.y + 2
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        setSelectedElement(newElement.id);
        addToHistory(newElements, newElement.id);
        message.success('已粘贴');
      } else {
        message.warning('剪贴板为空');
      }
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
        message.success('已撤销');
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
        message.success('已重做');
      }
      return;
    }

    // Backspace / Delete - Delete selected element
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      if (selectedElement) {
        const newElements = elements.filter(el => el.id !== selectedElement);
        setElements(newElements);
        setSelectedElement(null);
        addToHistory(newElements, null);
        message.success('已删除');
      }
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
    const newElement = {
      id: Date.now(),
      type,
      x: 5,
      y: 5,
      width: type === 'text' ? 20 : 15, // Updated default width
      height: type === 'text' ? 2.8 : 15, // Updated default height
      rotation: 0,
      fontSize: 8,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none', 
      textAlign: 'left',
      fontFamily: 'Arial',
      color: '#000000',
      text: type === 'text' ? 'New Text' : '',
      ...partial
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    setSelectedElement(newElement.id);
    addToHistory(newElements, newElement.id);
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
        return { ...el, ...roundedUpdates };
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
    if (!selectedElement) return;
    // Clear image cache for this element
    delete imageCacheRef.current[selectedElement];
    setElements(elements.filter(el => el.id !== selectedElement));
    setSelectedElement(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        message.success('图片已插入');
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

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result;
      if (typeof imageData === 'string') {
        // Clear old image cache
        delete imageCacheRef.current[selectedElement];
        updateSelected({ imageData });
        message.success('图片已替换');
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
          { key: 'templates', icon: <LayoutOutlined />, label: '模板' },
          { key: 'text', icon: <FontSizeOutlined />, label: '文字' },
          { key: 'params', icon: <CodeOutlined />, label: '参数' },
          { key: 'image', icon: <PictureOutlined />, label: '图片' },
          { key: 'shape', icon: <BorderOutlined />, label: '图形' },
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
              <Button block style={{ marginBottom: 16 }}>自定义打印参数</Button>
              <Input prefix={<SearchOutlined />} placeholder="搜索" style={{ marginBottom: 16 }} />
              <div className="param-list">
                {PARAM_LIST.map(param => (
                  <div 
                    key={param.key} 
                    className="param-item"
                    onClick={() => addElement('text', { text: `#{${param.name}}` })}
                  >
                    {param.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeSidebarItem === 'templates' && (
            <div className="drawer-content">
              <Button block onClick={() => setElements([])}>使用空白模板编辑</Button>
              <div style={{ marginTop: 20, textAlign: 'center', color: '#999' }}>
                暂无更多模板
              </div>
            </div>
          )}
           {activeSidebarItem === 'text' && (
            <div className="drawer-content">
               <Button block onClick={() => addElement('text', { text: '普通文本' })}>添加普通文本</Button>
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
              >
                选择图片
              </Button>
              <div style={{ marginTop: 20, textAlign: 'center', color: '#999', fontSize: 12 }}>
                支持 JPG、PNG、GIF 等格式
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
                    x: 10, 
                    y: 10, 
                    width: 50, 
                    height: 1, 
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
                    x: 10, 
                    y: 10, 
                    width: 50, 
                    height: 1, 
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
                    x: 10, 
                    y: 10, 
                    width: 50, 
                    height: 1, 
                    strokeColor: '#000', 
                    strokeWidth: 1,
                    lineStyle: 'double'
                  })}
                >
                  <div style={{ borderBottom: '5px double #000', width: '100%' }}></div>
                </Button>
                <Button 
                  block
                  style={{ textAlign: 'left', padding: '8px 12px' }}
                  onClick={() => addElement('line', { 
                    x: 10, 
                    y: 10, 
                    width: 50, 
                    height: 1, 
                    strokeColor: '#000', 
                    strokeWidth: 2,
                    lineStyle: 'dotted'
                  })}
                >
                  <div style={{ borderBottom: '2px dotted #000', width: '100%' }}></div>
                </Button>
              </div>
            </div>
          )}
          {/* Collapse Button */}
          <div className="drawer-collapse" onClick={() => setIsSidebarOpen(false)}>
            收起 <LeftOutlined style={{ fontSize: 10 }} />
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
              placeholder="模板名称"
            />
          </div>
          <div className="header-actions">
            <Button onClick={onBack}>取消</Button>
            <Button type="primary" onClick={handleSave}>保存</Button>
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
          <Button type="text" icon={<QuestionCircleOutlined />}>帮助</Button>
        </div>
      </div>

      {/* 4. Right Property Panel */}
      <div className="right-properties">
        {currentElement ? (
          // Element Properties
          <div className="properties-content">
            {/* Common Properties for All Elements */}
            <div className="prop-section-title">参数</div>
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
                onChange={v => updateSelected({ width: v || 1 })} 
              />
              <InputNumber 
                addonBefore="H" 
                value={currentElement.height} 
                step={0.1}
                precision={1}
                min={1}
                onChange={v => updateSelected({ height: v || 1 })} 
              />
            </div>

            {/* Image Element Properties */}
            {currentElement.type === 'image' && (
              <>
                <div className="prop-section-title" style={{ marginTop: 20 }}>图片设置</div>
                
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
                  替换图片
                </Button>

                <div className="prop-section-title" style={{ marginTop: 20 }}>圆角</div>
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
                <div className="prop-section-title" style={{ marginTop: 20 }}>线条设置</div>
                
                <div className="prop-row">
                  <span style={{ marginRight: 8 }}>样式:</span>
                  <Select 
                    value={currentElement.lineStyle || 'solid'} 
                    style={{ flex: 1 }}
                    onChange={v => updateSelected({ lineStyle: v })}
                    options={[
                      { value: 'solid', label: '实线' }, 
                      { value: 'dashed', label: '虚线' }
                    ]} 
                  />
                </div>

                <div className="prop-row">
                  <span style={{ marginRight: 8 }}>粗细:</span>
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
                  <span style={{ marginRight: 8 }}>颜色:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                    <ColorPicker 
                      value={currentElement.strokeColor || '#000000'} 
                      onChange={(color) => updateSelected({ strokeColor: color.toHexString() })} 
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
            {currentElement.type === 'text' && (
              <>
                <div className="prop-section-title" style={{ marginTop: 20 }}>属性</div>
                <div className="prop-row">
                  <Select 
                    value={currentElement.fontFamily} 
                    style={{ flex: 1 }}
                    onChange={v => updateSelected({ fontFamily: v })}
                    options={[{ value: 'Arial', label: 'Arial' }, { value: '等线', label: '等线' }]} 
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
                
                <div className="prop-section-title" style={{ marginTop: 20 }}>内容</div>
                <TextArea 
                  rows={4} 
                  value={currentElement.text}
                  onChange={e => updateSelected({ text: e.target.value })}
                />
                <div className="help-text">修改内容仅用于当前排版预览效果...</div>
              </>
            )}

            {/* Common Action Buttons */}
            <div className="prop-toolbar-row" style={{ marginTop: 20 }}>
              <Button block icon={<RotateRightOutlined />} onClick={() => updateSelected({ rotation: (currentElement.rotation + 90) % 360 })}></Button>
              <Button block icon={<RotateLeftOutlined />} onClick={() => updateSelected({ rotation: (currentElement.rotation - 90 + 360) % 360 })}></Button>
            </div>

             <div className="prop-toolbar-row">
               <Button block onClick={() => {
                 const copyData = { ...currentElement };
                 // Remove imageData to avoid copying large base64 strings
                 if (copyData.type === 'image') delete copyData.imageData;
                 addElement(currentElement.type, copyData);
               }}>复制</Button>
               <Button block danger onClick={deleteSelected}>删除</Button>
            </div>
          </div>
        ) : (
          // Global Settings
          <div className="properties-content">
            <div className="prop-section-title">全局</div>
            <div className="prop-row-spread">模板尺寸</div>
            <div className="prop-grid-2">
              <InputNumber 
                value={canvasWidth} 
                addonBefore="宽"
                addonAfter="mm"
                onChange={setCanvasWidth} 
              />
               <InputNumber 
                value={canvasHeight} 
                addonBefore="高"
                addonAfter="mm"
                onChange={setCanvasHeight} 
              />
            </div>

            <div className="prop-row-spread" style={{ marginTop: 20 }}>
              <span>打印设置</span>
              <a href="#">查看示例</a>
            </div>
             <div className="prop-grid-2">
              <InputNumber addonBefore="列数" defaultValue={1} />
              <InputNumber addonBefore="列距" defaultValue={0} />
              <InputNumber addonBefore="上边距" defaultValue={0} />
              <InputNumber addonBefore="左边距" defaultValue={0} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

