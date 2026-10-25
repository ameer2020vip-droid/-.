import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  GraduationCap,
  Clock,
  LogOut,
  Shield,
  Menu,
  Bell,
  Search,
  ChevronLeft,
  X,
  User,
  AlertTriangle,
  FileText,
  School,
  CheckCheck,
  UserX,
  ShieldAlert,
  ArrowLeft,
  BellRing,
} from 'lucide-react';
import {
  AppUser,
  CounselorUser,
  Student,
  UserRole,
  ViolationRecord,
  TardinessRecord,
  AbsenceRecord,
  DashboardStats,
  CounselorNotification,
} from '../types';
import { NavTab } from './Navigation';
import { getUaeFullDateTimeString } from '../utils/time';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { EditableText } from './EditableText';
import {
  getCounselorNotifications,
  acknowledgeCounselorNotification,
  acknowledgeAllCounselorNotifications,
  COUNSELOR_NOTIFICATION_EVENT,
  STORAGE_EVENT_NAME,
} from '../storage';

interface HeaderProps {
  counselor: CounselorUser | AppUser | null;
  students?: Student[];
  violations?: ViolationRecord[];
  tardinessRecords?: TardinessRecord[];
  absences?: AbsenceRecord[];
  stats?: DashboardStats;
  onNavigate?: (tab: NavTab) => void;
  onOpenStudentProfile?: (studentId: string) => void;
  onLogout: () => void;
  onPurgeDemoData?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onOpenUserSettings?: () => void;
  onOpenSchoolSettings?: () => void;
}

export interface HeaderNotificationItem {
  id: string;
  type: 'tardiness' | 'absence' | 'violation' | 'system';
  title: string;
  description: string;
  timeAgo: string;
  isUrgent?: boolean;
  studentId?: string;
  studentName?: string;
  studentNumber?: string;
  studentCommunity?: string;
  tabTarget?: NavTab;
}

