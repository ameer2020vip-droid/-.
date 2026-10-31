import React, { useState, useMemo } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  GraduationCap,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Student, GradeLevel, SectionName, AcademicTrack } from '../types';
import {
  ACADEMY_STANDARD_GRADES,
  compareGrades,
  compareSections,
  getGradeDisplayLabel,
  getGradeIconNumber,
  getGradeCycleSubtitle,
} from '../hooks/useAcademicFiltering';

interface GradeSectionStudentSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onSelectMultipleStudents?: (students: Student[]) => void;
  title?: string;
  allowMultiple?: boolean;
}

export const GradeSectionStudentSelectorModal: React.FC<GradeSectionStudentSelectorModalProps> = ({
  isOpen,
  onClose,
  students,
  onSelectStudent,
  onSelectMultipleStudents,
  title = 'تصفح واختيار الطالب عبر الصفوف والشعب',
  allowMultiple = false,
}) => {
  // Wizard Steps: 1 = Grade, 2 = Section & Track, 3 = Students List
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Reset wizard when opened
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedGrade(null);
      setSelectedSection(null);
      setSelectedTrack('all');
      setStudentSearch('');
      setSelectedStudentIds([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Dynamic Grade definitions from imported students (or ACADEMY_STANDARD_GRADES if empty)
  const gradesList = useMemo(() => {
    const gradeSet = new Set<string>();
    students.forEach((s) => {
      if (s.grade) gradeSet.add(s.grade);
    });
    const keys = gradeSet.size > 0 ? Array.from(gradeSet).sort(compareGrades) : [...ACADEMY_STANDARD_GRADES];
    return keys.map((id) => ({
      id: id as GradeLevel,
      title: getGradeDisplayLabel(id),
      subtitle: getGradeCycleSubtitle(id),
      iconNumber: getGradeIconNumber(id),
    }));
  }, [students]);

  // Count students per grade
  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach((s) => {
      const g = s.grade || 'غير محدد';
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [students]);

  // Available sections for the selected grade
  const availableSections = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStudents = students.filter((s) => s.grade === selectedGrade);
    const secSet = new Set<string>();
    gradeStudents.forEach((s) => {
      if (s.section) secSet.add(String(s.section));
    });
    return Array.from(secSet).sort(compareSections);
  }, [students, selectedGrade]);

  // Available tracks for the selected grade
  const availableTracks = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStudents = students.filter((s) => s.grade === selectedGrade);
    const trackSet = new Set<string>();
    gradeStudents.forEach((s) => {
      if (s.track) trackSet.add(s.track);
    });
    return Array.from(trackSet);
  }, [students, selectedGrade]);

  // Students filtered by grade, section, track, and search
  const filteredStudents = useMemo(() => {
    if (!selectedGrade) return [];
    return students.filter((s) => {
      const matchGrade = s.grade === selectedGrade;
      const matchSection = !selectedSection || String(s.section) === selectedSection;
      const matchTrack = selectedTrack === 'all' || s.track === selectedTrack;
      const q = studentSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        String(s.studentNumber || '').includes(q) ||
        (s.parentPhone && s.parentPhone.includes(q));

      return matchGrade && matchSection && matchTrack && matchSearch;
    });
  }, [students, selectedGrade, selectedSection, selectedTrack, studentSearch]);

  const handleSelectGrade = (grade: GradeLevel) => {
    setSelectedGrade(grade);
    setSelectedSection(null);
    setSelectedTrack('all');
    setCurrentStep(2);
  };

  const handleSelectSection = (section: string, track: string = 'all') => {
    setSelectedSection(section);
    setSelectedTrack(track);
    setCurrentStep(3);
  };

  const handleConfirmSingleStudent = (student: Student) => {
    onSelectStudent(student);
    onClose();
  };

  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleConfirmMultiple = () => {
    if (onSelectMultipleStudents) {
      const chosen = students.filter((s) => selectedStudentIds.includes(s.id));
      onSelectMultipleStudents(chosen);
    } else if (selectedStudentIds.length > 0) {
      const first = students.find((s) => s.id === selectedStudentIds[0]);
      if (first) onSelectStudent(first);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#0f1f35] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden text-right">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600/15 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-500/20 shadow-2xs">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                تصفية متدرجة وسريعة: الصف الدراسي ← الشعبة والمسار ← اختيار الطالب المخالف
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="px-5 py-3 bg-teal-50/50 dark:bg-teal-950/20 border-b border-teal-100 dark:border-teal-900/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-bold">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                currentStep === 1
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>١. الصف</span>
              {selectedGrade && <span className="text-[11px] opacity-80">({selectedGrade})</span>}
            </button>

            <ChevronLeft className="w-4 h-4 text-slate-400" />

            <button
              type="button"
              disabled={!selectedGrade}
              onClick={() => selectedGrade && setCurrentStep(2)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                currentStep === 2
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 disabled:opacity-40'
              }`}
            >
              <span>٢. الشعبة</span>
              {selectedSection && <span className="text-[11px] opacity-80">(شعبة {selectedSection})</span>}
            </button>

            <ChevronLeft className="w-4 h-4 text-slate-400" />

            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                currentStep === 3
                  ? 'bg-teal-600 text-white shadow-2xs font-bold'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span>٣. قائمة الطلاب المخالفين</span>
            </span>
          </div>

          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => (prev === 3 ? 2 : 1))}
              className="text-xs text-teal-700 dark:text-teal-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الخطوة السابقة</span>
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1: GRADE SELECTION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="text-right">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اختر الصف الدراسي المطلوب لتجهيز النموذج له:
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  انقر على بطاقة الصف للانتقال المباشر لشعبه وقوائم طلابه
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {gradesList.map((g) => {
                  const count = gradeCounts[g.id] || 0;
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleSelectGrade(g.id)}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-800 hover:border-teal-500/60 cursor-pointer group transition-all card-elevated flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-600/10 dark:bg-teal-900/40 text-[#006D77] dark:text-teal-300 border border-teal-500/20 flex items-center justify-center font-black text-lg group-hover:scale-105 transition-transform">
                          {g.iconNumber}
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                            {g.title}
                          </h5>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {g.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="text-left flex flex-col items-end">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                          {count} طالب
                        </span>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          عرض الشُعب ←
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: SECTION & TRACK SELECTION */}
          {currentStep === 2 && selectedGrade && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    اختر الشعبة والمسار في {gradesList.find((g) => g.id === selectedGrade)?.title}:
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    إجمالي الشُعب المتاحة: {availableSections.length} شعبة
                  </p>
                </div>

                {/* Optional Track Filter */}
                {availableTracks.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-slate-500">المسار:</span>
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
                    >
                      <option value="all">كافة المسارات</option>
                      {availableTracks.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {availableSections.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500">
                    لا توجد شُعب مسجلة حالياً في هذا الصف.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Row 1: General Track */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg">
                        📘 المسار العام
                      </span>
                      <span className="text-[11px] text-slate-400">
                        شعب المسار العام
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {availableSections.map((sec) => {
                        const count = students.filter(
                          (s) =>
                            s.grade === selectedGrade &&
                            (s.track || 'عام') === 'عام' &&
                            String(s.section) === sec
                        ).length;

                        return (
                          <div
                            key={`gen-${sec}`}
                            onClick={() => handleSelectSection(sec, 'عام')}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-teal-50/80 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-800 hover:border-teal-500/60 cursor-pointer group transition-all text-center flex flex-col items-center justify-center gap-1 shadow-2xs"
                          >
                            <span className="font-bold text-sm text-slate-800 dark:text-white">
                              عام – شعبة {sec}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                              {count} طالب
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 2: Advanced Track */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                        🔬 المسار المتقدم
                      </span>
                      <span className="text-[11px] text-slate-400">
                        شعب المسار المتقدم
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {availableSections.map((sec) => {
                        const count = students.filter(
                          (s) =>
                            s.grade === selectedGrade &&
                            (s.track || 'عام') === 'متقدم' &&
                            String(s.section) === sec
                        ).length;

                        return (
                          <div
                            key={`adv-${sec}`}
                            onClick={() => handleSelectSection(sec, 'متقدم')}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 cursor-pointer group transition-all text-center flex flex-col items-center justify-center gap-1 shadow-2xs"
                          >
                            <span className="font-bold text-sm text-slate-800 dark:text-white">
                              متقدم – شعبة {sec}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                              {count} طالب
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: STUDENTS LIST & SELECTION */}
          {currentStep === 3 && selectedGrade && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    قائمة طلاب {selectedGrade} - {selectedTrack !== 'all' ? (selectedTrack === 'متقدم' ? 'المسار المتقدم' : 'المسار العام') : ''} (شعبة {selectedSection})
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-[10px] font-bold">
                    {filteredStudents.length} طالب
                  </span>
                </div>

                {/* Quick Search within section */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="بحث سريع بالاسم أو الرقم..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 pr-8 pl-3 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-hidden text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  لم يتم العثور على طلاب مطابقين في هذه الشعبة.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredStudents.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const tardyCount = s.totalTardiness || 0;
                    const violCount = s.totalViolations || 0;

                    return (
                      <div
                        key={s.id}
                        className={`pt-2 p-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-teal-50/80 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {allowMultiple && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleStudentSelection(s.id)}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer shrink-0"
                            />
                          )}

                          <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {s.fullName.slice(0, 1)}
                          </div>

                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                              {s.fullName}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>#{s.studentNumber}</span>
                              <span>•</span>
                              <span>مسار {s.track}</span>
                              {s.parentPhone && (
                                <>
                                  <span>•</span>
                                  <span>هاتف: {s.parentPhone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Behavior Badges & Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {violCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                              {violCount} مخالفات
                            </span>
                          )}
                          {tardyCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                              {tardyCount} تأخير
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleConfirmSingleStudent(s)}
                            className="px-3 py-1.5 bg-[#006D77] hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <span>تجهيز النموذج</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="text-xs text-slate-500">
            {selectedGrade && (
              <span>
                المحدد حالياً: <strong>{selectedGrade}</strong>
                {selectedSection && <span> ← شعبة ({selectedSection})</span>}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {allowMultiple && selectedStudentIds.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmMultiple}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                اعتماد المحددين ({selectedStudentIds.length})
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
