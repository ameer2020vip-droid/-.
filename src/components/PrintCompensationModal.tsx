import React from 'react';
import { ViolationCompensationRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';

interface PrintCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ViolationCompensationRecord | null;
}

export const PrintCompensationModal: React.FC<PrintCompensationModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen || !form) return null;

  // Ensure at least 5 table rows for print visual layout matching official form
  const rows = form.rows || [];
  const displayRows = [...rows];
  while (displayRows.length < 5) {
    displayRows.push({
      id: `empty-${displayRows.length}`,
      violationDegree: '',
      violationNumber: '',
      violationDescription: '',
      deductedMarks: 0,
      positiveBehaviorCorrection: '',
      compensationMarks: 0,
    });
  }

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (21) نموذج تعويض عن مخالفة"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-compensation"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 21 */}
      <div
        id="printable-official-compensation-form-21"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-6 print:p-0 print:space-y-5"
        style={{
          fontFamily: "'Tajawal', 'Cairo', 'Traditional Arabic', 'Arial', sans-serif",
          lineHeight: 1.85,
          fontSize: '15px',
        }}
        dir="rtl"
      >
          {/* Top Annex Decree Header (Underlined) */}
          <div className="text-center pt-2">
            <p className="font-bold text-sm sm:text-base border-b border-black pb-1 inline-block">
              ملحق (21) للقرار الوزاري رقم (851) لسنة 2018 م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Form Number Tag */}
          <div className="text-right text-sm font-bold pt-1">
            <span>نموذج رقم (21)</span>
          </div>

          {/* Form Title */}
          <div className="text-center my-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-black border-b-2 border-black inline-block pb-1">
              نموذج تعويض عن مخالفة
            </h1>
          </div>

          {/* Student Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-base pt-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">إسم الطالب/الطالبة:</span>
              <span className="border-b border-dotted border-black px-4 font-semibold min-w-[200px]">
                {form.studentName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">الصف:</span>
              <span className="border-b border-dotted border-black px-4 font-semibold min-w-[120px]">
                {form.grade} / {form.section}
              </span>
            </div>
          </div>

          {/* Main Compensation Table */}
          <div className="pt-3 overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black text-center text-sm">
              <thead>
                <tr className="bg-slate-100 font-bold border-b-2 border-black">
                  <th className="border border-black p-2.5 w-[14%]">درجة المخالفة</th>
                  <th className="border border-black p-2.5 w-[12%]">رقم المخالفة</th>
                  <th className="border border-black p-2.5 w-[26%]">وصف المخالفة</th>
                  <th className="border border-black p-2.5 w-[12%]">درجة الحسم</th>
                  <th className="border border-black p-2.5 w-[24%]">
                    التصحيح
                    <br />
                    <span className="text-xs font-normal">(وصف السلوك الإيجابي)</span>
                  </th>
                  <th className="border border-black p-2.5 w-[12%]">درجة التعويض</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => (
                  <tr key={row.id || idx} className="border-b border-black min-h-[44px]">
                    <td className="border border-black p-2 font-medium">
                      {row.violationDegree || ''}
                    </td>
                    <td className="border border-black p-2 font-mono text-xs">
                      {row.violationNumber || ''}
                    </td>
                    <td className="border border-black p-2 text-right leading-snug">
                      {row.violationDescription || ''}
                    </td>
                    <td className="border border-black p-2 font-bold text-red-700">
                      {row.deductedMarks ? `-${row.deductedMarks}` : ''}
                    </td>
                    <td className="border border-black p-2 text-right leading-snug font-medium text-emerald-800">
                      {row.positiveBehaviorCorrection || ''}
                    </td>
                    <td className="border border-black p-2 font-bold text-emerald-700">
                      {row.compensationMarks ? `+${row.compensationMarks}` : ''}
                    </td>
                  </tr>
                ))}

                {/* Summary Row */}
                <tr className="font-bold border-t-2 border-black bg-slate-50">
                  <td colSpan={5} className="border border-black p-3 text-left pl-6">
                    مجموع درجات السلوك الإيجابي بعد التعويض:
                  </td>
                  <td className="border border-black p-3 text-center text-base font-black text-emerald-800">
                    {form.totalPositiveMarksAfterCompensation || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Grades Totals Box */}
          <div className="pt-2 flex flex-col items-end space-y-1.5 text-base font-bold">
            <div className="flex items-center gap-3">
              <span>مجموع الدرجات:</span>
              <span className="border-b border-dotted border-black px-4 min-w-[80px] text-center">
                {form.totalMarks || 100}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span>الدرجة الكلية نهاية الفصل الدراسي:</span>
              <span className="border-b-2 border-black px-4 min-w-[80px] text-center text-lg text-emerald-800">
                {form.finalTermMarks || 100}
              </span>
            </div>
          </div>

          {/* Official Signatures Block */}
          <div className="grid grid-cols-2 gap-8 pt-10 border-t border-black/30">
            {/* Officer in Charge (Right) */}
            <div className="space-y-2">
              <p className="font-bold text-base border-b border-black/50 pb-1 mb-2">
                الموظف المسؤول:
              </p>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">الاسم:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-semibold">
                  {form.officerName || 'المرشد الطلابي'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">التوقيع:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[36px] flex items-center">
                  {form.officerSignature ? (
                    <img
                      src={form.officerSignature}
                      alt="توقيع الموظف"
                      className="max-h-10 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400">.....................................</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">التاريخ:</span>
                <span className="border-b border-dotted border-black flex-1 px-1">
                  {form.officerDate || form.createdAt || '..../..../2026م'}
                </span>
              </div>
            </div>

            {/* School Principal (Left) */}
            <div className="space-y-2">
              <p className="font-bold text-base border-b border-black/50 pb-1 mb-2">
                مدير/ة المدرسة:
              </p>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">الاسم:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-semibold">
                  {form.principalName || 'يعتمد مدير المدرسة'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">التوقيع:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[36px] flex items-center">
                  {form.principalSignature ? (
                    <img
                      src={form.principalSignature}
                      alt="توقيع المدير"
                      className="max-h-10 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 font-serif italic text-xs">معتمد إلكترونياً</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">التاريخ:</span>
                <span className="border-b border-dotted border-black flex-1 px-1">
                  {form.principalDate || form.createdAt || '..../..../2026م'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
