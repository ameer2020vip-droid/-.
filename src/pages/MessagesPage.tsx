import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MessageSquare,
  Send,
  FileText,
  History,
  Settings as SettingsIcon,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Users,
  Eye,
  Edit3,
  Phone,
  Mail,
  Printer,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Save,
  Search,
  User,
  ShieldCheck,
  Layers,
  CheckCheck,
  Clock,
  LayoutGrid,
  AlertTriangle,
  Star,
  CheckSquare,
  Square,
  X,
  Bold,
  Italic,
  List,
  Pilcrow,
  Minus,
} from 'lucide-react';
import {
  Student,
  MessageTemplate,
  MessageLogRecord,
  SchoolMessageSettings,
  MessageChannel,
  StudentContact,
  MessageCategory,
  ViolationRecord,
  AbsenceRecord,
  TardinessRecord,
  QueueItem,
} from '../types';
import { DEFAULT_MESSAGE_TEMPLATES } from '../data/defaultMessageTemplates';
import {
  fetchMessageTemplates,
  saveMessageTemplate,
  deleteMessageTemplate,
  setDefaultTemplateForCategory,
  fetchMessageLogs,
  createMessageLog,
  updateMessageLogStatus,
  getSchoolMessageSettings,
  saveSchoolMessageSettings,
  renderMessageVariables,
  generatePlainTextVersion,
  validateMessageVariables,
  OFFICIAL_DYNAMIC_VARIABLES,
} from '../firebase/messageService';
import { useSchoolSettings } from '../context/SchoolSettingsContext';
import { TemplateSelector } from '../components/messaging/TemplateSelector';
import { StudentSelector, RecipientTargetType } from '../components/messaging/StudentSelector';
import { MessageEditor, renderWhatsAppFormattedText } from '../components/messaging/MessageEditor';
import { MessagePreview } from '../components/messaging/MessagePreview';
import { WhatsAppQueueModal } from '../components/messaging/WhatsAppQueueModal';
import { MessageLogsTab } from '../components/messaging/MessageLogsTab';
import { MessageSettingsModal } from '../components/messaging/MessageSettingsModal';
import {
  TemplateManagementManager,
  OFFICIAL_TEMPLATE_TYPES,
} from '../components/messaging/TemplateManagementManager';
import {
  getStudentNormalizedContacts,
  normalizeUaePhone,
  buildWhatsAppLink,
  maskPhone,
  maskEmail,
} from '../utils/phoneUtils';
import { GmailOAuthIntegrationPanel } from '../components/GmailOAuthIntegrationPanel';
import { isAuthorizedGmailAdmin } from '../firebase/gmailNotificationService';
import { CommunicationSubPage } from '../components/Navigation';
import { SmartParentCommunicationHub } from '../components/messaging/SmartParentCommunicationHub';

interface MessagesPageProps {
  students: Student[];
  violations?: ViolationRecord[];
  absences?: AbsenceRecord[];
  tardinessRecords?: TardinessRecord[];
  schoolId: string;
  currentUser?: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    role?: string;
  };
  initialStudentId?: string | null;
  initialSelectedStudentIds?: string[];
  initialSelectedViolationIds?: string[];
  initialSubPage?: CommunicationSubPage;
  initialIncident?: {
    type: 'absence' | 'tardiness' | 'violation';
    id: string;
    studentId: string;
    date?: string;
  } | null;
  onClearInitialViolations?: () => void;
  onOpenStudentProfile?: (studentId: string) => void;
  queueItems?: QueueItem[];
  onQueueItemsChange?: (items: QueueItem[]) => void;
}

const WIZARD_STEPS = [
  { id: 1, title: 'اختيار القالب', icon: FileText },
  { id: 2, title: 'تحديد الطلبة', icon: Users },
  { id: 3, title: 'جهة الاستلام والقناة', icon: Phone },
  { id: 4, title: 'تعديل المحتوى', icon: Edit3 },
  { id: 5, title: 'المعاينة الحية', icon: Eye },
  { id: 6, title: 'الإرسال والتوثيق', icon: Send },
];

const MESSAGE_TYPE_BUTTONS: { id: MessageCategory | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'كافة الأنواع', icon: Layers },
  { id: 'behavior', label: 'إشعار مخالفة', icon: ShieldCheck },
  { id: 'guardianCall', label: 'استدعاء ولي أمر', icon: Phone },
  { id: 'attendance', label: 'إنذار غياب', icon: Users },
  { id: 'tardiness', label: 'تأخر صباحي', icon: Clock },
  { id: 'phoneConfiscation', label: 'مصادرة هاتف', icon: AlertTriangle },
  { id: 'committeeDecision', label: 'قرار لجنة السلوك', icon: FileText },
  { id: 'uniformNotice', label: 'تنبيه الزي / عام', icon: CheckCircle2 },
  { id: 'positive', label: 'شكر وتعزيز', icon: Sparkles },
  { id: 'custom', label: 'رسالة مخصصة', icon: Edit3 },
];

