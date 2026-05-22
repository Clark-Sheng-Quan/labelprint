const CRLF = '\r\n';

const dots = (mm) => Math.round(mm * 8);

// TSS fonts support Chinese + English
const FONT_CHAR_WIDTH  = { 'TSS16.BF2': 16, 'TSS24.BF2': 24, 'TSS32.BF2': 32 };
const FONT_CHAR_HEIGHT = { 'TSS16.BF2': 16, 'TSS24.BF2': 24, 'TSS32.BF2': 32 };

// Pick the font + multiplier closest to the target dot size
// editor fontSize * 2 ≈ target dots height (at 200DPI, scale=8)
function selectFontAndMul(fontSize) {
  const targetDots = Math.round((fontSize || 8) * 2);
  const bases = [
    { font: 'TSS16.BF2', baseDots: 16 },
    { font: 'TSS24.BF2', baseDots: 24 },
    { font: 'TSS32.BF2', baseDots: 32 },
  ];
  let best = { font: 'TSS16.BF2', mul: 1, diff: Infinity };
  for (const { font, baseDots } of bases) {
    const mul = Math.max(1, Math.min(10, Math.round(targetDots / baseDots)));
    const diff = Math.abs(baseDots * mul - targetDots);
    if (diff < best.diff) best = { font, mul, diff };
  }
  return best;
}

function replacePlaceholders(text, orderData) {
  return text.replace(/#\{(\w+)\}/g, (_, key) => orderData[key] ?? '');
}

function wrapText(text, font, mul, maxWidthDots) {
  const charW = FONT_CHAR_WIDTH[font] * mul;
  const maxChars = Math.floor(maxWidthDots / charW);
  if (maxChars <= 0) return [text];

  const lines = [];
  for (const segment of text.split('\n')) {
    if (segment.length <= maxChars) {
      lines.push(segment);
      continue;
    }
    const words = segment.split(' ');
    let current = '';
    for (const word of words) {
      if (current.length === 0) {
        current = word;
      } else if (current.length + 1 + word.length <= maxChars) {
        current += ' ' + word;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current.length > 0) lines.push(current);
  }
  return lines;
}

function renderText(el, orderData) {
  const x = dots(el.x);
  const y = dots(el.y);
  const maxW = dots(el.width);
  const { font, mul } = selectFontAndMul(el.fontSize);
  const rotation = el.rotation ? Math.round(el.rotation / 90) * 90 : 0;
  const raw = replacePlaceholders(el.text || '', orderData);
  const wrappedLines = wrapText(raw, font, mul, maxW);
  const lineH = FONT_CHAR_HEIGHT[font] * mul;

  return wrappedLines
    .map((line, i) => `TEXT ${x},${y + i * lineH},"${font}",${rotation},${mul},${mul},"${line.replace(/"/g, '\\"')}"`)
    .join(CRLF);
}

function renderLine(el, tplW, tplH) {
  const x = dots(el.x);
  const y = dots(el.y);
  const rotation = el.rotation ? Math.round(el.rotation / 90) * 90 : 0;
  const isVertical = rotation === 90 || rotation === 270;
  const strokeDots = Math.max(1, dots(el.strokeWidth || 1));

  // For vertical lines, swap width↔height so BAR draws top-to-bottom
  let lineLen = isVertical
    ? Math.min(dots(el.width), tplH - y)
    : Math.min(dots(el.width), tplW - x);
  const barW = isVertical ? strokeDots : lineLen;
  const barH = isVertical ? lineLen  : strokeDots;

  if (el.lineStyle === 'dashed' || el.lineStyle === 'dotted') {
    const segLen = el.lineStyle === 'dashed' ? dots(3) : dots(1.5);
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
    `CODEPAGE UTF-8`,
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
