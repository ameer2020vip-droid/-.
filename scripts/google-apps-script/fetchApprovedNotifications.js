/**
 * ============================================================================
 * أكاديمية الفجيرة العلمية الإسلامية — نظام إشعارات أولياء الأمور الآمن
 * Google Apps Script (JavaScript) — الاتصال بـ Firestore REST API
 * ============================================================================
 *
 * المزايا الأمنية والهندسية في هذا الملف:
 * 1. عدم كشف أي مفاتيح سرية في الكود المصدري:
 *    تُقرأ جميع الإعدادات (FIRESTORE_PROJECT_URL و FIRESTORE_API_KEY) حصرياً
 *    من خزنة خصائص السكربت الآمنة (PropertiesService.getScriptProperties()).
 * 2. وظيفة `fetchApprovedNotifications`:
 *    تتصل بـ Firestore عبر REST API لجلب طلبات الإشعارات المعتمدة التي تحمل
 *    الحالة 'انتظار' (وتدعم أيضاً التوافق مع الحقل state == 'pending').
 * 3. التحقق من حصة الإرسال اليومية:
 *    تتحقق من `MailApp.getRemainingDailyQuota()` قبل كل عملية إرسال لضمان عدم
 *    تجاوز حصة حساب Gmail المجاني.
 * 4. منع التكرار (Idempotency) عبر معرّفات الواقعة الثابتة:
 *    تعتمد على المعرّف الثابت للواقعة (`incidentId` و `idempotencyKey`) مع قفل
 *    تزامن (`LockService.getScriptLock()`) وسجل محلي لمنع إرسال نفس الواقعة مرتين.
 * 5. تحديث الحالة في Firestore بعد المحاولة:
 *    يتم تحديث حالة الإشعار في Firestore فوراً إلى 'أُرسل إلى Gmail' عند النجاح
 *    أو 'فشل' (مع تسجيل سبب الخطأ) عند تعذر الإرسال.
 * ============================================================================
 */

var SCRIPT_CONFIG = {
  SCHOOL_ID: '7001',
  QUEUE_COLLECTION: 'gmailNotificationQueue',
  STATUS_WAITING: 'انتظار',
  STATUS_SENT: 'أُرسل إلى Gmail',
  STATUS_FAILED: 'فشل',
  MIN_SAFE_QUOTA: 1,
  MAX_BATCH_SIZE: 25
};

/**
 * تهيئة خصائص السكربت الآمنة لمرة واحدة يدوياً من محرر Apps Script
 * ملاحظة: لا تضع مفتاح API الحقيقي داخل الكود المصدري المنشور؛ بل مرّره عبر
 * إعدادات المشروع (Project Settings -> Script Properties) أو بتشغيل هذه الدالة محلياً.
 *
 * الأسماء المطلوبة في Script Properties:
 * - FIRESTORE_PROJECT_URL:
 *   مثال: https://firestore.googleapis.com/v1/projects/fujairah-islamic/databases/ai-studio-7049e193-0b31-400e-a46c-4163cfd4f315/documents
 * - FIRESTORE_API_KEY:
 *   مفتاح Web API المقيد لمشروع Firebase (يُحفظ في Script Properties فقط).
 */
function getSecureFirestoreConfig_() {
  var scriptProps = PropertiesService.getScriptProperties();
  var projectUrl = scriptProps.getProperty('FIRESTORE_PROJECT_URL');
  var apiKey = scriptProps.getProperty('FIRESTORE_API_KEY');

  if (!projectUrl || !apiKey) {
    throw new Error(
      'إعدادات الاتصال غير مكتملة في Script Properties. يرجى ضبط FIRESTORE_PROJECT_URL و FIRESTORE_API_KEY في إعدادات Google Apps Script دون كتابتها في الكود.'
    );
  }

  return {
    projectUrl: projectUrl.replace(/\/+$/, ''),
    apiKey: apiKey.trim()
  };
}