export const MessagesPage: React.FC<MessagesPageProps> = ({
  students,
  violations = [],
  absences = [],
  tardinessRecords = [],
  schoolId,
  currentUser,
  initialStudentId,
  initialSelectedStudentIds,
  initialSelectedViolationIds,
  initialSubPage,
  initialIncident,
  onClearInitialViolations,
  onOpenStudentProfile,
  queueItems: queueItemsProp,
  onQueueItemsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'templates' | 'logs' | 'gmail-auto'>('create');
  const [commSubPage, setCommSubPage] = useState<CommunicationSubPage>(() => {
    if (initialSubPage) return initialSubPage;
    if (initialIncident || initialStudentId) return 'new-message';
    if (initialSelectedViolationIds && initialSelectedViolationIds.length > 0) return 'behavior-notices';
    return 'dashboard';
  });
  const [showLegacyStudio, setShowLegacyStudio] = useState<boolean>(false);

  // Sync with Sidebar sub-page clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CommunicationSubPage>).detail;
      if (detail) {
        setCommSubPage(detail);
        setShowLegacyStudio(false);
      }
    };
    window.addEventListener('fujairah:comm-subpage', handler);
    return () => window.removeEventListener('fujairah:comm-subpage', handler);
  }, []);

  const handleChangeCommSubPage = (sub: CommunicationSubPage) => {
    setCommSubPage(sub);
    setShowLegacyStudio(false);
    window.dispatchEvent(new CustomEvent('fujairah:comm-subpage-changed', { detail: sub }));
  };

  useEffect(() => {
    if (initialIncident || initialStudentId) {
      handleChangeCommSubPage('new-message');
    }
  }, [initialIncident, initialStudentId]);

  const isGmailAdmin = isAuthorizedGmailAdmin(currentUser);
  const [composerMode, setComposerMode] = useState<'studio' | 'wizard'>('studio');
  const [currentStep, setCurrentStep] = useState<number>(1);

  const { schoolSettings } = useSchoolSettings();

  // Data states
  const [templates, setTemplates] = useState<MessageTemplate[]>(DEFAULT_MESSAGE_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate>(
    () =>
      DEFAULT_MESSAGE_TEMPLATES.find((t) => t.id === 'tpl-fujairah-absence') ||
      DEFAULT_MESSAGE_TEMPLATES[0]
  );
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory | 'all'>('all');
  const [logs, setLogs] = useState<MessageLogRecord[]>([]);
  const [settings, setSettings] = useState<SchoolMessageSettings>({
    schoolId,
    schoolNameAr: schoolSettings.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
    schoolNameEn: schoolSettings.schoolNameEn || 'Fujairah Islamic Scientific Academy',
    schoolNumber: schoolSettings.schoolNumber || '7001',
    emirate: schoolSettings.emirate || 'الفجيرة',
    cycle: schoolSettings.schoolCycle || 'جميع المراحل الدراسية (5 - 12)',
    academicYear: schoolSettings.academicYear || '2026–2027',
    semester: schoolSettings.currentTerm || 'الفصل الدراسي الأول',
    defaultSenderName: currentUser?.displayName || schoolSettings.counselorName || 'أمير علي عبدالشاكر بكري',
    defaultSenderRole: 'المرشد الأكاديمي والمهني - مكتب الإرشاد الطلابي',
    phone: schoolSettings.phone || '09-2220000',
    email: schoolSettings.email || 'mohamedadelfujaca@gmail.com',
    whatsappEnabled: true,
    emailEnabled: true,
    autoGreeting: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة وبعد،،',
    autoFooter: 'نظام الرعاية والإرشاد الطلابي الذكي - أكاديمية الفجيرة العلمية الإسلامية',
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.uid || 'counselor',
  });

  // Student selection state (supports both single and multi-student selection)
  const [selectionMode, setSelectionMode] = useState<'single' | 'bulk'>('bulk');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    if (initialStudentId) {
      return students.find((s) => s.id === initialStudentId || s.studentNumber === initialStudentId) || students[0] || null;
    }
    return students[0] || null;
  });
  const [selectedStudents, setSelectedStudents] = useState<Student[]>(() => {
    if (students.length > 0) return [students[0]];
    return [];
  });
  const [recipientTarget, setRecipientTarget] = useState<RecipientTargetType>('primaryGuardian');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [channel, setChannel] = useState<MessageChannel>('whatsapp');

  // Map of studentId -> violationId so each student has their own linked violation
  const [studentViolationMap, setStudentViolationMap] = useState<Record<string, string>>({});

  // Map of studentId -> custom overridden message text (so editing one student's message doesn't affect others!)
  const [studentCustomMessageMap, setStudentCustomMessageMap] = useState<Record<string, string>>({});

  // Map of studentId -> delivery status in current session ('ready' | 'whatsapp_opened' | 'confirmed_sent' | 'skipped' | 'failed')
  const [recipientStatusMap, setRecipientStatusMap] = useState<
    Record<string, { status: 'ready' | 'whatsapp_opened' | 'confirmed_sent' | 'skipped' | 'failed'; logId?: string }>
  >({});

  // Student being edited individually in modal
  const [editingSingleStudentId, setEditingSingleStudentId] = useState<string | null>(null);
  const [editingSingleStudentText, setEditingSingleStudentText] = useState<string>('');

  // Template global custom edit state
  const [customBodyText, setCustomBodyText] = useState<string>('');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customRequiredGuardianAction, setCustomRequiredGuardianAction] = useState<string>(
    'يرجى التكرم بمتابعة الطالب والتواصل مع المرشد الأكاديمي والمهني بالمدرسة.'
  );
  const [isMessageDraftApproved, setIsMessageDraftApproved] = useState<boolean>(true);
  const [showInlineEditorPreview, setShowInlineEditorPreview] = useState<boolean>(true);

  const customBodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const singleStudentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Active templates only for composer
  const activeTemplates = useMemo(() => {
    return templates.filter((t) => t.isActive !== false);
  }, [templates]);

  useEffect(() => {
    if (selectedTemplate) {
      setCustomBodyText(selectedTemplate.sections?.mainBody?.text || selectedTemplate.body || '');
      setCustomSubject(selectedTemplate.subject || '');
      if (
        selectedTemplate.sections?.requiredAction?.text &&
        selectedTemplate.sections.requiredAction.text !== '{requiredGuardianAction}'
      ) {
        setCustomRequiredGuardianAction(selectedTemplate.sections.requiredAction.text);
      }
    }
  }, [selectedTemplate]);

  // Handle incoming selected violations from ViolationsPage
  useEffect(() => {
    if (initialSelectedViolationIds && initialSelectedViolationIds.length > 0 && violations.length > 0) {
      const vSet = new Set(initialSelectedViolationIds);
      const matchedViolations = violations.filter((v) => vSet.has(v.id));

      if (matchedViolations.length > 0) {
        const newStudentViolationMap: Record<string, string> = {};
        const matchedStudentList: Student[] = [];
        const seenStudentIds = new Set<string>();

        for (const v of matchedViolations) {
          const st = students.find(
            (s) => s.id === v.studentId || (v.studentNumber && s.studentNumber === v.studentNumber)
          );
          if (st) {
            newStudentViolationMap[st.id] = v.id;
            if (!seenStudentIds.has(st.id)) {
              seenStudentIds.add(st.id);
              matchedStudentList.push(st);
            }
          }
        }

        if (matchedStudentList.length > 0) {
          setStudentViolationMap((prev) => ({ ...prev, ...newStudentViolationMap }));
          setSelectedStudents(matchedStudentList);
          setSelectedStudent(matchedStudentList[0]);
          setSelectionMode('bulk');
          setSelectedCategory('behavior');

          const behaviorDefaultTpl =
            templates.find((t) => t.category === 'behavior' && t.isDefaultForCategory && t.isActive !== false) ||
            templates.find((t) => t.id === 'tpl-official-violation-notice') ||
            templates.find((t) => t.category === 'behavior');
          if (behaviorDefaultTpl) {
            setSelectedTemplate(behaviorDefaultTpl);
          }
        }
      }
    }
  }, [initialSelectedViolationIds, violations, students, templates]);

  // Auto-link latest violation for each student if not already linked in studentViolationMap
  useEffect(() => {
    if (violations.length === 0) return;
    setStudentViolationMap((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const st of students) {
        if (!next[st.id]) {
          const studentViolations = violations.filter(
            (v) => v.studentId === st.id || (st.studentNumber && v.studentNumber === st.studentNumber)
          );
          if (studentViolations.length > 0) {
            next[st.id] = studentViolations[0].id;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [students, violations]);

  // Handle incoming initialSelectedStudentIds (e.g. from TardinessPage or AbsencePage)
  useEffect(() => {
    if (
      (!initialSelectedViolationIds || initialSelectedViolationIds.length === 0) &&
      initialSelectedStudentIds &&
      initialSelectedStudentIds.length > 0
    ) {
      const idSet = new Set(initialSelectedStudentIds);
      const matches = students.filter((s) => idSet.has(s.id) || idSet.has(s.studentNumber));
      if (matches.length > 0) {
        setSelectedStudents(matches);
        setSelectedStudent(matches[0]);
        setSelectionMode(matches.length > 1 ? 'bulk' : 'single');
      }
    } else if (
      (!initialSelectedViolationIds || initialSelectedViolationIds.length === 0) &&
      initialStudentId
    ) {
      const found = students.find((s) => s.id === initialStudentId || s.studentNumber === initialStudentId);
      if (found) {
        setSelectedStudent(found);
        setSelectedStudents([found]);
      }
    }
  }, [initialSelectedStudentIds, initialStudentId, initialSelectedViolationIds, students]);

  // Preview state
  const [previewStudentIndex, setPreviewStudentIndex] = useState<number>(0);

  // Modals & Queue
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [localQueueItems, setLocalQueueItems] = useState<QueueItem[]>([]);
  const queueItems = queueItemsProp ?? localQueueItems;

  const updateQueueItems = (newItems: QueueItem[]) => {
    if (onQueueItemsChange) {
      onQueueItemsChange(newItems);
    } else {
      setLocalQueueItems(newItems);
    }
  };

  const unconfirmedQueueCount = useMemo(() => {
    return queueItems.filter((item) => item.status !== 'confirmed').length;
  }, [queueItems]);

  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSingle, setCopiedSingle] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load initial settings, Firestore templates, and logs
  useEffect(() => {
    async function loadInitial() {
      try {
        const [loadedSettings, loadedTemplates, loadedLogs] = await Promise.all([
          getSchoolMessageSettings(schoolId),
          fetchMessageTemplates(schoolId),
          fetchMessageLogs(schoolId),
        ]);
        setSettings(loadedSettings);
        if (loadedTemplates.length > 0) {
          setTemplates(loadedTemplates);
          const defaultViolationTpl =
            loadedTemplates.find((t) => t.category === 'behavior' && t.isDefaultForCategory && t.isActive !== false) ||
            loadedTemplates.find((t) => t.id === 'tpl-official-violation-notice') ||
            loadedTemplates[0];
          setSelectedTemplate(defaultViolationTpl);
        }
        setLogs(loadedLogs);
      } catch (err) {
        console.error('Failed to load messaging data', err);
      }
    }
    loadInitial();
  }, [schoolId]);

  // Filtered templates by category
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return activeTemplates;
    return activeTemplates.filter((t) => t.category === selectedCategory);
  }, [activeTemplates, selectedCategory]);

  // When category button is clicked, select category AND auto-pick its default template
  const handleSelectCategory = (catId: MessageCategory | 'all') => {
    setSelectedCategory(catId);
    if (catId !== 'all') {
      const defaultForCat =
        activeTemplates.find((t) => t.category === catId && t.isDefaultForCategory) ||
        activeTemplates.find((t) => t.category === catId);
      if (defaultForCat) {
        setSelectedTemplate(defaultForCat);
      }
    }
  };

  // Determine contacts helper for a student given current recipient target
  const resolveTargetContact = (student: Student): StudentContact => {
    const contacts = getStudentNormalizedContacts(student);
    if (contacts.length === 0) {
      const norm = normalizeUaePhone(student.parentPhone);
      return {
        id: 'fallback',
        name: student.parentName || 'ولي الأمر',
        relation: student.parentRelation || 'ولي الأمر',
        phone: student.parentPhone || '',
        phoneE164: norm.e164,
        isPrimary: true,
        hasWhatsApp: norm.isValid,
        whatsappConsent: true,
        emailConsent: true,
        isVerified: false,
        source: 'legacy',
        updatedAt: new Date().toISOString(),
      };
    }

    if (selectionMode === 'single' && selectedContactId) {
      const found = contacts.find((c) => c.id === selectedContactId);
      if (found) return found;
    }

    if (recipientTarget === 'father') {
      const father = contacts.find((c) => c.relation === 'أب' || c.relation === 'father');
      if (father) return father;
    } else if (recipientTarget === 'mother') {
      const mother = contacts.find((c) => c.relation === 'أم' || c.relation === 'mother');
      if (mother) return mother;
    } else if (recipientTarget === 'student') {
      const stud = contacts.find((c) => c.relation === 'طالب' || c.relation === 'student');
      if (stud) return stud;
    }

    return contacts.find((c) => c.isPrimary) || contacts[0];
  };

  // Build current effective template including custom edited body
  const currentEffectiveTemplate: MessageTemplate = useMemo(() => {
    return {
      ...selectedTemplate,
      subject: customSubject || selectedTemplate.subject,
      sections: {
        ...selectedTemplate.sections,
        mainBody: {
          ...selectedTemplate.sections.mainBody,
          text: customBodyText || selectedTemplate.sections.mainBody.text,
        },
      },
    };
  }, [selectedTemplate, customBodyText, customSubject]);

  // Build independent variables & validation for any given student
  const buildStudentMessageContext = (student: Student) => {
    const contact = resolveTargetContact(student);
    const linkedViolationId = studentViolationMap[student.id];
    const studentViolations = violations.filter(
      (v) => v.studentId === student.id || (student.studentNumber && v.studentNumber === student.studentNumber)
    );
    const linkedViolation =
      studentViolations.find((v) => v.id === linkedViolationId) || studentViolations[0] || null;

    // Check if action is approved: in our system, status === 'مسودة' means draft/unapproved
    const hasUnapprovedAction = Boolean(linkedViolation && linkedViolation.status === 'مسودة');

    const violationDescription = linkedViolation
      ? `${linkedViolation.violationType}${
          linkedViolation.incidentDescription ? ` (${linkedViolation.incidentDescription})` : ''
        }`
      : '';

    const incidentDate = linkedViolation
      ? linkedViolation.incidentDateTime.split('T')[0] || linkedViolation.incidentDateTime
      : new Date().toLocaleDateString('ar-AE');

    // Do NOT use unapproved actions if violation is still draft, or clearly mark it
    const approvedAction =
      linkedViolation && !hasUnapprovedAction
        ? linkedViolation.suggestedAction || ''
        : '';

    const vars: Record<string, string | number | undefined> = {
      studentName: student.fullName,
      student: student.fullName,
      studentNameAr: student.fullName,
      studentNumber: student.studentNumber,
      studentId: student.studentNumber,
      grade: student.grade,
      track: student.track || 'عام',
      section: student.section,
      guardianName: contact.name || student.parentName || 'ولي الأمر المحترم',
      guardian: contact.name || student.parentName || 'ولي الأمر المحترم',
      relation: contact.relation || student.parentRelation || 'ولي الأمر',
      violationDescription,
      violationType: linkedViolation?.violationType || '',
      incidentDate,
      date: incidentDate,
      time: new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' }),
      approvedAction,
      requiredGuardianAction: customRequiredGuardianAction,
      schoolName: settings.schoolNameAr || schoolSettings.schoolName,
      school: settings.schoolNameAr || schoolSettings.schoolName,
      schoolNameAr: settings.schoolNameAr || schoolSettings.schoolName,
      schoolPhone: settings.phone || schoolSettings.phone,
      phone: settings.phone || schoolSettings.phone,
      schoolEmail: settings.email || schoolSettings.email,
      email: settings.email || schoolSettings.email,
      academicYear: settings.academicYear,
      semester: settings.semester,
      senderName: settings.defaultSenderName,
      senderRole: settings.defaultSenderRole,
      latenessCount: student.totalTardiness || 1,
      absenceCount: student.totalAbsences || 1,
    };

    const templateTextToValidate = [
      currentEffectiveTemplate.subject,
      currentEffectiveTemplate.sections?.mainBody?.text,
      currentEffectiveTemplate.sections?.requiredAction?.enabled
        ? currentEffectiveTemplate.sections?.requiredAction?.text
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    const validation = validateMessageVariables(templateTextToValidate, vars);
    const normPhone = normalizeUaePhone(contact.phoneE164 || contact.phone || student.parentPhone);

    const missingFields: string[] = validation.missingVariables.map((m) => m.label);
    if (!normPhone.isValid) {
      missingFields.push('رقم هاتف ولي الأمر صالح');
    }

    const customOverride = studentCustomMessageMap[student.id];
    const renderedText =
      customOverride !== undefined
        ? customOverride
        : generatePlainTextVersion(currentEffectiveTemplate, vars);
    const renderedSubject = renderMessageVariables(currentEffectiveTemplate.subject, vars);

    return {
      student,
      contact,
      normPhone,
      linkedViolation,
      studentViolations,
      vars,
      renderedText,
      renderedSubject,
      missingFields,
      unknownVariables: validation.unknownVariables,
      hasUnapprovedAction,
      isCustomEdited: customOverride !== undefined,
    };
  };

  // List of active target students (either single or bulk)
  const targetStudentsList = useMemo(() => {
    if (selectionMode === 'single') {
      return selectedStudent ? [selectedStudent] : [];
    }
    return selectedStudents;
  }, [selectionMode, selectedStudent, selectedStudents]);

  // Built contexts for all selected students
  const recipientContexts = useMemo(() => {
    return targetStudentsList.map((st) => buildStudentMessageContext(st));
  }, [
    targetStudentsList,
    currentEffectiveTemplate,
    customRequiredGuardianAction,
    settings,
    schoolSettings,
    recipientTarget,
    selectedContactId,
    studentViolationMap,
    studentCustomMessageMap,
    violations,
  ]);

  // Currently previewed student context
  const activePreviewContext = useMemo(() => {
    if (recipientContexts.length === 0) {
      return selectedStudent ? buildStudentMessageContext(selectedStudent) : null;
    }
    const safeIdx = Math.min(previewStudentIndex, recipientContexts.length - 1);
    return recipientContexts[safeIdx] || recipientContexts[0];
  }, [recipientContexts, previewStudentIndex, selectedStudent]);

  // Insert dynamic variable at cursor position in customBodyText
  const handleInsertVariableAtCursor = (code: string) => {
    setIsMessageDraftApproved(false);
    const el = customBodyTextareaRef.current;
    if (!el) {
      setCustomBodyText((prev) => `${prev} ${code}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const nextVal = el.value.substring(0, start) + code + el.value.substring(end);
    setCustomBodyText(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + code.length, start + code.length);
    }, 30);
  };

  // Apply WhatsApp rich formatting (bold, paragraph, bullet, italic, strike, divider) at cursor/selection
  const handleApplyWhatsAppFormatting = (
    type: 'bold' | 'italic' | 'strike' | 'paragraph' | 'bullet' | 'divider'
  ) => {
    setIsMessageDraftApproved(false);
    const el = customBodyTextareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const val = el.value;
    const selected = val.substring(start, end);

    let replacement = '';
    if (type === 'bold') {
      replacement = selected ? `*${selected}*` : '*نص عريض*';
    } else if (type === 'italic') {
      replacement = selected ? `_${selected}_` : '_نص مائل_';
    } else if (type === 'strike') {
      replacement = selected ? `~${selected}~` : '~نص مشطوب~';
    } else if (type === 'paragraph') {
      replacement = `\n\n${selected}`;
    } else if (type === 'bullet') {
      replacement = selected
        ? selected
            .split('\n')
            .map((line) => (line.trim().startsWith('•') ? line : `• ${line}`))
            .join('\n')
        : '\n• ';
    } else if (type === 'divider') {
      replacement = `\n━━━━━━━━━━━━━━\n${selected}`;
    }

    const nextVal = val.substring(0, start) + replacement + val.substring(end);
    setCustomBodyText(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 30);
  };

  // Apply WhatsApp formatting inside the Single-Student Custom Message Modal
  const handleSingleStudentFormatting = (
    type: 'bold' | 'italic' | 'paragraph' | 'bullet' | 'divider',
    customInsert?: string
  ) => {
    const el = singleStudentTextareaRef.current;
    if (!el) {
      if (customInsert) setEditingSingleStudentText((prev) => `${prev} ${customInsert}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const val = el.value;
    const selected = val.substring(start, end);

    let replacement = customInsert || '';
    if (!customInsert) {
      if (type === 'bold') replacement = selected ? `*${selected}*` : '*نص عريض*';
      else if (type === 'italic') replacement = selected ? `_${selected}_` : '_نص مائل_';
      else if (type === 'paragraph') replacement = `\n\n${selected}`;
      else if (type === 'bullet')
        replacement = selected
          ? selected
              .split('\n')
              .map((l) => (l.trim().startsWith('•') ? l : `• ${l}`))
              .join('\n')
          : '\n• ';
      else if (type === 'divider') replacement = `\n━━━━━━━━━━━━━━\n${selected}`;
    }

    const nextVal = val.substring(0, start) + replacement + val.substring(end);
    setEditingSingleStudentText(nextVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 30);
  };

  // Send WhatsApp for a specific student context & log to Firestore + Student File
  const handleSendWhatsAppForStudent = async (ctx: ReturnType<typeof buildStudentMessageContext>) => {
    if (ctx.unknownVariables.length > 0) {
      showToast(`لا يمكن الإرسال: توجد متغيرات غير معروفة في النص (${ctx.unknownVariables.join('، ')})`);
      return;
    }

    if (!ctx.normPhone.isValid) {
      showToast(`تنبيه: رقم هاتف ولي أمر الطالب (${ctx.student.fullName}) غير صالح أو غير مسجل!`);
      setRecipientStatusMap((prev) => ({
        ...prev,
        [ctx.student.id]: { status: 'failed' },
      }));
      return;
    }

    if (ctx.hasUnapprovedAction && !ctx.isCustomEdited) {
      const proceed = window.confirm(
        `تنبيه: المخالفة المرتبطة بالطالب (${ctx.student.fullName}) ما زالت في حالة «مسودة» ولم يُعتمد إجراؤها بعد. هل ترغب في المتابعة وفتح واتساب؟`
      );
      if (!proceed) return;
    } else if (ctx.missingFields.length > 0 && !ctx.isCustomEdited) {
      const proceed = window.confirm(
        `تنبيه: توجد حقول ناقصة في رسالة الطالب (${ctx.student.fullName}): [${ctx.missingFields.join('، ')}]. هل ترغب في فتح واتساب على أي حال؟`
      );
      if (!proceed) return;
    }

    const url = buildWhatsAppLink(ctx.normPhone.e164, ctx.renderedText);
    window.open(url, '_blank');

    try {
      const nowIso = new Date().toISOString();
      const logRecord: Omit<MessageLogRecord, 'id'> = {
        messageId: `msg-${Date.now()}-${ctx.student.studentNumber}`,
        schoolId,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        templateCategory: selectedTemplate.category,
        studentId: ctx.student.id,
        studentName: ctx.student.fullName,
        studentNumber: ctx.student.studentNumber,
        grade: ctx.student.grade,
        section: ctx.student.section,
        track: ctx.student.track,
        recipientName: ctx.contact.name,
        recipientRelation: ctx.contact.relation,
        recipientPhoneMasked: maskPhone(ctx.normPhone.e164),
        recipientPhoneFull: ctx.normPhone.e164,
        channel: 'whatsapp',
        subject: ctx.renderedSubject,
        messageSnapshot: ctx.renderedText,
        violationId: ctx.linkedViolation?.id,
        violationDescription: ctx.linkedViolation?.violationType,
        incidentDate: ctx.vars.incidentDate ? String(ctx.vars.incidentDate) : undefined,
        approvedAction: ctx.vars.approvedAction ? String(ctx.vars.approvedAction) : undefined,
        requiredGuardianAction: customRequiredGuardianAction,
        status: 'whatsapp_opened',
        createdBy: currentUser?.uid || 'counselor',
        createdByName: currentUser?.displayName || settings.defaultSenderName,
        senderRole: settings.defaultSenderRole,
        createdAt: nowIso,
      };
      const logId = await createMessageLog(schoolId, logRecord);
      const saved: MessageLogRecord = { id: logId, ...logRecord };
      setLogs((prev) => [saved, ...prev]);
      setRecipientStatusMap((prev) => ({
        ...prev,
        [ctx.student.id]: { status: 'whatsapp_opened', logId },
      }));
      showToast(`تم فتح واتساب للطالب (${ctx.student.fullName}) وتوثيق الإشعار في ملف الطالب.`);
    } catch (e) {
      console.error(e);
    }
  };

  // Confirm sent status for a student in the recipients table
  const handleConfirmStudentSent = async (studentId: string) => {
    const entry = recipientStatusMap[studentId];
    const nowIso = new Date().toISOString();
    if (entry?.logId) {
      await updateMessageLogStatus(schoolId, entry.logId, 'confirmed_sent', nowIso);
      setLogs((prev) =>
        prev.map((l) => (l.id === entry.logId ? { ...l, status: 'confirmed_sent', confirmedAt: nowIso } : l))
      );
    }
    setRecipientStatusMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status: 'confirmed_sent' },
    }));
    showToast('تم تأكيد إرسال الرسالة وتحديث حالة التواصل في ملف الطالب.');
  };

  // Prepare Queue for bulk sequential send
  const handleOpenSendQueue = () => {
    if (recipientContexts.length === 0) {
      showToast('يرجى تحديد طالب واحد على الأقل للمتابعة والإرسال');
      return;
    }

    if (recipientContexts[0]?.unknownVariables.length > 0) {
      showToast(`يرجى تصحيح المتغيرات غير المعروفة في القالب أولاً: ${recipientContexts[0].unknownVariables.join('، ')}`);
      return;
    }

    const items: QueueItem[] = recipientContexts.map((ctx) => {
      const existingStatus = recipientStatusMap[ctx.student.id]?.status;
      return {
        student: ctx.student,
        contact: ctx.contact,
        renderedText: ctx.renderedText,
        renderedSubject: ctx.renderedSubject,
        status:
          existingStatus === 'confirmed_sent'
            ? 'confirmed'
            : existingStatus === 'whatsapp_opened'
            ? 'opened'
            : existingStatus === 'skipped'
            ? 'skipped'
            : 'pending',
        violationId: ctx.linkedViolation?.id,
        violationDescription: ctx.linkedViolation?.violationType,
        incidentDate: ctx.vars.incidentDate ? String(ctx.vars.incidentDate) : undefined,
        approvedAction: ctx.vars.approvedAction ? String(ctx.vars.approvedAction) : undefined,
        requiredGuardianAction: customRequiredGuardianAction,
        missingFields: ctx.missingFields,
        hasUnapprovedAction: ctx.hasUnapprovedAction,
        isCustomEdited: ctx.isCustomEdited,
      };
    });

    updateQueueItems(items);
    setIsQueueOpen(true);
  };

  // Queue item status callbacks
  const handleQueueOpened = async (index: number) => {
    const updated = [...queueItems];
    updated[index].status = 'opened';
    updateQueueItems(updated);

    const item = updated[index];
    try {
      const nowIso = new Date().toISOString();
      const logRecord: Omit<MessageLogRecord, 'id'> = {
        messageId: `msg-${Date.now()}-${index}`,
        schoolId,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        templateCategory: selectedTemplate.category,
        studentId: item.student.id,
        studentName: item.student.fullName,
        studentNumber: item.student.studentNumber,
        grade: item.student.grade,
        section: item.student.section,
        track: item.student.track,
        recipientName: item.contact.name,
        recipientRelation: item.contact.relation,
        recipientPhoneMasked: maskPhone(item.contact.phoneE164 || item.contact.phone),
        recipientEmailMasked: item.contact.email ? maskEmail(item.contact.email) : undefined,
        channel,
        subject: item.renderedSubject,
        messageSnapshot: item.renderedText,
        violationId: item.violationId,
        violationDescription: item.violationDescription,
        incidentDate: item.incidentDate,
        approvedAction: item.approvedAction,
        requiredGuardianAction: item.requiredGuardianAction,
        status: channel === 'whatsapp' ? 'whatsapp_opened' : 'email_opened',
        createdBy: currentUser?.uid || 'counselor',
        createdByName: currentUser?.displayName || settings.defaultSenderName,
        senderRole: settings.defaultSenderRole,
        createdAt: nowIso,
      };
      const logId = await createMessageLog(schoolId, logRecord);
      const saved: MessageLogRecord = { id: logId, ...logRecord };
      setLogs((prev) => [saved, ...prev]);
      setRecipientStatusMap((prev) => ({
        ...prev,
        [item.student.id]: { status: 'whatsapp_opened', logId },
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleQueueConfirmed = async (index: number) => {
    const updated = [...queueItems];
    updated[index].status = 'confirmed';
    updateQueueItems(updated);

    const stId = updated[index].student.id;
    await handleConfirmStudentSent(stId);
  };

  const handleQueueSkipped = (index: number) => {
    const updated = [...queueItems];
    updated[index].status = 'skipped';
    updateQueueItems(updated);

    const stId = updated[index].student.id;
    setRecipientStatusMap((prev) => ({
      ...prev,
      [stId]: { status: 'skipped' },
    }));
  };

  const handleQueueItemTextChange = (index: number, newText: string) => {
    const updated = [...queueItems];
    updated[index] = {
      ...updated[index],
      renderedText: newText,
      isCustomEdited: true,
    };
    updateQueueItems(updated);

    const stId = updated[index].student.id;
    setStudentCustomMessageMap((prev) => ({
      ...prev,
      [stId]: newText,
    }));
  };

  // Save current template edits to Firestore
  const handleSaveAsCustomTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const modifierName = currentUser?.displayName || settings.defaultSenderName || 'أمير علي عبدالشاكر بكري';
      const updatedTpl = await saveMessageTemplate(
        schoolId,
        {
          ...currentEffectiveTemplate,
          body: customBodyText || currentEffectiveTemplate.sections.mainBody.text,
        },
        {
          uid: currentUser?.uid || 'counselor',
          name: modifierName,
          changeNote: 'تعديل وحفظ من استوديو المراسلات',
        }
      );
      setTemplates((prev) =>
        prev.some((t) => t.id === updatedTpl.id)
          ? prev.map((t) => (t.id === updatedTpl.id ? updatedTpl : t))
          : [updatedTpl, ...prev]
      );
      setSelectedTemplate(updatedTpl);
      showToast('تم حفظ تعديلات القالب في Cloud Firestore بنجاح.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const canManageTemplates =
    !currentUser?.role ||
    currentUser.role === 'schoolAdmin' ||
    currentUser.role === 'school_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'systemAdmin' ||
    currentUser.role === 'system_owner' ||
    currentUser.role === 'counselor';

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0C2340] text-white px-5 py-3 rounded-2xl shadow-xl border border-[#D4AF37]/50 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0C2340] via-[#0E2C50] to-[#0A4D54] rounded-3xl p-5 sm:p-6 text-white border border-[#16355C] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006D77] to-[#0A4D54] border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center font-bold shadow-md shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                مركز التواصل الذكي مع أولياء الأمور
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40">
                أكاديمية الفجيرة العلمية الإسلامية
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              نظام متكامل للتواصل التربوي عبر واتساب الرسمي والبريد الإلكتروني، مرتبط بملف الطالب وسجلات الغياب والتأخير والسلوك
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {unconfirmedQueueCount > 0 && (
            <button
              type="button"
              onClick={() => setIsQueueOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D4AF37] hover:bg-[#c29f2f] text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>طابور الإرسال النشط ({unconfirmedQueueCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 cursor-pointer"
          >
            <SettingsIcon className="w-4 h-4 text-[#D4AF37]" />
            <span>إعدادات وهوية المدرسة</span>
          </button>
        </div>
      </div>

      {/* SMART PARENT COMMUNICATION HUB (9 Official Sub-pages) */}
      {!showLegacyStudio ? (
        <SmartParentCommunicationHub
          activeSubPage={commSubPage}
          onSubPageChange={handleChangeCommSubPage}
          students={students}
          violations={violations}
          absences={absences}
          tardinessRecords={tardinessRecords}
          templates={templates}
          logs={logs}
          onLogsChange={setLogs}
          settings={settings}
          onOpenSettingsModal={() => setIsSettingsOpen(true)}
          schoolId={schoolId}
          currentUser={currentUser}
          onOpenStudentProfile={onOpenStudentProfile}
          onOpenLegacyStudio={() => setShowLegacyStudio(true)}
          initialStudentId={initialStudentId}
          initialIncident={initialIncident}
          onOpenBulkWhatsAppQueue={(items, tpl, ch) => {
            setSelectedTemplate(tpl);
            setChannel(ch);
            updateQueueItems(items);
            setIsQueueOpen(true);
          }}
          onRenderTemplatesManager={() => (
            <TemplateManagementManager
              templates={templates}
              settings={settings}
              sampleStudent={selectedStudent || students[0] || null}
              currentUserName={currentUser?.displayName || settings.defaultSenderName || 'أمير علي عبدالشاكر بكري'}
              currentUserId={currentUser?.uid || 'counselor'}
              canManage={canManageTemplates}
              onSaveTemplate={async (tpl, changeNote, skipRevision) => {
                const saved = await saveMessageTemplate(schoolId, tpl, {
                  uid: currentUser?.uid || 'counselor',
                  name: currentUser?.displayName || settings.defaultSenderName || 'أمير علي عبدالشاكر بكري',
                  changeNote,
                  skipRevision,
                });
                setTemplates((prev) =>
                  prev.some((t) => t.id === saved.id)
                    ? prev.map((t) => (t.id === saved.id ? saved : t))
                    : [saved, ...prev]
                );
                showToast(`تم حفظ القالب «${saved.name}» في Cloud Firestore بنجاح.`);
              }}
              onDeleteTemplate={async (templateId) => {
                await deleteMessageTemplate(schoolId, templateId);
                setTemplates((prev) => prev.filter((t) => t.id !== templateId));
                showToast('تم حذف القالب المخصص بنجاح.');
              }}
              onSetDefaultForCategory={async (templateId, category) => {
                const updatedList = await setDefaultTemplateForCategory(
                  schoolId,
                  templateId,
                  category,
                  templates,
                  currentUser?.displayName || settings.defaultSenderName
                );
                setTemplates(updatedList);
                showToast('تم تعيين القالب الافتراضي لهذا النوع من المراسلات.');
              }}
              onUseTemplateForSending={(tpl) => {
                setSelectedTemplate(tpl);
                handleChangeCommSubPage('new-message');
                showToast(`تم اختيار القالب «${tpl.name}» للإرسال.`);
              }}
            />
          )}
          onRenderGmailOAuthPanel={() =>
            isGmailAdmin ? (
              <GmailOAuthIntegrationPanel
                schoolId={schoolId}
                currentUser={currentUser as any}
                students={students}
                violations={violations}
                onOpenStudentProfile={onOpenStudentProfile}
                onShowToast={(msg) => showToast(msg)}
              />
            ) : null
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between bg-teal-50 dark:bg-teal-950/50 border border-[#006D77] rounded-2xl p-3 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              أنت الآن في وضع «الاستوديو المتقدم للنماذج». يمكنك العودة إلى الأقسام الـ 9 لمركز التواصل الذكي في أي وقت.
            </span>
            <button
              type="button"
              onClick={() => setShowLegacyStudio(false)}
              className="px-3.5 py-1.5 rounded-xl bg-[#006D77] text-white font-black text-xs cursor-pointer"
            >
              العودة إلى مركز التواصل الذكي (9 وحدات)
            </button>
          </div>

      {/* Main Navigation Bar (Create / Template Management / Logs) */}
      <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-2.5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#006D77] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>مركز إرسال الإشعارات ({targetStudentsList.length} مستلم)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-[#006D77] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>إدارة قوالب الرسائل ({templates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#006D77] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل المراسلات الموثقة ({logs.length})</span>
          </button>

          {isGmailAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('gmail-auto')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                activeTab === 'gmail-auto'
                  ? 'bg-[#0B2748] text-[#C9A227] border border-[#C9A227] shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-[#C9A227]" />
              <span>ربط Gmail التلقائي والإشعارات الفاشلة</span>
            </button>
          )}
        </div>

        {activeTab === 'create' && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 hidden md:inline">نمط العمل:</span>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setComposerMode('studio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  composerMode === 'studio'
                    ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>الاستوديو المتكامل</span>
              </button>

              <button
                type="button"
                onClick={() => setComposerMode('wizard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  composerMode === 'wizard'
                    ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>المعالج التتابعي</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Banner if Violations were passed directly from ViolationsPage */}
      {initialSelectedViolationIds && initialSelectedViolationIds.length > 0 && activeTab === 'create' && (
        <div className="bg-teal-50 dark:bg-teal-950/60 border-2 border-[#006D77] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#006D77] text-[#D4AF37] flex items-center justify-center font-black shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                تم تمرير ({initialSelectedViolationIds.length}) مخالفة محددة من سجل المخالفات السلوكية
              </h3>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                تم ربط كل طالب بمخالفته الخاصة به تلقائياً وتجهيز قالب إشعار المخالفة السلوكية للمعاينة والإرسال.
              </p>
            </div>
          </div>
          {onClearInitialViolations && (
            <button
              type="button"
              onClick={onClearInitialViolations}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 hover:text-rose-600 border border-slate-200 text-xs font-bold cursor-pointer"
            >
              إلغاء التمرير الخاص
            </button>
          )}
        </div>
      )}

      {/* TAB 1: LOGS */}
      {activeTab === 'logs' ? (
        <MessageLogsTab logs={logs} canManage={canManageTemplates} />
      ) : activeTab === 'templates' ? (
        /* TAB 2: DEDICATED TEMPLATE MANAGEMENT MODULE (إدارة قوالب الرسائل القابلة للتعديل) */
        <TemplateManagementManager
          templates={templates}
          settings={settings}
          sampleStudent={selectedStudent || students[0] || null}
          currentUserName={currentUser?.displayName || settings.defaultSenderName || 'أمير علي عبدالشاكر بكري'}
          currentUserId={currentUser?.uid || 'counselor'}
          canManage={canManageTemplates}
          onSaveTemplate={async (tpl, changeNote, skipRevision) => {
            const saved = await saveMessageTemplate(schoolId, tpl, {
              uid: currentUser?.uid || 'counselor',
              name: currentUser?.displayName || settings.defaultSenderName || 'أمير علي عبدالشاكر بكري',
              changeNote,
              skipRevision,
            });
            if (saved.isDefaultForCategory) {
              const allNext = templates.some((t) => t.id === saved.id)
                ? templates.map((t) => (t.id === saved.id ? saved : t))
                : [saved, ...templates];
              const withDefault = await setDefaultTemplateForCategory(
                schoolId,
                saved.id,
                saved.category,
                allNext,
                currentUser?.displayName || settings.defaultSenderName
              );
              setTemplates(withDefault);
            } else {
              setTemplates((prev) =>
                prev.some((t) => t.id === saved.id)
                  ? prev.map((t) => (t.id === saved.id ? saved : t))
                  : [saved, ...prev]
              );
            }
            if (selectedTemplate.id === saved.id) {
              setSelectedTemplate(saved);
            }
            showToast(`تم حفظ القالب «${saved.name}» في Cloud Firestore بنجاح.`);
          }}
          onDeleteTemplate={async (templateId) => {
            await deleteMessageTemplate(schoolId, templateId);
            setTemplates((prev) => prev.filter((t) => t.id !== templateId));
            showToast('تم حذف القالب المخصص بنجاح.');
          }}
          onSetDefaultForCategory={async (templateId, category) => {
            const updatedList = await setDefaultTemplateForCategory(
              schoolId,
              templateId,
              category,
              templates,
              currentUser?.displayName || settings.defaultSenderName
            );
            setTemplates(updatedList);
            showToast('تم تعيين القالب الافتراضي لهذا النوع من المراسلات.');
          }}
          onUseTemplateForSending={(tpl) => {
            setSelectedTemplate(tpl);
            setSelectedCategory(tpl.category);
            setActiveTab('create');
            setComposerMode('studio');
            showToast(`تم اختيار القالب «${tpl.name}» للإرسال.`);
          }}
        />
      ) : composerMode === 'studio' ? (
        /* TAB 3: STUDIO COMPOSER + RECIPIENTS QUEUE TABLE */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* RIGHT COLUMN (7/12): Step 1 (Type & Template), Step 2 (Students Selection), Step 3 (Content & Dynamic Variables) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Message Type & Editable Template Selection */}
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center font-bold">
                      1
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      نوع الرسالة والقالب المعتمد
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="text-xs font-bold text-[#006D77] dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>إدارة وتخصيص القوالب</span>
                  </button>
                </div>

                {/* Message Type Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {MESSAGE_TYPE_BUTTONS.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#006D77] text-white shadow-2xs ring-1 ring-teal-400/40'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isCurrent = selectedTemplate.id === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tpl)}
                        className={`text-right p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                          isCurrent
                            ? 'bg-teal-50 dark:bg-teal-950/40 border-[#006D77] dark:border-teal-600 ring-2 ring-[#006D77]/20 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                            isCurrent
                              ? 'bg-[#006D77] text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isCurrent ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                              {tpl.name}
                            </span>
                            {tpl.isDefaultForCategory && (
                              <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37] shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {tpl.subject}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Student Selection (Grade, Track, Section, Search, Multi-Select Checkboxes, Select All / Clear) */}
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center font-bold">
                      2
                    </div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      اختيار الطلاب (حسب الصف والمسار والشعبة أو البحث المباشر)
                    </h2>
                  </div>

                  <span className="text-xs font-black text-[#006D77] dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-3 py-1 rounded-xl border border-teal-200 dark:border-teal-800">
                    الطلاب المحددون: {targetStudentsList.length} طالب
                  </span>
                </div>

                <StudentSelector
                  students={students}
                  selectionMode={selectionMode}
                  onSelectionModeChange={(m) => {
                    setSelectionMode(m);
                    if (m === 'bulk' && selectedStudents.length === 0 && selectedStudent) {
                      setSelectedStudents([selectedStudent]);
                    }
                  }}
                  selectedStudent={selectedStudent}
                  onSelectStudent={(st) => {
                    setSelectedStudent(st);
                    if (st && selectionMode === 'single') {
                      setSelectedStudents([st]);
                    }
                  }}
                  selectedStudents={selectedStudents}
                  onSelectStudents={(list) => {
                    setSelectedStudents(list);
                    if (list.length > 0 && !selectedStudent) {
                      setSelectedStudent(list[0]);
                    }
                  }}
                  recipientTarget={recipientTarget}
                  onRecipientTargetChange={setRecipientTarget}
                  selectedContactId={selectedContactId}
                  onSelectContactId={setSelectedContactId}
                  isAdmin={canManageTemplates}
                />
              </div>

              {/* Card 3: Rich WhatsApp Text Editor, Dynamic Variables Bar & Instant Preview Before Approval */}
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        محرر نصوص مركز المراسلات (تنسيق واتساب + المتغيرات الديناميكية + المعاينة الفورية)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        نسّق الرسالة بالخط العريض والفقرات وأدرج المتغيرات بضغطة واحدة مع معاينة فورية لشكلها قبل اعتمادها
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.keys(studentCustomMessageMap).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentCustomMessageMap({});
                          showToast('تمت إعادة تعيين التعديلات الفردية لتطبيق القالب الموحد على الجميع.');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-bold border border-amber-200 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>إلغاء التخصيص الفردي ({Object.keys(studentCustomMessageMap).length})</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setCustomBodyText(selectedTemplate.sections?.mainBody?.text || selectedTemplate.body || '');
                        setCustomSubject(selectedTemplate.subject || '');
                        setIsMessageDraftApproved(true);
                        showToast('تمت استعادة النص الأصلي للقالب.');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[11px] font-bold cursor-pointer"
                      title="استعادة النص الأصلي للقالب"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة الأصل</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAsCustomTemplate}
                      disabled={isSavingTemplate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Save className="w-3.5 h-3.5 text-[#006D77]" />
                      <span>{isSavingTemplate ? 'جارٍ الحفظ...' : 'حفظ في القالب بـ Firestore'}</span>
                    </button>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    موضوع الإشعار الرئيسي:
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => {
                      setCustomSubject(e.target.value);
                      setIsMessageDraftApproved(false);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>

                {/* WhatsApp Formatting Toolbar */}
                <div className="bg-slate-50 dark:bg-slate-900/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 ml-1">
                        أدوات تنسيق واتساب:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppFormatting('bold')}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="خط عريض في واتساب (*نص*)"
                      >
                        <Bold className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>خط عريض *B*</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppFormatting('paragraph')}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="تقسيم النص وإدراج فقرة جديدة"
                      >
                        <Pilcrow className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>فقرة جديدة ¶</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppFormatting('bullet')}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="إدراج قائمة نقطية (•)"
                      >
                        <List className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>قائمة نقطية •</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppFormatting('italic')}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="خط مائل (_نص_)"
                      >
                        <Italic className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>مائل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyWhatsAppFormatting('divider')}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="إدراج سطر فاصل رسمي"
                      >
                        <Minus className="w-3.5 h-3.5 text-[#006D77]" />
                        <span>فاصل فقرات</span>
                      </button>
                    </div>

                    {/* Quick School Emojis */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {['🏫', '📌', '⚠️', '✅', '📅', '📞', '📄', '🤝', '🌟'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleInsertVariableAtCursor(emoji)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-center cursor-pointer"
                          title={`إدراج رمز ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* One-Click Dynamic Variables Bar */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#006D77] dark:text-teal-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>إدراج المتغيرات الديناميكية بضغطة واحدة في موضع المؤشر:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        تُعوض تلقائياً ببيانات كل طالب ومخالفته المستقلة
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {OFFICIAL_DYNAMIC_VARIABLES.map((v) => (
                        <button
                          key={v.code}
                          type="button"
                          onClick={() => handleInsertVariableAtCursor(v.code)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          title={v.description}
                        >
                          <span>+ {v.label}</span>
                          <span className="font-mono text-[10px] opacity-75" dir="ltr">
                            {v.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Body Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      نص وفقرات الرسالة (يدعم *الخط العريض* وتقسيم الفقرات):
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {customBodyText.length} حرف
                    </span>
                  </div>
                  <textarea
                    ref={customBodyTextareaRef}
                    rows={6}
                    value={customBodyText}
                    onChange={(e) => {
                      setCustomBodyText(e.target.value);
                      setIsMessageDraftApproved(false);
                    }}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-300 dark:border-slate-700 focus:border-[#006D77] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-[#006D77]/20 outline-hidden"
                    placeholder="اكتب نص الإشعار هنا... يمكنك تحديد أي جملة والضغط على «خط عريض *B*» أو إدراج المتغيرات أعلاه بضغطة واحدة..."
                  />
                </div>

                {/* Required Guardian Action Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الإجراء المطلوب من ولي الأمر (يُدرج مكان المتغير {'{requiredGuardianAction}'}):
                  </label>
                  <input
                    type="text"
                    value={customRequiredGuardianAction}
                    onChange={(e) => {
                      setCustomRequiredGuardianAction(e.target.value);
                      setIsMessageDraftApproved(false);
                    }}
                    placeholder="مثال: يرجى مراجعة المرشد الأكاديمي صباح الغد لتوقيع خطة تعديل السلوك..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>

                {/* Instant Formatted WhatsApp Preview & Approval Box right inside the Editor Card */}
                <div className="rounded-2xl border-2 border-teal-600/30 dark:border-teal-500/30 bg-slate-900/95 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-black text-white">
                        معاينة فورية لشكل الرسالة المنسقة على واتساب قبل اعتمادها:
                      </span>
                      {activePreviewContext && (
                        <span className="text-[11px] text-teal-300 font-bold">
                          (نموذج الطالب: {activePreviewContext.student.fullName})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowInlineEditorPreview((v) => !v)}
                        className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                      >
                        {showInlineEditorPreview ? 'إخفاء المعاينة المدمجة' : 'إظهار المعاينة المدمجة'}
                      </button>

                      {isMessageDraftApproved ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>معتمدة وجاهزة للإرسال</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black">
                          تعديلات جديدة بانتظار الاعتماد
                        </span>
                      )}
                    </div>
                  </div>

                  {showInlineEditorPreview && (
                    <div className="bg-[#0B141A] p-3.5 rounded-xl border border-slate-800 max-h-64 overflow-y-auto">
                      <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md text-xs leading-relaxed space-y-2 border border-teal-500/30">
                        <div className="border-b border-teal-400/30 pb-1 text-[11px] font-black text-[#D4AF37]">
                          {activePreviewContext?.renderedSubject || customSubject}
                        </div>
                        <div className="text-slate-100 text-xs leading-relaxed font-sans">
                          {renderWhatsAppFormattedText(
                            activePreviewContext?.renderedText || customBodyText
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-teal-200/80 pt-1">
                          <span>{new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}</span>
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-400">
                      يظهر *الخط العريض* والفقرات والقوائم النقطية والمتغيرات المعوضة تماماً كما ستصل لولي الأمر.
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMessageDraftApproved(true);
                        showToast('تم اعتماد نص وتنسيق الرسالة بعد المعاينة، وهي جاهزة للإرسال الآن.');
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                        isMessageDraftApproved
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#D4AF37] hover:bg-[#c29f2f] text-slate-950'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isMessageDraftApproved
                          ? 'تم اعتماد الرسالة بعد المعاينة ✓'
                          : 'اعتماد شكل ونص الرسالة للإرسال'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* LEFT COLUMN (5/12): Live Per-Student WhatsApp Preview & Queue Launch */}
            <div className="lg:col-span-5 space-y-4">
              {/* Student Switcher Bar above Phone Preview */}
              {recipientContexts.length > 0 && (
                <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#006D77]" />
                      <span>معاينة الرسالة النهائية لكل طالب قبل فتح واتساب:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={previewStudentIndex <= 0}
                        onClick={() => setPreviewStudentIndex((i) => Math.max(0, i - 1))}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold font-mono text-[#006D77] dark:text-teal-300">
                        {Math.min(previewStudentIndex + 1, recipientContexts.length)} / {recipientContexts.length}
                      </span>
                      <button
                        type="button"
                        disabled={previewStudentIndex >= recipientContexts.length - 1}
                        onClick={() =>
                          setPreviewStudentIndex((i) => Math.min(recipientContexts.length - 1, i + 1))
                        }
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Linked Violation Selector for the Previewed Student */}
                  {activePreviewContext && activePreviewContext.studentViolations.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        المخالفة السلوكية المرتبطة بالطالب ({activePreviewContext.student.fullName}):
                      </label>
                      <select
                        value={
                          studentViolationMap[activePreviewContext.student.id] ||
                          activePreviewContext.linkedViolation?.id ||
                          ''
                        }
                        onChange={(e) =>
                          setStudentViolationMap((prev) => ({
                            ...prev,
                            [activePreviewContext.student.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        {activePreviewContext.studentViolations.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.violationType} ({v.incidentDateTime.split('T')[0]}) — الحالة: {v.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Missing Fields or Unapproved Action Warning for Previewed Student */}
                  {activePreviewContext &&
                    (activePreviewContext.unknownVariables.length > 0 ||
                      activePreviewContext.hasUnapprovedAction ||
                      activePreviewContext.missingFields.length > 0) && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                        <div className="font-black flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>تنبيه قبل الإرسال للطالب ({activePreviewContext.student.fullName}):</span>
                        </div>
                        {activePreviewContext.unknownVariables.length > 0 && (
                          <p className="text-rose-700 font-bold">
                            • متغيرات غير معروفة: {activePreviewContext.unknownVariables.join('، ')}
                          </p>
                        )}
                        {activePreviewContext.hasUnapprovedAction && (
                          <p>
                            • المخالفة المرتبطة بحالة «مسودة» ولم يُعتمد إجراؤها بعد (لن يتم إدراج إجراء غير معتمد).
                          </p>
                        )}
                        {activePreviewContext.missingFields.length > 0 && (
                          <p>
                            • حقول ناقصة لهذا الطالب: <strong>{activePreviewContext.missingFields.join(' ، ')}</strong>
                          </p>
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Realistic WhatsApp Chat Device Frame */}
              <div className="bg-[#111B21] rounded-[2.5rem] p-3.5 shadow-2xl border-4 border-slate-800 relative overflow-hidden">
                <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800" />
                </div>

                {/* WhatsApp App Header */}
                <div className="bg-[#075E54] text-white px-3.5 py-2.5 rounded-2xl flex items-center justify-between shadow-xs mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-[#075E54] flex items-center justify-center font-bold text-xs shadow-xs">
                      خ
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white block leading-tight truncate max-w-[180px]">
                          {activePreviewContext?.contact.name || settings.schoolNameAr}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                      </div>
                      <span className="text-[10px] text-teal-200 block leading-tight font-mono" dir="ltr">
                        {activePreviewContext?.normPhone.e164 || activePreviewContext?.contact.phone || 'معاينة واتساب'}
                      </span>
                    </div>
                  </div>

                  {activePreviewContext && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSingleStudentId(activePreviewContext.student.id);
                        setEditingSingleStudentText(activePreviewContext.renderedText);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      title="تعديل رسالة هذا الطالب فقط دون تغيير بقية الرسائل"
                    >
                      <Edit3 className="w-3 h-3 text-[#D4AF37]" />
                      <span>تعديل فردي</span>
                    </button>
                  )}
                </div>

                {/* Chat Message Bubble Body */}
                <div className="bg-[#0B141A] rounded-2xl p-4 min-h-[320px] max-h-[440px] overflow-y-auto space-y-3 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
                  <div className="text-center">
                    <span className="px-3 py-1 rounded-full bg-[#182229] text-[10px] font-bold text-slate-300 shadow-2xs">
                      معاينة الطالب: {activePreviewContext?.student.fullName || 'غير محدد'}
                    </span>
                  </div>

                  <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md text-xs leading-relaxed space-y-2 border border-teal-600/30">
                    <div className="flex items-center justify-between border-b border-teal-500/40 pb-1.5 text-[11px] font-bold text-[#D4AF37]">
                      <span>{activePreviewContext?.renderedSubject || customSubject}</span>
                    </div>

                    <div className="text-slate-100 text-xs leading-relaxed font-sans">
                      {activePreviewContext?.renderedText
                        ? renderWhatsAppFormattedText(activePreviewContext.renderedText)
                        : 'يرجى تحديد طالب لمعاينة الرسالة...'}
                    </div>

                    <div className="flex items-center justify-end gap-1 text-[10px] text-teal-200/80 pt-1">
                      <span>{new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Box: Send Single or Launch Sequential Individual Queue */}
              <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
                {recipientContexts.length <= 1 && activePreviewContext ? (
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppForStudent(activePreviewContext)}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Phone className="w-4 h-4 text-emerald-200" />
                    <span>فتح واتساب وإرسال للطالب المحدد الآن</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenSendQueue}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-[#006D77] hover:bg-[#0A4D54] text-white font-black text-sm shadow-md transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-[#D4AF37]" />
                    <span>فتح طابور الإرسال الفردي التتابعي ({recipientContexts.length} طلاب)</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activePreviewContext) return;
                      await navigator.clipboard.writeText(activePreviewContext.renderedText);
                      setCopiedSingle(true);
                      setTimeout(() => setCopiedSingle(false), 2000);
                    }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    {copiedSingle ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>{copiedSingle ? 'تم النسخ!' : 'نسخ نص الرسالة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>طباعة رسمية</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: RECIPIENTS LIST & INDEPENDENT MESSAGE STATUS TABLE (قائمة المستلمين وحالة كل رسالة) */}
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#006D77]" />
                  <span>قائمة المستلمين المحددين وحالة إرسال كل رسالة بشكل مستقل ({recipientContexts.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يمكنك معاينة الرسالة النهائية لكل طالب، أو تعديل رسالة طالب واحد بشكل مستقل، أو فتح واتساب وتوثيق التواصل في ملفه الموحد مباشرة.
                </p>
              </div>

              {recipientContexts.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenSendQueue}
                  className="px-4 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>تشغيل طابور الإرسال المتتابع ({recipientContexts.length})</span>
                </button>
              )}
            </div>

            {recipientContexts.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                لم يتم تحديد أي طالب بعد. يرجى اختيار طالب أو عدة طلاب من قسم «اختيار الطلاب» أعلاه.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">الطالب والصف</th>
                      <th className="p-3">ولي الأمر ورقم واتساب</th>
                      <th className="p-3">المخالفة المرتبطة بالطالب</th>
                      <th className="p-3">تدقيق الحقول</th>
                      <th className="p-3">حالة الرسالة</th>
                      <th className="p-3 text-center">إجراءات مستقلة لكل طالب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recipientContexts.map((ctx, idx) => {
                      const stStatus = recipientStatusMap[ctx.student.id]?.status || 'ready';
                      const isPreviewActive = activePreviewContext?.student.id === ctx.student.id;

                      return (
                        <tr
                          key={ctx.student.id}
                          className={`transition-colors ${
                            isPreviewActive
                              ? 'bg-teal-50/60 dark:bg-teal-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{ctx.student.fullName}</span>
                              {ctx.isCustomEdited && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                                  معدلة فردياً
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              #{ctx.student.studentNumber} • الصف {ctx.student.grade} ({ctx.student.track || 'عام'}) / {ctx.student.section}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {ctx.contact.name} ({ctx.contact.relation})
                            </div>
                            <div
                              className={`text-[11px] font-mono ${
                                ctx.normPhone.isValid ? 'text-[#006D77] dark:text-teal-400 font-bold' : 'text-rose-600 font-bold'
                              }`}
                              dir="ltr"
                            >
                              {ctx.normPhone.e164 || ctx.contact.phone || 'رقم غير متوفر'}
                            </div>
                          </td>

                          <td className="p-3 max-w-[230px]">
                            {ctx.studentViolations.length > 0 ? (
                              <select
                                value={studentViolationMap[ctx.student.id] || ctx.linkedViolation?.id || ''}
                                onChange={(e) =>
                                  setStudentViolationMap((prev) => ({
                                    ...prev,
                                    [ctx.student.id]: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate"
                              >
                                {ctx.studentViolations.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.violationType} ({v.incidentDateTime.split('T')[0]})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-[11px] text-slate-400">لا توجد مخالفة مسجلة</span>
                            )}
                          </td>

                          <td className="p-3">
                            {ctx.missingFields.length === 0 && !ctx.hasUnapprovedAction ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>مكتملة</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-300"
                                title={ctx.missingFields.join('، ')}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>
                                  {ctx.hasUnapprovedAction
                                    ? 'إجراء مسودة غير معتمد'
                                    : `ينقص: ${ctx.missingFields.slice(0, 2).join('، ')}`}
                                </span>
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            {stStatus === 'confirmed_sent' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>تم الإرسال والتوثيق</span>
                              </span>
                            ) : stStatus === 'whatsapp_opened' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                                <Phone className="w-3 h-3" />
                                <span>فُتح واتساب</span>
                              </span>
                            ) : stStatus === 'skipped' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                                <span>تم التخطي</span>
                              </span>
                            ) : stStatus === 'failed' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                                <span>تعذر الإرسال</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                <span>بانتظار الإرسال</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Preview Button */}
                              <button
                                type="button"
                                onClick={() => setPreviewStudentIndex(idx)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer border ${
                                  isPreviewActive
                                    ? 'bg-[#006D77] text-white border-[#006D77]'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                                }`}
                                title="معاينة الرسالة النهائية لهذا الطالب في شاشة الهاتف"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة</span>
                              </button>

                              {/* Edit Single Student Message */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSingleStudentId(ctx.student.id);
                                  setEditingSingleStudentText(ctx.renderedText);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 text-slate-700 dark:text-slate-200 hover:text-purple-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                title="تعديل رسالة هذا الطالب فقط دون تغيير رسائل بقية الطلاب"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>تعديل فردي</span>
                              </button>

                              {/* Open WhatsApp Direct */}
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppForStudent(ctx)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="فتح واتساب لولي أمر الطالب وتوثيق الرسالة"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>فتح واتساب</span>
                              </button>

                              {/* Confirm Sent */}
                              {stStatus === 'whatsapp_opened' && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmStudentSent(ctx.student.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#0C2340] hover:bg-[#16355C] text-[#D4AF37] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="تأكيد إتمام الإرسال في واتساب"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>تأكيد</span>
                                </button>
                              )}

                              {/* Open Student Unified Profile */}
                              {onOpenStudentProfile && (
                                <button
                                  type="button"
                                  onClick={() => onOpenStudentProfile(ctx.student.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#006D77] hover:bg-slate-100 cursor-pointer"
                                  title="فتح ملف الطالب الموحد ومراجعة سجل التواصل"
                                >
                                  <User className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* WIZARD MODE: 6-STEP FLOW */
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-3 sm:p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between min-w-[620px] gap-2">
              {WIZARD_STEPS.map((st, idx) => {
                const isCurrent = currentStep === st.id;
                const isPassed = currentStep > st.id;

                return (
                  <React.Fragment key={st.id}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(st.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#006D77] text-white shadow-xs font-bold'
                          : isPassed
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-[#006D77] dark:text-teal-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-600 font-medium'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                          isCurrent
                            ? 'bg-white text-[#006D77]'
                            : isPassed
                            ? 'bg-[#006D77] text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5" /> : st.id}
                      </div>
                      <span className="text-xs whitespace-nowrap">{st.title}</span>
                    </button>

                    {idx < WIZARD_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 ${
                          isPassed ? 'bg-[#006D77]' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            {currentStep === 1 && (
              <TemplateSelector
                templates={activeTemplates}
                selectedTemplateId={selectedTemplate.id}
                onSelectTemplate={(t) => setSelectedTemplate(t)}
              />
            )}

            {currentStep === 2 && (
              <StudentSelector
                students={students}
                selectionMode={selectionMode}
                onSelectionModeChange={setSelectionMode}
                selectedStudent={selectedStudent}
                onSelectStudent={setSelectedStudent}
                selectedStudents={selectedStudents}
                onSelectStudents={setSelectedStudents}
                recipientTarget={recipientTarget}
                onRecipientTargetChange={setRecipientTarget}
                selectedContactId={selectedContactId}
                onSelectContactId={setSelectedContactId}
                isAdmin={canManageTemplates}
              />
            )}

            {currentStep === 3 && (
              <div className="max-w-xl mx-auto space-y-4 py-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  اختر قناة الإرسال الأساسية
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`p-4 rounded-2xl border text-center font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      channel === 'whatsapp'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`p-4 rounded-2xl border text-center font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      channel === 'email'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-purple-600" />
                    <span>البريد الإلكتروني</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <MessageEditor
                template={selectedTemplate}
                onChange={setSelectedTemplate}
                sampleStudent={selectedStudent || students[0] || null}
                settings={settings}
                onApproveMessage={() =>
                  showToast('تم اعتماد نص وتنسيق الرسالة بعد المعاينة الفورية.')
                }
              />
            )}

            {currentStep === 5 && (
              <div className="h-[750px]">
                <MessagePreview
                  template={selectedTemplate}
                  student={selectedStudent}
                  studentsList={selectionMode === 'bulk' ? selectedStudents : []}
                  currentStudentIndex={previewStudentIndex}
                  onStudentIndexChange={setPreviewStudentIndex}
                  settings={settings}
                />
              </div>
            )}

            {currentStep === 6 && (
              <div className="max-w-md mx-auto text-center space-y-4 py-8">
                <div className="w-14 h-14 rounded-3xl bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 flex items-center justify-center mx-auto shadow-md">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  جاهز لإرسال وتوثيق الإشعار
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  سيتم فتح تطبيق WhatsApp بالرقم المعتمد لولي الأمر وتوثيق المحادثة في سجل المراسلات المدرسية وملف الطالب.
                </p>

                <button
                  type="button"
                  onClick={handleOpenSendQueue}
                  className="w-full py-3 bg-[#006D77] hover:bg-[#0A4D54] text-white rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  بدء طابور الإرسال التتابعي ({recipientContexts.length} طالب)
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الخطوة السابقة</span>
              </button>

              <div className="text-xs text-slate-400 font-medium">
                خطوة {currentStep} من {WIZARD_STEPS.length}
              </div>

              {currentStep < WIZARD_STEPS.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(WIZARD_STEPS.length, currentStep + 1))}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#006D77] hover:bg-[#0A4D54] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>الخطوة التالية</span>
                  <ChevronLeft className="w-4 h-4 text-[#D4AF37]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0C2340] hover:bg-[#08182B] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>عرض سجل الرسائل</span>
                  <History className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN-ONLY TAB: GMAIL OAUTH 2.0, AUTOMATED QUEUE, FAILED NOTIFICATIONS & RETRY */}
      {activeTab === 'gmail-auto' && isGmailAdmin && (
        <GmailOAuthIntegrationPanel
          schoolId={schoolId}
          currentUser={currentUser as any}
          students={students}
          violations={violations}
          onOpenStudentProfile={onOpenStudentProfile}
          onShowToast={(msg) => showToast(msg)}
        />
      )}
        </>
      )}

      {/* Modal for Editing a Single Student's Message Without Affecting Others */}
      {editingSingleStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  محرر وتخصيص رسالة طالب واحد بشكل مستقل (مع المعاينة الفورية)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  هذا التعديل خاص بالطالب المحدد فقط ولن يغير رسائل بقية الطلاب في القائمة.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSingleStudentId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formatting Toolbar for Single Student Modal */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                    تنسيق واتساب:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSingleStudentFormatting('bold')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>خط عريض *B*</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleStudentFormatting('paragraph')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Pilcrow className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>فقرة جديدة ¶</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleStudentFormatting('bullet')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>قائمة نقطية •</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleStudentFormatting('divider')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>فاصل</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {['🏫', '📌', '⚠️', '✅', '📅', '📞'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleSingleStudentFormatting('bold', em)}
                      className="w-6 h-6 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  محرر نص الرسالة:
                </label>
                <textarea
                  ref={singleStudentTextareaRef}
                  rows={10}
                  value={editingSingleStudentText}
                  onChange={(e) => setEditingSingleStudentText(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-[#006D77] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المعاينة الفورية لشكل الرسالة على واتساب قبل الاعتماد:
                </label>
                <div className="bg-[#0B141A] rounded-2xl p-3.5 h-[250px] overflow-y-auto border border-slate-800">
                  <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md text-xs leading-relaxed space-y-2 border border-teal-500/30">
                    <div className="text-slate-100 text-xs leading-relaxed font-sans">
                      {renderWhatsAppFormattedText(editingSingleStudentText)}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-teal-200/80 pt-1">
                      <span>{new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              {studentCustomMessageMap[editingSingleStudentId] !== undefined ? (
                <button
                  type="button"
                  onClick={() => {
                    setStudentCustomMessageMap((prev) => {
                      const next = { ...prev };
                      delete next[editingSingleStudentId];
                      return next;
                    });
                    setEditingSingleStudentId(null);
                    showToast('تمت استعادة نص القالب الموحد لهذا الطالب.');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  إلغاء التخصيص والعودة للقالب العام
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSingleStudentId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStudentCustomMessageMap((prev) => ({
                      ...prev,
                      [editingSingleStudentId]: editingSingleStudentText,
                    }));
                    setEditingSingleStudentId(null);
                    showToast('تم اعتماد وحفظ الرسالة المخصصة لهذا الطالب بعد المعاينة.');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                  <span>اعتماد رسالة الطالب بعد المعاينة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Queue Modal for Bulk Sequential Sending */}
      <WhatsAppQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queueItems={queueItems}
        template={currentEffectiveTemplate}
        settings={settings}
        channel={channel}
        onItemConfirmed={handleQueueConfirmed}
        onItemSkipped={handleQueueSkipped}
        onItemOpened={handleQueueOpened}
        onItemTextChange={handleQueueItemTextChange}
      />

      {/* School Settings Modal */}
      <MessageSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={async (updated) => {
          await saveSchoolMessageSettings(schoolId, updated);
          setSettings(updated);
          showToast('تم حفظ إعدادات وهوية الرسائل المدرسية بنجاح.');
        }}
        isAdmin={canManageTemplates}
      />
    </div>
  );
};
