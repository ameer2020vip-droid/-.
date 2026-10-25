import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Printer,
  Edit,
  Eye,
  Archive,
  Lock,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  Shield,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  X,
  Sparkles,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  StudentCaseRecord,
  CounselingSessionRecord,
  Student,
  AppUser,
} from '../../types';
import {
  fetchCounselingSessions,
  createCounselingSession,
  updateCounselingSession,
  archiveCounselingSession,
  logCounselingSessionAudit,
} from '../../firebase/firestoreService';
import {
  getCounselingSessionsLocal,
  saveCounselingSessionLocal,
  archiveCounselingSessionLocal,
} from '../../storage';
import { IndividualCounselingFormModal } from './IndividualCounselingFormModal';
import { PrintableIndividualCounselingSheet } from './PrintableIndividualCounselingSheet';
import { CounselingSessionDetailsModal } from './CounselingSessionDetailsModal';
import { ConfirmModal } from '../../components/ConfirmModal';

interface IndividualCounselingTabProps {
  caseRecord: StudentCaseRecord;
  student?: Student;
  currentUser: AppUser;
  onNavigateToTab?: (tabKey: string) => void;
}

type SortField =
  | 'sessionNumber'
  | 'sessionDate'
  | 'sessionType'
  | 'counselorName'
  | 'priorityLevel'
  | 'nextFollowUpAt'
  | 'formStatus';
type SortOrder = 'asc' | 'desc';

