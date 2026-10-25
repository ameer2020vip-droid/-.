import React, { useState, useEffect } from 'react';
import {
  School,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  User,
  MapPin,
  Calendar,
  Building2,
  FileEdit,
  ShieldCheck,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
} from 'lucide-react';
import { DetailedSchool, AppUser, RegistrationRequest } from '../../types';
import {
  fetchSchoolsList,
  approveSchoolRequest,
  rejectSchoolRequest,
  checkSchoolNumberExists,
} from '../../firebase/schoolsService';
import { fetchRegistrationRequests } from '../../firebase/registrationService';

interface SchoolRequestsTabProps {
  currentUser: AppUser;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onRefreshStats?: () => void;
}

export const SchoolRequestsTab: React.FC<SchoolRequestsTabProps> = ({
  currentUser,
  onShowToast,
  onRefreshStats,
}) => {
  const [requests, setRequests] = useState<DetailedSchool[]>([]);
  const [userRequests, setUserRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<DetailedSchool | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'edit' | null>(null);

  // Approval form state
  const [approveUserToo, setApproveUserToo] = useState(true);
  const [assignAsPrincipal, setAssignAsPrincipal] = useState(true);
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSchoolNumber, setEditSchoolNumber] = useState('');
  const [editEmirate, setEditEmirate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [numberConflictWarning, setNumberConflictWarning] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allSchools, allUserReqs] = await Promise.all([
        fetchSchoolsList(currentUser, 'pending'),
        fetchRegistrationRequests(),
      ]);

      setRequests(allSchools);
      setUserRequests(allUserReqs);
    } catch (err: any) {
      onShowToast(err.message || 'تعذر تحميل طلبات إضافة المدارس', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openApproveModal = async (req: DetailedSchool) => {
    setSelectedRequest(req);
    setEditSchoolName(req.schoolNameArabic);
    setEditSchoolNumber(req.schoolNumber);
    setEditEmirate(req.emirate);
    setApproveUserToo(!!req.requesterUid);
    setAssignAsPrincipal(true);
    setActionType('approve');

    // Check if school number conflicts with an active school
    const exists = await checkSchoolNumberExists(req.schoolNumber, req.schoolId);
    if (exists) {
      setNumberConflictWarning(`تحذير: الرقم الوزاري (${req.schoolNumber}) مسجل بالفعل لمدرسة أخرى.`);
    } else {
      setNumberConflictWarning(null);
    }
  };

  const openRejectModal = (req: DetailedSchool) => {
    setSelectedRequest(req);
    setRejectionReason('');
    setActionType('reject');
  };

  const openEditModal = (req: DetailedSchool) => {
    setSelectedRequest(req);
    setEditSchoolName(req.schoolNameArabic);
    setEditSchoolNumber(req.schoolNumber);
    setEditEmirate(req.emirate);
    setActionType('edit');
  };

  const handleConfirmApproval = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      await approveSchoolRequest(
        selectedRequest.schoolId,
        {
          approveUserToo,
          requesterUid: selectedRequest.requesterUid,
          assignAsPrincipal,
          customSchoolName: editSchoolName.trim() || undefined,
          customSchoolNumber: editSchoolNumber.trim() || undefined,
          customEmirate: editEmirate || undefined,
        },
        currentUser
      );

      onShowToast(
        `تم اعتماد المدرسة ${editSchoolName || selectedRequest.schoolNameArabic} وتفعيلها بنجاح`,
        'success'
      );
      setActionType(null);
      setSelectedRequest(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء اعتماد المدرسة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      onShowToast('يرجى تحديد سبب الرفض لتوضيحه لمقدم الطلب', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await rejectSchoolRequest(
        selectedRequest.schoolId,
        rejectionReason,
        currentUser,
        selectedRequest.requesterUid
      );

      onShowToast(`تم رفض طلب إضافة المدرسة وتحديث حالتها`, 'info');
      setActionType(null);
      setSelectedRequest(null);
      await loadData();
      onRefreshStats?.();
    } catch (err: any) {
      onShowToast(err.message || 'حدث خطأ أثناء رفض الطلب', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      r.schoolNameArabic.toLowerCase().includes(q) ||
      r.schoolNumber.toLowerCase().includes(q) ||
      (r.schoolNameEnglish && r.schoolNameEnglish.toLowerCase().includes(q)) ||
      (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
      r.emirate.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#006D77]" />
            <span>طلبات إضافة المدارس الجديدة</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
              {requests.length} طلب معلق
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            مراجعة المدارس المقترحة من قِبل المستخدمين الجدد واعتماد تسجيلها الرسمي في المنصة
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم الوزاري..."
              className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
            />
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
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
            جاري تحميل طلبات المدارس...
          </p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            لا توجد طلبات إضافة مدارس معلقة حالياً
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            تمت مراجعة جميع طلبات تسجيل المدارس الجديدة. ستظهر أي طلبات واردة جديدة هنا فور إرسالها من صفحة التسجيل.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRequests.map((req) => {
            const cycleLabels = (req.educationCycles || []).map((c) => {
              if (c === 'cycle1') return 'حلقة أولى';
              if (c === 'cycle2') return 'حلقة ثانية';
              if (c === 'cycle3') return 'حلقة ثالثة';
              return c;
            });

            return (
              <div
                key={req.schoolId}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-teal-300 dark:hover:border-teal-700 transition-all p-5 space-y-4"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-[#0C2340] text-amber-300">
                        #{req.schoolNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        قيد المراجعة
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white mt-1.5">
                      {req.schoolNameArabic}
                    </h3>
                    {req.schoolNameEnglish && (
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400" dir="ltr">
                        {req.schoolNameEnglish}
                      </p>
                    )}
                  </div>

                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-3 py-1 rounded-xl flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>{req.emirate}</span>
                    {req.region && <span className="text-slate-400 text-[11px]">({req.region})</span>}
                  </span>
                </div>

                {/* School Details Tags */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#006D77] dark:text-teal-400 font-bold border border-teal-200 dark:border-teal-800">
                    نوع المدرسة: {req.schoolGender === 'boys' ? 'بنين' : req.schoolGender === 'girls' ? 'بنات' : 'مشتركة'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                    الحلقات: {cycleLabels.join('، ') || 'الحلقة الثالثة'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(req.createdAt).toLocaleDateString('ar-EG')}</span>
                  </span>
                </div>

                {/* Requester Box */}
                {req.requesterName ? (
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-teal-600" />
                        <span>مقدم الطلب: {req.requesterName}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {req.requesterJobTitle || 'كادر مدرسي'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                      {req.requesterEmail && (
                        <div className="flex items-center gap-1.5 font-mono truncate" dir="ltr">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{req.requesterEmail}</span>
                        </div>
                      )}
                      {req.requesterPhone && (
                        <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{req.requesterPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 text-xs text-slate-500 italic">
                    تم إنشاء الطلب مباشرة عبر النظام الإداري
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => openRejectModal(req)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض الطلب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openApproveModal(req)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#006D77] hover:bg-[#005a63] transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-200" />
                    <span>مراجعة واعتماد المدرسة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPROVE MODAL */}
      {actionType === 'approve' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>اعتماد وتسجيل المدرسة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تأكيد البيانات الرسمية للمدرسة وتفعيل حسابها في قاعدة بيانات المنصة
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActionType(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            {numberConflictWarning && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-bold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{numberConflictWarning}</span>
              </div>
            )}

            {/* Editable Fields before approval */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المدرسة المعتمد بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الرقم الوزاري الرسمي <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editSchoolNumber}
                    onChange={(e) => setEditSchoolNumber(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-[#006D77]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الإمارة <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editEmirate}
                    onChange={(e) => setEditEmirate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    {['أبوظبي', 'دبي', 'الشارقة', 'عجمان', 'أم القيوين', 'رأس الخيمة', 'الفجيرة'].map(
                      (em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Options if requester exists */}
              {selectedRequest.requesterUid && (
                <div className="p-4 bg-teal-50/60 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800/80 space-y-3">
                  <h4 className="text-xs font-bold text-[#006D77] dark:text-teal-300 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>اعتماد حساب مقدم الطلب ({selectedRequest.requesterName})</span>
                  </h4>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={approveUserToo}
                      onChange={(e) => setApproveUserToo(e.target.checked)}
                      className="rounded text-[#006D77] focus:ring-[#006D77]"
                    />
                    <span>الموافقة على تفعيل حساب المستخدم فوراً مع المدرسة</span>
                  </label>

                  {approveUserToo && (
                    <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 pr-5">
                      <input
                        type="checkbox"
                        checked={assignAsPrincipal}
                        onChange={(e) => setAssignAsPrincipal(e.target.checked)}
                        className="rounded text-[#006D77] focus:ring-[#006D77]"
                      />
                      <span>تعيين مقدم الطلب كمدير للمدرسة (صلاحية مدير مدرسة schoolAdmin)</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActionType(null)}
                disabled={isProcessing}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isProcessing}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>تأكيد الاعتماد والتفعيل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {actionType === 'reject' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  رفض طلب إضافة المدرسة
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedRequest.schoolNameArabic}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سبب الرفض <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="وضح سبب رفض الطلب (مثل: الرقم الوزاري غير مطابق للبيانات الرسمية، مدرسة مكررة...)"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
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
