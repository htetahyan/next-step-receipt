'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, Database, HelpCircle, FileSpreadsheet, Sparkles } from 'lucide-react';
import Papa from 'papaparse';
import { addCustomer, findCustomerByPassportOrName } from '@/app/actions/customers';
import { addCustomerService, bulkMigrateCustomerServices } from '@/app/actions/services';
import { toast } from 'sonner';

export default function MigratePage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('uae-visa');
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<{ type: 'info' | 'success' | 'error'; message: string; time: string }[]>([]);
  const [progress, setProgress] = useState(0);

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
    // Try exact matches first
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }

    // Normalized matches (stripping spaces, lowercase, special characters)
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

  // Convert DMY date strings (e.g., "16 / 09/ 2025", "3/10/2025", or "7th Aug 2025") to ISO format "YYYY-MM-DD"
  const parseDateToISO = (dateStr: any): string | null => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).trim();
    if (!cleanStr || cleanStr === '-' || cleanStr === '—' || cleanStr.toLowerCase() === 'null') return null;

    // e.g. "7th Aug 2025" or "8th Nov 2025"
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

    // e.g. "20 / 8 / 2025" or "16/ 09 /2025"
    const dmyMatch = cleanStr.match(/^(\d+)\s*[\/\-]\s*(\d+)\s*[\/\-]\s*(\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // e.g. "3/10/25"
    const dmyShortMatch = cleanStr.match(/^(\d+)\s*[\/\-]\s*(\d+)\s*[\/\-]\s*(\d{2})$/);
    if (dmyShortMatch) {
      const day = dmyShortMatch[1].padStart(2, '0');
      const month = dmyShortMatch[2].padStart(2, '0');
      const year = `20${dmyShortMatch[3]}`;
      return `${year}-${month}-${day}`;
    }

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
      return cleanStr;
    }

    return cleanStr; // fallback for non-standard texts
  };

  // Convert any string value to a clean float, handling commas, currencies, hyphens, and empty cells safely
  const parseCSVNumber = (val: any): number | null => {
    if (val === undefined || val === null) return null;
    const cleanStr = String(val).trim().replace(/[^0-9.-]/g, '');
    if (!cleanStr || cleanStr === '-' || cleanStr === '—' || cleanStr.toLowerCase() === 'null' || cleanStr.toLowerCase() === 'unknown') {
      return null;
    }
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? null : parsed;
  };

  const processData = async () => {
    if (!file) return;
    setLoading(true);
    setLog([]);
    setProgress(0);

    addLog(`Loading CSV file: "${file.name}"...`, 'info');

    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: async (results) => {
        const rawRows = results.data as string[][];
        addLog(`Successfully parsed ${rawRows.length} raw lines from CSV. Scanning for header row...`, 'success');

        if (rawRows.length === 0) {
          addLog("No data found in the CSV file.", "error");
          setLoading(false);
          return;
        }

        // Find the header row dynamically
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
          addLog(`Could not find a clear header row. Falling back to the first line as header.`, 'info');
        } else {
          addLog(`Detected header row at CSV line ${headerRowIndex + 1}`, 'success');
        }

        const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
        addLog(`Detected CSV columns: [${headers.filter(Boolean).join(', ')}]`, 'info');

        // Convert subsequent rows into cleanly mapped row objects
        const rows: any[] = [];
        for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
          const rawRow = rawRows[r];
          if (!rawRow || rawRow.every(cell => !String(cell || '').trim())) {
            continue; // Skip empty rows
          }
          const rowObj: any = {};
          headers.forEach((header, idx) => {
            const key = header || `column_${idx}`;
            rowObj[key] = rawRow[idx] !== undefined ? String(rawRow[idx]).trim() : '';
          });
          rows.push(rowObj);
        }

        const recordsToMigrate: any[] = [];
        let lastRecord: any = null;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // Extract core customer details
            const nameValue = getCSVValue(row, ['Customer Name', 'Name', 'Client Name', 'Customer']);
            const name = (nameValue && String(nameValue).trim() !== '-' && String(nameValue).trim().toLowerCase() !== 'unknown' && String(nameValue).trim().toLowerCase() !== 'null') ? String(nameValue).trim() : '';

            let cleanName = name;
            let partySuffix = '';
            const partyMatch = name.match(/^(.*?)\s*\+\s*(\d+)$/);
            if (partyMatch) {
              cleanName = partyMatch[1].trim();
              partySuffix = `+${partyMatch[2]}`;
            }
            
            // Skip rows without a customer name, or merge if they are sub-rows
            if (!cleanName) {
              const subDest = getCSVValue(row, ['Tour Plans', 'Plans', 'Description', 'Destination', 'Route', 'To', 'Mode of Visa/ Extension', 'Mode/Category', 'Category', 'Visa Type']) || '';
              const subAmount = parseCSVNumber(getCSVValue(row, ['Amount', 'Amount Charged', 'Total Payment'])) ?? 0;
              const subCost = parseCSVNumber(getCSVValue(row, ['Payment to the suppliets', 'Payment to the suppliers', 'Payment amount to airline', 'Airline Cost', 'Supplier Cost', 'Visa fees to Supplier'])) ?? 0;
              const subNotes = getCSVValue(row, ['Remark', 'Note', 'Notes', 'Comments']) || '';

              const hasSubContent = !!subDest || subAmount > 0 || subCost > 0 || !!subNotes;

              if (hasSubContent && lastRecord) {
                const targetField = type === 'uae-visa' ? 'visa_duration' : type === 'tour-package' ? 'tour_plans' : 'destination';
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
                  const targetNotesField = type === 'air-ticket' ? 'notes' : 'comments';
                  const existingNotes = lastRecord.service.details[targetNotesField] || '';
                  lastRecord.service.details[targetNotesField] = existingNotes ? `${existingNotes} | ${subNotes}` : subNotes;
                }

                // Recalculate financials
                lastRecord.service.financials.receiving_amount = (lastRecord.service.financials.amount || 0) - (lastRecord.service.financials.discount || 0);
                lastRecord.service.financials.balance = (lastRecord.service.financials.receiving_amount || 0) - (lastRecord.service.financials.supplier_cost || 0);

                addLog(`Merged sub-row ${i+1} into customer "${lastRecord.customer.name}" (Add-on: "${subDest || 'Services'}", +${subAmount} AMT, +${subCost} Cost)`, 'info');
              }
              continue;
            }

            const rawPassport = getCSVValue(row, ['Passport No', 'Passport Number', 'Passport']);
            const passportNo = (rawPassport && String(rawPassport).trim() !== '-') ? String(rawPassport).trim().replace(/\s+/g, '').toUpperCase() : '';

            const rawPhone = getCSVValue(row, ['Phone No/Contact', 'Phone', 'Contact', 'Phone No', 'Contact No']);
            const phone = (rawPhone && String(rawPhone).trim() !== '-') ? String(rawPhone).trim() : '';

            const rawEmail = getCSVValue(row, ['Email Address', 'Email', 'Mail']);
            const email = (rawEmail && String(rawEmail).trim() !== '-') ? String(rawEmail).trim() : '';

            // Prepare database service payload
            let serviceData: any = {
              status: 'Open',
              details: {},
              financials: {}
            };

            const paymentValue = getCSVValue(row, ['Payment', 'Payment Method', 'Payment Mode']);
            const paymentMethod = (paymentValue && String(paymentValue).trim() !== '-') ? String(paymentValue).trim() : 'Bank Transfer';

            const categoryValue = getCSVValue(row, ['Mode of Visa/ Extension', 'Mode/Category', 'Category', 'Visa Type']);
            let category = String(categoryValue || '').trim();

            if (type === 'uae-visa') {
              const refIdValue = getCSVValue(row, ['Customer ID', 'Ref ID', 'ID', 'Reference ID']);
              serviceData.referenceId = (refIdValue && String(refIdValue).trim() !== '-' && String(refIdValue).trim().toLowerCase() !== 'unknown') ? String(refIdValue).trim() : null;
              
              const durationValue = getCSVValue(row, ['Visa Duration', 'Duration']);
              const duration = (durationValue && String(durationValue).trim() !== '-') ? String(durationValue).trim() : '30 days';

              // Map category dynamically
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

              // Automatically set expiry date from travel date + duration if not explicitly provided
              if (!expiryDate && travelDate) {
                const isBusOrAirChange = category === 'Visa Change by Bus' || category === 'Visa Change by Air';
                let daysToAdd = 60; // default for bus/air changes

                if (!isBusOrAirChange) {
                  // Parse duration from the visa duration field (e.g. "30 Days", "60 Days", "90 Days")
                  const durationStr = String(getCSVValue(row, ['Visa Duration', 'Duration']) || '').toLowerCase();
                  if (durationStr.includes('90')) daysToAdd = 90;
                  else if (durationStr.includes('60')) daysToAdd = 60;
                  else if (durationStr.includes('30')) daysToAdd = 30;
                  else if (durationStr.includes('14')) daysToAdd = 14;
                  else daysToAdd = 30; // fallback
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
                legacy_row: row, // Collect ALL row columns as raw backup
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

            } else if (type === 'air-ticket') {
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
                legacy_row: row, // Collect ALL row columns as raw backup
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
            } else if (type === 'tour-package') {
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
                legacy_row: row, // Collect ALL row columns as raw backup
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

            recordsToMigrate.push({
              customer: {
                name: cleanName,
                passportNo,
                phone,
                email
              },
              service: serviceData
            });

            lastRecord = recordsToMigrate[recordsToMigrate.length - 1];

          } catch (e: any) {
            addLog(`Row ${i+1} Formatting Error: ${e.message}`, 'error');
          }
        }

        addLog(`Successfully prepared ${recordsToMigrate.length} items. Streaming batch uploads to server...`, 'info');

        let createdCount = 0;
        let matchedCount = 0;
        let errorCount = 0;

        // Migrate in chunks of 50 for hyper-fast, safe, transaction-like execution
        const chunkSize = 50;
        for (let chunkIdx = 0; chunkIdx < recordsToMigrate.length; chunkIdx += chunkSize) {
          const chunk = recordsToMigrate.slice(chunkIdx, chunkIdx + chunkSize);
          addLog(`Processing batch ${Math.floor(chunkIdx / chunkSize) + 1} (${chunkIdx + 1} to ${Math.min(chunkIdx + chunkSize, recordsToMigrate.length)})...`, 'info');
          
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
              addLog(`Batch ${Math.floor(chunkIdx / chunkSize) + 1} encountered a severe backend failure.`, 'error');
              errorCount += chunk.length;
            }
          } catch (err: any) {
            addLog(`Batch ${Math.floor(chunkIdx / chunkSize) + 1} network or system error: ${err.message}`, 'error');
            errorCount += chunk.length;
          }

          setProgress(Math.round((Math.min(chunkIdx + chunkSize, recordsToMigrate.length) / recordsToMigrate.length) * 100));
        }

        setLoading(false);
        addLog(`MIGRATION COMPLETED. Profiles Created: ${createdCount}, Matched/Deduplicated: ${matchedCount}, Errors/Skipped: ${errorCount}`, 'success');
        toast.success('Migration Completed!');
      },
      error: (error) => {
        addLog(`CSV Parse Error: ${error.message}`, 'error');
        setLoading(false);
        toast.error('CSV Parsing Failed');
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif text-[var(--foreground)] flex items-center gap-3">
          <Database className="h-8 w-8 text-[#D97757]" />
          Dynamic Data Migration Tool
        </h1>
        <p className="text-sm opacity-60 mt-1.5 ml-11">
          Import and map your legacy spreadsheets directly into your database.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form Panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold opacity-70">Dataset Type</label>
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value)}
                  className="input-anthropic w-full p-3 text-sm font-semibold"
                  disabled={loading}
                >
                  <option value="uae-visa">UAE Visa Tracker</option>
                  <option value="air-ticket">Air Tickets</option>
                  <option value="tour-package">Tour Packages</option>
                  <option value="other-visa">Other Visas</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider font-semibold opacity-70">Select CSV File</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="input-anthropic w-full p-3 text-sm flex items-center justify-between font-medium cursor-pointer">
                    <span className="truncate opacity-70">
                      {file ? file.name : 'Choose file...'}
                    </span>
                    <UploadCloud className="h-4 w-4 text-[#D97757]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#D97757]/5 border border-[#D97757]/20 p-5 rounded-xl flex items-start gap-3.5">
              <Sparkles className="w-5 h-5 text-[#D97757] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--foreground)] opacity-90 leading-relaxed">
                <strong>Smart CSV Auto-Mapping Enabled:</strong> Our system automatically detects, matches, and cleans column headers (such as <code>Discount/ Agent fees</code>, <code>Visa Duration</code>, or dates with spaces like <code>16 / 09/ 2025</code>).
              </div>
            </div>

            <button 
              onClick={processData}
              disabled={!file || loading}
              className="w-full py-4 bg-[#D97757] text-[#F5F4EF] rounded-xl font-medium hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Migrating & Deduplicating ({progress}%)...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  <span>Execute Data Import</span>
                </>
              )}
            </button>
          </div>

          {/* Logs */}
          {log.length > 0 && (
            <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold opacity-70 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#D97757]" />
                  Realtime Import Logs
                </h3>
                <span className="text-[10px] font-mono opacity-50">Row Progress: {progress}%</span>
              </div>
              <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-xl p-4 h-96 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar">
                {log.map((item, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-2 ${
                      item.type === 'error' ? 'text-red-500 font-semibold' : 
                      item.type === 'success' ? 'text-emerald-500' : 'opacity-70 text-[var(--foreground)]'
                    }`}
                  >
                    <span className="opacity-40 flex-shrink-0">[{item.time}]</span>
                    <span>{item.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Help Sidebar */}
        <div className="space-y-6">
          <div className="bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="font-serif text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-[#D97757]" />
              Expected Excel Layout
            </h3>
            <p className="text-xs opacity-60 leading-relaxed">
              We now perfectly map your customized column headers automatically. Your legacy Excel or CSV layout matches seamlessly:
            </p>
            <div className="space-y-2 border-t border-[var(--card-border)] pt-3">
              <div className="text-[10px] space-y-1 bg-[var(--background)] p-3 rounded-lg border border-[var(--card-border)] font-mono max-h-72 overflow-y-auto custom-scrollbar">
                <p className="font-semibold text-[#D97757] uppercase pb-1 border-b border-[var(--card-border)]">Mapped Fields</p>
                <div className="space-y-1 pt-1 opacity-70">
                  <div>• Customer Name</div>
                  <div>• Customer ID (Ref ID)</div>
                  <div>• Passport No</div>
                  <div>• Phone No/Contact</div>
                  <div>• Mode of Visa/Extension</div>
                  <div>• Visa Issued Date</div>
                  <div>• Travel Date</div>
                  <div>• Visa Expiry Date</div>
                  <div>• Visa Duration</div>
                  <div>• Visa Supplier</div>
                  <div>• Amount</div>
                  <div>• Discount/Agent Fees</div>
                  <div>• Receiving Amount</div>
                  <div>• Visa Fees to Supplier</div>
                  <div>• Balance</div>
                  <div>• Refund</div>
                  <div>• Payment Method</div>
                  <div>• Remarks & Comments</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(148, 163, 184, 0.3); border-radius: 20px; }
      `}</style>
    </div>
  );
}
