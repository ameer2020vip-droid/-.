import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  MessageSquare,
  Send,
  FileText,
  History,
  Settings as SettingsIcon,
  CheckCircle2,
  Users,
  Eye,
  Edit3,
  Phone,
  Mail,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Search,
  User,
  ShieldCheck,
  Layers,
  Clock,
  LayoutGrid,
  AlertTriangle,
  X,
  BarChart3,
  Download,
  Filter,
  FlaskConical,
  Lock,
  Calendar,
  Building2,
  UserCheck,
  RefreshCw,
  Ban,
  ChevronLeft,
} from 'lucide-react';
import {
  Student,
  MessageTemplate,
  MessageLogRecord,
  SchoolMessageSettings,
  MessageChannel,
  StudentContact,
  ViolationRecord,
  AbsenceRecord,
  TardinessRecord,
  QueueItem,
  MessageDeliveryStatus,
} from '../../types';
import {
  CommunicationSubPage,
  COMMUNICATION_SUB_PAGES,
} from '../Navigation';
import {
  createMessageLog,
  updateMessageLogStatus,
  renderMessageVariables,
  getCommunicationPermissions,
  computeMessageDedupeKey,
  SANDBOX_DUMMY_STUDENTS,
  MESSAGE_STATUS_LABELS_AR,
  MESSAGE_CATEGORY_LABELS_AR,
  FUJAIRAH_DISABLED_APPS_SCRIPT_TEMPLATE,
} from '../../firebase/messageService';
import {
  getStudentNormalizedContacts,
  normalizeUaePhone,
  buildWhatsAppLink,
  buildMailtoLink,
  buildBccMailtoLink,
  isValidEmailFormat,
  maskPhone,
  maskEmail,
} from '../../utils/phoneUtils';
import { extractDynamicGrades, extractDynamicSections } from '../../utils/gradeUtils';
import { renderWhatsAppFormattedText } from './MessageEditor';

export interface SmartParentCommunicationHubProps {
  activeSubPage: CommunicationSubPage;
  onSubPageChange: (sub: CommunicationSubPage) => void;
  students: Student[];
  violations: ViolationRecord[];
  absences: AbsenceRecord[];
  tardinessRecords: TardinessRecord[];
  templates: MessageTemplate[];
  logs: MessageLogRecord[];
  onLogsChange: React.Dispatch<React.SetStateAction<MessageLogRecord[]>>;
  settings: SchoolMessageSettings;
  onOpenSettingsModal: () => void;
  schoolId: string;
  currentUser?: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    role?: string;
  };
  onOpenStudentProfile?: (studentId: string) => void;
  onOpenLegacyStudio?: () => void;
  onRenderTemplatesManager: () => React.ReactNode;
  onRenderGmailOAuthPanel?: () => React.ReactNode;
  onOpenBulkWhatsAppQueue: (items: QueueItem[], template: MessageTemplate, channel: MessageChannel) => void;
  initialStudentId?: string | null;
  initialIncident?: {
    type: 'absence' | 'tardiness' | 'violation';
    id: string;
    studentId: string;
    date?: string;
  } | null;
}

const FUJAIRAH_OFFICIAL_TEMPLATE_IDS = [
  'tpl-fujairah-absence',
  'tpl-fujairah-morning-tardiness',
  'tpl-fujairah-behavior-notice',
  'tpl-fujairah-summon',
  'tpl-fujairah-academic-note',
  'tpl-fujairah-general-announcement',
];

