/**
 * ============================================================================
 * نظام إشعارات أولياء الأمور الآمن عبر Google Apps Script + Google Sheets Bridge
 * أكاديمية الفجيرة العلمية الإسلامية (Fujairah Islamic Scientific Academy)
 * ============================================================================
 *
 * المزايا الأمنية والمعمارية (متوافق 100% مع خطة Firebase Spark المجانية):
 * 1. لا يتطلب Firebase Cloud Functions ولا ترقية المشروع إلى خطة Blaze.
 * 2. لا يستخدم أي Client Secret أو مفاتيح حسابات خدمة (Service Account Keys) في React أو المتصفح.
 * 3. لا ينشئ أي رابط Web App عام (لا يوجد doGet أو doPost مفتوح للعامة).
 * 4. يعمل بجدولة زمنية داخلية (Time-Driven Trigger) من داخل حساب Gmail الرسمي للأكاديمية.
 * 5. يستخدم Google Sheets كجسر وسيط آمن (Intermediate Bridge & Audit Ledger) داخل Google Drive
 *    الخاص بالأكاديمية، مع مصادقة OAuth 2.0 أصلية (ScriptApp.getOAuthToken) لقراءة الطلبات
 *    المعتمدة من قاعدة بيانات Firestore الفعلية وتحديث نتائجها داخل ملف الطالب الموحد.
 * 6. الإرسال الفعلي متوقف افتراضياً (SEND_ENABLED = false, EXECUTION_MODE = 'TEST_ONLY')
 *    ولا يعمل إلا بعد موافقة المسؤول المعتمد ونجاح الاختبار الإداري.
 */

const CONFIG = {
  PROJECT_ID: 'fujairah-islamic',
  DATABASE_ID: 'ai-studio-7049e193-0b31-400e-a46c-4163cfd4f315',
  SCHOOL_ID: '7001',
  ACADEMY_NAME: 'أكاديمية الفجيرة العلمية الإسلامية',
  DEFAULT_ADMIN_TEST_EMAIL: 'ameer2020vip@gmail.com',

  // الحد اليومي المرجعي لحساب @gmail.com العادي عبر Apps Script (100 مستلم/يوم)
  DAILY_GMAIL_LIMIT_MAX: 100,
  // الحد الأقصى للرسائل في كل جولة زمنية (لتجنب مهلة الـ 6 دقائق وحظر الإرسال المتتابع)
  MAX_BATCH_PER_RUN: 15,
  // الفاصل الزمني بين كل رسالة وأخرى بالميلي ثانية
  RATE_LIMIT_SLEEP_MS: 1500,

  // أسماء أوراق Google Sheets الوسيطة (الجسر الآمن)
  SHEET_NAMES: {
    QUEUE_BRIDGE: 'Queue_Bridge',
    CONFIG_QUOTA: 'Config_And_Quota',
    AUDIT_LOG: 'Audit_Log',
  },
};

/**
 * ============================================================================
 * 1. التهيئة الأولية وإنشاء جسر Google Sheets الآمن (Intermediate Bridge)
 * ============================================================================
 * شغّل هذه الدالة مرة واحدة يدوياً من محرر Apps Script لإنشاء جدول Google Sheet
 * الوسيط وربطه بالسكربت، وتسجيل تاريخ قطع الوقائع القديمة (serviceActivatedAt).
 */
function initializeAcademyNotificationBridge() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log('النظام قيد التنفيذ حالياً في عملية أخرى.');
    return;
  }

  try {
    const ss = ensureBridgeSpreadsheet_();
    const nowIso = new Date().toISOString();
    const props = PropertiesService.getScriptProperties();

    // تثبيت تاريخ تفعيل الخدمة لمنع إرسال أي إشعارات قديمة مسجلة قبل هذا التاريخ
    if (!props.getProperty('SERVICE_ACTIVATED_AT')) {
      props.setProperty('SERVICE_ACTIVATED_AT', nowIso);
    }

    // الوضع الافتراضي آمن: إيقاف الإرسال الإنتاجي وتفعيل وضع الاختبار الإداري فقط
    if (!props.getProperty('EXECUTION_MODE')) {
      props.setProperty('EXECUTION_MODE', 'TEST_ONLY');
    }
    if (!props.getProperty('SEND_ENABLED')) {
      props.setProperty('SEND_ENABLED', 'FALSE');
    }
    if (!props.getProperty('ADMIN_TEST_EMAIL')) {
      props.setProperty('ADMIN_TEST_EMAIL', CONFIG.DEFAULT_ADMIN_TEST_EMAIL);
    }

    syncSheetConfigTab_(ss);
    updateFirestoreHeartbeat_('initialized_bridge_safe_mode', null);

    Logger.log('✅ تم تهيئة جسر Google Sheets الآمن بنجاح.');
    Logger.log('📄 رابط جدول الجسر الوسيط (خاص بحساب الأكاديمية): ' + ss.getUrl());
    Logger.log('🔒 حالة الإرسال الحالية: متوقف بأمان (TEST_ONLY) بانتظار موافقة المسؤول.');
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * 2. الدالة الرئيسية المجدولة زمنياً (Time-Driven Trigger Entry Point)
 * ============================================================================
 * تعمل كل 5 دقائق تلقائياً:
 * 1) تتحقق من قفل التنفيذ (LockService) لمنع التداخل.
 * 2) تسحب طلبات الإشعارات المعتمدة ذات الحالة 'pending' من Firestore إلى جسر Google Sheets.
 * 3) تتحقق من إعدادات الأمان في ورقة Config_And_Quota ومن الحصة اليومية عبر MailApp.getRemainingDailyQuota().
 * 4) ترسل الرسائل المسموح بها ذرياً وتحدث الحالة في كل من Google Sheets و Firestore وملف الطالب الموحد.
 */
function processApprovedNotificationQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    Logger.log('⏳ تم تخطي الجولة الحالية لوجود جولة أخرى قيد التنفيذ.');
    return;
  }

  try {
    const ss = ensureBridgeSpreadsheet_();
    const runtimeCfg = readBridgeRuntimeConfig_(ss);

    // المرحلة أ: سحب الطلبات المعتمدة (pending) من Firestore إلى جسر Google Sheets
    const syncedCount = syncFirestorePendingToSheetBridge_(ss, runtimeCfg);

    // تحديث نبضة الاتصال والحصة المتبقية في Firestore ليظهر في لوحة المسؤول
    updateFirestoreHeartbeat_('active_polling', null);

    // المرحلة ب: التحقق من تفعيل الإرسال قبل إخراج أي رسالة حقيقية
    if (!runtimeCfg.sendEnabled) {
      Logger.log(
        `🔒 جسر Google Sheets نشط (تمت مزامنة ${syncedCount} طلب جديد)، ولكن الإرسال الفعلي متوقف (SEND_ENABLED=FALSE) بانتظار تفعيل المسؤول.`
      );
      return;
    }

    // المرحلة ج: معالجة الصفوف المعلقة في جسر Google Sheets وإرسالها عبر Gmail
    processSheetBridgeQueue_(ss, runtimeCfg);
  } catch (err) {
    Logger.log('❌ خطأ أثناء معالجة طابور الإشعارات: ' + (err && err.stack ? err.stack : err));
    appendBridgeAuditLog_(ensureBridgeSpreadsheet_(), 'SYSTEM_ERROR', '-', '-', String(err));
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * 3. اختبار آمن يرسل رسالة واحدة إلى البريد الإداري المعتمد فقط
 * ============================================================================
 */
function runSafeAdminTest() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    throw new Error('النظام مشغول حالياً، يرجى المحاولة بعد قليل.');
  }

  try {
    const ss = ensureBridgeSpreadsheet_();
    const runtimeCfg = readBridgeRuntimeConfig_(ss);
    const adminEmail = (runtimeCfg.adminTestEmail || CONFIG.DEFAULT_ADMIN_TEST_EMAIL).trim().toLowerCase();

    if (!isValidEmail_(adminEmail)) {
      throw new Error('بريد الاختبار الإداري غير صالح: ' + adminEmail);
    }

    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota <= 0) {
      throw new Error('لا توجد حصة يومية متبقية في MailApp (Remaining Quota = 0).');
    }

    const senderEmail = Session.getActiveUser().getEmail() || 'حساب Gmail الأكاديمية';
    const nowIso = new Date().toISOString();
    const subject = `اختبار الربط الآمن (Apps Script + Sheets Bridge) - ${CONFIG.ACADEMY_NAME}`;
    const body = [
      'السلام عليكم ورحمة الله وبركاته،',
      '',
      `هذه رسالة اختبار رسمية من نظام إشعارات أولياء الأمور في ${CONFIG.ACADEMY_NAME}.`,
      '',
      '• آلية التشغيل: Google Apps Script + Google Sheets Bridge (متوافق مع خطة Firebase Spark المجانية)',
      `• البريد المرسل المعتمد: ${senderEmail}`,
      `• المستلم الإداري للاختبار: ${adminEmail}`,
      `• قاعدة بيانات Firestore المتصلة: ${CONFIG.DATABASE_ID}`,
      `• الحصة اليومية المتبقية في Gmail (MailApp): ${remainingQuota}`,
      `• توقيت الاختبار: ${nowIso}`,
      '',
      'نجاح وصول هذه الرسالة يؤكد جاهزية الربط الآمن دون كشف أي مفاتيح في المتصفح.',
    ].join('\n');

    MailApp.sendEmail({
      to: adminEmail,
      subject: subject,
      body: body,
      name: CONFIG.ACADEMY_NAME,
    });

    const props = PropertiesService.getScriptProperties();
    props.setProperty('LAST_TEST_SUCCESS_AT', nowIso);
    props.setProperty('LAST_TEST_RECIPIENT', adminEmail);
    props.setProperty('IS_VERIFIED_BY_REAL_TEST', 'TRUE');

    syncSheetConfigTab_(ss);
    appendBridgeAuditLog_(ss, 'ADMIN_TEST_SUCCESS', 'TEST_MSG', adminEmail, 'تم إرسال رسالة الاختبار الإداري بنجاح');

    // تحديث وثيقة الحالة في Firestore لإبلاغ لوحة المسؤول بنجاح الاختبار
    updateFirestoreHeartbeat_('test_succeeded', {
      isVerifiedByRealTest: true,
      lastTestSuccessAt: nowIso,
      lastTestRecipient: adminEmail,
      lastTestMessageId: 'gas_test_' + Date.now(),
    });

    Logger.log('✅ نجح إرسال رسالة الاختبار الإداري إلى: ' + adminEmail);
  } finally {
    lock.releaseLock();
  }
}

/**
 * ============================================================================
 * 4. دوال التحكم في الجدولة الزمنية (Time-Driven Triggers)
 * ============================================================================
 * شغّل setupTimeDrivenTriggerEvery5Minutes() مرة واحدة لتفعيل الفحص الدوري كل 5 دقائق.
 */
