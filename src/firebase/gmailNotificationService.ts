import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  where,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { auth, db } from './config';
import type {
  AbsenceRecord,
  AppUser,
  CounselorUser,
  GmailConnectionConfig,
  GmailEmailTemplateConfig,
  GmailNotificationEventType,
  GmailQueueDeliveryState,
  GmailQueueRecord,
  Student,
  TardinessRecord,
  ViolationRecord,
} from '../types';

export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

const LOCAL_GMAIL_CONFIG_KEY = 'fsia_gmail_config_v1';
const LOCAL_GMAIL_TEMPLATES_KEY = 'fsia_gmail_templates_v1';
const LOCAL_GMAIL_QUEUE_KEY = 'fsia_gmail_queue_v1';

/**
 * Checks if a user has authorized administrative privileges to view/manage Gmail OAuth & Notification settings.
 */
export function isAuthorizedGmailAdmin(
  user?: AppUser | CounselorUser | { email?: string | null; role?: string } | null
): boolean {
  if (!user) return false;
  const email = String(user.email || '').trim().toLowerCase();
  const role = String(user.role || '').trim();
  return (
    email === 'ameer2020vip@gmail.com' ||
    role === 'systemAdmin' ||
    role === 'schoolAdmin' ||
    role === 'admin' ||
    role === 'system_owner' ||
    role === 'school_admin'
  );
}

/**
 * Gets the Firebase Auth ID Token for server-side admin verification.
 */
async function getAdminBearerHeader(): Promise<Record<string, string>> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('يرجى تسجيل الدخول بحساب المسؤول المعتمد أولاً.');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Default Gmail Connection Configuration.
 * Strictly adheres to: "لا تعتبر Gmail متصلًا ولا الإرسال التلقائي فعالًا قبل نجاح اختبار حقيقي مصرح به."
 */
