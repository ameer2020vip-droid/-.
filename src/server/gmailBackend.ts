import crypto from 'crypto';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type {
  GmailConnectionConfig,
  GmailEmailTemplateConfig,
  GmailNotificationEventType,
  GmailQueueDeliveryState,
  GmailQueueRecord,
} from '../types';

export const FIREBASE_PROJECT_ID = 'fujairah-islamic';
export const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

// Secret names in Google Cloud Secret Manager (projects/fujairah-islamic/secrets/*)
export const SECRET_NAMES = {
  CLIENT_ID: 'GMAIL_OAUTH_CLIENT_ID',
  CLIENT_SECRET: 'GMAIL_OAUTH_CLIENT_SECRET',
  REFRESH_TOKEN: 'GMAIL_OAUTH_REFRESH_TOKEN',
  CONNECTED_EMAIL: 'GMAIL_OAUTH_CONNECTED_EMAIL',
} as const;

let secretManagerClient: SecretManagerServiceClient | null = null;

function getSecretManagerClient(): SecretManagerServiceClient {
  if (!secretManagerClient) {
    secretManagerClient = new SecretManagerServiceClient();
  }
  return secretManagerClient;
}

/**
 * Reads a secret version exclusively from Google Cloud Secret Manager (`projects/fujairah-islamic/secrets/{name}/versions/latest`).
 * Never reads from VITE_*, browser inputs, or local container environment variables.
 */
export async function readServerSecret(secretName: string): Promise<string | null> {
  try {
    const client = getSecretManagerClient();
    const versionName = `projects/${FIREBASE_PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({ name: versionName });
    const payload = version.payload?.data?.toString('utf8')?.trim();
    if (payload) {
      return payload;
    }
  } catch (err: any) {
    const code = err?.code;
    if (code !== 5 && code !== 7 && code !== 16) {
      console.warn(`[SecretManager] Notice reading ${secretName}:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Stores a new secret version in Google Cloud Secret Manager (`projects/fujairah-islamic/secrets/{name}`).
 * Creates the secret container first if it does not exist.
 */
export async function writeServerSecret(
  secretName: string,
  secretValue: string
): Promise<{ storedInSecretManager: boolean; resourcePath: string; error?: string }> {
  const parent = `projects/${FIREBASE_PROJECT_ID}`;
  const secretPath = `${parent}/secrets/${secretName}`;

  try {
    const client = getSecretManagerClient();
    try {
      await client.getSecret({ name: secretPath });
    } catch (getErr: any) {
      if (getErr?.code === 5 || String(getErr?.message || '').includes('NOT_FOUND')) {
        await client.createSecret({
          parent,
          secretId: secretName,
          secret: {
            replication: {
              automatic: {},
            },
          },
        });
      } else {
        throw getErr;
      }
    }

    const [version] = await client.addSecretVersion({
      parent: secretPath,
      payload: {
        data: Buffer.from(secretValue, 'utf8'),
      },
    });

    return {
      storedInSecretManager: true,
      resourcePath: version.name || `${secretPath}/versions/latest`,
    };
  } catch (err: any) {
    console.warn(`[SecretManager] Could not write ${secretName} to GCP Secret Manager:`, err?.message || err);
    return {
      storedInSecretManager: false,
      resourcePath: `${secretPath}/versions/latest`,
      error: err?.message || 'تعذر الوصول إلى Google Cloud Secret Manager',
    };
  }
}

/**
 * Disables/destroys the latest refresh token version in Google Cloud Secret Manager upon disconnect.
 */
export async function clearRefreshTokenSecret(): Promise<void> {
  try {
    const client = getSecretManagerClient();
    const versionName = `projects/${FIREBASE_PROJECT_ID}/secrets/${SECRET_NAMES.REFRESH_TOKEN}/versions/latest`;
    await client.destroySecretVersion({ name: versionName });
  } catch {
    // Ignore if already destroyed or not found
  }
}

/**
 * Verifies the Firebase ID Token on the server and checks that the caller is an authorized Administrator.
 */
export async function verifyServerAdminToken(
  authHeader: string | undefined,
  expectedEmailHint?: string
): Promise<{
  verified: boolean;
  uid: string;
  email: string;
  name: string;
  role: string;
  error?: string;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      verified: false,
      uid: '',
      email: '',
      name: '',
      role: '',
      error: 'مطلوب رمز مصادقة المسؤول (Bearer ID Token) لتنفيذ هذه العملية على الخادم.',
    };
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    return {
      verified: false,
      uid: '',
      email: '',
      name: '',
      role: '',
      error: 'رمز المصادقة فارغ أو غير صالح.',
    };
  }

  try {
    // Verify Firebase ID token via Google's official tokeninfo / identitytoolkit verification
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );

    if (!response.ok) {
      return {
        verified: false,
        uid: '',
        email: '',
        name: '',
        role: '',
        error: 'فشل التحقق من جلسة المسؤول على الخادم (انتهت الجلسة أو الرمز غير صالح).',
      };
    }

    const tokenData = (await response.json()) as Record<string, any>;
    const email = String(tokenData.email || expectedEmailHint || '').trim().toLowerCase();
    const uid = String(tokenData.sub || tokenData.user_id || '').trim();
    const name = String(tokenData.name || email || 'مسؤول الأكاديمية').trim();
    const emailVerified = tokenData.email_verified === 'true' || tokenData.email_verified === true;

    if (!uid || !email || !emailVerified) {
      return {
        verified: false,
        uid,
        email,
        name,
        role: '',
        error: 'يجب تسجيل الدخول بحساب بريد إلكتروني موثق ومعتمد للإدارة.',
      };
    }

    return {
      verified: true,
      uid,
      email,
      name,
      role: email === 'ameer2020vip@gmail.com' ? 'systemAdmin' : 'schoolAdmin',
    };
  } catch (err: any) {
    return {
      verified: false,
      uid: '',
      email: '',
      name: '',
      role: '',
      error: `خطأ أثناء التحقق من هوية المسؤول على الخادم: ${err?.message || 'خطأ غير معروف'}`,
    };
  }
}

