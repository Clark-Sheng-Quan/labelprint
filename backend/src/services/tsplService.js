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

function renderLine(el) {
  const x = dots(el.x);
  const y = dots(el.y);
  const w = dots(el.width);
  const strokeDots = Math.max(1, dots(el.strokeWidth || 1));

  if (el.lineStyle === 'dashed' || el.lineStyle === 'dotted') {
    const segLen = el.lineStyle === 'dashed' ? dots(3) : dots(1.5);
    const gapLen = el.lineStyle === 'dashed' ? dots(3) : dots(1.5);
    const lines = [];
    let pos = 0;
    while (pos < w) {
      const len = Math.min(segLen, w - pos);
      lines.push(`BAR ${x + pos},${y},${len},${strokeDots}`);
      pos += segLen + gapLen;
    }
    return lines.join(CRLF);
  }

  return `BAR ${x},${y},${w},${strokeDots}`;
}

function renderQrcode(el, orderData) {
  const x = dots(el.x);
  const y = dots(el.y);
  const cellwidth = Math.max(1, Math.min(10, Math.round(el.width * 8 / 25)));
  const content = replacePlaceholders(el.qrcodeContent || '', orderData).replace(/"/g, '\\"');
  return `QRCODE ${x},${y},M,${cellwidth},A,0,"${content}"`;
}

function renderBarcode(el, orderData) {
  const x = dots(el.x);
  const y = dots(el.y);
  const h = dots(el.height);
  const content = replacePlaceholders(el.text || '', orderData).replace(/"/g, '\\"');
  return `BARCODE ${x},${y},"128",${h},1,0,2,4,"${content}"`;
}

function renderElement(el, orderData) {
  switch (el.type) {
    case 'text':    return renderText(el, orderData);
    case 'line':    return renderLine(el);
    case 'qrcode':  return renderQrcode(el, orderData);
    case 'barcode': return renderBarcode(el, orderData);
    case 'image':
      console.warn(`[tsplService] Image element id=${el.id} skipped (BITMAP not supported)`);
      return null;
    default: return null;
  }
}

export function generateTSPL(template, orderData = {}) {
  const { width, height, templateConfig } = template;
  const elements = templateConfig?.elements || [];

  const lines = [
    `SIZE ${width} mm,${height} mm`,
    `GAP 2 mm,0 mm`,
    `CODEPAGE UTF-8`,
    `CLS`,
    `DIRECTION 1`,
  ];

  for (const el of elements) {
    const cmd = renderElement(el, orderData);
    if (cmd) lines.push(cmd);
  }

  lines.push('PRINT 1,1');

  return lines.join(CRLF) + CRLF;
}
