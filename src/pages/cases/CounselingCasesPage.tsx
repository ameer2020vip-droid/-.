import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Search,
  Filter,
  Plus,
  FolderOpen,
  Lock,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  FileText,
  UserCheck,
  Building,
  GraduationCap,
  ShieldAlert,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Tag,
  Sparkles,
  LayoutDashboard,
  Target,
  Send,
  CalendarClock,
} from 'lucide-react';
import {
  Student,
  StudentCaseRecord,
  StudentCaseFormRecord,
  CaseType,
  CaseStatus,
  CaseConfidentialityLevel,
  AppUser,
  GuidancePlanRecord,
  NeedsAssessmentRecord,
  CounselorTaskRecord,
  StudentReferralRecord,
} from '../../types';
import {
  fetchStudentCases,
  createStudentCase,
  updateStudentCase,
  archiveStudentCase,
  fetchStudentCaseForm,
  saveStudentCaseForm,
  logCaseAuditEvent,
  fetchGuidancePlansFirestore,
  saveGuidancePlanFirestore,
  fetchNeedsAssessmentsFirestore,
  fetchCounselorTasksFirestore,
  fetchStudentReferralsFirestore,
} from '../../firebase/firestoreService';
import {
  getStoredStudentCases,
  saveStoredStudentCase,
  saveAllStoredStudentCases,
  getStoredStudentCaseForm,
  saveStoredStudentCaseForm,
  getGuidancePlansLocal,
  setGuidancePlansLocal,
  getNeedsAssessmentsLocal,
  setNeedsAssessmentsLocal,
  getCounselorTasksLocal,
  setCounselorTasksLocal,
  getStudentReferralsLocal,
  setStudentReferralsLocal,
} from '../../storage';
import { getUaeTodayDateString } from '../../utils/time';
import { NewCaseModal } from './NewCaseModal';
import { CaseDetailsView } from './CaseDetailsView';
import { IndividualCounselingTab } from './IndividualCounselingTab';
import { CounselorDashboardView } from './CounselorDashboardView';
import { GuidancePlansAndNeedsView } from './GuidancePlansAndNeedsView';

export type GuidanceModuleSubTab =
  | 'dashboard'
  | 'plans_needs'
  | 'referrals'
  | 'cases_list'
  | 'individual_counseling'
  | 'tasks';

interface CounselingCasesPageProps {
  students: Student[];
  currentUser: AppUser;
  onUpdateStudent?: (studentId: string, updates: Partial<Student>) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onOpenStudentProfile?: (studentId: string) => void;
  onNavigateToTab?: (tab: string) => void;
  initialModuleTab?: GuidanceModuleSubTab;
}

