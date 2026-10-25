import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Building2,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Archive,
  PauseCircle,
  Layers,
} from 'lucide-react';
import { AuditLogRecord, AppUser, Student } from '../../types';

interface AuditLogTabProps {
  auditLogs: AuditLogRecord[];
  currentUser: AppUser;
  importBatches: { batchId: string; date?: string; students: Student[] }[];
  onDeleteImportBatch?: (batchId: string) => Promise<boolean | void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
  auditLogs,
  currentUser,
  importBatches,
  onDeleteImportBatch,
  onShowToast,
}) => {
  const [subView, setSubView] = useState<'logs' | 'batches'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [inspectLog, setInspectLog] = useState<AuditLogRecord | null>(null);

  // Batch delete modal
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      log.userName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.entityType.toLowerCase().includes(q) ||
      (log.schoolId && log.schoolId.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            إنشاء
          </span>
        );
      case 'approve':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
            اعتماد
          </span>
        );
      case 'update':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            تعديل
          </span>
        );
      case 'archive':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
            أرشفة
          </span>
        );
      case 'suspend':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            تعليق
          </span>
        );
      case 'reactivate':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            تفعيل
          </span>
        );
      case 'delete':
      case 'import_batch_delete':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            حذف
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* View Switcher & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#006D77]" />
            <span>سجل التدقيق والعمليات الإدارية</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {auditLogs.length} عملية مسجلة
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            سجل غير قابل للتعديل يوثق كافة العمليات الإدارية الحساسة، التعديلات السابقة واللاحقة، وأسباب القرارات
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubView('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              subView === 'logs'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            سجل العمليات
          </button>
          <button
            type="button"
            onClick={() => setSubView('batches')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              subView === 'batches'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>حزم الاستيراد ({importBatches.length})</span>
          </button>
        </div>
      </div>

      {subView === 'logs' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في تفاصيل العملية، المستخدم المنفذ، أو السبب..."
                className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#006D77]"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white w-full sm:w-auto"
            >
              <option value="all">كل أنواع العمليات</option>
              <option value="create">إنشاء</option>
              <option value="approve">اعتماد</option>
              <option value="update">تعديل</option>
              <option value="suspend">تعليق</option>
              <option value="reactivate">إعادة تفعيل</option>
              <option value="archive">أرشفة</option>
              <option value="delete">حذف</option>
              <option value="import_batch_delete">حذف دفعة استيراد</option>
            </select>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">المستخدم المنفذ</th>
                    <th className="py-3 px-3">نوع الإجراء</th>
                    <th className="py-3 px-3">الكيان / المدرسة</th>
                    <th className="py-3 px-4">تفاصيل الإجراء والسبب</th>
                    <th className="py-3 px-3 text-center">البيانات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-200">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        لا توجد سجلات تدقيق مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const hasPayload = !!(log.beforeData || log.afterData || log.reason);

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap" dir="ltr">
                            {new Date(log.timestamp).toLocaleString('ar-AE')}
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {log.userName}
                          </td>

                          <td className="py-3 px-3">
                            {getActionBadge(log.action)}
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                              {log.entityType}
                            </span>
                            {log.schoolId && (
                              <span className="text-[10px] font-mono text-slate-400">
                                مدرسة: #{log.schoolId}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <p className="text-slate-800 dark:text-slate-200 line-clamp-2">
                              {log.details}
                            </p>
                            {log.reason && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                سبب الإجراء: {log.reason}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {hasPayload ? (
                              <button
                                type="button"
                                onClick={() => setInspectLog(log)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#006D77] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                                title="عرض البيانات قبل وبعد التعديل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>فحص</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW: BATCHES */}
      {subView === 'batches' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span>إدارة حزم استيراد ملفات المنهل</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حذف دفعة بعينها عند الحاجة للتراجع عن استيراد خاطئ مع الحفاظ على باقي بيانات النظام
              </p>
            </div>

            <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              إجمالي الحزم: {importBatches.length}
            </span>
          </div>

          {importBatches.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا توجد حزم استيراد مسجلة
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">معرف الحزمة (Batch ID)</th>
                    <th className="p-3">تاريخ الاستيراد</th>
                    <th className="p-3">عدد الطلاب</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {importBatches.map((batch, idx) => (
                    <tr key={batch.batchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/40">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {batch.batchId}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500" dir="ltr">
                        {batch.date ? new Date(batch.date).toLocaleString('ar-AE') : '—'}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                          {batch.students.length} طالب
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setBatchToDelete(batch.batchId)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الحزمة</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSPECT LOG MODAL (BEFORE & AFTER DATA, REASON) */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#006D77]" />
                  <span>تفاصيل العملية وتغييرات السجل</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  المنفذ: {inspectLog.userName} | {new Date(inspectLog.timestamp).toLocaleString('ar-AE')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">نص الإجراء:</span>
              <p className="text-slate-800 dark:text-slate-200">{inspectLog.details}</p>
              {inspectLog.reason && (
                <p className="text-rose-600 dark:text-rose-400 font-bold mt-1">
                  سبب الإجراء: {inspectLog.reason}
                </p>
              )}
            </div>

            {/* Before vs After Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-400 block">
                  البيانات قبل التعديل:
                </span>
                <pre className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-56">
                  {inspectLog.beforeData
                    ? JSON.stringify(inspectLog.beforeData, null, 2)
                    : 'لا توجد بيانات سابقة (عملية إنشاء أو اعتماد أولي)'}
                </pre>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                  البيانات بعد التعديل:
                </span>
                <pre className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto max-h-56">
                  {inspectLog.afterData
                    ? JSON.stringify(inspectLog.afterData, null, 2)
                    : 'لا توجد بيانات لاحقة'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM BATCH DELETE MODAL */}
      {batchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  حذف دفعة استيراد طلاب
                </h3>
                <p className="text-xs text-slate-500 font-mono">{batchToDelete}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              سيتم حذف سجلات طلاب هذه الحزمة فقط دون التأثير على بقية الطلاب أو السجلات التاريخية للغياب والمخالفات.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBatchToDelete(null)}
                disabled={isDeletingBatch}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteImportBatch || !batchToDelete) return;
                  try {
                    setIsDeletingBatch(true);
                    await onDeleteImportBatch(batchToDelete);
                    onShowToast('تم حذف دفعة الطلاب بنجاح', 'success');
                    setBatchToDelete(null);
                  } catch (err: any) {
                    onShowToast(err.message || 'تعذر حذف الدفعة', 'error');
                  } finally {
                    setIsDeletingBatch(false);
                  }
                }}
                disabled={isDeletingBatch}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {isDeletingBatch ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>تأكيد الحذف نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
