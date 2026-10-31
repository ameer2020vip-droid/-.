import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as crypto from 'crypto';

const app = admin.apps.length ? admin.app() : admin.initializeApp();

const PROJECT_ID = 'fujairah-islamic';
const DATABASE_ID = 'ai-studio-7049e193-0b31-400e-a46c-4163cfd4f315';
const REGION = 'europe-west1';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

// Secrets bound strictly to Firebase Cloud Functions from Google Cloud Secret Manager
// Never exposed to React, Vite, or AI Studio container environment variables
const GMAIL_OAUTH_CLIENT_ID = defineSecret('GMAIL_OAUTH_CLIENT_ID');
const GMAIL_OAUTH_CLIENT_SECRET = defineSecret('GMAIL_OAUTH_CLIENT_SECRET');
const REFRESH_TOKEN_SECRET_NAME = 'GMAIL_OAUTH_REFRESH_TOKEN';

const secretManager = new SecretManagerServiceClient();

function getDb() {
  return getFirestore(app, DATABASE_ID);
}

async function readRefreshTokenFromSecretManager(): Promise<string | null> {
  try {
    const name = `projects/${PROJECT_ID}/secrets/${REFRESH_TOKEN_SECRET_NAME}/versions/latest`;
    const [version] = await secretManager.accessSecretVersion({ name });
    return version.payload?.data?.toString('utf8')?.trim() || null;
  } catch {
    return null;
  }
}

async function saveRefreshTokenToSecretManager(refreshToken: string): Promise<string> {
  const parent = `projects/${PROJECT_ID}`;
  const secretPath = `${parent}/secrets/${REFRESH_TOKEN_SECRET_NAME}`;
  try {
    await secretManager.getSecret({ name: secretPath });
  } catch {
    await secretManager.createSecret({
      parent,
      secretId: REFRESH_TOKEN_SECRET_NAME,
      secret: { replication: { automatic: {} } },
    });
  }
  const [version] = await secretManager.addSecretVersion({
    parent: secretPath,
    payload: { data: Buffer.from(refreshToken, 'utf8') },
  });
  return version.name || `${secretPath}/versions/latest`;
}

async function destroyRefreshTokenInSecretManager(): Promise<void> {
  try {
    const name = `projects/${PROJECT_ID}/secrets/${REFRESH_TOKEN_SECRET_NAME}/versions/latest`;
    await secretManager.destroySecretVersion({ name });
  } catch {
    // Ignore if already destroyed or does not exist
  }
}

async function verifyAdminCaller(authHeader?: string): Promise<{
  uid: string;
  email: string;
  name: string;
}> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('مطلوب رمز مصادقة المسؤول (Bearer Token).');
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  const decoded = await admin.auth().verifyIdToken(idToken);
  const email = (decoded.email || '').toLowerCase();
  const uid = decoded.uid;

  const db = getDb();
  const userSnap = await db.doc(`users/${uid}`).get();
  const role = userSnap.exists ? String(userSnap.data()?.role || '') : '';
  const isAdmin =
    email === 'ameer2020vip@gmail.com' ||
    ['systemAdmin', 'schoolAdmin', 'admin', 'system_owner', 'school_admin'].includes(role);

  if (!isAdmin) {
    throw new Error('غير مصرح: هذه العملية مخصصة للمسؤول المعتمد فقط.');
  }

  return {
    uid,
    email,
    name: userSnap.data()?.fullName || decoded.name || email,
  };
}