/**
 * الوظيفة الرئيسية: جلب طلبات الإشعارات المعتمدة التي تحمل الحالة 'انتظار'
 * من Firestore عبر REST API، والتحقق من الحصة اليومية، وإرسال البريد،
 * وتحديث الحالة إلى 'أُرسل إلى Gmail' أو 'فشل' مع ضمان عدم التكرار.
 */
function fetchApprovedNotifications() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log('تخطي التشغيل: توجد عملية إرسال أخرى قيد التنفيذ حالياً.');
    return {
      status: 'SKIPPED_LOCKED',
      processed: 0,
      sent: 0,
      failed: 0
    };
  }

  try {
    // 1. التحقق المبدئي من الحصة اليومية المتبقية في حساب Gmail
    var remainingQuota = MailApp.getRemainingDailyQuota();
    Logger.log('حصة Gmail اليومية المتبقية قبل الجلب: ' + remainingQuota);

    if (remainingQuota < SCRIPT_CONFIG.MIN_SAFE_QUOTA) {
      Logger.log('توقف آمن: استُنفدت حصة الإرسال اليومية في Gmail (المتبقي: ' + remainingQuota + ').');
      return {
        status: 'QUOTA_EXHAUSTED',
        remainingQuota: remainingQuota,
        processed: 0,
        sent: 0,
        failed: 0
      };
    }

    // 2. قراءة إعدادات الاتصال الآمنة من Script Properties
    var config = getSecureFirestoreConfig_();

    // 3. الاستعلام عبر Firestore REST API (:runQuery) لجلب الإشعارات التي حالتها 'انتظار'
    var waitingDocs = queryWaitingNotificationsFromFirestore_(config);
    Logger.log('عدد طلبات الإشعارات المعتمدة بحالة "' + SCRIPT_CONFIG.STATUS_WAITING + '": ' + waitingDocs.length);

    var sentCount = 0;
    var failedCount = 0;
    var skippedDuplicates = 0;

    for (var i = 0; i < waitingDocs.length; i++) {
      var notification = waitingDocs[i];

      // التحقق من الحصة المتبقية قبل كل رسالة على حدة
      remainingQuota = MailApp.getRemainingDailyQuota();
      if (remainingQuota < SCRIPT_CONFIG.MIN_SAFE_QUOTA) {
        Logger.log('توقف أثناء المعالجة: انتهت الحصة اليومية المتبقية في Gmail.');
        break;
      }

      // 4. التحقق الصارم من المعرّف الثابت للواقعة (incidentId / idempotencyKey) لمنع التكرار
      var immutableIncidentKey = buildImmutableIncidentKey_(notification);
      if (!immutableIncidentKey) {
        updateNotificationStatusInFirestore_(
          config,
          notification.docId,
          SCRIPT_CONFIG.STATUS_FAILED,
          'failed',
          'رفض الإرسال: معرّف الواقعة الثابت (incidentId) أو معرّف الطالب مفقود.'
        );
        failedCount++;
        continue;
      }

      if (isIncidentAlreadyDispatched_(immutableIncidentKey, notification)) {
        Logger.log('تخطي إشعار مكرر للواقعة الثابتة: ' + immutableIncidentKey);
        updateNotificationStatusInFirestore_(
          config,
          notification.docId,
          SCRIPT_CONFIG.STATUS_SENT,
          'accepted_by_gmail',
          'تم التخطي لمنع التكرار: الواقعة أُرسلت مسبقاً بمعرّف ثابت (' + immutableIncidentKey + ').'
        );
        skippedDuplicates++;
        continue;
      }

      // التحقق من اعتماد الإشعار وصلاحية البريد الإلكتروني للمستلم
      if (!notification.isApproved) {
        Logger.log('تخطي الوثيقة ' + notification.docId + ': الإشعار غير معتمد للإرسال.');
        continue;
      }

      if (!isValidEmailAddress_(notification.recipientEmail)) {
        updateNotificationStatusInFirestore_(
          config,
          notification.docId,
          SCRIPT_CONFIG.STATUS_FAILED,
          'failed',
          'عنوان البريد الإلكتروني لولي الأمر غير صالح أو فارغ: ' + (notification.recipientEmail || 'فارغ')
        );
        failedCount++;
        continue;
      }

      // 5. محاولة الإرسال الفعلي عبر MailApp وتحديث الحالة في Firestore
      try {
        MailApp.sendEmail({
          to: notification.recipientEmail,
          subject: notification.subject,
          body: notification.plainTextBody || '',
          htmlBody: notification.htmlBody || notification.plainTextBody || '',
          name: 'أكاديمية الفجيرة العلمية الإسلامية - شؤون الطلاب'
        });

        // تسجيل المعرّف الثابت للواقعة كمرسَل لمنع أي تكرار مستقبلي
        markIncidentAsDispatched_(immutableIncidentKey, notification.docId);

        // تحديث الحالة في Firestore إلى 'أُرسل إلى Gmail'
        updateNotificationStatusInFirestore_(
          config,
          notification.docId,
          SCRIPT_CONFIG.STATUS_SENT,
          'accepted_by_gmail',
          ''
        );

        sentCount++;
        Logger.log('تم الإرسال بنجاح إلى ' + notification.recipientEmail + ' | الواقعة: ' + immutableIncidentKey);
      } catch (sendError) {
        var errorMessage = sendError && sendError.message ? sendError.message : String(sendError);
        Logger.log('فشل إرسال الإشعار (' + notification.docId + '): ' + errorMessage);

        // تحديث الحالة في Firestore إلى 'فشل'
        updateNotificationStatusInFirestore_(
          config,
          notification.docId,
          SCRIPT_CONFIG.STATUS_FAILED,
          'failed',
          errorMessage
        );

        failedCount++;
      }
    }

    return {
      status: 'COMPLETED',
      remainingQuota: MailApp.getRemainingDailyQuota(),
      processed: waitingDocs.length,
      sent: sentCount,
      failed: failedCount,
      skippedDuplicates: skippedDuplicates
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * الاتصال بـ Firestore عبر REST API (:runQuery) لجلب طلبات الإشعارات المعتمدة
 * التي تحمل الحالة 'انتظار' (أو state == 'pending' للتوافق مع السجلات الحالية).
 */
function queryWaitingNotificationsFromFirestore_(config) {
  var parentPath = config.projectUrl + '/schools/' + SCRIPT_CONFIG.SCHOOL_ID;
  var runQueryUrl = parentPath + ':runQuery?key=' + encodeURIComponent(config.apiKey);

  // استعلام StructuredQuery لجلب الوثائق التي تحمل status == 'انتظار'
  var structuredQueryPayload = {
    structuredQuery: {
      from: [{ collectionId: SCRIPT_CONFIG.QUEUE_COLLECTION }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'status' },
          op: 'EQUAL',
          value: { stringValue: SCRIPT_CONFIG.STATUS_WAITING }
        }
      },
      limit: SCRIPT_CONFIG.MAX_BATCH_SIZE
    }
  };

  var results = executeFirestoreQuery_(runQueryUrl, structuredQueryPayload);

  // دعم إضافي للوثائق التي قد تكون مسجلة بالحقل state == 'pending' أو state == 'انتظار'
  if (results.length < SCRIPT_CONFIG.MAX_BATCH_SIZE) {
    var fallbackQueryPayload = {
      structuredQuery: {
        from: [{ collectionId: SCRIPT_CONFIG.QUEUE_COLLECTION }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'state' },
            op: 'EQUAL',
            value: { stringValue: 'pending' }
          }
        },
        limit: SCRIPT_CONFIG.MAX_BATCH_SIZE
      }
    };
    var fallbackResults = executeFirestoreQuery_(runQueryUrl, fallbackQueryPayload);
    var existingIds = {};
    for (var i = 0; i < results.length; i++) {
      existingIds[results[i].docId] = true;
    }
    for (var j = 0; j < fallbackResults.length; j++) {
      var candidate = fallbackResults[j];
      // لا نضيفها إلا إذا لم تكن قد أُرسلت أو فشلت مسبقاً
      if (
        !existingIds[candidate.docId] &&
        candidate.status !== SCRIPT_CONFIG.STATUS_SENT &&
        candidate.status !== SCRIPT_CONFIG.STATUS_FAILED
      ) {
        results.push(candidate);
        existingIds[candidate.docId] = true;
      }
    }
  }

  return results;
}