export function getDefaultGmailConnectionConfig(schoolId = '7001'): GmailConnectionConfig {
  const today = new Date().toISOString().slice(0, 10);
  return {
    schoolId,
    connectedEmail: null,
    authorizationStatus: 'disconnected',
    grantedScopes: [],
    authorizedAt: null,
    authorizedByUid: null,
    authorizedByName: null,
    secretManagerConfigured: false,
    secretResourcePath: 'projects/fujairah-islamic/secrets/GMAIL_OAUTH_REFRESH_TOKEN/versions/latest',
    isVerifiedByRealTest: false,
    lastTestSuccessAt: null,
    lastTestRecipient: null,
    lastTestMessageId: null,
    isBatchTestVerified: false,
    lastBatchTestSuccessAt: null,
    lastBatchTestCount: 0,
    adminApprovedProductionSend: false,
    adminApprovedByName: null,
    adminApprovedAt: null,
    autoSendEnabled: false,
    autoSendTardinessOnApprove: true,
    autoSendAbsenceOnApprove: true,
    requireAdminApprovalForViolations: true,
    serviceActivatedAt: null,
    dailyLimitMax: 100,
    dailySentCount: 0,
    dailyCounterDate: today,
    rateLimitDelayMs: 1500,
    isQuotaReachedAlert: false,
    adminAlertMessage: null,
    adminAlertType: 'none',
    oauthPublishingMode: 'testing',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Default editable Arabic templates for Tardiness, Absence, and Approved Behavioral Violations.
 */
export function getDefaultGmailEmailTemplates(): Record<GmailNotificationEventType, GmailEmailTemplateConfig> {
  const now = new Date().toISOString();
  return {
    tardiness_notice: {
      id: 'tardiness_notice',
      titleAr: 'إشعار التأخير الصباحي (بعد اعتماد الواقعة)',
      subjectTemplate: 'إشعار تأخير صباحي للطالب {studentName} - أكاديمية الفجيرة العلمية الإسلامية',
      bodyTemplate: `السلام عليكم ورحمة الله وبركاته،
المكرم ولي أمر الطالب: {guardianName} المحترم،

تهديكم إدارة أكاديمية الفجيرة العلمية الإسلامية أطيب التحيات، ونحيطكم علماً بأنه تم رصد واعتماد واقعة تأخير صباحي لنجلكم وفق البيانات التالية:

• اسم الطالب: {studentName}
• الرقم المدرسي: {studentNumber}
• الصف والشعبة: {grade} / {section}
• تاريخ التأخير: {incidentDate}
• وقت الحضور: {arrivalTime}
• الإجراء التربوي المتخذ: {actionTaken}

نأمل منكم التكرم بمتابعة التزام الطالب بالحضور المبكر قبل بدء الطابور الصباحي حرصاً على مصلحته الدراسية والتربوية.

وتفضلوا بقبول فائق الاحترام والتقدير،،
مكتب الإرشاد الطلابي وشؤون الطلبة
أكاديمية الفجيرة العلمية الإسلامية`,
      updatedAt: now,
      updatedBy: 'النظام الافتراضي',
    },
    absence_notice: {
      id: 'absence_notice',
      titleAr: 'إشعار الغياب المدرسي (بعد اعتماد الواقعة)',
      subjectTemplate: 'إشعار غياب مدرسي للطالب {studentName} بتاريخ {incidentDate} - أكاديمية الفجيرة العلمية الإسلامية',
      bodyTemplate: `السلام عليكم ورحمة الله وبركاته،
المكرم ولي أمر الطالب: {guardianName} المحترم،

تهديكم إدارة أكاديمية الفجيرة العلمية الإسلامية أطيب التحيات، ونود إشعاركم بتسجيل واعتماد غياب نجلكم عن الدوام المدرسي وفق البيانات التالية:

• اسم الطالب: {studentName}
• الرقم المدرسي: {studentNumber}
• الصف والشعبة: {grade} / {section}
• تاريخ الغياب: {incidentDate}
• حالة الغياب: {absenceStatus}

يرجى التكرم بتزويد إدارة الأكاديمية أو مكتب الإرشاد الطلابي بالعذر الرسمي المعتمد في حال وجود عذر طبي أو طارئ، ومتابعة انتظام الطالب في الدراسة.

وتفضلوا بقبول فائق الاحترام والتقدير،،
مكتب الإرشاد الطلابي وشؤون الطلبة
أكاديمية الفجيرة العلمية الإسلامية`,
      updatedAt: now,
      updatedBy: 'النظام الافتراضي',
    },
    violation_notice: {
      id: 'violation_notice',
      titleAr: 'إشعار المخالفة السلوكية (بعد مراجعة المسؤول واعتماد الإرسال)',
      subjectTemplate: 'إشعار تربوي رسمي بخصوص الطالب {studentName} - أكاديمية الفجيرة العلمية الإسلامية',
      bodyTemplate: `السلام عليكم ورحمة الله وبركاته،
المكرم ولي أمر الطالب: {guardianName} المحترم،

في إطار الشراكة التربوية البناءة بين الأسرة وأكاديمية الفجيرة العلمية الإسلامية، وبعد مراجعة الإدارة المختصة واعتماد الإرسال، نحيطكم علماً بتسجيل الملاحظة السلوكية التالية:

• اسم الطالب: {studentName}
• الرقم المدرسي: {studentNumber}
• الصف والشعبة: {grade} / {section}
• تاريخ الواقعة: {incidentDate}
• تصنيف المخالفة وفق اللائحة: {violationTitle} ({violationDegree})
• الإجراء التربوي المعتمد: {actionTaken}

نرجو منكم التكرم بالتعاون مع مكتب الإرشاد الطلابي بالأكاديمية لتعزيز السلوك الإيجابي لدى الطالب.

وتفضلوا بقبول فائق الاحترام والتقدير،،
إدارة شؤون الطلبة والإرشاد الأكاديمي
أكاديمية الفجيرة العلمية الإسلامية`,
      updatedAt: now,
      updatedBy: 'النظام الافتراضي',
    },
  };
}

/**
 * Deterministic idempotency key to prevent duplicate notifications for the same
 * (schoolId, notificationType, incidentId, studentId, recipientEmail).
 */
export function computeClientIdempotencyKey(params: {
  schoolId: string;
  notificationType: GmailNotificationEventType;
  incidentId: string;
  studentId: string;
  recipientEmail: string;
}): string {
  const cleanEmail = String(params.recipientEmail || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  const cleanIncident = String(params.incidentId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanStudent = String(params.studentId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `gm_${params.notificationType}_${cleanStudent}_${cleanIncident}_${cleanEmail}`.slice(0, 120);
}

/**
 * Extracts and validates the approved guardian email and relation from a Student record.
 * Ensures the recipient is an authorized guardian and has a syntactically valid email.
 */
export function extractApprovedGuardianEmail(student: Student): {
  isValid: boolean;
  email: string;
  guardianName: string;
  guardianRelation: string;
  reason?: string;
} {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const authorizedRelations = [
    'الأب',
    'الأم',
    'ولي الأمر',
    'ولي الأمر الأساسي',
    'ولي أمر معتمد',
    'الجد',
    'الأخ الأكبر',
    'العم',
    'الخال',
    'الوصي القانوني',
  ];

  // 1. Check structured contacts array first (prefer primary verified guardian with emailConsent !== false)
  if (Array.isArray(student.contacts) && student.contacts.length > 0) {
    const guardianContacts = student.contacts.filter((c) => {
      const rel = String(c.relation || '').trim();
      const hasValidEmail = Boolean(c.email && emailRegex.test(c.email.trim()));
      const isGuardianRel = rel !== 'الطالب' && (authorizedRelations.some((r) => rel.includes(r)) || c.isPrimary);
      return hasValidEmail && isGuardianRel && c.emailConsent !== false;
    });

    const primaryMatch = guardianContacts.find((c) => c.isPrimary) || guardianContacts[0];
    if (primaryMatch && primaryMatch.email) {
      return {
        isValid: true,
        email: primaryMatch.email.trim().toLowerCase(),
        guardianName: primaryMatch.name || student.parentName || `ولي أمر الطالب ${student.fullName}`,
        guardianRelation: primaryMatch.relation || student.parentRelation || 'ولي الأمر الأساسي',
      };
    }
  }

  // 2. Check explicit guardianEmail field on student record
  const rawGuardianEmail = String(student.guardianEmail || '').trim().toLowerCase();
  if (rawGuardianEmail && emailRegex.test(rawGuardianEmail)) {
    const relation = String(student.parentRelation || 'ولي الأمر الأساسي').trim();
    if (relation === 'الطالب') {
      return {
        isValid: false,
        email: rawGuardianEmail,
        guardianName: student.parentName || '',
        guardianRelation: relation,
        reason: 'الصفة المسجلة هي «الطالب» وليست صفة ولي أمر مخوّل باستلام الإشعارات.',
      };
    }
    return {
      isValid: true,
      email: rawGuardianEmail,
      guardianName: student.parentName || `ولي أمر الطالب ${student.fullName}`,
      guardianRelation: relation,
    };
  }

  // 3. Fallback to student.email ONLY if it is explicitly marked as guardian email and not a student ministry email
  const fallbackEmail = String(student.email || '').trim().toLowerCase();
  if (
    fallbackEmail &&
    emailRegex.test(fallbackEmail) &&
    !fallbackEmail.endsWith('@moe.sch.ae') &&
    !fallbackEmail.endsWith('@ese.gov.ae') &&
    student.parentRelation !== 'الطالب'
  ) {
    return {
      isValid: true,
      email: fallbackEmail,
      guardianName: student.parentName || `ولي أمر الطالب ${student.fullName}`,
      guardianRelation: student.parentRelation || 'ولي الأمر الأساسي',
    };
  }

  return {
    isValid: false,
    email: '',
    guardianName: student.parentName || `ولي أمر الطالب ${student.fullName}`,
    guardianRelation: student.parentRelation || 'الأب',
    reason: 'لا يوجد بريد إلكتروني معتمد وصالح لولي الأمر في ملف الطالب.',
  };
}

/**
 * Renders an isolated guardian email from template variables while stripping any sensitive internal notes.
 */
export function renderGuardianTemplateContent(
  template: GmailEmailTemplateConfig,
  vars: {
    guardianName: string;
    studentName: string;
    studentNumber: string;
    grade: string;
    section: string;
    incidentDate: string;
    arrivalTime?: string;
    absenceStatus?: string;
    violationTitle?: string;
    violationDegree?: string;
    actionTaken?: string;
  }
): { subject: string; bodyText: string } {
  const replaceTokens = (str: string) =>
    str
      .replace(/\{guardianName\}/g, vars.guardianName || 'ولي الأمر المحترم')
      .replace(/\{studentName\}/g, vars.studentName || '')
      .replace(/\{studentNumber\}/g, vars.studentNumber || '')
      .replace(/\{grade\}/g, vars.grade || '')
      .replace(/\{section\}/g, vars.section || '')
      .replace(/\{incidentDate\}/g, vars.incidentDate || '')
      .replace(/\{arrivalTime\}/g, vars.arrivalTime || 'غير محدد')
      .replace(/\{absenceStatus\}/g, vars.absenceStatus || 'غائب')
      .replace(/\{violationTitle\}/g, vars.violationTitle || 'ملاحظة سلوكية')
      .replace(/\{violationDegree\}/g, vars.violationDegree || '')
      .replace(/\{actionTaken\}/g, vars.actionTaken || 'متابعة تربوية وإرشادية')
      .replace(/\{academyName\}/g, 'أكاديمية الفجيرة العلمية الإسلامية');

  return {
    subject: replaceTokens(template.subjectTemplate).replace(/[\r\n]+/g, ' ').trim(),
    bodyText: replaceTokens(template.bodyTemplate).trim(),
  };
}

/**
 * Fetches the current Gmail Connection Config from Firestore (`schools/{schoolId}/gmailConfig/status`)
 * and merges live server status from `/api/gmail/status` when called by an Admin.
 */
export async function fetchGmailConnectionConfig(schoolId = '7001'): Promise<{
  config: GmailConnectionConfig;
  hasClientId: boolean;
  clientIdPreview: string | null;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  redirectUri: string;
  cloudFunctionsCallbackUri: string;
}> {
  const defaultCfg = getDefaultGmailConnectionConfig(schoolId);
  let storedConfig: GmailConnectionConfig = defaultCfg;

  // 1. Read from localStorage cache first
  try {
    const raw = localStorage.getItem(`${LOCAL_GMAIL_CONFIG_KEY}_${schoolId}`);
    if (raw) {
      storedConfig = { ...defaultCfg, ...JSON.parse(raw) };
    }
  } catch {}

  // 2. Read from Firestore `schools/{schoolId}/gmailConfig/status`
  if (db) {
    try {
      const ref = doc(db, 'schools', schoolId, 'gmailConfig', 'status');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        storedConfig = { ...storedConfig, ...(snap.data() as Partial<GmailConnectionConfig>) };
      }
    } catch (err) {
      console.warn('[GmailConfig] Firestore read notice:', err);
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  let redirectUri = `${origin}/api/gmail/oauth/callback`;
  let cloudFunctionsCallbackUri = 'https://europe-west1-fujairah-islamic.cloudfunctions.net/gmailOAuthCallback';
  let hasClientId = false;
  let clientIdPreview: string | null = null;
  let hasClientSecret = false;
  let hasRefreshToken = false;

  // 3. Query server `/api/gmail/status` for Secret Manager & token presence
  try {
    const headers = await getAdminBearerHeader();
    const res = await fetch('/api/gmail/status', { headers });
    if (res.ok) {
      const data = await res.json();
      hasClientId = Boolean(data.hasClientId);
      clientIdPreview = data.clientIdPreview || null;
      hasClientSecret = Boolean(data.hasClientSecret);
      hasRefreshToken = Boolean(data.hasRefreshToken);
      if (data.redirectUri) redirectUri = data.redirectUri;
      if (data.cloudFunctionsCallbackUri) cloudFunctionsCallbackUri = data.cloudFunctionsCallbackUri;

      if (data.metadata) {
        const m = data.metadata;
        if (m.connectedEmail) storedConfig.connectedEmail = m.connectedEmail;
        if (m.authorizationStatus && m.authorizationStatus !== 'disconnected') {
          storedConfig.authorizationStatus = m.authorizationStatus;
        } else if (!hasRefreshToken && storedConfig.authorizationStatus !== 'token_expired_or_revoked') {
          storedConfig.authorizationStatus = 'disconnected';
          storedConfig.isVerifiedByRealTest = false;
          storedConfig.autoSendEnabled = false;
        }
        if (m.lastTestSuccessAt) {
          storedConfig.lastTestSuccessAt = m.lastTestSuccessAt;
          storedConfig.lastTestRecipient = m.lastTestRecipient;
          storedConfig.lastTestMessageId = m.lastTestMessageId;
          storedConfig.isVerifiedByRealTest = Boolean(m.isVerifiedByRealTest);
        }
        if (m.isBatchTestVerified) {
          storedConfig.isBatchTestVerified = true;
          storedConfig.lastBatchTestSuccessAt = m.lastBatchTestSuccessAt;
          storedConfig.lastBatchTestCount = m.lastBatchTestCount;
        }
        if (m.adminAlertMessage) {
          storedConfig.adminAlertMessage = m.adminAlertMessage;
          storedConfig.adminAlertType = m.adminAlertType || 'none';
        }
      }
    }
  } catch (err) {
    console.warn('[GmailConfig] Server status check notice:', err);
  }

  // Enforce strict rule: never mark connected_verified or autoSendEnabled unless isVerifiedByRealTest is true
  if (!storedConfig.isVerifiedByRealTest) {
    if (storedConfig.authorizationStatus === 'connected_verified') {
      storedConfig.authorizationStatus = hasRefreshToken ? 'authorized_pending_test' : 'disconnected';
    }
    storedConfig.autoSendEnabled = false;
  }

  try {
    localStorage.setItem(`${LOCAL_GMAIL_CONFIG_KEY}_${schoolId}`, JSON.stringify(storedConfig));
  } catch {}

  return {
    config: storedConfig,
    hasClientId,
    clientIdPreview,
    hasClientSecret,
    hasRefreshToken,
    redirectUri,
    cloudFunctionsCallbackUri,
  };
}

/**
 * Saves non-sensitive Gmail Connection Config to Firestore & LocalStorage.
 */
export async function saveGmailConnectionConfig(
  schoolId: string,
  updates: Partial<GmailConnectionConfig>
): Promise<GmailConnectionConfig> {
  const current = (await fetchGmailConnectionConfig(schoolId)).config;
  const merged: GmailConnectionConfig = {
    ...current,
    ...updates,
    schoolId,
    requireAdminApprovalForViolations: true, // Always enforced
    updatedAt: new Date().toISOString(),
  };

  // Enforce strict gate: cannot enable autoSendEnabled unless isVerifiedByRealTest AND adminApprovedProductionSend
  if (merged.autoSendEnabled && (!merged.isVerifiedByRealTest || !merged.adminApprovedProductionSend)) {
    merged.autoSendEnabled = false;
  }

  // Set cutoff timestamp `serviceActivatedAt` when auto-send is turned on so historical incidents are never sent
  if (merged.autoSendEnabled && !merged.serviceActivatedAt) {
    merged.serviceActivatedAt = new Date().toISOString();
  }

  try {
    localStorage.setItem(`${LOCAL_GMAIL_CONFIG_KEY}_${schoolId}`, JSON.stringify(merged));
  } catch {}

  if (db) {
    try {
      const ref = doc(db, 'schools', schoolId, 'gmailConfig', 'status');
      await setDoc(ref, merged, { merge: true });
    } catch (err) {
      console.warn('[GmailConfig] Firestore save notice:', err);
    }
  }

  return merged;
}

/**
 * Fetches editable Arabic Gmail templates for the school.
 */
export async function fetchGmailTemplates(
  schoolId = '7001'
): Promise<Record<GmailNotificationEventType, GmailEmailTemplateConfig>> {
  const defaults = getDefaultGmailEmailTemplates();

  try {
    const localRaw = localStorage.getItem(`${LOCAL_GMAIL_TEMPLATES_KEY}_${schoolId}`);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      Object.assign(defaults, parsed);
    }
  } catch {}

  if (db) {
    try {
      const ref = doc(db, 'schools', schoolId, 'gmailConfig', 'templates');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Record<string, GmailEmailTemplateConfig>;
        if (data.tardiness_notice) defaults.tardiness_notice = data.tardiness_notice;
        if (data.absence_notice) defaults.absence_notice = data.absence_notice;
        if (data.violation_notice) defaults.violation_notice = data.violation_notice;
      }
    } catch (err) {
      console.warn('[GmailTemplates] Firestore read notice:', err);
    }
  }

  return defaults;
}

/**
 * Saves updated Arabic Gmail templates to Firestore & LocalStorage.
 */
export async function saveGmailTemplates(
  schoolId: string,
  templates: Record<GmailNotificationEventType, GmailEmailTemplateConfig>
): Promise<void> {
  try {
    localStorage.setItem(`${LOCAL_GMAIL_TEMPLATES_KEY}_${schoolId}`, JSON.stringify(templates));
  } catch {}

  if (db) {
    try {
      const ref = doc(db, 'schools', schoolId, 'gmailConfig', 'templates');
      await setDoc(ref, templates, { merge: true });
    } catch (err) {
      console.warn('[GmailTemplates] Firestore save notice:', err);
    }
  }
}

const CLOUD_FUNCTIONS_BASE_URL = 'https://europe-west1-fujairah-islamic.cloudfunctions.net';

async function callCloudFunctionWithFallback(
  functionName: string,
  localFallbackPath: string,
  headers: Record<string, string>,
  body: Record<string, any>
): Promise<Response> {
  try {
    const cfRes = await fetch(`${CLOUD_FUNCTIONS_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (cfRes.status !== 404) {
      return cfRes;
    }
  } catch {
    // Cloud Function not deployed yet or network unreachable; fall back to server route
  }
  return await fetch(localFallbackPath, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Initiates the server-side OAuth 2.0 Authorization Code flow (`access_type=offline`, `gmail.send` only)
 * via Firebase Cloud Function `gmailOAuthStart` in `europe-west1` (`fujairah-islamic`).
 */
export async function startServerGmailOAuthFlow(params: {
  schoolId: string;
  redirectUri?: string;
}): Promise<{ url: string; redirectUri: string; requestedScope: string }> {
  const headers = await getAdminBearerHeader();
  const res = await callCloudFunctionWithFallback(
    'gmailOAuthStart',
    '/api/gmail/oauth/start',
    headers,
    params
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'فشل بدء عملية ربط حساب Gmail');
  }
  return data;
}

/**
 * Disconnects Gmail OAuth & revokes authorization token via Firebase Cloud Function `gmailOAuthDisconnect`.
 */
export async function disconnectServerGmailOAuth(schoolId: string): Promise<GmailConnectionConfig> {
  const headers = await getAdminBearerHeader();
  const res = await callCloudFunctionWithFallback(
    'gmailOAuthDisconnect',
    '/api/gmail/disconnect',
    headers,
    { schoolId }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'فشل فصل الاتصال بحساب Gmail');
  }

  return await saveGmailConnectionConfig(schoolId, {
    connectedEmail: null,
    authorizationStatus: 'disconnected',
    grantedScopes: [],
    isVerifiedByRealTest: false,
    isBatchTestVerified: false,
    adminApprovedProductionSend: false,
    autoSendEnabled: false,
    adminAlertMessage: 'تم فصل اتصال حساب Gmail وإلغاء التفويض بنجاح.',
    adminAlertType: 'none',
  });
}


/**
 * Executes Step 1 Test: Sends a single real test email to an approved administrative email address.
 */
export async function runSingleGmailTest(params: {
  schoolId: string;
  recipientEmail: string;
  senderEmail?: string;
}): Promise<{
  success: boolean;
  gmailMessageId?: string;
  testedAt?: string;
  config: GmailConnectionConfig;
}> {
  const headers = await getAdminBearerHeader();
  const res = await callCloudFunctionWithFallback(
    'gmailTestSingle',
    '/api/gmail/test-single',
    headers,
    params
  );
  const data = await res.json();
  if (!res.ok || !data.success) {
    if (data.metadata?.authorizationStatus === 'token_expired_or_revoked') {
      await saveGmailConnectionConfig(params.schoolId, {
        authorizationStatus: 'token_expired_or_revoked',
        isVerifiedByRealTest: false,
        autoSendEnabled: false,
        adminAlertType: 'token_revoked',
        adminAlertMessage: data.error || 'انتهى تفويض حساب Gmail أو تم سحبه.',
      });
    }
    throw new Error(data.error || 'فشل اختبار الإرسال الفردي عبر Gmail API');
  }

  const updatedConfig = await saveGmailConnectionConfig(params.schoolId, {
    connectedEmail: data.metadata?.connectedEmail || params.senderEmail || null,
    authorizationStatus: 'connected_verified',
    isVerifiedByRealTest: true,
    lastTestSuccessAt: data.testedAt || new Date().toISOString(),
    lastTestRecipient: params.recipientEmail,
    lastTestMessageId: data.gmailMessageId,
    adminAlertMessage: null,
    adminAlertType: 'none',
  });

  return {
    success: true,
    gmailMessageId: data.gmailMessageId,
    testedAt: data.testedAt,
    config: updatedConfig,
  };
}

/**
 * Executes Step 2 Test: Sends a small batch (up to 3 approved test emails) after single test succeeds.
 */
export async function runSmallBatchGmailTest(params: {
  schoolId: string;
  recipients: string[];
}): Promise<{
  success: boolean;
  results: Array<{ recipient: string; outcome: string; gmailMessageId?: string; error?: string }>;
  config: GmailConnectionConfig;
}> {
  const headers = await getAdminBearerHeader();
  const res = await callCloudFunctionWithFallback(
    'gmailTestBatch',
    '/api/gmail/test-batch',
    headers,
    params
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'فشل اختبار الدفعة الصغيرة');
  }

  const updatedConfig = await saveGmailConnectionConfig(params.schoolId, {
    isBatchTestVerified: Boolean(data.success),
    lastBatchTestSuccessAt: data.success ? new Date().toISOString() : null,
    lastBatchTestCount: Array.isArray(data.results) ? data.results.length : 0,
  });

  return {
    success: Boolean(data.success),
    results: data.results || [],
    config: updatedConfig,
  };
}

/**
 * Fetches all Gmail notification queue records for the school (or for a specific student).
 */
export async function fetchGmailQueueRecords(
  schoolId = '7001',
  studentIdOrNumber?: string
): Promise<GmailQueueRecord[]> {
  let records: GmailQueueRecord[] = [];

  try {
    const localRaw = localStorage.getItem(`${LOCAL_GMAIL_QUEUE_KEY}_${schoolId}`);
    if (localRaw) {
      records = JSON.parse(localRaw) as GmailQueueRecord[];
    }
  } catch {}

  if (db) {
    try {
      const colRef = collection(db, 'schools', schoolId, 'gmailNotificationQueue');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const cloudList = snap.docs.map((d) => ({
          ...(d.data() as GmailQueueRecord),
          id: d.id,
        }));
        const map = new Map<string, GmailQueueRecord>();
        records.forEach((r) => map.set(r.id, r));
        cloudList.forEach((r) => map.set(r.id, r));
        records = Array.from(map.values());
        try {
          localStorage.setItem(`${LOCAL_GMAIL_QUEUE_KEY}_${schoolId}`, JSON.stringify(records));
        } catch {}
      }
    } catch (err) {
      console.warn('[GmailQueue] Firestore fetch notice:', err);
    }
  }

  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (studentIdOrNumber) {
    const target = String(studentIdOrNumber).trim();
    return records.filter((r) => r.studentId === target || r.studentNumber === target);
  }

  return records;
}

function saveQueueRecordLocally(schoolId: string, record: GmailQueueRecord): void {
  try {
    const raw = localStorage.getItem(`${LOCAL_GMAIL_QUEUE_KEY}_${schoolId}`);
    const list: GmailQueueRecord[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((i) => i.id === record.id || i.idempotencyKey === record.idempotencyKey);
    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(`${LOCAL_GMAIL_QUEUE_KEY}_${schoolId}`, JSON.stringify(list));
  } catch {}
}

/**
 * Enqueues and processes a single isolated guardian notification with:
 * - Cutoff timestamp check (never auto-sends for historical incidents recorded before `serviceActivatedAt`)
 * - Atomic idempotency check (never sends twice for the same incident + student + guardian + notificationType)
 * - Guardian email & authorized relation verification
 * - Atomic state transitions: 'pending' -> 'processing' -> 'accepted_by_gmail' | 'failed' | 'uncertain'
 */
export async function enqueueAndDispatchGuardianNotification(params: {
  schoolId: string;
  notificationType: GmailNotificationEventType;
  student: Student;
  incidentId: string;
  incidentDate: string;
  incidentCreatedAt?: string;
  incidentTime?: string;
  incidentTitle: string;
  incidentDegree?: string;
  actionTaken?: string;
  approver: {
    uid: string;
    name: string;
    role: string;
  };
  isAdminReviewedViolation?: boolean;
  isManualAdminTrigger?: boolean;
}): Promise<{
  enqueued: boolean;
  dispatched: boolean;
  state?: GmailQueueDeliveryState;
  reason?: string;
  record?: GmailQueueRecord;
}> {
  const { schoolId, notificationType, student, incidentId } = params;
  const { config } = await fetchGmailConnectionConfig(schoolId);

  // 1. For behavioral violations, strictly require Admin review and explicit approval
  if (notificationType === 'violation_notice' && !params.isAdminReviewedViolation) {
    return {
      enqueued: false,
      dispatched: false,
      reason: 'لا يتم إرسال إشعارات المخالفات السلوكية إلا بعد مراجعة المسؤول واعتماد الإرسال صراحةً.',
    };
  }

  // 2. Historical Incident Cutoff Guard: never auto-send for old incidents created before serviceActivatedAt
  if (!params.isManualAdminTrigger && config.serviceActivatedAt && params.incidentCreatedAt) {
    const cutoffMs = new Date(config.serviceActivatedAt).getTime();
    const incidentMs = new Date(params.incidentCreatedAt).getTime();
    if (!isNaN(cutoffMs) && !isNaN(incidentMs) && incidentMs < cutoffMs - 60000) {
      return {
        enqueued: false,
        dispatched: false,
        reason: 'تم تجاهل الواقعة لأنها مسجلة قبل تاريخ تفعيل خدمة الإرسال التلقائي (حماية الوقائع القديمة).',
      };
    }
  }

  // 3. Extract and verify authorized guardian email from the student's unified profile
  const guardianInfo = extractApprovedGuardianEmail(student);
  const recipientEmail = guardianInfo.email || 'missing-guardian-email@invalid.local';

  // 4. Compute deterministic idempotencyKey
  const idempotencyKey = computeClientIdempotencyKey({
    schoolId,
    notificationType,
    incidentId,
    studentId: student.studentNumber || student.id,
    recipientEmail,
  });

  // 5. Check existing queue records to prevent duplicate sending for the same incident + recipient + type
  const existingList = await fetchGmailQueueRecords(schoolId, student.studentNumber || student.id);
  const existingRecord = existingList.find((r) => r.idempotencyKey === idempotencyKey);
  if (
    existingRecord &&
    (existingRecord.state === 'accepted_by_gmail' ||
      existingRecord.state === 'processing' ||
      existingRecord.state === 'uncertain')
  ) {
    return {
      enqueued: false,
      dispatched: false,
      state: existingRecord.state,
      reason: `تم التعامل مع هذا الإشعار مسبقاً (الحالة الحالية: ${existingRecord.state}) — تم منع التكرار.`,
      record: existingRecord,
    };
  }

  // 6. Render isolated Arabic template for this specific student & guardian only
  const templates = await fetchGmailTemplates(schoolId);
  const selectedTemplate = templates[notificationType];
  const rendered = renderGuardianTemplateContent(selectedTemplate, {
    guardianName: guardianInfo.guardianName,
    studentName: student.fullName,
    studentNumber: student.studentNumber || student.id,
    grade: String(student.grade || ''),
    section: String(student.section || ''),
    incidentDate: params.incidentDate,
    arrivalTime: params.incidentTime,
    absenceStatus: params.incidentTitle,
    violationTitle: params.incidentTitle,
    violationDegree: params.incidentDegree,
    actionTaken: params.actionTaken,
  });

  const nowIso = new Date().toISOString();
  const rfc822MessageId = `${idempotencyKey}@fujairah-islamic.edu.ae`;

  // If guardian email is missing or invalid, log as 'failed' immediately so it appears in Failed Notifications for review
  if (!guardianInfo.isValid) {
    const failedRecord: GmailQueueRecord = {
      id: idempotencyKey,
      idempotencyKey,
      schoolId,
      notificationType,
      state: 'failed',
      studentId: student.id,
      studentNumber: student.studentNumber || student.id,
      studentName: student.fullName,
      grade: String(student.grade || ''),
      section: String(student.section || ''),
      incidentId,
      incidentDate: params.incidentDate,
      incidentTime: params.incidentTime,
      incidentTitle: params.incidentTitle,
      incidentDegree: params.incidentDegree,
      actionTaken: params.actionTaken,
      guardianName: guardianInfo.guardianName,
      guardianRelation: guardianInfo.guardianRelation,
      recipientEmail: '',
      isAuthorizedGuardian: false,
      subject: rendered.subject,
      bodyText: rendered.bodyText,
      rfc822MessageId,
      approvedByUid: params.approver.uid,
      approvedByName: params.approver.name,
      approvedByRole: params.approver.role,
      approvedAt: nowIso,
      isAdminReviewedViolation: params.isAdminReviewedViolation,
      attemptCount: 1,
      lastAttemptAt: nowIso,
      failureReason: guardianInfo.reason || 'بريد ولي الأمر غير مسجل أو غير صالح في ملف الطالب.',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    saveQueueRecordLocally(schoolId, failedRecord);
    if (db) {
      try {
        await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', idempotencyKey), {
          ...failedRecord,
          status: 'فشل',
        });
      } catch {}
    }

    return {
      enqueued: true,
      dispatched: false,
      state: 'failed',
      reason: failedRecord.failureReason,
      record: failedRecord,
    };
  }

  // 7. Create queue item in initial 'pending' state ('انتظار')
  const queueRecord: GmailQueueRecord = {
    id: idempotencyKey,
    idempotencyKey,
    schoolId,
    notificationType,
    state: 'pending',
    studentId: student.id,
    studentNumber: student.studentNumber || student.id,
    studentName: student.fullName,
    grade: String(student.grade || ''),
    section: String(student.section || ''),
    incidentId,
    incidentDate: params.incidentDate,
    incidentTime: params.incidentTime,
    incidentTitle: params.incidentTitle,
    incidentDegree: params.incidentDegree,
    actionTaken: params.actionTaken,
    guardianName: guardianInfo.guardianName,
    guardianRelation: guardianInfo.guardianRelation,
    recipientEmail: guardianInfo.email,
    isAuthorizedGuardian: true,
    subject: rendered.subject,
    bodyText: rendered.bodyText,
    rfc822MessageId,
    approvedByUid: params.approver.uid,
    approvedByName: params.approver.name,
    approvedByRole: params.approver.role,
    approvedAt: nowIso,
    isAdminReviewedViolation: params.isAdminReviewedViolation,
    attemptCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  saveQueueRecordLocally(schoolId, queueRecord);
  if (db) {
    try {
      await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', idempotencyKey), {
        ...queueRecord,
        status: 'انتظار',
      });
    } catch {}
  }

  // 8. On the Firebase Spark plan (Google Apps Script + Google Sheets Bridge architecture),
  // the browser NEVER sends emails directly. Approved requests remain in 'pending' state in Firestore
  // (`schools/{schoolId}/gmailNotificationQueue/{idempotencyKey}`) and are picked up by the
  // time-driven Google Apps Script trigger running inside the Academy's Gmail account.
  if (!config.isVerifiedByRealTest || !config.adminApprovedProductionSend || !config.autoSendEnabled) {
    return {
      enqueued: true,
      dispatched: false,
      state: 'pending',
      reason: 'تمت جدولة الإشعار في طابور الانتظار (بانتظار معالجة Google Apps Script وتفعيل الإرسال التلقائي من الإدارة).',
      record: queueRecord,
    };
  }

  return {
    enqueued: true,
    dispatched: false,
    state: 'pending',
    reason: 'تم إدراج الإشعار المعتمد في طابور Firestore وجسر Google Sheets ليتم إرساله تلقائياً عبر المشغّل الزمني (Apps Script).',
    record: queueRecord,
  };
}

/**
 * Atomically transitions a queue item from 'pending' -> 'processing' -> 'accepted_by_gmail' | 'failed' | 'uncertain'
 */
export async function dispatchQueueRecordItem(
  schoolId: string,
  record: GmailQueueRecord,
  retryActor?: { uid: string; name: string }
): Promise<{
  enqueued: boolean;
  dispatched: boolean;
  state: GmailQueueDeliveryState;
  reason?: string;
  record: GmailQueueRecord;
}> {
  const { config } = await fetchGmailConnectionConfig(schoolId);
  const today = new Date().toISOString().slice(0, 10);
  const dailySent = config.dailyCounterDate === today ? config.dailySentCount : 0;

  if (dailySent >= config.dailyLimitMax) {
    const quotaMsg = `تم إيقاف المحاولة لبلوغ الحد اليومي الآمن (${config.dailyLimitMax} رسالة/يوم).`;
    await saveGmailConnectionConfig(schoolId, {
      authorizationStatus: 'quota_paused',
      isQuotaReachedAlert: true,
      adminAlertType: 'quota_reached',
      adminAlertMessage: quotaMsg,
    });
    const pausedRecord: GmailQueueRecord = {
      ...record,
      state: 'failed',
      failureReason: quotaMsg,
      updatedAt: new Date().toISOString(),
    };
    saveQueueRecordLocally(schoolId, pausedRecord);
    if (db) {
      try {
        await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', record.id), pausedRecord, { merge: true });
      } catch {}
    }
    return {
      enqueued: true,
      dispatched: false,
      state: 'failed',
      reason: quotaMsg,
      record: pausedRecord,
    };
  }

  // Transition to 'processing' ('معالجة')
  const attemptId = `att_${Date.now()}`;
  const processingRecord: GmailQueueRecord = {
    ...record,
    state: 'processing',
    attemptCount: (record.attemptCount || 0) + 1,
    lastAttemptId: attemptId,
    lastAttemptAt: new Date().toISOString(),
    ...(retryActor
      ? {
          retriedByUid: retryActor.uid,
          retriedByName: retryActor.name,
          retriedAt: new Date().toISOString(),
        }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  saveQueueRecordLocally(schoolId, processingRecord);
  if (db) {
    try {
      const ref = doc(db, 'schools', schoolId, 'gmailNotificationQueue', record.id);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) {
          const current = snap.data() as GmailQueueRecord;
          if (current.state === 'accepted_by_gmail') {
            throw new Error('ALREADY_ACCEPTED');
          }
        }
        tx.set(ref, processingRecord, { merge: true });
      });
    } catch (txErr: any) {
      if (txErr?.message === 'ALREADY_ACCEPTED') {
        return {
          enqueued: true,
          dispatched: true,
          state: 'accepted_by_gmail',
          record: { ...record, state: 'accepted_by_gmail' },
        };
      }
    }
  }

  // Call server `/api/gmail/dispatch-queue-item`
  try {
    const headers = await getAdminBearerHeader();
    const res = await fetch('/api/gmail/dispatch-queue-item', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        idempotencyKey: processingRecord.idempotencyKey,
        recipientEmail: processingRecord.recipientEmail,
        guardianRelation: processingRecord.guardianRelation,
        guardianName: processingRecord.guardianName,
        subject: processingRecord.subject,
        bodyText: processingRecord.bodyText,
        rfc822MessageId: processingRecord.rfc822MessageId,
        dailyLimitMax: config.dailyLimitMax,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.outcome === 'accepted_by_gmail') {
      const acceptedAt = new Date().toISOString();
      const acceptedRecord: GmailQueueRecord = {
        ...processingRecord,
        state: 'accepted_by_gmail',
        gmailMessageId: data.gmailMessageId,
        gmailThreadId: data.gmailThreadId,
        acceptedByGmailAt: acceptedAt,
        failureReason: undefined,
        uncertainReason: undefined,
        updatedAt: acceptedAt,
      };
      saveQueueRecordLocally(schoolId, acceptedRecord);
      if (db) {
        try {
          await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', record.id), acceptedRecord);
        } catch {}
      }
      await saveGmailConnectionConfig(schoolId, {
        dailyCounterDate: today,
        dailySentCount: dailySent + 1,
      });
      return {
        enqueued: true,
        dispatched: true,
        state: 'accepted_by_gmail',
        record: acceptedRecord,
      };
    }

    if (data.outcome === 'uncertain') {
      const uncertainRecord: GmailQueueRecord = {
        ...processingRecord,
        state: 'uncertain',
        uncertainReason:
          data.error ||
          'انقطع الاتصال بعد إرسال الطلب إلى Gmail — الحالة غير مؤكدة (يرجى المراجعة قبل إعادة المحاولة).',
        updatedAt: new Date().toISOString(),
      };
      saveQueueRecordLocally(schoolId, uncertainRecord);
      if (db) {
        try {
          await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', record.id), uncertainRecord);
        } catch {}
      }
      return {
        enqueued: true,
        dispatched: false,
        state: 'uncertain',
        reason: uncertainRecord.uncertainReason,
        record: uncertainRecord,
      };
    }

    const failedRecord: GmailQueueRecord = {
      ...processingRecord,
      state: 'failed',
      failureReason: data.error || `تعذر الإرسال (HTTP ${res.status})`,
      updatedAt: new Date().toISOString(),
    };
    saveQueueRecordLocally(schoolId, failedRecord);
    if (db) {
      try {
        await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', record.id), failedRecord);
      } catch {}
    }

    return {
      enqueued: true,
      dispatched: false,
      state: 'failed',
      reason: failedRecord.failureReason,
      record: failedRecord,
    };
  } catch (networkErr: any) {
    // Network drop while waiting for server dispatch response -> mark 'uncertain'
    const uncertainRecord: GmailQueueRecord = {
      ...processingRecord,
      state: 'uncertain',
      uncertainReason: `انقطع الاتصال أثناء انتظار استجابة Gmail (${networkErr?.message || 'خطأ شبكة'}).`,
      updatedAt: new Date().toISOString(),
    };
    saveQueueRecordLocally(schoolId, uncertainRecord);
    if (db) {
      try {
        await setDoc(doc(db, 'schools', schoolId, 'gmailNotificationQueue', record.id), uncertainRecord);
      } catch {}
    }
    return {
      enqueued: true,
      dispatched: false,
      state: 'uncertain',
      reason: uncertainRecord.uncertainReason,
      record: uncertainRecord,
    };
  }
}

/**
 * Processes a batch of approved Morning Tardiness records with rate-limiting spacing.
 */
export async function processApprovedTardinessBatchNotifications(params: {
  schoolId: string;
  savedRecords: TardinessRecord[];
  students: Student[];
  approver: { uid: string; name: string; role: string };
}): Promise<{ enqueuedCount: number; acceptedCount: number; failedCount: number }> {
  const { config } = await fetchGmailConnectionConfig(params.schoolId);
  if (!config.autoSendTardinessOnApprove) {
    return { enqueuedCount: 0, acceptedCount: 0, failedCount: 0 };
  }

  let enqueuedCount = 0;
  let acceptedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < params.savedRecords.length; i++) {
    const rec = params.savedRecords[i];
    const student = params.students.find(
      (s) => s.id === rec.studentId || s.studentNumber === rec.studentNumber
    );
    if (!student) continue;

    const res = await enqueueAndDispatchGuardianNotification({
      schoolId: params.schoolId,
      notificationType: 'tardiness_notice',
      student,
      incidentId: rec.id,
      incidentDate: rec.date,
      incidentCreatedAt: rec.createdAt || new Date().toISOString(),
      incidentTime: rec.time,
      incidentTitle: 'تأخير صباحي عن الطابور المدرسي',
      actionTaken: rec.counselorDecision || rec.suggestedAction,
      approver: params.approver,
    });

    if (res.enqueued) enqueuedCount++;
    if (res.state === 'accepted_by_gmail') acceptedCount++;
    if (res.state === 'failed') failedCount++;

    if (res.dispatched && i < params.savedRecords.length - 1) {
      await new Promise((r) => setTimeout(r, config.rateLimitDelayMs || 1500));
    }
  }

  return { enqueuedCount, acceptedCount, failedCount };
}

/**
 * Processes a batch of approved Absence records with rate-limiting spacing.
 */
export async function processApprovedAbsenceBatchNotifications(params: {
  schoolId: string;
  savedRecords: AbsenceRecord[];
  students: Student[];
  approver: { uid: string; name: string; role: string };
}): Promise<{ enqueuedCount: number; acceptedCount: number; failedCount: number }> {
  const { config } = await fetchGmailConnectionConfig(params.schoolId);
  if (!config.autoSendAbsenceOnApprove) {
    return { enqueuedCount: 0, acceptedCount: 0, failedCount: 0 };
  }

  let enqueuedCount = 0;
  let acceptedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < params.savedRecords.length; i++) {
    const rec = params.savedRecords[i];
    const student = params.students.find(
      (s) => s.id === rec.studentId || s.studentNumber === rec.studentNumber
    );
    if (!student) continue;

    const res = await enqueueAndDispatchGuardianNotification({
      schoolId: params.schoolId,
      notificationType: 'absence_notice',
      student,
      incidentId: rec.id,
      incidentDate: rec.date,
      incidentCreatedAt: rec.createdAt || new Date().toISOString(),
      incidentTitle: `${rec.status} (${rec.excuseStatus})`,
      actionTaken: 'متابعة الحضور والانضباط المدرسي',
      approver: params.approver,
    });

    if (res.enqueued) enqueuedCount++;
    if (res.state === 'accepted_by_gmail') acceptedCount++;
    if (res.state === 'failed') failedCount++;

    if (res.dispatched && i < params.savedRecords.length - 1) {
      await new Promise((r) => setTimeout(r, config.rateLimitDelayMs || 1500));
    }
  }

  return { enqueuedCount, acceptedCount, failedCount };
}

/**
 * Sends a Behavioral Violation notification ONLY after explicit Admin review and approval.
 */
export async function approveAndSendViolationGmailNotification(params: {
  schoolId: string;
  violation: ViolationRecord;
  student: Student;
  adminUser: { uid: string; name: string; role: string; email?: string | null };
}): Promise<{
  enqueued: boolean;
  dispatched: boolean;
  state?: GmailQueueDeliveryState;
  reason?: string;
  record?: GmailQueueRecord;
}> {
  if (!isAuthorizedGmailAdmin(params.adminUser)) {
    throw new Error('غير مصرح: يتطلب إرسال إشعارات المخالفات السلوكية عبر Gmail اعتماد المسؤول المعتمد حصراً.');
  }

  return await enqueueAndDispatchGuardianNotification({
    schoolId: params.schoolId,
    notificationType: 'violation_notice',
    student: params.student,
    incidentId: params.violation.id,
    incidentDate: params.violation.incidentDateTime?.split(' ')[0] || new Date().toISOString().slice(0, 10),
    incidentCreatedAt: params.violation.createdAt,
    incidentTitle: params.violation.violationType,
    incidentDegree: params.violation.violationDegree,
    actionTaken: params.violation.suggestedAction,
    approver: {
      uid: params.adminUser.uid,
      name: params.adminUser.name,
      role: params.adminUser.role,
    },
    isAdminReviewedViolation: true,
    isManualAdminTrigger: true,
  });
}
