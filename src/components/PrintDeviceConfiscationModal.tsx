import React from 'react';
import { DeviceConfiscationRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';

interface PrintDeviceConfiscationModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: DeviceConfiscationRecord | null;
}

export const PrintDeviceConfiscationModal: React.FC<PrintDeviceConfiscationModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  if (!isOpen || !form) return null;

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (24) مصادرة أجهزة الكترونية"
      subtitle={`الطالب: ${form.studentName} • ${form.grade || ''}`}
      printButtonId="btn-modal-print-confiscation"
      printButtonText="طباعة النموذج (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 24 */}
      <div
        id="printable-official-confiscation-form-24"
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
              ملحق (24) للقرار الوزاري رقم (851) لسنة 2018 م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
            </p>
          </div>

          {/* Form Number Tag */}
          <div className="text-right text-sm font-bold pt-2">
            <span>نموذج رقم ( 24 )</span>
          </div>

          {/* Form Title */}
          <div className="text-center my-4">
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-black border-b-2 border-black inline-block pb-1">
              "مصادرة أجهزة الكترونية"
            </h1>
          </div>

          {/* Recipient Parent and Grade Info */}
          <div className="space-y-3 pt-2 font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[200px]">السيد ولي أمر الطالب / الطالبة:</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-semibold">
                {form.parentName || form.studentName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold min-w-[200px]">الصف والشعبة:</span>
              <span className="border-b border-dotted border-black flex-1 px-2 font-semibold">
                {form.grade} / {form.section}
              </span>
            </div>
          </div>

          {/* Greetings */}
          <div className="pt-2">
            <p className="font-bold text-base">تحية طيبة وبعد</p>
          </div>

          {/* Body Statement */}
          <div className="space-y-4 pt-1 leading-loose text-justify">
            <p>
              نحيطكم علما بأنه تمت مصادرة جهاز{' '}
              <span className="border-b border-dotted border-black px-4 font-bold text-red-700">
                {form.deviceDescription || 'هاتف محمول / جهاز إلكتروني'}
              </span>{' '}
              بحوزة ابنكم / ابنتكم وهذا يعد مخالفا للنظم واللوائح المدرسية وما جاء في لائحة ادارة سلوك الطلبة في مؤسسات التعليم العام .
            </p>

            <p>
              وعليه سيتم الاحتفاظ بالجهاز لمدة ({' '}
              <span className="border-b border-dotted border-black px-3 font-bold">
                {form.retentionDuration || 'أسبوع دراسي كامل'}
              </span>{' '}
              ) أما اذا ثبت أن الجهاز يحتوي على صور لأحد أعضاء الهيئة الإدارية والتدريسية أو أحد الطلبة أو به بعض ما ينافي الدين و العادات والتقاليد والأعراف في دولة الإمارات فإنه سيتم تسليمه للجهات المعنية لاتخاذ إجراءاتها .
            </p>
          </div>

          {/* Signatures Area */}
          <div className="pt-10 space-y-6 border-t border-black/30">
            {/* Top Signatures Line: Officer & Principal */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <span className="font-bold">توقيع الموظف المسؤول:</span>
                <div className="border-b border-dotted border-black min-h-[36px] flex items-center">
                  {form.officerSignature ? (
                    <img
                      src={form.officerSignature}
                      alt="توقيع الموظف"
                      className="max-h-10 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400">..................................................</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold">مدير المدرسة:</span>
                <div className="border-b border-dotted border-black min-h-[36px] flex items-center">
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
            </div>

            {/* Parent Signature Line */}
            <div className="space-y-3 pt-3">
              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[210px]">توقيع ولي أمر الطالب / الطالبة:</span>
                <div className="border-b border-dotted border-black flex-1 min-h-[36px] flex items-center">
                  {form.parentSignature ? (
                    <img
                      src={form.parentSignature}
                      alt="توقيع ولي الأمر"
                      className="max-h-10 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400">....................................................................</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold min-w-[210px]">الهاتف:</span>
                <span className="border-b border-dotted border-black flex-1 px-2 font-medium">
                  {form.parentPhone || '050-XXXXXXX'}
                </span>
              </div>
            </div>

            {/* Date Tag */}
            <div className="pt-4 flex justify-end">
              <div className="flex items-center gap-1 font-bold text-sm">
                <span>حرر في:</span>
                <span className="border-b border-dotted border-black px-3 font-semibold">
                  {form.confiscationDate || '.... / .... / 2026 م'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </PrintPreviewModalWrapper>
    );
  };