function setupTimeDrivenTriggerEvery5Minutes() {
  removeAllTriggers();
  ScriptApp.newTrigger('processApprovedNotificationQueue')
    .timeBased()
    .everyMinutes(5)
    .create();

  const ss = ensureBridgeSpreadsheet_();
  appendBridgeAuditLog_(
    ss,
    'TRIGGER_CREATED',
    'EVERY_5_MINUTES',
    Session.getActiveUser().getEmail() || 'Admin',
    'تم تفعيل المشغّل الزمني (Time-Driven Trigger) كل 5 دقائق بنجاح.'
  );
  Logger.log('✅ تم إنشاء المشغّل الزمني (كل 5 دقائق) للدالة processApprovedNotificationQueue.');
}

function removeAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log('🛑 تم إيقاف وحذف جميع المشغّلات الزمنية (Triggers).');
}

/**
 * ============================================================================
 * 5. إدارة جسر Google Sheets الوسيط (Sheets Bridge Management)
 * ============================================================================
 */
function ensureBridgeSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  let sheetId = props.getProperty('BRIDGE_SPREADSHEET_ID');
  let ss = null;

  if (sheetId) {
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create(`جسر وسجل إشعارات أولياء الأمور - ${CONFIG.ACADEMY_NAME}`);
    props.setProperty('BRIDGE_SPREADSHEET_ID', ss.getId());
  }

  // 1. ورقة Queue_Bridge
  let qSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.QUEUE_BRIDGE);
  if (!qSheet) {
    qSheet = ss.insertSheet(CONFIG.SHEET_NAMES.QUEUE_BRIDGE);
    qSheet.appendRow([
      'idempotencyKey',          // 1 (A) مفتاح عدم التكرار الحتمي
      'state',                   // 2 (B) الحالة: pending | processing | accepted_by_gmail | failed | uncertain
      'notificationType',        // 3 (C) نوع الإشعار: tardiness_notice | absence_notice | violation_notice
      'studentId',               // 4 (D) معرّف الطالب الثابت
      'studentNumber',           // 5 (E) الرقم المدرسي
      'studentName',             // 6 (F) اسم الطالب
      'grade',                   // 7 (G) الصف
      'section',                 // 8 (H) الشعبة
      'incidentId',              // 9 (I) معرّف الواقعة الأصلية
      'incidentDate',            // 10 (J) تاريخ الواقعة
      'recipientEmail',          // 11 (K) بريد ولي الأمر المعتمد
      'guardianName',            // 12 (L) اسم ولي الأمر
      'guardianRelation',        // 13 (M) صلة القرابة
      'subject',                 // 14 (N) عنوان الرسالة
      'bodyText',                // 15 (O) نص الرسالة
      'approvedByName',          // 16 (P) الموظف/المسؤول المعتمد
      'isAdminReviewedViolation',// 17 (Q) اعتماد المسؤول للمخالفة
      'attemptCount',            // 18 (R) عدد المحاولات
      'createdAt',               // 19 (S) تاريخ الإنشاء
      'updatedAt',               // 20 (T) آخر تحديث
      'outcomeNote',             // 21 (U) ملاحظة النتيجة / سبب الفشل
      'firestoreUpdateTime'      // 22 (V) طابع نسخة الوثيقة في Firestore لمنع التضارب الذري
    ]);
    qSheet.setFrozenRows(1);
  }

  // 2. ورقة Config_And_Quota
  let cSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONFIG_QUOTA);
  if (!cSheet) {
    cSheet = ss.insertSheet(CONFIG.SHEET_NAMES.CONFIG_QUOTA);
    syncSheetConfigTab_(ss);
  }

  // 3. ورقة Audit_Log
  let aSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT_LOG);
  if (!aSheet) {
    aSheet = ss.insertSheet(CONFIG.SHEET_NAMES.AUDIT_LOG);
    aSheet.appendRow(['Timestamp', 'Action', 'IdempotencyKey', 'Recipient', 'Details']);
    aSheet.setFrozenRows(1);
  }

  // حذف الورقة الافتراضية Sheet1 إن وجدت
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {}
  }

  return ss;
}

