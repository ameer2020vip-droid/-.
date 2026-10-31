# دليل إعداد وتشغيل جسر الإشعارات الآمن (Google Apps Script + Google Sheets Bridge)
**أكاديمية الفجيرة العلمية الإسلامية — مشروع Firebase: `fujairah-islamic` (خطة Spark المجانية)**

---

## 1. كيف تعمل المعمارية الآمنة دون Firebase Cloud Functions؟

لتجنب الترقية إلى خطة **Blaze** المدفوعة ومنع وضع أي مفاتيح سرية (`Service Account Keys` أو `OAuth Client Secret`) داخل واجهة المتصفح (React)، يعتمد النظام على ثلاث طبقات معزولة:

1. **طبقة تطبيق الويب (React + Firestore Rules):**
   - عند اعتماد واقعة **تأخير صباحي** أو **غياب**، أو عند اعتماد المسؤول المعتمد لإشعار **مخالفة سلوكية**، ينشئ التطبيق وثيقة طلب إشعار بحالة `pending` (انتظار) في المسار الفعلي:
     `projects/fujairah-islamic/databases/ai-studio-7049e193-0b31-400e-a46c-4163cfd4f315/documents/schools/7001/gmailNotificationQueue/{idempotencyKey}`
   - لا يرسل المتصفح أي بريد إلكتروني ولا يملك أي صلاحية للوصول إلى حساب Gmail أو Google Sheets.

2. **طبقة جسر Google Sheets الوسيط (Intermediate Bridge & Audit Ledger):**
   - يعمل سكربت **Google Apps Script** من داخل حساب Google الرسمي للأكاديمية، وينشئ تلقائياً جدول **Google Sheet** خاصاً في Google Drive التابع لنفس الحساب (`جسر وسجل إشعارات أولياء الأمور - أكاديمية الفجيرة العلمية الإسلامية`).
   - يضم الجدول 3 أوراق عمل محمية:
     - **`Queue_Bridge`**: تسحب طلبات الإشعارات المعتمدة (`pending`) من Firestore وتتحقق من مفتاح عدم التكرار الحتمي `idempotencyKey` (`gm_{type}_{studentNumber}_{incidentId}_{email}`) قبل أي محاولة إرسال.
     - **`Config_And_Quota`**: تتحكم في تفعيل/إيقاف الإرسال (`SEND_ENABLED`)، ووضع التشغيل (`TEST_ONLY` مقابل `PRODUCTION`)، وتاريخ قطع الوقائع القديمة (`SERVICE_ACTIVATED_AT`)، والحد اليومي (`100` مستلم/يوم لحساب `@gmail.com`)، والحصة الفعلية المتبقية عبر `MailApp.getRemainingDailyQuota()`.
     - **`Audit_Log`**: سجل تدقيق غير قابل للتعديل يوثق كل عملية إرسال أو إيقاف أو خطأ.

3. **طبقة المصادقة الآمنة بدون مفاتيح خدمة مكشوفة (`ScriptApp.getOAuthToken()`):**
   - يحصل Apps Script على تفويض الوصول إلى Firestore عبر الرمز المؤقت الأصلي `ScriptApp.getOAuthToken()` الخاص بالحساب المشغّل للسكربت، مع النطاق الرسمي `https://www.googleapis.com/auth/datastore`.
   - طالما أن حساب Gmail الذي يشغّل السكربت مضاف في **Google Cloud IAM** لمشروع `fujairah-islamic` بدور **`Cloud Datastore User` (`roles/datastore.user`)** (أو كان هو نفسه مالك المشروع `Owner`)، فإنه يقرأ الطلبات من Firestore ويكتب نتائج الإرسال في **ملف الطالب الموحد** (`/schools/7001/messageLogs`) دون إنشاء أو تنزيل أي ملف `Service Account JSON Key`.

---

## 2. خطوات الاستضافة والتشغيل داخل حساب Gmail الأكاديمي

