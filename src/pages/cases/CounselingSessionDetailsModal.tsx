import React from 'react';
import {
  X,
  Printer,
  Edit,
  Lock,
  Calendar,
  Clock,
  MapPin,
  User,
  Shield,
  FileText,
  Target,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
  MessageSquare,
  Activity,
  Layers,
  ChevronRight,
  Phone,
  Bookmark,
} from 'lucide-react';
import { CounselingSessionRecord, StudentCaseRecord, Student } from '../../types';

interface CounselingSessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CounselingSessionRecord | null;
  caseRecord: StudentCaseRecord;
  student?: Student;
  onEdit: (session: CounselingSessionRecord) => void;
  onPrint: (session: CounselingSessionRecord) => void;
}

export const CounselingSessionDetailsModal: React.FC<CounselingSessionDetailsModalProps> = ({
  isOpen,
  onClose,
  session,
  caseRecord,
  student,
  onEdit,
  onPrint,
}) => {
  if (!isOpen || !session) return null;

  const isTopSecret = session.confidentialityLevel === 'سري جدًا';
  const isApproved = session.formStatus === 'معتمد';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 font-black text-xs font-mono">
                {session.sessionNumber}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold">
                {session.sessionType}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                  session.priorityLevel === 'عاجل'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : session.priorityLevel === 'مرتفع'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                أولوية: {session.priorityLevel}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                  isApproved
                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                    : session.formStatus === 'مؤرشف'
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {session.formStatus}
              </span>
              {isTopSecret && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold">
                  <Lock className="w-3 h-3" />
                  سري جدًا
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white pt-1">
              {session.sessionTitle || 'تفاصيل جلسة الإرشاد الفردي'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ملف الحالة: #{caseRecord.caseNumber} | الطالب: {caseRecord.studentName} ({caseRecord.grade} - {caseRecord.section})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrint(session)}
              className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="طباعة الاستمارة الرسمية"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة الاستمارة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(session);
              }}
              className="p-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="تعديل الجلسة"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">تعديل</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 text-right text-xs">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                تاريخ الجلسة
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">{session.sessionDate}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                وقت الانعقاد
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 font-mono text-sm">
                {session.startTime} - {session.endTime}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                مكان الانعقاد
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {session.sessionLocation === 'مكان آخر' ? session.sessionLocationOther : session.sessionLocation}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-teal-600" />
                المرشد الطلابي
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{session.counselorName}</p>
            </div>
          </div>

          {/* Counseling Areas */}
          {session.counselingAreas && session.counselingAreas.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-teal-600" />
                مجالات الإرشاد المعنية
              </h3>
              <div className="flex flex-wrap gap-2">
                {session.counselingAreas.map((area) => (
                  <span
                    key={area}
                    className="px-3 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 font-bold"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Problem & Referral Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-600" />
                دواعي المقابلة ومصدر الإحالة
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {session.sessionReasons || 'لا توجد تفاصيل مسجلة'}
              </p>
              {session.referralSources && session.referralSources.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500">
                  <span className="font-bold">المصادر: </span>
                  {session.referralSources.join('، ')}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                أقوال الطالب وتفاعله
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {session.studentWordsProblemDescription || session.studentStatementSummary || 'لم يتم تدوين أقوال مباشرة.'}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
                <span>تفاعل الطالب: <strong className="text-slate-700 dark:text-slate-300">{session.studentInteraction || 'غير محدد'}</strong></span>
                <span>جاهزية التعاون: <strong className="text-slate-700 dark:text-slate-300">{session.studentReadinessToCooperate || 'غير محدد'}</strong></span>
              </div>
            </div>
          </div>

          {/* Counselor Direct Observations */}
          {session.counselorDirectObservations && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-600" />
                ملاحظات المرشد المباشرة وتقييم الموقف
              </h4>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {session.counselorDirectObservations}
              </p>
            </div>
          )}

          {/* Mini Action Plan or Goals */}
          {session.sessionGoals && session.sessionGoals.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-teal-600" />
                الأهداف الإرشادية المتفق عليها ({session.sessionGoals.length})
              </h4>
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">الهدف الإرشادي</th>
                      <th className="p-2.5">نوع الهدف</th>
                      <th className="p-2.5">الإجراء / التدخل</th>
                      <th className="p-2.5">المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {session.sessionGoals.map((g, idx) => (
                      <tr key={g.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{g.description}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{g.targetType}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{g.actionItem || '-'}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{g.responsibleParty || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Outcome & Next Follow Up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-teal-50/40 dark:bg-teal-950/20 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                نتيجة الجلسة وخلاصتها
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm leading-relaxed">
                {session.sessionOutcome || 'قيد المتابعة والتقييم المستمر'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                <Clock className="w-4 h-4 text-teal-600" />
                موعد المتابعة القادمة
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm font-mono">
                {session.nextFollowUpAt ? (
                  <span className="text-teal-700 dark:text-teal-300">{session.nextFollowUpAt}</span>
                ) : (
                  <span className="text-slate-400 font-normal">لم يحدد موعد متابعة بعد</span>
                )}
              </p>
              {session.nextFollowUpPurpose && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  الغرض: {session.nextFollowUpPurpose}
                </p>
              )}
            </div>
          </div>

          {/* Signatures & Acknowledgements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">إقرار وتوقيع الطالب</span>
              <div className="text-[11px] text-slate-500">
                {session.studentAcknowledgement?.isSigned ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تم توقيع إقرار الالتزام من قبل الطالب</span>
                  </div>
                ) : (
                  <span className="text-slate-400">لم يتم تسجيل توقيع الطالب بعد</span>
                )}
              </div>
              {session.studentAcknowledgement?.signatureBase64 && (
                <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 w-fit">
                  <img
                    src={session.studentAcknowledgement.signatureBase64}
                    alt="توقيع الطالب"
                    className="max-h-12 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">اعتماد المرشد الطلابي</span>
              <div className="text-[11px] text-slate-500">
                {isApproved ? (
                  <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>معتمد رسميًا بواسطة {session.approval?.approvedBy || session.counselorName}</span>
                  </div>
                ) : (
                  <span className="text-amber-600 font-bold">مسودة لم تُعتمد بعد</span>
                )}
              </div>
              {session.approval?.signatureBase64 && (
                <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 w-fit">
                  <img
                    src={session.approval.signatureBase64}
                    alt="توقيع المرشد"
                    className="max-h-12 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            رقم استمارة الإرشاد: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{session.sessionNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
