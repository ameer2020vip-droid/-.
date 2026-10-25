import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { StudentCaseRecord, CounselingSessionRecord, Student } from '../../types';
import { PrintPreviewModalWrapper } from '../../components/PrintPreviewModalWrapper';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface PrintableIndividualCounselingSheetProps {
  caseRecord: StudentCaseRecord;
  session: CounselingSessionRecord;
  student?: Student;
  schoolName?: string;
  academicYear?: string;
  isAuthorizedForConfidential?: boolean;
  onClose?: () => void;
}

export const PrintableIndividualCounselingSheet: React.FC<PrintableIndividualCounselingSheetProps> = ({
  caseRecord,
  session,
  student,
  schoolName: propSchoolName,
  academicYear: propAcademicYear,
  isAuthorizedForConfidential = true,
  onClose = () => {},
}) => {
  const { schoolSettings } = useSchoolSettings();
  const schoolName = propSchoolName || schoolSettings.schoolName;
  const academicYear = propAcademicYear || schoolSettings.academicYear;
  const [includeConfidentialNotes, setIncludeConfidentialNotes] = useState(false);

  const isSessionTopSecret = session.confidentialityLevel === 'سري جدًا';

  const extraToolbar = isAuthorizedForConfidential ? (
    <label className="flex items-center gap-2 cursor-pointer bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 select-none">
      <input
        type="checkbox"
        checked={includeConfidentialNotes}
        onChange={(e) => setIncludeConfidentialNotes(e.target.checked)}
        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
      />
      {includeConfidentialNotes ? (
        <span className="flex items-center gap-1 text-amber-400 font-bold">
          <Eye className="w-3.5 h-3.5" />
          الملاحظات السرية مدرجة
        </span>
      ) : (
        <span className="flex items-center gap-1 text-slate-400">
          <EyeOff className="w-3.5 h-3.5" />
          حجب الملاحظات السرية
        </span>
      )}
    </label>
  ) : null;

  return (
    <PrintPreviewModalWrapper
      isOpen={true}
      onClose={onClose}
      title="معاينة طباعة استمارة الإرشاد الفردي ودراسة الحالة المصغرة"
      subtitle={`${session.sessionNumber} • ${session.sessionDate} • الطالب: ${session.studentName || student?.fullName || caseRecord.studentName}`}
      printButtonId="btn-print-counseling-sheet"
      printButtonText="طباعة الاستمارة (A4) / حفظ PDF"
      defaultZoom={80}
      extraToolbarContent={extraToolbar}
    >
      {/* Official A4 Sheet */}
      <div id="printable-counseling-session" className="p-8 max-w-4xl mx-auto bg-white text-slate-950 text-xs leading-normal">
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex justify-between items-start text-xs text-slate-800">
            <div className="text-right space-y-0.5">
              <p className="font-bold text-sm">دولة الإمارات العربية المتحدة</p>
              <p className="font-medium">مؤسسة الإمارات للتعليم المدرسي</p>
              <p className="font-bold text-teal-900">{schoolName}</p>
              <p>وحدة الإرشاد الطلابي ورعاية المتعلمين</p>
            </div>
            <div className="text-center">
              <div className="inline-block px-3 py-1.5 border border-slate-400 rounded-md mb-1 bg-slate-50">
                <span className="text-sm font-black text-slate-900 tracking-wider">سجل الإرشاد الطلابي</span>
              </div>
              <p className="text-[11px] text-slate-600 font-semibold">العام الدراسي: {session.academicYear || academicYear}</p>
            </div>
            <div className="text-left text-[11px] space-y-0.5 text-slate-700 font-mono">
              <p><span className="font-sans font-bold">رقم ملف الحالة:</span> {caseRecord.caseNumber}</p>
              <p><span className="font-sans font-bold">رقم الجلسة:</span> {session.sessionNumber}</p>
              <p><span className="font-sans font-bold">تاريخ الجلسة:</span> {session.sessionDate}</p>
              <p>
                <span className="font-sans font-bold">مستوى السرية:</span>{' '}
                <span className={isSessionTopSecret ? 'font-black text-rose-700' : ''}>
                  {session.confidentialityLevel}
                </span>
              </p>
              <p><span className="font-sans font-bold">حالة النموذج:</span> {session.formStatus}</p>
            </div>
          </div>

          <div className="text-center mt-3">
            <h1 className="text-base font-black text-slate-950 underline underline-offset-4">
              استمارة الإرشاد الفردي ودراسة الحالة المصغرة
            </h1>
            <p className="text-[11px] text-slate-600 mt-1">
              نوع الجلسة: <span className="font-bold text-slate-900">{session.sessionType}</span> • تصنيف الحالة: <span className="font-bold text-slate-900">{caseRecord.caseType}</span> • المنفذ: <span className="font-bold text-slate-900">{session.counselorName}</span>
            </p>
          </div>
        </div>

        {/* Section 1: بيانات الطالب وملف الحالة */}
        <div className="mb-3 border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
            أولاً: بيانات الطالب وملف الحالة
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="border-b border-l border-slate-300 p-1.5 bg-slate-50 font-semibold w-28">اسم الطالب:</td>
                <td className="border-b border-l border-slate-300 p-1.5 font-bold">{session.studentName || student?.fullName || caseRecord.studentName}</td>
                <td className="border-b border-l border-slate-300 p-1.5 bg-slate-50 font-semibold w-24">الرقم الطلابي:</td>
                <td className="border-b border-l border-slate-300 p-1.5 font-mono">{session.studentNumber || student?.studentNumber || caseRecord.studentNumber}</td>
                <td className="border-b border-l border-slate-300 p-1.5 bg-slate-50 font-semibold w-20">الصف/الشعبة:</td>
                <td className="border-b border-slate-300 p-1.5">{session.grade || student?.grade || caseRecord.grade} / {session.section || student?.section || caseRecord.section}</td>
              </tr>
              <tr>
                <td className="border-l border-slate-300 p-1.5 bg-slate-50 font-semibold">المسار الأكاديمي:</td>
                <td className="border-l border-slate-300 p-1.5">{session.track || student?.stream || 'عام / متقدم'}</td>
                <td className="border-l border-slate-300 p-1.5 bg-slate-50 font-semibold">مكان الجلسة:</td>
                <td className="border-l border-slate-300 p-1.5">{session.sessionLocation === 'مكان آخر' ? (session.sessionLocationOther || 'مكان آخر') : session.sessionLocation}</td>
                <td className="border-l border-slate-300 p-1.5 bg-slate-50 font-semibold">الوقت:</td>
                <td className="p-1.5 font-mono text-[11px]">{session.startTime} – {session.endTime}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: بيانات الإحالة ومجالات الإرشاد */}
        <div className="mb-3 border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
            ثانياً: بيانات الإحالة ومجالات الإرشاد
          </div>
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr>
                <td className="border-b border-l border-slate-300 p-1.5 bg-slate-50 font-semibold w-28">مصدر الإحالة:</td>
                <td className="border-b border-l border-slate-300 p-1.5 font-medium" colSpan={3}>
                  {session.referralSources && session.referralSources.length > 0 ? session.referralSources.join('، ') : 'إحالة ذاتية'}
                </td>
                <td className="border-b border-l border-slate-300 p-1.5 bg-slate-50 font-semibold w-24">تاريخ الإحالة:</td>
                <td className="border-b border-slate-300 p-1.5">{session.referralDate || '-'}</td>
              </tr>
              {session.referralSourceDetails && (
                <tr>
                  <td className="border-b border-l border-slate-300 p-1.5 bg-slate-50 font-semibold">تفاصيل المحيل:</td>
                  <td className="border-b border-slate-300 p-1.5" colSpan={5}>
                    {session.referralSourceDetails.teacherName && `المعلم: ${session.referralSourceDetails.teacherName} (${session.referralSourceDetails.subject || ''}) `}
                    {session.referralSourceDetails.guardianName && `ولي الأمر: ${session.referralSourceDetails.guardianName} (${session.referralSourceDetails.guardianRelation || ''} - ${session.referralSourceDetails.guardianPhone || ''}) `}
                    {session.referralSourceDetails.externalEntityName && `الجهة: ${session.referralSourceDetails.externalEntityName} `}
                    {session.referralSourceDetails.otherExplanation && session.referralSourceDetails.otherExplanation}
                  </td>
                </tr>
              )}
              <tr>
                <td className="border-l border-slate-300 p-1.5 bg-slate-50 font-semibold">مجالات الإرشاد:</td>
                <td className="p-1.5 font-semibold text-teal-950" colSpan={5}>
                  {session.counselingAreas && session.counselingAreas.length > 0
                    ? session.counselingAreas.join(' • ')
                    : 'غير محدد'}
                  {session.counselingAreasOther && ` (${session.counselingAreasOther})`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: أسباب الجلسة ووصف الحالة */}
        <div className="mb-3 border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
            ثالثاً: أسباب الإرشاد ووصف الحالة
          </div>
          <div className="p-2 space-y-2">
            <div>
              <span className="font-bold text-slate-800">عنوان الجلسة والأسباب الرئيسية: </span>
              <span className="font-semibold text-slate-950">{session.sessionTitle}</span>
              {session.sessionReasons && <p className="text-slate-700 mt-0.5">{session.sessionReasons}</p>}
            </div>

            {session.studentWordsProblemDescription && (
              <div className="bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-800">وصف الطالب للمشكلة بكلماته: </span>
                <p className="text-slate-700 italic mt-0.5">«{session.studentWordsProblemDescription}»</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200">
              {session.problemStartDate && <div><span className="font-semibold text-slate-600">بداية المشكلة:</span> {session.problemStartDate}</div>}
              {session.problemRecurrenceCount && <div><span className="font-semibold text-slate-600">التكرار:</span> {session.problemRecurrenceCount}</div>}
              {session.involvedPersons && <div><span className="font-semibold text-slate-600">الأشخاص المرتبطون:</span> {session.involvedPersons}</div>}
              {session.incidentLocation && <div><span className="font-semibold text-slate-600">المكان:</span> {session.incidentLocation}</div>}
            </div>

            {/* Confidential counselor observations: only print if authorized & checked */}
            {includeConfidentialNotes && session.counselorDirectObservations && (
              <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-950 mt-1">
                <span className="font-bold flex items-center gap-1 text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  ملاحظات المرشد المهنية الأولية (سرية مقيدة):
                </span>
                <p className="text-slate-800 mt-0.5 leading-relaxed">{session.counselorDirectObservations}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: أهداف الجلسة */}
        <div className="mb-3 border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
            رابعاً: أهداف الجلسة الإرشادية
          </div>
          {session.sessionGoals && session.sessionGoals.length > 0 ? (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 font-semibold text-slate-700">
                  <th className="p-1 border-l border-slate-300 w-8 text-center">#</th>
                  <th className="p-1 border-l border-slate-300 text-right">وصف الهدف</th>
                  <th className="p-1 border-l border-slate-300 w-24 text-center">مجال الهدف</th>
                  <th className="p-1 border-l border-slate-300 w-28 text-center">مستوى التحقق</th>
                  <th className="p-1 text-right">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {session.sessionGoals.map((goal, idx) => (
                  <tr key={goal.id || idx} className="border-b border-slate-200">
                    <td className="p-1 border-l border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-1 border-l border-slate-300 font-medium">{goal.description}</td>
                    <td className="p-1 border-l border-slate-300 text-center">{goal.type}</td>
                    <td className="p-1 border-l border-slate-300 text-center font-semibold">{goal.status}</td>
                    <td className="p-1 text-slate-600 text-[11px]">{goal.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-2 text-slate-500 italic text-center">لا توجد أهداف إرشادية محددة مسجلة</p>
          )}
        </div>

        {/* Section 5: الإجراءات والخدمات الإرشادية */}
        <div className="mb-3 border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
            خامساً: إجراءات الجلسة والخدمات والحلول المقدمة
          </div>
          <div className="p-2 space-y-1.5">
            {session.sessionProcedures && session.sessionProcedures.length > 0 && (
              <div>
                <span className="font-bold text-slate-800">الإجراءات المنفذة خلال الجلسة: </span>
                <span className="text-slate-900">{session.sessionProcedures.join(' • ')}</span>
              </div>
            )}
            {session.sessionProceduresDetails && (
              <p className="text-slate-700 text-[11px] leading-relaxed bg-slate-50 p-1.5 rounded">
                {session.sessionProceduresDetails}
              </p>
            )}

            {/* Services breakdown */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              {session.servicesProvided?.academicServices && session.servicesProvided.academicServices.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700">الخدمات الأكاديمية: </span>
                  <span>{session.servicesProvided.academicServices.join('، ')}</span>
                </div>
              )}
              {session.servicesProvided?.personalBehaviorServices && session.servicesProvided.personalBehaviorServices.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700">الخدمات الشخصية والسلوكية: </span>
                  <span>{session.servicesProvided.personalBehaviorServices.join('، ')}</span>
                </div>
              )}
              {session.servicesProvided?.careerServices && session.servicesProvided.careerServices.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700">الخدمات المهنية: </span>
                  <span>{session.servicesProvided.careerServices.join('، ')}</span>
                </div>
              )}
              {session.servicesProvided?.socialServices && session.servicesProvided.socialServices.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700">الخدمات الاجتماعية: </span>
                  <span>{session.servicesProvided.socialServices.join('، ')}</span>
                </div>
              )}
              {session.servicesProvided?.referrals && session.servicesProvided.referrals.length > 0 && (
                <div className="col-span-2 text-rose-900 font-semibold">
                  <span>الإحالات: </span>
                  <span>{session.servicesProvided.referrals.join('، ')}</span>
                </div>
              )}
            </div>

            {session.servicesProvided?.detailedExplanation && (
              <p className="text-slate-700 text-[11px] mt-1 italic">
                شرح الحلول: {session.servicesProvided.detailedExplanation}
              </p>
            )}
          </div>
        </div>

        {/* Section 6: خطة العمل المصغرة */}
        {session.miniActionPlan && session.miniActionPlan.length > 0 && (
          <div className="mb-3 border border-slate-300 rounded-sm">
            <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
              سادساً: خطة العمل المصغرة المتفق عليها (Mini Action Plan)
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 font-semibold text-slate-700">
                  <th className="p-1 border-l border-slate-300 w-8 text-center">#</th>
                  <th className="p-1 border-l border-slate-300 text-right">الإجراء المتفق عليه</th>
                  <th className="p-1 border-l border-slate-300 w-24 text-center">المسؤول</th>
                  <th className="p-1 border-l border-slate-300 w-20 text-center">تاريخ البدء</th>
                  <th className="p-1 border-l border-slate-300 w-20 text-center">الإنجاز المتوقع</th>
                  <th className="p-1 border-l border-slate-300 text-right">مؤشر النجاح</th>
                  <th className="p-1 w-20 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {session.miniActionPlan.map((step, idx) => (
                  <tr key={step.id || idx} className="border-b border-slate-200">
                    <td className="p-1 border-l border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="p-1 border-l border-slate-300 font-medium">{step.action}</td>
                    <td className="p-1 border-l border-slate-300 text-center">{step.responsible}</td>
                    <td className="p-1 border-l border-slate-300 text-center font-mono text-[10px]">{step.startDate || '-'}</td>
                    <td className="p-1 border-l border-slate-300 text-center font-mono text-[10px]">{step.expectedEndDate || '-'}</td>
                    <td className="p-1 border-l border-slate-300 text-[11px]">{step.successIndicator || '-'}</td>
                    <td className="p-1 text-center font-semibold text-[11px]">{step.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 7: التواصل مع ولي الأمر ونتيجة الجلسة */}
        <div className="mb-3 border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300">
            سابعاً: التواصل مع ولي الأمر ونتيجة الجلسة
          </div>
          <div className="p-2 space-y-2">
            {session.guardianContact?.contacted ? (
              <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">
                    تم التواصل مع ولي الأمر: {session.guardianContact.contactPersonName || 'ولي الأمر'} ({session.guardianContact.relation || ''} - {session.guardianContact.phone || ''})
                  </span>
                  <span className="text-slate-600 font-mono">
                    {session.guardianContact.contactDate} {session.guardianContact.contactTime} • الطريقة: {session.guardianContact.contactMethod}
                  </span>
                </div>
                {session.guardianContact.summary && (
                  <p className="text-slate-700">ملخص التواصل: {session.guardianContact.summary}</p>
                )}
                {session.guardianContact.agreedToPlan && (
                  <p className="font-semibold text-teal-900">موقف ولي الأمر من الخطة: {String(session.guardianContact.agreedToPlan)}</p>
                )}
                {session.guardianContact.needsAppointment && session.guardianContact.appointmentDate && (
                  <p className="font-semibold text-amber-800">موعد حضور ولي الأمر للمدرسة: {session.guardianContact.appointmentDate}</p>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">لم يتم إجراء تواصل مباشر مع ولي الأمر خلال هذه الجلسة.</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200 text-xs">
              <div>
                <span className="font-bold text-slate-700 block">نتيجة الجلسة:</span>
                <span className="font-bold text-slate-950">{session.sessionOutcome}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">مستوى الأولوية:</span>
                <span className={`font-bold ${session.priorityLevel === 'عاجل' ? 'text-rose-700' : session.priorityLevel === 'مرتفع' ? 'text-amber-700' : 'text-slate-900'}`}>
                  {session.priorityLevel}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">موعد المتابعة القادمة:</span>
                <span className="font-semibold text-slate-900 font-mono">{session.nextFollowUpAt || 'غير محدد'}</span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">الغرض من المتابعة:</span>
                <span className="text-slate-800">{session.nextFollowUpPurpose || '-'}</span>
              </div>
            </div>

            {session.concludingNotes && (
              <div className="text-[11px] text-slate-700 border-t border-slate-100 pt-1">
                <span className="font-semibold text-slate-800">ملاحظات ختامية: </span>
                {session.concludingNotes}
              </div>
            )}
          </div>
        </div>

        {/* Section 8: إقرار الطالب واعتماد المرشد */}
        <div className="border border-slate-300 rounded-sm">
          <div className="bg-slate-100 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-300 flex justify-between">
            <span>ثامناً: إقرار الطالب والاعتماد الإرشادي والإداري</span>
            <span className="text-[10px] text-slate-500">وفق الأطر واللوائح الإرشادية المنظمة</span>
          </div>

          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student section */}
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50 space-y-2">
              <h4 className="font-bold text-xs text-slate-800 border-b pb-1 border-slate-200">
                إقرار والتزام الطالب
              </h4>
              {session.studentAcknowledgement?.enabled ? (
                <>
                  <p className="text-[11px] text-slate-700 leading-relaxed italic">
                    «{session.studentAcknowledgement.commitmentText || session.studentAcknowledgement.agreedPoints || 'أقر أنا الطالب بصحة ما ورد في الجلسة وألتزم بالخطة والواجبات الإرشادية المتفق عليها.'}»
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-slate-900">{session.studentAcknowledgement.studentName || session.studentName || caseRecord.studentName}</p>
                      <p className="text-[10px] text-slate-500 font-mono">التاريخ: {session.studentAcknowledgement.signatureDate || session.sessionDate}</p>
                    </div>
                    {session.studentAcknowledgement.studentSignature && (
                      <div className="border border-slate-300 p-1 rounded bg-white max-w-[130px]">
                        <img
                          src={session.studentAcknowledgement.studentSignature}
                          alt="توقيع الطالب"
                          className="h-10 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">
                  جلسة إرشادية غير ملزمة بتوقيع الطالب المباشر مراعاةً لمقتضيات الإرشاد.
                </p>
              )}
            </div>

            {/* Counselor & Approval section */}
            <div className="border border-slate-200 rounded p-2.5 bg-slate-50/50 space-y-2">
              <h4 className="font-bold text-xs text-slate-800 border-b pb-1 border-slate-200 flex justify-between">
                <span>اعتماد المرشد المدرسي</span>
                <span className="font-bold text-teal-800">{session.approval?.approvalStatus || session.formStatus}</span>
              </h4>
              <div>
                <p className="font-bold text-xs text-slate-900">المرشد المنفذ: {session.approval?.counselorName || session.counselorName}</p>
                <p className="text-[11px] text-slate-600">الوظيفة: {session.approval?.counselorJobTitle || session.counselorJobTitle || 'مرشد طلابي / أخصائي نفسي'}</p>
                <p className="text-[10px] text-slate-500 font-mono">تاريخ الاعتماد: {session.approval?.approvalDate || session.updatedAt?.split('T')[0] || session.sessionDate}</p>
              </div>
              <div className="pt-1 flex items-center justify-between">
                {session.approval?.counselorSignature ? (
                  <div className="border border-slate-300 p-1 rounded bg-white max-w-[130px]">
                    <img
                      src={session.approval.counselorSignature}
                      alt="توقيع المرشد"
                      className="h-10 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-10 border-b border-dashed border-slate-400 w-32 flex items-end justify-center text-[10px] text-slate-400">
                    التوقيع والختم
                  </div>
                )}

                {session.approval?.reviewerName && (
                  <div className="text-left text-[10px] text-slate-600">
                    <p className="font-bold">المراجع: {session.approval.reviewerName}</p>
                    {session.approval.reviewerNotes && <p className="italic">«{session.approval.reviewerNotes}»</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Official Footer Note */}
        <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between items-center font-mono">
          <span>نظام المرشد المدرسي الذكي • ملف الحالة #{caseRecord.caseNumber} • الجلسة #{session.sessionNumber}</span>
          <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-AE')}</span>
        </div>
      </div>
    </PrintPreviewModalWrapper>
  );
};