function syncSheetConfigTab_(ss) {
  const cSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONFIG_QUOTA);
  if (!cSheet) return;

  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().slice(0, 10);
  const savedDate = props.getProperty('DAILY_COUNTER_DATE') || today;
  let dailySent = parseInt(props.getProperty('DAILY_SENT_COUNT') || '0', 10);
  if (savedDate !== today) {
    dailySent = 0;
    props.setProperty('DAILY_COUNTER_DATE', today);
    props.setProperty('DAILY_SENT_COUNT', '0');
  }

  const remainingQuota = MailApp.getRemainingDailyQuota();
  const senderEmail = Session.getActiveUser().getEmail() || '';

  const rows = [
    ['Key', 'Value', 'Description (الشرح والضوابط)'],
    ['SEND_ENABLED', props.getProperty('SEND_ENABLED') || 'FALSE', 'ضع TRUE لتفعيل الإرسال، أو FALSE لإيقافه فوراً'],
    ['EXECUTION_MODE', props.getProperty('EXECUTION_MODE') || 'TEST_ONLY', 'TEST_ONLY (يرسل لبريد المسؤول فقط) أو PRODUCTION (يرسل لأولياء الأمور)'],
    ['ADMIN_TEST_EMAIL', props.getProperty('ADMIN_TEST_EMAIL') || CONFIG.DEFAULT_ADMIN_TEST_EMAIL, 'البريد الإداري المعتمد لاستلام رسائل وضع الاختبار'],
    ['SERVICE_ACTIVATED_AT', props.getProperty('SERVICE_ACTIVATED_AT') || new Date().toISOString(), 'تاريخ القطع: يُمنع إرسال أي واقعة قديمة مسجلة قبل هذا التوقيت'],
    ['DAILY_GMAIL_LIMIT_MAX', String(CONFIG.DAILY_GMAIL_LIMIT_MAX), 'الحد الأقصى اليومي لحساب @gmail.com العادي (100 مستلم/يوم)'],
    ['DAILY_SENT_COUNT', String(dailySent), 'عدد الرسائل المرسلة اليوم عبر السكربت'],
    ['DAILY_COUNTER_DATE', today, 'تاريخ العداد اليومي الحالي'],
    ['MAILAPP_REMAINING_QUOTA', String(remainingQuota), 'الحصة الفعلية المتبقية في حساب Gmail عبر MailApp.getRemainingDailyQuota()'],
    ['CONNECTED_ACADEMY_EMAIL', senderEmail, 'حساب Gmail الأكاديمي المشغّل للسكربت'],
    ['IS_VERIFIED_BY_REAL_TEST', props.getProperty('IS_VERIFIED_BY_REAL_TEST') || 'FALSE', 'هل تم التحقق عبر رسالة اختبار حقيقية؟'],
  ];

  cSheet.clearContents();
  cSheet.getRange(1, 1, rows.length, 3).setValues(rows);
  cSheet.setFrozenRows(1);
}

function readBridgeRuntimeConfig_(ss) {
  const cSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CONFIG_QUOTA);
  const props = PropertiesService.getScriptProperties();

  if (cSheet && cSheet.getLastRow() >= 2) {
    const data = cSheet.getRange(2, 1, cSheet.getLastRow() - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      const k = String(data[i][0] || '').trim();
      const v = String(data[i][1] || '').trim();
      if (k === 'SEND_ENABLED' || k === 'EXECUTION_MODE' || k === 'ADMIN_TEST_EMAIL' || k === 'SERVICE_ACTIVATED_AT') {
        props.setProperty(k, v);
      }
    }
  }

  // قراءة إعدادات Firestore أيضاً لمزامنة حالة التفعيل مع لوحة المسؤول في الموقع
  try {
    const statusDoc = firestoreGetDocument_(`schools/${CONFIG.SCHOOL_ID}/gmailConfig/status`);
    if (statusDoc && statusDoc.fields) {
      const f = parseFirestoreFields_(statusDoc.fields);
      if (typeof f.autoSendEnabled === 'boolean') {
        props.setProperty('SEND_ENABLED', f.autoSendEnabled ? 'TRUE' : 'FALSE');
      }
      if (f.adminApprovedProductionSend === true && f.isVerifiedByRealTest === true) {
        props.setProperty('EXECUTION_MODE', 'PRODUCTION');
      } else {
        props.setProperty('EXECUTION_MODE', 'TEST_ONLY');
      }
      if (f.serviceActivatedAt) {
        props.setProperty('SERVICE_ACTIVATED_AT', String(f.serviceActivatedAt));
      }
      if (f.lastTestRecipient && isValidEmail_(f.lastTestRecipient)) {
        props.setProperty('ADMIN_TEST_EMAIL', String(f.lastTestRecipient).trim().toLowerCase());
      }
    }
  } catch (e) {
    Logger.log('ملاحظة: تعذر قراءة وثيقة الحالة من Firestore، سيتم الاعتماد على إعدادات ورقة Google Sheets.');
  }

  syncSheetConfigTab_(ss);

  return {
    sendEnabled: String(props.getProperty('SEND_ENABLED') || 'FALSE').toUpperCase() === 'TRUE',
    executionMode: String(props.getProperty('EXECUTION_MODE') || 'TEST_ONLY').toUpperCase(),
    adminTestEmail: String(props.getProperty('ADMIN_TEST_EMAIL') || CONFIG.DEFAULT_ADMIN_TEST_EMAIL).trim().toLowerCase(),
    serviceActivatedAt: String(props.getProperty('SERVICE_ACTIVATED_AT') || new Date().toISOString()),
  };
}

/**
 * ============================================================================
 * 6. مزامنة الطلبات المعتمدة من Firestore إلى جسر Google Sheets
 * ============================================================================
 */
