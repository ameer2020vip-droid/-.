import React from 'react';
import {
  GraduationCap,
  Users,
  Clock,
  Phone,
  MessageSquare,
  Mail,
  Edit3,
  Calendar,
  AlertTriangle,
  FileSignature,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Student, TimelineEvent } from '../../types';

interface StudentOverviewTabProps {
  student: Student;
  recentActivities: TimelineEvent[];
  academicYear: string;
  onViewAllActivities: () => void;
  onOpenMessage?: (studentId: string) => void;
  onEditStudent?: (student: Student) => void;
  onSelectActivity?: (activity: TimelineEvent) => void;
}

export const StudentOverviewTab: React.FC<StudentOverviewTabProps> = ({
  student,
  recentActivities,
  academicYear,
  onViewAllActivities,
  onOpenMessage,
  onEditStudent,
  onSelectActivity,
}) => {
  const cleanPhone = (student.parentPhone || student.fatherPhone || '').replace(/[^\d]/g, '');

  const getActivityIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'violation':
      case 'violation_report':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          bgColor: 'bg-rose-500 text-white',
          titleFallback: 'مخالفة سلوكية',
        };
      case 'tardiness':
        return {
          icon: <Clock className="w-3.5 h-3.5" />,
          bgColor: 'bg-amber-500 text-white',
          titleFallback: 'تأخر صباحي',
        };
      case 'absence':
        return {
          icon: <Calendar className="w-3.5 h-3.5" />,
          bgColor: 'bg-blue-500 text-white',
          titleFallback: 'غياب مدرسي',
        };
      case 'action':
      case 'signature':
        return {
          icon: <Phone className="w-3.5 h-3.5" />,
          bgColor: 'bg-emerald-500 text-white',
          titleFallback: 'تواصل / إجراء موثق',
        };
      case 'parent_commitment':
      case 'warning':
      case 'parent_notice':
      case 'parent_summon':
      case 'temporary_suspension':
      case 'attendance_commitment':
      case 'authorized_pickup':
        return {
          icon: <FileSignature className="w-3.5 h-3.5" />,
          bgColor: 'bg-purple-600 text-white',
          titleFallback: 'تعهد / نموذج رسمي',
        };
      default:
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          bgColor: 'bg-[#006D77] text-white',
          titleFallback: 'إجراء توثيقي',
        };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT COLUMN: آخر الأنشطة (Recent Activities) */}
      <div className="lg:col-span-7 bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">آخر الأنشطة</h3>
              <p className="text-[11px] text-slate-400">سجل الأحداث والإجراءات الأحدث في ملف الطالب</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewAllActivities}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            عرض الكل
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
            <p>لا توجد أنشطة أو مخالفات مسجلة حديثاً للطالب.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentActivities.slice(0, 5).map((act) => {
              const meta = getActivityIcon(act.type);
              return (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${meta.bgColor}`}
                    >
                      {meta.icon}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {act.title || meta.titleFallback}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {act.description || 'تم توثيق الإجراء في سجل الطالب'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                      {act.status || 'مكتملة'}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
                      {act.date} {act.time ? `• ${act.time}` : ''}
                    </span>

                    {onSelectActivity && (
                      <button
                        type="button"
                        onClick={() => onSelectActivity(act)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-[#006D77] font-bold text-[11px] shadow-2xs cursor-pointer"
                      >
                        عرض
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Cards (Academic + Guardian + Counselor Notes) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Card 1: البيانات الأكاديمية */}
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
              <span>البيانات الأكاديمية</span>
            </h4>
            {onEditStudent && (
              <button
                type="button"
                onClick={() => onEditStudent(student)}
                className="text-xs text-[#006D77] dark:text-teal-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">الرقم الطلابي</span>
              <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {student.studentNumber}
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">الصف</span>
              <strong className="font-bold text-slate-800 dark:text-slate-200">
                الصف {student.grade}
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">المسار الأكاديمي</span>
              <strong className="font-bold text-slate-800 dark:text-slate-200">
                {student.track || 'عام'}
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">الشعبة</span>
              <strong className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {student.section}
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">العام الدراسي</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {academicYear || '2025–2026'}
              </strong>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block mb-0.5">الجنسية</span>
              <strong className="font-bold text-slate-800 dark:text-slate-200">
                {(student as any).nationality || 'مواطن'}
              </strong>
            </div>

            <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">حالة القيد والانتظام:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{student.status || 'منتظم'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: بيانات ولي الأمر والتواصل */}
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
              <span>بيانات ولي الأمر والتواصل</span>
            </h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">اسم ولي الأمر</span>
                <strong className="font-bold text-slate-900 dark:text-white">
                  {student.parentName || 'مسجل بالنظام'}
                </strong>
                <span className="text-[11px] text-slate-400 mr-1">
                  ({student.parentRelation || 'الأب'})
                </span>
              </div>

              {/* Quick Communication Buttons */}
              <div className="flex items-center gap-1.5">
                {cleanPhone && (
                  <a
                    href={`https://wa.me/971${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    title="واتساب"
                    className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                )}
                {cleanPhone && (
                  <a
                    href={`tel:${cleanPhone}`}
                    title="اتصال هاتفي"
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                {onOpenMessage && (
                  <button
                    type="button"
                    onClick={() => onOpenMessage(student.id)}
                    title="إرسال رسالة رسمية"
                    className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-400 hover:bg-teal-100 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">رقم الهاتف الأساسي</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {student.parentPhone || student.fatherPhone || 'غير متوفر'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">هاتف بديل / طوارئ</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {student.emergencyPhone || student.alternatePhone || 'غير متوفر'}
                </span>
              </div>
            </div>

            {(student as any).parentEmail && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] text-slate-400 block mb-0.5">البريد الإلكتروني</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">
                  {(student as any).parentEmail}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: ملاحظات المرشد الأكاديمي والمهني */}
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[#D4AF37]" />
              <span>ملاحظات المرشد الأكاديمي والمهني</span>
            </h4>
            <span className="text-[10px] text-slate-400">توثيق إرشادي</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed min-h-[60px]">
            {student.notes || (student as any).counselorNotes ? (
              <p>{student.notes || (student as any).counselorNotes}</p>
            ) : (
              <p className="text-slate-400 italic">
                طالب ملتزم في معظم الأحيان، يحتاج إلى متابعة مواعيد الحضور الصباحي والتوجيه الإيجابي المستمر.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>المرشد المتابع: الأستاذ المشرف</span>
            <span>آخر تحديث: {new Date().toLocaleDateString('ar-AE')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
