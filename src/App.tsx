import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Student,
  CounselorUser,
  TardinessRecord,
  AbsenceRecord,
  ViolationRecord,
  WarningFormRecord,
  ParentSummonFormRecord,
  ViolationReportRecord,
  ParentNoticeFormRecord,
  AppUser,
  UserRole,
  DashboardStats,
  GradeLevel,
  SectionName,
  AcademicTrack,
  TrackAuditLog,
  QueueItem,
} from './types';
import {
  subscribeToAuth,
  logoutUser,
  AuthStateResolution,
  checkUserRegistrationStatus,
} from './firebase/auth';
import {
  fetchStudents,
  fetchMorningDelays,
  fetchAbsences,
  fetchViolations,
  fetchWarningForms,
  saveStudent,
  updateStudentRecord,
  deleteStudent,
  deleteStudentsBatch,
  deleteAllStudentsFromSchool,
  saveStudentsBatch,
  deleteImportBatch,
  addMorningDelay,
  batchAddMorningDelays,
  updateMorningDelay,
  deleteMorningDelay,
  batchDeleteMorningDelays,
  deleteAllMorningDelays,
  batchAddAbsences,
  updateAbsence as updateAbsenceFirestore,
  deleteAbsence as deleteAbsenceFirestore,
  addViolation,
  updateViolation,
  deleteViolation as deleteViolationFirestore,
  saveWarningForm,
  fetchParentSummonForms,
  saveParentSummonForm,
  deleteParentSummonForm,
  fetchViolationReports,
  saveViolationReport,
  deleteViolationReport,
  fetchParentNoticeForms,
  saveParentNoticeForm,
  deleteParentNoticeForm,
  purgeLocalDemoData,
  ensureDefaultSchoolExists,
} from './firebase/firestoreService';
import {
  getStoredTheme,
  setStoredTheme,
  getStudents,
  saveStudents,
  updateStudentsTrack,
  deleteViolation as deleteViolationLocal,
  getParentSummonForms,
  saveParentSummonFormLocal,
  deleteParentSummonFormLocal,
  getViolationReports,
  saveViolationReportLocal,
  deleteViolationReportLocal,
  getParentNoticeForms,
  saveParentNoticeFormLocal,
  deleteParentNoticeFormLocal,
  getAbsences,
  saveAbsencesLocal,
  batchAddAbsencesLocal,
  deleteAbsenceLocal,
  getTardinessRecords,
  saveTardinessRecordsLocal,
  saveViolationsLocal,
  addTardinessRecordsBatch,
  deleteTardinessRecord,
  deleteTardinessRecordsBatch,
  clearAllTardinessRecordsLocal,
  getParentCommitmentForms,
  notifyLinearWarningFormSaved,
  notifyParentWrittenNoticeSaved,
  notifyInfractionLogged,
  syncStudentFollowUpNotifications,
} from './storage';
import { getUaeTodayDateString } from './utils/time';
import {
  normalizeCanonicalGrade,
  getUniqueStudentTardinessDates,
} from './hooks/useAcademicFiltering';
import {
  processApprovedTardinessBatchNotifications,
  processApprovedAbsenceBatchNotifications,
} from './firebase/gmailNotificationService';

// Shared Components
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { Toast, ToastType } from './components/Toast';
import { AddStudentModal } from './components/AddStudentModal';
import { EditStudentModal } from './components/EditStudentModal';
import { ManageStudentsModal } from './components/ManageStudentsModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { TrackCorrectionModal } from './components/TrackCorrectionModal';

// Pages & Modals
import { LoginPage } from './pages/LoginPage';
import { RegistrationRequestPage } from './pages/RegistrationRequestPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { AbsencePage } from './pages/AbsencePage';
import { TardinessPage } from './pages/TardinessPage';
import { ViolationsPage } from './pages/ViolationsPage';
import { WarningFormPage } from './pages/WarningFormPage';
import { FormsPage, FormTabType } from './pages/FormsPage';
import { BylawsPage } from './pages/BylawsPage';
import { StudentProfileModal } from './pages/StudentProfileModal';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { MessagesPage } from './pages/MessagesPage';
import { CounselingCasesPage } from './pages/cases/CounselingCasesPage';
import { CommitteePage } from './pages/CommitteePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ReportsSettingsPage } from './pages/ReportsSettingsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserSettingsModal } from './components/UserSettingsModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { CounselorNotificationBanner } from './components/CounselorNotificationBanner';
import { AcademyPortalPage } from './pages/AcademyPortalPage';
import { useCustomLabels } from './context/CustomLabelsContext';
import { useSchoolSettings } from './context/SchoolSettingsContext';
import { Loader2, AlertCircle, ArrowUp, GraduationCap } from 'lucide-react';

