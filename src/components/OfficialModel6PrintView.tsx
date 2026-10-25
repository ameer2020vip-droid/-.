import React from 'react';
import { OfficialDocumentRecord } from '../types';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import moeHeaderImage from '../assets/images/regenerated_image_1791258383920.jpg';

interface OfficialModel6PrintViewProps {
  isOpen: boolean;
  onClose: () => void;
  document: OfficialDocumentRecord | null;
}

export const OfficialModel6PrintView: React.FC<OfficialModel6PrintViewProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  if (!isOpen || !doc) return null;

  // Level classification helpers
  const levelStr = doc.violationDegree || '';
  const isDegree1 = levelStr.includes('الأولى');
  const isDegree2 = levelStr.includes('الثانية');
  const isDegree3 = levelStr.includes('الثالثة');
  const isDegree4 = levelStr.includes('الرابعة');
  const occurrence = Number(doc.repetitionCount) || 1;

  // Occurrence checks for Degree 1
  const isDeg1Occ1 = isDegree1 && occurrence === 1;
  const isDeg1Occ2 = isDegree1 && occurrence === 2;
  const isDeg1Occ3 = isDegree1 && occurrence >= 3;

  // Occurrence checks for Degree 2
  const isDeg2Occ1 = isDegree2 && occurrence === 1;
  const isDeg2Occ2 = isDegree2 && occurrence > 1;

  // Degree 3 & 4
  const isDeg3 = isDegree3;
  const isDeg4 = isDegree4;

  const reporterName = doc.reportingStaffName || doc.specificData?.teacherName || '';
  const reporterRole = doc.reportingStaffRole || 'معلم';
  const oracleNumber = doc.reportingStaffOracle || doc.specificData?.oracleNumber || '';
  const principalName = doc.approvedBy || doc.specificData?.principalName || 'مدير المدرسة';
  const incidentDate = doc.incidentDate || doc.issueDate || '';
  const incidentTime = doc.incidentTime || '';
  const incidentSituation = doc.specificData?.incidentSituation || 'أثناء اليوم الدراسي';
  const incidentPlace = doc.incidentLocation || '';
  const immediateAction = doc.specificData?.immediateAction || doc.specificData?.suggestedAction || '';

  // Extract signatures
  const teacherSig = doc.signatures?.find((s) => s.role === 'teacher');
  const principalSig = doc.signatures?.find((s) => s.role === 'principal');
  const counselorSig = doc.signatures?.find((s) => s.role === 'counselor');

  const teacherSignatureImage = teacherSig?.signatureDataUrl;
  const principalSignatureImage = principalSig?.signatureDataUrl;

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة النموذج الرسمي – نموذج رقم (6) تقرير مخالفة"
      subtitle={`ملحق (6) للقرار الوزاري رقم (851) لسنة 2018م • الطالب: ${doc.studentName} (${doc.documentId})`}
      printButtonId="btn-print-official-model6"
      printButtonText="طباعة النموذج الرسمي (A4) / حفظ PDF"
      defaultZoom={85}
    >
      {/* Printable Sheet: Exact 1:1 replica of official ministerial Annex (6), strictly single-page A4 */}
      <div
        id="printable-official-model6"
        className="w-full max-w-[210mm] mx-auto px-8 py-6 sm:px-12 sm:py-8 text-black bg-white text-right print:p-0 print:m-0 print:w-full print:max-w-none print:shadow-none print:text-black"
        style={{
          fontFamily: "'Cairo', 'Traditional Arabic', 'Tajawal', 'Arial', sans-serif",
          lineHeight: 1.45,
          fontSize: '13.5px',
          color: '#000000',
        }}
        dir="rtl"
      >
        {/* ========================================================================= */}
        {/* 1. OFFICIAL MOE EMBLEM BANNER                                             */}
        {/* ========================================================================= */}
        <div className="w-full text-center pb-1 select-none">
          <img
            src={moeHeaderImage}
            alt="وزارة التربية والتعليم - دولة الإمارات العربية المتحدة"
            className="w-[360px] max-w-[380px] h-auto mx-auto object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== '/assets/images/regenerated_image_1791258383920.jpg') {
                target.src = '/assets/images/regenerated_image_1791258383920.jpg';
              }
            }}
          />
        </div>

        {/* Decree Annex Title Bar (Centered & Underlined) */}
        <div className="text-center mt-1 mb-1.5">
          <span className="font-bold text-xs sm:text-[12.5px] border-b border-black pb-0.5 inline-block text-black">
            ملحق (6) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
          </span>
        </div>

        {/* Model Number Tag (Placed on the far LEFT as in Official Reference Image) */}
        <div className="text-left font-bold text-sm text-black mb-1 flex items-center justify-between">
          <span className="text-[11px] font-mono font-normal text-slate-600 no-print print:hidden">
            معرف المستند: {doc.documentId}
          </span>
          <span>نموذج رقم ( 6 )</span>
        </div>

        {/* Form Title (Centered & Bold) */}
        <div className="text-center mb-3">
          <h1 className="text-lg sm:text-xl font-bold tracking-wide text-black">
            تقرير مخالفة
          </h1>
        </div>

        {/* ========================================================================= */}
        {/* 2. THE 7 INCIDENT FIELDS (STACKED ON THE RIGHT EXACTLY AS IN IMAGE)        */}
        {/* ========================================================================= */}
        <div className="space-y-2 mb-3.5 text-sm text-black">
          {/* Row 1: اسم الطالب / الطالبة */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              اسم الطالب / الطالبة:
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-bold text-black min-h-[22px] flex items-center justify-center">
              {doc.studentName || ''}
            </div>
          </div>

          {/* Row 2: الصف */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              الصف:
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-semibold text-black min-h-[22px] flex items-center justify-center">
              {doc.grade
                ? `الصف ${doc.grade}${doc.section ? ` / ${doc.section}` : ''}${
                    doc.stream ? ` (${doc.stream})` : ''
                  }`
                : ''}
            </div>
          </div>

          {/* Row 3: اسم المعلم */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              اسم المعلم:
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-semibold text-black min-h-[22px] flex items-center justify-center">
              {reporterName || ''}
            </div>
          </div>

          {/* Row 4: تاريخ الحدوث */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              تاريخ الحدوث
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-mono font-semibold text-black min-h-[22px] flex items-center justify-center">
              {incidentDate || ''}
            </div>
          </div>

          {/* Row 5: الموقف */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              الموقف:
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-semibold text-black min-h-[22px] flex items-center justify-center">
              {incidentSituation || ''}
            </div>
          </div>

          {/* Row 6: مكان حدوث الموقف */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              مكان حدوث الموقف:
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-semibold text-black min-h-[22px] flex items-center justify-center">
              {incidentPlace || ''}
            </div>
          </div>

          {/* Row 7: الوقت */}
          <div className="flex items-center justify-start gap-3 h-[25px]">
            <span className="font-normal text-black text-right whitespace-nowrap min-w-[130px]">
              الوقت:
            </span>
            <div className="w-[340px] max-w-[340px] border-b border-dotted border-black px-2 text-center font-mono font-semibold text-black min-h-[22px] flex items-center justify-center">
              {incidentTime || ''}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. INCIDENT DESCRIPTION                                                   */}
        {/* ========================================================================= */}
        <div className="flex items-baseline justify-start gap-2 mb-3 text-sm text-black">
          <span className="font-normal text-black text-right whitespace-nowrap">
            وصف التصرف / الحادثة / الموقف:
          </span>
          <div className="flex-1 border-b border-dotted border-black min-h-[24px] pb-0.5 px-2 text-right font-normal leading-relaxed">
            {doc.incidentDescription || doc.violationTitle || ''}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. ACTION TAKEN                                                           */}
        {/* ========================================================================= */}
        <div className="flex items-baseline justify-start gap-2 mb-3.5 text-sm text-black">
          <span className="font-normal text-black text-right whitespace-nowrap">
            الإجراء المتخذ :
          </span>
          <div className="flex-1 border-b border-dotted border-black min-h-[24px] pb-0.5 px-2 text-right font-normal leading-relaxed">
            {immediateAction || ''}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. VIOLATION CLASSIFICATION                                               */}
        {/* ========================================================================= */}
        <div className="mb-4 text-sm text-black text-right">
          <div className="text-right mb-1.5">
            <span className="font-normal border-b border-black pb-0.5 inline-block text-black">
              تصنيف المخالفة: (حسب لائحة إدارة سلوك الطلبة)
            </span>
          </div>

          <div className="space-y-1.5 pr-0 text-sm text-black text-right">
            {/* Degree 1 */}
            <div className="flex items-center justify-start gap-2.5">
              <span
                className={`inline-block w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0 ${
                  isDegree1 ? 'bg-black' : 'bg-transparent'
                }`}
              >
                {isDegree1 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-normal text-black">
                <span>درجة أولى حال ارتكابها</span>
                <span>({isDeg1Occ1 ? ' ✓ ' : '   '}) المرة الأولى</span>
                <span>({isDeg1Occ2 ? ' ✓ ' : '   '}) المرة الثانية</span>
                <span>({isDeg1Occ3 ? ' ✓ ' : '   '}) المرة الثالثة</span>
              </div>
            </div>

            {/* Degree 2 */}
            <div className="flex items-center justify-start gap-2.5">
              <span
                className={`inline-block w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0 ${
                  isDegree2 ? 'bg-black' : 'bg-transparent'
                }`}
              >
                {isDegree2 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-normal text-black">
                <span>درجة ثانية حال ارتكابها</span>
                <span>({isDeg2Occ1 ? ' ✓ ' : '   '}) المرة الأولى</span>
                <span>({isDeg2Occ2 ? ' ✓ ' : '   '})</span>
              </div>
            </div>

            {/* Degree 3 */}
            <div className="flex items-center justify-start gap-2.5">
              <span
                className={`inline-block w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0 ${
                  isDegree3 ? 'bg-black' : 'bg-transparent'
                }`}
              >
                {isDegree3 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </span>
              <div className="flex items-center gap-2 font-normal text-black">
                <span>درجة ثالثة حال ارتكابها</span>
                <span>({isDeg3 ? ' ✓ ' : '   '})</span>
              </div>
            </div>

            {/* Degree 4 */}
            <div className="flex items-center justify-start gap-2.5">
              <span
                className={`inline-block w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0 ${
                  isDegree4 ? 'bg-black' : 'bg-transparent'
                }`}
              >
                {isDegree4 && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
              </span>
              <div className="flex items-center gap-2 font-normal text-black">
                <span>درجة رابعة المرة الأولى</span>
                <span>({isDeg4 ? ' ✓ ' : '   '})</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. SIGNATURES & METADATA SECTION                                          */}
        {/* ========================================================================= */}
        <div className="space-y-2.5 pt-1 text-sm text-black text-right">
          {/* Row 1: اسم محرر المخالفة & الوظيفة */}
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-normal whitespace-nowrap">اسم محرر المخالفة:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-semibold min-h-[22px] flex items-center">
                {reporterName || ''}
              </div>
            </div>

            <div className="flex items-center gap-2 w-[260px]">
              <span className="font-normal whitespace-nowrap">الوظيفة:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-semibold min-h-[22px] flex items-center">
                {reporterRole || ''}
              </div>
            </div>
          </div>

          {/* Row 2: رقم الأوراكل & التوقيع & مدير المدرسة */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-normal whitespace-nowrap">رقم الأوراكل:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-mono font-semibold min-h-[22px] flex items-center">
                {oracleNumber || ''}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="font-normal whitespace-nowrap">التوقيع:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 min-h-[26px] flex items-center justify-center">
                {teacherSignatureImage ? (
                  <img src={teacherSignatureImage} alt="توقيع المعلم" className="max-h-6 object-contain" />
                ) : (
                  <span className="text-slate-500 font-serif italic text-xs select-none">
                    {teacherSig ? teacherSig.signerName : (doc.status === 'approved' || doc.status === 'signed' ? reporterName : '')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="font-normal whitespace-nowrap">مدير المدرسة:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-semibold min-h-[22px] flex items-center">
                {principalSignatureImage ? (
                  <img src={principalSignatureImage} alt="اعتماد المدير" className="max-h-6 object-contain ml-2 inline-block" />
                ) : null}
                <span>{principalName || ''}</span>
              </div>
            </div>
          </div>

          {/* Row 3: التاريخ & الوقت */}
          <div className="flex items-center justify-start gap-12 pt-0.5">
            <div className="flex items-center gap-2 w-[240px]">
              <span className="font-normal whitespace-nowrap">التاريخ:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-mono font-semibold min-h-[22px] flex items-center">
                {incidentDate || ''}
              </div>
            </div>

            <div className="flex items-center gap-2 w-[220px]">
              <span className="font-normal whitespace-nowrap">الوقت:</span>
              <div className="flex-1 border-b border-dotted border-black pb-0.5 px-2 font-mono font-semibold min-h-[22px] flex items-center">
                {incidentTime || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Electronic Verification info: shown only on screen preview, strictly hidden in print */}
        {(doc.status === 'approved' || doc.signatures?.length > 0) && (
          <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[11px] text-slate-500 no-print print:hidden">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className={`w-2 h-2 rounded-full inline-block ${doc.status === 'approved' ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
              <span>توثيق إلكتروني • المستند: {doc.documentId} ({doc.status === 'approved' ? 'معتمد رسمياً' : 'موقع'})</span>
            </div>
            <div className="font-mono text-[10px]">
              التوقيعات الموثقة: {doc.signatures?.map((s) => `${s.signerName} (${s.roleTitleAr})`).join(' · ') || 'قيد الاستكمال'}
            </div>
          </div>
        )}
      </div>
    </PrintPreviewModalWrapper>
  );
};
