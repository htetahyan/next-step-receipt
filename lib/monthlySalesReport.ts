import { endOfMonth, format, isAfter, parseISO, startOfMonth } from 'date-fns';
import { parseFinancialNumber } from '@/lib/financialUtils';
import { dashboardServiceGroup } from '@/lib/service-constants';
import { getProfitDateISO, getTravelDateISO, toISODate } from '@/lib/serviceDates';

export type ReportServiceType = 'Visa' | 'Ticket' | 'Service' | 'Tour';

export interface SalesReportRow {
  no: number;
  ref: string;
  service: string;
  customer: string;
  passport: string;
  issuedOrCreated: string;
  issuedOrCreatedISO: string;
  travelDate: string;
  status: string;
  receiving: number;
  cost: number;
  grossProfit: number;
  type: ReportServiceType;
}

export interface SalesReportByTypeRow {
  type: ReportServiceType;
  count: number;
  profit: number;
}

export interface MonthlySalesReportPayload {
  title: string;
  sheetName: string;
  filenameBase: string;
  periodLabel: string;
  generatedLabel: string;
  rows: SalesReportRow[];
  totalReceiving: number;
  totalCost: number;
  totalGrossProfit: number;
  totalBookings: number;
  avgProfitPerBooking: number;
  profitMarginDecimal: number; // e.g. 0.203 for 20.3%
  byType: SalesReportByTypeRow[];
}

export function formatReportServiceLabel(srv: any): string {
  const details = srv?.details || {};
  const group = dashboardServiceGroup(srv?.category, srv?.reference_id);

  if (group === 'Air Tickets') {
    const parts: string[] = [];
    const airlineOrSupplier = details.airline || details.supplier_name || details.visa_supplier;
    if (airlineOrSupplier) parts.push(String(airlineOrSupplier).trim());
    if (details.sector) parts.push(String(details.sector).trim());
    if (details.pnr) parts.push(`PNR: ${String(details.pnr).trim()}`);
    return parts.join(' • ') || srv?.category || 'Air Ticket';
  }

  if (group === 'Tour Packages') {
    if (details.tour_plans) return String(details.tour_plans).trim();
    if (details.supplier_name) {
      return `${srv?.category || 'Tour Package'} (${String(details.supplier_name).trim()})`;
    }
    return srv?.category || 'Tour Package';
  }

  if (group === 'Other Visas') {
    const parts: string[] = [];
    if (srv?.category) parts.push(String(srv.category).trim());
    if (details.visa_type) parts.push(String(details.visa_type).trim());
    if (details.visa_supplier) parts.push(String(details.visa_supplier).trim());
    return parts.join(' • ') || 'Other Visa';
  }

  if (group === 'Custom Service') {
    const parts: string[] = [];
    if (srv?.category) parts.push(String(srv.category).trim());
    if (details.supplier_name) parts.push(String(details.supplier_name).trim());
    if (details.description) parts.push(String(details.description).trim());
    return parts.join(' • ') || srv?.category || 'Custom Service';
  }

  // UAE Visa
  const parts: string[] = [];
  if (srv?.category) parts.push(String(srv.category).trim());
  if (
    details.visa_duration &&
    !String(srv?.category || '')
      .toLowerCase()
      .includes(String(details.visa_duration).toLowerCase())
  ) {
    parts.push(String(details.visa_duration).trim());
  }
  const supplier = details.visa_supplier || details.supplier_name;
  if (supplier) parts.push(String(supplier).trim());
  return parts.join(' • ') || 'UAE Visa';
}

export function getReportServiceType(srv: any): ReportServiceType {
  const group = dashboardServiceGroup(srv?.category, srv?.reference_id);
  const catLower = String(srv?.category || '').toLowerCase();
  const refPrefix = String(srv?.reference_id || '')
    .toUpperCase()
    .match(/^[A-Z]+/)?.[0] || '';

  if (group === 'Air Tickets' || refPrefix === 'AT' || refPrefix === 'TK') return 'Ticket';
  if (group === 'Tour Packages' || refPrefix === 'TP') return 'Tour';
  if (
    group === 'Custom Service' ||
    refPrefix === 'CS' ||
    refPrefix === 'OV' ||
    catLower.includes('appointment') ||
    catLower.includes('consultation')
  ) {
    return 'Service';
  }
  if (group === 'Other Visas') return 'Service';
  return 'Visa';
}

function formatDisplayDate(isoOrRaw?: string | null): string {
  if (!isoOrRaw) return '';
  const iso = toISODate(isoOrRaw);
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd MMM yyyy');
  } catch {
    return '';
  }
}