function syncFirestorePendingToSheetBridge_(ss, runtimeCfg) {
  const qSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.QUEUE_BRIDGE);
  const existingKeys = new Set();

  if (qSheet.getLastRow() >= 2) {
    const keysCol = qSheet.getRange(2, 1, qSheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < keysCol.length; i++) {
      const k = String(keysCol[i][0] || '').trim();
      if (k) existingKeys.add(k);
    }
  }

  const docs = firestoreListDocuments_(`schools/${CONFIG.SCHOOL_ID}/gmailNotificationQueue`, 100);
  if (!docs || docs.length === 0) return 0;

  let addedCount = 0;
  const cutoffMs = new Date(runtimeCfg.serviceActivatedAt).getTime();

  for (let i = 0; i < docs.length; i++) {
    const docObj = docs[i];
    const fields = parseFirestoreFields_(docObj.fields || {});
    const idempotencyKey = String(fields.idempotencyKey || fields.id || '').trim();
    if (!idempotencyKey || existingKeys.has(idempotencyKey)) {
      continue;
    }

    // نحن نسحب فقط الطلبات ذات الحالة 'pending' لمعالجتها
    if (fields.state !== 'pending') {
      continue;
    }

    // حماية الوقائع التاريخية القديمة المسجلة قبل تفعيل الخدمة
    const createdMs = new Date(fields.createdAt || 0).getTime();
    if (!isNaN(cutoffMs) && !isNaN(createdMs) && createdMs < cutoffMs - 60000) {
      markQueueItemState_(
        qSheet,
        null,
        idempotencyKey,
        fields,
        'failed',
        'تم حجب الإشعار تلقائياً لأنه يعود لواقعة قديمة قبل تاريخ تفعيل الخدمة (serviceActivatedAt).'
      );
      continue;
    }

    // التحقق من اعتماد المسؤول للمخالفات السلوكية
    if (fields.notificationType === 'violation_notice' && fields.isAdminReviewedViolation !== true) {
      markQueueItemState_(
        qSheet,
        null,
        idempotencyKey,
        fields,
        'failed',
        'تم رفض إرسال إشعار المخالفة السلوكية لعدم وجود اعتماد صريح من المسؤول المعتمد.'
      );
      continue;
    }

    // إدراج الطلب في جسر Google Sheets
    qSheet.appendRow([
      idempotencyKey,
      'pending',
      fields.notificationType || '',
      fields.studentId || '',
      fields.studentNumber || '',
      fields.studentName || '',
      fields.grade || '',
      fields.section || '',
      fields.incidentId || '',
      fields.incidentDate || '',
      fields.recipientEmail || '',
      fields.guardianName || '',
      fields.guardianRelation || '',
      fields.subject || '',
      fields.bodyText || '',
      fields.approvedByName || '',
      fields.isAdminReviewedViolation === true ? 'TRUE' : 'FALSE',
      Number(fields.attemptCount || 0),
      fields.createdAt || new Date().toISOString(),
      new Date().toISOString(),
      'تم السحب إلى جسر Google Sheets بانتظار الإرسال',
      docObj.updateTime || '',
    ]);

    existingKeys.add(idempotencyKey);
    addedCount++;
  }

  return addedCount;
}

/**
 * ============================================================================
 * 7. معالجة صفوف جسر Google Sheets وإرسالها عبر Gmail (MailApp)
 * ============================================================================
 */
