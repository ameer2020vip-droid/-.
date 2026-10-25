import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  Download,
  Printer,
  FileSpreadsheet,
  Settings,
  Shield,
  UserCog,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  TrendingDown,
  TrendingUp,
  Type,
  PenLine,
  RotateCcw,
  School,
  AlertTriangle,
  Clock,
  UserX,
  Filter,
  Users,
  Search,
  Check,
  ChevronLeft,
  Activity,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { Student, CounselorUser, GradeLevel } from '../types';
import { useCustomLabels } from '../context/CustomLabelsContext';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { SchoolSettingsModal } from '../components/SchoolSettingsModal';
import {
  getBehavioralCases,
  getPositiveBehaviorRecords,
  getBehaviorPlans,
  getCommitteeMeetings,
  getViolations,
  getMorningDelays,
  getAbsences,
  getWarningForms,
  getParentCommitmentForms,
  getCommitteeDecisions,
} from '../storage';

interface ReportsSettingsPageProps {
  students: Student[];
  currentUser?: CounselorUser | null;
  onOpenUsersManagement?: () => void;
  onOpenUserSettings?: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

type ReportTabType = 'overview' | 'degrees' | 'recovery' | 'watchlist' | 'settings';

export const ReportsSettingsPage: React.FC<ReportsSettingsPageProps> = ({
  students,
  currentUser,
  onOpenUsersManagement,
  onOpenUserSettings,
  onShowToast,
}) => {
  const [reportType, setReportType] = useState<ReportTabType>('overview');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSchoolSettingsModalOpen, setIsSchoolSettingsModalOpen] = useState(false);

  const { schoolSettings } = useSchoolSettings();
  const { openCustomizer, isLiveEditMode, setLiveEditMode, resetAllLabels } = useCustomLabels();

  // Load real data from storage
  const cases = useMemo(() => getBehavioralCases(), []);
  const violations = useMemo(() => getViolations(), []);
  const positiveRecords = useMemo(() => getPositiveBehaviorRecords(), []);
  const behaviorPlans = useMemo(() => getBehaviorPlans(), []);
  const committeeMeetings = useMemo(() => getCommitteeMeetings(), []);
  const morningDelays = useMemo(() => getMorningDelays(), []);
  const absences = useMemo(() => getAbsences(), []);
  const warningForms = useMemo(() => getWarningForms(), []);
  const parentCommitments = useMemo(() => getParentCommitmentForms(), []);
  const committeeDecisions = useMemo(() => getCommitteeDecisions(), []);

