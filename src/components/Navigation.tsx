import React, { useState } from 'react';
import {
  LayoutDashboard,
  Home,
  Sparkles,
  FolderKanban,
  Scale,
  FileSignature,
  Users,
  BarChart3,
  Clock,
  MessageSquare,
  UserCog,
  AlertTriangle,
  ShieldCheck,
  Settings,
  ChevronsRight,
  ChevronsLeft,
  X,
  GraduationCap,
  Pencil,
  UserX,
  Briefcase,
  ChevronDown,
  Send,
  FileText,
  History,
} from 'lucide-react';
import { DashboardStats, UserRole } from '../types';
import { useCustomLabels } from '../context/CustomLabelsContext';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

export type NavTab =
  | 'academy-portal'
  | 'dashboard'
  | 'intake'
  | 'cases'
  | 'bylaws'
  | 'forms'
  | 'committee'
  | 'employees'
  | 'reports'
  | 'students'
  | 'absences'
  | 'tardiness'
  | 'violations'
  | 'warning-form'
  | 'messages'
  | 'users'
  | 'settings';

export type CommunicationSubPage =
  | 'dashboard'
  | 'new-message'
  | 'attendance-tardiness'
  | 'behavior-notices'
  | 'bulk-messages'
  | 'templates'
  | 'communication-log'
  | 'communication-reports'
  | 'communication-settings';

export const COMMUNICATION_SUB_PAGES: Array<{
  id: CommunicationSubPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'لوحة التواصل الرئيسية', icon: LayoutDashboard },
  { id: 'new-message', label: 'رسالة جديدة', icon: Send },
  { id: 'attendance-tardiness', label: 'رسائل الغياب والتأخير', icon: Clock },
  { id: 'behavior-notices', label: 'إشعارات السلوك', icon: ShieldCheck },
  { id: 'bulk-messages', label: 'الرسائل الجماعية', icon: Users },
  { id: 'templates', label: 'قوالب الرسائل', icon: FileText },
  { id: 'communication-log', label: 'سجل التواصل', icon: History },
  { id: 'communication-reports', label: 'تقارير التواصل', icon: BarChart3 },
  { id: 'communication-settings', label: 'إعدادات التواصل', icon: Settings },
];

export interface NavigationProps {
  currentTab: NavTab | string;
  onSelectTab?: (tab: NavTab) => void;
  onTabChange?: (tab: NavTab) => void;
  activeCommSubPage?: CommunicationSubPage;
  onSelectCommSubPage?: (subPage: CommunicationSubPage) => void;
  stats?: DashboardStats;
  tardyTodayCount?: number;
  absencesTodayCount?: number;
  openViolationsCount?: number;
  unconfirmedMessagesCount?: number;
  userRole?: UserRole;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  badgeColor?: string;
  isHighlight?: boolean;
  hidden?: boolean;
}