function processSheetBridgeQueue_(ss, runtimeCfg) {
  const qSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.QUEUE_BRIDGE);
  const lastRow = qSheet.getLastRow();
  if (lastRow < 2) return;

  const props = PropertiesService.getScriptProperties();
  const today = new Date().toISOString().slice(0, 10);
  if (props.getProperty('DAILY_COUNTER_DATE') !== today) {
    props.setProperty('DAILY_COUNTER_DATE', today);
    props.setProperty('DAILY_SENT_COUNT', '0');
  }

  let dailySentCount = parseInt(props.getProperty('DAILY_SENT_COUNT') || '0', 10);
  let processedInThisRun = 0;

  const range = qSheet.getRange(2, 1, lastRow - 1, 22);
  const rows = range.getValues();

  for (let idx = 0; idx < rows.length; idx++) {
    if (processedInThisRun >= CONFIG.MAX_BATCH_PER_RUN) {
      break;
    }

    const rowNumber = idx + 2;
    const row = rows[idx];
    const idempotencyKey = String(row[0] || '').trim();
    const currentState = String(row[1] || '').trim();

    // لا نعالج إلا الحالة 'pending' فقط (لمنع إعادة إرسال processing أو uncertain أو accepted_by_gmail)
    if (!idempotencyKey || currentState !== 'pending') {
      continue;
    }

    // 1. فحص الحصة اليومية عبر MailApp.getRemainingDailyQuota() والحد اليومي المرجعي (100 مستلم/يوم)
    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota <= 0 || dailySentCount >= CONFIG.DAILY_GMAIL_LIMIT_MAX) {
      const pauseReason = `توقف الإرسال مؤقتاً لبلوغ الحد اليومي الآمن (${dailySentCount}/${CONFIG.DAILY_GMAIL_LIMIT_MAX} - المتبقي في MailApp: ${remainingQuota}).`;
      Logger.log('⚠️ ' + pauseReason);
      updateFirestoreHeartbeat_('quota_paused', {
        authorizationStatus: 'quota_paused',
        isQuotaReachedAlert: true,
        adminAlertType: 'quota_reached',
        adminAlertMessage: pauseReason,
      });
      appendBridgeAuditLog_(ss, 'QUOTA_PAUSED', idempotencyKey, '-', pauseReason);
      break;
    }

    const notificationType = String(row[2] || '').trim();
    const studentId = String(row[3] || '').trim();
    const studentNumber = String(row[4] || '').trim();
    const studentName = String(row[5] || '').trim();
    const grade = String(row[6] || '').trim();
    const section = String(row[7] || '').trim();
    const incidentId = String(row[8] || '').trim();
    const incidentDate = String(row[9] || '').trim();
    const originalRecipientEmail = String(row[10] || '').trim().toLowerCase();
    const guardianName = String(row[11] || '').trim();
    const guardianRelation = String(row[12] || '').trim();
    const subject = String(row[13] || '').trim();
    const bodyText = String(row[14] || '').trim();
    const approvedByName = String(row[15] || '').trim();
    const isAdminReviewedViolation = String(row[16] || '').toUpperCase() === 'TRUE';
    const attemptCount = parseInt(String(row[17] || '0'), 10) + 1;
    const expectedUpdateTime = String(row[21] || '').trim();

    // 2. التحقق الصارم من صلاحية المخالفات السلوكية
    if (notificationType === 'violation_notice' && !isAdminReviewedViolation) {
      updateBridgeRowAndFirestore_(qSheet, rowNumber, idempotencyKey, {
        state: 'failed',
        attemptCount: attemptCount,
        failureReason: 'إشعار المخالفة يتطلب اعتماد المسؤول المعتمد قبل الإرسال.',
      });
      continue;
    }

    // 3. تحديد المستلم الفعلي حسب وضع التشغيل (وضع الاختبار الإداري مقابل وضع الإنتاج)
    const targetRecipient =
      runtimeCfg.executionMode === 'PRODUCTION'
        ? originalRecipientEmail
        : runtimeCfg.adminTestEmail;

    if (!isValidGuardianEmail_(targetRecipient, guardianRelation)) {
      updateBridgeRowAndFirestore_(qSheet, rowNumber, idempotencyKey, {
        state: 'failed',
        attemptCount: attemptCount,
        failureReason: `بريد المستلم غير صالح أو غير مخوّل (${targetRecipient}).`,
      });
      continue;
    }

    // 4. حجز الطلب ذرياً إلى حالة 'processing' (قيد المعالجة) قبل استدعاء MailApp
    const claimed = claimFirestoreDocumentForProcessing_(idempotencyKey, attemptCount, expectedUpdateTime);
    if (!claimed) {
      qSheet.getRange(rowNumber, 2).setValue('accepted_by_gmail');
      qSheet.getRange(rowNumber, 21).setValue('تمت معالجته مسبقاً — تم منع التكرار الذري');
      continue;
    }
    qSheet.getRange(rowNumber, 2).setValue('processing');
    qSheet.getRange(rowNumber, 18).setValue(attemptCount);
    qSheet.getRange(rowNumber, 20).setValue(new Date().toISOString());
    SpreadsheetApp.flush();

    // 5. الإرسال الفعلي عبر حساب Gmail الأكاديمية
    let emailSentToMailApp = false;
    try {
      const finalSubject =
        runtimeCfg.executionMode === 'TEST_ONLY'
          ? `[وضع اختبار لولي أمر: ${ originalRecipientEmail }] ${subject}`
          : subject;

      MailApp.sendEmail({
        to: targetRecipient,
        subject: finalSubject,
        body: bodyText,
        name: CONFIG.ACADEMY_NAME,
      });
      emailSentToMailApp = true;
    } catch (sendErr) {
      const errMsg = `فشل استدعاء MailApp.sendEmail: ${sendErr && sendErr.message ? sendErr.message : sendErr}`;
      updateBridgeRowAndFirestore_(qSheet, rowNumber, idempotencyKey, {
        state: 'failed',
        attemptCount: attemptCount,
        failureReason: errMsg,
      });
      appendBridgeAuditLog_(ss, 'SEND_FAILED', idempotencyKey, targetRecipient, errMsg);
      continue;
    }

    // 6. بعد نجاح MailApp.sendEmail، نحدث الحالة إلى 'accepted_by_gmail' ونسجلها في ملف الطالب الموحد
    try {
      const acceptedAt = new Date().toISOString();
      const gmailMessageId = `gas_${idempotencyKey.slice(0, 32)}_${Date.now()}`;

      dailySentCount++;
      props.setProperty('DAILY_SENT_COUNT', String(dailySentCount));

      updateBridgeRowAndFirestore_(qSheet, rowNumber, idempotencyKey, {
        state: 'accepted_by_gmail',
        attemptCount: attemptCount,
        gmailMessageId: gmailMessageId,
        acceptedByGmailAt: acceptedAt,
        outcomeNote:
          runtimeCfg.executionMode === 'TEST_ONLY'
            ? `أُرسل في وضع الاختبار إلى ${targetRecipient}`
            : `أُرسل إلى Gmail (${targetRecipient})`,
      });

      // تسجيل النتيجة داخل ملف الطالب الموحد في مجموعة messageLogs
      recordOutcomeInStudentUnifiedProfile_({
        idempotencyKey: idempotencyKey,
        studentId: studentId,
        studentNumber: studentNumber,
        studentName: studentName,
        grade: grade,
        section: section,
        notificationType: notificationType,
        incidentId: incidentId,
        incidentDate: incidentDate,
        recipientEmail: targetRecipient,
        guardianName: guardianName,
        subject: subject,
        bodyText: bodyText,
        approvedByName: approvedByName,
        sentAt: acceptedAt,
        gmailMessageId: gmailMessageId,
      });

      appendBridgeAuditLog_(ss, 'ACCEPTED_BY_GMAIL', idempotencyKey, targetRecipient, gmailMessageId);
      processedInThisRun++;

      if (processedInThisRun < CONFIG.MAX_BATCH_PER_RUN) {
        Utilities.sleep(CONFIG.RATE_LIMIT_SLEEP_MS);
      }
    } catch (postSendErr) {
      // في حال انقطاع الاتصال بعد خروج الرسالة من MailApp، تُسجل الحالة 'uncertain' (يحتاج مراجعة) لمنع الإعادة التلقائية
      const uncertainMsg = `خرجت الرسالة من MailApp ولكن تعذر تأكيد التحديث النهائي (${postSendErr}). يحتاج مراجعة يدوية لمنع التكرار.`;
      qSheet.getRange(rowNumber, 2).setValue('uncertain');
      qSheet.getRange(rowNumber, 20).setValue(new Date().toISOString());
      qSheet.getRange(rowNumber, 21).setValue(uncertainMsg);
      try {
        firestorePatchDocument_(`schools/${CONFIG.SCHOOL_ID}/gmailNotificationQueue/${idempotencyKey}`, {
          state: 'uncertain',
          uncertainReason: uncertainMsg,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {}
      appendBridgeAuditLog_(ss, 'UNCERTAIN_NEEDS_REVIEW', idempotencyKey, targetRecipient, uncertainMsg);
    }
  }

  syncSheetConfigTab_(ss);
  updateFirestoreHeartbeat_('batch_completed', {
    dailySentCount: dailySentCount,
    dailyCounterDate: today,
  });
}

/**
 * ============================================================================
 * 8. دوال الاتصال الآمن بـ Firestore REST API وتسجيل ملف الطالب الموحد
 * ============================================================================
 */
function getFirestoreBaseUrl_() {
  return `https://firestore.googleapis.com/v1/projects/${CONFIG.PROJECT_ID}/databases/${CONFIG.DATABASE_ID}/documents`;
}

function getFirestoreAuthHeaders_() {
  // المصادقة الأصلية الآمنة عبر رمز OAuth الخاص بمشغّل Apps Script دون أي مفاتيح خدمة مكشوفة
  const token = ScriptApp.getOAuthToken();
  return {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  };
}

function firestoreGetDocument_(relativePath) {
  const url = `${getFirestoreBaseUrl_()}/${relativePath}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: getFirestoreAuthHeaders_(),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() === 200) {
    return JSON.parse(res.getContentText());
  }
  return null;
}

function firestoreListDocuments_(collectionPath, pageSize) {
  const url = `${getFirestoreBaseUrl_()}/${collectionPath}?pageSize=${pageSize || 100}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: getFirestoreAuthHeaders_(),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('Firestore List Warning (' + res.getResponseCode() + '): ' + res.getContentText());
    return [];
  }
  const data = JSON.parse(res.getContentText());
  return data.documents || [];
}