export const SmartParentCommunicationHub: React.FC<SmartParentCommunicationHubProps> = ({
  activeSubPage,
  onSubPageChange,
  students,
  violations,
  absences,
  tardinessRecords,
  templates,
  logs,
  onLogsChange,
  settings,
  onOpenSettingsModal,
  schoolId,
  currentUser,
  onOpenStudentProfile,
  onOpenLegacyStudio,
  onRenderTemplatesManager,
  onRenderGmailOAuthPanel,
  onOpenBulkWhatsAppQueue,
  initialStudentId,
  initialIncident,
}) => {
  // 1. Sandbox Test Mode (بيانات تجريبية وهمية لا تمس أولياء الأمور الحقيقيين)
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);

  // Role-based access control permissions
  const perms = useMemo(
    () => getCommunicationPermissions(currentUser),
    [currentUser]
  );

  // Effective students list (Sandbox vs Real Firestore students)
  const effectiveStudents = useMemo<Student[]>(() => {
    if (isSandboxMode) return SANDBOX_DUMMY_STUDENTS as unknown as Student[];
    return students;
  }, [isSandboxMode, students]);

  // Dynamic Grades & Sections from actual database (supports Grade 5 to 12 dynamically)
  const availableGrades = useMemo(() => extractDynamicGrades(effectiveStudents), [effectiveStudents]);

  // Toast feedback
  const [hubToast, setHubToast] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const showHubToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setHubToast({ text, type });
    setTimeout(() => setHubToast(null), 4500);
  };

  // ============================================================================
  // NEW MESSAGE & INCIDENT COMPOSER STATE (`new-message`)
  // ============================================================================
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const availableSectionsForGrade = useMemo(
    () => extractDynamicSections(effectiveStudents, gradeFilter),
    [effectiveStudents, gradeFilter]
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId) return initialStudentId;
    return effectiveStudents[0]?.id || '';
  });

  // Update selectedStudentId if sandbox mode switches or initialStudentId changes
  useEffect(() => {
    if (initialStudentId && !isSandboxMode) {
      const found = students.find((s) => s.id === initialStudentId || s.studentNumber === initialStudentId);
      if (found) setSelectedStudentId(found.id);
    } else if (effectiveStudents.length > 0 && !effectiveStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(effectiveStudents[0].id);
    }
  }, [initialStudentId, isSandboxMode, effectiveStudents, students]);

  const activeStudent = useMemo(
    () =>
      effectiveStudents.find((s) => s.id === selectedStudentId || s.studentNumber === selectedStudentId) ||
      effectiveStudents[0] ||
      null,
    [effectiveStudents, selectedStudentId]
  );

  // Authorized contacts for active student
  const activeStudentContacts = useMemo<StudentContact[]>(() => {
    if (!activeStudent) return [];
    return getStudentNormalizedContacts(activeStudent);
  }, [activeStudent]);

  const [selectedContactId, setSelectedContactId] = useState<string>('');
  useEffect(() => {
    if (activeStudentContacts.length > 0) {
      const primary = activeStudentContacts.find((c) => c.isPrimaryGuardian) || activeStudentContacts[0];
      setSelectedContactId(primary.id);
    } else {
      setSelectedContactId('');
    }
  }, [activeStudentContacts]);

  const activeContact = useMemo<StudentContact | null>(() => {
    if (activeStudentContacts.length === 0) return null;
    return activeStudentContacts.find((c) => c.id === selectedContactId) || activeStudentContacts[0];
  }, [activeStudentContacts, selectedContactId]);

  // Official Fujairah templates prioritized
  const officialTemplates = useMemo(() => {
    const fuj = templates.filter((t) => FUJAIRAH_OFFICIAL_TEMPLATE_IDS.includes(t.id));
    const others = templates.filter((t) => !FUJAIRAH_OFFICIAL_TEMPLATE_IDS.includes(t.id) && t.isActive !== false);
    return [...fuj, ...others];
  }, [templates]);

  const [composerTemplateId, setComposerTemplateId] = useState<string>('tpl-fujairah-absence');
  const composerTemplate = useMemo(
    () => officialTemplates.find((t) => t.id === composerTemplateId) || officialTemplates[0],
    [officialTemplates, composerTemplateId]
  );

  // Dynamic variables for Composer
  const [composerDate, setComposerDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [composerAcademicSubject, setComposerAcademicSubject] = useState<string>('اللغة العربية / الرياضيات');
  const [composerGeneralBody, setComposerGeneralBody] = useState<string>(
    'نود تذكيركم بموعد اللقاء التربوي لأولياء الأمور يوم الخميس القادم في تمام الساعة التاسعة صباحاً.'
  );
  const [composerEmailSubject, setComposerEmailSubject] = useState<string>('');
  const [composerBodyText, setComposerBodyText] = useState<string>('');
  const [linkedIncident, setLinkedIncident] = useState<{
    id: string;
    type: 'absence' | 'tardiness' | 'violation' | 'academic' | 'general';
    label: string;
    date: string;
  } | null>(null);

  // Track last created log in current session so staff can confirm sending immediately
  const [activeSessionLog, setActiveSessionLog] = useState<MessageLogRecord | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Sync template body & subject when template changes
  useEffect(() => {
    if (!composerTemplate) return;
    setComposerBodyText(composerTemplate.body || composerTemplate.sections?.mainBody?.text || '');
    setComposerEmailSubject(composerTemplate.subject || composerTemplate.name);
  }, [composerTemplate]);

  // Handle incoming initialIncident
  useEffect(() => {
    if (!initialIncident) return;
    setSelectedStudentId(initialIncident.studentId);
    if (initialIncident.date) setComposerDate(initialIncident.date);
    if (initialIncident.type === 'absence') {
      setComposerTemplateId('tpl-fujairah-absence');
      setLinkedIncident({
        id: initialIncident.id,
        type: 'absence',
        label: `واقعة غياب يومي (#${initialIncident.id})`,
        date: initialIncident.date || new Date().toISOString().slice(0, 10),
      });
    } else if (initialIncident.type === 'tardiness') {
      setComposerTemplateId('tpl-fujairah-morning-tardiness');
      setLinkedIncident({
        id: initialIncident.id,
        type: 'tardiness',
        label: `واقعة تأخير صباحي (#${initialIncident.id})`,
        date: initialIncident.date || new Date().toISOString().slice(0, 10),
      });
    } else if (initialIncident.type === 'violation') {
      setComposerTemplateId('tpl-fujairah-behavior-notice');
      setLinkedIncident({
        id: initialIncident.id,
        type: 'violation',
        label: `ملاحظة سلوكية معتمدة (#${initialIncident.id})`,
        date: initialIncident.date || new Date().toISOString().slice(0, 10),
      });
    }
  }, [initialIncident]);

  // Filtered students for student search panel
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectiveStudents.filter((s) => {
      if (gradeFilter !== 'all' && s.grade !== gradeFilter) return false;
      if (sectionFilter !== 'all' && s.section !== sectionFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        String(s.studentNumber || '').toLowerCase().includes(q) ||
        String(s.grade || '').toLowerCase().includes(q) ||
        String(s.section || '').toLowerCase().includes(q) ||
        String(s.parentName || '').toLowerCase().includes(q)
      );
    });
  }, [effectiveStudents, gradeFilter, sectionFilter, searchQuery]);

  // Rendered message & subject for active student
  const renderedComposer = useMemo(() => {
    if (!activeStudent) {
      return { subject: '', body: '', phoneNorm: normalizeUaePhone(''), emailValid: false, email: '' };
    }
    const vars = {
      studentName: activeStudent.fullName,
      studentNumber: activeStudent.studentNumber,
      grade: activeStudent.grade,
      section: activeStudent.section,
      track: activeStudent.track || 'عام',
      guardianName: activeContact?.name || activeStudent.parentName || 'ولي الأمر المحترم',
      guardianRelation: activeContact?.relation || activeStudent.guardianRelation || 'ولي الأمر',
      date: composerDate,
      incidentDate: composerDate,
      subject: composerAcademicSubject,
      messageBody: composerGeneralBody,
      schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
      senderName: currentUser?.displayName || settings.defaultSenderName,
      senderRole: settings.defaultSenderRole,
      contactPhone: settings.phone || '09-2220000',
    };

    const renderedBody = renderMessageVariables(composerBodyText, vars);
    const renderedSubject = renderMessageVariables(composerEmailSubject || composerTemplate?.subject || '', vars);
    const rawPhone = activeContact?.phone || activeStudent.parentPhone || '';
    const phoneNorm = normalizeUaePhone(rawPhone, activeStudent.nationality);
    const rawEmail = (activeContact?.email || activeStudent.parentEmail || activeStudent.fatherEmail || activeStudent.motherEmail || '').trim();
    const emailValid = isValidEmailFormat(rawEmail);

    return {
      subject: renderedSubject,
      body: renderedBody,
      phoneNorm,
      emailValid,
      email: rawEmail,
      vars,
    };
  }, [
    activeStudent,
    activeContact,
    composerDate,
    composerAcademicSubject,
    composerGeneralBody,
    composerBodyText,
    composerEmailSubject,
    composerTemplate,
    settings,
    currentUser,
  ]);

  // Check if an existing log already exists for this incident + student + channel
  const existingIncidentDuplicate = useMemo(() => {
    if (!activeStudent || !linkedIncident) return null;
    return logs.find(
      (l) =>
        l.studentNumber === activeStudent.studentNumber &&
        (l.incidentId === linkedIncident.id ||
          l.violationId === linkedIncident.id ||
          l.absenceId === linkedIncident.id ||
          l.tardinessId === linkedIncident.id) &&
        l.status !== 'cancelled' &&
        l.status !== 'failed'
    );
  }, [activeStudent, linkedIncident, logs]);

  // Open WhatsApp or Email and record accurate status (`whatsapp_opened` / `email_opened`)
  const handleOpenCommunicationChannel = async (
    channel: MessageChannel,
    allowDuplicateRetry = false
  ) => {
    if (!activeStudent) {
      showHubToast('يرجى اختيار طالب أولاً', 'warning');
      return;
    }
    if (!perms.canAccessCenter) {
      showHubToast('صلاحيات حسابك الحالية لا تسمح بإرسال رسائل لأولياء الأمور', 'error');
      return;
    }

    // Check role category restrictions (e.g. Teacher can only send academic/general notes)
    if (
      composerTemplate &&
      !perms.canSendBehaviorAndCounseling &&
      (composerTemplate.category === 'behavior' || composerTemplate.category === 'guardianCall')
    ) {
      showHubToast(
        `صلاحيات دورك الوظيفي لا تسمح بإرسال قوالب من فئة (${MESSAGE_CATEGORY_LABELS_AR[composerTemplate.category] || composerTemplate.category})`,
        'error'
      );
      return;
    }

    // Prevent unintentioned duplicate for same incident unless user explicitly retries
    if (existingIncidentDuplicate && !allowDuplicateRetry) {
      const confirmRetry = window.confirm(
        `تنبيه منع التكرار: سبق إنشاء رسالة لهذه الواقعة (#${linkedIncident?.id}) للطالب (${activeStudent.fullName}) بحالة «${MESSAGE_STATUS_LABELS_AR[existingIncidentDuplicate.status]}». هل ترغب في إعادة المحاولة مع توثيقها؟`
      );
      if (!confirmRetry) return;
    }

    if (channel === 'whatsapp') {
      if (!renderedComposer.phoneNorm.isValid) {
        showHubToast(
          renderedComposer.phoneNorm.validationNotice ||
            'رقم هاتف ولي الأمر غير صالح أو غير متوفر. يرجى مراجعة الرقم أولاً.',
          'error'
        );
        return;
      }
      const waUrl = buildWhatsAppLink(renderedComposer.phoneNorm.e164, renderedComposer.body);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    } else {
      if (!renderedComposer.emailValid) {
        showHubToast(
          'البريد الإلكتروني لولي الأمر غير متوفر أو غير صالح. لا يمكن فتح البريد الإلكتروني.',
          'error'
        );
        return;
      }
      const mailtoUrl = buildMailtoLink(
        renderedComposer.email,
        renderedComposer.subject,
        renderedComposer.body
      );
      window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
    }

    const nowIso = new Date().toISOString();
    const status: MessageDeliveryStatus =
      channel === 'whatsapp' ? 'whatsapp_opened' : 'email_opened';
    const dedupeKey = computeMessageDedupeKey({
      schoolId,
      studentNumber: activeStudent.studentNumber,
      incidentId: linkedIncident?.id || `${composerTemplate?.id || 'custom'}_${composerDate}`,
      category: composerTemplate?.category || 'custom',
      channel,
      recipientAddress:
        channel === 'whatsapp' ? renderedComposer.phoneNorm.e164 : renderedComposer.email,
    });

    const newRecord: Omit<MessageLogRecord, 'id'> = {
      messageId: `fuj-msg-${Date.now()}-${activeStudent.studentNumber}`,
      schoolId,
      templateId: composerTemplate?.id || 'custom',
      templateName: composerTemplate?.name || 'رسالة مخصصة',
      templateCategory: composerTemplate?.category || 'custom',
      studentId: activeStudent.id,
      studentName: activeStudent.fullName,
      studentNumber: activeStudent.studentNumber,
      grade: activeStudent.grade,
      section: activeStudent.section,
      track: activeStudent.track,
      recipientName: activeContact?.name || activeStudent.parentName || 'ولي الأمر',
      recipientRelation: activeContact?.relation || activeStudent.guardianRelation || 'ولي الأمر',
      recipientPhoneMasked: renderedComposer.phoneNorm.e164
        ? maskPhone(renderedComposer.phoneNorm.e164)
        : undefined,
      recipientPhoneFull: renderedComposer.phoneNorm.e164 || undefined,
      recipientEmailMasked: renderedComposer.email ? maskEmail(renderedComposer.email) : undefined,
      recipientEmailFull: renderedComposer.email || undefined,
      channel,
      subject: renderedComposer.subject,
      messageSnapshot: renderedComposer.body,
      incidentId: linkedIncident?.id,
      incidentType: linkedIncident?.type,
      violationId: linkedIncident?.type === 'violation' ? linkedIncident.id : undefined,
      absenceId: linkedIncident?.type === 'absence' ? linkedIncident.id : undefined,
      tardinessId: linkedIncident?.type === 'tardiness' ? linkedIncident.id : undefined,
      incidentDate: composerDate,
      dedupeKey,
      status,
      openedAt: nowIso,
      retryCount: allowDuplicateRetry && existingIncidentDuplicate ? (existingIncidentDuplicate.retryCount || 0) + 1 : 0,
      isTestMode: isSandboxMode,
      createdBy: currentUser?.uid || 'staff',
      createdByName: currentUser?.displayName || settings.defaultSenderName,
      senderRole: settings.defaultSenderRole,
      createdAt: nowIso,
    };

    try {
      const docId = await createMessageLog(schoolId, newRecord);
      const savedLog: MessageLogRecord = { id: docId, ...newRecord };
      onLogsChange((prev) => [savedLog, ...prev]);
      setActiveSessionLog(savedLog);
      showHubToast(
        channel === 'whatsapp'
          ? 'تم فتح واتساب وتوثيق الحالة «تم فتح واتساب». يرجى النقر على «تأكيد الإرسال» بعد إرسال الرسالة فعلياً.'
          : 'تم فتح برنامج البريد وتوثيق الحالة «تم فتح البريد». يرجى النقر على «تأكيد الإرسال» بعد الإرسال الفعلي.',
        'success'
      );
    } catch (err) {
      console.error('Failed to log communication:', err);
    }
  };

  // Manual Confirmation of Sent Status (`confirmed_sent` / «أكد الموظف الإرسال»)
  const handleManualConfirmSent = async (logRecord: MessageLogRecord) => {
    try {
      const nowIso = new Date().toISOString();
      await updateMessageLogStatus(
        schoolId,
        logRecord.id,
        'confirmed_sent',
        nowIso,
        {
          actorUid: currentUser?.uid,
          actorName: currentUser?.displayName || undefined,
          actorRole: currentUser?.role,
        }
      );
      onLogsChange((prev) =>
        prev.map((l) =>
          l.id === logRecord.id ? { ...l, status: 'confirmed_sent', confirmedAt: nowIso } : l
        )
      );
      if (activeSessionLog?.id === logRecord.id) {
        setActiveSessionLog((prev) =>
          prev ? { ...prev, status: 'confirmed_sent', confirmedAt: nowIso } : null
        );
      }
      showHubToast('تم توثيق «أكد الموظف الإرسال» في سجل التواصل وملف الطالب بنجاح.', 'success');
    } catch (err: any) {
      showHubToast(err?.message || 'تعذر تحديث حالة الرسالة', 'error');
    }
  };

  // Helper to jump from Absence / Tardiness / Violation directly into `new-message` composer
  const handlePrepareIncidentNotice = (params: {
    student: Student;
    incidentId: string;
    incidentType: 'absence' | 'tardiness' | 'violation';
    date: string;
    templateId: string;
    label: string;
  }) => {
    setSelectedStudentId(params.student.id);
    setComposerDate(params.date);
    setComposerTemplateId(params.templateId);
    setLinkedIncident({
      id: params.incidentId,
      type: params.incidentType,
      label: params.label,
      date: params.date,
    });
    setActiveSessionLog(null);
    onSubPageChange('new-message');
    showHubToast(`تم تجهيز إشعار ولي الأمر للطالب (${params.student.fullName}) للمعاينة والإرسال`, 'success');
  };

  // ============================================================================
  // BULK MESSAGING STATE (`bulk-messages`)
  // ============================================================================
  type BulkTargetCriteria =
    | 'grade'
    | 'section'
    | 'custom_group'
    | 'absent_on_date'
    | 'tardy_on_date'
    | 'academic_followup';

  const [bulkCriteria, setBulkCriteria] = useState<BulkTargetCriteria>('grade');
  const [bulkGrade, setBulkGrade] = useState<string>(() => availableGrades[0] || 'all');
  const [bulkSection, setBulkSection] = useState<string>('all');
  const [bulkIncidentDate, setBulkIncidentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [bulkTemplateId, setBulkTemplateId] = useState<string>('tpl-fujairah-general-announcement');
  const [bulkCustomStudentIds, setBulkCustomStudentIds] = useState<string[]>([]);
  const [deduplicateSiblings, setDeduplicateSiblings] = useState<boolean>(true);
  const [bulkChannel, setBulkChannel] = useState<MessageChannel>('whatsapp');
  const [bulkSubjectText, setBulkSubjectText] = useState<string>('إعلان عام من أكاديمية الفجيرة العلمية الإسلامية');
  const [bulkBodyMessageText, setBulkBodyMessageText] = useState<string>(
    'نود إحاطتكم علماً بمواعيد الاختبارات الدورية للأسبوع القادم، شاكرين لكم حسن المتابعة والتعاون.'
  );

  // Safe templates allowed in Bulk Messaging (blocks sensitive behavioral/health data)
  const bulkAllowedTemplates = useMemo(() => {
    return officialTemplates.filter(
      (t) =>
        t.category !== 'behavior' &&
        t.category !== 'committeeDecision' &&
        t.category !== 'phoneConfiscation' &&
        t.id !== 'tpl-fujairah-behavior-notice'
    );
  }, [officialTemplates]);

  const activeBulkTemplate = useMemo(
    () => bulkAllowedTemplates.find((t) => t.id === bulkTemplateId) || bulkAllowedTemplates[0],
    [bulkAllowedTemplates, bulkTemplateId]
  );

  // Compute raw target students for Bulk Messaging based on criteria
  const bulkRawTargetStudents = useMemo<Student[]>(() => {
    if (bulkCriteria === 'grade') {
      if (bulkGrade === 'all') return effectiveStudents;
      return effectiveStudents.filter((s) => s.grade === bulkGrade);
    }
    if (bulkCriteria === 'section') {
      return effectiveStudents.filter(
        (s) =>
          (bulkGrade === 'all' || s.grade === bulkGrade) &&
          (bulkSection === 'all' || s.section === bulkSection)
      );
    }
    if (bulkCriteria === 'absent_on_date') {
      const absentStudentNums = new Set(
        absences
          .filter((a) => a.date === bulkIncidentDate)
          .map((a) => String(a.studentNumber || a.studentId).trim())
      );
      return effectiveStudents.filter(
        (s) => absentStudentNums.has(String(s.studentNumber).trim()) || absentStudentNums.has(s.id)
      );
    }
    if (bulkCriteria === 'tardy_on_date') {
      const tardyStudentNums = new Set(
        tardinessRecords
          .filter((t) => t.date === bulkIncidentDate)
          .map((t) => String(t.studentNumber || t.studentId).trim())
      );
      return effectiveStudents.filter(
        (s) => tardyStudentNums.has(String(s.studentNumber).trim()) || tardyStudentNums.has(s.id)
      );
    }
    if (bulkCriteria === 'academic_followup') {
      return effectiveStudents.filter(
        (s) => (s.behaviorScore !== undefined && s.behaviorScore < 85) || (s.absenceDays || 0) >= 3
      );
    }
    // custom_group
    const idSet = new Set(bulkCustomStudentIds);
    return effectiveStudents.filter((s) => idSet.has(s.id));
  }, [
    bulkCriteria,
    bulkGrade,
    bulkSection,
    bulkIncidentDate,
    bulkCustomStudentIds,
    effectiveStudents,
    absences,
    tardinessRecords,
  ]);

  // Apply Sibling / Shared Guardian Deduplication when enabled
  const bulkRecipientEntries = useMemo(() => {
    const entries: Array<{
      primaryStudent: Student;
      mergedStudents: Student[];
      contact: StudentContact;
      normPhone: ReturnType<typeof normalizeUaePhone>;
      email: string;
      emailValid: boolean;
      renderedSubject: string;
      renderedBody: string;
    }> = [];

    const seenGuardianKey = new Map<string, number>();

    for (const st of bulkRawTargetStudents) {
      const contacts = getStudentNormalizedContacts(st);
      const primary = contacts.find((c) => c.isPrimaryGuardian) || contacts[0] || {
        id: `fallback-${st.id}`,
        name: st.parentName || 'ولي الأمر',
        relation: st.guardianRelation || 'ولي الأمر',
        phone: st.parentPhone || '',
        email: st.parentEmail || '',
        isPrimaryGuardian: true,
      };
      const normPhone = normalizeUaePhone(primary.phone || st.parentPhone || '', st.nationality);
      const email = (primary.email || st.parentEmail || st.fatherEmail || st.motherEmail || '').trim();
      const emailValid = isValidEmailFormat(email);

      const guardianKey =
        bulkChannel === 'whatsapp'
          ? normPhone.e164 || `no-phone-${st.id}`
          : email.toLowerCase() || `no-email-${st.id}`;

      if (deduplicateSiblings && !guardianKey.startsWith('no-') && seenGuardianKey.has(guardianKey)) {
        const idx = seenGuardianKey.get(guardianKey)!;
        entries[idx].mergedStudents.push(st);
        // Re-render with combined sibling names
        const allSiblings = entries[idx].mergedStudents;
        const combinedNames = allSiblings.map((x) => x.fullName).join(' و ');
        const combinedGrades = Array.from(new Set(allSiblings.map((x) => `${x.grade}/${x.section}`))).join('، ');
        const vars = {
          studentName: combinedNames,
          studentNumber: allSiblings.map((x) => x.studentNumber).join(', '),
          grade: combinedGrades,
          section: entries[idx].primaryStudent.section,
          date: bulkIncidentDate,
          incidentDate: bulkIncidentDate,
          subject: bulkSubjectText,
          messageBody: bulkBodyMessageText,
          guardianName: primary.name,
        };
        entries[idx].renderedBody = renderMessageVariables(
          activeBulkTemplate?.body || activeBulkTemplate?.sections?.mainBody?.text || '',
          vars
        );
        entries[idx].renderedSubject = renderMessageVariables(
          activeBulkTemplate?.subject || bulkSubjectText,
          vars
        );
        continue;
      }

      const vars = {
        studentName: st.fullName,
        studentNumber: st.studentNumber,
        grade: st.grade,
        section: st.section,
        date: bulkIncidentDate,
        incidentDate: bulkIncidentDate,
        subject: bulkSubjectText,
        messageBody: bulkBodyMessageText,
        guardianName: primary.name,
      };

      const item = {
        primaryStudent: st,
        mergedStudents: [st],
        contact: primary,
        normPhone,
        email,
        emailValid,
        renderedSubject: renderMessageVariables(activeBulkTemplate?.subject || bulkSubjectText, vars),
        renderedBody: renderMessageVariables(
          activeBulkTemplate?.body || activeBulkTemplate?.sections?.mainBody?.text || '',
          vars
        ),
      };

      if (deduplicateSiblings && !guardianKey.startsWith('no-')) {
        seenGuardianKey.set(guardianKey, entries.length);
      }
      entries.push(item);
    }

    return entries;
  }, [
    bulkRawTargetStudents,
    deduplicateSiblings,
    bulkChannel,
    bulkIncidentDate,
    bulkSubjectText,
    bulkBodyMessageText,
    activeBulkTemplate,
  ]);

  // ============================================================================
  // ATTENDANCE & TARDINESS FILTER STATE (`attendance-tardiness`)
  // ============================================================================
  const [attSubTab, setAttSubTab] = useState<'absences' | 'tardiness'>('absences');
  const [attDateFilter, setAttDateFilter] = useState<string>('');
  const [attGradeFilter, setAttGradeFilter] = useState<string>('all');
  const [attSearch, setAttSearch] = useState<string>('');

  // ============================================================================
  // BEHAVIOR NOTICES FILTER STATE (`behavior-notices`)
  // ============================================================================
  const [behGradeFilter, setBehGradeFilter] = useState<string>('all');
  const [behStatusFilter, setBehStatusFilter] = useState<'all' | 'approved' | 'draft'>('all');
  const [behSearch, setBehSearch] = useState<string>('');

  // ============================================================================
  // COMMUNICATION LOG & REPORTS FILTER STATE (`communication-log` & `communication-reports`)
  // ============================================================================
  const [logStatusFilter, setLogStatusFilter] = useState<string>('all');
  const [logChannelFilter, setLogChannelFilter] = useState<string>('all');
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('all');
  const [logGradeFilter, setLogGradeFilter] = useState<string>('all');
  const [logStaffFilter, setLogStaffFilter] = useState<string>('all');
  const [logDateFrom, setLogDateFrom] = useState<string>('');
  const [logDateTo, setLogDateTo] = useState<string>('');
  const [logSearch, setLogSearch] = useState<string>('');

  // Filtered logs for Log & Reports
  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return logs.filter((l) => {
      if (logStatusFilter !== 'all' && l.status !== logStatusFilter) return false;
      if (logChannelFilter !== 'all' && l.channel !== logChannelFilter) return false;
      if (logCategoryFilter !== 'all' && l.templateCategory !== logCategoryFilter) return false;
      if (logGradeFilter !== 'all' && l.grade !== logGradeFilter) return false;
      if (logStaffFilter !== 'all' && l.createdByName !== logStaffFilter) return false;
      if (logDateFrom && l.createdAt.slice(0, 10) < logDateFrom) return false;
      if (logDateTo && l.createdAt.slice(0, 10) > logDateTo) return false;
      if (!q) return true;
      return (
        l.studentName.toLowerCase().includes(q) ||
        String(l.studentNumber || '').toLowerCase().includes(q) ||
        String(l.recipientName || '').toLowerCase().includes(q) ||
        String(l.templateName || '').toLowerCase().includes(q) ||
        String(l.messageId || '').toLowerCase().includes(q)
      );
    });
  }, [
    logs,
    logStatusFilter,
    logChannelFilter,
    logCategoryFilter,
    logGradeFilter,
    logStaffFilter,
    logDateFrom,
    logDateTo,
    logSearch,
  ]);

  // Unique staff names in logs
  const uniqueStaffNames = useMemo(
    () => Array.from(new Set(logs.map((l) => l.createdByName).filter(Boolean))),
    [logs]
  );

  // KPI & Analytics calculations (Section XI)
  const analytics = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const dailyCount = logs.filter((l) => l.createdAt.slice(0, 10) === todayStr).length;
    const weeklyCount = logs.filter((l) => l.createdAt >= weekAgo).length;
    const monthlyCount = logs.filter((l) => l.createdAt >= monthAgo).length;

    const byChannel = {
      whatsapp: logs.filter((l) => l.channel === 'whatsapp').length,
      email: logs.filter((l) => l.channel === 'email').length,
    };

    const byCategory = {
      attendance: logs.filter((l) => l.templateCategory === 'attendance').length,
      tardiness: logs.filter((l) => l.templateCategory === 'tardiness').length,
      behavior: logs.filter((l) => l.templateCategory === 'behavior' || l.templateCategory === 'guardianCall').length,
      academic: logs.filter((l) => l.templateCategory === 'positive' || l.templateId?.includes('academic')).length,
      general: logs.filter((l) => l.templateCategory === 'uniformNotice' || l.templateCategory === 'custom').length,
    };

    // Indicator 5: Students with missing or invalid guardian phone & email
    const studentsWithMissingContact = effectiveStudents.filter((s) => {
      const contacts = getStudentNormalizedContacts(s);
      const primary = contacts[0];
      const pNorm = normalizeUaePhone(primary?.phone || s.parentPhone || '', s.nationality);
      const email = (primary?.email || s.parentEmail || s.fatherEmail || s.motherEmail || '').trim();
      return !pNorm.isValid && !isValidEmailFormat(email);
    });

    // Indicator 6: Students most in need of parent communication (high absences, tardies, or violations)
    const topStudentsNeedingContact = effectiveStudents
      .map((s) => {
        const sNum = String(s.studentNumber || '').trim();
        const absCount = absences.filter(
          (a) => a.studentId === s.id || (sNum && String(a.studentNumber || '').trim() === sNum)
        ).length;
        const tardyCount = tardinessRecords.filter(
          (t) => t.studentId === s.id || (sNum && String(t.studentNumber || '').trim() === sNum)
        ).length;
        const violCount = violations.filter(
          (v) => v.studentId === s.id || (sNum && String(v.studentNumber || '').trim() === sNum)
        ).length;
        const commCount = logs.filter(
          (l) => l.studentId === s.id || (sNum && String(l.studentNumber || '').trim() === sNum)
        ).length;
        const totalIncidents = absCount + tardyCount + violCount;
        return {
          student: s,
          absCount,
          tardyCount,
          violCount,
          commCount,
          totalIncidents,
          unnotifiedGap: Math.max(0, totalIncidents - commCount),
        };
      })
      .filter((x) => x.totalIncidents > 0)
      .sort((a, b) => b.unnotifiedGap - a.unnotifiedGap || b.totalIncidents - a.totalIncidents)
      .slice(0, 10);

    // Indicator 7: Messages opened in WhatsApp/Email where staff has not yet confirmed sending
    const openedUnconfirmedLogs = logs.filter(
      (l) => l.status === 'whatsapp_opened' || l.status === 'email_opened'
    );

    const confirmedCount = logs.filter((l) => l.status === 'confirmed_sent').length;

    return {
      dailyCount,
      weeklyCount,
      monthlyCount,
      byChannel,
      byCategory,
      studentsWithMissingContact,
      topStudentsNeedingContact,
      openedUnconfirmedLogs,
      confirmedCount,
    };
  }, [logs, effectiveStudents, absences, tardinessRecords, violations]);

  // Export Communication Logs to Excel (.xlsx) or CSV (.csv)
  const handleExportLogs = (format: 'xlsx' | 'csv') => {
    if (!perms.canExportReports) {
      showHubToast('صلاحيات حسابك لا تسمح بتصدير تقارير التواصل', 'error');
      return;
    }
    const rows = filteredLogs.map((l) => ({
      'معرف الرسالة': l.messageId || l.id,
      'اسم الطالب': l.studentName,
      'رقم الطالب': l.studentNumber,
      'الصف': l.grade,
      'الشعبة': l.section,
      'ولي الأمر المستلم': l.recipientName,
      'صلة القرابة': l.recipientRelation,
      'نوع الرسالة': MESSAGE_CATEGORY_LABELS_AR[l.templateCategory] || l.templateName,
      'القناة': l.channel === 'whatsapp' ? 'واتساب' : 'بريد إلكتروني',
      'الحالة المعتمدة': MESSAGE_STATUS_LABELS_AR[l.status] || l.status,
      'تاريخ الإنشاء': l.createdAt ? new Date(l.createdAt).toLocaleString('ar-AE') : '',
      'وقت فتح القناة': l.openedAt ? new Date(l.openedAt).toLocaleString('ar-AE') : '',
      'وقت تأكيد الإرسال': l.confirmedAt ? new Date(l.confirmedAt).toLocaleString('ar-AE') : '',
      'اسم الموظف': l.createdByName,
      'معرف الواقعة المرتبطة': l.incidentId || l.violationId || l.absenceId || l.tardinessId || '—',
      'وضع اختبار': l.isTestMode ? 'نعم (تجريبي)' : 'لا (فعلي)',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجل التواصل');
    const dateStamp = new Date().toISOString().slice(0, 10);
    if (format === 'xlsx') {
      XLSX.writeFile(wb, `سجل_التواصل_أكاديمية_الفجيرة_${dateStamp}.xlsx`);
    } else {
      XLSX.writeFile(wb, `سجل_التواصل_أكاديمية_الفجيرة_${dateStamp}.csv`, { bookType: 'csv' });
    }
    showHubToast(`تم تصدير (${rows.length}) سجل تواصل بصيغة ${format.toUpperCase()} بنجاح.`, 'success');
  };

  // Status badge helper (Never uses «تم التسليم»!)
  const getStatusBadgeStyle = (status: MessageDeliveryStatus | string) => {
    switch (status) {
      case 'confirmed_sent':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
      case 'whatsapp_opened':
        return 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800';
      case 'email_opened':
        return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
      case 'ready':
        return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
      case 'failed':
        return 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800';
      case 'cancelled':
        return 'bg-slate-200 text-slate-600 border-slate-300 line-through dark:bg-slate-900 dark:text-slate-500';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Toast Notification */}
      {hubToast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-black animate-in fade-in slide-in-from-top-4 duration-200 ${
            hubToast.type === 'error'
              ? 'bg-rose-950 text-white border-rose-500'
              : hubToast.type === 'warning'
              ? 'bg-amber-950 text-white border-amber-400'
              : 'bg-[#0C2340] text-white border-[#C9A227]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
          <span>{hubToast.text}</span>
        </div>
      )}

      {/* Sub-navigation bar for all 9 sub-pages + Sandbox Test Mode Toggle */}
      <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-[#0B2748] dark:text-[#C9A227] flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#006D77] dark:text-[#C9A227]" />
              <span>أقسام مركز التواصل الذكي (9 وحدات معتمدة):</span>
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              صلاحية الحساب: {perms.roleLabelAr}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Safe Sandbox Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsSandboxMode((prev) => !prev);
                showHubToast(
                  !isSandboxMode
                    ? 'تم تفعيل «وضع الاختبار الآمن» ببيانات طلاب وهمية حتى لا يتم إرسال أي رسائل لأولياء أمور حقيقيين.'
                    : 'تم العودة إلى بيانات الطلاب الفعلية في قاعدة البيانات.',
                  !isSandboxMode ? 'warning' : 'success'
                );
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer ${
                isSandboxMode
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>{isSandboxMode ? 'وضع الاختبار الآمن مُفعّل (بيانات وهمية)' : 'تفعيل وضع الاختبار الآمن'}</span>
            </button>

            {onOpenLegacyStudio && (
              <button
                type="button"
                onClick={onOpenLegacyStudio}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0B2748]/10 dark:bg-white/10 text-[#0B2748] dark:text-white hover:bg-[#0B2748]/20 transition-all cursor-pointer"
              >
                فتح الاستوديو المتقدم للنماذج
              </button>
            )}
          </div>
        </div>

        {/* 9 Sub-page Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {COMMUNICATION_SUB_PAGES.map((sp) => {
            const isActive = activeSubPage === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => onSubPageChange(sp.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#006D77] text-white shadow-xs border border-[#C9A227]/40'
                    : 'bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <span>{sp.label}</span>
                {sp.id === 'communication-log' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">
                    {logs.length}
                  </span>
                )}
                {sp.id === 'attendance-tardiness' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 font-mono">
                    {absences.length + tardinessRecords.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sandbox Banner when active */}
      {isSandboxMode && (
        <div className="bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-black text-amber-950 dark:text-amber-200 block">
                وضع الاختبار الآمن نشط حالياً (Safe Sandbox Mode)
              </strong>
              <span className="text-amber-800 dark:text-amber-300">
                يتم الآن عرض 3 طلاب تجريبيين بأرقام وبريد وهمي (`500000001` / `parent.test1@example.com`) لضمان عدم إرسال أي رسائل لأولياء الأمور الحقيقيين أثناء التجربة.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSandboxMode(false)}
            className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-black text-xs cursor-pointer"
          >
            إنهاء وضع الاختبار
          </button>
        </div>
      )}

      {/* =====================================================================
          1. SUB-PAGE: لوحة التواصل الرئيسية (`dashboard`)
         ===================================================================== */}
      {activeSubPage === 'dashboard' && (
        <div className="space-y-5">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">رسائل اليوم / هذا الشهر</span>
                <Send className="w-4 h-4 text-[#006D77]" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics.dailyCount}{' '}
                <span className="text-xs font-bold text-slate-400">/ {analytics.monthlyCount} شهرياً</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                مؤكد الإرسال: {analytics.confirmedCount} رسالة
              </p>
            </div>

            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">توزيع القنوات المعتمدة</span>
                <Phone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
                <span className="text-emerald-700 dark:text-emerald-400">
                  واتساب: {analytics.byChannel.whatsapp}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-blue-700 dark:text-blue-400">
                  بريد: {analytics.byChannel.email}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                مجاني 100% على خطة Firebase Spark
              </p>
            </div>

            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">رسائل فُتحت بانتظار التأكيد</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600">
                {analytics.openedUnconfirmedLogs.length}
              </div>
              <p className="text-[11px] text-slate-500">
                تتطلب تأكيد الموظف بعد الإرسال الفعلي
              </p>
            </div>

            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">نقص بيانات الاتصال</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600">
                {analytics.studentsWithMissingContact.length}
              </div>
              <p className="text-[11px] text-slate-500">
                طلاب بحاجة لتحديث رقم الهاتف أو البريد
              </p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="bg-white dark:bg-[#0C2340] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                الإجراءات السريعة للتواصل مع أولياء الأمور
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                البريد الرسمي: {settings.email || 'mohamedadelfujaca@gmail.com'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => onSubPageChange('new-message')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006D77] bg-slate-50/70 dark:bg-slate-900/50 text-right space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#006D77] dark:text-teal-300">1. رسالة فردية جديدة</span>
                  <Send className="w-4 h-4 text-[#006D77]" />
                </div>
                <p className="text-[11px] text-slate-500">
                  بحث عن طالب بالاسم أو الرقم الطلابي وإرسال واتساب أو بريد فوري مع معاينة مسبقة
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSubPageChange('attendance-tardiness')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006D77] bg-slate-50/70 dark:bg-slate-900/50 text-right space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-amber-700 dark:text-amber-400">
                    2. إشعارات الغياب والتأخير الصباحي
                  </span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  إعداد رسائل أولياء الأمور مباشرة من سجلات الغياب ({absences.length}) والتأخير ({tardinessRecords.length})
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSubPageChange('behavior-notices')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006D77] bg-slate-50/70 dark:bg-slate-900/50 text-right space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-rose-700 dark:text-rose-400">
                    3. إشعارات السلوك والاستدعاء
                  </span>
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  إشعارات تربوية آمنة للمخالفات المعتمدة فقط مع منع إرسال المخالفات المسودة
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSubPageChange('bulk-messages')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006D77] bg-slate-50/70 dark:bg-slate-900/50 text-right space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-indigo-700 dark:text-indigo-400">
                    4. الرسائل الجماعية ودمج الإخوة
                  </span>
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  إرسال لصف أو شعبة أو غائبي اليوم مع منع تكرار الرسالة لولي الأمر الذي لديه أكثر من طالب
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSubPageChange('templates')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006D77] bg-slate-50/70 dark:bg-slate-900/50 text-right space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-teal-700 dark:text-teal-400">
                    5. القوالب الرسمية الـ 6 القابلة للتعديل
                  </span>
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  غياب، تأخير، ملاحظة سلوكية، استدعاء، ملاحظة أكاديمية، وإعلان عام
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSubPageChange('communication-reports')}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#006D77] bg-slate-50/70 dark:bg-slate-900/50 text-right space-y-1 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-purple-700 dark:text-purple-400">
                    6. تقارير ومؤشرات التواصل (Excel / CSV)
                  </span>
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  إحصاءات التواصل وتصدير التقارير المعتمدة ومتابعة الرسائل غير المؤكدة
                </p>
              </button>
            </div>
          </div>

          {/* Unconfirmed Messages Alert Table (if any) */}
          {analytics.openedUnconfirmedLogs.length > 0 && (
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>
                    رسائل فُتحت في واتساب أو البريد ولم يؤكد الموظف إرسالها بعد ({analytics.openedUnconfirmedLogs.length})
                  </span>
                </h3>
                <span className="text-[11px] text-amber-800 dark:text-amber-300">
                  لا تُعتبر الرسالة مُرسلة فعلياً إلا بعد النقر على «تأكيد الإرسال»
                </span>
              </div>
              <div className="space-y-2">
                {analytics.openedUnconfirmedLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/70 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <strong className="font-black text-slate-900 dark:text-white">{log.studentName}</strong>
                      <span className="text-slate-500 mx-1.5 font-mono">(#{log.studentNumber})</span>
                      <span className="text-slate-600 dark:text-slate-300">
                        — {log.templateName} ({log.channel === 'whatsapp' ? 'واتساب' : 'بريد'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        فُتحت: {new Date(log.openedAt || log.createdAt).toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleManualConfirmSent(log)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تأكيد الإرسال الفعلي</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          2. SUB-PAGE: رسالة جديدة (`new-message`)
         ===================================================================== */}
      {activeSubPage === 'new-message' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Right Column: Student Search & Selection (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3.5 flex flex-col max-h-[780px]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#006D77]" />
                <span>بحث واختيار الطالب ({filteredStudents.length})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">كافة الصفوف (5 - 12)</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="الاسم الكامل أو الجزئي، رقم الطالب، الصف..."
                className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:outline-hidden focus:border-[#006D77]"
              />
            </div>

            {/* Dynamic Grade & Section Filters */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setSectionFilter('all');
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
              >
                <option value="all">جميع الصفوف ({availableGrades.length})</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    الصف {g}
                  </option>
                ))}
              </select>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
              >
                <option value="all">جميع الشعب</option>
                {availableSectionsForGrade.map((sec) => (
                  <option key={sec} value={sec}>
                    شعبة {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {filteredStudents.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  لا يوجد طلاب مطابقون لمعايير البحث الحالية.
                </div>
              ) : (
                filteredStudents.slice(0, 80).map((st) => {
                  const isSelected = activeStudent?.id === st.id;
                  const pNorm = normalizeUaePhone(st.parentPhone || '', st.nationality);
                  const hasEmail = isValidEmailFormat(
                    st.parentEmail || st.fatherEmail || st.motherEmail || ''
                  );
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudentId(st.id);
                        setLinkedIncident(null);
                        setActiveSessionLog(null);
                      }}
                      className={`w-full text-right p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#006D77]/10 dark:bg-[#006D77]/25 border-[#006D77] shadow-2xs'
                          : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {st.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[#006D77] dark:text-teal-400 font-bold">
                            #{st.studentNumber}
                          </span>
                          <span>•</span>
                          <span>
                            {st.grade} / {st.section}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          title={pNorm.isValid ? `واتساب صالح: ${pNorm.e164}` : 'رقم الهاتف غير صالح أو ناقص'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                            pNorm.isValid
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                          }`}
                        >
                          <Phone className="w-3 h-3" />
                        </span>
                        <span
                          title={hasEmail ? 'بريد إلكتروني متوفر' : 'البريد الإلكتروني غير متوفر'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                            hasEmail
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-200 text-slate-400 dark:bg-slate-800'
                          }`}
                        >
                          <Mail className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Left Column: Student Contact Card + Template & Live Preview + Send Actions (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeStudent ? (
              <>
                {/* 1. Student & Guardian Data Verification Card (Section III.2 & III.3) */}
                <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0B2748] text-[#C9A227] flex items-center justify-center font-black text-sm">
                        {activeStudent.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">
                            {activeStudent.fullName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-[#006D77]/10 text-[#006D77] dark:text-teal-300 font-mono text-xs font-black">
                            رقم الطالب الثابت: #{activeStudent.studentNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                            الصف {activeStudent.grade} — الشعبة {activeStudent.section}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ولي الأمر المسجل: <strong>{activeContact?.name || activeStudent.parentName || 'غير محدد'}</strong>{' '}
                          ({activeContact?.relation || activeStudent.guardianRelation || 'ولي الأمر'})
                        </p>
                      </div>
                    </div>

                    {onOpenStudentProfile && !isSandboxMode && (
                      <button
                        type="button"
                        onClick={() => onOpenStudentProfile(activeStudent.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>فتح ملف الطالب الموحد</span>
                      </button>
                    )}
                  </div>

                  {/* Authorized Guardian Selector + Phone & Email Validation Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        جهة الاتصال المخوّلة بالاستلام:
                      </label>
                      <select
                        value={selectedContactId}
                        onChange={(e) => setSelectedContactId(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                      >
                        {activeStudentContacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.relation})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Phone Status */}
                    <div
                      className={`p-2.5 rounded-xl border ${
                        renderedComposer.phoneNorm.isValid
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">رقم واتساب الدولي:</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            renderedComposer.phoneNorm.isValid
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {renderedComposer.phoneNorm.isValid ? 'صالح للفتح' : 'غير صالح / ناقص'}
                        </span>
                      </div>
                      <div className="font-mono font-black text-xs mt-1" dir="ltr">
                        {perms.canViewFullContactInfo
                          ? renderedComposer.phoneNorm.e164 || renderedComposer.phoneNorm.raw || 'غير متوفر'
                          : maskPhone(renderedComposer.phoneNorm.e164 || renderedComposer.phoneNorm.raw)}
                      </div>
                      {renderedComposer.phoneNorm.validationNotice && (
                        <p className="text-[10px] text-amber-800 dark:text-amber-300 mt-0.5">
                          {renderedComposer.phoneNorm.validationNotice}
                        </p>
                      )}
                    </div>

                    {/* Email Status */}
                    <div
                      className={`p-2.5 rounded-xl border ${
                        renderedComposer.emailValid
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">البريد الإلكتروني:</span>
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            renderedComposer.emailValid
                              ? 'bg-blue-600 text-white'
                              : 'bg-amber-600 text-white'
                          }`}
                        >
                          {renderedComposer.emailValid ? 'صالح (mailto)' : 'غير مسجل'}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-xs mt-1 truncate" dir="ltr">
                        {renderedComposer.email
                          ? perms.canViewFullContactInfo
                            ? renderedComposer.email
                            : maskEmail(renderedComposer.email)
                          : 'غير متوفر في ملف الطالب'}
                      </div>
                    </div>
                  </div>

                  {/* Linked Incident Banner if triggered from Absence / Tardiness / Violation */}
                  {linkedIncident && (
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-[#006D77] flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#006D77]" />
                        <span>
                          مرتبط بالواقعة الأصلية: <strong>{linkedIncident.label}</strong> — بتاريخ{' '}
                          <span className="font-mono">{linkedIncident.date}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkedIncident(null)}
                        className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        إلغاء ربط الواقعة
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Template Selector & Message Editor */}
                <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                        اختر قالب الرسالة المعتمد (6 قوالب رسمية قابلة للتعديل):
                      </label>
                      <select
                        value={composerTemplateId}
                        onChange={(e) => setComposerTemplateId(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                      >
                        {officialTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {FUJAIRAH_OFFICIAL_TEMPLATE_IDS.includes(t.id) ? '★ ' : ''}
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                        تاريخ الواقعة / الرسالة (`{'{date}'}`):
                      </label>
                      <input
                        type="date"
                        value={composerDate}
                        onChange={(e) => setComposerDate(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Extra variable inputs for Academic Note (`{subject}`) or General Announcement (`{messageBody}`) */}
                  {(composerTemplateId === 'tpl-fujairah-academic-note' ||
                    composerBodyText.includes('{subject}')) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        المادة الدراسية أو الموضوع الأكاديمي (`{'{subject}'}`):
                      </label>
                      <input
                        type="text"
                        value={composerAcademicSubject}
                        onChange={(e) => setComposerAcademicSubject(e.target.value)}
                        placeholder="مثال: الرياضيات / الفيزياء / اللغة العربية..."
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      />
                    </div>
                  )}

                  {(composerTemplateId === 'tpl-fujairah-general-announcement' ||
                    composerBodyText.includes('{messageBody}')) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        نص الإعلان العام (`{'{messageBody}'}`):
                      </label>
                      <textarea
                        rows={2}
                        value={composerGeneralBody}
                        onChange={(e) => setComposerGeneralBody(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                      />
                    </div>
                  )}

                  {/* Editable Subject & Body */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          عنوان البريد الإلكتروني (Subject):
                        </label>
                        <input
                          type="text"
                          value={composerEmailSubject}
                          onChange={(e) => setComposerEmailSubject(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          نص القالب (قابل للتعديل قبل الإرسال):
                        </label>
                        <textarea
                          rows={8}
                          value={composerBodyText}
                          onChange={(e) => setComposerBodyText(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs leading-relaxed"
                        />
                      </div>
                    </div>

                    {/* Live Preview Box before sending */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#006D77] dark:text-teal-300 flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>معاينة الرسالة النهائية قبل الإرسال:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(renderedComposer.body);
                            setCopiedText(true);
                            setTimeout(() => setCopiedText(false), 2000);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText ? 'تم النسخ' : 'نسخ النص'}</span>
                        </button>
                      </div>

                      <div className="bg-[#0B141A] rounded-2xl p-4 border border-slate-800 space-y-2">
                        <div className="text-[11px] text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                          الموضوع: {renderedComposer.subject}
                        </div>
                        <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tr-xs text-xs leading-relaxed whitespace-pre-wrap">
                          {renderWhatsAppFormattedText(renderedComposer.body)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Send Action Buttons (WhatsApp wa.me & Email mailto:) + Manual Confirmation */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleOpenCommunicationChannel('whatsapp', false)}
                        disabled={!renderedComposer.phoneNorm.isValid}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>فتح واتساب (wa.me)</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCommunicationChannel('email', false)}
                        disabled={!renderedComposer.emailValid}
                        className="px-4 py-2.5 rounded-xl bg-[#0B2748] hover:bg-[#163a66] disabled:opacity-40 text-white font-black text-xs flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Mail className="w-4 h-4 text-[#C9A227]" />
                        <span>فتح البريد الإلكتروني (mailto)</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                      </button>
                    </div>

                    {/* Manual Confirmation Button when a message has been opened in this session */}
                    {activeSessionLog && (
                      <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          الحالة الحالية:{' '}
                          <strong className="text-emerald-700 dark:text-emerald-300">
                            {MESSAGE_STATUS_LABELS_AR[activeSessionLog.status]}
                          </strong>
                        </span>
                        {activeSessionLog.status !== 'confirmed_sent' && (
                          <button
                            type="button"
                            onClick={() => handleManualConfirmSent(activeSessionLog)}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>تأكيد الإرسال يدوياً بعد الإرسال الفعلي</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-10 text-center text-xs text-slate-400">
                يرجى اختيار طالب من القائمة اليمنى للبدء في إعداد الرسالة.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. SUB-PAGE: رسائل الغياب والتأخير (`attendance-tardiness`)
         ===================================================================== */}
      {activeSubPage === 'attendance-tardiness' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span>إشعارات الغياب اليومي والتأخير الصباحي المرتبطة بالوقائع</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ربط مباشر بسجلات الغياب والتأخير الصباحي المعتمدة مع منع تكرار الإشعار لنفس الواقعة دون قصد
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAttSubTab('absences')}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  attSubTab === 'absences'
                    ? 'bg-[#006D77] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                سجلات الغياب اليومي ({absences.length})
              </button>
              <button
                type="button"
                onClick={() => setAttSubTab('tardiness')}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  attSubTab === 'tardiness'
                    ? 'bg-[#006D77] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                سجلات التأخير الصباحي ({tardinessRecords.length})
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={attSearch}
              onChange={(e) => setAttSearch(e.target.value)}
              placeholder="بحث باسم الطالب أو الرقم الطلابي..."
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <select
              value={attGradeFilter}
              onChange={(e) => setAttGradeFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع الصفوف</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  الصف {g}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={attDateFilter}
              onChange={(e) => setAttDateFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
            />
          </div>

          {/* Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 font-black">الطالب</th>
                  <th className="p-3 font-black">رقم الطالب</th>
                  <th className="p-3 font-black">الصف / الشعبة</th>
                  <th className="p-3 font-black">التاريخ</th>
                  <th className="p-3 font-black">نوع الواقعة</th>
                  <th className="p-3 font-black">حالة إشعار ولي الأمر</th>
                  <th className="p-3 font-black">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(attSubTab === 'absences' ? absences : tardinessRecords)
                  .filter((rec: any) => {
                    if (attDateFilter && rec.date !== attDateFilter) return false;
                    if (attGradeFilter !== 'all' && rec.grade !== attGradeFilter) return false;
                    if (!attSearch.trim()) return true;
                    const q = attSearch.trim().toLowerCase();
                    return (
                      String(rec.studentName || '').toLowerCase().includes(q) ||
                      String(rec.studentNumber || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 60)
                  .map((rec: any) => {
                    const matchedStudent = students.find(
                      (s) =>
                        s.id === rec.studentId ||
                        String(s.studentNumber || '').trim() === String(rec.studentNumber || '').trim()
                    );
                    const existingLog = logs.find(
                      (l) =>
                        l.incidentId === rec.id ||
                        l.absenceId === rec.id ||
                        l.tardinessId === rec.id ||
                        (l.studentNumber === rec.studentNumber &&
                          l.incidentDate === rec.date &&
                          l.templateCategory === (attSubTab === 'absences' ? 'attendance' : 'tardiness'))
                    );

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-black text-slate-900 dark:text-white">{rec.studentName}</td>
                        <td className="p-3 font-mono text-[#006D77] dark:text-teal-400 font-bold">
                          #{rec.studentNumber || matchedStudent?.studentNumber || '—'}
                        </td>
                        <td className="p-3">
                          {rec.grade} / {rec.section}
                        </td>
                        <td className="p-3 font-mono">{rec.date}</td>
                        <td className="p-3">
                          {attSubTab === 'absences' ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
                              غياب ({rec.absenceType || 'بدون عذر'})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                              تأخير صباحي ({rec.arrivalTime || 'صباحي'})
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {existingLog ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(
                                existingLog.status
                              )}`}
                            >
                              {MESSAGE_STATUS_LABELS_AR[existingLog.status]} ({existingLog.channel === 'whatsapp' ? 'واتساب' : 'بريد'})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لم يُرسل إشعار بعد</span>
                          )}
                        </td>
                        <td className="p-3">
                          {matchedStudent ? (
                            <button
                              type="button"
                              onClick={() =>
                                handlePrepareIncidentNotice({
                                  student: matchedStudent,
                                  incidentId: rec.id,
                                  incidentType: attSubTab === 'absences' ? 'absence' : 'tardiness',
                                  date: rec.date,
                                  templateId:
                                    attSubTab === 'absences'
                                      ? 'tpl-fujairah-absence'
                                      : 'tpl-fujairah-morning-tardiness',
                                  label:
                                    attSubTab === 'absences'
                                      ? `غياب يومي بتاريخ ${rec.date}`
                                      : `تأخير صباحي بتاريخ ${rec.date}`,
                                })
                              }
                              className="px-3 py-1.5 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-[#C9A227]" />
                              <span>
                                {existingLog ? 'إعادة فتح / محاولة جديدة' : 'إعداد إشعار ولي الأمر'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-rose-500 text-[11px]">الطالب غير موجود بالسجل</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. SUB-PAGE: إشعارات السلوك (`behavior-notices`)
         ===================================================================== */}
      {activeSubPage === 'behavior-notices' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-600" />
                <span>إشعارات السلوك والاستدعاء التربوي (حماية الخصوصية)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تُرسل للمخالفات المعتمدة فقط باستخدام صياغة تربوية محترمة خالية من التفاصيل الحساسة، ويُمنع إرسال أي مخالفة في حالة «مسودة»
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={behSearch}
              onChange={(e) => setBehSearch(e.target.value)}
              placeholder="بحث باسم الطالب أو نوع المخالفة..."
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <select
              value={behGradeFilter}
              onChange={(e) => setBehGradeFilter(e.target.value)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع الصفوف</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  الصف {g}
                </option>
              ))}
            </select>
            <select
              value={behStatusFilter}
              onChange={(e) => setBehStatusFilter(e.target.value as any)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع الحالات (المعتمدة والمسودات)</option>
              <option value="approved">المخالفات المعتمدة فقط (مسموح الإشعار)</option>
              <option value="draft">المسودات غير المعتمدة (محظور الإشعار)</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 font-black">الطالب</th>
                  <th className="p-3 font-black">الصف / الشعبة</th>
                  <th className="p-3 font-black">التاريخ</th>
                  <th className="p-3 font-black">المخالفة والدرجة</th>
                  <th className="p-3 font-black">حالة الاعتماد</th>
                  <th className="p-3 font-black">حالة إشعار ولي الأمر</th>
                  <th className="p-3 font-black">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {violations
                  .filter((v) => {
                    const isDraft = !v.status || v.status === 'مسودة';
                    if (behStatusFilter === 'approved' && isDraft) return false;
                    if (behStatusFilter === 'draft' && !isDraft) return false;
                    if (behGradeFilter !== 'all' && v.grade !== behGradeFilter) return false;
                    if (!behSearch.trim()) return true;
                    const q = behSearch.trim().toLowerCase();
                    return (
                      v.studentName.toLowerCase().includes(q) ||
                      String(v.studentNumber || '').toLowerCase().includes(q) ||
                      v.violationType.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 60)
                  .map((v) => {
                    const isDraft = !v.status || v.status === 'مسودة';
                    const matchedStudent = students.find(
                      (s) =>
                        s.id === v.studentId ||
                        String(s.studentNumber || '').trim() === String(v.studentNumber || '').trim()
                    );
                    const existingLog = logs.find(
                      (l) => l.violationId === v.id || l.incidentId === v.id
                    );

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="p-3 font-black text-slate-900 dark:text-white">
                          {v.studentName}{' '}
                          <span className="font-mono text-[11px] text-slate-400">#{v.studentNumber}</span>
                        </td>
                        <td className="p-3">
                          {v.grade} / {v.section}
                        </td>
                        <td className="p-3 font-mono">{v.date}</td>
                        <td className="p-3">
                          <span className="font-bold">{v.violationType}</span>{' '}
                          <span className="text-[10px] text-slate-500">({v.violationDegree})</span>
                        </td>
                        <td className="p-3">
                          {isDraft ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px]">
                              مسودة (غير معتمدة)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px]">
                              ✓ {v.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {existingLog ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(
                                existingLog.status
                              )}`}
                            >
                              {MESSAGE_STATUS_LABELS_AR[existingLog.status]}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لم يُرسل</span>
                          )}
                        </td>
                        <td className="p-3">
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                              <Ban className="w-3.5 h-3.5" />
                              <span>محظور قبل اعتماد المخالفة</span>
                            </span>
                          ) : matchedStudent ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handlePrepareIncidentNotice({
                                    student: matchedStudent,
                                    incidentId: v.id,
                                    incidentType: 'violation',
                                    date: v.date,
                                    templateId: 'tpl-fujairah-behavior-notice',
                                    label: `ملاحظة سلوكية معتمدة (${v.date})`,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white font-black text-[11px] cursor-pointer"
                              >
                                إشعار سلوكي آمن
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePrepareIncidentNotice({
                                    student: matchedStudent,
                                    incidentId: v.id,
                                    incidentType: 'violation',
                                    date: v.date,
                                    templateId: 'tpl-fujairah-summon',
                                    label: `استدعاء ولي أمر (${v.date})`,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-[#0B2748] hover:bg-[#163a66] text-[#C9A227] font-black text-[11px] cursor-pointer"
                              >
                                استدعاء ولي أمر
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. SUB-PAGE: الرسائل الجماعية (`bulk-messages`)
         ===================================================================== */}
      {activeSubPage === 'bulk-messages' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#006D77]" />
                <span>نظام الرسائل الجماعية الذكي مع دمج الإخوة وحماية الخصوصية</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يدعم اختيار صف كامل، شعبة كاملة، الغائبين أو المتأخرين في تاريخ محدد، مع منع إرسال بيانات سلوكية حساسة جماعياً
              </p>
            </div>
          </div>

          {/* Criteria Selector */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                1. معيار اختيار المستلمين:
              </label>
              <select
                value={bulkCriteria}
                onChange={(e) => setBulkCriteria(e.target.value as BulkTargetCriteria)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
              >
                <option value="grade">صف دراسي كامل</option>
                <option value="section">شعبة دراسية كاملة</option>
                <option value="absent_on_date">الطلاب الغائبون في تاريخ محدد</option>
                <option value="tardy_on_date">الطلاب المتأخرون في تاريخ محدد</option>
                <option value="academic_followup">طلاب يحتاجون متابعة أكاديمية</option>
              </select>
            </div>

            {(bulkCriteria === 'grade' || bulkCriteria === 'section') && (
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  اختر الصف الدراسي:
                </label>
                <select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="all">جميع الصفوف</option>
                  {availableGrades.map((g) => (
                    <option key={g} value={g}>
                      الصف {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {bulkCriteria === 'section' && (
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  اختر الشعبة:
                </label>
                <select
                  value={bulkSection}
                  onChange={(e) => setBulkSection(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="all">جميع الشعب</option>
                  {extractDynamicSections(effectiveStudents, bulkGrade).map((sec) => (
                    <option key={sec} value={sec}>
                      شعبة {sec}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(bulkCriteria === 'absent_on_date' || bulkCriteria === 'tardy_on_date') && (
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الغياب / التأخير:
                </label>
                <input
                  type="date"
                  value={bulkIncidentDate}
                  onChange={(e) => setBulkIncidentDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                القالب المسموح جماعياً:
              </label>
              <select
                value={bulkTemplateId}
                onChange={(e) => setBulkTemplateId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
              >
                {bulkAllowedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sibling Deduplication & Channel Options */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={deduplicateSiblings}
                onChange={(e) => setDeduplicateSiblings(e.target.checked)}
                className="w-4 h-4 accent-[#006D77]"
              />
              <span>
                منع تكرار الرسالة لولي الأمر الذي لديه أكثر من طالب في القائمة (دمج الإخوة تلقائياً)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">إجمالي الطلاب: {bulkRawTargetStudents.length}</span>
              <span>•</span>
              <span className="font-black text-[#006D77] dark:text-teal-300">
                أولياء الأمور الفعليون بعد منع التكرار: {bulkRecipientEntries.length}
              </span>
            </div>
          </div>

          {/* Bulk Message Content Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عنوان الرسالة أو المادة (`{'{subject}'}`):
              </label>
              <input
                type="text"
                value={bulkSubjectText}
                onChange={(e) => setBulkSubjectText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نص الإعلان العام (`{'{messageBody}'}`):
              </label>
              <input
                type="text"
                value={bulkBodyMessageText}
                onChange={(e) => setBulkBodyMessageText(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Bulk Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Open Sequential WhatsApp Queue */}
              <button
                type="button"
                onClick={() => {
                  if (!perms.canSendBulk) {
                    showHubToast('صلاحيات حسابك لا تسمح بإرسال رسائل جماعية', 'error');
                    return;
                  }
                  if (bulkRecipientEntries.length === 0) {
                    showHubToast('لا يوجد طلاب في القائمة الحالية', 'warning');
                    return;
                  }
                  const qItems: QueueItem[] = bulkRecipientEntries.map((entry) => ({
                    student: entry.primaryStudent,
                    contact: entry.contact,
                    renderedText: entry.renderedBody,
                    renderedSubject: entry.renderedSubject,
                    status: 'pending',
                  }));
                  onOpenBulkWhatsAppQueue(qItems, activeBulkTemplate, 'whatsapp');
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Phone className="w-4 h-4" />
                <span>تشغيل طابور واتساب التتابعي ({bulkRecipientEntries.length} ولي أمر)</span>
              </button>

              {/* Privacy-Safe BCC Email for General Announcements */}
              <button
                type="button"
                onClick={() => {
                  if (!perms.canSendBulk) {
                    showHubToast('صلاحيات حسابك لا تسمح بإرسال رسائل جماعية', 'error');
                    return;
                  }
                  const validEmails = bulkRecipientEntries
                    .filter((e) => e.emailValid)
                    .map((e) => e.email);
                  if (validEmails.length === 0) {
                    showHubToast('لا توجد عناوين بريد إلكتروني صالحة في القائمة المحددة', 'warning');
                    return;
                  }
                  const sampleBody = bulkRecipientEntries[0]?.renderedBody || bulkBodyMessageText;
                  const bccLink = buildBccMailtoLink(
                    settings.email || 'mohamedadelfujaca@gmail.com',
                    validEmails,
                    bulkSubjectText,
                    sampleBody
                  );
                  window.open(bccLink, '_blank', 'noopener,noreferrer');
                  showHubToast(
                    `تم فتح البريد الجماعي الآمن (BCC) لعدد (${validEmails.length}) ولي أمر مع إخفاء عناوينهم عن بعضهم.`,
                    'success'
                  );
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0B2748] hover:bg-[#163a66] text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Mail className="w-4 h-4 text-[#C9A227]" />
                <span>فتح بريد إلكتروني جماعي آمن (BCC للإعلانات العامة)</span>
              </button>
            </div>
          </div>

          {/* Preview of Deduplicated Recipients Table */}
          <div className="overflow-x-auto max-h-[380px]">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5 font-black">#</th>
                  <th className="p-2.5 font-black">الطالب / الإخوة المدمجون</th>
                  <th className="p-2.5 font-black">الصف والشعبة</th>
                  <th className="p-2.5 font-black">ولي الأمر</th>
                  <th className="p-2.5 font-black">رقم واتساب</th>
                  <th className="p-2.5 font-black">البريد الإلكتروني</th>
                  <th className="p-2.5 font-black">إرسال فردي سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bulkRecipientEntries.slice(0, 50).map((entry, idx) => (
                  <tr key={entry.primaryStudent.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                    <td className="p-2.5 font-mono">{idx + 1}</td>
                    <td className="p-2.5 font-black text-slate-900 dark:text-white">
                      {entry.mergedStudents.map((s) => s.fullName).join(' + ')}
                      {entry.mergedStudents.length > 1 && (
                        <span className="mr-1.5 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                          دمج {entry.mergedStudents.length} إخوة
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      {entry.primaryStudent.grade} / {entry.primaryStudent.section}
                    </td>
                    <td className="p-2.5">
                      {entry.contact.name} ({entry.contact.relation})
                    </td>
                    <td className="p-2.5 font-mono" dir="ltr">
                      {entry.normPhone.isValid ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          {perms.canViewFullContactInfo ? entry.normPhone.e164 : maskPhone(entry.normPhone.e164)}
                        </span>
                      ) : (
                        <span className="text-rose-500">غير صالح</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono" dir="ltr">
                      {entry.emailValid ? (
                        <span className="text-blue-700 dark:text-blue-400">
                          {perms.canViewFullContactInfo ? entry.email : maskEmail(entry.email)}
                        </span>
                      ) : (
                        <span className="text-slate-400">غير مسجل</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {entry.normPhone.isValid && (
                          <button
                            type="button"
                            onClick={() => {
                              const url = buildWhatsAppLink(entry.normPhone.e164, entry.renderedBody);
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                          >
                            واتساب
                          </button>
                        )}
                        {entry.emailValid && (
                          <button
                            type="button"
                            onClick={() => {
                              const url = buildMailtoLink(
                                entry.email,
                                entry.renderedSubject,
                                entry.renderedBody
                              );
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#0B2748] text-white font-bold text-[11px] cursor-pointer"
                          >
                            بريد
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. SUB-PAGE: قوالب الرسائل (`templates`)
         ===================================================================== */}
      {activeSubPage === 'templates' && (
        <div className="space-y-5">
          {/* Highlight the 6 Official Fujairah Templates */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C9A227]" />
                <span>القوالب الرسمية الستة المعتمدة لأكاديمية الفجيرة العلمية الإسلامية</span>
              </h2>
              <span className="text-xs text-slate-500">محفوظة في مجموعة `messageTemplates` وقابلة للتعديل</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates
                .filter((t) => FUJAIRAH_OFFICIAL_TEMPLATE_IDS.includes(t.id))
                .map((tpl, idx) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-[#0B2748] text-[#C9A227] font-black text-[10px]">
                          قالب رسمي #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setComposerTemplateId(tpl.id);
                            onSubPageChange('new-message');
                          }}
                          className="text-[11px] font-black text-[#006D77] dark:text-teal-300 hover:underline cursor-pointer"
                        >
                          استخدام القالب ←
                        </button>
                      </div>
                      <h3 className="font-black text-xs text-slate-900 dark:text-white">{tpl.name}</h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-line line-clamp-4 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                        {tpl.body}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Full Template Management Manager */}
          {onRenderTemplatesManager()}
        </div>
      )}

      {/* =====================================================================
          7. SUB-PAGE: سجل التواصل (`communication-log`)
         ===================================================================== */}
      {activeSubPage === 'communication-log' && (
        <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#006D77]" />
                <span>سجل التواصل الموحد والتدقيق (`messageLogs` — {filteredLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يوثق تاريخ الفتح، وتاريخ تأكيد الموظف للإرسال، والواقعة المرتبطة، مع عدم استخدام عبارة «تم التسليم» إلا عند الربط بواجهة رسمية
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="بحث باسم الطالب، الرقم الطلابي، المستلم..."
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
            />
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع الحالات الـ 7</option>
              <option value="draft">مسودة</option>
              <option value="ready">جاهزة للإرسال</option>
              <option value="whatsapp_opened">تم فتح واتساب</option>
              <option value="email_opened">تم فتح البريد</option>
              <option value="confirmed_sent">أكد الموظف الإرسال</option>
              <option value="failed">فشل أو تعذر الفتح</option>
              <option value="cancelled">ملغاة</option>
            </select>
            <select
              value={logChannelFilter}
              onChange={(e) => setLogChannelFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع القنوات</option>
              <option value="whatsapp">واتساب رسمي</option>
              <option value="email">بريد إلكتروني</option>
            </select>
            <select
              value={logGradeFilter}
              onChange={(e) => setLogGradeFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع الصفوف</option>
              {availableGrades.map((g) => (
                <option key={g} value={g}>
                  الصف {g}
                </option>
              ))}
            </select>
            <select
              value={logStaffFilter}
              onChange={(e) => setLogStaffFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
            >
              <option value="all">جميع الموظفين</option>
              {uniqueStaffNames.map((stName) => (
                <option key={stName} value={stName}>
                  {stName}
                </option>
              ))}
            </select>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3 font-black">الطالب</th>
                  <th className="p-3 font-black">ولي الأمر والصلة</th>
                  <th className="p-3 font-black">النوع والقناة</th>
                  <th className="p-3 font-black">الحالة المعتمدة</th>
                  <th className="p-3 font-black">وقت الفتح / التأكيد</th>
                  <th className="p-3 font-black">الموظف</th>
                  <th className="p-3 font-black">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      لا توجد سجلات تواصل مطابقة للفلاتر المحددة.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.slice(0, 80).map((log) => {
                    const isOwner = log.createdBy === currentUser?.uid;
                    const canModify = isOwner || perms.canModifyOtherStaffLogs;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="p-3">
                          <div className="font-black text-slate-900 dark:text-white">
                            {log.studentName}
                            {log.isTestMode && (
                              <span className="mr-1 px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[10px]">
                                تجريبي
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            #{log.studentNumber} • {log.grade}/{log.section}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold">{log.recipientName}</div>
                          <div className="text-[11px] text-slate-500">
                            {log.recipientRelation} •{' '}
                            <span className="font-mono" dir="ltr">
                              {log.channel === 'whatsapp'
                                ? perms.canViewFullContactInfo
                                  ? log.recipientPhoneFull || log.recipientPhoneMasked
                                  : log.recipientPhoneMasked
                                : perms.canViewFullContactInfo
                                ? log.recipientEmailFull || log.recipientEmailMasked
                                : log.recipientEmailMasked}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold">{log.templateName}</div>
                          <div className="text-[11px] text-slate-500">
                            {log.channel === 'whatsapp' ? 'واتساب رسمي' : 'بريد إلكتروني'}
                            {(log.incidentId || log.violationId || log.absenceId || log.tardinessId) && (
                              <span className="mr-1 text-[#006D77] font-mono">
                                • واقعة #{log.incidentId || log.violationId || log.absenceId || log.tardinessId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${getStatusBadgeStyle(
                              log.status
                            )}`}
                          >
                            {MESSAGE_STATUS_LABELS_AR[log.status] || log.status}
                          </span>
                          {(log.retryCount || 0) > 0 && (
                            <div className="text-[10px] text-amber-600 mt-1">
                              إعادة محاولة ({log.retryCount})
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          <div>
                            فتح:{' '}
                            {new Date(log.openedAt || log.createdAt).toLocaleString('ar-AE', {
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {log.confirmedAt && (
                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                              تأكيد:{' '}
                              {new Date(log.confirmedAt).toLocaleString('ar-AE', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-bold">{log.createdByName}</div>
                        </td>
                        <td className="p-3">
                          {canModify ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {log.status !== 'confirmed_sent' && log.status !== 'cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => handleManualConfirmSent(log)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer"
                                >
                                  تأكيد الإرسال
                                </button>
                              )}
                              {log.status !== 'cancelled' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await updateMessageLogStatus(
                                      schoolId,
                                      log.id,
                                      'cancelled',
                                      undefined,
                                      {
                                        notes: 'إلغاء موثق بواسطة الموظف',
                                        actorUid: currentUser?.uid,
                                        actorName: currentUser?.displayName || undefined,
                                        actorRole: currentUser?.role,
                                      }
                                    );
                                    onLogsChange((prev) =>
                                      prev.map((x) => (x.id === log.id ? { ...x, status: 'cancelled' } : x))
                                    );
                                    showHubToast('تم تحديث حالة الرسالة إلى «ملغاة»', 'warning');
                                  }}
                                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>سجل موظف آخر</span>
                            </span>
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
      )}

      {/* =====================================================================
          8. SUB-PAGE: تقارير التواصل (`communication-reports`)
         ===================================================================== */}
      {activeSubPage === 'communication-reports' && (
        <div className="space-y-5">
          {/* Header + Export Buttons */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#006D77]" />
                <span>التقارير التحليلية ومؤشرات الأداء السبعة للتواصل مع أولياء الأمور</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                تصفية حسب التاريخ أو الموظف أو الصف أو الشعبة أو نوع الرسالة مع تصدير مباشر إلى Excel و CSV
              </p>
            </div>

            {perms.canExportReports && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportLogs('xlsx')}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportLogs('csv')}
                  className="px-4 py-2 rounded-xl bg-[#0B2748] hover:bg-[#163a66] text-[#C9A227] font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

          {/* 7 Indicators Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-black text-[#006D77] dark:text-teal-300">
                1 & 2. حجم الرسائل (يومي / أسبوعي / شهري)
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="text-lg font-black">{analytics.dailyCount}</div>
                  <div className="text-[10px] text-slate-500">اليوم</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="text-lg font-black">{analytics.weeklyCount}</div>
                  <div className="text-[10px] text-slate-500">آخر 7 أيام</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="text-lg font-black">{analytics.monthlyCount}</div>
                  <div className="text-[10px] text-slate-500">آخر 30 يوماً</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-black text-[#006D77] dark:text-teal-300">
                3. توزيع الرسائل حسب النوع
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-900">
                  <span>الغياب:</span>
                  <strong className="font-mono">{analytics.byCategory.attendance}</strong>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-900">
                  <span>التأخير الصباحي:</span>
                  <strong className="font-mono">{analytics.byCategory.tardiness}</strong>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-900">
                  <span>السلوك والاستدعاء:</span>
                  <strong className="font-mono">{analytics.byCategory.behavior}</strong>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-900">
                  <span>أكاديمي وعام:</span>
                  <strong className="font-mono">
                    {analytics.byCategory.academic + analytics.byCategory.general}
                  </strong>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="text-xs font-black text-[#006D77] dark:text-teal-300">
                4 & 7. توزيع القناة والرسائل غير المؤكدة
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40">
                  <span>عبر واتساب (wa.me):</span>
                  <strong className="font-mono text-emerald-700">{analytics.byChannel.whatsapp}</strong>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-blue-50 dark:bg-blue-950/40">
                  <span>عبر البريد الإلكتروني:</span>
                  <strong className="font-mono text-blue-700">{analytics.byChannel.email}</strong>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-amber-50 dark:bg-amber-950/40">
                  <span>فُتحت ولم يؤكد الموظف إرسالها:</span>
                  <strong className="font-mono text-amber-700">{analytics.openedUnconfirmedLogs.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Indicator 5 & 6 Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Indicator 6: Top Students Needing Communication */}
            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white">
                6. الطلاب الأكثر حاجة للتواصل مع أولياء أمورهم
              </h3>
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                      <th className="py-2">الطالب</th>
                      <th className="py-2">الوقائع (غياب/تأخير/سلوك)</th>
                      <th className="py-2">مرات التواصل</th>
                      <th className="py-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics.topStudentsNeedingContact.map((item) => (
                      <tr key={item.student.id}>
                        <td className="py-2 font-bold">
                          {item.student.fullName} ({item.student.grade}/{item.student.section})
                        </td>
                        <td className="py-2 font-mono text-rose-600 font-bold">
                          {item.totalIncidents} ({item.absCount} غ / {item.tardyCount} ت / {item.violCount} س)
                        </td>
                        <td className="py-2 font-mono">{item.commCount}</td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(item.student.id);
                              onSubPageChange('new-message');
                            }}
                            className="text-[11px] font-black text-[#006D77] hover:underline cursor-pointer"
                          >
                            مراسلة الآن
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Indicator 5: Students with missing contact data */}
            <div className="bg-white dark:bg-[#0C2340] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white">
                5. الطلاب الذين تعذر التواصل معهم لنقص بيانات الهاتف والبريد ({analytics.studentsWithMissingContact.length})
              </h3>
              {analytics.studentsWithMissingContact.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-600 font-bold">
                  ✓ جميع الطلاب المسجلين لديهم وسيلة تواصل واحدة صالحة على الأقل.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                        <th className="py-2">الطالب</th>
                        <th className="py-2">رقم الطالب</th>
                        <th className="py-2">الصف / الشعبة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {analytics.studentsWithMissingContact.slice(0, 25).map((st) => (
                        <tr key={st.id}>
                          <td className="py-2 font-bold">{st.fullName}</td>
                          <td className="py-2 font-mono">#{st.studentNumber}</td>
                          <td className="py-2">
                            {st.grade} / {st.section}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          9. SUB-PAGE: إعدادات التواصل (`communication-settings`)
         ===================================================================== */}
      {activeSubPage === 'communication-settings' && (
        <div className="space-y-5">
          {/* Official School Communication Identity */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-[#006D77]" />
                  <span>إعدادات التواصل الرسمية ومصفوفة الصلاحيات (RBAC)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  البريد المعتمد للأكاديمية: <span className="font-mono font-bold">mohamedadelfujaca@gmail.com</span> • خطة Firebase Spark المجانية
                </p>
              </div>
              {perms.canManageSettings && (
                <button
                  type="button"
                  onClick={onOpenSettingsModal}
                  className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white font-black text-xs cursor-pointer"
                >
                  تعديل هوية وتوقيع الرسائل
                </button>
              )}
            </div>

            {/* 7-Role RBAC Matrix Table (Section X) */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                مصفوفة الصلاحيات والأمان المعتمدة في النظام وقواعد Firestore:
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-2.5 font-black">الدور الوظيفي</th>
                      <th className="p-2.5 font-black">الإرسال الفردي</th>
                      <th className="p-2.5 font-black">الإرسال الجماعي</th>
                      <th className="p-2.5 font-black">إدارة القوالب والإعدادات</th>
                      <th className="p-2.5 font-black">تعديل سجلات موظفين آخرين</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-2.5 font-black">1. مدير النظام / مدير المدرسة</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ كافة الفئات</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ مسموح</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ صلاحية كاملة</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ مسموح (إشراف كامل)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-black">2. الأخصائي الاجتماعي / المرشد الطلابي</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ السلوك والاستدعاء والغياب</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ مسموح</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ تعديل القوالب</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ سجلاته فقط</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-black">3. مشرف الحضور والانضباط / شؤون الطلاب</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ الغياب والتأخير والانضباط</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ مسموح (غياب/تأخير/عام)</td>
                      <td className="p-2.5 text-slate-400">عرض فقط</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ سجلاته فقط</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-black">4. المرشد الأكاديمي</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ الملاحظات الأكاديمية والحضور</td>
                      <td className="p-2.5 text-emerald-600 font-bold">✓ مسموح (متابعة أكاديمية)</td>
                      <td className="p-2.5 text-slate-400">عرض فقط</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ سجلاته فقط</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-black">5. المعلم</td>
                      <td className="p-2.5 text-amber-700 font-bold">ملاحظات أكاديمية لطلابه فقط</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ غير مسموح</td>
                      <td className="p-2.5 text-slate-400">عرض فقط</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ سجلاته فقط</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-black">6. القارئ / المشاهد (`viewer`)</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ ممنوع الإرسال</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ ممنوع الإرسال</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ ممنوع</td>
                      <td className="p-2.5 text-rose-600 font-bold">✗ ممنوع (بيانات اتصال مقنّعة)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Phase 2 Optional Google Apps Script Study (Strictly Disabled until explicit approval) */}
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>المرحلة الثانية (اختيارية مستقبلاً — غير مفعّلة): الإرسال التلقائي عبر Google Apps Script</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[11px] border border-amber-300">
                المرحلة الأولى (mailto:) هي المعتمدة حالياً — الإرسال التلقائي متوقف لحين الاعتماد
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              وفقاً لتعليمات الأمان وخطة Firebase Spark المجانية، يعمل النظام حالياً عبر المرحلة الأولى الآمنة (`mailto:` و `https://wa.me/`) دون أي مفاتيح سرية في المتصفح. وفي حال رغبة إدارة الأكاديمية مستقبلاً بتفعيل جسر Google Apps Script المستقل على حساب <span className="font-mono">mohamedadelfujaca@gmail.com</span>، يتوفر القالب المرجعي غير المفعّل أدناه:
            </p>
            <pre
              dir="ltr"
              className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-48"
            >
              {FUJAIRAH_DISABLED_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>

          {onRenderGmailOAuthPanel && perms.canManageSettings && onRenderGmailOAuthPanel()}
        </div>
      )}
    </div>
  );
};