export function buildMonthlySalesReportData(
  services: any[],
  options?: {
    monthYYYYMM?: string;
    customTitle?: string;
    customPeriodLabel?: string;
  }
): MonthlySalesReportPayload {
  const now = new Date();
  const monthStr = options?.monthYYYYMM || format(now, 'yyyy-MM');
  const [yyyyStr, mmStr] = monthStr.split('-');
  const yearNum = parseInt(yyyyStr, 10) || now.getFullYear();
  const monthIndex = (parseInt(mmStr, 10) || now.getMonth() + 1) - 1;

  const monthStart = startOfMonth(new Date(yearNum, monthIndex, 1));
  const monthEnd = endOfMonth(monthStart);

  // Sort services chronologically or reverse-chronologically matching the report convention
  const sortedServices = [...services].sort((a, b) => {
    const dateA = getProfitDateISO(a) || '';
    const dateB = getProfitDateISO(b) || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const createdA = String(a?.created_at || '');
    const createdB = String(b?.created_at || '');
    if (createdA !== createdB) return createdB.localeCompare(createdA);
    return String(b?.reference_id || '').localeCompare(String(a?.reference_id || ''));
  });

  let totalReceiving = 0;
  let totalCost = 0;
  let totalGrossProfit = 0;

  const byTypeMap: Record<ReportServiceType, { count: number; profit: number }> = {
    Visa: { count: 0, profit: 0 },
    Ticket: { count: 0, profit: 0 },
    Service: { count: 0, profit: 0 },
    Tour: { count: 0, profit: 0 },
  };

  let latestDateISO = '';

  const rows: SalesReportRow[] = sortedServices.map((srv, idx) => {
    const details = srv?.details || {};
    const fin = srv?.financials || {};
    const cust = srv?.customer || srv?.customers || {};

    const amt = parseFinancialNumber(fin.amount, 0);
    const disc = parseFinancialNumber(fin.discount, 0);
    const receiving = Math.round(parseFinancialNumber(fin.receiving_amount, amt - disc));
    const supplierCost = parseFinancialNumber(fin.supplier_cost, 0);
    const refund = parseFinancialNumber(fin.refund, 0);
    const cost = Math.round(supplierCost + refund);
    const grossProfit = receiving - cost;

    const profitISO = getProfitDateISO(srv) || '';
    if (profitISO && profitISO > latestDateISO) {
      latestDateISO = profitISO;
    }

    const travelISO = getTravelDateISO(srv) || details.travel_date || details.departure_date || '';
    const type = getReportServiceType(srv);

    totalReceiving += receiving;
    totalCost += cost;
    totalGrossProfit += grossProfit;

    byTypeMap[type].count += 1;
    byTypeMap[type].profit += grossProfit;

    return {
      no: idx + 1,
      ref: String(srv?.reference_id || '—').trim(),
      service: formatReportServiceLabel(srv),
      customer: String(cust?.name || details?.customer_name || 'Walk-in').trim(),
      passport: String(cust?.passport_no || details?.passport_no || '').trim(),
      issuedOrCreated: formatDisplayDate(profitISO),
      issuedOrCreatedISO: profitISO,
      travelDate: formatDisplayDate(travelISO),
      status: String(srv?.status || 'Open').trim(),
      receiving,
      cost,
      grossProfit,
      type,
    };
  });

  const totalBookings = rows.length;
  const avgProfitPerBooking = totalBookings > 0 ? totalGrossProfit / totalBookings : 0;
  const profitMarginDecimal = totalReceiving > 0 ? totalGrossProfit / totalReceiving : 0;

  const isCurrentMonth =
    now.getFullYear() === monthStart.getFullYear() && now.getMonth() === monthStart.getMonth();

  let effectiveEndDate = isCurrentMonth && isAfter(monthEnd, now) ? now : monthEnd;
  if (latestDateISO) {
    const parsedLatest = parseISO(latestDateISO);
    if (!isNaN(parsedLatest.getTime()) && isAfter(parsedLatest, effectiveEndDate)) {
      effectiveEndDate = parsedLatest;
    }
  }

  const monthNameUpper = format(monthStart, 'MMMM').toUpperCase();
  const title = options?.customTitle || `${monthNameUpper} SALES REPORT`;
  const sheetName = `${format(monthStart, 'MMMM')} Sales Report`.slice(0, 31);
  const filenameBase = `${monthNameUpper}_${format(monthStart, 'yyyy')}_SALES_REPORT`;

  const periodLabel =
    options?.customPeriodLabel ||
    `Period: ${format(monthStart, 'dd MMM yyyy')} – ${format(effectiveEndDate, 'dd MMM yyyy')}`;
  const generatedLabel = `Generated ${format(now, 'dd MMM yyyy')} • Gross profit = Receiving − Cost`;

  const byTypeOrder: ReportServiceType[] = ['Visa', 'Ticket', 'Service', 'Tour'];
  const byType: SalesReportByTypeRow[] = byTypeOrder.map((t) => ({
    type: t,
    count: byTypeMap[t].count,
    profit: byTypeMap[t].profit,
  }));

  return {
    title,
    sheetName,
    filenameBase,
    periodLabel,
    generatedLabel,
    rows,
    totalReceiving,
    totalCost,
    totalGrossProfit,
    totalBookings,
    avgProfitPerBooking,
    profitMarginDecimal,
    byType,
  };
}

