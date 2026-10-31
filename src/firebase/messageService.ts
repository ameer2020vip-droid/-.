import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseReady } from './config';
import { safeGetDoc, safeGetDocs, DEFAULT_SCHOOL_ID } from './firestoreService';
import {
  MessageTemplate,
  MessageTemplateRevision,
  MessageLogRecord,
  MessageQueueRecord,
  SchoolMessageSettings,
  MessageStatus,
  MessageCategory,
} from '../types';
import { SYSTEM_DEFAULT_TEMPLATES } from '../data/defaultMessageTemplates';

const LOCAL_TEMPLATES_STORAGE_KEY = 'alkhalil_message_templates_v1';
const LOCAL_MESSAGE_LOGS_STORAGE_KEY = 'alkhalil_message_logs_v1';

export const DEFAULT_SCHOOL_MESSAGE_SETTINGS: SchoolMessageSettings = {
  schoolId: DEFAULT_SCHOOL_ID,
  schoolNameAr: 'أكاديمية الفجيرة العلمية الإسلامية',
  schoolNameEn: 'Fujairah Islamic Scientific Academy',
  schoolNumber: '7001',
  emirate: 'الفجيرة',
  cycle: 'جميع المراحل الدراسية (الصف الخامس حتى الثاني عشر)',
  logoUrl: '',
  phone: '09-2220000',
  email: 'mohamedadelfujaca@gmail.com',
  defaultSenderName: 'أمير علي عبدالشاكر بكري',
  defaultSenderRole: 'المرشد الأكاديمي والمهني - مكتب الإرشاد الطلابي',
  academicYear: '2026–2027',
  semester: 'الفصل الدراسي الأول',
  whatsappEnabled: true,
  emailEnabled: true,
  autoGreeting: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة وبعد،،',
  autoFooter: 'مركز التواصل الذكي مع أولياء الأمور - أكاديمية الفجيرة العلمية الإسلامية',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export const OFFICIAL_DYNAMIC_VARIABLES: Array<{
  code: string;
  aliases: string[];
  label: string;
  description: string;
  requiredForCategories?: MessageCategory[];
}> = [
  {
    code: '{studentName}',
    aliases: ['{student}', '{studentNameAr}', '[اسم_الطالب]'],
    label: 'اسم الطالب',
    description: 'الاسم الكامل للطالب',
  },
  {
    code: '{studentNumber}',
    aliases: ['{studentId}', '[الرقم_الطلابي]'],
    label: 'الرقم الطلابي',
    description: 'الرقم الوزاري/الطلابي المعتمد',
  },
  {
    code: '{grade}',
    aliases: ['[الصف]'],
    label: 'الصف الدراسي',
    description: 'الصف الدراسي (9، 10، 11، 12)',
  },
  {
    code: '{track}',
    aliases: ['[المسار]'],
    label: 'المسار',
    description: 'المسار الأكاديمي (عام / متقدم / نخبة)',
  },
  {
    code: '{section}',
    aliases: ['[الشعبة]'],
    label: 'الشعبة',
    description: 'رقم أو رمز الشعبة الدراسية',
  },
  {
    code: '{guardianName}',
    aliases: ['{guardian}', '{parentName}', '[ولي_الأمر]'],
    label: 'اسم ولي الأمر',
    description: 'اسم ولي الأمر المسجل في ملف الطالب',
  },
  {
    code: '{violationDescription}',
    aliases: ['{violationType}', '[وصف_المخالفة]'],
    label: 'وصف المخالفة / الملاحظة',
    description: 'وصف المخالفة السلوكية أو سبب الإشعار المرتبط بالطالب',
    requiredForCategories: ['behavior', 'committeeDecision', 'phoneConfiscation', 'uniformNotice'],
  },
  {
    code: '{incidentDate}',
    aliases: ['{date}', '{meetingDate}', '[التاريخ]'],
    label: 'تاريخ الواقعة / الموعد',
    description: 'تاريخ تسجيل الواقعة أو موعد الاجتماع',
  },
  {
    code: '{approvedAction}',
    aliases: ['[الإجراء_المعتمد]'],
    label: 'الإجراء المعتمد',
    description: 'الإجراء التربوي المعتمد وفق لائحة السلوك أو قرار اللجنة',
    requiredForCategories: ['behavior', 'committeeDecision'],
  },
  {
    code: '{requiredGuardianAction}',
    aliases: ['[المطلوب_من_ولي_الأمر]'],
    label: 'الإجراء المطلوب من ولي الأمر',
    description: 'المطلوب من ولي الأمر (حضور، متابعة، توقيع تعهد...)',
  },
  {
    code: '{schoolName}',
    aliases: ['{school}', '{schoolNameAr}', '[المدرسة]'],
    label: 'اسم الأكاديمية',
    description: 'أكاديمية الفجيرة العلمية الإسلامية',
  },
  {
    code: '{schoolPhone}',
    aliases: ['{phone}', '[هاتف_المدرسة]'],
    label: 'هاتف المدرسة',
    description: 'رقم التواصل الرسمي للمدرسة',
  },
  {
    code: '{schoolEmail}',
    aliases: ['{email}', '[بريد_المدرسة]'],
    label: 'بريد المدرسة',
    description: 'البريد الإلكتروني الرسمي للمدرسة (mohamedadelfujaca@gmail.com)',
  },
  {
    code: '{subject}',
    aliases: ['[المادة]'],
    label: 'المادة الدراسية',
    description: 'اسم المادة الدراسية في تنبيهات الواجبات والملاحظات الأكاديمية',
  },
  {
    code: '{messageBody}',
    aliases: ['[نص_الإعلان]'],
    label: 'نص الإعلان أو التعميم',
    description: 'النص المخصص للإعلانات والتعاميم المدرسية العامة',
  },
];

const KNOWN_VARIABLE_NAMES = new Set<string>([
  'studentName',
  'student',
  'studentNameAr',
  'studentNumber',
  'studentId',
  'grade',
  'track',
  'section',
  'guardianName',
  'guardian',
  'parentName',
  'relation',
  'violationDescription',
  'violationType',
  'incidentDate',
  'date',
  'time',
  'approvedAction',
  'requiredGuardianAction',
  'schoolName',
  'school',
  'schoolNameAr',
  'schoolNameEn',
  'schoolId',
  'schoolPhone',
  'phone',
  'schoolEmail',
  'email',
  'senderName',
  'senderRole',
  'academicYear',
  'semester',
  'absenceCount',
  'latenessCount',
  'meetingDate',
  'meetingTime',
  'customText',
  'subject',
  'messageBody',
]);

export interface VariableValidationResult {
  isValid: boolean;
  unknownVariables: string[];
  missingVariables: Array<{ code: string; label: string }>;
}

/**
 * Validates a template string for unknown `{variable}` tags and missing required values
 */
export function validateMessageVariables(
  text: string,
  variables: Record<string, string | number | undefined | null>
): VariableValidationResult {
  const unknownVariables: string[] = [];
  const missingVariables: Array<{ code: string; label: string }> = [];

  if (!text) {
    return { isValid: true, unknownVariables, missingVariables };
  }

  const matches = text.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  const seen = new Set<string>();

  for (const rawMatch of matches) {
    if (seen.has(rawMatch)) continue;
    seen.add(rawMatch);

    const varName = rawMatch.slice(1, -1);
    if (!KNOWN_VARIABLE_NAMES.has(varName)) {
      unknownVariables.push(rawMatch);
      continue;
    }

    // Check if value is provided and non-empty
    const val = variables[varName];
    if (val === undefined || val === null || String(val).trim() === '') {
      const def = OFFICIAL_DYNAMIC_VARIABLES.find(
        (d) => d.code.toLowerCase() === rawMatch.toLowerCase() || d.aliases.some((a) => a.toLowerCase() === rawMatch.toLowerCase())
      );
      missingVariables.push({
        code: rawMatch,
        label: def?.label || varName,
      });
    }
  }

  return {
    isValid: unknownVariables.length === 0 && missingVariables.length === 0,
    unknownVariables,
    missingVariables,
  };
}

/**
 * Replaces all placeholders ({studentName}, {grade}, {section}, etc.) in a text string
 * safely with no undefined or nulls.
 */
export function renderMessageVariables(
  text: string,
  variables: Record<string, string | number | undefined | null>
): string {
  if (!text) return '';

  // Enrich variables with canonical aliases so both {studentName} and {student} work seamlessly
  const enriched: Record<string, string> = {};
  for (const [k, v] of Object.entries(variables)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      enriched[k] = String(v);
    }
  }

  const studentName = enriched.studentName || enriched.student || enriched.studentNameAr || '';
  const studentNumber = enriched.studentNumber || enriched.studentId || '';
  const guardianName = enriched.guardianName || enriched.guardian || enriched.parentName || 'ولي الأمر المحترم';
  const schoolName = enriched.schoolName || enriched.school || enriched.schoolNameAr || DEFAULT_SCHOOL_MESSAGE_SETTINGS.schoolNameAr;
  const schoolPhone = enriched.schoolPhone || enriched.phone || DEFAULT_SCHOOL_MESSAGE_SETTINGS.phone;
  const schoolEmail = enriched.schoolEmail || enriched.email || DEFAULT_SCHOOL_MESSAGE_SETTINGS.email;
  const incidentDate = enriched.incidentDate || enriched.date || new Date().toLocaleDateString('ar-AE');

  const finalMap: Record<string, string> = {
    ...enriched,
    studentName,
    student: studentName,
    studentNameAr: studentName,
    studentNumber,
    studentId: studentNumber,
    guardianName,
    guardian: guardianName,
    parentName: guardianName,
    schoolName,
    school: schoolName,
    schoolNameAr: schoolName,
    schoolPhone,
    phone: schoolPhone,
    schoolEmail,
    email: schoolEmail,
    incidentDate,
    date: enriched.date || incidentDate,
    time: enriched.time || new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' }),
  };

  let result = text;
  for (const [key, val] of Object.entries(finalMap)) {
    if (val !== undefined && val !== '') {
      const regex = new RegExp(`\\{${key}\\}`, 'gi');
      result = result.replace(regex, val);
    }
  }

  // Support Arabic bracket syntax as well
  result = result
    .replace(/\[اسم_الطالب\]/g, studentName || 'الطالب')
    .replace(/\[الرقم_الطلابي\]/g, studentNumber || '')
    .replace(/\[الصف\]/g, finalMap.grade || '')
    .replace(/\[الشعبة\]/g, finalMap.section || '')
    .replace(/\[المسار\]/g, finalMap.track || 'عام')
    .replace(/\[ولي_الأمر\]/g, guardianName)
    .replace(/\[وصف_المخالفة\]/g, finalMap.violationDescription || '')
    .replace(/\[التاريخ\]/g, incidentDate)
    .replace(/\[الوقت\]/g, finalMap.time || '')
    .replace(/\[الإجراء_المعتمد\]/g, finalMap.approvedAction || '')
    .replace(/\[المطلوب_من_ولي_الأمر\]/g, finalMap.requiredGuardianAction || '')
    .replace(/\[المدرسة\]/g, schoolName)
    .replace(/\[هاتف_المدرسة\]/g, schoolPhone)
    .replace(/\[بريد_المدرسة\]/g, schoolEmail)
    .replace(/\[المادة\]/g, finalMap.subject || 'المادة الدراسية')
    .replace(/\[نص_الإعلان\]/g, finalMap.messageBody || '');

  return result.trim();
}

