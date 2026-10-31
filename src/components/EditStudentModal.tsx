import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserCheck,
  AlertTriangle,
  Trash2,
  Save,
  User,
  Phone,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { Student, GradeLevel, SectionName, AcademicTrack } from '../types';
import {
  ALL_SUPPORTED_GRADES,
  compareGrades,
  compareSections,
  getGradeDisplayLabel,
} from '../hooks/useAcademicFiltering';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onUpdate: (studentId: string, updates: Partial<Omit<Student, 'id'>>) => Promise<void>;
  onDelete: (studentId: string, studentName: string) => Promise<void>;
  isViewer?: boolean;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onUpdate,
  onDelete,
  isViewer = false,
}) => {
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('خامس');
  const [section, setSection] = useState<SectionName>('1');
  const [track, setTrack] = useState<AcademicTrack>('عام');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('الأب');
  const [status, setStatus] = useState<Student['status']>('منتظم');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (student) {
      setFullName(student.fullName || '');
      setStudentNumber(student.studentNumber || '');
      setGrade(student.grade || 'خامس');
      setSection(student.section || '1');
      setTrack(student.track || 'عام');
      setParentName(student.parentName || '');
      setParentPhone(student.parentPhone || '');
      setParentRelation(student.parentRelation || 'الأب');
      setStatus(student.status || 'منتظم');
      setIsConfirmingDelete(false);
      setErrorMsg('');
    }
  }, [student, isOpen]);

  const gradeOptions = useMemo(() => {
    const set = new Set<string>(ALL_SUPPORTED_GRADES);
    if (student?.grade) set.add(student.grade);
    return Array.from(set).sort(compareGrades);
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    setErrorMsg('');

    if (!fullName.trim() || !studentNumber.trim()) {
      setErrorMsg('يرجى التأكد من ملء الاسم والرقم الطلابي.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdate(student.id, {
        fullName: fullName.trim(),
        studentNumber: studentNumber.trim(),
        grade,
        section,
        track,
        hasMissingGradeOrSection: grade === 'غير محدد' || section === 'غير محدد',
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentRelation: parentRelation.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحديث بيانات الطالب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isViewer) return;
    try {
      setIsSubmitting(true);
      await onDelete(student.id, student.fullName);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل حذف سجل الطالب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#0C2340] text-white p-5 flex items-center justify-between border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserCheck className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-base font-black">تحديث بيانات وسجل الطالب</h3>
              <p className="text-xs text-slate-300">
                تعديل الاسم أو الصف أو بيانات ولي الأمر أو حذف السجل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Name & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">
                اسم الطالب الكامل (رباعي) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isViewer}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-[#006D77] focus:outline-hidden disabled:bg-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">
                الرقم الطلابي <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                required
                disabled={isViewer}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-[#006D77] focus:outline-hidden disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Academic Info: Grade, Section, Track, Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">الصف الدراسي</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                disabled={isViewer}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-hidden"
              >
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>
                    {getGradeDisplayLabel(g)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">الشعبة</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as SectionName)}
                disabled={isViewer}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-hidden"
              >
                {Array.from(new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'أ', 'ب', 'ج', 'A', 'B', String(student.section || '1')]))
                  .sort(compareSections)
                  .map((sec) => (
                    <option key={sec} value={sec}>
                      شعبة {sec}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">المسار الأكاديمي</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value as AcademicTrack)}
                disabled={isViewer}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-hidden"
              >
                <option value="عام">عام</option>
                <option value="متقدم">متقدم</option>
                <option value="نخبة">نخبة</option>
                <option value="تطبيقي">تطبيقي</option>
                <option value="بدون مسار">بدون مسار</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 block">حالة القيد</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Student['status'])}
                disabled={isViewer}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white focus:outline-hidden"
              >
                <option value="منتظم">منتظم</option>
                <option value="منقطع">منقطع</option>
                <option value="محول">محول</option>
                <option value="موقوف">موقوف</option>
              </select>
            </div>
          </div>

          {/* Parent Info */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-500">بيانات التواصل مع ولي الأمر</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  disabled={isViewer}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">رقم الهاتف المتحرك</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  disabled={isViewer}
                  placeholder="050xxxxxxx"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:ring-2 focus:ring-[#006D77] focus:outline-hidden text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">صلة القرابة</label>
                <select
                  value={parentRelation}
                  onChange={(e) => setParentRelation(e.target.value)}
                  disabled={isViewer}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-hidden"
                >
                  <option value="الأب">الأب</option>
                  <option value="الأم">الأم</option>
                  <option value="الأخ">الأخ</option>
                  <option value="العم">العم</option>
                  <option value="الخال">الخال</option>
                  <option value="الوصي الشرعي">الوصي الشرعي</option>
                </select>
              </div>
            </div>
          </div>

          {/* Danger Zone: Delete Student */}
          {!isViewer && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    حذف سجل الطالب من المدرسة
                  </h5>
                  <p className="text-[11px] text-rose-700">
                    سيتم حذف سجل الطالب ({student.fullName}) نهائياً من قاعدة البيانات.
                  </p>
                </div>

                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف الطالب</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تأكيد الحذف النهائي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {!isViewer && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-[#D4AF37]" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
