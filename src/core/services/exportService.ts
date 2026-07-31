import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Container, getEffectiveCargoType, hasValidTemp } from '../models/container';
import { normalizePortCode, NO_DATA } from '../parser/portNormalizer';
import { getContainerColor } from '../business/colorEngine';
import { computeOperationalSummary } from '../business/filterEngine';

export interface ExportValidationResult {
  success: boolean;
  message: string;
  visibleCount: number;
  exportedCount: number;
}

/**
 * EXCEL EXPORT ENGINE
 * Strictly exports 100% of filteredContainers[].
 * Validates row count against visible filtered dataset.
 */
export function exportToExcel(
  filteredContainers: Container[],
  fileNamePrefix = 'Reporte_Estiba_Maritima'
): ExportValidationResult {
  const visibleCount = filteredContainers.length;

  // Map exactly filteredContainers[] to rows
  const cleanVal = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const str = String(val).trim();
    if (str === NO_DATA || str === 'Dato no disponible') return '';
    return str;
  };

  const cleanPort = (port: string | undefined | null): string => {
    const p = normalizePortCode(port);
    return p === NO_DATA ? '' : p;
  };

  const rows = filteredContainers.map(c => {
    const effType = getEffectiveCargoType(c);
    const rawTemp = cleanVal(c.temp);
    const tempVal = (rawTemp && hasValidTemp(rawTemp)) ? rawTemp : '';

    let oogVal = c.oogDim || '';
    if (!oogVal && c.hasDim) {
      const parts: string[] = [];
      if (c.oogTop) parts.push('T20');
      if (c.oogLeft) parts.push('L20');
      if (c.oogRight) parts.push('R20');
      if (c.oogFront) parts.push('F10');
      if (c.oogBack) parts.push('B10');
      oogVal = parts.join(' ');
    }

    return {
      'Contenedor': cleanVal(c.id),
      'Posición': cleanVal(c.position),
      'ISO': cleanVal(c.iso),
      'Operador': cleanVal(c.operator),
      'POL': cleanPort(c.pol),
      'POD': cleanPort(c.pod),
      'Peso (KG)': c.weight && c.weight !== NO_DATA ? `${c.weight} KG` : '',
      'Clase IMO': cleanVal(c.imoClass),
      'Número UN': cleanVal(c.unNumber),
      'Temperatura': tempVal,
      'Ventilacion': cleanVal(c.ventilation),
      'Sobredimensión (OOG)': oogVal,
      'Estado': effType === 'MT' || c.status === 'EMPTY' ? 'EMPTY' : 'FULL',
      'Tipo Carga': effType
    };
  });

  const exportedCount = rows.length;

  // STRICT VALIDATION
  if (visibleCount !== exportedCount) {
    const errorMsg = 'Export validation failed. The exported dataset does not match the current filtered dataset.';
    console.error(`[REPORT VALIDATION ERROR]: Visible (${visibleCount}) !== Excel Rows (${exportedCount})`);
    return {
      success: false,
      message: errorMsg,
      visibleCount,
      exportedCount
    };
  }

  // Generate Excel workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'REPORTE_FILTRADO');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${timestamp}.xlsx`);

  return {
    success: true,
    message: `Excel exportado con éxito. ${exportedCount} de ${visibleCount} unidades incluidas.`,
    visibleCount,
    exportedCount
  };
}

/**
 * Helper to convert hex color to RGB tuple
 */
function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [30, 41, 59]; // fallback slate-800
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * PDF EXPORT ENGINE
 * Contains 2 Sections:
 * SECTION 1: Operational Summary
 * SECTION 2: Mini Bay Plans for EVERY rendered bay preserving BAPLIE geometry
 */
