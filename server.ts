import express, { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  FIREBASE_PROJECT_ID,
  GMAIL_SEND_SCOPE,
  SECRET_NAMES,
  readServerSecret,
  writeServerSecret,
  clearRefreshTokenSecret,
  verifyServerAdminToken,
  validateAuthorizedGuardianRecipient,
  sendEmailViaGmailOAuth,
} from './src/server/gmailBackend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Server-side in-memory store for OAuth CSRF state tokens and server runtime state
interface OAuthStateEntry {
  state: string;
  uid: string;
  adminEmail: string;
  adminName: string;
  schoolId: string;
  redirectUri: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

const oauthStatesMap = new Map<string, OAuthStateEntry>();

async function getSecretWithFallback(secretName: string): Promise<string | null> {
  return await readServerSecret(secretName);
}

async function setSecretWithFallback(
  secretName: string,
  value: string
): Promise<{ storedInSecretManager: boolean; resourcePath: string; error?: string }> {
  return await writeServerSecret(secretName, value);
}

// Track server-side connection metadata (non-sensitive; never contains tokens or secrets)
interface ServerGmailMetadata {
  connectedEmail: string | null;
  authorizationStatus:
    | 'disconnected'
    | 'authorized_pending_test'
    | 'connected_verified'
    | 'token_expired_or_revoked'
    | 'quota_paused';
  grantedScopes: string[];
  authorizedAt: string | null;
  authorizedByUid: string | null;
  authorizedByName: string | null;
  secretManagerConfigured: boolean;
  secretResourcePath: string;
  isVerifiedByRealTest: boolean;
  lastTestSuccessAt: string | null;
  lastTestRecipient: string | null;
  lastTestMessageId: string | null;
  isBatchTestVerified: boolean;
  lastBatchTestSuccessAt: string | null;
  lastBatchTestCount: number;
  dailySentCount: number;
  dailyCounterDate: string;
  dailyLimitMax: number;
  adminAlertMessage: string | null;
  adminAlertType: 'none' | 'token_revoked' | 'quota_reached' | 'config_error' | 'uncertain_state';
}

const todayDateStr = () => new Date().toISOString().slice(0, 10);

let serverMetadata: ServerGmailMetadata = {
  connectedEmail: null,
  authorizationStatus: 'disconnected',
  grantedScopes: [],
  authorizedAt: null,
  authorizedByUid: null,
  authorizedByName: null,
  secretManagerConfigured: false,
  secretResourcePath: `projects/${FIREBASE_PROJECT_ID}/secrets/${SECRET_NAMES.REFRESH_TOKEN}/versions/latest`,
  isVerifiedByRealTest: false,
  lastTestSuccessAt: null,
  lastTestRecipient: null,
  lastTestMessageId: null,
  isBatchTestVerified: false,
  lastBatchTestSuccessAt: null,
  lastBatchTestCount: 0,
  dailySentCount: 0,
  dailyCounterDate: todayDateStr(),
  dailyLimitMax: 400,
  adminAlertMessage: null,
  adminAlertType: 'none',
};

function resolveRedirectUri(_req: Request, customRedirectUri?: string): string {
  if (customRedirectUri && customRedirectUri.startsWith('https://')) {
    return customRedirectUri.trim();
  }
  return `https://europe-west1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/gmailOAuthCallback`;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ============================================================================
  // 1. GET /api/gmail/status — Admin-only status & Secret Manager diagnostics
  // ============================================================================
  app.get('/api/gmail/status', async (req: Request, res: Response) => {
    const adminCheck = await verifyServerAdminToken(req.headers.authorization);
    if (!adminCheck.verified) {
      res.status(403).json({ error: adminCheck.error || 'غير مصرح' });
      return;
    }

    const clientId = await getSecretWithFallback(SECRET_NAMES.CLIENT_ID);
    const clientSecret = await getSecretWithFallback(SECRET_NAMES.CLIENT_SECRET);
    const refreshToken = await getSecretWithFallback(SECRET_NAMES.REFRESH_TOKEN);
    const savedEmail = await getSecretWithFallback(SECRET_NAMES.CONNECTED_EMAIL);

    if (serverMetadata.dailyCounterDate !== todayDateStr()) {
      serverMetadata.dailyCounterDate = todayDateStr();
      serverMetadata.dailySentCount = 0;
    }

    if (refreshToken && savedEmail && serverMetadata.authorizationStatus === 'disconnected') {
      serverMetadata.connectedEmail = savedEmail;
      serverMetadata.authorizationStatus = serverMetadata.isVerifiedByRealTest
        ? 'connected_verified'
        : 'authorized_pending_test';
      serverMetadata.grantedScopes = [GMAIL_SEND_SCOPE];
    }

    const redirectUri = resolveRedirectUri(req);

    res.json({
      projectId: FIREBASE_PROJECT_ID,
      hasClientId: Boolean(clientId),
      clientIdPreview: clientId ? `${clientId.slice(0, 14)}...apps.googleusercontent.com` : null,
      hasClientSecret: Boolean(clientSecret),
      hasRefreshToken: Boolean(refreshToken),
      redirectUri,
      cloudFunctionsCallbackUri: `https://europe-west1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/gmailOAuthCallback`,
      metadata: serverMetadata,
    });
  });


  // ============================================================================
  // 3. POST /api/gmail/oauth/start — Generate state & OAuth 2.0 Authorization URL
  // ============================================================================
  app.post('/api/gmail/oauth/start', async (req: Request, res: Response) => {
    const adminCheck = await verifyServerAdminToken(req.headers.authorization);
    if (!adminCheck.verified) {
      res.status(403).json({ error: adminCheck.error || 'غير مصرح' });
      return;
    }

    const clientId = await getSecretWithFallback(SECRET_NAMES.CLIENT_ID);
    const clientSecret = await getSecretWithFallback(SECRET_NAMES.CLIENT_SECRET);

    if (!clientId || !clientSecret) {
      res.status(400).json({
        error:
          'يجب أولاً حفظ Client ID و Client Secret في إعدادات الخادم (Google Cloud Secret Manager) قبل بدء ربط حساب Gmail.',
      });
      return;
    }

    const schoolId = String(req.body?.schoolId || '7001').trim();
    const redirectUri = resolveRedirectUri(req, req.body?.redirectUri);

    // Generate cryptographically strong CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    oauthStatesMap.set(state, {
      state,
      uid: adminCheck.uid,
      adminEmail: adminCheck.email,
      adminName: adminCheck.name,
      schoolId,
      redirectUri,
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      consumed: false,
    });

    // Construct Google OAuth 2.0 Authorization URL requesting ONLY gmail.send
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: GMAIL_SEND_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'false',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({
      url: authUrl,
      redirectUri,
      requestedScope: GMAIL_SEND_SCOPE,
      stateExpiresInSeconds: 600,
    });
  });

  // ============================================================================
  // 4. GET /api/gmail/oauth/callback — OAuth 2.0 Authorization Code Callback
  // ============================================================================
  const oauthCallbackHandler = async (req: Request, res: Response) => {
    const code = String(req.query.code || '').trim();
    const state = String(req.query.state || '').trim();
    const oauthError = String(req.query.error || '').trim();
    const grantedScopeParam = String(req.query.scope || '').trim();

    const renderPopupHtml = (payload: {
      success: boolean;
      title: string;
      message: string;
      connectedEmail?: string | null;
      status?: string;
    }) => {
      const safeJson = JSON.stringify({
        type: 'GMAIL_OAUTH_CALLBACK_RESULT',
        ...payload,
      });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
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
    (function() {
      var data = ${safeJson};
      if (window.opener) {
        window.opener.postMessage(data, '*');
        setTimeout(function() { window.close(); }, 1800);
      }
    })();
  </script>
</body>
</html>`);
    };

    if (oauthError) {
      renderPopupHtml({
        success: false,
        title: 'تم إلغاء أو رفض تفويض Gmail',
        message: `أعاد خادم Google OAuth الخطأ التالي: ${oauthError}. لم يتم تفعيل الربط.`,
      });
      return;
    }

    // 1. Validate CSRF state token
    const stateRecord = oauthStatesMap.get(state);
    if (!state || !stateRecord || stateRecord.consumed || Date.now() > stateRecord.expiresAt) {
      renderPopupHtml({
        success: false,
        title: 'فشل التحقق الأمني (Invalid State)',
        message: 'رمز التحقق من الجلسة (state) غير صالح أو منتهي الصلاحية لمنع تزوير الطلبات (CSRF). يرجى إعادة المحاولة من لوحة إعدادات المسؤول.',
      });
      return;
    }

    // Mark state as consumed immediately (one-time use)
    stateRecord.consumed = true;

    if (!code) {
      renderPopupHtml({
        success: false,
        title: 'رمز التفويض مفقود',
        message: 'لم يتم استلام رمز التفويض (Authorization Code) من Google.',
      });
      return;
    }

    // 2. Verify granted scope includes gmail.send
    if (grantedScopeParam && !grantedScopeParam.includes('gmail.send')) {
      renderPopupHtml({
        success: false,
        title: 'صلاحية gmail.send غير ممنوحة',
        message: 'لم يتم منح صلاحية إرسال البريد (gmail.send) المطلوبة.',
      });
      return;
    }

    // 3. Exchange Authorization Code for Refresh Token on server
    const clientId = await getSecretWithFallback(SECRET_NAMES.CLIENT_ID);
    const clientSecret = await getSecretWithFallback(SECRET_NAMES.CLIENT_SECRET);
    if (!clientId || !clientSecret) {
      renderPopupHtml({
        success: false,
        title: 'بيانات عميل OAuth غير مكتملة',
        message: 'تعذر قراءة Client Secret من الخادم.',
      });
      return;
    }

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: stateRecord.redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });

      const tokenData = (await tokenRes.json()) as Record<string, any>;
      if (!tokenRes.ok || !tokenData.access_token) {
        const desc = String(tokenData.error_description || tokenData.error || 'فشل تبادل الرمز');
        renderPopupHtml({
          success: false,
          title: 'فشل تبادل رمز OAuth مع Google',
          message: `حدث خطأ أثناء الاتصال بـ Google OAuth: ${desc}`,
        });
        return;
      }

      const refreshToken = String(tokenData.refresh_token || '').trim();
      if (!refreshToken) {
        renderPopupHtml({
          success: false,
          title: 'لم يتم استلام Refresh Token',
          message:
            'لم يُرجع Google رمز التحديث الدائم (refresh_token). يرجى إزالة صلاحية التطبيق من حساب Google ثم إعادة الضغط على «ربط حساب Gmail الأكاديمية».',
        });
        return;
      }

      // Determine the connected Gmail address if available, or allow admin to confirm sender address
      let connectedEmail = stateRecord.adminEmail || 'academy@gmail.com';
      if (tokenData.id_token) {
        try {
          const payloadPart = String(tokenData.id_token).split('.')[1];
          const decoded = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
          if (decoded.email) connectedEmail = String(decoded.email).toLowerCase();
        } catch {}
      }

      // Save Refresh Token in Google Cloud Secret Manager
      const smSave = await setSecretWithFallback(SECRET_NAMES.REFRESH_TOKEN, refreshToken);
      await setSecretWithFallback(SECRET_NAMES.CONNECTED_EMAIL, connectedEmail);

      // Update server metadata: MUST stay 'authorized_pending_test' until a real test email succeeds!
      serverMetadata = {
        ...serverMetadata,
        connectedEmail,
        authorizationStatus: 'authorized_pending_test',
        grantedScopes: [GMAIL_SEND_SCOPE],
        authorizedAt: new Date().toISOString(),
        authorizedByUid: stateRecord.uid,
        authorizedByName: stateRecord.adminName,
        secretManagerConfigured: smSave.storedInSecretManager,
        secretResourcePath: smSave.resourcePath,
        isVerifiedByRealTest: false,
        lastTestSuccessAt: null,
        lastTestMessageId: null,
        adminAlertMessage: null,
        adminAlertType: 'none',
      };

      renderPopupHtml({
        success: true,
        title: 'تم تفويض حساب Gmail بنجاح',
        message:
          'تم حفظ رمز التفويض (Refresh Token) بأمان. ملاحظة هامة: لا يُعتبر الحساب متصلاً بشكل نهائي ولا يتم تفعيل الإرسال التلقائي إلا بعد إجراء «اختبار إرسال رسالة حقيقية» بنجاح من لوحة الإعدادات.',
        connectedEmail,
        status: 'authorized_pending_test',
      });
    } catch (err: any) {
      renderPopupHtml({
        success: false,
        title: 'خطأ في خادم OAuth Callback',
        message: err?.message || 'حدث خطأ غير متوقع أثناء معالجة استجابة Google.',
      });
    }
  };

  app.get(['/api/gmail/oauth/callback', '/api/gmail/oauth/callback/', '/auth/gmail/callback'], oauthCallbackHandler);

  // ============================================================================
  // 5. POST /api/gmail/disconnect — Revoke OAuth token & clear Secret Manager
  // ============================================================================
  app.post('/api/gmail/disconnect', async (req: Request, res: Response) => {
    const adminCheck = await verifyServerAdminToken(req.headers.authorization);
    if (!adminCheck.verified) {
      res.status(403).json({ error: adminCheck.error || 'غير مصرح' });
      return;
    }

    const refreshToken = await getSecretWithFallback(SECRET_NAMES.REFRESH_TOKEN);
    if (refreshToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch (err) {
        console.warn('[Gmail Disconnect] Token revoke notice:', err);
      }
    }

    await clearRefreshTokenSecret();

    serverMetadata = {
      ...serverMetadata,
      connectedEmail: null,
      authorizationStatus: 'disconnected',
      grantedScopes: [],
      authorizedAt: null,
      isVerifiedByRealTest: false,
      isBatchTestVerified: false,
      adminAlertMessage: 'تم فصل اتصال حساب Gmail وإلغاء التفويض بناءً على طلب المسؤول.',
      adminAlertType: 'none',
    };

    res.json({
      success: true,
      metadata: serverMetadata,
    });
  });

  // ============================================================================
  // 6. POST /api/gmail/test-single — Send 1 real test email to approved admin email
  // ============================================================================
  app.post('/api/gmail/test-single', async (req: Request, res: Response) => {
    const adminCheck = await verifyServerAdminToken(req.headers.authorization);
    if (!adminCheck.verified) {
      res.status(403).json({ error: adminCheck.error || 'غير مصرح' });
      return;
    }

    const recipientEmail = String(req.body?.recipientEmail || adminCheck.email || '').trim().toLowerCase();
    const senderEmailOverride = String(req.body?.senderEmail || '').trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      res.status(400).json({ error: 'يرجى إدخال عنوان بريد إداري معتمد وصالح لإجراء الاختبار.' });
      return;
    }

    const clientId = await getSecretWithFallback(SECRET_NAMES.CLIENT_ID);
    const clientSecret = await getSecretWithFallback(SECRET_NAMES.CLIENT_SECRET);
    const refreshToken = await getSecretWithFallback(SECRET_NAMES.REFRESH_TOKEN);
    const fromEmail =
      senderEmailOverride ||
      serverMetadata.connectedEmail ||
      (await getSecretWithFallback(SECRET_NAMES.CONNECTED_EMAIL)) ||
      adminCheck.email;

    if (!clientId || !clientSecret || !refreshToken) {
      res.status(400).json({
        error:
          'لا يوجد تفويض OAuth نشط (Refresh Token) في الخادم. يرجى الضغط على «ربط حساب Gmail الأكاديمية» وإتمام التفويض أولاً.',
      });
      return;
    }

    const testMessageId = `test-single-${Date.now()}@fujairah-islamic.edu.ae`;
    const nowFormatted = new Date().toLocaleString('ar-AE', { timeZone: 'Asia/Dubai' });

    const result = await sendEmailViaGmailOAuth({
      clientId,
      clientSecret,
      refreshToken,
      fromEmail,
      toEmail: recipientEmail,
      subject: 'اختبار الربط الرسمي لنظام الإشعارات - أكاديمية الفجيرة العلمية الإسلامية',
      bodyText: `السلام عليكم ورحمة الله وبركاته،

هذه رسالة اختبار حقيقية صادرة عبر واجهة Gmail API (صلاحية gmail.send فقط) من خادم أكاديمية الفجيرة العلمية الإسلامية (مشروع Firebase: fujairah-islamic).

• البريد المرسل المعتمد: ${fromEmail}
• البريد الإداري المستلم للاختبار: ${recipientEmail}
• المسؤول المنفّذ للاختبار: ${adminCheck.name} (${adminCheck.email})
• توقيت الاختبار (توقيت الإمارات): ${nowFormatted}
• معرّف الرسالة القياسي: ${testMessageId}

نجاح وصول هذه الرسالة يؤكد جاهزية الربط الآمن عبر OAuth 2.0.`,
      rfc822MessageId: testMessageId,
    });

    if (result.outcome === 'accepted_by_gmail' && result.gmailMessageId) {
      const nowIso = new Date().toISOString();
      if (senderEmailOverride && senderEmailOverride.endsWith('@gmail.com')) {
        serverMetadata.connectedEmail = senderEmailOverride;
        await setSecretWithFallback(SECRET_NAMES.CONNECTED_EMAIL, senderEmailOverride);
      } else if (!serverMetadata.connectedEmail) {
        serverMetadata.connectedEmail = fromEmail;
      }

      serverMetadata.isVerifiedByRealTest = true;
      serverMetadata.authorizationStatus = 'connected_verified';
      serverMetadata.lastTestSuccessAt = nowIso;
      serverMetadata.lastTestRecipient = recipientEmail;
      serverMetadata.lastTestMessageId = result.gmailMessageId;
      serverMetadata.dailySentCount += 1;
      serverMetadata.adminAlertMessage = null;
      serverMetadata.adminAlertType = 'none';

      res.json({
        success: true,
        outcome: result.outcome,
        gmailMessageId: result.gmailMessageId,
        gmailThreadId: result.gmailThreadId,
        testedAt: nowIso,
        recipientEmail,
        metadata: serverMetadata,
      });
      return;
    }

    if (result.outcome === 'token_revoked') {
      serverMetadata.authorizationStatus = 'token_expired_or_revoked';
      serverMetadata.isVerifiedByRealTest = false;
      serverMetadata.adminAlertType = 'token_revoked';
      serverMetadata.adminAlertMessage =
        result.errorMessage || 'انتهى تفويض حساب Gmail أو تم سحبه. يرجى إعادة ربط الحساب.';
    } else if (result.outcome === 'quota_exceeded') {
      serverMetadata.authorizationStatus = 'quota_paused';
      serverMetadata.adminAlertType = 'quota_reached';
      serverMetadata.adminAlertMessage =
        result.errorMessage || 'تم بلوغ الحد اليومي للإرسال في حساب Gmail.';
    }

    res.status(400).json({
      success: false,
      outcome: result.outcome,
      error: result.errorMessage || 'فشل إرسال رسالة الاختبار عبر Gmail API',
      metadata: serverMetadata,
    });
  });

  // ============================================================================
  // 7. POST /api/gmail/test-batch — Send small test batch (2-3 emails) after single test
  // ============================================================================
  app.post('/api/gmail/test-batch', async (req: Request, res: Response) => {
    const adminCheck = await verifyServerAdminToken(req.headers.authorization);
    if (!adminCheck.verified) {
      res.status(403).json({ error: adminCheck.error || 'غير مصرح' });
      return;
    }

    if (!serverMetadata.isVerifiedByRealTest) {
      res.status(400).json({
        error: 'يجب نجاح «اختبار إرسال رسالة واحدة» أولاً قبل تشغيل اختبار الدفعة الصغيرة.',
      });
      return;
    }

    const recipientsRaw: string[] = Array.isArray(req.body?.recipients) ? req.body.recipients : [];
    const validRecipients = recipientsRaw
      .map((r) => String(r || '').trim().toLowerCase())
      .filter((r) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(r))
      .slice(0, 3); // Strictly cap small batch test at 3 recipients

    if (validRecipients.length === 0) {
      res.status(400).json({
        error: 'يرجى تحديد عنوان بريد واحد إلى 3 عناوين بريدية معتمدة لاختبار الدفعة الصغيرة.',
      });
      return;
    }

    const clientId = await getSecretWithFallback(SECRET_NAMES.CLIENT_ID);
    const clientSecret = await getSecretWithFallback(SECRET_NAMES.CLIENT_SECRET);
    const refreshToken = await getSecretWithFallback(SECRET_NAMES.REFRESH_TOKEN);
    const fromEmail = serverMetadata.connectedEmail || adminCheck.email;

    if (!clientId || !clientSecret || !refreshToken) {
      res.status(400).json({ error: 'تفويض Gmail غير مكتمل على الخادم.' });
      return;
    }

    const batchResults: Array<{
      recipient: string;
      outcome: string;
      gmailMessageId?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < validRecipients.length; i++) {
      const targetEmail = validRecipients[i];
      const msgId = `test-batch-${Date.now()}-${i + 1}@fujairah-islamic.edu.ae`;

      const sendRes = await sendEmailViaGmailOAuth({
        clientId,
        clientSecret,
        refreshToken,
        fromEmail,
        toEmail: targetEmail,
        subject: `[اختبار دفعة مصغرة ${i + 1}/${validRecipients.length}] نظام إشعارات أكاديمية الفجيرة العلمية الإسلامية`,
        bodyText: `السلام عليكم ورحمة الله وبركاته،

هذه الرسالة رقم (${i + 1} من ${validRecipients.length}) ضمن اختبار الدفعة الصغيرة لطابور الإرسال في أكاديمية الفجيرة العلمية الإسلامية.
• المستلم: ${targetEmail}
• التحقق من العزل: هذه الرسالة موجهة بشكل منفصل تماماً دون كشف أي عناوين أو بيانات أخرى.`,
        rfc822MessageId: msgId,
      });

      batchResults.push({
        recipient: targetEmail,
        outcome: sendRes.outcome,
        gmailMessageId: sendRes.gmailMessageId,
        error: sendRes.errorMessage,
      });

      if (sendRes.outcome === 'accepted_by_gmail') {
        serverMetadata.dailySentCount += 1;
      }

      // Rate-limit spacing between batch messages (1200ms)
      if (i < validRecipients.length - 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    const allAccepted = batchResults.every((r) => r.outcome === 'accepted_by_gmail');
    if (allAccepted) {
      serverMetadata.isBatchTestVerified = true;
      serverMetadata.lastBatchTestSuccessAt = new Date().toISOString();
      serverMetadata.lastBatchTestCount = validRecipients.length;
    }

    res.json({
      success: allAccepted,
      results: batchResults,
      metadata: serverMetadata,
    });
  });

  // ============================================================================
  // 8. POST /api/gmail/dispatch-queue-item — Dispatch a single isolated guardian notification
  // ============================================================================
  app.post('/api/gmail/dispatch-queue-item', async (req: Request, res: Response) => {
    const adminCheck = await verifyServerAdminToken(req.headers.authorization);
    if (!adminCheck.verified) {
      res.status(403).json({ error: adminCheck.error || 'غير مصرح' });
      return;
    }

    // Reset daily counter if date rolled over
    if (serverMetadata.dailyCounterDate !== todayDateStr()) {
      serverMetadata.dailyCounterDate = todayDateStr();
      serverMetadata.dailySentCount = 0;
    }

    const {
      idempotencyKey,
      recipientEmail,
      guardianRelation,
      guardianName,
      studentEmail,
      subject,
      bodyText,
      rfc822MessageId,
      dailyLimitMax,
    } = req.body || {};

    const effectiveDailyMax = Number(dailyLimitMax) || serverMetadata.dailyLimitMax || 400;

    // 1. Check daily quota limit before attempting
    if (serverMetadata.dailySentCount >= effectiveDailyMax) {
      serverMetadata.authorizationStatus = 'quota_paused';
      serverMetadata.adminAlertType = 'quota_reached';
      serverMetadata.adminAlertMessage = `تم إيقاف الإرسال التلقائي مؤقتاً لبلوغ الحد اليومي الآمن (${effectiveDailyMax} رسالة/يوم).`;
      res.status(429).json({
        outcome: 'quota_exceeded',
        error: serverMetadata.adminAlertMessage,
        metadata: serverMetadata,
      });
      return;
    }

    // 2. Verify Gmail connection was genuinely verified by a real test
    if (!serverMetadata.isVerifiedByRealTest) {
      res.status(400).json({
        outcome: 'failed',
        error: 'لا يُسمح بالإرسال التلقائي قبل نجاح اختبار إرسال حقيقي مصرح به.',
      });
      return;
    }

    // 3. Validate guardian email & authorized relation on server
    const guardianCheck = validateAuthorizedGuardianRecipient({
      recipientEmail,
      guardianRelation,
      guardianName,
      studentEmail,
    });

    if (!guardianCheck.valid) {
      res.status(400).json({
        outcome: 'failed',
        error: guardianCheck.reason || 'بريد ولي الأمر غير صالح أو غير مخوّل.',
      });
      return;
    }

    const clientId = await getSecretWithFallback(SECRET_NAMES.CLIENT_ID);
    const clientSecret = await getSecretWithFallback(SECRET_NAMES.CLIENT_SECRET);
    const refreshToken = await getSecretWithFallback(SECRET_NAMES.REFRESH_TOKEN);
    const fromEmail =
      serverMetadata.connectedEmail ||
      (await getSecretWithFallback(SECRET_NAMES.CONNECTED_EMAIL)) ||
      adminCheck.email;

    if (!clientId || !clientSecret || !refreshToken) {
      serverMetadata.authorizationStatus = 'disconnected';
      res.status(400).json({
        outcome: 'token_revoked',
        error: 'رموز تفويض Gmail غير متوفرة في الخادم.',
      });
      return;
    }

    const sendRes = await sendEmailViaGmailOAuth({
      clientId,
      clientSecret,
      refreshToken,
      fromEmail,
      toEmail: guardianCheck.normalizedEmail,
      subject: String(subject || '').trim(),
      bodyText: String(bodyText || '').trim(),
      rfc822MessageId: String(rfc822MessageId || `${idempotencyKey}@fujairah-islamic.edu.ae`),
    });

    if (sendRes.outcome === 'accepted_by_gmail') {
      serverMetadata.dailySentCount += 1;
    } else if (sendRes.outcome === 'token_revoked') {
      serverMetadata.authorizationStatus = 'token_expired_or_revoked';
      serverMetadata.isVerifiedByRealTest = false;
      serverMetadata.adminAlertType = 'token_revoked';
      serverMetadata.adminAlertMessage =
        sendRes.errorMessage || 'انتهى تفويض حساب Gmail أو تم سحبه. يرجى إعادة ربط الحساب.';
    } else if (sendRes.outcome === 'quota_exceeded') {
      serverMetadata.authorizationStatus = 'quota_paused';
      serverMetadata.adminAlertType = 'quota_reached';
      serverMetadata.adminAlertMessage =
        sendRes.errorMessage || 'تم بلوغ الحد اليومي للإرسال في حساب Gmail.';
    } else if (sendRes.outcome === 'uncertain') {
      serverMetadata.adminAlertType = 'uncertain_state';
      serverMetadata.adminAlertMessage =
        'توجد رسالة في «حالة غير مؤكدة» بسبب انقطاع الاتصال بعد مخاطبة Gmail. يرجى مراجعتها يدوياً لمنع تكرار الإرسال.';
    }

    res.json({
      outcome: sendRes.outcome,
      gmailMessageId: sendRes.gmailMessageId,
      gmailThreadId: sendRes.gmailThreadId,
      error: sendRes.errorMessage,
      metadata: serverMetadata,
    });
  });

  // ============================================================================
  // Vite Middleware (Dev) or Static Dist Serving (Production)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fujairah Academy Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
