import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Eye,
  RotateCw,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { MessageLogRecord, MessageStatus, MessageChannel } from '../../types';

interface MessageLogsTabProps {
  logs: MessageLogRecord[];
  onResendMessage?: (log: MessageLogRecord) => void;
  canManage?: boolean;
}

export const MessageLogsTab: React.FC<MessageLogsTabProps> = ({
  logs,
  onResendMessage,
  canManage = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<MessageLogRecord | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchStudent = l.studentName.toLowerCase().includes(q);
        const matchNum = l.studentNumber.includes(q);
        const matchRecipient = l.recipientName.toLowerCase().includes(q);
        const matchSubject = l.subject.toLowerCase().includes(q);
        if (!matchStudent && !matchNum && !matchRecipient && !matchSubject) return false;
      }

      if (channelFilter !== 'all' && l.channel !== channelFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (gradeFilter !== 'all' && l.grade !== gradeFilter) return false;

      return true;
    });
  }, [logs, searchQuery, channelFilter, statusFilter, gradeFilter]);

  const getStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case 'confirmed_sent':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>أكد المستخدم الإرسال</span>
          </span>
        );
      case 'whatsapp_opened':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full">
            <Phone className="w-3 h-3 text-blue-600" />
            <span>تم فتح واتساب</span>
          </span>
        );
      case 'email_opened':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-full">
            <Mail className="w-3 h-3 text-purple-600" />
            <span>تم فتح البريد</span>
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>تم التخطي</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            <span>تعذر الإرسال</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            <span>جاهزة</span>
          </span>
        );
    }
  };

  const exportCSV = () => {
    const headers = [
      'التاريخ والوقت',
      'اسم الطالب',
      'الرقم الطلابي',
      'الصف والشعبة',
      'المستلم',
      'الصفة',
      'الهاتف',
      'القناة',
      'الحالة',
      'الموضوع',
      'المرسل',
    ];

    const rows = filteredLogs.map((l) => [
      new Date(l.createdAt).toLocaleString('ar-AE'),
      l.studentName,
      l.studentNumber,
      `${l.grade}/${l.section}`,
      l.recipientName,
      l.recipientRelation,
      l.recipientPhoneMasked,
      l.channel === 'whatsapp' ? 'واتساب' : 'بريد',
      l.status,
      `"${(l.subject || '').replace(/"/g, '""')}"`,
      l.createdByName,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل_رسائل_المرشد_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="no-print bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في السجل باسم الطالب، المستلم، أو الموضوع..."
              className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-[#006D77]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>تصدير Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0C2340] text-white hover:bg-[#08182B] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>طباعة السجل</span>
            </button>
          </div>
        </div>

        {/* Secondary filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-hidden"
          >
            <option value="all">كافة القنوات</option>
            <option value="whatsapp">واتساب فقط</option>
            <option value="email">بريد إلكتروني فقط</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-hidden"
          >
            <option value="all">كافة الحالات</option>
            <option value="confirmed_sent">أكد المستخدم الإرسال</option>
            <option value="whatsapp_opened">تم فتح واتساب</option>
            <option value="email_opened">تم فتح البريد</option>
            <option value="skipped">تم التخطي</option>
            <option value="failed">تعذر الإرسال</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-hidden"
          >
            <option value="all">كافة الصفوف</option>
            <option value="9">الصف 9</option>
            <option value="10">الصف 10</option>
            <option value="11">الصف 11</option>
            <option value="12">الصف 12</option>
          </select>

          <div className="text-left text-xs text-slate-400 flex items-center justify-end font-medium">
            إجمالي السجلات: {filteredLogs.length}
          </div>
        </div>
      </div>

      {/* Table of Logs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">الطالب</th>
                <th className="p-3.5">المستلم والصفة</th>
                <th className="p-3.5">الهاتف (مقنّع)</th>
                <th className="p-3.5">نوع الرسالة والموضوع</th>
                <th className="p-3.5">القناة</th>
                <th className="p-3.5">حالة الإرسال</th>
                <th className="p-3.5">المرسل</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-400">
                    لا توجد رسائل مسجلة تطابق عوامل التصفية
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors"
                  >
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('ar-AE')}
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString('ar-AE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {log.studentName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono">#{log.studentNumber}</span>
                        <span>•</span>
                        <span>الصف {log.grade}/{log.section}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.recipientName}
                      </div>
                      <div className="text-[10px] text-slate-400">{log.recipientRelation}</div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {log.recipientPhoneMasked || log.recipientEmailMasked}
                    </td>

                    <td className="p-3.5 max-w-[220px]">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {log.subject}
                      </div>
                      {log.templateName && (
                        <div className="text-[10px] text-[#006D77] dark:text-teal-400 font-bold truncate">
                          قالب: {log.templateName}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {log.channel === 'whatsapp' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <Phone className="w-3 h-3" />
                          <span>واتساب</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600">
                          <Mail className="w-3 h-3" />
                          <span>بريد</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">{getStatusBadge(log.status)}</td>

                    <td className="p-3.5 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {log.createdByName}
                      {log.senderRole && (
                        <div className="text-[10px] text-slate-400">{log.senderRole}</div>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-[#006D77] hover:bg-teal-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="عرض تفاصيل الرسالة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                تفاصيل الرسالة المؤرشفة
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <div>
                  <span className="text-slate-400 block mb-0.5">الطالب:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedLog.studentName} ({selectedLog.studentNumber})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">المستلم:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {selectedLog.recipientName} ({selectedLog.recipientRelation})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">الهاتف:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">
                    {selectedLog.recipientPhoneMasked}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">الحالة:</span>
                  <div>{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">الموضوع:</span>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold text-slate-800 dark:text-slate-100">
                  {selectedLog.subject}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">نص الرسالة المرسلة:</span>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl whitespace-pre-line leading-relaxed font-mono text-slate-700 dark:text-slate-200 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700">
                  {selectedLog.messageSnapshot}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
