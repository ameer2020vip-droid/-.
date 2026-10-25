import React from 'react';
import { WarningFormRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';

interface PrintWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: WarningFormRecord | null;
}

export const PrintWarningModal: React.FC<PrintWarningModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen || !form) return null;

  // Format form date to DD / MM / YYYY
  const getFormattedDateParts = (dateStr?: string) => {
    if (!dateStr) return { day: '   ', month: '   ', year: '      ' };
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return {
        year: parts[0],
        month: parts[1],
        day: parts[2],
      };
    }
    return { day: '   ', month: '   ', year: '      ' };
  };

  const { day, month, year } = getFormattedDateParts(form.formDate);

  // Parse parent communication date and time
  const getCommunicationParts = (commStr?: string) => {
    if (!commStr) return { date: '', time: '' };
    const parts = commStr.split(/[ T]/);
    return {
      date: parts[0] || '',
      time: parts.slice(1).join(' ') || '',
    };
  };

  const commParts = getCommunicationParts(form.communicationDateTime);

  // Grade representation
  const gradeDisplay = form.grade
    ? `الصف ${form.grade} ${form.section ? `(شعبة ${form.section})` : ''}`
    : '';

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (9) تنبيه خطي للطالب بعد التنبيه الشفهي"
      subtitle={`الطالب: ${form.studentName} • ${gradeDisplay}`}
      printButtonId="btn-modal-print"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Bi-directional Reference to Originating Morning Tardiness */}
      {form.tardinessRecordId && (
        <div className="no-print mx-8 sm:mx-12 mt-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs font-['Cairo']">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="font-bold">مرجع حالة التأخير الصباحي:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold">{form.tardinessRecordId}</span>
          </div>
          <span className="text-[11px] text-amber-800">
            تم توثيق هذا التعهد/النموذج بناءً على سجل التأخير الصباحي للطالب
          </span>
        </div>
      )}

      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 9 */}
      <div
        id="printable-official-form"
        className="p-8 sm:p-12 text-black bg-white text-right space-y-6 print:p-0 print:space-y-5"
        style={{
          fontFamily: "'Tajawal', 'Cairo', 'Traditional Arabic', 'Arial', sans-serif",
          lineHeight: 1.85,
          fontSize: '15px',
        }}
        dir="rtl"
      >
          {/* Top Institutional Header */}
          <div className="flex justify-between items-start pt-2">
            {/* Top Right: Institutional Hierarchy */}
            <div className="space-y-1 text-sm font-semibold text-black">
              <div>
                <span>إمارة: </span>
                <span className="font-bold underline decoration-dotted underline-offset-4">
                  {form.emirate || '.......................................'}
                </span>
              </div>
              <div className="font-bold">إدارة العمليات المدرسية</div>
              <div>
                <span>المجلس: </span>
                <span className="font-bold underline decoration-dotted underline-offset-4">
                  {form.council || '...................................'}
                </span>
              </div>
              <div>
                <span>نطاق: </span>
                <span className="font-bold underline decoration-dotted underline-offset-4">
                  {form.sector || '....................................'}
                </span>
              </div>
              <div>
                <span>مدرسة: </span>
                <span className="font-bold underline decoration-dotted underline-offset-4">
                  {form.school || '..................................'}
                </span>
              </div>
            </div>

            {/* Top Left: Form Number */}
            <div className="text-left font-bold text-base text-black">
              <span>نموذج رقم (9)</span>
            </div>
          </div>

          {/* Document Centered Title */}
          <div className="text-center pt-4 pb-2">
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-wide">
              تنبيه خطي للطالب / للطالبة من بعد التنبيه الشفهي
            </h1>
          </div>

          {/* Student Declaration Intro */}
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">أتعهد أنا الطالب/الطالبة:</span>
              <span className="font-black text-black border-b-2 border-dotted border-black pb-0.5 px-3 min-w-[280px]">
                {form.studentName || '....................................................'}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-bold">الصف:</span>
              <span className="font-bold text-black border-b-2 border-dotted border-black pb-0.5 px-3 min-w-[220px]">
                {gradeDisplay || '.......................................................'}
              </span>
            </div>
          </div>

          {/* Official Pledge Text from Regulation */}
          <div className="pt-2 text-justify leading-relaxed">
            <p className="font-medium text-black">
              {form.studentPledge ||
                'بأن ألتزم بقواعد السلوك والنظام داخل المدرسة، والمحافظة على مرافقها، واتباع التعليمات والنظم المدرسية، وفي حالة مخالفتي أكون متحملاً لكافة الإجراءات التي تطبقها إدارة المدرسة بحقي وفق ما جاء في لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام، علمًا بأنه قد تم تنبيهي بشكل شفهي أكثر من مرة على السلوكيات غير الإيجابية فيها والصادرة عني والتي تتلخص في الآتي:'}
            </p>
          </div>

          {/* Prior Oral Warnings & Behaviors (Numbered 1, 2, 3) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-bold shrink-0">1-</span>
              <span className="flex-1 font-medium text-black border-b border-dotted border-black pb-0.5 min-h-[26px]">
                {form.priorBehaviors[0] ||
                  '......................................................................................................................'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-bold shrink-0">2-</span>
              <span className="flex-1 font-medium text-black border-b border-dotted border-black pb-0.5 min-h-[26px]">
                {form.priorBehaviors[1] ||
                  '......................................................................................................................'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-bold shrink-0">3-</span>
              <span className="flex-1 font-medium text-black border-b border-dotted border-black pb-0.5 min-h-[26px]">
                {form.priorBehaviors[2] ||
                  '......................................................................................................................'}
              </span>
            </div>
          </div>

          {/* Student Name and ONLY Student Signature Line */}
          <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="font-bold">اسم الطالب / الطالبة:</span>
              <span className="font-bold text-black border-b border-dotted border-black pb-0.5 px-3 min-w-[200px]">
                {form.studentName || '.......................................'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold">التوقيع:</span>
              <div className="min-w-[180px] min-h-[44px] flex items-center justify-center border-b border-dotted border-black pb-1">
                {form.studentSignature ? (
                  <img
                    src={form.studentSignature}
                    alt="توقيع الطالب"
                    className="max-h-12 max-w-[170px] object-contain"
                  />
                ) : (
                  <span className="font-mono text-slate-700">.......................................</span>
                )}
              </div>
            </div>
          </div>

          {/* Accreditation by Vice Principal & Date */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-end gap-6">
            <div className="text-right">
              <div className="font-bold text-sm">
                <span>تحريرًا في: </span>
                <span className="font-mono font-bold px-2">
                  {day} / {month} / {year}
                </span>
                <span> م</span>
              </div>
            </div>

            <div className="text-center sm:text-left min-w-[180px]">
              <div className="font-bold text-base text-black mb-10">
                يعتمد نائب المدير
              </div>
              <div className="text-[11px] text-slate-500 font-mono no-print">
                (توقيع وخاتم الاعتماد)
              </div>
            </div>
          </div>

          {/* Instruction Note */}
          <div className="pt-4 text-center">
            <p className="text-xs sm:text-sm font-semibold text-black leading-relaxed">
              (يتم إخطار ولي الأمر بصورة من التعهد الخطي وتحفظ صورة في ملف الطالب وصورة لدى المرشد الأكاديمي/الاخصائي الاجتماعي)
            </p>
          </div>

          {/* Parent Notification Documentation Lines (No Parent Signature Required) */}
          <div className="pt-4 space-y-3 border-t border-slate-300">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-2">
                <span className="font-bold">تم إخطار ولي الأمر، الاسم:</span>
                <span className="font-bold text-black border-b border-dotted border-black pb-0.5 px-2 min-w-[220px]">
                  {form.parentName || '...................................................'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-bold">الصلة:</span>
                <span className="font-bold text-black border-b border-dotted border-black pb-0.5 px-2 min-w-[120px]">
                  {form.parentRelation || '........................'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-3 text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-bold">رقم الهاتف:</span>
                <span className="font-mono font-bold text-black border-b border-dotted border-black pb-0.5 px-2 min-w-[140px]" dir="ltr">
                  {form.parentPhone || '...........................'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-bold">تاريخ الاتصال:</span>
                <span className="font-bold text-black border-b border-dotted border-black pb-0.5 px-2 min-w-[120px]">
                  {commParts.date || form.formDate || '........................'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-bold">الوقت:</span>
                <span className="font-bold text-black border-b border-dotted border-black pb-0.5 px-2 min-w-[100px]">
                  {commParts.time || '........................'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
