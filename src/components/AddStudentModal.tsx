import React, { useState, useMemo } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { GradeLevel, SectionName, AcademicTrack, Student } from '../types';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import {
  ACADEMY_STANDARD_GRADES,
  compareGrades,
  compareSections,
  getGradeDisplayLabel,
} from '../hooks/useAcademicFiltering';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (studentData: Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>) => void;
  onSave?: (studentData: Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>) => void;
  existingStudents?: Student[];
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onSave,
  existingStudents = [],
}) => {
  const { schoolSettings } = useSchoolSettings();
  const [studentNumber, setStudentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState<GradeLevel>('خامس');
  const [section, setSection] = useState<SectionName>('1');
  const [track, setTrack] = useState<AcademicTrack>('عام');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('الأب');
  const [errorMsg, setErrorMsg] = useState('');

  const availableGrades = useMemo(() => {
    const set = new Set<string>(ACADEMY_STANDARD_GRADES);
    existingStudents.forEach((s) => {
      if (s.grade && s.grade !== 'غير محدد') set.add(s.grade);
    });
    return Array.from(set).sort(compareGrades);
  }, [existingStudents]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!studentNumber.trim() || !fullName.trim()) {
      setErrorMsg('يرجى كتابة الرقم الطلابي واسم الطالب كاملاً');
      return;
    }

    if (!parentName.trim() || !parentPhone.trim()) {
      setErrorMsg('يرجى تعبئة اسم ولي الأمر ورقم الهاتف للمتابعة');
      return;
    }

    // Check duplicate student number
    const isDup = existingStudents.some((s) => s.studentNumber === studentNumber.trim());
    if (isDup) {
      setErrorMsg('الرقم الطلابي مسجل مسبقاً لطالب آخر');
      return;
    }

    const saveHandler = onSave || onAdd;
    if (saveHandler) {
      saveHandler({
        studentNumber: studentNumber.trim(),
        fullName: fullName.trim(),
        grade,
        section,
        track,
        status: 'منتظم',
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentRelation,
        enrollmentDate: new Date().toISOString().split('T')[0],
      });
    }

    // Reset inputs
    setStudentNumber('');
    setFullName('');
    setParentName('');
    setParentPhone('');
    setErrorMsg('');

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden text-right">
        {/* Modal Header */}
        <div className="bg-[#0C2340] text-white p-4 px-6 flex items-center justify-between border-b-2 border-[#D4AF37]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006D77] flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">إضافة طالب جديد</h3>
              <p className="text-[11px] text-slate-300">{schoolSettings.schoolName} – {schoolSettings.schoolCycle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الرقم الطلابي <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="مثال: 20260999"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                اسم الطالب الثلاثي أو الرباعي <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="اسم الطالب كاملاً"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الصف</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              >
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {getGradeDisplayLabel(g)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الشعبة</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as SectionName)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              >
                {Array.from(new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'أ', 'ب', 'ج', 'A', 'B', ...existingStudents.map((s) => String(s.section || ''))]))
                  .filter(Boolean)
                  .sort(compareSections)
                  .map((sec) => (
                    <option key={sec} value={sec}>
                      شعبة {sec}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">المسار</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value as AcademicTrack)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
              >
                <option value="عام">عام</option>
                <option value="متقدم">متقدم</option>
                <option value="نخبة">نخبة</option>
                <option value="تطبيقي">تطبيقي</option>
                <option value="بدون مسار">بدون مسار</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-[#006D77] mb-3">بيانات ولي الأمر والتواصل</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">صلة القرابة</label>
                <select
                  value={parentRelation}
                  onChange={(e) => setParentRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]"
                >
                  <option value="الأب">الأب</option>
                  <option value="الأم">الأم</option>
                  <option value="الأخ الأكبر">الأخ الأكبر</option>
                  <option value="العم / الوصي">العم / الوصي</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم ولي الأمر <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="اسم ولي الأمر"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                رقم هاتف ولي الأمر (إماراتي) <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="050xxxxxxx"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-[#006D77] focus:bg-white text-right"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl shadow-xs transition-colors"
            >
              حفظ الطالب في السجل
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
