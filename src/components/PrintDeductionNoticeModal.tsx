import React from 'react';
import { BehaviorDeductionNoticeRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';

interface PrintDeductionNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: BehaviorDeductionNoticeRecord | null;
}

export const PrintDeductionNoticeModal: React.FC<PrintDeductionNoticeModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen || !form) return null;

  const p1 = form.recoveryProposals[0] || 'الالتزام بالسلوك الإيجابي التام والمواظبة على الدوام المدرسي دون أي مخالفة لمدة شهر.';
  const p2 = form.recoveryProposals[1] || 'المشاركة الإيجابية في الأنشطة التطوعية والمبادرات المدرسية وخدمة البيئة التعليمية.';
  const p3 = form.recoveryProposals[2] || 'تقديم مشروع أو ورقة توعوية تخدم الزملاء في مجال الانضباط وتعزيز القيم والسلوك الإيجابي.';

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (20) إخطار بالحسم من درجة السلوك"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-deduction"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 20 */}
      <div
        id="printable-official-deduction-form-20"
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
              ملحق (20) للقرار الوزاري رقم (851) لسنة 2018 م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Form Number Tag */}
          <div className="text-right text-sm font-bold pt-1">
            <span>نموذج رقم (20)</span>
          </div>

          {/* Form Title */}
          <div className="text-center my-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-black border-b-2 border-black inline-block pb-1">
              إخطار بالحسم من درجة السلوك
            </h1>
          </div>

          {/* Top Address to Guardian */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-base pt-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">ولي أمر الطالب/ الطالبة:</span>
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {form.studentName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">بالصف:</span>
              <span className="border-b border-dotted border-black px-3 font-semibold">
                {form.grade} / {form.section}
              </span>
            </div>
          </div>

          {/* Greetings */}
          <div className="pt-2">
            <p className="font-bold text-base">السلام عليكم ورحمة الله وبركاته</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[180px]">السيد ولي أمر الطالب / الطالبة:</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-semibold">
                {form.parentName || form.studentName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[180px]">الصف والشعبة:</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-semibold">
                {form.grade} / {form.section}
              </span>
            </div>
          </div>

          {/* Violation Details */}
          <div className="space-y-3 pt-2 leading-loose">
            <div className="flex flex-wrap items-center gap-2">
              <span>نفيدكم علما بأن ابنكم/ابنتكم ارتكب/ت مخالفة سلوكية من الدرجة</span>
              <span className="border-b border-dotted border-black px-3 font-bold text-slate-900">
                {form.violationDegree || 'الثانية'}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold">وهي:</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-medium">
                {form.violationDescription || 'مخالفة عدم الالتزام باللوائح السلوكية والتعليمات المدرسية'}
              </span>
            </div>

            <p className="text-justify leading-loose">
              وبناء على قرار لجنة السلوك بالمدرسة رقم{' '}
              <span className="font-bold border-b border-dotted border-black px-2">
                {form.committeeDecisionNumber || '2026/01'}
              </span>{' '}
              الموافق من يوم{' '}
              <span className="font-bold border-b border-dotted border-black px-2">
                {form.committeeDecisionDate || '......'}
              </span>{' '}
              م فقد صدر بحق ابنكم / ابنتكم الإجراء التصحيحي المنصوص عليه في لائحة السلوك لوزارة التربية والتعليم وهو حسم{' '}
              <span className="font-bold border-b border-dotted border-black px-3 text-red-700">
                ({form.deductedMarks})
              </span>{' '}
              درجة من درجات السلوك في الفصل الدراسي{' '}
              <span className="font-bold border-b border-dotted border-black px-2">
                {form.term || 'الأول'}
              </span>{' '}
              للعام الدراسي{' '}
              <span className="font-bold border-b border-dotted border-black px-2">
                {form.academicYear || '2025/2026'}
              </span>
              م.
            </p>

            <p className="font-medium pt-1">
              وسوف يعطى الطالب/الطالبة فرصة لاسترجاع جزء من الدرجه حسب ما تنص عليه لائحة السلوك وفقا للمقترحات التاليه:
            </p>

            <div className="space-y-2 pr-4">
              <div className="flex items-start gap-2">
                <span className="font-bold">1-</span>
                <span className="border-b border-dotted border-black flex-1 pb-0.5">{p1}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">2-</span>
                <span className="border-b border-dotted border-black flex-1 pb-0.5">{p2}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold">3-</span>
                <span className="border-b border-dotted border-black flex-1 pb-0.5">{p3}</span>
              </div>
            </div>
          </div>

          {/* Signatures Dual Block */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-black/30">
            {/* Guardian Receipt Signature (Right) */}
            <div className="space-y-2">
              <p className="font-bold text-base border-b border-black/50 pb-1 mb-2">
                توقيع ولي الأمر بالإستلام:
              </p>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">الاسم:</span>
                <span className="border-b border-dotted border-black flex-1 px-1">
                  {form.parentReceiptName || form.parentName || '.....................................'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">التوقيع:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[36px] flex items-center">
                  {form.parentSignature ? (
                    <img
                      src={form.parentSignature}
                      alt="توقيع ولي الأمر"
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
                  {form.parentSignatureDate || form.createdAt || '..../..../2026م'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="min-w-[70px] font-bold">الهاتف:</span>
                <span className="border-b border-dotted border-black flex-1 px-1">
                  {form.parentPhone || '050-XXXXXXX'}
                </span>
              </div>
            </div>

            {/* School Principal Signature (Left) */}
            <div className="space-y-2">
              <p className="font-bold text-base border-b border-black/50 pb-1 mb-2">
                مدير/مديرة المدرسة:
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
                  {form.principalSignatureDate || form.createdAt || '..../..../2026م'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