### الخطوة الأولى: التأكد من صلاحية IAM لحساب Gmail الأكاديمي
1. افتح [Google Cloud IAM للمشروع `fujairah-islamic`](https://console.cloud.google.com/iam-admin/iam?project=fujairah-islamic).
2. إذا كان حساب Gmail الأكاديمي هو نفس الحساب المالك للمشروع (`ameer2020vip@gmail.com`)، فالصلاحية متوفرة تلقائياً.
3. إذا كان حساب Gmail الأكاديمي حساباً آخر (مثل `academy@gmail.com`)، اضغط **Grant Access**، وأضف بريد الحساب، وامنحه الدور **`Cloud Datastore User`** فقط.

### الخطوة الثانية: إنشاء مشروع Google Apps Script
1. سجل الدخول بحساب Gmail الأكاديمي وافتح [script.google.com](https://script.google.com).
2. اضغط **مشروع جديد (New project)** وسمِّه: `نظام إشعارات أكاديمية الفجيرة العلمية الإسلامية`.
3. من القائمة الجانبية، افتح **إعدادات المشروع (Project Settings ⚙)** وفَعّل خيار:
   **«عرض ملف البيان `appsscript.json` في المحرر» (Show "appsscript.json" manifest file in editor)**.
4. ارجع إلى **المحرر (`< >`)**:
   - افتح ملف `appsscript.json` واستبدل محتواه بالكامل بمحتوى ملف `/scripts/google-apps-script/appsscript.json`.
   - افتح ملف `Code.gs` واستبدل محتواه بالكامل بمحتوى ملف `/scripts/google-apps-script/Code.gs`.
5. اضغط **حفظ (Save 💾)**.

### الخطوة الثالثة: تهيئة جسر Google Sheets والاختبار الآمن
1. من شريط الأدوات العلوي في محرر Apps Script، اختر الدالة **`initializeAcademyNotificationBridge`** ثم اضغط **تشغيل (Run)**.
2. سيطلب منك Google مراجعة الأذونات (Review permissions) للمرة الأولى — وافق عليها.
3. سيقوم السكربت بإنشاء جدول **Google Sheet** الوسيط في حسابك، وسيطبع رابطه في **سجل التنفيذ (Execution log)**، مع إبقاء الإرسال الفعلي متوقفاً بأمان (`SEND_ENABLED = FALSE` و `EXECUTION_MODE = TEST_ONLY`).
4. لاختبار الإرسال إلى بريد المسؤول المعتمد فقط (`ameer2020vip@gmail.com`)، اختر الدالة **`runSafeAdminTest`** واضغط **تشغيل (Run)**.

### الخطوة الرابعة: إعداد الجدولة الزمنية (Time-Driven Trigger)
يمكنك تفعيل الجدولة الزمنية بطريقتين:
- **الطريقة التلقائية (موصى بها):** اختر الدالة **`setupTimeDrivenTriggerEvery5Minutes`** من القائمة العلوية في المحرر واضغط **تشغيل (Run)**. ستقوم بإنشاء مشغّل زمني يفحص الطابور كل 5 دقائق تلقائياً.
- **الطريقة اليدوية من واجهة Apps Script:**
  1. من القائمة الجانبية، افتح **المشغّلات (Triggers ⏰)** ثم اضغط **إضافة مشغّل (Add Trigger)**.
  2. اختر الدالة: `processApprovedNotificationQueue`.
  3. اختر مصدر الحدث (Event source): **مستند إلى الوقت (Time-driven)**.
  4. اختر نوع المشغّل: **مؤقت بالدقائق (Minutes timer)**، والفترة: **كل 5 دقائق (Every 5 minutes)**.
  5. اضغط **حفظ (Save)**.

---

## 3. كيفية تفعيل الإرسال الفعلي بعد نجاح الاختبار

حفاظاً على الأمان ومنع إرسال أي رسائل قبل موافقتك:
- يظل الإرسال متوقفاً حتى تقوم بتفعيله من:
  1. **لوحة إعدادات Gmail في موقع الأكاديمية** (تفعيل الإرسال التلقائي بعد نجاح الاختبار)، **أو**
  2. **ورقة `Config_And_Quota` في جدول Google Sheets الوسيط** بتغيير:
     - `SEND_ENABLED` إلى `TRUE`
     - `EXECUTION_MODE` إلى `PRODUCTION` (لإرسال الإشعارات لأولياء الأمور الفعليين) أو إبقائه `TEST_ONLY` (لإرسالها إلى بريد المسؤول فقط أثناء التجربة).