function firestorePatchDocument_(relativePath, plainObj, currentUpdateTime) {
  const fieldKeys = Object.keys(plainObj);
  const maskParams = fieldKeys.map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
  let url = `${getFirestoreBaseUrl_()}/${relativePath}?${maskParams}`;
  if (currentUpdateTime) {
    url += `&currentDocument.updateTime=${encodeURIComponent(currentUpdateTime)}`;
  }

  const payload = {
    fields: toFirestoreFields_(plainObj),
  };

  const res = UrlFetchApp.fetch(url, {
    method: 'patch',
    headers: getFirestoreAuthHeaders_(),
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code >= 200 && code < 300) {
    return JSON.parse(res.getContentText());
  }
  throw new Error(`Firestore PATCH failed (${code}): ${res.getContentText()}`);
}

function claimFirestoreDocumentForProcessing_(idempotencyKey, attemptCount, expectedUpdateTime) {
  try {
    const docSnap = firestoreGetDocument_(`schools/${CONFIG.SCHOOL_ID}/gmailNotificationQueue/${idempotencyKey}`);
    if (docSnap && docSnap.fields) {
      const current = parseFirestoreFields_(docSnap.fields);
      if (
        current.state === 'accepted_by_gmail' ||
        current.state === 'processing' ||
        current.state === 'uncertain'
      ) {
        return false;
      }
      firestorePatchDocument_(
        `schools/${CONFIG.SCHOOL_ID}/gmailNotificationQueue/${idempotencyKey}`,
        {
          state: 'processing',
          attemptCount: attemptCount,
          lastAttemptAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        docSnap.updateTime || expectedUpdateTime || null
      );
      return true;
    }
    return true;
  } catch (e) {
    Logger.log('Atomic claim skipped for ' + idempotencyKey + ': ' + e);
    return false;
  }
}

function updateBridgeRowAndFirestore_(qSheet, rowNumber, idempotencyKey, updates) {
  const nowIso = new Date().toISOString();
  if (rowNumber && qSheet) {
    if (updates.state) qSheet.getRange(rowNumber, 2).setValue(updates.state);
    if (typeof updates.attemptCount === 'number') qSheet.getRange(rowNumber, 18).setValue(updates.attemptCount);
    qSheet.getRange(rowNumber, 20).setValue(nowIso);
    qSheet.getRange(rowNumber, 21).setValue(
      updates.outcomeNote || updates.failureReason || updates.uncertainReason || updates.state
    );
  }

  try {
    const firestoreUpdates = {
      state: updates.state,
      updatedAt: nowIso,
    };
    if (typeof updates.attemptCount === 'number') firestoreUpdates.attemptCount = updates.attemptCount;
    if (updates.gmailMessageId) firestoreUpdates.gmailMessageId = updates.gmailMessageId;
    if (updates.acceptedByGmailAt) firestoreUpdates.acceptedByGmailAt = updates.acceptedByGmailAt;
    if (updates.failureReason) firestoreUpdates.failureReason = updates.failureReason;
    if (updates.uncertainReason) firestoreUpdates.uncertainReason = updates.uncertainReason;

    firestorePatchDocument_(
      `schools/${CONFIG.SCHOOL_ID}/gmailNotificationQueue/${idempotencyKey}`,
      firestoreUpdates
    );
  } catch (e) {
    Logger.log('Warning updating Firestore queue doc ' + idempotencyKey + ': ' + e);
  }
}

function markQueueItemState_(qSheet, rowNumber, idempotencyKey, fields, newState, reason) {
  updateBridgeRowAndFirestore_(qSheet, rowNumber, idempotencyKey, {
    state: newState,
    failureReason: reason,
    outcomeNote: reason,
  });
}

/**
 * توثيق نتيجة الإشعار داخل ملف الطالب الموحد (/schools/7001/messageLogs)
 */
function recordOutcomeInStudentUnifiedProfile_(info) {
  const logId = `msg_${info.idempotencyKey}`;
  const typeLabel =
    info.notificationType === 'tardiness_notice'
      ? 'إشعار تأخير صباحي'
      : info.notificationType === 'absence_notice'
      ? 'إشعار غياب مدرسي'
      : 'إشعار مخالفة سلوكية معتمد';

  const messageLogDoc = {
    id: logId,
    schoolId: CONFIG.SCHOOL_ID,
    studentId: info.studentId,
    studentNumber: info.studentNumber,
    studentName: info.studentName,
    grade: info.grade,
    section: info.section,
    channel: 'البريد الإلكتروني (Gmail - Apps Script)',
    messageType: typeLabel,
    recipientRole: 'ولي الأمر',
    recipientAddress: info.recipientEmail,
    subject: info.subject,
    content: info.bodyText,
    status: 'مرسل (مقبول من Gmail)',
    sentBy: info.approvedByName || 'النظام التلقائي المعتمد',
    sentAt: info.sentAt,
    sourceIncidentId: info.incidentId,
    incidentDate: info.incidentDate,
    gmailMessageId: info.gmailMessageId,
    idempotencyKey: info.idempotencyKey,
  };

  try {
    firestorePatchDocument_(`schools/${CONFIG.SCHOOL_ID}/messageLogs/${logId}`, messageLogDoc);
  } catch (e) {
    Logger.log('Notice recording student messageLog: ' + e);
  }
}

function updateFirestoreHeartbeat_(workerStatus, extraFields) {
  try {
    const props = PropertiesService.getScriptProperties();
    const today = new Date().toISOString().slice(0, 10);
    const remainingQuota = MailApp.getRemainingDailyQuota();
    const senderEmail = Session.getActiveUser().getEmail() || '';
    const dailySentCount = parseInt(props.getProperty('DAILY_SENT_COUNT') || '0', 10);

    const payload = Object.assign(
      {
        schoolId: CONFIG.SCHOOL_ID,
        connectedEmail: senderEmail || null,
        dailyLimitMax: CONFIG.DAILY_GMAIL_LIMIT_MAX,
        dailySentCount: dailySentCount,
        dailyCounterDate: today,
        remainingDailyQuota: remainingQuota,
        appsScriptWorkerStatus: workerStatus,
        appsScriptLastHeartbeatAt: new Date().toISOString(),
        bridgeSpreadsheetUrl: props.getProperty('BRIDGE_SPREADSHEET_ID')
          ? `https://docs.google.com/spreadsheets/d/${props.getProperty('BRIDGE_SPREADSHEET_ID')}/edit`
          : '',
        updatedAt: new Date().toISOString(),
      },
      extraFields || {}
    );

    firestorePatchDocument_(`schools/${CONFIG.SCHOOL_ID}/gmailConfig/status`, payload);
  } catch (e) {
    Logger.log('Heartbeat update notice: ' + e);
  }
}

function appendBridgeAuditLog_(ss, action, idempotencyKey, recipient, details) {
  try {
    const aSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.AUDIT_LOG);
    if (aSheet) {
      aSheet.appendRow([new Date().toISOString(), action, idempotencyKey, recipient, details]);
    }
  } catch (e) {}
}

/**
 * ============================================================================
 * 9. دوال التحقق من البريد وتحويل صيغ Firestore REST API
 * ============================================================================
 */
function isValidEmail_(email) {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(String(email).trim());
}

function isValidGuardianEmail_(email, relation) {
  if (!isValidEmail_(email)) return false;
  const clean = String(email).trim().toLowerCase();
  if (clean.endsWith('@moe.sch.ae') || clean.endsWith('@ese.gov.ae') || clean.endsWith('@invalid.local')) {
    return false;
  }
  if (String(relation || '').trim() === 'الطالب') {
    return false;
  }
  return true;
}

function parseFirestoreFields_(fieldsObj) {
  const result = {};
  if (!fieldsObj) return result;
  const keys = Object.keys(fieldsObj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    result[k] = parseSingleFirestoreValue_(fieldsObj[k]);
  }
  return result;
}

function parseSingleFirestoreValue_(valObj) {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    const arr = (valObj.arrayValue && valObj.arrayValue.values) || [];
    return arr.map(parseSingleFirestoreValue_);
  }
  if ('mapValue' in valObj) {
    return parseFirestoreFields_((valObj.mapValue && valObj.mapValue.fields) || {});
  }
  return null;
}

function toFirestoreFields_(plainObj) {
  const fields = {};
  const keys = Object.keys(plainObj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = plainObj[k];
    if (v === undefined) continue;
    fields[k] = toSingleFirestoreValue_(v);
  }
  return fields;
}

function toSingleFirestoreValue_(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toSingleFirestoreValue_) } };
  }
  if (typeof v === 'object') {
    return { mapValue: { fields: toFirestoreFields_(v) } };
  }
  return { stringValue: String(v) };
}
