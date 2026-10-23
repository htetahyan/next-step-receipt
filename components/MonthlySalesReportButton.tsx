'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet, FileText, Eye, Loader2, X, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { fetchMonthlySalesReportServices } from '@/app/actions/sales-report';
import {
  buildMonthlySalesReportData,
  downloadMonthlySalesPdf,
  downloadMonthlySalesXlsx,
  MonthlySalesReportPayload,
} from '@/lib/monthlySalesReport';

interface MonthlySalesReportButtonProps {
  /** Optional pre-loaded services if caller wants to allow exporting current filtered list */
  preloadedServices?: any[];
  compact?: boolean;
}

export default function MonthlySalesReportButton({
  preloadedServices,
  compact = false,
}: MonthlySalesReportButtonProps) {
  const searchParams = useSearchParams();
  const urlMonth = searchParams.get('month');

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return urlMonth || format(new Date(), 'yyyy-MM');
  });
  const [loadingMode, setLoadingMode] = useState<'xlsx' | 'pdf' | 'preview' | null>(null);
  const [previewReport, setPreviewReport] = useState<MonthlySalesReportPayload | null>(null);

  useEffect(() => {
    if (urlMonth) {
      setSelectedMonth(urlMonth);
    }
  }, [urlMonth]);

  const loadMonthReport = async (monthStr: string): Promise<MonthlySalesReportPayload | null> => {
    const res = await fetchMonthlySalesReportServices(monthStr);
    if (!res.success) {
      toast.error(res.error || 'Could not load monthly sales data');
      return null;
    }
    return buildMonthlySalesReportData(res.data, { monthYYYYMM: monthStr });
  };

  const handleOneClickExport = async (mode: 'xlsx' | 'pdf' | 'preview') => {
    if (loadingMode) return;
    setLoadingMode(mode);
    const toastId =
      mode !== 'preview'
        ? toast.loading(
            `Generating ${selectedMonth} Sales Report (${mode.toUpperCase()})...`
          )
        : undefined;

    try {
      const report = await loadMonthReport(selectedMonth);
      if (!report) {
        if (toastId) toast.dismiss(toastId);
        return;
      }

      if (mode === 'xlsx') {
        downloadMonthlySalesXlsx(report);
        toast.success(`${report.title} (.xlsx) downloaded · ${report.totalBookings} bookings`, {
          id: toastId,
        });
      } else if (mode === 'pdf') {
        await downloadMonthlySalesPdf(report);
        toast.success(`${report.title} (.pdf) downloaded · ${report.totalBookings} bookings`, {
          id: toastId,
        });
      } else {
        setPreviewReport(report);
      }
    } catch (err: any) {
      console.error('Monthly report generation error:', err);
      toast.error(err?.message || 'Failed to generate sales report', { id: toastId });
    } finally {
      setLoadingMode(null);
    }
  };

  const formatAccounting = (n: number) => {
    if (n < 0) return `(${Math.abs(n).toLocaleString()})`;
    return n.toLocaleString();
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5 p-1 rounded-xl border border-[var(--card-border)] bg-[var(--sidebar-bg)] shadow-xs">
        {/* Month Selector */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#1F4E79] dark:text-blue-400 shrink-0" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              if (e.target.value) setSelectedMonth(e.target.value);
            }}
            aria-label="Report month"
            title="Select report month"
            className="bg-transparent text-[11px] font-mono font-medium focus:outline-none cursor-pointer"
          />
        </div>

        {/* One-Click Excel (.xlsx) Button */}
        <button
          type="button"
          onClick={() => handleOneClickExport('xlsx')}
          disabled={loadingMode !== null}
          title="One-click download 1-month Sales Report in Excel (.xlsx) format"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer disabled:opacity-60 shrink-0 shadow-xs"
        >
          {loadingMode === 'xlsx' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-3.5 h-3.5" />
          )}
          <span>{compact ? 'Excel (.xlsx)' : '1-Month Report (.xlsx)'}</span>
        </button>

        {/* One-Click PDF (.pdf) Button */}
        <button
          type="button"
          onClick={() => handleOneClickExport('pdf')}
          disabled={loadingMode !== null}
          title="One-click download 1-month Sales Report in PDF (.pdf) format"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1F4E79] hover:bg-[#163a5c] text-white transition-all cursor-pointer disabled:opacity-60 shrink-0 shadow-xs"
        >
          {loadingMode === 'pdf' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span>PDF</span>
        </button>

        {/* Preview Modal Trigger */}
        <button
          type="button"
          onClick={() => handleOneClickExport('preview')}
          disabled={loadingMode !== null}
          title="Preview 1-month Sales Report table"
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[#1F4E79] transition-all cursor-pointer disabled:opacity-60 shrink-0"
        >
          {loadingMode === 'preview' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          {!compact && <span className="hidden sm:inline">Preview</span>}
        </button>
      </div>

      {/* Spreadsheet Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6">
          <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Top Action Bar */}
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#1F4E79]" />
                <span className="text-xs font-mono font-semibold text-slate-700">
                  {previewReport.filenameBase}.xlsx — Report Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadMonthlySalesXlsx(previewReport);
                    toast.success(`${previewReport.title} (.xlsx) downloaded`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await downloadMonthlySalesPdf(previewReport);
                    toast.success(`${previewReport.title} (.pdf) downloaded`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1F4E79] hover:bg-[#163a5c] text-white cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Spreadsheet Canvas matching the exact screenshot template */}
            <div className="p-4 sm:p-6 overflow-auto space-y-4 bg-white text-slate-900">
              {/* Centered Title Block */}
              <div className="text-center space-y-0.5 pb-2">
                <h2 className="text-lg font-bold tracking-wide text-[#1F4E79]">
                  {previewReport.title}
                </h2>
                <p className="text-xs italic text-slate-600">{previewReport.periodLabel}</p>
                <p className="text-[11px] text-slate-500">{previewReport.generatedLabel}</p>
              </div>

              {/* Main Sales Table */}
              <div className="overflow-x-auto border border-slate-300">
                <table className="w-full border-collapse text-xs font-sans">
                  <thead>
                    <tr className="bg-[#1F4E79] text-white">
                      <th className="border border-slate-300 px-2 py-1.5 text-center font-bold w-10">
                        No.
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">
                        Ref
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">
                        Service
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">
                        Customer
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-left font-bold">
                        Passport
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center font-bold">
                        Issued / Created
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center font-bold">
                        Travel Date
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center font-bold">
                        Status
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right font-bold">
                        Receiving (AED)
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right font-bold">
                        Cost (AED)
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-right font-bold">
                        Gross Profit (AED)
                      </th>
                      <th className="border border-slate-300 px-2.5 py-1.5 text-center font-bold">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewReport.rows.map((row) => {
                      const isNegative = row.grossProfit < 0;
                      return (
                        <tr key={`${row.no}-${row.ref}`} className="hover:bg-slate-50">
                          <td className="border border-slate-200 px-2 py-1 text-center">
                            {row.no}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 whitespace-nowrap">
                            {row.ref}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1">{row.service}</td>
                          <td className="border border-slate-200 px-2.5 py-1">{row.customer}</td>
                          <td className="border border-slate-200 px-2.5 py-1 whitespace-nowrap">
                            {row.passport}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 text-center whitespace-nowrap">
                            {row.issuedOrCreated}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 text-center whitespace-nowrap">
                            {row.travelDate}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 text-center bg-[#FFF2CC] whitespace-nowrap">
                            {row.status}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 text-right tabular-nums">
                            {formatAccounting(row.receiving)}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 text-right tabular-nums">
                            {formatAccounting(row.cost)}
                          </td>
                          <td
                            className={`border border-slate-200 px-2.5 py-1 text-right tabular-nums font-medium ${
                              isNegative
                                ? 'bg-[#FFC7CE] text-[#9C0006]'
                                : 'bg-[#C6EFCE] text-[#006100]'
                            }`}
                          >
                            {formatAccounting(row.grossProfit)}
                          </td>
                          <td className="border border-slate-200 px-2.5 py-1 text-center">
                            {row.type}
                          </td>
                        </tr>
                      );
                    })}

                    {/* TOTAL Row */}
                    <tr className="bg-[#FFF2CC] font-bold border-t-2 border-b-2 border-[#1F4E79]">
                      <td colSpan={7} className="border border-slate-300 px-2.5 py-1.5" />
                      <td className="border border-slate-300 px-2.5 py-1.5 text-center">TOTAL</td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                        {formatAccounting(previewReport.totalReceiving)}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums">
                        {formatAccounting(previewReport.totalCost)}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-right tabular-nums bg-[#C6EFCE] text-[#006100]">
                        {formatAccounting(previewReport.totalGrossProfit)}
                      </td>
                      <td className="border border-slate-300 px-2.5 py-1.5 text-center tabular-nums">
                        {previewReport.totalBookings}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SUMMARY & BY TYPE Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 max-w-3xl">
                {/* SUMMARY Table */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F4E79] mb-1">SUMMARY</h3>
                  <table className="w-full border-collapse text-xs border border-slate-300">
                    <tbody>
                      <tr>
                        <td className="border border-slate-300 px-2.5 py-1">
                          Total Receiving (AED)
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-bold bg-[#E2EFDA] tabular-nums w-28">
                          {formatAccounting(previewReport.totalReceiving)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2.5 py-1">Total Cost (AED)</td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-bold bg-[#E2EFDA] tabular-nums">
                          {formatAccounting(previewReport.totalCost)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2.5 py-1">
                          Total Gross Profit (AED)
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-bold bg-[#C6EFCE] text-[#006100] tabular-nums">
                          {formatAccounting(previewReport.totalGrossProfit)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2.5 py-1">Bookings</td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-bold bg-[#E2EFDA] tabular-nums">
                          {previewReport.totalBookings}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2.5 py-1">
                          Avg Profit / Booking
                        </td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-bold bg-[#E2EFDA] tabular-nums">
                          {previewReport.avgProfitPerBooking.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-2.5 py-1">Profit Margin</td>
                        <td className="border border-slate-300 px-2.5 py-1 text-right font-bold bg-[#E2EFDA] tabular-nums">
                          {(previewReport.profitMarginDecimal * 100).toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* BY TYPE Table */}
                <div>
                  <h3 className="text-xs font-bold text-[#1F4E79] mb-1">BY TYPE</h3>
                  <table className="w-full border-collapse text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-[#1F4E79] text-white">
                        <th className="border border-slate-300 px-2.5 py-1 text-left font-bold">
                          Type
                        </th>
                        <th className="border border-slate-300 px-2.5 py-1 text-center font-bold">
                          Count
                        </th>
                        <th className="border border-slate-300 px-2.5 py-1 text-right font-bold">
                          Profit (AED)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewReport.byType.map((item) => (
                        <tr key={item.type}>
                          <td className="border border-slate-300 px-2.5 py-1">{item.type}</td>
                          <td className="border border-slate-300 px-2.5 py-1 text-center tabular-nums">
                            {item.count}
                          </td>
                          <td className="border border-slate-300 px-2.5 py-1 text-right bg-[#C6EFCE] tabular-nums">
                            {formatAccounting(item.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
