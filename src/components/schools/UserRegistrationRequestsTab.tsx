import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Clock,
  AlertCircle,
  FileQuestion,
  School,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  RegistrationRequest,
  AppUser,
  UserRole,
  DetailedSchool,
  isSystemOwner,
} from '../../types';
import {
  fetchRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  JOB_TITLES_CONFIG,
} from '../../firebase/registrationService';
import {
  fetchSchoolsList,
  requestMoreInfoForRegistration,
} from '../../firebase/schoolsService';

interface UserRegistrationRequestsTabProps {
  currentUser: AppUser;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshStats?: () => void;
}

export const UserRegistrationRequestsTab: React.FC<UserRegistrationRequestsTabProps> = ({
  currentUser,
  onShowToast,
  onRefreshStats,
}) => {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [schools, setSchools] = useState<DetailedSchool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'needs_info' | 'all'>('pending');

  // Modals
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'info' | null>(null);

  // Approval Form State
  const [assignedSchoolId, setAssignedSchoolId] = useState('');
  const [assignedRole, setAssignedRole] = useState<UserRole>('counselor');
  const [assignedJobTitle, setAssignedJobTitle] = useState('');
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  // Rejection / Info Note
  const [noteText, setNoteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reqs, allSchools] = await Promise.all([
        fetchRegistrationRequests(),
        isSystemOwner(currentUser.role) ? fetchSchoolsList(currentUser, 'all') : Promise.resolve([]),
      ]);
      setRequests(reqs);
      setSchools(allSchools);
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تحميل طلبات تسجيل المستخدمين', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openApproveModal = (req: RegistrationRequest) => {
    setSelectedRequest(req);
    setAssignedSchoolId(req.schoolNumber || req.schoolId || currentUser.schoolId || '7001');
    setAssignedRole(req.requestedRole || 'counselor');
    setAssignedJobTitle(req.jobTitleArabic || req.requestedJobTitle || 'مرشد مهني');
    setIsTemporary(false);
    setExpiresAt('');
    setModalType('approve');
  };

  const openRejectModal = (req: RegistrationRequest) => {
    setSelectedRequest(req);
    setNoteText('');
    setModalType('reject');
  };

  const openInfoModal = (req: RegistrationRequest) => {
    setSelectedRequest(req);
    setNoteText('');
    setModalType('info');
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await approveRegistrationRequest(
        selectedRequest.id,
        {
          role: assignedRole,
          schoolId: assignedSchoolId,
          jobTitle: assignedJobTitle,
        },
        currentUser
      );

      onShowToast(
        `تم اعتماد حساب ${selectedRequest.fullNameArabic || selectedRequest.displayName} بنجاح`,
        'success'
      );
      setModalType(null);
      setSelectedRequest(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر اعتماد الحساب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedRequest) return;
    if (!noteText.trim()) {
      onShowToast('يرجى كتابة سبب رفض الطلب', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await rejectRegistrationRequest(selectedRequest.id, noteText.trim(), currentUser);
      onShowToast(`تم رفض طلب التسجيل للمستخدم`, 'info');
      setModalType(null);
      setSelectedRequest(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر رفض الطلب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmInfoRequest = async () => {
    if (!selectedRequest) return;
    if (!noteText.trim()) {
      onShowToast('يرجى كتابة الملاحظات والمعلومات المطلوبة من المستخدم', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await requestMoreInfoForRegistration(selectedRequest.id, noteText.trim(), currentUser);
      onShowToast(`تم إرسال طلب المعلومات الإضافية للمستخدم`, 'success');
      setModalType(null);
      setSelectedRequest(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'تعذر طلب معلومات إضافية', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (r.fullNameArabic && r.fullNameArabic.toLowerCase().includes(q)) ||
      (r.displayName && r.displayName.toLowerCase().includes(q)) ||
      r.email.toLowerCase().includes(q) ||
      (r.phone && r.phone.toLowerCase().includes(q)) ||
      (r.schoolNameArabic && r.schoolNameArabic.toLowerCase().includes(q)) ||
      (r.schoolNumber && r.schoolNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#006D77]" />
            <span>طلبات تسجيل المستخدمين</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              {requests.filter((r) => r.status === 'pending').length} معلق
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مراجعة طلبات انضمام الكوادر المدرسية، تحديد الأدوار المعتمدة، وضبط تراخيص الوصول
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد أو المدرسة..."
              className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white"
          >
            <option value="pending">المعلقة فقط</option>
            <option value="needs_info">تحتاج معلومات</option>
            <option value="all">كل الطلبات</option>
          </select>

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

      {/* Requests List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <RefreshCw className="w-8 h-8 text-[#006D77] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            جاري تحميل طلبات التسجيل...
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            لا توجد طلبات تسجيل معلقة
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            تمت مراجعة جميع طلبات تسجيل المستخدمين. ستظهر أي طلبات واردة جديدة هنا مباشرة.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isNewSchool = req.requestType === 'createNewSchool';
            const isNeedsInfo = req.status === 'needs_info';

            return (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs hover:border-teal-300 dark:hover:border-teal-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    {req.photoURL ? (
                      <img
                        src={req.photoURL}
                        alt=""
                        className="w-11 h-11 rounded-full border-2 border-teal-500 object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#006D77] dark:text-teal-400 font-bold text-base shrink-0">
                        {req.fullNameArabic?.charAt(0) || 'م'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                          {req.fullNameArabic || req.displayName || 'مستخدم جديد'}
                        </h3>
                        {isNeedsInfo ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            تحتاج معلومات إضافية
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                            قيد الانتظار
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono flex items-center gap-1" dir="ltr">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.email}</span>
                        </span>
                        {req.phone && (
                          <span className="font-mono flex items-center gap-1" dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{req.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* School Info */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">المدرسة المطلوبة:</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                      <School className="w-4 h-4 text-[#006D77] shrink-0" />
                      <span>{req.schoolNameArabic || 'غير محددة'}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] text-teal-600 font-bold">
                        #{req.schoolNumber || req.schoolId}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isNewSchool
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {isNewSchool ? 'مدرسة جديدة مقترحة' : 'مدرسة مسجلة مسبقاً'}
                      </span>
                    </div>
                  </div>

                  {/* Requested Role */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">الدور والوظيفة:</span>
                    <span className="font-bold text-slate-800 dark:text-white block">
                      {req.jobTitleArabic || req.requestedJobTitle}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                      الصلاحية: {req.requestedRole}
                    </span>
                  </div>

                  {/* Location & Cycle */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">الموقع والحلقة:</span>
                    <span className="font-bold text-slate-800 dark:text-white block">
                      {req.emirate || 'أبوظبي'} {req.region ? ` - ${req.region}` : ''}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {req.schoolGender === 'boys' ? 'بنين' : req.schoolGender === 'girls' ? 'بنات' : 'مشتركة'}
                    </span>
                  </div>
                </div>

                {/* If needs_info note exists */}
                {req.infoRequestNote && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">المعلومات المطلوبة سابقاً: </span>
                      <span>{req.infoRequestNote}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => openRejectModal(req)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>رفض الطلب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openInfoModal(req)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>طلب معلومات إضافية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openApproveModal(req)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>اعتماد وتفعيل الحساب</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPROVE USER MODAL */}
      {modalType === 'approve' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>اعتماد وتفعيل حساب المستخدم</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRequest.fullNameArabic || selectedRequest.displayName} ({selectedRequest.email})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalType(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Assign School */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المدرسة المعتمدة <span className="text-rose-500">*</span>
                </label>
                {schools.length > 0 ? (
                  <select
                    value={assignedSchoolId}
                    onChange={(e) => setAssignedSchoolId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {schools.map((s) => (
                      <option key={s.schoolId} value={s.schoolNumber || s.schoolId}>
                        {s.schoolNameArabic} (#{s.schoolNumber}) - {s.emirate}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={assignedSchoolId}
                    onChange={(e) => setAssignedSchoolId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                  />
                )}
              </div>

              {/* Assign Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الصلاحية الممنوحة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignedRole}
                    onChange={(e) => setAssignedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="counselor">مرشد (أكاديمي/مهني) - counselor</option>
                    <option value="schoolAdmin">مدير مدرسة - schoolAdmin</option>
                    <option value="viewer">مطلع فقط - viewer</option>
                    {isSystemOwner(currentUser.role) && (
                      <option value="system_owner">مدير النظام العام - system_owner</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي
                  </label>
                  <input
                    type="text"
                    value={assignedJobTitle}
                    onChange={(e) => setAssignedJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              {/* Account Status / Expiration */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                    className="rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span>حساب مؤقت (محدد بتاريخ انتهاء صلاحية)</span>
                </label>

                {isTemporary && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      تاريخ انتهاء الصلاحية:
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>تأكيد الاعتماد والتفعيل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST MORE INFO MODAL */}
      {modalType === 'info' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  طلب معلومات إضافية من المستخدم
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRequest.fullNameArabic || selectedRequest.displayName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الملاحظات والمعلومات المطلوبة <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="وضح للمستخدم ما يحتاج لتعديله أو تزويدك به (مثل: توضيح المدرسة الرسمية، تصحيح رقم الهاتف...)"
                rows={3}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmInfoRequest}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HelpCircle className="w-4 h-4" />}
                <span>إرسال الطلب للمستخدم</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT USER MODAL */}
      {modalType === 'reject' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  رفض طلب تسجيل المستخدم
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRequest.fullNameArabic || selectedRequest.displayName}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سبب الرفض <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="وضح سبب رفض الطلب..."
                rows={3}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>تأكيد الرفض</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
