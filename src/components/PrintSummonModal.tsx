import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ParentSummonFormRecord } from '../types';
import { getFormattedDateParts } from '../utils/time';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface PrintSummonModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ParentSummonFormRecord | null;
}

export const PrintSummonModal: React.FC<PrintSummonModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  const { schoolSettings } = useSchoolSettings();
  if (!isOpen || !form) return null;

  const { day, month, year } = getFormattedDateParts(form.summonDate);
  const principalDateParts = getFormattedDateParts(form.principalDate);
  const studentDateParts = getFormattedDateParts(form.studentSignatureDate || form.createdAt?.split('T')[0]);

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (8) خطاب استدعاء ولي الأمر (القرار الوزاري 851 لسنة 2018)"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-summon"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Bi-directional Reference to Originating Morning Tardiness */}
      {form.tardinessRecordId && (
        <div className="no-print mx-8 sm:mx-14 mt-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shadow-2xs font-['Cairo']">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="font-bold">مرجع حالة التأخير الصباحي:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 font-bold">{form.tardinessRecordId}</span>
          </div>
          <span className="text-[11px] text-amber-800">
            تم إصدار استدعاء ولي الأمر بناءً على تكرار التأخير الصباحي للطالب
          </span>
        </div>
      )}

      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 8 */}
      <div
        id="printable-official-summon-form"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-7 print:p-0 print:space-y-6"
        style={{
          fontFamily: "'Tajawal', 'Cairo', 'Traditional Arabic', 'Arial', sans-serif",
          lineHeight: 1.9,
          fontSize: '15px',
        }}
        dir="rtl"
      >
          {/* Top Institutional Annex Header (Underlined as in official decree) */}
          <div className="text-center pt-2">
            <p className="font-bold text-sm sm:text-base border-b border-black pb-1 inline-block">
              ملحق (8) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Top institutional block (Emirate, Council, Sector, School on Right; Model No. on Left) */}
          <div className="flex justify-between items-start pt-3">
            <div className="space-y-1 text-sm font-medium leading-relaxed">
              <p>
                <span className="font-bold">إمارة:</span>{' '}
                <span className="font-semibold text-slate-900 border-b border-dotted border-black px-2 inline-block min-w-[140px]">
                  {form.emirate || 'الفجيرة'}
                </span>
              </p>
              <p className="font-bold text-slate-800">ادارة العمليات المدرسية /</p>
              <p>
                <span className="font-bold">المجلس:</span>{' '}
                <span className="font-semibold text-slate-900 border-b border-dotted border-black px-2 inline-block min-w-[140px]">
                  {form.council || 'مجلس 2'}
                </span>
              </p>
              <p>
                <span className="font-bold">نطاق:</span>{' '}
                <span className="font-semibold text-slate-900 border-b border-dotted border-black px-2 inline-block min-w-[140px]">
                  {form.sector || 'نطاق ج'}
                </span>
              </p>
              <p>
                <span className="font-bold">مدرسة:</span>{' '}
                <span className="font-semibold text-slate-900 border-b border-dotted border-black px-2 inline-block min-w-[200px]">
                  {form.school || schoolSettings.schoolName}
                </span>
              </p>
            </div>

            <div className="text-left font-bold text-sm sm:text-base pt-2">
              <span className="px-3 py-1 rounded bg-slate-100 print:bg-transparent inline-block">
                نموذج رقم (8)
              </span>
            </div>
          </div>

          {/* Document Main Heading */}
          <div className="text-center py-3">
            <h2 className="text-xl sm:text-2xl font-black tracking-wide inline-block pb-1 border-b-2 border-black">
              خطاب استدعاء ولي الأمر
            </h2>
          </div>

          {/* Guardian and Grade section */}
          <div className="space-y-3 text-base leading-loose">
            <p>
              <span className="font-bold">ولي أمر الطالب/الطالبة:</span>{' '}
              <span className="font-semibold border-b border-dotted border-black px-3 inline-block min-w-[320px] text-slate-900">
                {form.parentName || `ولي أمر الطالب ${form.studentName}`}
              </span>
            </p>
            <p>
              <span className="font-bold">بالصف:</span>{' '}
              <span className="font-semibold border-b border-dotted border-black px-3 inline-block min-w-[260px] text-slate-900">
                الصف {form.grade} {form.section ? `(شعبة ${form.section})` : ''}
              </span>
            </p>
          </div>

          {/* Greeting */}
          <div className="pt-2 text-center sm:text-right font-bold text-base">
            <p>السلام عليكم ورحمة الله وبركاته</p>
          </div>

          {/* Body Paragraph */}
          <div className="space-y-4 text-base leading-loose text-justify">
            <p>
              الرجاء منكم الحضور إلى المدرسة في يوم{' '}
              <span className="font-bold text-slate-900 border-b border-dotted border-black px-3 inline-block min-w-[120px] text-center">
                {form.summonDay || '...........................'}
              </span>{' '}
              الموافق{' '}
              <span className="font-bold text-slate-900 border-b border-dotted border-black px-2 inline-block min-w-[140px] text-center dir-ltr font-mono">
                {form.summonDate ? `${day} / ${month} / ${year}` : '...../...../..........'}
              </span>
              م {form.summonTime ? `في تمام الساعة (${form.summonTime})` : ''}
            </p>

            <p>
              لمقابلة إدارة المدرسة لموضوع يتعلق بإبنكم / إبنتكم{' '}
              <span className="font-semibold text-slate-900 border-b border-dotted border-black px-2 inline-block min-w-[360px] w-full mt-1">
                {form.subject || '....................................................................'}
              </span>
            </p>

            <p className="pt-2 font-medium">
              شاكرين لكم حسن تعاونكم وتجاوبكم معنا لتحقيق مصلحة الطالب/الطالبة.
            </p>
          </div>

          {/* Dual Column Signature Section */}
          <div className="pt-8 pb-4 grid grid-cols-2 gap-8 items-end border-t border-slate-300 print:border-black/40">
            {/* Right Column: Principal Signature */}
            <div className="space-y-2 text-right">
              <p className="font-black text-base pb-1">مدير/ة المدرسة</p>
              <p className="text-sm">
                <span className="font-bold">الاسم:</span>{' '}
                <span className="font-semibold border-b border-dotted border-black px-2 inline-block min-w-[180px]">
                  {form.principalName || 'أ. أمير علي عبدالشاكر بكري'}
                </span>
              </p>
              <div className="text-sm flex items-center gap-2 min-h-[50px]">
                <span className="font-bold">التوقيع:</span>
                {form.principalSignature ? (
                  <img
                    src={form.principalSignature}
                    alt="توقيع المدير"
                    className="h-10 object-contain inline-block"
                  />
                ) : (
                  <span className="border-b border-dotted border-black inline-block min-w-[160px] h-6"></span>
                )}
              </div>
              <p className="text-sm">
                <span className="font-bold">التاريخ:</span>{' '}
                <span className="font-semibold border-b border-dotted border-black px-2 inline-block min-w-[140px] font-mono">
                  {principalDateParts.year !== '      '
                    ? `${principalDateParts.day}/${principalDateParts.month}/${principalDateParts.year}م`
                    : '...../...../..........م'}
                </span>
              </p>
            </div>

            {/* Left Column: Student Receipt Signature */}
            <div className="space-y-2 text-right border-r border-slate-200 pr-6 print:border-none print:pr-0">
              <div className="flex items-center gap-2 pb-1">
                <p className="font-black text-base text-slate-900">
                  توقيع الطالب/الطالبة على الاستلام
                </p>
                {form.studentSignature && (
                  <span className="no-print inline-flex items-center gap-1 text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    موقّع إلكترونياً
                  </span>
                )}
              </div>
              <p className="text-sm">
                <span className="font-bold">الاسم:</span>{' '}
                <span className="font-semibold border-b border-dotted border-black px-2 inline-block min-w-[180px]">
                  {form.studentName}
                </span>
              </p>
              <div className="text-sm flex items-center gap-2 min-h-[50px]">
                <span className="font-bold">التوقيع:</span>
                {form.studentSignature ? (
                  <div className="border border-emerald-300 bg-emerald-50/40 p-1 rounded-md inline-block print:border-none print:bg-transparent print:p-0">
                    <img
                      src={form.studentSignature}
                      alt={`توقيع الطالب ${form.studentName}`}
                      className="h-11 object-contain inline-block max-w-[180px]"
                    />
                  </div>
                ) : (
                  <span className="border-b border-dotted border-black inline-block min-w-[160px] h-6"></span>
                )}
              </div>
              <p className="text-sm">
                <span className="font-bold">التاريخ:</span>{' '}
                <span className="font-semibold border-b border-dotted border-black px-2 inline-block min-w-[140px] font-mono">
                  {studentDateParts.year !== '      '
                    ? `${studentDateParts.day}/${studentDateParts.month}/${studentDateParts.year}م`
                    : '...../...../..........م'}
                </span>
              </p>
            </div>
          </div>

          {/* Footer note on print */}
          <div className="text-[11px] text-slate-500 text-center pt-2 print:text-black/60 print:block">
            <span>
              نظام إدارة السلوك الطلابي • دولة الإمارات العربية المتحدة • {form.school || schoolSettings.schoolName}
            </span>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