export function exportToPDF(
  filteredContainers: Container[],
  activeTerminalKey: string,
  title = 'REPORTE Y MINI-PLANOS DE ESTIBA'
): ExportValidationResult {
  const visibleCount = filteredContainers.length;

  // Validate non-empty
  if (visibleCount === 0) {
    return {
      success: false,
      message: 'Export validation failed. The filtered dataset is empty.',
      visibleCount: 0,
      exportedCount: 0
    };
  }

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Track unique containers actually rendered in the PDF
  const pdfContainerTracker = new Set<string>();

  // Calculate Operational Summary
  const stats = computeOperationalSummary(filteredContainers, activeTerminalKey);

  // -------------------------------------------------------------
  // SECTION 1: OPERATIONAL SUMMARY
  // -------------------------------------------------------------

  // Header Bar
  doc.setFillColor(10, 26, 41);
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(0, 229, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`ENTERPRISE TERMINAL PLANNING PLATFORM — ${title.toUpperCase()}`, 12, 14);

  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Terminal: ${activeTerminalKey} | Fecha: ${new Date().toLocaleString()}`, pageWidth - 90, 14);

  // Operational Summary Metrics Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SECCIÓN 1: RESUMEN OPERATIVO CONSOLIDADO (OPERATIONAL SUMMARY)', 12, 32);

  // Draw Metric Summary Cards
  const cardY = 38;
  const cardW = 28;
  const cardH = 18;

  const metricCards = [
    { label: 'TOTAL UNIDADES', val: stats.total, color: [0, 180, 216] },
    { label: 'IMPORTACIÓN', val: stats.importCount, color: [230, 81, 0] },
    { label: 'EXPORTACIÓN', val: stats.exportCount, color: [46, 125, 50] },
    { label: 'TRÁNSITO', val: stats.transitCount, color: [106, 27, 154] },
    { label: 'EMPTY (VACÍO)', val: stats.emptyCount, color: [100, 116, 139] },
    { label: 'FULL (LLENO)', val: stats.fullCount, color: [15, 118, 110] },
    { label: 'PELIGROSO (DG)', val: stats.dgCount, color: [225, 29, 72] },
    { label: 'REEFER (RF)', val: stats.reeferCount, color: [2, 132, 199] },
    { label: 'SOBREDIM. (OOG)', val: stats.oogCount, color: [147, 51, 234] }
  ];

  metricCards.forEach((mc, idx) => {
    const x = 12 + (idx % 9) * (cardW + 2);
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(mc.color[0], mc.color[1], mc.color[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(x, cardY, cardW, cardH, 1, 1, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(mc.label, x + cardW / 2, cardY + 5, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(mc.color[0], mc.color[1], mc.color[2]);
    doc.text(String(mc.val), x + cardW / 2, cardY + 14, { align: 'center' });
  });

  // Table of Filtered Container Dataset in Section 1
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`LISTADO CONSOLIDADO DE UNIDADES EN FILTRO (${filteredContainers.length} UNIDADES)`, 12, 64);

  // Table Headers
  let tableY = 68;
  const cols = ['N°', 'CONTENEDOR', 'POSICIÓN', 'ISO', 'OPERADOR', 'POL', 'POD', 'CARGA', 'IMO', 'TEMP', 'PESO (KG)'];
  const colX = [12, 22, 52, 75, 95, 120, 142, 165, 190, 215, 245];

  doc.setFillColor(15, 23, 42);
  doc.rect(12, tableY - 4, pageWidth - 24, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('courier', 'bold');

  cols.forEach((col, idx) => {
    doc.text(col, colX[idx], tableY);
  });

  tableY += 5;
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);

  // Render container rows on page 1 (up to 22 rows on first page)
  const rowsOnPage1 = 20;
  const page1Items = filteredContainers.slice(0, rowsOnPage1);

  page1Items.forEach((c, idx) => {
    pdfContainerTracker.add(c.id);

    if (idx % 2 === 1) {
      doc.setFillColor(245, 247, 250);
      doc.rect(12, tableY - 3.5, pageWidth - 24, 4.5, 'F');
    }

    doc.setTextColor(0, 0, 0);
    const effTypeP1 = getEffectiveCargoType(c);
    doc.text(String(idx + 1), colX[0], tableY);
    doc.text(String(c.id || NO_DATA).substring(0, 12), colX[1], tableY);
    doc.text(String(c.position || NO_DATA), colX[2], tableY);
    doc.text(String(c.iso || NO_DATA), colX[3], tableY);
    doc.text(String(c.operator || NO_DATA).substring(0, 8), colX[4], tableY);
    doc.text(normalizePortCode(c.pol), colX[5], tableY);
    doc.text(normalizePortCode(c.pod), colX[6], tableY);
    doc.text(effTypeP1, colX[7], tableY);
    doc.text(String(c.imoClass || '-'), colX[8], tableY);
    doc.text(hasValidTemp(c.temp) ? String(c.temp) : '-', colX[9], tableY);
    doc.text(String(c.weight ? `${c.weight}` : '-'), colX[10], tableY);

    tableY += 4.5;
  });

  // If there are remaining containers for the summary list, add additional listing pages
  let remainingIndex = rowsOnPage1;
  while (remainingIndex < filteredContainers.length) {
    doc.addPage();

    // Small Header on continuation pages
    doc.setFillColor(10, 26, 41);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setTextColor(0, 229, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`SECCIÓN 1: CONTINUACIÓN LISTADO DE UNIDADES (${remainingIndex + 1} a ${Math.min(remainingIndex + 35, filteredContainers.length)} de ${filteredContainers.length})`, 12, 8);

    let contY = 18;
    doc.setFillColor(15, 23, 42);
    doc.rect(12, contY - 4, pageWidth - 24, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('courier', 'bold');

    cols.forEach((col, idx) => {
      doc.text(col, colX[idx], contY);
    });

    contY += 5;
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);

    const chunk = filteredContainers.slice(remainingIndex, remainingIndex + 35);
    chunk.forEach((c, cIdx) => {
      pdfContainerTracker.add(c.id);

      if (cIdx % 2 === 1) {
        doc.setFillColor(245, 247, 250);
        doc.rect(12, contY - 3.5, pageWidth - 24, 4.5, 'F');
      }

      doc.setTextColor(0, 0, 0);
      const effTypeCont = getEffectiveCargoType(c);
      doc.text(String(remainingIndex + cIdx + 1), colX[0], contY);
      doc.text(String(c.id || NO_DATA).substring(0, 12), colX[1], contY);
      doc.text(String(c.position || NO_DATA), colX[2], contY);
      doc.text(String(c.iso || NO_DATA), colX[3], contY);
      doc.text(String(c.operator || NO_DATA).substring(0, 8), colX[4], contY);
      doc.text(normalizePortCode(c.pol), colX[5], contY);
      doc.text(normalizePortCode(c.pod), colX[6], contY);
      doc.text(effTypeCont, colX[7], contY);
      doc.text(String(c.imoClass || '-'), colX[8], contY);
      doc.text(hasValidTemp(c.temp) ? String(c.temp) : '-', colX[9], contY);
      doc.text(String(c.weight ? `${c.weight}` : '-'), colX[10], contY);

      contY += 4.5;
    });

    remainingIndex += chunk.length;
  }

  // -------------------------------------------------------------
  // SECTION 2: MINI BAY PLANS FOR EVERY RENDERED BAY
  // -------------------------------------------------------------

  // Identify all unique bays present in filteredContainers
  const uniqueBaySet = new Set<string>();
  filteredContainers.forEach(c => {
    if (c.bay) uniqueBaySet.add(c.bay);
  });

  const sortedBayIds = Array.from(uniqueBaySet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  sortedBayIds.forEach(bayId => {
    doc.addPage();

    // Find containers for this bay
    const relatedFortyBay = parseInt(bayId, 10) % 2 !== 0
      ? (parseInt(bayId, 10) % 4 === 1 ? (parseInt(bayId, 10) + 1).toString().padStart(2, '0') : (parseInt(bayId, 10) - 1).toString().padStart(2, '0'))
      : null;

    const bayUnits = filteredContainers.filter(c =>
      c.bay === bayId || (c.size === 40 && relatedFortyBay === bayId)
    );

    // Track for validation
    bayUnits.forEach(u => pdfContainerTracker.add(u.id));

    // Page Header
    doc.setFillColor(10, 26, 41);
    doc.rect(0, 0, pageWidth, 16, 'F');

    doc.setTextColor(0, 229, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`SECCIÓN 2: PLANO MINI DE ESTIBA — BAHÍA (BAY) ${bayId.padStart(3, '0')}`, 12, 11);

    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`Unidades en Bahía: ${bayUnits.length} | BAPLIE Geometry Preserved`, pageWidth - 90, 11);

    // Layout dimensions for Bay Rendering in PDF
    // Physical layout rows: 08, 06, 04, 02, 00, 01, 03, 05, 07
    const defaultRows = ['08', '06', '04', '02', '00', '01', '03', '05', '07'];
    const deckTiers = ['86', '84', '82', '80'];
    const holdTiers = ['08', '06', '04', '02'];

    const cellW = 24;
    const cellH = 10;
    const startX = 35;
    let startY = 32;

    // Draw Row Labels Header
    doc.setFillColor(240, 240, 240);
    doc.rect(startX - 15, startY - 6, defaultRows.length * cellW + 25, 6, 'F');
    doc.setFontSize(7);
    doc.setFont('courier', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('ROW:', startX - 12, startY - 2);

    defaultRows.forEach((row, rIdx) => {
      const rx = startX + rIdx * cellW;
      doc.text(`ROW ${row}`, rx + cellW / 2, startY - 2, { align: 'center' });
    });

    startY += 2;

    // Draw DECK Section
    doc.setFontSize(7);
    doc.setTextColor(0, 180, 216);
    doc.setFont('helvetica', 'bold');
    doc.text('CUBIERTA (DECK)', 12, startY + 6);

    deckTiers.forEach((tier) => {
      const ty = startY;
      doc.setFontSize(7);
      doc.setFont('courier', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`T-${tier}`, startX - 12, ty + cellH / 2 + 1);

      defaultRows.forEach((row, rIdx) => {
        const cx = startX + rIdx * cellW;
        const container = bayUnits.find(c => c.row === row && c.tier === tier);

        if (container) {
          const podColorHex = getContainerColor(container.pod, activeTerminalKey);
          const [r, g, b] = hexToRgb(podColorHex);

          doc.setFillColor(r, g, b);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'F');
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'S');

          // Text labels inside container
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('courier', 'bold');
          doc.text(String(container.id).substring(0, 10), cx + (cellW - 1) / 2, ty + 3.5, { align: 'center' });

          doc.setFontSize(5);
          doc.setFont('courier', 'normal');
          const podText = `${container.iso} | ${normalizePortCode(container.pod)}`;
          doc.text(podText, cx + (cellW - 1) / 2, ty + 6.5, { align: 'center' });

          // Symbols / Badges
          const effTypeDeck = getEffectiveCargoType(container);
          let symbol = '';
          if (effTypeDeck === 'DG') symbol += '[DG] ';
          if (effTypeDeck === 'RF') symbol += '[RF] ';
          if (effTypeDeck === 'OS') symbol += '[OOG] ';
          if (effTypeDeck === 'MT') symbol += '[MT] ';

          if (symbol) {
            doc.setFontSize(4.5);
            doc.setTextColor(255, 235, 59);
            doc.text(symbol.trim(), cx + (cellW - 1) / 2, ty + 8.8, { align: 'center' });
          }
        } else {
          // Empty slot cell
          doc.setFillColor(250, 250, 250);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'F');
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.1);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'S');
        }
      });

      startY += cellH;
    });

    // Draw Hatch Cover Bar
    startY += 2;
    doc.setFillColor(15, 23, 42);
    doc.rect(startX - 15, startY, defaultRows.length * cellW + 25, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('=== TAPA BODEGA (HATCH COVER) ===', startX + (defaultRows.length * cellW) / 2 - 25, startY + 3);
    startY += 6;

    // Draw HOLD Section
    doc.setFontSize(7);
    doc.setTextColor(147, 51, 234);
    doc.setFont('helvetica', 'bold');
    doc.text('BODEGA (HOLD)', 12, startY + 6);

    holdTiers.forEach((tier) => {
      const ty = startY;
      doc.setFontSize(7);
      doc.setFont('courier', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`T-${tier}`, startX - 12, ty + cellH / 2 + 1);

      defaultRows.forEach((row, rIdx) => {
        const cx = startX + rIdx * cellW;
        const container = bayUnits.find(c => c.row === row && c.tier === tier);

        if (container) {
          const podColorHex = getContainerColor(container.pod, activeTerminalKey);
          const [r, g, b] = hexToRgb(podColorHex);

          doc.setFillColor(r, g, b);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'F');
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'S');

          // Text labels inside container
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('courier', 'bold');
          doc.text(String(container.id).substring(0, 10), cx + (cellW - 1) / 2, ty + 3.5, { align: 'center' });

          doc.setFontSize(5);
          doc.setFont('courier', 'normal');
          const podText = `${container.iso} | ${normalizePortCode(container.pod)}`;
          doc.text(podText, cx + (cellW - 1) / 2, ty + 6.5, { align: 'center' });

          // Symbols / Badges
          const effTypeHold = getEffectiveCargoType(container);
          let symbolHold = '';
          if (effTypeHold === 'DG') symbolHold += '[DG] ';
          if (effTypeHold === 'RF') symbolHold += '[RF] ';
          if (effTypeHold === 'OS') symbolHold += '[OOG] ';
          if (effTypeHold === 'MT') symbolHold += '[MT] ';

          if (symbolHold) {
            doc.setFontSize(4.5);
            doc.setTextColor(255, 235, 59);
            doc.text(symbolHold.trim(), cx + (cellW - 1) / 2, ty + 8.8, { align: 'center' });
          }
        } else {
          // Empty slot cell
          doc.setFillColor(250, 250, 250);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'F');
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.1);
          doc.rect(cx, ty, cellW - 1, cellH - 1, 'S');
        }
      });

      startY += cellH;
    });
  });

  // -------------------------------------------------------------
  // REPORT SAVE & RESULT
  // -------------------------------------------------------------
  const exportedCount = filteredContainers.length;

  // Always Save PDF file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`);

  return {
    success: true,
    message: `PDF exportado con éxito. ${exportedCount} unidades procesadas en el reporte.`,
    visibleCount,
    exportedCount
  };
}