function buildHtmlMimeBase64Url(params: {
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

  return Buffer.from(mimeLines.join('\r\n'), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 1. Start OAuth 2.0 Authorization Code Flow (Server-side with state & access_type=offline)
 * Function Name: gmailOAuthStart
 * Region: europe-west1
 * Direct URL: https://europe-west1-fujairah-islamic.cloudfunctions.net/gmailOAuthStart
 */
export const gmailOAuthStart = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET],
  },
  async (req, res) => {
    try {
      const adminUser = await verifyAdminCaller(req.headers.authorization);
      const schoolId = String(req.body?.schoolId || '7001').trim();
      const redirectUri = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/gmailOAuthCallback`;

      const state = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const db = getDb();

      await db.doc(`schools/${schoolId}/gmailOAuthStates/${state}`).set({
        state,
        uid: adminUser.uid,
        adminEmail: adminUser.email,
        adminName: adminUser.name,
        schoolId,
        redirectUri,
        createdAt: now,
        expiresAt: now + 10 * 60 * 1000,
        consumed: false,
      });

      const params = new URLSearchParams({
        client_id: GMAIL_OAUTH_CLIENT_ID.value().trim(),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: GMAIL_SEND_SCOPE, // Strictly gmail.send only
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'false',
        state: `${schoolId}:${state}`,
      });

      res.json({
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
        redirectUri,
        requestedScope: GMAIL_SEND_SCOPE,
      });
    } catch (err: any) {
      res.status(403).json({ error: err?.message || 'فشل بدء تفويض OAuth' });
    }
  }
);

/**
 * 2. Real OAuth 2.0 Callback Endpoint (Authorization Code Flow + CSRF State Verification)
 * Function Name: gmailOAuthCallback
 * Region: europe-west1
 * Direct Cloud Function URL: https://europe-west1-fujairah-islamic.cloudfunctions.net/gmailOAuthCallback
 * Firebase Hosting Rewrite URL: https://fujairah-islamic.web.app/api/gmail/oauth/callback
 */
export const gmailOAuthCallback = onRequest(
  {
    region: REGION,
    secrets: [GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET],
  },
  async (req, res) => {
    const oauthError = String(req.query.error || '').trim();
    const code = String(req.query.code || '').trim();
    const rawState = String(req.query.state || '').trim();
    const grantedScope = String(req.query.scope || '').trim();

    const renderCallbackPopupHtml = (payload: {
      success: boolean;
      title: string;
      message: string;
      connectedEmail?: string;
      status?: string;
    }) => {
      const safeJson = JSON.stringify({
        type: 'GMAIL_OAUTH_CALLBACK_RESULT',
        ...payload,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(payload.success ? 200 : 400).send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${payload.title} - أكاديمية الفجيرة العلمية الإسلامية</title>
  <style>
    body { margin:0; padding:32px; font-family:'Segoe UI',Tahoma,sans-serif; background:#0B2748; color:#FFFFFF; display:flex; align-items:center; justify-content:center; min-height:85vh; text-align:center; }
    .card { max-width:480px; background:#12395B; border:2px solid #C9A227; border-radius:20px; padding:28px; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
    h2 { color:#C9A227; margin-top:0; font-size:20px; }
    p { color:#FAF7EF; font-size:14px; line-height:1.7; }
    .badge { display:inline-block; padding:6px 14px; border-radius:8px; font-weight:bold; font-size:12px; margin-top:10px; background:${payload.success ? '#147A4A' : '#B4232C'}; color:#fff; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${payload.title}</h2>
    <p>${payload.message}</p>
    <div class="badge">${payload.success ? 'تم التفويض الأولي — بانتظار اختبار الإرسال الحقيقي' : 'تعذر إتمام الربط'}</div>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage(${safeJson}, '*');
      setTimeout(function() { window.close(); }, 1800);
    }
  </script>
</body>
</html>`);
    };

    if (oauthError) {
      renderCallbackPopupHtml({
        success: false,
        title: 'تم إلغاء أو رفض تفويض Gmail',
        message: `أعاد خادم Google OAuth الخطأ التالي: ${oauthError}`,
      });
      return;
    }

    const [schoolIdPart, stateToken] = rawState.includes(':') ? rawState.split(':') : ['7001', rawState];
    const schoolId = schoolIdPart || '7001';

    if (!stateToken || !/^[a-f0-9]{32,128}$/i.test(stateToken)) {
      renderCallbackPopupHtml({
        success: false,
        title: 'فشل التحقق الأمني (Invalid State)',
        message: 'معامل state مفقود أو غير صالح لمنع تزوير الطلبات (CSRF).',
      });
      return;
    }

    const db = getDb();
    const stateRef = db.doc(`schools/${schoolId}/gmailOAuthStates/${stateToken}`);
    const stateSnap = await stateRef.get();

    if (!stateSnap.exists) {
      renderCallbackPopupHtml({
        success: false,
        title: 'جلسة التفويض غير موجودة',
        message: 'لم يتم العثور على رمز التحقق (state) في قاعدة البيانات أو انتهت صلاحيته.',
      });
      return;
    }

    const stateData = stateSnap.data()!;
    if (stateData.consumed || Date.now() > Number(stateData.expiresAt || 0)) {
      renderCallbackPopupHtml({
        success: false,
        title: 'انتهت صلاحية رمز التحقق (State Expired)',
        message: 'تم استخدام رمز التحقق مسبقاً أو انتهت صلاحيته الزمنية (10 دقائق). يرجى إعادة المحاولة.',
      });
      return;
    }

    // Consume state token atomically (one-time use)
    await stateRef.update({ consumed: true, consumedAt: new Date().toISOString() });

    if (!code) {
      renderCallbackPopupHtml({
        success: false,
        title: 'رمز التفويض مفقود',
        message: 'لم يتم استلام رمز التفويض (Authorization Code) من Google.',
      });
      return;
    }

    if (grantedScope && !grantedScope.includes('gmail.send')) {
      renderCallbackPopupHtml({
        success: false,
        title: 'صلاحية gmail.send غير ممنوحة',
        message: 'يجب الموافقة على صلاحية إرسال البريد (gmail.send) لإتمام الربط.',
      });
      return;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GMAIL_OAUTH_CLIENT_ID.value().trim(),
        client_secret: GMAIL_OAUTH_CLIENT_SECRET.value().trim(),
        redirect_uri: String(stateData.redirectUri),
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = (await tokenRes.json()) as Record<string, any>;
    if (!tokenRes.ok || !tokenData.refresh_token) {
      renderCallbackPopupHtml({
        success: false,
        title: 'فشل تبادل الرمز في الخادم',
        message: `تعذر الحصول على Refresh Token: ${tokenData.error_description || tokenData.error || 'يرجى إعادة المحاولة مع الموافقة الكاملة'}`,
      });
      return;
    }

    // Store Refresh Token in Google Cloud Secret Manager (NEVER in Firestore or client)
    const secretVersionPath = await saveRefreshTokenToSecretManager(String(tokenData.refresh_token));

    // Mark status as 'authorized_pending_test' — NOT active/connected until a real test email succeeds
    await db.doc(`schools/${schoolId}/gmailConfig/status`).set(
      {
        schoolId,
        connectedEmail: stateData.adminEmail,
        authorizationStatus: 'authorized_pending_test',
        grantedScopes: [GMAIL_SEND_SCOPE],
        authorizedAt: new Date().toISOString(),
        authorizedByUid: stateData.uid,
        authorizedByName: stateData.adminName,
        secretManagerConfigured: true,
        secretResourcePath: secretVersionPath,
        isVerifiedByRealTest: false,
        autoSendEnabled: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    renderCallbackPopupHtml({
      success: true,
      title: 'تم التفويض الأولي لحساب Gmail بنجاح',
      message: 'تم حفظ Refresh Token في Google Cloud Secret Manager. يرجى الآن إجراء اختبار الإرسال الفعلي لتفعيل الربط.',
      connectedEmail: stateData.adminEmail,
      status: 'authorized_pending_test',
    });
  }
);

/**
 * 3. Disconnect & Revoke OAuth Token (Server-side via Secret Manager)
 * Function Name: gmailOAuthDisconnect
 * Region: europe-west1
 */
export const gmailOAuthDisconnect = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET],
  },
  async (req, res) => {
    try {
      await verifyAdminCaller(req.headers.authorization);
      const schoolId = String(req.body?.schoolId || '7001').trim();
      const refreshToken = await readRefreshTokenFromSecretManager();

      if (refreshToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
        } catch {
          // Ignore revoke network error
        }
      }

      await destroyRefreshTokenInSecretManager();

      const db = getDb();
      await db.doc(`schools/${schoolId}/gmailConfig/status`).set(
        {
          connectedEmail: null,
          authorizationStatus: 'disconnected',
          grantedScopes: [],
          isVerifiedByRealTest: false,
          isBatchTestVerified: false,
          adminApprovedProductionSend: false,
          autoSendEnabled: false,
          adminAlertMessage: 'تم فصل اتصال حساب Gmail وإلغاء التفويض بناءً على طلب المسؤول.',
          adminAlertType: 'none',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(403).json({ error: err?.message || 'فشل فصل اتصال حساب Gmail' });
    }
  }
);