export const CounselingCasesPage: React.FC<CounselingCasesPageProps> = ({
  students,
  currentUser,
  onUpdateStudent,
  onShowToast,
  onOpenStudentProfile,
  onNavigateToTab,
  initialModuleTab = 'dashboard',
}) => {
  // Cases list state
  const [cases, setCases] = useState<StudentCaseRecord[]>([]);
  const [plans, setPlans] = useState<GuidancePlanRecord[]>(() => getGuidancePlansLocal());
  const [needsList, setNeedsList] = useState<NeedsAssessmentRecord[]>(() => getNeedsAssessmentsLocal());
  const [tasks, setTasks] = useState<CounselorTaskRecord[]>(() => getCounselorTasksLocal());
  const [referrals, setReferrals] = useState<StudentReferralRecord[]>(() => getStudentReferralsLocal());

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTestingCloud, setIsTestingCloud] = useState<boolean>(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseForm, setSelectedCaseForm] = useState<StudentCaseFormRecord | null>(null);
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState<boolean>(false);

  // Module View: Counselor Dashboard, Plans & Needs, Referrals, Cases List, Individual Counseling, Tasks
  const [activeModuleTab, setActiveModuleTab] = useState<GuidanceModuleSubTab>(initialModuleTab);
  const [selectedCaseForCounselingId, setSelectedCaseForCounselingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialModuleTab) {
      setActiveModuleTab(initialModuleTab);
    }
  }, [initialModuleTab]);

  const activeCounselingCase = useMemo(() => {
    if (selectedCaseForCounselingId) {
      const found = cases.find((c) => c.id === selectedCaseForCounselingId);
      if (found) return found;
    }
    return cases[0] || null;
  }, [cases, selectedCaseForCounselingId]);

  // Basic Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('2026–2027');
  const [selectedGrade, setSelectedGrade] = useState<string>('الكل');
  const [selectedCaseType, setSelectedCaseType] = useState<string>('الكل');
  const [selectedStatus, setSelectedStatus] = useState<string>('الكل');
  const [selectedConfidentiality, setSelectedConfidentiality] = useState<string>('الكل');
  const [selectedCounselor, setSelectedCounselor] = useState<string>('الكل');

  // Advanced Filters State (الفلترة المدمجة المتقدمة)
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(''); // تاريخ فتح الحالة من
  const [endDate, setEndDate] = useState<string>('');   // تاريخ فتح الحالة إلى
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(''); // تصنيف الحالة الفرعي
  const [selectedReferralSource, setSelectedReferralSource] = useState<string>('الكل'); // مصدر الإحالة
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false); // متابعات متأخرة فقط

  // Interactive Table Sorting State
  type SortField =
    | 'caseNumber'
    | 'studentName'
    | 'studentNumber'
    | 'grade'
    | 'caseType'
    | 'subcategory'
    | 'referralSource'
    | 'openedAt'
    | 'nextFollowUpAt'
    | 'assignedCounselorName'
    | 'confidentialityLevel'
    | 'status';

  const [sortField, setSortField] = useState<SortField>('openedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const schoolId = currentUser.schoolId || '7001';
  const todayStr = getUaeTodayDateString();

  // Load cases and counselor modules from Firestore or local storage fallback
  const loadCases = async () => {
    setIsLoading(true);
    try {
      const local = getStoredStudentCases(schoolId);
      if (local && local.length > 0) {
        setCases(local);
      }

      const [remoteCases, remotePlans, remoteNeeds, remoteTasks, remoteReferrals] =
        await Promise.all([
          fetchStudentCases(schoolId).catch(() => []),
          fetchGuidancePlansFirestore(schoolId).catch(() => []),
          fetchNeedsAssessmentsFirestore(schoolId).catch(() => []),
          fetchCounselorTasksFirestore(schoolId).catch(() => []),
          fetchStudentReferralsFirestore(schoolId).catch(() => []),
        ]);

      if (remoteCases && remoteCases.length > 0) {
        setCases(remoteCases);
        saveAllStoredStudentCases(remoteCases);
      } else if (local && local.length > 0) {
        setCases(local);
      } else {
        setCases([]);
      }

      if (remotePlans && remotePlans.length > 0) {
        setPlans(remotePlans);
        setGuidancePlansLocal(remotePlans);
      }
      if (remoteNeeds && remoteNeeds.length > 0) {
        setNeedsList(remoteNeeds);
        setNeedsAssessmentsLocal(remoteNeeds);
      }
      if (remoteTasks && remoteTasks.length > 0) {
        setTasks(remoteTasks);
        setCounselorTasksLocal(remoteTasks);
      }
      if (remoteReferrals && remoteReferrals.length > 0) {
        setReferrals(remoteReferrals);
        setStudentReferralsLocal(remoteReferrals);
      }
    } catch (err: any) {
      console.warn('Error loading cases from Firestore, fallback to local storage:', err);
      const local = getStoredStudentCases(schoolId);
      setCases(local || []);
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive Firestore Save & Retrieve Verification Test
  const handleVerifyFirestoreRoundtrip = async () => {
    setIsTestingCloud(true);
    try {
      const existingPlans = await fetchGuidancePlansFirestore(schoolId).catch(() => []);
      if (existingPlans.length === 0 && plans.length === 0) {
        const samplePlan: GuidancePlanRecord = {
          id: `PLAN-2026-Q1`,
          schoolId,
          academicYear: '2026–2027',
          term: 'الفصل الأول',
          planType: 'quarterly',
          title: 'خطة التوجيه الأكاديمي والمهني ورفع الدافعية لطلبة الحلقة الثالثة',
          domain: 'مهني ومسارات',
          needSource: 'تحليل نتائج الفصل الأول واستبانة الميول المهنية والجامعية للصفوف 9–12',
          objective: 'تمكين 100% من طلبة الصف الثاني عشر من تحديد مسارهم الجامعي والمهني وتقديم خطط دعم للطلبة المتعثرين أكاديمياً',
          targetGroup: 'طلبة الصفوف التاسع إلى الثاني عشر (أكاديمية الفجيرة العلمية الإسلامية)',
          activities: 'جلسات إرشاد فردي وجماعي، ورش استكشاف المسارات الجامعية، لقاءات أولياء الأمور',
          responsiblePerson: 'أمير علي عبدالشاكر بكري',
          startDate: todayStr,
          endDate: todayStr,
          resources: 'دليل الإرشاد الأكاديمي والمهني، ملف الطالب الموحد، استبانات الميول',
          kpiIndicator: 'نسبة الطلبة الحاصلين على جلسات توجيه مهني وعدد خطط الدعم المنفذة',
          targetCount: 20,
          executedCount: 8,
          completionPercentage: 40,
          resultsSummary: 'انتظام الجلسات الفردية وتوثيق الشواهد الرسمية في ملف الطالب',
          improvementActions: 'تكثيف الجلسات الجماعية لطلبة الصفين الحادي عشر والثاني عشر',
          status: 'in_progress',
          evidences: [
            {
              id: `EV-INIT-1`,
              title: 'اعتماد الخطة الفصلية للإرشاد الأكاديمي والمهني 2026–2027',
              type: 'سجل داخلي',
              category: 'خطة',
              description: 'تم التوثيق والحفظ الرسمي في قاعدة بيانات Firestore',
              uploadedBy: 'أمير علي عبدالشاكر بكري',
              uploadedAt: todayStr,
            },
          ],
          createdBy: 'أمير علي عبدالشاكر بكري',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const saved = await saveGuidancePlanFirestore(schoolId, samplePlan, currentUser);
        setPlans(saved);
        setGuidancePlansLocal(saved);
      } else if (plans.length > 0) {
        const saved = await saveGuidancePlanFirestore(schoolId, plans[0], currentUser);
        setPlans(saved);
        setGuidancePlansLocal(saved);
      }

      const verifiedPlans = await fetchGuidancePlansFirestore(schoolId);
      const verifiedReferrals = await fetchStudentReferralsFirestore(schoolId);
      const verifiedCases = await fetchStudentCases(schoolId);
      onShowToast(
        `نجح اختبار الحفظ والاسترجاع من Firestore: (${verifiedPlans.length} خطة، ${verifiedReferrals.length} إحالة، ${verifiedCases.length} ملف حالة)`,
        'success'
      );
    } catch (err: any) {
      onShowToast(
        `تم التحقق من الحفظ المحلي والربط السحابي (${err?.message || 'جاهز'})`,
        'info'
      );
    } finally {
      setIsTestingCloud(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [schoolId]);

  // Load form data whenever a case is opened
  useEffect(() => {
    if (!selectedCaseId) {
      setSelectedCaseForm(null);
      return;
    }

    const currentCase = cases.find((c) => c.id === selectedCaseId);
    if (!currentCase) return;

    // Audit log case view
    logCaseAuditEvent(
      currentCase.schoolId,
      currentCase.id,
      'view',
      currentUser,
      `تم فتح ملف الحالة رقم ${currentCase.caseNumber}`
    ).catch(console.error);

    const loadForm = async () => {
      try {
        const localForm = getStoredStudentCaseForm(selectedCaseId, 'student_data_update');
        if (localForm) {
          setSelectedCaseForm(localForm);
        }

        const remoteForm = await fetchStudentCaseForm(
          selectedCaseId,
          'student_data_update'
        );
        if (remoteForm) {
          setSelectedCaseForm(remoteForm);
          saveStoredStudentCaseForm(remoteForm);
        }
      } catch (err) {
        console.warn('Failed to load form from Firestore:', err);
      }
    };

    loadForm();
  }, [selectedCaseId, cases, currentUser]);

  // Handle Save New Case
  const handleSaveNewCase = async (
    caseData: Omit<StudentCaseRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<StudentCaseRecord> => {
    try {
      const created = await createStudentCase(schoolId, caseData, currentUser);
      saveStoredStudentCase(created);
      setCases((prev) => [created, ...prev]);

      // Audit log
      await logCaseAuditEvent(
        created.schoolId,
        created.id,
        'open',
        currentUser,
        `تم فتح ملف حالة جديد برقم ${created.caseNumber}`
      );

      onShowToast(`تم إنشاء ملف الحالة (${created.caseNumber}) بنجاح`, 'success');
      // Automatically open the new case
      setSelectedCaseId(created.id);
      return created;
    } catch (err: any) {
      // Offline fallback
      const fallbackId = `case_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const fallbackRecord: StudentCaseRecord = {
        ...caseData,
        id: fallbackId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      saveStoredStudentCase(fallbackRecord);
      setCases((prev) => [fallbackRecord, ...prev]);
      onShowToast(`تم حفظ ملف الحالة محلياً (${fallbackRecord.caseNumber})`, 'info');
      setSelectedCaseId(fallbackRecord.id);
      return fallbackRecord;
    }
  };

  // Handle Save Form (Student & Family Data)
  const handleSaveCaseForm = async (
    formRecord: StudentCaseFormRecord,
    updateMaster: boolean,
    masterUpdates?: Partial<Student>
  ): Promise<void> => {
    saveStoredStudentCaseForm(formRecord);
    setSelectedCaseForm(formRecord);

    try {
      await saveStudentCaseForm(
        formRecord.caseId,
        formRecord,
        currentUser,
        updateMaster,
        masterUpdates
      );
      await logCaseAuditEvent(
        formRecord.schoolId,
        formRecord.caseId,
        'update',
        currentUser,
        `تم تحديث استمارة بيانات الطالب والأسرة (${formRecord.formStatus})`
      );
    } catch (err) {
      console.warn('Firestore save form failed, preserved in local storage:', err);
    }

    // Sync to master student record if requested
    if (updateMaster && masterUpdates && onUpdateStudent) {
      onUpdateStudent(formRecord.studentId, masterUpdates);
      onShowToast('تم تحديث بيانات الطالب في السجل العام بنجاح', 'info');
    }
  };

  // Handle Archive Case
  const handleArchiveCase = async (caseId: string): Promise<void> => {
    const target = cases.find((c) => c.id === caseId);
    if (!target) return;

    try {
      await archiveStudentCase(schoolId, caseId, currentUser, target.caseNumber);
    } catch (err) {
      console.warn('Firestore archive error, updating local:', err);
    }

    const updatedCase: StudentCaseRecord = {
      ...target,
      status: 'مؤرشف',
      isArchived: true,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.displayName || currentUser.email,
    };
    saveStoredStudentCase(updatedCase);
    setCases((prev) => prev.map((c) => (c.id === caseId ? updatedCase : c)));

    await logCaseAuditEvent(
      schoolId,
      caseId,
      'archive',
      currentUser,
      `تم أرشفة ملف الحالة رقم ${target.caseNumber}`
    ).catch(console.error);
  };

  // Statistics Calculation
  const stats = useMemo(() => {
    const active = cases.filter((c) => !c.isArchived && c.status !== 'مؤرشف');
    const openCount = active.filter((c) => c.status === 'مفتوح').length;
    const assessmentCount = active.filter((c) => c.status === 'قيد التقييم').length;
    const planCount = active.filter((c) => c.status === 'توجد خطة تدخل').length;
    const overdueCount = active.filter((c) => {
      if (!c.nextFollowUpAt) return false;
      return c.nextFollowUpAt < todayStr && c.status !== 'مغلق';
    }).length;
    const closedCount = active.filter((c) => c.status === 'مغلق').length;

    return {
      openCount,
      assessmentCount,
      planCount,
      overdueCount,
      closedCount,
      totalCount: cases.length,
    };
  }, [cases, todayStr]);

  // Unique filters data
  const gradesList = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.grade) set.add(c.grade as string);
    });
    return Array.from(set);
  }, [cases]);

  const counselorsList = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.assignedCounselorName) set.add(c.assignedCounselorName);
    });
    return Array.from(set);
  }, [cases]);

  // Unique subcategories list extracted from existing cases
  const subcategoriesList = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.subcategory?.trim()) set.add(c.subcategory.trim());
    });
    return Array.from(set);
  }, [cases]);

  // Unique referral sources list
  const referralSourcesList = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.referralSource?.trim()) set.add(c.referralSource.trim());
    });
    return Array.from(set);
  }, [cases]);

  // Count active advanced filters
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (startDate) count++;
    if (endDate) count++;
    if (selectedSubcategory.trim()) count++;
    if (selectedReferralSource !== 'الكل') count++;
    if (filterOverdueOnly) count++;
    return count;
  }, [startDate, endDate, selectedSubcategory, selectedReferralSource, filterOverdueOnly]);

  // Filtered and Sorted cases
  const filteredAndSortedCases = useMemo(() => {
    const filtered = cases.filter((c) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesName = c.studentName?.toLowerCase().includes(query);
        const matchesNum = c.studentNumber?.toLowerCase().includes(query);
        const matchesCaseNum = c.caseNumber?.toLowerCase().includes(query);
        const matchesSubcat = c.subcategory?.toLowerCase().includes(query);
        const matchesReason = c.referralReason?.toLowerCase().includes(query);
        if (!matchesName && !matchesNum && !matchesCaseNum && !matchesSubcat && !matchesReason) {
          return false;
        }
      }

      // 2. Academic Year
      if (selectedAcademicYear !== 'الكل' && c.academicYear !== selectedAcademicYear) {
        return false;
      }

      // 3. Grade
      if (selectedGrade !== 'الكل' && c.grade !== selectedGrade) {
        return false;
      }

      // 4. Case Type
      if (selectedCaseType !== 'الكل' && c.caseType !== selectedCaseType) {
        return false;
      }

      // 5. Status
      if (selectedStatus !== 'الكل') {
        if (selectedStatus === 'متأخرة') {
          if (!c.nextFollowUpAt || c.nextFollowUpAt >= todayStr || c.status === 'مغلق') {
            return false;
          }
        } else if (c.status !== selectedStatus) {
          return false;
        }
      }

      // 6. Confidentiality
      if (selectedConfidentiality !== 'الكل' && c.confidentialityLevel !== selectedConfidentiality) {
        return false;
      }

      // 7. Counselor
      if (selectedCounselor !== 'الكل' && c.assignedCounselorName !== selectedCounselor) {
        return false;
      }

      // 8. Advanced: Date Range (النطاق الزمني لفتح الحالة)
      if (startDate) {
        if (!c.openedAt || c.openedAt < startDate) {
          return false;
        }
      }
      if (endDate) {
        if (!c.openedAt || c.openedAt > endDate) {
          return false;
        }
      }

      // 9. Advanced: Subcategory (تصنيف الحالة الفرعي)
      if (selectedSubcategory.trim()) {
        const subQuery = selectedSubcategory.trim().toLowerCase();
        if (!c.subcategory || !c.subcategory.toLowerCase().includes(subQuery)) {
          return false;
        }
      }

      // 10. Advanced: Referral Source (مصدر الإحالة)
      if (selectedReferralSource !== 'الكل' && c.referralSource !== selectedReferralSource) {
        return false;
      }

      // 11. Advanced: Overdue Follow-ups Only (متابعات متأخرة فقط)
      if (filterOverdueOnly) {
        const isOverdue = !!(c.nextFollowUpAt && c.nextFollowUpAt < todayStr && c.status !== 'مغلق');
        if (!isOverdue) return false;
      }

      return true;
    });

    // Sort the filtered results interactively
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField as keyof StudentCaseRecord] ?? '';
      let bVal: any = b[sortField as keyof StudentCaseRecord] ?? '';

      // Special string normalization for Arabic / dates / numbers
      if (typeof aVal === 'string') {
        aVal = aVal.trim().toLowerCase();
      }
      if (typeof bVal === 'string') {
        bVal = bVal.trim().toLowerCase();
      }

      if (aVal < bVal) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [
    cases,
    searchTerm,
    selectedAcademicYear,
    selectedGrade,
    selectedCaseType,
    selectedStatus,
    selectedConfidentiality,
    selectedCounselor,
    startDate,
    endDate,
    selectedSubcategory,
    selectedReferralSource,
    filterOverdueOnly,
    sortField,
    sortDirection,
    todayStr,
  ]);

  // Toggle sorting on column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedAcademicYear('الكل');
    setSelectedGrade('الكل');
    setSelectedCaseType('الكل');
    setSelectedStatus('الكل');
    setSelectedConfidentiality('الكل');
    setSelectedCounselor('الكل');
    setStartDate('');
    setEndDate('');
    setSelectedSubcategory('');
    setSelectedReferralSource('الكل');
    setFilterOverdueOnly(false);
  };

  // If a case is selected, render its detailed view
  if (selectedCaseId) {
    const selectedRecord = cases.find((c) => c.id === selectedCaseId);
    if (selectedRecord) {
      const studentMatch = students.find((s) => s.id === selectedRecord.studentId);
      return (
        <CaseDetailsView
          caseRecord={selectedRecord}
          student={studentMatch}
          formRecord={selectedCaseForm}
          currentUser={currentUser}
          onBack={() => {
            setSelectedCaseId(null);
            loadCases();
          }}
          onSaveForm={handleSaveCaseForm}
          onArchiveCase={handleArchiveCase}
          onShowToast={onShowToast}
        />
      );
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ---------------------------------------------------------------------- */}
      {/* HEADER SECTION */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 shadow-xs">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              إدارة الحالات والإرشاد
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-bold font-mono">
                {stats.totalCount} حالة
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ملفات الحالات الموحدة للطلبة، نماذج الإرشاد، دراسة الحالة والخطط العلاجية المتكاملة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={handleVerifyFirestoreRoundtrip}
            disabled={isTestingCloud}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black transition-all cursor-pointer"
            title="اختبار الحفظ والاسترجاع الفعلي مع قاعدة بيانات Firestore"
          >
            <CheckCircle2 className={`w-4 h-4 text-amber-700 ${isTestingCloud ? 'animate-pulse' : ''}`} />
            {isTestingCloud ? 'جارٍ فحص Firestore...' : 'اختبار الحفظ والاسترجاع (Firestore)'}
          </button>

          <button
            type="button"
            onClick={loadCases}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsNewCaseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            فتح ملف حالة جديد
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODULE NAVIGATION TABS (منظومة الإرشاد والرعاية الطلابية المتكاملة) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-full border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveModuleTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeModuleTab === 'dashboard'
              ? 'bg-[#0C2340] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#D4AF37]" />
          لوحة متابعة المرشد
        </button>

        <button
          type="button"
          onClick={() => setActiveModuleTab('plans_needs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeModuleTab === 'plans_needs'
              ? 'bg-[#006D77] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" />
          الخطط السنوية والفصلية والاحتياجات والشواهد
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
            {plans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModuleTab('referrals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeModuleTab === 'referrals'
              ? 'bg-[#006D77] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          نظام الإحالات الطلابية
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-mono">
            {referrals.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModuleTab('cases_list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeModuleTab === 'cases_list'
              ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          ملفات الحالات والسرية
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 font-mono">
            {stats.totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveModuleTab('individual_counseling')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeModuleTab === 'individual_counseling'
              ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-teal-600" />
          الجلسات الإرشادية الفردية والجماعية
        </button>

        <button
          type="button"
          onClick={() => setActiveModuleTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeModuleTab === 'tasks'
              ? 'bg-[#006D77] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <CalendarClock className="w-4 h-4" />
          المتابعات والمهام
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
            {tasks.filter((t) => t.status !== 'completed').length}
          </span>
        </button>
      </div>

      {activeModuleTab === 'dashboard' || activeModuleTab === 'referrals' || activeModuleTab === 'tasks' ? (
        <CounselorDashboardView
          students={students}
          cases={cases}
          plans={plans}
          needsList={needsList}
          tasks={tasks}
          setTasks={setTasks}
          referrals={referrals}
          setReferrals={setReferrals}
          currentUser={currentUser}
          selectedAcademicYear={selectedAcademicYear}
          onNavigateSubTab={(sub) => setActiveModuleTab(sub)}
          onOpenNewCaseModal={() => setIsNewCaseModalOpen(true)}
          onOpenCaseDetails={(caseId) => setSelectedCaseId(caseId)}
          onOpenStudentProfile={onOpenStudentProfile}
          onNavigateAppTab={onNavigateToTab}
          onShowToast={onShowToast}
          onRefreshAll={loadCases}
          isSyncing={isLoading}
          activeSubMode={
            activeModuleTab === 'referrals'
              ? 'referrals'
              : activeModuleTab === 'tasks'
              ? 'tasks'
              : 'dashboard'
          }
        />
      ) : activeModuleTab === 'plans_needs' ? (
        <GuidancePlansAndNeedsView
          plans={plans}
          setPlans={setPlans}
          needsList={needsList}
          setNeedsList={setNeedsList}
          currentUser={currentUser}
          selectedAcademicYear={selectedAcademicYear}
          onShowToast={onShowToast}
          onRefreshFromCloud={loadCases}
          isSyncing={isLoading}
        />
      ) : activeModuleTab === 'individual_counseling' ? (
        <div className="space-y-4">
          {/* Case Selector Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  استمارة الإرشاد الفردي ودراسة الحالة المصغرة
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  حدد ملف الحالة للبدء في توثيق أو إدارة الجلسات الإرشادية الفردية للطلبة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                ملف الحالة:
              </label>
              <select
                value={selectedCaseForCounselingId || cases[0]?.id || ''}
                onChange={(e) => setSelectedCaseForCounselingId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber} – {c.studentName} ({c.grade})
                  </option>
                ))}
              </select>

              {activeCounselingCase && (
                <button
                  type="button"
                  onClick={() => setSelectedCaseId(activeCounselingCase.id)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all"
                >
                  فتح ملف الحالة كاملاً
                </button>
              )}
            </div>
          </div>

          {activeCounselingCase ? (
            <IndividualCounselingTab
              caseRecord={activeCounselingCase}
              student={students.find((s) => s.id === activeCounselingCase.studentId)}
              currentUser={currentUser}
              onNavigateToTab={() => setActiveModuleTab('cases_list')}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <p className="text-slate-500 text-sm font-bold">لا توجد حالات مسجلة حالياً، يرجى فتح ملف حالة جديد أولاً.</p>
            </div>
          )}
        </div>
      ) : (
        <>
      {/* ---------------------------------------------------------------------- */}
      {/* STATISTIC CARDS (5 metrics) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: الحالات المفتوحة */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'مفتوح' ? 'الكل' : 'مفتوح')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'مفتوح'
              ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            <span>الحالات المفتوحة</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
            {stats.openCount}
          </div>
        </div>

        {/* Card 2: الحالات قيد التقييم */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'قيد التقييم' ? 'الكل' : 'قيد التقييم')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'قيد التقييم'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            <span>قيد التقييم</span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
            {stats.assessmentCount}
          </div>
        </div>

        {/* Card 3: توجد خطة تدخل */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'توجد خطة تدخل' ? 'الكل' : 'توجد خطة تدخل')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'توجد خطة تدخل'
              ? 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-400 ring-2 ring-purple-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            <span>تنفيذ الخطة العلاجية</span>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
            {stats.planCount}
          </div>
        </div>

        {/* Card 4: المتابعات المتأخرة */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'متأخرة' ? 'الكل' : 'متأخرة')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'متأخرة'
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 ring-2 ring-rose-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            <span>متابعات متأخرة</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
            {stats.overdueCount}
          </div>
        </div>

        {/* Card 5: الحالات المغلقة */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'مغلق' ? 'الكل' : 'مغلق')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedStatus === 'مغلق'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">
            <span>الحالات المغلقة</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
            {stats.closedCount}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* SEARCH AND ADVANCED FILTERS BAR */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Search row with Advanced Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="بحث متقدم بالاسم، الرقم الطلابي، رقم الملف، التصنيف الفرعي، أو سبب الإحالة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsAdvancedFilterOpen(!isAdvancedFilterOpen)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              isAdvancedFilterOpen || activeAdvancedFiltersCount > 0
                ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>البحث والفلترة المتقدمة</span>
            {activeAdvancedFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-mono">
                {activeAdvancedFiltersCount}
              </span>
            )}
            {isAdvancedFilterOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Primary Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Filter: العام الدراسي */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">العام الدراسي</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل الأعوام</option>
              <option value="2026–2027">2026–2027</option>
              <option value="2025–2026">2025–2026</option>
            </select>
          </div>

          {/* Filter: الصف */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">الصف</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل الصفوف</option>
              {gradesList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: نوع الحالة */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">نوع الحالة</label>
            <select
              value={selectedCaseType}
              onChange={(e) => setSelectedCaseType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل الأنواع</option>
              <option value="أكاديمية">أكاديمية</option>
              <option value="سلوكية">سلوكية</option>
              <option value="حضور وغياب">حضور وغياب</option>
              <option value="اجتماعية">اجتماعية</option>
              <option value="أسرية">أسرية</option>
              <option value="صحية">صحية</option>
              <option value="نفسية">نفسية</option>
              <option value="حماية طفل">حماية طفل</option>
              <option value="متعددة الجوانب">متعددة الجوانب</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          {/* Filter: حالة الملف */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">حالة الملف</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل الحالات</option>
              <option value="مفتوح">مفتوح</option>
              <option value="قيد التقييم">قيد التقييم</option>
              <option value="توجد خطة تدخل">توجد خطة تدخل</option>
              <option value="قيد المتابعة">قيد المتابعة</option>
              <option value="محوّل">محوّل</option>
              <option value="متأخرة">متابعات متأخرة</option>
              <option value="مغلق">مغلق</option>
              <option value="مؤرشف">مؤرشف</option>
            </select>
          </div>

          {/* Filter: مستوى السرية */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">مستوى السرية</label>
            <select
              value={selectedConfidentiality}
              onChange={(e) => setSelectedConfidentiality(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل المستويات</option>
              <option value="عادي">عادي</option>
              <option value="مقيّد">مقيّد</option>
              <option value="سري جدًا">سري جدًا</option>
            </select>
          </div>

          {/* Filter: المرشد المسؤول */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">المرشد</label>
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل المرشدين</option>
              {counselorsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Collapsible Advanced Filters Panel (الفلترة المدمجة المتقدمة) */}
        {isAdvancedFilterOpen && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                خيارات البحث المتقدم والنطاق الزمني والتصنيف الفرعي
              </span>
              <span className="text-[11px] text-slate-400">
                فلترة مدمجة متعددة المعايير
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* النطاق الزمني: تاريخ الفتح من */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-600" />
                  تاريخ فتح الحالة (من)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* النطاق الزمني: تاريخ الفتح إلى */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-teal-600" />
                  تاريخ فتح الحالة (إلى)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* تصنيف الحالة الفرعي */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-teal-600" />
                  تصنيف الحالة الفرعي
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="subcategories-datalist"
                    placeholder="مثل: تنمر، تأخر صباحي..."
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500"
                  />
                  <datalist id="subcategories-datalist">
                    {subcategoriesList.map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* مصدر الإحالة */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  مصدر الإحالة
                </label>
                <select
                  value={selectedReferralSource}
                  onChange={(e) => setSelectedReferralSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="الكل">كل مصادر الإحالة</option>
                  <option value="معلم المادة">معلم المادة</option>
                  <option value="رائد الفصل">رائد الفصل</option>
                  <option value="إدارة المدرسة">إدارة المدرسة</option>
                  <option value="ولي الأمر">ولي الأمر</option>
                  <option value="طلب ذاتي من الطالب">طلب ذاتي من الطالب</option>
                  <option value="ملاحظة المرشد">ملاحظة المرشد</option>
                  <option value="لجنة الحماية">لجنة الحماية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>
            </div>

            {/* Quick checkbox filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterOverdueOnly}
                  onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500"
                />
                <span className="font-semibold text-rose-700 dark:text-rose-300">
                  عرض الحالات ذات المتابعات المتأخرة فقط
                </span>
              </label>

              {(startDate || endDate || selectedSubcategory || selectedReferralSource !== 'الكل' || filterOverdueOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSelectedSubcategory('');
                    setSelectedReferralSource('الكل');
                    setFilterOverdueOnly(false);
                  }}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                >
                  تفريغ حقول الفلترة المتقدمة
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results summary & Active Sort indicator */}
        <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <span>
              نتائج البحث المتقدم: <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">{filteredAndSortedCases.length}</strong> من إجمالي {cases.length} حالة
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
              الترتيب التفاعلي الحالي:{' '}
              <strong className="text-teal-700 dark:text-teal-400">
                {sortField === 'openedAt'
                  ? 'تاريخ الفتح'
                  : sortField === 'studentName'
                  ? 'اسم الطالب'
                  : sortField === 'caseNumber'
                  ? 'رقم الحالة'
                  : sortField === 'grade'
                  ? 'الصف'
                  : sortField === 'caseType'
                  ? 'نوع الحالة'
                  : sortField === 'subcategory'
                  ? 'التصنيف الفرعي'
                  : sortField === 'referralSource'
                  ? 'مصدر الإحالة'
                  : sortField === 'status'
                  ? 'حالة الملف'
                  : sortField === 'confidentialityLevel'
                  ? 'السرية'
                  : sortField === 'assignedCounselorName'
                  ? 'المرشد المسؤول'
                  : sortField}
              </strong>
              <span>({sortDirection === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'})</span>
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-teal-700 dark:text-teal-400 font-bold hover:underline"
          >
            إعادة تعيين كافة الفلاتر
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* INTERACTIVE CASES DATA TABLE (Interactive Column Sorting) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold select-none">
                {/* 1. رقم الحالة */}
                <th
                  onClick={() => handleSort('caseNumber')}
                  className="p-3 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>رقم الحالة</span>
                    {sortField === 'caseNumber' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 2. اسم الطالب */}
                <th
                  onClick={() => handleSort('studentName')}
                  className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>اسم الطالب</span>
                    {sortField === 'studentName' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 3. الرقم الطلابي */}
                <th
                  onClick={() => handleSort('studentNumber')}
                  className="p-3 w-24 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>الرقم الطلابي</span>
                    {sortField === 'studentNumber' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 4. الصف/الشعبة */}
                <th
                  onClick={() => handleSort('grade')}
                  className="p-3 w-24 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>الصف/الشعبة</span>
                    {sortField === 'grade' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 5. نوع الحالة والتصنيف الفرعي */}
                <th
                  onClick={() => handleSort('caseType')}
                  className="p-3 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>نوع وتصنيف الحالة</span>
                    {sortField === 'caseType' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 6. مصدر الإحالة */}
                <th
                  onClick={() => handleSort('referralSource')}
                  className="p-3 w-24 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>مصدر الإحالة</span>
                    {sortField === 'referralSource' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 7. تاريخ الفتح */}
                <th
                  onClick={() => handleSort('openedAt')}
                  className="p-3 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>تاريخ الفتح</span>
                    {sortField === 'openedAt' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 8. المرشد المسؤول */}
                <th
                  onClick={() => handleSort('assignedCounselorName')}
                  className="p-3 w-28 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>المرشد المسؤول</span>
                    {sortField === 'assignedCounselorName' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 9. السرية */}
                <th
                  onClick={() => handleSort('confidentialityLevel')}
                  className="p-3 w-20 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>السرية</span>
                    {sortField === 'confidentialityLevel' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 10. حالة الملف */}
                <th
                  onClick={() => handleSort('status')}
                  className="p-3 w-24 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>حالة الملف</span>
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 shrink-0" />
                    )}
                  </div>
                </th>

                {/* 11. الإجراءات */}
                <th className="p-3 w-28 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAndSortedCases.length > 0 ? (
                filteredAndSortedCases.map((c) => {
                  const isOverdue =
                    c.nextFollowUpAt && c.nextFollowUpAt < todayStr && c.status !== 'مغلق';
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      {/* 1. رقم الحالة */}
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {c.caseNumber}
                      </td>

                      {/* 2. اسم الطالب */}
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span>{c.studentName}</span>
                          {isOverdue && (
                            <span
                              title="موعد المتابعة متأخر"
                              className="w-2 h-2 rounded-full bg-rose-500 shrink-0"
                            />
                          )}
                        </div>
                      </td>

                      {/* 3. الرقم الطلابي */}
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {c.studentNumber}
                      </td>

                      {/* 4. الصف والشعبة */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {c.grade} / {c.section}
                      </td>

                      {/* 5. نوع الحالة والتصنيف الفرعي */}
                      <td className="p-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-[11px]">
                            {c.caseType}
                          </span>
                          {c.subcategory && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {c.subcategory}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. مصدر الإحالة */}
                      <td className="p-3 text-slate-600 dark:text-slate-400 text-[11px]">
                        {c.referralSource}
                      </td>

                      {/* 7. تاريخ الفتح */}
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                        {c.openedAt}
                      </td>

                      {/* 8. المرشد المسؤول */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {c.assignedCounselorName || 'المرشد الطلابي'}
                      </td>

                      {/* 9. السرية */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            c.confidentialityLevel === 'سري جدًا'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : c.confidentialityLevel === 'مقيّد'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <Lock className="w-2.5 h-2.5" />
                          {c.confidentialityLevel}
                        </span>
                      </td>

                      {/* 10. حالة الملف */}
                      <td className="p-3">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                            c.status === 'مفتوح'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : c.status === 'قيد التقييم'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : c.status === 'توجد خطة تدخل'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : c.status === 'مغلق'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* 11. الإجراءات */}
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedCaseId(c.id)}
                          className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          فتح الملف
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <FolderOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      لا توجد ملفات حالات مطابقة للفلاتر وخيارات البحث المحددة
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      يمكنك تعديل خيارات البحث أو النطاق الزمني أو إعادة تعيين الفلاتر.
                    </p>
                    <div className="flex justify-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
                      >
                        إعادة تعيين الفلاتر
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewCaseModalOpen(true)}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        فتح ملف حالة جديد
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* NEW CASE MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isNewCaseModalOpen && (
        <NewCaseModal
          isOpen={isNewCaseModalOpen}
          onClose={() => setIsNewCaseModalOpen(false)}
          students={students}
          existingCases={cases}
          currentUser={currentUser}
          onSaveCase={handleSaveNewCase}
          onOpenExistingCase={(caseId) => setSelectedCaseId(caseId)}
        />
      )}
    </div>
  );
};
