import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Palette,
  Sparkles,
  Check,
  Type,
  ListOrdered,
  FileText,
  UserCheck,
  Building,
  Bell,
  Link,
  PhoneCall,
  Bold,
  Italic,
  List,
  Pilcrow,
  Minus,
  Eye,
  CheckCircle2,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { MessageTemplate, MessageDataTableItem, Student, SchoolMessageSettings } from '../../types';
import {
  OFFICIAL_DYNAMIC_VARIABLES,
  generatePlainTextVersion,
  renderMessageVariables,
} from '../../firebase/messageService';

interface MessageEditorProps {
  template: MessageTemplate;
  onChange: (updated: MessageTemplate) => void;
  availableVariables?: string[];
  sampleStudent?: Student | null;
  settings?: SchoolMessageSettings;
  onApproveMessage?: () => void;
}

const QUICK_EMOJIS = ['🏫', '📌', '⚠️', '✅', '📅', '📞', '📄', '🤝', '🌟', '🎓'];

/**
 * Renders WhatsApp-formatted text (*bold*, _italic_, ~strike~, paragraphs) into React elements
 */
export function renderWhatsAppFormattedText(text: string): React.ReactNode {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);

  const formatInline = (line: string, lineKey: string) => {
    // Tokenize *bold*, _italic_, ~strike~
    const parts = line.split(/(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <strong key={`${lineKey}-b-${idx}`} className="font-black text-white">
            {part.slice(1, -1)}
          </strong>
        );
      }
      if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
        return (
          <em key={`${lineKey}-i-${idx}`} className="italic text-teal-100">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
        return (
          <span key={`${lineKey}-s-${idx}`} className="line-through opacity-75">
            {part.slice(1, -1)}
          </span>
        );
      }
      return <React.Fragment key={`${lineKey}-t-${idx}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="space-y-2.5">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split('\n');
        return (
          <div key={`p-${pIdx}`} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={`l-${pIdx}-${lIdx}`}>
                {formatInline(line, `${pIdx}-${lIdx}`)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
  template,
  onChange,
  sampleStudent,
  settings,
  onApproveMessage,
}) => {
  const [openSection, setOpenSection] = useState<string>('mainBody');
  const [activeInputRef, setActiveInputRef] = useState<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(true);
  const mainBodyRef = useRef<HTMLTextAreaElement | null>(null);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? '' : id);
  };

  const updateSection = (sectionName: keyof MessageTemplate['sections'], data: any) => {
    setIsApproved(false);
    onChange({
      ...template,
      sections: {
        ...template.sections,
        [sectionName]: {
          ...(template.sections as any)[sectionName],
          ...data,
        },
      },
    });
  };

  const updateColors = (newColors: Partial<MessageTemplate['colors']>) => {
    onChange({
      ...template,
      colors: {
        ...template.colors,
        ...newColors,
      },
    });
  };

  const getTargetInput = (): HTMLTextAreaElement | HTMLInputElement | null => {
    return activeInputRef || mainBodyRef.current;
  };

  const applyValueToField = (target: HTMLTextAreaElement | HTMLInputElement, nextVal: string) => {
    setIsApproved(false);
    const fieldName = target.dataset.fieldName || 'mainBody';
    if (fieldName === 'mainBody') {
      updateSection('mainBody', { text: nextVal });
    } else if (fieldName === 'greeting') {
      updateSection('greeting', { text: nextVal });
    } else if (fieldName === 'requiredAction') {
      updateSection('requiredAction', { text: nextVal });
    } else if (fieldName === 'subject') {
      onChange({ ...template, subject: nextVal });
    } else if (fieldName === 'badgeText') {
      updateSection('badge', { text: nextVal });
    }
  };

  const insertVariable = (code: string) => {
    const target = getTargetInput();
    if (!target) {
      updateSection('mainBody', {
        text: (template.sections.mainBody.text || '') + ' ' + code,
      });
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const val = target.value;
    const nextVal = val.substring(0, start) + code + val.substring(end);

    applyValueToField(target, nextVal);

    setTimeout(() => {
      target.focus();
      target.setSelectionRange(start + code.length, start + code.length);
    }, 30);
  };

  const applyWhatsAppFormatting = (
    type: 'bold' | 'italic' | 'strike' | 'paragraph' | 'bullet' | 'divider'
  ) => {
    const target = getTargetInput();
    if (!target) return;

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const val = target.value;
    const selected = val.substring(start, end);

    let replacement = '';
    let cursorOffset = 0;

    if (type === 'bold') {
      replacement = selected ? `*${selected}*` : '*نص عريض*';
      cursorOffset = replacement.length;
    } else if (type === 'italic') {
      replacement = selected ? `_${selected}_` : '_نص مائل_';
      cursorOffset = replacement.length;
    } else if (type === 'strike') {
      replacement = selected ? `~${selected}~` : '~نص مشطوب~';
      cursorOffset = replacement.length;
    } else if (type === 'paragraph') {
      replacement = `\n\n${selected}`;
      cursorOffset = replacement.length;
    } else if (type === 'bullet') {
      if (selected) {
        replacement = selected
          .split('\n')
          .map((line) => (line.trim().startsWith('•') ? line : `• ${line}`))
          .join('\n');
      } else {
        replacement = '\n• ';
      }
      cursorOffset = replacement.length;
    } else if (type === 'divider') {
      replacement = `\n━━━━━━━━━━━━━━\n${selected}`;
      cursorOffset = replacement.length;
    }

    const nextVal = val.substring(0, start) + replacement + val.substring(end);
    applyValueToField(target, nextVal);

    setTimeout(() => {
      target.focus();
      target.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 30);
  };

  const addTableItem = () => {
    const items = template.sections.dataTable.items || [];
    const newItem: MessageDataTableItem = {
      id: `item-${Date.now()}`,
      label: 'بند جديد',
      value: 'القيمة المحددة',
    };
    updateSection('dataTable', { items: [...items, newItem] });
  };

  const removeTableItem = (id: string) => {
    const items = (template.sections.dataTable.items || []).filter((i) => i.id !== id);
    updateSection('dataTable', { items });
  };

  const updateTableItem = (id: string, field: 'label' | 'value', val: string) => {
    const items = (template.sections.dataTable.items || []).map((i) =>
      i.id === id ? { ...i, [field]: val } : i
    );
    updateSection('dataTable', { items });
  };

  const addKeyPoint = () => {
    const points = template.sections.keyPoints.points || [];
    updateSection('keyPoints', { points: [...points, 'نقطة توضيحية جديدة'] });
  };

  const removeKeyPoint = (idx: number) => {
    const points = (template.sections.keyPoints.points || []).filter((_, i) => i !== idx);
    updateSection('keyPoints', { points });
  };

  const updateKeyPoint = (idx: number, val: string) => {
    const points = [...(template.sections.keyPoints.points || [])];
    points[idx] = val;
    updateSection('keyPoints', { points });
  };

  // Sample vars for instant preview
  const sampleVars: Record<string, string | number | undefined> = {
    studentName: sampleStudent?.fullName || 'أحمد محمد الشامسي',
    student: sampleStudent?.fullName || 'أحمد محمد الشامسي',
    studentNumber: sampleStudent?.studentNumber || '20261045',
    grade: sampleStudent?.grade || 'العاشر',
    track: sampleStudent?.track || 'المتقدم',
    section: sampleStudent?.section || '1',
    guardianName: sampleStudent?.parentName || 'محمد الشامسي',
    guardian: sampleStudent?.parentName || 'محمد الشامسي',
    violationDescription: 'التأخر الصباحي وعدم الالتزام بالزي المدرسي',
    incidentDate: new Date().toLocaleDateString('ar-AE'),
    date: new Date().toLocaleDateString('ar-AE'),
    approvedAction: 'التنبيه الشفهي الفردي وتوثيق التعهد السلوكي',
    requiredGuardianAction:
      template.sections.requiredAction?.text ||
      'يرجى متابعة التزام الطالب والتواصل مع المرشد الأكاديمي والمهني.',
    schoolName: settings?.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
    school: settings?.schoolNameAr || 'أكاديمية الفجيرة العلمية الإسلامية',
    schoolPhone: settings?.phone || '09-2220000',
    phone: settings?.phone || '09-2220000',
    schoolEmail: settings?.email || 'info@fsia.edu.ae',
    email: settings?.email || 'info@fsia.edu.ae',
    senderName: settings?.defaultSenderName || 'أمير علي عبدالشاكر بكري',
    senderRole: settings?.defaultSenderRole || 'المرشد الأكاديمي والمهني',
    absenceCount: sampleStudent?.totalAbsences || 2,
    latenessCount: sampleStudent?.totalTardiness || 3,
  };

  const livePreviewText = generatePlainTextVersion(template, sampleVars);
  const livePreviewSubject = renderMessageVariables(template.subject, sampleVars);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
      {/* RIGHT COLUMN (7/12): Rich WhatsApp Editor & Sections */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* 1. WhatsApp Formatting & One-Click Dynamic Variables Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-2xs">
          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 ml-1">
                تنسيق واتساب:
              </span>
              <button
                type="button"
                onClick={() => applyWhatsAppFormatting('bold')}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 text-xs font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                title="خط عريض في واتساب (*نص*)"
              >
                <Bold className="w-3.5 h-3.5 text-[#006D77]" />
                <span>خط عريض</span>
              </button>

              <button
                type="button"
                onClick={() => applyWhatsAppFormatting('paragraph')}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                title="إدراج فقرة جديدة"
              >
                <Pilcrow className="w-3.5 h-3.5 text-[#006D77]" />
                <span>فقرة جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => applyWhatsAppFormatting('bullet')}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                title="قائمة نقطية (•)"
              >
                <List className="w-3.5 h-3.5 text-[#006D77]" />
                <span>نقطة قائمة</span>
              </button>

              <button
                type="button"
                onClick={() => applyWhatsAppFormatting('italic')}
                className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                title="نص مائل (_نص_)"
              >
                <Italic className="w-3.5 h-3.5" />
                <span>مائل</span>
              </button>

              <button
                type="button"
                onClick={() => applyWhatsAppFormatting('divider')}
                className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-teal-50 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                title="إدراج خط فاصل بين الفقرات"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>فاصل</span>
              </button>
            </div>

            {/* Quick Emojis */}
            <div className="flex items-center gap-1 flex-wrap">
              {QUICK_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => insertVariable(em)}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 hover:bg-amber-50 border border-slate-200 dark:border-slate-600 text-xs flex items-center justify-center cursor-pointer"
                  title={`إدراج ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* One-Click Dynamic Variables */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>إدراج المتغيرات الديناميكية بضغطة واحدة (في موضع المؤشر):</span>
              </div>
              <span className="text-[10px] text-slate-400">تُستبدل ببيانات كل طالب تلقائياً</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {OFFICIAL_DYNAMIC_VARIABLES.map((v) => (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => insertVariable(v.code)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-[#006D77] dark:text-teal-300 hover:text-[#0C2340] border border-slate-200 dark:border-slate-600 rounded-lg text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  title={v.description}
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

        {/* 2. Message Subject & Basic Info */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                عنوان الموضوع (الإشعار الرئيسي)
              </label>
              <input
                type="text"
                data-field-name="subject"
                value={template.subject}
                onFocus={(e) => setActiveInputRef(e.target)}
                onChange={(e) => {
                  setIsApproved(false);
                  onChange({ ...template, subject: e.target.value });
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#006D77] outline-hidden"
                placeholder="مثال: إشعار مخالفة سلوكية للطالب {studentName}"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                درجة الأهمية
              </label>
              <select
                value={template.importance}
                onChange={(e) => onChange({ ...template, importance: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-[#006D77] outline-hidden"
              >
                <option value="normal">عادية (إشعار يومي أو روتيني)</option>
                <option value="important">مهمة (متابعة دراسية أو سلوكية)</option>
                <option value="urgent">عاجلة (إنذار أو استدعاء رسمي)</option>
                <option value="veryUrgent">عاجلة جداً (لجنة إدارة السلوك)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Main Body & Sections */}
        <div className="space-y-3">
          {/* S6: Main Body (Expanded by default at top for immediate editing) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-[#006D77]/40 dark:border-teal-700/50 overflow-hidden shadow-xs">
            <div
              className="flex items-center justify-between p-3.5 cursor-pointer bg-teal-50/40 dark:bg-teal-950/30"
              onClick={() => toggleSection('mainBody')}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#006D77]" />
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                  متن وفقرات الرسالة الأساسية (يدعم *الخط العريض* والفقرات)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={template.sections.mainBody.enabled}
                    onChange={(e) => updateSection('mainBody', { enabled: e.target.checked })}
                    className="rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span>تفعيل</span>
                </label>
                {openSection === 'mainBody' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {openSection === 'mainBody' && (
              <div className="p-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                <textarea
                  ref={mainBodyRef}
                  data-field-name="mainBody"
                  rows={6}
                  value={template.sections.mainBody.text}
                  onFocus={(e) => setActiveInputRef(e.target)}
                  onChange={(e) => updateSection('mainBody', { text: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm leading-relaxed outline-hidden focus:ring-2 focus:ring-[#006D77]"
                  placeholder="اكتب متن الرسالة هنا... استخدم *النص* للخط العريض أو أزرار المتغيرات أعلاه"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>تلميح: حدد أي كلمة واضغط «خط عريض» لإحاطتها بـ *نجمتين* كما في واتساب.</span>
                  <span>{template.sections.mainBody.text?.length || 0} حرف</span>
                </div>
              </div>
            )}
          </div>

          {/* S4: Greeting */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('greeting')}
            >
              <div className="flex items-center gap-2.5">
                <Type className="w-4 h-4 text-[#006D77]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">التحية والافتتاحية</span>
              </div>
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={template.sections.greeting.enabled}
                    onChange={(e) => updateSection('greeting', { enabled: e.target.checked })}
                    className="rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span>تفعيل</span>
                </label>
                {openSection === 'greeting' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {openSection === 'greeting' && (
              <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <input
                  type="text"
                  data-field-name="greeting"
                  value={template.sections.greeting.text}
                  onFocus={(e) => setActiveInputRef(e.target)}
                  onChange={(e) => updateSection('greeting', { text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden"
                  placeholder="المكرم ولي أمر الطالب {guardianName} المحترم،،"
                />
              </div>
            )}
          </div>

          {/* S8: Required Action */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('requiredAction')}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  الإجراء المطلوب من ولي الأمر
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={template.sections.requiredAction.enabled}
                    onChange={(e) => updateSection('requiredAction', { enabled: e.target.checked })}
                    className="rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span>تفعيل</span>
                </label>
                {openSection === 'requiredAction' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {openSection === 'requiredAction' && (
              <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                <input
                  type="text"
                  value={template.sections.requiredAction.title || 'الإجراء المطلوب من ولي الأمر'}
                  onChange={(e) => updateSection('requiredAction', { title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
                <textarea
                  rows={2}
                  data-field-name="requiredAction"
                  value={template.sections.requiredAction.text}
                  onFocus={(e) => setActiveInputRef(e.target)}
                  onChange={(e) => updateSection('requiredAction', { text: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            )}
          </div>

          {/* S5: Data Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('dataTable')}
            >
              <div className="flex items-center gap-2.5">
                <ListOrdered className="w-4 h-4 text-[#006D77]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">جدول بيانات وتفاصيل الإشعار</span>
              </div>
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={template.sections.dataTable.enabled}
                    onChange={(e) => updateSection('dataTable', { enabled: e.target.checked })}
                    className="rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span>تفعيل</span>
                </label>
                {openSection === 'dataTable' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {openSection === 'dataTable' && (
              <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                {(template.sections.dataTable.items || []).map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateTableItem(item.id, 'label', e.target.value)}
                      className="w-1/3 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="اسم البند"
                    />
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => updateTableItem(item.id, 'value', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      placeholder="القيمة أو المتغير"
                    />
                    <button
                      type="button"
                      onClick={() => removeTableItem(item.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTableItem}
                  className="flex items-center gap-1.5 text-xs text-[#006D77] hover:underline font-bold mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة بند لجدول البيانات</span>
                </button>
              </div>
            )}
          </div>

          {/* S7: Key Points */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div
              className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleSection('keyPoints')}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#006D77]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">نقاط توضيحية هامة (قائمة نقطية)</span>
              </div>
              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={template.sections.keyPoints.enabled}
                    onChange={(e) => updateSection('keyPoints', { enabled: e.target.checked })}
                    className="rounded text-[#006D77] focus:ring-[#006D77]"
                  />
                  <span>تفعيل</span>
                </label>
                {openSection === 'keyPoints' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>
            {openSection === 'keyPoints' && (
              <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                {(template.sections.keyPoints.points || []).map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[#006D77] font-bold">•</span>
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => updateKeyPoint(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeKeyPoint(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addKeyPoint}
                  className="flex items-center gap-1.5 text-xs text-[#006D77] hover:underline font-bold mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة نقطة هامة</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LEFT COLUMN (5/12): Instant Live WhatsApp Preview & Approval */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-[#0C2340] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#006D77]" />
              <h4 className="text-xs font-black text-slate-900 dark:text-white">
                معاينة فورية لشكل الرسالة على واتساب قبل اعتمادها
              </h4>
            </div>
            {isApproved ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>معتمدة</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                بانتظار الاعتماد
              </span>
            )}
          </div>

          <div className="bg-[#0B141A] rounded-2xl p-3.5 max-h-[420px] overflow-y-auto space-y-3 border border-slate-800">
            <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md text-xs leading-relaxed space-y-2 border border-teal-500/30">
              <div className="border-b border-teal-500/40 pb-1.5 text-[11px] font-black text-[#D4AF37]">
                {livePreviewSubject}
              </div>
              <div className="text-slate-100 text-xs leading-relaxed font-sans">
                {renderWhatsAppFormattedText(livePreviewText)}
              </div>
              <div className="flex items-center justify-end gap-1 text-[10px] text-teal-200/80 pt-1">
                <span>{new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' })}</span>
                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsApproved(true);
              if (onApproveMessage) onApproveMessage();
            }}
            className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
              isApproved
                ? 'bg-emerald-600 text-white'
                : 'bg-[#006D77] hover:bg-[#0A4D54] text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
            <span>
              {isApproved ? 'تم اعتماد شكل الرسالة النهائي' : 'اعتماد شكل الرسالة بعد المعاينة'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
