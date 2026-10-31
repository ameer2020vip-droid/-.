import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  User,
  Clock,
  AlertTriangle,
  FileSignature,
  Calendar,
  CheckCircle2,
  Shield,
  Phone,
  GraduationCap,
  Sparkles,
  Edit,
  MessageSquare,
  Award,
  Users,
  Paperclip,
  TrendingUp,
  Plus,
  FileText,
  Layers,
  Printer,
  ChevronRight,
  Bell,
  UserX,
  ExternalLink,
  Home,
  Activity,
  ArrowRight,
  Mail,
} from 'lucide-react';
import { StudentProfileHeader } from '../components/profile/StudentProfileHeader';
import { StudentQuickActions } from '../components/profile/StudentQuickActions';
import { StudentOverviewTab } from '../components/profile/StudentOverviewTab';
import {
  Student,
  TimelineEvent,
  ParentMeetingRecord,
  BehaviorModificationPlan,
  PositiveBehaviorRecord,
  ViolationRecord,
  TardinessRecord,
  AbsenceRecord,
  BehaviorCommitteeDecision,
  BehaviorCommitteeMeeting,
  WarningFormRecord,
  ParentSummonFormRecord,
  ViolationReportRecord,
  ParentNoticeFormRecord,
  ParentCommitmentFormRecord,
  AttendanceCommitmentRecord,
  AuthorizedPickupCommitmentRecord,
  TemporarySuspensionFormRecord,
  OfficialDocumentRecord,
} from '../types';
import { CommitteeCaseProgressBar, CommitteeStage } from '../components/CommitteeCaseProgressBar';
import { PrintWarningModal } from '../components/PrintWarningModal';
import { PrintSummonModal } from '../components/PrintSummonModal';
import { PrintViolationReportModal } from '../components/PrintViolationReportModal';
import { PrintParentNoticeModal } from '../components/PrintParentNoticeModal';
import { PrintParentCommitmentModal } from '../components/PrintParentCommitmentModal';
import { PrintTemporarySuspensionModal } from '../components/PrintTemporarySuspensionModal';
import { PrintCommitteeMeetingModal } from '../components/PrintCommitteeMeetingModal';
import { PrintAttendanceCommitmentModal } from '../components/PrintAttendanceCommitmentModal';
import { PrintAuthorizedPickupModal } from '../components/PrintAuthorizedPickupModal';
import { OfficialModel6PrintView } from '../components/OfficialModel6PrintView';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import {
  getOfficialDocumentsLocal,
  getStudentTimeline,
  getParentMeetings,
  saveParentMeeting,
  getBehaviorPlans,
  saveBehaviorPlan,
  getPositiveBehaviorRecords,
  savePositiveBehaviorRecord,
  getMorningDelays,
  getAbsences,
  getViolations,
  getWarningForms,
  getParentNoticeForms,
  getParentCommitmentForms,
  getParentSummonForms,
  getViolationReports,
  getAttendanceCommitments,
  getAuthorizedPickupCommitments,
  getTemporarySuspensionForms,
  getCommitteeDecisions,
  getCommitteeMeetings,
  getCommitteeCasesByViolationId,
  referStudentToCommittee,
  dispatchCommitteeNotification,
} from '../storage';
import {
  getLocalMessageLogsForStudent,
  fetchMessageLogs,
  updateMessageLogStatus,
  MESSAGE_STATUS_LABELS_AR,
  MESSAGE_CATEGORY_LABELS_AR,
} from '../firebase/messageService';
import { CATEGORY_LABELS } from '../data/defaultMessageTemplates';
import { getUaeTodayDateString } from '../utils/time';
import { resolveTardinessFollowUpStatus } from '../utils/bylawsRules';
import {
  getUniqueStudentTardinessDates,
  getStudentTardinessRecordsList,
} from '../hooks/useAcademicFiltering';
import {
  fetchGmailQueueRecords,
  extractApprovedGuardianEmail,
} from '../firebase/gmailNotificationService';
import {
  getGmailQueueStateBadge,
  getNotificationTypeLabel,
} from '../components/GmailOAuthIntegrationPanel';
import type { GmailQueueRecord, MessageLogRecord } from '../types';

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  tardinessRecords?: TardinessRecord[];
  violations?: ViolationRecord[];
  absences?: AbsenceRecord[];
  warningForms?: WarningFormRecord[];
  parentSummonForms?: ParentSummonFormRecord[];
  violationReports?: ViolationReportRecord[];
  parentNoticeForms?: ParentNoticeFormRecord[];
  onRegisterViolationForStudent?: (studentId: string) => void;
  onOpenWarningForStudent: (studentId: string) => void;
  onOpenNoticeForStudent?: (studentId: string) => void;
  onOpenSummonForStudent?: (studentId: string) => void;
  onOpenViolationReportForStudent?: (studentId: string) => void;
  onOpenCommitmentForStudent?: (studentId: string) => void;
  onOpenMessageForStudent?: (studentId: string) => void;
  onEditStudent?: (student: Student) => void;
}

