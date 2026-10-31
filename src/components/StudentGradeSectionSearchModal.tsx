import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  GraduationCap,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSignature,
  FileText,
  Clock,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  Award,
  Phone,
  User,
  Check,
} from 'lucide-react';
import { Student, ViolationRecord } from '../types';
import { FormTabType } from '../pages/FormsPage';
import {
  ACADEMY_STANDARD_GRADES,
  normalizeCanonicalGrade,
  compareGrades,
  compareSections,
  getGradeDisplayLabel,
  getGradeIconNumber,
  getGradeCycleSubtitle,
} from '../hooks/useAcademicFiltering';

interface StudentGradeSectionSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  violations?: ViolationRecord[];
  onSelectStudentForForm: (
    studentId: string,
    formTab: FormTabType,
    violationId?: string
  ) => void;
  currentFormTab?: FormTabType;
}

function normalizeGrade(gradeStr: string | undefined): string {
  if (!gradeStr) return 'غير محدد';
  return normalizeCanonicalGrade(gradeStr) || gradeStr.toString().trim();
}

function normalizeSection(secStr: string | undefined): string {
  if (!secStr) return 'غير محدد';
  const s = secStr.toString().trim();
  return s || 'غير محدد';
}

function normalizeTrack(trackStr: string | undefined): string {
  if (!trackStr) return 'عام';
  const t = trackStr.toString().toLowerCase().trim();
  if (t.includes('متقدم') || t.includes('advance')) return 'متقدم';
  if (t.includes('تطبيق') || t.includes('applied')) return 'تطبيقي';
  if (t.includes('نخب') || t.includes('elite')) return 'نخبة';
  return 'عام';
}

const FORM_OPTIONS: {
  id: FormTabType;
  title: string;
  badge: string;
  desc: string;
  iconColor: string;
  bgColor: string;
}[] = [
  {
    id: 'model6-violation',
    title: 'نموذج (6) - تقرير مخالفة سلوكية',
    badge: 'ضبط واقعة وإحالة',
    desc: 'توثيق وتوصيف المخالفة السلوكية وحسم الدرجات والإجراء الفوري',
    iconColor: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200 hover:border-rose-400',
  },
  {
    id: 'model7-notice',
    title: 'نموذج (7) - إشعار ولي أمر بمخالفة',
    badge: 'إشعار رسمي',
    desc: 'تنبيه خطي أو تحذير أو إنذار موجه لولي أمر الطالب',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  },
  {
    id: 'model8-summon',
    title: 'نموذج (8) - استدعاء ولي الأمر',
    badge: 'مقابلة عاجلة',
    desc: 'طلب حضور ولي الأمر للمدرسة لمناقشة تكرار المخالفات أو التأخر',
    iconColor: 'text-[#D4AF37]',
    bgColor: 'bg-yellow-50 border-yellow-200 hover:border-yellow-400',
  },
  {
    id: 'model9-warning',
    title: 'نموذج (9) - إنذار وتعهد سلوكي',
    badge: 'إنذار وتعهد',
    desc: 'إنذار رسمي بعد استنفاد التوجيه الشفهي مع توثيق تعهد الطالب',
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200 hover:border-orange-400',
  },
  {
    id: 'model10-commitment',
    title: 'نموذج (10) - تعهد خطي لولي الأمر',
    badge: 'التزام ولي الأمر',
    desc: 'تعهد خطي رسمي موقع من ولي الأمر بمتابعة سلوك الطالب',
    iconColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400',
  },
  {
    id: 'model20-deduction',
    title: 'نموذج (20) - إشعار حسم درجات السلوك',
    badge: 'حسم درجات',
    desc: 'إشعار رسمي بحسم درجات من بند السلوك وفق لائحة 851',
    iconColor: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200 hover:border-red-400',
  },
  {
    id: 'model21-compensation',
    title: 'نموذج (21) - تعهد تعويض أضرار المخالفة',
    badge: 'تعويض أضرار',
    desc: 'إقرار بالمسؤولية عن تلف الممتلكات وتعهد إصلاحها أو تعويضها',
    iconColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
  },
  {
    id: 'model24-confiscation',
    title: 'نموذج (24) - محضر مصادرة أجهزة وهواتف',
    badge: 'مصادرة مواد',
    desc: 'محضر رسمي لمصادرة هاتف متحرك أو أجهزة إلكترونية غير مصرح بها',
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200 hover:border-purple-400',
  },
  {
    id: 'model27-attendance',
    title: 'نموذج (27) - تعهد الالتزام بالدوام المدرسي',
    badge: 'انضباط الحضور',
    desc: 'تعهد والتزام خطي بعدم التأخر الصباحي أو الغياب المتكرر',
    iconColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200 hover:border-cyan-400',
  },
];

