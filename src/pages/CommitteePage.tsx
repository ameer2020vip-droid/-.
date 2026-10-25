import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ChevronRight,
  Send,
  UserCheck,
  Award,
  Vote,
  Shield,
  FileSignature,
  ArrowRightCircle,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Bell,
  Trash2,
  Edit3,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Save,
  Check,
  RefreshCw,
  FolderOpen,
  UserX,
  Building2,
  FileSpreadsheet,
  AlertCircle,
  PenTool,
} from 'lucide-react';
import { CommitteeCaseProgressBar, CommitteeStage } from '../components/CommitteeCaseProgressBar';
import { CommitteeNotificationModal } from '../components/CommitteeNotificationModal';
import { PrintCommitteeMeetingModal } from '../components/PrintCommitteeMeetingModal';
import { PrintTemporarySuspensionModal } from '../components/PrintTemporarySuspensionModal';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import {
  BehaviorCommitteeMeeting,
  BehaviorCommitteeDecision,
  CommitteeMeetingCase,
  Student,
  CounselorUser,
  AppUser,
  ViolationRecord,
  TemporarySuspensionFormRecord,
  CommitteeFormationConfig,
  CommitteeMemberConfig,
  EmployeeRecord,
  OfficialDocumentRecord,
  DocumentSignature,
} from '../types';
import {
  getCommitteeMeetings,
  saveCommitteeMeeting,
  deleteCommitteeMeetingLocal,
  getCommitteeDecisions,
  saveCommitteeDecision,
  getTemporarySuspensionForms,
  saveTemporarySuspensionFormLocal,
  deleteTemporarySuspensionFormLocal,
  getWarningForms,
  getParentSummonForms,
  getViolationReports,
  getParentNoticeForms,
  getCommitteeNotificationLogs,
  dispatchCommitteeNotification,
  getCommitteeFormationLocal,
  saveCommitteeFormationLocal,
  getInitialCommitteeFormation,
  getEmployees,
  saveOfficialDocumentLocal,
  getOfficialDocumentsLocal,
} from '../storage';
import {
  fetchCommitteeMeetingsFromFirestore,
  saveCommitteeMeetingFirestore,
  deleteCommitteeMeetingFirestore,
  fetchTemporarySuspensionForms,
  saveTemporarySuspensionForm,
  deleteTemporarySuspensionForm,
  fetchCommitteeFormation,
  saveCommitteeFormationFirestore,
  saveOfficialDocumentFirestore,
} from '../firebase/firestoreService';
import {
  getUaeTodayDateString,
  getDayNameFromDateString,
  getUaeFullDateTimeString,
} from '../utils/time';