/**
 * 4. Single Real Administrative Test Email (Stage 1 Verification)
 * Function Name: gmailTestSingle
 * Region: europe-west1
 */
export const gmailTestSingle = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET],
  },
  async (req, res) => {
    try {
      const adminUser = await verifyAdminCaller(req.headers.authorization);
      const schoolId = String(req.body?.schoolId || '7001').trim();
      const recipientEmail = String(req.body?.recipientEmail || adminUser.email).trim().toLowerCase();
      const senderEmailOverride = String(req.body?.senderEmail || '').trim().toLowerCase();

      const refreshToken = await readRefreshTokenFromSecretManager();
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'لا يوجد Refresh Token محفوظ في Google Cloud Secret Manager. يرجى ربط حساب Gmail أولاً.',
        });
        return;
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GMAIL_OAUTH_CLIENT_ID.value().trim(),
          client_secret: GMAIL_OAUTH_CLIENT_SECRET.value().trim(),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      const tokenJson = (await tokenRes.json()) as Record<string, any>;
      if (!tokenRes.ok || !tokenJson.access_token) {
        res.status(400).json({
          success: false,
          error: `تعذر تجديد رمز الوصول من Google OAuth: ${tokenJson.error_description || tokenJson.error || 'غير صالح'}`,
        });
        return;
      }

      const db = getDb();
      const statusRef = db.doc(`schools/${schoolId}/gmailConfig/status`);
      const statusSnap = await statusRef.get();
      const fromEmail =
        senderEmailOverride ||
        String(statusSnap.data()?.connectedEmail || '').trim() ||
        adminUser.email;

      const testMessageId = `test-single-${Date.now()}@fujairah-islamic.edu.ae`;
      const nowFormatted = new Date().toLocaleString('ar-AE', { timeZone: 'Asia/Dubai' });

      const raw = buildHtmlMimeBase64Url({
        fromEmail,
        toEmail: recipientEmail,
        subject: 'اختبار الربط الرسمي لنظام الإشعارات - أكاديمية الفجيرة العلمية الإسلامية',
        bodyText: `السلام عليكم ورحمة الله وبركاته،

هذه رسالة اختبار حقيقية صادرة عبر واجهة Gmail API (صلاحية gmail.send فقط) من وظائف Firebase Cloud Functions لمشروع أكاديمية الفجيرة العلمية الإسلامية (fujairah-islamic).

• البريد المرسل المعتمد: ${fromEmail}
• البريد الإداري المستلم للاختبار: ${recipientEmail}
• المسؤول المنفّذ للاختبار: ${adminUser.name} (${adminUser.email})
• توقيت الاختبار (توقيت الإمارات): ${nowFormatted}
• معرّف الرسالة القياسي: ${testMessageId}

نجاح وصول هذه الرسالة يؤكد جاهزية الربط الآمن عبر OAuth 2.0 و Secret Manager.`,
        rfc822MessageId: testMessageId,
      });

      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });

      const sendJson = (await sendRes.json().catch(() => ({}))) as Record<string, any>;
      if (!sendRes.ok || !sendJson.id) {
        res.status(400).json({
          success: false,
          error: sendJson?.error?.message || `فشل إرسال رسالة الاختبار (HTTP ${sendRes.status})`,
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const today = nowIso.slice(0, 10);
      await statusRef.set(
        {
          connectedEmail: fromEmail,
          authorizationStatus: 'connected_verified',
          isVerifiedByRealTest: true,
          lastTestSuccessAt: nowIso,
          lastTestRecipient: recipientEmail,
          lastTestMessageId: String(sendJson.id),
          dailyCounterDate: today,
          dailySentCount: FieldValue.increment(1),
          adminAlertMessage: null,
          adminAlertType: 'none',
          updatedAt: nowIso,
        },
        { merge: true }
      );

      res.json({
        success: true,
        outcome: 'accepted_by_gmail',
        gmailMessageId: String(sendJson.id),
        testedAt: nowIso,
        recipientEmail,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err?.message || 'فشل اختبار الإرسال الفردي',
      });
    }
  }
);