export default function App() {
  const { setSchoolId } = useCustomLabels();
  const { schoolSettings } = useSchoolSettings();
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authResolution, setAuthResolution] = useState<AuthStateResolution>({ status: 'loading' });
  const [isEditingRequest, setIsEditingRequest] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Navigation State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [showPublicPortalBeforeLogin, setShowPublicPortalBeforeLogin] = useState<boolean>(true);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto redirect if user was on the removed intake page
  useEffect(() => {
    if ((currentTab as string) === 'intake') {
      setCurrentTab('dashboard');
    }
  }, [currentTab]);

  // Persistent Sidebar Collapse State across all pages
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('al_khalil_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('al_khalil_sidebar_collapsed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Layout & Styling synchronization for Sidebar collapse & page re-rendering:
  // Ensures that toggling the sidebar size (72px vs 260px) or navigating between pages (currentTab)
  // triggers window resize events cleanly, forcing responsive charts (Recharts ResponsiveContainer),
  // flex tables, and grids to recalculate bounding boxes without interfering with page routing (currentTab).
  useEffect(() => {
    // 1. Sync CSS custom properties and attributes on documentElement
    document.documentElement.style.setProperty(
      '--app-sidebar-width',
      isSidebarCollapsed ? '72px' : '260px'
    );
    document.documentElement.setAttribute(
      'data-sidebar-collapsed',
      isSidebarCollapsed ? 'true' : 'false'
    );

    // 2. Immediate resize event to trigger fast responsive layouts
    window.dispatchEvent(new Event('resize'));

    // 3. Follow-up resize event after sidebar transition (300ms ease-in-out) completes
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 320);

    return () => clearTimeout(timer);
  }, [isSidebarCollapsed, currentTab]);

  // Window resize handler: auto-close mobile drawer when viewport enters desktop size (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen((open) => (open ? false : open));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Synchronize schoolId with CustomLabelsContext
  useEffect(() => {
    if (currentUser?.schoolId) {
      setSchoolId(currentUser.schoolId);
    }
  }, [currentUser?.schoolId, setSchoolId]);

  // Application Data States
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const stored = getStudents();
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    } catch {}
    return [];
  });
  const [tardinessRecords, setTardinessRecords] = useState<TardinessRecord[]>(() => {
    try {
      const stored = getTardinessRecords();
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    } catch {}
    return [];
  });

  // Keep localStorage students always synchronized as resilient offline cache
  useEffect(() => {
    if (Array.isArray(students) && students.length > 0) {
      saveStudents(students);
    }
  }, [students]);

  const [absences, setAbsences] = useState<AbsenceRecord[]>(() => {
    try {
      return getAbsences();
    } catch {
      return [];
    }
  });
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [warningForms, setWarningForms] = useState<WarningFormRecord[]>([]);
  const [parentSummonForms, setParentSummonForms] = useState<ParentSummonFormRecord[]>(() => {
    try {
      return getParentSummonForms();
    } catch {
      return [];
    }
  });
  const [violationReports, setViolationReports] = useState<ViolationReportRecord[]>(() => {
    try {
      return getViolationReports();
    } catch {
      return [];
    }
  });
  const [parentNoticeForms, setParentNoticeForms] = useState<ParentNoticeFormRecord[]>(() => {
    try {
      return getParentNoticeForms();
    } catch {
      return [];
    }
  });

  // Modals & UI States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [isTrackCorrectionOpen, setIsTrackCorrectionOpen] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isSchoolSettingsOpen, setIsSchoolSettingsOpen] = useState(false);
  const activeSchoolId = useMemo(() => {
    return currentUser?.schoolId || schoolSettings.schoolId || '7001';
  }, [currentUser?.schoolId, schoolSettings.schoolId]);
  const [activeProfileStudentId, setActiveProfileStudentId] = useState<string | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [selectedStudentIdForWarning, setSelectedStudentIdForWarning] = useState<string | null>(null);
  const [selectedViolationIdForForm, setSelectedViolationIdForForm] = useState<string | null>(null);
  const [selectedStudentIdForMessage, setSelectedStudentIdForMessage] = useState<string | null>(null);
  const [selectedStudentIdsForMessage, setSelectedStudentIdsForMessage] = useState<string[]>([]);
  const [selectedViolationIdsForMessage, setSelectedViolationIdsForMessage] = useState<string[]>([]);
  const [preselectedStudentIdForViolation, setPreselectedStudentIdForViolation] = useState<string | null>(null);
  const [activeFormsSubTab, setActiveFormsSubTab] = useState<FormTabType>('model8-summon');

  // Message Queue State (for pending WhatsApp/Email messages)
  const [messageQueue, setMessageQueue] = useState<QueueItem[]>(() => {
    try {
      const saved = localStorage.getItem('school_message_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Sync messageQueue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('school_message_queue', JSON.stringify(messageQueue));
    } catch {}
  }, [messageQueue]);

  // Seed sample queue items on first run if students are available and queue is empty
  useEffect(() => {
    if (students.length > 0 && messageQueue.length === 0) {
      const initialized = localStorage.getItem('school_message_queue_initialized_v2');
      if (!initialized) {
        localStorage.setItem('school_message_queue_initialized_v2', 'true');
        const sampleTargets = students.slice(0, 3);
        const sampleQueue: QueueItem[] = sampleTargets.map((stud) => {
          const contact = stud.contacts?.[0] || {
            id: 'c1',
            name: stud.parentName || 'ولي أمر الطالب',
            relation: stud.parentRelation || 'ولي الأمر',
            phone: stud.parentPhone || '0501234567',
            isPrimary: true,
          };
          return {
            student: stud,
            contact,
            renderedSubject: `إشعار متابعة دراسية وانضباطية - الطالب ${stud.fullName}`,
            renderedText: `السلام عليكم ورحمة الله وبركاته، تحية طيبة وبعد،،\nنفيدكم علماً بضرورة متابعة الحضور والالتزام المدرسي لنجلكم الطالب ${stud.fullName} (${stud.grade}/${stud.section}).\nمكتب الإرشاد الطلابي - ${schoolSettings.schoolName}`,
            status: 'pending',
          };
        });
        setMessageQueue(sampleQueue);
      }
    }
  }, [students, messageQueue.length, schoolSettings.schoolName]);

  // Count unconfirmed messages in queue
  const unconfirmedMessagesCount = useMemo(() => {
    return messageQueue.filter((item) => item.status !== 'confirmed').length;
  }, [messageQueue]);

  // Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      setToast({ message, type });
    },
    []
  );

  // Dark / Light Mode Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getStoredTheme());

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
    showToast(
      nextTheme === 'dark'
        ? 'تم تفعيل الوضع الليلي (Dark Mode) 🌙'
        : 'تم تفعيل الوضع النهاري (Light Mode) ☀️',
      'info'
    );
  }, [theme, showToast]);

  // Adapter for counselor user to maintain compatibility with existing sub-components
  const counselorAdapter: CounselorUser | null = useMemo(() => {
    if (!currentUser) return null;
    return {
      id: currentUser.uid,
      name: currentUser.fullName,
      email: currentUser.email,
      role: currentUser.role,
      jobTitle: currentUser.jobTitle,
      schoolName: schoolSettings.schoolName,
      schoolCycle: schoolSettings.schoolCycle,
      schoolId: activeSchoolId,
      photoURL: currentUser.photoURL,
    };
  }, [currentUser, schoolSettings.schoolName, schoolSettings.schoolCycle, activeSchoolId]);

  // Real-time or batch loader for Firestore data with concurrency & timeout protection
  const isLoadingDataRef = useRef(false);

  const loadFirestoreData = useCallback(async (user: AppUser, targetSchoolId?: string) => {
    if (!user) return;
    if (isLoadingDataRef.current) {
      return;
    }
    isLoadingDataRef.current = true;
    setDataLoading(true);
    setFirestoreError(null);

    const schoolId = targetSchoolId || user.schoolId || activeSchoolId || '7001';

    try {
      // 1. Safe default school verification (non-blocking with 2s timeout)
      try {
        await Promise.race([
          ensureDefaultSchoolExists(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
        ]);
      } catch (schoolErr) {
        console.warn('ensureDefaultSchoolExists non-fatal notice:', schoolErr);
      }

      // 2. Fetch collections in parallel using Promise.allSettled with a 7s safety timeout
      const fetchPromise = Promise.allSettled([
        fetchStudents(schoolId),
        fetchMorningDelays(schoolId),
        fetchAbsences(schoolId),
        fetchViolations(schoolId),
        fetchWarningForms(schoolId),
        fetchParentSummonForms(schoolId),
        fetchViolationReports(schoolId),
        fetchParentNoticeForms(schoolId),
      ]);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('مهلة مزامنة البيانات السحابية تجاوزت الحد المسموح')), 7000)
      );

      const results = await Promise.race([fetchPromise, timeoutPromise]);

      const [stRes, tdRes, abRes, viRes, wfRes, psRes, vrRes, pnRes] = results;

      if (stRes.status === 'fulfilled' && Array.isArray(stRes.value)) {
        if (stRes.value.length > 0) {
          setStudents(stRes.value);
          saveStudents(stRes.value);
        } else {
          // If Firestore returned empty, preserve stored students from local storage
          const localStudents = getStudents();
          if (localStudents && localStudents.length > 0) {
            setStudents(localStudents);
            saveStudentsBatch(schoolId, localStudents, user).catch((syncErr) =>
              console.warn('Background sync notice:', syncErr)
            );
          } else {
            setStudents([]);
          }
        }
      }
      if (tdRes.status === 'fulfilled' && Array.isArray(tdRes.value)) {
        if (tdRes.value.length > 0) {
          setTardinessRecords(tdRes.value);
          saveTardinessRecordsLocal(tdRes.value);
        } else {
          const localTardy = getTardinessRecords();
          if (localTardy && localTardy.length > 0) {
            setTardinessRecords(localTardy);
          }
        }
      }
      if (abRes.status === 'fulfilled' && Array.isArray(abRes.value)) {
        setAbsences(abRes.value);
        saveAbsencesLocal(abRes.value);
      }
      if (viRes.status === 'fulfilled' && Array.isArray(viRes.value)) {
        setViolations(viRes.value);
        if (viRes.value.length > 0) {
          saveViolationsLocal(viRes.value);
        }
      }
      if (wfRes.status === 'fulfilled' && Array.isArray(wfRes.value)) {
        setWarningForms(wfRes.value);
      }
      if (psRes.status === 'fulfilled' && Array.isArray(psRes.value) && psRes.value.length > 0) {
        setParentSummonForms(psRes.value);
      }
      if (vrRes.status === 'fulfilled' && Array.isArray(vrRes.value) && vrRes.value.length > 0) {
        setViolationReports(vrRes.value);
      }
      if (pnRes.status === 'fulfilled' && Array.isArray(pnRes.value) && pnRes.value.length > 0) {
        setParentNoticeForms(pnRes.value);
      }

      const hasFailures = results.some((r) => r.status === 'rejected');
      if (hasFailures) {
        setFirestoreError('تعذر جلب بعض البيانات مؤقتاً بسبب حالة الاتصال السحابي.');
      }
    } catch (err: any) {
      console.warn('Notice loading Firestore collections:', err?.message || err);
      setFirestoreError('تعذر جلب بعض البيانات مؤقتاً بسبب حالة الاتصال.');
    } finally {
      isLoadingDataRef.current = false;
      setDataLoading(false);
    }
  }, [activeSchoolId]);

  const loadFirestoreDataRef = useRef(loadFirestoreData);
  useEffect(() => {
    loadFirestoreDataRef.current = loadFirestoreData;
  }, [loadFirestoreData]);

  // Auth state listener with non-destructive safety timeout (runs strictly once on mount)
  useEffect(() => {
    let isMounted = true;
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setAuthLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('[Auth] Auth state resolution took over 8s; releasing loading spinner gracefully without invalidating user.');
            return false;
          }
          return false;
        });
      }
    }, 8000);

    const unsubscribe = subscribeToAuth((resolution) => {
      if (!isMounted) return;
      clearTimeout(safetyTimer);
      setAuthResolution(resolution);
      setAuthLoading(false);

      if (resolution.status === 'approved') {
        setCurrentUser(resolution.appUser);
        loadFirestoreDataRef.current(resolution.appUser, resolution.appUser.schoolId || '7001');
      } else if (resolution.status === 'unauthenticated') {
        setCurrentUser(null);
        setCurrentTab('dashboard');
      } else if (resolution.status === 'deactivated') {
        setCurrentUser(null);
        setStudents([]);
        showToast('تم تعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة مدير النظام.', 'error');
        logoutUser();
      } else if (resolution.status === 'firestore_error') {
        console.warn('[Auth] Firestore connection issue; keeping auth state without logging out.');
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, [showToast]);

  // Compute live dashboard stats
  const stats: DashboardStats = useMemo(() => {
    const today = getUaeTodayDateString();
    const tardyTodayCount = tardinessRecords.filter((t) => t.date === today).length;
    const absencesTodayCount = absences.filter((a) => a.date === today).length;
    const openViolationsCount = violations.filter(
      (v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب'
    ).length;
    const pendingSignaturesCount = warningForms.filter((f) => !f.studentSignature).length;
    const criticalTardinessCount = students.filter((s) => {
      const uniqueDatesCount = getUniqueStudentTardinessDates(s, tardinessRecords).length;
      return Math.max(s.totalTardiness || 0, uniqueDatesCount) >= 3;
    }).length;
    const criticalAbsencesCount = students.filter((s) => {
      const recordsCount = absences.filter(
        (a) => a.studentId === s.id || (s.studentNumber && a.studentNumber === s.studentNumber)
      ).length;
      return Math.max(s.totalAbsences || 0, recordsCount) >= 3;
    }).length;

    return {
      totalStudents: students.length,
      tardyTodayCount,
      absencesTodayCount,
      openViolationsCount,
      pendingSignaturesCount,
      criticalTardinessCount,
      criticalAbsencesCount,
    };
  }, [students, tardinessRecords, absences, violations, warningForms]);

  // Unified official forms list for follow-up and signature tracking
  const allLinkedForms = useMemo(() => {
    let commitments: any[] = [];
    try {
      commitments = getParentCommitmentForms();
    } catch {}
    return [
      ...warningForms.map((f) => ({ ...f, formType: 'warning' })),
      ...parentSummonForms.map((f) => ({ ...f, formType: 'summon' })),
      ...violationReports.map((f) => ({ ...f, formType: 'report' })),
      ...parentNoticeForms.map((f) => ({ ...f, formType: 'notice' })),
      ...commitments.map((f) => ({ ...f, formType: 'commitment' })),
    ];
  }, [warningForms, parentSummonForms, violationReports, parentNoticeForms]);

  // Automatically check and generate due follow-up notifications in Local Storage for logged-in counselor
  useEffect(() => {
    if (!currentUser) return;
    try {
      syncStudentFollowUpNotifications({
        students,
        violations,
        warningForms,
        tardinessRecords,
        absences,
      });
    } catch (err) {
      console.warn('Follow-up notification sync notice:', err);
    }
  }, [currentUser, students, violations, warningForms, tardinessRecords, absences]);

  // Login handler
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    const targetSchool = user.schoolId || activeSchoolId || '7001';
    loadFirestoreData(user, targetSchool);
    showToast(`مرحباً بك أستاذ ${user.fullName} في نظام المرشد المدرسي الذكي`, 'success');
  };

  // User profile update handler
  const handleUpdateCurrentUser = useCallback((updatedUser: AppUser) => {
    setCurrentUser(updatedUser);
    setAuthResolution((prev) => {
      if (prev.status === 'approved') {
        return {
          ...prev,
          appUser: updatedUser,
        };
      }
      return prev;
    });
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      // Prevent returning via browser back button
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      showToast('تم تسجيل الخروج من النظام بنجاح', 'info');
    } catch (err: any) {
      showToast('حدث خطأ أثناء تسجيل الخروج', 'error');
    }
  };

  // Add single student handler
  const handleAddStudent = async (
    studentData: Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>
  ) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('عذراً، صلاحياتك (مشاهد) لا تسمح بإضافة بيانات جديدة', 'warning');
      return;
    }
    const schoolId = activeSchoolId;
    try {
      const created = await saveStudent(schoolId, studentData, currentUser);
      setStudents((prev) => [
        ...prev.filter((s) => s.id !== created.id && s.studentNumber !== created.studentNumber),
        created,
      ]);
      showToast(`تمت إضافة الطالب ${created.fullName} بنجاح إلى قاعدة البيانات`, 'success');
    } catch (err: any) {
      console.warn('handleAddStudent cloud notice, preserving locally:', err);
      const localRecord: Student = {
        ...studentData,
        id: studentData.studentNumber,
        totalTardiness: 0,
        totalViolations: 0,
      };
      setStudents((prev) => [
        ...prev.filter((s) => s.id !== localRecord.id && s.studentNumber !== localRecord.studentNumber),
        localRecord,
      ]);
      showToast(`تم حفظ الطالب ${localRecord.fullName} محلياً بنجاح`, 'info');
    }
  };

  // Helpers to validate and normalize student grade, section, and track across all grades (5-12 and 1-12)
  const getGradeCode = (grade: GradeLevel): string => {
    switch (grade) {
      case 'أول': return '01';
      case 'ثاني': return '02';
      case 'ثالث': return '03';
      case 'رابع': return '04';
      case 'خامس': return '05';
      case 'سادس': return '06';
      case 'سابع': return '07';
      case 'ثامن': return '08';
      case 'تاسع': return '09';
      case 'عاشر': return '10';
      case 'حادي عشر': return '11';
      case 'ثاني عشر': return '12';
      default: return '00';
    }
  };

  const normalizeStrictGrade = (raw: any): GradeLevel => {
    return normalizeCanonicalGrade(raw);
  };

  const normalizeStrictSection = (raw: any): SectionName => {
    const s = String(raw || '').trim();
    if (!s) return 'غير محدد';
    return s as SectionName;
  };

  const normalizeStrictTrack = (raw: any): AcademicTrack => {
    const t = String(raw || '').trim().toLowerCase();
    if (t.includes('نخبة') || t.includes('نخبه') || t.includes('elite')) return 'نخبة';
    if (t.includes('تطبيقي') || t.includes('applied')) return 'تطبيقي';
    if (t.includes('متقدم') || t.includes('advanced') || t.includes('adv')) return 'متقدم';
    if (t.includes('عام') || t.includes('general') || t.includes('gen') || !t) return 'عام';
    return 'يحتاج مراجعة';
  };

  // Excel batch import handler with enhanced batching & accurate grade/section preservation
  const handleImportStudents = async (
    newStudents: Student[]
  ): Promise<boolean> => {
    if (!newStudents || newStudents.length === 0) {
      showToast('لا توجد بيانات طلاب للاستيراد', 'warning');
      return false;
    }

    if (currentUser?.role === 'viewer') {
      showToast('عذراً، صلاحياتك (مشاهد) لا تسمح باستيراد البيانات', 'warning');
      return false;
    }

    // 1. Prepare sanitized, validated and deduplicated records without generating fake IDs or fake numbers
    const cleanStudentMap = new Map<string, Student>();

    newStudents.forEach((s) => {
      const rawFullName = String(s.fullName || '').trim();
      if (!rawFullName || rawFullName.length < 2) return; // Skip empty rows

      const studentNumber = String(s.studentNumber || s.id || '').replace(/[\/\\]/g, '-').replace(/\s+/g, '');
      if (!studentNumber) return;

      const existingInSystem = students.find((p) => p.id === studentNumber || p.studentNumber === studentNumber);

      cleanStudentMap.set(studentNumber, {
        ...s,
        id: studentNumber,
        studentNumber,
        fullName: rawFullName,
        grade: s.grade,
        section: s.section,
        track: s.track,
        status: s.status || 'منتظم',
        parentName: s.parentName || (existingInSystem ? existingInSystem.parentName : `ولي أمر الطالب ${rawFullName.split(' ')[0]}`),
        parentPhone: s.parentPhone || (existingInSystem ? existingInSystem.parentPhone : ''), // Never fake 0500000000
        parentRelation: s.parentRelation || 'الأب',
        enrollmentDate: s.enrollmentDate || new Date().toISOString().split('T')[0],
        totalTardiness: existingInSystem?.totalTardiness ?? 0,
        totalViolations: existingInSystem?.totalViolations ?? 0,
        importBatchId: s.importBatchId,
        importBatchDate: s.importBatchDate,
      });
    });

    const cleanStudentRecords = Array.from(cleanStudentMap.values());

    if (cleanStudentRecords.length === 0) {
      showToast('لم يتم العثور على سجلات صالحة للاستيراد', 'warning');
      return false;
    }

    // 2. Immediately update state and localStorage so all imported students appear in the tables & dashboard right away!
    setStudents((prev) => {
      const map = new Map<string, Student>(prev.map((p) => [p.studentNumber, p]));
      cleanStudentRecords.forEach((st) => {
        const existing = map.get(st.studentNumber) || prev.find((p) => p.id === st.id);
        map.set(st.studentNumber, {
          ...st,
          id: st.studentNumber,
          totalTardiness: existing?.totalTardiness ?? 0,
          totalViolations: existing?.totalViolations ?? 0,
        });
      });
      const updated = Array.from(map.values());
      saveStudents(updated);
      return updated;
    });

    // 3. Persist accurately to Firestore in disciplined batches
    try {
      const schoolId = activeSchoolId;
      const actor = currentUser || {
        uid: 'system',
        fullName: 'المستخدم الحالي',
        email: '',
        role: 'systemAdmin' as UserRole,
        schoolId,
        active: true,
        createdAt: new Date().toISOString(),
      };

      // Chunk records into safe, optimized batches of 150 students for reliable Firestore commits
      const BATCH_SIZE = 150;
      let totalSaved = 0;

      for (let i = 0; i < cleanStudentRecords.length; i += BATCH_SIZE) {
        const batchChunk = cleanStudentRecords.slice(i, i + BATCH_SIZE);
        try {
          const savedInBatch = await saveStudentsBatch(schoolId, batchChunk, actor);
          totalSaved += (savedInBatch || 0);
        } catch (batchErr) {
          console.error(`Batch write error for chunk ${Math.floor(i / BATCH_SIZE) + 1}:`, batchErr);
        }
      }

      if (totalSaved === 0) {
        showToast('تم استيراد وتثبيت بيانات الطلبة محلياً بنجاح، مع تعذر المزامنة السحابية مؤقتاً', 'warning');
        return true;
      }

      // Re-fetch from Firestore to guarantee that Firestore and local storage are synchronized
      try {
        const freshStudents = await fetchStudents(schoolId);
        if (freshStudents.length > 0) {
          setStudents(freshStudents);
          saveStudents(freshStudents);
        }
      } catch (fetchErr) {
        console.warn('Post-import fetch notice:', fetchErr);
      }

      showToast(
        `تم استيراد وتثبيت ${totalSaved} طالباً بنجاح في قاعدة البيانات وحفظهم بالنظام`,
        'success'
      );
      return true;
    } catch (err: any) {
      console.error('Batch import cloud sync error:', err);
      showToast(`حدث خطأ أثناء حفظ الطلبة في قاعدة البيانات: ${err?.message || ''}`, 'error');
      return false;
    }
  };

  // Handler to delete a specific import batch by its importBatchId (Requirement 16)
  const handleDeleteImportBatch = async (batchId: string): Promise<boolean> => {
    if (!batchId) return false;
    if (currentUser?.role !== 'systemAdmin' && currentUser?.role !== 'schoolAdmin') {
      showToast('تقتصر صلاحية حذف دفعات الاستيراد على مدراء النظام', 'error');
      return false;
    }
    try {
      const schoolId = activeSchoolId;
      const result = await deleteImportBatch(schoolId, batchId, currentUser);
      // Remove deleted students from state and local storage
      setStudents((prev) => prev.filter((s) => s.importBatchId !== batchId));
      showToast(`تم حذف دفعة الاستيراد (${batchId}) بعدد ${result.deletedCount} طالب بنجاح`, 'success');
      return true;
    } catch (err: any) {
      console.error('Error deleting import batch:', err);
      showToast(err.message || 'فشل حذف دفعة الاستيراد', 'error');
      return false;
    }
  };

  // Update student record handler (updates names, grades, sections, contacts, status)
  const handleUpdateStudent = async (studentId: string, updates: Partial<Omit<Student, 'id'>>) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بتعديل بيانات الطلبة', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await updateStudentRecord(schoolId, studentId, updates, currentUser);
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId || s.studentNumber === studentId ? { ...s, ...updates } : s))
      );
      showToast('تم تحديث بيانات وسجل الطالب بنجاح', 'success');
    } catch (err: any) {
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId || s.studentNumber === studentId ? { ...s, ...updates } : s))
      );
      showToast('تم حفظ التعديل محلياً في سجل الطلبة', 'info');
    }
  };

  // Batch Track Correction handler with full audit log and safe in-place student updates
  const handleUpdateStudentsTrack = async (
    updates: Array<{ studentId: string; newTrack: AcademicTrack; reason?: string }>,
    changedBy: string
  ): Promise<{ updatedCount: number; logs: TrackAuditLog[] }> => {
    if (!currentUser) {
      showToast('يرجى تسجيل الدخول أولاً', 'error');
      return { updatedCount: 0, logs: [] };
    }
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بتعديل مسارات الطلبة', 'warning');
      return { updatedCount: 0, logs: [] };
    }

    try {
      const result = updateStudentsTrack(updates, changedBy);

      // Refresh in-memory state from updated storage
      setStudents(getStudents());

      // Sync updated records with Firestore
      try {
        const schoolId = activeSchoolId;
        const actor = currentUser || {
          uid: 'system',
          fullName: changedBy,
          email: '',
          role: 'systemAdmin' as UserRole,
          schoolId,
          active: true,
          createdAt: new Date().toISOString(),
        };

        for (const u of updates) {
          const st = students.find((s) => s.id === u.studentId || s.studentNumber === u.studentId);
          if (st) {
            await updateStudentRecord(schoolId, st.studentNumber || st.id, { track: u.newTrack }, actor);
          }
        }
      } catch (cloudErr) {
        console.warn('Track correction cloud sync notice:', cloudErr);
      }

      showToast(`تم تحديث مسار (${result.updatedCount}) طالب بنجاح مع توثيق العملية في سجل التدقيق`, 'success');
      return result;
    } catch (err: any) {
      console.error('Error updating student tracks:', err);
      showToast('فشل تحديث مسارات الطلبة', 'error');
      return { updatedCount: 0, logs: [] };
    }
  };

  // Delete student record handler
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف سجلات الطلبة', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await deleteStudent(schoolId, studentId, currentUser, studentName);
      setStudents((prev) => {
        const next = prev.filter((s) => s.id !== studentId && s.studentNumber !== studentId);
        if (next.length === 0) saveStudents([]);
        return next;
      });
      showToast(`تم حذف سجل الطالب (${studentName}) نهائياً من النظام`, 'info');
    } catch (err: any) {
      setStudents((prev) => {
        const next = prev.filter((s) => s.id !== studentId && s.studentNumber !== studentId);
        if (next.length === 0) saveStudents([]);
        return next;
      });
      showToast(`تم حذف سجل الطالب (${studentName}) محلياً`, 'info');
    }
  };

  // Bulk Delete All Students Handler (to empty and import fresh dataset)
  const handleDeleteAllStudents = async () => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف سجلات الطلبة', 'warning');
      return;
    }
    const schoolId = activeSchoolId;
    try {
      const totalDeleted = await deleteAllStudentsFromSchool(schoolId, currentUser);
      setStudents([]);
      saveStudents([]);
      showToast(
        `تم حذف وتفريغ جميع سجلات الطلبة بنجاح (${totalDeleted || 'الكل'}). يمكنك الآن استيراد ملف جديد.`,
        'success'
      );
    } catch (err: any) {
      setStudents([]);
      saveStudents([]);
      showToast('تم تفريغ سجلات الطلبة محلياً بنجاح. يمكنك الآن استيراد الملف الجديد.', 'info');
    }
  };

  // Bulk Delete Filtered Students (e.g. specific grade or section)
  const handleDeleteFilteredStudents = async (studentIds: string[], summary: string) => {
    if (!currentUser || studentIds.length === 0) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف سجلات الطلبة', 'warning');
      return;
    }
    const schoolId = activeSchoolId;
    const idSet = new Set(studentIds);
    try {
      await deleteStudentsBatch(schoolId, studentIds, currentUser, summary);
      setStudents((prev) => prev.filter((s) => !idSet.has(s.id)));
      showToast(`تم ${summary} بنجاح بعدد (${studentIds.length}) طالباً.`, 'success');
    } catch (err: any) {
      setStudents((prev) => prev.filter((s) => !idSet.has(s.id)));
      showToast(`تم حذف الطلبة المحددين محلياً (${studentIds.length}) طالباً.`, 'info');
    }
  };

  // Tardiness Batch save handler
  const handleSaveTardinessBatch = async (
    batch: Array<Omit<TardinessRecord, 'id' | 'timestamp'>>
  ): Promise<{ successCount: number; duplicateCount: number; savedRecords: TardinessRecord[] }> => {
    if (!currentUser) return { successCount: 0, duplicateCount: 0, savedRecords: [] };
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح برصد التأخير', 'warning');
      return { successCount: 0, duplicateCount: 0, savedRecords: [] };
    }

    const schoolId = activeSchoolId;
    try {
      const res = await batchAddMorningDelays(schoolId, batch, currentUser);
      if (res.savedRecords.length > 0) {
        const nextTardiness = [...res.savedRecords, ...tardinessRecords];
        setTardinessRecords(nextTardiness);
        saveTardinessRecordsLocal(nextTardiness);
        const numSet = new Set(res.savedRecords.map((r) => String(r.studentNumber || r.studentId || '').trim()));
        setStudents((prev) => {
          const updated = prev.map((s) => {
            if (numSet.has(s.studentNumber) || numSet.has(s.id)) {
              const uniqueDatesCount = getUniqueStudentTardinessDates(s, nextTardiness).length;
              return { ...s, totalTardiness: uniqueDatesCount };
            }
            return s;
          });
          saveStudents(updated);
          return updated;
        });

        // Enqueue & dispatch automated Gmail notifications for newly approved tardiness incidents
        processApprovedTardinessBatchNotifications({
          schoolId,
          savedRecords: res.savedRecords,
          students,
          approver: {
            uid: currentUser.uid,
            name: currentUser.fullName,
            role: currentUser.role,
          },
        }).catch((err) => console.warn('[Gmail Auto-Tardiness] Notice:', err));
      }
      return res;
    } catch (err: any) {
      console.warn('Batch add morning delays fallback local:', err);
      const localRes = addTardinessRecordsBatch(batch);
      const latestTardy = getTardinessRecords();
      setTardinessRecords(latestTardy);
      setStudents(getStudents());
      return {
        successCount: localRes.successCount,
        duplicateCount: localRes.duplicatesCount,
        savedRecords: localRes.createdRecords,
      };
    }
  };

  // Update tardiness record
  const handleUpdateTardiness = async (record: TardinessRecord) => {
    if (!currentUser) return;
    const schoolId = activeSchoolId;
    try {
      await updateMorningDelay(schoolId, record, currentUser);
      setTardinessRecords((prev) => prev.map((t) => (t.id === record.id ? record : t)));
      showToast('تم تحديث بيانات سجل التأخير بنجاح', 'success');
    } catch (err) {
      setTardinessRecords((prev) => prev.map((t) => (t.id === record.id ? record : t)));
    }
  };

  // Delete tardiness record with exact recalculation of real totalTardiness
  const handleDeleteTardiness = async (id: string, studentNumber?: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف السجلات', 'warning');
      return;
    }
    const schoolId = activeSchoolId;
    try {
      const remainingExactCount = await deleteMorningDelay(schoolId, id, currentUser, studentNumber);
      const remaining = tardinessRecords.filter((r) => r.id !== id);
      setTardinessRecords(remaining);
      deleteTardinessRecord(id);
      if (studentNumber) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentNumber === studentNumber || s.id === studentNumber
              ? { ...s, totalTardiness: remainingExactCount }
              : s
          )
        );
      }
      showToast('تم حذف سجل التأخير بنجاح وإعادة احتساب الرصيد الحقيقي للدوام', 'info');
    } catch (err: any) {
      console.warn('Fallback local delete tardiness:', err);
      const remaining = tardinessRecords.filter((r) => r.id !== id);
      setTardinessRecords(remaining);
      deleteTardinessRecord(id);
      if (studentNumber) {
        const localRealCount = remaining.filter(
          (r) => r.studentNumber === studentNumber || r.studentId === studentNumber
        ).length;
        setStudents((prev) =>
          prev.map((s) =>
            s.studentNumber === studentNumber || s.id === studentNumber
              ? { ...s, totalTardiness: localRealCount }
              : s
          )
        );
      }
    }
  };

  // Batch delete tardiness records with live recalculation and audit logging
  const handleBatchDeleteTardiness = async (
    recordIds: string[],
    studentNumbers: string[]
  ): Promise<{ deletedCount: number }> => {
    if (!currentUser) return { deletedCount: 0 };
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف السجلات', 'warning');
      return { deletedCount: 0 };
    }

    const schoolId = activeSchoolId;
    const idSet = new Set(recordIds);

    try {
      const res = await batchDeleteMorningDelays(schoolId, recordIds, currentUser, studentNumbers);
      const remaining = tardinessRecords.filter((r) => !idSet.has(r.id));
      setTardinessRecords(remaining);
      deleteTardinessRecordsBatch(recordIds);

      // Recalculate and update affected students
      if (res.studentNewCounts) {
        setStudents((prev) =>
          prev.map((s) => {
            if (res.studentNewCounts[s.studentNumber] !== undefined) {
              return { ...s, totalTardiness: res.studentNewCounts[s.studentNumber] };
            }
            if (s.id && res.studentNewCounts[s.id] !== undefined) {
              return { ...s, totalTardiness: res.studentNewCounts[s.id] };
            }
            return s;
          })
        );
      }
      return { deletedCount: res.deletedCount };
    } catch (err: any) {
      console.warn('Batch delete morning delays fallback local:', err);
      const localRes = deleteTardinessRecordsBatch(recordIds);
      const remaining = tardinessRecords.filter((r) => !idSet.has(r.id));
      setTardinessRecords(remaining);
      if (localRes.studentNewCounts) {
        setStudents((prev) =>
          prev.map((s) => {
            if (localRes.studentNewCounts[s.studentNumber] !== undefined) {
              return { ...s, totalTardiness: localRes.studentNewCounts[s.studentNumber] };
            }
            if (s.id && localRes.studentNewCounts[s.id] !== undefined) {
              return { ...s, totalTardiness: localRes.studentNewCounts[s.id] };
            }
            return s;
          })
        );
      }
      return { deletedCount: localRes.deletedCount };
    }
  };

  // Purge all tardiness records (authorized roles only with confirmation)
  const handlePurgeAllTardiness = async (): Promise<number> => {
    if (!currentUser) return 0;
    const role = currentUser.role;
    if (role !== 'systemAdmin' && role !== 'schoolAdmin' && role !== 'system_owner' && role !== 'school_admin' && role !== 'counselor') {
      showToast('غير مصرح لك بإجراء حذف كلي لسجلات التأخير', 'error');
      return 0;
    }

    const schoolId = activeSchoolId;
    try {
      const deleted = await deleteAllMorningDelays(schoolId, currentUser);
      setTardinessRecords([]);
      clearAllTardinessRecordsLocal();
      setStudents((prev) => prev.map((s) => ({ ...s, totalTardiness: 0 })));
      showToast(`تم حذف كافة سجلات التأخير الصباحي بنجاح (${deleted}) سجلاً وتصفير العدادات`, 'success');
      return deleted;
    } catch (err: any) {
      console.warn('Purge all tardiness local fallback:', err);
      const count = clearAllTardinessRecordsLocal();
      setTardinessRecords([]);
      setStudents((prev) => prev.map((s) => ({ ...s, totalTardiness: 0 })));
      showToast(`تم حذف كافة سجلات التأخير محلياً (${count}) سجلاً وتصفير العدادات`, 'info');
      return count;
    }
  };

  // Absence Batch Save Handler
  const handleSaveAbsenceBatch = async (
    records: Array<Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ successCount: number; duplicateCount: number; savedRecords: AbsenceRecord[] }> => {
    if (!currentUser) return { successCount: 0, duplicateCount: 0, savedRecords: [] };
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح برصد الغياب', 'warning');
      return { successCount: 0, duplicateCount: 0, savedRecords: [] };
    }

    const schoolId = activeSchoolId;
    try {
      const res = await batchAddAbsences(schoolId, records, currentUser);
      if (res.savedRecords.length > 0) {
        setAbsences((prev) => [...res.savedRecords, ...prev]);
        saveAbsencesLocal([...res.savedRecords, ...absences]);
        const numSet = new Set(res.savedRecords.map((r) => r.studentNumber));
        setStudents((prev) =>
          prev.map((s) => (numSet.has(s.studentNumber) ? { ...s, totalAbsences: (s.totalAbsences || 0) + 1 } : s))
        );

        // Enqueue & dispatch automated Gmail notifications for newly approved absence incidents
        processApprovedAbsenceBatchNotifications({
          schoolId,
          savedRecords: res.savedRecords,
          students,
          approver: {
            uid: currentUser.uid,
            name: currentUser.fullName,
            role: currentUser.role,
          },
        }).catch((err) => console.warn('[Gmail Auto-Absence] Notice:', err));
      }
      return res;
    } catch (err: any) {
      // Local fallback if offline
      const localRes = batchAddAbsencesLocal(records);
      setAbsences(getAbsences());
      return localRes;
    }
  };

  // Update Absence Handler
  const handleUpdateAbsence = async (record: AbsenceRecord) => {
    if (!currentUser) return;
    const schoolId = activeSchoolId;
    try {
      await updateAbsenceFirestore(schoolId, record, currentUser);
      setAbsences((prev) => prev.map((a) => (a.id === record.id ? record : a)));
    } catch (err) {
      setAbsences((prev) => prev.map((a) => (a.id === record.id ? record : a)));
      saveAbsencesLocal(absences.map((a) => (a.id === record.id ? record : a)));
    }
  };

  // Delete Absence Handler with true recalculation from remaining records
  const handleDeleteAbsence = async (id: string, studentNumber?: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف السجلات', 'warning');
      return;
    }
    const schoolId = activeSchoolId;
    const remaining = absences.filter((a) => a.id !== id);
    try {
      await deleteAbsenceFirestore(schoolId, id, currentUser, studentNumber);
      setAbsences(remaining);
      deleteAbsenceLocal(id);
      if (studentNumber) {
        const realCount = remaining.filter((a) => a.studentNumber === studentNumber || a.studentId === studentNumber).length;
        setStudents((prev) =>
          prev.map((s) =>
            s.studentNumber === studentNumber || s.id === studentNumber
              ? { ...s, totalAbsences: realCount }
              : s
          )
        );
      }
      showToast('تم حذف سجل الغياب بنجاح وتحديث الرصيد الحقيقي', 'info');
    } catch (err: any) {
      setAbsences(remaining);
      deleteAbsenceLocal(id);
      if (studentNumber) {
        const realCount = remaining.filter((a) => a.studentNumber === studentNumber || a.studentId === studentNumber).length;
        setStudents((prev) =>
          prev.map((s) =>
            s.studentNumber === studentNumber || s.id === studentNumber
              ? { ...s, totalAbsences: realCount }
              : s
          )
        );
      }
    }
  };

  // Add violation
  const handleAddViolation = async (
    v: Omit<ViolationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بإضافة مخالفات', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      const created = await addViolation(schoolId, v, currentUser);
      const nextViolations = [created, ...violations];
      setViolations(nextViolations);
      saveViolationsLocal(nextViolations);
      setStudents((prev) => {
        const updated = prev.map((s) =>
          s.id === v.studentId || (Boolean(v.studentNumber) && s.studentNumber === v.studentNumber)
            ? {
                ...s,
                totalViolations: (s.totalViolations || 0) + 1,
                status: s.status === 'منتظم' ? 'متابع سلوكيًا' : s.status,
              }
            : s
        );
        saveStudents(updated);
        return updated;
      });
      try {
        notifyInfractionLogged(created);
      } catch {}
      showToast('تم تسجيل المخالفة بنجاح وربطها برقم الطالب في قاعدة البيانات', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تسجيل المخالفة', 'error');
    }
  };

  // Delete violation with true recalculation from remaining records
  const handleDeleteViolation = async (
    violationId: string,
    studentNumber?: string,
    studentId?: string
  ) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف المخالفات', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await deleteViolationFirestore(schoolId, violationId, currentUser, studentNumber);
      deleteViolationLocal(violationId);
      const remaining = violations.filter((item) => item.id !== violationId);
      setViolations(remaining);
      saveViolationsLocal(remaining);
      if (studentNumber || studentId) {
        const realViolationsCount = remaining.filter(
          (v) => (studentId && v.studentId === studentId) || (studentNumber && v.studentNumber === studentNumber)
        ).length;
        setStudents((prev) => {
          const updated = prev.map((s) =>
            (studentId && s.id === studentId) || (studentNumber && s.studentNumber === studentNumber)
              ? {
                  ...s,
                  totalViolations: realViolationsCount,
                  status: realViolationsCount === 0 && s.status === 'متابع سلوكيًا' ? 'منتظم' : s.status,
                }
              : s
          );
          saveStudents(updated);
          return updated;
        });
      }
      showToast('تم حذف المخالفة وتحديث رصيد مخالفات الطالب بنجاح', 'info');
    } catch (err: any) {
      showToast(err.message || 'فشل حذف المخالفة', 'error');
    }
  };

  // Update violation
  const handleUpdateViolation = async (v: ViolationRecord) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بتحديث السجلات', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await updateViolation(schoolId, v, currentUser);
      const nextViolations = violations.map((item) => (item.id === v.id ? v : item));
      setViolations(nextViolations);
      saveViolationsLocal(nextViolations);
      showToast('تم تحديث حالة المخالفة بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل تحديث المخالفة', 'error');
    }
  };

  // Save warning form
  const handleSaveWarningForm = async (form: WarningFormRecord) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحفظ النماذج الرسمية', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await saveWarningForm(schoolId, form, currentUser);
      setWarningForms((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === form.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = form;
          return copy;
        }
        return [form, ...prev];
      });
      try {
        notifyLinearWarningFormSaved(form);
      } catch {}
      showToast('تم اعتماد وحفظ نموذج التنبيه الخطي في قاعدة البيانات بنجاح', 'success');
    } catch (err: any) {
      try {
        notifyLinearWarningFormSaved(form);
      } catch {}
      showToast(err.message || 'فشل حفظ نموذج التنبيه الخطي', 'error');
    }
  };

  // Save parent summon form (Model 8)
  const handleSaveParentSummonForm = async (form: ParentSummonFormRecord) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح باعتماد خطابات الاستدعاء', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await saveParentSummonForm(schoolId, form, currentUser);
      // Also update local storage for offline resiliency
      saveParentSummonFormLocal(form);
      setParentSummonForms((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === form.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = form;
          return copy;
        }
        return [form, ...prev];
      });
      showToast('تم اعتماد وحفظ خطاب استدعاء ولي الأمر (نموذج 8) بنجاح', 'success');
    } catch (err: any) {
      // Fallback local save if offline
      saveParentSummonFormLocal(form);
      setParentSummonForms((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === form.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = form;
          return copy;
        }
        return [form, ...prev];
      });
      showToast('تم حفظ خطاب الاستدعاء محلياً (تعذر الاتصال السحابي)', 'info');
    }
  };

  // Delete parent summon form
  const handleDeleteParentSummonForm = async (formId: string, studentName?: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف خطابات الاستدعاء', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await deleteParentSummonForm(schoolId, formId, currentUser, studentName);
      deleteParentSummonFormLocal(formId);
      setParentSummonForms((prev) => prev.filter((f) => f.id !== formId));
      showToast('تم حذف خطاب الاستدعاء بنجاح', 'info');
    } catch (err: any) {
      deleteParentSummonFormLocal(formId);
      setParentSummonForms((prev) => prev.filter((f) => f.id !== formId));
      showToast('تم حذف خطاب الاستدعاء من السجل المحلي', 'info');
    }
  };

  // Save violation report form (Model 6 - تقرير مخالفة)
  const handleSaveViolationReport = async (form: ViolationReportRecord) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحفظ تقارير المخالفات', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      const saved = await saveViolationReport(schoolId, form, currentUser);
      saveViolationReportLocal(saved);
      setViolationReports((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === saved.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
      showToast('تم حفظ تقرير المخالفة (نموذج 6) بنجاح في قاعدة البيانات', 'success');
    } catch (err: any) {
      saveViolationReportLocal(form);
      setViolationReports((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === form.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = form;
          return copy;
        }
        return [form, ...prev];
      });
      showToast('تم حفظ تقرير المخالفة محلياً (تعذر الاتصال السحابي)', 'info');
    }
  };

  // Delete violation report form (Model 6)
  const handleDeleteViolationReport = async (formId: string, studentName?: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف تقارير المخالفات', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await deleteViolationReport(schoolId, formId, currentUser, studentName);
      deleteViolationReportLocal(formId);
      setViolationReports((prev) => prev.filter((f) => f.id !== formId));
      showToast('تم حذف تقرير المخالفة بنجاح', 'info');
    } catch (err: any) {
      const msg = err?.message || 'تعذر حذف التقرير';
      if (msg.includes('معتمد')) {
        showToast(msg, 'error');
        return;
      }
      const localSuccess = deleteViolationReportLocal(formId);
      if (localSuccess) {
        setViolationReports((prev) => prev.filter((f) => f.id !== formId));
        showToast('تم حذف تقرير المخالفة محلياً', 'info');
      } else {
        showToast('لا يمكن حذف تقرير معتمد', 'error');
      }
    }
  };

  // Save parent notice form (Model 7 - تنبيه / إنذار ولي الأمر)
  const handleSaveParentNoticeForm = async (form: ParentNoticeFormRecord) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحفظ نماذج التنبيه والإخطار', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await saveParentNoticeForm(schoolId, form, currentUser);
      saveParentNoticeFormLocal(form);
      setParentNoticeForms((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === form.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = form;
          return copy;
        }
        return [form, ...prev];
      });
      try {
        notifyParentWrittenNoticeSaved(form);
      } catch {}
      showToast(`تم حفظ ${form.noticeType} (نموذج 7) بنجاح في قاعدة البيانات`, 'success');
    } catch (err: any) {
      saveParentNoticeFormLocal(form);
      setParentNoticeForms((prev) => {
        const existingIdx = prev.findIndex((f) => f.id === form.id);
        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = form;
          return copy;
        }
        return [form, ...prev];
      });
      try {
        notifyParentWrittenNoticeSaved(form);
      } catch {}
      showToast(`تم حفظ ${form.noticeType} محلياً (تعذر الاتصال السحابي)`, 'info');
    }
  };

  // Delete parent notice form (Model 7)
  const handleDeleteParentNoticeForm = async (formId: string, studentName?: string) => {
    if (!currentUser) return;
    if (currentUser.role === 'viewer') {
      showToast('صلاحياتك (مشاهد) لا تسمح بحذف نماذج الإخطار', 'warning');
      return;
    }
    try {
      const schoolId = activeSchoolId;
      await deleteParentNoticeForm(schoolId, formId, currentUser, studentName);
      deleteParentNoticeFormLocal(formId);
      setParentNoticeForms((prev) => prev.filter((f) => f.id !== formId));
      showToast('تم حذف النموذج رقم 7 بنجاح', 'info');
    } catch (err: any) {
      const msg = err?.message || 'تعذر حذف النموذج';
      if (msg.includes('معتمد')) {
        showToast(msg, 'error');
        return;
      }
      const localSuccess = deleteParentNoticeFormLocal(formId);
      if (localSuccess) {
        setParentNoticeForms((prev) => prev.filter((f) => f.id !== formId));
        showToast('تم حذف النموذج محلياً', 'info');
      } else {
        showToast('لا يمكن حذف نموذج معتمد ومسلّم', 'error');
      }
    }
  };

  // Purge demo data handler (System Admin only)
  const handlePurgeDemo = () => {
    purgeLocalDemoData();
    if (currentUser) {
      loadFirestoreData(currentUser);
    }
    showToast('تم مسح البيانات التجريبية المحلية بنجاح', 'success');
  };

  // Active student for profile modal
  const activeProfileStudent = useMemo(() => {
    return (
      students.find(
        (s) => s.id === activeProfileStudentId || s.studentNumber === activeProfileStudentId
      ) || null
    );
  }, [students, activeProfileStudentId]);

  // Loading Screen
  if (authLoading || authResolution.status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B2748] text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-[#12395B] border-2 border-[#C9A227] flex items-center justify-center shadow-lg mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-[#C9A227] animate-spin" />
        </div>
        <h2 className="text-lg font-black text-white">أكاديمية الفجيرة العلمية الإسلامية</h2>
        <p className="text-xs text-[#C9A227] mt-1">البوابة الإلكترونية الرسمية ونظام المرشد المدرسي الذكي</p>
      </div>
    );
  }

  // If user is not authenticated or not yet approved
  if (!currentUser) {
    // 1. If user signed in with Google but is not in users/{uid} and has no request -> "طلب إنشاء حساب"
    if (
      authResolution.status === 'not_registered' ||
      (authResolution.status === 'rejected' && isEditingRequest)
    ) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200" dir="rtl">
          <RegistrationRequestPage
            fbUser={authResolution.fbUser}
            onSubmitted={(req) => {
              setAuthResolution({
                status: 'pending',
                request: req,
                fbUser: authResolution.fbUser,
              });
              setIsEditingRequest(false);
            }}
            onShowToast={showToast}
          />
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      );
    }

    // 2. If user signed in with Google and request is pending or rejected -> "بانتظار الاعتماد"
    if (authResolution.status === 'pending' || authResolution.status === 'rejected') {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200" dir="rtl">
          <PendingApprovalPage
            fbUser={authResolution.fbUser}
            request={authResolution.request}
            onRefreshStatus={async () => {
              if (authResolution.fbUser) {
                const refreshed = await checkUserRegistrationStatus(authResolution.fbUser);
                setAuthResolution(refreshed);
                if (refreshed.status === 'approved') {
                  setCurrentUser(refreshed.appUser);
                  loadFirestoreData(refreshed.appUser);
                }
              }
            }}
            onEditRequest={() => setIsEditingRequest(true)}
            onShowToast={showToast}
          />
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      );
    }

    // 3. Public Official Academy Portal or Login Page
    if (showPublicPortalBeforeLogin) {
      return (
        <div className="min-h-screen bg-[#FAF7EF] dark:bg-[#0B2748] text-[#0B2748] dark:text-slate-100 font-sans transition-colors duration-200 flex flex-col" dir="rtl">
          <AcademyPortalPage
            students={students}
            onOpenCounselorWorkspace={() => setShowPublicPortalBeforeLogin(false)}
            onOpenLoginModalOrPage={() => setShowPublicPortalBeforeLogin(false)}
            isAuthenticated={false}
            onShowToast={showToast}
          />
          <footer className="bg-[#0B2748] text-white border-t-2 border-[#C9A227] py-6 px-6 text-center text-xs no-print mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#C9A227]" />
                <span className="font-black text-white">أكاديمية الفجيرة العلمية الإسلامية</span>
              </div>
              <p className="font-bold text-[#C9A227]">
                جميع الحقوق محفوظة لأكاديمية الفجيرة العلمية الإسلامية © 2026–2027
              </p>
            </div>
          </footer>
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FAF7EF] dark:bg-[#0B2748] text-[#0B2748] dark:text-slate-100 font-sans transition-colors duration-200" dir="rtl">
        <LoginPage
          onLogin={handleLogin}
          onAuthResolved={(res) => {
            setAuthResolution(res);
            if (res.status === 'approved') {
              handleLogin(res.appUser);
            }
          }}
          onShowToast={showToast}
          isDarkMode={theme === 'dark'}
          onToggleDarkMode={handleToggleTheme}
          initialAuthResolution={authResolution}
          onOpenPublicPortal={() => setShowPublicPortalBeforeLogin(true)}
        />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  const isViewer = currentUser.role === 'viewer';
  const canManageUsers = currentUser.role === 'systemAdmin' || currentUser.role === 'schoolAdmin';

  const handleNavigateTab = (tab: NavTab) => {
    if (tab === 'users' && !canManageUsers) {
      showToast('لا تملك الصلاحية للوصول لإدارة المستخدمين', 'error');
      return;
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#0b1320] text-slate-900 dark:text-slate-100 font-sans flex flex-col transition-colors duration-200" dir="rtl">
      {/* Top Header */}
      <Header
        counselor={counselorAdapter}
        students={students}
        violations={violations}
        tardinessRecords={tardinessRecords}
        absences={absences}
        stats={stats}
        onNavigate={handleNavigateTab}
        onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
        onLogout={handleLogout}
        onPurgeDemoData={handlePurgeDemo}
        onShowToast={showToast}
        isDarkMode={theme === 'dark'}
        onToggleDarkMode={handleToggleTheme}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        onOpenUserSettings={() => setIsUserSettingsOpen(true)}
        onOpenSchoolSettings={() => setIsSchoolSettingsOpen(true)}
      />

      {/* Main Body with Unified RTL Sidebar on the right */}
      <div className="flex-1 flex flex-row min-w-0 w-full relative">
        {/* Right-side Unified Sidebar (Desktop & Mobile Drawer) */}
        <Navigation
          currentTab={currentTab}
          onSelectTab={handleNavigateTab}
          stats={stats}
          tardyTodayCount={stats.tardyTodayCount}
          absencesTodayCount={stats.absencesTodayCount}
          openViolationsCount={stats.openViolationsCount}
          unconfirmedMessagesCount={unconfirmedMessagesCount}
          userRole={currentUser.role}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Dynamic Content Area: smoothly fills remaining space without clipping */}
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 overflow-x-hidden">
          {/* Firestore Error Warning if disconnected */}
          {firestoreError && (
            <div className="no-print max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold">تنبيه قاعدة البيانات: </span>
                  <span>{firestoreError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => loadFirestoreData(currentUser)}
                  className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 cursor-pointer"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* Background syncing indicator if already has data */}
          {dataLoading && students.length > 0 && (
            <div className="no-print max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#006D77] bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-xl shadow-2xs w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006D77]" />
                <span>جاري مزامنة أحدث البيانات من السحابة...</span>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {dataLoading && students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-8 h-8 text-[#006D77] animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  جاري تحميل ومزامنة البيانات من Cloud Firestore...
                </p>
              </div>
            ) : (
              <>
                {/* TAB 0: OFFICIAL ACADEMY PORTAL */}
                {currentTab === 'academy-portal' && (
                  <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8">
                    <AcademyPortalPage
                      students={students}
                      onOpenCounselorWorkspace={(tab) => setCurrentTab(tab || 'dashboard')}
                      isAuthenticated={true}
                      currentUserName={currentUser.fullName}
                      onShowToast={showToast}
                    />
                  </div>
                )}

                {/* TAB 1: DASHBOARD */}
                {currentTab === 'dashboard' && (
                  <DashboardPage
                    stats={stats}
                    counselor={counselorAdapter}
                    students={students}
                    todayTardiness={tardinessRecords.filter(
                      (r) => r.date === getUaeTodayDateString()
                    )}
                    absences={absences}
                    violations={violations}
                    onNavigate={(tab) => {
                      if (tab === 'users' && !canManageUsers) return;
                      setCurrentTab(tab);
                    }}
                    onOpenAddStudent={() => {
                      if (isViewer) {
                         showToast('صلاحياتك لا تسمح بإضافة طالب', 'warning');
                        return;
                      }
                      setIsAddStudentOpen(true);
                    }}
                    onOpenImportStudents={() => {
                      if (isViewer) {
                        showToast('صلاحياتك لا تسمح باستيراد الطلبة', 'warning');
                        return;
                      }
                      setIsImportOpen(true);
                    }}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onOpenWarningFormForStudent={(id) => {
                      setSelectedStudentIdForWarning(id);
                      setCurrentTab('warning-form');
                    }}
                    onOpenUserSettings={() => setIsUserSettingsOpen(true)}
                  />
                )}


                {/* TAB: COUNSELING CASES MANAGEMENT (إدارة الحالات والإرشاد) */}
                {currentTab === 'cases' && (
                  <CounselingCasesPage
                    students={students}
                    currentUser={currentUser}
                    onUpdateStudent={handleUpdateStudent}
                    onShowToast={showToast}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                  />
                )}

                {/* TAB 2: STUDENTS DIRECTORY */}
                {currentTab === 'students' && (
                  <StudentsPage
                    students={students}
                    tardinessRecords={tardinessRecords}
                    violations={violations}
                    absences={absences}
                    onOpenProfile={(id) => setActiveProfileStudentId(id)}
                    onOpenAddModal={() => setIsAddStudentOpen(true)}
                    onOpenImportModal={() => setIsImportOpen(true)}
                    onOpenManageModal={() => setIsManageStudentsOpen(true)}
                    onOpenTrackCorrection={() => setIsTrackCorrectionOpen(true)}
                    onNavigateToTardiness={() => setCurrentTab('tardiness')}
                    onNavigateToViolation={(studentId) => {
                      setPreselectedStudentIdForViolation(studentId || null);
                      setCurrentTab('violations');
                    }}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    isViewer={isViewer}
                  />
                )}

                {/* TAB: ABSENCES & ATTENDANCE (الغياب والحضور) */}
                {currentTab === 'absences' && (
                  <AbsencePage
                    students={students}
                    absenceRecords={absences}
                    counselor={counselorAdapter}
                    onSaveAbsenceBatch={handleSaveAbsenceBatch}
                    onUpdateAbsence={handleUpdateAbsence}
                    onDeleteAbsence={handleDeleteAbsence}
                    onShowToast={showToast}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onOpenMessageForStudent={(id) => {
                      setSelectedStudentIdForMessage(id);
                      setCurrentTab('messages');
                    }}
                  />
                )}

                {/* TAB 3: MORNING TARDINESS (التأخير الصباحي) */}
                {currentTab === 'tardiness' && (
                  <TardinessPage
                    students={students}
                    tardinessRecords={tardinessRecords}
                    allLinkedForms={allLinkedForms}
                    counselor={counselorAdapter}
                    onSaveTardinessBatch={handleSaveTardinessBatch}
                    onUpdateTardiness={handleUpdateTardiness}
                    onDeleteTardiness={handleDeleteTardiness}
                    onBatchDeleteTardiness={handleBatchDeleteTardiness}
                    onPurgeAllTardiness={handlePurgeAllTardiness}
                    onShowToast={showToast}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onOpenMessageForStudent={(id) => {
                      setSelectedStudentIdForMessage(id);
                      setSelectedStudentIdsForMessage([id]);
                      setCurrentTab('messages');
                    }}
                    onNavigateToMessagesWithStudents={(preselectedStudents) => {
                      setSelectedStudentIdsForMessage(preselectedStudents.map((s) => s.id));
                      if (preselectedStudents.length > 0) {
                        setSelectedStudentIdForMessage(preselectedStudents[0].id);
                      }
                      setCurrentTab('messages');
                    }}
                    onOpenFormForStudent={(studentId, formType, formId) => {
                      setSelectedStudentIdForWarning(studentId);
                      setSelectedViolationIdForForm(formId || null);
                      if (formType?.includes('warning') || formType?.includes('pledge') || formType?.includes('تعهد')) {
                        setActiveFormsSubTab('model9-warning');
                      } else if (formType?.includes('summon') || formType?.includes('استدعاء')) {
                        setActiveFormsSubTab('model8-summon');
                      } else if (formType?.includes('notice') || formType?.includes('حسم')) {
                        setActiveFormsSubTab('model7-notice');
                      } else {
                        setActiveFormsSubTab('model9-warning');
                      }
                      setCurrentTab('forms');
                    }}
                    canManageAllDelays={
                      currentUser?.role === 'admin' ||
                      currentUser?.role === 'schoolAdmin' ||
                      currentUser?.role === 'school_admin' ||
                      currentUser?.role === 'systemAdmin' ||
                      currentUser?.role === 'system_owner' ||
                      currentUser?.role === 'counselor'
                    }
                  />
                )}

                {/* TAB 4: VIOLATIONS & INCIDENTS */}
                {currentTab === 'violations' && (
                  <ViolationsPage
                    students={students}
                    violations={violations}
                    violationReports={violationReports}
                    counselor={counselorAdapter}
                    onAddViolation={handleAddViolation}
                    onUpdateViolation={handleUpdateViolation}
                    onDeleteViolation={handleDeleteViolation}
                    onShowToast={showToast}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onOpenViolationReportForStudent={(studentId, violationId) => {
                      setSelectedStudentIdForWarning(studentId);
                      setSelectedViolationIdForForm(violationId || null);
                      setCurrentTab('forms');
                    }}
                    onSendViolationsToMessages={(violationIds, studentIds) => {
                      setSelectedViolationIdsForMessage(violationIds);
                      setSelectedStudentIdsForMessage(studentIds);
                      if (studentIds.length > 0) {
                        setSelectedStudentIdForMessage(studentIds[0]);
                      }
                      setCurrentTab('messages');
                    }}
                    preselectedStudentId={preselectedStudentIdForViolation}
                    onClearPreselectedStudent={() => setPreselectedStudentIdForViolation(null)}
                  />
                )}

                {/* TAB 5: BYLAWS & OFFICIAL FORMS & SIGNATURES */}
                {(currentTab === 'bylaws' || currentTab === 'forms' || currentTab === 'warning-form') && (
                  <BylawsPage
                    students={students}
                    counselor={currentUser}
                    warningForms={warningForms}
                    parentSummonForms={parentSummonForms}
                    violationReports={violationReports}
                    parentNoticeForms={parentNoticeForms}
                    violations={violations}
                    onSaveWarningForm={handleSaveWarningForm}
                    onSaveSummonForm={handleSaveParentSummonForm}
                    onDeleteSummonForm={handleDeleteParentSummonForm}
                    onSaveViolationReport={handleSaveViolationReport}
                    onDeleteViolationReport={handleDeleteViolationReport}
                    onSaveNoticeForm={handleSaveParentNoticeForm}
                    onDeleteNoticeForm={handleDeleteParentNoticeForm}
                    onShowToast={showToast}
                    selectedStudentIdForForm={selectedStudentIdForWarning}
                    selectedViolationIdForForm={selectedViolationIdForForm}
                    initialSubTab={
                      currentTab === 'warning-form'
                        ? 'model9-warning'
                        : selectedViolationIdForForm
                        ? 'bundle-engine'
                        : activeFormsSubTab || 'model8-summon'
                    }
                    initialFormsSubTab={
                      currentTab === 'warning-form'
                        ? 'model9-warning'
                        : selectedViolationIdForForm
                        ? 'bundle-engine'
                        : activeFormsSubTab
                    }
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                  />
                )}

                {/* TAB 6: SCHOOL MESSAGING SYSTEM */}
                {currentTab === 'messages' && (
                  <MessagesPage
                    students={students}
                    violations={violations}
                    absences={absences}
                    tardinessRecords={tardinessRecords}
                    schoolId={activeSchoolId}
                    currentUser={currentUser ? {
                      uid: currentUser.uid,
                      displayName: currentUser.displayName,
                      email: currentUser.email,
                      role: currentUser.role,
                    } : undefined}
                    initialStudentId={selectedStudentIdForMessage}
                    initialSelectedStudentIds={selectedStudentIdsForMessage}
                    initialSelectedViolationIds={selectedViolationIdsForMessage}
                    onClearInitialViolations={() => setSelectedViolationIdsForMessage([])}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    queueItems={messageQueue}
                    onQueueItemsChange={setMessageQueue}
                  />
                )}

                {/* TAB 7: USERS MANAGEMENT & AUDIT LOGS (Admins only) */}
                {currentTab === 'users' && canManageUsers && (
                  <UsersManagementPage
                    currentUser={currentUser}
                    onShowToast={showToast}
                    students={students}
                    onDeleteImportBatch={handleDeleteImportBatch}
                    onImpersonateSchool={(school) => {
                      showToast(`تم تفعيل وضع المعاينة لمدرسة ${school.schoolNameArabic} (#${school.schoolNumber})`, 'info');
                    }}
                  />
                )}

                {/* TAB: BEHAVIOR COMMITTEE (لجنة إدارة السلوك) */}
                {currentTab === 'committee' && (
                  <CommitteePage
                    students={students}
                    violations={violations}
                    currentUser={counselorAdapter}
                    onShowToast={showToast}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                  />
                )}

                {/* TAB: EMPLOYEES & STAFF REGISTRY (سجل الموظفين والكادر المدرسي) */}
                {currentTab === 'employees' && (
                  <EmployeesPage
                    currentUser={currentUser}
                    onShowToast={showToast}
                    onNavigateToTab={(tab) => setCurrentTab(tab as any)}
                  />
                )}

                {/* TAB: REPORTS (التقارير الشاملة) */}
                {currentTab === 'reports' && (
                  <ReportsSettingsPage
                    students={students}
                    currentUser={counselorAdapter}
                    onOpenUsersManagement={() => {
                      if (canManageUsers) setCurrentTab('users');
                      else showToast('يتطلب صلاحيات مدير النظام', 'warning');
                    }}
                    onOpenUserSettings={() => setIsUserSettingsOpen(true)}
                    onShowToast={showToast}
                  />
                )}

                {/* TAB: COMPREHENSIVE SETTINGS (إعدادات النظام والتحكم الشامل) */}
                {currentTab === 'settings' && (
                  <SettingsPage
                    currentUser={counselorAdapter}
                    students={students}
                    violations={violations}
                    onOpenStudentProfile={(id) => setActiveProfileStudentId(id)}
                    onNavigateTab={handleNavigateTab}
                    onOpenUsersManagement={() => {
                      if (canManageUsers) setCurrentTab('users');
                      else showToast('يتطلب صلاحيات مدير النظام', 'warning');
                    }}
                    onShowToast={showToast}
                  />
                )}
              </>
            )}
          </main>

          {/* Unified Official Footer */}
          <footer className="bg-[#0B2748] text-white border-t-2 border-[#C9A227] py-6 px-6 text-xs no-print">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#C9A227]" />
                    <span className="text-sm font-black text-white">أكاديمية الفجيرة العلمية الإسلامية</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    مؤسسة تعليمية وتربوية رائدة في إمارة الفجيرة بدولة الإمارات العربية المتحدة تجمع بين التميز العلمي الأصيل والقيم الإسلامية والابتكار الرقمي.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-black text-[#C9A227] block">روابط سريعة</span>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <button type="button" onClick={() => setCurrentTab('academy-portal')} className="hover:text-[#C9A227] cursor-pointer">البوابة الرسمية</button>
                    <span>•</span>
                    <button type="button" onClick={() => setCurrentTab('dashboard')} className="hover:text-[#C9A227] cursor-pointer">لوحة التحكم</button>
                    <span>•</span>
                    <button type="button" onClick={() => setCurrentTab('students')} className="hover:text-[#C9A227] cursor-pointer">سجل الطلبة</button>
                    <span>•</span>
                    <button type="button" onClick={() => setCurrentTab('forms')} className="hover:text-[#C9A227] cursor-pointer">النماذج واللوائح</button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-black text-[#C9A227] block">بيانات التواصل الرسمية</span>
                  <p className="text-[11px] text-slate-300">إمارة الفجيرة – دولة الإمارات العربية المتحدة</p>
                  <p className="text-[11px] text-slate-300 font-mono">09-2220000 • info@fsia.edu.ae</p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#12395B] flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
                <p className="font-bold text-[#C9A227]">
                  جميع الحقوق محفوظة لأكاديمية الفجيرة العلمية الإسلامية © 2026–2027
                </p>
                <p className="text-[11px] text-slate-300">
                  البوابة الإلكترونية الرسمية ونظام الرعاية والإرشاد الطلابي الذكي
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Non-Intrusive Internal Counselor Notification System (Local Storage backed) */}
      <CounselorNotificationBanner
        onOpenStudentProfile={(studentId) => setActiveProfileStudentId(studentId)}
        onNavigateToFormOrTab={(tabTarget, studentId, recordId, notifType) => {
          if (studentId) {
            setSelectedStudentIdForWarning(studentId);
          }
          if (recordId) {
            setSelectedViolationIdForForm(recordId);
          }
          if (notifType === 'warning_form_draft' || notifType === 'warning_form_approval') {
            setActiveFormsSubTab('model9-warning');
            setCurrentTab('warning-form');
          } else {
            setCurrentTab(tabTarget);
          }
        }}
      />

      {/* Smooth Scroll-to-Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="العودة إلى الأعلى"
          aria-label="العودة إلى الأعلى"
          className="no-print fixed bottom-5 right-5 z-40 w-10 h-10 rounded-xl bg-[#0B2748] hover:bg-[#C9A227] text-[#C9A227] hover:text-[#0B2748] border-2 border-[#C9A227] shadow-lg flex items-center justify-center transition-all cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* MODALS */}
      {/* 0. School Settings Modal */}
      <SchoolSettingsModal
        isOpen={isSchoolSettingsOpen}
        onClose={() => setIsSchoolSettingsOpen(false)}
        onShowToast={showToast}
      />

      {/* 1. Add Student Modal */}
      <AddStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        onSave={handleAddStudent}
        existingStudents={students}
      />

      {/* 2. Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportStudents}
        currentUser={currentUser || undefined}
        onDeleteBatch={handleDeleteImportBatch}
        onOpenManageModal={() => setIsManageStudentsOpen(true)}
      />

      {/* 3. Student Profile & Unified Timeline Modal */}
      <StudentProfileModal
        isOpen={Boolean(activeProfileStudentId)}
        student={activeProfileStudent}
        tardinessRecords={tardinessRecords}
        violations={violations}
        absences={absences}
        warningForms={warningForms}
        parentSummonForms={parentSummonForms}
        violationReports={violationReports}
        parentNoticeForms={parentNoticeForms}
        onRegisterViolationForStudent={(studentId) => {
          setActiveProfileStudentId(null);
          setPreselectedStudentIdForViolation(studentId);
          setCurrentTab('violations');
        }}
        onClose={() => setActiveProfileStudentId(null)}
        onEditStudent={(s) => {
          setActiveProfileStudentId(null);
          setStudentToEdit(s);
        }}
        onOpenWarningForStudent={(studentId) => {
          setSelectedStudentIdForWarning(studentId);
          setActiveFormsSubTab('model9-warning');
          setCurrentTab('forms');
        }}
        onOpenNoticeForStudent={(studentId) => {
          setSelectedStudentIdForWarning(studentId);
          setActiveFormsSubTab('model7-notice');
          setCurrentTab('forms');
        }}
        onOpenSummonForStudent={(studentId) => {
          setSelectedStudentIdForWarning(studentId);
          setActiveFormsSubTab('model8-summon');
          setCurrentTab('forms');
        }}
        onOpenViolationReportForStudent={(studentId) => {
          setSelectedStudentIdForWarning(studentId);
          setSelectedViolationIdForForm(null);
          setActiveFormsSubTab('model6-violation');
          setCurrentTab('forms');
        }}
        onOpenCommitmentForStudent={(studentId) => {
          setSelectedStudentIdForWarning(studentId);
          setActiveFormsSubTab('model10-commitment');
          setCurrentTab('forms');
        }}
        onOpenMessageForStudent={(studentId) => {
          setSelectedStudentIdForMessage(studentId);
          setCurrentTab('messages');
        }}
      />

      {/* 4. Edit Student Modal */}
      {studentToEdit && (
        <EditStudentModal
          isOpen={Boolean(studentToEdit)}
          student={studentToEdit}
          onClose={() => setStudentToEdit(null)}
          onUpdate={handleUpdateStudent}
          onDelete={handleDeleteStudent}
          isViewer={isViewer}
        />
      )}

      {/* 5. Manage & Clear Students Modal */}
      <ManageStudentsModal
        isOpen={isManageStudentsOpen}
        onClose={() => setIsManageStudentsOpen(false)}
        students={students}
        onOpenImportModal={() => setIsImportOpen(true)}
        onOpenTrackCorrection={() => setIsTrackCorrectionOpen(true)}
        onDeleteAllStudents={handleDeleteAllStudents}
        onDeleteFilteredStudents={handleDeleteFilteredStudents}
        isViewer={isViewer}
        currentUser={currentUser}
        schoolId={activeSchoolId}
        onRefreshData={() => {
          if (currentUser) loadFirestoreData(currentUser, activeSchoolId);
        }}
        onShowToast={showToast}
      />

      {/* 5.5 Track Review & Correction Modal */}
      <TrackCorrectionModal
        isOpen={isTrackCorrectionOpen}
        onClose={() => setIsTrackCorrectionOpen(false)}
        students={students}
        onUpdateStudentsTrack={handleUpdateStudentsTrack}
        currentUserName={currentUser?.fullName || 'المرشد الأكاديمي'}
        isViewer={isViewer}
      />

      {/* 6. User Settings & Profile Modal */}
      {isUserSettingsOpen && currentUser && (
        <UserSettingsModal
          isOpen={isUserSettingsOpen}
          onClose={() => setIsUserSettingsOpen(false)}
          currentUser={currentUser}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          onShowToast={showToast}
          onNavigateToUsersManagement={canManageUsers ? () => setCurrentTab('users') : undefined}
        />
      )}

      {/* 6. Global Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
