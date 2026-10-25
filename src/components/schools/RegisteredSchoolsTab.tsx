import React, { useState, useEffect } from 'react';
import {
  School,
  Building2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  UserCheck,
  PauseCircle,
  PlayCircle,
  Archive,
  Users,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  MapPin,
  Calendar,
  Phone,
  Mail,
  GraduationCap,
  Layers,
} from 'lucide-react';
import {
  DetailedSchool,
  AppUser,
  SchoolStatus,
  EducationCycle,
  SchoolGender,
  SchoolSubscriptionStatus,
} from '../../types';
import {
  fetchSchoolsList,
  createSchoolRecord,
  updateSchoolRecord,
  archiveSchoolRecord,
  toggleSchoolStatus,
  assignSchoolPrincipal,
  fetchSchoolUsers,
  fetchSchoolCounts,
} from '../../firebase/schoolsService';
import { EMIRATES_LIST } from '../../firebase/registrationService';

interface RegisteredSchoolsTabProps {
  currentUser: AppUser;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onImpersonateSchool?: (school: DetailedSchool) => void;
  onRefreshStats?: () => void;
}

export const RegisteredSchoolsTab: React.FC<RegisteredSchoolsTabProps> = ({
  currentUser,
  onShowToast,
  onImpersonateSchool,
  onRefreshStats,
}) => {
  const [schools, setSchools] = useState<DetailedSchool[]>([]);
  const [countsMap, setCountsMap] = useState<Record<string, { usersCount: number; studentsCount: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmirate, setSelectedEmirate] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<SchoolStatus | 'all'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<DetailedSchool | null>(null);
  const [principalModalSchool, setPrincipalModalSchool] = useState<DetailedSchool | null>(null);
  const [usersModalSchool, setUsersModalSchool] = useState<DetailedSchool | null>(null);
  const [schoolUsersList, setSchoolUsersList] = useState<AppUser[]>([]);
  const [isLoadingSchoolUsers, setIsLoadingSchoolUsers] = useState(false);
  const [archiveModalSchool, setArchiveModalSchool] = useState<DetailedSchool | null>(null);
  const [toggleStatusSchool, setToggleStatusSchool] = useState<DetailedSchool | null>(null);

  // Form states
  const [schoolNumber, setSchoolNumber] = useState('');
  const [schoolNameArabic, setSchoolNameArabic] = useState('');
  const [schoolNameEnglish, setSchoolNameEnglish] = useState('');
  const [emirate, setEmirate] = useState('أبوظبي');
  const [region, setRegion] = useState('');
  const [schoolGender, setSchoolGender] = useState<SchoolGender>('boys');
  const [educationCycles, setEducationCycles] = useState<EducationCycle[]>(['cycle3']);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SchoolSubscriptionStatus>('active');
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [principalPhone, setPrincipalPhone] = useState('');
  const [selectedPrincipalUid, setSelectedPrincipalUid] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSchoolsList(currentUser, 'all');
      setSchools(data);

      // Async load counts for top schools
      const counts: Record<string, { usersCount: number; studentsCount: number }> = {};
      for (const s of data.slice(0, 20)) {
        try {
          const c = await fetchSchoolCounts(s.schoolId);
          counts[s.schoolId] = c;
        } catch {}
      }
      setCountsMap(counts);
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تحميل قائمة المدارس', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setSchoolNumber('');
    setSchoolNameArabic('');
    setSchoolNameEnglish('');
    setEmirate('أبوظبي');
    setRegion('');
    setSchoolGender('boys');
    setEducationCycles(['cycle3']);
    setSubscriptionStatus('active');
    setPrincipalName('');
    setPrincipalEmail('');
    setPrincipalPhone('');
    setIsAddModalOpen(true);
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolNumber.trim() || !schoolNameArabic.trim()) {
      onShowToast('يرجى ملء الرقم الوزاري واسم المدرسة بالعربية', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await createSchoolRecord(
        {
          schoolNumber: schoolNumber.trim(),
          schoolNameArabic: schoolNameArabic.trim(),
          schoolNameEnglish: schoolNameEnglish.trim() || undefined,
          emirate,
          region: region.trim() || undefined,
          schoolGender,
          educationCycles,
          subscriptionStatus,
          principalName: principalName.trim() || undefined,
          principalEmail: principalEmail.trim() || undefined,
          principalPhone: principalPhone.trim() || undefined,
          status: 'active',
        },
        currentUser
      );

      onShowToast(`تمت إضافة مدرسة ${schoolNameArabic} بنجاح`, 'success');
      setIsAddModalOpen(false);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء إضافة المدرسة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditModal = (s: DetailedSchool) => {
    setEditingSchool(s);
    setSchoolNumber(s.schoolNumber);
    setSchoolNameArabic(s.schoolNameArabic);
    setSchoolNameEnglish(s.schoolNameEnglish || '');
    setEmirate(s.emirate);
    setRegion(s.region || '');
    setSchoolGender(s.schoolGender);
    setEducationCycles(s.educationCycles);
    setSubscriptionStatus(s.subscriptionStatus || 'active');
    setActionReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    setIsProcessing(true);
    try {
      await updateSchoolRecord(
        editingSchool.schoolId,
        {
          schoolNumber: schoolNumber.trim(),
          schoolNameArabic: schoolNameArabic.trim(),
          schoolNameEnglish: schoolNameEnglish.trim() || undefined,
          emirate,
          region: region.trim() || undefined,
          schoolGender,
          educationCycles,
          subscriptionStatus,
        },
        currentUser,
        actionReason.trim() || undefined
      );

      onShowToast('تم تحديث بيانات المدرسة بنجاح', 'success');
      setEditingSchool(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تحديث بيانات المدرسة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPrincipalModal = async (s: DetailedSchool) => {
    setPrincipalModalSchool(s);
    setPrincipalName(s.principalName || '');
    setPrincipalEmail(s.principalEmail || '');
    setPrincipalPhone(s.principalPhone || '');
    setSelectedPrincipalUid('');

    // Load users of this school to offer quick pick
    try {
      const uList = await fetchSchoolUsers(s.schoolId);
      setSchoolUsersList(uList);
    } catch {}
  };

  const handleSavePrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalModalSchool) return;
    if (!principalName.trim()) {
      onShowToast('يرجى تحديد اسم مدير المدرسة', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await assignSchoolPrincipal(
        principalModalSchool.schoolId,
        {
          uid: selectedPrincipalUid,
          fullName: principalName.trim(),
          email: principalEmail.trim(),
          phone: principalPhone.trim(),
        },
        currentUser
      );

      onShowToast(`تم تعيين ${principalName} مديراً للمدرسة بنجاح`, 'success');
      setPrincipalModalSchool(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تعيين مدير المدرسة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openUsersModal = async (s: DetailedSchool) => {
    setUsersModalSchool(s);
    setIsLoadingSchoolUsers(true);
    try {
      const list = await fetchSchoolUsers(s.schoolId);
      setSchoolUsersList(list);
    } catch (err: any) {
      onShowToast('تعذر تحميل مستخدمي المدرسة', 'error');
    } finally {
      setIsLoadingSchoolUsers(false);
    }
  };

  const openToggleStatusModal = (s: DetailedSchool) => {
    setToggleStatusSchool(s);
    setActionReason('');
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleStatusSchool) return;
    const targetStatus = toggleStatusSchool.status === 'active' ? 'suspended' : 'active';
    setIsProcessing(true);
    try {
      await toggleSchoolStatus(
        toggleStatusSchool.schoolId,
        targetStatus,
        currentUser,
        actionReason.trim() || undefined
      );

      onShowToast(
        targetStatus === 'suspended'
          ? `تم تعليق حساب مدرسة ${toggleStatusSchool.schoolNameArabic}`
          : `تم إعادة تفعيل مدرسة ${toggleStatusSchool.schoolNameArabic}`,
        'success'
      );
      setToggleStatusSchool(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تغيير حالة المدرسة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const openArchiveModal = (s: DetailedSchool) => {
    setArchiveModalSchool(s);
    setActionReason('');
  };

  const handleConfirmArchive = async () => {
    if (!archiveModalSchool) return;
    if (!actionReason.trim()) {
      onShowToast('يرجى تحديد سبب أرشفة المدرسة لحماية البيانات', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await archiveSchoolRecord(archiveModalSchool.schoolId, currentUser, actionReason.trim());
      onShowToast(
        `تمت أرشفة مدرسة ${archiveModalSchool.schoolNameArabic} بنجاح دون حذف أي بيانات`,
        'info'
      );
      setArchiveModalSchool(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر أرشفة المدرسة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered List
  const filteredSchools = schools.filter((s) => {
    // Exclude 'pending' schools from registered list as they are handled in requests tab
    if (s.status === 'pending') return false;

    // Status filter
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;

    // Emirate filter
    if (selectedEmirate !== 'all' && s.emirate !== selectedEmirate) return false;

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.schoolNameArabic.toLowerCase().includes(q) ||
      s.schoolNumber.toLowerCase().includes(q) ||
      (s.schoolNameEnglish && s.schoolNameEnglish.toLowerCase().includes(q)) ||
      (s.principalName && s.principalName.toLowerCase().includes(q)) ||
      (s.region && s.region.toLowerCase().includes(q))
    );
  });

  const activeCount = schools.filter((s) => s.status === 'active').length;
  const suspendedCount = schools.filter((s) => s.status === 'suspended').length;
  const archivedCount = schools.filter((s) => s.status === 'archived').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <School className="w-5 h-5 text-[#006D77]" />
            <span>المدارس المسجلة في النظام</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-400 border border-teal-200 dark:border-teal-800">
              {filteredSchools.length} مدرسة
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة المدارس المعتمدة، تعيين المدراء، متابعة الاشتراكات، وإدارة صلاحيات العزل التام
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مدرسة جديدة</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#006D77]' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي المدارس</span>
          <p className="text-lg font-black text-slate-800 dark:text-white mt-1">{schools.filter((s) => s.status !== 'pending').length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">مدارس نشطة</span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">مدارس معلقة</span>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-1">{suspendedCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-bold text-slate-400">مدارس مؤرشفة</span>
          <p className="text-lg font-black text-slate-500 dark:text-slate-400 mt-1">{archivedCount}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المدرسة، الرقم الوزاري، أو اسم المدير..."
            className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedEmirate}
            onChange={(e) => setSelectedEmirate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
          >
            <option value="all">كل الإمارات</option>
            {EMIRATES_LIST.map((em) => (
              <option key={em} value={em}>
                {em}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشطة</option>
            <option value="suspended">معلقة</option>
            <option value="archived">مؤرشفة</option>
          </select>
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                <th className="py-3 px-4">المدرسة والرقم الوزاري</th>
                <th className="py-3 px-3">الإمارة والمنطقة</th>
                <th className="py-3 px-3">الحلقة والنوع</th>
                <th className="py-3 px-3">مدير المدرسة</th>
                <th className="py-3 px-3">المستخدمون / الطلبة</th>
                <th className="py-3 px-3">الاشتراك</th>
                <th className="py-3 px-3">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#006D77] mx-auto mb-2" />
                    <span>جاري تحميل المدارس...</span>
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    لا توجد مدارس مسجلة مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => {
                  const counts = countsMap[school.schoolId] || { usersCount: 0, studentsCount: 0 };
                  const isArchived = school.status === 'archived';
                  const isSuspended = school.status === 'suspended';

                  return (
                    <tr
                      key={school.schoolId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                        isArchived ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      {/* Name & Ministerial Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] dark:text-teal-400 font-bold shrink-0">
                            <School className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-slate-900 dark:text-white block">
                              {school.schoolNameArabic}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] text-[#006D77] dark:text-teal-400 font-bold">
                                #{school.schoolNumber}
                              </span>
                              {school.schoolNameEnglish && (
                                <span className="text-[11px] text-slate-400 truncate max-w-[140px]" dir="ltr">
                                  {school.schoolNameEnglish}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Emirate & Region */}
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {school.emirate}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {school.region || 'المركز'}
                        </span>
                      </td>

                      {/* Cycle & Gender */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {school.schoolGender === 'boys' ? 'بنين' : school.schoolGender === 'girls' ? 'بنات' : 'مشتركة'}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {(school.educationCycles || []).join('، ')}
                        </div>
                      </td>

                      {/* Principal */}
                      <td className="py-3.5 px-3">
                        {school.principalName ? (
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {school.principalName}
                            </span>
                            {school.principalEmail && (
                              <span className="text-[11px] font-mono text-slate-400 block" dir="ltr">
                                {school.principalEmail}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPrincipalModal(school)}
                            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                          >
                            + تعيين مدير
                          </button>
                        )}
                      </td>

                      {/* Counts */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openUsersModal(school)}
                            className="flex items-center gap-1 font-bold text-[#006D77] dark:text-teal-400 hover:underline cursor-pointer"
                            title="عرض المستخدمين"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>{counts.usersCount} كادر</span>
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">|</span>
                          <span className="text-slate-500 font-medium">
                            {counts.studentsCount} طالب
                          </span>
                        </div>
                      </td>

                      {/* Subscription */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            school.subscriptionStatus === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : school.subscriptionStatus === 'trial'
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {school.subscriptionStatus === 'active'
                            ? 'نشط'
                            : school.subscriptionStatus === 'trial'
                            ? 'تجريبي'
                            : school.subscriptionStatus === 'expired'
                            ? 'منتهي'
                            : 'دائم'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                            school.status === 'active'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : school.status === 'suspended'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              school.status === 'active'
                                ? 'bg-emerald-500'
                                : school.status === 'suspended'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>
                            {school.status === 'active'
                              ? 'نشطة'
                              : school.status === 'suspended'
                              ? 'معلقة'
                              : 'مؤرشفة'}
                          </span>
                        </span>
                      </td>

                      {/* Action Menu */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Preview Mode */}
                          {onImpersonateSchool && (
                            <button
                              type="button"
                              onClick={() => onImpersonateSchool(school)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-colors cursor-pointer"
                              title="معاينة لوحة المدرسة"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => openEditModal(school)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات المدرسة"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Assign Principal */}
                          <button
                            type="button"
                            onClick={() => openPrincipalModal(school)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                            title="تعيين أو تغيير مدير المدرسة"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          {/* Suspend / Reactivate */}
                          <button
                            type="button"
                            onClick={() => openToggleStatusModal(school)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              school.status === 'active'
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={school.status === 'active' ? 'تعليق المدرسة' : 'إعادة تفعيل المدرسة'}
                          >
                            {school.status === 'active' ? (
                              <PauseCircle className="w-4 h-4" />
                            ) : (
                              <PlayCircle className="w-4 h-4" />
                            )}
                          </button>

                          {/* Archive (strictly NO direct hard delete) */}
                          {school.status !== 'archived' && (
                            <button
                              type="button"
                              onClick={() => openArchiveModal(school)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="أرشفة المدرسة لحماية البيانات"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SCHOOL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#006D77]" />
                  <span>إضافة مدرسة جديدة إلى المنصة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تسجيل مدرسة برقم وزاري رسمي مستقل مع عزل كامل للبيانات
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الرقم الوزاري للمدرسة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolNumber}
                    onChange={(e) => setSchoolNumber(e.target.value)}
                    placeholder="مثال: 7002"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المدرسة بالعربية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolNameArabic}
                    onChange={(e) => setSchoolNameArabic(e.target.value)}
                    placeholder="مثال: مدرسة التميز المشتركة"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المدرسة بالإنجليزية (اختياري)
                  </label>
                  <input
                    type="text"
                    value={schoolNameEnglish}
                    onChange={(e) => setSchoolNameEnglish(e.target.value)}
                    placeholder="e.g. Al Tamayuz School"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الإمارة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={emirate}
                    onChange={(e) => setEmirate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {EMIRATES_LIST.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المنطقة / المدينة
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="مثال: العين، ديرة..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع المدرسة
                  </label>
                  <select
                    value={schoolGender}
                    onChange={(e) => setSchoolGender(e.target.value as SchoolGender)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="boys">بنين</option>
                    <option value="girls">بنات</option>
                    <option value="mixed">مشتركة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حالة الاشتراك
                  </label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value as SchoolSubscriptionStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="active">نشط</option>
                    <option value="trial">تجريبي</option>
                    <option value="permanent">دائم</option>
                    <option value="expired">منتهي</option>
                  </select>
                </div>
              </div>

              {/* Principal details */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  بيانات مدير المدرسة (اختياري)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="اسم المدير الكامل"
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <input
                    type="email"
                    value={principalEmail}
                    onChange={(e) => setPrincipalEmail(e.target.value)}
                    placeholder="البريد الإلكتروني"
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    dir="ltr"
                  />
                  <input
                    type="tel"
                    value={principalPhone}
                    onChange={(e) => setPrincipalPhone(e.target.value)}
                    placeholder="رقم الهاتف"
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>حفظ وإضافة المدرسة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span>تعديل بيانات المدرسة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingSchool.schoolNameArabic} (#{editingSchool.schoolNumber})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingSchool(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المدرسة بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolNameArabic}
                  onChange={(e) => setSchoolNameArabic(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الرقم الوزاري <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolNumber}
                    onChange={(e) => setSchoolNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الإمارة
                  </label>
                  <select
                    value={emirate}
                    onChange={(e) => setEmirate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {EMIRATES_LIST.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الاسم بالإنجليزية
                  </label>
                  <input
                    type="text"
                    value={schoolNameEnglish}
                    onChange={(e) => setSchoolNameEnglish(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المنطقة
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع المدرسة
                  </label>
                  <select
                    value={schoolGender}
                    onChange={(e) => setSchoolGender(e.target.value as SchoolGender)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="boys">بنين</option>
                    <option value="girls">بنات</option>
                    <option value="mixed">مشتركة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حالة الاشتراك
                  </label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value as SchoolSubscriptionStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="active">نشط</option>
                    <option value="trial">تجريبي</option>
                    <option value="permanent">دائم</option>
                    <option value="expired">منتهي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب التعديل (لتوثيقه في سجل التدقيق)
                </label>
                <input
                  type="text"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="مثال: تحديث رسمي للاسم الوزاري..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit className="w-4 h-4" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN PRINCIPAL MODAL */}
      {principalModalSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>تعيين أو تغيير مدير المدرسة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {principalModalSchool.schoolNameArabic}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPrincipalModalSchool(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrincipal} className="space-y-3.5">
              {schoolUsersList.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اختيار من كادر المدرسة المسجل:
                  </label>
                  <select
                    value={selectedPrincipalUid}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setSelectedPrincipalUid(uid);
                      const u = schoolUsersList.find((usr) => usr.uid === uid);
                      if (u) {
                        setPrincipalName(u.fullName);
                        setPrincipalEmail(u.email);
                        setPrincipalPhone(u.phone || '');
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
                  >
                    <option value="">-- أو إدخال بيانات مدير جديد يدوياً --</option>
                    {schoolUsersList.map((usr) => (
                      <option key={usr.uid} value={usr.uid}>
                        {usr.fullName} ({usr.jobTitle || usr.role}) - {usr.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المدير الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني المعتمد
                </label>
                <input
                  type="email"
                  value={principalEmail}
                  onChange={(e) => setPrincipalEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={principalPhone}
                  onChange={(e) => setPrincipalPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPrincipalModalSchool(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>اعتماد المدير</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SCHOOL USERS MODAL */}
      {usersModalSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#006D77]" />
                  <span>مستخدمو المدرسة: {usersModalSchool.schoolNameArabic}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الرقم الوزاري: #{usersModalSchool.schoolNumber} ({schoolUsersList.length} مستخدم مسجل)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setUsersModalSchool(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
              {isLoadingSchoolUsers ? (
                <div className="py-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#006D77]" />
                  <span>جاري تحميل المستخدمين...</span>
                </div>
              ) : schoolUsersList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  لا يوجد مستخدمون مرتبطون بهذه المدرسة حتى الآن
                </div>
              ) : (
                schoolUsersList.map((usr) => (
                  <div key={usr.uid} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                        {usr.fullName?.charAt(0) || 'م'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white text-xs block">
                          {usr.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                          {usr.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {usr.jobTitle || usr.role}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          usr.active
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {usr.active ? 'نشط' : 'معطل'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setUsersModalSchool(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOGGLE STATUS MODAL (SUSPEND / REACTIVATE) */}
      {toggleStatusSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  toggleStatusSchool.status === 'active'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                }`}
              >
                {toggleStatusSchool.status === 'active' ? (
                  <PauseCircle className="w-6 h-6" />
                ) : (
                  <PlayCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {toggleStatusSchool.status === 'active' ? 'تعليق المدرسة' : 'إعادة تفعيل المدرسة'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {toggleStatusSchool.schoolNameArabic}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {toggleStatusSchool.status === 'active'
                ? 'عند تعليق المدرسة، لن يتمكن كادر المدرسة من تسجيل الدخول أو إدخال رصد جديد، بينما تظل كافة السجلات والتقارير التاريخية محفوظة بأمان.'
                : 'إعادة تفعيل المدرسة ستتيح للكادر الدخول إلى لوحة المدرسة بشكل طبيعي.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                سبب الإجراء (اختياري)
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="وضح سبب التعليق أو التفعيل..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setToggleStatusSchool(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleStatus}
                disabled={isProcessing}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors flex items-center gap-1.5 ${
                  toggleStatusSchool.status === 'active'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isProcessing && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>تأكيد الإجراء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE CONFIRMATION MODAL (STRICTLY NO DIRECT HARD DELETE) */}
      {archiveModalSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  أرشفة مدرسة (حماية البيانات)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {archiveModalSchool.schoolNameArabic} (#{archiveModalSchool.schoolNumber})
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              وفقاً لسياسة النظام وحماية السجلات الأكاديمية، لا يُسمح بالحذف النهائي للمدارس لتجنب فقدان سجلات الطلاب والخطط الفردية. سيتم نقل المدرسة للأرشيف وحجبها عن القوائم النشطة مع إمكانية استرجاعها مستقبلاً.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سبب الأرشفة <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="يرجى كتابة سبب رسمي للأرشفة (مثل: دمج المدرسة، إغلاق رسمي من الوزارة...)"
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setArchiveModalSchool(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                <span>تأكيد الأرشفة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