/**
 * 5. Small Batch Test (1–3 emails) after Single Test Verification
 * Function Name: gmailTestBatch
 * Region: europe-west1
 */
export const gmailTestBatch = onRequest(
  {
    region: REGION,
    cors: true,
    secrets: [GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET],
  },
  async (req, res) => {
    try {
      const adminUser = await verifyAdminCaller(req.headers.authorization);
      const schoolId = String(req.body?.schoolId || '7001').trim();
      const recipientsRaw: string[] = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
      const validRecipients = recipientsRaw
        .map((r) => String(r || '').trim().toLowerCase())
        .filter((r) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(r))
        .slice(0, 3);

      if (validRecipients.length === 0) {
        res.status(400).json({ error: 'يرجى تحديد عنوان بريد واحد إلى 3 عناوين لاختبار الدفعة الصغيرة.' });
        return;
      }

      const db = getDb();
      const statusRef = db.doc(`schools/${schoolId}/gmailConfig/status`);
      const statusSnap = await statusRef.get();
      if (!statusSnap.exists || !statusSnap.data()?.isVerifiedByRealTest) {
        res.status(400).json({ error: 'يجب نجاح «اختبار إرسال رسالة واحدة» أولاً قبل تشغيل اختبار الدفعة الصغيرة.' });
        return;
      }

      const refreshToken = await readRefreshTokenFromSecretManager();
      if (!refreshToken) {
        res.status(400).json({ error: 'رمز التحديث غير متوفر في Secret Manager.' });
        return;
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GMAIL_OAUTH_CLIENT_ID.value().trim(),
          client_secret: GMAIL_OAUTH_CLIENT_SECRET.value().trim(),
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });
      const tokenJson = (await tokenRes.json()) as Record<string, any>;
      if (!tokenRes.ok || !tokenJson.access_token) {
        res.status(400).json({ error: 'تعذر تجديد رمز الوصول من Google OAuth.' });
        return;
      }

      const fromEmail = String(statusSnap.data()?.connectedEmail || adminUser.email).trim();
      const results: Array<{ recipient: string; outcome: string; gmailMessageId?: string; error?: string }> = [];

      for (let i = 0; i < validRecipients.length; i++) {
        const targetEmail = validRecipients[i];
        const msgId = `test-batch-${Date.now()}-${i + 1}@fujairah-islamic.edu.ae`;
        const raw = buildHtmlMimeBase64Url({
          fromEmail,
          toEmail: targetEmail,
          subject: `[اختبار دفعة مصغرة ${i + 1}/${validRecipients.length}] نظام إشعارات أكاديمية الفجيرة العلمية الإسلامية`,
          bodyText: `السلام عليكم ورحمة الله وبركاته،

هذه الرسالة رقم (${i + 1} من ${validRecipients.length}) ضمن اختبار الدفعة الصغيرة لطابور الإرسال في أكاديمية الفجيرة العلمية الإسلامية.
• المستلم: ${targetEmail}
• التحقق من العزل: هذه الرسالة موجهة بشكل منفصل تماماً دون كشف أي عناوين أو بيانات أخرى.`,
          rfc822MessageId: msgId,
        });

        const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenJson.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
        });
        const sendJson = (await sendRes.json().catch(() => ({}))) as Record<string, any>;

        if (sendRes.ok && sendJson.id) {
          results.push({
            recipient: targetEmail,
            outcome: 'accepted_by_gmail',
            gmailMessageId: String(sendJson.id),
          });
        } else {
          results.push({
            recipient: targetEmail,
            outcome: 'failed',
            error: sendJson?.error?.message || `HTTP ${sendRes.status}`,
          });
        }

        if (i < validRecipients.length - 1) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      const allAccepted = results.every((r) => r.outcome === 'accepted_by_gmail');
      if (allAccepted) {
        await statusRef.set(
          {
            isBatchTestVerified: true,
            lastBatchTestSuccessAt: new Date().toISOString(),
            lastBatchTestCount: validRecipients.length,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      res.json({ success: allAccepted, results });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'فشل اختبار الدفعة الصغيرة' });
    }
  }
);