interface CommitteePageProps {
  students: Student[];
  violations?: ViolationRecord[];
  currentUser?: CounselorUser | AppUser | null;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onOpenStudentProfile: (studentId: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const CommitteePage: React.FC<CommitteePageProps> = ({
  students,
  violations = [],
  currentUser,
  onShowToast,
  onOpenStudentProfile,
  onNavigateToTab,
}) => {
  const { schoolSettings } = useSchoolSettings();

  // Active Main Sub-Tab in Committee Page: 'meetings' (الاجتماعات والجلسات), 'forms' (نماذج اللجنة), or 'formation' (التشكيل الرسمي للجنة)
  const [activeMainTab, setActiveMainTab] = useState<'meetings' | 'forms' | 'formation'>('meetings');

  // Committee Formation state
  const [committeeFormation, setCommitteeFormation] = useState<CommitteeFormationConfig>(() =>
    getCommitteeFormationLocal()
  );
  const [isSavingFormation, setIsSavingFormation] = useState<boolean>(false);
  const [staffEmployees, setStaffEmployees] = useState<EmployeeRecord[]>(() => getEmployees());
  const [selectedStaffForAttendee, setSelectedStaffForAttendee] = useState<string>('');

  // Meetings & Decisions state (offline-first loaded, synced with Firestore)
  const [meetings, setMeetings] = useState<BehaviorCommitteeMeeting[]>(() => getCommitteeMeetings());
  const [decisions, setDecisions] = useState<BehaviorCommitteeDecision[]>(() => getCommitteeDecisions());
  const [temporaryForms, setTemporaryForms] = useState<TemporarySuspensionFormRecord[]>(() =>
    getTemporarySuspensionForms()
  );
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(() => meetings[0]?.id || null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters for Meetings
  const [meetingsSearchQuery, setMeetingsSearchQuery] = useState<string>('');
  const [meetingsStatusFilter, setMeetingsStatusFilter] = useState<'all' | 'draft' | 'convened' | 'approved'>('all');

  // Filters for Committee Forms (Model 12)
  const [formsSearchQuery, setFormsSearchQuery] = useState<string>('');
  const [formsGradeFilter, setFormsGradeFilter] = useState<string>('all');

  // Modal: Create or Edit Meeting
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState<boolean>(false);
  const [editingMeeting, setEditingMeeting] = useState<BehaviorCommitteeMeeting | null>(null);

  // Form State inside Meeting Modal
  const [modalSessionNumber, setModalSessionNumber] = useState<string>('');
  const [modalMeetingDate, setModalMeetingDate] = useState<string>(getUaeTodayDateString());
  const [modalMeetingTime, setModalMeetingTime] = useState<string>('10:00 ص');
  const [modalLocation, setModalLocation] = useState<string>('قاعة الاجتماعات الرئيسية - إدارة المدرسة');
  const [modalType, setModalType] = useState<'regular' | 'urgent'>('regular');
  const [modalChairperson, setModalChairperson] = useState<string>(schoolSettings.principalName || 'أحمد خليفة الكعبي (مدير المدرسة)');
  const [modalRapporteur, setModalRapporteur] = useState<string>(currentUser?.name || 'المرشد الأكاديمي والمهني');
  const [modalStatus, setModalStatus] = useState<'draft' | 'convened' | 'approved'>('convened');
  const [modalAttendees, setModalAttendees] = useState<Array<{ name: string; role: string; attended: boolean }>>(() => {
    const formation = getCommitteeFormationLocal();
    if (formation && Array.isArray(formation.members) && formation.members.length > 0) {
      return formation.members.map((m) => ({
        name: m.name,
        role: m.roleTitle,
        attended: true,
      }));
    }
    return [
      { name: schoolSettings.principalName || 'أحمد خليفة الكعبي', role: 'مدير المدرسة - رئيساً', attended: true },
      { name: 'سلطان سالم الشامسي', role: 'مساعد المدير لشؤون الطلبة - عضواً', attended: true },
      { name: currentUser?.name || 'عبدالله راشد النعيمي', role: 'المرشد الأكاديمي والمهني - مقرراً', attended: true },
      { name: 'علي حسن البلوشي', role: 'الاختصاصي الاجتماعي - عضواً', attended: true },
      { name: 'د. خالد محمد المنصوري', role: 'ممثل المعلمين - عضواً', attended: true },
      { name: 'سيف عبد الله الشامسي', role: 'رئيس مجلس أولياء الأمور - عضواً', attended: true },
    ];
  });
  const [modalCases, setModalCases] = useState<CommitteeMeetingCase[]>([]);

  // Sub-Modal inside Meeting Modal: Add/Edit Case to meeting
  const [isCaseModalOpen, setIsCaseModalOpen] = useState<boolean>(false);
  const [editingCaseIdInModal, setEditingCaseIdInModal] = useState<string | null>(null);
  const [expandedModalCaseIds, setExpandedModalCaseIds] = useState<Record<string, boolean>>({});
  const [caseStudentSearchQuery, setCaseStudentSearchQuery] = useState<string>('');
  const [selectedStudentForCase, setSelectedStudentForCase] = useState<string>('');
  const [selectedViolationForCase, setSelectedViolationForCase] = useState<string>('');
  const [caseDiscussionNotes, setCaseDiscussionNotes] = useState<string>('');
  const [caseRecommendation, setCaseRecommendation] = useState<string>('');
  const [caseDecision, setCaseDecision] = useState<CommitteeMeetingCase['decision']>('temporary_suspension');
  const [caseDecisionCustomText, setCaseDecisionCustomText] = useState<string>('');
  const [caseJustification, setCaseJustification] = useState<string>('');
  const [caseBehaviorProgram, setCaseBehaviorProgram] = useState<string>(
    'التكليف بواجبات وتطبيقات دراسية يومية داخل المدرسة تحت إشراف المرشد الأكاديمي، مع جلسات إرشاد وتعديل سلوك فردية.'
  );
  const [caseNotes, setCaseNotes] = useState<string>('');

  // Modal: Model 12 Form Editor & Signatures
  const [isModel12ModalOpen, setIsModel12ModalOpen] = useState<boolean>(false);
  const [editingModel12, setEditingModel12] = useState<TemporarySuspensionFormRecord | null>(null);
  const [activeModel12SignatureType, setActiveModel12SignatureType] = useState<'principal' | 'parent' | 'student' | null>(null);
  const [isSelectCaseForModel12ModalOpen, setIsSelectCaseForModel12ModalOpen] = useState<boolean>(false);

  // Print Modals
  const [isPrintMeetingModalOpen, setIsPrintMeetingModalOpen] = useState<boolean>(false);
  const [selectedMeetingForPrint, setSelectedMeetingForPrint] = useState<BehaviorCommitteeMeeting | null>(null);
  const [isPrintModel12ModalOpen, setIsPrintModel12ModalOpen] = useState<boolean>(false);
  const [selectedModel12ForPrint, setSelectedModel12ForPrint] = useState<TemporarySuspensionFormRecord | null>(null);

  // Notification Modal
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState<boolean>(false);
  const [notificationTargetMeeting, setNotificationTargetMeeting] = useState<BehaviorCommitteeMeeting | null>(null);

  // Selected Meeting object
  const selectedMeeting = useMemo(() => {
    return meetings.find((m) => m.id === selectedMeetingId) || meetings[0] || null;
  }, [meetings, selectedMeetingId]);

  // Sync with Firestore & localStorage
  const refreshAllData = async () => {
    setIsSyncing(true);
    try {
      const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';
      // Load Firestore meetings if online
      const remoteMeetings = await fetchCommitteeMeetingsFromFirestore(schoolId);
      if (remoteMeetings && remoteMeetings.length > 0) {
        setMeetings(remoteMeetings);
        // Sync to local
        remoteMeetings.forEach((m) => saveCommitteeMeeting(m));
      } else {
        setMeetings(getCommitteeMeetings());
      }

      // Load Firestore Model 12 forms if online
      const remoteForms = await fetchTemporarySuspensionForms(schoolId);
      if (remoteForms && remoteForms.length > 0) {
        setTemporaryForms(remoteForms);
        remoteForms.forEach((f) => saveTemporarySuspensionFormLocal(f));
      } else {
        setTemporaryForms(getTemporarySuspensionForms());
      }

      setDecisions(getCommitteeDecisions());

      // Sync Committee Formation from Firestore
      try {
        const remoteFormation = await fetchCommitteeFormation(schoolId);
        if (remoteFormation && remoteFormation.members && remoteFormation.members.length > 0) {
          setCommitteeFormation(remoteFormation);
          saveCommitteeFormationLocal(remoteFormation);
        } else {
          setCommitteeFormation(getCommitteeFormationLocal());
        }
      } catch (e) {
        setCommitteeFormation(getCommitteeFormationLocal());
      }
      setStaffEmployees(getEmployees());

      onShowToast('تم تحديث وتزامن بيانات لجنة إدارة السلوك بنجاح', 'success');
    } catch (err) {
      console.warn('Sync notice:', err);
      // Fallback local
      setMeetings(getCommitteeMeetings());
      setTemporaryForms(getTemporarySuspensionForms());
      setDecisions(getCommitteeDecisions());
      setCommitteeFormation(getCommitteeFormationLocal());
      setStaffEmployees(getEmployees());
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Initial fetch from firestore with local fallback
    refreshAllData();
  }, [currentUser?.schoolId]);

  // Total Statistics
  const totalMeetingsCount = meetings.length;
  const approvedMeetingsCount = meetings.filter((m) => m.status === 'approved' || m.status === 'completed').length;
  const allCasesCount = useMemo(() => {
    return meetings.reduce((sum, m) => sum + (m.cases?.length || m.agenda?.length || 0), 0);
  }, [meetings]);
  const totalModel12FormsCount = temporaryForms.length;
  const approvedFormsCount = temporaryForms.filter((f) => f.status === 'معتمد ومسلّم').length;

  // Filtered Meetings list
  const filteredMeetings = useMemo(() => {
    const q = meetingsSearchQuery.trim().toLowerCase();
    return meetings.filter((m) => {
      if (meetingsStatusFilter !== 'all') {
        if (meetingsStatusFilter === 'draft' && m.status !== 'draft' && m.status !== 'scheduled') return false;
        if (meetingsStatusFilter === 'convened' && m.status !== 'convened' && m.status !== 'in_progress') return false;
        if (meetingsStatusFilter === 'approved' && m.status !== 'approved' && m.status !== 'completed') return false;
      }
      if (q) {
        const numMatch = (m.sessionNumber || m.meetingNumber || '').toLowerCase().includes(q);
        const locMatch = (m.location || '').toLowerCase().includes(q);
        const chairMatch = (m.chairpersonName || '').toLowerCase().includes(q);
        const dateMatch = (m.meetingDate || '').toLowerCase().includes(q);
        const caseMatch = (m.cases || []).some((c) => c.studentName.toLowerCase().includes(q) || c.violationTitle.toLowerCase().includes(q));
        if (!numMatch && !locMatch && !chairMatch && !dateMatch && !caseMatch) return false;
      }
      return true;
    });
  }, [meetings, meetingsSearchQuery, meetingsStatusFilter]);

  // Filtered Model 12 Forms list
  const filteredModel12Forms = useMemo(() => {
    const q = formsSearchQuery.trim().toLowerCase();
    return temporaryForms.filter((f) => {
      if (formsGradeFilter !== 'all' && f.grade !== formsGradeFilter) return false;
      if (q) {
        const nameMatch = (f.studentName || '').toLowerCase().includes(q);
        const numMatch = (f.studentNumber || '').toLowerCase().includes(q);
        const meetMatch = (f.meetingNumber || '').toLowerCase().includes(q);
        const reasonMatch = (f.reason1 || '').toLowerCase().includes(q);
        if (!nameMatch && !numMatch && !meetMatch && !reasonMatch) return false;
      }
      return true;
    });
  }, [temporaryForms, formsSearchQuery, formsGradeFilter]);

  // Filtered students for selection in Case Modal
  const filteredStudentsForCaseModal = useMemo(() => {
    if (!caseStudentSearchQuery.trim()) return students;
    const q = caseStudentSearchQuery.toLowerCase();
    return students.filter(
      (s) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentNumber || '').toLowerCase().includes(q) ||
        (s.grade || '').toLowerCase().includes(q) ||
        (s.section || '').toLowerCase().includes(q)
    );
  }, [students, caseStudentSearchQuery]);

  // Selected student object in Case Modal
  const selectedStudentObj = useMemo(() => {
    if (!selectedStudentForCase) return null;
    return students.find((s) => s.id === selectedStudentForCase) || null;
  }, [students, selectedStudentForCase]);

  // Violations for currently selected student in Case Modal
  const availableViolationsForSelectedStudent = useMemo(() => {
    if (!selectedStudentForCase) return [];
    return violations.filter(
      (v) => v.studentId === selectedStudentForCase || v.studentNumber === selectedStudentForCase
    );
  }, [violations, selectedStudentForCase]);

  // Selected violation object in Case Modal
  const selectedViolationObj = useMemo(() => {
    if (!selectedViolationForCase) return null;
    return availableViolationsForSelectedStudent.find((v) => v.id === selectedViolationForCase) || null;
  }, [availableViolationsForSelectedStudent, selectedViolationForCase]);

  // Calculate repetition count of this violation for the selected student
  const calculatedRepetitionCount = useMemo(() => {
    if (!selectedViolationObj || !selectedStudentForCase) return 1;
    const sameDegreeViolations = availableViolationsForSelectedStudent.filter(
      (v) => v.violationDegree === selectedViolationObj.violationDegree
    );
    return Math.max(1, sameDegreeViolations.length);
  }, [selectedViolationObj, availableViolationsForSelectedStudent, selectedStudentForCase]);

  // Prior actions taken against student
  const studentPriorActions = useMemo(() => {
    if (!selectedStudentForCase) return [];
    const actions: string[] = [];
    // From warning forms (Model 9)
    const warns = getWarningForms().filter((w) => w.studentId === selectedStudentForCase);
    if (warns.length > 0) {
      actions.push(`تنبيه خطي وتعهد سلوكي (${warns.length} مرات)`);
    }
    // From summon forms (Model 8)
    const summons = getParentSummonForms().filter((s) => s.studentId === selectedStudentForCase);
    if (summons.length > 0) {
      actions.push(`خطاب استدعاء ولي الأمر (${summons.length} مرات)`);
    }
    // From parent notices (Model 7)
    const notices = getParentNoticeForms().filter((n) => n.studentId === selectedStudentForCase);
    if (notices.length > 0) {
      actions.push(`إخطار ولي الأمر بحسم درجات السلوك (${notices.length} مرات)`);
    }
    if (actions.length === 0) {
      actions.push('جلسات إرشاد وتوجيه ومتابعة مع المرشد الأكاديمي');
      actions.push('أخذ التعهدات السلوكية اللازمة وإخطار ولي الأمر');
    }
    return actions;
  }, [selectedStudentForCase]);

  // Student linked previous forms
  const studentLinkedFormsList = useMemo(() => {
    if (!selectedStudentForCase) return [];
    const forms: string[] = [];
    const warns = getWarningForms().filter((w) => w.studentId === selectedStudentForCase);
    warns.forEach((w) => forms.push(`نموذج 9: تنبيه خطي (${w.id})`));
    const summons = getParentSummonForms().filter((s) => s.studentId === selectedStudentForCase);
    summons.forEach((s) => forms.push(`نموذج 8: استدعاء ولي أمر (${s.id})`));
    const reports = getViolationReports().filter((r) => r.studentId === selectedStudentForCase);
    reports.forEach((r) => forms.push(`نموذج 6: تقرير مخالفة (${r.id})`));
    const notices = getParentNoticeForms().filter((n) => n.studentId === selectedStudentForCase);
    notices.forEach((n) => forms.push(`نموذج 7: إخطار حسم (${n.id})`));
    return forms;
  }, [selectedStudentForCase]);

  // --- Handlers for Meeting Creation / Editing ---
  const handleOpenCreateMeeting = () => {
    const nextSessionNum = `جلسة رقم (${meetings.length + 1}) / ${new Date().getFullYear()}`;
    const formation = getCommitteeFormationLocal();
    const chairMember = formation?.members?.find((m) => m.roleTitle.includes('رئيس') && !m.roleTitle.includes('نائب'));
    const rapMember = formation?.members?.find((m) => m.roleTitle.includes('مقرر'));

    const chairName = chairMember?.name || schoolSettings.principalName || 'أحمد خليفة الكعبي (مدير المدرسة)';
    const rapName = rapMember?.name || currentUser?.name || 'المرشد الأكاديمي والمهني';

    const defaultAttendees = (formation?.members && formation.members.length > 0)
      ? formation.members.map((m) => ({
          name: m.name,
          role: m.roleTitle,
          attended: true,
        }))
      : [
          { name: chairName, role: 'مدير المدرسة - رئيساً', attended: true },
          { name: 'سلطان سالم الشامسي', role: 'مساعد المدير لشؤون الطلبة - عضواً', attended: true },
          { name: rapName, role: 'المرشد الأكاديمي والمهني - مقرراً', attended: true },
          { name: 'علي حسن البلوشي', role: 'الاختصاصي الاجتماعي - عضواً', attended: true },
          { name: 'د. خالد محمد المنصوري', role: 'ممثل المعلمين - عضواً', attended: true },
          { name: 'سيف عبد الله الشامسي', role: 'رئيس مجلس أولياء الأمور - عضواً', attended: true },
        ];

    setEditingMeeting(null);
    setModalSessionNumber(nextSessionNum);
    setModalMeetingDate(getUaeTodayDateString());
    setModalMeetingTime('10:00 ص');
    setModalLocation('قاعة الاجتماعات الرئيسية - إدارة المدرسة');
    setModalType('regular');
    setModalChairperson(chairName);
    setModalRapporteur(rapName);
    setModalStatus('convened');
    setModalAttendees(defaultAttendees);
    setModalCases([]);
    setIsMeetingModalOpen(true);
  };

  const handleOpenEditMeeting = (meeting: BehaviorCommitteeMeeting) => {
    setEditingMeeting(meeting);
    setModalSessionNumber(meeting.sessionNumber || meeting.meetingNumber);
    setModalMeetingDate(meeting.meetingDate);
    setModalMeetingTime(meeting.meetingTime);
    setModalLocation(meeting.location);
    setModalType(meeting.type);
    setModalChairperson(meeting.chairpersonName || schoolSettings.principalName || 'مدير المدرسة');
    setModalRapporteur(meeting.rapporteurName || currentUser?.name || 'مقرر اللجنة');
    setModalStatus((meeting.status as any) || 'convened');
    setModalAttendees(
      (meeting.attendees || []).map((a) => ({
        name: a.name,
        role: a.role,
        attended: a.attended ?? a.present ?? true,
      }))
    );
    setModalCases(meeting.cases || []);
    setIsMeetingModalOpen(true);
  };

  const handleSaveMeeting = async () => {
    if (!modalSessionNumber.trim()) {
      onShowToast('يرجى تحديد رقم الجلسة / الاجتماع', 'warning');
      return;
    }

    const meetingId = editingMeeting ? editingMeeting.id : `COMM-${Date.now()}`;
    const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';

    // Map attendees to required interface format
    const formattedAttendees = modalAttendees.map((a) => ({
      name: a.name,
      role: a.role,
      present: a.attended,
      attended: a.attended,
      signed: editingMeeting?.attendees?.find((orig) => orig.name === a.name)?.signed || false,
    }));

    const meetingRecord: BehaviorCommitteeMeeting = {
      id: meetingId,
      meetingNumber: modalSessionNumber.trim(),
      sessionNumber: modalSessionNumber.trim(),
      meetingDate: modalMeetingDate,
      meetingTime: modalMeetingTime,
      location: modalLocation,
      type: modalType,
      chairpersonName: modalChairperson,
      rapporteurName: modalRapporteur,
      recordedBy: currentUser?.name || 'مقرر لجنة إدارة السلوك',
      attendees: formattedAttendees,
      cases: modalCases,
      // Map cases to agenda for backward compatibility with existing report generation
      agenda: modalCases.map((c, idx) => ({
        id: c.caseId,
        studentId: c.studentId,
        studentName: c.studentName,
        grade: `${c.grade} / ${c.section}`,
        topic: `النظر في مخالفة: ${c.violationTitle}`,
        incidentDegree: c.violationDegree,
        proposedAction: c.committeeRecommendation,
        discussionNotes: c.discussionNotes,
        decision: c.approvalStatus === 'approved' ? 'approved' : 'pending',
        memberRecommendation: c.decisionCustomText || c.decision,
        finalResolution: c.decisionJustification,
      })),
      status: modalStatus,
      officialMinutes: `عقدت لجنة إدارة السلوك اجتماعها بالجلسة رقم (${modalSessionNumber}) بتاريخ ${modalMeetingDate} برئاسة ${modalChairperson} وبحضور مقرر اللجنة ${modalRapporteur} والأعضاء. تم استعراض ومناقشة عدد (${modalCases.length}) من الحالات السلوكية المعروضة وفق اللائحة المعتمدة وتم اتخاذ القرارات اللازمة بحقها.`,
      minutesGenerated: true,
      createdAt: editingMeeting?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    saveCommitteeMeeting(meetingRecord);

    // Save to Firestore asynchronously
    try {
      await saveCommitteeMeetingFirestore(schoolId, meetingRecord, currentUser as any);
    } catch (err) {
      console.warn('Failed to sync meeting to Firestore immediately, saved locally:', err);
    }

    // Refresh list
    setMeetings(getCommitteeMeetings());
    setSelectedMeetingId(meetingId);
    setIsMeetingModalOpen(false);
    onShowToast(`تم حفظ بيانات الجلسة (${modalSessionNumber}) بنجاح`, 'success');
  };

  const handleDeleteMeeting = async (meeting: BehaviorCommitteeMeeting) => {
    if (meeting.status === 'approved') {
      onShowToast('لا يمكن حذف اجتماع معتمد رسمياً حفاظاً على سجلات النظام', 'error');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف ${meeting.sessionNumber || meeting.meetingNumber}؟`)) {
      return;
    }

    const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';
    deleteCommitteeMeetingLocal(meeting.id);
    try {
      await deleteCommitteeMeetingFirestore(schoolId, meeting.id, currentUser as any);
    } catch (err) {
      console.warn('Remote delete notice:', err);
    }

    setMeetings(getCommitteeMeetings());
    if (selectedMeetingId === meeting.id) {
      setSelectedMeetingId(meetings[0]?.id || null);
    }
    onShowToast('تم حذف مسودة الاجتماع بنجاح', 'info');
  };

  // --- Handlers for Committee Formation Management ---
  const handleUpdateCommitteeMember = (index: number, field: keyof CommitteeMemberConfig, value: any) => {
    setCommitteeFormation((prev) => {
      const members = [...prev.members];
      members[index] = { ...members[index], [field]: value };
      return { ...prev, members, updatedAt: new Date().toISOString() };
    });
  };

  const handleSelectEmployeeForCommitteeSlot = (index: number, empId: string) => {
    const emp = staffEmployees.find((e) => e.id === empId);
    if (!emp) return;

    setCommitteeFormation((prev) => {
      const members = [...prev.members];
      members[index] = {
        ...members[index],
        employeeId: emp.id,
        name: emp.fullName,
        department: emp.department,
        phoneNumber: emp.phoneNumber || members[index].phoneNumber,
      };
      return { ...prev, members, updatedAt: new Date().toISOString() };
    });
    onShowToast(`تم تعيين (${emp.fullName}) في منصب ${committeeFormation.members[index].roleTitle}`, 'info');
  };

  const handleAddCustomCommitteeMember = () => {
    const newMember: CommitteeMemberConfig = {
      id: `CFM-${Date.now().toString().slice(-4)}`,
      name: '',
      roleTitle: 'عضو مكلف بلجنة إدارة السلوك',
      department: 'الكادر المدرسي',
      isRequired: false,
    };

    setCommitteeFormation((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveCommitteeMember = (index: number) => {
    const target = committeeFormation.members[index];
    if (target.isRequired) {
      onShowToast('لا يمكن حذف الأعضاء الأساسيين المشترطين في اللائحة الرسمية', 'warning');
      return;
    }
    setCommitteeFormation((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
      updatedAt: new Date().toISOString(),
    }));
    onShowToast('تم استبعاد العضو من التشكيل', 'info');
  };

  const handleSaveCommitteeFormation = async () => {
    const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';
    setIsSavingFormation(true);
    try {
      saveCommitteeFormationLocal(committeeFormation);
      await saveCommitteeFormationFirestore(schoolId, committeeFormation, currentUser as any);
      onShowToast('تم حفظ وتوثيق التشكيل الرسمي لأعضاء لجنة إدارة السلوك بنجاح!', 'success');
    } catch (err) {
      console.warn('Error saving formation:', err);
      onShowToast('تم الحفظ محلياً مع تعذر المزامنة السحابية المؤقتة', 'info');
    } finally {
      setIsSavingFormation(false);
    }
  };

  const handleResetDefaultFormation = () => {
    const confirmed = window.confirm('هل ترغب في إعادة التشكيل الرسمي للجنة إلى الضوابط الافتراضية للائحة؟');
    if (!confirmed) return;

    const initial = getInitialCommitteeFormation();
    setCommitteeFormation(initial);
    saveCommitteeFormationLocal(initial);
    onShowToast('تمت استعادة التشكيل الافتراضي للجنة', 'info');
  };

  const handleAddStaffAsAttendee = (empId: string) => {
    const emp = staffEmployees.find((e) => e.id === empId);
    if (!emp) return;
    const exists = modalAttendees.some((a) => a.name === emp.fullName);
    if (exists) {
      onShowToast('هذا الموظف مضاف بالفعل في قائمة الحضور', 'warning');
      return;
    }
    setModalAttendees((prev) => [
      ...prev,
      {
        name: emp.fullName,
        role: emp.jobTitle || 'عضو حاضر',
        attended: true,
      },
    ]);
    setSelectedStaffForAttendee('');
    onShowToast(`تمت إضافة (${emp.fullName}) إلى حضور الجلسة`, 'success');
  };

  // --- Handlers for Adding & Managing Cases within Meeting Modal ---
  const handleOpenAddCase = () => {
    if (students.length === 0) {
      onShowToast('لا يوجد طلاب مسجلون في النظام', 'warning');
      return;
    }
    setEditingCaseIdInModal(null);
    setCaseStudentSearchQuery('');
    setSelectedStudentForCase('');
    setSelectedViolationForCase('');
    setCaseDiscussionNotes('');
    setCaseRecommendation('إيقاف مؤقت من الدراسة وإلحاق الطالب ببرنامج تعديل السلوك');
    setCaseDecision('temporary_suspension');
    setCaseDecisionCustomText('');
    setCaseJustification('تكرار ارتكاب المخالفة وعدم الاستجابة للإجراءات والبرامج الوقائية السابقة');
    setCaseBehaviorProgram(
      'التكليف بواجبات وتطبيقات دراسية يومية داخل المدرسة تحت إشراف المرشد الأكاديمي، مع جلسات إرشاد وتعديل سلوك فردية.'
    );
    setCaseNotes('');
    setIsCaseModalOpen(true);
  };

  const handleEditCaseInMeeting = (caseItem: CommitteeMeetingCase) => {
    setEditingCaseIdInModal(caseItem.caseId);
    setCaseStudentSearchQuery('');
    setSelectedStudentForCase(caseItem.studentId);
    setSelectedViolationForCase(caseItem.violationId);
    setCaseDiscussionNotes(caseItem.discussionNotes || '');
    setCaseRecommendation(caseItem.committeeRecommendation || '');
    setCaseDecision(caseItem.decision);
    setCaseDecisionCustomText(caseItem.decisionCustomText || '');
    setCaseJustification(caseItem.decisionJustification || '');
    setCaseBehaviorProgram(caseItem.behaviorModificationProgram || '');
    setCaseNotes(caseItem.notes || '');
    setIsCaseModalOpen(true);
  };

  const toggleModalCaseExpanded = (caseId: string) => {
    setExpandedModalCaseIds((prev) => ({
      ...prev,
      [caseId]: !prev[caseId],
    }));
  };

  const handleSaveCaseToMeeting = () => {
    if (!selectedStudentForCase) {
      onShowToast('يرجى اختيار طالب من القائمة', 'warning');
      return;
    }
    if (!selectedViolationForCase || !selectedViolationObj) {
      onShowToast('يرجى اختيار مخالفة قائمة ومسجلة للطالب (لا تنشئ مخالفة جديدة)', 'warning');
      return;
    }

    const studentObj = students.find((s) => s.id === selectedStudentForCase);
    if (!studentObj) return;

    // Editing existing case in modalCases
    if (editingCaseIdInModal) {
      setModalCases((prev) =>
        prev.map((c) => {
          if (c.caseId === editingCaseIdInModal) {
            return {
              ...c,
              studentId: studentObj.id,
              studentNumber: studentObj.studentNumber,
              studentName: studentObj.fullName,
              grade: studentObj.grade,
              section: studentObj.section,
              violationId: selectedViolationObj.id,
              violationTitle: selectedViolationObj.violationType,
              violationDegree: selectedViolationObj.violationDegree,
              incidentDescription: selectedViolationObj.incidentDescription,
              incidentDateTime: selectedViolationObj.incidentDateTime,
              repetitionCount: calculatedRepetitionCount,
              priorActionsTaken: studentPriorActions,
              linkedFormIds: studentLinkedFormsList,
              currentBehaviorScore: 100 - ((studentObj.totalViolations || 0) * 4),
              discussionNotes: caseDiscussionNotes || 'تم استعراض ملف الطالب وإفادات المعلمين وملاحظات المرشد الطلابي.',
              committeeRecommendation: caseRecommendation || 'تطبيق لائحة السلوك المعتمدة وإلحاق الطالب ببرنامج تأهيلي.',
              decision: caseDecision,
              decisionCustomText: caseDecision === 'other' ? caseDecisionCustomText : undefined,
              decisionJustification: caseJustification || 'الحفاظ على الانضباط المدرسي وإتاحة فرصة التعديل السلوكي الإيجابي.',
              behaviorModificationProgram: caseBehaviorProgram,
              notes: caseNotes,
            };
          }
          return c;
        })
      );
      setIsCaseModalOpen(false);
      setEditingCaseIdInModal(null);
      onShowToast(`تم تحديث بيانات حالة الطالب (${studentObj.fullName}) بنجاح`, 'success');
      return;
    }

    // Check if case already exists in modalCases
    const alreadyExists = modalCases.some(
      (c) => c.studentId === studentObj.id && c.violationId === selectedViolationObj.id
    );
    if (alreadyExists) {
      onShowToast('هذه المخالفة مضافة بالفعل ضمن حالات هذا الاجتماع', 'warning');
      return;
    }

    const caseId = `CASE-${Date.now().toString().slice(-6)}`;
    const newCase: CommitteeMeetingCase = {
      caseId,
      meetingId: editingMeeting?.id || 'pending',
      studentId: studentObj.id,
      studentNumber: studentObj.studentNumber,
      studentName: studentObj.fullName,
      grade: studentObj.grade,
      section: studentObj.section,
      violationId: selectedViolationObj.id,
      violationTitle: selectedViolationObj.violationType,
      violationDegree: selectedViolationObj.violationDegree,
      incidentDescription: selectedViolationObj.incidentDescription,
      incidentDateTime: selectedViolationObj.incidentDateTime,
      repetitionCount: calculatedRepetitionCount,
      priorActionsTaken: studentPriorActions,
      linkedFormIds: studentLinkedFormsList,
      currentBehaviorScore: 100 - ((studentObj.totalViolations || 0) * 4), // Representative calculated score without double-deduction
      discussionNotes: caseDiscussionNotes || 'تم استعراض ملف الطالب وإفادات المعلمين وملاحظات المرشد الطلابي.',
      committeeRecommendation: caseRecommendation || 'تطبيق لائحة السلوك المعتمدة وإلحاق الطالب ببرنامج تأهيلي.',
      decision: caseDecision,
      decisionCustomText: caseDecision === 'other' ? caseDecisionCustomText : undefined,
      decisionJustification: caseJustification || 'الحفاظ على الانضباط المدرسي وإتاحة فرصة التعديل السلوكي الإيجابي.',
      behaviorModificationProgram: caseBehaviorProgram,
      notes: caseNotes,
      approvalStatus: 'pending',
      resultingFormIds: [],
    };

    setModalCases([...modalCases, newCase]);
    setIsCaseModalOpen(false);
    onShowToast(`تمت إضافة حالة الطالب (${studentObj.fullName}) وربط المخالفة بنجاح دون خصم مكرر`, 'success');
  };

  const handleRemoveCaseFromMeeting = (caseId: string) => {
    setModalCases(modalCases.filter((c) => c.caseId !== caseId));
  };

  // --- Handlers for Independent Case Decisions & Approvals ---
  const handleApproveCaseDecision = async (meeting: BehaviorCommitteeMeeting, caseItem: CommitteeMeetingCase) => {
    const approverName = currentUser?.name || schoolSettings.principalName || 'عضو مكلف من إدارة المدرسة';
    const approverRole = (currentUser as any)?.role ? (currentUser as any).role : 'عضو مكلف من إدارة المدرسة';
    const approvedTimestamp = getUaeFullDateTimeString();

    const updatedCases = (meeting.cases || []).map((c) => {
      if (c.caseId === caseItem.caseId) {
        return {
          ...c,
          approvalStatus: 'approved' as const,
          approvedBy: approverName,
          approvedByRole: approverRole,
          approvedAt: approvedTimestamp,
        };
      }
      return c;
    });

    const updatedMeeting: BehaviorCommitteeMeeting = {
      ...meeting,
      cases: updatedCases,
      updatedAt: new Date().toISOString(),
    };

    // Save decision to BehaviorCommitteeDecision table for persistent history
    const decisionRecord: BehaviorCommitteeDecision = {
      id: `DEC-${caseItem.caseId}`,
      decisionNumber: `DEC-${meeting.sessionNumber || meeting.meetingNumber}-${caseItem.caseId.slice(-4)}`,
      meetingId: meeting.id,
      meetingNumber: meeting.sessionNumber || meeting.meetingNumber,
      studentId: caseItem.studentId,
      studentName: caseItem.studentName,
      studentNumber: caseItem.studentNumber,
      grade: caseItem.grade as string,
      section: caseItem.section as string,
      type: caseItem.decision,
      description: caseItem.decisionCustomText || `قرار صادر عن ${meeting.sessionNumber || meeting.meetingNumber}`,
      decisionDate: meeting.meetingDate,
      violationTitle: caseItem.violationTitle,
      violationDegree: caseItem.violationDegree,
      penalties: [caseItem.decisionCustomText || caseItem.decision],
      approved: true,
      committeeChairperson: meeting.chairpersonName || approverName,
      counselorName: meeting.rapporteurName,
      notes: caseItem.decisionJustification,
      executionStatus: 'in_progress',
      createdAt: new Date().toISOString(),
    };

    saveCommitteeDecision(decisionRecord);
    saveCommitteeMeeting(updatedMeeting);

    // Sync to Firestore
    try {
      const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';
      await saveCommitteeMeetingFirestore(schoolId, updatedMeeting, currentUser as any);
    } catch (err) {
      console.warn('Sync notice:', err);
    }

    setMeetings(getCommitteeMeetings());
    setDecisions(getCommitteeDecisions());
    onShowToast(`تم اعتماد قرار الحالة رسمياً وتوثيقه بواسطة (${approverName})`, 'success');
  };

  // --- Handlers for Generating Model 12 (قرار إيقاف مؤقت من الدراسة) from Committee Case ---
  const handleCreateFormFromMeetingDecision = (meeting: BehaviorCommitteeMeeting) => {
    if (!meeting.cases || meeting.cases.length === 0) {
      onShowToast('لا توجد حالات طلابية معروضة في جدول هذه الجلسة بعد. يرجى إضافة حالة للمناقشة أولاً لإصدار قرار اللجنة.', 'warning');
      return;
    }
    if (meeting.cases.length === 1) {
      handleGenerateModel12FromCase(meeting, meeting.cases[0]);
      return;
    }
    // Multiple cases: open modal to select which case
    setIsSelectCaseForModel12ModalOpen(true);
  };

  const handleGenerateModel12FromCase = (meeting: BehaviorCommitteeMeeting, caseItem: CommitteeMeetingCase) => {
    const student = students.find((s) => s.id === caseItem.studentId);
    const formId = `TSF-${currentUser?.schoolId || '7001'}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    // Prepare default dates: 3 school days suspension
    const startDate = getUaeTodayDateString();
    const startDay = getDayNameFromDateString(startDate);

    // Auto-fill strictly what is available from meeting & decision
    const newModel12: TemporarySuspensionFormRecord = {
      id: formId,
      formType: 'temporary_suspension_form',
      formNumber: 12,
      schoolId: currentUser?.schoolId || schoolSettings.schoolId || '7001',
      emirate: schoolSettings.emirate || 'الفجيرة',
      operationsManagement: 'إدارة العمليات المدرسية',
      council: schoolSettings.schoolCycle || 'المجلس الثاني',
      sector: 'النطاق الرابع',
      schoolName: schoolSettings.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
      studentId: caseItem.studentId,
      studentNumber: caseItem.studentNumber,
      studentName: caseItem.studentName,
      grade: (caseItem.grade as any) || 'عاشر',
      section: caseItem.section || '1',
      parentName: student?.parentName || 'ولي أمر الطالب',
      parentPhone: student?.parentPhone || '',
      violationId: caseItem.violationId,
      meetingId: meeting.id,
      caseId: caseItem.caseId,
      meetingNumber: meeting.sessionNumber || meeting.meetingNumber,
      meetingDay: getDayNameFromDateString(meeting.meetingDate),
      meetingDate: meeting.meetingDate,
      priorAction1: caseItem.priorActionsTaken?.[0] || 'تنبيه خطي للطالب واستدعاء ولي الأمر وأخذ التعهدات السلوكية اللازمة.',
      priorAction2: caseItem.priorActionsTaken?.[1] || 'جلسات إرشاد وتوجيه ومتابعة مع المرشد الأكاديمي وإخطار ولي الأمر بالحسم.',
      suspensionStartDay: startDay,
      suspensionStartDate: startDate,
      suspensionEndDay: startDay,
      suspensionEndDate: startDate,
      suspensionDaysCount: 3,
      behaviorModificationProgram:
        caseItem.behaviorModificationProgram ||
        'التكليف بواجبات وتطبيقات دراسية يومية داخل المدرسة تحت إشراف المرشد الأكاديمي، مع جلسات إرشاد وتعديل سلوك فردية.',
      reason1: caseItem.violationTitle || 'ارتكاب مخالفة سلوكية موجبة للإيقاف المؤقت وفق اللائحة.',
      reason2: caseItem.decisionJustification || 'تكرار السلوك وعدم التجاوب مع البرامج الوقائية والتنموية.',
      reason3: 'تحقيق المصلحة التربوية وضمان الانضباط العام داخل البيئة المدرسية وفق لائحة السلوك.',
      principalName: schoolSettings.principalName || meeting.chairpersonName || 'أحمد خليفة الكعبي',
      issueDate: getUaeTodayDateString(),
      status: 'مسودة', // Note: Not automatically approved; requires official review and signature
      createdBy: currentUser?.name || 'مقرر لجنة السلوك',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEditingModel12(newModel12);
    setIsModel12ModalOpen(true);
    setIsSelectCaseForModel12ModalOpen(false);
    onShowToast(`تم استيراد بيانات الجلسة (${meeting.sessionNumber || meeting.meetingNumber}) والحالة بنجاح لنموذج (12)`, 'info');
  };

  const handleSaveModel12 = async (form: TemporarySuspensionFormRecord) => {
    const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';

    // 1. Save to LocalStorage
    saveTemporarySuspensionFormLocal(form);

    // 2. Save to Firestore
    try {
      await saveTemporarySuspensionForm(schoolId, form, currentUser as any);
    } catch (err) {
      console.warn('Failed to sync Model 12 to Firestore immediately, saved locally:', err);
    }

    // 3. Link Model 12 ID to the meeting case if meetingId is provided
    if (form.meetingId) {
      const targetMeeting = meetings.find((m) => m.id === form.meetingId);
      if (targetMeeting && targetMeeting.cases) {
        const updatedCases = targetMeeting.cases.map((c) => {
          if (c.caseId === form.caseId || (c.studentId === form.studentId && c.violationId === form.violationId)) {
            const existingForms = c.resultingFormIds || [];
            if (!existingForms.includes(form.id)) {
              return { ...c, resultingFormIds: [...existingForms, form.id] };
            }
          }
          return c;
        });
        const updatedMeeting = { ...targetMeeting, cases: updatedCases };
        saveCommitteeMeeting(updatedMeeting);
        try {
          await saveCommitteeMeetingFirestore(schoolId, updatedMeeting, currentUser as any);
        } catch {}
      }
    }

    // 4. Register/Update in Central Official Documents System (OfficialDocumentRecord)
    const signaturesList: DocumentSignature[] = [];
    if (form.principalSignature) {
      signaturesList.push({
        role: 'principal',
        roleTitleAr: 'مدير المدرسة / المكلف',
        signerName: form.principalName || 'مدير المدرسة',
        signedAt: getUaeFullDateTimeString(),
        signatureType: form.principalSignature.startsWith('data:') ? 'drawn' : 'digital_approval',
        signatureDataUrl: form.principalSignature,
        isVerified: true,
      });
    }
    if (form.parentSignature) {
      signaturesList.push({
        role: 'parent',
        roleTitleAr: 'ولي أمر الطالب',
        signerName: form.parentName || 'ولي الأمر',
        signedAt: getUaeFullDateTimeString(),
        signatureType: form.parentSignature.startsWith('data:') ? 'drawn' : 'digital_approval',
        signatureDataUrl: form.parentSignature,
        isVerified: true,
      });
    }
    if (form.studentSignature) {
      signaturesList.push({
        role: 'student',
        roleTitleAr: 'الطالب بالعلم',
        signerName: form.studentName,
        signedAt: getUaeFullDateTimeString(),
        signatureType: form.studentSignature.startsWith('data:') ? 'drawn' : 'digital_approval',
        signatureDataUrl: form.studentSignature,
        isVerified: true,
      });
    }

    const officialDocRecord: OfficialDocumentRecord = {
      id: form.id,
      documentId: form.id,
      modelNumber: 12,
      modelName: 'قرار إيقاف مؤقت من الدراسة',
      modelCategory: 'committee',
      schoolId,
      studentId: form.studentId,
      studentNumber: form.studentNumber,
      studentName: form.studentName,
      grade: String(form.grade),
      section: String(form.section),
      violationId: form.violationId,
      violationTitle: form.reason1,
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      schoolName: form.schoolName || schoolSettings.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
      emirate: form.emirate || schoolSettings.emirate || 'الفجيرة',
      meetingId: form.meetingId,
      meetingNumber: form.meetingNumber,
      meetingDate: form.meetingDate,
      meetingDay: form.meetingDay,
      caseId: form.caseId,
      decisionNumber: `DEC-${form.meetingNumber}-${form.caseId ? form.caseId.slice(-4) : '001'}`,
      committeeDecision: form.status === 'معتمد ومسلّم' ? 'قرار إيقاف مؤقت معتمد ومسلّم' : 'مسودة قرار إيقاف مؤقت',
      suspensionDaysCount: form.suspensionDaysCount,
      suspensionStartDate: form.suspensionStartDate,
      suspensionEndDate: form.suspensionEndDate,
      behaviorModificationProgram: form.behaviorModificationProgram,
      previousActions: [form.priorAction1, form.priorAction2].filter(Boolean) as string[],
      specificData: {
        ...form,
      },
      status: form.status === 'معتمد ومسلّم' ? 'approved' : signaturesList.length > 0 ? 'signed' : 'draft',
      signatures: signaturesList,
      auditLog: [
        {
          action: form.status === 'معتمد ومسلّم' ? 'approve' : 'update',
          performedBy: currentUser?.name || 'مقرر لجنة السلوك',
          role: 'لجنة إدارة السلوك',
          timestamp: getUaeFullDateTimeString(),
          details: `حفظ وتوثيق نموذج (12) بناءً على جلسة لجنة السلوك رقم ${form.meetingNumber} - حالة: ${form.status}`,
        },
      ],
      issueDate: form.issueDate || getUaeTodayDateString(),
      approvalDate: form.status === 'معتمد ومسلّم' ? getUaeTodayDateString() : undefined,
      approvedBy: form.status === 'معتمد ومسلّم' ? form.principalName : undefined,
      isLocked: form.status === 'معتمد ومسلّم',
      createdAt: form.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveOfficialDocumentLocal(officialDocRecord);
    try {
      await saveOfficialDocumentFirestore(schoolId, officialDocRecord, currentUser as any);
    } catch (e) {
      console.warn('Sync official doc to firestore:', e);
    }

    setTemporaryForms(getTemporarySuspensionForms());
    setMeetings(getCommitteeMeetings());
    setIsModel12ModalOpen(false);
    onShowToast(`تم حفظ وتوثيق نموذج رقم (12) للطالب (${form.studentName}) ومزامنته مع وحدة النماذج الرسمية بنجاح`, 'success');
  };

  const handleDeleteModel12 = async (form: TemporarySuspensionFormRecord) => {
    if (form.status === 'معتمد ومسلّم') {
      onShowToast('لا يمكن حذف قرار إيقاف مؤقت معتمد ومسلّم رسمياً', 'error');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف مسودة قرار الإيقاف للطالب "${form.studentName}"؟`)) {
      return;
    }

    const schoolId = currentUser?.schoolId || schoolSettings.schoolId || '7001';
    deleteTemporarySuspensionFormLocal(form.id);
    try {
      await deleteTemporarySuspensionForm(schoolId, form.id, currentUser as any, form.studentName);
    } catch (err) {
      console.warn('Remote delete notice:', err);
    }

    setTemporaryForms(getTemporarySuspensionForms());
    onShowToast('تم حذف مسودة نموذج (12) بنجاح', 'info');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Executive Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0C2340] via-[#103258] to-[#006D77] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-200 font-semibold tracking-wide">
              <span>وحدة المخالفات والسلوك المدرسي</span>
              <span>•</span>
              <span className="bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                القرار الوزاري رقم (851)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-[#D4AF37]" />
              <span>لجنة إدارة السلوك المدرسي</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
              إدارة الجلسات الرسمية للجنة، دراسة الحالات والمخالفات القائمة، اعتماد القرارات المستقلة لكل حالة، وإصدار النماذج الوزارية الرسمية (نموذج 12 - قرار إيقاف مؤقت من الدراسة).
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={refreshAllData}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="مزامنة وتحديث البيانات مع السحابة"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة السحابة'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNotificationTargetMeeting(selectedMeeting);
                setIsNotificationModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
              title="إرسال تنبيهات SMS وبريد لأعضاء اللجنة"
            >
              <Bell className="w-4 h-4 text-[#D4AF37]" />
              <span>مركز التنبيهات</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateMeeting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#006D77] to-teal-600 hover:from-teal-600 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer border border-teal-300/30 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ اجتماع جديد</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/15">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-200 block font-medium">جلسات واجتماعات اللجنة</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">{totalMeetingsCount}</span>
              <span className="text-[10px] text-emerald-300">({approvedMeetingsCount} معتمد)</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-200 block font-medium">الحالات المعروضة للدراسة</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">{allCasesCount}</span>
              <span className="text-[10px] text-slate-300">حالة طلابية</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-200 block font-medium">القرارات الصادرة المعتمدة</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                {decisions.filter((d) => d.approved).length || approvedMeetingsCount}
              </span>
              <span className="text-[10px] text-emerald-300">قرار نافذ</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-200 block font-medium">نماذج اللجنة (نموذج 12)</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-black text-[#D4AF37] font-mono">{totalModel12FormsCount}</span>
              <span className="text-[10px] text-emerald-300">({approvedFormsCount} موثق)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Navigation Switcher (الاجتماعات vs نماذج اللجنة) */}
      <div className="bg-white dark:bg-[#0C2340] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveMainTab('meetings')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'meetings'
                ? 'bg-[#0C2340] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-[#D4AF37]" />
            <span>1. اجتماعات ومداولات اللجنة</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeMainTab === 'meetings' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {meetings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('forms')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'forms'
                ? 'bg-[#006D77] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSignature className="w-4 h-4 text-[#D4AF37]" />
            <span>2. نماذج اللجنة (نموذج 12 - قرار إيقاف مؤقت)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeMainTab === 'forms' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {temporaryForms.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('formation')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeMainTab === 'formation'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <span>3. التشكيل الرسمي لأعضاء اللجنة</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                activeMainTab === 'formation' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {committeeFormation.members.length}
            </span>
          </button>
        </div>

        {/* Active Tab Helper indicator */}
        <div className="text-[11px] text-slate-500 px-3 hidden md:block">
          {activeMainTab === 'meetings'
            ? 'عرض تفاصيل الجلسات، الحالات المعروضة، واعتماد القرارات المستقلة'
            : activeMainTab === 'forms'
            ? 'النماذج الرسمية الصادرة والمطبوعة بصيغة A4 المتوافقة مع اللائحة'
            : 'إدارة وتعديل التشكيل المعتمد لأعضاء لجنة إدارة السلوك وربطهم بالكادر المدرسي'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TAB A: MEETINGS & SESSIONS (الاجتماعات والجلسات) */}
      {/* ========================================================================= */}
      {activeMainTab === 'meetings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 cols on lg): Meetings List */}
          <div className="lg:col-span-4 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#006D77]" />
                  <span>قائمة اجتماعات اللجنة</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">{filteredMeetings.length} جلسة</span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={meetingsSearchQuery}
                  onChange={(e) => setMeetingsSearchQuery(e.target.value)}
                  placeholder="بحث برقم الجلسة، المكان، أو طالب..."
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#006D77]"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1">
                {(['all', 'convened', 'approved', 'draft'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMeetingsStatusFilter(st)}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer text-center ${
                      meetingsStatusFilter === st
                        ? 'bg-[#006D77] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'الكل' : st === 'convened' ? 'منعقد' : st === 'approved' ? 'معتمد' : 'مسودة'}
                  </button>
                ))}
              </div>
            </div>

            {/* Meetings Cards */}
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredMeetings.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#0C2340] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">لا توجد اجتماعات تطابق البحث</p>
                  <button
                    type="button"
                    onClick={handleOpenCreateMeeting}
                    className="mt-3 text-xs text-[#006D77] font-bold hover:underline"
                  >
                    + إنشاء اجتماع جديد
                  </button>
                </div>
              ) : (
                filteredMeetings.map((m) => {
                  const isSelected = selectedMeeting?.id === m.id;
                  const casesCount = m.cases?.length || m.agenda?.length || 0;
                  const isApproved = m.status === 'approved' || m.status === 'completed';
                  const isDraft = m.status === 'draft' || m.status === 'scheduled';

                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMeetingId(m.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-teal-50/60 dark:bg-teal-950/30 border-[#006D77] shadow-md ring-2 ring-[#006D77]/20'
                          : 'bg-white dark:bg-[#0C2340] border-slate-200 dark:border-slate-800 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {m.sessionNumber || m.meetingNumber}
                            </span>
                            {m.type === 'urgent' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                طارئ
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {m.meetingDate} • {m.meetingTime}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isDraft
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-teal-50 text-teal-800 border-teal-300'
                          }`}
                        >
                          {isApproved ? 'معتمد' : isDraft ? 'مسودة' : 'منعقد'}
                        </span>
                      </div>

                      {/* Committee metadata snippet */}
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>الرئيس: {m.chairpersonName || 'مدير المدرسة'}</span>
                          <span className="font-bold text-[#006D77]">
                            {casesCount} {casesCount === 1 ? 'حالة' : 'حالات'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span className="truncate max-w-[180px]">{m.location}</span>
                          <span>حضور: {(m.attendees || []).filter((a) => a.attended ?? a.present).length} أعضاء</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (8 cols on lg): Selected Meeting Details & Cases */}
          <div className="lg:col-span-8 space-y-4">
            {selectedMeeting ? (
              <div className="space-y-4">
                {/* Meeting Overview Card */}
                <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedMeeting.sessionNumber || selectedMeeting.meetingNumber}
                        </h2>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            selectedMeeting.status === 'approved' || selectedMeeting.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : selectedMeeting.status === 'draft' || selectedMeeting.status === 'scheduled'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-teal-50 text-teal-800 border-teal-300'
                          }`}
                        >
                          {selectedMeeting.status === 'approved' || selectedMeeting.status === 'completed'
                            ? 'معتمد وموثق'
                            : selectedMeeting.status === 'draft' || selectedMeeting.status === 'scheduled'
                            ? 'مسودة'
                            : 'منعقد'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        المكان: {selectedMeeting.location} • التاريخ: {selectedMeeting.meetingDate} ({selectedMeeting.meetingTime})
                      </p>
                    </div>

                    {/* Action buttons on active meeting */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCreateFormFromMeetingDecision(selectedMeeting)}
                        className="px-3.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md active:scale-95"
                        title="إنشاء نموذج رسمي رقم (12) - قرار إيقاف مؤقت من واقع قرار وتوصيات هذه الجلسة"
                      >
                        <FileSignature className="w-3.5 h-3.5 text-white" />
                        <span>إنشاء نموذج من قرار اللجنة</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeetingForPrint(selectedMeeting);
                          setIsPrintMeetingModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>طباعة المحضر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditMeeting(selectedMeeting)}
                        className="px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-[#006D77] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل الجلسة</span>
                      </button>

                      {selectedMeeting.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMeeting(selectedMeeting)}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs transition-all cursor-pointer"
                          title="حذف مسودة الاجتماع"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Attendance & Committee Members Grid */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-500 block mb-2">أعضاء اللجنة الحاضرون:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {(selectedMeeting.attendees || []).map((att, idx) => {
                        const attended = att.attended ?? att.present ?? true;
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                              attended
                                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 text-slate-400 line-through'
                            }`}
                          >
                            <div className="truncate pr-1">
                              <span className="font-bold block truncate">{att.name}</span>
                              <span className="text-[10px] text-slate-500 block truncate">{att.role}</span>
                            </div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                                attended ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {attended ? 'حاضر' : 'غائب'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Cases Section Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      الحالات المعروضة على اللجنة في هذه الجلسة ({selectedMeeting.cases?.length || 0})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditMeeting(selectedMeeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#006D77] border border-teal-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة / إدارة حالات الجلسة</span>
                  </button>
                </div>

                {/* Cases Cards List */}
                {(!selectedMeeting.cases || selectedMeeting.cases.length === 0) ? (
                  <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                        لم يتم ربط أي حالات طلابية بهذه الجلسة بعد
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                        يمكنك إضافة حالة طالب وربطها بمخالفة قائمة ومسجلة في سجله لدراستها واعتماد قرار اللجنة وإصدار نموذج (12).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEditMeeting(selectedMeeting)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006D77] text-white text-xs font-bold hover:bg-teal-700 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ إضافة حالة من سجلات المخالفات</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedMeeting.cases.map((c, idx) => {
                      const isCaseApproved = c.approvalStatus === 'approved';
                      const decisionText =
                        c.decisionCustomText ||
                        (c.decision === 'temporary_suspension'
                          ? 'قرار إيقاف مؤقت من الدراسة'
                          : c.decision === 'behavior_plan'
                          ? 'إلزام بخطة تعديل سلوك'
                          : c.decision === 'final_warning'
                          ? 'إنذار كتابي نهائي'
                          : c.decision === 'community_service'
                          ? 'تكليف بمهام مدرسية بديلة'
                          : c.decision === 'referral_specialized'
                          ? 'إحالة إلى جهة مختصة'
                          : 'إجراء مخصص');

                      return (
                        <div
                          key={c.caseId || idx}
                          className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-[#006D77]/40 transition-all space-y-4"
                        >
                          {/* Case Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700">
                                  #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onOpenStudentProfile(c.studentId)}
                                  className="text-sm font-black text-slate-900 dark:text-white hover:text-[#006D77] transition-colors cursor-pointer"
                                >
                                  {c.studentName}
                                </button>
                                <span className="text-xs text-slate-500">
                                  الصف {c.grade} ({c.section}) • رقم الطالب: {c.studentNumber}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>المخالفة المعروضة: {c.violationTitle}</span>
                                <span className="text-[10px] font-normal text-slate-500">
                                  ({c.violationDegree} • تكرار: {c.repetitionCount})
                                </span>
                              </p>
                            </div>

                            {/* Status and Action Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                                  isCaseApproved
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {isCaseApproved ? '✓ قرار معتمد' : '⏳ قيد المراجعة'}
                              </span>

                              {/* Button: Issue Model 12 Form from Committee Decision */}
                              <button
                                type="button"
                                onClick={() => handleGenerateModel12FromCase(selectedMeeting, c)}
                                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                                title="إنشاء نموذج رسمي رقم (12) - قرار إيقاف مؤقت من واقع قرار وتوصية اللجنة لهذه الحالة"
                              >
                                <FileSignature className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>إنشاء نموذج من قرار اللجنة</span>
                              </button>

                              {/* Button: Approve Case Decision Independently */}
                              {!isCaseApproved && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveCaseDecision(selectedMeeting, c)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="اعتماد قرار اللجنة من قبل المستخدم المخول"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>اعتماد القرار</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Case Facts Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                وصف الواقعة الفعلي وتاريخها:
                              </span>
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {c.incidentDescription || 'لا يوجد وصف مدون للواقعة.'}
                              </p>
                              <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                                تاريخ الواقعة: {c.incidentDateTime}
                              </span>
                            </div>

                            <div>
                              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                الإجراءات السابقة المتخذة والنماذج:
                              </span>
                              <ul className="text-slate-600 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                                {c.priorActionsTaken?.map((act, i) => (
                                  <li key={i}>{act}</li>
                                ))}
                              </ul>
                              {c.linkedFormIds && c.linkedFormIds.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {c.linkedFormIds.map((fId, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded"
                                    >
                                      {fId}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Deliberations & Decisions Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                <Vote className="w-3.5 h-3.5 text-[#006D77]" />
                                <span>قرار اللجنة المعتمد:</span>
                              </span>
                              <p className="font-bold text-[#006D77]">{decisionText}</p>
                              <p className="text-[11px] text-slate-500">{c.decisionJustification}</p>
                            </div>

                            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>برنامج تعديل السلوك والمتابعة:</span>
                              </span>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                {c.behaviorModificationProgram || 'متابعة دورية مع المرشد الأكاديمي.'}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                <span>النماذج الناتجة والتوثيق:</span>
                              </span>
                              {c.resultingFormIds && c.resultingFormIds.length > 0 ? (
                                <div className="space-y-1">
                                  {c.resultingFormIds.map((resFormId, i) => {
                                    const matchedForm = temporaryForms.find((tf) => tf.id === resFormId);
                                    return (
                                      <div
                                        key={i}
                                        className="flex items-center justify-between p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-[11px]"
                                      >
                                        <span className="font-bold text-teal-800">نموذج (12): {resFormId}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (matchedForm) {
                                              setSelectedModel12ForPrint(matchedForm);
                                              setIsPrintModel12ModalOpen(true);
                                            }
                                          }}
                                          className="text-[#006D77] hover:underline flex items-center gap-0.5"
                                        >
                                          <Printer className="w-3 h-3" />
                                          <span>طباعة</span>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-400">لا توجد نماذج رسمية صادرة بعد لهذه الحالة.</p>
                              )}
                              {c.approvedBy && (
                                <span className="text-[10px] text-emerald-700 block mt-1 font-semibold">
                                  معتمد بواسطة: {c.approvedBy} ({c.approvedAt})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">اختر اجتماعاً من القائمة لعرض تفاصيله</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MAIN TAB B: COMMITTEE FORMS (نماذج اللجنة - نموذج 12) */}
      {/* ========================================================================= */}
      {activeMainTab === 'forms' && (
        <div className="space-y-4">
          {/* Forms Control & Filter Bar */}
          <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={formsSearchQuery}
                  onChange={(e) => setFormsSearchQuery(e.target.value)}
                  placeholder="بحث باسم الطالب، رقم الطالب، رقم الجلسة..."
                  className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-hidden focus:border-[#006D77]"
                />
              </div>

              {/* Grade Filter */}
              <select
                value={formsGradeFilter}
                onChange={(e) => setFormsGradeFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="all">جميع الصفوف</option>
                <option value="تاسع">الصف التاسع</option>
                <option value="عاشر">الصف العاشر</option>
                <option value="حادي عشر">الصف الحادي عشر</option>
                <option value="ثاني عشر">الصف الثاني عشر</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                إجمالي النماذج: {filteredModel12Forms.length}
              </span>
            </div>
          </div>

          {/* Model 12 Cards Grid */}
          {filteredModel12Forms.length === 0 ? (
            <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
              <FileSignature className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  لا توجد نماذج رقم (12) صادرة حالياً
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  يمكنك إصدار نموذج رقم (12) - قرار إيقاف مؤقت من الدراسة مباشرة من خلال جلسة لجنة إدارة السلوك والحالة المعروضة، وسيتم تعبئة كافة الحقول المتوفرة تلقائياً.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModel12Forms.map((form) => {
                const isApproved = form.status === 'معتمد ومسلّم';
                const hasPrincipalSig = Boolean(form.principalSignature || isApproved);
                const hasParentSig = Boolean(form.parentSignature || isApproved);
                const hasStudentSig = Boolean(form.studentSignature || isApproved);

                return (
                  <div
                    key={form.id}
                    className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs hover:border-[#006D77]/40 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 block font-mono">
                            {form.id}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            نموذج رقم (12) - قرار إيقاف مؤقت
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isApproved ? 'معتمد ومسلّم' : 'مسودة'}
                        </span>
                      </div>

                      {/* Student & Meeting Info */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-white hover:text-[#006D77] cursor-pointer" onClick={() => onOpenStudentProfile(form.studentId)}>
                            {form.studentName}
                          </span>
                          <span className="text-slate-500">
                            الصف {form.grade} / {form.section}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          جلسة اللجنة:{' '}
                          <span className="font-bold text-slate-900 dark:text-white font-mono">
                            {form.meetingNumber || 'غير محدد'}
                          </span>{' '}
                          بتاريخ {form.meetingDate}
                        </p>
                        <p className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg border border-rose-200">
                          مدة الإيقاف: {form.suspensionDaysCount || 1} أيام ({form.suspensionStartDate} إلى {form.suspensionEndDate})
                        </p>
                        <p className="text-[11px] text-slate-600 line-clamp-2">
                          الأسباب: {form.reason1}
                        </p>
                      </div>

                      {/* Signatures status snippet */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                        <span className={hasPrincipalSig ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          {hasPrincipalSig ? '✓ توقيع المدير' : '○ بانتظار المدير'}
                        </span>
                        <span className={hasParentSig ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          {hasParentSig ? '✓ توقيع ولي الأمر' : '○ بانتظار ولي الأمر'}
                        </span>
                        <span className={hasStudentSig ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          {hasStudentSig ? '✓ توقيع الطالب' : '○ بانتظار الطالب'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModel12ForPrint(form);
                            setIsPrintModel12ModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#006D77] border border-teal-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>معاينة وطباعة A4</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingModel12(form);
                            setIsModel12ModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل الحقول</span>
                        </button>
                      </div>

                      {!isApproved && (
                        <button
                          type="button"
                          onClick={() => handleDeleteModel12(form)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف المسودة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* 5. MODAL: CREATE / EDIT MEETING (إنشاء أو تعديل جلسة لجنة إدارة السلوك) */}
      {/* ========================================================================= */}
      {isMeetingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#006D77]/10 rounded-xl text-[#006D77]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingMeeting ? 'تعديل بيانات جلسة لجنة إدارة السلوك' : 'إنشاء جلسة جديدة للجنة إدارة السلوك'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    تحديد بيانات الجلسة، الأعضاء الحاضرين، وإدراج حالات الطلاب المربوطة بمخالفات قائمة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Meeting Basic Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم الجلسة / الاجتماع: *
                  </label>
                  <input
                    type="text"
                    value={modalSessionNumber}
                    onChange={(e) => setModalSessionNumber(e.target.value)}
                    placeholder="مثال: جلسة رقم (1) / 2026"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    إدخال يدوي رسمي واضح مطابق للمحضر المعتمد
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    تاريخ الانعقاد: *
                  </label>
                  <input
                    type="date"
                    value={modalMeetingDate}
                    onChange={(e) => setModalMeetingDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    وقت الانعقاد: *
                  </label>
                  <input
                    type="text"
                    value={modalMeetingTime}
                    onChange={(e) => setModalMeetingTime(e.target.value)}
                    placeholder="مثال: 10:00 ص"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    مكان الانعقاد: *
                  </label>
                  <input
                    type="text"
                    value={modalLocation}
                    onChange={(e) => setModalLocation(e.target.value)}
                    placeholder="قاعة الاجتماعات الرئيسية"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رئيس اللجنة: *
                  </label>
                  <input
                    type="text"
                    value={modalChairperson}
                    onChange={(e) => setModalChairperson(e.target.value)}
                    placeholder="أحمد خليفة الكعبي (مدير المدرسة)"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    مقرر اللجنة: *
                  </label>
                  <input
                    type="text"
                    value={modalRapporteur}
                    onChange={(e) => setModalRapporteur(e.target.value)}
                    placeholder="المرشد الأكاديمي والمهني"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    نوع الاجتماع:
                  </label>
                  <select
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                  >
                    <option value="regular">دوري مجدول</option>
                    <option value="urgent">طارئ عاجل</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    حالة الجلسة:
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                  >
                    <option value="convened">منعقد</option>
                    <option value="approved">معتمد</option>
                    <option value="draft">مسودة</option>
                  </select>
                </div>
              </div>

              {/* Committee Attendees Selection */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white block text-xs sm:text-sm">
                      الأعضاء الحاضرون في الجلسة ({modalAttendees.filter((a) => a.attended).length} من {modalAttendees.length}):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      مستورد من التشكيل الرسمي للجنة • يمكنك تحديد الحضور أو تعديل الأسماء
                    </span>
                  </div>

                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMeetingModalOpen(false);
                        onNavigateToTab('employees');
                      }}
                      className="text-[11px] font-bold text-[#006D77] hover:underline flex items-center gap-1 cursor-pointer"
                      title="الانتقال إلى صفحة إدارة وتشكيل لجنة السلوك"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>إدارة التشكيل المعتمد</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {modalAttendees.map((att, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                        att.attended
                          ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-2xs'
                          : 'bg-slate-100/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={att.attended}
                        onChange={(e) => {
                          const updated = [...modalAttendees];
                          updated[idx].attended = e.target.checked;
                          setModalAttendees(updated);
                        }}
                        className="rounded text-[#006D77] focus:ring-[#006D77]"
                      />
                      <div className="truncate flex-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-xs">{att.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate">{att.role}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cases in Meeting Agenda (الحالات المعروضة) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>الحالات المعروضة على اللجنة ({modalCases.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      يتم اختيار مخالفة قائمة مسجلة في سجل الطالب، ولا يتم إنشاء أي مخالفة جديدة
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddCase}
                    className="px-3.5 py-2 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة حالة طالب للجلسة</span>
                  </button>
                </div>

                {modalCases.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/30">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-[#006D77]/10 text-[#006D77] flex items-center justify-center font-bold">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">لم تضف أي حالات بعد لجدول أعمال هذه الجلسة.</p>
                    <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
                      اختر طالباً ومخالفة قائمة مسجلة لديه لعرضها ومناقشتها وإصدار توصية وقرار اللجنة دون تكرار الخصم.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenAddCase}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006D77] text-white font-bold text-xs hover:bg-teal-700 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة حالة طالب ومخالفة قائمة الآن</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modalCases.map((c) => {
                      const isExpanded = !!expandedModalCaseIds[c.caseId];
                      return (
                        <div
                          key={c.caseId}
                          className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 shadow-2xs overflow-hidden transition-all hover:border-[#006D77]/50"
                        >
                          {/* Card Top: Student & Violation Key Data */}
                          <div className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 text-[#006D77] flex items-center justify-center font-black shrink-0">
                                <Users className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-black text-slate-900 dark:text-white text-sm">
                                    {c.studentName}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-bold">
                                    (رقم: {c.studentNumber} • الصف {c.grade}/{c.section})
                                  </span>
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                                    درجة السلوك: {c.currentBehaviorScore !== undefined ? `${c.currentBehaviorScore}/100` : '100/100'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-bold text-rose-700 dark:text-rose-400">
                                    المخالفة: {c.violationTitle}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black">
                                    {c.violationDegree}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black">
                                    تكرار رقم ({c.repetitionCount})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card Header Actions */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                              <button
                                type="button"
                                onClick={() => toggleModalCaseExpanded(c.caseId)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <span>{isExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditCaseInMeeting(c)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 cursor-pointer transition-colors"
                                title="تعديل مناقشة وقرار الحالة"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveCaseFromMeeting(c.caseId)}
                                className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                                title="حذف الحالة من الجلسة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Card Body summary */}
                          <div className="p-3.5 sm:p-4 text-xs space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-500">القرار المقترح:</span>
                                <span className="font-black text-[#006D77] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                                  {c.decision === 'temporary_suspension' && 'قرار إيقاف مؤقت من الدراسة (نموذج 12)'}
                                  {c.decision === 'behavior_plan' && 'إلزام بخطة تعديل سلوك مكثفة'}
                                  {c.decision === 'final_warning' && 'إصدار إنذار كتابي نهائي'}
                                  {c.decision === 'community_service' && 'تكليف بمهام مدرسية بديلة'}
                                  {c.decision === 'referral_specialized' && 'إحالة إلى جهة مختصة'}
                                  {c.decision === 'other' && (c.decisionCustomText || 'قرار مخصص آخر')}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                <span>تاريخ الواقعة: {c.incidentDateTime}</span>
                              </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 line-clamp-2">
                              <strong className="text-slate-800 dark:text-slate-200">وصف الواقعة الفعلي: </strong>
                              {c.incidentDescription}
                            </p>

                            {/* Safe reference linkage notification */}
                            <div className="flex items-center gap-2 text-[11px] text-[#006D77] dark:text-teal-400 font-bold bg-[#006D77]/5 dark:bg-[#006D77]/10 p-2 rounded-xl">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>ربط مرجعي مؤمن (violationId: {c.violationId}) • لا يتم تعديل سجل المخالفة الأصلي ولا تكرار خصم درجات السلوك</span>
                            </div>

                            {/* Expanded full details */}
                            {isExpanded && (
                              <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2.5 bg-slate-50/60 dark:bg-slate-900/40 p-3 rounded-xl animate-in fade-in duration-150">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">مناقشة الحالة:</span>
                                    <p className="text-slate-600 dark:text-slate-400">{c.discussionNotes}</p>
                                  </div>
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">توصية اللجنة:</span>
                                    <p className="text-slate-600 dark:text-slate-400">{c.committeeRecommendation}</p>
                                  </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">مبررات القرار:</span>
                                  <p className="text-slate-600 dark:text-slate-400">{c.decisionJustification}</p>
                                </div>

                                {c.behaviorModificationProgram && (
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">برنامج تعديل السلوك / المتابعة:</span>
                                    <p className="text-slate-600 dark:text-slate-400">{c.behaviorModificationProgram}</p>
                                  </div>
                                )}

                                {c.priorActionsTaken && c.priorActionsTaken.length > 0 && (
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">الإجراءات السابقة المتخذة:</span>
                                    <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
                                      {c.priorActionsTaken.map((act, i) => (
                                        <li key={i}>{act}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {c.linkedFormIds && c.linkedFormIds.length > 0 && (
                                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">النماذج والوثائق السابقة المرتبطة:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {c.linkedFormIds.map((frm, i) => (
                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                                          {frm}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveMeeting}
                className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الجلسة واعتمادها</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SUB-MODAL: ADD CASE TO MEETING (اختيار طالب ومخالفة قائمة ومداولة) */}
      {/* ========================================================================= */}
      {isCaseModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                    {editingCaseIdInModal
                      ? 'تعديل مناقشة وقرار حالة الطالب في جدول الجلسة'
                      : 'إضافة حالة طالب ومخالفة قائمة إلى جدول أعمال اللجنة'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ربط مرجعي لمخالفة مسجلة مسبقاً (violationId) دون إنشاء مخالفة جديدة ودون تكرار خصم درجات السلوك
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCaseModalOpen(false);
                  setEditingCaseIdInModal(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Step 1: Select Student */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 dark:text-white flex items-center justify-between">
                  <span>1. اختيار الطالب من قاعدة البيانات: *</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    (إجمالي المسجلين: {students.length} طالباً)
                  </span>
                </label>

                {/* Student search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={caseStudentSearchQuery}
                    onChange={(e) => setCaseStudentSearchQuery(e.target.value)}
                    placeholder="بحث سريع باسم الطالب، الرقم الأكاديمي، أو الصف..."
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-[#006D77] focus:outline-hidden"
                  />
                  {caseStudentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCaseStudentSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Student dropdown */}
                <select
                  value={selectedStudentForCase}
                  onChange={(e) => {
                    setSelectedStudentForCase(e.target.value);
                    setSelectedViolationForCase('');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-bold"
                >
                  <option value="">-- اختر طالباً من القائمة --</option>
                  {filteredStudentsForCaseModal.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentNumber}) - الصف {s.grade}/{s.section}
                    </option>
                  ))}
                </select>

                {/* Selected Student Profile Card */}
                {selectedStudentObj && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#006D77]/10 text-[#006D77] flex items-center justify-center font-black shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-xs">
                          {selectedStudentObj.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold">
                          الرقم: {selectedStudentObj.studentNumber} • الصف {selectedStudentObj.grade}/{selectedStudentObj.section}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        درجة السلوك: {100 - ((selectedStudentObj.totalViolations || 0) * 4)} / 100
                      </span>
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                        المخالفات المسجلة: {availableViolationsForSelectedStudent.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Select Existing Violation from Student Records */}
              {selectedStudentForCase && (
                <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <label className="font-bold text-slate-800 dark:text-white block">
                    2. ربط مخالفة قائمة مسجلة للطالب (violationId): *
                  </label>

                  {availableViolationsForSelectedStudent.length === 0 ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-amber-900 dark:text-amber-200 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-black">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>لا توجد مخالفات مسجلة لهذا الطالب في النظام حتى الآن</span>
                      </div>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        تنص لائحة إدارة السلوك على اختيار مخالفة قائمة ومسجلة رسمياً بسجل الطالب قبل العرض على اللجنة. لن يتم إنشاء مخالفة جديدة من هنا للحفاظ على سلامة سجل الانضباط.
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedViolationForCase}
                      onChange={(e) => {
                        setSelectedViolationForCase(e.target.value);
                        const v = availableViolationsForSelectedStudent.find((item) => item.id === e.target.value);
                        if (v) {
                          setCaseJustification(`بناءً على ارتكاب مخالفة ${v.violationType} (${v.violationDegree})`);
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-bold text-rose-800 dark:text-rose-300"
                    >
                      <option value="">-- اختر مخالفة قائمة مسجلة للطالب --</option>
                      {availableViolationsForSelectedStudent.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.violationType} - {v.violationDegree} (بتاريخ: {v.incidentDateTime})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Selected Violation Details Preview Card */}
              {selectedViolationObj && (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 dark:text-white">
                        {selectedViolationObj.violationType}
                      </span>
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black px-2 py-0.5 rounded">
                        {selectedViolationObj.violationDegree}
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-black px-2 py-0.5 rounded">
                      تكرار رقم ({calculatedRepetitionCount})
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <strong className="text-slate-800 dark:text-slate-200">وصف الواقعة الفعلي: </strong>{' '}
                    {selectedViolationObj.incidentDescription}
                  </p>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                    <span>التاريخ: {selectedViolationObj.incidentDateTime}</span>
                    <span>•</span>
                    <span>المكان: {selectedViolationObj.incidentLocation || 'داخل المدرسة'}</span>
                    <span>•</span>
                    <span>راصد الواقعة: {selectedViolationObj.reportingPerson || selectedViolationObj.recordedBy || 'المشرف'}</span>
                  </div>

                  {/* Non-destructive guarantee notice */}
                  <div className="flex items-center gap-2 text-[11px] text-[#006D77] dark:text-teal-400 font-bold bg-[#006D77]/10 p-2.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      ربط مرجعي مباشر (معرف المخالفة: {selectedViolationObj.id}) • لا يتم تعديل سجل المخالفة الأصلي ولا تكرار خصم السلوك
                    </span>
                  </div>
                </div>
              )}

              {/* Step 3: Deliberation Fields */}
              {selectedViolationObj && (
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
                  <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileSignature className="w-4 h-4 text-[#006D77]" />
                    <span>3. مناقشة وتوصية وقرار اللجنة للحالة:</span>
                  </h4>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      مناقشة الحالة واستعراض الواقعة:
                    </label>
                    <textarea
                      rows={2}
                      value={caseDiscussionNotes}
                      onChange={(e) => setCaseDiscussionNotes(e.target.value)}
                      placeholder="استعراض وقائع الحادثة وإفادات المعلمين وملاحظات المرشد الطلابي..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        توصية اللجنة:
                      </label>
                      <input
                        type="text"
                        value={caseRecommendation}
                        onChange={(e) => setCaseRecommendation(e.target.value)}
                        placeholder="إيقاف مؤقت من الدراسة وإلحاق ببرنامج تعديل سلوك"
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        قرار اللجنة المقترح:
                      </label>
                      <select
                        value={caseDecision}
                        onChange={(e) => setCaseDecision(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-bold text-[#006D77]"
                      >
                        <option value="temporary_suspension">قرار إيقاف مؤقت من الدراسة (نموذج 12)</option>
                        <option value="behavior_plan">إلزام بخطة تعديل سلوك مكثفة</option>
                        <option value="final_warning">إصدار إنذار كتابي نهائي</option>
                        <option value="community_service">تكليف بمهام مدرسية بديلة</option>
                        <option value="referral_specialized">إحالة إلى جهة مختصة</option>
                        <option value="other">قرار مخصص آخر</option>
                      </select>
                    </div>
                  </div>

                  {caseDecision === 'other' && (
                    <div className="animate-in fade-in duration-150">
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        نص القرار المخصص: *
                      </label>
                      <input
                        type="text"
                        value={caseDecisionCustomText}
                        onChange={(e) => setCaseDecisionCustomText(e.target.value)}
                        placeholder="اكتب نص القرار المخصص المتفق عليه من اللجنة..."
                        className="w-full p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden font-bold text-[#006D77]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      مبررات القرار:
                    </label>
                    <input
                      type="text"
                      value={caseJustification}
                      onChange={(e) => setCaseJustification(e.target.value)}
                      placeholder="تكرار ارتكاب المخالفة وعدم الاستجابة للإجراءات والبرامج الوقائية السابقة"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      برنامج تعديل السلوك / المتابعة:
                    </label>
                    <textarea
                      rows={2}
                      value={caseBehaviorProgram}
                      onChange={(e) => setCaseBehaviorProgram(e.target.value)}
                      placeholder="التكليف بواجبات وتطبيقات دراسية يومية داخل المدرسة تحت إشراف المرشد الأكاديمي..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      ملاحظات وتوصيات إضافية:
                    </label>
                    <input
                      type="text"
                      value={caseNotes}
                      onChange={(e) => setCaseNotes(e.target.value)}
                      placeholder="أي ملاحظات خاصة بولي الأمر أو استمرار المتابعة..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:border-[#006D77] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsCaseModalOpen(false);
                  setEditingCaseIdInModal(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveCaseToMeeting}
                disabled={!selectedViolationObj}
                className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingCaseIdInModal ? 'حفظ التعديلات على الحالة' : 'إدراج الحالة في جدول الجلسة'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6.5. MODAL: SELECT CASE FOR MODEL 12 FROM COMMITTEE DECISION */}
      {/* ========================================================================= */}
      {isSelectCaseForModel12ModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    إنشاء نموذج من قرار اللجنة (نموذج 12)
                  </h3>
                  <p className="text-xs text-slate-500">
                    اختر الحالة الطلابية من محضر الجلسة ({selectedMeeting.sessionNumber || selectedMeeting.meetingNumber}) لتحويل قرارها إلى نموذج إيقاف مؤقت رسمي:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSelectCaseForModel12ModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {(!selectedMeeting.cases || selectedMeeting.cases.length === 0) ? (
                <p className="text-xs text-slate-500 text-center py-6">لا توجد حالات مسجلة في هذه الجلسة.</p>
              ) : (
                selectedMeeting.cases.map((c, i) => (
                  <div
                    key={c.caseId || i}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 bg-slate-50/70 dark:bg-slate-900/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                          #{i + 1}
                        </span>
                        <strong className="text-sm font-black text-slate-900 dark:text-white">
                          {c.studentName}
                        </strong>
                        <span className="text-xs text-slate-500">
                          (الصف {c.grade} / {c.section})
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 font-bold">
                        المخالفة: {c.violationTitle} ({c.violationDegree})
                      </p>
                      <p className="text-[11px] text-[#006D77] font-semibold">
                        قرار اللجنة: {c.decisionCustomText || (c.decision === 'temporary_suspension' ? 'إيقاف مؤقت من الدراسة' : c.decision)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGenerateModel12FromCase(selectedMeeting, c)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 self-end sm:self-center"
                    >
                      <FileSignature className="w-4 h-4" />
                      <span>اختيار وإنشاء نموذج (12)</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSelectCaseForModel12ModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: MODEL 12 FORM EDITOR & SIGNATURES (قرار إيقاف مؤقت من الدراسة) */}
      {/* ========================================================================= */}
      {isModel12ModalOpen && editingModel12 && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#006D77]/10 rounded-xl text-[#006D77]">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    مراجعة وتوثيق نموذج رقم (12) – قرار إيقاف مؤقت من الدراسة
                  </h3>
                  <p className="text-xs text-slate-500">
                    ملحق (12) للقرار الوزاري رقم (851) • صادر بناءً على قرار لجنة إدارة السلوك المدرسية
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModel12ModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Committee Decision Link Banner */}
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 p-4 rounded-2xl border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[#006D77] text-white shrink-0 mt-0.5">
                    <Vote className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 dark:text-white text-xs block">
                      نموذج رسمي صادر استناداً إلى قرار لجنة إدارة السلوك
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      الجلسة رقم: <strong className="font-mono text-[#006D77] font-bold">{editingModel12.meetingNumber || 'غير محدد'}</strong> بتاريخ: <strong className="font-mono">{editingModel12.meetingDate}</strong> • كود الحالة: <strong className="font-mono">{editingModel12.caseId || 'CASE-001'}</strong>
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold mt-1">
                      تنبيه لائحي: لا يتم تنفيذ قرار الإيقاف تلقائياً؛ يجب مراجعة المدة واعتماد النموذج رسمياً من قبل مدير المدرسة أو صاحب الصلاحية وفق اللائحة.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-900 text-[#006D77] dark:text-teal-200 border border-teal-300 shrink-0 self-start sm:self-center">
                  مرتبط بقرار اللجنة
                </span>
              </div>

              {/* Institution Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block">الإمارة:</label>
                  <input
                    type="text"
                    value={editingModel12.emirate}
                    onChange={(e) => setEditingModel12({ ...editingModel12, emirate: e.target.value })}
                    className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block">المجلس:</label>
                  <input
                    type="text"
                    value={editingModel12.council}
                    onChange={(e) => setEditingModel12({ ...editingModel12, council: e.target.value })}
                    className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block">النطاق:</label>
                  <input
                    type="text"
                    value={editingModel12.sector}
                    onChange={(e) => setEditingModel12({ ...editingModel12, sector: e.target.value })}
                    className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block">المدرسة:</label>
                  <input
                    type="text"
                    value={editingModel12.schoolName}
                    onChange={(e) => setEditingModel12({ ...editingModel12, schoolName: e.target.value })}
                    className="w-full p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Student & Guardian Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    اسم الطالب / الطالبة:
                  </label>
                  <input
                    type="text"
                    value={editingModel12.studentName}
                    readOnly
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    الصف والشعبة:
                  </label>
                  <input
                    type="text"
                    value={`الصف ${editingModel12.grade} / شعبة ${editingModel12.section}`}
                    readOnly
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    هاتف ولي الأمر:
                  </label>
                  <input
                    type="text"
                    value={editingModel12.parentPhone || ''}
                    onChange={(e) => setEditingModel12({ ...editingModel12, parentPhone: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Committee Session & Prior Procedures */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    رقم جلسة لجنة السلوك: *
                  </label>
                  <input
                    type="text"
                    value={editingModel12.meetingNumber}
                    onChange={(e) => setEditingModel12({ ...editingModel12, meetingNumber: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    يوم وتاريخ الجلسة:
                  </label>
                  <input
                    type="date"
                    value={editingModel12.meetingDate}
                    onChange={(e) =>
                      setEditingModel12({
                        ...editingModel12,
                        meetingDate: e.target.value,
                        meetingDay: getDayNameFromDateString(e.target.value),
                      })
                    }
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    تاريخ التحرير الرسمي:
                  </label>
                  <input
                    type="date"
                    value={editingModel12.issueDate}
                    onChange={(e) => setEditingModel12({ ...editingModel12, issueDate: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Prior Actions */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 dark:text-white block">
                  سبق اتخاذ الإجراءات التالية بحقه:
                </span>
                <input
                  type="text"
                  value={editingModel12.priorAction1 || ''}
                  onChange={(e) => setEditingModel12({ ...editingModel12, priorAction1: e.target.value })}
                  placeholder="الإجراء 1: تنبيه خطي للطالب واستدعاء ولي الأمر..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={editingModel12.priorAction2 || ''}
                  onChange={(e) => setEditingModel12({ ...editingModel12, priorAction2: e.target.value })}
                  placeholder="الإجراء 2: جلسات إرشاد وتوجيه مع المرشد الأكاديمي..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Suspension Duration & Dates */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
                <span className="font-bold text-amber-900 dark:text-amber-300 block">
                  مدة الإيقاف المؤقت من الدراسة بالمدرسة:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">من تاريخ:</label>
                    <input
                      type="date"
                      value={editingModel12.suspensionStartDate}
                      onChange={(e) =>
                        setEditingModel12({
                          ...editingModel12,
                          suspensionStartDate: e.target.value,
                          suspensionStartDay: getDayNameFromDateString(e.target.value),
                        })
                      }
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">إلى تاريخ:</label>
                    <input
                      type="date"
                      value={editingModel12.suspensionEndDate}
                      onChange={(e) =>
                        setEditingModel12({
                          ...editingModel12,
                          suspensionEndDate: e.target.value,
                          suspensionEndDay: getDayNameFromDateString(e.target.value),
                        })
                      }
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">عدد الأيام:</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={editingModel12.suspensionDaysCount || 1}
                      onChange={(e) =>
                        setEditingModel12({
                          ...editingModel12,
                          suspensionDaysCount: Number(e.target.value),
                        })
                      }
                      className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    برنامج تعديل السلوك والتكليف بالواجبات داخل المدرسة:
                  </label>
                  <textarea
                    rows={2}
                    value={editingModel12.behaviorModificationProgram || ''}
                    onChange={(e) =>
                      setEditingModel12({
                        ...editingModel12,
                        behaviorModificationProgram: e.target.value,
                      })
                    }
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Reasons for Suspension */}
              <div className="space-y-2">
                <span className="font-bold text-slate-800 dark:text-white block">
                  وذلك للأسباب التالية:
                </span>
                <input
                  type="text"
                  value={editingModel12.reason1}
                  onChange={(e) => setEditingModel12({ ...editingModel12, reason1: e.target.value })}
                  placeholder="سبب 1: ارتكاب المخالفة السلوكية..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={editingModel12.reason2 || ''}
                  onChange={(e) => setEditingModel12({ ...editingModel12, reason2: e.target.value })}
                  placeholder="سبب 2: تكرار السلوك وعدم التجاوب..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={editingModel12.reason3 || ''}
                  onChange={(e) => setEditingModel12({ ...editingModel12, reason3: e.target.value })}
                  placeholder="سبب 3: تحقيق الانضباط المدرسي..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Signatures & Approvals Section */}
              <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <span className="font-black text-slate-900 dark:text-white block">
                  التوقيعات الرسمية والاعتمادات:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Principal / Authorized Signature */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-white block">
                      مدير المدرسة / المكلف:
                    </span>
                    <input
                      type="text"
                      value={editingModel12.principalName}
                      onChange={(e) => setEditingModel12({ ...editingModel12, principalName: e.target.value })}
                      className="w-full p-1.5 rounded border border-slate-300 text-xs"
                    />
                    {editingModel12.principalSignature ? (
                      <div className="p-2 border rounded bg-slate-50 text-center">
                        <img
                          src={editingModel12.principalSignature}
                          alt="توقيع المدير"
                          className="h-10 mx-auto"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                          ✓ تم التوقيع والتوثيق
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveModel12SignatureType('principal')}
                        className="w-full py-2 rounded-lg bg-teal-50 border border-teal-200 text-[#006D77] font-bold text-xs hover:bg-teal-100 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>توقيع المدير الآن</span>
                      </button>
                    )}
                  </div>

                  {/* Parent Signature */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-white block">
                      ولي أمر الطالب:
                    </span>
                    <input
                      type="text"
                      value={editingModel12.parentName || ''}
                      onChange={(e) => setEditingModel12({ ...editingModel12, parentName: e.target.value })}
                      placeholder="اسم ولي الأمر"
                      className="w-full p-1.5 rounded border border-slate-300 text-xs"
                    />
                    {editingModel12.parentSignature ? (
                      <div className="p-2 border rounded bg-slate-50 text-center">
                        <img
                          src={editingModel12.parentSignature}
                          alt="توقيع ولي الأمر"
                          className="h-10 mx-auto"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                          ✓ تم توقيع ولي الأمر
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveModel12SignatureType('parent')}
                        className="w-full py-2 rounded-lg bg-teal-50 border border-teal-200 text-[#006D77] font-bold text-xs hover:bg-teal-100 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>توقيع ولي الأمر</span>
                      </button>
                    )}
                  </div>

                  {/* Student Signature */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-bold text-slate-800 dark:text-white block">
                      توقيع الطالب بالعلم:
                    </span>
                    <p className="text-slate-600 text-[11px]">{editingModel12.studentName}</p>
                    {editingModel12.studentSignature ? (
                      <div className="p-2 border rounded bg-slate-50 text-center">
                        <img
                          src={editingModel12.studentSignature}
                          alt="توقيع الطالب"
                          className="h-10 mx-auto"
                        />
                        <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                          ✓ تم توقيع الطالب بالعلم
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveModel12SignatureType('student')}
                        className="w-full py-2 rounded-lg bg-teal-50 border border-teal-200 text-[#006D77] font-bold text-xs hover:bg-teal-100 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>توقيع الطالب بالعلم</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Final status toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="font-bold text-slate-700">حالة النموذج:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="model12_status"
                      checked={editingModel12.status === 'مسودة'}
                      onChange={() => setEditingModel12({ ...editingModel12, status: 'مسودة' })}
                    />
                    <span>مسودة</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="model12_status"
                      checked={editingModel12.status === 'معتمد ومسلّم'}
                      onChange={() => setEditingModel12({ ...editingModel12, status: 'معتمد ومسلّم' })}
                    />
                    <span className="font-bold text-emerald-700">معتمد ومسلّم رسمياً</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsModel12ModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModel12ForPrint(editingModel12);
                    setIsPrintModel12ModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-teal-300 bg-teal-50 text-[#006D77] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-teal-100"
                >
                  <Printer className="w-4 h-4" />
                  <span>معاينة ورقة A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveModel12(editingModel12)}
                  className="px-5 py-2.5 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ القرار والنموذج</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. DIGITAL SIGNATURE CAPTURE MODAL */}
      {/* ========================================================================= */}
      {activeModel12SignatureType && editingModel12 && (
        <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                {activeModel12SignatureType === 'principal'
                  ? 'توقيع مدير المدرسة / المكلف رسمياً'
                  : activeModel12SignatureType === 'parent'
                  ? 'توقيع ولي أمر الطالب'
                  : 'توقيع الطالب بالعلم'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveModel12SignatureType(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <SignatureCanvas
              id={`sig-model12-${activeModel12SignatureType}`}
              title={`لوحة التوقيع الرقمي`}
              subtitle="استخدم المؤشر أو الشاشة اللمسية للتوقيع الرسمي"
              signerType={
                activeModel12SignatureType === 'principal'
                  ? 'المسؤول الإداري'
                  : activeModel12SignatureType === 'parent'
                  ? 'ولي أمر'
                  : 'طالب'
              }
              onSave={(dataUrl, timestamp) => {
                const nowTimestamp = getUaeFullDateTimeString();
                const updated = { ...editingModel12 };
                if (!updated.signaturesAudit) updated.signaturesAudit = {};

                if (activeModel12SignatureType === 'principal') {
                  updated.principalSignature = dataUrl;
                  updated.principalSignatureDate = timestamp;
                  updated.signaturesAudit.principal = {
                    signerName: editingModel12.principalName || 'مدير المدرسة',
                    signerRole: 'مدير المدرسة / المفوض بالاعتماد',
                    signedAt: nowTimestamp,
                    meetingId: editingModel12.meetingNumber,
                    documentId: editingModel12.id,
                  };
                } else if (activeModel12SignatureType === 'parent') {
                  updated.parentSignature = dataUrl;
                  updated.parentSignatureDate = timestamp;
                  updated.signaturesAudit.parent = {
                    signerName: editingModel12.parentName || 'ولي الأمر',
                    signerRole: 'ولي أمر الطالب',
                    signedAt: nowTimestamp,
                    meetingId: editingModel12.meetingNumber,
                    documentId: editingModel12.id,
                  };
                } else {
                  updated.studentSignature = dataUrl;
                  updated.studentSignatureDate = timestamp;
                  updated.signaturesAudit.student = {
                    signerName: editingModel12.studentName,
                    signerRole: 'الطالب',
                    signedAt: nowTimestamp,
                    meetingId: editingModel12.meetingNumber,
                    documentId: editingModel12.id,
                  };
                }

                setEditingModel12(updated);
                setActiveModel12SignatureType(null);
                onShowToast('تم التقاط التوقيع وتوثيق البيانات بنجاح', 'success');
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. PRINT PREVIEWS: PrintTemporarySuspensionModal & PrintCommitteeMeetingModal */}
      {/* ========================================================================= */}
      {isPrintModel12ModalOpen && selectedModel12ForPrint && (
        <PrintTemporarySuspensionModal
          isOpen={isPrintModel12ModalOpen}
          onClose={() => setIsPrintModel12ModalOpen(false)}
          form={selectedModel12ForPrint}
        />
      )}

      {isPrintMeetingModalOpen && selectedMeetingForPrint && (
        <PrintCommitteeMeetingModal
          isOpen={isPrintMeetingModalOpen}
          onClose={() => setIsPrintMeetingModalOpen(false)}
          meeting={selectedMeetingForPrint}
        />
      )}

      {/* 10. Notification Modal */}
      {isNotificationModalOpen && (
        <CommitteeNotificationModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          initialMode="center"
          targetMeeting={notificationTargetMeeting}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
