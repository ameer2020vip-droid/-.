import React, { useState, useEffect, useCallback } from 'react';
import {
  BellRing,
  FileSignature,
  AlertTriangle,
  Clock,
  Check,
  CheckCheck,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from 'lucide-react';
import { CounselorNotification, CounselorNotificationType } from '../types';
import {
  getCounselorNotifications,
  acknowledgeCounselorNotification,
  acknowledgeAllCounselorNotifications,
  COUNSELOR_NOTIFICATION_EVENT,
  STORAGE_EVENT_NAME,
} from '../storage';
import { NavTab } from './Navigation';

interface CounselorNotificationBannerProps {
  onOpenStudentProfile: (studentId: string) => void;
  onNavigateToFormOrTab: (
    tabTarget: NavTab,
    studentId?: string,
    recordId?: string,
    type?: CounselorNotificationType
  ) => void;
}

export const CounselorNotificationBanner: React.FC<CounselorNotificationBannerProps> = ({
  onOpenStudentProfile,
  onNavigateToFormOrTab,
}) => {
  const [notifications, setNotifications] = useState<CounselorNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMinimizedPill, setIsMinimizedPill] = useState<boolean>(false);

  const loadNotifications = useCallback(() => {
    try {
      const items = getCounselorNotifications().filter((n) => !n.acknowledged);
      setNotifications(items);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener(COUNSELOR_NOTIFICATION_EVENT, handleUpdate);
    window.addEventListener(STORAGE_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(COUNSELOR_NOTIFICATION_EVENT, handleUpdate);
      window.removeEventListener(STORAGE_EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadNotifications]);

  const handleAcknowledgeOne = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    acknowledgeCounselorNotification(id);
    loadNotifications();
  };

  const handleAcknowledgeAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    acknowledgeAllCounselorNotifications();
    loadNotifications();
  };

  const handleOpenLink = (item: CounselorNotification, mode: 'student' | 'form') => {
    if (mode === 'student' && item.studentId) {
      onOpenStudentProfile(item.studentId);
    } else {
      const targetTab = (item.targetTab as NavTab) || 'forms';
      onNavigateToFormOrTab(targetTab, item.studentId, item.targetRecordId, item.type);
    }
    acknowledgeCounselorNotification(item.id);
    loadNotifications();
  };

  if (notifications.length === 0) {
    return null;
  }

  const getTypeStyle = (type: CounselorNotificationType) => {
    switch (type) {
      case 'warning_form_draft':
        return {
          badge: 'مسودة تنبيه خطي',
          badgeClass: 'bg-[#C9A227]/20 text-[#A67C00] dark:text-[#C9A227] border-[#C9A227]/40',
          iconBg: 'bg-[#FAF7EF] dark:bg-[#12395B] text-[#A67C00] dark:text-[#C9A227] border-[#C9A227]/40',
          Icon: FileSignature,
        };
      case 'warning_form_approval':
        return {
          badge: 'اعتماد نموذج التنبيه الخطي',
          badgeClass: 'bg-[#147A4A]/15 text-[#147A4A] dark:text-emerald-300 border-[#147A4A]/30',
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-[#147A4A] dark:text-emerald-300 border-[#147A4A]/30',
          Icon: FileCheck,
        };
      case 'infraction_logged':
        return {
          badge: 'مخالفة سلوكية جديدة',
          badgeClass: 'bg-[#B4232C]/15 text-[#B4232C] dark:text-rose-300 border-[#B4232C]/30',
          iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-[#B4232C] dark:text-rose-300 border-[#B4232C]/30',
          Icon: AlertTriangle,
        };
      case 'followup_due':
      default:
        return {
          badge: 'متابعة مستحقة للطالب',
          badgeClass: 'bg-[#0B2748]/10 text-[#0B2748] dark:bg-[#C9A227]/20 dark:text-[#C9A227] border-[#0B2748]/25',
          iconBg: 'bg-slate-100 dark:bg-[#12395B] text-[#0B2748] dark:text-[#C9A227] border-[#0B2748]/20',
          Icon: Clock,
        };
    }
  };

  if (isMinimizedPill) {
    return (
      <div
        dir="rtl"
        className="no-print fixed bottom-5 left-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <button
          type="button"
          onClick={() => setIsMinimizedPill(false)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0B2748] hover:bg-[#12395B] text-white border-2 border-[#C9A227] shadow-xl cursor-pointer transition-all"
          title="فتح إشعارات المرشد المدرسي"
        >
          <div className="relative">
            <BellRing className="w-4 h-4 text-[#C9A227] animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#B4232C]" />
          </div>
          <span className="text-xs font-bold">
            إشعارات المرشد ({notifications.length})
          </span>
          <ChevronUp className="w-4 h-4 text-[#C9A227]" />
        </button>
      </div>
    );
  }

  const visibleItems = isExpanded ? notifications.slice(0, 3) : notifications.slice(0, 1);

  return (
    <aside
      dir="rtl"
      aria-live="polite"
      aria-label="إشعارات نظام المرشد المدرسي الذكي"
      className="no-print fixed bottom-5 left-5 z-40 w-[350px] sm:w-[400px] max-w-[calc(100vw-2.5rem)] bg-white dark:bg-[#0B2748] border-2 border-[#C9A227]/70 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Top Bar */}
      <div className="bg-gradient-to-l from-[#0B2748] to-[#12395B] text-white px-3.5 py-2.5 border-b border-[#C9A227]/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#C9A227]/20 border border-[#C9A227]/50 flex items-center justify-center text-[#C9A227] shrink-0">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-white truncate">
                إشعارات المرشد الذكي
              </h4>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#C9A227] text-[#0B2748]">
                {notifications.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-300 truncate">
              أكاديمية الفجيرة العلمية الإسلامية • تنبيهات المتابعة والنماذج
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleAcknowledgeAll}
            title="إقرار الكل ومسح الإشعارات المؤقتة"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#C9A227]/20 hover:bg-[#C9A227] text-[#C9A227] hover:text-[#0B2748] border border-[#C9A227]/40 transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3 h-3" />
            <span>إقرار الكل</span>
          </button>
          {notifications.length > 1 && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              title={isExpanded ? 'عرض إشعار واحد' : 'عرض الإشعارات'}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMinimizedPill(true)}
            title="تصغير النافذة"
            className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            تصغير
          </button>
        </div>
      </div>

      {/* Notification Cards */}
      <div className="divide-y divide-slate-100 dark:divide-[#12395B] max-h-[340px] overflow-y-auto bg-[#FAF7EF]/60 dark:bg-[#0B2748]">
        {visibleItems.map((item) => {
          const style = getTypeStyle(item.type);
          const IconComponent = style.Icon;
          return (
            <div
              key={item.id}
              className="p-3 hover:bg-white dark:hover:bg-[#12395B]/60 transition-colors"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${style.iconBg}`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${style.badgeClass}`}
                    >
                      {style.badge}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleAcknowledgeOne(item.id, e)}
                      title="تم الاطلاع (مسح من الإشعارات)"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#147A4A] dark:text-emerald-300 hover:bg-[#147A4A]/10 px-1.5 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>تم الاطلاع</span>
                    </button>
                  </div>

                  <h5 className="text-xs font-black text-[#0B2748] dark:text-white leading-snug">
                    {item.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {item.message}
                  </p>

                  {/* Action Links: Student File or Relevant Form */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                    {item.studentId && (
                      <button
                        type="button"
                        onClick={() => handleOpenLink(item, 'student')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#0B2748] hover:bg-[#12395B] text-white cursor-pointer transition-colors shadow-2xs"
                      >
                        <User className="w-3 h-3 text-[#C9A227]" />
                        <span>ملف الطالب: {item.studentName || 'عرض'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenLink(item, 'form')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#C9A227]/20 hover:bg-[#C9A227] text-[#0B2748] dark:text-[#C9A227] dark:hover:text-[#0B2748] border border-[#C9A227]/50 cursor-pointer transition-colors"
                    >
                      <span>
                        {item.type === 'warning_form_draft' || item.type === 'warning_form_approval'
                          ? 'فتح نموذج التنبيه الخطي'
                          : item.type === 'infraction_logged'
                          ? 'فتح سجل المخالفات'
                          : 'متابعة السجل'}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {notifications.length > visibleItems.length && (
        <div className="px-3.5 py-1.5 bg-[#F2F3F5] dark:bg-[#12395B] border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] font-bold text-[#0B2748] dark:text-slate-200">
          <span>يوجد {notifications.length - visibleItems.length} إشعارات أخرى في القائمة</span>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="text-[#A67C00] dark:text-[#C9A227] hover:underline cursor-pointer"
          >
            عرض المزيد
          </button>
        </div>
      )}
    </aside>
  );
};