/**
 * 6. Background Queue Worker Trigger on `schools/{schoolId}/gmailNotificationQueue/{queueId}`
 * Implements atomic state transition, daily quota guard, rate limiting, and uncertain-state handling.
 */
export const onGmailQueueItemCreated = onDocumentCreated(
  {
    region: REGION,
    database: DATABASE_ID,
    document: 'schools/{schoolId}/gmailNotificationQueue/{queueId}',
    secrets: [GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const schoolId = event.params.schoolId;
    const queueId = event.params.queueId;
    const db = getDb();
    const queueRef = db.doc(`schools/${schoolId}/gmailNotificationQueue/${queueId}`);
    const statusRef = db.doc(`schools/${schoolId}/gmailConfig/status`);

    // Step 1: Atomic check & transition from 'pending' to 'processing'
    let itemData: Record<string, any> | null = null;
    let configData: Record<string, any> | null = null;

    const canProceed = await db.runTransaction(async (tx) => {
      const [qDoc, sDoc] = await Promise.all([tx.get(queueRef), tx.get(statusRef)]);
      if (!qDoc.exists || !sDoc.exists) return false;

      const q = qDoc.data()!;
      const s = sDoc.data()!;

      // Never process if not in 'pending' state
      if (q.state !== 'pending') return false;

      // Require verified real test + admin approval before automated sending
      if (!s.isVerifiedByRealTest || !s.autoSendEnabled || !s.adminApprovedProductionSend) {
        tx.update(queueRef, {
          state: 'failed',
          failureReason: 'الإرسال التلقائي غير مفعّل أو لم يكتمل الاختبار الحقيقي وموافقة الإدارة.',
          updatedAt: new Date().toISOString(),
        });
        return false;
      }

      // Check daily quota limit
      const today = new Date().toISOString().slice(0, 10);
      const dailyCount = s.dailyCounterDate === today ? Number(s.dailySentCount || 0) : 0;
      const dailyMax = Number(s.dailyLimitMax || 400);

      if (dailyCount >= dailyMax) {
        tx.update(statusRef, {
          authorizationStatus: 'quota_paused',
          isQuotaReachedAlert: true,
          adminAlertType: 'quota_reached',
          adminAlertMessage: `تم إيقاف الإرسال التلقائي لبلوغ الحد اليومي (${dailyMax} رسالة).`,
          updatedAt: new Date().toISOString(),
        });
        tx.update(queueRef, {
          state: 'failed',
          failureReason: `تم إيقاف المحاولة لبلوغ الحد اليومي (${dailyMax} رسالة).`,
          updatedAt: new Date().toISOString(),
        });
        return false;
      }

      const attemptId = `attempt_${Date.now()}`;
      tx.update(queueRef, {
        state: 'processing',
        attemptCount: Number(q.attemptCount || 0) + 1,
        lastAttemptId: attemptId,
        lastAttemptAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      itemData = q;
      configData = s;
      return true;
    });

    if (!canProceed || !itemData || !configData) return;

    const refreshToken = await readRefreshTokenFromSecretManager();
    if (!refreshToken) {
      await queueRef.update({
        state: 'failed',
        failureReason: 'رمز التحديث (Refresh Token) غير موجود في Secret Manager.',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    // Exchange refresh token for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_OAUTH_CLIENT_ID.value().trim(),
        client_secret: GMAIL_OAUTH_CLIENT_SECRET.value().trim(),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenJson = (await tokenRes.json()) as Record<string, any>;
    if (!tokenRes.ok || !tokenJson.access_token) {
      await statusRef.update({
        authorizationStatus: 'token_expired_or_revoked',
        isVerifiedByRealTest: false,
        autoSendEnabled: false,
        adminAlertType: 'token_revoked',
        adminAlertMessage: 'انتهى تفويض حساب Gmail أو تم سحبه. يرجى إعادة الربط.',
        updatedAt: new Date().toISOString(),
      });
      await queueRef.update({
        state: 'failed',
        failureReason: 'انتهى تفويض حساب Gmail أو تم سحبه (invalid_grant).',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    // Build RFC 2822 isolated message for single guardian
    const qData = itemData as Record<string, any>;
    const sData = configData as Record<string, any>;
    const raw = buildHtmlMimeBase64Url({
      fromEmail: String(sData.connectedEmail || ''),
      toEmail: String(qData.recipientEmail || ''),
      subject: String(qData.subject || ''),
      bodyText: String(qData.bodyText || ''),
      rfc822MessageId: String(qData.rfc822MessageId || `${queueId}@fujairah-islamic.edu.ae`),
    });

    try {
      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });

      const sendJson = (await sendRes.json().catch(() => ({}))) as Record<string, any>;
      if (sendRes.ok && sendJson.id) {
        const today = new Date().toISOString().slice(0, 10);
        await queueRef.update({
          state: 'accepted_by_gmail',
          gmailMessageId: String(sendJson.id),
          gmailThreadId: String(sendJson.threadId || sendJson.id),
          acceptedByGmailAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await statusRef.update({
          dailyCounterDate: today,
          dailySentCount: FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });
      } else if (sendRes.status >= 500) {
        await queueRef.update({
          state: 'uncertain',
          uncertainReason: `استجابة غير مؤكدة من خادم Gmail (${sendRes.status}) بعد إرسال الطلب.`,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await queueRef.update({
          state: 'failed',
          failureReason: sendJson?.error?.message || `HTTP ${sendRes.status}`,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (networkErr: any) {
      // Connection dropped AFTER request was sent to Gmail -> mark as 'uncertain' to prevent duplicate resend
      await queueRef.update({
        state: 'uncertain',
        uncertainReason: `انقطع الاتصال بعد إرسال الطلب إلى Gmail: ${networkErr?.message || 'خطأ شبكة'}`,
        updatedAt: new Date().toISOString(),
      });
    }
  }
);