export const StudentGradeSectionSearchModal: React.FC<StudentGradeSectionSearchModalProps> = ({
  isOpen,
  onClose,
  students,
  violations = [],
  onSelectStudentForForm,
  currentFormTab = 'model6-violation',
}) => {
  // Stepper state: 1 = الصفوف, 2 = الشعبة والمسار, 3 = عرض الطلاب والمخالفين وتجهيز النماذج
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Selected filters
  const [selectedGrade, setSelectedGrade] = useState<string>('تاسع');
  const [selectedSection, setSelectedSection] = useState<string>('1');
  const [selectedTrack, setSelectedTrack] = useState<string>('all'); // 'all', 'عام', 'متقدم', 'تطبيقي', 'نخبة'

  // Step 3 state
  const [violatorsOnlyFilter, setViolatorsOnlyFilter] = useState<boolean>(true);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetFormTab, setTargetFormTab] = useState<FormTabType>(
    currentFormTab !== 'all-archive' ? currentFormTab : 'model6-violation'
  );

  // Helper to determine if a student is a violator / has behavioral follow-up
  const isStudentViolator = useMemo(() => {
    const violatorIdSet = new Set<string>();

    students.forEach((s) => {
      const hasViolations = (s.totalViolations || 0) > 0;
      const hasTardinessIssues = (s.totalTardiness || 0) >= 3;
      const isMonitored =
        s.status === 'متابع سلوكيًا' ||
        s.status === 'إنذار أول' ||
        s.status === 'في غرفة الإرشاد';

      if (hasViolations || hasTardinessIssues || isMonitored) {
        violatorIdSet.add(s.id);
      }
    });

    // Check violations array records
    violations.forEach((v) => {
      if (v.studentId) violatorIdSet.add(v.studentId);
      const matched = students.find((s) => s.studentNumber === v.studentNumber);
      if (matched) violatorIdSet.add(matched.id);
    });

    return (student: Student) => violatorIdSet.has(student.id);
  }, [students, violations]);

  // Dynamically build CANONICAL_GRADES from actual students (or ACADEMY_STANDARD_GRADES)
  const CANONICAL_GRADES = useMemo(() => {
    const gSet = new Set<string>();
    students.forEach((s) => {
      const g = normalizeGrade(s.grade);
      if (g) gSet.add(g);
    });
    const keys = gSet.size > 0 ? Array.from(gSet).sort(compareGrades) : [...ACADEMY_STANDARD_GRADES];
    return keys.map((key) => ({
      key,
      label: getGradeDisplayLabel(key),
      shortLabel: `الصف ${getGradeIconNumber(key)}`,
      cycle: getGradeCycleSubtitle(key),
    }));
  }, [students]);

  // Group students by Grade
  const gradeStats = useMemo(() => {
    const stats: Record<string, { total: number; violators: number; sections: Set<string> }> = {};
    CANONICAL_GRADES.forEach((g) => {
      stats[g.key] = { total: 0, violators: 0, sections: new Set() };
    });

    students.forEach((s) => {
      const g = normalizeGrade(s.grade);
      if (!stats[g]) {
        stats[g] = { total: 0, violators: 0, sections: new Set() };
      }
      stats[g].total += 1;
      if (isStudentViolator(s)) {
        stats[g].violators += 1;
      }
      stats[g].sections.add(normalizeSection(s.section));
    });

    return stats;
  }, [students, isStudentViolator, CANONICAL_GRADES]);

  // Sections dynamically extracted per track for selectedGrade
  const generalSections = useMemo(() => {
    const secSet = new Set<string>();
    students.forEach((s) => {
      if (normalizeGrade(s.grade) === normalizeGrade(selectedGrade) && (normalizeTrack(s.track) || 'عام') === 'عام') {
        secSet.add(normalizeSection(s.section));
      }
    });
    return Array.from(secSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, selectedGrade]);

  const advancedSections = useMemo(() => {
    const secSet = new Set<string>();
    students.forEach((s) => {
      if (normalizeGrade(s.grade) === normalizeGrade(selectedGrade) && (normalizeTrack(s.track) || 'عام') === 'متقدم') {
        secSet.add(normalizeSection(s.section));
      }
    });
    return Array.from(secSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, selectedGrade]);

  // Available sections in the currently selected grade
  const availableSections = useMemo(() => {
    const secSet = new Set<string>();
    students.forEach((s) => {
      if (normalizeGrade(s.grade) === normalizeGrade(selectedGrade)) {
        secSet.add(normalizeSection(s.section));
      }
    });
    return Array.from(secSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, selectedGrade]);

  // Section and Track stats for selected Grade
  const sectionStats = useMemo(() => {
    const stats: Record<string, { total: number; violators: number }> = {};
    availableSections.forEach((sec) => {
      stats[`عام-${sec}`] = { total: 0, violators: 0 };
      stats[`متقدم-${sec}`] = { total: 0, violators: 0 };
    });

    students.forEach((s) => {
      if (normalizeGrade(s.grade) === normalizeGrade(selectedGrade)) {
        const sec = normalizeSection(s.section);
        const trk = normalizeTrack(s.track) || 'عام';
        const key = `${trk}-${sec}`;
        if (!stats[key]) stats[key] = { total: 0, violators: 0 };
        stats[key].total += 1;
        if (isStudentViolator(s)) {
          stats[key].violators += 1;
        }
      }
    });

    return stats;
  }, [students, selectedGrade, availableSections, isStudentViolator]);

  // Students in selected Grade + Section + Track
  const studentsInClass = useMemo(() => {
    return students.filter((s) => {
      if (normalizeGrade(s.grade) !== normalizeGrade(selectedGrade)) return false;
      if (normalizeSection(s.section) !== normalizeSection(selectedSection)) return false;
      const studentTrack = normalizeTrack(s.track) || 'عام';
      if (selectedTrack !== 'all' && studentTrack !== normalizeTrack(selectedTrack)) return false;
      return true;
    });
  }, [students, selectedGrade, selectedSection, selectedTrack]);

  // Filtered students for step 3 display
  const step3Students = useMemo(() => {
    return studentsInClass.filter((s) => {
      if (violatorsOnlyFilter && !isStudentViolator(s)) return false;
      if (!studentSearchQuery.trim()) return true;
      const q = studentSearchQuery.toLowerCase().trim();
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q))
      );
    });
  }, [studentsInClass, violatorsOnlyFilter, studentSearchQuery, isStudentViolator]);

  const totalViolatorsInClass = useMemo(() => {
    return studentsInClass.filter((s) => isStudentViolator(s)).length;
  }, [studentsInClass, isStudentViolator]);

  // Reset steps or sync on open
  const handleOpenGrade = (gradeKey: string) => {
    setSelectedGrade(gradeKey);
    // Auto-select first available section in this grade
    const gradeStudents = students.filter((s) => normalizeGrade(s.grade) === normalizeGrade(gradeKey));
    const firstSec = gradeStudents.length > 0 ? normalizeSection(gradeStudents[0].section) : '1';
    setSelectedSection(firstSec);
    setCurrentStep(2);
  };

  const handleProceedToStudents = () => {
    // If there are violating students, enable violatorsOnlyFilter by default
    if (totalViolatorsInClass > 0) {
      setViolatorsOnlyFilter(true);
    } else {
      setViolatorsOnlyFilter(false);
    }
    // Pre-select first student if available
    const firstCandidate = studentsInClass.find((s) => isStudentViolator(s)) || studentsInClass[0];
    if (firstCandidate) {
      setSelectedStudentId(firstCandidate.id);
      setSelectedStudentIds([firstCandidate.id]);
    }
    setCurrentStep(3);
  };

  const handleToggleStudentSelection = (id: string) => {
    setSelectedStudentId(id);
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllViolators = () => {
    const violatorIds = step3Students.filter((s) => isStudentViolator(s)).map((s) => s.id);
    setSelectedStudentIds(violatorIds);
    if (violatorIds.length > 0) {
      setSelectedStudentId(violatorIds[0]);
    }
  };

  const handleConfirmAndPrepareForm = () => {
    const finalStudentId = selectedStudentId || (selectedStudentIds[0] ?? '');
    if (!finalStudentId) return;

    // Check if there's a recent violation for this student
    const studentViolation = violations.find(
      (v) =>
        v.studentId === finalStudentId ||
        v.studentNumber === students.find((s) => s.id === finalStudentId)?.studentNumber
    );

    onSelectStudentForForm(finalStudentId, targetFormTab, studentViolation?.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0e1a2b] w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#0C2340] via-[#102e52] to-[#006D77] p-5 text-white flex items-center justify-between border-b-2 border-[#D4AF37]/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 text-[#D4AF37]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  البحث عن طالب حسب الصفوف والشعب والمسارات
                </h3>
                <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  تجهيز النماذج الرسمية
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                تصفح طلبة المدرسة، فرز المخالفين سلوكياً، وتجهيز النماذج والتعهدات الرسمية فورياً
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Breadcrumb Progress Bar */}
        <div className="bg-slate-50 dark:bg-slate-900/60 px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-xs">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer ${
                currentStep === 1
                  ? 'text-[#006D77] dark:text-teal-400'
                  : currentStep > 1
                  ? 'text-slate-700 dark:text-slate-300 hover:text-[#006D77]'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                  currentStep === 1
                    ? 'bg-[#006D77] text-white shadow-xs'
                    : currentStep > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {currentStep > 1 ? '✓' : '١'}
              </span>
              <span>الصفوف الدراسية</span>
            </button>

            <ChevronLeft className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0" />

            {/* Step 2 */}
            <button
              type="button"
              disabled={currentStep < 2}
              onClick={() => currentStep > 2 && setCurrentStep(2)}
              className={`flex items-center gap-1.5 font-bold transition-colors ${
                currentStep === 2
                  ? 'text-[#006D77] dark:text-teal-400 cursor-pointer'
                  : currentStep > 2
                  ? 'text-slate-700 dark:text-slate-300 hover:text-[#006D77] cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                  currentStep === 2
                    ? 'bg-[#006D77] text-white shadow-xs'
                    : currentStep > 2
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {currentStep > 2 ? '✓' : '٢'}
              </span>
              <span>الشعبة والمسار ({CANONICAL_GRADES.find((g) => g.key === selectedGrade)?.shortLabel || selectedGrade})</span>
            </button>

            <ChevronLeft className="w-4 h-4 text-slate-300 dark:text-slate-700 shrink-0" />

            {/* Step 3 */}
            <div
              className={`flex items-center gap-1.5 font-bold ${
                currentStep === 3
                  ? 'text-[#006D77] dark:text-teal-400'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                  currentStep === 3
                    ? 'bg-[#006D77] text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                }`}
              >
                ٣
              </span>
              <span>الطلاب المخالفين وتجهيز النماذج</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* ============================================================ */}
          {/* STEP 1: اختيار الصفوف (Grades Selection)                     */}
          {/* ============================================================ */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#006D77]" />
                    <span>حدد الصف الدراسي أولاً:</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    اختر الصف لعرض الشعب الدراسية والمسارات والطلبة المسجلين فيه
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  إجمالي طلبة المدرسة: {students.length}
                </span>
              </div>

              {/* Grades Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {CANONICAL_GRADES.map((grade) => {
                  const stat = gradeStats[grade.key] || { total: 0, violators: 0, sections: new Set() };
                  const isSelected = selectedGrade === grade.key;

                  return (
                    <button
                      key={grade.key}
                      type="button"
                      onClick={() => handleOpenGrade(grade.key)}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between group hover:shadow-md ${
                        isSelected
                          ? 'border-[#006D77] bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-[#006D77]/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#132238] hover:border-[#006D77]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-105 ${
                              stat.violators > 0
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/20 dark:text-teal-300'
                            }`}
                          >
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#006D77] dark:group-hover:text-teal-400 transition-colors">
                              {grade.label}
                            </h5>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                              {grade.cycle} • {stat.sections.size} شعب دراسية
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#006D77] transition-colors">
                          <span className="text-xs font-bold hidden sm:inline">اختيار</span>
                          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        </div>
                      </div>

                      {/* Stat Metrics Pills */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold font-mono">
                          {stat.total} طالب
                        </span>

                        {stat.violators > 0 ? (
                          <span className="px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[11px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>{stat.violators} مخالفين سلوكياً</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>سجل منضبط</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: اختيار الشعبة والمسار (Section & Track Selection)    */}
          {/* ============================================================ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Back to Step 1 & Current Grade Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تغيير الصف</span>
                </button>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">الصف المحدد:</span>
                  <span className="text-sm font-black text-[#006D77] dark:text-teal-400">
                    {CANONICAL_GRADES.find((g) => g.key === selectedGrade)?.label || selectedGrade}
                  </span>
                </div>
              </div>

              {/* Sub-section: اختيار الشعبة والمسار (Dual-Row Track & Section) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-[#006D77]/10 text-[#006D77] dark:text-teal-300 flex items-center justify-center text-[11px] font-bold">
                      أ
                    </span>
                    <span>اختر الشعبة والمسار الأكاديمي:</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    مقسمة بدقة حسب المسار الدراسي لمنع دمج الطلاب
                  </span>
                </div>

                {/* Row 1: General Track */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.5 rounded-lg">
                      📘 المسار العام
                    </span>
                    <span className="text-[11px] text-slate-400">
                      شعب المسار العام في الصف المحدد
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {generalSections.length === 0 ? (
                      <div className="col-span-full p-3 text-xs text-slate-400 italic">لا توجد شعب مسار عام في هذا الصف</div>
                    ) : (
                      generalSections.map((sec) => {
                        const isSelected = selectedTrack === 'عام' && normalizeSection(selectedSection) === normalizeSection(sec);
                        const secInfo = sectionStats[`عام-${sec}`] || { total: 0, violators: 0 };

                        return (
                          <button
                            key={`modal-gen-${sec}`}
                            type="button"
                            onClick={() => {
                              setSelectedTrack('عام');
                              setSelectedSection(sec);
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                              isSelected
                                ? 'border-[#006D77] bg-teal-50 dark:bg-teal-950/40 ring-2 ring-[#006D77]/30 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0e1a2b] hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-[#006D77] text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {sec}
                              </span>
                              {secInfo.violators > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                                  {secInfo.violators} مخالف
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold">منضبط</span>
                              )}
                            </div>

                            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">
                              عام – شعبة {sec}
                            </span>

                            <span className="text-[10px] font-mono text-slate-500">
                              {secInfo.total} طالب مسجل
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Row 2: Advanced Track */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#132238] border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-lg">
                      🔬 المسار المتقدم
                    </span>
                    <span className="text-[11px] text-slate-400">
                      شعب المسار المتقدم في الصف المحدد
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {advancedSections.length === 0 ? (
                      <div className="col-span-full p-3 text-xs text-slate-400 italic">لا توجد شعب مسار متقدم في هذا الصف</div>
                    ) : (
                      advancedSections.map((sec) => {
                        const isSelected = selectedTrack === 'متقدم' && normalizeSection(selectedSection) === normalizeSection(sec);
                        const secInfo = sectionStats[`متقدم-${sec}`] || { total: 0, violators: 0 };

                        return (
                          <button
                            key={`modal-adv-${sec}`}
                            type="button"
                            onClick={() => {
                              setSelectedTrack('متقدم');
                              setSelectedSection(sec);
                            }}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0e1a2b] hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {sec}
                              </span>
                              {secInfo.violators > 0 ? (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                                  {secInfo.violators} مخالف
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-bold">منضبط</span>
                              )}
                            </div>

                            <span className="text-xs font-black text-slate-900 dark:text-white mt-1">
                              متقدم – شعبة {sec}
                            </span>

                            <span className="text-[10px] font-mono text-slate-500">
                              {secInfo.total} طالب مسجل
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Selection Summary Pill & Proceed Button */}
              <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-900 dark:to-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      تم تحديد:{' '}
                      <strong className="text-[#006D77] dark:text-teal-300">
                        {CANONICAL_GRADES.find((g) => g.key === selectedGrade)?.label} • شعبة ({selectedSection}) •{' '}
                        {selectedTrack === 'all' ? 'جميع المسارات' : selectedTrack}
                      </strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                    عدد الطلبة في هذا التحديد:{' '}
                    <strong className="font-mono text-slate-900 dark:text-white">
                      {studentsInClass.length} طالب
                    </strong>{' '}
                    منهم{' '}
                    <strong className="font-mono text-rose-600 dark:text-rose-400">
                      {totalViolatorsInClass} لديهم مخالفات أو متابعة سلوكية
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToStudents}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0C2340] to-[#006D77] text-white text-xs font-black hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <span>عرض طلبة الشعبة والمسار ({studentsInClass.length})</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: عرض الطلاب والمخالفين وتجهيز النماذج                 */}
          {/* ============================================================ */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Context Bar + Back to Step 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تغيير الشعبة أو المسار</span>
                </button>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">الفصل المحدد:</span>
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                    <span className="text-[#006D77] dark:text-teal-400">
                      {CANONICAL_GRADES.find((g) => g.key === selectedGrade)?.label}
                    </span>
                    <span>•</span>
                    <span>شعبة {selectedSection}</span>
                    <span>•</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {selectedTrack === 'all' ? 'جميع المسارات' : `مسار ${selectedTrack}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ابحث باسم الطالب أو الرقم الطلابي أو ولي الأمر..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-3 pr-9 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViolatorsOnlyFilter(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      violatorsOnlyFilter
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>الطلاب المخالفون فقط ({totalViolatorsInClass})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViolatorsOnlyFilter(false)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !violatorsOnlyFilter
                        ? 'bg-[#006D77] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>جميع طلاب الشعبة ({studentsInClass.length})</span>
                  </button>
                </div>
              </div>

              {/* Violators Quick Select All if multiple */}
              {violatorsOnlyFilter && step3Students.length > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>
                      حدد الطالب المخالف المطلوب لإعداد النموذج المعتمد له، أو حدد عدة طلبة.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllViolators}
                    className="font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    تحديد كل المخالفين ({step3Students.length})
                  </button>
                </div>
              )}

              {/* Students List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {step3Students.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-400" />
                    <p className="text-xs font-bold">لم يتم العثور على طلبة يطابقون شروط البحث.</p>
                    {violatorsOnlyFilter && totalViolatorsInClass === 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                        هذه الشعبة لا يوجد بها أي مخالفات سلوكية مسجلة حالياً!
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => setViolatorsOnlyFilter(false)}
                      className="mt-3 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-xs font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
                    >
                      عرض جميع طلاب الشعبة
                    </button>
                  </div>
                ) : (
                  step3Students.map((student) => {
                    const isSelected = selectedStudentId === student.id || selectedStudentIds.includes(student.id);
                    const isViolator = isStudentViolator(student);
                    const studentViolationsList = violations.filter(
                      (v) => v.studentId === student.id || v.studentNumber === student.studentNumber
                    );

                    return (
                      <div
                        key={student.id}
                        onClick={() => handleToggleStudentSelection(student.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-[#006D77] bg-teal-50/80 dark:bg-teal-950/40 ring-2 ring-[#006D77]/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#132238] hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Student Details */}
                        <div className="flex items-center gap-3">
                          {/* Checkbox / Radio indicator */}
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-[#006D77] text-white'
                                : 'border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          {/* Avatar & Info */}
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                {student.fullName}
                              </h5>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                #{student.studentNumber}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>الصف {student.grade} / {student.section}</span>
                              <span>•</span>
                              <span>مسار {student.track || 'عام'}</span>
                              {student.parentPhone && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {student.parentPhone}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Behavior Badges & Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isViolator ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>مخالفة سلوكية / متابع</span>
                              </span>
                              {studentViolationsList.length > 0 && (
                                <span className="text-[10px] text-rose-600 font-bold">
                                  {studentViolationsList.length} مخالفات مسجلة
                                </span>
                              )}
                              {(student.totalTardiness || 0) >= 3 && (
                                <span className="text-[10px] text-amber-600 font-bold">
                                  تأخر صباحي: {student.totalTardiness} مرات
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                              سليم السجل
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentId(student.id);
                              setSelectedStudentIds([student.id]);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#006D77] text-white shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {isSelected ? 'محدد للتجهيز' : 'اختيار الطالب'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ============================================================ */}
              {/* Form Model Selection Panel (تجهيز النماذج للمخالفة)          */}
              {/* ============================================================ */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileSignature className="w-4 h-4 text-[#006D77]" />
                    <span>اختر النموذج الرسمي المراد تجهيزه للمخالفة:</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    سيتم فتح النموذج تلقائياً ببيانات الطالب المختار
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {FORM_OPTIONS.map((form) => {
                    const isSelected = targetFormTab === form.id;
                    return (
                      <button
                        key={form.id}
                        type="button"
                        onClick={() => setTargetFormTab(form.id)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#006D77] bg-white dark:bg-slate-800 ring-2 ring-[#006D77]/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-700/80 bg-white/70 dark:bg-slate-800/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-[#006D77] text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {form.badge}
                          </span>
                          <span className={`text-xs ${form.iconColor}`}>●</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {form.title}
                        </span>
                        <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                          {form.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 dark:bg-slate-900/80 p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            {currentStep === 3 && selectedStudentId && (
              <>
                <User className="w-3.5 h-3.5 text-[#006D77]" />
                <span>
                  الطالب المحدد:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {students.find((s) => s.id === selectedStudentId)?.fullName}
                  </strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              إلغاء
            </button>

            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => handleOpenGrade(selectedGrade)}
                className="px-5 py-2 rounded-xl bg-[#006D77] text-white text-xs font-black hover:bg-[#005a63] cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>متابعة لاختيار الشعبة والمسار</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleProceedToStudents}
                className="px-5 py-2 rounded-xl bg-[#006D77] text-white text-xs font-black hover:bg-[#005a63] cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>متابعة لعرض الطلبة المخالفين</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {currentStep === 3 && (
              <button
                type="button"
                disabled={!selectedStudentId && selectedStudentIds.length === 0}
                onClick={handleConfirmAndPrepareForm}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                  selectedStudentId || selectedStudentIds.length > 0
                    ? 'bg-gradient-to-r from-[#0C2340] to-[#006D77] text-white hover:opacity-95'
                    : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <FileSignature className="w-4 h-4 text-[#D4AF37]" />
                <span>
                  تجهيز النموذج والانتقال الفوري للتحرير (
                  {selectedStudentIds.length > 1
                    ? `${selectedStudentIds.length} طلاب`
                    : students.find((s) => s.id === selectedStudentId)?.fullName?.split(' ')[0] || 'الطالب'}
                  )
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
