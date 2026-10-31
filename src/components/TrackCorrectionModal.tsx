import React, { useState, useMemo } from 'react';
import {
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  History,
  CheckCircle2,
  Filter,
  Search,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { Student, AcademicTrack, GradeLevel, SectionName, TrackAuditLog } from '../types';
import { getTrackAuditLogs } from '../storage';
import {
  ACADEMY_STANDARD_GRADES,
  compareGrades,
  compareSections,
  getGradeDisplayLabel,
} from '../hooks/useAcademicFiltering';

interface TrackCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onUpdateStudentsTrack: (
    updates: Array<{ studentId: string; newTrack: AcademicTrack; reason?: string }>,
    changedBy: string
  ) => Promise<{ updatedCount: number; logs: TrackAuditLog[] }>;
  currentUserName?: string;
  isViewer?: boolean;
}

export const TrackCorrectionModal: React.FC<TrackCorrectionModalProps> = ({
  isOpen,
  onClose,
  students,
  onUpdateStudentsTrack,
  currentUserName = 'المرشد الأكاديمي',
  isViewer = false,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'all' | 'audit'>('review');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected students for bulk update: Set of student IDs
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Proposed track per student ID (studentId -> proposedTrack)
  const [proposedTracks, setProposedTracks] = useState<Record<string, AcademicTrack>>({});

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<TrackAuditLog[]>(() => getTrackAuditLogs());

  // Confirmation dialog state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const dynamicGrades = useMemo(() => {
    const gSet = new Set<string>();
    students.forEach((s) => {
      if (s.grade) gSet.add(s.grade);
    });
    return gSet.size > 0 ? Array.from(gSet).sort(compareGrades) : [...ACADEMY_STANDARD_GRADES];
  }, [students]);

  const dynamicSections = useMemo(() => {
    const sSet = new Set<string>();
    students.forEach((s) => {
      if (selectedGrade === 'all' || s.grade === selectedGrade) {
        if (s.section) sSet.add(String(s.section));
      }
    });
    return Array.from(sSet).sort(compareSections);
  }, [students, selectedGrade]);

  if (!isOpen) return null;

  // Filter students based on active tab and filter controls
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Tab filter
      if (activeTab === 'review' && s.track !== 'يحتاج مراجعة') {
        return false;
      }

      // Grade filter
      if (selectedGrade !== 'all' && s.grade !== selectedGrade) {
        return false;
      }

      // Section filter
      if (selectedSection !== 'all' && String(s.section) !== selectedSection) {
        return false;
      }

      // Track filter (only applicable when in 'all' tab)
      if (activeTab === 'all' && selectedTrackFilter !== 'all' && (s.track || 'عام') !== selectedTrackFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchNum = String(s.studentNumber || '').toLowerCase().includes(q);
        const matchNational = s.nationalId && s.nationalId.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchNational) return false;
      }

      return true;
    });
  }, [students, activeTab, selectedGrade, selectedSection, selectedTrackFilter, searchQuery]);

  // Count students requiring review
  const needsReviewCount = useMemo(() => {
    return students.filter((s) => s.track === 'يحتاج مراجعة').length;
  }, [students]);

  // Handle single student select toggle
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Handle select all in filtered list
  const isAllFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Deselect all filtered
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.id));
        return next;
      });
    }
  };

  // Change proposed track for a specific student
  const handleProposedTrackChange = (studentId: string, track: AcademicTrack) => {
    setProposedTracks((prev) => ({
      ...prev,
      [studentId]: track,
    }));
  };

  // Bulk set proposed track for currently selected students
  const handleBulkSetProposedTrack = (track: AcademicTrack) => {
    setProposedTracks((prev) => {
      const next = { ...prev };
      selectedStudentIds.forEach((id) => {
        next[id] = track;
      });
      return next;
    });
  };

  // Calculate pending updates for confirmation
  const pendingUpdates = useMemo(() => {
    const list: Array<{ student: Student; newTrack: AcademicTrack }> = [];
    selectedStudentIds.forEach((id) => {
      const student = students.find((s) => s.id === id);
      if (!student) return;
      const proposed = proposedTracks[id] || (student.track === 'يحتاج مراجعة' ? 'عام' : student.track || 'عام');
      if (proposed !== student.track) {
        list.push({ student, newTrack: proposed });
      }
    });
    return list;
  }, [selectedStudentIds, students, proposedTracks]);

  // Execute the update
  const handleExecuteUpdate = async () => {
    if (pendingUpdates.length === 0) return;

    try {
      setIsSaving(true);
      const updates = pendingUpdates.map((item) => ({
        studentId: item.student.id,
        newTrack: item.newTrack,
        reason: 'تصحيح المسار الأكاديمي عبر أداة المراجعة والتدقيق',
      }));

      const res = await onUpdateStudentsTrack(updates, currentUserName);

      // Refresh local audit logs
      setAuditLogs(getTrackAuditLogs());

      // Clear selection
      setSelectedStudentIds(new Set());
      setShowConfirmModal(false);
      setSaveSuccessMessage(`تم تحديث مسار (${res.updatedCount}) طالب بنجاح مع توثيق العملية في سجل التدقيق.`);

      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch {
      // handled
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white dark:bg-[#0f1f35] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#0C2340] to-[#163761] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#D4AF37] border border-white/10 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">
                  أداة مراجعة وتصحيح المسار الأكاديمي
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold font-mono">
                  معيار Grade + Track + Section
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                معاينة وتصحيح مسار الطلبة دون مساس بأرقامهم الطلابية أو سجلات الغياب والتأخير والمخالفات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Notification / Banner if students need review */}
        {needsReviewCount > 0 && activeTab !== 'review' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 px-5 py-2.5 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                تنبيه: يوجد <strong className="text-amber-800 dark:text-amber-300">{needsReviewCount}</strong> طالب بمسار غير محدد (يحتاج مراجعة) لعدم وجود مؤشر مسار صريح في الملف الأصلي.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('review')}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              عرض للمراجعة
            </button>
          </div>
        )}

        {/* Success Alert Banner */}
        {saveSuccessMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 px-5 py-3 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* Tab Switcher & Filters */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setActiveTab('review')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'review'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>الطلبة بحاجة لمراجعة ({needsReviewCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-700 text-[#006D77] dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>جميع طلبة المدرسة ({students.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>سجل التدقيق والتعديلات ({auditLogs.length})</span>
              </button>
            </div>

            {/* Quick bulk action for selected students */}
            {activeTab !== 'audit' && selectedStudentIds.size > 0 && !isViewer && (
              <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-2xl">
                <span className="text-xs font-bold text-[#006D77] dark:text-teal-300">
                  تطبيق على المحددين ({selectedStudentIds.size}):
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkSetProposedTrack('عام')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  📘 تعيين عام
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetProposedTrack('متقدم')}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  🔬 تعيين متقدم
                </button>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          {activeTab !== 'audit' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Search */}
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم الطلابي..."
                  className="w-full pr-9 pl-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#006D77] outline-hidden"
                />
              </div>

              {/* Grade */}
              <div>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    setSelectedGrade(e.target.value);
                    setSelectedSection('all');
                  }}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">جميع الصفوف</option>
                  {dynamicGrades.map((g) => (
                    <option key={g} value={g}>
                      {getGradeDisplayLabel(g)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="all">جميع الشعب</option>
                  {dynamicSections.map((sec) => (
                    <option key={sec} value={sec}>
                      شعبة {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Track filter (only for all tab) */}
              <div>
                {activeTab === 'all' ? (
                  <select
                    value={selectedTrackFilter}
                    onChange={(e) => setSelectedTrackFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="all">كافة المسارات</option>
                    <option value="عام">المسار العام</option>
                    <option value="متقدم">المسار المتقدم</option>
                    <option value="يحتاج مراجعة">يحتاج مراجعة</option>
                  </select>
                ) : (
                  <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <span>قائمة التدقيق اليدوي</span>
                    <span className="font-mono">{filteredStudents.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* TAB 1 & 2: Preview & Correction Table */}
          {activeTab !== 'audit' && (
            <div className="space-y-3">
              {filteredStudents.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {activeTab === 'review'
                      ? 'رائع! لا يوجد طلبة بحاجة لمراجعة المسار حالياً.'
                      : 'لا توجد نتائج مطابقة لشروط البحث.'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeTab === 'review'
                      ? 'جميع الطلبة مصنفون بمسارات مؤكدة (عام / متقدم).'
                      : 'يرجى تغيير خيارات الفلترة أو مسح حقل البحث.'}
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="text-slate-500 hover:text-[#006D77] cursor-pointer"
                            title="تحديد الكل"
                          >
                            {isAllFilteredSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#006D77]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                        <th className="p-3">الرقم الطلابي</th>
                        <th className="p-3">اسم الطالب</th>
                        <th className="p-3">الصف</th>
                        <th className="p-3">الشعبة</th>
                        <th className="p-3">المسار الحالي</th>
                        <th className="p-3">المسار المقترح الجديد</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 whitespace-nowrap">
                      {filteredStudents.map((st) => {
                        const isSelected = selectedStudentIds.has(st.id);
                        const proposed =
                          proposedTracks[st.id] ||
                          (st.track === 'يحتاج مراجعة' ? 'عام' : st.track || 'عام');
                        const isChanged = proposed !== st.track;

                        return (
                          <tr
                            key={st.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-teal-50/50 dark:bg-teal-950/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleStudent(st.id)}
                                className="cursor-pointer text-slate-400 hover:text-[#006D77]"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#006D77]" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                              {st.studentNumber}
                            </td>

                            <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                              <div>
                                <span>{st.fullName}</span>
                                {st.nameEn && (
                                  <span className="text-[10px] text-slate-400 block font-sans">
                                    {st.nameEn}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[11px]">
                                {st.grade}
                              </span>
                            </td>

                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-mono text-[11px]">
                                شعبة {st.section}
                              </span>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${
                                  st.track === 'متقدم'
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                    : st.track === 'يحتاج مراجعة'
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                    : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                }`}
                              >
                                {st.track === 'متقدم'
                                  ? '🔬 متقدم'
                                  : st.track === 'يحتاج مراجعة'
                                  ? '⚠️ يحتاج مراجعة'
                                  : '📘 عام'}
                              </span>
                            </td>

                            <td className="p-3">
                              <select
                                value={proposed}
                                onChange={(e) =>
                                  handleProposedTrackChange(st.id, e.target.value as AcademicTrack)
                                }
                                disabled={isViewer}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                                  isChanged
                                    ? 'border-[#006D77] bg-teal-50/80 dark:bg-teal-950/50 text-[#006D77] dark:text-teal-200 ring-2 ring-[#006D77]/20 font-black'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <option value="عام">📘 المسار العام</option>
                                <option value="متقدم">🔬 المسار المتقدم</option>
                                <option value="يحتاج مراجعة">⚠️ مسار غير محدد (مراجعة)</option>
                              </select>
                            </td>

                            <td className="p-3 text-center">
                              {isChanged ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
                                  <span>تعديل مقترح</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">مطابق</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Audit Logs View */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    سجل تدقيق تعديلات المسارات (Audit Trail):
                  </h4>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {auditLogs.length} عملية مسجلة
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500">لا توجد عمليات تعديل مسار مسجلة بعد.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 whitespace-nowrap">
                      <tr>
                        <th className="p-3">التاريخ والوقت</th>
                        <th className="p-3">الرقم الطلابي</th>
                        <th className="p-3">اسم الطالب</th>
                        <th className="p-3">الصف والشعبة</th>
                        <th className="p-3">المسار القديم ← الجديد</th>
                        <th className="p-3">القائم بالتعديل</th>
                        <th className="p-3">السبب / الملاحظة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 whitespace-nowrap">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {new Date(log.timestamp).toLocaleString('ar-AE')}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {log.studentNumber}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                            {log.studentName}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            الصف {log.grade} (شعبة {log.section})
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {log.oldTrack}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 rotate-180" />
                              <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-[#006D77] dark:text-teal-300">
                                {log.newTrack}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                            {log.changedBy}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={log.reason}>
                            {log.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {activeTab !== 'audit' && (
              <span>
                تم تحديد <strong className="text-[#006D77] font-bold">{selectedStudentIds.size}</strong> طالب •{' '}
                <strong className="text-amber-700 font-bold">{pendingUpdates.length}</strong> طالب مقترح تعديل مسارهم
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            {activeTab !== 'audit' && !isViewer && (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={pendingUpdates.length === 0 || isSaving}
                className="px-5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  تأكيد تحديث المسار ({pendingUpdates.length} طالب)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL POPUP */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          dir="rtl"
        >
          <div className="bg-white dark:bg-[#0f1f35] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 text-right">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] dark:text-teal-300">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  تأكيد تحديث مسار ({pendingUpdates.length}) طالب
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  مراجعة نهائية قبل الحفظ والتعديل
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
              <p className="font-bold">يرجى التأكيد على الآتي:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                <li>
                  سيتم تعديل حقل المسار فقط في السجلات الحالية للطلبة باستخدام الأرقام الطلابية نفسها دون حذف أو تكرار.
                </li>
                <li>
                  تبقى جميع سجلات الغياب، التأخير الصباحي، المخالفات، والنماذج المرتبطة كما هي دون أي مساس.
                </li>
                <li>
                  سيتم توثيق هذه العملية في سجل التدقيق (Audit Log) فوراً باسم القائم بالتعديل ({currentUserName}).
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteUpdate}
                disabled={isSaving}
                className="px-5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <span>جاري الحفظ والتدقيق...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد نهائي وحفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
