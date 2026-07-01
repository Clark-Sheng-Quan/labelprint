const CRLF = '\r\n';

const dots = (mm) => Math.round(mm * 8);

function replacePlaceholders(text, orderData) {
  return text.replace(/#\{(\w+)\}/g, (match, key) => orderData[key] || match);
}

function isCJK(char) {
  const code = char.charCodeAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3000 && code <= 0x303F) ||
         (code >= 0xFF00 && code <= 0xFFEF);
}

function wrapBitmapText(text, fontSizeDots, maxWidthDots) {
  const lines = [];
  for (const segment of text.split('\n')) {
    if (segment.length === 0) { lines.push(''); continue; }
    let current = '';
    let currentWidth = 0;
    for (const char of segment) {
      const charW = isCJK(char) ? fontSizeDots : fontSizeDots * 0.55;
      if (currentWidth + charW > maxWidthDots && current.length > 0) {
        lines.push(current);
        current = char;
        currentWidth = charW;
      } else {
        current += char;
        currentWidth += charW;
      }
    }
    if (current.length > 0) lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

// BITMAP_TEXT is a custom command handled by the Android LabelPrintHelper:
// it renders text as a bitmap on-device (supports Unicode/CJK) then sends as BITMAP.
// Format: BITMAP_TEXT x,y,fontSizeDots,"text"
// fontSizeDots = el.fontSize * 2  (editor fontSize unit → dots at 200DPI)
function renderText(el, orderData) {
  const x = dots(el.x);
  const y = dots(el.y);
  const fontSizeDots = Math.round((el.fontSize || 8) * 2);
  const maxW = dots(el.width);
  const raw = replacePlaceholders(el.text || '', orderData);
  const lines = wrapBitmapText(raw, fontSizeDots, maxW);
  const lineH = Math.round(fontSizeDots * 1.2);

  return lines
    .map((line, i) => `BITMAP_TEXT ${x},${y + i * lineH},${fontSizeDots},"${line.replace(/"/g, '\\"')}"`)
    .join(CRLF);
}

function renderLine(el, tplW, tplH) {
  const x = dots(el.x);
  const y = dots(el.y);
  const rotation = el.rotation ? Math.round(el.rotation / 90) * 90 : 0;
  const isVertical = rotation === 90 || rotation === 270;
  // strokeWidth is already in dots, no conversion needed
  const strokeDots = Math.max(1, el.strokeWidth || 2);

  // For vertical lines, swap width↔height so BAR draws top-to-bottom
  let lineLen = isVertical
    ? Math.min(dots(el.width), tplH - y)
    : Math.min(dots(el.width), tplW - x);
  const barW = isVertical ? strokeDots : lineLen;
  const barH = isVertical ? lineLen  : strokeDots;

  if (el.lineStyle === 'dashed' || el.lineStyle === 'dotted') {
    // TSPL dashed: 2 dots segment, 2 dots gap
    // TSPL dotted: 1 dot segment, 1 dot gap
    const segLen = el.lineStyle === 'dashed' ? 2 * 8 : 1 * 8;  // Convert to dots (8 dots per mm)
    const gapLen = segLen;
    const cmds = [];
    let pos = 0;
    while (pos < lineLen) {
      const seg = Math.min(segLen, lineLen - pos);
      if (isVertical) {
        cmds.push(`BAR ${x},${y + pos},${strokeDots},${seg}`);
      } else {
        cmds.push(`BAR ${x + pos},${y},${seg},${strokeDots}`);
      }
      pos += segLen + gapLen;
    }
    return cmds.join(CRLF);
  }

  return `BAR ${x},${y},${barW},${barH}`;
}

function renderQrcode(el, orderData, tplW, tplH) {
  const x = Math.min(dots(el.x), tplW - 1);
  const y = Math.min(dots(el.y), tplH - 1);
  const cellwidth = Math.max(1, Math.min(10, Math.round(el.width * 8 / 25)));
  const content = replacePlaceholders(el.qrcodeContent || '', orderData).replace(/"/g, '\\"');
  return `QRCODE ${x},${y},M,${cellwidth},A,0,"${content}"`;
}

function renderBarcode(el, orderData, tplW, tplH) {
  const x = Math.min(dots(el.x), tplW - 1);
  const y = Math.min(dots(el.y), tplH - 1);
  const h = Math.min(dots(el.height), tplH - y);
  const content = replacePlaceholders(el.text || '', orderData).replace(/"/g, '\\"');
  return `BARCODE ${x},${y},"128",${h},1,0,2,4,"${content}"`;
}

function renderElement(el, orderData, tplW, tplH) {
  switch (el.type) {
    case 'text':    return renderText(el, orderData);
    case 'line':    return renderLine(el, tplW, tplH);
    case 'qrcode':  return renderQrcode(el, orderData, tplW, tplH);
    case 'barcode': return renderBarcode(el, orderData, tplW, tplH);
    case 'image':
      console.warn(`[tsplService] Image element id=${el.id} skipped (BITMAP not supported)`);
      return null;
    default: return null;
  }
}

export function generateTSPL(template, orderData = {}) {
  const { width, height, templateConfig } = template;
  const tplW = dots(width);
  const tplH = dots(height);
  const elements = templateConfig?.elements || [];

  const lines = [
    `SIZE ${width} mm,${height} mm`,
    `GAP 2 mm,0 mm`,
    `CLS`,
    `DIRECTION 1`,
  ];

  for (const el of elements) {
    const cmd = renderElement(el, orderData, tplW, tplH);
    if (cmd) lines.push(cmd);
  }

  lines.push('PRINT 1,1');

  return lines.join(CRLF) + CRLF;
}