/**
 * Generates an elegantly formatted plain-text version suitable for WhatsApp
 * and mailto body.
 */
export function generatePlainTextVersion(
  template: MessageTemplate,
  vars: Record<string, string | number | undefined | null>
): string {
  const lines: string[] = [];

  // Header / School
  if (template.sections.schoolIdentity.enabled) {
    const school = vars.schoolName || vars.school || DEFAULT_SCHOOL_MESSAGE_SETTINGS.schoolNameAr;
    lines.push(`🏫 *${school}*`);
    lines.push('─────────────────────────');
  }

  // Badge
  if (template.sections.badge.enabled && template.sections.badge.text) {
    const badge = renderMessageVariables(template.sections.badge.text, vars);
    lines.push(`📌 *${badge}*`);
    lines.push('');
  }

  // Student Card
  if (template.sections.studentCard.enabled) {
    const student = vars.studentName || vars.student || 'الطالب';
    const studentNum = vars.studentNumber || vars.studentId ? `#${vars.studentNumber || vars.studentId}` : '';
    const grade = vars.grade ? `الصف: ${vars.grade}` : '';
    const track = vars.track ? `المسار: ${vars.track}` : '';
    const section = vars.section ? `الشعبة: ${vars.section}` : '';
    const details = [studentNum, grade, track, section].filter(Boolean).join(' | ');
    lines.push(`👤 *الطالب:* ${student}${details ? ` (${details})` : ''}`);
    lines.push('');
  }

  // Greeting
  if (template.sections.greeting.enabled && template.sections.greeting.text) {
    lines.push(renderMessageVariables(template.sections.greeting.text, vars));
    lines.push('');
  }

  // Data Table / Key items
  if (template.sections.dataTable.enabled && template.sections.dataTable.items.length > 0) {
    lines.push('📋 *البيانات والتفاصيل:*');
    for (const item of template.sections.dataTable.items) {
      const val = renderMessageVariables(item.value, vars);
      if (val && !/\{[a-zA-Z0-9_]+\}/.test(val)) {
        lines.push(`▫️ *${item.label}:* ${val}`);
      }
    }
    lines.push('');
  }

  // Main Body
  if (template.sections.mainBody.enabled && template.sections.mainBody.text) {
    lines.push(renderMessageVariables(template.sections.mainBody.text, vars));
    lines.push('');
  }

  // Key points
  if (template.sections.keyPoints.enabled && template.sections.keyPoints.points.length > 0) {
    lines.push('💡 *نقاط مهمة:*');
    for (const pt of template.sections.keyPoints.points) {
      const rendered = renderMessageVariables(pt, vars);
      if (rendered) {
        lines.push(`• ${rendered}`);
      }
    }
    lines.push('');
  }

  // Required Action
  if (template.sections.requiredAction.enabled && template.sections.requiredAction.text) {
    const title = template.sections.requiredAction.title || 'الإجراء المطلوب من ولي الأمر';
    const actionText = renderMessageVariables(template.sections.requiredAction.text, vars);
    if (actionText && !/^\{[a-zA-Z0-9_]+\}$/.test(actionText.trim())) {
      lines.push(`⚠️ *${title}:*`);
      lines.push(actionText);
      lines.push('');
    }
  }

  // Action Button / Link
  if (template.sections.actionButton.enabled && template.sections.actionButton.url) {
    const btnText = template.sections.actionButton.text || 'الرابط';
    lines.push(`🔗 *${btnText}:* ${template.sections.actionButton.url}`);
    lines.push('');
  }

  // Closing and Signature
  if (template.sections.closingAndSignature.enabled) {
    if (template.sections.closingAndSignature.closingText) {
      lines.push(renderMessageVariables(template.sections.closingAndSignature.closingText, vars));
    }
    const signer = renderMessageVariables(template.sections.closingAndSignature.signerName || '{senderName}', vars);
    const role = renderMessageVariables(template.sections.closingAndSignature.signerRole || '{senderRole}', vars);
    if (signer || role) {
      lines.push(`✍️ *${[signer, role].filter(Boolean).join(' - ')}*`);
    }
    lines.push('');
  }

  // Contact Box
  if (template.sections.contactBox.enabled) {
    const phone = vars.schoolPhone || vars.phone || template.sections.contactBox.phone;
    const email = vars.schoolEmail || vars.email || template.sections.contactBox.email;
    const renderedPhone = phone ? renderMessageVariables(String(phone), vars) : '';
    const renderedEmail = email ? renderMessageVariables(String(email), vars) : '';
    const contactParts: string[] = [];
    if (renderedPhone) contactParts.push(`📞 ${renderedPhone}`);
    if (renderedEmail) contactParts.push(`✉️ ${renderedEmail}`);
    if (contactParts.length > 0) {
      lines.push('─────────────────────────');
      lines.push(contactParts.join(' | '));
    }
  }

  // Footer
  if (template.sections.footer.enabled && template.sections.footer.text) {
    lines.push(`_${renderMessageVariables(template.sections.footer.text, vars)}_`);
  }

  return lines.join('\n').trim();
}

