import React from 'react';
import { AuthorizedPickupCommitmentRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';

interface PrintAuthorizedPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: AuthorizedPickupCommitmentRecord | null;
}

export const PrintAuthorizedPickupModal: React.FC<PrintAuthorizedPickupModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen || !form) return null;

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (26) تعهد ولي أمر بالأشخاص المخولين لاستلام الطالب"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-pickup"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 26 */}
      <div
        id="printable-official-authorized-pickup-form-26"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-6 print:p-0 print:space-y-6"
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
              ملحق (26) للقرار الوزاري رقم (851) لسنة 2018 م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Form Number Tag */}
          <div className="text-right text-sm font-bold pt-2">
            <span>نموذج رقم ( 26 )</span>
          </div>

          {/* Form Title */}
          <div className="text-center my-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-black border-b-2 border-black inline-block pb-1">
              تعهد ولي أمر بالأشخاص المخولين لاستلام ابنه / ابنته في نهاية الدوام المدرسي
            </h1>
          </div>

          {/* Undertaking Pledge Paragraph */}
          <div className="pt-2 leading-loose text-justify text-base">
            <p>
              أتعهد أنا ولي أمر الطالب / الطالبة:{' '}
              <span className="border-b border-dotted border-black px-4 font-bold">
                {form.studentName}
              </span>{' '}
              بتوصيل ابني / ابنتي من وإلى المدرسة يوميا في الوقت المحدد للحضور والانصراف من المدرسة ، وفي حال كان هناك عذر شخصي سأقوم بالتواصل مع إدارة المدرسة فورا موضحا الأسباب وأرسل الشخص المخول له باصطحاب ابني/ ابنتي.
            </p>
            <p className="pt-3 font-bold">وهذا إقرار مني بذلك .</p>
          </div>

          {/* Student and Parent Section */}
          <div className="space-y-3 pt-3 border-t border-black/20">
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[180px]">اسم الطالب / الطالبة:</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-semibold">
                {form.studentName} ({form.grade} / {form.section})
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="font-bold min-w-[220px]">اسم ولي الأمر اذا كان غير الأب:</span>
                <span className="border-b border-dotted border-black flex-1 px-2">
                  {form.parentNonFatherName || (form.isParentNonFather ? form.parentName : '................................................')}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-[220px]">
                <span className="font-bold">الهاتف:</span>
                <span className="border-b border-dotted border-black px-3 font-medium">
                  {form.parentPhone || '050-XXXXXXX'}
                </span>
              </div>
            </div>
          </div>

          {/* Authorized Representative Section */}
          <div className="space-y-4 pt-4 border-t border-black/20">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="font-bold min-w-[340px]">
                  الشخص المخول له توصيل الطالب / الطالبة من وإلى المدرسة:
                </span>
                <span className="border-b border-dotted border-black flex-1 px-2 font-bold text-slate-900">
                  {form.authorizedPersonName || '................................................'}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-[220px]">
                <span className="font-bold">صلته بالطالب:</span>
                <span className="border-b border-dotted border-black px-3 font-semibold">
                  {form.authorizedPersonRelation || '....................'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                <span className="font-bold min-w-[180px]">رقــــــم هويتـــــــــه:</span>
                <span className="border-b border-dotted border-black flex-1 px-2 font-mono text-sm">
                  {form.authorizedPersonEmiratesId || '784-....-.......-.'}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-[240px]">
                <span className="font-bold">رقـــــم الهــــــاتف:</span>
                <span className="border-b border-dotted border-black px-3 font-medium">
                  {form.authorizedPersonPhone || '050-XXXXXXX'}
                </span>
              </div>
            </div>

            {form.notes && (
              <div className="flex items-start gap-2 pt-1">
                <span className="font-bold min-w-[180px]">ملاحظات / بيانات المركبة:</span>
                <span className="border-b border-dotted border-black flex-1 px-2 text-sm">
                  {form.notes}
                </span>
              </div>
            )}
          </div>

          {/* Parent Signature Block */}
          <div className="pt-10 space-y-4 border-t border-black/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-[350px]">
                <span className="font-bold text-base min-w-[130px]">توقيع ولي الأمر:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[44px] flex items-center">
                  {form.parentSignature ? (
                    <img
                      src={form.parentSignature}
                      alt="توقيع ولي الأمر"
                      className="max-h-12 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400">....................................................................</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">التاريخ:</span>
                <span className="border-b border-dotted border-black px-3 text-sm">
                  {form.issueDate || '.... / .... / 2026 م'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