/**
 * تنفيذ طلب POST إلى نقطة نهاية Firestore REST API (:runQuery) وتحويل النتيجة
 */
function executeFirestoreQuery_(runQueryUrl, payloadObj) {
  var requestOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: buildAuthorizedHeaders_(),
    payload: JSON.stringify(payloadObj),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(runQueryUrl, requestOptions);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('فشل الاتصال بـ Firestore REST API (كود HTTP ' + statusCode + '): ' + responseText);
  }

  var rows = JSON.parse(responseText);
  if (!Array.isArray(rows)) {
    return [];
  }

  var parsedNotifications = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].document) {
      var parsed = parseFirestoreNotificationDocument_(rows[i].document);
      if (parsed) {
        parsedNotifications.push(parsed);
      }
    }
  }

  return parsedNotifications;
}

/**
 * تحديث حالة الإشعار في Firestore عبر REST API (PATCH) إلى 'أُرسل إلى Gmail' أو 'فشل'
 */
function updateNotificationStatusInFirestore_(config, docId, arabicStatus, internalState, errorMessage) {
  var docEndpoint =
    config.projectUrl +
    '/schools/' +
    SCRIPT_CONFIG.SCHOOL_ID +
    '/' +
    SCRIPT_CONFIG.QUEUE_COLLECTION +
    '/' +
    encodeURIComponent(docId) +
    '?key=' +
    encodeURIComponent(config.apiKey) +
    '&updateMask.fieldPaths=status' +
    '&updateMask.fieldPaths=state' +
    '&updateMask.fieldPaths=updatedAt' +
    '&updateMask.fieldPaths=sentAt' +
    '&updateMask.fieldPaths=failureReason' +
    '&updateMask.fieldPaths=lastErrorMessage' +
    '&updateMask.fieldPaths=remainingQuotaAfterSend';

  var nowIso = new Date().toISOString();
  var remainingQuota = MailApp.getRemainingDailyQuota();

  var patchPayload = {
    fields: {
      status: { stringValue: arabicStatus },
      state: { stringValue: internalState },
      updatedAt: { stringValue: nowIso },
      sentAt: { stringValue: arabicStatus === SCRIPT_CONFIG.STATUS_SENT ? nowIso : '' },
      failureReason: { stringValue: errorMessage || '' },
      lastErrorMessage: { stringValue: errorMessage || '' },
      remainingQuotaAfterSend: { integerValue: String(remainingQuota) }
    }
  };

  var response = UrlFetchApp.fetch(docEndpoint, {
    method: 'patch',
    contentType: 'application/json',
    headers: buildAuthorizedHeaders_(),
    payload: JSON.stringify(patchPayload),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    Logger.log('تحذير: تعذر تحديث حالة الوثيقة ' + docId + ' في Firestore (HTTP ' + code + '): ' + response.getContentText());
  }
}

/**
 * بناء معرّف ثابت وفريد للواقعة (Immutable Incident Identifier) لمنع تكرار الإرسال
 */
function buildImmutableIncidentKey_(notification) {
  if (notification.idempotencyKey && String(notification.idempotencyKey).trim() !== '') {
    return String(notification.idempotencyKey).trim();
  }

  var incidentId = notification.incidentId ? String(notification.incidentId).trim() : '';
  var studentNumber = notification.studentNumber ? String(notification.studentNumber).trim() : '';
  var notificationType = notification.notificationType ? String(notification.notificationType).trim() : 'incident';

  if (!incidentId || !studentNumber) {
    return '';
  }

  return 'INCIDENT_' + notificationType + '_' + studentNumber + '_' + incidentId;
}

/**
 * التحقق مما إذا كانت الواقعة قد أُرسلت مسبقاً بالاعتماد على المعرّف الثابت
 */
function isIncidentAlreadyDispatched_(immutableIncidentKey, notification) {
  if (
    notification.status === SCRIPT_CONFIG.STATUS_SENT ||
    notification.state === 'accepted_by_gmail'
  ) {
    return true;
  }

  var scriptProps = PropertiesService.getScriptProperties();
  var sentRecord = scriptProps.getProperty('SENT_LOCK_' + immutableIncidentKey);
  return Boolean(sentRecord);
}

/**
 * حفظ المعرّف الثابت للواقعة بعد نجاح الإرسال لمنع أي إرسال مكرر لاحقاً
 */
function markIncidentAsDispatched_(immutableIncidentKey, docId) {
  var scriptProps = PropertiesService.getScriptProperties();
  scriptProps.setProperty(
    'SENT_LOCK_' + immutableIncidentKey,
    JSON.stringify({
      docId: docId,
      sentAt: new Date().toISOString()
    })
  );
}

/**
 * استخراج الحقول من وثيقة Firestore REST JSON
 */
function parseFirestoreNotificationDocument_(doc) {
  if (!doc || !doc.name || !doc.fields) {
    return null;
  }

  var nameParts = doc.name.split('/');
  var docId = nameParts[nameParts.length - 1];
  var f = doc.fields;

  var statusVal = getFirestoreString_(f, 'status') || SCRIPT_CONFIG.STATUS_WAITING;
  var stateVal = getFirestoreString_(f, 'state') || 'pending';
  var bodyContent = getFirestoreString_(f, 'bodyText') || getFirestoreString_(f, 'plainTextBody');

  // يعتبر الإشعار معتمداً إذا كان حقل approvedByUid موجوداً أو isApproved != false
  var approvedFlag = getFirestoreBoolean_(f, 'isApproved', true);

  return {
    docId: docId,
    idempotencyKey: getFirestoreString_(f, 'idempotencyKey') || docId,
    incidentId: getFirestoreString_(f, 'incidentId'),
    studentNumber: getFirestoreString_(f, 'studentNumber') || getFirestoreString_(f, 'studentId'),
    studentName: getFirestoreString_(f, 'studentName'),
    notificationType: getFirestoreString_(f, 'notificationType'),
    recipientEmail: getFirestoreString_(f, 'recipientEmail'),
    subject: getFirestoreString_(f, 'subject') || 'إشعار من أكاديمية الفجيرة العلمية الإسلامية',
    plainTextBody: bodyContent,
    htmlBody: getFirestoreString_(f, 'htmlBody') || bodyContent,
    status: statusVal,
    state: stateVal,
    isApproved: approvedFlag
  };
}

function getFirestoreString_(fields, key) {
  if (!fields || !fields[key]) return '';
  if (typeof fields[key].stringValue === 'string') return fields[key].stringValue;
  if (typeof fields[key].integerValue !== 'undefined') return String(fields[key].integerValue);
  return '';
}

function getFirestoreBoolean_(fields, key, defaultVal) {
  if (!fields || !fields[key] || typeof fields[key].booleanValue !== 'boolean') {
    return defaultVal;
  }
  return fields[key].booleanValue;
}

function isValidEmailAddress_(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * تمرير رمز OAuth الخاص بحساب مشغل السكربت في الترويسة (عند تفعيل قواعد أمان Firestore لحساب الأكاديمية)
 */
function buildAuthorizedHeaders_() {
  try {
    var token = ScriptApp.getOAuthToken();
    if (token) {
      return {
        Authorization: 'Bearer ' + token
      };
    }
  } catch (e) {
    // في حال عدم توفر رمز OAuth يكتفي بطلب REST عبر مفتاح API المقيد في Script Properties
  }
  return {};
}

/**
 * إنشاء مشغل زمني (Time-driven Trigger) لتشغيل `fetchApprovedNotifications` كل 5 دقائق
 */
function setupFetchApprovedNotificationsTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'fetchApprovedNotifications') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('fetchApprovedNotifications')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('تم تفعيل الجدولة الزمنية لوظيفة fetchApprovedNotifications كل 5 دقائق بنجاح.');
}
