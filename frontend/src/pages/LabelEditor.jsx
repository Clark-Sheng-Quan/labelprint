import React, { useState, useRef } from 'react';
import { Button, Input, ColorPicker, Select, message } from 'antd';
import { SaveOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import './LabelEditor.css';

export default function LabelEditor() {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [templateName, setTemplateName] = useState('未命名标签');
  const [canvasWidth, setCanvasWidth] = useState(100);
  const [canvasHeight, setCanvasHeight] = useState(100);
  const [dpi, setDpi] = useState(203);

  const addTextElement = () => {
    const newElement = {
      id: Date.now(),
      type: 'text',
      text: '新文本',
      x: 10,
      y: 10,
      fontSize: 12,
      fontWeight: 'normal',
      color: '#000000',
      width: 80,
      height: 20
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const addBarcodeElement = () => {
    const newElement = {
      id: Date.now(),
      type: 'barcode',
      value: '123456789',
      x: 10,
      y: 40,
      width: 80,
      height: 30,
      barcodeType: 'code128'
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const addQRCodeElement = () => {
    const newElement = {
      id: Date.now(),
      type: 'qrcode',
      value: 'https://example.com',
      x: 10,
      y: 70,
      size: 30
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const updateElement = (id, updates) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedElement(null);
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const mmToPx = dpi / 25.4;
    const pxWidth = canvasWidth * mmToPx;
    const pxHeight = canvasHeight * mmToPx;

    canvas.width = pxWidth;
    canvas.height = pxHeight;

    // 清空画布
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pxWidth, pxHeight);

    // 绘制边框
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, pxWidth, pxHeight);

    // 绘制元素
    elements.forEach(el => {
      const x = el.x * mmToPx;
      const y = el.y * mmToPx;

      if (el.type === 'text') {
        ctx.fillStyle = el.color || '#000000';
        ctx.font = `${el.fontWeight === 'bold' ? 'bold ' : ''}${el.fontSize * mmToPx}px Arial`;
        ctx.fillText(el.text, x, y + (el.fontSize * mmToPx));

        // 绘制选中框
        if (selectedElement === el.id) {
          ctx.strokeStyle = '#0084ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 2, y - 2, el.width * mmToPx + 4, el.height * mmToPx + 4);
        }
      } else if (el.type === 'barcode') {
        // 条形码占位符
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, el.width * mmToPx, el.height * mmToPx);
        ctx.fillStyle = '#666666';
        ctx.font = '10px Arial';
        ctx.fillText(el.barcodeType, x + 5, y + (el.height * mmToPx / 2));

        if (selectedElement === el.id) {
          ctx.strokeStyle = '#0084ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 2, y - 2, el.width * mmToPx + 4, el.height * mmToPx + 4);
        }
      } else if (el.type === 'qrcode') {
        // 二维码占位符
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, el.size * mmToPx, el.size * mmToPx);
        ctx.fillStyle = '#666666';
        ctx.font = '10px Arial';
        ctx.fillText('QR', x + 5, y + (el.size * mmToPx / 2));

        if (selectedElement === el.id) {
          ctx.strokeStyle = '#0084ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 2, y - 2, el.size * mmToPx + 4, el.size * mmToPx + 4);
        }
      }
    });
  };

  React.useEffect(() => {
    drawCanvas();
  }, [elements, selectedElement, dpi, canvasWidth, canvasHeight]);

  const currentElement = elements.find(el => el.id === selectedElement);

  return (
    <div className="label-editor">
      <header className="editor-header">
        <div className="header-left">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            style={{ width: 200 }}
            placeholder="标签名称"
          />
        </div>
        <div className="header-right">
          <Button type="primary" icon={<SaveOutlined />}>保存</Button>
        </div>
      </header>

      <div className="editor-body">
        {/* 左侧工具栏 */}
        <div className="toolbar-left">
          <div className="tool-group">
            <h4>添加元素</h4>
            <Button block onClick={addTextElement} style={{ marginBottom: '8px' }}>
              + 文字
            </Button>
            <Button block onClick={addBarcodeElement} style={{ marginBottom: '8px' }}>
              + 条形码
            </Button>
            <Button block onClick={addQRCodeElement}>
              + 二维码
            </Button>
          </div>

          {currentElement && (
            <div className="tool-group">
              <h4>元素属性</h4>
              
              {currentElement.type === 'text' && (
                <>
                  <label>文本</label>
                  <Input
                    value={currentElement.text}
                    onChange={(e) => updateElement(currentElement.id, { text: e.target.value })}
                    size="small"
                  />
                  <label style={{ marginTop: '8px' }}>字号</label>
                  <Input
                    type="number"
                    value={currentElement.fontSize}
                    onChange={(e) => updateElement(currentElement.id, { fontSize: parseInt(e.target.value) })}
                    size="small"
                  />
                  <label style={{ marginTop: '8px' }}>颜色</label>
                  <ColorPicker
                    value={currentElement.color}
                    onChange={(color) => updateElement(currentElement.id, { color: color.toHexString() })}
                  />
                </>
              )}

              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => deleteElement(currentElement.id)}
                style={{ marginTop: '16px', width: '100%' }}
              >
                删除
              </Button>
            </div>
          )}
        </div>

        {/* 中央画布 */}
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            className="label-canvas"
            onClick={(e) => {
              // 点击画布选中元素逻辑
              const rect = canvasRef.current.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              // 简化实现，实际需要检测元素边界
            }}
          />
        </div>

        {/* 右侧属性栏 */}
        <div className="sidebar-right">
          <div className="property-group">
            <h4>标签尺寸</h4>
            <label>宽度 (mm)</label>
            <Input
              type="number"
              value={canvasWidth}
              onChange={(e) => setCanvasWidth(parseInt(e.target.value))}
              size="small"
            />
            <label style={{ marginTop: '8px' }}>高度 (mm)</label>
            <Input
              type="number"
              value={canvasHeight}
              onChange={(e) => setCanvasHeight(parseInt(e.target.value))}
              size="small"
            />
            <label style={{ marginTop: '8px' }}>DPI</label>
            <Select
              value={dpi}
              onChange={setDpi}
              options={[
                { label: '203 DPI', value: 203 },
                { label: '300 DPI', value: 300 }
              ]}
            />
          </div>

          <div className="property-group">
            <h4>元素列表</h4>
            {elements.map(el => (
              <div
                key={el.id}
                className={`element-item ${selectedElement === el.id ? 'active' : ''}`}
                onClick={() => setSelectedElement(el.id)}
              >
                <span>{el.type === 'text' ? '📝' : el.type === 'barcode' ? '📊' : '📱'}</span>
                <span>{el.type === 'text' ? el.text : el.type === 'barcode' ? '条形码' : '二维码'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
