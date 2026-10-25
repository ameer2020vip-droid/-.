import React, { useState } from 'react';
import {
  GraduationCap,
  Copy,
  Check,
  Phone,
  MessageSquare,
  Award,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  Users,
  Camera,
  ArrowRight,
} from 'lucide-react';
import { Student } from '../../types';

interface StudentProfileHeaderProps {
  student: Student;
  onClose: () => void;
  behaviorScore: number;
  violationsCount: number;
  tardinessCount: number;
  absencesCount: number;
  pledgesCount: number;
  activeCasesCount: number;
  onOpenMessage?: (studentId: string) => void;
}

export const StudentProfileHeader: React.FC<StudentProfileHeaderProps> = ({
  student,
  onClose,
  behaviorScore,
  violationsCount,
  tardinessCount,
  absencesCount,
  pledgesCount,
  activeCasesCount,
  onOpenMessage,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]} ${parts[1][0]}`;
    }
    return parts[0]?.slice(0, 2) || 'ط';
  };

  const cleanPhone = (student.parentPhone || student.fatherPhone || '').replace(/[^\d]/g, '');

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb and Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 text-slate-500" />
          <span>العودة إلى سجل الطلبة</span>
        </button>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <span>الطلاب</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span>سجل الطلبة</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-[#006D77] dark:text-teal-400 font-bold">ملف الطالب</span>
        </div>
      </div>

      {/* Main Top Grid: KPI Summary Card (Left) + Student Info Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* KPI Cards: ملخص الطالب (Left 5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="text-[#006D77] dark:text-teal-400">📊</span>
              <span>ملخص الطالب</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">مؤشرات الأداء السلوكي</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
            {/* 1. رصيد السلوك */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  رصيد السلوك
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                  {behaviorScore} / 100
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Award className="w-4 h-4" />
              </div>
            </div>

            {/* 2. المخالفات */}
            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  المخالفات
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                  {violationsCount}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>

            {/* 3. مرات التأخر */}
            <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  مرات التأخر
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-sky-700 dark:text-sky-400">
                  {tardinessCount}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* 4. أيام الغياب */}
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  أيام الغياب
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                  {absencesCount}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            {/* 5. التعهدات والإنذارات */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/50 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  التعهدات والإنذارات
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                  {pledgesCount}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            {/* 6. الحالات النشطة */}
            <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  الحالات والخطط
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-slate-700 dark:text-slate-300">
                  {activeCasesCount}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Student Main Profile Card (Right 7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Decorative Islamic Geometry Flourish on Top Left */}
          <div className="absolute top-0 left-0 w-32 h-32 opacity-5 pointer-events-none text-[#D4AF37]">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 0 L61 38 L100 50 L61 62 L50 100 L39 62 L0 50 L39 38 Z" />
            </svg>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar with Camera Icon Badge */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#006D77] to-[#0C2340] text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md border-2 border-white dark:border-slate-800">
                  {getInitials(student.fullName)}
                </div>
                <button
                  type="button"
                  title="تغيير صورة الطالب"
                  className="absolute -bottom-1 -left-1 w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#006D77]"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              {/* Name & Status */}
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                    {student.fullName}
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{student.status || 'منتظم'}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سجل الطالب الموحد للسلوك والمواظبة الأكاديمية
                </p>
              </div>
            </div>
          </div>

          {/* Academic Info Grid: الرقم الطلابي - الصف - المسار - الشعبة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 my-3 border-y border-slate-100 dark:border-slate-800/80 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-slate-400 block mb-0.5">الرقم الطلابي</span>
              <div className="inline-flex items-center gap-1 font-mono font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                <span>{student.studentNumber}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(student.studentNumber, 'studentNumber')}
                  title="نسخ الرقم الطلابي"
                  className="text-slate-400 hover:text-[#006D77] transition-colors"
                >
                  {copiedField === 'studentNumber' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-slate-400 block mb-0.5">الصف</span>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                الصف {student.grade}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-slate-400 block mb-0.5">المسار</span>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                {student.track || 'عام'}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-[11px] text-slate-400 block mb-0.5">الشعبة</span>
              <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono">
                {student.section}
              </span>
            </div>
          </div>

          {/* Guardian Info & Quick Contact Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">ولي الأمر:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-bold">
                {student.parentName || 'مسجل بالنظام'}
              </strong>
              <span className="text-slate-400">({student.parentRelation || 'الأب'})</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                <span>{student.parentPhone || student.fatherPhone || '050-0000000'}</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(student.parentPhone || student.fatherPhone || '', 'phone')
                  }
                  title="نسخ رقم الهاتف"
                  className="text-slate-400 hover:text-[#006D77] transition-colors"
                >
                  {copiedField === 'phone' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {cleanPhone && (
                <a
                  href={`tel:${cleanPhone}`}
                  title="اتصال هاتفي"
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              )}

              {cleanPhone && (
                <a
                  href={`https://wa.me/971${cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  title="محادثة واتساب سريعة"
                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