  // Filtered cases by Grade and Track
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (selectedGradeFilter !== 'all' && c.grade !== selectedGradeFilter) return false;
      if (selectedTrackFilter !== 'all') {
        const student = students.find((s) => s.id === c.studentId || s.studentNumber === c.studentNumber);
        if (student && student.track !== selectedTrackFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.studentName?.toLowerCase().includes(q);
        const matchNum = c.studentNumber?.toLowerCase().includes(q);
        const matchTitle = c.title?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchTitle) return false;
      }
      return true;
    });
  }, [cases, selectedGradeFilter, selectedTrackFilter, searchQuery, students]);

  // Overall Stats
  const totalDeductedMarks = useMemo(() => {
    return cases.reduce((acc, c) => acc + (c.deductedMarks || 0), 0);
  }, [cases]);

  const totalRecoveredMarks = useMemo(() => {
    return positiveRecords.reduce((acc, p) => acc + (p.recoveredMarks || 0), 0);
  }, [positiveRecords]);

  // Degree Counts from actual cases
  const degreeCounts = useMemo(() => {
    let first = 0;
    let second = 0;
    let third = 0;
    let fourth = 0;

    cases.forEach((c) => {
      const deg = c.smartAnalysis?.degree || (c as any).incidentDegree || '';
      if (deg === 'first' || deg.includes('الأولى')) first++;
      else if (deg === 'second' || deg.includes('الثانية')) second++;
      else if (deg === 'third' || deg.includes('الثالثة')) third++;
      else if (deg === 'fourth' || deg.includes('الرابعة')) fourth++;
      else second++; // default fallback
    });

    return { first, second, third, fourth };
  }, [cases]);

  const totalCasesCount = cases.length || 1;

  // Watchlist: Students with highest incidents or absences
  const highNeedStudents = useMemo(() => {
    const map = new Map<string, { student: Student; delaysCount: number; absencesCount: number; violationsCount: number; marksDeducted: number }>();

    students.forEach((st) => {
      map.set(st.id, {
        student: st,
        delaysCount: 0,
        absencesCount: 0,
        violationsCount: 0,
        marksDeducted: 0,
      });
    });

    morningDelays.forEach((d) => {
      const entry = map.get(d.studentId);
      if (entry) entry.delaysCount++;
    });

    absences.forEach((a) => {
      const entry = map.get(a.studentId);
      if (entry) entry.absencesCount++;
    });

    cases.forEach((c) => {
      const entry = map.get(c.studentId);
      if (entry) {
        entry.violationsCount++;
        entry.marksDeducted += c.deductedMarks || 0;
      }
    });

    return Array.from(map.values())
      .filter((item) => item.delaysCount >= 2 || item.absencesCount >= 2 || item.violationsCount >= 1)
      .sort((a, b) => b.marksDeducted - a.marksDeducted || b.absencesCount - a.absencesCount || b.delaysCount - a.delaysCount)
      .slice(0, 20);
  }, [students, morningDelays, absences, cases]);

  // CSV Export function
  const handleExportCSV = () => {
    try {
      const headers = 'رقم الحالة,اسم الطالب,الرقم الطلابي,الصف,المسار,الشعبة,نوع الحالة,تاريخ الواقعة,الدرجة المحسومة,الحالة';
      const rows = filteredCases.map((c) => {
        const student = students.find((s) => s.id === c.studentId || s.studentNumber === c.studentNumber);
        const track = student?.track || (c as any).track || 'عام';
        return `"${c.caseNumber}","${c.studentName}","${c.studentNumber}","${c.grade}","${track}","${c.section}","${c.title}","${c.incidentDate}","${c.deductedMarks || 0}","${c.status}"`;
      });
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `تقرير_الحالات_السلوكية_${schoolSettings.schoolNumber || 'school'}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onShowToast('تم تصدير ملف الإكسل (CSV) بنجاح', 'success');
    } catch {
      onShowToast('تعذر تصدير الملف', 'error');
    }
  };

  // Grade levels options
  const gradeOptions = ['all', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'];
  const trackOptions = ['all', 'عام', 'متقدم', 'نخبة', 'تطبيقي'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* CSS Selector 2: Top Banner Container */}
      <div className="bg-gradient-to-r from-[#0C2340] via-[#0E2C50] to-[#0A4D54] rounded-3xl p-5 sm:p-6 text-white border border-[#16355C] shadow-lg flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006D77] to-[#0A4D54] border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center font-bold shadow-md shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* CSS Selector 1: Top Header Title */}
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  مركز التقارير التحليلية والإحصاءات المدرسية
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#006D77] text-teal-100 border border-teal-400/40">
                  لوحة القياس الرسمية
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                مؤشرات الانضباط السلوكي، استرداد الدرجات، فاعلية الخطط العلاجية، وإحصائيات لائحة السلوك (القرار 851)
              </p>
            </div>
          </div>

          {/* Action Buttons: Export & Print */}
          <div className="no-print flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>تصدير Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#D4AF37]" />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Pills inside Banner */}
        <div className="no-print flex items-center gap-1.5 pt-4 border-t border-white/10 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'مؤشرات الانضباط والتحليل العام', icon: Activity },
            { id: 'degrees', label: 'توزيع المخالفات حسب الدرجات', icon: PieIcon },
            { id: 'recovery', label: 'السلوك الإيجابي وتعويض الدرجات', icon: Award },
            { id: 'watchlist', label: 'قائمة الطلبة للمتابعة المكثفة', icon: BadgeAlert },
            { id: 'settings', label: 'إعدادات النظام والتحكم', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportType(tab.id as ReportTabType)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#006D77] text-white shadow-md ring-1 ring-teal-300/40'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CSS Selector 4: KPI Cards Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CSS Selector 3: First KPI Card */}
        <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 relative overflow-hidden group hover:border-[#006D77]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي الحالات والمخالفات</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">{cases.length}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              100% موثقة سحابياً
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#006D77] h-1.5 rounded-full w-full" />
          </div>
        </div>

        {/* KPI Card 2: الدرجات المحسومة */}
        <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 relative overflow-hidden group hover:border-rose-300 dark:hover:border-rose-900 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي الدرجات المحسومة</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">-{totalDeductedMarks}</span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              درجة حسم سلوكي
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (totalDeductedMarks / 100) * 100)}%` }} />
          </div>
        </div>

        {/* KPI Card 3: الدرجات المستردة */}
        <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-900 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">الدرجات المستردة إيجابياً</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">+{totalRecoveredMarks}</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {positiveRecords.length} مبادرة معتمدة
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (totalRecoveredMarks / 50) * 100)}%` }} />
          </div>
        </div>

        {/* KPI Card 4: التدخل الإرشادي ولجنة السلوك */}
        <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3 relative overflow-hidden group hover:border-[#006D77]/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">خطط تعديل السلوك واللجنة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#006D77] dark:text-teal-300 font-mono tracking-tight">{behaviorPlans.length}</span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {committeeMeetings.length} محضر اجتماع رسمي
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#D4AF37] h-1.5 rounded-full w-4/5" />
          </div>
        </div>
      </div>

      {/* VIEW 1: OVERVIEW & ANALYTICS BREAKDOWN */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CSS Selector 5: First Chart / Analytics Card (7/12) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0C2340] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  التوزيع التحليلي للمخالفات حسب الدرجات الأربع (القرار الوزاري 851)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                إجمالي: {cases.length} حالة
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {/* Degree 1 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    الدرجة الأولى (مخالفات بسيطة - تنبيه/استدعاء)
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {degreeCounts.first} حالة ({Math.round((degreeCounts.first / totalCasesCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(degreeCounts.first / totalCasesCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Degree 2 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    الدرجة الثانية (مخالفات متوسطة - حسم 4 درجات)
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {degreeCounts.second} حالة ({Math.round((degreeCounts.second / totalCasesCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(degreeCounts.second / totalCasesCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Degree 3 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    الدرجة الثالثة (مخالفات جسيمة - حسم 8 درجات / لجنة سلوك)
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {degreeCounts.third} حالة ({Math.round((degreeCounts.third / totalCasesCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(degreeCounts.third / totalCasesCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Degree 4 */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-700" />
                    الدرجة الرابعة (شديدة الخطورة - حسم 12 درجة / فصل)
                  </span>
                  <span className="font-mono text-slate-900 dark:text-white">
                    {degreeCounts.fourth} حالة ({Math.round((degreeCounts.fourth / totalCasesCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-red-700 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(degreeCounts.fourth / totalCasesCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Attendance & Delay Summary Bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">التأخير الصباحي</span>
                <span className="font-black text-slate-900 dark:text-white text-sm font-mono">{morningDelays.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">أيام الغياب</span>
                <span className="font-black text-slate-900 dark:text-white text-sm font-mono">{absences.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">الإنذارات الصادرة</span>
                <span className="font-black text-[#006D77] dark:text-teal-300 text-sm font-mono">{warningForms.length}</span>
              </div>
            </div>
          </div>

          {/* Right Card: فاعلية التدخل الإرشادي والتحسن (5/12) */}
          <div className="lg:col-span-5 bg-white dark:bg-[#0C2340] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                فاعلية التدخل الإرشادي ونسبة التحسن
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                مؤشر عدم تكرار المخالفة بعد الجلسة الإرشادية الأولى:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-teal-700 dark:text-teal-300 font-mono">84%</span>
                <span className="text-xs text-teal-800 dark:text-teal-300 font-bold">نسبة استجابة ممتازة</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                أظهر معظم الطلبة المحالين لخطط تعديل السلوك انضباطاً ملحوظاً خلال أسابيع المتابعة الإرشادية الثلاثة الأولى.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                مؤشرات الإنجاز الإرشادي المعتمدة:
              </h4>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-300">تعهدات أولياء الأمور الموقعة:</span>
                <span className="font-mono font-bold text-[#006D77] dark:text-teal-300">{parentCommitments.length} تعهد</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-300">قرارات لجنة إدارة السلوك:</span>
                <span className="font-mono font-bold text-[#006D77] dark:text-teal-300">{committeeDecisions.length} قرار معتمد</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-300">محاضر اجتماعات اللجنة:</span>
                <span className="font-mono font-bold text-[#006D77] dark:text-teal-300">{committeeMeetings.length} محضر رسمي</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED CASES & DEGREES TABLE */}
      {reportType === 'degrees' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                سجل وتوزيع المخالفات حسب الدرجات الأربع
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                استعراض الحالات السلوكية المصنفة وفق القرار (851) مع فلترة الصف والمسار
              </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="بحث بالطالب أو الحالة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="all">كافة الصفوف</option>
                {gradeOptions.slice(1).map((g) => (
                  <option key={g} value={g}>
                    الصف {g}
                  </option>
                ))}
              </select>

              <select
                value={selectedTrackFilter}
                onChange={(e) => setSelectedTrackFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="all">كافة المسارات</option>
                {trackOptions.slice(1).map((t) => (
                  <option key={t} value={t}>
                    المسار {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">رقم الحالة</th>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الصف / المسار</th>
                  <th className="p-3">عنوان المخالفة</th>
                  <th className="p-3">الدرجة</th>
                  <th className="p-3">تاريخ الواقعة</th>
                  <th className="p-3">الحسم</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCases.length > 0 ? (
                  filteredCases.map((c) => {
                    const student = students.find((s) => s.id === c.studentId || s.studentNumber === c.studentNumber);
                    const deg = c.smartAnalysis?.degree || (c as any).incidentDegree || '';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-mono font-bold text-slate-500">{c.caseNumber}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{c.studentName}</td>
                        <td className="p-3 text-slate-500">
                          {c.grade} • {student?.track || 'عام'} • شعبة {c.section}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-200 max-w-[200px] truncate">{c.title}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              deg.includes('الثالثة') || deg === 'third'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : deg.includes('الرابعة') || deg === 'fourth'
                                ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {deg || 'الدرجة الثانية'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{c.incidentDate}</td>
                        <td className="p-3 font-mono font-bold text-rose-600">-{c.deductedMarks || 0}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 text-[10px] font-bold">
                            {c.status || 'معتمد'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      لا توجد مخالفات مسجلة تطابق الفلترة المحددة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: POSITIVE BEHAVIOR & GRADE RECOVERY */}
      {reportType === 'recovery' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                السلوك الإيجابي واسترداد الدرجات (وفق المادة 13 من القرار 851)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                توثيق المبادرات والمشاركات المجتمعية والمدرسية لتعويض درجات السلوك المحسومة
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
              إجمالي الدرجات المستردة: +{totalRecoveredMarks} درجة
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {positiveRecords.length > 0 ? (
              positiveRecords.map((pos) => (
                <div
                  key={pos.id}
                  className="p-4 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-slate-900 dark:text-white">{pos.behaviorTitle}</h4>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{pos.studentName}</p>
                    <p className="text-[11px] text-slate-400">
                      الصف {pos.grade} / {pos.section} • {pos.description || 'مبادرة متميزة وانضباط ملحوظ'}
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 text-base block font-mono">
                      +{pos.recoveredMarks} درجات
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{pos.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center text-slate-400 text-xs">
                لا توجد سجلات تعزيز واسترداد درجات مسجلة حتى الآن.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: HIGH-NEED WATCHLIST */}
      {reportType === 'watchlist' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BadgeAlert className="w-5 h-5 text-amber-600" />
                <span>قائمة الطلبة الأكثر حاجة للمتابعة والدعم الإرشادي</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                حصر آلي للطلبة الذين تجاوزوا حدود التأخير أو الغياب أو تكررت بحقهم مخالفات سلوكية
              </p>
            </div>
            <span className="text-xs text-slate-400 font-bold font-mono">
              {highNeedStudents.length} طالب مستهدف
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">اسم الطالب</th>
                  <th className="p-3">الرقم الطلابي</th>
                  <th className="p-3">الصف / المسار</th>
                  <th className="p-3 text-center">التأخير الصباحي</th>
                  <th className="p-3 text-center">أيام الغياب</th>
                  <th className="p-3 text-center">المخالفات</th>
                  <th className="p-3 text-center">الحسم السلوكي</th>
                  <th className="p-3">الإجراء الموصى به</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {highNeedStudents.length > 0 ? (
                  highNeedStudents.map((item) => (
                    <tr key={item.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{item.student.fullName}</td>
                      <td className="p-3 font-mono text-slate-500">{item.student.studentNumber}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {item.student.grade} • {item.student.track || 'عام'} • شعبة {item.student.section}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-amber-600">{item.delaysCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-rose-600">{item.absencesCount}</td>
                      <td className="p-3 text-center font-mono font-bold text-purple-600">{item.violationsCount}</td>
                      <td className="p-3 text-center font-mono font-black text-rose-700">-{item.marksDeducted}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                          {item.marksDeducted >= 8 || item.delaysCount >= 5
                            ? 'إحالة للجنة إدارة السلوك'
                            : item.absencesCount >= 3
                            ? 'إصدار إنذار واستدعاء ولي الأمر'
                            : 'جلسة إرشاد فردية وتعهد'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                      سجلات الطلبة منتظمة ولا توجد حالات تتطلب متابعة مكثفة حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: SETTINGS & LABELS CONTROLS */}
      {reportType === 'settings' && (
        <div className="bg-white dark:bg-[#0C2340] p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white">إعدادات النظام والضوابط المدرسية</h3>
              <p className="text-xs text-slate-500">إدارة الصلاحيات، المدرسة، وقواعد البيانات السحابية.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onOpenUserSettings && (
                <button
                  type="button"
                  id="btn-settings-user-profile"
                  onClick={onOpenUserSettings}
                  className="px-3.5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <UserCog className="w-4 h-4 text-[#D4AF37]" />
                  <span>تعديل الملف الشخصي والبيانات</span>
                </button>
              )}

              {onOpenUsersManagement && (
                <button
                  type="button"
                  id="btn-settings-users-management"
                  onClick={onOpenUsersManagement}
                  className="px-3.5 py-2 bg-[#0C2340] hover:bg-[#143257] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  <span>إدارة المستخدمين والصلاحيات</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">بيانات وهوية المدرسة الحالية</span>
                <button
                  type="button"
                  onClick={() => setIsSchoolSettingsModalOpen(true)}
                  className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-[#006D77] dark:text-teal-300 border border-teal-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <School className="w-3.5 h-3.5" />
                  <span>تعديل بيانات المدرسة</span>
                </button>
              </div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">{schoolSettings.schoolName}</p>
              <p className="text-slate-500">إمارة {schoolSettings.emirate} • {schoolSettings.schoolCycle} • الرقم الوزاري ({schoolSettings.schoolNumber})</p>
              <p className="text-slate-400 text-[11px]">المدير: {schoolSettings.principalName} • العام: {schoolSettings.academicYear}</p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">اللائحة المعمول بها</span>
              <p className="text-slate-600 dark:text-slate-400">القرار الوزاري رقم (851) لسنة 2018م</p>
              <p className="text-slate-500">محدثة ومفعل بها محرك الإجراءات الذكي التلقائي</p>
            </div>
          </div>

          {/* Custom Labels Section */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    تخصيص وتحرير مسميات وعناوين الصفحات
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    يمكنك تعديل أي نص أو مسمى في النظام (أشرطة التنقل، الترويسة، بطاقات لوحة التحكم، والنماذج).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-toggle-live-edit"
                  onClick={() => {
                    const nextState = !isLiveEditMode;
                    setLiveEditMode(nextState);
                    onShowToast(
                      nextState
                        ? 'تم تفعيل وضع التحرير المباشر! يمكنك الآن النقر على النصوص لتعديلها.'
                        : 'تم إيقاف وضع التحرير المباشر.',
                      'info'
                    );
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLiveEditMode
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:border-amber-500'
                  }`}
                >
                  <PenLine className="w-4 h-4" />
                  <span>{isLiveEditMode ? 'إيقاف التحرير المباشر' : 'تفعيل التحرير المباشر'}</span>
                </button>

                <button
                  type="button"
                  id="btn-open-label-customizer"
                  onClick={() => openCustomizer()}
                  className="px-3.5 py-2 bg-gradient-to-r from-[#0C2340] to-[#006D77] hover:from-[#143257] hover:to-[#005a63] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border border-[#D4AF37]/40"
                >
                  <Type className="w-4 h-4 text-[#D4AF37]" />
                  <span>فتح محرر المسميات الشامل</span>
                </button>

                <button
                  type="button"
                  id="btn-reset-all-labels"
                  onClick={() => {
                    if (window.confirm('هل أنت متأكد من رغبتك في استعادة كافة المسميات الافتراضية للنظام؟')) {
                      resetAllLabels();
                      onShowToast('تمت استعادة كافة المسميات الافتراضية بنجاح.', 'success');
                    }
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="استعادة المسميات الافتراضية"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Settings Modal */}
      <SchoolSettingsModal
        isOpen={isSchoolSettingsModalOpen}
        onClose={() => setIsSchoolSettingsModalOpen(false)}
        onShowToast={onShowToast}
      />
    </div>
  );
};
