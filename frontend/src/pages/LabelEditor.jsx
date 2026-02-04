import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, InputNumber, Select, message, Radio, Divider, Tooltip, ColorPicker } from 'antd';
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

export default function LabelEditor() {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateName, setTemplateName] = useState('未命名');
  const [canvasWidth, setCanvasWidth] = useState(60);
  const [canvasHeight, setCanvasHeight] = useState(40);
  const [zoom, setZoom] = useState(200); // Initial zoom 200%
  const [activeSidebarItem, setActiveSidebarItem] = useState('params');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
            x: roundTo1Decimal(dragState.initialEl.x + dxMm),
            y: roundTo1Decimal(dragState.initialEl.y + dyMm)
          };
        }
        return el;
      }));
    } else if (dragState.isResizing && selectedElement) {
       setElements(prev => prev.map(el => {
        if (el.id === selectedElement) {
           const init = dragState.initialEl;
           let newX = init.x;
           let newY = init.y;
           let newW = init.width;
           let newH = init.height;

           if (dragState.resizeHandle.includes('e')) {
              newW = Math.max(1, init.width + dxMm);
           }
           if (dragState.resizeHandle.includes('s')) {
              newH = Math.max(1, init.height + dyMm);
           }
           if (dragState.resizeHandle.includes('w')) {
              const proposedW = init.width - dxMm;
              if (proposedW > 1) {
                  newX = init.x + dxMm;
                  newW = proposedW;
              }
           }
           if (dragState.resizeHandle.includes('n')) {
               const proposedH = init.height - dyMm;
               if (proposedH > 1) {
                   newY = init.y + dyMm;
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


  // Element Management
  const addElement = (type, partial = {}) => {
    const newElement = {
      id: Date.now(),
      type,
      x: 5,
      y: 5,
      width: type === 'text' ? 20 : 30, // Updated default width
      height: type === 'text' ? 2.8 : 30, // Updated default height
      rotation: 0,
      fontSize: 8,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none', // can be 'none', or string containing 'underline', 'line-through'
      textAlign: 'left',
      fontFamily: 'Arial',
      color: '#000000',
      text: type === 'text' ? 'New Text' : '',
      ...partial
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
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
    setElements(elements.filter(el => el.id !== selectedElement));
    setSelectedElement(null);
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
          {/* Collapse Button */}
          <div className="drawer-collapse" onClick={() => setIsSidebarOpen(false)}>
            收起 <LeftOutlined style={{ fontSize: 10 }} />
          </div>
        </div>
      )}

      {/* 3. Center Canvas Area */}
      <div className="center-area">
        <div className="center-header">
          <div className="header-left">
            <Button type="text" icon={<LeftOutlined />} />
          </div>
          <div className="header-title">
            {templateName} <EditOutlined style={{ fontSize: 12, marginLeft: 8, color: '#666' }} />
          </div>
          <div className="header-actions">
            <Button style={{ marginRight: 8 }}>取消</Button>
            <Button type="primary">保存</Button>
          </div>
        </div>

        <div className="canvas-wrapper-outer">
          {/* Top Ruler Placeholder */}
          <div className="ruler-top">
            {/* Simple visual mock */}
            {Array.from({ length: Math.ceil(canvasWidth / 10) + 1 }).map((_, i) => (
              <span key={i} style={{ left: `${i * 10 * (8 * zoom/100)}px` }} className="ruler-tick">{i * 10}</span>
            ))}
          </div>
          
          <div className="canvas-body-row">
             {/* Left Ruler Placeholder */}
            <div className="ruler-left">
               {Array.from({ length: Math.ceil(canvasHeight / 10) + 1 }).map((_, i) => (
                <span key={i} style={{ top: `${i * 10 * (8 * zoom/100)}px` }} className="ruler-tick">{i * 10}</span>
              ))}
            </div>
            
            <div className="canvas-viewport">
              <canvas 
                ref={canvasRef} 
                className="label-canvas"
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
            <div className="prop-section-title">参数</div>
            <div className="prop-grid-2">
              <InputNumber 
                addonBefore="X" 
                value={currentElement.x} 
                step={0.1}
                precision={1}
                onChange={v => updateSelected({ x: v })} 
              />
              <InputNumber 
                addonBefore="Y" 
                value={currentElement.y} 
                step={0.1}
                precision={1}
                onChange={v => updateSelected({ y: v })} 
              />
              <InputNumber 
                addonBefore="W" 
                value={currentElement.width} 
                step={0.1}
                precision={1}
                onChange={v => updateSelected({ width: v })} 
              />
              <InputNumber 
                addonBefore="H" 
                value={currentElement.height} 
                step={0.1}
                precision={1}
                onChange={v => updateSelected({ height: v })} 
              />
            </div>

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
             <div className="prop-toolbar-row">
               <Button block icon={<RotateRightOutlined />} onClick={() => updateSelected({ rotation: (currentElement.rotation + 90) % 360 })}></Button>
               <Button block icon={<RotateLeftOutlined />} onClick={() => updateSelected({ rotation: (currentElement.rotation - 90 + 360) % 360 })}></Button>
            </div>

             <div className="prop-toolbar-row">
               <Button block onClick={() => addElement(currentElement.type, currentElement)}>复制</Button>
               <Button block danger onClick={deleteSelected}>删除</Button>
            </div>

            <div className="prop-section-title" style={{ marginTop: 20 }}>内容</div>
            <TextArea 
              rows={4} 
              value={currentElement.text}
              onChange={e => updateSelected({ text: e.target.value })}
            />
            <div className="help-text">修改内容仅用于当前排版预览效果...</div>

          </div>
        ) : (
          // Global Settings
          <div className="properties-content">
            <div className="prop-section-title">全局</div>
            <div className="prop-label">模板尺寸 (单位: mm)</div>
            <div className="prop-grid-2">
              <InputNumber 
                value={canvasWidth} 
                addonAfter="W"
                onChange={setCanvasWidth} 
              />
               <InputNumber 
                value={canvasHeight} 
                addonAfter="H"
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
