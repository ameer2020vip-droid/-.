import React, { useState, useRef, useMemo } from 'react';
import {
  FileText,
  Plus,
  Copy,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Star,
  Power,
  RotateCcw,
  Save,
  X,
  Eye,
  Bold,
  Italic,
  List,
  Smile,
  Sparkles,
  Clock,
  User,
  Search,
  Send,
  History,
  Check,
  ShieldCheck,
  Minus,
} from 'lucide-react';
import {
  MessageTemplate,
  MessageCategory,
  MessageTemplateRevision,
  SchoolMessageSettings,
  Student,
} from '../../types';
import {
  OFFICIAL_DYNAMIC_VARIABLES,
  generatePlainTextVersion,
  validateMessageVariables,
} from '../../firebase/messageService';
import { SYSTEM_DEFAULT_TEMPLATES } from '../../data/defaultMessageTemplates';

export const OFFICIAL_TEMPLATE_TYPES: Array<{
  id: MessageCategory;
  label: string;
  badgeColor: string;
}> = [
  { id: 'behavior', label: 'إشعار مخالفة سلوكية', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'guardianCall', label: 'استدعاء ولي الأمر', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'attendance', label: 'إنذار غياب', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'tardiness', label: 'تنبيه التأخر الصباحي', badgeColor: 'bg-sky-100 text-sky-800 border-sky-200' },
  { id: 'phoneConfiscation', label: 'إشعار مصادرة هاتف', badgeColor: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'phoneReturn', label: 'إشعار إعادة هاتف', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'committeeDecision', label: 'إشعار إجراء صادر عن لجنة إدارة السلوك', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'meetingReminder', label: 'تذكير بموعد اجتماع', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'uniformNotice', label: 'إشعار عدم الالتزام بالزي المدرسي', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'positive', label: 'رسالة شكر أو تعزيز إيجابي', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'custom', label: 'رسالة عامة قابلة للتخصيص', badgeColor: 'bg-slate-100 text-slate-800 border-slate-200' },
];

const QUICK_EMOJIS = [
  '🏫', '📌', '👤', '⚠️', '✅', '📅', '⏰', '📞', '✉️', '🌟', '🏆', '🙏', '📋', '⚖️', '📵', '👔', '🤝', '💡',
];

interface TemplateManagementManagerProps {
  templates: MessageTemplate[];
  settings: SchoolMessageSettings;
  sampleStudent?: Student | null;
  currentUserName: string;
  currentUserId: string;
  canManage: boolean;
  onSaveTemplate: (
    template: MessageTemplate,
    changeNote?: string,
    skipRevision?: boolean
  ) => Promise<void>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onSetDefaultForCategory: (templateId: string, category: MessageCategory) => Promise<void>;
  onUseTemplateForSending: (template: MessageTemplate) => void;
}

