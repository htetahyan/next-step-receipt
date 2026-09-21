'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  HelpCircle,
  FileSpreadsheet,
  Sparkles,
  Download,
  CheckSquare,
  Square,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
  Plane,
  Shield,
  Briefcase,
  Globe,
  Tag,
  Calendar,
  DollarSign,
  UserCheck
} from 'lucide-react';
import Papa from 'papaparse';
import { bulkMigrateCustomerServices } from '@/app/actions/services';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

export interface PreparedRecord {
  id: string;
  rawRowIndex: number;
  customer: {
    name: string;
    passportNo: string;
    phone: string;
    email: string;
  };
  service: {
    referenceId: string | null;
    category: string;
    status: string;
    details: Record<string, any>;
    financials: Record<string, any>;
  };
  rawRow: Record<string, any>;
  matchedExistingClient?: boolean;
  existingClientName?: string;
  existingClientId?: string;
  isIntraFileDuplicate?: boolean;
  intraFileDuplicateReason?: string;
}

export default function MigratePage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('uae-visa');
  const [isParsing, setIsParsing] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Pre-migration staged records & selection state
  const [parsedRecords, setParsedRecords] = useState<PreparedRecord[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<'all' | 'selected' | 'unselected'>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [duplicatesFilteredCount, setDuplicatesFilteredCount] = useState<number>(0);
  const [matchedClientsCount, setMatchedClientsCount] = useState<number>(0);

  // Execution & Logs
  const [log, setLog] = useState<{ type: 'info' | 'success' | 'error'; message: string; time: string }[]>([]);
  const [migrationSummary, setMigrationSummary] = useState<{
    totalSelected: number;
    createdCount: number;
    matchedCount: number;
    errorCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string, logType: 'info' | 'success' | 'error' = 'info') => {
    setLog(prev => [
      ...prev,
      {
        type: logType,
        message,
        time: new Date().toLocaleTimeString(),
      }
    ]);
  };

  // Safe getter for normalized CSV keys
  const getCSVValue = (row: any, possibleKeys: string[]): any => {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }

    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const rowKeys = Object.keys(row);
    for (const possibleKey of possibleKeys) {
      const targetClean = clean(possibleKey);
      const matchingKey = rowKeys.find(k => clean(k) === targetClean);
      if (matchingKey !== undefined && row[matchingKey] !== null) {
        return row[matchingKey];
      }
    }
    return undefined;
  };

  // Convert DMY date strings to ISO format "YYYY-MM-DD"
  const parseDateToISO = (dateStr: any): string | null => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).trim();
    if (!cleanStr || cleanStr === '-' || cleanStr === '—' || cleanStr.toLowerCase() === 'null') return null;

    const ordinalMatch = cleanStr.match(/^(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i);
    if (ordinalMatch) {
      const day = ordinalMatch[1].padStart(2, '0');
      const monthStr = ordinalMatch[2].substring(0, 3).toLowerCase();
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIdx = monthNames.indexOf(monthStr);
      if (monthIdx !== -1) {
        const month = String(monthIdx + 1).padStart(2, '0');
        const year = ordinalMatch[3];
        return `${year}-${month}-${day}`;
      }
    }

    const dmyMatch = cleanStr.match(/^(\d+)\s*[\/\-]\s*(\d+)\s*[\/\-]\s*(\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const dmyShortMatch = cleanStr.match(/^(\d+)\s*[\/\-]\s*(\d+)\s*[\/\-]\s*(\d{2})$/);
    if (dmyShortMatch) {
      const day = dmyShortMatch[1].padStart(2, '0');
      const month = dmyShortMatch[2].padStart(2, '0');
      const year = `20${dmyShortMatch[3]}`;
      return `${year}-${month}-${day}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }

    return cleanStr;
  };

  // Convert string to clean float
  const parseCSVNumber = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const cleanStr = String(val).trim().replace(/[^0-9.-]/g, '');
    if (!cleanStr || cleanStr === '-' || cleanStr === '—' || cleanStr.toLowerCase() === 'null' || cleanStr.toLowerCase() === 'unknown') {
      return null;
    }
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? null : parsed;
  };

  // Parse CSV file and stage into records without inserting into DB
  const parseCSVData = (selectedFile: File, datasetType: string) => {
    setIsParsing(true);
    setParsedRecords(null);
    setSelectedIds(new Set());
    setMigrationSummary(null);
    setProgress(0);
    setExpandedRowId(null);
    setCurrentPage(1);

    addLog(`Parsing CSV: "${selectedFile.name}" for dataset [${datasetType}]...`, 'info');

    Papa.parse(selectedFile, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        const rawRows = results.data as string[][];
        if (rawRows.length === 0) {
          addLog('No data found in the CSV file.', 'error');
          setIsParsing(false);
          toast.error('The selected CSV file is empty.');
          return;
        }

        // Detect header row dynamically
        let headerRowIndex = -1;
        const targetHeaders = [
          'customer name', 'customer id', 'customer', 'client name', 'name',
          'mode of visa', 'visa supplier', 'supplier name', 'supplier',
          'amount', 'total payment', 'payment to the suppliets', 'payment to the suppliers',
          'passport no', 'ref id', 'tour plans', 'plans', 'destination', 'route'
        ];

        for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
          const row = rawRows[r];
          if (!row || !Array.isArray(row)) continue;

          const matchCount = row.filter(cell => {
            if (!cell) return false;
            const normalized = String(cell).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (!normalized) return false;
            return targetHeaders.some(th => {
              const cleanTh = th.toLowerCase().replace(/[^a-z0-9]/g, '');
              return normalized.includes(cleanTh) || cleanTh.includes(normalized);
            });
          }).length;

          if (matchCount >= 2) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          addLog('Header row ambiguous; using line 1 as header.', 'info');
        } else {
          addLog(`Header row detected at CSV line ${headerRowIndex + 1}`, 'success');
        }

        const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
        const rows: any[] = [];
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const rawRow = rawRows[r];
          if (!rawRow || rawRow.every(cell => !String(cell || '').trim())) continue;

          const rowObj: any = {};
          headers.forEach((header, idx) => {
            const key = header || `column_${idx}`;
            rowObj[key] = rawRow[idx] !== undefined ? String(rawRow[idx]).trim() : '';
          });
          rows.push({ obj: rowObj, rowIndex: r + 1 });
        }

        const records: PreparedRecord[] = [];
        let lastRecord: PreparedRecord | null = null;
        const seenRefIds = new Set<string>();
        const seenPassportKeys = new Set<string>();
        let intraFileDuplicatesCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const { obj: row, rowIndex } = rows[i];
          try {
            const nameValue = getCSVValue(row, ['Customer Name', 'Name', 'Client Name', 'Customer']);
            const name = (nameValue && String(nameValue).trim() !== '-' && String(nameValue).trim().toLowerCase() !== 'unknown' && String(nameValue).trim().toLowerCase() !== 'null') ? String(nameValue).trim() : '';

            let cleanName = name;
            let partySuffix = '';
            const partyMatch = name.match(/^(.*?)\s*\+\s*(\d+)$/);
            if (partyMatch) {
              cleanName = partyMatch[1].trim();
              partySuffix = `+${partyMatch[2]}`;
            }

            // Sub-row merge if customer name is missing
            if (!cleanName) {
              const subDest = getCSVValue(row, ['Tour Plans', 'Plans', 'Description', 'Destination', 'Route', 'To', 'Mode of Visa/ Extension', 'Mode/Category', 'Category', 'Visa Type']) || '';
              const subAmount = parseCSVNumber(getCSVValue(row, ['Amount', 'Amount Charged', 'Total Payment'])) ?? 0;
              const subCost = parseCSVNumber(getCSVValue(row, ['Payment to the suppliets', 'Payment to the suppliers', 'Payment amount to airline', 'Airline Cost', 'Supplier Cost', 'Visa fees to Supplier'])) ?? 0;
              const subNotes = getCSVValue(row, ['Remark', 'Note', 'Notes', 'Comments']) || '';

              const hasSubContent = !!subDest || subAmount > 0 || subCost > 0 || !!subNotes;
              if (hasSubContent && lastRecord) {
                const targetField = datasetType === 'uae-visa' ? 'visa_duration' : datasetType === 'tour-package' ? 'tour_plans' : 'destination';
                const existingDest = lastRecord.service.details[targetField] || '';
                if (subDest) {
                  lastRecord.service.details[targetField] = existingDest ? `${existingDest} + ${subDest}` : subDest;
                }
                if (subAmount > 0) {
                  lastRecord.service.financials.amount = (lastRecord.service.financials.amount || 0) + subAmount;
                }
                if (subCost > 0) {
                  lastRecord.service.financials.supplier_cost = (lastRecord.service.financials.supplier_cost || 0) + subCost;
                }
                if (subNotes) {
                  const targetNotesField = datasetType === 'air-ticket' ? 'notes' : 'comments';
                  const existingNotes = lastRecord.service.details[targetNotesField] || '';
                  lastRecord.service.details[targetNotesField] = existingNotes ? `${existingNotes} | ${subNotes}` : subNotes;
                }

                lastRecord.service.financials.receiving_amount = (lastRecord.service.financials.amount || 0) - (lastRecord.service.financials.discount || 0);
                lastRecord.service.financials.balance = (lastRecord.service.financials.receiving_amount || 0) - (lastRecord.service.financials.supplier_cost || 0);

                addLog(`Merged sub-row ${rowIndex} into "${lastRecord.customer.name}" (+${subAmount} AED AMT)`, 'info');
              }
              continue;
            }

            const rawPassport = getCSVValue(row, ['Passport No', 'Passport Number', 'Passport']);
            const passportNo = (rawPassport && String(rawPassport).trim() !== '-') ? String(rawPassport).trim().replace(/\s+/g, '').toUpperCase() : '';

            const rawPhone = getCSVValue(row, ['Phone No/Contact', 'Phone', 'Contact', 'Phone No', 'Contact No']);
            const phone = (rawPhone && String(rawPhone).trim() !== '-') ? String(rawPhone).trim() : '';

            const rawEmail = getCSVValue(row, ['Email Address', 'Email', 'Mail']);
            const email = (rawEmail && String(rawEmail).trim() !== '-') ? String(rawEmail).trim() : '';

            let serviceData: any = {
              status: 'Open',
              details: {},
              financials: {}
            };

            const paymentValue = getCSVValue(row, ['Payment', 'Payment Method', 'Payment Mode']);
            const paymentMethod = (paymentValue && String(paymentValue).trim() !== '-') ? String(paymentValue).trim() : 'Bank Transfer';

            const categoryValue = getCSVValue(row, ['Mode of Visa/ Extension', 'Mode/Category', 'Category', 'Visa Type']);
            let category = String(categoryValue || '').trim();

            if (datasetType === 'uae-visa') {
              const refIdValue = getCSVValue(row, ['Customer ID', 'Ref ID', 'ID', 'Reference ID']);
              serviceData.referenceId = (refIdValue && String(refIdValue).trim() !== '-' && String(refIdValue).trim().toLowerCase() !== 'unknown') ? String(refIdValue).trim() : null;

              const durationValue = getCSVValue(row, ['Visa Duration', 'Duration']);
              const duration = (durationValue && String(durationValue).trim() !== '-') ? String(durationValue).trim() : '30 days';

              if (!category || category === '-') {
                if (duration.toLowerCase().includes('60')) {
                  category = 'UAE Visit Visa 60 Days';
                } else if (duration.toLowerCase().includes('change') || duration.toLowerCase().includes('extension')) {
                  category = 'Inside Visa Extension';
                } else {
                  category = 'UAE Visit Visa 30 Days';
                }
              }

              serviceData.category = category;

              const issuedDate = parseDateToISO(getCSVValue(row, ['Visa Issued date', 'Issued Date', 'Visa Issued']));
              const travelDate = parseDateToISO(getCSVValue(row, ['Travel Date', 'Travel']));
              let expiryDate = parseDateToISO(getCSVValue(row, ['Visa Expiry Date', 'Expiry Date', 'Visa Expiry']));

              if (!expiryDate && travelDate) {
                const isBusOrAirChange = category === 'Visa Change by Bus' || category === 'Visa Change by Air';
                let daysToAdd = 60;

                if (!isBusOrAirChange) {
                  const durationStr = String(getCSVValue(row, ['Visa Duration', 'Duration']) || '').toLowerCase();
                  if (durationStr.includes('90')) daysToAdd = 90;
                  else if (durationStr.includes('60')) daysToAdd = 60;
                  else if (durationStr.includes('30')) daysToAdd = 30;
                  else if (durationStr.includes('14')) daysToAdd = 14;
                  else daysToAdd = 30;
                }

                const tDate = new Date(travelDate);
                if (!isNaN(tDate.getTime())) {
                  tDate.setDate(tDate.getDate() + daysToAdd);
                  const yyyy = tDate.getFullYear();
                  const mm = String(tDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(tDate.getDate()).padStart(2, '0');
                  expiryDate = `${yyyy}-${mm}-${dd}`;
                }
              }

              const supplier = getCSVValue(row, ['Visa Supplier', 'Supplier']);

              serviceData.details = {
                visa_issued_date: issuedDate,
                travel_date: travelDate,
                visa_expiry_date: expiryDate,
                visa_supplier: (supplier && String(supplier).trim() !== '-' && String(supplier).trim().toLowerCase() !== 'unknown') ? String(supplier).trim() : 'DAHR',
                visa_duration: duration,
                payment_method: paymentMethod,
                referred_by: (getCSVValue(row, ['Referred By:', 'Referred By', 'Referral']) && String(getCSVValue(row, ['Referred By:', 'Referred By', 'Referral'])).trim().toLowerCase() !== 'unknown') ? String(getCSVValue(row, ['Referred By:', 'Referred By', 'Referral'])).trim() : '',
                comments: (getCSVValue(row, ['Comments', 'Notes']) && String(getCSVValue(row, ['Comments', 'Notes'])).trim().toLowerCase() !== 'unknown') ? String(getCSVValue(row, ['Comments', 'Notes'])).trim() : '',
                remark: (getCSVValue(row, ['Remark', 'Remarks']) && String(getCSVValue(row, ['Remark', 'Remarks'])).trim().toLowerCase() !== 'unknown') ? String(getCSVValue(row, ['Remark', 'Remarks'])).trim() : '',
                legacy_row: row,
              };

              const rawAmount = parseCSVNumber(getCSVValue(row, ['Amount', 'Amount Charged'])) ?? 0;
              const rawDiscount = parseCSVNumber(getCSVValue(row, ['Discount/                                    Agent fees', 'Discount', 'Agent Fees', 'Discount/ Agent fees'])) ?? 0;
              const rawReceivingVal = parseCSVNumber(getCSVValue(row, ['Receiving Amount', 'Paid Amount', 'Receiving']));
              const rawReceiving = rawReceivingVal !== null ? rawReceivingVal : (rawAmount - rawDiscount);
              const rawCost = parseCSVNumber(getCSVValue(row, ['Visa fees to Supplier', 'Supplier Cost', 'Airline Cost'])) ?? 0;
              const rawRefund = parseCSVNumber(getCSVValue(row, ['Refund', 'Refund Amount'])) ?? 0;
              const rawBalanceVal = parseCSVNumber(getCSVValue(row, ['Balance', 'Outstanding']));
              const rawBalance = rawBalanceVal !== null ? rawBalanceVal : (rawReceiving - rawCost);

              serviceData.financials = {
                amount: rawAmount,
                discount: rawDiscount,
                receiving_amount: rawReceiving,
                supplier_cost: rawCost,
                refund: rawRefund,
                balance: rawBalance,
                payment_method: paymentMethod,
              };

            } else if (datasetType === 'air-ticket') {
              const refIdValue = getCSVValue(row, ['Customer ID', 'Ref ID', 'ID', 'Reference ID']);
              serviceData.referenceId = (refIdValue && String(refIdValue).trim() !== '-' && String(refIdValue).trim().toLowerCase() !== 'unknown') ? String(refIdValue).trim() : null;
              serviceData.category = 'Air Ticket';

              serviceData.details = {
                destination: getCSVValue(row, ['Destination', 'Route', 'To']) || '',
                departure_date: parseDateToISO(getCSVValue(row, ['Departure Date', 'Travel Date', 'Date'])),
                departure_time: getCSVValue(row, ['Departure Time', 'Departure time', 'Time']) || null,
                booking_date: parseDateToISO(getCSVValue(row, ['Booking Date', 'Bookig date', 'Bookig date ', 'Booking date', 'Issued Date'])),
                handled_by: getCSVValue(row, ['Handled By', 'Agent']) || '',
                notes: getCSVValue(row, ['Note', 'Notes', 'Comments']) || '',
                remark: getCSVValue(row, ['Remarks', 'Remark']) || '',
                legacy_row: row,
              };

              const rawAmount = parseCSVNumber(getCSVValue(row, ['Amount', 'Amount Charged'])) ?? 0;
              const rawCost = parseCSVNumber(getCSVValue(row, ['Payment amount to airline', 'Airline Cost', 'Supplier Cost'])) ?? 0;

              serviceData.financials = {
                amount: rawAmount,
                discount: 0,
                receiving_amount: rawAmount,
                supplier_cost: rawCost,
                refund: 0,
                balance: rawAmount - rawCost,
                payment_method: paymentMethod,
              };

            } else if (datasetType === 'tour-package') {
              const refIdValue = getCSVValue(row, ['Customer ID', 'Ref ID', 'ID', 'Reference ID', 'NO']);
              serviceData.referenceId = (refIdValue && String(refIdValue).trim() !== '-' && String(refIdValue).trim().toLowerCase() !== 'unknown') ? `TP-${String(refIdValue).trim()}` : null;
              serviceData.category = 'Tour Package';

              serviceData.details = {
                travel_date: parseDateToISO(getCSVValue(row, ['Date', 'Travel Date'])),
                supplier_name: getCSVValue(row, ['Supplier Name', 'Supplier']) || '',
                tour_plans: getCSVValue(row, ['Tour Plans', 'Plans', 'Description']) || '',
                referred_by: getCSVValue(row, ['Referred By', 'Agent']) || '',
                comments: getCSVValue(row, ['Remark', 'Notes']) || '',
                remark: getCSVValue(row, ['Remark']) || '',
                legacy_row: row,
              };

              const rawAmount = parseCSVNumber(getCSVValue(row, ['Amount', 'Amount Charged'])) ?? 0;
              const rawDiscount = parseCSVNumber(getCSVValue(row, ['Discount'])) ?? 0;
              const rawReceivingVal = parseCSVNumber(getCSVValue(row, ['Total Payment', 'Receiving']));
              const rawReceiving = rawReceivingVal !== null ? rawReceivingVal : (rawAmount - rawDiscount);
              const rawCost = parseCSVNumber(getCSVValue(row, ['Payment to the suppliets', 'Payment to the suppliers', 'Supplier Cost'])) ?? 0;
              const rawGP = parseCSVNumber(getCSVValue(row, ['GP', 'Gross Profit']));
              const rawBalance = rawGP !== null ? rawGP : (rawReceiving - rawCost);

              serviceData.financials = {
                amount: rawAmount,
                discount: rawDiscount,
                receiving_amount: rawReceiving,
                supplier_cost: rawCost,
                refund: 0,
                balance: rawBalance,
                payment_method: paymentMethod,
              };

            } else {
              const refIdValue = getCSVValue(row, ['Customer ID', 'Ref ID', 'ID', 'Reference ID']);
              serviceData.referenceId = (refIdValue && String(refIdValue).trim() !== '-' && String(refIdValue).trim().toLowerCase() !== 'unknown') ? String(refIdValue).trim() : null;
              serviceData.category = category || 'Other Country Visa';

              serviceData.details = {
                destination: getCSVValue(row, ['Destination', 'Country', 'To']) || '',
                application_date: parseDateToISO(getCSVValue(row, ['Application Date', 'Issued Date'])),
                travel_period: getCSVValue(row, ['Travel Period', 'Duration']) || '',
                handled_by: getCSVValue(row, ['Handled By', 'Agent']) || '',
                notes: getCSVValue(row, ['Comments', 'Notes', 'Remark']) || '',
                legacy_row: row,
              };

              const rawAmount = parseCSVNumber(getCSVValue(row, ['Amount', 'Amount Charged'])) ?? 0;
              const rawCost = parseCSVNumber(getCSVValue(row, ['Embassy Fee', 'Supplier Cost'])) ?? 0;
              const rawReceivingVal = parseCSVNumber(getCSVValue(row, ['Receiving Amount', 'Paid Amount', 'Receiving']));
              const rawReceiving = rawReceivingVal !== null ? rawReceivingVal : rawAmount;

              serviceData.financials = {
                amount: rawAmount,
                discount: 0,
                receiving_amount: rawReceiving,
                supplier_cost: rawCost,
                refund: 0,
                balance: rawReceiving - rawCost,
                payment_method: paymentMethod,
              };
            }

            if (partySuffix && serviceData.details) {
              serviceData.details.remark = serviceData.details.remark ? `${serviceData.details.remark} (${partySuffix})` : partySuffix;
            }

            const recordId = `rec-${records.length + 1}-${Math.random().toString(36).substring(2, 7)}`;
            const prepared: PreparedRecord = {
              id: recordId,
              rawRowIndex: rowIndex,
              customer: {
                name: cleanName,
                passportNo,
                phone,
                email
              },
              service: serviceData,
              rawRow: row
            };

            let isDuplicate = false;
            let dupReason = '';

            // Check reference ID intra-file duplication
            if (serviceData.referenceId) {
              if (seenRefIds.has(serviceData.referenceId)) {
                isDuplicate = true;
                dupReason = `Duplicate Ref ID: ${serviceData.referenceId}`;
              }
              seenRefIds.add(serviceData.referenceId);
            }

            // Check passport + name intra-file duplication
            const passportKey = passportNo ? `${passportNo}|${cleanName.toLowerCase()}` : '';
            if (!isDuplicate && passportKey) {
              if (seenPassportKeys.has(passportKey)) {
                isDuplicate = true;
                dupReason = `Duplicate Passport & Name: ${passportNo}`;
              }
              seenPassportKeys.add(passportKey);
            }

            if (isDuplicate) {
              prepared.isIntraFileDuplicate = true;
              prepared.intraFileDuplicateReason = dupReason;
              intraFileDuplicatesCount++;
            }

            records.push(prepared);
            lastRecord = prepared;

          } catch (e: any) {
            addLog(`Row ${rowIndex} Format Error: ${e.message}`, 'error');
          }
        }

        setParsedRecords(records);
        // Pre-select ALL records by default, except duplicates
        setSelectedIds(new Set(records.filter(r => !r.isIntraFileDuplicate).map(r => r.id)));
        setDuplicatesFilteredCount(intraFileDuplicatesCount);
        setIsParsing(false);
        addLog(`Parsed ${records.length} records. Found ${intraFileDuplicatesCount} intra-file duplicates.`, 'success');
        toast.success(`Parsed ${records.length} records. Inspect and select rows below.`);
      },
      error: (error) => {
        addLog(`CSV Parse Error: ${error.message}`, 'error');
        setIsParsing(false);
        toast.error('Failed to parse CSV file.');
      }
    });
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseCSVData(selectedFile, type);
    }
  };

  // Handle dataset type change (re-parse if file is already selected)
  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (file) {
      parseCSVData(file, newType);
    }
  };

  // Selection handlers
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!parsedRecords) return;
    setSelectedIds(new Set(parsedRecords.map(r => r.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Filtered preview records based on search and scope
  const filteredRecords = useMemo(() => {
    if (!parsedRecords) return [];
    return parsedRecords.filter(rec => {
      // Filter by selection scope
      if (filterScope === 'selected' && !selectedIds.has(rec.id)) return false;
      if (filterScope === 'unselected' && selectedIds.has(rec.id)) return false;

      // Filter by text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rec.customer.name.toLowerCase().includes(q);
        const matchPassport = rec.customer.passportNo.toLowerCase().includes(q);
        const matchRef = (rec.service.referenceId || '').toLowerCase().includes(q);
        const matchCategory = rec.service.category.toLowerCase().includes(q);
        const matchPhone = rec.customer.phone.toLowerCase().includes(q);
        const matchSupplier = (rec.service.details?.visa_supplier || rec.service.details?.supplier_name || '').toLowerCase().includes(q);
        if (!matchName && !matchPassport && !matchRef && !matchCategory && !matchPhone && !matchSupplier) {
          return false;
        }
      }
      return true;
    });
  }, [parsedRecords, selectedIds, filterScope, searchQuery]);

  // Master checkbox status for visible filtered rows
  const isAllFilteredSelected = filteredRecords.length > 0 && filteredRecords.every(r => selectedIds.has(r.id));
  const isSomeFilteredSelected = filteredRecords.some(r => selectedIds.has(r.id)) && !isAllFilteredSelected;

  const handleToggleFilteredAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredRecords.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filteredRecords.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  // Paginated records
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  // Selected financial aggregates
  const selectedStats = useMemo(() => {
    if (!parsedRecords) return { count: 0, totalAmount: 0, totalCost: 0, totalProfit: 0 };
    let count = 0;
    let totalAmount = 0;
    let totalCost = 0;

    parsedRecords.forEach(rec => {
      if (selectedIds.has(rec.id)) {
        count++;
        totalAmount += Number(rec.service.financials?.amount || 0);
        totalCost += Number(rec.service.financials?.supplier_cost || 0);
      }
    });

    return {
      count,
      totalAmount,
      totalCost,
      totalProfit: totalAmount - totalCost,
    };
  }, [parsedRecords, selectedIds]);

  // Reset entire staging
  const handleReset = () => {
    setFile(null);
    setParsedRecords(null);
    setSelectedIds(new Set());
    setSearchQuery('');
    setLog([]);
    setProgress(0);
    setMigrationSummary(null);
    setExpandedRowId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Execute migration on ONLY selected records
  const executeMigration = async () => {
    if (!parsedRecords || selectedIds.size === 0) {
      toast.error('Please select at least one record to migrate');
      return;
    }

    const recordsToMigrate = parsedRecords
      .filter(rec => selectedIds.has(rec.id))
      .map(rec => ({
        customer: rec.customer,
        service: rec.service,
      }));

    setIsMigrating(true);
    setProgress(0);
    addLog(`Initiating migration for ${recordsToMigrate.length} selected records...`, 'info');

    let createdCount = 0;
    let matchedCount = 0;
    let errorCount = 0;

    const chunkSize = 50;
    for (let chunkIdx = 0; chunkIdx < recordsToMigrate.length; chunkIdx += chunkSize) {
      const chunk = recordsToMigrate.slice(chunkIdx, chunkIdx + chunkSize);
      const batchNum = Math.floor(chunkIdx / chunkSize) + 1;
      const totalBatches = Math.ceil(recordsToMigrate.length / chunkSize);

      addLog(`Processing batch ${batchNum} of ${totalBatches} (${chunkIdx + 1} to ${Math.min(chunkIdx + chunkSize, recordsToMigrate.length)})...`, 'info');

      try {
        const response = await bulkMigrateCustomerServices(chunk);
        if (response && response.data && response.data.success) {
          const { results, summary } = response.data;
          createdCount += summary.createdCount;
          matchedCount += summary.matchedCount;
          errorCount += summary.errorCount;

          results.forEach((res: any) => {
            addLog(res.message, res.success ? 'success' : 'error');
          });
        } else {
          addLog(`Batch ${batchNum} encountered a server failure.`, 'error');
          errorCount += chunk.length;
        }
      } catch (err: any) {
        addLog(`Batch ${batchNum} error: ${err.message}`, 'error');
        errorCount += chunk.length;
      }

      setProgress(Math.round((Math.min(chunkIdx + chunkSize, recordsToMigrate.length) / recordsToMigrate.length) * 100));
    }

    setIsMigrating(false);
    setMigrationSummary({
      totalSelected: recordsToMigrate.length,
      createdCount,
      matchedCount,
      errorCount,
    });
    addLog(
      `MIGRATION FINISHED. Selected: ${recordsToMigrate.length}, New Profiles Created: ${createdCount}, Matched/Deduplicated: ${matchedCount}, Errors: ${errorCount}`,
      'success'
    );
    toast.success(`Migration completed! Created: ${createdCount}, Matched: ${matchedCount}`);
  };

  // Full SQL export
  const [exportingSql, setExportingSql] = useState(false);
  const supabase = createClient();

  const exportFullDatabaseSql = async () => {
    setExportingSql(true);
    toast.info('Preparing database SQL export...');
    try {
      const [customersRes, servicesRes, invoicesRes, itemsRes, suppliersRes] = await Promise.all([
        supabase.from('customers').select('id, name, phone, email, passport_no, metadata, created_at').order('created_at', { ascending: true }),
        supabase.from('customer_services').select('id, customer_id, reference_id, category, status, details, financials, created_at').order('created_at', { ascending: true }),
        supabase.from('invoices').select('id, customer_id, invoice_number, date, subtotal, vat_amount, total_amount, payment_method, created_at').order('created_at', { ascending: true }),
        supabase.from('invoice_items').select('id, invoice_id, description, quantity, rate, amount'),
        supabase.from('suppliers').select('id, name, services, created_at').order('created_at', { ascending: true })
      ]);

      const sqlLines: string[] = [];
      const timestamp = new Date().toISOString();

      sqlLines.push(`-- NextStep Database Full SQL Export`);
      sqlLines.push(`-- Generated: ${timestamp}\n`);

      if (customersRes.data && customersRes.data.length > 0) {
        sqlLines.push(`-- 1. Customers (${customersRes.data.length} records)`);
        customersRes.data.forEach((c: any) => {
          const name = String(c.name || '').replace(/'/g, "''");
          const phone = c.phone ? `'${String(c.phone).replace(/'/g, "''")}'` : 'NULL';
          const email = c.email ? `'${String(c.email).replace(/'/g, "''")}'` : 'NULL';
          const passport = c.passport_no ? `'${String(c.passport_no).replace(/'/g, "''")}'` : 'NULL';
          const metadata = JSON.stringify(c.metadata || {}).replace(/'/g, "''");
          const createdAt = c.created_at ? `'${c.created_at}'` : 'NOW()';
          sqlLines.push(`INSERT INTO customers (id, name, phone, email, passport_no, metadata, created_at) VALUES ('${c.id}', '${name}', ${phone}, ${email}, ${passport}, '${metadata}', ${createdAt}) ON CONFLICT (id) DO NOTHING;`);
        });
        sqlLines.push('');
      }

      if (suppliersRes.data && suppliersRes.data.length > 0) {
        sqlLines.push(`-- 2. Suppliers (${suppliersRes.data.length} records)`);
        suppliersRes.data.forEach((s: any) => {
          const name = String(s.name || '').replace(/'/g, "''");
          const services = JSON.stringify(s.services || []).replace(/'/g, "''");
          const createdAt = s.created_at ? `'${s.created_at}'` : 'NOW()';
          sqlLines.push(`INSERT INTO suppliers (id, name, services, created_at) VALUES ('${s.id}', '${name}', '${services}', ${createdAt}) ON CONFLICT (id) DO NOTHING;`);
        });
        sqlLines.push('');
      }

      if (servicesRes.data && servicesRes.data.length > 0) {
        sqlLines.push(`-- 3. Customer Services (${servicesRes.data.length} records)`);
        servicesRes.data.forEach((s: any) => {
          const custId = s.customer_id ? `'${s.customer_id}'` : 'NULL';
          const refId = s.reference_id ? `'${String(s.reference_id).replace(/'/g, "''")}'` : 'NULL';
          const cat = String(s.category || '').replace(/'/g, "''");
          const status = String(s.status || '').replace(/'/g, "''");
          const details = JSON.stringify(s.details || {}).replace(/'/g, "''");
          const financials = JSON.stringify(s.financials || {}).replace(/'/g, "''");
          const createdAt = s.created_at ? `'${s.created_at}'` : 'NOW()';
          sqlLines.push(`INSERT INTO customer_services (id, customer_id, reference_id, category, status, details, financials, created_at) VALUES ('${s.id}', ${custId}, ${refId}, '${cat}', '${status}', '${details}', '${financials}', ${createdAt}) ON CONFLICT (id) DO NOTHING;`);
        });
        sqlLines.push('');
      }

      if (invoicesRes.data && invoicesRes.data.length > 0) {
        sqlLines.push(`-- 4. Invoices (${invoicesRes.data.length} records)`);
        invoicesRes.data.forEach((inv: any) => {
          const custId = inv.customer_id ? `'${inv.customer_id}'` : 'NULL';
          const invNo = String(inv.invoice_number || '').replace(/'/g, "''");
          const date = inv.date ? `'${inv.date}'` : 'NULL';
          const subtotal = inv.subtotal ? `'${inv.subtotal}'` : "'0'";
          const vat = inv.vat_amount ? `'${inv.vat_amount}'` : "'0'";
          const total = inv.total_amount ? `'${inv.total_amount}'` : "'0'";
          const payMode = inv.payment_method ? `'${String(inv.payment_method).replace(/'/g, "''")}'` : "'cash'";
          const createdAt = inv.created_at ? `'${inv.created_at}'` : 'NOW()';
          sqlLines.push(`INSERT INTO invoices (id, customer_id, invoice_number, date, subtotal, vat_amount, total_amount, payment_method, created_at) VALUES ('${inv.id}', ${custId}, '${invNo}', ${date}, ${subtotal}, ${vat}, ${total}, ${payMode}, ${createdAt}) ON CONFLICT (id) DO NOTHING;`);
        });
        sqlLines.push('');
      }

      if (itemsRes.data && itemsRes.data.length > 0) {
        sqlLines.push(`-- 5. Invoice Items (${itemsRes.data.length} records)`);
        itemsRes.data.forEach((item: any) => {
          const invId = `'${item.invoice_id}'`;
          const desc = String(item.description || '').replace(/'/g, "''");
          const qty = item.quantity ? `'${item.quantity}'` : "'1'";
          const rate = item.rate ? `'${item.rate}'` : "'0'";
          const amount = item.amount ? `'${item.amount}'` : "'0'";
          sqlLines.push(`INSERT INTO invoice_items (id, invoice_id, description, quantity, rate, amount) VALUES ('${item.id}', ${invId}, '${desc}', ${qty}, ${rate}, ${amount}) ON CONFLICT (id) DO NOTHING;`);
        });
        sqlLines.push('');
      }

      const sqlContent = sqlLines.join('\n');
      const blob = new Blob([sqlContent], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `nextstep_database_backup_${dateStr}.sql`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Downloaded Full Database SQL Backup (.sql)!');
    } catch (e: any) {
      console.error(e);
      toast.error(`SQL Export failed: ${e.message}`);
    } finally {
      setExportingSql(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Page Title & SQL Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--card-border)] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[var(--foreground)] flex items-center gap-2.5">
            <Database className="h-6 w-6 text-[#D97757]" />
            Dynamic Data Migration & Staging
          </h1>
          <p className="text-xs opacity-60 mt-1">
            Inspect, select, and import legacy CSV spreadsheets into your database with full deduplication.
          </p>
        </div>

        <button
          onClick={exportFullDatabaseSql}
          disabled={exportingSql}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] hover:bg-[var(--card-border)] text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          {exportingSql ? <Loader2 className="w-4 h-4 animate-spin text-[#D97757]" /> : <Download className="w-4 h-4 text-[#D97757]" />}
          <span>Export SQL Backup (.sql)</span>
        </button>
      </div>

      {/* Step 1: Upload & Configuration Card */}
      <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#D97757] text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm font-serif font-semibold text-[var(--foreground)]">
              Choose Dataset & Upload Spreadsheet
            </h2>
          </div>
          {parsedRecords && (
            <button
              onClick={handleReset}
              disabled={isMigrating}
              className="inline-flex items-center gap-1.5 text-xs text-[#D97757] hover:underline cursor-pointer font-medium disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset & Choose Different File
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Dataset Type */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold opacity-70">
              Dataset Type
            </label>
            <div className="relative">
              <select
                value={type}
                onChange={e => handleTypeChange(e.target.value)}
                disabled={isMigrating || isParsing}
                className="input-anthropic w-full p-2.5 text-xs font-semibold"
              >
                <option value="uae-visa">UAE Visa Tracker (Visas, Extensions, Bus/Air Change)</option>
                <option value="air-ticket">Air Tickets & Flights</option>
                <option value="tour-package">Tour Packages & Itineraries</option>
                <option value="other-visa">Other Country Visas</option>
              </select>
            </div>
          </div>

          {/* File Picker */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold opacity-70">
              Select CSV File
            </label>
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isMigrating || isParsing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
              />
              <div className="input-anthropic w-full p-2.5 text-xs flex items-center justify-between font-medium cursor-pointer">
                <span className="truncate opacity-75">
                  {file ? file.name : 'Choose a .csv file...'}
                </span>
                <UploadCloud className="h-4 w-4 text-[#D97757] shrink-0 ml-2" />
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="md:col-span-3">
            <button
              onClick={() => file && parseCSVData(file, type)}
              disabled={!file || isParsing || isMigrating}
              className="w-full py-2.5 bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#D97757]/40 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D97757]" />
                  <span>Parsing CSV...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#D97757]" />
                  <span>Re-parse / Inspect</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Smart Auto-Mapping Banner */}
        <div className="bg-[#D97757]/5 border border-[#D97757]/20 p-3.5 rounded-xl flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#D97757] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[var(--foreground)] opacity-80 leading-relaxed">
            <strong>Smart Auto-Mapping Active:</strong> Automatically normalizes headers (e.g. <code>Discount/ Agent fees</code>, <code>Visa Duration</code>, <code>Payment to Suppliers</code>) and dates with spaces (e.g. <code>16 / 09/ 2025</code>).
          </p>
        </div>
      </div>

      {/* Step 2: Pre-Migration Data Inspection Workspace */}
      {parsedRecords && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Aggregate KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="card-anthropic p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block">Total Parsed</span>
              <p className="text-lg font-mono font-bold text-[var(--foreground)] mt-0.5">
                {parsedRecords.length} <span className="text-xs font-normal opacity-50">rows</span>
              </p>
            </div>

            <div className="card-anthropic p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-600 block">File Duplicates</span>
              <p className="text-lg font-mono font-bold text-amber-600 mt-0.5">
                {duplicatesFilteredCount} <span className="text-xs font-normal opacity-70">ignored</span>
              </p>
            </div>

            <div className="card-anthropic p-3 rounded-xl border border-[#D97757]/30 bg-[#D97757]/5 shadow-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D97757] block">Selected to Insert</span>
              <p className="text-lg font-mono font-bold text-[#D97757] mt-0.5">
                {selectedStats.count} <span className="text-xs font-normal opacity-70">({Math.round((selectedStats.count / (parsedRecords.length || 1)) * 100)}%)</span>
              </p>
            </div>

            <div className="card-anthropic p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block">Selected Revenue</span>
              <p className="text-lg font-mono font-bold text-[var(--foreground)] mt-0.5">
                {selectedStats.totalAmount.toLocaleString()} <span className="text-[10px] opacity-50">AED</span>
              </p>
            </div>

            <div className="card-anthropic p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block">Supplier Cost</span>
              <p className="text-lg font-mono font-bold text-[var(--foreground)] mt-0.5">
                {selectedStats.totalCost.toLocaleString()} <span className="text-[10px] opacity-50">AED</span>
              </p>
            </div>

            <div className="card-anthropic p-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block">Projected Profit</span>
              <p className={`text-lg font-mono font-bold mt-0.5 ${selectedStats.totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {selectedStats.totalProfit.toLocaleString()} <span className="text-[10px] opacity-50">AED</span>
              </p>
            </div>
          </div>

          {/* Interactive Inspection Table Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-xs overflow-hidden">
            {/* Table Control Header */}
            <div className="p-4 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left Controls: Select All / Deselect All / Scope Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  disabled={isMigrating}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] hover:bg-[var(--sidebar-bg)] text-xs font-medium transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#D97757]" />
                  <span>Select All ({parsedRecords.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isMigrating}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] hover:bg-[var(--sidebar-bg)] text-xs font-medium transition-colors cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 opacity-60" />
                  <span>Deselect All</span>
                </button>

                <div className="h-4 w-[1px] bg-[var(--card-border)] hidden sm:block mx-1" />

                {/* Scope Filter Chips */}
                <div className="flex items-center bg-[var(--background)] p-0.5 rounded-lg border border-[var(--card-border)] text-xs">
                  <button
                    type="button"
                    onClick={() => { setFilterScope('all'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${filterScope === 'all' ? 'bg-[#D97757] text-[#F5F4EF]' : 'opacity-60 hover:opacity-100'}`}
                  >
                    All ({parsedRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilterScope('selected'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${filterScope === 'selected' ? 'bg-[#D97757] text-[#F5F4EF]' : 'opacity-60 hover:opacity-100'}`}
                  >
                    Selected ({selectedIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setFilterScope('unselected'); setCurrentPage(1); }}
                    className={`px-2.5 py-1 rounded-md transition-all font-medium ${filterScope === 'unselected' ? 'bg-[#D97757] text-[#F5F4EF]' : 'opacity-60 hover:opacity-100'}`}
                  >
                    Unselected ({parsedRecords.length - selectedIds.size})
                  </button>
                </div>
              </div>

              {/* Right Search Input */}
              <div className="relative min-w-[220px]">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none opacity-40">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Filter name, passport, ref..."
                  className="input-anthropic w-full pl-8 pr-7 py-1.5 text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center opacity-50 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Records Table */}
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] uppercase tracking-wider text-[10px] opacity-70 font-mono">
                  <tr>
                    <th className="px-3 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        ref={el => { if (el) el.indeterminate = isSomeFilteredSelected; }}
                        onChange={handleToggleFilteredAll}
                        className="rounded border-[var(--card-border)] text-[#D97757] focus:ring-[#D97757] cursor-pointer"
                      />
                    </th>
                    <th className="px-2 py-3 w-12 text-center">#</th>
                    <th className="px-3 py-3">Ref ID</th>
                    <th className="px-4 py-3">Customer Profile</th>
                    <th className="px-3 py-3">Passport No</th>
                    <th className="px-3 py-3">Category / Service</th>
                    <th className="px-3 py-3">Key Dates</th>
                    <th className="px-3 py-3 text-right">Amount (AED)</th>
                    <th className="px-3 py-3 text-right">Cost (AED)</th>
                    <th className="px-3 py-3 text-right">Profit</th>
                    <th className="px-3 py-3 w-12 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {paginatedRecords.map((rec, idx) => {
                    const isSelected = selectedIds.has(rec.id);
                    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isExpanded = expandedRowId === rec.id;

                    const amount = Number(rec.service.financials?.amount || 0);
                    const cost = Number(rec.service.financials?.supplier_cost || 0);
                    const profit = amount - cost;

                    const travelDate = rec.service.details?.travel_date || rec.service.details?.departure_date || '';
                    const expiryDate = rec.service.details?.visa_expiry_date || '';

                    return (
                      <React.Fragment key={rec.id}>
                        <tr
                          onClick={() => handleToggleSelectRow(rec.id)}
                          className={`hover:bg-[var(--sidebar-bg)] transition-colors cursor-pointer select-none ${
                            isSelected ? 'bg-[#D97757]/5 dark:bg-[#D97757]/10' : 'opacity-60 hover:opacity-90'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(rec.id)}
                              className="rounded border-[var(--card-border)] text-[#D97757] focus:ring-[#D97757] cursor-pointer"
                            />
                          </td>

                          {/* Index */}
                          <td className="px-2 py-2.5 text-center font-mono text-[11px] opacity-40">
                            {globalIdx}
                          </td>

                          {/* Ref ID */}
                          <td className="px-3 py-2.5">
                            {rec.service.referenceId ? (
                              <span className="font-mono font-bold text-[#D97757] text-[11px] bg-[var(--background)] px-1.5 py-0.5 rounded border border-[var(--card-border)]">
                                {rec.service.referenceId}
                              </span>
                            ) : (
                              <span className="text-[10px] opacity-40 font-mono">—</span>
                            )}
                          </td>

                          {/* Customer Profile */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-[var(--foreground)] truncate max-w-[180px]">
                                {rec.customer.name}
                              </div>
                              {rec.isIntraFileDuplicate && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10" title={rec.intraFileDuplicateReason}>
                                  Duplicate
                                </span>
                              )}
                            </div>
                            {(rec.customer.phone || rec.customer.email) && (
                              <div className="text-[10px] opacity-50 truncate max-w-[180px]">
                                {rec.customer.phone || rec.customer.email}
                              </div>
                            )}
                          </td>

                          {/* Passport */}
                          <td className="px-3 py-2.5 font-mono text-[11px]">
                            {rec.customer.passportNo ? (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--card-border)]">
                                {rec.customer.passportNo}
                              </span>
                            ) : (
                              <span className="text-amber-500 text-[10px]">No Passport</span>
                            )}
                          </td>

                          {/* Category */}
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] font-medium block truncate max-w-[160px]">
                              {rec.service.category}
                            </span>
                            {rec.service.details?.visa_duration && (
                              <span className="text-[9px] opacity-50 block">
                                {rec.service.details.visa_duration}
                              </span>
                            )}
                          </td>

                          {/* Key Dates */}
                          <td className="px-3 py-2.5 font-mono text-[10px] opacity-75">
                            {travelDate && <div>Travel: {travelDate}</div>}
                            {expiryDate && <div className="text-[#D97757]">Exp: {expiryDate}</div>}
                            {!travelDate && !expiryDate && <span className="opacity-40">—</span>}
                          </td>

                          {/* Amount */}
                          <td className="px-3 py-2.5 text-right font-mono font-bold">
                            {amount.toLocaleString()}
                          </td>

                          {/* Cost */}
                          <td className="px-3 py-2.5 text-right font-mono opacity-70">
                            {cost.toLocaleString()}
                          </td>

                          {/* Profit */}
                          <td className={`px-3 py-2.5 text-right font-mono font-semibold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {profit.toLocaleString()}
                          </td>

                          {/* Details Toggle */}
                          <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}
                              className="p-1 rounded-md hover:bg-[var(--card-border)] opacity-60 hover:opacity-100 transition-colors"
                              title="Inspect Mapped Details"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Row Detail */}
                        {isExpanded && (
                          <tr className="bg-[var(--sidebar-bg)] border-b border-[var(--card-border)]">
                            <td colSpan={11} className="p-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]">
                                {/* Customer Breakdown */}
                                <div className="p-3 bg-[var(--background)] rounded-xl border border-[var(--card-border)] space-y-1.5">
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#D97757] block">
                                    Customer Record (Row {rec.rawRowIndex})
                                  </span>
                                  <div>Name: <strong className="font-semibold">{rec.customer.name}</strong></div>
                                  <div>Passport: <span className="font-mono">{rec.customer.passportNo || 'None'}</span></div>
                                  <div>Phone: {rec.customer.phone || 'None'}</div>
                                  <div>Email: {rec.customer.email || 'None'}</div>
                                </div>

                                {/* Service Details */}
                                <div className="p-3 bg-[var(--background)] rounded-xl border border-[var(--card-border)] space-y-1.5">
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#D97757] block">
                                    Service Attributes
                                  </span>
                                  <div>Category: {rec.service.category}</div>
                                  <div>Ref ID: <span className="font-mono">{rec.service.referenceId || 'Auto'}</span></div>
                                  <div>Supplier: {rec.service.details?.visa_supplier || rec.service.details?.supplier_name || 'DAHR'}</div>
                                  <div>Status: {rec.service.status}</div>
                                  {rec.service.details?.comments && <div>Comments: {rec.service.details.comments}</div>}
                                </div>

                                {/* Financials Breakdown */}
                                <div className="p-3 bg-[var(--background)] rounded-xl border border-[var(--card-border)] space-y-1.5 font-mono">
                                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#D97757] block font-sans">
                                    Financials
                                  </span>
                                  <div>Amount: {amount} AED</div>
                                  <div>Receiving: {rec.service.financials?.receiving_amount || amount} AED</div>
                                  <div>Supplier Cost: {cost} AED</div>
                                  <div>Gross Profit: {profit} AED</div>
                                  <div>Payment: {rec.service.financials?.payment_method || 'Bank Transfer'}</div>
                                </div>
                              </div>

                              {/* Raw CSV Row Collapsible */}
                              <details className="text-[10px] font-mono opacity-70 bg-[var(--background)] p-2.5 rounded-lg border border-[var(--card-border)] cursor-pointer">
                                <summary className="font-sans font-medium text-[#D97757]">
                                  View Raw CSV Row Data
                                </summary>
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(rec.rawRow, null, 2)}
                                </pre>
                              </details>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center opacity-50 italic">
                        No records match the current filter or search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRecords.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
          </div>

          {/* Bottom Action Command Bar */}
          <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--foreground)]">
                {selectedIds.size} of {parsedRecords.length}
              </span>
              <span className="opacity-60">records selected for database insertion.</span>
              {selectedIds.size === 0 && (
                <span className="text-amber-500 font-medium">⚠️ Select at least one row to migrate.</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={isMigrating}
                className="px-4 py-2.5 rounded-xl border border-[var(--card-border)] hover:bg-[var(--card-border)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
              >
                Cancel & Clear
              </button>

              <button
                type="button"
                onClick={executeMigration}
                disabled={selectedIds.size === 0 || isMigrating}
                className="px-6 py-2.5 bg-[#D97757] hover:opacity-90 text-[#F5F4EF] text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Migrating {selectedIds.size} Records ({progress}%)...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Migrate {selectedIds.size} Selected Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Completion Summary Banner */}
      {migrationSummary && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-xs text-[var(--foreground)] space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-serif font-bold text-base text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            Migration Completed Successfully
          </div>
          <p className="opacity-80">
            Processed <strong>{migrationSummary.totalSelected}</strong> records:
            Created <strong>{migrationSummary.createdCount}</strong> new customer profiles,
            matched <strong>{migrationSummary.matchedCount}</strong> existing profiles without duplicate creation,
            and skipped <strong>{migrationSummary.errorCount}</strong> errors.
          </p>
        </div>
      )}

      {/* Real-time Import Logs */}
      {log.length > 0 && (
        <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold opacity-70 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#D97757]" />
              Realtime Import Logs
            </h3>
            <span className="text-[10px] font-mono opacity-50">Row Progress: {progress}%</span>
          </div>
          <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
            {log.map((item, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 ${
                  item.type === 'error' ? 'text-red-500 font-semibold' :
                  item.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-70 text-[var(--foreground)]'
                }`}
              >
                <span className="opacity-40 shrink-0">[{item.time}]</span>
                <span>{item.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}