// ── Pure TypeScript OpenXML (.xlsx) Builder with Full Styling ─────────────

function escapeXml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(colIdx1: number): string {
  let n = colIdx1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0;(#,##0);&quot;-&quot;"/>
    <numFmt numFmtId="165" formatCode="#,##0.00"/>
    <numFmt numFmtId="166" formatCode="0.0%"/>
  </numFmts>
  <fonts count="10">
    <font><sz val="10"/><color rgb="FF111827"/><name val="Arial"/></font>
    <font><b/><sz val="14"/><color rgb="FF1F4E79"/><name val="Arial"/></font>
    <font><i/><sz val="10"/><color rgb="FF595959"/><name val="Arial"/></font>
    <font><sz val="9"/><color rgb="FF7F7F7F"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF006100"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF9C0006"/><name val="Arial"/></font>
    <font><b/><sz val="10"/><color rgb="FF000000"/><name val="Arial"/></font>
    <font><b/><sz val="11"/><color rgb="FF1F4E79"/><name val="Arial"/></font>
    <font><sz val="10"/><color rgb="FF006100"/><name val="Arial"/></font>
  </fonts>
  <fills count="7">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2EFDA"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFD0D7DE"/></left>
      <right style="thin"><color rgb="FFD0D7DE"/></right>
      <top style="thin"><color rgb="FFD0D7DE"/></top>
      <bottom style="thin"><color rgb="FFD0D7DE"/></bottom>
      <diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFD0D7DE"/></left>
      <right style="thin"><color rgb="FFD0D7DE"/></right>
      <top style="thin"><color rgb="FF1F4E79"/></top>
      <bottom style="double"><color rgb="FF1F4E79"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="21">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Report Title (Navy 14pt Bold Centered) -->
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 2: Period Subtitle (Gray 10pt Italic Centered) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 3: Generated Subtitle (Light Gray 9pt Centered) -->
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 4: Main Table Header (Navy Fill, White Bold Text, Centered) -->
    <xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 5: Data Center (No., Dates, Type) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 6: Data Left (Ref, Service, Customer, Passport) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 7: Status Cell (Soft Yellow Fill, Centered) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 8: Data Currency Integer (Receiving, Cost) -->
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 9: Positive Profit Cell (Green Fill, Dark Green Text) -->
    <xf numFmtId="164" fontId="9" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 10: Negative Profit Cell (Pink Fill, Dark Red Bold Text) -->
    <xf numFmtId="164" fontId="6" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 11: Total Row Blank/Label Cell (Soft Yellow Fill, Bold Right) -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 12: Total Row Currency Cell (Soft Yellow Fill, Bold Right) -->
    <xf numFmtId="164" fontId="7" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 13: Total Row Gross Profit Cell (Green Fill, Bold Dark Green Right) -->
    <xf numFmtId="164" fontId="5" fillId="4" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 14: Total Row Count Cell (Soft Yellow Fill, Bold Center) -->
    <xf numFmtId="0" fontId="7" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 15: Section Title (SUMMARY / BY TYPE, Navy 11pt Bold) -->
    <xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 16: Summary Label Cell -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="center"/>
    </xf>
    <!-- 17: Summary Integer Value (Green Fill, Bold Right) -->
    <xf numFmtId="164" fontId="7" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 18: Summary Decimal Value (Green Fill, Bold Right 0.00) -->
    <xf numFmtId="165" fontId="7" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 19: Summary Percent Value (Green Fill, Bold Right 0.0%) -->
    <xf numFmtId="166" fontId="7" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 20: By Type Profit Cell (Green Fill, Regular Right) -->
    <xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`;
}

function strCell(ref: string, val: string, styleIdx: number): string {
  return `<c r="${ref}" s="${styleIdx}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>`;
}

function numCell(ref: string, val: number, styleIdx: number, formula?: string): string {
  const safeVal = Number.isFinite(val) ? val : 0;
  if (formula) {
    return `<c r="${ref}" s="${styleIdx}"><f>${escapeXml(formula)}</f><v>${safeVal}</v></c>`;
  }
  return `<c r="${ref}" s="${styleIdx}"><v>${safeVal}</v></c>`;
}

function buildWorksheetXml(report: MonthlySalesReportPayload): string {
  const rowsXml: string[] = [];

  // Row 1: Title
  rowsXml.push(`<row r="1" ht="24" customHeight="1">${strCell('A1', report.title, 1)}</row>`);
  // Row 2: Period
  rowsXml.push(`<row r="2" ht="18" customHeight="1">${strCell('A2', report.periodLabel, 2)}</row>`);
  // Row 3: Generated
  rowsXml.push(`<row r="3" ht="16" customHeight="1">${strCell('A3', report.generatedLabel, 3)}</row>`);
  // Row 4: Blank spacer
  rowsXml.push(`<row r="4" ht="10" customHeight="1"/>`);

  // Row 5: Main Table Headers
  const headers = [
    'No.',
    'Ref',
    'Service',
    'Customer',
    'Passport',
    'Issued / Created',
    'Travel Date',
    'Status',
    'Receiving (AED)',
    'Cost (AED)',
    'Gross Profit (AED)',
    'Type',
  ];
  const headerCells = headers.map((h, idx) => strCell(`${colLetter(idx + 1)}5`, h, 4)).join('');
  rowsXml.push(`<row r="5" ht="22" customHeight="1">${headerCells}</row>`);

  const firstDataRow = 6;
  const dataCount = report.rows.length;

  if (dataCount === 0) {
    rowsXml.push(
      `<row r="6" ht="20" customHeight="1">${strCell('C6', 'No bookings recorded for this period', 6)}</row>`
    );
  } else {
    report.rows.forEach((row, i) => {
      const r = firstDataRow + i;
      const profitStyle = row.grossProfit < 0 ? 10 : 9;
      const cells = [
        numCell(`A${r}`, row.no, 5),
        strCell(`B${r}`, row.ref, 6),
        strCell(`C${r}`, row.service, 6),
        strCell(`D${r}`, row.customer, 6),
        strCell(`E${r}`, row.passport, 6),
        strCell(`F${r}`, row.issuedOrCreated, 5),
        strCell(`G${r}`, row.travelDate, 5),
        strCell(`H${r}`, row.status, 7),
        numCell(`I${r}`, row.receiving, 8),
        numCell(`J${r}`, row.cost, 8),
        numCell(`K${r}`, row.grossProfit, profitStyle, `I${r}-J${r}`),
        strCell(`L${r}`, row.type, 5),
      ].join('');
      rowsXml.push(`<row r="${r}" ht="19" customHeight="1">${cells}</row>`);
    });
  }

  const lastDataRow = Math.max(firstDataRow, firstDataRow + dataCount - 1);
  const totalRow = lastDataRow + 1;

  // TOTAL Row
  const totalCells = [
    strCell(`A${totalRow}`, '', 11),
    strCell(`B${totalRow}`, '', 11),
    strCell(`C${totalRow}`, '', 11),
    strCell(`D${totalRow}`, '', 11),
    strCell(`E${totalRow}`, '', 11),
    strCell(`F${totalRow}`, '', 11),
    strCell(`G${totalRow}`, '', 11),
    strCell(`H${totalRow}`, 'TOTAL', 11),
    numCell(
      `I${totalRow}`,
      report.totalReceiving,
      12,
      dataCount > 0 ? `SUM(I${firstDataRow}:I${lastDataRow})` : undefined
    ),
    numCell(
      `J${totalRow}`,
      report.totalCost,
      12,
      dataCount > 0 ? `SUM(J${firstDataRow}:J${lastDataRow})` : undefined
    ),
    numCell(
      `K${totalRow}`,
      report.totalGrossProfit,
      13,
      dataCount > 0 ? `SUM(K${firstDataRow}:K${lastDataRow})` : undefined
    ),
    numCell(
      `L${totalRow}`,
      report.totalBookings,
      14,
      dataCount > 0 ? `COUNTA(B${firstDataRow}:B${lastDataRow})` : undefined
    ),
  ].join('');
  rowsXml.push(`<row r="${totalRow}" ht="21" customHeight="1">${totalCells}</row>`);

  // Blank row before SUMMARY & BY TYPE
  const summaryHeadingRow = totalRow + 2;
  rowsXml.push(
    `<row r="${summaryHeadingRow}" ht="20" customHeight="1">${strCell(
      `A${summaryHeadingRow}`,
      'SUMMARY',
      15
    )}${strCell(`D${summaryHeadingRow}`, 'BY TYPE', 15)}</row>`
  );

  // Row +1: Total Receiving + BY TYPE Table Header
  const r1 = summaryHeadingRow + 1;
  const r2 = summaryHeadingRow + 2;
  const r3 = summaryHeadingRow + 3;
  const r4 = summaryHeadingRow + 4;
  const r5 = summaryHeadingRow + 5;
  const r6 = summaryHeadingRow + 6;

  rowsXml.push(
    `<row r="${r1}" ht="19" customHeight="1">${[
      strCell(`A${r1}`, 'Total Receiving (AED)', 16),
      numCell(`B${r1}`, report.totalReceiving, 17, `I${totalRow}`),
      strCell(`D${r1}`, 'Type', 4),
      strCell(`E${r1}`, 'Count', 4),
      strCell(`F${r1}`, 'Profit (AED)', 4),
    ].join('')}</row>`
  );

  const summaryRowsMeta = [
    {
      rowNum: r2,
      label: 'Total Cost (AED)',
      val: report.totalCost,
      style: 17,
      formula: `J${totalRow}`,
      byTypeItem: report.byType[0], // Visa
    },
    {
      rowNum: r3,
      label: 'Total Gross Profit (AED)',
      val: report.totalGrossProfit,
      style: 17,
      formula: `K${totalRow}`,
      byTypeItem: report.byType[1], // Ticket
    },
    {
      rowNum: r4,
      label: 'Bookings',
      val: report.totalBookings,
      style: 17,
      formula: `L${totalRow}`,
      byTypeItem: report.byType[2], // Service
    },
    {
      rowNum: r5,
      label: 'Avg Profit / Booking',
      val: Number(report.avgProfitPerBooking.toFixed(2)),
      style: 18,
      formula: `IF(B${r4}>0,B${r3}/B${r4},0)`,
      byTypeItem: report.byType[3], // Tour
    },
    {
      rowNum: r6,
      label: 'Profit Margin',
      val: Number(report.profitMarginDecimal.toFixed(4)),
      style: 19,
      formula: `IF(B${r1}>0,B${r3}/B${r1},0)`,
      byTypeItem: undefined,
    },
  ];

  for (const item of summaryRowsMeta) {
    const cells: string[] = [
      strCell(`A${item.rowNum}`, item.label, 16),
      numCell(`B${item.rowNum}`, item.val, item.style, item.formula),
    ];

    if (item.byTypeItem) {
      const t = item.byTypeItem;
      const countFormula =
        dataCount > 0 ? `COUNTIF(L${firstDataRow}:L${lastDataRow},"${t.type}")` : undefined;
      const profitFormula =
        dataCount > 0
          ? `SUMIF(L${firstDataRow}:L${lastDataRow},"${t.type}",K${firstDataRow}:K${lastDataRow})`
          : undefined;
      cells.push(
        strCell(`D${item.rowNum}`, t.type, 6),
        numCell(`E${item.rowNum}`, t.count, 5, countFormula),
        numCell(`F${item.rowNum}`, t.profit, 20, profitFormula)
      );
    }

    rowsXml.push(`<row r="${item.rowNum}" ht="19" customHeight="1">${cells.join('')}</row>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0" showGridLines="1"/>
  </sheetViews>
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="11" customWidth="1"/>
    <col min="3" max="3" width="44" customWidth="1"/>
    <col min="4" max="4" width="26" customWidth="1"/>
    <col min="5" max="5" width="14" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="15" customWidth="1"/>
    <col min="8" max="8" width="12" customWidth="1"/>
    <col min="9" max="9" width="16" customWidth="1"/>
    <col min="10" max="10" width="14" customWidth="1"/>
    <col min="11" max="11" width="18" customWidth="1"/>
    <col min="12" max="12" width="11" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('\n    ')}
  </sheetData>
  <autoFilter ref="A5:L${lastDataRow}"/>
  <mergeCells count="3">
    <mergeCell ref="A1:L1"/>
    <mergeCell ref="A2:L2"/>
    <mergeCell ref="A3:L3"/>
  </mergeCells>
</worksheet>`;
}

// Minimal CRC32 + Uncompressed ZIP archive builder so .xlsx works everywhere with 0 external runtime dependencies
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipArchive(files: { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const entries = files.map((f) => {
    const nameBytes = encoder.encode(f.name);
    const dataBytes = encoder.encode(f.content);
    const crc = crc32(dataBytes);
    return { nameBytes, dataBytes, crc, offset: 0 };
  });

  let localSize = 0;
  let centralSize = 0;
  for (const e of entries) {
    e.offset = localSize;
    localSize += 30 + e.nameBytes.length + e.dataBytes.length;
    centralSize += 46 + e.nameBytes.length;
  }

  const totalSize = localSize + centralSize + 22;
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  let pos = 0;
  for (const e of entries) {
    view.setUint32(pos, 0x04034b50, true); // Local file header signature
    view.setUint16(pos + 4, 20, true); // Version needed
    view.setUint16(pos + 6, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 8, 0, true); // Store method (0)
    view.setUint16(pos + 10, 0, true); // Mod time
    view.setUint16(pos + 12, 0x554b, true); // Mod date
    view.setUint32(pos + 14, e.crc, true);
    view.setUint32(pos + 18, e.dataBytes.length, true);
    view.setUint32(pos + 22, e.dataBytes.length, true);
    view.setUint16(pos + 26, e.nameBytes.length, true);
    view.setUint16(pos + 28, 0, true);
    pos += 30;
    out.set(e.nameBytes, pos);
    pos += e.nameBytes.length;
    out.set(e.dataBytes, pos);
    pos += e.dataBytes.length;
  }

  const centralStart = pos;
  for (const e of entries) {
    view.setUint32(pos, 0x02014b50, true); // Central directory signature
    view.setUint16(pos + 4, 20, true); // Version made by
    view.setUint16(pos + 6, 20, true); // Version needed
    view.setUint16(pos + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 10, 0, true); // Store method (0)
    view.setUint16(pos + 12, 0, true);
    view.setUint16(pos + 14, 0x554b, true);
    view.setUint32(pos + 16, e.crc, true);
    view.setUint32(pos + 20, e.dataBytes.length, true);
    view.setUint32(pos + 24, e.dataBytes.length, true);
    view.setUint16(pos + 28, e.nameBytes.length, true);
    view.setUint16(pos + 30, 0, true);
    view.setUint16(pos + 32, 0, true);
    view.setUint16(pos + 34, 0, true);
    view.setUint16(pos + 36, 0, true);
    view.setUint32(pos + 38, 0, true);
    view.setUint32(pos + 42, e.offset, true);
    pos += 46;
    out.set(e.nameBytes, pos);
    pos += e.nameBytes.length;
  }

  // End of central directory record
  view.setUint32(pos, 0x06054b50, true);
  view.setUint16(pos + 4, 0, true);
  view.setUint16(pos + 6, 0, true);
  view.setUint16(pos + 8, entries.length, true);
  view.setUint16(pos + 10, entries.length, true);
  view.setUint32(pos + 12, centralSize, true);
  view.setUint32(pos + 16, centralStart, true);
  view.setUint16(pos + 20, 0, true);

  return out;
}

export function generateMonthlySalesXlsxBytes(report: MonthlySalesReportPayload): Uint8Array {
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXml(report.sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return buildZipArchive([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: buildStylesXml() },
    { name: 'xl/worksheets/sheet1.xml', content: buildWorksheetXml(report) },
  ]);
}

export function downloadMonthlySalesXlsx(report: MonthlySalesReportPayload) {
  const bytes = generateMonthlySalesXlsxBytes(report);
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.filenameBase}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}

// ── Vector PDF Report Generator Matching the Exact Template ──────────────

function formatAccountingInt(n: number): string {
  if (n < 0) return `(${Math.abs(n).toLocaleString()})`;
  return n.toLocaleString();
}

export async function downloadMonthlySalesPdf(report: MonthlySalesReportPayload) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 297
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210
  const marginX = 10;
  const usableWidth = pageWidth - marginX * 2; // 277mm

  // 12 Column widths summing to 277mm
  const cols = [
    { header: 'No.', width: 9, align: 'center' as const },
    { header: 'Ref', width: 17, align: 'left' as const },
    { header: 'Service', width: 64, align: 'left' as const },
    { header: 'Customer', width: 38, align: 'left' as const },
    { header: 'Passport', width: 21, align: 'left' as const },
    { header: 'Issued / Created', width: 24, align: 'center' as const },
    { header: 'Travel Date', width: 23, align: 'center' as const },
    { header: 'Status', width: 15, align: 'center' as const },
    { header: 'Receiving (AED)', width: 19, align: 'right' as const },
    { header: 'Cost (AED)', width: 16, align: 'right' as const },
    { header: 'Gross Profit (AED)', width: 19, align: 'right' as const },
    { header: 'Type', width: 12, align: 'center' as const },
  ];

  // Title Banner on Page 1
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(31, 78, 121); // #1F4E79
  pdf.text(report.title, pageWidth / 2, 13, { align: 'center' });

  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9.5);
  pdf.setTextColor(89, 89, 89);
  pdf.text(report.periodLabel, pageWidth / 2, 18.5, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(127, 127, 127);
  pdf.text(report.generatedLabel.replace('−', '-'), pageWidth / 2, 23, { align: 'center' });

  let y = 27;
  const headerH = 7;
  const rowH = 5.8;

  const drawTableHeader = (topY: number) => {
    let x = marginX;
    pdf.setFillColor(31, 78, 121); // #1F4E79
    pdf.rect(marginX, topY, usableWidth, headerH, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);

    for (const col of cols) {
      pdf.setDrawColor(208, 215, 222);
      pdf.setLineWidth(0.15);
      pdf.rect(x, topY, col.width, headerH, 'S');
      const textY = topY + 4.7;
      if (col.align === 'right') {
        pdf.text(col.header, x + col.width - 1.2, textY, { align: 'right' });
      } else if (col.align === 'center') {
        pdf.text(col.header, x + col.width / 2, textY, { align: 'center' });
      } else {
        pdf.text(col.header, x + 1.5, textY);
      }
      x += col.width;
    }
    return topY + headerH;
  };

  y = drawTableHeader(y);

  const fitText = (str: string, maxWidthMm: number): string => {
    if (!str) return '';
    let s = str;
    while (s.length > 3 && pdf.getTextWidth(s) > maxWidthMm - 2.4) {
      s = s.slice(0, -2) + '…';
    }
    return s;
  };

  for (const row of report.rows) {
    if (y + rowH > pageHeight - 14) {
      pdf.addPage();
      y = 12;
      y = drawTableHeader(y);
    }

    const rowValues = [
      String(row.no),
      row.ref,
      row.service,
      row.customer,
      row.passport,
      row.issuedOrCreated,
      row.travelDate,
      row.status,
      formatAccountingInt(row.receiving),
      formatAccountingInt(row.cost),
      formatAccountingInt(row.grossProfit),
      row.type,
    ];

    let x = marginX;
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      const val = rowValues[c];

      // Cell Background
      if (c === 7) {
        // Status column -> Soft Yellow #FFF2CC
        pdf.setFillColor(255, 242, 204);
        pdf.rect(x, y, col.width, rowH, 'FD');
      } else if (c === 10) {
        // Gross Profit column -> Green #C6EFCE or Red #FFC7CE
        if (row.grossProfit < 0) {
          pdf.setFillColor(255, 199, 206);
        } else {
          pdf.setFillColor(198, 239, 206);
        }
        pdf.rect(x, y, col.width, rowH, 'FD');
      } else {
        pdf.setDrawColor(218, 222, 228);
        pdf.setLineWidth(0.15);
        pdf.rect(x, y, col.width, rowH, 'S');
      }

      // Cell Text
      if (c === 10) {
        pdf.setFont('helvetica', 'bold');
        if (row.grossProfit < 0) {
          pdf.setTextColor(156, 0, 6); // #9C0006
        } else {
          pdf.setTextColor(0, 97, 0); // #006100
        }
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(25, 25, 25);
      }

      pdf.setFontSize(7.5);
      const clipped = fitText(val, col.width);
      const textY = y + 4.1;

      if (col.align === 'right') {
        pdf.text(clipped, x + col.width - 1.5, textY, { align: 'right' });
      } else if (col.align === 'center') {
        pdf.text(clipped, x + col.width / 2, textY, { align: 'center' });
      } else {
        pdf.text(clipped, x + 1.5, textY);
      }

      x += col.width;
    }

    y += rowH;
  }

  // TOTAL Row
  if (y + rowH + 48 > pageHeight - 10) {
    pdf.addPage();
    y = 14;
  }

  const totalRowH = 6.5;
  let tx = marginX;
  for (let c = 0; c < cols.length; c++) {
    const col = cols[c];
    if (c === 10) {
      pdf.setFillColor(198, 239, 206); // Green fill for Total Profit
      pdf.setTextColor(0, 97, 0);
    } else {
      pdf.setFillColor(255, 242, 204); // Soft Yellow fill for TOTAL row
      pdf.setTextColor(0, 0, 0);
    }
    pdf.setDrawColor(31, 78, 121);
    pdf.setLineWidth(0.25);
    pdf.rect(tx, y, col.width, totalRowH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    const textY = y + 4.5;

    if (c === 7) {
      pdf.text('TOTAL', tx + col.width / 2, textY, { align: 'center' });
    } else if (c === 8) {
      pdf.text(formatAccountingInt(report.totalReceiving), tx + col.width - 1.5, textY, { align: 'right' });
    } else if (c === 9) {
      pdf.text(formatAccountingInt(report.totalCost), tx + col.width - 1.5, textY, { align: 'right' });
    } else if (c === 10) {
      pdf.text(formatAccountingInt(report.totalGrossProfit), tx + col.width - 1.5, textY, { align: 'right' });
    } else if (c === 11) {
      pdf.text(String(report.totalBookings), tx + col.width / 2, textY, { align: 'center' });
    }

    tx += col.width;
  }

  y += totalRowH + 6;

  // SUMMARY (Left) & BY TYPE (Middle)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(31, 78, 121);
  pdf.text('SUMMARY', marginX, y);
  pdf.text('BY TYPE', marginX + 95, y);

  y += 2;
  const summaryStartY = y;
  const summaryItems = [
    { label: 'Total Receiving (AED)', value: formatAccountingInt(report.totalReceiving) },
    { label: 'Total Cost (AED)', value: formatAccountingInt(report.totalCost) },
    { label: 'Total Gross Profit (AED)', value: formatAccountingInt(report.totalGrossProfit) },
    { label: 'Bookings', value: String(report.totalBookings) },
    { label: 'Avg Profit / Booking', value: report.avgProfitPerBooking.toFixed(2) },
    { label: 'Profit Margin', value: `${(report.profitMarginDecimal * 100).toFixed(1)}%` },
  ];

  const sumLabelW = 42;
  const sumValW = 26;
  let sy = summaryStartY;

  for (const item of summaryItems) {
    pdf.setDrawColor(208, 215, 222);
    pdf.setLineWidth(0.15);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(marginX, sy, sumLabelW, rowH, 'FD');

    pdf.setFillColor(226, 239, 218); // #E2EFDA
    pdf.rect(marginX + sumLabelW, sy, sumValW, rowH, 'FD');

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(25, 25, 25);
    pdf.text(item.label, marginX + 1.5, sy + 4.1);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(item.value, marginX + sumLabelW + sumValW - 1.5, sy + 4.1, { align: 'right' });

    sy += rowH;
  }

  // BY TYPE Table
  const btX = marginX + 95;
  const btCols = [
    { header: 'Type', width: 28, align: 'left' as const },
    { header: 'Count', width: 18, align: 'center' as const },
    { header: 'Profit (AED)', width: 26, align: 'right' as const },
  ];
  let bty = summaryStartY;

  // BY TYPE Header
  let btx = btX;
  pdf.setFillColor(31, 78, 121);
  pdf.rect(btX, bty, 72, rowH, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(255, 255, 255);
  for (const col of btCols) {
    pdf.setDrawColor(208, 215, 222);
    pdf.rect(btx, bty, col.width, rowH, 'S');
    pdf.text(col.header, btx + col.width / 2, bty + 4.1, { align: 'center' });
    btx += col.width;
  }
  bty += rowH;

  for (const row of report.byType) {
    let cx = btX;
    pdf.setDrawColor(208, 215, 222);
    pdf.setLineWidth(0.15);

    // Type
    pdf.setFillColor(255, 255, 255);
    pdf.rect(cx, bty, btCols[0].width, rowH, 'FD');
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(25, 25, 25);
    pdf.text(row.type, cx + 1.5, bty + 4.1);
    cx += btCols[0].width;

    // Count
    pdf.setFillColor(255, 255, 255);
    pdf.rect(cx, bty, btCols[1].width, rowH, 'FD');
    pdf.text(String(row.count), cx + btCols[1].width / 2, bty + 4.1, { align: 'center' });
    cx += btCols[1].width;

    // Profit (AED)
    pdf.setFillColor(198, 239, 206); // #C6EFCE
    pdf.rect(cx, bty, btCols[2].width, rowH, 'FD');
    pdf.text(formatAccountingInt(row.profit), cx + btCols[2].width - 1.5, bty + 4.1, { align: 'right' });

    bty += rowH;
  }

  pdf.save(`${report.filenameBase}.pdf`);
}