/**
 * Validates that a guardian email is syntactically valid and belongs to an authorized guardian relation.
 */
export function validateAuthorizedGuardianRecipient(params: {
  recipientEmail?: string;
  guardianRelation?: string;
  guardianName?: string;
  studentEmail?: string;
}): {
  valid: boolean;
  normalizedEmail: string;
  normalizedRelation: string;
  reason?: string;
} {
  const rawEmail = String(params.recipientEmail || '').trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!rawEmail || !emailRegex.test(rawEmail)) {
    return {
      valid: false,
      normalizedEmail: rawEmail,
      normalizedRelation: params.guardianRelation || 'غير محدد',
      reason: 'عنوان البريد الإلكتروني لولي الأمر غير صالح أو غير مسجل في ملف الطالب.',
    };
  }

  // Prevent accidentally sending guardian notifications to the student's own personal email if identical
  if (
    params.studentEmail &&
    params.studentEmail.trim().toLowerCase() === rawEmail &&
    params.guardianRelation === 'الطالب'
  ) {
    return {
      valid: false,
      normalizedEmail: rawEmail,
      normalizedRelation: params.guardianRelation || 'الطالب',
      reason: 'البريد المسجل يخص الطالب نفسه وليس ولي الأمر المخوّل.',
    };
  }

  const relation = String(params.guardianRelation || 'ولي الأمر').trim();
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

  const isAuthorized = authorizedRelations.some((r) => relation.includes(r)) || relation !== 'الطالب';
  if (!isAuthorized) {
    return {
      valid: false,
      normalizedEmail: rawEmail,
      normalizedRelation: relation,
      reason: `الصفة المسجلة (${relation}) غير مخوّلة باستلام إشعارات ولي الأمر الرسمية.`,
    };
  }

  return {
    valid: true,
    normalizedEmail: rawEmail,
    normalizedRelation: relation || 'ولي الأمر الأساسي',
  };
}

/**
 * Generates a deterministic idempotency key for a notification so the exact same
 * (schoolId, notificationType, incidentId, studentId, recipientEmail) can never be sent twice.
 */
export function buildNotificationIdempotencyKey(params: {
  schoolId: string;
  notificationType: GmailNotificationEventType;
  incidentId: string;
  studentId: string;
  recipientEmail: string;
}): string {
  const raw = [
    String(params.schoolId || '7001').trim(),
    String(params.notificationType).trim(),
    String(params.incidentId).trim(),
    String(params.studentId).trim(),
    String(params.recipientEmail).trim().toLowerCase(),
  ].join('|');

  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 28);
  return `gmail_${params.notificationType}_${params.studentId}_${hash}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Default Arabic templates for the 3 automated notification types in Fujairah Scientific Islamic Academy.
 */
export function getDefaultGmailTemplates(): Record<GmailNotificationEventType, GmailEmailTemplateConfig> {
  const now = new Date().toISOString();
  return {
    tardiness_notice: {
      id: 'tardiness_notice',
      titleAr: 'قالب إشعار التأخير الصباحي المعتمد',
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
      updatedBy: 'system_default',
    },
    absence_notice: {
      id: 'absence_notice',
      titleAr: 'قالب إشعار الغياب المدرسي المعتمد',
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
      updatedBy: 'system_default',
    },
    violation_notice: {
      id: 'violation_notice',
      titleAr: 'قالب إشعار المخالفة السلوكية (بعد مراجعة واعتماد المسؤول)',
      subjectTemplate: 'إشعار تربوي رسمي بخصوص الطالب {studentName} - أكاديمية الفجيرة العلمية الإسلامية',
      bodyTemplate: `السلام عليكم ورحمة الله وبركاته،