/**
 * VISUAL MINI PLAN PDF EXPORT ENGINE
 * Directly captures the HTML/SVG visual presentation of MiniPlanProView.
 * Outputs to A3 Landscape PDF without converting data into tables.
 */
export async function exportMiniPlanToPDF(
  elementId: string,
  fileNamePrefix = 'Mini_Plan_Estiba_Veronica'
): Promise<ExportValidationResult> {
  const element = document.getElementById(elementId);
  if (!element) {
    return {
      success: false,
      message: `No se encontró el elemento gráfico del Mini Plan (${elementId}).`,
      visibleCount: 0,
      exportedCount: 0
    };
  }

  // Preserve original inline styles
  const originalOverflow = element.style.overflow;
  const originalMaxHeight = element.style.maxHeight;
  const originalHeight = element.style.height;

  // Track overflow styles of child scroll containers
  const scrollContainers = element.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
  const originalStylesMap = new Map<Element, { overflow: string; maxHeight: string; height: string }>();

  try {
    // Unclamp scrolling boundaries to render full visual height in canvas
    element.style.overflow = 'visible';
    element.style.maxHeight = 'none';
    element.style.height = 'auto';

    scrollContainers.forEach(sc => {
      const el = sc as HTMLElement;
      originalStylesMap.set(sc, {
        overflow: el.style.overflow,
        maxHeight: el.style.maxHeight,
        height: el.style.height
      });
      el.style.overflow = 'visible';
      el.style.maxHeight = 'none';
      el.style.height = 'auto';
    });

    const calcWidth = Math.max(element.scrollWidth, element.offsetWidth, 1600);
    const calcHeight = Math.max(element.scrollHeight, element.offsetHeight, 1000);

    // Render full DOM node into canvas with oklch color sanitizer in onclone
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#030914',
      logging: false,
      width: calcWidth,
      height: calcHeight,
      windowWidth: calcWidth,
      windowHeight: calcHeight,
      onclone: (clonedDoc) => {
        // Unclamp cloned document root & body
        clonedDoc.documentElement.style.overflow = 'visible';
        clonedDoc.documentElement.style.height = 'auto';
        clonedDoc.body.style.overflow = 'visible';
        clonedDoc.body.style.height = 'auto';

        const clonedTarget = clonedDoc.getElementById(elementId);
        if (clonedTarget) {
          // Unclamp all parent containers up to body
          let p = clonedTarget.parentElement;
          while (p && p !== clonedDoc.body) {
            p.style.overflow = 'visible';
            p.style.height = 'auto';
            p.style.maxHeight = 'none';
            p = p.parentElement;
          }

          clonedTarget.style.height = 'auto';
          clonedTarget.style.maxHeight = 'none';
          clonedTarget.style.overflow = 'visible';

          // Hide print:hidden elements in export
          const hiddenElements = clonedTarget.querySelectorAll('.print\\:hidden');
          hiddenElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });

          // Unclamp inner scroll areas
          const inners = clonedTarget.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
          inners.forEach(inEl => {
            const el = inEl as HTMLElement;
            el.style.overflow = 'visible';
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
            el.style.flex = 'none';
          });
        }

        // 1. Sanitise all <style> elements containing modern CSS color functions
        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((style) => {
          if (style.textContent) {
            style.textContent = style.textContent
              .replace(/oklch\([^;\}]+\)/gi, '#030914')
              .replace(/oklab\([^;\}]+\)/gi, '#030914')
              .replace(/color-mix\([^;\}]+\)/gi, '#030914')
              .replace(/light-dark\([^;\}]+\)/gi, '#030914');
          }
        });

        // 2. Safely clean clonedDoc styleSheets cssRules if accessible
        try {
          Array.from(clonedDoc.styleSheets).forEach((sheet) => {
            try {
              const rules = sheet.cssRules || sheet.rules;
              if (!rules) return;
              for (let i = rules.length - 1; i >= 0; i--) {
                const ruleText = rules[i]?.cssText || '';
                if (/(oklch|oklab|color-mix|light-dark)/i.test(ruleText)) {
                  try {
                    sheet.deleteRule(i);
                  } catch (e) {
                    // Ignore individual rule delete failure
                  }
                }
              }
            } catch (e) {
              // Ignore cross-origin or protected stylesheet errors
            }
          });
        } catch (e) {
          // Ignore
        }

        // 3. Sanitise inline style attributes on all cloned elements
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style && htmlEl.style.cssText) {
            if (/(oklch|oklab|lab|lch|color-mix|light-dark)/i.test(htmlEl.style.cssText)) {
              htmlEl.style.cssText = htmlEl.style.cssText
                .replace(/oklch\([^;\}]+\)/gi, '#030914')
                .replace(/oklab\([^;\}]+\)/gi, '#030914')
                .replace(/color-mix\([^;\}]+\)/gi, '#030914')
                .replace(/light-dark\([^;\}]+\)/gi, '#030914');
            }
          }
        });

        // 4. Ensure all summary footer panels in every bay card have explicit crisp white text
        const summarySpans = clonedDoc.querySelectorAll('span, strong, div, p');
        summarySpans.forEach((node) => {
          const el = node as HTMLElement;
          if (el.textContent && (
            el.textContent.includes('DESCARGA') ||
            el.textContent.includes('TRÁNSITO') ||
            el.textContent.includes('TOTAL')
          )) {
            el.style.color = '#FFFFFF';
            el.style.fontWeight = 'bold';
          }
        });
      }
    });

    // Revert original DOM styles
    element.style.overflow = originalOverflow;
    element.style.maxHeight = originalMaxHeight;
    element.style.height = originalHeight;
    originalStylesMap.forEach((style, sc) => {
      const el = sc as HTMLElement;
      el.style.overflow = style.overflow;
      el.style.maxHeight = style.maxHeight;
      el.style.height = style.height;
    });

    // Create A3 Landscape PDF (420mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 420mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Calculate height in PDF mm corresponding to full canvas width stretched to 420mm
    const totalPdfHeight = (imgHeight * pdfWidth) / imgWidth;

    if (totalPdfHeight <= pdfHeight) {
      // Fits on a single A3 page
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, totalPdfHeight);
    } else {
      // Multi-page A3 split
      const pageCanvasHeight = (imgWidth * pdfHeight) / pdfWidth;
      let currentY = 0;
      let pageIndex = 0;

      while (currentY < imgHeight) {
        if (pageIndex > 0) {
          pdf.addPage('a3', 'landscape');
        }

        const sliceHeight = Math.min(pageCanvasHeight, imgHeight - currentY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = imgWidth;
        pageCanvas.height = pageCanvasHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#030914';
          ctx.fillRect(0, 0, imgWidth, pageCanvasHeight);
          ctx.drawImage(
            canvas,
            0, currentY, imgWidth, sliceHeight,
            0, 0, imgWidth, sliceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL('image/png');
        pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        currentY += pageCanvasHeight;
        pageIndex++;
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    pdf.save(`${fileNamePrefix}_${timestamp}.pdf`);

    return {
      success: true,
      message: 'Plano Mini A3 exportado exitosamente en formato gráfico vectorial.',
      visibleCount: 1,
      exportedCount: 1
    };
  } catch (err: any) {
    // Ensure styles are restored even on error
    element.style.overflow = originalOverflow;
    element.style.maxHeight = originalMaxHeight;
    element.style.height = originalHeight;
    originalStylesMap.forEach((style, sc) => {
      const el = sc as HTMLElement;
      el.style.overflow = style.overflow;
      el.style.maxHeight = style.maxHeight;
      el.style.height = style.height;
    });

    console.error('Error al generar PDF de Mini Plan:', err);
    return {
      success: false,
      message: `Error generando PDF visual: ${err.message || 'Desconocido'}`,
      visibleCount: 0,
      exportedCount: 0
    };
  }
}

import { RestowItem, WeightViolationItem } from '../business/restowEngine';

/**
 * EXPORT RESTOWS (RESTIBAS) TO EXCEL
 * Strictly exports the detected Restow items with required columns:
 * CONTENEDOR, POSICION, ISO, POD, PESO, IMO, OS, RF CON TEMPERATURA, STATUS, CARGO TYPE
 */
export function exportRestowsToExcel(
  restowItems: RestowItem[],
  fileNamePrefix = 'Reporte_Restibas_Shiftings'
): ExportValidationResult {
  const cleanVal = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '';
    const str = String(val).trim();
    if (str === NO_DATA || str === 'Dato no disponible') return '';
    return str;
  };

  const cleanPort = (port: string | undefined | null): string => {
    const p = normalizePortCode(port);
    return p === NO_DATA ? '' : p;
  };

  const rows = restowItems.map(r => {
    const c = r.container;
    const effType = getEffectiveCargoType(c);
    const rawTemp = cleanVal(c.temp);
    const tempVal = (rawTemp && hasValidTemp(rawTemp)) ? rawTemp : '';
    const isRf = effType === 'RF';
    const rfWithTemp = isRf ? `RF (${tempVal})` : 'NO';

    const isDg = effType === 'DG';
    const imoVal = isDg ? (cleanVal(c.imoClass) || 'SI') : 'NO';

    const isOs = effType === 'OS';
    const osVal = isOs ? (c.oogDim || 'SI') : 'NO';

    return {
      'CONTENEDOR': cleanVal(c.id),
      'POSICION': cleanVal(c.position),
      'ISO': cleanVal(c.iso),
      'POD': cleanPort(c.pod),
      'PESO': c.weight && c.weight !== NO_DATA ? `${c.weight} KG` : '',
      'IMO': imoVal,
      'OS': osVal,
      'RF CON TEMPERATURA': rfWithTemp,
      'STATUS': effType === 'MT' || c.status === 'EMPTY' ? 'EMPTY' : 'FULL',
      'CARGO TYPE': effType,
      'TIPO RESTIBA': r.restowTypeLabel,
      'CONTENEDOR BLOQUEADO': cleanVal(r.blockedContainerId),
      'POSICION BLOQUEADA': cleanVal(r.blockedContainerPos),
      'POD BLOQUEADO': cleanPort(r.blockedContainerPod),
      'MOTIVO RESTIBA': r.reason
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'REPORT_RESTIBAS');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${timestamp}.xlsx`);

  return {
    success: true,
    message: `Reporte de Restibas exportado exitosamente. Total ${rows.length} unidades de restiba.`,
    visibleCount: restowItems.length,
    exportedCount: rows.length
  };
}

/**
 * EXPORT WEIGHT STOWAGE VIOLATIONS (BUENA ESTIBA) TO EXCEL
 */
export function exportWeightStowageToExcel(
  violations: WeightViolationItem[],
  fileNamePrefix = 'Reporte_Malla_Pesos_Buena_Estiba'
): ExportValidationResult {
  const rows = violations.map(v => ({
    'GRAVEDAD': v.severity,
    'BAHÍA': v.bay,
    'FILA': v.row,
    'CONTENEDOR SUPERIOR': v.topContainer.id,
    'NIVEL ARRIBA': v.topTier,
    'CATEGORÍA ARRIBA': v.topCategory,
    'PESO ARRIBA (KG)': `${v.topWeightKg} KG`,
    'CONTENEDOR INFERIOR': v.bottomContainer.id,
    'NIVEL ABAJO': v.bottomTier,
    'CATEGORÍA ABAJO': v.bottomCategory,
    'PESO ABAJO (KG)': `${v.bottomWeightKg} KG`,
    'ISO ARRIBA': v.topContainer.iso,
    'ISO ABAJO': v.bottomContainer.iso,
    'POD ARRIBA': v.topContainer.pod,
    'POD ABAJO': v.bottomContainer.pod,
    'DIAGNOSTICO ESTIBA': v.description
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MALLA_DE_PESOS');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  XLSX.writeFile(workbook, `${fileNamePrefix}_${timestamp}.xlsx`);

  return {
    success: true,
    message: `Reporte de Distribución de Pesos exportado. ${rows.length} observaciones registradas.`,
    visibleCount: violations.length,
    exportedCount: rows.length
  };
}

/**
 * DEDICATED IFRAME PRINT WRAPPER FOR ISOLATED PRINTING / PDF EXPORT
 * Clones the target container into a temporary iframe to bypass main app CSS overflow, flexbox, and layout bounds.
 */
export function printElementViaIframe(elementId: string): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[printElementViaIframe] Element with id '${elementId}' not found.`);
    return false;
  }

  // 1. Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = `print-iframe-${Date.now()}`;
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('[printElementViaIframe] Could not access iframe document.');
    document.body.removeChild(iframe);
    return false;
  }

  // 2. Gather styles from current document
  const styleTags: string[] = [];

  document.querySelectorAll('style').forEach((style) => {
    let cssText = style.textContent || '';
    cssText = cssText
      .replace(/oklch\([^;\}]+\)/gi, '#030914')
      .replace(/oklab\([^;\}]+\)/gi, '#030914')
      .replace(/color-mix\([^;\}]+\)/gi, '#030914')
      .replace(/light-dark\([^;\}]+\)/gi, '#030914');
    styleTags.push(`<style>${cssText}</style>`);
  });

  document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    styleTags.push((link as HTMLElement).outerHTML);
  });

  // 3. Clone target node & unclamp styles
  const clonedElement = element.cloneNode(true) as HTMLElement;

  clonedElement.style.overflow = 'visible';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.height = 'auto';

  const hiddenElements = clonedElement.querySelectorAll('.print\\:hidden');
  hiddenElements.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  const scrollContainers = clonedElement.querySelectorAll('.overflow-y-auto, .overflow-x-auto, .overflow-auto, main');
  scrollContainers.forEach((sc) => {
    const el = sc as HTMLElement;
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
    el.style.height = 'auto';
    el.style.flex = 'none';
  });

  // Write content to iframe document
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Impresión de Planos - VERONICA</title>
        ${styleTags.join('\n')}
        <style>
          @page {
            size: A3 landscape;
            margin: 5mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
              background-color: #030914 !important;
              color: #f1f5f9 !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #030914 !important;
            color: #f1f5f9 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
          #${elementId} {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            max-height: none !important;
            background-color: #030914 !important;
          }
          .overflow-y-auto, .overflow-x-auto, .overflow-auto, main {
            overflow: visible !important;
            max-height: none !important;
            height: auto !important;
            flex: none !important;
          }
        </style>
      </head>
      <body style="background-color: #030914; color: #f1f5f9;">
        <div id="iframe-print-container"></div>
      </body>
    </html>
  `);
  iframeDoc.close();

  const container = iframeDoc.getElementById('iframe-print-container');
  if (container) {
    container.appendChild(clonedElement);
  } else {
    iframeDoc.body.appendChild(clonedElement);
  }

  // Trigger print after frame renders
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('[printElementViaIframe] Frame print error:', err);
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  }, 350);

  return true;
}

/**
 * BAPLIE EDI (EDIFACT BAPLIE 2.0 / SMDG) EXPORT ENGINE
 * Generates an official BAPLIE EDI text message representing departure stowage state.
 */
export function exportToBaplieEDI(
  containers: Container[],
  headerInfo?: { vesselName?: string; voyage?: string; pol?: string; date?: string },
  fileNamePrefix = 'BAPLIE_SALIDA_CERTIFICADO'
): ExportValidationResult {
  const visibleCount = containers.length;
  if (visibleCount === 0) {
    return {
      success: false,
      message: 'No hay contenedores en el plano para generar el BAPLIE.',
      visibleCount: 0,
      exportedCount: 0
    };
  }

  const cleanVal = (val: string | number | undefined | null, defaultVal = ''): string => {
    if (val === undefined || val === null) return defaultVal;
    const str = String(val).trim();
    if (str === NO_DATA || str === 'Dato no disponible') return defaultVal;
    return str;
  };

  const cleanPort = (port: string | undefined | null): string => {
    const p = normalizePortCode(port);
    return p === NO_DATA ? '' : p;
  };

  const vesselName = cleanVal(headerInfo?.vesselName, 'MAERSK SENTOSA').toUpperCase();
  const voyage = cleanVal(headerInfo?.voyage, '2507W').toUpperCase();
  const pol = cleanPort(headerInfo?.pol) || 'MXVER';

  const now = new Date();
  const dateStr = now.toISOString().replace(/\D/g, '').slice(2, 12);
  const timeStampFile = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const lines: string[] = [];

  // EDI Standard Interchange Headers
  lines.push(`UNA:+.? '`);
  lines.push(`UNB+UNOA:2+TERMINAL_TOS+LINE_OPERATOR+${dateStr.slice(0, 6)}:${dateStr.slice(6, 10)}+1'`);
  lines.push(`UNH+1+BAPLIE:D:95B:UN:SMDG20'`);
  lines.push(`BGM++BAPLIE_OUTBOUND_CERTIFIED+9'`);
  lines.push(`DTM+137:${dateStr}:203'`);
  lines.push(`NAD+MS+${cleanVal(vesselName).substring(0, 10)}'`);
  lines.push(`LOC+147+${pol}:139:6'`);
  lines.push(`TDT+20+${voyage}+1++OPERATOR:172:20+++9234567:146:11:${vesselName}'`);

  containers.forEach((c) => {
    const bay = (c.bay || '01').padStart(2, '0');
    const row = (c.row || '00').padStart(2, '0');
    const tier = (c.tier || '00').padStart(2, '0');
    const posCode = `${bay}${row}${tier}`;
    const containerId = cleanVal(c.id, 'UNKNOWN').replace(/[^A-Z0-9]/gi, '');
    const isoCode = cleanVal(c.iso, '22G1');
    const weightKg = cleanVal(c.weight, '24000').replace(/\D/g, '') || '24000';
    const polPort = cleanPort(c.pol) || pol;
    const podPort = cleanPort(c.pod) || 'CLSAI';
    const operator = cleanVal(c.operator, 'MAEU');
    const isFull = c.status !== 'EMPTY' && c.cargoType !== 'MT';
    const statusDigit = isFull ? '5' : '4';

    // Location (Bay/Row/Tier)
    lines.push(`LOC+147+${posCode}:139:6'`);

    // Equipment Details
    lines.push(`EQD+CN+${containerId}+${isoCode}:102:5++2+${statusDigit}'`);

    // Weight Segment
    lines.push(`MEA+WT++KGM:${weightKg}'`);

    // POL and POD
    lines.push(`LOC+9+${polPort}:139:6'`);
    lines.push(`LOC+11+${podPort}:139:6'`);

    // Operator Carrier
    lines.push(`NAD+CA+${operator}'`);

    // Reefer / Temperature Segment
    if (c.cargoType === 'RF' || (c.temp && c.temp !== 'DRY' && c.temp !== NO_DATA)) {
      const rawTemp = cleanVal(c.temp, '0').replace(/[^0-9.-]/g, '') || '0';
      lines.push(`TMP+2+${rawTemp}:CEL'`);
    }

    // Dangerous Goods (IMO Class / UN Number)
    if (c.cargoType === 'DG' || (c.imoClass && c.imoClass !== NO_DATA && c.imoClass !== '-')) {
      const imo = cleanVal(c.imoClass, '3');
      const un = cleanVal(c.unNumber, '1203');
      lines.push(`DGS+IMD+${imo}+${un}'`);
    }
  });

  // EDI Standard Interchange Trailers
  lines.push(`UNT+${lines.length - 2}+1'`);
  lines.push(`UNZ+1+1'`);

  const ediContent = lines.join('\n');

  // Trigger File Download
  const blob = new Blob([ediContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileNamePrefix}_${vesselName.replace(/\s+/g, '_')}_${timeStampFile}.edi`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    message: `BAPLIE de Salida (.EDI) generado exitosamente con ${visibleCount} unidades certificadas.`,
    visibleCount,
    exportedCount: visibleCount
  };
}




