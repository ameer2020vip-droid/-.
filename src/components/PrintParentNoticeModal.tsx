import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { ParentNoticeFormRecord, ParentNoticeType } from '../types';
import { getFormattedDateParts } from '../utils/time';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface PrintParentNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ParentNoticeFormRecord | null;
}

const ALL_NOTICE_TYPES: ParentNoticeType[] = [
  'تنبيه خطي',
  'تحذير',
  'إنذار أول',
  'إنذار ثاني',
  'إنذار نهائي',
];

export const PrintParentNoticeModal: React.FC<PrintParentNoticeModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  const { schoolSettings } = useSchoolSettings();
  if (!isOpen || !form) return null;

  const { day: incDay, month: incMonth, year: incYear } = getFormattedDateParts(form.incidentDate);
  const { day: issDay, month: issMonth, year: issYear } = getFormattedDateParts(form.issueDate || form.incidentDate);

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={`معاينة الطباعة – نموذج رقم (7) إخطار ولي الأمر (${form.noticeType})`}
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-notice"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 7 */}
      <div
        id="printable-official-parent-notice-form"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-7 print:p-0 print:space-y-6"
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
              ملحق (7) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Model Number (Top Left/Right as in official sheet) */}
          <div className="flex justify-between items-start pt-1">
            <div className="text-sm font-bold text-slate-900">
              نموذج رقم ( 7 )
            </div>
            {form.status === 'معتمد ومسلّم' && (
              <div className="no-print inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                معتمد وموثق رسمياً
              </div>
            )}
          </div>

          {/* Center Title Block */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center flex-wrap gap-2 text-base sm:text-lg font-bold text-black py-1">
              {ALL_NOTICE_TYPES.map((type, idx) => {
                const isSelected = form.noticeType === type;
                return (
                  <React.Fragment key={type}>
                    <span
                      className={`px-2 py-0.5 transition-all ${
                        isSelected
                          ? 'border-2 border-black rounded-md font-black bg-slate-100/80 shadow-xs'
                          : 'text-slate-700 opacity-80'
                      }`}
                    >
                      {type}
                    </span>
                    {idx < ALL_NOTICE_TYPES.length - 1 && <span className="text-slate-400">/</span>}
                  </React.Fragment>
                );
              })}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-black tracking-wide">
              إلى ولي الأمر
            </h2>
          </div>

          {/* Institutional Block (Emirate, School Operations, Council, Sector, School) */}
          <div className="space-y-1.5 text-sm font-medium leading-relaxed max-w-sm">
            <p>
              <span className="font-bold">إمارة:</span>{' '}
              <span className="font-semibold text-black border-b border-dotted border-black px-2 inline-block min-w-[160px]">
                {form.emirate || 'الشارقة'}
              </span>
            </p>
            <p>
              <span className="font-bold">إدارة العمليات المدرسية:</span>{' '}
              <span className="font-semibold text-black border-b border-dotted border-black px-2 inline-block min-w-[160px]">
                {form.operationsManagement || 'إدارة العمليات المدرسية الأولى'}
              </span>
            </p>
            <p>
              <span className="font-bold">المجلس:</span>{' '}
              <span className="font-semibold text-black border-b border-dotted border-black px-2 inline-block min-w-[160px]">
                {form.council || 'مجلس 1'}
              </span>
            </p>
            <p>
              <span className="font-bold">نطاق:</span>{' '}
              <span className="font-semibold text-black border-b border-dotted border-black px-2 inline-block min-w-[160px]">
                {form.sector || 'نطاق 2'}
              </span>
            </p>
            <p>
              <span className="font-bold">مدرسة:</span>{' '}
              <span className="font-semibold text-black border-b border-dotted border-black px-2 inline-block min-w-[160px]">
                {form.schoolName || schoolSettings.schoolName}
              </span>
            </p>
          </div>

          {/* Recipient Addressee Block */}
          <div className="pt-2 text-sm sm:text-base leading-relaxed">
            <p>
              <span className="font-bold">السيد ولي أمر الطالب / الطالبة:</span>{' '}
              <span className="font-bold text-black border-b border-dotted border-black px-3 inline-block min-w-[220px]">
                {form.studentName}
              </span>
              {' '}
              <span className="font-bold mr-4">الصف والشعبة:</span>{' '}
              <span className="font-bold text-black border-b border-dotted border-black px-3 inline-block min-w-[130px]">
                {form.grade} / {form.section}
              </span>
            </p>
          </div>

          {/* Salutation */}
          <div className="pt-1">
            <p className="font-bold text-base text-black">
              تحية طيبة وبعد ،،،
            </p>
          </div>

          {/* Main Statement Paragraph */}
          <div className="space-y-3 text-sm sm:text-base leading-loose text-justify">
            <p>
              <span>حيث إنه في يوم</span>{' '}
              <span className="font-bold border-b border-dotted border-black px-2 inline-block min-w-[90px] text-center">
                {form.incidentDay || '............'}
              </span>{' '}
              <span>الموافق</span>{' '}
              <span className="font-bold border-b border-dotted border-black px-2 inline-block min-w-[120px] text-center" dir="ltr">
                {incYear ? `${incDay} / ${incMonth} / ${incYear} م` : form.incidentDate}
              </span>{' '}
              <span>قد صــــــــدر عن الطالب المذكور / الطالبة المذكورة مخالفة سلوكية تمثلت في:</span>
            </p>

            {/* Violation Details Lines */}
            <div className="min-h-[70px] border border-slate-300 rounded-md p-3.5 bg-slate-50/50 text-slate-900 font-semibold leading-relaxed print:bg-white print:border-slate-400">
              {form.violationDetails || '....................................................................................................................................................................'}
            </div>

            {/* Warning Paragraph (Exact Ministerial Phrasing) */}
            <p className="pt-1 text-slate-900">
              ولما كان هذا السلوك يخالف اللوائح والنظم المدرسية، وما ورد في لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام؛ فإنه يتوجب عليكم الحرص على متابعة الطالب للحيلولة دون تكرار مثل هذا السلوك، وإلا فإن إدارة المدرسة سوف تضطر لاتخاذ إجراءات أخرى أشد في حال تكرار هذه المخالفة أو صدور سلوك غير مرغوب فيه مرة أخرى.
            </p>
          </div>

          {/* Signatures Section (Matching Official Annex 7 Layout) */}
          <div className="pt-6 space-y-6">
            {/* Top Signatures: Officer vs Principal */}
            <div className="grid grid-cols-2 gap-8 text-center text-sm sm:text-base font-bold">
              <div>
                <p>توقيع الموظف المسؤول</p>
                <div className="h-16 flex items-center justify-center">
                  {form.officerSignature ? (
                    <img
                      src={form.officerSignature}
                      alt="توقيع الموظف المسؤول"
                      className="max-h-14 max-w-[170px] object-contain"
                    />
                  ) : (
                    <div className="w-40 border-b border-dotted border-black mt-10"></div>
                  )}
                </div>
                <p className="text-xs text-slate-700 font-normal">
                  {form.officerName ? `الاسم: ${form.officerName}` : '.....................................'}
                </p>
              </div>

              <div>
                <p>مدير المدرسة</p>
                <div className="h-16 flex items-center justify-center">
                  {form.principalSignature ? (
                    <img
                      src={form.principalSignature}
                      alt="توقيع مدير المدرسة"
                      className="max-h-14 max-w-[170px] object-contain"
                    />
                  ) : (
                    <div className="w-40 border-b border-dotted border-black mt-10"></div>
                  )}
                </div>
                <p className="text-xs text-slate-700 font-normal">
                  {form.principalName ? `الاسم: ${form.principalName}` : '.....................................'}
                </p>
              </div>
            </div>

            {/* Bottom Signatures: Student vs Parent */}
            <div className="grid grid-cols-2 gap-8 text-center text-sm font-medium pt-2">
              <div className="text-right">
                <p>
                  <span className="font-bold">توقيع الطالب / الطالبة بالعلم:</span>{' '}
                  {form.studentSignature ? (
                    <img
                      src={form.studentSignature}
                      alt="توقيع الطالب"
                      className="max-h-12 inline-block mr-2"
                    />
                  ) : (
                    <span className="border-b border-dotted border-black inline-block min-w-[160px]"></span>
                  )}
                </p>
              </div>

              <div className="text-right">
                <p>
                  <span className="font-bold">توقيع ولي أمر الطالب / الطالبة بالعلم:</span>{' '}
                  {form.parentSignature ? (
                    <img
                      src={form.parentSignature}
                      alt="توقيع ولي الأمر"
                      className="max-h-12 inline-block mr-2"
                    />
                  ) : (
                    <span className="border-b border-dotted border-black inline-block min-w-[160px]"></span>
                  )}
                </p>
              </div>
            </div>

            {/* Contact Phone & Date */}
            <div className="flex justify-between items-center pt-2 text-sm">
              <p className="font-medium">
                <span className="font-bold">الهاتف:</span>{' '}
                <span className="border-b border-dotted border-black px-2 inline-block min-w-[180px]" dir="ltr">
                  {form.parentPhone || '.......................................'}
                </span>
              </p>

              <p className="font-medium text-left" dir="rtl">
                <span className="font-bold">تحريرًا في:</span>{' '}
                <span className="border-b border-dotted border-black px-2 inline-block min-w-[130px] text-center" dir="ltr">
                  {issYear ? `${issDay} / ${issMonth} / ${issYear} م` : '    /    /        م'}
                </span>
              </p>
            </div>
          </div>

          {/* Official Verification Stamp in Print */}
          {form.status === 'معتمد ومسلّم' && (
            <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-xs text-slate-500">
              <span>رقم التوثيق المرجعي: {form.id}</span>
              <span>تم اعتماده وتوثيقه بسجلات شؤون الطلبة - {form.schoolName || schoolSettings.schoolName}</span>
            </div>
          )}
        </div>
      </PrintPreviewModalWrapper>
    );
  };
