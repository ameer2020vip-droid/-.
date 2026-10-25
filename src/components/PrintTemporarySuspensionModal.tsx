import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TemporarySuspensionFormRecord } from '../types';
import { getFormattedDateParts } from '../utils/time';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface PrintTemporarySuspensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: TemporarySuspensionFormRecord | null;
}

export const PrintTemporarySuspensionModal: React.FC<PrintTemporarySuspensionModalProps> = ({
  isOpen,
  onClose,
  form,
}) => {
  const { schoolSettings } = useSchoolSettings();
  if (!isOpen || !form) return null;

  const { day: startDay, month: startMonth, year: startYear } = getFormattedDateParts(form.suspensionStartDate);
  const { day: endDay, month: endMonth, year: endYear } = getFormattedDateParts(form.suspensionEndDate);
  const { day: meetDay, month: meetMonth, year: meetYear } = getFormattedDateParts(form.meetingDate || form.issueDate);
  const { day: issDay, month: issMonth, year: issYear } = getFormattedDateParts(form.issueDate);

  const displayEmirate = form.emirate || schoolSettings.emirate || '..........................';
  const displayCouncil = form.council || schoolSettings.schoolCycle || '..............................';
  const displaySector = form.sector || '.................................';
  const displaySchool = form.schoolName || schoolSettings.schoolName || '.........................';

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="معاينة الطباعة – نموذج رقم (12) قرار إيقاف مؤقت من الدراسة"
      subtitle={`الطالب: ${form.studentName} • الصف: ${form.grade} (${form.section})`}
      printButtonId="btn-modal-print-suspension"
      printButtonText="طباعة القرار (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Printable Official Sheet: Exact Match to Ministry Official Form No. 12 */}
      <div
        id="printable-official-suspension-form"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-6 print:p-0 print:space-y-5"
        style={{
          fontFamily: "'Tajawal', 'Cairo', 'Traditional Arabic', 'Arial', sans-serif",
          lineHeight: 1.85,
          fontSize: '15px',
        }}
        dir="rtl"
      >
        {/* Top Annex Decree Header (Underlined as in Decree 851 of 2018) */}
        <div className="text-center pt-1">
          <p className="font-bold text-xs sm:text-sm border-b border-black pb-1 inline-block">
            ملحق (12) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة في مؤسسات التعليم العام
          </p>
        </div>

        {/* Model Number (Top Left/Right) */}
        <div className="flex justify-between items-start pt-1">
          <div className="text-sm font-bold text-slate-900">
            نموذج رقم ( 12 )
          </div>
          {form.status === 'معتمد ومسلّم' && (
            <div className="no-print inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              معتمد وموثق رسمياً
            </div>
          )}
        </div>

        {/* Institutional Block (Emirate, School Operations, Council, Sector, School) */}
        <div className="text-xs sm:text-sm font-bold space-y-1 text-slate-900 pr-2">
          <p>إمارة: <span className="font-medium">{displayEmirate}</span></p>
          <p>إدارة العمليات المدرسية: <span className="font-medium">{form.operationsManagement || 'إدارة العمليات المدرسية'}</span></p>
          <p>المجلس: <span className="font-medium">{displayCouncil}</span></p>
          <p>نطاق: <span className="font-medium">{displaySector}</span></p>
          <p>مدرسة: <span className="font-medium">{displaySchool}</span></p>
        </div>

        {/* Center Title Block */}
        <div className="text-center py-2 border-b border-slate-200">
          <h2 className="text-xl sm:text-2xl font-black text-black tracking-wide font-['Tajawal'] underline decoration-1 underline-offset-8">
            قرار إيقاف مؤقت من الدراسة
          </h2>
        </div>

        {/* Salutation & Student Identification */}
        <div className="text-sm sm:text-base leading-relaxed space-y-2 pt-2">
          <p>
            <span className="font-bold">السيد ولي أمر الطالب / الطالبة:</span>{' '}
            <strong className="underline underline-offset-4 font-bold text-black px-1 font-['Cairo']">
              {form.studentName}
            </strong>{' '}
            {form.parentName ? `(المحترم: ${form.parentName})` : ''}
            <span className="mx-2">|</span>
            <span className="font-bold">الصف والشعبة:</span>{' '}
            <strong className="underline underline-offset-4 font-bold text-black px-1">
              الصف {form.grade} / شعبة {form.section}
            </strong>
          </p>
          <p className="font-bold pt-1">تحية طيبة وبعد ،،،</p>
        </div>

        {/* Narrative Paragraph 1: Prior Behaviors & Interventions */}
        <div className="text-sm sm:text-base leading-relaxed text-justify space-y-3">
          <p>
            نفيدكم علماً بأنه نظراً لتكرار المخالفات الصادرة عن الطالب المذكور / الطالبة المذكورة وعدم تجاوبه مع ما قدم له من برامج وقائية وتنموية وعلاجية لتعديل السلوك خلال الفترة السابقة رغم أنه قد سبق اتخاذ الإجراءات التالية بحقه:
          </p>

          <div className="pr-4 space-y-1.5 font-medium text-slate-900">
            <p className="flex items-baseline gap-2">
              <span className="font-bold">- 1</span>
              <span className="border-b border-slate-400 flex-1 pb-0.5">
                {form.priorAction1 || '............................................................................................................'}
              </span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-bold">- 2</span>
              <span className="border-b border-slate-400 flex-1 pb-0.5">
                {form.priorAction2 || '.............................................................................................................'}
              </span>
            </p>
          </div>
        </div>

        {/* Narrative Paragraph 2: Committee Resolution & Suspension Duration */}
        <div className="text-sm sm:text-base leading-relaxed text-justify space-y-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent print:border-none print:p-0">
          <p>
            فقد قررت لجنة ادارة سلوك الطلبة بالمدرسة بجلستها رقم{' '}
            <strong className="font-mono font-bold text-black border-b-2 border-black px-3 py-0.5 bg-white print:bg-transparent">
              ( {form.meetingNumber || '        '} )
            </strong>{' '}
            في يوم{' '}
            <span className="font-bold border-b border-slate-600 px-2">
              {form.meetingDay || '.............'}
            </span>{' '}
            بتاريخ{' '}
            <span className="font-mono font-bold border-b border-slate-600 px-2" dir="ltr">
              {meetYear ? `${meetYear}/${meetMonth}/${meetDay}` : '/   /  '}
            </span>{' '}
            إيقاف الطالب / الطالبة مؤقتاً من الدراسة بالمدرسة، وإلحاقه ببرنامج لتعديل السلوك خلال المدة:
          </p>

          <div className="pr-2 font-bold space-y-1 pt-1">
            <p className="flex items-center gap-2 flex-wrap">
              <span>من يوم</span>
              <span className="border-b border-black px-2">{form.suspensionStartDay || '.........'}</span>
              <span>الموافق:</span>
              <span className="border-b border-black font-mono px-2" dir="ltr">
                {startYear ? `${startYear}/${startMonth}/${startDay} م` : '/   /    م'}
              </span>
              <span>إلى يوم</span>
              <span className="border-b border-black px-2">{form.suspensionEndDay || '.........'}</span>
              <span>الموافق:</span>
              <span className="border-b border-black font-mono px-2" dir="ltr">
                {endYear ? `${endYear}/${endMonth}/${endDay} م` : '/   /    م'}
              </span>
              {form.suspensionDaysCount && (
                <span className="text-xs bg-slate-200 px-2 py-0.5 rounded print:text-black">
                  (المدة: {form.suspensionDaysCount} أيام دراسية)
                </span>
              )}
            </p>
          </div>

          {form.behaviorModificationProgram && (
            <p className="text-xs sm:text-sm text-slate-700 pt-1">
              <span className="font-bold">برنامج تعديل السلوك والتكليف بالواجبات:</span> {form.behaviorModificationProgram}
            </p>
          )}
        </div>

        {/* Narrative Paragraph 3: Reasons for Suspension */}
        <div className="text-sm sm:text-base leading-relaxed space-y-2">
          <p className="font-bold">وذلك للأسباب التالية:</p>
          <div className="pr-4 space-y-1.5 font-medium text-slate-900">
            <p className="flex items-baseline gap-2">
              <span className="font-bold">- 1</span>
              <span className="border-b border-slate-400 flex-1 pb-0.5">
                {form.reason1 || '................................................................................................................'}
              </span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-bold">- 2</span>
              <span className="border-b border-slate-400 flex-1 pb-0.5">
                {form.reason2 || '.................................................................................................................'}
              </span>
            </p>
            <p className="flex items-baseline gap-2">
              <span className="font-bold">- 3</span>
              <span className="border-b border-slate-400 flex-1 pb-0.5">
                {form.reason3 || '....................................................................................................................'}
              </span>
            </p>
          </div>
        </div>

        {/* Principal Endorsement Line */}
        <div className="pt-2 text-right">
          <p className="font-bold">
            مدير المدرسة: <span className="underline underline-offset-4">{form.principalName || schoolSettings.principalName || '............................'}</span>
          </p>
        </div>

        {/* Signatures Grid (Principal, Student, Parent + Phone + Date) */}
        <div className="pt-4 border-t border-black space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs sm:text-sm">
            {/* Right: Parent Signature */}
            <div className="space-y-2">
              <p className="font-bold">
                توقيع ولي أمر الطالب/الطالبة:{' '}
                <span className="border-b border-black inline-block min-w-[140px] text-center font-bold">
                  {form.parentSignature ? (
                    form.parentSignature.startsWith('data:image') ? (
                      <img src={form.parentSignature} alt="توقيع ولي الأمر" className="h-10 mx-auto inline-block" />
                    ) : (
                      form.parentSignature
                    )
                  ) : (
                    '..........................'
                  )}
                </span>
              </p>
              <p className="font-bold">
                الهاتف:{' '}
                <span className="border-b border-black inline-block min-w-[140px] font-mono text-center">
                  {form.parentPhone || '..................................................................:'}
                </span>
              </p>
            </div>

            {/* Left: Student Signature */}
            <div className="space-y-2 sm:text-left sm:pr-4">
              <p className="font-bold">
                توقيع الطالب / الطالبة بالعلم:{' '}
                <span className="border-b border-black inline-block min-w-[140px] text-center font-bold">
                  {form.studentSignature ? (
                    form.studentSignature.startsWith('data:image') ? (
                      <img src={form.studentSignature} alt="توقيع الطالب" className="h-10 mx-auto inline-block" />
                    ) : (
                      form.studentSignature
                    )
                  ) : (
                    '...........................'
                  )}
                </span>
              </p>
              <p className="font-bold">
                تحريراً في:{' '}
                <span className="border-b border-black inline-block min-w-[120px] font-mono text-center" dir="ltr">
                  {issYear ? `${issYear}/${issMonth}/${issDay} م` : '/   /    م'}
                </span>
              </p>
            </div>
          </div>

          {/* Official Audit & Verification Footprint */}
          {form.signaturesAudit?.principal && (
            <div className="pt-2 text-[10px] text-slate-600 border-t border-dotted border-slate-400 flex flex-wrap items-center justify-between gap-1 print:text-[9px] print:text-black">
              <span>
                توثيق واعتماد: {form.signaturesAudit.principal.signerName} ({form.signaturesAudit.principal.signerRole})
              </span>
              <span>
                وقت التوثيق: {form.signaturesAudit.principal.signedAt}
              </span>
              <span className="font-mono">
                كود المستند: {form.signaturesAudit.principal.documentId || form.id} | جلسة: {form.meetingNumber || form.signaturesAudit.principal.meetingId || 'معتمد'}
              </span>
            </div>
          )}
        </div>
      </div>
    </PrintPreviewModalWrapper>
  );
};
