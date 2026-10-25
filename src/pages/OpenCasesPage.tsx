import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  Layers,
  FileSignature,
  User,
  Calendar,
  ChevronRight,
  ExternalLink,
  Plus,
  Shield,
  Smartphone,
  EyeOff,
  HeartHandshake,
  Award,
  MoreVertical,
  Check,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  BehavioralCase,
  CaseWorkflowStatus,
  CaseConfidentiality,
  CounselorUser,
  Student,
} from '../types';
import {
  getBehavioralCases,
  saveBehavioralCase,
  updateBehavioralCaseStatus,
  deleteBehavioralCase,
  createCaseBundle,
} from '../storage';
import { getUaeTodayDateString } from '../utils/time';

interface OpenCasesPageProps {
  currentUser?: CounselorUser | null;
  onOpenIntake: () => void;
  onOpenStudentProfile: (studentId: string) => void;
  onOpenForms?: (subTab: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const STATUS_COLUMNS: {
  id: CaseWorkflowStatus | 'all';
  label: string;
  badgeColor: string;
  countKey?: string;
}[] = [
  { id: 'all', label: 'كافة الحالات', badgeColor: 'bg-slate-100 text-slate-800' },
  { id: 'draft', label: 'مسودة قيد التدقيق', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'awaiting_student_sig', label: 'بانتظار توقيع الطالب', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'awaiting_parent', label: 'بانتظار ولي الأمر', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'referred_to_committee', label: 'محالة للجنة السلوك', badgeColor: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'approved_closed', label: 'معتمدة ومغلقة', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'confidential', label: 'سرية (حماية طفل)', badgeColor: 'bg-red-100 text-red-900 border-red-300' },
];

export const OpenCasesPage: React.FC<OpenCasesPageProps> = ({
  currentUser,
  onOpenIntake,
  onOpenStudentProfile,
  onOpenForms,
  onShowToast,
}) => {
  const [cases, setCases] = useState<BehavioralCase[]>(() => getBehavioralCases());
  const [selectedStatus, setSelectedStatus] = useState<CaseWorkflowStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedCaseForDetails, setSelectedCaseForDetails] = useState<BehavioralCase | null>(null);

  const refreshCases = () => {
    setCases(getBehavioralCases());
  };

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (selectedStatus !== 'all' && c.status !== selectedStatus) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.trim().toLowerCase();
      return (
        c.studentName.toLowerCase().includes(q) ||
        c.studentNumber.includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.caseNumber.toLowerCase().includes(q)
      );
    });
  }, [cases, selectedStatus, searchTerm]);

  const handleStatusChange = (caseId: string, newStatus: CaseWorkflowStatus) => {
    updateBehavioralCaseStatus(caseId, newStatus, `تغيير الحالة يدوياً إلى ${newStatus}`, currentUser?.name);
    refreshCases();
    onShowToast('تم تحديث حالة الملف بنجاح', 'success');
  };

  const handleQuickSign = (caseItem: BehavioralCase, role: 'student' | 'counselor' | 'parent' | 'principal') => {
    const today = getUaeTodayDateString();
    if (!caseItem.signatures) caseItem.signatures = {};
    caseItem.signatures[role] = { signed: true, date: today, name: currentUser?.name };

    // Advance status if appropriate
    if (role === 'student' && caseItem.status === 'awaiting_student_sig') {
      caseItem.status = 'awaiting_parent';
    } else if (role === 'parent' && caseItem.status === 'awaiting_parent') {
      caseItem.status = caseItem.smartAnalysis?.requiresBehaviorCommittee
        ? 'referred_to_committee'
        : 'approved_closed';
    }

    saveBehavioralCase(caseItem);
    refreshCases();
    onShowToast(`تم تسجيل اعتماد وتوقيع (${role === 'student' ? 'الطالب' : role === 'parent' ? 'ولي الأمر' : 'الإدارة'}) بنجاح`, 'success');
  };

  const handleGenerateBundle = (caseItem: BehavioralCase) => {
    if (!currentUser) return;
    createCaseBundle(caseItem, currentUser);
    refreshCases();
    onShowToast('تم إنشاء حزمة النماذج الرسمية (6 و 7 و 8 و 10) وتحديث الحالة بنجاح!', 'success');
  };

  const handleDeleteCase = (caseId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الحالة وسجلاتها؟')) {
      deleteBehavioralCase(caseId);
      refreshCases();
      if (selectedCaseForDetails?.id === caseId) {
        setSelectedCaseForDetails(null);
      }
      onShowToast('تم حذف الحالة بنجاح', 'info');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#0f1a2a] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/20 dark:text-[#52c2cf]">
                <FolderKanban className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                إدارة ومتابعة الحالات السلوكية المفتوحة
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              متابعة تسلسل سير الحالات، التوقيعات الرقمية، التوثيق الرسمي، وحزم الإجراءات.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              id="btn-open-intake-from-cases"
              onClick={onOpenIntake}
              className="px-4 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>تسجيل حالة جديدة</span>
            </button>

            <button
              type="button"
              onClick={refreshCases}
              title="تحديث البيانات"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_COLUMNS.map((col) => {
              const count =
                col.id === 'all'
                  ? cases.length
                  : cases.filter((c) => c.status === col.id).length;
              const isSelected = selectedStatus === col.id;

              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedStatus(col.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0C2340] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{col.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="w-full md:w-64 relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث برقم الحالة أو اسم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-[#006D77]"
            />
          </div>
        </div>
      </div>

      {/* CASES CARDS GRID */}
      {filteredCases.length === 0 ? (
        <div className="bg-white dark:bg-[#0f1a2a] p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">لا توجد حالات مسجلة في هذا التبويب</h3>
          <p className="text-xs text-slate-500">يمكنك تسجيل حالة جديدة في أي وقت من خلال زر «تسجيل حالة جديدة».</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((c) => {
            const isConfidential = c.confidentiality === 'restricted_child_protection';
            const hasBundle = Boolean(c.associatedFormIds?.model6ReportId);

            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-[#0f1a2a] rounded-2xl border transition-all flex flex-col justify-between p-5 space-y-4 hover:shadow-md ${
                  isConfidential
                    ? 'border-red-300 dark:border-red-900/60 bg-red-50/10'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      {c.caseNumber}
                    </span>

                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        STATUS_COLUMNS.find((col) => col.id === c.status)?.badgeColor || 'bg-slate-100'
                      }`}
                    >
                      {STATUS_COLUMNS.find((col) => col.id === c.status)?.label || c.status}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                    {c.title}
                  </h4>

                  {/* Student Tag */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                    <button
                      type="button"
                      onClick={() => onOpenStudentProfile(c.studentId)}
                      className="font-bold text-[#006D77] hover:underline flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{c.studentName}</span>
                    </button>
                    <span className="text-slate-400 text-[11px]">
                      الصف {c.grade} ({c.section})
                    </span>
                  </div>
                </div>

                {/* Smart Info Snippet */}
                <div className="text-xs space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>تاريخ الواقعة: {c.incidentDate}</span>
                    {c.deductedMarks ? (
                      <span className="text-rose-600 font-bold">-{c.deductedMarks} درجات</span>
                    ) : (
                      <span className="text-slate-400">بدون حسم</span>
                    )}
                  </div>

                  {c.smartAnalysis?.suggestedAction && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50/60 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {c.smartAnalysis.suggestedAction}
                    </p>
                  )}
                </div>

                {/* Signatures Status */}
                <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                  <span className="text-[10px] text-slate-400 block font-bold">موقف التوقيعات الرقمية:</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                    <div
                      className={`p-1.5 rounded-md text-center font-bold border ${
                        c.signatures?.student?.signed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {c.signatures?.student?.signed ? '✓ الطالب' : 'بانتظار الطالب'}
                    </div>

                    <div
                      className={`p-1.5 rounded-md text-center font-bold border ${
                        c.signatures?.counselor?.signed
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {c.signatures?.counselor?.signed ? '✓ المرشد' : 'بانتظار المرشد'}
                    </div>

                    <div
                      className={`p-1.5 rounded-md text-center font-bold border ${
                        c.signatures?.parent?.signed
                          ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {c.signatures?.parent?.signed ? '✓ ولي الأمر' : 'بانتظار الولي'}
                    </div>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {!c.signatures?.student?.signed && (
                      <button
                        type="button"
                        onClick={() => handleQuickSign(c, 'student')}
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[11px] font-bold rounded-lg transition-colors text-center border border-blue-200"
                      >
                        توقيع الطالب بالعلم
                      </button>
                    )}

                    {!c.signatures?.parent?.signed && (
                      <button
                        type="button"
                        onClick={() => handleQuickSign(c, 'parent')}
                        className="flex-1 py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold rounded-lg transition-colors text-center border border-purple-200"
                      >
                        اعتماد توقيع الولي
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {!hasBundle ? (
                      <button
                        type="button"
                        onClick={() => handleGenerateBundle(c)}
                        className="text-[11px] font-bold text-[#006D77] hover:underline flex items-center gap-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>توليد حزمة النماذج</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>الحزمة مولدة ومربوطة</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c.id, e.target.value as CaseWorkflowStatus)}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-1 border border-slate-200 dark:border-slate-700 font-bold"
                      >
                        <option value="draft">مسودة</option>
                        <option value="awaiting_student_sig">بانتظار الطالب</option>
                        <option value="awaiting_parent">بانتظار ولي الأمر</option>
                        <option value="referred_to_committee">محالة للجنة</option>
                        <option value="approved_closed">معتمدة ومغلقة</option>
                        <option value="confidential">سرية (حماية طفل)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleDeleteCase(c.id)}
                        title="حذف الحالة"
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