export function getLocalMessageTemplates(): MessageTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_TEMPLATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...SYSTEM_DEFAULT_TEMPLATES];
}

function saveLocalMessageTemplates(templates: MessageTemplate[]): void {
  try {
    localStorage.setItem(LOCAL_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {}
}

/**
 * Fetches all templates for a school:
 * combines built-in system templates + school custom templates stored in Firestore,
 * and seeds default templates into Firestore if none exist yet.
 */
export async function fetchMessageTemplates(schoolId: string): Promise<MessageTemplate[]> {
  const baseTemplates: MessageTemplate[] = [...SYSTEM_DEFAULT_TEMPLATES];
  const localSaved = getLocalMessageTemplates();

  // Merge localSaved over baseTemplates first
  const mergedMap = new Map<string, MessageTemplate>();
  for (const t of baseTemplates) {
    mergedMap.set(t.id, t);
  }
  for (const lt of localSaved) {
    mergedMap.set(lt.id, lt);
  }

  if (!isFirebaseReady || !db || !schoolId) {
    return Array.from(mergedMap.values());
  }

  try {
    const colRef = collection(db, 'schools', schoolId, 'messageTemplates');
    const snap = await safeGetDocs(colRef);
    const firestoreTemplates: MessageTemplate[] = [];

    snap.forEach((d) => {
      const data = d.data() as any;
      firestoreTemplates.push({
        ...data,
        id: d.id,
        schoolId,
      });
    });

    if (firestoreTemplates.length === 0) {
      // Seed official default templates to Firestore so they are stored in Firestore and editable
      const officialDefaults = baseTemplates.filter((t) => t.isDefaultForCategory);
      await Promise.all(
        officialDefaults.map(async (tpl) => {
          try {
            const docRef = doc(db, 'schools', schoolId, 'messageTemplates', tpl.id);
            await setDoc(docRef, { ...tpl, schoolId }, { merge: true });
          } catch {}
        })
      );
    } else {
      for (const ft of firestoreTemplates) {
        mergedMap.set(ft.id, ft);
      }
    }

    const finalResult = Array.from(mergedMap.values());
    saveLocalMessageTemplates(finalResult);
    return finalResult;
  } catch (err) {
    console.warn('Could not fetch custom message templates from Firestore, using local cache:', err);
    return Array.from(mergedMap.values());
  }
}

/**
 * Saves or updates a template in Firestore under schools/{schoolId}/messageTemplates
 * Automatically records revision history (up to 15 previous versions) and modifier metadata.
 */
export async function saveMessageTemplate(
  schoolId: string,
  template: MessageTemplate,
  modifierInfo?: { uid?: string; name?: string; changeNote?: string; skipRevision?: boolean }
): Promise<MessageTemplate> {
  const id = template.id || `tpl-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const updatedBy = modifierInfo?.uid || template.updatedBy || 'counselor';
  const updatedByName = modifierInfo?.name || template.updatedByName || 'أمير علي عبدالشاكر بكري';

  const currentLocal = getLocalMessageTemplates();
  const existing = currentLocal.find((t) => t.id === id);

  let nextVersion = (template.version || existing?.version || 1);
  let revisionHistory: MessageTemplateRevision[] = [...(template.revisionHistory || existing?.revisionHistory || [])];

  if (existing && !modifierInfo?.skipRevision) {
    const snapshotRevision: MessageTemplateRevision = {
      version: existing.version || 1,
      name: existing.name,
      category: existing.category,
      subject: existing.subject,
      body: existing.body || existing.sections?.mainBody?.text || '',
      sections: JSON.parse(JSON.stringify(existing.sections)),
      updatedAt: existing.updatedAt || nowIso,
      updatedBy: existing.updatedBy || existing.createdBy || 'system',
      updatedByName: existing.updatedByName || existing.createdByName || 'النظام',
      changeNote: modifierInfo?.changeNote || 'نسخة سابقة محفوظة تلقائياً قبل التعديل',
    };
    revisionHistory = [snapshotRevision, ...revisionHistory].slice(0, 15);
    nextVersion = (existing.version || 1) + 1;
  }

  const dataToSave: MessageTemplate = {
    ...template,
    id,
    schoolId,
    version: nextVersion,
    revisionHistory,
    updatedBy,
    updatedByName,
    updatedAt: nowIso,
  };

  // Update local storage cache immediately
  const updatedList = currentLocal.some((t) => t.id === id)
    ? currentLocal.map((t) => (t.id === id ? dataToSave : t))
    : [dataToSave, ...currentLocal];
  saveLocalMessageTemplates(updatedList);

  if (isFirebaseReady && db && schoolId) {
    try {
      const docRef = doc(db, 'schools', schoolId, 'messageTemplates', id);
      await setDoc(docRef, dataToSave, { merge: true });
    } catch (err) {
      console.warn('Saved template locally; Firestore sync warning:', err);
    }
  }

  return dataToSave;
}

/**
 * Sets a specific template as the default template for its category
 */
export async function setDefaultTemplateForCategory(
  schoolId: string,
  templateId: string,
  category: MessageCategory,
  allTemplates: MessageTemplate[],
  modifierName = 'أمير علي عبدالشاكر بكري'
): Promise<MessageTemplate[]> {
  const nowIso = new Date().toISOString();
  const updatedTemplates = allTemplates.map((t) => {
    if (t.category === category) {
      const shouldBeDefault = t.id === templateId;
      if (Boolean(t.isDefaultForCategory) !== shouldBeDefault) {
        return {
          ...t,
          isDefaultForCategory: shouldBeDefault,
          updatedAt: nowIso,
          updatedByName: modifierName,
        };
      }
    }
    return t;
  });

  saveLocalMessageTemplates(updatedTemplates);

  if (isFirebaseReady && db && schoolId) {
    const changed = updatedTemplates.filter((t) => t.category === category);
    await Promise.all(
      changed.map(async (tpl) => {
        try {
          const docRef = doc(db, 'schools', schoolId, 'messageTemplates', tpl.id);
          await setDoc(docRef, { ...tpl, schoolId }, { merge: true });
        } catch {}
      })
    );
  }

  return updatedTemplates;
}

/**
 * Deletes a custom template
 */
export async function deleteMessageTemplate(schoolId: string, templateId: string): Promise<void> {
  const currentLocal = getLocalMessageTemplates().filter((t) => t.id !== templateId);
  saveLocalMessageTemplates(currentLocal);

  if (!isFirebaseReady || !db) return;
  try {
    const docRef = doc(db, 'schools', schoolId, 'messageTemplates', templateId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Could not delete template from Firestore:', err);
  }
}

export function getLocalMessageLogs(): MessageLogRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGE_LOGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function getLocalMessageLogsForStudent(
  studentId: string,
  studentNumber?: string
): MessageLogRecord[] {
  const all = getLocalMessageLogs();
  return all.filter(
    (l) =>
      l.studentId === studentId ||
      (studentNumber && l.studentNumber && l.studentNumber === studentNumber)
  );
}

function saveLocalMessageLogs(logs: MessageLogRecord[]): void {
  try {
    localStorage.setItem(LOCAL_MESSAGE_LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch {}
}

/**
 * Fetches message logs for a school (merges Firestore + local cache)
 */
export async function fetchMessageLogs(
  schoolId: string,
  maxCount = 250
): Promise<MessageLogRecord[]> {
  const localLogs = getLocalMessageLogs();

  if (!isFirebaseReady || !db || !schoolId) return localLogs;

  try {
    const colRef = collection(db, 'schools', schoolId, 'messageLogs');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(maxCount));
    const snap = await safeGetDocs(q);
    const firestoreLogs: MessageLogRecord[] = [];
    snap.forEach((d) => {
      firestoreLogs.push({
        id: d.id,
        ...(d.data() as any),
      });
    });

    const map = new Map<string, MessageLogRecord>();
    for (const l of localLogs) map.set(l.id, l);
    for (const fl of firestoreLogs) map.set(fl.id, fl);

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    saveLocalMessageLogs(combined);
    return combined;
  } catch (err) {
    console.warn('Could not fetch message logs:', err);
    return localLogs;
  }
}

/**
 * Adds a new message log entry and saves to both Firestore and localStorage
 * so the Unified Student Profile timeline immediately includes it.
 */
export async function addMessageLog(
  schoolId: string,
  logData: Omit<MessageLogRecord, 'id'>
): Promise<string> {
  const createdAt = logData.createdAt || new Date().toISOString();
  let docId = `local-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (isFirebaseReady && db && schoolId) {
    try {
      const colRef = collection(db, 'schools', schoolId, 'messageLogs');
      const docRef = await addDoc(colRef, {
        ...logData,
        schoolId,
        createdAt,
      });
      docId = docRef.id;
    } catch (err) {
      console.warn('Saved message log locally; Firestore warning:', err);
    }
  }

  const fullRecord: MessageLogRecord = {
    ...logData,
    id: docId,
    schoolId,
    createdAt,
  };
  const existing = getLocalMessageLogs();
  saveLocalMessageLogs([fullRecord, ...existing]);

  return docId;
}

/**
 * Updates status of a message log record with ownership enforcement and retry/timestamp tracking
 */
export async function updateMessageLogStatus(
  schoolId: string,
  logId: string,
  status: MessageStatus,
  confirmedAt?: string,
  extraMeta?: {
    openedAt?: string;
    notes?: string;
    actorUid?: string;
    actorName?: string;
    actorRole?: string;
    isRetry?: boolean;
  }
): Promise<void> {
  const existing = getLocalMessageLogs();
  const target = existing.find((l) => l.id === logId || l.messageId === logId);

  // Enforce RBAC: non-admin staff cannot modify another staff member's send logs
  if (target && extraMeta?.actorUid && target.createdBy && target.createdBy !== extraMeta.actorUid) {
    const isAdmin =
      extraMeta.actorRole === 'system_owner' ||
      extraMeta.actorRole === 'systemAdmin' ||
      extraMeta.actorRole === 'school_admin' ||
      extraMeta.actorRole === 'schoolAdmin';
    if (!isAdmin) {
      throw new Error('غير مصرح: لا يُسمح للموظف بتعديل سجل إرسال موظف آخر دون صلاحية إدارية.');
    }
  }

  const nowIso = new Date().toISOString();
  const openedTimestamp =
    extraMeta?.openedAt ||
    (status === 'whatsapp_opened' || status === 'email_opened' ? nowIso : undefined);

  const updated = existing.map((l) =>
    l.id === logId || l.messageId === logId
      ? {
          ...l,
          status,
          ...(confirmedAt ? { confirmedAt } : {}),
          ...(openedTimestamp ? { openedAt: l.openedAt || openedTimestamp } : {}),
          ...(extraMeta?.notes ? { notes: extraMeta.notes } : {}),
          ...(extraMeta?.isRetry
            ? {
                retryCount: (l.retryCount || 0) + 1,
                lastRetryAt: nowIso,
                retriedBy: extraMeta.actorName || l.createdByName,
              }
            : {}),
        }
      : l
  );
  saveLocalMessageLogs(updated);

  if (!isFirebaseReady || !db || logId.startsWith('local-')) return;
  try {
    const docRef = doc(db, 'schools', schoolId, 'messageLogs', logId);
    const updateData: any = { status };
    if (confirmedAt) updateData.confirmedAt = confirmedAt;
    if (openedTimestamp) updateData.openedAt = openedTimestamp;
    if (extraMeta?.notes) updateData.notes = extraMeta.notes;
    if (extraMeta?.isRetry) {
      updateData.retryCount = (target?.retryCount || 0) + 1;
      updateData.lastRetryAt = nowIso;
      updateData.retriedBy = extraMeta?.actorName || '';
    }
    await updateDoc(docRef, updateData);
  } catch (err) {
    console.warn('Failed to update message log status:', err);
  }
}

/**
 * Saves a message queue to schools/{schoolId}/messageQueues/{queueId}
 */
export async function saveMessageQueue(
  schoolId: string,
  queue: MessageQueueRecord
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const docRef = doc(db, 'schools', schoolId, 'messageQueues', queue.queueId);
    await setDoc(docRef, {
      ...queue,
      schoolId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save message queue:', err);
  }
}

/**
 * Fetches the active/in-progress message queue if any
 */
export async function fetchActiveMessageQueue(
  schoolId: string
): Promise<MessageQueueRecord | null> {
  if (!isFirebaseReady || !db) return null;
  try {
    const colRef = collection(db, 'schools', schoolId, 'messageQueues');
    const snap = await safeGetDocs(colRef);
    let activeQueue: MessageQueueRecord | null = null;
    snap.forEach((d) => {
      const q = d.data() as MessageQueueRecord;
      if (q.status === 'in_progress' || q.status === 'paused') {
        activeQueue = q;
      }
    });
    return activeQueue;
  } catch {
    return null;
  }
}

/**
 * Fetches school message settings
 */
export async function fetchSchoolMessageSettings(
  schoolId: string
): Promise<SchoolMessageSettings> {
  if (!isFirebaseReady || !db) {
    return { ...DEFAULT_SCHOOL_MESSAGE_SETTINGS, schoolId };
  }

  try {
    const docRef = doc(db, 'schools', schoolId, 'settings', 'messageSettings');
    const snap = await safeGetDoc(docRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_SCHOOL_MESSAGE_SETTINGS,
        ...(snap.data() as any),
        schoolId,
      };
    }
  } catch (err) {
    console.warn('Could not fetch message settings:', err);
  }

  return { ...DEFAULT_SCHOOL_MESSAGE_SETTINGS, schoolId };
}

/**
 * Saves school message settings
 */
export async function saveSchoolMessageSettings(
  schoolId: string,
  settings: Partial<SchoolMessageSettings>
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const docRef = doc(db, 'schools', schoolId, 'settings', 'messageSettings');
    await setDoc(
      docRef,
      {
        ...settings,
        schoolId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to save school message settings:', err);
    throw err;
  }
}

export const createMessageLog = addMessageLog;
export const getSchoolMessageSettings = fetchSchoolMessageSettings;

// ============================================================================
// RBAC PERMISSIONS & SECURITY HELPERS (صلاحيات مركز التواصل الذكي)
// ============================================================================

export interface CommunicationPermissions {
  roleLabelAr: string;
  canAccessCenter: boolean;
  canViewContactDetails: boolean;
  canViewFullContactInfo: boolean;
  canManageSettingsAndTemplates: boolean;
  canManageSettings: boolean;
  canApproveSensitiveBehavior: boolean;
  canSendAbsenceAndTardiness: boolean;
  canSendAcademicNotes: boolean;
  canSendBehaviorAndCounseling: boolean;
  canSendGeneralAnnouncements: boolean;
  canSendBulk: boolean;
  canModifyOthersLogs: boolean;
  canModifyOtherStaffLogs: boolean;
  canExportReports: boolean;
}

export function getCommunicationPermissions(user?: {
  uid?: string;
  email?: string | null;
  role?: string | null;
  jobTitle?: string | null;
} | null): CommunicationPermissions {
  if (!user || !user.uid || user.role === 'viewer') {
    return {
      roleLabelAr: 'مستخدم عادي (عرض مقيد)',
      canAccessCenter: false,
      canViewContactDetails: false,
      canViewFullContactInfo: false,
      canManageSettingsAndTemplates: false,
      canManageSettings: false,
      canApproveSensitiveBehavior: false,
      canSendAbsenceAndTardiness: false,
      canSendAcademicNotes: false,
      canSendBehaviorAndCounseling: false,
      canSendGeneralAnnouncements: false,
      canSendBulk: false,
      canModifyOthersLogs: false,
      canModifyOtherStaffLogs: false,
      canExportReports: false,
    };
  }

  const role = String(user.role || 'counselor');
  const job = String(user.jobTitle || '');
  const isRootEmail =
    user.email?.toLowerCase() === 'ameer2020vip@gmail.com' ||
    user.email?.toLowerCase() === 'mohamedadelfujaca@gmail.com';

  // 1. مدير النظام (System Admin)
  if (isRootEmail || role === 'system_owner' || role === 'systemAdmin') {
    return {
      roleLabelAr: 'مدير النظام المعتمد',
      canAccessCenter: true,
      canViewContactDetails: true,
      canViewFullContactInfo: true,
      canManageSettingsAndTemplates: true,
      canManageSettings: true,
      canApproveSensitiveBehavior: true,
      canSendAbsenceAndTardiness: true,
      canSendAcademicNotes: true,
      canSendBehaviorAndCounseling: true,
      canSendGeneralAnnouncements: true,
      canSendBulk: true,
      canModifyOthersLogs: true,
      canModifyOtherStaffLogs: true,
      canExportReports: true,
    };
  }

  // 2. مدير الأكاديمية (School Principal / Admin)
  if (role === 'school_admin' || role === 'schoolAdmin' || job.includes('مدير')) {
    return {
      roleLabelAr: 'مدير الأكاديمية',
      canAccessCenter: true,
      canViewContactDetails: true,
      canViewFullContactInfo: true,
      canManageSettingsAndTemplates: true,
      canManageSettings: true,
      canApproveSensitiveBehavior: true,
      canSendAbsenceAndTardiness: true,
      canSendAcademicNotes: true,
      canSendBehaviorAndCounseling: true,
      canSendGeneralAnnouncements: true,
      canSendBulk: true,
      canModifyOthersLogs: true,
      canModifyOtherStaffLogs: true,
      canExportReports: true,
    };
  }

  // 3. المعلم (Teacher)
  if (role === 'teacher' || job.includes('معلم')) {
    return {
      roleLabelAr: 'معلم (الرسائل الأكاديمية المصرح بها)',
      canAccessCenter: true,
      canViewContactDetails: true,
      canViewFullContactInfo: true,
      canManageSettingsAndTemplates: false,
      canManageSettings: false,
      canApproveSensitiveBehavior: false,
      canSendAbsenceAndTardiness: false,
      canSendAcademicNotes: true,
      canSendBehaviorAndCounseling: false,
      canSendGeneralAnnouncements: false,
      canSendBulk: false,
      canModifyOthersLogs: false,
      canModifyOtherStaffLogs: false,
      canExportReports: false,
    };
  }

  // 4. المسؤول الأكاديمي (Academic Advisor)
  if (role === 'academic_advisor' || job.includes('أكاديمي')) {
    return {
      roleLabelAr: 'المسؤول / المرشد الأكاديمي',
      canAccessCenter: true,
      canViewContactDetails: true,
      canViewFullContactInfo: true,
      canManageSettingsAndTemplates: false,
      canManageSettings: false,
      canApproveSensitiveBehavior: true,
      canSendAbsenceAndTardiness: true,
      canSendAcademicNotes: true,
      canSendBehaviorAndCounseling: true,
      canSendGeneralAnnouncements: true,
      canSendBulk: true,
      canModifyOthersLogs: false,
      canModifyOtherStaffLogs: false,
      canExportReports: true,
    };
  }

  // 5. مسؤول شؤون الطلاب (Student Affairs Officer)
  if (role === 'student_affairs' || job.includes('شؤون الطلبة') || job.includes('شؤون الطلاب')) {
    return {
      roleLabelAr: 'مسؤول شؤون الطلاب',
      canAccessCenter: true,
      canViewContactDetails: true,
      canViewFullContactInfo: true,
      canManageSettingsAndTemplates: false,
      canManageSettings: false,
      canApproveSensitiveBehavior: false,
      canSendAbsenceAndTardiness: true,
      canSendAcademicNotes: false,
      canSendBehaviorAndCounseling: false,
      canSendGeneralAnnouncements: true,
      canSendBulk: true,
      canModifyOthersLogs: false,
      canModifyOtherStaffLogs: false,
      canExportReports: true,
    };
  }

  // 6. المرشد أو الأخصائي (Counselor / Specialist - default staff role)
  return {
    roleLabelAr: 'المرشد الطلابي / الأخصائي الاجتماعي',
    canAccessCenter: true,
    canViewContactDetails: true,
    canViewFullContactInfo: true,
    canManageSettingsAndTemplates: true,
    canManageSettings: true,
    canApproveSensitiveBehavior: true,
    canSendAbsenceAndTardiness: true,
    canSendAcademicNotes: true,
    canSendBehaviorAndCounseling: true,
    canSendGeneralAnnouncements: true,
    canSendBulk: true,
    canModifyOthersLogs: false,
    canModifyOtherStaffLogs: false,
    canExportReports: true,
  };
}

/**
 * Deterministic deduplication key so the same incident + student + recipient + channel
 * is not created twice unintentionally, while allowing explicit documented retry.
 */
export function computeMessageDedupeKey(params: {
  schoolId: string;
  studentNumber: string;
  category: string;
  channel: string;
  recipientAddress: string;
  incidentId?: string;
  date?: string;
}): string {
  const inc = (params.incidentId || params.date || new Date().toISOString().slice(0, 10)).trim();
  const addr = (params.recipientAddress || '').trim().toLowerCase();
  return `${params.schoolId}_${params.category}_${params.studentNumber}_${inc}_${params.channel}_${addr}`;
}

export function findExistingMessageLogForIncident(
  logs: MessageLogRecord[],
  dedupeKey: string
): MessageLogRecord | undefined {
  return logs.find(
    (l) =>
      l.dedupeKey === dedupeKey &&
      l.status !== 'cancelled' &&
      l.status !== 'failed'
  );
}

/**
 * Safe Sandbox Dummy Data (بيانات اختبار وهمية للتجارب الآمنة دون لمس أولياء الأمور الحقيقيين)
 */
export const SANDBOX_DUMMY_STUDENTS = [
  {
    id: 'test-stu-5001',
    studentNumber: 'TEST-5001',
    fullName: 'زايد أحمد الفجيرة (طالب تجريبي - الصف الخامس)',
    grade: 'خامس',
    section: '1',
    track: 'عام',
    status: 'منتظم' as const,
    parentName: 'أحمد الفجيرة (ولي أمر تجريبي)',
    parentRelation: 'الأب',
    parentPhone: '+971500000001',
    guardianEmail: 'parent.test1@example.com',
    email: 'parent.test1@example.com',
    country: 'الإمارات',
    totalTardiness: 1,
    totalViolations: 0,
    totalAbsences: 1,
  },
  {
    id: 'test-stu-8002',
    studentNumber: 'TEST-8002',
    fullName: 'راشد سلطان الكندي (طالب تجريبي - الصف الثامن)',
    grade: 'ثامن',
    section: '2',
    track: 'عام',
    status: 'منتظم' as const,
    parentName: 'سلطان الكندي (ولي أمر تجريبي)',
    parentRelation: 'الأب',
    parentPhone: '+971500000002',
    guardianEmail: 'parent.test2@example.com',
    email: 'parent.test2@example.com',
    country: 'الإمارات',
    totalTardiness: 2,
    totalViolations: 1,
    totalAbsences: 0,
  },
  {
    id: 'test-stu-1103',
    studentNumber: 'TEST-1103',
    fullName: 'خليفة سلطان الكندي (شقيق تجريبي لنفس ولي الأمر - الحادي عشر)',
    grade: 'حادي عشر',
    section: '1',
    track: 'متقدم',
    status: 'منتظم' as const,
    parentName: 'سلطان الكندي (ولي أمر تجريبي)',
    parentRelation: 'الأب',
    parentPhone: '+971500000002',
    guardianEmail: 'parent.test2@example.com',
    email: 'parent.test2@example.com',
    country: 'الإمارات',
    totalTardiness: 0,
    totalViolations: 0,
    totalAbsences: 1,
  },
];

export const MESSAGE_STATUS_LABELS_AR: Record<string, string> = {
  draft: 'مسودة',
  ready: 'جاهزة للإرسال',
  whatsapp_opened: 'تم فتح واتساب',
  email_opened: 'تم فتح البريد',
  confirmed_sent: 'أكد الموظف الإرسال',
  failed: 'فشل أو تعذر الفتح',
  cancelled: 'ملغاة',
  skipped: 'ملغاة',
};

export const MESSAGE_CATEGORY_LABELS_AR: Record<string, string> = {
  attendance: 'غياب يومي',
  tardiness: 'تأخير صباحي',
  behavior: 'ملاحظة سلوكية',
  guardianCall: 'استدعاء ولي أمر',
  positive: 'ملاحظة أكاديمية / تعزيز',
  uniformNotice: 'إعلان عام / تنبيه',
  committeeDecision: 'قرار لجنة السلوك',
  phoneConfiscation: 'مصادرة هاتف',
  custom: 'رسالة مخصصة',
};

export const FUJAIRAH_DISABLED_APPS_SCRIPT_TEMPLATE = `/**
 * [المرحلة الثانية الاختيارية - غير مفعّلة افتراضياً]
 * Google Apps Script Bridge for Fujairah Islamic Scientific Academy
 * Account: mohamedadelfujaca@gmail.com | Plan: Firebase Spark Free
 * تنبيه: لا يُفعّل الإرسال التلقائي إلا بعد موافقة صريحة من إدارة الأكاديمية.
 */
const ENABLE_AUTO_SEND = false; // يجب أن يبقى false حتى الاعتماد الإداري الصريح

function sendPendingFujairahNotifications() {
  if (!ENABLE_AUTO_SEND) {
    Logger.log('الإرسال التلقائي متوقف (المرحلة الأولى mailto هي المعتمدة حالياً).');
    return;
  }
  const quota = MailApp.getRemainingDailyQuota();
  if (quota < 5) return;
  // قراءة الطلبات المعتمدة من الجدول الوسيط المؤمّن وإرسالها عبر Gmail الرسمي للأكاديمية
}`;