export const TemplateManagementManager: React.FC<TemplateManagementManagerProps> = ({
  templates,
  settings,
  sampleStudent,
  currentUserName,
  currentUserId,
  canManage,
  onSaveTemplate,
  onDeleteTemplate,
  onSetDefaultForCategory,
  onUseTemplateForSending,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<MessageCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'default'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [activeField, setActiveField] = useState<'mainBody' | 'requiredAction' | 'greeting' | 'subject'>('mainBody');

  const mainBodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const requiredActionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const greetingInputRef = useRef<HTMLInputElement | null>(null);
  const subjectInputRef = useRef<HTMLInputElement | null>(null);

  const getCategoryMeta = (cat: MessageCategory) => {
    return (
      OFFICIAL_TEMPLATE_TYPES.find((c) => c.id === cat) || {
        id: cat,
        label: cat === 'academic' ? 'أكاديمية وإرشاد' : cat === 'events' ? 'فعاليات' : 'عامة',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      }
    );
  };

  // Filtered templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (selectedCategoryFilter !== 'all' && t.category !== selectedCategoryFilter) return false;
      if (statusFilter === 'active' && !t.isActive) return false;
      if (statusFilter === 'inactive' && t.isActive) return false;
      if (statusFilter === 'default' && !t.isDefaultForCategory) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const inName = t.name.toLowerCase().includes(q);
        const inSubject = t.subject.toLowerCase().includes(q);
        const inBody = (t.sections?.mainBody?.text || t.body || '').toLowerCase().includes(q);
        if (!inName && !inSubject && !inBody) return false;
      }
      return true;
    });
  }, [templates, selectedCategoryFilter, statusFilter, searchQuery]);

  // Sample variables for live preview
  const previewVariables = useMemo(() => {
    return {
      studentName: sampleStudent?.fullName || 'راشد محمد بن أحمد الكتبي',
      studentNumber: sampleStudent?.studentNumber || '20261045',
      grade: sampleStudent?.grade || 'العاشر',
      track: sampleStudent?.track || 'متقدم',
      section: sampleStudent?.section || '1',
      guardianName: sampleStudent?.parentName || 'محمد بن أحمد الكتبي',
      violationDescription: 'التأخر المتكرر عن الحصة الدراسية وعدم إحضار الأدوات المدرسية',
      incidentDate: new Date().toLocaleDateString('ar-AE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      approvedAction: 'التنبيه الخطي الأول وتوقيع تعهد سلوكي ومقابلة المرشد الأكاديمي',
      requiredGuardianAction: 'يرجى الحضور للمدرسة صباح الغد لمقابلة المرشد الأكاديمي وتوقيع خطة المتابعة.',
      schoolName: settings.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
      schoolPhone: settings.phone || '09-2220000',
      schoolEmail: settings.email || 'info@fsia.edu.ae',
      senderName: currentUserName || settings.defaultSenderName || 'أمير علي عبدالشاكر بكري',
      senderRole: settings.defaultSenderRole || 'المرشد الأكاديمي والمهني',
      absenceCount: 3,
      latenessCount: 4,
    };
  }, [sampleStudent, settings, currentUserName]);

  // Live preview of editingTemplate
  const livePreviewText = useMemo(() => {
    if (!editingTemplate) return '';
    return generatePlainTextVersion(editingTemplate, previewVariables);
  }, [editingTemplate, previewVariables]);

  // Validation of editingTemplate for unknown variables
  const editorValidation = useMemo(() => {
    if (!editingTemplate) return { isValid: true, unknownVariables: [], missingVariables: [] };
    const combinedText = [
      editingTemplate.subject,
      editingTemplate.sections?.greeting?.text,
      editingTemplate.sections?.mainBody?.text,
      editingTemplate.sections?.requiredAction?.text,
    ]
      .filter(Boolean)
      .join(' ');
    return validateMessageVariables(combinedText, previewVariables);
  }, [editingTemplate, previewVariables]);

  // Start creating a brand new template
  const handleStartCreateNew = () => {
    const nowIso = new Date().toISOString();
    const blank: MessageTemplate = {
      id: `tpl-school-${Date.now()}`,
      schoolId: settings.schoolId,
      name: 'قالب رسالة جديد',
      category: selectedCategoryFilter === 'all' ? 'behavior' : selectedCategoryFilter,
      subject: 'إشعار رسمي بخصوص الطالب {studentName} - {schoolName}',
      badgeText: 'إشعار مدرسي رسمي',
      importance: 'important',
      colors: {
        primary: '#0C2340',
        accent: '#D4AF37',
        background: '#FFFFFF',
        badgeBg: '#FEF3C7',
        badgeText: '#92400E',
      },
      sections: {
        schoolIdentity: { enabled: true },
        badge: { enabled: true, text: 'إشعار مدرسي رسمي 📌', color: '#0C2340' },
        studentCard: { enabled: true },
        greeting: {
          enabled: true,
          text: 'المكرم ولي أمر الطالب / {guardianName} المحترم،،\nالسلام عليكم ورحمة الله وبركاته،',
        },
        dataTable: {
          enabled: true,
          items: [
            { id: '1', label: 'الطالب', value: '{studentName} ({studentNumber})' },
            { id: '2', label: 'الصف والشعبة', value: 'الصف {grade} ({track}) - شعبة {section}' },
            { id: '3', label: 'التاريخ', value: '{incidentDate}' },
          ],
        },
        mainBody: {
          enabled: true,
          text: 'نحيطكم علماً بخصوص نجلكم *{studentName}* المقيد بالصف *{grade}* شعبة (*{section}*) بتاريخ *{incidentDate}*:\n\n{violationDescription}\n\n*الإجراء المعتمد:*\n{approvedAction}',
        },
        keyPoints: { enabled: false, points: [] },
        requiredAction: {
          enabled: true,
          title: 'الإجراء المطلوب من ولي الأمر',
          text: '{requiredGuardianAction}',
        },
        actionButton: { enabled: false, text: '', url: '' },
        closingAndSignature: {
          enabled: true,
          closingText: 'شاكرين ومقدرين حسن تعاونكم الدائم مع المدرسة.',
          signerName: '{senderName}',
          signerRole: '{senderRole}',
        },
        contactBox: { enabled: true, phone: '{schoolPhone}', email: '{schoolEmail}' },
        footer: { enabled: true, text: '{schoolName} - نظام الرعاية والإرشاد الطلابي الذكي' },
      },
      body: '',
      variables: OFFICIAL_DYNAMIC_VARIABLES.map((v) => v.code),
      scope: 'school',
      isActive: true,
      isDefaultForCategory: false,
      isSystemTemplate: false,
      version: 1,
      revisionHistory: [],
      createdBy: currentUserId,
      createdByName: currentUserName,
      updatedBy: currentUserId,
      updatedByName: currentUserName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setIsCreatingNew(true);
    setChangeNote('إنشاء قالب جديد');
    setEditingTemplate(blank);
  };

  // Duplicate existing template without affecting original
  const handleDuplicateTemplate = (source: MessageTemplate) => {
    const nowIso = new Date().toISOString();
    const copy: MessageTemplate = {
      ...JSON.parse(JSON.stringify(source)),
      id: `tpl-copy-${Date.now()}`,
      name: `${source.name} (نسخة مخصصة)`,
      scope: 'school',
      isSystemTemplate: false,
      isDefaultForCategory: false,
      version: 1,
      revisionHistory: [],
      createdBy: currentUserId,
      createdByName: currentUserName,
      updatedBy: currentUserId,
      updatedByName: currentUserName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setIsCreatingNew(true);
    setChangeNote(`نسخة مشتقة من القالب: ${source.name}`);
    setEditingTemplate(copy);
  };

  // Open template for editing
  const handleEditTemplate = (tpl: MessageTemplate) => {
    setIsCreatingNew(false);
    setChangeNote('');
    setEditingTemplate(JSON.parse(JSON.stringify(tpl)));
  };

  // Toggle active/inactive quickly
  const handleToggleActive = async (tpl: MessageTemplate) => {
    if (!canManage) return;
    const updated: MessageTemplate = {
      ...tpl,
      isActive: !tpl.isActive,
      updatedBy: currentUserId,
      updatedByName: currentUserName,
      updatedAt: new Date().toISOString(),
    };
    await onSaveTemplate(updated, updated.isActive ? 'تفعيل القالب' : 'إيقاف القالب', true);
  };

  // Insert text or variable at exact cursor position
  const insertTextAtCursor = (snippet: string, wrapSelectionWith?: { prefix: string; suffix: string }) => {
    if (!editingTemplate) return;

    let targetEl: HTMLTextAreaElement | HTMLInputElement | null = mainBodyTextareaRef.current;
    if (activeField === 'requiredAction') targetEl = requiredActionTextareaRef.current;
    else if (activeField === 'greeting') targetEl = greetingInputRef.current;
    else if (activeField === 'subject') targetEl = subjectInputRef.current;

    if (!targetEl) {
      // Fallback: append to mainBody
      const currentText = editingTemplate.sections.mainBody.text || '';
      const nextText = wrapSelectionWith
        ? `${currentText} ${wrapSelectionWith.prefix}نص${wrapSelectionWith.suffix}`
        : `${currentText}${snippet}`;
      setEditingTemplate({
        ...editingTemplate,
        sections: {
          ...editingTemplate.sections,
          mainBody: { ...editingTemplate.sections.mainBody, text: nextText },
        },
      });
      return;
    }

    const start = targetEl.selectionStart ?? targetEl.value.length;
    const end = targetEl.selectionEnd ?? targetEl.value.length;
    const val = targetEl.value;
    const selectedText = val.substring(start, end);

    let replacement = snippet;
    if (wrapSelectionWith) {
      replacement = `${wrapSelectionWith.prefix}${selectedText || 'نص'}${wrapSelectionWith.suffix}`;
    }

    const nextVal = val.substring(0, start) + replacement + val.substring(end);

    if (activeField === 'mainBody') {
      setEditingTemplate({
        ...editingTemplate,
        body: nextVal,
        sections: {
          ...editingTemplate.sections,
          mainBody: { ...editingTemplate.sections.mainBody, enabled: true, text: nextVal },
        },
      });
    } else if (activeField === 'requiredAction') {
      setEditingTemplate({
        ...editingTemplate,
        sections: {
          ...editingTemplate.sections,
          requiredAction: { ...editingTemplate.sections.requiredAction, enabled: true, text: nextVal },
        },
      });
    } else if (activeField === 'greeting') {
      setEditingTemplate({
        ...editingTemplate,
        sections: {
          ...editingTemplate.sections,
          greeting: { ...editingTemplate.sections.greeting, enabled: true, text: nextVal },
        },
      });
    } else if (activeField === 'subject') {
      setEditingTemplate({
        ...editingTemplate,
        subject: nextVal,
      });
    }

    setTimeout(() => {
      if (targetEl) {
        targetEl.focus();
        const newCursorPos = start + replacement.length;
        targetEl.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 30);
  };

  // Restore a previous revision from revisionHistory
  const handleRestoreRevision = (rev: MessageTemplateRevision) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      name: rev.name,
      category: rev.category,
      subject: rev.subject,
      body: rev.body,
      sections: JSON.parse(JSON.stringify(rev.sections)),
    });
    setChangeNote(`استعادة النسخة السابقة رقم (v${rev.version}) بتاريخ ${new Date(rev.updatedAt).toLocaleDateString('ar-AE')}`);
    setShowRevisionsModal(false);
  };

  // Restore original system factory template if it is a built-in template
  const handleRestoreFactoryDefault = () => {
    if (!editingTemplate) return;
    const sysOrig = SYSTEM_DEFAULT_TEMPLATES.find((t) => t.id === editingTemplate.id);
    if (!sysOrig) return;
    setEditingTemplate({
      ...JSON.parse(JSON.stringify(sysOrig)),
      revisionHistory: editingTemplate.revisionHistory || [],
      version: editingTemplate.version || 1,
    });
    setChangeNote('استعادة النص الافتراضي الأصلي للنظام');
  };

  // Save changes to Firestore
  const handleConfirmSave = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) return;

    setIsSaving(true);
    try {
      const updatedTpl: MessageTemplate = {
        ...editingTemplate,
        body: editingTemplate.sections.mainBody.text || editingTemplate.body,
        updatedBy: currentUserId,
        updatedByName: currentUserName,
        updatedAt: new Date().toISOString(),
      };
      await onSaveTemplate(updatedTpl, changeNote || 'تحديث نص وإعدادات القالب');
      setEditingTemplate(null);
      setIsCreatingNew(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner & Action Header */}
      <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#006D77] to-[#0C2340] text-[#D4AF37] flex items-center justify-center shadow-md shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                وحدة إدارة قوالب الرسائل القابلة للتعديل
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                محفوظة في Cloud Firestore • {templates.length} قالب
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              إنشاء وتعديل ونسخ قوالب واتساب الرسمية، تحديد القالب الافتراضي لكل نوع مراسلة، واستعادة النسخ السابقة مع توثيق اسم الموظف وتاريخ التعديل.
            </p>
          </div>
        </div>

        {canManage && !editingTemplate && (
          <button
            type="button"
            onClick={handleStartCreateNew}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#006D77] hover:bg-[#0A4D54] text-white rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>إنشاء قالب رسالة جديد</span>
          </button>
        )}
      </div>

      {/* IF EDITING OR CREATING A TEMPLATE: FULL ARABIC WHATSAPP TEMPLATE EDITOR + LIVE PREVIEW */}
      {editingTemplate ? (
        <div className="bg-white dark:bg-[#0C2340] rounded-3xl border-2 border-[#006D77] shadow-xl overflow-hidden animate-in fade-in duration-200">
          {/* Editor Top Bar */}
          <div className="bg-gradient-to-r from-[#0C2340] to-[#0A4D54] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#D4AF37]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black">
                  {isCreatingNew ? 'إنشاء قالب رسالة جديد' : `تعديل القالب: ${editingTemplate.name}`}
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-teal-200 mt-0.5">
                  <span>الإصدار الحالي: v{editingTemplate.version || 1}</span>
                  <span>•</span>
                  <span>الموظف المُعدِّل: {currentUserName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Revision History Button */}
              {!isCreatingNew && (
                <button
                  type="button"
                  onClick={() => setShowRevisionsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-colors cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>النسخ السابقة ({editingTemplate.revisionHistory?.length || 0})</span>
                </button>
              )}

              {/* Restore Factory Default if system template */}
              {SYSTEM_DEFAULT_TEMPLATES.some((s) => s.id === editingTemplate.id) && (
                <button
                  type="button"
                  onClick={handleRestoreFactoryDefault}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-400/30 transition-colors cursor-pointer"
                  title="استعادة النص الأصلي للنظام"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة الأصل</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreatingNew(false);
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            </div>
          </div>

          {/* Two-Column Editor + Live WhatsApp Preview */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Right Column (7/12): Rich Arabic Template Editor */}
            <div className="lg:col-span-7 space-y-4">
              {/* Unknown Variable Alert */}
              {editorValidation.unknownVariables.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-black block">
                      تنبيه: يحتوي القالب على متغيرات غير معروفة!
                    </strong>
                    <p className="mt-0.5">
                      المتغيرات التالية غير معتمدة في النظام:{' '}
                      <span className="font-mono font-bold underline">
                        {editorValidation.unknownVariables.join(' ، ')}
                      </span>
                      . يرجى استبدالها بأحد المتغيرات الديناميكية المعتمدة أدناه قبل الحفظ.
                    </p>
                  </div>
                </div>
              )}

              {/* Row 1: Template Name & Category & Active/Default toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                    اسم القالب <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.name}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, name: e.target.value })
                    }
                    placeholder="مثال: إشعار مخالفة سلوكية رسمي..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                    نوع وتصنيف القالب <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        category: e.target.value as MessageCategory,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  >
                    {OFFICIAL_TEMPLATE_TYPES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={editingTemplate.isActive}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-[#006D77]"
                    />
                    <span>القالب مفعّل ومتاح للاستخدام في مركز المراسلات</span>
                  </label>

                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
                    <input
                      type="checkbox"
                      checked={Boolean(editingTemplate.isDefaultForCategory)}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          isDefaultForCategory: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded accent-[#D4AF37]"
                    />
                    <Star className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
                    <span>تعيين كقالب افتراضي لهذا النوع</span>
                  </label>
                </div>
              </div>

              {/* Formatting & Emoji & Dynamic Variables Toolbar */}
              <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                {/* Formatting + Emojis Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 ml-1">تنسيق واتساب:</span>
                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('', { prefix: '*', suffix: '*' })}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="خط عريض في واتساب (*نص*)"
                    >
                      <Bold className="w-3.5 h-3.5 text-[#006D77]" />
                      <span>عريض *</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('', { prefix: '_', suffix: '_' })}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="خط مائل في واتساب (_نص_)"
                    >
                      <Italic className="w-3.5 h-3.5 text-[#006D77]" />
                      <span>مائل _</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('\n• ')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="إضافة نقطة في سطر جديد"
                    >
                      <List className="w-3.5 h-3.5 text-[#006D77]" />
                      <span>نقطة •</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor('\n─────────────────────────\n')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-50 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="إدراج فاصل سطري أنيق"
                    >
                      <Minus className="w-3.5 h-3.5 text-[#006D77]" />
                      <span>فاصل</span>
                    </button>
                  </div>

                  {/* Quick Emojis */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Smile className="w-3.5 h-3.5 text-[#D4AF37] ml-1" />
                    {QUICK_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => insertTextAtCursor(em)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                        title={`إدراج ${em} في موضع المؤشر`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* One-Click Dynamic Variables Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black text-[#006D77] dark:text-teal-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>إدراج المتغيرات الديناميكية بضغطة واحدة (في موضع المؤشر):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      الحقل النشط للإدراج:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {activeField === 'mainBody'
                          ? 'النص الأساسي للرسالة'
                          : activeField === 'requiredAction'
                          ? 'الإجراء المطلوب من ولي الأمر'
                          : activeField === 'greeting'
                          ? 'تحية البداية'
                          : 'عنوان الإشعار'}
                      </strong>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {OFFICIAL_DYNAMIC_VARIABLES.map((v) => (
                      <button
                        key={v.code}
                        type="button"
                        onClick={() => insertTextAtCursor(v.code)}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                        title={`${v.description} (${v.code})`}
                      >
                        <span>+ {v.label}</span>
                        <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                          {v.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editable Text Fields */}
              <div className="space-y-3.5">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان الموضوع / الترويسة المختصرة:
                  </label>
                  <input
                    ref={subjectInputRef}
                    type="text"
                    value={editingTemplate.subject}
                    onFocus={() => setActiveField('subject')}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>

                {/* Greeting */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تحية البداية ومخاطبة ولي الأمر:
                  </label>
                  <input
                    ref={greetingInputRef}
                    type="text"
                    value={editingTemplate.sections.greeting.text}
                    onFocus={() => setActiveField('greeting')}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        sections: {
                          ...editingTemplate.sections,
                          greeting: {
                            ...editingTemplate.sections.greeting,
                            enabled: true,
                            text: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>

                {/* Main Body Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-100">
                      النص الأساسي للرسالة (يدعم الفقرات والأسطر وتنسيق واتساب) <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(editingTemplate.sections.mainBody.text || '').length} حرف
                    </span>
                  </div>
                  <textarea
                    ref={mainBodyTextareaRef}
                    rows={6}
                    value={editingTemplate.sections.mainBody.text}
                    onFocus={() => setActiveField('mainBody')}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        body: e.target.value,
                        sections: {
                          ...editingTemplate.sections,
                          mainBody: {
                            ...editingTemplate.sections.mainBody,
                            enabled: true,
                            text: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="اكتب نص القالب هنا واضغط على أزرار المتغيرات في الأعلى لإدراجها في موضع المؤشر..."
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-[#006D77]/40 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>

                {/* Required Guardian Action Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      قسم «الإجراء المطلوب من ولي الأمر»:
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTemplate.sections.requiredAction.enabled}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            sections: {
                              ...editingTemplate.sections,
                              requiredAction: {
                                ...editingTemplate.sections.requiredAction,
                                enabled: e.target.checked,
                              },
                            },
                          })
                        }
                        className="rounded accent-[#006D77]"
                      />
                      <span>إظهار في الرسالة</span>
                    </label>
                  </div>
                  {editingTemplate.sections.requiredAction.enabled && (
                    <textarea
                      ref={requiredActionTextareaRef}
                      rows={2}
                      value={editingTemplate.sections.requiredAction.text}
                      onFocus={() => setActiveField('requiredAction')}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          sections: {
                            ...editingTemplate.sections,
                            requiredAction: {
                              ...editingTemplate.sections.requiredAction,
                              text: e.target.value,
                            },
                          },
                        })
                      }
                      placeholder="مثال: {requiredGuardianAction} أو يرجى مراجعة المرشد الأكاديمي..."
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-[#006D77] outline-hidden"
                    />
                  )}
                </div>

                {/* Change Note for Audit Trail */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سبب أو ملاحظة التعديل (تُحفظ في سجل النسخ السابقة مع اسم الموظف):
                  </label>
                  <input
                    type="text"
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="مثال: تحديث صياغة الإجراء المطلوب ليتوافق مع اللائحة..."
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#006D77] outline-hidden"
                  />
                </div>
              </div>

              {/* Save / Cancel Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#006D77]" />
                  <span>يتم حفظ التعديل في Firestore مع تسجيل التاريخ واسم الموظف ({currentUserName})</span>
                </span>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(null);
                      setIsCreatingNew(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    إلغاء التعديلات
                  </button>

                  <button
                    type="button"
                    disabled={isSaving || editorValidation.unknownVariables.length > 0 || !editingTemplate.name.trim()}
                    onClick={handleConfirmSave}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] disabled:opacity-50 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-[#D4AF37]" />
                    <span>{isSaving ? 'جارٍ الحفظ في Firestore...' : 'حفظ واعتماد القالب'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Left Column (5/12): Live WhatsApp Final Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#006D77]" />
                  <span>معاينة شكل الرسالة النهائي قبل اعتماد التعديل</span>
                </h4>
                <span className="text-[10px] text-slate-400">محاكاة واتساب حية</span>
              </div>

              <div className="bg-[#111B21] rounded-[2rem] p-3.5 shadow-xl border-4 border-slate-800">
                {/* Header */}
                <div className="bg-[#075E54] text-white px-3.5 py-2.5 rounded-2xl flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white text-[#075E54] flex items-center justify-center font-black text-xs">
                      خ
                    </div>
                    <div>
                      <span className="text-xs font-bold block leading-tight">
                        {settings.schoolNameAr}
                      </span>
                      <span className="text-[10px] text-teal-200 block">
                        معاينة رسالة ولي الأمر
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chat Body */}
                <div className="bg-[#0B141A] rounded-2xl p-4 min-h-[360px] max-h-[480px] overflow-y-auto">
                  <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md text-xs leading-relaxed space-y-2 border border-teal-600/30">
                    <div className="border-b border-teal-500/40 pb-1.5 text-[11px] font-bold text-[#D4AF37]">
                      {editingTemplate.subject}
                    </div>
                    <p className="whitespace-pre-line text-slate-100 text-xs leading-relaxed font-sans">
                      {livePreviewText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TEMPLATES LIBRARY & FILTER BAR */
        <>
          <div className="bg-white dark:bg-[#0C2340] rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث في القوالب بالاسم أو النص أو التصنيف..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#006D77] outline-hidden"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'active', label: 'المفعّلة' },
                  { id: 'default', label: 'الافتراضية ⭐' },
                  { id: 'inactive', label: 'المتوقفة' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id as any)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-[#006D77] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 11 Official Categories Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategoryFilter === 'all'
                    ? 'bg-[#0C2340] text-[#D4AF37] shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                كافة الأنواع ({templates.length})
              </button>

              {OFFICIAL_TEMPLATE_TYPES.map((cat) => {
                const count = templates.filter((t) => t.category === cat.id).length;
                const isSelected = selectedCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#006D77] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Templates Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((tpl) => {
              const catMeta = getCategoryMeta(tpl.category);
              const lastModifiedDate = tpl.updatedAt
                ? new Date(tpl.updatedAt).toLocaleDateString('ar-AE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : '2026/09/01';
              const modifierName = tpl.updatedByName || tpl.createdByName || 'أمير علي عبدالشاكر بكري';

              return (
                <div
                  key={tpl.id}
                  className={`rounded-3xl border p-5 flex flex-col justify-between transition-all shadow-xs ${
                    !tpl.isActive
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                      : tpl.isDefaultForCategory
                      ? 'bg-white dark:bg-[#0C2340] border-2 border-[#006D77] shadow-sm'
                      : 'bg-white dark:bg-[#0C2340] border-slate-200/90 dark:border-slate-800 hover:border-[#006D77]/60'
                  }`}
                >
                  <div>
                    {/* Top Badges: Category, Default Star, Active Toggle */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${catMeta.badgeColor}`}
                        >
                          {catMeta.label}
                        </span>

                        {tpl.isDefaultForCategory && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                            <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
                            <span>افتراضي للنوع</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(tpl)}
                        disabled={!canManage}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                          tpl.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                        }`}
                        title="تفعيل القالب أو إيقافه"
                      >
                        <Power className="w-3 h-3" />
                        <span>{tpl.isActive ? 'مفعّل' : 'متوقف'}</span>
                      </button>
                    </div>

                    {/* Title & Subject */}
                    <h3 className="font-black text-sm text-slate-900 dark:text-white mb-1">
                      {tpl.name}
                    </h3>
                    <p className="text-[11px] font-bold text-[#006D77] dark:text-teal-300 mb-2.5 truncate">
                      {tpl.subject}
                    </p>

                    {/* Body snippet */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-line mb-3">
                      {tpl.sections?.mainBody?.text || tpl.body}
                    </div>
                  </div>

                  {/* Audit Info & Action Buttons */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Modifier & Timestamp */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 truncate" title={modifierName}>
                        <User className="w-3 h-3 text-[#006D77]" />
                        <span>آخر تعديل: {modifierName}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{lastModifiedDate}</span>
                      </span>
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => onUseTemplateForSending(tpl)}
                        disabled={!tpl.isActive}
                        className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] disabled:opacity-40 text-white text-[11px] font-bold transition-colors cursor-pointer"
                        title="استخدام هذا القالب لإرسال إشعار"
                      >
                        <Send className="w-3 h-3 text-[#D4AF37]" />
                        <span>استخدام</span>
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(tpl)}
                            className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-700 dark:text-slate-200 hover:text-[#006D77] text-[11px] font-bold transition-colors cursor-pointer"
                            title="تعديل نص وإعدادات القالب"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateTemplate(tpl)}
                            className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                            title="نسخ القالب وتعديله دون التأثير على الأصل"
                          >
                            <Copy className="w-3 h-3" />
                            <span>نسخ</span>
                          </button>

                          {!tpl.isDefaultForCategory ? (
                            <button
                              type="button"
                              onClick={() => onSetDefaultForCategory(tpl.id, tpl.category)}
                              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 text-[11px] font-bold transition-colors cursor-pointer"
                              title="تعيين كقالب افتراضي لهذا النوع"
                            >
                              <Star className="w-3 h-3 text-[#D4AF37]" />
                              <span>افتراضي</span>
                            </button>
                          ) : !tpl.isSystemTemplate ? (
                            <button
                              type="button"
                              onClick={() => onDeleteTemplate(tpl.id)}
                              className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer"
                              title="حذف القالب المخصص"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>حذف</span>
                            </button>
                          ) : (
                            <span className="flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              <Check className="w-3 h-3" />
                              <span>معتمد</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Revisions History Modal */}
      {showRevisionsModal && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#0C2340] rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-5 bg-[#0C2340] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="font-black text-sm">سجل النسخ والتعديلات السابقة للقالب</h3>
                  <p className="text-[11px] text-slate-300">{editingTemplate.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRevisionsModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {(!editingTemplate.revisionHistory || editingTemplate.revisionHistory.length === 0) ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  لا توجد نسخ سابقة محفوظة لهذا القالب بعد. يتم حفظ نسخة تلقائياً عند كل تعديل.
                </div>
              ) : (
                editingTemplate.revisionHistory.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#006D77] dark:text-teal-300">
                        النسخة (v{rev.version}) — {rev.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRestoreRevision(rev)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl bg-[#006D77] hover:bg-[#0A4D54] text-white text-[11px] font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-[#D4AF37]" />
                        <span>استعادة هذه النسخة</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>الموظف: <strong>{rev.updatedByName}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{new Date(rev.updatedAt).toLocaleString('ar-AE')}</span>
                    </div>
                    {rev.changeNote && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        ملاحظة التعديل: {rev.changeNote}
                      </div>
                    )}
                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-line line-clamp-3">
                      {rev.sections?.mainBody?.text || rev.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