export const Header: React.FC<HeaderProps> = ({
  counselor,
  students = [],
  violations = [],
  tardinessRecords = [],
  absences = [],
  stats,
  onNavigate,
  onOpenStudentProfile,
  onLogout,
  onPurgeDemoData,
  onShowToast,
  isDarkMode = false,
  onToggleDarkMode,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onOpenUserSettings,
  onOpenSchoolSettings,
}) => {
  const { schoolSettings } = useSchoolSettings();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const headerRef = useRef<HTMLElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Notifications Popover State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'urgent' | 'attendance' | 'violations'>('all');
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => new Set());
  const [storedCounselorNotes, setStoredCounselorNotes] = useState<CounselorNotification[]>([]);
  const notificationsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncStoredNotes = () => {
      try {
        setStoredCounselorNotes(getCounselorNotifications().filter((n) => !n.acknowledged));
      } catch {
        setStoredCounselorNotes([]);
      }
    };
    syncStoredNotes();
    window.addEventListener(COUNSELOR_NOTIFICATION_EVENT, syncStoredNotes);
    window.addEventListener(STORAGE_EVENT_NAME, syncStoredNotes);
    return () => {
      window.removeEventListener(COUNSELOR_NOTIFICATION_EVENT, syncStoredNotes);
      window.removeEventListener(STORAGE_EVENT_NAME, syncStoredNotes);
    };
  }, []);

  // Update UAE live clock every second
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('ar-AE', {
          timeZone: 'Asia/Dubai',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setCurrentTime(formatter.format(now));
      } catch {
        setCurrentTime(getUaeFullDateTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically calculate and sync exact header height for sticky sidebar & page layout
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--app-header-height', `${height}px`);
      }
    };
    updateHeaderHeight();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(headerRef.current);
    }

    window.addEventListener('resize', updateHeaderHeight);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick keyboard shortcut (⌘K or Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('header-quick-search') as HTMLInputElement | null;
        if (input) {
          input.focus();
          setIsSearchOpen(true);
        }
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        notificationsContainerRef.current &&
        !notificationsContainerRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute live notifications and alerts from LocalStorage counselor notifications + students, violations, absences, and tardiness
  const rawNotifications: HeaderNotificationItem[] = useMemo(() => {
    const list: HeaderNotificationItem[] = [];

    // 0. Internal Counselor Notifications from LocalStorage (Warning Forms Draft/Approved, New Infractions, Due Follow-ups)
    for (const cn of storedCounselorNotes) {
      list.push({
        id: `cn-${cn.id}`,
        type: cn.type === 'infraction_logged' ? 'violation' : 'system',
        title: cn.title,
        description: cn.message,
        timeAgo: 'إشعار المرشد',
        isUrgent: cn.type === 'infraction_logged' || cn.type === 'followup_due',
        studentId: cn.studentId,
        studentName: cn.studentName,
        studentNumber: cn.studentNumber,
        studentCommunity: cn.grade ? `${cn.grade}${cn.section ? ` • ${cn.section}` : ''}` : undefined,
        tabTarget: (cn.targetTab as NavTab) || 'forms',
      });
    }

    // 1. Critical Tardiness (>= 3 times) - High Priority Follow-up
    const tardyStudents = students.filter((s) => (s.totalTardiness || 0) >= 3);
    for (const s of tardyStudents.slice(0, 6)) {
      list.push({
        id: `tardy-${s.id}`,
        type: 'tardiness',
        title: `تنبيه تأخير متكرر: ${s.totalTardiness} مرات`,
        description: `تجاوز الطالب ${s.fullName} حد الـ 3 تأخيرات المسموحة، يستوجب إشعار ولي الأمر وتوقيع تعهد.`,
        timeAgo: 'طابور الصباح',
        isUrgent: true,
        studentId: s.id,
        studentName: s.fullName,
        studentNumber: String(s.studentNumber),
        studentCommunity: `${s.grade} • ${s.section}`,
        tabTarget: 'tardiness',
      });
    }

    // 2. Critical Absences (>= 3 days)
    const absenceStudents = students.filter((s) => (s.totalAbsences || 0) >= 3);
    for (const s of absenceStudents.slice(0, 5)) {
      list.push({
        id: `absence-${s.id}`,
        type: 'absence',
        title: `تنبيه غياب متكرر: ${s.totalAbsences} أيام`,
        description: `تكرار غياب الطالب ${s.fullName} يتطلب تدقيق الأعذار الطبية أو اتخاذ إجراءات الدليل الإجرائي.`,
        timeAgo: 'اليوم',
        isUrgent: (s.totalAbsences || 0) >= 5,
        studentId: s.id,
        studentName: s.fullName,
        studentNumber: String(s.studentNumber),
        studentCommunity: `${s.grade} • ${s.section}`,
        tabTarget: 'absences',
      });
    }

    // 3. Open Violations (Incidents needing decision / action)
    const openViolations = (violations || []).filter(
      (v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب'
    );
    for (const v of openViolations.slice(0, 5)) {
      list.push({
        id: `violation-${v.id}`,
        type: 'violation',
        title: `مخالفة سلوكية قيد المتابعة ${v.violationDegree ? `(الدرجة ${v.violationDegree})` : ''}`,
        description: `واقعة قيد المتابعة: ${v.description || (v as any).incidentDescription || 'مخالفة سلوكية'} للطالب ${v.studentName || 'طالب'}.`,
        timeAgo: v.date || 'حديثاً',
        isUrgent: v.violationDegree === 3 || v.violationDegree === 4,
        studentId: v.studentId,
        studentName: v.studentName,
        tabTarget: 'violations',
      });
    }

    // 4. Default System Readiness Status if no active alerts
    if (list.length === 0) {
      list.push({
        id: 'system-ready',
        type: 'system',
        title: 'المنظومة محدثة وكافة السجلات منتظمة',
        description: 'لا توجد تنبيهات عاجلة معلقة حالياً. بيانات الحضور والانضباط مطابقة لتعليمات الوزارة.',
        timeAgo: 'الآن',
        isUrgent: false,
        tabTarget: 'dashboard',
      });
    }

    return list;
  }, [students, violations, storedCounselorNotes]);

  const filteredNotifications = useMemo(() => {
    return rawNotifications.filter((n) => {
      if (notificationFilter === 'urgent') return n.isUrgent;
      if (notificationFilter === 'attendance') return n.type === 'tardiness' || n.type === 'absence';
      if (notificationFilter === 'violations') return n.type === 'violation';
      return true;
    });
  }, [rawNotifications, notificationFilter]);

  const unreadCount = useMemo(() => {
    return rawNotifications.filter(
      (n) => !readNotificationIds.has(n.id) && n.id !== 'system-ready'
    ).length;
  }, [rawNotifications, readNotificationIds]);

  const handleMarkAllAsRead = () => {
    setReadNotificationIds(new Set(rawNotifications.map((n) => n.id)));
    acknowledgeAllCounselorNotifications();
  };

  const handleNotificationClick = (item: HeaderNotificationItem) => {
    setReadNotificationIds((prev) => new Set([...prev, item.id]));
    if (item.id.startsWith('cn-')) {
      acknowledgeCounselorNotification(item.id.replace(/^cn-/, ''));
    }
    setIsNotificationsOpen(false);
    if (item.studentId && onOpenStudentProfile) {
      onOpenStudentProfile(item.studentId);
    } else if (item.tabTarget && onNavigate) {
      onNavigate(item.tabTarget);
    }
  };

  // Comprehensive Student Search Filter (by full name, student number, grade, section)
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || students.length === 0) return [];

    return students
      .filter((s) => {
        const nameMatch = s.fullName?.toLowerCase().includes(q);
        const numberMatch = String(s.studentNumber || '').toLowerCase().includes(q);
        const gradeMatch = String(s.grade || '').toLowerCase().includes(q);
        const sectionMatch = String(s.section || '').toLowerCase().includes(q);
        const phoneMatch = String(s.parentPhone || '').includes(q);
        return nameMatch || numberMatch || gradeMatch || sectionMatch || phoneMatch;
      })
      .slice(0, 8);
  }, [searchQuery, students]);

  const handleSelectStudent = (studentId: string) => {
    if (onOpenStudentProfile) {
      onOpenStudentProfile(studentId);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const getRoleArabicLabel = (role?: UserRole | string): string => {
    switch (role) {
      case 'systemAdmin':
        return 'مدير النظام';
      case 'schoolAdmin':
        return 'مدير المدرسة';
      case 'counselor':
        return 'المرشد الأكاديمي والمهني';
      case 'viewer':
        return 'مشاهد';
      default:
        return 'مستخدم مسجل';
    }
  };

  const isSystemAdmin = counselor?.role === 'systemAdmin';
  const userName = (counselor as any)?.fullName || (counselor as any)?.name || 'المستخدم';

  return (
    <header
      ref={headerRef}
      id="app-header"
      className="no-print bg-white dark:bg-[#0C2340] text-slate-800 dark:text-slate-100 border-b border-slate-200/90 dark:border-slate-800/90 shadow-xs sticky top-0 z-30 transition-colors duration-200"
    >
      {/* Main Header Bar: White & Clean */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2.5 gap-3 sm:gap-4">
          {/* Right Side: School Emblem & Name + Mobile Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              id="btn-toggle-mobile-sidebar"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
              title="فتح قائمة التنقل"
              aria-label="فتح قائمة التنقل"
            >
              <Menu className="w-5 h-5 text-[#006D77] dark:text-teal-300" />
            </button>

            {/* School Emblem (Navy #0B2748 with Gold #C9A227) */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#0B2748] to-[#12395B] border-2 border-[#C9A227] flex items-center justify-center shadow-xs text-[#C9A227] shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0B2748]/10 dark:bg-[#12395B] text-[#0B2748] dark:text-[#C9A227] border border-[#C9A227]/40">
                  <EditableText labelKey="header.educationStage" defaultText={`${schoolSettings.schoolCycle}`} />
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FAF7EF] dark:bg-amber-950/40 text-[#A67C00] dark:text-[#C9A227] border border-[#C9A227]/45">
                  <EditableText labelKey="header.academicYear" defaultText={`العام الدراسي ${schoolSettings.academicYear}`} />
                </span>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-[#0B2748] dark:text-white mt-0.5 leading-tight">
                <EditableText labelKey="header.schoolName" defaultText="أكاديمية الفجيرة العلمية الإسلامية" />
              </h1>
              <p className="text-[11px] text-[#A67C00] dark:text-[#C9A227] font-bold hidden md:block">
                <EditableText labelKey="header.appName" defaultText="البوابة الإلكترونية الرسمية ونظام الرعاية الطلابية الذكي" />
              </p>
            </div>
          </div>

          {/* Center: Comprehensive Live Student Search Bar */}
          <div ref={searchContainerRef} className="relative hidden md:block flex-1 max-w-md mx-2">
            <div className="relative">
              <input
                id="header-quick-search"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredStudents.length > 0) {
                    handleSelectStudent(filteredStudents[0].id);
                  }
                }}
                placeholder="بحث شامل عن طالب بالاسم أو الرقم الطلابي (#1001)..."
                className="w-full bg-[#F6F8FB] dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-[#006D77] dark:focus:border-teal-400 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl py-2.5 pr-9 pl-12 transition-all outline-none shadow-2xs"
              />
              <Search className="w-4 h-4 text-[#006D77] dark:text-teal-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none shadow-2xs">
                  ⌘K
                </kbd>
              )}
            </div>

            {/* Comprehensive Search Autocomplete Results Dropdown */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute top-full mt-2 right-0 left-0 bg-white dark:bg-[#0C2340] border border-[#006D77]/40 rounded-2xl shadow-xl p-2.5 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#006D77] dark:text-teal-300 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>نتائج البحث للطلبة ({filteredStudents.length})</span>
                  <span className="text-[10px] text-slate-400">اضغط لفتح الملف الشامل</span>
                </div>

                {filteredStudents.length > 0 ? (
                  <div className="space-y-1 mt-1.5 max-h-80 overflow-y-auto">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectStudent(s.id)}
                        className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer flex items-center justify-between text-xs transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-200/60 dark:border-teal-800/60">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{s.fullName}</span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>الصف {s.grade} ({s.section})</span>
                              <span>•</span>
                              <span className="font-mono">#{s.studentNumber}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {(s.totalTardiness || 0) > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold">
                              {s.totalTardiness} تأخير
                            </span>
                          )}
                          <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                    لا يوجد طالب مطابق لهذا البحث
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Left Side: Clock, Theme toggle, Labels Customizer, User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live UAE Clock */}
            <div className="hidden xl:flex items-center gap-2 bg-[#F6F8FB] dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-[#006D77] dark:text-teal-300" />
              <div className="leading-tight text-right">
                <span className="text-[9px] text-slate-400 block font-medium">توقيت الإمارات</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                  {currentTime || '08:00:00 ص'}
                </span>
              </div>
            </div>

            {/* Quick Access to Official Academy Portal */}
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('academy-portal')}
                title="البوابة الإلكترونية الرسمية لأكاديمية الفجيرة العلمية الإسلامية"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer bg-[#0B2748] hover:bg-[#12395B] text-[#C9A227] border-[#C9A227]/60 shadow-2xs"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#C9A227]" />
                <span className="hidden lg:inline text-[11px]">بوابة الأكاديمية والخدمات</span>
              </button>
            )}

            {/* School Settings Button */}
            {onOpenSchoolSettings && (
              <button
                type="button"
                id="btn-header-school-settings"
                onClick={onOpenSchoolSettings}
                title="إعدادات وتخصيص هوية الأكاديمية"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer bg-[#FAF7EF] dark:bg-slate-800 hover:bg-[#C9A227]/20 text-[#0B2748] dark:text-[#C9A227] border-[#C9A227]/50 shadow-2xs"
              >
                <School className="w-3.5 h-3.5 text-[#A67C00] dark:text-[#C9A227]" />
                <span className="hidden lg:inline text-[11px]">بيانات الأكاديمية</span>
              </button>
            )}

            {/* Notification Bell Button & Interactive Dropdown */}
            <div className="relative" ref={notificationsContainerRef}>
              <button
                type="button"
                id="btn-header-notifications"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                title="الإشعارات والتنبيهات المباشرة"
                aria-expanded={isNotificationsOpen}
                aria-label="عرض التنبيهات المدرسية"
                className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                  isNotificationsOpen
                    ? 'bg-[#006D77] text-white border-[#006D77] shadow-sm ring-2 ring-teal-400/40'
                    : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                <Bell className={`w-4 h-4 ${isNotificationsOpen ? 'text-white' : 'text-[#006D77] dark:text-teal-300'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#D4AF37] text-slate-950 text-[10px] font-black flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Popover Panel */}
              {isNotificationsOpen && (
                <div
                  role="dialog"
                  aria-label="مركز التنبيهات المدرسية"
                  dir="rtl"
                  className="absolute left-0 sm:-left-6 top-full mt-2 w-[340px] sm:w-[420px] max-w-[95vw] bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-[#1E3A5F] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* Header Bar */}
                  <div className="bg-[#091C33] text-white p-3.5 border-b border-[#16355C] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#006D77] text-[#D4AF37] flex items-center justify-center font-bold">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black text-white">مركز التنبيهات المباشرة</h3>
                          {unreadCount > 0 ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#D4AF37] text-slate-950 font-black">
                              {unreadCount} تنبيه نشط
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                              مكتمل
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          متابعة الانضباط والتأخير والغياب والمخالفات
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          title="تحديد كافة التنبيهات كمقروءة"
                          className="flex items-center gap-1 text-[10px] font-bold text-teal-300 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">قراءة الكل</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="إغلاق التنبيهات"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Subtabs */}
                  <div className="flex items-center gap-1 p-2 bg-[#F6F8FB] dark:bg-[#07172B] border-b border-slate-200 dark:border-[#16355C] overflow-x-auto text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        notificationFilter === 'all'
                          ? 'bg-[#006D77] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      الكل ({rawNotifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('urgent')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        notificationFilter === 'urgent'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>عاجل ({rawNotifications.filter((n) => n.isUrgent).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('attendance')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        notificationFilter === 'attendance'
                          ? 'bg-[#006D77] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      التأخير والغياب ({rawNotifications.filter((n) => n.type === 'tardiness' || n.type === 'absence').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('violations')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        notificationFilter === 'violations'
                          ? 'bg-[#006D77] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      المخالفات ({rawNotifications.filter((n) => n.type === 'violation').length})
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((item) => {
                        const isRead = readNotificationIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleNotificationClick(item)}
                            className={`p-3 transition-colors cursor-pointer flex items-start gap-3 text-right group ${
                              !isRead
                                ? 'bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            {/* Notification Icon */}
                            <div className="shrink-0 mt-0.5">
                              {item.type === 'tardiness' && (
                                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center justify-center">
                                  <Clock className="w-4 h-4" />
                                </div>
                              )}
                              {item.type === 'absence' && (
                                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center justify-center">
                                  <UserX className="w-4 h-4" />
                                </div>
                              )}
                              {item.type === 'violation' && (
                                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center justify-center">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                              )}
                              {item.type === 'system' && (
                                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 border border-teal-300 dark:border-teal-800 flex items-center justify-center">
                                  <ShieldAlert className="w-4 h-4" />
                                </div>
                              )}
                            </div>

                            {/* Notification Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className={`text-xs font-black truncate block ${
                                  !isRead ? 'text-[#0C2340] dark:text-white' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                  {item.title}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {item.isUrgent && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-600 text-white">
                                      عاجل
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {item.timeAgo}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                                {item.description}
                              </p>

                              {item.studentName && (
                                <div className="mt-2 flex items-center justify-between text-[10px]">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                                    <User className="w-3 h-3 text-[#006D77]" />
                                    <span>{item.studentName}</span>
                                    {item.studentCommunity && (
                                      <span className="text-slate-400">({item.studentCommunity})</span>
                                    )}
                                  </span>

                                  <span className="text-[#006D77] dark:text-teal-300 font-bold flex items-center gap-0.5 group-hover:-translate-x-0.5 transition-transform">
                                    <span>فتح الملف والمتابعة</span>
                                    <ArrowLeft className="w-3 h-3" />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                          <CheckCheck className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          لا توجد تنبيهات في هذا التصنيف
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          كافة السجلات والمتابعات منتظمة وفق المطلوب
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-2.5 bg-[#F6F8FB] dark:bg-[#07172B] border-t border-slate-200 dark:border-[#16355C] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>تحديث فوري من قاعدة البيانات</span>
                    </span>

                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNotificationsOpen(false);
                          onNavigate('dashboard');
                        }}
                        className="text-[11px] font-bold text-[#006D77] dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>لوحة المتابعات الكاملة</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current User Profile Pill */}
            {counselor && (
              <button
                type="button"
                id="btn-header-user-settings"
                onClick={onOpenUserSettings}
                title="إعدادات المستخدم والملف الشخصي"
                className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-[#006D77] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer group text-right shadow-2xs"
              >
                <div className="w-7 h-7 rounded-lg bg-[#006D77] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                  {'photoURL' in counselor && counselor.photoURL ? (
                    <img
                      src={counselor.photoURL}
                      alt={userName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Shield className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight group-hover:text-[#006D77] dark:group-hover:text-teal-200 transition-colors">
                    {userName}
                  </span>
                  <span className="text-[10px] text-[#006D77] dark:text-teal-300 leading-none block font-medium">
                    {getRoleArabicLabel(counselor.role)}
                  </span>
                </div>
              </button>
            )}

            {/* Logout Button */}
            {counselor && (
              <button
                type="button"
                id="btn-logout"
                onClick={onLogout}
                title="تسجيل الخروج"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800/40 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">خروج</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
