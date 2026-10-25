import React from 'react';
import { AttendanceCommitmentRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';

interface PrintAttendanceCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: AttendanceCommitmentRecord | null;
}

export const PrintAttendanceCommitmentModal: React.FC<PrintAttendanceCommitmentModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen || !form) return null;

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (27) تعهد ولي أمر بالتزام ابنه/ ابنته بالدوام المدرسي"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-attendance"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 27 */}
      <div
        id="printable-official-attendance-commitment-form-27"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-7 print:p-0 print:space-y-6"
        style={{
          fontFamily: "'Tajawal', 'Cairo', 'Traditional Arabic', 'Arial', sans-serif",
          lineHeight: 2,
          fontSize: '16px',
        }}
        dir="rtl"
      >
          {/* Top Annex Decree Header (Underlined) */}
          <div className="text-center pt-2">
            <p className="font-bold text-sm sm:text-base border-b border-black pb-1 inline-block">
              ملحق (27) للقرار الوزاري رقم (851) لسنة 2018 م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Form Number Tag */}
          <div className="text-right text-sm font-bold pt-2">
            <span>نموذج رقم ( 27 )</span>
          </div>

          {/* Form Title */}
          <div className="text-center my-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-black border-b-2 border-black inline-block pb-1">
              تعهد ولي أمر بالتزام ابنه/ ابنته بالدوام المدرسي
            </h1>
          </div>

          {/* Undertaking Pledge Text */}
          <div className="space-y-4 pt-2 leading-loose text-justify text-base">
            <p>
              أتعهد أنا ولي أمر الطالب / الطالبة:{' '}
              <span className="border-b border-dotted border-black px-4 font-bold text-slate-900">
                {form.studentName}
              </span>{' '}
              ({form.grade} / {form.section}) بالتزام ابني/ ابنتي بالدوام المدرسي، وعدم تغيبه إلا بعذر مقبول.
            </p>

            <p>
              وأنا على علم بأن الأعذار المقبولة هي (المرض، السفر للعلاج للخارج، وفاة أحد الأقارب) وسأقوم بتوفير عذر ورقي لمرض ابني/ ابنتي حسب سياسة وزارة التربية والتعليم.
            </p>

            <p>
              وفي حال كان هناك عذر شخصي سأقوم بالتواصل مع إدارة المدرسة خلال يومين من العذر لتوضيح سبب الغياب.
            </p>
          </div>

          {/* Statutory Absence Procedures Progression Box */}
          <div className="pt-4">
            <div className="border-2 border-black p-4 bg-slate-50 space-y-2">
              <p className="font-bold text-center border-b border-black pb-1 mb-2 text-slate-900">
                جدول تدرج إجراءات الغياب الرسمي المعتمد في لائحة إدارة سلوك الطلبة:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm font-semibold">
                <div className="border border-black p-2 bg-white">
                  <p className="font-bold text-slate-900">الإنذار الشفوي</p>
                  <p className="text-xs font-normal mt-1 text-slate-700">بعد غياب 3 أيام</p>
                </div>
                <div className="border border-black p-2 bg-white">
                  <p className="font-bold text-slate-900">إخطار أول</p>
                  <p className="text-xs font-normal mt-1 text-slate-700">بعد غياب 5 أيام</p>
                </div>
                <div className="border border-black p-2 bg-white">
                  <p className="font-bold text-slate-900">إخطار ثاني</p>
                  <p className="text-xs font-normal mt-1 text-slate-700">بعد غياب 10 أيام</p>
                </div>
                <div className="border border-black p-2 bg-white">
                  <p className="font-bold text-slate-900">إخطار ثالث</p>
                  <p className="text-xs font-normal mt-1 text-slate-700">بعد غياب 14 يوماً</p>
                </div>
                <div className="border border-black p-2 bg-red-50 text-red-950 col-span-2 sm:col-span-1">
                  <p className="font-bold text-red-700">فصل الطالب</p>
                  <p className="text-xs font-normal mt-1 text-red-800">بعد 15 يوماً غياب</p>
                </div>
              </div>
            </div>
          </div>

          {/* Parent Signature and Info Block */}
          <div className="pt-8 space-y-4 border-t border-black/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[120px]">اسم ولي الأمر:</span>
                <span className="border-b border-dotted border-black flex-1 px-2 font-semibold">
                  {form.parentName || '................................................'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[100px]">صلة القرابة:</span>
                <span className="border-b border-dotted border-black flex-1 px-2">
                  {form.parentRelation || 'الأب'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[120px]">توقيع ولي الأمر:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[44px] flex items-center">
                  {form.parentSignature ? (
                    <img
                      src={form.parentSignature}
                      alt="توقيع ولي الأمر"
                      className="max-h-12 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400">................................................</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[100px]">التاريخ:</span>
                <span className="border-b border-dotted border-black flex-1 px-2">
                  {form.parentSignatureDate || form.issueDate || '.... / .... / 2026 م'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
