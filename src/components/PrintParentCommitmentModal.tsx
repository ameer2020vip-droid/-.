import React from 'react';
import { ParentCommitmentFormRecord } from '../types';
import { getFormattedDateParts } from '../utils/time';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface PrintParentCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: ParentCommitmentFormRecord | null;
}

export const PrintParentCommitmentModal: React.FC<PrintParentCommitmentModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  const { schoolSettings } = useSchoolSettings();
  if (!isOpen || !form) return null;

  const { day: issDay, month: issMonth, year: issYear } = getFormattedDateParts(form.issueDate);

  // Ensure we have at least 3 lines as in the official Ministry form
  const rawViolations = form.violationsList || [];
  const linesToShow = [
    rawViolations[0] || '',
    rawViolations[1] || '',
    rawViolations[2] || '',
    ...rawViolations.slice(3),
  ];

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (10) تعهد ولي الأمر في حال تكرار المخالفات"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-commitment"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 10 */}
      <div
        id="printable-official-parent-commitment-form"
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
              ملحق (10) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Form Header Info Block: Left form number, Right administrative hierarchy */}
          <div className="flex justify-between items-start pt-3">
            {/* Right Side: Administrative Hierarchy */}
            <div className="text-sm space-y-1.5 font-medium leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[140px]">إمارة:</span>
                <span className="border-b border-dotted border-black flex-1 min-w-[180px] px-1 font-bold text-slate-900">
                  {form.emirate || 'الفجيرة'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[140px]">إدارة العمليات المدرسية:</span>
                <span className="border-b border-dotted border-black flex-1 min-w-[180px] px-1 font-semibold text-slate-900">
                  {form.operationsManagement || 'إدارة العمليات المدرسية 2'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[140px]">المجلس:</span>
                <span className="border-b border-dotted border-black flex-1 min-w-[180px] px-1 font-semibold text-slate-900">
                  {form.council || 'المجلس التعليمي 2'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[140px]">نطاق:</span>
                <span className="border-b border-dotted border-black flex-1 min-w-[180px] px-1 font-semibold text-slate-900">
                  {form.sector || 'نطاق 2'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[140px]">مدرسة:</span>
                <span className="border-b border-dotted border-black flex-1 min-w-[180px] px-1 font-bold text-slate-900">
                  {form.schoolName || schoolSettings.schoolName}
                </span>
              </div>
            </div>

            {/* Left Side: Form Number */}
            <div className="text-left font-black text-base sm:text-lg">
              <span>نموذج رقم (10)</span>
            </div>
          </div>

          {/* Form Title */}
          <div className="text-center py-2">
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              تعهد ولي الأمر في حال تكرار مخالفات الطالب / الطالبة
            </h2>
          </div>

          {/* Pledge Text Paragraph with fill-in blanks */}
          <div className="space-y-4 text-base leading-loose font-normal text-justify">
            <div className="flex flex-wrap items-center gap-2">
              <span>أتعهد أنا /</span>
              <span className="font-bold border-b border-dotted border-black min-w-[260px] px-2 text-slate-900">
                {form.parentName || '..........................................................'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span>ولي أمر الطالب / الطالبة:</span>
              <span className="font-bold border-b border-dotted border-black min-w-[280px] px-2 text-slate-900">
                {form.studentName} ({form.studentNumber})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span>في الصف:</span>
              <span className="font-bold border-b border-dotted border-black min-w-[180px] px-2 text-slate-900">
                الصف {form.grade} - الشعبة {form.section}
              </span>
            </div>

            <p className="text-justify leading-relaxed">
              بالتزام ابني / ابنتي بقواعد السلوك والنظام داخل المدرسة، والمحافظة على مرافقها، واتباع التعليمات والنظم المدرسية، وفي حالة مخالفته أكون متحملاً لكافة الإجراءات التي تطبقها إدارة المدرسة بحقه وفق ما جاء في لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام وإنني قد أُحطت علمًا بالمخالفات الصادرة عنه، والتي تمثلت في الآتي:
            </p>

            {/* Numbered Violations List (1-, 2-, 3-) */}
            <div className="space-y-3 pt-2 pr-4 font-medium">
              {linesToShow.map((violation, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="font-bold min-w-[28px]">{idx + 1}-</span>
                  <div className="border-b border-dotted border-black flex-1 min-h-[26px] px-1 font-semibold text-slate-900 leading-relaxed">
                    {violation || '................................................................................................................................................'}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center font-bold text-base pt-3">
              وهذا تعهد مني بذلك
            </p>
          </div>

          {/* Parent Signature and Phone Block */}
          <div className="grid grid-cols-2 gap-6 pt-4 text-sm sm:text-base">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[100px]">اسم ولي الأمر:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-bold text-slate-900">
                  {form.parentName || '....................................'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[100px]">الهاتف:</span>
                <span className="border-b border-dotted border-black flex-1 px-1 font-bold text-slate-900 dir-ltr text-right">
                  {form.parentPhone || '....................................'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-center flex flex-col items-center justify-end">
              <div className="flex items-center gap-2 w-full justify-end">
                <span className="font-bold">التوقيع:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[38px] flex items-center justify-center">
                  {form.parentSignature ? (
                    <img
                      src={form.parentSignature}
                      alt="توقيع ولي الأمر"
                      className="max-h-12 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs">....................................</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Endorsement Block by Vice Principal / Assistant Principal */}
          <div className="pt-8 border-t border-dashed border-slate-300 print:border-black/30">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">يعتمد، مساعد مدير المدرسة:</span>
                  <span className="border-b border-dotted border-black min-w-[220px] px-2 font-bold text-slate-900">
                    {form.vicePrincipalName || 'سلطان سالم الكعبي'}
                  </span>
                </div>
                {form.vicePrincipalSignature && (
                  <div className="pr-4 pt-1">
                    <img
                      src={form.vicePrincipalSignature}
                      alt="توقيع مساعد المدير"
                      className="max-h-12 object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Issue Date */}
              <div className="text-left font-bold text-sm sm:text-base">
                <span>تحريرًا في:</span>{' '}
                <span className="border-b border-dotted border-black px-3 font-bold">
                  {issDay ? `${issDay} / ${issMonth} / ${issYear} م` : '    /    /        م'}
                </span>
              </div>
            </div>
          </div>

          {/* Official Stamp Box for Print */}
          <div className="hidden print:flex justify-between items-center text-xs text-slate-500 pt-6 border-t border-slate-200">
            <span>مؤسسة الإمارات للتعليم المدرسي - قطاع العمليات المدرسية</span>
            <div className="border border-black/40 rounded-lg p-3 text-center min-w-[120px]">
              <span>ختم المدرسة</span>
            </div>
            <span>وثيقة رسمية معتمدة وفق القرار الوزاري 851 لسنة 2018م</span>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