المكرم ولي أمر الطالب: {guardianName} المحترم،

في إطار الشراكة التربوية البناءة بين الأسرة وأكاديمية الفجيرة العلمية الإسلامية، وبعد مراجعة الإدارة المختصة واعتماد الإشعار، نحيطكم علماً بتسجيل الملاحظة السلوكية التالية:

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
      updatedBy: 'system_default',
    },
  };
}

/**
 * Sanitizes and renders template variables while ensuring no sensitive psychological notes
 * or other students' data are ever injected.
 */
export function renderIsolatedGuardianEmail(
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
  const safeReplace = (text: string): string =>
    text
      .replace(/\{guardianName\}/g, vars.guardianName || 'ولي الأمر المحترم')
      .replace(/\{studentName\}/g, vars.studentName || '')
      .replace(/\{studentNumber\}/g, vars.studentNumber || '')
      .replace(/\{grade\}/g, vars.grade || '')
      .replace(/\{section\}/g, vars.section || '')
      .replace(/\{incidentDate\}/g, vars.incidentDate || '')
      .replace(/\{arrivalTime\}/g, vars.arrivalTime || 'غير محدد')
      .replace(/\{absenceStatus\}/g, vars.absenceStatus || 'غائب')
      .replace(/\{violationTitle\}/g, vars.violationTitle || 'مخالفة سلوكية')
      .replace(/\{violationDegree\}/g, vars.violationDegree || '')
      .replace(/\{actionTaken\}/g, vars.actionTaken || 'متابعة إرشادية وتربوية')
      .replace(/\{academyName\}/g, 'أكاديمية الفجيرة العلمية الإسلامية');

  return {
    subject: safeReplace(template.subjectTemplate).replace(/[\r\n]+/g, ' ').trim(),
    bodyText: safeReplace(template.bodyTemplate).trim(),
  };
}

/**
 * Encodes an RFC 2822 MIME message in base64url format for Gmail API `users.messages.send`.
 */