type ProfileTabType =
  | 'overview'
  | 'timeline'
  | 'violations'
  | 'tardiness'
  | 'absences'
  | 'forms_signatures'
  | 'communication'
  | 'cases_plans'
  | 'attachments'
  | 'info'
  | 'commitments_warnings'
  | 'parent_meetings'
  | 'behavior_plans'
  | 'positive_behavior'
  | 'committee_decisions';

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  isOpen,
  onClose,
  student,
  tardinessRecords = [],
  violations = [],
  absences = [],
  warningForms = [],
  parentSummonForms = [],
  violationReports = [],
  parentNoticeForms = [],
  onRegisterViolationForStudent,
  onOpenWarningForStudent,
  onOpenNoticeForStudent,
  onOpenSummonForStudent,
  onOpenViolationReportForStudent,
  onOpenCommitmentForStudent,
  onOpenMessageForStudent,
  onEditStudent,
}) => {
  const { schoolSettings } = useSchoolSettings();
  const [activeTab, setActiveTab] = useState<ProfileTabType>('overview');

  const [casesSubTab, setCasesSubTab] = useState<'committee' | 'plans' | 'positive'>('committee');

  // Form states for quick logging inside profile
  const [showAddMeetingModal, setShowAddMeetingModal] = useState<boolean>(false);
  const [meetingTopic, setMeetingTopic] = useState<string>('');
  const [meetingAttendee, setMeetingAttendee] = useState<string>('الأب / ولي الأمر');
  const [meetingAgreedPlan, setMeetingAgreedPlan] = useState<string>('');

  const [showAddPositiveModal, setShowAddPositiveModal] = useState<boolean>(false);
  const [positiveTitle, setPositiveTitle] = useState<string>('');
  const [recoveredMarks, setRecoveredMarks] = useState<number>(2);

  // Committee Referral State
  const [showReferModal, setShowReferModal] = useState<boolean>(false);
  const [referTopic, setReferTopic] = useState<string>('');
  const [referDegree, setReferDegree] = useState<string>('الدرجة الثالثة (جسيمة)');
  const [referProposedAction, setReferProposedAction] = useState<string>(
    'حسم 8 درجات من السلوك، وإلزام الطالب بخطة تعديل سلوك مكثفة مع تكليف مدرسي بديل'
  );
  const [notifyCommitteeOnRefer, setNotifyCommitteeOnRefer] = useState<boolean>(true);

  // States for printing official forms from the student profile
  const [selectedWarningForPrint, setSelectedWarningForPrint] = useState<WarningFormRecord | null>(null);
  const [selectedSummonForPrint, setSelectedSummonForPrint] = useState<ParentSummonFormRecord | null>(null);
  const [selectedViolationReportForPrint, setSelectedViolationReportForPrint] = useState<ViolationReportRecord | null>(null);
  const [selectedNoticeForPrint, setSelectedNoticeForPrint] = useState<ParentNoticeFormRecord | null>(null);
  const [selectedCommitmentForPrint, setSelectedCommitmentForPrint] = useState<ParentCommitmentFormRecord | null>(null);
  const [selectedSuspensionForPrint, setSelectedSuspensionForPrint] = useState<TemporarySuspensionFormRecord | null>(null);
  const [selectedAttendanceCommitmentForPrint, setSelectedAttendanceCommitmentForPrint] = useState<AttendanceCommitmentRecord | null>(null);
  const [selectedPickupCommitmentForPrint, setSelectedPickupCommitmentForPrint] = useState<AuthorizedPickupCommitmentRecord | null>(null);
  const [selectedMeetingForPrint, setSelectedMeetingForPrint] = useState<BehaviorCommitteeMeeting | null>(null);
  const [printingOfficialDoc, setPrintingOfficialDoc] = useState<OfficialDocumentRecord | null>(null);
  const [showTardinessDatesModal, setShowTardinessDatesModal] = useState<boolean>(false);
  const [selectedViolationDetail, setSelectedViolationDetail] = useState<ViolationRecord | null>(null);
  const [studentGmailRecords, setStudentGmailRecords] = useState<GmailQueueRecord[]>([]);
  const [firestoreMessageLogs, setFirestoreMessageLogs] = useState<MessageLogRecord[]>([]);
  const [commChannelFilter, setCommChannelFilter] = useState<'all' | 'whatsapp' | 'email'>('all');
  const [commStatusFilter, setCommStatusFilter] = useState<string>('all');
  const [commSearchQuery, setCommSearchQuery] = useState<string>('');
  const [expandedMessageLogId, setExpandedMessageLogId] = useState<string | null>(null);
  const [confirmingLogId, setConfirmingLogId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !student) {
      setStudentGmailRecords([]);
      setFirestoreMessageLogs([]);
      return;
    }
    let mounted = true;
    const activeSchoolId = schoolSettings.schoolId || '7001';
    fetchGmailQueueRecords(activeSchoolId, student.studentNumber || student.id)
      .then((records) => {
        if (mounted) setStudentGmailRecords(records);
      })
      .catch(() => {});

    fetchMessageLogs(activeSchoolId, 400)
      .then((logs) => {
        if (mounted) setFirestoreMessageLogs(logs);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [isOpen, student, schoolSettings.schoolId]);

  // Merge live Firestore props with localStorage records (deduplicating by id)
  const mergedTardiesList = useMemo(() => {
    const map = new Map<string, TardinessRecord>();
    getMorningDelays().forEach((r) => map.set(r.id, r));
    tardinessRecords.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [tardinessRecords]);

  const mergedViolationsList = useMemo(() => {
    const map = new Map<string, ViolationRecord>();
    getViolations().forEach((r) => map.set(r.id, r));
    violations.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [violations]);

  const mergedAbsencesList = useMemo(() => {
    const map = new Map<string, AbsenceRecord>();
    getAbsences().forEach((r) => map.set(r.id, r));
    absences.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [absences]);

  const mergedWarningsList = useMemo(() => {
    const map = new Map<string, WarningFormRecord>();
    getWarningForms().forEach((r) => map.set(r.id, r));
    warningForms.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [warningForms]);

  const mergedSummonsList = useMemo(() => {
    const map = new Map<string, ParentSummonFormRecord>();
    getParentSummonForms().forEach((r) => map.set(r.id, r));
    parentSummonForms.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [parentSummonForms]);

  const mergedReportsList = useMemo(() => {
    const map = new Map<string, ViolationReportRecord>();
    getViolationReports().forEach((r) => map.set(r.id, r));
    violationReports.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [violationReports]);

  const mergedNoticesList = useMemo(() => {
    const map = new Map<string, ParentNoticeFormRecord>();
    getParentNoticeForms().forEach((r) => map.set(r.id, r));
    parentNoticeForms.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [parentNoticeForms]);

  // Load relevant student records (match by student ID or student national/school number)
  const timelineEvents = useMemo(
    () =>
      student
        ? getStudentTimeline(student.id, {
            studentNumber: student.studentNumber,
            absences: mergedAbsencesList,
            violations: mergedViolationsList,
            tardinessRecords: mergedTardiesList,
            warningForms: mergedWarningsList,
            parentSummonForms: mergedSummonsList,
            violationReports: mergedReportsList,
            parentNoticeForms: mergedNoticesList,
          })
        : [],
    [
      student,
      mergedAbsencesList,
      mergedViolationsList,
      mergedTardiesList,
      mergedWarningsList,
      mergedSummonsList,
      mergedReportsList,
      mergedNoticesList,
    ]
  );
  const parentMeetings = useMemo(() => (student ? getParentMeetings(student.id) : []), [student]);
  const studentMessageLogs = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    const localLogs = getLocalMessageLogsForStudent(student.id, student.studentNumber);
    const map = new Map<string, MessageLogRecord>();

    const matchesStudentByImmutableNumber = (log: MessageLogRecord): boolean => {
      const logStuNum = String(log.studentNumber || '').trim();
      if (stuNum && logStuNum) {
        if (logStuNum === stuNum) return true;
      }
      if (
        stuNum &&
        Array.isArray(log.mergedStudentNumbers) &&
        log.mergedStudentNumbers.some((num) => String(num).trim() === stuNum)
      ) {
        return true;
      }
      // Fallback only if record has no studentNumber or matches studentId directly
      return log.studentId === student.id || (!!stuNum && String(log.studentId || '').trim() === stuNum);
    };

    localLogs.forEach((l) => {
      if (matchesStudentByImmutableNumber(l)) {
        map.set(l.id || l.messageId, l);
      }
    });
    firestoreMessageLogs.forEach((fl) => {
      if (matchesStudentByImmutableNumber(fl)) {
        map.set(fl.id || fl.messageId, fl);
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [student, firestoreMessageLogs]);

  const resolveCommunicationStatusMeta = (log: MessageLogRecord): {
    code: string;
    labelAr: string;
    badgeClass: string;
    canConfirmSent: boolean;
  } => {
    const raw = String(log.status || 'draft');
    if (raw === 'confirmed_sent' || raw === 'sent' || raw === 'أكد الموظف الإرسال') {
      return {
        code: 'confirmed_sent',
        labelAr: 'أكد الموظف الإرسال',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
        canConfirmSent: false,
      };
    }
    if (raw === 'whatsapp_opened' || (raw === 'opened' && log.channel === 'whatsapp') || raw === 'تم فتح واتساب') {
      return {
        code: 'whatsapp_opened',
        labelAr: 'تم فتح واتساب',
        badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700',
        canConfirmSent: true,
      };
    }
    if (raw === 'email_opened' || (raw === 'opened' && log.channel === 'email') || raw === 'تم فتح البريد') {
      return {
        code: 'email_opened',
        labelAr: 'تم فتح البريد',
        badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700',
        canConfirmSent: true,
      };
    }
    if (raw === 'ready' || raw === 'جاهزة للإرسال') {
      return {
        code: 'ready',
        labelAr: 'جاهزة للإرسال',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        canConfirmSent: true,
      };
    }
    if (raw === 'failed' || raw === 'فشل أو تعذر الفتح') {
      return {
        code: 'failed',
        labelAr: 'فشل أو تعذر الفتح',
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
        canConfirmSent: false,
      };
    }
    if (raw === 'cancelled' || raw === 'skipped' || raw === 'ملغاة') {
      return {
        code: 'cancelled',
        labelAr: 'ملغاة',
        badgeClass: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        canConfirmSent: false,
      };
    }
    return {
      code: 'draft',
      labelAr: MESSAGE_STATUS_LABELS_AR[raw] || 'مسودة',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      canConfirmSent: true,
    };
  };

  const filteredStudentMessageLogs = useMemo(() => {
    return studentMessageLogs.filter((log) => {
      if (commChannelFilter !== 'all' && log.channel !== commChannelFilter) {
        return false;
      }
      if (commStatusFilter !== 'all') {
        const meta = resolveCommunicationStatusMeta(log);
        if (meta.code !== commStatusFilter) return false;
      }
      if (commSearchQuery.trim()) {
        const q = commSearchQuery.trim().toLowerCase();
        const haystack = [
          log.templateName,
          log.templateTitle,
          log.subject,
          log.messageSnapshot,
          log.messageBody,
          log.createdByName,
          log.sentByName,
          log.recipientName,
          log.studentNumber,
          log.incidentId,
          log.violationDescription,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [studentMessageLogs, commChannelFilter, commStatusFilter, commSearchQuery]);

  const handleConfirmStudentMessageSent = async (log: MessageLogRecord) => {
    const activeSchoolId = schoolSettings.schoolId || '7001';
    const nowIso = new Date().toISOString();
    setConfirmingLogId(log.id);
    try {
      await updateMessageLogStatus(activeSchoolId, log.id, 'confirmed_sent', nowIso, {
        notes: 'تم تأكيد الإرسال يدوياً من سجل تواصل الطالب',
      });
      setFirestoreMessageLogs((prev) =>
        prev.map((item) =>
          item.id === log.id ? { ...item, status: 'confirmed_sent', confirmedAt: nowIso } : item
        )
      );
    } catch (err) {
      console.warn('Could not confirm message status:', err);
    } finally {
      setConfirmingLogId(null);
    }
  };
  const behaviorPlans = useMemo(() => (student ? getBehaviorPlans(student.id) : []), [student]);
  const positiveRecords = useMemo(() => (student ? getPositiveBehaviorRecords(student.id) : []), [student]);

  const studentTardies = useMemo(() => {
    if (!student) return [];
    return getStudentTardinessRecordsList(student, mergedTardiesList);
  }, [student, mergedTardiesList]);

  const uniqueTardinessDates = useMemo(() => {
    if (!student) return [];
    return getUniqueStudentTardinessDates(student, mergedTardiesList);
  }, [student, mergedTardiesList]);

  const studentAbsences = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return mergedAbsencesList
      .filter(
        (a) =>
          a.studentId === student.id ||
          (stuNum && (String(a.studentNumber || '').trim() === stuNum || String(a.studentId || '').trim() === stuNum))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [student, mergedAbsencesList]);

  const totalAbsencesCount = studentAbsences.length;
  const totalTardinessCount = uniqueTardinessDates.length;
  const lastAbsenceDate = studentAbsences.length > 0 ? studentAbsences[0].date : 'لا يوجد';
  const lastTardinessDate = uniqueTardinessDates.length > 0 ? uniqueTardinessDates[0] : 'لا يوجد';

  const studentViolations = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return mergedViolationsList.filter(
      (v) =>
        v.studentId === student.id ||
        (stuNum && (String(v.studentNumber || '').trim() === stuNum || String(v.studentId || '').trim() === stuNum))
    );
  }, [mergedViolationsList, student]);

  const studentWarnings = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return mergedWarningsList.filter(
      (w) =>
        w.studentId === student.id ||
        (stuNum && (String(w.studentNumber || '').trim() === stuNum || String(w.studentId || '').trim() === stuNum))
    );
  }, [student, mergedWarningsList]);

  const studentNotices = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return mergedNoticesList.filter(
      (n) =>
        n.studentId === student.id ||
        (stuNum && (String(n.studentNumber || '').trim() === stuNum || String(n.studentId || '').trim() === stuNum))
    );
  }, [student, mergedNoticesList]);

  const studentSummons = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return mergedSummonsList.filter(
      (s) =>
        s.studentId === student.id ||
        (stuNum && (String(s.studentNumber || '').trim() === stuNum || String(s.studentId || '').trim() === stuNum))
    );
  }, [student, mergedSummonsList]);

  const studentCommitments = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return getParentCommitmentForms().filter(
      (c) =>
        c.studentId === student.id ||
        (stuNum && (String(c.studentNumber || '').trim() === stuNum || String(c.studentId || '').trim() === stuNum))
    );
  }, [student]);

  const studentReports = useMemo(() => {
    if (!student) return [];
    const stuNum = String(student.studentNumber || '').trim();
    return mergedReportsList.filter(
      (r) =>
        r.studentId === student.id ||
        (stuNum && (String(r.studentNumber || '').trim() === stuNum || String(r.studentId || '').trim() === stuNum))
    );
  }, [student, mergedReportsList]);

  const studentDecisions = useMemo(() => {
    if (!student) return [];
    return getCommitteeDecisions(student.id);
  }, [student]);

  const studentCommitteeMeetings = useMemo(() => {
    if (!student) return [];
    return getCommitteeMeetings().filter((m) =>
      (m.agenda || []).some((ag: any) => ag.studentId === student.id) ||
      (m.agendaItems || []).some((ag: any) => ag.studentId === student.id)
    );
  }, [student]);

  const studentAttendanceCommitments = useMemo(() => {
    if (!student) return [];
    return getAttendanceCommitments().filter(
      (a) => a.studentId === student.id || (student.studentNumber && a.studentNumber === student.studentNumber)
    );
  }, [student]);

  const studentPickupCommitments = useMemo(() => {
    if (!student) return [];
    return getAuthorizedPickupCommitments().filter(
      (p) => p.studentId === student.id || (student.studentNumber && p.studentNumber === student.studentNumber)
    );
  }, [student]);

  const studentSuspensions = useMemo(() => {
    if (!student) return [];
    return getTemporarySuspensionForms().filter(
      (s) => s.studentId === student.id || (student.studentNumber && s.studentNumber === student.studentNumber)
    );
  }, [student]);

  const studentLinkedForms = useMemo(() => {
    return [
      ...studentWarnings.map((w) => ({ ...w, formType: 'warning' })),
      ...studentSummons.map((s) => ({ ...s, formType: 'summon' })),
      ...studentCommitments.map((c) => ({ ...c, formType: 'commitment' })),
      ...studentNotices.map((n) => ({ ...n, formType: 'notice' })),
      ...studentReports.map((r) => ({ ...r, formType: 'report' })),
      ...studentAttendanceCommitments.map((a) => ({ ...a, formType: 'attendance_commitment' })),
      ...studentPickupCommitments.map((p) => ({ ...p, formType: 'authorized_pickup' })),
      ...studentSuspensions.map((sus) => ({ ...sus, formType: 'temporary_suspension' })),
    ];
  }, [studentWarnings, studentSummons, studentCommitments, studentNotices, studentReports, studentAttendanceCommitments, studentPickupCommitments, studentSuspensions]);

  const studentOfficialDocuments = useMemo(() => {
    if (!student) return [];
    return getOfficialDocumentsLocal().filter(
      (d) => d.studentId === student.id || (student.studentNumber && d.studentNumber === student.studentNumber)
    );
  }, [student]);

  // Total forms and signed forms count
  const allStudentFormsCount =
    studentWarnings.length +
    studentSummons.length +
    studentReports.length +
    studentNotices.length +
    studentCommitments.length +
    studentAttendanceCommitments.length +
    studentPickupCommitments.length +
    studentSuspensions.length +
    studentOfficialDocuments.length;

  const allSignedFormsCount =
    studentWarnings.filter((w) => !!w.studentSignature || w.status === 'تم الاعتماد والتوقيع').length +
    studentSummons.filter((s) => !!s.studentSignature || s.status === 'تم الاستلام والتوقيع').length +
    studentReports.filter((r) => !!r.studentSignature || r.status === 'معتمد').length +
    studentNotices.filter((n) => n.status === 'معتمد ومسلّم' || !!n.parentSignature).length +
    studentCommitments.filter((c) => c.status === 'معتمد ومسلّم' || !!c.parentSignature).length +
    studentAttendanceCommitments.filter((a) => a.status === 'معتمد ومسلّم' || !!a.parentSignature).length +
    studentPickupCommitments.filter((p) => p.status === 'معتمد وساري' || !!p.parentSignature).length +
    studentSuspensions.filter((sus) => sus.status === 'معتمد ومسلّم' || !!sus.principalSignature).length;

  // Total recovered marks
  const totalRecovered = positiveRecords.reduce((acc, p) => acc + (p.recoveredMarks || 0), 0);

  const handleSaveNewMeeting = () => {
    if (!meetingTopic.trim()) return;
    const newMeeting: ParentMeetingRecord = {
      id: `meet-${Date.now()}`,
      studentId: student.id,
      studentName: student.fullName,
      studentNumber: student.studentNumber,
      grade: student.grade,
      section: student.section,
      date: getUaeTodayDateString(),
      time: '09:00 ص',
      meetingType: 'in_person',
      parentName: student.parentName || 'ولي الأمر',
      attendeeRole: meetingAttendee,
      counselorName: 'المرشد الأكاديمي',
      topic: meetingTopic,
      agreedPlan: meetingAgreedPlan || 'التزام ولي الأمر بالمتابعة المنزلية اليومية والتواصل الأسبوعي.',
      followUpDate: getUaeTodayDateString(),
      parentSigned: true,
      createdAt: new Date().toISOString(),
    };
    saveParentMeeting(newMeeting);
    setMeetingTopic('');
    setMeetingAgreedPlan('');
    setShowAddMeetingModal(false);
  };

  const handleSaveNewPositive = () => {
    if (!positiveTitle.trim()) return;
    const newPos: PositiveBehaviorRecord = {
      id: `pos-${Date.now()}`,
      studentId: student.id,
      studentNumber: student.studentNumber,
      studentName: student.fullName,
      grade: student.grade,
      section: student.section,
      date: getUaeTodayDateString(),
      behaviorTitle: positiveTitle,
      category: 'school_service',
      pointsAwarded: 10,
      recoveredMarks: Number(recoveredMarks),
      description: 'مبادرة متميزة وانضباط سلوكي ملحوظ.',
      approvedByCommittee: true,
      certificateIssued: true,
      recordedBy: 'المرشد الأكاديمي',
      createdAt: new Date().toISOString(),
    };
    savePositiveBehaviorRecord(newPos);
    setPositiveTitle('');
    setShowAddPositiveModal(false);
  };

  const handleReferToCommittee = () => {
    if (!referTopic.trim()) return;
    referStudentToCommittee({
      studentId: student.id,
      studentName: student.fullName,
      studentNumber: student.studentNumber,
      grade: student.grade,
      section: student.section,
      topic: referTopic,
      proposedAction: referProposedAction,
      incidentDegree: referDegree,
    });

    if (notifyCommitteeOnRefer) {
      dispatchCommitteeNotification({
        type: 'urgent_student_status',
        title: `🚨 تنبيه عاجل: إحالة الطالب ${student.fullName} للجنة إدارة السلوك`,
        content: `عاجل - ${schoolSettings.schoolName}: إحالة فورية للطالب ${student.fullName} (${student.grade}/${student.section}) بمخالفة ${referDegree} (${referTopic}) تستوجب إجراءً عاجلاً وانعقاد اللجنة.`,
        smsContent: `عاجل - لجنة السلوك: إحالة الطالب ${student.fullName} (${student.grade}/${student.section}) بمخالفة ${referDegree}. يرجى المتابعة.`,
        emailSubject: `🚨 [تنبيه عاجل] إحالة طالب إلى لجنة إدارة السلوك - ${student.fullName}`,
        emailBody: `السادة رئيس وأعضاء لجنة إدارة السلوك المدرسي بـ${schoolSettings.schoolName} المحترمين،\n\nالسلام عليكم ورحمة الله وبركاته،،\n\nنود إحاطتكم علماً بأنه تمت إحالة الطالب التالية بياناته إلى لجنة إدارة السلوك بصورة عاجلة للبت في المخالفة السلوكية المرتكبة:\n• اسم الطالب: ${student.fullName}\n• الصف والشعبة: ${student.grade} / ${student.section}\n• درجة المخالفة: ${referDegree}\n• موضوع الإحالة والمخالفة: ${referTopic}\n• الإجراء التربوي المقترح من المرشد: ${referProposedAction || 'تطبيق لائحة السلوك وتكليف بمهام مدرسية بديلة'}\n\nيرجى التكرم بالاطلاع وتنسيق موعد الجلسة لاتخاذ القرار المناسب.\n\nوتفضلوا بقبول فائق التقدير،،\nمقرر لجنة إدارة السلوك\nالمرشد الأكاديمي والمهني`,
        channel: 'both',
        urgencyLevel: 'urgent',
        studentId: student.id,
        studentName: student.fullName,
        grade: student.grade,
        section: student.section,
        sentBy: 'المرشد الأكاديمي والمهني (مقرر اللجنة)',
      });
    }

    setReferTopic('');
    setShowReferModal(false);
    setActiveTab('cases_plans');
    setCasesSubTab('committee');
  };

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'tardiness':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'violation':
      case 'violation_report':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'warning':
      case 'parent_notice':
      case 'parent_summon':
      case 'parent_commitment':
        return <FileSignature className="w-4 h-4 text-indigo-600" />;
      case 'signature':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const getDegreeBadge = (deg: string) => {
    if (deg.includes('الأولى')) return 'bg-blue-50 text-blue-800 border-blue-200';
    if (deg.includes('الثانية')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (deg.includes('الثالثة')) return 'bg-rose-50 text-rose-800 border-rose-200';
    if (deg.includes('الرابعة')) return 'bg-purple-50 text-purple-800 border-purple-200';
    return 'bg-slate-50 text-slate-800 border-slate-200';
  };

  const getStatusBadge = (st: string) => {
    if (st === 'مسودة') return 'bg-slate-100 text-slate-700 border-slate-200';
    if (st === 'تم التنبيه') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (st.includes('توقيع')) return 'bg-teal-50 text-teal-700 border-teal-200';
    if (st.includes('حفظ') || st.includes('معتمد')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (st.includes('وزارة')) return 'bg-purple-50 text-purple-800 border-purple-200';
    if (st === 'مغلقة') return 'bg-slate-100 text-slate-500 border-slate-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const tabs: { id: ProfileTabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'البيانات الأساسية والملخص' },
    { id: 'tardiness', label: 'التأخير الصباحي', count: totalTardinessCount },
    { id: 'violations', label: 'المخالفات السلوكية', count: studentViolations.length + studentReports.length },
    { id: 'timeline', label: 'السجل الزمني', count: timelineEvents.length },
    { id: 'communication', label: 'سجل التواصل', count: parentMeetings.length + studentMessageLogs.length },
    { id: 'forms_signatures', label: 'النماذج والتعهدات', count: allStudentFormsCount },
    { id: 'absences', label: 'الغياب المدرسي', count: studentAbsences.length },
    {
      id: 'cases_plans',
      label: 'الحالات والخطط',
      count: behaviorPlans.length + studentDecisions.length + positiveRecords.length,
    },
    { id: 'attachments', label: 'المرفقات', count: 2 },
  ];

  if (!isOpen || !student) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F6F8FB] dark:bg-[#071322] overflow-y-auto animate-in fade-in"
      dir="rtl"
    >
      <div className="min-h-screen bg-[#F6F8FB] dark:bg-[#071322] text-slate-800 dark:text-slate-100 flex flex-col">
        {/* Top Fixed / Sticky Navigation Bar */}
        <div className="bg-white dark:bg-[#0C2340] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <ArrowRight className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
                <span>العودة إلى سجل الطلبة</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>الطلاب</span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span>سجل الطلبة</span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-[#006D77] dark:text-teal-400 font-bold">الملف السلوكي الموحد</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEditStudent && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditStudent(student);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="hidden sm:inline">تعديل بيانات الطالب</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق الملف"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Full Page Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-5 flex-1">
          {/* 1. Header: Student Info Card & KPI Summary Cards */}
          <StudentProfileHeader
            student={student}
            onClose={onClose}
            behaviorScore={student.behaviorScore ?? 100}
            violationsCount={studentViolations.length + studentReports.length}
            tardinessCount={totalTardinessCount}
            absencesCount={studentAbsences.length}
            pledgesCount={studentWarnings.length + studentNotices.length + studentCommitments.length}
            activeCasesCount={behaviorPlans.length + studentDecisions.length}
            onOpenMessage={onOpenMessageForStudent}
          />

          {/* 2. Quick Actions Bar */}
          <StudentQuickActions
            onRegisterViolation={() => {
              onClose();
              onRegisterViolationForStudent?.(student.id);
            }}
            onRegisterTardiness={() => setActiveTab('tardiness')}
            onRegisterAbsence={() => setActiveTab('absences')}
            onContactGuardian={() => {
              if (onOpenMessageForStudent) {
                onClose();
                onOpenMessageForStudent(student.id);
              } else {
                setActiveTab('communication');
              }
            }}
            onOpenWarning={() => {
              onClose();
              onOpenWarningForStudent(student.id);
            }}
            onOpenNotice={() => {
              onClose();
              onOpenNoticeForStudent?.(student.id);
            }}
            onOpenSummon={() => {
              onClose();
              onOpenSummonForStudent?.(student.id);
            }}
            onOpenCommitment={() => {
              onClose();
              onOpenCommitmentForStudent?.(student.id);
            }}
            onOpenViolationReport={() => {
              onClose();
              onOpenViolationReportForStudent?.(student.id);
            }}
            onAddCaseOrPlan={() => {
              setActiveTab('cases_plans');
              setCasesSubTab('plans');
            }}
            onReferToCommittee={() => {
              setActiveTab('cases_plans');
              setCasesSubTab('committee');
              setShowReferModal(true);
            }}
          />

          {/* 3. Navigation Tabs Bar */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-xs overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {tabs.map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-[#006D77] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{t.label}</span>
                  {typeof t.count === 'number' && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 4. Tab Contents Container */}
          <div className="space-y-4">
            {/* TAB: نظرة عامة */}
            {activeTab === 'overview' && (
              <StudentOverviewTab
                student={student}
                recentActivities={timelineEvents}
                academicYear={schoolSettings?.academicYear || '2025–2026'}
                onViewAllActivities={() => setActiveTab('timeline')}
                onOpenMessage={onOpenMessageForStudent}
                onEditStudent={onEditStudent}
                onSelectActivity={() => setActiveTab('timeline')}
              />
            )}

          {/* TAB 1: التسلسل الزمني للحالة */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500">سجل الأحداث والإجراءات مرتباً زمنياً</h4>
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">لا توجد وقائع مسجلة لهذا الطالب حتى الآن.</p>
              ) : (
                <div className="relative border-r-2 border-slate-200 dark:border-slate-800 mr-3 space-y-4">
                  {timelineEvents.map((ev, i) => {
                    const matchedTardy = ev.type === 'tardiness' && ev.referenceId
                      ? studentTardies.find((t) => t.id === ev.referenceId)
                      : null;
                    const followUp = matchedTardy ? resolveTardinessFollowUpStatus(matchedTardy, studentLinkedForms) : null;
                    const linkedWarning = matchedTardy ? studentWarnings.find(
                      (w) => (w.tardinessRecordId && w.tardinessRecordId === matchedTardy.id) || (matchedTardy.linkedFormId && w.id === matchedTardy.linkedFormId)
                    ) : null;
                    const linkedSummon = matchedTardy ? studentSummons.find(
                      (s) => (s.tardinessRecordId && s.tardinessRecordId === matchedTardy.id) || (matchedTardy.linkedFormId && s.id === matchedTardy.linkedFormId)
                    ) : null;

                    return (
                      <div key={i} className="relative pr-6">
                        <div className="absolute -right-2.5 top-1 w-5 h-5 rounded-full bg-white dark:bg-[#0f1a2a] border-2 border-[#006D77] flex items-center justify-center">
                          {getEventIcon(ev.type)}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-white">{ev.title}</span>
                              {ev.badgeText && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ev.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                                  {ev.badgeText}
                                </span>
                              )}
                              {followUp && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] ${followUp.badgeClass}`}>
                                  {followUp.statusText}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-mono">{ev.date}</span>
                              {ev.type !== 'absence' && ev.hasRealTime && ev.time && (
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">({ev.time})</span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ev.description}</p>

                          {/* Official Form & Signatures Status Strip */}
                          {(ev.signatureStatusText || ev.formName || ev.formType || linkedWarning || linkedSummon) && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                              {/* Form Identification & Signatures Badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {ev.signatureStatusText && (
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${
                                      ev.signatureBadgeClass || 'bg-slate-100 text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    <span>{ev.signatureStatusText}</span>
                                    {ev.approvalStatus && (
                                      <span className="opacity-80 text-[10px]">({ev.approvalStatus})</span>
                                    )}
                                  </span>
                                )}

                                {ev.studentSignedDate && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    توقيع الطالب: {ev.studentSignedDate}
                                  </span>
                                )}
                                {ev.parentSignedDate && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    توقيع ولي الأمر: {ev.parentSignedDate}
                                  </span>
                                )}
                              </div>

                              {/* Official Form Preview Trigger Buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Direct Form Attached to Event */}
                                {ev.formType === 'warning' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const w = studentWarnings.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (w) setSelectedWarningForPrint(w);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#006D77] hover:bg-teal-100 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (تنبيه خطي - 9)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {ev.type === 'parent_summon' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const s = studentSummons.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (s) setSelectedSummonForPrint(s);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (استدعاء ولي أمر - 8)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {ev.type === 'violation_report' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const r = studentReports.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (r) setSelectedViolationReportForPrint(r);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (تقرير واقعة - 6)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {ev.type === 'parent_notice' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const n = studentNotices.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (n) setSelectedNoticeForPrint(n);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (إخطار حسم - 7)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {ev.type === 'parent_commitment' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const c = studentCommitments.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (c) setSelectedCommitmentForPrint(c);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (تعهد ولي أمر - 10)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {ev.type === 'attendance_commitment' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const att = studentAttendanceCommitments.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (att) setSelectedAttendanceCommitmentForPrint(att);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (تعهد المواظبة - 27)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {ev.type === 'authorized_pickup' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pickup = studentPickupCommitments.find((item) => item.id === ev.formId || item.id === ev.referenceId);
                                      if (pickup) setSelectedPickupCommitmentForPrint(pickup);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة النموذج الرسمي (تعهد استلام الطالب - 26)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}

                                {/* Linked Form Attached to Tardiness Event */}
                                {linkedWarning && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedWarningForPrint(linkedWarning)}
                                    className="text-[11px] text-[#006D77] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة نموذج 9 المرفق بهذا التأخير</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}
                                {linkedSummon && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSummonForPrint(linkedSummon)}
                                    className="text-[11px] text-indigo-700 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <FileSignature className="w-3.5 h-3.5" />
                                    <span>معاينة استدعاء ولي الأمر (نموذج 8)</span>
                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: المخالفات */}
          {activeTab === 'violations' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>سجل المخالفات والوقائع الموثقة للطالب ({studentViolations.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    الرقم الطلابي المعتمد للربط: <strong className="font-mono text-slate-700 dark:text-slate-300">{student.studentNumber}</strong>
                  </p>
                </div>

                {onRegisterViolationForStudent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRegisterViolationForStudent(student.id);
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل مخالفة جديدة للطالب</span>
                  </button>
                )}
              </div>

              {studentViolations.length === 0 && studentReports.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">سجل الطالب نظيف، لا توجد مخالفات مسجلة.</p>
                  <p className="text-[11px] text-slate-400">كافة بيانات الطالب السلوكية منضبطة ومطابقة للائحة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Recorded Violations */}
                  {studentViolations.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold border ${getDegreeBadge(
                              v.violationDegree
                            )}`}
                          >
                            {v.violationDegree}
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {v.violationType}
                          </span>
                          {v.isMultiViolationIncident && v.violationsList && v.violationsList.length > 1 && (
                            <span className="text-[10px] font-bold text-[#006D77] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                              واقعة متعددة ({v.violationsList.length} بنود)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${getStatusBadge(
                              v.status
                            )}`}
                          >
                            <FileSignature className="w-3 h-3" />
                            <span>حالة التوقيع والاعتماد: {v.status}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                            التاريخ: {v.incidentDateTime}
                          </span>
                        </div>
                      </div>

                      {v.incidentDescription && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                          {v.incidentDescription}
                        </p>
                      )}

                      {/* Multi-clauses details */}
                      {v.violationsList && v.violationsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {v.violationsList.map((clause, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 font-medium"
                            >
                              <strong className="text-[#006D77] font-mono ml-1">{clause.code}:</strong>
                              {clause.title}
                              {clause.repetition && (
                                <span className="text-rose-600 mr-1 font-bold">({clause.repetition})</span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Incident Meta & Action */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                        <div className="flex flex-wrap items-center gap-3">
                          {v.incidentLocation && (
                            <span>المكان: <strong className="text-slate-700 dark:text-slate-300">{v.incidentLocation}</strong></span>
                          )}
                          {v.reportingPerson && (
                            <span>المبلغ: <strong className="text-slate-700 dark:text-slate-300">{v.reportingPerson}</strong></span>
                          )}
                          {v.totalDeductionMarks !== undefined && v.totalDeductionMarks > 0 && (
                            <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              حسم {v.totalDeductionMarks} درجات
                            </span>
                          )}
                          {v.suggestedAction && (
                            <span className="text-teal-800 dark:text-teal-300">
                              الإجراء: <strong>{v.suggestedAction}</strong>
                            </span>
                          )}
                        </div>

                        {/* Behavior Committee Section for this violation */}
                        {(() => {
                          const committeeInfo = getCommitteeCasesByViolationId(v.id);
                          if (!committeeInfo || committeeInfo.length === 0) return null;
                          return (
                            <div className="w-full mt-2 p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-[#006D77] flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>لجنة إدارة السلوك</span>
                                </span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  عُرضت على اللجنة
                                </span>
                              </div>
                              {committeeInfo.map(({ meeting, caseItem }, cIdx) => (
                                <div key={cIdx} className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pt-1.5 border-t border-teal-100 dark:border-teal-900">
                                  <div className="flex flex-wrap items-center justify-between gap-1">
                                    <span>
                                      الجلسة: <strong className="font-mono text-slate-900 dark:text-white">{meeting.sessionNumber || meeting.meetingNumber}</strong> ({meeting.meetingDate})
                                    </span>
                                    <span className="font-bold text-teal-800 dark:text-teal-200">
                                      القرار: {caseItem.decisionCustomText || caseItem.decision}
                                    </span>
                                  </div>
                                  {caseItem.resultingFormIds && caseItem.resultingFormIds.length > 0 && (
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                                      <FileSignature className="w-3 h-3 text-[#D4AF37]" />
                                      <span>النماذج الصادرة: {caseItem.resultingFormIds.join('، ')} (نموذج 12 - قرار إيقاف مؤقت)</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedViolationDetail(v)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="عرض التفاصيل الكاملة للواقعة السلوكية"
                          >
                            <ExternalLink className="w-3 h-3 text-[#C9A227]" />
                            <span>التفاصيل الكاملة للواقعة</span>
                          </button>
                          {onOpenViolationReportForStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenViolationReportForStudent(student.id);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-[#006D77] bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors cursor-pointer"
                              title="إصدار تقرير توثيق مخالفة (نموذج 6)"
                            >
                              تقرير (6)
                            </button>
                          )}
                          {onOpenNoticeForStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenNoticeForStudent(student.id);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              title="إصدار إشعار ولي أمر (نموذج 7)"
                            >
                              إشعار (7)
                            </button>
                          )}
                          {onOpenSummonForStudent && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenSummonForStudent(student.id);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="إصدار استدعاء ولي أمر (نموذج 8)"
                            >
                              استدعاء (8)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Also show reports if any */}
                  {studentReports.length > 0 && (
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                      <h5 className="text-xs font-bold text-slate-500">تقارير المخالفات الموثقة رسمياً (نموذج 6):</h5>
                      {studentReports.map((r) => (
                        <div
                          key={r.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="text-[10px] font-mono text-rose-600 font-bold block">
                              نموذج 6 • تقرير مخالفة
                            </span>
                            <h6 className="font-bold text-slate-900 dark:text-white">{r.subject || r.description}</h6>
                            <p className="text-[11px] text-slate-500">المكان: {r.incidentPlace} • التاريخ: {r.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                              {r.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedViolationReportForPrint(r)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                              title="طباعة التقرير الرسمي"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: الغياب المدرسي */}
          {activeTab === 'absences' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500">سجل الغياب المدرسي للطالب</h4>
                <span className="text-xs font-bold text-rose-600">إجمالي أيام الغياب: {studentAbsences.length}</span>
              </div>
              {studentAbsences.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">لا توجد حالات غياب مسجلة لهذا الطالب.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {studentAbsences.map((a) => (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-rose-600" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white font-mono">{a.date}</p>
                          <p className="text-[11px] text-slate-500">{a.status} • {a.excuseStatus}</p>
                          {a.notes && <p className="text-[10px] text-slate-400 mt-0.5">{a.notes}</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        a.excuseStatus === 'بعذر'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-rose-100 text-rose-900 border border-rose-200'
                      }`}>
                        {a.excuseStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: التأخير الصباحي */}
          {activeTab === 'tardiness' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>سجل التأخير الصباحي والانضباط المدرسي للطالب</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>الرصيد التراكمي الفعلي (أيام تأخير فريدة):</span>
                    <button
                      type="button"
                      onClick={() => setShowTardinessDatesModal((prev) => !prev)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-mono font-black border border-amber-300 dark:border-amber-700 cursor-pointer transition-colors"
                      title="اضغط لعرض التواريخ الفعلية المحسوبة في الرصيد التراكمي"
                    >
                      <span>{totalTardinessCount} أيام تأخير فعلية</span>
                      <Calendar className="w-3 h-3" />
                    </button>
                    <span>• إجمالي السجلات: ({studentTardies.length}) • يتم احتساب الإجراء الاسترشادي ومتابعة التوقيعات دون تكرار لنفس اليوم.</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowTardinessDatesModal((prev) => !prev)}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 cursor-pointer"
                  >
                    {showTardinessDatesModal ? 'إخفاء التواريخ المحسوبة' : 'عرض التواريخ المحسوبة'}
                  </button>
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${totalTardinessCount >= 3 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                    {totalTardinessCount >= 3 ? 'تنبيه: يتطلب متابعة (3+ أيام)' : 'حالة اعتيادية'}
                  </span>
                </div>
              </div>

              {showTardinessDatesModal && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-800 shadow-sm space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/50 pb-2">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>التواريخ الفعلية المحسوبة في الرصيد التراكمي للطالب ({uniqueTardinessDates.length} تاريخ فريد):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTardinessDatesModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                  {uniqueTardinessDates.length === 0 ? (
                    <p className="text-xs text-slate-400">لا توجد تواريخ تأخير مسجلة.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {uniqueTardinessDates.map((d, idx) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-mono font-bold text-amber-900 dark:text-amber-200"
                        >
                          <span className="w-4 h-4 rounded-full bg-amber-200/80 dark:bg-amber-800 text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{d}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {studentTardies.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">سجل الطالب منضبط، لا توجد حالات تأخير صباحي مسجلة.</p>
                  <p className="text-[11px] text-slate-400">حضور منتظم على مدار الفصل الدراسي.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {studentTardies.map((t, idx) => {
                    const occurrenceNum = (t.previousTardinessCount ?? 0) + 1;
                    const followUp = resolveTardinessFollowUpStatus(t, studentLinkedForms);
                    const linkedWarning = studentWarnings.find(
                      (w) => (w.tardinessRecordId && w.tardinessRecordId === t.id) || (t.linkedFormId && w.id === t.linkedFormId)
                    );
                    const linkedSummon = studentSummons.find(
                      (s) => (s.tardinessRecordId && s.tardinessRecordId === t.id) || (t.linkedFormId && s.id === t.linkedFormId)
                    );
                    const linkedCommitment = studentCommitments.find(
                      (c) => (c.tardinessRecordId && c.tardinessRecordId === t.id) || (t.linkedFormId && c.id === t.linkedFormId)
                    );

                    return (
                      <div
                        key={t.id || idx}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                      >
                        {/* Header: Date, Time, Occurrence & Status Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                              {t.date}
                            </span>
                            <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                              {t.time || '07:45 ص'}
                            </span>
                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              تأخير رقم ({occurrenceNum})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* FollowUp / Signature Badge */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] ${followUp.badgeClass}`}>
                              <span>{followUp.statusText}</span>
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[10px] text-slate-400 block mb-0.5">سبب التأخير:</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{t.reason || 'عذر مواصلات / زحام طريق'}</p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[10px] text-slate-400 block mb-0.5">الإجراء المقترح (اللائحة):</span>
                            <p className="font-bold text-teal-800 dark:text-teal-300">{t.suggestedAction}</p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[10px] text-slate-400 block mb-0.5">قرار المرشد الفعلي:</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{t.counselorDecision || t.suggestedAction}</p>
                          </div>
                        </div>

                        {/* Linked Official Form & Signatures Section */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="text-slate-400 text-[11px]">المستند الرسمي:</span>
                            {linkedWarning && (
                              <button
                                type="button"
                                onClick={() => setSelectedWarningForPrint(linkedWarning)}
                                className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1 hover:bg-teal-100 cursor-pointer"
                                title="معاينة وطباعة نموذج 9"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>نموذج 9 (تعهد وتنبيه)</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </button>
                            )}
                            {linkedSummon && (
                              <button
                                type="button"
                                onClick={() => setSelectedSummonForPrint(linkedSummon)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1 hover:bg-indigo-100 cursor-pointer"
                                title="معاينة وطباعة نموذج 8"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>نموذج 8 (استدعاء ولي أمر)</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </button>
                            )}
                            {linkedCommitment && (
                              <button
                                type="button"
                                onClick={() => setSelectedCommitmentForPrint(linkedCommitment)}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1 hover:bg-rose-100 cursor-pointer"
                                title="معاينة وطباعة نموذج 10"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>نموذج 10 (تعهد ولي أمر)</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </button>
                            )}
                            {!linkedWarning && !linkedSummon && !linkedCommitment && (
                              <span className="text-slate-400 text-[11px]">لا يوجد نموذج رسمي مرفق بهذا السجل</span>
                            )}
                          </div>

                          {/* Quick action button if pledge/summon recommended but not yet created */}
                          {!linkedWarning && !linkedSummon && !linkedCommitment && (t.suggestedAction.includes('تعهد') || occurrenceNum >= 2) && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenWarningForStudent(student.id);
                              }}
                              className="px-3 py-1 bg-[#006D77] hover:bg-[#005a63] text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
                            >
                              <Plus className="w-3 h-3 text-[#D4AF37]" />
                              <span>تحرير وتوقيع تعهد للطالب (نموذج 9)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {/* TAB 5: النماذج والتوقيعات الرسمية الموثقة بملف الطالب */}
          {activeTab === 'forms_signatures' && (
            <div className="space-y-4">
              {/* Header Status & Quick Actions Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0C2340] text-white border border-[#D4AF37]/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileSignature className="w-5 h-5 text-[#D4AF37]" />
                    <h4 className="text-sm font-black text-white">النماذج والتوقيعات الرسمية المعتمدة بملف الطالب</h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    وفقاً للقرار 851، يتم أرشفة كافة النماذج التي وقّع عليها الطالب أو ولي أمره وتوثيق التوقيع الرقمي فوراً في سجله.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{allSignedFormsCount} نموذج موقع</span>
                  </div>
                  {allStudentFormsCount - allSignedFormsCount > 0 && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{allStudentFormsCount - allSignedFormsCount} بانتظار التوقيع</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Ribbon to generate/sign models */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">تحرير نموذج للطالب:</span>
                <button
                  type="button"
                  onClick={() => onOpenWarningForStudent(student.id)}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 font-bold whitespace-nowrap transition-colors"
                >
                  + نموذج 9 (تنبيه وتعهد سلوكي)
                </button>
                {onOpenSummonForStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenSummonForStudent(student.id)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 font-bold whitespace-nowrap transition-colors"
                  >
                    + نموذج 8 (استدعاء ولي أمر)
                  </button>
                )}
                {onOpenViolationReportForStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenViolationReportForStudent(student.id)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 font-bold whitespace-nowrap transition-colors"
                  >
                    + نموذج 6 (تقرير مخالفة)
                  </button>
                )}
                {onOpenNoticeForStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenNoticeForStudent(student.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 font-bold whitespace-nowrap transition-colors"
                  >
                    + نموذج 7 (إخطار حسم)
                  </button>
                )}
                {onOpenCommitmentForStudent && (
                  <button
                    type="button"
                    onClick={() => onOpenCommitmentForStudent(student.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 font-bold whitespace-nowrap transition-colors"
                  >
                    + نموذج 10 (تعهد ولي الأمر)
                  </button>
                )}
              </div>

              {allStudentFormsCount === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <FileSignature className="w-10 h-10 text-slate-400 mx-auto" />
                  <h5 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    لا توجد نماذج أو توقيعات مسجلة لهذا الطالب حتى الآن
                  </h5>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    بمجرد توقيع الطالب إلكترونياً على أي نموذج من نماذج لائحة إدارة السلوك (نموذج 9 للتعهد والتنبيه، نموذج 8 للاستدعاء، أو نموذج 6 للمخالفات)، يتم أرشفته تلقائياً هنا مع التوقيع الرقمي المعتمد.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenWarningForStudent(student.id)}
                    className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    بدء تحرير وتوقيع نموذج 9 للطالب
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Unified Official Documents (وحدة النماذج والتوقيعات الرسمية المعتمدة) */}
                  {studentOfficialDocuments.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-indigo-200 dark:border-indigo-900">
                        <span className="text-xs font-black text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                          <FileSignature className="w-4 h-4 text-indigo-600" />
                          <span>النماذج الرسمية المعتمدة والتوقيعات الإلكترونية ({studentOfficialDocuments.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">سجلات موثقة في Firestore</span>
                      </div>

                      {studentOfficialDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 text-xs space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 border-indigo-100 dark:border-indigo-900/60">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[11px]">
                                نموذج ({doc.modelNumber})
                              </span>
                              <h5 className="font-black text-slate-900 dark:text-white text-sm">
                                {doc.modelName}
                              </h5>
                              <span className="text-[11px] font-mono text-slate-500">#{doc.documentId}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                                  doc.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : doc.status === 'signed'
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {doc.status === 'approved'
                                  ? '✓ معتمد ومقفل'
                                  : doc.status === 'signed'
                                  ? '✍ موقع إلكترونياً'
                                  : 'مسودة'}
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">{doc.issueDate}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                            <div>
                              <span className="text-slate-400 block text-[10px]">المخالفة المرتبطة:</span>
                              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                                {doc.violationTitle || 'تقرير واقعة'} ({doc.violationDegree || 'غير محدد'})
                              </p>
                              {doc.incidentDescription && (
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {doc.incidentDescription}
                                </p>
                              )}
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px]">التوقيعات الإلكترونية الموثقة:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.signatures && doc.signatures.length > 0 ? (
                                  doc.signatures.map((sig, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded font-semibold text-[10px]"
                                    >
                                      ✓ {sig.signerName} ({sig.roleTitleAr})
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-amber-600 text-[11px]">بانتظار التوقيع</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              محرر الواقعة: {doc.reportingStaffName || 'الكادر المدرسي'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPrintingOfficialDoc(doc)}
                              className="px-3 py-1 bg-[#0C2340] hover:bg-[#163761] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>طباعة رسمية A4 / PDF</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 1. Model 9: Warning Forms (تنبيه خطي وتعهد سلوكي) */}
                  {studentWarnings.map((w) => {
                    const isSigned = !!w.studentSignature || w.status === 'تم الاعتماد والتوقيع';
                    return (
                      <div
                        key={w.id}
                        className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                          isSigned
                            ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10'
                            : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#006D77]/10 text-[#006D77] font-black text-[11px] border border-[#006D77]/20">
                              نموذج (9)
                            </span>
                            <h5 className="font-black text-slate-900 dark:text-white text-sm">
                              تنبيه خطي وتعهد سلوكي للطالب
                            </h5>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSigned ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>توقيع الطالب معتمد ومحفوظ بالملف</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px] border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>مسودة بانتظار التوقيع</span>
                              </span>
                            )}
                            <span className="text-slate-400 font-mono text-[11px]">
                              {w.formDate}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-400 block text-[10px]">موضوع المخالفة / سبب التنبيه:</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{w.violationReason}</p>
                            {w.actionTaken && (
                              <p className="text-[11px] text-[#006D77] dark:text-teal-300 mt-1">
                                الإجراء المعتمد: {w.actionTaken}
                              </p>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px]">المرشد الأكاديمي والمهني:</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{w.counselorName}</p>
                            {w.counselorNotes && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                الملاحظات: {w.counselorNotes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Signature Preview Box */}
                        {w.studentSignature && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">
                                التوقيع الرقمي للطالب المعتمد:
                              </span>
                              <span className="text-[11px] text-slate-500">
                                تم التوقيع بواسطة الطالب: {w.studentName} • بتاريخ {w.studentSignatureDate || w.formDate}
                              </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                              <img
                                src={w.studentSignature}
                                alt="توقيع الطالب"
                                className="h-10 max-w-[140px] object-contain"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400 font-mono">رقم القيد: #{w.id}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedWarningForPrint(w)}
                              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-[#006D77] text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#006D77]" />
                              <span>معاينة وطباعة النموذج</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenWarningForStudent(student.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#006D77] text-white hover:bg-[#005a63] text-xs font-bold transition-colors cursor-pointer"
                            >
                              {isSigned ? 'فتح النموذج' : 'استكمال التوقيع'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 2. Model 8: Parent Summon Forms (استدعاء ولي أمر) */}
                  {studentSummons.map((s) => {
                    const isSigned = !!s.studentSignature || s.status === 'تم الاستلام والتوقيع';
                    return (
                      <div
                        key={s.id}
                        className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                          isSigned
                            ? 'border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/30 dark:bg-indigo-950/10'
                            : 'border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-[11px] border border-indigo-200">
                              نموذج (8)
                            </span>
                            <h5 className="font-black text-slate-900 dark:text-white text-sm">
                              خطاب استدعاء ولي أمر الطالب
                            </h5>
                          </div>

                          <div className="flex items-center gap-2">
                            {isSigned ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تم استلام وتوقيع الطالب رسمياً</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[11px] border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>مسودة بانتظار استلام وتوقيع الطالب</span>
                              </span>
                            )}
                            <span className="text-slate-400 font-mono text-[11px]">
                              {s.summonDate}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-400 block text-[10px]">موضوع الاستدعاء:</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{s.subject}</p>
                            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1">
                              موعد المقابلة: يوم {s.summonDay} الموافق {s.summonDate} ({s.summonTime || 'صباحاً'})
                            </p>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px]">ولي الأمر المستدعى:</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{s.parentName || student.parentName}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              محرر الخطاب: {s.recordedBy}
                            </p>
                          </div>
                        </div>

                        {/* Student Delivery Signature */}
                        {s.studentSignature && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-4">
                            <div>
                              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block">
                                توقيع الطالب على استلام استدعاء ولي أمره:
                              </span>
                              <span className="text-[11px] text-slate-500">
                                تم التوقيع والاستلام بتاريخ: {s.studentSignatureDate || s.summonDate}
                              </span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                              <img
                                src={s.studentSignature}
                                alt="توقيع استلام الطالب"
                                className="h-10 max-w-[140px] object-contain"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400 font-mono">رقم القيد: #{s.id}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedSummonForPrint(s)}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-indigo-600 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            <span>معاينة وطباعة النموذج</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 3. Model 6: Violation Reports (تقرير مخالفة سلوكية) */}
                  {studentReports.map((vr) => {
                    const isSigned = !!vr.studentSignature || vr.status === 'معتمد';
                    return (
                      <div
                        key={vr.id}
                        className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/30 dark:bg-purple-950/10 transition-all text-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-black text-[11px] border border-purple-200">
                              نموذج (6)
                            </span>
                            <h5 className="font-black text-slate-900 dark:text-white text-sm">
                              تقرير ضبط مخالفة سلوكية: {vr.violationName}
                            </h5>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-300">
                              {vr.status}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {vr.incidentDate}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-400 block text-[10px]">المكان والزمان:</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                              {vr.incidentPlace} • الحصة: {vr.period} ({vr.subject})
                            </p>
                            <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-1">
                              الإجراء الفوري: {vr.immediateAction}
                            </p>
                          </div>

                          <div>
                            <span className="text-slate-400 block text-[10px]">محرر التقرير:</span>
                            <p className="font-bold text-slate-900 dark:text-white mt-0.5">{vr.reportedBy || vr.createdBy}</p>
                            {vr.witnesses && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                الشهود: {vr.witnesses}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Student Statement and Signature */}
                        {(vr.studentStatement || vr.studentSignature) && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 space-y-2">
                            {vr.studentStatement && (
                              <div>
                                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold block">
                                  إفادة الطالب الموثقة:
                                </span>
                                <p className="text-[11px] text-slate-700 dark:text-slate-200 italic mt-0.5">
                                  "{vr.studentStatement}"
                                </p>
                              </div>
                            )}

                            {vr.studentSignature && (
                              <div className="flex items-center justify-between pt-2 border-t border-purple-100 dark:border-purple-900">
                                <span className="text-[10px] text-slate-500">توقيع الطالب على إفادته:</span>
                                <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <img
                                    src={vr.studentSignature}
                                    alt="توقيع الطالب"
                                    className="h-9 max-w-[130px] object-contain"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          <span className="text-[11px] text-slate-400 font-mono">رقم القيد: #{vr.id}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedViolationReportForPrint(vr)}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-purple-600 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-600" />
                            <span>معاينة وطباعة النموذج</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* 4. Model 7: Parent Notice Forms (إخطار حسم درجات) */}
                  {studentNotices.map((n) => (
                    <div
                      key={n.id}
                      className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10 transition-all text-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[11px] border border-amber-200">
                            نموذج (7)
                          </span>
                          <h5 className="font-black text-slate-900 dark:text-white text-sm">
                            {n.noticeType} لولي الأمر • حسم {n.deductedMarks} درجات
                          </h5>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                            {n.status}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {n.issueDate}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300 font-bold">
                        تفاصيل المخالفة: {n.violationDetails}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 font-mono">رقم القيد: #{n.id}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedNoticeForPrint(n)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-amber-600 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-600" />
                          <span>معاينة وطباعة النموذج</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 5. Model 10: Parent Commitment Forms (تعهد تكرار المخالفات) */}
                  {studentCommitments.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-950/10 transition-all text-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[11px] border border-rose-200">
                            نموذج (10)
                          </span>
                          <h5 className="font-black text-slate-900 dark:text-white text-sm">
                            تعهد ولي الأمر والطالب عند تكرار المخالفات
                          </h5>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-300">
                            {c.status}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            {c.issueDate}
                          </span>
                        </div>
                      </div>

                      <div className="text-slate-700 dark:text-slate-300 space-y-1">
                        <p>ولي الأمر المتعهد: <strong>{c.parentName}</strong></p>
                        <p className="text-[11px] text-slate-500">
                          المخالفات المشمولة في التعهد: {c.violationsList.filter(Boolean).join(' • ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 font-mono">رقم القيد: #{c.id}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCommitmentForPrint(c)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-rose-600 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-rose-600" />
                          <span>معاينة وطباعة النموذج</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: التواصل مع ولي الأمر والأسرة */}
          {activeTab === 'communication' && (
            <div className="space-y-5">
              {/* Guardian Contact Summary Card */}
              <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
                      <span>بيانات التواصل المعتمدة لولي الأمر</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      قنوات التواصل المباشرة وسجل المقابلات وجلسات الإرشاد الأسري
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMeetingModal(true)}
                      className="px-3.5 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>+ توثيق اجتماع جديد</span>
                    </button>
                    {onOpenMessageForStudent && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMessageForStudent(student.id);
                        }}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>إرسال رسالة رسمية</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">ولي الأمر الأساسي</span>
                    <strong className="font-bold text-slate-900 dark:text-white text-xs block">
                      {student.parentName || 'مسجل بالنظام'} ({student.parentRelation || 'الأب'})
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">هاتف الأب / الأساسي</span>
                    <div className="flex items-center justify-between">
                      <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {student.parentPhone || student.fatherPhone || 'غير متوفر'}
                      </strong>
                      {(student.parentPhone || student.fatherPhone) && (
                        <a
                          href={`tel:${student.parentPhone || student.fatherPhone}`}
                          className="p-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#006D77] hover:bg-teal-100"
                          title="اتصال هاتفي"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">هاتف الأم</span>
                    <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {student.motherPhone || 'غير متوفر'}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 block mb-0.5">هاتف الطوارئ / البديل</span>
                    <strong className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {student.emergencyPhone || student.alternatePhone || 'غير متوفر'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Add New Meeting Inline Form */}
              {showAddMeetingModal && (
                <div className="p-5 rounded-2xl border-2 border-[#006D77] bg-white dark:bg-slate-900 shadow-md space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h5 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#006D77]" />
                      <span>توثيق اجتماع ومقابلة جديدة مع ولي الأمر</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowAddMeetingModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        صفة الحاضر للاجتماع:
                      </label>
                      <select
                        value={meetingAttendee}
                        onChange={(e) => setMeetingAttendee(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      >
                        <option value="الأب / ولي الأمر">الأب / ولي الأمر</option>
                        <option value="الأم">الأم</option>
                        <option value="الوصي القانوني">الوصي القانوني</option>
                        <option value="الأخ الأكبر / قريب من الدرجة الأولى">الأخ الأكبر / قريب من الدرجة الأولى</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        موضوع المقابلة / سبب الاجتماع:
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: مناقشة أسباب التأخر ووضع خطة التزام..."
                        value={meetingTopic}
                        onChange={(e) => setMeetingTopic(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        الخطة والاتفاق التربوي مع ولي الأمر:
                      </label>
                      <textarea
                        rows={2}
                        placeholder="التزام ولي الأمر بالمتابعة المنزلية وإشعار المدرسة بأي طارئ..."
                        value={meetingAgreedPlan}
                        onChange={(e) => setMeetingAgreedPlan(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddMeetingModal(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewMeeting}
                      disabled={!meetingTopic.trim()}
                      className="px-4 py-2 bg-[#006D77] hover:bg-[#005a63] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      حفظ وتوثيق الاجتماع رسمياً
                    </button>
                  </div>
                </div>
              )}

              {/* Recorded Meetings Log */}
              <div className="space-y-3">
                <h5 className="text-xs font-black text-slate-700 dark:text-slate-300">
                  سجل الاجتماعات والمقابلات الموثقة ({parentMeetings.length}):
                </h5>

                {parentMeetings.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                    <Users className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      لا توجد مقابلات مسجلة مع ولي الأمر بعد.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      يمكنك توثيق أي اجتماع أو تواصل يتم مع ولي الأمر لحفظه بسجل الطالب.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {parentMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2 text-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#006D77]" />
                            <strong className="text-slate-900 dark:text-white text-xs sm:text-sm">
                              {m.topic}
                            </strong>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                            <span>{m.date}</span>
                            {m.time && <span>({m.time})</span>}
                          </div>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                          <strong className="text-slate-800 dark:text-slate-200">الخطة والاتفاق:</strong> {m.agreedPlan}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                          <div className="flex items-center gap-3">
                            <span>الحاضر: <strong className="text-slate-700 dark:text-slate-300">{m.attendeeRole}</strong></span>
                            <span>المرشد: <strong className="text-slate-700 dark:text-slate-300">{m.counselorName}</strong></span>
                          </div>
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>توقيع ولي الأمر موثق</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Automated Gmail API Notification Log Linked to Student File */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-xs font-black text-[#0B2748] dark:text-[#C9A227] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#C9A227]" />
                    <span>سجل إشعارات Gmail التلقائية المرتبطة بملف الطالب ({studentGmailRecords.length}):</span>
                  </h5>
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                    بريد ولي الأمر المعتمد: {extractApprovedGuardianEmail(student).email || 'غير مسجل'}
                  </span>
                </div>

                {studentGmailRecords.length === 0 ? (
                  <div className="py-5 px-4 text-center bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    لا توجد محاولات إرسال عبر Gmail مسجلة لهذا الطالب حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {studentGmailRecords.map((gRec) => {
                      const badge = getGmailQueueStateBadge(gRec.state);
                      return (
                        <div
                          key={gRec.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B2748]/70 text-xs space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded-md border font-black text-[11px] ${badge.className}`}>
                                {badge.label}
                              </span>
                              <strong className="text-slate-900 dark:text-white">
                                {getNotificationTypeLabel(gRec.notificationType)} — {gRec.incidentTitle}
                              </strong>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              تاريخ الواقعة: {gRec.incidentDate}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <span>
                              المستلم: <strong>{gRec.guardianName}</strong> ({gRec.guardianRelation}) —{' '}
                              <span className="font-mono">{gRec.recipientEmail || 'بدون بريد'}</span>
                            </span>
                            <span>الموظف المعتمد: {gRec.approvedByName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                            <span>{badge.subtitle}</span>
                            {gRec.gmailMessageId && (
                              <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                                Gmail ID: {gRec.gmailMessageId}
                              </span>
                            )}
                          </div>
                          {(gRec.failureReason || gRec.uncertainReason) && (
                            <div className="text-[11px] text-rose-600 dark:text-rose-300 font-bold">
                              التفاصيل: {gRec.failureReason || gRec.uncertainReason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detailed Unified Table of All WhatsApp & Email Messages Sent to the Student (Linked by Immutable Student Number) */}
              <div className="space-y-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C2340] shadow-xs space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#006D77] dark:text-[#D4AF37]" />
                        <h5 className="text-sm font-black text-slate-900 dark:text-white">
                          جدول سجل التواصل التفصيلي للرسائل المرسلة (واتساب وبريد إلكتروني)
                        </h5>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#0C2340] text-[#D4AF37] border border-[#D4AF37]/40 text-[11px] font-mono font-bold">
                          الرقم الطلابي الثابت: {student.studentNumber || student.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        يوثّق هذا الجدول جميع الرسائل المرسلة لولي أمر الطالب بالاعتماد على الرقم الطلابي الثابت ({student.studentNumber || student.id}) مع حالتها المعتمدة وتاريخ الإجراء واسم الموظف المسؤول.
                      </p>
                    </div>

                    {/* Summary Counters */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] block">إجمالي الرسائل</span>
                        <strong className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          {studentMessageLogs.length}
                        </strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                        <span className="text-emerald-700 dark:text-emerald-300 text-[10px] block">واتساب</span>
                        <strong className="font-mono font-black text-emerald-800 dark:text-emerald-200 text-sm">
                          {studentMessageLogs.filter((l) => l.channel === 'whatsapp').length}
                        </strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                        <span className="text-sky-700 dark:text-sky-300 text-[10px] block">بريد إلكتروني</span>
                        <strong className="font-mono font-black text-sky-800 dark:text-sky-200 text-sm">
                          {studentMessageLogs.filter((l) => l.channel === 'email').length}
                        </strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60">
                        <span className="text-teal-700 dark:text-teal-300 text-[10px] block">أكد الموظف الإرسال</span>
                        <strong className="font-mono font-black text-teal-800 dark:text-teal-200 text-sm">
                          {
                            studentMessageLogs.filter(
                              (l) => resolveCommunicationStatusMeta(l).code === 'confirmed_sent'
                            ).length
                          }
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Filter Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        تصفية حسب القناة:
                      </label>
                      <select
                        value={commChannelFilter}
                        onChange={(e) => setCommChannelFilter(e.target.value as 'all' | 'whatsapp' | 'email')}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="all">جميع القنوات (واتساب + بريد إلكتروني)</option>
                        <option value="whatsapp">واتساب فقط (WhatsApp)</option>
                        <option value="email">البريد الإلكتروني فقط (Email)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        تصفية حسب الحالة الحالية:
                      </label>
                      <select
                        value={commStatusFilter}
                        onChange={(e) => setCommStatusFilter(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="all">جميع الحالات المعتمدة</option>
                        <option value="draft">مسودة</option>
                        <option value="ready">جاهزة للإرسال</option>
                        <option value="whatsapp_opened">تم فتح واتساب</option>
                        <option value="email_opened">تم فتح البريد</option>
                        <option value="confirmed_sent">أكد الموظف الإرسال</option>
                        <option value="failed">فشل أو تعذر الفتح</option>
                        <option value="cancelled">ملغاة</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        بحث في القالب أو الموظف أو نص الرسالة:
                      </label>
                      <input
                        type="text"
                        value={commSearchQuery}
                        onChange={(e) => setCommSearchQuery(e.target.value)}
                        placeholder="ابحث باسم الموظف، القالب، أو نص الرسالة..."
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>

                  {/* Detailed Messages Table */}
                  {filteredStudentMessageLogs.length === 0 ? (
                    <div className="py-10 px-4 text-center bg-slate-50/70 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        لا توجد رسائل مطابقة مسجلة للرقم الطلابي ({student.studentNumber || student.id}) حالياً.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        تُحفظ جميع الرسائل المرسلة من «مركز التواصل الذكي مع أولياء الأمور» تلقائياً في هذا الجدول بالاعتماد على الرقم الطلابي الثابت.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-right border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0C2340] text-white text-[11px] font-bold border-b border-slate-700">
                            <th className="py-3 px-3 whitespace-nowrap"># / الرقم الطلابي الثابت</th>
                            <th className="py-3 px-3 whitespace-nowrap">القناة</th>
                            <th className="py-3 px-3 whitespace-nowrap">نوع الرسالة / القالب والواقعة</th>
                            <th className="py-3 px-3 whitespace-nowrap">ولي الأمر المستلم</th>
                            <th className="py-3 px-3 whitespace-nowrap">الحالة الحالية</th>
                            <th className="py-3 px-3 whitespace-nowrap">تاريخ ووقت الإجراء</th>
                            <th className="py-3 px-3 whitespace-nowrap">اسم الموظف المسؤول</th>
                            <th className="py-3 px-3 whitespace-nowrap text-center">التفاصيل والإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {filteredStudentMessageLogs.map((log, index) => {
                            const statusMeta = resolveCommunicationStatusMeta(log);
                            const actionTimestamp = log.confirmedAt || log.openedAt || log.createdAt;
                            const formattedActionDate = actionTimestamp
                              ? new Date(actionTimestamp).toLocaleString('ar-AE', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'غير محدد';
                            const formattedCreatedDate = log.createdAt
                              ? new Date(log.createdAt).toLocaleString('ar-AE', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—';
                            const staffName =
                              log.createdByName || log.sentByName || log.createdBy || 'المرشد الأكاديمي والمهني';
                            const categoryKey = String(log.templateCategory || log.category || 'custom');
                            const categoryLabel =
                              MESSAGE_CATEGORY_LABELS_AR[categoryKey] ||
                              CATEGORY_LABELS[categoryKey as keyof typeof CATEGORY_LABELS] ||
                              'إشعار ولي أمر';
                            const templateDisplayTitle =
                              log.templateName || log.templateTitle || log.subject || categoryLabel;
                            const contactDestination =
                              log.recipientAddress ||
                              (log.channel === 'email'
                                ? log.recipientEmailFull || log.recipientEmailMasked
                                : log.recipientPhoneFull || log.recipientPhoneMasked) ||
                              '—';
                            const linkedIncidentRef =
                              log.incidentId || log.violationId || log.absenceId || log.tardinessId;
                            const isExpanded = expandedMessageLogId === log.id;

                            return (
                              <React.Fragment key={log.id || `${log.messageId}-${index}`}>
                                <tr className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 transition-colors align-top">
                                  {/* 1. Student Number & Reference */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-mono font-black text-[#0C2340] dark:text-[#D4AF37] text-xs">
                                        {log.studentNumber || student.studentNumber || student.id}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        #{(log.messageId || log.id || '').slice(-6)}
                                      </span>
                                      {log.isTestMode && (
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold w-fit">
                                          وضع الاختبار الآمن
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* 2. Channel */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    {log.channel === 'whatsapp' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[11px]">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>واتساب</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-bold text-[11px]">
                                        <Mail className="w-3 h-3" />
                                        <span>بريد إلكتروني</span>
                                      </span>
                                    )}
                                  </td>

                                  {/* 3. Message Type / Template & Linked Incident */}
                                  <td className="py-3 px-3 min-w-[190px]">
                                    <div className="space-y-1">
                                      <strong className="text-slate-900 dark:text-white block text-xs">
                                        {templateDisplayTitle}
                                      </strong>
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                          {categoryLabel}
                                        </span>
                                        {linkedIncidentRef && (
                                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-mono">
                                            واقعة: #{String(linkedIncidentRef).slice(-6)}
                                          </span>
                                        )}
                                      </div>
                                      {log.violationDescription && (
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                          {log.violationDescription}
                                        </p>
                                      )}
                                    </div>
                                  </td>

                                  {/* 4. Recipient Guardian */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="space-y-0.5">
                                      <strong className="text-slate-800 dark:text-slate-200 block">
                                        {log.recipientName || student.parentName || 'ولي الأمر'}
                                      </strong>
                                      <span className="text-[10px] text-slate-500 block">
                                        الصلة: {log.recipientRelation || log.recipientRole || student.parentRelation || 'ولي الأمر'}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 block" dir="ltr">
                                        {contactDestination}
                                      </span>
                                    </div>
                                  </td>

                                  {/* 5. Current Status */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="flex flex-col gap-1 items-start">
                                      <span
                                        className={`px-2.5 py-1 rounded-lg border font-black text-[11px] ${statusMeta.badgeClass}`}
                                      >
                                        {statusMeta.labelAr}
                                      </span>
                                      {log.retryCount && log.retryCount > 0 ? (
                                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                                          إعادة محاولة ({log.retryCount})
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>

                                  {/* 6. Action Date & Timestamps */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="space-y-0.5 font-mono text-[11px]">
                                      <div className="font-bold text-slate-900 dark:text-white">
                                        {formattedActionDate}
                                      </div>
                                      <div className="text-[10px] text-slate-500">
                                        إنشاء: {formattedCreatedDate}
                                      </div>
                                      {log.confirmedAt && (
                                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                          تأكيد: {new Date(log.confirmedAt).toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      )}
                                    </div>
                                  </td>

                                  {/* 7. Responsible Staff Member */}
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <div className="space-y-0.5">
                                      <strong className="text-slate-900 dark:text-white block text-xs">
                                        {staffName}
                                      </strong>
                                      {log.senderRole && (
                                        <span className="text-[10px] text-slate-500 block">
                                          {log.senderRole}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* 8. Actions (View Message Body / Confirm Sent) */}
                                  <td className="py-3 px-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedMessageLogId(isExpanded ? null : log.id)
                                        }
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer transition-colors"
                                      >
                                        {isExpanded ? 'إخفاء النص' : 'عرض النص'}
                                      </button>

                                      {statusMeta.canConfirmSent && (
                                        <button
                                          type="button"
                                          disabled={confirmingLogId === log.id}
                                          onClick={() => handleConfirmStudentMessageSent(log)}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
                                          title="تأكيد إتمام إرسال الرسالة من قبل الموظف"
                                        >
                                          {confirmingLogId === log.id ? 'جارٍ التأكيد...' : 'تأكيد الإرسال'}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>

                                {/* Expandable Row for Full Message Text Snapshot & Audit Details */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/90 dark:bg-slate-800/40">
                                    <td colSpan={8} className="p-4 border-t border-slate-200 dark:border-slate-800">
                                      <div className="space-y-2.5 text-xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <strong className="text-[#0C2340] dark:text-[#D4AF37]">
                                            النص الكامل للرسالة الموثقة في سجل الطالب (الرقم الطلابي: {log.studentNumber || student.studentNumber}):
                                          </strong>
                                          {log.subject && (
                                            <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                              عنوان الرسالة: <strong>{log.subject}</strong>
                                            </span>
                                          )}
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 text-xs">
                                          {log.messageSnapshot || log.messageBody || 'لا يتوفر نص محفوظ للرسالة.'}
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 pt-1">
                                          <span>
                                            معرّف السجل: <code className="font-mono">{log.id}</code>
                                          </span>
                                          {log.approvedAction && (
                                            <span>
                                              الإجراء المعتمد: <strong>{log.approvedAction}</strong>
                                            </span>
                                          )}
                                          {log.requiredGuardianAction && (
                                            <span>
                                              المطلوب من ولي الأمر: <strong>{log.requiredGuardianAction}</strong>
                                            </span>
                                          )}
                                          {log.notes && (
                                            <span>
                                              ملاحظات الإجراء: <strong>{log.notes}</strong>
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: الحالات والخطط (قرارات لجنة إدارة السلوك، خطط تعديل السلوك، السلوك الإيجابي) */}
          {(activeTab === 'cases_plans' || activeTab === 'committee_decisions' || activeTab === 'behavior_plans' || activeTab === 'positive_behavior') && (
            <div className="space-y-4">
              {/* Sub-tab Navigation */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCasesSubTab('committee')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    casesSubTab === 'committee'
                      ? 'bg-[#006D77] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>قرارات وإجراءات لجنة إدارة السلوك</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      casesSubTab === 'committee' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {studentDecisions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCasesSubTab('plans')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    casesSubTab === 'plans'
                      ? 'bg-[#006D77] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                  <span>خطط تعديل السلوك الفردية</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      casesSubTab === 'plans' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {behaviorPlans.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCasesSubTab('positive')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    casesSubTab === 'positive'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>السلوك الإيجابي واسترداد الدرجات</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      casesSubTab === 'positive' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {positiveRecords.length}
                  </span>
                </button>
              </div>

              {/* Sub-tab 1: خطط تعديل السلوك */}
              {casesSubTab === 'plans' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500">خطط تعديل السلوك الفردية ومؤشرات التحسن</h4>
              {behaviorPlans.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">لا توجد خطة تعديل سلوك نشطة حالياً.</p>
              ) : (
                <div className="space-y-3">
                  {behaviorPlans.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/20 dark:bg-teal-950/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#006D77]">خطة تعديل سلوك معتمدة</span>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">{p.targetBehavior}</h5>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          {p.status === 'active' ? 'نشطة قيد المتابعة' : 'مكتملة'}
                        </span>
                      </div>

                      {/* Improvement Score Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>نسبة تحسن السلوك:</span>
                          <span className="text-[#006D77]">{p.improvementRate || 75}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-[#006D77] h-2 rounded-full"
                            style={{ width: `${p.improvementRate || 75}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <strong>الهدف الإرشادي:</strong> {p.desiredOutcome}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

              {/* Sub-tab 2: السلوك الإيجابي وتعويض الدرجات */}
              {casesSubTab === 'positive' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500">سجل السلوك الإيجابي واسترداد الدرجات</h4>
                <button
                  type="button"
                  onClick={() => setShowAddPositiveModal(true)}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>منح تعزيز واسترداد درجات</span>
                </button>
              </div>

              {showAddPositiveModal && (
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">منح تعزيز سلوكي إيجابي</h5>
                  <input
                    type="text"
                    placeholder="عنوان السلوك أو المبادرة المتميزة..."
                    value={positiveTitle || ''}
                    onChange={(e) => setPositiveTitle(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">درجات مستردة:</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={recoveredMarks ?? 2}
                      onChange={(e) => setRecoveredMarks(Number(e.target.value))}
                      className="w-20 p-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPositiveModal(false)}
                      className="px-3 py-1 text-xs text-slate-500"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewPositive}
                      className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      اعتماد السلوك والتعويض
                    </button>
                  </div>
                </div>
              )}

              {positiveRecords.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">لا توجد سجلات تعزيز مسجلة حتى الآن.</p>
              ) : (
                <div className="space-y-2">
                  {positiveRecords.map((pos) => (
                    <div
                      key={pos.id}
                      className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <h5 className="font-bold text-slate-900 dark:text-white">{pos.behaviorTitle}</h5>
                        </div>
                        <p className="text-[11px] text-slate-500">{pos.description}</p>
                      </div>
                      <div className="text-left">
                        <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                          +{pos.recoveredMarks} درجات
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">{pos.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

              {/* Sub-tab 3: قرارات ولجنة السلوك ومحاضر الاجتماعات */}
              {casesSubTab === 'committee' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800">
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#006D77]" />
                    <span>قرارات ومحاضر لجنة إدارة السلوك (Behavior Committee Records)</span>
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    متابعة الإحالات إلى لجنة إدارة السلوك، قرارات الجزاءات المعتمدة، ومحاضر الاجتماعات الرسمية المربوطة بملف الطالب.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowReferModal(true)}
                  className="px-3 py-1.5 bg-[#006D77] hover:bg-[#005a63] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>+ إحالة جديدة للجنة</span>
                </button>
              </div>

              {/* Referral Form / Card */}
              {showReferModal && (
                <div className="p-4 rounded-xl border-2 border-[#006D77] bg-white dark:bg-slate-900 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h5 className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>إحالة حالة الطالب إلى لجنة إدارة السلوك المدرسي</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowReferModal(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      إلغاء
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        تصنيف المخالفة / الدرجة:
                      </label>
                      <select
                        value={referDegree || ''}
                        onChange={(e) => setReferDegree(e.target.value)}
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="الدرجة الثالثة (مخالفات جسيمة)">الدرجة الثالثة (مخالفات جسيمة - حسم 8 درجات)</option>
                        <option value="الدرجة الرابعة (شديدة الخطورة)">الدرجة الرابعة (شديدة الخطورة - حسم 12 درجة / فصل)</option>
                        <option value="تكرار مخالفات الدرجة الثانية">تكرار مخالفات الدرجة الثانية بعد استنفاد الإجراءات</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        موضوع الإحالة ومبرر العرض:
                      </label>
                      <input
                        type="text"
                        value={referTopic || ''}
                        onChange={(e) => setReferTopic(e.target.value)}
                        placeholder="مثال: مشاجرة جماعية واستخدام ألفاظ غير لائقة..."
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        الإجراء التربوي المقترح من المرشد:
                      </label>
                      <input
                        type="text"
                        value={referProposedAction || ''}
                        onChange={(e) => setReferProposedAction(e.target.value)}
                        placeholder="مثال: حسم درجات السلوك وتكليف بمهام مدرسية بديلة واستدعاء ولي الأمر..."
                        className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>

                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={notifyCommitteeOnRefer}
                          onChange={(e) => setNotifyCommitteeOnRefer(e.target.checked)}
                          className="rounded text-[#006D77] w-4 h-4"
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span>إرسال تنبيه عاجل لأعضاء اللجنة فور الإحالة (عبر SMS والبريد)</span>
                        </span>
                      </label>
                      {notifyCommitteeOnRefer && (
                        <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                          تنبيه فوري نشط
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReferModal(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={!referTopic.trim()}
                      onClick={handleReferToCommittee}
                      className="px-4 py-1.5 bg-[#006D77] hover:bg-[#005a63] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      تأكيد الإحالة وجدولة الجلسة
                    </button>
                  </div>
                </div>
              )}

              {/* LIST OF DECISIONS */}
              <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-700 dark:text-slate-300">
                  القرارات السلوكية الصادرة من اللجنة ({studentDecisions.length}):
                </h5>

                {studentDecisions.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    لا توجد قرارات معتمدة صادرة من لجنة السلوك لهذا الطالب حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentDecisions.map((dec) => {
                      const decStage: CommitteeStage =
                        dec.executionStatus === 'executed' || dec.executionStatus === 'in_progress'
                          ? 'execution'
                          : dec.approved
                          ? 'decision_approved'
                          : 'committee_review';

                      return (
                        <div
                          key={dec.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-[#006D77]/10 text-[#006D77] font-mono text-[11px] font-bold">
                                {dec.decisionNumber}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {dec.violationDegree || dec.violationTitle || 'قرار لجنة السلوك'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {dec.deductedMarks && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[11px] font-bold">
                                  -{dec.deductedMarks} درجات سلوك
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 font-mono">{dec.decisionDate}</span>
                            </div>
                          </div>

                          {/* Progress bar for decision execution */}
                          <CommitteeCaseProgressBar currentStage={decStage} readOnly={true} />

                          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                            <p className="font-bold text-slate-900 dark:text-white mb-1">الجزاء والإجراء المعتمد:</p>
                            <p>{dec.description || (dec.penalties && dec.penalties.join('، ')) || 'إلزام الطالب ببرنامج تعديل سلوك مكثف وتكليف مدرسي بديل.'}</p>
                            {dec.approvedAlternativeServices && dec.approvedAlternativeServices.length > 0 && (
                              <p className="mt-1 text-slate-500 text-[11px]">
                                <strong>الخدمات والمهام المدرسية البديلة:</strong> {dec.approvedAlternativeServices.join('، ')}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span>رئيس اللجنة: {dec.committeeChairperson || 'أحمد خليفة الكعبي (معتمد)'}</span>
                            <span>المرشد الطلابي: {dec.counselorName}</span>
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ساري النفاذ</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIST OF MEETINGS AND OFFICIAL MINUTES */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h5 className="text-xs font-black text-slate-700 dark:text-slate-300">
                  محاضر اجتماعات اللجنة المرتبطة بالطالب ({studentCommitteeMeetings.length}):
                </h5>

                {studentCommitteeMeetings.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    لا توجد محاضر اجتماعات مسجلة تناولت حالة الطالب حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {studentCommitteeMeetings.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-200 dark:border-teal-800 pb-2">
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              محضر اجتماع لجنة إدارة السلوك رقم {m.meetingNumber} ({m.type === 'urgent' ? 'طارئ' : 'دوري'})
                            </span>
                            <span className="text-[11px] text-slate-500">
                              التاريخ: {m.meetingDate} • الوقت: {m.meetingTime} • المكان: {m.location}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedMeetingForPrint(m)}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                            title="معاينة وطباعة محضر الاجتماع الرسمي (A4) / حفظ PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>طباعة المحضر</span>
                          </button>
                        </div>

                        {/* Official minutes text */}
                        {m.officialMinutes && (
                          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">
                              نص محضر الاجتماع المعتمد رسمياً:
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-serif">
                              {m.officialMinutes}
                            </p>
                          </div>
                        )}

                        {/* Agenda topics for this student */}
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            بنود المناقشة الخاصة بالطالب:
                          </span>
                          {(m.agenda || [])
                            .filter((ag: any) => ag.studentId === student.id)
                            .map((ag: any, i: number) => {
                              const agStage: CommitteeStage =
                                ag.stage ||
                                (ag.decision === 'approved' ? 'decision_approved' : 'committee_review');

                              return (
                                <div
                                  key={i}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2.5"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                      <p className="font-bold text-slate-900 dark:text-white">{ag.topic}</p>
                                      <p className="text-[11px] text-slate-500">
                                        <strong>الإجراء المقترح:</strong> {ag.proposedAction}
                                      </p>
                                      {ag.memberRecommendation && (
                                        <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-1">
                                          <strong>توصية الأعضاء:</strong> {ag.memberRecommendation}
                                        </p>
                                      )}
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold self-start sm:self-auto ${
                                        ag.decision === 'approved'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      }`}
                                    >
                                      {ag.decision === 'approved' ? 'معتمد رسمياً' : 'قيد المناقشة'}
                                    </span>
                                  </div>

                                  <CommitteeCaseProgressBar currentStage={agStage} readOnly={true} />
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

          {/* TAB 9: المرفقات */}
          {activeTab === 'attachments' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500">المستندات والتقارير المرفقة بملف الطالب</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">الهوية الإماراتية للطالب وولي الأمر</p>
                      <p className="text-[10px] text-slate-400">PDF • تم التدقيق</p>
                    </div>
                  </div>
                  <button type="button" className="text-xs font-bold text-[#006D77] hover:underline">
                    معاينة
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">التقرير الطبي / الإرشادي المعتمد</p>
                      <p className="text-[10px] text-slate-400">مرفق رسمي</p>
                    </div>
                  </div>
                  <button type="button" className="text-xs font-bold text-[#006D77] hover:underline">
                    معاينة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Form Print Modals for Student File */}
      {selectedWarningForPrint && (
        <PrintWarningModal
          isOpen={!!selectedWarningForPrint}
          onClose={() => setSelectedWarningForPrint(null)}
          form={selectedWarningForPrint}
        />
      )}
      {selectedSummonForPrint && (
        <PrintSummonModal
          isOpen={!!selectedSummonForPrint}
          onClose={() => setSelectedSummonForPrint(null)}
          form={selectedSummonForPrint}
        />
      )}
      {selectedViolationReportForPrint && (
        <PrintViolationReportModal
          isOpen={!!selectedViolationReportForPrint}
          onClose={() => setSelectedViolationReportForPrint(null)}
          form={selectedViolationReportForPrint}
        />
      )}
      {selectedNoticeForPrint && (
        <PrintParentNoticeModal
          isOpen={!!selectedNoticeForPrint}
          onClose={() => setSelectedNoticeForPrint(null)}
          form={selectedNoticeForPrint}
        />
      )}
      {selectedCommitmentForPrint && (
        <PrintParentCommitmentModal
          isOpen={!!selectedCommitmentForPrint}
          onClose={() => setSelectedCommitmentForPrint(null)}
          form={selectedCommitmentForPrint}
        />
      )}
      {selectedMeetingForPrint && (
        <PrintCommitteeMeetingModal
          isOpen={!!selectedMeetingForPrint}
          onClose={() => setSelectedMeetingForPrint(null)}
          meeting={selectedMeetingForPrint}
          student={student}
        />
      )}
      {selectedAttendanceCommitmentForPrint && (
        <PrintAttendanceCommitmentModal
          isOpen={!!selectedAttendanceCommitmentForPrint}
          onClose={() => setSelectedAttendanceCommitmentForPrint(null)}
          form={selectedAttendanceCommitmentForPrint}
        />
      )}
      {selectedPickupCommitmentForPrint && (
        <PrintAuthorizedPickupModal
          isOpen={!!selectedPickupCommitmentForPrint}
          onClose={() => setSelectedPickupCommitmentForPrint(null)}
          form={selectedPickupCommitmentForPrint}
        />
      )}
      {selectedSuspensionForPrint && (
        <PrintTemporarySuspensionModal
          isOpen={!!selectedSuspensionForPrint}
          onClose={() => setSelectedSuspensionForPrint(null)}
          form={selectedSuspensionForPrint}
        />
      )}
      {printingOfficialDoc && (
        <OfficialModel6PrintView
          isOpen={!!printingOfficialDoc}
          onClose={() => setPrintingOfficialDoc(null)}
          document={printingOfficialDoc}
        />
      )}

      {/* Full Violation Incident Details Modal */}
      {selectedViolationDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
          dir="rtl"
        >
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full overflow-hidden text-right">
            <div className="bg-[#0B2748] text-white p-4 px-5 flex items-center justify-between border-b-2 border-[#C9A227]">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-[#C9A227]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black">التفاصيل الكاملة للواقعة السلوكية الموثقة</h3>
                  <p className="text-[11px] text-slate-300">
                    {schoolSettings.schoolName} • الرقم الطلابي: {student.studentNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedViolationDetail(null)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">اسم الطالب</span>
                  <strong className="font-bold text-slate-900 dark:text-white">{student.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">الصف والشعبة</span>
                  <strong className="font-bold text-slate-900 dark:text-white">
                    {student.grade} / شعبة {student.section} ({student.track || 'عام'})
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">تاريخ ووقت الواقعة</span>
                  <strong className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedViolationDetail.incidentDateTime || selectedViolationDetail.createdAt}
                  </strong>
                </div>
              </div>

              <div className="space-y-2 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md font-bold border ${getDegreeBadge(selectedViolationDetail.violationDegree)}`}>
                    {selectedViolationDetail.violationDegree}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-md font-bold border ${getStatusBadge(selectedViolationDetail.status)}`}>
                    حالة الاعتماد: {selectedViolationDetail.status}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white pt-1">
                  {selectedViolationDetail.violationType}
                </h4>
                {selectedViolationDetail.violationsList && selectedViolationDetail.violationsList.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">بنود ورموز المخالفة وفق اللائحة المعتمدة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedViolationDetail.violationsList.map((cl, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[11px]">
                          رمز ({cl.code}): {cl.title} — {cl.degree} {cl.deductionMarks ? `(حسم ${cl.deductionMarks} درجات)` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">تفاصيل الواقعة والملاحظات الموثقة:</span>
                <p className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedViolationDetail.incidentDescription || 'تم توثيق الواقعة وفق لائحة الانضباط السلوكي المعتمدة في الأكاديمية.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold block mb-0.5">الإجراء التربوي المتخذ / المقترح:</span>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {selectedViolationDetail.suggestedAction || 'تطبيق الإجراء المعتمد في اللائحة'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold block mb-0.5">حسم درجات السلوك المعتمد:</span>
                  <p className="font-black text-rose-700 dark:text-rose-300">
                    {selectedViolationDetail.totalDeductionMarks && selectedViolationDetail.totalDeductionMarks > 0
                      ? `حسم (${selectedViolationDetail.totalDeductionMarks}) درجات من رصيد السلوك`
                      : 'تنبيه وتوجيه تربوي (بدون حسم درجات)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">مكان الواقعة:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedViolationDetail.incidentLocation || 'الحرم المدرسي'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">المُبلّغ عن الواقعة:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedViolationDetail.reportingPerson || 'الكادر المدرسي'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">الموظف المسؤول عن التوثيق:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{selectedViolationDetail.recordedBy || 'المرشد الأكاديمي'}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedViolationDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#0B2748] hover:bg-[#12395B] text-white text-xs font-bold cursor-pointer"
              >
                إغلاق التفاصيل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