const STORAGE_COLLAPSED_KEY = 'al_khalil_sidebar_collapsed';

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onTabChange,
  activeCommSubPage = 'dashboard',
  onSelectCommSubPage,
  stats,
  tardyTodayCount,
  absencesTodayCount,
  openViolationsCount,
  unconfirmedMessagesCount,
  userRole,
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Local storage collapse state (if not controlled externally)
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COLLAPSED_KEY);
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [isCommMenuExpanded, setIsCommMenuExpanded] = useState<boolean>(true);
  const [internalCommSubPage, setInternalCommSubPage] = useState<CommunicationSubPage>(activeCommSubPage);

  React.useEffect(() => {
    setInternalCommSubPage(activeCommSubPage);
  }, [activeCommSubPage]);

  React.useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<CommunicationSubPage>).detail;
      if (detail) {
        setInternalCommSubPage(detail);
      }
    };
    window.addEventListener('fujairah:comm-subpage-changed', handler);
    return () => window.removeEventListener('fujairah:comm-subpage-changed', handler);
  }, []);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggleCollapse = () => {
    if (controlledToggleCollapse) {
      controlledToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_COLLAPSED_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  };

  const handleSelect = (tab: NavTab) => {
    if (onSelectTab) onSelectTab(tab);
    if (onTabChange) onTabChange(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectCommPage = (subPage: CommunicationSubPage) => {
    setInternalCommSubPage(subPage);
    if (onSelectCommSubPage) {
      onSelectCommSubPage(subPage);
    }
    window.dispatchEvent(new CustomEvent('fujairah:comm-subpage', { detail: subPage }));
    if (onSelectTab) onSelectTab('messages');
    if (onTabChange) onTabChange('messages');
    if (onCloseMobile) onCloseMobile();
  };

  const safeTotalStudents = stats?.totalStudents ?? 0;
  const safeTardyToday = stats?.tardyTodayCount ?? tardyTodayCount ?? 0;
  const safeOpenViolations = stats?.openViolationsCount ?? openViolationsCount ?? 0;
  const safeCriticalTardiness = stats?.criticalTardinessCount ?? 0;
  const safeUnconfirmedMessages = unconfirmedMessagesCount ?? 0;

  const canManageUsers = userRole === 'systemAdmin' || userRole === 'schoolAdmin' || userRole === 'system_owner' || userRole === 'school_admin';
  const { t, isLiveEditMode, openCustomizer } = useCustomLabels();

  // Navigation Items Definition organized in logical groups without duplicate pages
  const navItems: NavItemDef[] = [
    // 0. البوابة الرسمية للأكاديمية
    {
      id: 'academy-portal',
      group: 'البوابة الإلكترونية الرسمية',
      label: t('nav.academyPortal', 'بوابة أكاديمية الفجيرة والخدمات'),
      icon: Sparkles,
      isHighlight: true,
      badge: 'رسمي',
      badgeColor: 'bg-[#C9A227] text-[#0B2748] font-black',
    },
    // 1. إدارة الطلبة
    {
      id: 'dashboard',
      group: 'إدارة الطلبة',
      label: t('nav.dashboard', 'لوحة التحكم العامة'),
      icon: Home,
      badge: safeCriticalTardiness > 0 ? `${safeCriticalTardiness} تنبيه` : null,
      badgeColor: 'bg-[#C9A227] text-[#0B2748] font-black',
    },
    {
      id: 'students',
      group: 'إدارة الطلبة',
      label: t('nav.students', 'سجل الطلبة والملف الموحد'),
      icon: Users,
      badge: safeTotalStudents > 0 ? safeTotalStudents : null,
      badgeColor: 'bg-white/15 text-slate-200 border border-white/10',
    },
    // 2. الإرشاد والرعاية والبرامج
    {
      id: 'cases',
      group: 'الإرشاد والرعاية والبرامج',
      label: t('nav.cases', 'منظومة المرشد والحالات والخطط'),
      icon: FolderKanban,
      isHighlight: true,
    },
    // 3. الانضباط والسلوك
    {
      id: 'absences',
      group: 'الانضباط والسلوك',
      label: t('nav.absences', 'الغياب والحضور'),
      icon: UserX,
      badge: absencesTodayCount && absencesTodayCount > 0 ? absencesTodayCount : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold',
    },
    {
      id: 'tardiness',
      group: 'الانضباط والسلوك',
      label: t('nav.tardiness', 'التأخر الصباحي'),
      icon: Clock,
      badge: safeTardyToday > 0 ? safeTardyToday : null,
      badgeColor: 'bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold',
    },
    {
      id: 'violations',
      group: 'الانضباط والسلوك',
      label: t('nav.violations', 'المخالفات السلوكية'),
      icon: AlertTriangle,
      badge: safeOpenViolations > 0 ? safeOpenViolations : null,
      badgeColor: 'bg-rose-500/25 text-rose-300 border border-rose-500/40',
    },
    {
      id: 'committee',
      group: 'الانضباط والسلوك',
      label: t('nav.committee', 'لجنة إدارة السلوك'),
      icon: ShieldCheck,
    },
    {
      id: 'forms',
      group: 'الانضباط والسلوك',
      label: t('nav.forms', 'النماذج والتوقيعات'),
      icon: FileSignature,
    },
    // 4. التواصل مع أولياء الأمور (مركز التواصل الذكي)
    {
      id: 'messages',
      group: 'التواصل مع أولياء الأمور',
      label: t('nav.messages', 'مركز التواصل الذكي'),
      icon: MessageSquare,
      isHighlight: true,
      badge: safeUnconfirmedMessages > 0 ? safeUnconfirmedMessages : 'ذكي',
      badgeColor: 'bg-[#C9A227] text-[#0B2748] font-black',
    },
    {
      id: 'employees',
      group: 'التواصل والتوثيق',
      label: t('nav.employees', 'الكادر والاجتماعات والشراكات'),
      icon: Briefcase,
    },
    // 5. الإدارة والتقارير
    {
      id: 'reports',
      group: 'الإدارة والتقارير',
      label: t('nav.reports', 'التقارير والإحصائيات'),
      icon: BarChart3,
    },
    {
      id: 'users',
      group: 'الإدارة والتقارير',
      label: t('nav.users', 'المستخدمون والصلاحيات'),
      icon: UserCog,
      hidden: !canManageUsers,
    },
    {
      id: 'settings',
      group: 'الإدارة والتقارير',
      label: t('nav.settings', 'الإعدادات'),
      icon: Settings,
    },
  ];

  // Render navigation item button
  const renderItem = (item: NavItemDef) => {
    if (item.hidden) return null;

    const Icon = item.icon;
    const exactActive = currentTab === item.id;
    const isActive = exactActive;
    const isMessagesHub = item.id === 'messages';

    return (
      <div key={item.id} className="relative group w-full space-y-1">
        <button
          type="button"
          id={`sidebar-nav-${item.id}`}
          onClick={() => {
            if (isMessagesHub && !isCollapsed) {
              if (currentTab === 'messages') {
                setIsCommMenuExpanded((prev) => !prev);
              } else {
                setIsCommMenuExpanded(true);
                handleSelect('messages');
              }
            } else {
              handleSelect(item.id);
            }
          }}
          title={isCollapsed ? item.label : undefined}
          className={`w-full flex items-center transition-all duration-150 cursor-pointer rounded-xl font-medium select-none ${
            isCollapsed
              ? 'justify-center p-3 h-11'
              : 'justify-between px-3 py-2 text-xs sm:text-sm'
          } ${
            exactActive
              ? 'bg-[#006D77] text-white shadow-md shadow-[#006D77]/40 font-bold ring-1 ring-[#5CE1E6]/40'
              : isActive
              ? 'bg-[#006D77]/80 text-white font-semibold'
              : item.isHighlight
              ? 'bg-gradient-to-r from-teal-900/60 to-[#0C2340] text-teal-200 border border-teal-500/40 hover:bg-teal-900/80 hover:text-white'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
            <Icon
              className={`shrink-0 transition-transform duration-150 ${
                isCollapsed ? 'w-5 h-5' : 'w-4.5 h-4.5'
              } ${
                exactActive || isActive
                  ? 'text-teal-200 scale-105'
                  : item.isHighlight
                  ? 'text-[#D4AF37]'
                  : 'text-slate-400 group-hover:text-teal-300'
              }`}
            />
            {!isCollapsed && (
              <span className="truncate text-right font-semibold flex items-center gap-1.5">
                <span>{item.label}</span>
                {isLiveEditMode && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      openCustomizer('nav');
                    }}
                    title="تعديل مسمى هذا التبويب في المحرر"
                    className="opacity-75 hover:opacity-100 p-0.5 rounded text-amber-400 hover:text-amber-300 hover:bg-amber-400/20 cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Badges in expanded mode */}
            {!isCollapsed && item.badge !== undefined && item.badge !== null && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 font-sans ${
                  exactActive ? 'bg-white/25 text-white' : item.badgeColor || 'bg-white/15 text-slate-200'
                }`}
              >
                {item.badge}
              </span>
            )}

            {!isCollapsed && isMessagesHub && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#D4AF37] transition-transform duration-200 ${
                  isCommMenuExpanded ? 'rotate-180' : ''
                }`}
              />
            )}
          </div>

          {/* Small dot indicator in collapsed mode if there is a badge */}
          {isCollapsed && item.badge !== undefined && item.badge !== null && (
            <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-[#0C2340]" />
          )}
        </button>

        {/* Sub-menu for التواصل مع أولياء الأمور (Smart Parent Communication Center 9 pages) */}
        {!isCollapsed && isMessagesHub && isCommMenuExpanded && (
          <div className="mr-3 pr-2.5 border-r border-[#C9A227]/40 space-y-0.5 py-1">
            {COMMUNICATION_SUB_PAGES.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = currentTab === 'messages' && internalCommSubPage === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSelectCommPage(sub.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-right ${
                    isSubActive
                      ? 'bg-[#C9A227] text-[#0B2748] shadow-xs font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <SubIcon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSubActive ? 'text-[#0B2748]' : 'text-[#C9A227]/80'
                    }`}
                  />
                  <span className="truncate">{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Floating Tooltip in Collapsed Mode (Left side of right sidebar) */}
        {isCollapsed && (
          <div
            role="tooltip"
            className="pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-3 z-50 px-3 py-1.5 bg-[#091C33] text-white text-xs font-bold rounded-xl shadow-xl whitespace-nowrap border border-[#16355C] hidden group-hover:flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
          >
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge !== null && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#006D77] text-white font-bold">
                {item.badge}
              </span>
            )}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-[#16355C]" />
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full select-none text-slate-100 bg-[#0C2340]" dir="rtl">
      {/* Sidebar Header with Navy background & School Branding */}
      <div
        className={`shrink-0 flex items-center border-b border-[#16355C] p-3 bg-[#091C33] ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#A67C00] border border-[#C9A227]/50 flex items-center justify-center text-[#0B2748] shadow-xs shrink-0">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div className="truncate">
              <span className="text-xs font-black text-white block truncate tracking-tight">
                أكاديمية الفجيرة العلمية الإسلامية
              </span>
              <span className="text-[10px] text-[#C9A227] block truncate font-medium">
                نظام الرعاية والتواصل الذكي
              </span>
            </div>
          </div>
        )}

        {/* Double arrow collapse/expand button */}
        <button
          type="button"
          id="btn-toggle-sidebar"
          onClick={handleToggleCollapse}
          title={isCollapsed ? 'توسيع القائمة (260px)' : 'طي القائمة (72px)'}
          aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 border border-[#16355C] ${
            isCollapsed ? 'bg-white/5 shadow-xs' : ''
          }`}
        >
          {isCollapsed ? (
            <ChevronsLeft className="w-4.5 h-4.5 text-teal-300" />
          ) : (
            <ChevronsRight className="w-4.5 h-4.5 text-slate-300" />
          )}
        </button>
      </div>

      {/* Independently Scrollable Navigation List Organized by Group */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
        {navItems
          .filter((item) => !item.hidden)
          .map((item, idx, arr) => {
            const showGroupHeader = !isCollapsed && (idx === 0 || arr[idx - 1].group !== item.group);
            return (
              <React.Fragment key={item.id}>
                {showGroupHeader && (
                  <div className="px-2.5 pt-2.5 pb-1 text-[10px] font-black text-[#D4AF37]/90 tracking-wide">
                    {item.group}
                  </div>
                )}
                {renderItem(item)}
              </React.Fragment>
            );
          })}
      </div>

      {/* Sidebar Footer Badge */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#16355C] bg-[#091C33] text-[10px] text-slate-400 flex items-center justify-between">
          <span className="text-[#D4AF37] font-semibold">2026–2027</span>
          <span>الصفوف (5 - 12)</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Sidebar (Navy #0C2340 on right side in RTL) */}
      <aside
        id="desktop-sidebar"
        dir="rtl"
        style={{
          width: isCollapsed ? '72px' : '260px',
          top: 'var(--app-header-height, 104px)',
          height: 'calc(100vh - var(--app-header-height, 104px))',
          maxHeight: 'calc(100vh - var(--app-header-height, 104px))',
        }}
        className="no-print hidden lg:flex flex-col shrink-0 bg-[#0C2340] border-l border-[#16355C] shadow-lg transition-[width] duration-250 ease-in-out z-20 sticky"
      >
        {sidebarContent}
      </aside>

      {/* 2. Mobile & Tablet Sliding Drawer Overlay */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="no-print fixed inset-0 z-50 lg:hidden flex justify-start"
          dir="rtl"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-over Drawer from Right (Navy #0C2340) */}
          <div className="relative w-[280px] max-w-[85vw] h-full bg-[#0C2340] text-slate-100 border-l border-[#16355C] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
            {/* Mobile Drawer Header */}
            <div className="p-3 border-b border-[#16355C] flex items-center justify-between bg-[#091C33]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#006D77] flex items-center justify-center text-[#D4AF37] font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-white block">
                    مركز التواصل الذكي مع أولياء الأمور
                  </span>
                  <span className="text-[10px] text-teal-300 block">
                    {schoolSettings.schoolName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Drawer Navigation List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
              {navItems
                .filter((item) => !item.hidden)
                .map((item) => {
                  const Icon = item.icon;
                  const exactActive = currentTab === item.id;
                  const isMessagesHub = item.id === 'messages';
                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        type="button"
                        id={`mobile-sidebar-nav-${item.id}`}
                        onClick={() => handleSelect(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
                          exactActive
                            ? 'bg-[#006D77] text-white shadow-sm font-bold ring-1 ring-[#5CE1E6]/40'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4.5 h-4.5 ${
                              exactActive ? 'text-teal-200' : 'text-slate-400'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge !== null && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-sans ${
                              exactActive
                                ? 'bg-white/25 text-white'
                                : item.badgeColor || 'bg-white/15 text-slate-200'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>

                      {isMessagesHub && (
                        <div className="mr-3 pr-2.5 border-r border-[#C9A227]/40 space-y-0.5 py-1">
                          {COMMUNICATION_SUB_PAGES.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubActive = currentTab === 'messages' && internalCommSubPage === sub.id;
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => handleSelectCommPage(sub.id)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer text-right ${
                                  isSubActive
                                    ? 'bg-[#C9A227] text-[#0B2748] font-black'
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                              >
                                <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-[#0B2748]' : 'text-[#C9A227]'}`} />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