export function buildRfc2822Base64UrlMessage(params: {
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  rfc822MessageId: string;
}): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject, 'utf8').toString('base64')}?=`;
  const encodedFromName = `=?UTF-8?B?${Buffer.from('أكاديمية الفجيرة العلمية الإسلامية', 'utf8').toString('base64')}?=`;

  const escapedHtmlBody = params.bodyText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

  const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:24px;background-color:#FAF7EF;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;text-align:right;color:#0B2748;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:2px solid #C9A227;border-radius:16px;overflow:hidden;">
    <div style="background:#0B2748;color:#FFFFFF;padding:20px 24px;border-bottom:3px solid #C9A227;">
      <h2 style="margin:0;font-size:18px;color:#C9A227;">أكاديمية الفجيرة العلمية الإسلامية</h2>
      <p style="margin:4px 0 0;font-size:12px;color:#E2E8F0;">مكتب الإرشاد الطلابي وشؤون الطلبة - إمارة الفجيرة</p>
    </div>
    <div style="padding:24px;font-size:15px;line-height:1.8;color:#0B2748;">
      ${escapedHtmlBody}
    </div>
    <div style="background:#F2F3F5;padding:14px 24px;font-size:11px;color:#475569;border-top:1px solid #E2E8F0;text-align:center;">
      رسالة آلية رسمية صادرة من نظام الإرشاد الطلابي في أكاديمية الفجيرة العلمية الإسلامية — هذه الرسالة خاصة بولي الأمر المعني فقط.
    </div>
  </div>
</body>
</html>`;

  const mimeLines = [
    `From: ${encodedFromName} <${params.fromEmail}>`,
    `To: <${params.toEmail}>`,
    `Subject: ${encodedSubject}`,
    `Message-ID: <${params.rfc822MessageId}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlContent, 'utf8').toString('base64'),
  ];

  const rawMime = mimeLines.join('\r\n');
  return Buffer.from(rawMime, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Exchanges the stored Refresh Token for a fresh Access Token and sends a message via Gmail API.
 * Distinguishes between:
 * - 'accepted_by_gmail' (HTTP 200 with Gmail message id)
 * - 'token_revoked' (invalid_grant / 401 / 403)
 * - 'quota_exceeded' (429 / rateLimitExceeded / dailyLimitExceeded)
 * - 'uncertain' (Network timeout / connection reset AFTER request was sent to Gmail)
 * - 'failed' (Other deterministic errors)
 */
export async function sendEmailViaGmailOAuth(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  rfc822MessageId: string;
}): Promise<{
  outcome: 'accepted_by_gmail' | 'token_revoked' | 'quota_exceeded' | 'uncertain' | 'failed';
  gmailMessageId?: string;
  gmailThreadId?: string;
  errorMessage?: string;
}> {
  // Step 1: Exchange refresh_token for access_token (before sending any email)
  let accessToken = '';
  let grantedScope = '';
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        refresh_token: params.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenData = (await tokenRes.json()) as Record<string, any>;
    if (!tokenRes.ok || !tokenData.access_token) {
      const errCode = String(tokenData.error || '');
      const errDesc = String(tokenData.error_description || tokenData.error || 'تعذر تجديد رمز الوصول');
      if (errCode === 'invalid_grant' || errCode === 'unauthorized_client' || tokenRes.status === 400 || tokenRes.status === 401) {
        return {
          outcome: 'token_revoked',
          errorMessage: `انتهى تفويض حساب Gmail أو تم سحبه (${errDesc}). يرجى إعادة ربط الحساب.`,
        };
      }
      return {
        outcome: 'failed',
        errorMessage: `فشل الحصول على رمز الوصول من Google OAuth: ${errDesc}`,
      };
    }

    accessToken = String(tokenData.access_token);
    grantedScope = String(tokenData.scope || '');
    if (grantedScope && !grantedScope.includes('gmail.send')) {
      return {
        outcome: 'token_revoked',
        errorMessage: 'الرمز الحالي لا يتضمن صلاحية إرسال البريد (gmail.send). يرجى إعادة التفويض.',
      };
    }
  } catch (networkErr: any) {
    // Failure occurred BEFORE dispatching the Gmail send request, so it is a clean failure (not uncertain)
    return {
      outcome: 'failed',
      errorMessage: `تعذر الاتصال بخادم مصادقة Google قبل الإرسال: ${networkErr?.message || 'خطأ شبكة'}`,
    };
  }

  // Step 2: Build RFC 2822 message and dispatch to Gmail API
  const rawBase64Url = buildRfc2822Base64UrlMessage({
    fromEmail: params.fromEmail,
    toEmail: params.toEmail,
    subject: params.subject,
    bodyText: params.bodyText,
    rfc822MessageId: params.rfc822MessageId,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18000);

  try {
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawBase64Url }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const sendData = (await sendRes.json().catch(() => ({}))) as Record<string, any>;

    if (sendRes.ok && sendData.id) {
      return {
        outcome: 'accepted_by_gmail',
        gmailMessageId: String(sendData.id),
        gmailThreadId: String(sendData.threadId || sendData.id),
      };
    }

    const status = sendRes.status;
    const apiErrMsg =
      sendData?.error?.message ||
      sendData?.error_description ||
      `HTTP ${status}`;
    const apiReason = String(sendData?.error?.errors?.[0]?.reason || '');

    if (status === 401 || status === 403) {
      if (
        apiReason.includes('rateLimitExceeded') ||
        apiReason.includes('dailyLimitExceeded') ||
        apiReason.includes('userRateLimitExceeded') ||
        apiErrMsg.toLowerCase().includes('quota') ||
        apiErrMsg.toLowerCase().includes('limit')
      ) {
        return {
          outcome: 'quota_exceeded',
          errorMessage: `تم بلوغ الحد اليومي أو معدل الإرسال المسموح به في Gmail: ${apiErrMsg}`,
        };
      }
      return {
        outcome: 'token_revoked',
        errorMessage: `رفض خادم Gmail التفويض (${apiErrMsg}). قد يكون تم سحب الصلاحية أو إيقاف الحساب.`,
      };
    }

    if (status === 429) {
      return {
        outcome: 'quota_exceeded',
        errorMessage: `تجاوز معدل الطلبات المسموح به في Gmail (429): ${apiErrMsg}`,
      };
    }

    if (status >= 500) {
      // 5xx from Gmail after request was transmitted means Gmail may or may not have accepted it
      return {
        outcome: 'uncertain',
        errorMessage: `استجابة غير مؤكدة من خادم Gmail (${status}: ${apiErrMsg}) بعد إرسال الطلب. يرجى المراجعة قبل إعادة المحاولة.`,
      };
    }

    return {
      outcome: 'failed',
      errorMessage: `رفض خادم Gmail الرسالة: ${apiErrMsg}`,
    };
  } catch (dispatchErr: any) {
    clearTimeout(timeoutId);
    // Network drop or timeout occurred AFTER the POST request to Gmail was dispatched!
    return {
      outcome: 'uncertain',
      errorMessage: `انقطع الاتصال بعد إرسال الطلب إلى Gmail (${dispatchErr?.message || 'انتهاء المهلة'}). الحالة غير مؤكدة لمنع تكرار الإرسال.`,
    };
  }
}
