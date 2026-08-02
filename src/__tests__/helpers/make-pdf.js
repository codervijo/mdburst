// Generate a small, real PDF exercising every construct the converter infers:
// heading sizes, wrapped body text, bullets, a two-column table, a monospaced
// code line, a link annotation, and a repeated footer.
//
// Written by hand (uncompressed content streams) so the fixture has no
// dependency on a PDF writer library.

// WinAnsi bullet (0x95). Written as a raw latin1 byte because the string
// escaper below would otherwise double-escape a backslash octal form.
const BULLET = String.fromCharCode(0x95);

const TEXT = (x, y, size, font, str) =>
  `BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${str.replace(/([()\\])/g, '\\$1')}) Tj ET`;

function pageContent(pageNumber) {
  const lines = [];
  if (pageNumber === 1) {
    lines.push(TEXT(72, 720, 24, 'F1', 'Quarterly Revenue Report'));
    lines.push(TEXT(72, 680, 16, 'F1', 'Regional performance'));
    lines.push(TEXT(72, 650, 11, 'F1', 'Revenue grew across all three regions in the period, with the'));
    lines.push(TEXT(72, 634, 11, 'F1', 'strongest contribution from the northern territory.'));
    lines.push(TEXT(72, 600, 11, 'F1', `${BULLET} North: ahead of plan`));
    lines.push(TEXT(72, 584, 11, 'F1', `${BULLET} Central: on plan`));
    lines.push(TEXT(72, 568, 11, 'F1', `${BULLET} South: behind plan`));
    // Two-column grid -> table
    lines.push(TEXT(72, 530, 11, 'F2', 'Region'));
    lines.push(TEXT(300, 530, 11, 'F2', 'Revenue'));
    lines.push(TEXT(72, 512, 11, 'F1', 'North'));
    lines.push(TEXT(300, 512, 11, 'F1', '412,000'));
    lines.push(TEXT(72, 494, 11, 'F1', 'Central'));
    lines.push(TEXT(300, 494, 11, 'F1', '388,000'));
    // Monospaced -> fenced code
    lines.push(TEXT(72, 450, 10, 'F3', 'total = north + central + south'));
    // Link target text
    lines.push(TEXT(72, 410, 11, 'F1', 'Full methodology'));
    // Hyphenated across lines
    lines.push(TEXT(72, 380, 11, 'F1', 'The report was prepared by the inter-'));
    lines.push(TEXT(72, 364, 11, 'F1', 'national finance team.'));
  } else {
    lines.push(TEXT(72, 720, 16, 'F1', 'Appendix'));
    lines.push(TEXT(72, 690, 11, 'F1', 'Supporting detail follows in the attached workbook.'));
  }
  // Repeated running footer + page number, both should be stripped.
  lines.push(TEXT(72, 40, 9, 'F1', 'ACME Confidential Report'));
  lines.push(TEXT(300, 24, 9, 'F1', `Page ${pageNumber} of 3`));
  return lines.join('\n');
}

/**
 * Build the fixture PDF and return it as a Uint8Array.
 * @returns {Uint8Array}
 */
export function makeFixturePdf() {
const objects = [];

// Reserve numbers in a fixed order so references are known up front.
const catalogNum = 1;
const pagesNum = 2;
const pageNums = [3, 4, 5];
const contentNums = [6, 7, 8];
const fontHelv = 9;
const fontHelvBold = 10;
const fontCourier = 11;
const annotNum = 12;

objects[catalogNum - 1] = `<< /Type /Catalog /Pages ${pagesNum} 0 R >>`;
objects[pagesNum - 1] =
  `<< /Type /Pages /Kids [${pageNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageNums.length} >>`;

pageNums.forEach((num, index) => {
  const annots = index === 0 ? ` /Annots [${annotNum} 0 R]` : '';
  objects[num - 1] =
    `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 612 792] ` +
    `/Resources << /Font << /F1 ${fontHelv} 0 R /F2 ${fontHelvBold} 0 R /F3 ${fontCourier} 0 R >> >> ` +
    `/Contents ${contentNums[index]} 0 R${annots} >>`;
});

contentNums.forEach((num, index) => {
  const stream = pageContent(index + 1);
  objects[num - 1] = `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`;
});

objects[fontHelv - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
objects[fontHelvBold - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
objects[fontCourier - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
objects[annotNum - 1] =
  '<< /Type /Annot /Subtype /Link /Rect [72 405 170 422] /Border [0 0 0] ' +
  '/A << /Type /Action /S /URI /URI (https://example.com/methodology) >> >>';

// Assemble with a correct xref table.
let pdf = '%PDF-1.4\n';
const offsets = [];
objects.forEach((body, index) => {
  offsets[index] = Buffer.byteLength(pdf);
  pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefOffset = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += '0000000000 65535 f \n';
for (const offset of offsets) {
  pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogNum} 0 R >>\n`;
pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  // latin1 keeps the byte offsets in the xref table accurate.
  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}

/** Number of pages the fixture contains. */
export const FIXTURE_PAGE_COUNT = 3;