export const IndividualCounselingTab: React.FC<IndividualCounselingTabProps> = ({
  caseRecord,
  student,
  currentUser,
  onNavigateToTab,
}) => {
  const [sessions, setSessions] = useState<CounselingSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View mode: 'table' (default) or 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filters required: Search, Date, Counselor, Priority Level
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCounselor, setFilterCounselor] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active'); // active, all, draft, approved, archived
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('sessionDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<CounselingSessionRecord | null>(null);

  // View Modal
  const [sessionForView, setSessionForView] = useState<CounselingSessionRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Print Modal
  const [sessionForPrint, setSessionForPrint] = useState<CounselingSessionRecord | null>(null);

  // Archive Modal
  const [sessionToArchive, setSessionToArchive] = useState<CounselingSessionRecord | null>(null);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  // Load sessions on mount or caseRecord change
  const loadSessions = async () => {
    setIsLoading(true);
    try {
      // 1. Load from local storage first for instant render
      const local = getCounselingSessionsLocal(caseRecord.id);
      if (local && local.length > 0) {
        setSessions(local);
      }

      // 2. Fetch from Firestore subcollection: studentCases/{caseId}/counselingSessions
      const remote = await fetchCounselingSessions(caseRecord.id);
      if (remote && remote.length > 0) {
        setSessions(remote);
        // Sync to local
        remote.forEach((s) => saveCounselingSessionLocal(s));
      }
    } catch {
      // Fallback already handled
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [caseRecord.id]);

  // Unique list of counselors for the filter dropdown
  const uniqueCounselors = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.counselorName && s.counselorName.trim()) {
        set.add(s.counselorName.trim());
      }
    });
    if (currentUser?.displayName) {
      set.add(currentUser.displayName.trim());
    }
    return Array.from(set);
  }, [sessions, currentUser]);

  // Handle save from modal
  const handleSaveSession = async (
    sessionData: CounselingSessionRecord,
    revisionReason?: string
  ) => {
    const isExisting = sessions.some((s) => s.id === sessionData.id);

    if (isExisting) {
      // Update
      await updateCounselingSession(
        caseRecord.id,
        sessionData.id,
        sessionData,
        currentUser,
        revisionReason
      );
      saveCounselingSessionLocal(sessionData);
      setSessions((prev) => prev.map((s) => (s.id === sessionData.id ? sessionData : s)));
    } else {
      // Create new
      const created = await createCounselingSession(caseRecord.id, sessionData, currentUser);
      saveCounselingSessionLocal(created);
      setSessions((prev) => [created, ...prev]);
    }
  };

  // Handle archive
  const handleConfirmArchive = async () => {
    if (!sessionToArchive) return;
    try {
      await archiveCounselingSession(
        caseRecord.id,
        sessionToArchive.id,
        currentUser,
        sessionToArchive.sessionNumber,
        caseRecord.schoolId
      );
      archiveCounselingSessionLocal(sessionToArchive.id);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionToArchive.id
            ? { ...s, formStatus: 'مؤرشف', isArchived: true }
            : s
        )
      );
    } finally {
      setIsArchiveConfirmOpen(false);
      setSessionToArchive(null);
    }
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Priority ranking for sorting
  const priorityRank = (priority: string) => {
    switch (priority) {
      case 'عاجل':
        return 4;
      case 'مرتفع':
        return 3;
      case 'متوسط':
        return 2;
      case 'منخفض':
        return 1;
      default:
        return 0;
    }
  };

  // Filtered and Sorted sessions
  const filteredAndSortedSessions = useMemo(() => {
    const filtered = sessions.filter((s) => {
      // Status filter
      if (filterStatus === 'active' && s.formStatus === 'مؤرشف') return false;
      if (filterStatus === 'archived' && s.formStatus !== 'مؤرشف') return false;
      if (filterStatus === 'draft' && s.formStatus !== 'مسودة') return false;
      if (filterStatus === 'approved' && s.formStatus !== 'معتمد') return false;

      // Type filter
      if (filterType !== 'all' && s.sessionType !== filterType) return false;

      // Priority filter
      if (filterPriority !== 'all' && s.priorityLevel !== filterPriority) return false;

      // Counselor filter
      if (filterCounselor !== 'all' && s.counselorName !== filterCounselor) return false;

      // Date range filter
      if (dateFrom && s.sessionDate < dateFrom) return false;
      if (dateTo && s.sessionDate > dateTo) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = (s.sessionTitle || '').toLowerCase().includes(query);
        const matchNumber = (s.sessionNumber || '').toLowerCase().includes(query);
        const matchCounselor = (s.counselorName || '').toLowerCase().includes(query);
        const matchReasons = (s.sessionReasons || '').toLowerCase().includes(query);
        const matchOutcome = (s.sessionOutcome || '').toLowerCase().includes(query);
        const matchAreas = (s.counselingAreas || []).some((a) => a.toLowerCase().includes(query));
        const matchFollowUp = (s.nextFollowUpAt || '').toLowerCase().includes(query);
        if (
          !matchTitle &&
          !matchNumber &&
          !matchCounselor &&
          !matchReasons &&
          !matchOutcome &&
          !matchAreas &&
          !matchFollowUp
        ) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'sessionNumber') {
        comparison = (a.sessionNumber || '').localeCompare(b.sessionNumber || '', undefined, {
          numeric: true,
        });
      } else if (sortField === 'sessionDate') {
        comparison = (a.sessionDate || '').localeCompare(b.sessionDate || '');
      } else if (sortField === 'sessionType') {
        comparison = (a.sessionType || '').localeCompare(b.sessionType || '');
      } else if (sortField === 'counselorName') {
        comparison = (a.counselorName || '').localeCompare(b.counselorName || '');
      } else if (sortField === 'priorityLevel') {
        comparison = priorityRank(a.priorityLevel) - priorityRank(b.priorityLevel);
      } else if (sortField === 'nextFollowUpAt') {
        comparison = (a.nextFollowUpAt || '').localeCompare(b.nextFollowUpAt || '');
      } else if (sortField === 'formStatus') {
        comparison = (a.formStatus || '').localeCompare(b.formStatus || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    sessions,
    filterStatus,
    filterType,
    filterPriority,
    filterCounselor,
    dateFrom,
    dateTo,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  // Statistics
  const totalCount = sessions.length;
  const approvedCount = sessions.filter((s) => s.formStatus === 'معتمد').length;
  const urgentCount = sessions.filter((s) => s.priorityLevel === 'عاجل' || s.priorityLevel === 'مرتفع').length;
  const pendingFollowUpCount = sessions.filter((s) => Boolean(s.nextFollowUpAt)).length;

  const hasActiveFilters =
    searchQuery !== '' ||
    filterCounselor !== 'all' ||
    filterPriority !== 'all' ||
    filterType !== 'all' ||
    filterStatus !== 'active' ||
    dateFrom !== '' ||
    dateTo !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCounselor('all');
    setFilterPriority('all');
    setFilterType('all');
    setFilterStatus('active');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* If Print Sheet is opened */}
      {sessionForPrint && (
        <PrintableIndividualCounselingSheet
          caseRecord={caseRecord}
          session={sessionForPrint}
          student={student}
          onClose={() => setSessionForPrint(null)}
        />
      )}

      {/* Details View Modal */}
      {isViewModalOpen && sessionForView && (
        <CounselingSessionDetailsModal
          isOpen={isViewModalOpen}
          session={sessionForView}
          caseRecord={caseRecord}
          student={student}
          onClose={() => {
            setIsViewModalOpen(false);
            setSessionForView(null);
          }}
          onEdit={(session) => {
            setIsViewModalOpen(false);
            setSessionForView(null);
            setSelectedSessionForEdit(session);
            setIsFormModalOpen(true);
          }}
          onPrint={(session) => {
            logCounselingSessionAudit(
              caseRecord.schoolId,
              caseRecord.id,
              session.id,
              'print',
              currentUser,
              `معاينة طباعة جلسة الإرشاد الفردي (${session.sessionNumber})`
            );
            setSessionForPrint(session);
          }}
        />
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>جلسات الإرشاد الفردي ودراسة الحالة المصغرة</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
                  {filteredAndSortedSessions.length} جلسة
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل المتابعة والتدخلات الإرشادية لملف الحالة #{caseRecord.caseNumber} للطالب {caseRecord.studentName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Toggle Table / Cards */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="عرض الجدول التفاعلي"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title="عرض البطاقات التفصيلية"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>بطاقات</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadSessions}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedSessionForEdit(null);
              setIsFormModalOpen(true);
            }}
            className="flex-1 md:flex-none px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة جلسة إرشاد فردي</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">إجمالي الجلسات</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">الجلسات المعتمدة</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{approvedCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">عالية الأولوية / عاجلة</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">{urgentCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">متابعات مجدولة</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">{pendingFollowUpCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar: Supporting Search, Date, Counselor, Priority Level */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث برقم الجلسة، العنوان، الأسباب، النتيجة، أو المجال..."
              className="w-full pr-9 pl-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Counselor (المرشد) */}
          <div>
            <select
              value={filterCounselor}
              onChange={(e) => setFilterCounselor(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
            >
              <option value="all">كل المرشدين</option>
              {uniqueCounselors.map((cName) => (
                <option key={cName} value={cName}>
                  المرشد: {cName}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Priority Level (مستوى الأولوية) */}
          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium"
            >
              <option value="all">كل مستويات الأولوية</option>
              <option value="عاجل">عاجل</option>
              <option value="مرتفع">مرتفع</option>
              <option value="متوسط">متوسط</option>
              <option value="منخفض">منخفض</option>
            </select>
          </div>
        </div>

        {/* Second row: Date Range (التاريخ) and additional filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs items-center">
          {/* Date from */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">من تاريخ:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
            />
          </div>

          {/* Date to */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">إلى تاريخ:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
            />
          </div>

          {/* Type filter */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">نوع الجلسة:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            >
              <option value="all">كل الأنواع</option>
              <option value="جلسة أولى">جلسة أولى</option>
              <option value="جلسة متابعة">جلسة متابعة</option>
              <option value="جلسة طارئة">جلسة طارئة</option>
              <option value="جلسة ختامية">جلسة ختامية</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-semibold block">الحالة:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            >
              <option value="active">الجلسات النشطة</option>
              <option value="approved">معتمدة فقط</option>
              <option value="draft">مسودات فقط</option>
              <option value="archived">مؤرشفة فقط</option>
              <option value="all">جميع الحالات</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="pt-4 flex justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Interactive Table (or Cards) */}
      {filteredAndSortedSessions.length > 0 ? (
        viewMode === 'table' ? (
          /* ========================================================================= */
          /* INTERACTIVE SESSIONS TABLE                                                */
          /* Columns: رقم الجلسة، التاريخ، النوع، المجال، المرشد، الأولوية، النتيجة، موعد المتابعة، الحالة، العمليات */
          /* ========================================================================= */
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 select-none font-bold">
                    {/* 1. رقم الجلسة */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('sessionNumber')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>رقم الجلسة</span>
                        {sortField === 'sessionNumber' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 2. التاريخ */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('sessionDate')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>التاريخ</span>
                        {sortField === 'sessionDate' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 3. النوع */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('sessionType')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>النوع</span>
                        {sortField === 'sessionType' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 4. المجال */}
                    <th className="py-3.5 px-3 whitespace-nowrap">
                      <span>المجال</span>
                    </th>

                    {/* 5. المرشد */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('counselorName')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>المرشد</span>
                        {sortField === 'counselorName' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 6. الأولوية */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('priorityLevel')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>الأولوية</span>
                        {sortField === 'priorityLevel' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 7. النتيجة */}
                    <th className="py-3.5 px-3 min-w-[170px]">
                      <span>النتيجة والخلاصة</span>
                    </th>

                    {/* 8. موعد المتابعة */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('nextFollowUpAt')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>موعد المتابعة</span>
                        {sortField === 'nextFollowUpAt' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 9. الحالة */}
                    <th
                      className="py-3.5 px-3 whitespace-nowrap cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => handleSort('formStatus')}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>الحالة</span>
                        {sortField === 'formStatus' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 10. العمليات */}
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span>العمليات</span>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/80">
                  {filteredAndSortedSessions.map((session) => {
                    const isTopSecret = session.confidentialityLevel === 'سري جدًا';
                    const isApproved = session.formStatus === 'معتمد';
                    const isArchived = session.formStatus === 'مؤرشف';

                    return (
                      <tr
                        key={session.id}
                        className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-750/50 ${
                          isTopSecret
                            ? 'bg-rose-50/20 dark:bg-rose-950/10'
                            : isArchived
                            ? 'opacity-70 bg-slate-50/40 dark:bg-slate-900/30'
                            : ''
                        }`}
                      >
                        {/* 1. رقم الجلسة */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800/60">
                              {session.sessionNumber}
                            </span>
                            {isTopSecret && (
                              <span title="سري جدًا">
                                <Lock className="w-3 h-3 text-rose-600" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. التاريخ */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                            {session.sessionDate}
                          </div>
                          {session.startTime && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {session.startTime} - {session.endTime}
                            </div>
                          )}
                        </td>

                        {/* 3. النوع */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              session.sessionType === 'جلسة طارئة'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : session.sessionType === 'جلسة أولى'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : session.sessionType === 'جلسة ختامية'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {session.sessionType}
                          </span>
                        </td>

                        {/* 4. المجال */}
                        <td className="py-3 px-3 max-w-[200px]">
                          {session.counselingAreas && session.counselingAreas.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              <span
                                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]"
                                title={session.counselingAreas.join('، ')}
                              >
                                {session.counselingAreas[0]}
                              </span>
                              {session.counselingAreas.length > 1 && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold"
                                  title={session.counselingAreas.slice(1).join('، ')}
                                >
                                  +{session.counselingAreas.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 5. المرشد */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {session.counselorName}
                            </span>
                          </div>
                        </td>

                        {/* 6. الأولوية */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold ${
                              session.priorityLevel === 'عاجل'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : session.priorityLevel === 'مرتفع'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : session.priorityLevel === 'متوسط'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {session.priorityLevel}
                          </span>
                        </td>

                        {/* 7. النتيجة */}
                        <td className="py-3 px-3 max-w-[220px]">
                          <p
                            className="text-slate-700 dark:text-slate-300 font-medium truncate text-xs"
                            title={session.sessionOutcome || session.sessionTitle}
                          >
                            {session.sessionOutcome || session.sessionTitle || '-'}
                          </p>
                        </td>

                        {/* 8. موعد المتابعة */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {session.nextFollowUpAt ? (
                            <div className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-mono font-bold">
                              <Clock className="w-3 h-3 text-blue-500" />
                              <span>{session.nextFollowUpAt}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* 9. الحالة */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                              session.formStatus === 'معتمد'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : session.formStatus === 'مؤرشف'
                                ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {session.formStatus}
                          </span>
                        </td>

                        {/* 10. العمليات: (العرض، التعديل، الطباعة، الأرشفة) */}
                        <td className="py-3 px-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* زر العرض */}
                            <button
                              type="button"
                              onClick={() => {
                                logCounselingSessionAudit(
                                  caseRecord.schoolId,
                                  caseRecord.id,
                                  session.id,
                                  'view',
                                  currentUser,
                                  `عرض تفاصيل جلسة الإرشاد الفردي (${session.sessionNumber})`
                                );
                                setSessionForView(session);
                                setIsViewModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-teal-700 transition-colors"
                              title="عرض تفاصيل الجلسة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* زر التعديل */}
                            <button
                              type="button"
                              onClick={() => {
                                logCounselingSessionAudit(
                                  caseRecord.schoolId,
                                  caseRecord.id,
                                  session.id,
                                  'view',
                                  currentUser,
                                  `فتح وتعديل جلسة الإرشاد الفردي (${session.sessionNumber})`
                                );
                                setSelectedSessionForEdit(session);
                                setIsFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                              title={isApproved ? 'عرض / تعديل الجلسة' : 'تعديل المسودة'}
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* زر الطباعة */}
                            <button
                              type="button"
                              onClick={() => {
                                logCounselingSessionAudit(
                                  caseRecord.schoolId,
                                  caseRecord.id,
                                  session.id,
                                  'print',
                                  currentUser,
                                  `معاينة طباعة جلسة الإرشاد الفردي (${session.sessionNumber})`
                                );
                                setSessionForPrint(session);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              title="طباعة الاستمارة الرسمية (A4)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* زر الأرشفة */}
                            {!isArchived && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSessionToArchive(session);
                                  setIsArchiveConfirmOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                title="أرشفة الجلسة (حفظ آمن دون حذف)"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
              <div>
                إجمالي الجلسات المعروضة:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {filteredAndSortedSessions.length}
                </strong>{' '}
                من أصل {sessions.length} جلسة
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  معتمد ({approvedCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  عاجل / مرتفع ({urgentCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  متابعة ({pendingFollowUpCount})
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ALTERNATIVE CARDS VIEW                                                    */
          /* ========================================================================= */
          <div className="space-y-4">
            {filteredAndSortedSessions.map((session) => {
              const isTopSecret = session.confidentialityLevel === 'سري جدًا';
              const isApproved = session.formStatus === 'معتمد';
              const isArchived = session.formStatus === 'مؤرشف';

              return (
                <div
                  key={session.id}
                  className={`bg-white dark:bg-slate-800 rounded-2xl border p-4 sm:p-5 transition-all shadow-xs hover:shadow-md ${
                    isTopSecret
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20'
                      : isApproved
                      ? 'border-teal-200 dark:border-teal-900/40'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 font-bold text-xs">
                        {session.sessionNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                        {session.sessionType}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                          session.priorityLevel === 'عاجل'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : session.priorityLevel === 'مرتفع'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        أولوية {session.priorityLevel}
                      </span>
                      {isTopSecret && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold">
                          <Lock className="w-3 h-3" />
                          سري جدًا
                        </span>
                      )}
                    </div>

                    {/* Actions: View, Edit, Print, Archive */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSessionForView(session);
                          setIsViewModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1"
                        title="عرض تفاصيل الجلسة"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSessionForPrint(session);
                        }}
                        className="p-2 rounded-xl text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-bold flex items-center gap-1"
                        title="طباعة الاستمارة الرسمية (A4)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSessionForEdit(session);
                          setIsFormModalOpen(true);
                        }}
                        className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>{isApproved ? 'تعديل' : 'تعديل المسودة'}</span>
                      </button>

                      {!isArchived && (
                        <button
                          type="button"
                          onClick={() => {
                            setSessionToArchive(session);
                            setIsArchiveConfirmOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          title="أرشفة الجلسة"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 space-y-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {session.sessionTitle}
                    </h3>
                    {session.sessionReasons && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {session.sessionReasons}
                      </p>
                    )}
                    {session.sessionOutcome && (
                      <div className="text-xs bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg text-slate-700 dark:text-slate-300">
                        <strong className="text-teal-700 dark:text-teal-400">النتيجة: </strong>
                        {session.sessionOutcome}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {hasActiveFilters ? 'لا توجد جلسات تطابق معايير التصفية والبحث' : 'لا توجد جلسات إرشاد فردي مسجلة بعد'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'جرّب تعديل خيارات البحث أو التصفية حسب التاريخ أو المرشد أو الأولوية.'
              : 'ابدأ بتسجيل أول جلسة إرشاد فردي ودراسة حالة مصغرة لهذا الطالب لتوثيق الإجراءات والخدمات والخطط المتفق عليها.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                إلغاء التصفية
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedSessionForEdit(null);
                  setIsFormModalOpen(true);
                }}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل جلسة الآن</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Modal (Edit / Create) */}
      {isFormModalOpen && (
        <IndividualCounselingFormModal
          caseRecord={caseRecord}
          student={student}
          sessionToEdit={selectedSessionForEdit}
          existingSessionsCount={sessions.length}
          currentUser={currentUser}
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          onSave={handleSaveSession}
          onCreateTreatmentPlan={(session) => {
            setIsFormModalOpen(false);
            if (onNavigateToTab) {
              onNavigateToTab('treatment_plan');
            }
          }}
        />
      )}

      {/* Archive Confirm Modal */}
      {isArchiveConfirmOpen && (
        <ConfirmModal
          isOpen={isArchiveConfirmOpen}
          title="أرشفة جلسة الإرشاد الفردي"
          message={`هل أنت متأكد من أرشفة "${sessionToArchive?.sessionNumber}"؟ سيتم الاحتفاظ بالجلسة وسجلاتها في الأرشيف دون حذف نهائي حفاظاً على الأثر الإرشادي والسرية.`}
          confirmText="أرشفة الجلسة"
          cancelText="تراجع"
          onConfirm={handleConfirmArchive}
          onClose={() => {
            setIsArchiveConfirmOpen(false);
            setSessionToArchive(null);
          }}
        />
      )}
    </div>
  );
};
