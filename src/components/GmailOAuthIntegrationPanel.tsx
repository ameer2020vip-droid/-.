import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Send,
  Lock,
  Unlink,
  Link2,
  Copy,
  Check,
  Clock,
  FileText,
  Save,
  RotateCcw,
  Users,
  Activity,
  HelpCircle,
  Eye,
  Play,
  PauseCircle,
  Info,
} from 'lucide-react';
import {
  GmailConnectionConfig,
  GmailEmailTemplateConfig,
  GmailNotificationEventType,
  GmailQueueDeliveryState,
  GmailQueueRecord,
  Student,
  ViolationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import {
  GMAIL_SEND_SCOPE,
  isAuthorizedGmailAdmin,
  fetchGmailConnectionConfig,
  saveGmailConnectionConfig,
  fetchGmailTemplates,
  saveGmailTemplates,
  getDefaultGmailEmailTemplates,
  startServerGmailOAuthFlow,
  disconnectServerGmailOAuth,
  runSingleGmailTest,
  runSmallBatchGmailTest,
  fetchGmailQueueRecords,
  dispatchQueueRecordItem,
  approveAndSendViolationGmailNotification,
  extractApprovedGuardianEmail,
} from '../firebase/gmailNotificationService';

interface GmailOAuthIntegrationPanelProps {
  schoolId: string;
  currentUser?: CounselorUser | AppUser | null;
  students: Student[];
  violations?: ViolationRecord[];
  onOpenStudentProfile?: (studentId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  initialSubView?: 'connection' | 'testing' | 'templates' | 'queue' | 'failed' | 'violations_approval' | 'gcp_guide';
}

export function getGmailQueueStateBadge(state: GmailQueueDeliveryState): {
  label: string;
  subtitle: string;
  className: string;
} {
  switch (state) {
    case 'pending':
      return {
        label: 'انتظار',
        subtitle: 'في طابور الإرسال الخلفي',
        className: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      };
    case 'processing':
      return {
        label: 'معالجة',
        subtitle: 'جارٍ الإرسال الذري عبر Gmail API',
        className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800',
      };
    case 'accepted_by_gmail':
      return {
        label: 'قبول من Gmail',
        subtitle: 'قَبِل خادم Gmail الرسالة للإرسال (لا يُعدّ تأكيد قراءة)',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800',
      };
    case 'failed':
      return {
        label: 'فشل',
        subtitle: 'تعذر الإرسال — يتطلب مراجعة أو إعادة محاولة مصرح بها',
        className: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800',
      };
    case 'uncertain':
      return {
        label: 'حالة غير مؤكدة',
        subtitle: 'انقطع الاتصال بعد مخاطبة Gmail — راجع البريد المرسل قبل الإعادة',
        className: 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700',
      };
  }
}

export function getNotificationTypeLabel(type: GmailNotificationEventType): string {
  switch (type) {
    case 'tardiness_notice':
      return 'إشعار تأخير صباحي';
    case 'absence_notice':
      return 'إشعار غياب مدرسي';
    case 'violation_notice':
      return 'إشعار مخالفة سلوكية (معتمد)';
  }
}

export const GmailOAuthIntegrationPanel: React.FC<GmailOAuthIntegrationPanelProps> = ({
  schoolId = '7001',
  currentUser,
  students,
  violations = [],
  onOpenStudentProfile,
  onShowToast,
  initialSubView = 'connection',
}) => {
  const isAdmin = isAuthorizedGmailAdmin(currentUser);

  const [activeSubTab, setActiveSubTab] = useState<
    'connection' | 'testing' | 'templates' | 'queue' | 'failed' | 'violations_approval' | 'gcp_guide'
  >(initialSubView);

  const [loading, setLoading] = useState<boolean>(true);
  const [config, setConfig] = useState<GmailConnectionConfig | null>(null);
  const [hasClientId, setHasClientId] = useState<boolean>(false);
  const [clientIdPreview, setClientIdPreview] = useState<string | null>(null);
  const [hasClientSecret, setHasClientSecret] = useState<boolean>(false);
  const [hasRefreshToken, setHasRefreshToken] = useState<boolean>(false);
  const [redirectUri, setRedirectUri] = useState<string>(
    typeof window !== 'undefined' ? `${window.location.origin}/api/gmail/oauth/callback` : ''
  );
  const [cloudFunctionsCallbackUri, setCloudFunctionsCallbackUri] = useState<string>(
    'https://europe-west1-fujairah-islamic.cloudfunctions.net/gmailOAuthCallback'
  );

  const [copiedUriKey, setCopiedUriKey] = useState<string | null>(null);

  // OAuth & Testing State
  const [connectingOAuth, setConnectingOAuth] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [singleTestEmail, setSingleTestEmail] = useState<string>(currentUser?.email || 'ameer2020vip@gmail.com');
  const [senderGmailInput, setSenderGmailInput] = useState<string>('');
  const [runningSingleTest, setRunningSingleTest] = useState<boolean>(false);

  const [batchTestEmailsText, setBatchTestEmailsText] = useState<string>(
    currentUser?.email ? `${currentUser.email}` : 'ameer2020vip@gmail.com'
  );
  const [batchTestApprovedCheckbox, setBatchTestApprovedCheckbox] = useState<boolean>(false);
  const [runningBatchTest, setRunningBatchTest] = useState<boolean>(false);
  const [batchTestResults, setBatchTestResults] = useState<
    Array<{ recipient: string; outcome: string; gmailMessageId?: string; error?: string }>
  >([]);

  // Templates State
  const [templates, setTemplates] = useState<Record<GmailNotificationEventType, GmailEmailTemplateConfig>>(() =>
    getDefaultGmailEmailTemplates()
  );
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<GmailNotificationEventType>('tardiness_notice');
  const [savingTemplates, setSavingTemplates] = useState<boolean>(false);

  // Queue & Failed Records State
  const [queueRecords, setQueueRecords] = useState<GmailQueueRecord[]>([]);
  const [retryingRecordId, setRetryingRecordId] = useState<string | null>(null);
  const [uncertainRetryConfirmedMap, setUncertainRetryConfirmedMap] = useState<Record<string, boolean>>({});
  const [approvingViolationId, setApprovingViolationId] = useState<string | null>(null);

  const loadAllGmailState = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [statusRes, tplRes, qRes] = await Promise.all([
        fetchGmailConnectionConfig(schoolId),
        fetchGmailTemplates(schoolId),
        fetchGmailQueueRecords(schoolId),
      ]);
      setConfig(statusRes.config);
      setHasClientId(statusRes.hasClientId);
      setClientIdPreview(statusRes.clientIdPreview);
      setHasClientSecret(statusRes.hasClientSecret);
      setHasRefreshToken(statusRes.hasRefreshToken);
      setRedirectUri(statusRes.redirectUri);
      setCloudFunctionsCallbackUri(statusRes.cloudFunctionsCallbackUri);
      if (statusRes.config.connectedEmail) {
        setSenderGmailInput(statusRes.config.connectedEmail);
      }
      setTemplates(tplRes);
      setQueueRecords(qRes);
    } catch (err) {
      console.warn('[GmailPanel] Load notice:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, schoolId]);

  useEffect(() => {
    loadAllGmailState();
  }, [loadAllGmailState]);

  // Listen for OAuth popup callback postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GMAIL_OAUTH_CALLBACK_RESULT') {
        setConnectingOAuth(false);
        if (event.data.success) {
          onShowToast(
            'تم تفويض حساب Gmail الأولي بنجاح! يرجى الآن إجراء «اختبار إرسال رسالة واحدة» لتأكيد الاتصال الفعلي.',
            'info'
          );
          loadAllGmailState();
          setActiveSubTab('testing');
        } else {
          onShowToast(event.data.message || 'فشل إتمام تفويض Gmail', 'error');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadAllGmailState, onShowToast]);

  const handleCopyUri = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedUriKey(key);
    onShowToast('تم نسخ النص إلى الحافظة', 'success');
    setTimeout(() => setCopiedUriKey(null), 2000);
  };

  // Start OAuth 2.0 Authorization Code Flow
  const handleConnectGmail = async () => {
    setConnectingOAuth(true);
    try {
      const res = await startServerGmailOAuthFlow({
        schoolId,
        redirectUri,
      });

      const popup = window.open(
        res.url,
        'fsia_gmail_oauth_popup',
        'width=620,height=720,menubar=no,toolbar=no,location=yes,status=no'
      );

      if (!popup) {
        onShowToast('قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.', 'warning');
        setConnectingOAuth(false);
      }
    } catch (err: any) {
      onShowToast(err.message || 'تعذر بدء عملية ربط حساب Gmail', 'error');
      setConnectingOAuth(false);
    }
  };

  // Disconnect & Revoke OAuth
  const handleDisconnectGmail = async () => {
    setDisconnecting(true);
    try {
      const nextCfg = await disconnectServerGmailOAuth(schoolId);
      setConfig(nextCfg);
      setHasRefreshToken(false);
      onShowToast('تم فصل اتصال حساب Gmail وإلغاء التفويض بنجاح', 'info');
    } catch (err: any) {
      onShowToast(err.message || 'فشل فصل الاتصال', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  // Step 1: Single Real Test Email
  const handleRunSingleTest = async () => {
    if (!singleTestEmail.trim()) {
      onShowToast('يرجى إدخال عنوان بريد إداري معتمد لإجراء الاختبار', 'warning');
      return;
    }
    setRunningSingleTest(true);
    try {
      const res = await runSingleGmailTest({
        schoolId,
        recipientEmail: singleTestEmail.trim(),
        senderEmail: senderGmailInput.trim() || undefined,
      });
      setConfig(res.config);
      onShowToast(
        `نجح اختبار الإرسال الحقيقي! معرّف رسالة Gmail: (${res.gmailMessageId}). أصبح الربط الآن موثقاً.`,
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'فشل اختبار الإرسال الفردي', 'error');
      await loadAllGmailState();
    } finally {
      setRunningSingleTest(false);
    }
  };

  // Step 2: Small Batch Test (up to 3 emails)
  const handleRunBatchTest = async () => {
    if (!batchTestApprovedCheckbox) {
      onShowToast('يرجى تأكيد موافقة المسؤول على تشغيل اختبار الدفعة الصغيرة أولاً', 'warning');
      return;
    }
    const emails = batchTestEmailsText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (emails.length === 0) {
      onShowToast('يرجى إدخال عنوان بريد إلكتروني واحد إلى 3 عناوين لاختبار الدفعة الصغيرة', 'warning');
      return;
    }

    setRunningBatchTest(true);
    try {
      const res = await runSmallBatchGmailTest({
        schoolId,
        recipients: emails,
      });
      setBatchTestResults(res.results);
      setConfig(res.config);
      if (res.success) {
        onShowToast(`نجح اختبار الدفعة الصغيرة (${res.results.length} رسائل) بنجاح!`, 'success');
      } else {
        onShowToast('اكتمل اختبار الدفعة مع وجود أخطاء في بعض العناوين. راجع التفاصيل أدناه.', 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'فشل اختبار الدفعة الصغيرة', 'error');
    } finally {
      setRunningBatchTest(false);
    }
  };

  // Step 3: Toggle Production Auto-Send (Requires Real Test + Admin Approval)
  const handleToggleProductionAutoSend = async (enable: boolean) => {
    if (!config) return;
    if (enable && !config.isVerifiedByRealTest) {
      onShowToast('لا يمكن تفعيل الإرسال التلقائي قبل نجاح «اختبار إرسال رسالة حقيقية» أولاً.', 'error');
      return;
    }
    const adminName =
      (currentUser as any)?.fullName || (currentUser as any)?.name || currentUser?.email || 'المسؤول المعتمد';

    const updated = await saveGmailConnectionConfig(schoolId, {
      adminApprovedProductionSend: enable,
      adminApprovedByName: enable ? adminName : null,
      adminApprovedAt: enable ? new Date().toISOString() : null,
      autoSendEnabled: enable,
      serviceActivatedAt: enable ? config.serviceActivatedAt || new Date().toISOString() : config.serviceActivatedAt,
    });
    setConfig(updated);
    onShowToast(
      enable
        ? 'تم اعتماد وتفعيل الإرسال التلقائي الفعلي للوقائع الجديدة المعتمدة من هذه اللحظة فصاعداً'
        : 'تم إيقاف الإرسال التلقائي لأولياء الأمور',
      enable ? 'success' : 'info'
    );
  };

  // Save Arabic Templates
  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    try {
      await saveGmailTemplates(schoolId, templates);
      onShowToast('تم حفظ قوالب رسائل Gmail العربية المعتمدة بنجاح', 'success');
    } catch {
      onShowToast('تعذر حفظ القوالب', 'error');
    } finally {
      setSavingTemplates(false);
    }
  };

  // Authorized Admin Retry for Failed or Uncertain Queue Items
  const handleAuthorizedRetry = async (record: GmailQueueRecord) => {
    if (record.state === 'uncertain' && !uncertainRetryConfirmedMap[record.id]) {
      onShowToast(
        'تنبيه: هذه الرسالة في «حالة غير مؤكدة». يرجى التأشير على مربع التحقق من عدم وصولها قبل إعادة الإرسال لمنع التكرار.',
        'warning'
      );
      return;
    }

    setRetryingRecordId(record.id);
    try {
      const actor = {
        uid: (currentUser as any)?.uid || (currentUser as any)?.id || 'admin',
        name:
          (currentUser as any)?.fullName || (currentUser as any)?.name || currentUser?.email || 'المسؤول المعتمد',
      };
      const res = await dispatchQueueRecordItem(schoolId, record, actor);
      const refreshed = await fetchGmailQueueRecords(schoolId);
      setQueueRecords(refreshed);

      if (res.state === 'accepted_by_gmail') {
        onShowToast(`نجحت إعادة المحاولة! قَبِل خادم Gmail الرسالة (${res.record.gmailMessageId})`, 'success');
      } else {
        onShowToast(res.reason || 'لم تنجح إعادة المحاولة، راجع سبب الفشل المسجل', 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'خطأ أثناء إعادة المحاولة', 'error');
    } finally {
      setRetryingRecordId(null);
    }
  };

  // Admin Review & Explicit Approval to send a Behavioral Violation via Gmail
  const handleAdminApproveViolationSend = async (violation: ViolationRecord) => {
    const student = students.find(
      (s) => s.id === violation.studentId || s.studentNumber === violation.studentNumber
    );
    if (!student) {
      onShowToast('لم يتم العثور على ملف الطالب المرتبط بهذه المخالفة', 'error');
      return;
    }

    setApprovingViolationId(violation.id);
    try {
      const adminUser = {
        uid: (currentUser as any)?.uid || (currentUser as any)?.id || 'admin',
        name:
          (currentUser as any)?.fullName || (currentUser as any)?.name || currentUser?.email || 'المسؤول المعتمد',
        role: String(currentUser?.role || 'systemAdmin'),
        email: currentUser?.email,
      };
      const res = await approveAndSendViolationGmailNotification({
        schoolId,
        violation,
        student,
        adminUser,
      });

      const refreshed = await fetchGmailQueueRecords(schoolId);
      setQueueRecords(refreshed);

      if (res.state === 'accepted_by_gmail') {
        onShowToast(
          `تم اعتماد المخالفة وقَبِل خادم Gmail إرسال الإشعار لولي أمر الطالب ${student.fullName}`,
          'success'
        );
      } else if (res.state === 'pending') {
        onShowToast(`تم اعتماد إشعار المخالفة وإدراجه في طابور الانتظار للطالب ${student.fullName}`, 'info');
      } else {
        onShowToast(res.reason || 'تعذر إرسال إشعار المخالفة', 'warning');
      }
    } catch (err: any) {
      onShowToast(err.message || 'فشل اعتماد وإرسال المخالفة', 'error');
    } finally {
      setApprovingViolationId(null);
    }
  };

  const failedAndUncertainRecords = useMemo(
    () => queueRecords.filter((r) => r.state === 'failed' || r.state === 'uncertain'),
    [queueRecords]
  );

  // Compute how many students have valid guardian emails
  const studentsWithValidGuardianEmailCount = useMemo(() => {
    return students.filter((s) => extractApprovedGuardianEmail(s).isValid).length;
  }, [students]);

  if (!isAdmin) {
    return (
      <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-8 border-2 border-[#B4232C]/40 text-center space-y-3" dir="rtl">
        <div className="w-14 h-14 rounded-2xl bg-[#B4232C]/10 text-[#B4232C] flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-black text-[#0B2748] dark:text-white">
          إعدادات الربط التلقائي مع بريد Gmail مخصصة للمسؤول المعتمد فقط
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
          وفق السياسة الأمنية لأكاديمية الفجيرة العلمية الإسلامية، لا تظهر إعدادات OAuth 2.0 ومفاتيح الربط وطابور الإرسال التلقائي إلا لحساب المسؤول المعتمد.
        </p>
      </div>
    );
  }

  // Exact Callback Redirect URIs for Google Cloud Console
  const devCallbackUri = 'https://ais-dev-n6qfausxmxkxj6myz7ejzp-619880824865.europe-west1.run.app/api/gmail/oauth/callback';
  const sharedCallbackUri = 'https://ais-pre-n6qfausxmxkxj6myz7ejzp-619880824865.europe-west1.run.app/api/gmail/oauth/callback';

  const statusBadgeInfo = () => {
    if (!config) return { text: 'جاري التحقق...', color: 'bg-slate-200 text-slate-800' };
    switch (config.authorizationStatus) {
      case 'connected_verified':
        return {
          text: 'متصل ومفعّل بعد اختبار حقيقي ناجح',
          color: 'bg-[#147A4A] text-white border-[#147A4A]',
        };
      case 'authorized_pending_test':
        return {
          text: 'مفوّض أولياً — بانتظار نجاح اختبار الإرسال الحقيقي (غير متصل نهائياً بعد)',
          color: 'bg-amber-600 text-white border-amber-500',
        };
      case 'token_expired_or_revoked':
        return {
          text: 'انتهى التفويض أو تم سحبه — يتطلب إعادة ربط',
          color: 'bg-[#B4232C] text-white border-[#B4232C]',
        };
      case 'quota_paused':
        return {
          text: 'موقوف مؤقتاً لبلوغ الحد اليومي لـ Gmail',
          color: 'bg-amber-700 text-white border-amber-600',
        };
      default:
        return {
          text: 'غير مرتبط (Disconnected)',
          color: 'bg-slate-600 text-white border-slate-500',
        };
    }
  };

  const badge = statusBadgeInfo();

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-[#0B2748] text-white rounded-3xl p-6 border-2 border-[#C9A227] shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#12395B] border-2 border-[#C9A227] flex items-center justify-center text-[#C9A227] shrink-0">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  منظومة الربط التلقائي مع حساب Gmail الرسمي (OAuth 2.0 + Cloud Functions)
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#C9A227] text-[#0B2748]">
                  للمسؤول المعتمد فقط
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                أكاديمية الفجيرة العلمية الإسلامية • المشروع السحابي: <span className="font-mono text-[#C9A227]">fujairah-islamic</span> • الصلاحية: <span className="font-mono text-[#C9A227]">gmail.send</span> فقط
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${badge.color}`}>
                  حالة التفويض: {badge.text}
                </span>
                {config?.connectedEmail && (
                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-[#12395B] border border-[#C9A227]/50 text-[#FAF7EF] font-mono">
                    البريد المتصل: {config.connectedEmail}
                  </span>
                )}
                {config?.lastTestSuccessAt && (
                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
                    آخر اختبار ناجح: {new Date(config.lastTestSuccessAt).toLocaleString('ar-AE')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAllGmailState}
              className="px-3.5 py-2 rounded-xl bg-[#12395B] hover:bg-[#1a4b75] text-white border border-[#C9A227]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث الحالة</span>
            </button>
          </div>
        </div>

        {/* Admin Alert Banner if token expired/revoked or quota reached */}
        {config?.adminAlertMessage && (
          <div className="mt-4 p-4 rounded-2xl bg-[#B4232C] text-white border border-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-black text-sm">تنبيه هام للإدارة:</p>
              <p className="mt-0.5">{config.adminAlertMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-[#0B2748] p-2 rounded-2xl border border-slate-200 dark:border-[#12395B]">
        {[
          { id: 'connection', label: '1. الربط الآمن (OAuth 2.0)', icon: KeyRound },
          { id: 'testing', label: '2. الاختبار المتدرج والتفعيل', icon: ShieldCheck },
          { id: 'templates', label: '3. القوالب العربية والحدود اليومية', icon: FileText },
          {
            id: 'violations_approval',
            label: `4. اعتماد إرسال المخالفات (${violations.length})`,
            icon: ShieldAlert,
          },
          { id: 'queue', label: `5. سجل وطابور الإشعارات (${queueRecords.length})`, icon: Activity },
          {
            id: 'failed',
            label: `6. الإشعارات الفاشلة وإعادة المحاولة (${failedAndUncertainRecords.length})`,
            icon: AlertTriangle,
          },
          { id: 'gcp_guide', label: '7. إعداد Google Cloud و Redirect URI', icon: HelpCircle },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                active
                  ? 'bg-[#0B2748] text-[#C9A227] border-2 border-[#C9A227] shadow-xs'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#12395B]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: SECURE CONNECTION (OAuth 2.0 + Secret Manager + Redirect URIs) */}
      {/* ===================================================================== */}
      {activeSubTab === 'connection' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: OAuth Status, Connect & Disconnect Buttons */}
          <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#12395B] pb-4">
              <div>
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                  حالة اتصال حساب Gmail الرسمي للأكاديمية
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                  OAuth 2.0 Authorization Code Flow من الخادم مع <span className="font-mono">access_type=offline</span> والتحقق من <span className="font-mono">state</span>
                </p>
              </div>
              <ShieldCheck className="w-6 h-6 text-[#C9A227]" />
            </div>

            <div className="space-y-3 text-xs bg-[#FAF7EF] dark:bg-[#12395B] p-4 rounded-2xl border border-[#C9A227]/40">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-300">البريد المتصل:</span>
                <span className="font-mono font-black text-[#0B2748] dark:text-white">
                  {config?.connectedEmail || 'غير متصل بعد'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-300">حالة التفويض:</span>
                <span className="font-black text-[#0B2748] dark:text-[#C9A227]">{badge.text}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-300">الصلاحية المطلوبة فقط:</span>
                <span className="font-mono text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md font-bold">
                  https://www.googleapis.com/auth/gmail.send
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-300">تاريخ آخر اختبار ناجح:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {config?.lastTestSuccessAt
                    ? new Date(config.lastTestSuccessAt).toLocaleString('ar-AE')
                    : 'لم يتم إجراء اختبار ناجح بعد'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600 dark:text-slate-300">عزل الأسرار (Secret Manager):</span>
                <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                  {hasClientId && hasClientSecret
                    ? `محفوظ في Secret Manager (${clientIdPreview || 'fujairah-islamic'}) ✓`
                    : 'معزول في Firebase Cloud Functions (Secret Manager)'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Connect Gmail & Disconnect */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={connectingOAuth}
                onClick={handleConnectGmail}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#0B2748] hover:bg-[#12395B] disabled:opacity-50 text-[#C9A227] border-2 border-[#C9A227] font-black text-sm flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all"
              >
                <Link2 className="w-5 h-5" />
                <span>
                  {connectingOAuth
                    ? 'جاري فتح نافذة تفويض Google OAuth 2.0...'
                    : 'ربط حساب Gmail الأكاديمية (OAuth 2.0)'}
                </span>
              </button>

              {(hasRefreshToken || config?.authorizationStatus !== 'disconnected') && (
                <button
                  type="button"
                  disabled={disconnecting}
                  onClick={handleDisconnectGmail}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-[#B4232C] dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Unlink className="w-4 h-4" />
                  <span>{disconnecting ? 'جاري سحب التفويض...' : 'فصل الاتصال وإلغاء التفويض (Revoke Token)'}</span>
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
              <strong>قاعدة الأمان الصارمة:</strong> لا يعتبر النظام حساب Gmail متصلاً بشكل نهائي ولا يفعّل الإرسال التلقائي بمجرد إتمام نافذة OAuth، بل يشترط نجاح <strong>اختبار إرسال رسالة حقيقية</strong> في التبويب التالي أولاً.
            </div>
          </div>

          {/* Right Column: Cloud Functions & Secret Manager Isolation + Exact Redirect URIs */}
          <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-5">
            <div className="border-b border-slate-100 dark:border-[#12395B] pb-4">
              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                عزل الأسرار عبر Google Cloud Secret Manager و Cloud Functions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                تم فصل كود وأسرار Gmail OAuth تماماً عن واجهة React ومتغيرات بيئة المتصفح. لا يُطلب إدخال <span className="font-mono">Client Secret</span> في المتصفح أبداً.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7EF] dark:bg-[#12395B] border border-[#C9A227]/40 space-y-2.5 text-xs">
              <div className="font-black text-[#0B2748] dark:text-[#C9A227]">
                مسارات الأسرار المعزولة في المشروع السحابي (fujairah-islamic):
              </div>
              <ul className="space-y-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200" dir="ltr">
                <li>• projects/fujairah-islamic/secrets/GMAIL_OAUTH_CLIENT_ID</li>
                <li>• projects/fujairah-islamic/secrets/GMAIL_OAUTH_CLIENT_SECRET</li>
                <li>• projects/fujairah-islamic/secrets/GMAIL_OAUTH_REFRESH_TOKEN</li>
              </ul>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                تُقرأ هذه الأسرار حصرياً داخل وظائف <strong>Firebase Cloud Functions</strong> (المنطقة: <span className="font-mono">europe-west1</span>) عبر <span className="font-mono">defineSecret</span> و <span className="font-mono">@google-cloud/secret-manager</span>.
              </p>
            </div>

            {/* Exact Redirect URIs to add in Google Cloud Console */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#12395B] space-y-2.5">
              <h4 className="text-xs font-black text-[#0B2748] dark:text-[#C9A227]">
                عناوين Authorized redirect URIs المطلوب إضافتها في Google Cloud Console:
              </h4>

              {[
                {
                  key: 'cf',
                  label: '1. الرابط الرئيسي لوظيفة Firebase Cloud Functions (europe-west1):',
                  uri: cloudFunctionsCallbackUri,
                },
                {
                  key: 'hosting',
                  label: '2. رابط استضافة Firebase Hosting المربوط بالوظيفة:',
                  uri: 'https://fujairah-islamic.web.app/api/gmail/oauth/callback',
                },
                {
                  key: 'dev',
                  label: '3. رابط بيئة المعاينة الحالية (اختياري للمعاينة):',
                  uri: devCallbackUri,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#12395B] border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUri(item.key, item.uri)}
                      className="text-[11px] font-bold text-[#0B2748] dark:text-[#C9A227] flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUriKey === item.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUriKey === item.key ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-900 dark:text-white break-all select-all" dir="ltr">
                    {item.uri}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: STAGED TESTING & PRODUCTION ACTIVATION GATE                    */}
      {/* ===================================================================== */}
      {activeSubTab === 'testing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stage 1: Single Administrative Email Test */}
            <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border-2 border-[#C9A227]/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#0B2748] text-[#C9A227]">
                  المرحلة الأولى (إلزامية)
                </span>
                {config?.isVerifiedByRealTest ? (
                  <span className="text-xs font-bold text-[#147A4A] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> مكتمل بنجاح
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600">بانتظار التنفيذ</span>
                )}
              </div>

              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                اختبار إرسال رسالة واحدة إلى عنوان إداري معتمد
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                لا يُعتبر حساب Gmail متصلاً ولا يُسمح بتفعيل الإرسال التلقائي قبل نجاح إرسال رسالة حقيقية واحدة عبر Gmail API إلى بريد إداري معتمد.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حساب Gmail المرسل (ينتهي بـ @gmail.com):
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={senderGmailInput}
                    onChange={(e) => setSenderGmailInput(e.target.value)}
                    placeholder="fujairah.academy@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإداري المستلم للاختبار:
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={singleTestEmail}
                    onChange={(e) => setSingleTestEmail(e.target.value)}
                    placeholder="ameer2020vip@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs font-mono"
                  />
                </div>

                <button
                  type="button"
                  disabled={runningSingleTest}
                  onClick={handleRunSingleTest}
                  className="w-full py-3 px-4 rounded-xl bg-[#0B2748] hover:bg-[#12395B] text-[#C9A227] border border-[#C9A227] font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {runningSingleTest ? 'جاري الإرسال الفعلي عبر Gmail API...' : 'إرسال رسالة اختبار حقيقية (1 رسالة)'}
                  </span>
                </button>
              </div>

              {config?.lastTestSuccessAt && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div>✓ آخر اختبار ناجح: {new Date(config.lastTestSuccessAt).toLocaleString('ar-AE')}</div>
                  <div>✓ المستلم: {config.lastTestRecipient}</div>
                  <div className="font-mono">✓ Gmail ID: {config.lastTestMessageId}</div>
                </div>
              )}
            </div>

            {/* Stage 2: Small Batch Test after Admin Approval */}
            <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#12395B] text-white">
                  المرحلة الثانية (اختبار الدفعة)
                </span>
                {config?.isBatchTestVerified ? (
                  <span className="text-xs font-bold text-[#147A4A] flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> مكتمل ({config.lastBatchTestCount} رسائل)
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500">بعد المرحلة 1</span>
                )}
              </div>

              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                اختبار إرسال دفعة صغيرة (1 – 3 رسائل) بعد الموافقة
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                يختبر طابور الإرسال وضبط معدل الطلبات (Rate Limiting) وعزل الرسائل بحيث تصل لكل مستلم رسالة منفصلة تماماً.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    عناوين الاختبار (حتى 3 عناوين مفصولة بفاصلة أو سطر):
                  </label>
                  <textarea
                    rows={2}
                    dir="ltr"
                    value={batchTestEmailsText}
                    onChange={(e) => setBatchTestEmailsText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs font-mono"
                  />
                </div>

                <label className="flex items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchTestApprovedCheckbox}
                    onChange={(e) => setBatchTestApprovedCheckbox(e.target.checked)}
                    className="mt-1"
                  />
                  <span>أوافق بصفتي المسؤول المعتمد على إرسال هذه الدفعة التجريبية الصغيرة.</span>
                </label>

                <button
                  type="button"
                  disabled={runningBatchTest || !config?.isVerifiedByRealTest}
                  onClick={handleRunBatchTest}
                  className="w-full py-3 px-4 rounded-xl bg-[#12395B] hover:bg-[#0B2748] disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {runningBatchTest ? 'جاري إرسال الدفعة الصغيرة بفاصل زمني...' : 'تشغيل اختبار الدفعة الصغيرة'}
                  </span>
                </button>
              </div>

              {batchTestResults.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {batchTestResults.map((r, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-[#12395B] flex items-center justify-between"
                    >
                      <span className="font-mono">{r.recipient}</span>
                      <span
                        className={`font-bold ${
                          r.outcome === 'accepted_by_gmail' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {r.outcome === 'accepted_by_gmail' ? `قبول من Gmail (${r.gmailMessageId})` : r.error}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stage 3: Final Admin Approval & Production Auto-Send Gate */}
            <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#147A4A] text-white">
                  المرحلة الثالثة (قرار الإدارة)
                </span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {studentsWithValidGuardianEmailCount} طالب ببريد ولي أمر معتمد
                </span>
              </div>

              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                اعتماد وتفعيل الإرسال الفعلي لأولياء الأمور
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                لن يتم إرسال أي إشعار فعلي لأولياء الأمور إلا بعد نجاح الاختبار الحقيقي واعتماد المسؤول هنا. لا يتم إرسال إشعارات عن وقائع قديمة مسجلة قبل لحظة التفعيل.
              </p>

              <div className="p-3.5 rounded-2xl bg-[#FAF7EF] dark:bg-[#12395B] border border-[#C9A227]/40 space-y-2.5 text-xs">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold">إشعار التأخير الصباحي بعد اعتماد الواقعة:</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config?.autoSendTardinessOnApprove)}
                    onChange={async (e) => {
                      const next = await saveGmailConnectionConfig(schoolId, {
                        autoSendTardinessOnApprove: e.target.checked,
                      });
                      setConfig(next);
                    }}
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold">إشعار الغياب المدرسي بعد اعتماد الواقعة:</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config?.autoSendAbsenceOnApprove)}
                    onChange={async (e) => {
                      const next = await saveGmailConnectionConfig(schoolId, {
                        autoSendAbsenceOnApprove: e.target.checked,
                      });
                      setConfig(next);
                    }}
                  />
                </label>

                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <span className="font-bold">إشعار المخالفات السلوكية:</span>
                  <span className="text-[11px] font-black">بعد مراجعة المسؤول واعتماد الإرسال فقط ✓</span>
                </div>
              </div>

              {config?.autoSendEnabled ? (
                <button
                  type="button"
                  onClick={() => handleToggleProductionAutoSend(false)}
                  className="w-full py-3 px-4 rounded-xl bg-[#B4232C] hover:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>إيقاف الإرسال التلقائي لأولياء الأمور</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!config?.isVerifiedByRealTest}
                  onClick={() => handleToggleProductionAutoSend(true)}
                  className="w-full py-3 px-4 rounded-xl bg-[#147A4A] hover:bg-emerald-800 disabled:opacity-40 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>موافقة الإدارة وتفعيل الإرسال التلقائي الفعلي</span>
                </button>
              )}

              {config?.serviceActivatedAt && (
                <p className="text-[11px] text-slate-500 dark:text-slate-300">
                  تاريخ بدء سريان الخدمة (حماية الوقائع القديمة):{' '}
                  <span className="font-bold">{new Date(config.serviceActivatedAt).toLocaleString('ar-AE')}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: EDITABLE ARABIC TEMPLATES & GMAIL QUOTA / RATE LIMITS          */}
      {/* ===================================================================== */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-[#12395B] pb-4">
              <div>
                <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                  القوالب العربية الرسمية القابلة للتعديل
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  تُنشأ رسالة منفصلة لكل ولي أمر دون كشف بيانات طلاب آخرين أو تضمين ملاحظات نفسية حساسة
                </p>
              </div>
              <div className="flex gap-1.5">
                {(['tardiness_notice', 'absence_notice', 'violation_notice'] as GmailNotificationEventType[]).map(
                  (key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTemplateKey(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        selectedTemplateKey === key
                          ? 'bg-[#0B2748] text-[#C9A227] border border-[#C9A227]'
                          : 'bg-slate-100 dark:bg-[#12395B] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {getNotificationTypeLabel(key)}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                  عنوان البريد الإلكتروني (Subject):
                </label>
                <input
                  type="text"
                  value={templates[selectedTemplateKey]?.subjectTemplate || ''}
                  onChange={(e) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [selectedTemplateKey]: {
                        ...prev[selectedTemplateKey],
                        subjectTemplate: e.target.value,
                        updatedAt: new Date().toISOString(),
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 mb-1">
                  نص الرسالة الرسمي (Body):
                </label>
                <textarea
                  rows={11}
                  value={templates[selectedTemplateKey]?.bodyTemplate || ''}
                  onChange={(e) =>
                    setTemplates((prev) => ({
                      ...prev,
                      [selectedTemplateKey]: {
                        ...prev[selectedTemplateKey],
                        bodyTemplate: e.target.value,
                        updatedAt: new Date().toISOString(),
                      },
                    }))
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FAF7EF] dark:bg-[#12395B] text-[11px] text-slate-600 dark:text-slate-300">
                <strong>المتغيرات الآمنة المتاحة:</strong>{' '}
                <span className="font-mono">
                  {'{guardianName}'} • {'{studentName}'} • {'{studentNumber}'} • {'{grade}'} • {'{section}'} •{' '}
                  {'{incidentDate}'} • {'{arrivalTime}'} • {'{absenceStatus}'} • {'{violationTitle}'} •{' '}
                  {'{violationDegree}'} • {'{actionTaken}'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTemplates(getDefaultGmailEmailTemplates())}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#12395B] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  استعادة النص الافتراضي
                </button>
                <button
                  type="button"
                  disabled={savingTemplates}
                  onClick={handleSaveTemplates}
                  className="px-5 py-2.5 rounded-xl bg-[#0B2748] text-[#C9A227] border border-[#C9A227] text-xs font-black flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTemplates ? 'جاري الحفظ...' : 'حفظ القوالب العربية'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quota & Rate Limit Controls */}
          <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
            <h3 className="text-base font-black text-[#0B2748] dark:text-white">
              ضبط معدل الطلبات وحدود حساب Gmail اليومية
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              تفرض حسابات Gmail العادية (<span className="font-mono">@gmail.com</span>) حداً يومياً للإرسال عبر Gmail API. يقوم النظام بإيقاف المحاولات تلقائياً وتنبيه الإدارة عند بلوغ الحد المحدد.
            </p>

            <div className="p-4 rounded-2xl bg-[#FAF7EF] dark:bg-[#12395B] border border-[#C9A227]/40 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold">الرسائل المرسلة اليوم ({config?.dailyCounterDate}):</span>
                <span className="font-black text-base text-[#0B2748] dark:text-[#C9A227]">
                  {config?.dailySentCount || 0} / {config?.dailyLimitMax || 400}
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#147A4A]"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((config?.dailySentCount || 0) / (config?.dailyLimitMax || 400)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  الحد اليومي الأقصى للإرسال (رسالة / يوم):
                </label>
                <input
                  type="number"
                  min={10}
                  max={480}
                  value={config?.dailyLimitMax || 400}
                  onChange={async (e) => {
                    const val = Math.min(480, Math.max(10, Number(e.target.value) || 400));
                    const next = await saveGmailConnectionConfig(schoolId, { dailyLimitMax: val });
                    setConfig(next);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  الفاصل الزمني بين رسائل الطابور (مللي ثانية):
                </label>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={250}
                  value={config?.rateLimitDelayMs || 1500}
                  onChange={async (e) => {
                    const val = Math.max(500, Number(e.target.value) || 1500);
                    const next = await saveGmailConnectionConfig(schoolId, { rateLimitDelayMs: val });
                    setConfig(next);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#12395B] text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: ADMIN REVIEW & APPROVAL FOR BEHAVIORAL VIOLATIONS              */}
      {/* ===================================================================== */}
      {activeSubTab === 'violations_approval' && (
        <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#12395B] pb-4">
            <div>
              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                مراجعة المسؤول واعتماد إرسال المخالفات السلوكية عبر Gmail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                تطبيقاً للقاعدة المعتمدة: لا تُرسل إشعارات المخالفات السلوكية تلقائياً عند الرصد، بل تتطلب مراجعة المسؤول واعتماد الإرسال لكل واقعة.
              </p>
            </div>
          </div>

          {violations.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">لا توجد مخالفات سلوكية مسجلة حالياً.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#12395B] text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-black">الطالب</th>
                    <th className="p-3 font-black">الصف / الشعبة</th>
                    <th className="p-3 font-black">المخالفة والدرجة</th>
                    <th className="p-3 font-black">تاريخ الواقعة</th>
                    <th className="p-3 font-black">بريد ولي الأمر المعتمد</th>
                    <th className="p-3 font-black">حالة إشعار Gmail</th>
                    <th className="p-3 font-black">إجراء المسؤول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {violations.slice(0, 50).map((v) => {
                    const st = students.find(
                      (s) => s.id === v.studentId || s.studentNumber === v.studentNumber
                    );
                    const guardian = st ? extractApprovedGuardianEmail(st) : null;
                    const existingQueueItem = queueRecords.find(
                      (q) => q.incidentId === v.id && q.notificationType === 'violation_notice'
                    );
                    const stateBadge = existingQueueItem ? getGmailQueueStateBadge(existingQueueItem.state) : null;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-[#12395B]/40">
                        <td className="p-3 font-bold">
                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile?.(v.studentId || v.studentNumber)}
                            className="text-[#0B2748] dark:text-[#C9A227] hover:underline font-black cursor-pointer"
                          >
                            {v.studentName}
                          </button>
                          <div className="text-[10px] text-slate-500 font-mono">#{v.studentNumber}</div>
                        </td>
                        <td className="p-3">
                          {v.grade} / {v.section}
                        </td>
                        <td className="p-3">
                          <div className="font-bold">{v.violationType}</div>
                          <div className="text-[11px] text-slate-500">{v.violationDegree}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px]">{v.incidentDateTime}</td>
                        <td className="p-3">
                          {guardian?.isValid ? (
                            <div>
                              <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">
                                {guardian.email}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {guardian.guardianName} ({guardian.guardianRelation})
                              </div>
                            </div>
                          ) : (
                            <span className="text-rose-600 font-bold text-[11px]">
                              {guardian?.reason || 'غير متوفر في ملف الطالب'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {stateBadge ? (
                            <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${stateBadge.className}`}>
                              {stateBadge.label}
                            </span>
                          ) : (
                            <span className="text-slate-400">لم يُعتمد للإرسال بعد</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            disabled={
                              approvingViolationId === v.id ||
                              existingQueueItem?.state === 'accepted_by_gmail'
                            }
                            onClick={() => handleAdminApproveViolationSend(v)}
                            className="px-3 py-1.5 rounded-xl bg-[#0B2748] hover:bg-[#12395B] disabled:opacity-40 text-[#C9A227] border border-[#C9A227] font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {existingQueueItem?.state === 'accepted_by_gmail'
                                ? 'تم القبول من Gmail'
                                : approvingViolationId === v.id
                                ? 'جاري الاعتماد...'
                                : 'اعتماد المسؤول وإرسال'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: FULL AUDIT LOG & QUEUE STATUSES                                */}
      {/* ===================================================================== */}
      {activeSubTab === 'queue' && (
        <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#12395B] pb-4">
            <div>
              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                سجل التوثيق والمتابعة لطابور إشعارات Gmail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                الحالات المعتمدة: انتظار • معالجة • قبول من Gmail (لا يعني تأكيد قراءة المستلم) • فشل • حالة غير مؤكدة
              </p>
            </div>
          </div>

          {queueRecords.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              لا توجد محاولات إرسال مسجلة في طابور Gmail حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#12395B] text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-black">الطالب والرقم المدرسي</th>
                    <th className="p-3 font-black">نوع الإشعار والواقعة</th>
                    <th className="p-3 font-black">ولي الأمر والبريد</th>
                    <th className="p-3 font-black">الموظف المعتمد</th>
                    <th className="p-3 font-black">حالة الإرسال الذرية</th>
                    <th className="p-3 font-black">معرّف الطلب / Gmail ID</th>
                    <th className="p-3 font-black">التوقيت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {queueRecords.map((rec) => {
                    const stBadge = getGmailQueueStateBadge(rec.state);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 dark:hover:bg-[#12395B]/40">
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => onOpenStudentProfile?.(rec.studentId || rec.studentNumber)}
                            className="font-black text-[#0B2748] dark:text-[#C9A227] hover:underline cursor-pointer"
                          >
                            {rec.studentName}
                          </button>
                          <div className="text-[10px] text-slate-500 font-mono">
                            #{rec.studentNumber} • {rec.grade}/{rec.section}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold">{getNotificationTypeLabel(rec.notificationType)}</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.incidentTitle} ({rec.incidentDate})
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold">
                            {rec.guardianName} ({rec.guardianRelation})
                          </div>
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {rec.recipientEmail || 'غير متوفر'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold">{rec.approvedByName}</div>
                          <div className="text-[10px] text-slate-500">{rec.approvedByRole}</div>
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-black ${stBadge.className}`}>
                            {stBadge.label}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1">{stBadge.subtitle}</div>
                          {rec.failureReason && (
                            <div className="text-[10px] text-rose-600 font-bold mt-0.5">{rec.failureReason}</div>
                          )}
                          {rec.uncertainReason && (
                            <div className="text-[10px] text-amber-700 font-bold mt-0.5">{rec.uncertainReason}</div>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[10px]">
                          <div>Req: {rec.idempotencyKey.slice(0, 22)}...</div>
                          {rec.gmailMessageId && (
                            <div className="text-emerald-700 dark:text-emerald-300 font-bold">
                              Gmail ID: {rec.gmailMessageId}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {new Date(rec.updatedAt).toLocaleString('ar-AE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: CONCISE FAILED & UNCERTAIN NOTIFICATIONS + AUTHORIZED RETRY     */}
      {/* ===================================================================== */}
      {activeSubTab === 'failed' && (
        <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#12395B] pb-4">
            <div>
              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                صفحة الإشعارات الفاشلة وغير المؤكدة وإعادة المحاولة المصرح بها
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                تتيح للمسؤول المعتمد مراجعة سبب الفشل أو عدم اليقين وإعادة المحاولة بأمان دون تكرار عشوائي
              </p>
            </div>
          </div>

          {failedAndUncertainRecords.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#147A4A] mx-auto" />
              <p className="text-sm font-black text-[#0B2748] dark:text-white">
                لا توجد إشعارات فاشلة أو غير مؤكدة حالياً
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {failedAndUncertainRecords.map((rec) => {
                const stBadge = getGmailQueueStateBadge(rec.state);
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#12395B]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-md border font-black text-[11px] ${stBadge.className}`}>
                          {stBadge.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenStudentProfile?.(rec.studentId || rec.studentNumber)}
                          className="font-black text-sm text-[#0B2748] dark:text-[#C9A227] hover:underline cursor-pointer"
                        >
                          {rec.studentName} (#{rec.studentNumber})
                        </button>
                        <span className="text-slate-500">
                          • {getNotificationTypeLabel(rec.notificationType)} ({rec.incidentDate})
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        المستلم: <strong>{rec.guardianName}</strong> ({rec.guardianRelation}) —{' '}
                        <span className="font-mono">{rec.recipientEmail || 'بدون بريد'}</span> • عدد المحاولات:{' '}
                        <strong>{rec.attemptCount}</strong>
                      </div>
                      <div className="text-rose-700 dark:text-rose-300 font-bold">
                        السبب المسجل: {rec.failureReason || rec.uncertainReason}
                      </div>

                      {rec.state === 'uncertain' && (
                        <label className="flex items-center gap-2 pt-1 text-amber-800 dark:text-amber-300 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(uncertainRetryConfirmedMap[rec.id])}
                            onChange={(e) =>
                              setUncertainRetryConfirmedMap((prev) => ({
                                ...prev,
                                [rec.id]: e.target.checked,
                              }))
                            }
                          />
                          <span>
                            تأكدت من صندوق «البريد المرسل» في Gmail بعدم خروج هذه الرسالة وأوافق على إعادة الإرسال.
                          </span>
                        </label>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenStudentProfile?.(rec.studentId || rec.studentNumber)}
                        className="px-3 py-2 rounded-xl bg-white dark:bg-[#0B2748] border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                      >
                        فتح ملف الطالب
                      </button>
                      <button
                        type="button"
                        disabled={retryingRecordId === rec.id}
                        onClick={() => handleAuthorizedRetry(rec)}
                        className="px-4 py-2 rounded-xl bg-[#0B2748] hover:bg-[#12395B] text-[#C9A227] border border-[#C9A227] text-xs font-black flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${retryingRecordId === rec.id ? 'animate-spin' : ''}`} />
                        <span>
                          {retryingRecordId === rec.id ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة المصرح بها'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: GOOGLE APPS SCRIPT + SHEETS BRIDGE (SPARK PLAN) & GCP GUIDE    */}
      {/* ===================================================================== */}
      {activeSubTab === 'gcp_guide' && (
        <div className="bg-white dark:bg-[#0B2748] rounded-3xl p-6 border border-slate-200 dark:border-[#12395B] space-y-5 text-xs leading-relaxed">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#12395B] pb-4">
            <div>
              <h3 className="text-base font-black text-[#0B2748] dark:text-white">
                دليل التشغيل المجاني على خطة Spark (Google Apps Script + Google Sheets Bridge)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                بدون استخدام Firebase Cloud Functions، وبدون كشف أي مفاتيح حسابات خدمة في الواجهة الأمامية
              </p>
            </div>
            {config?.appsScriptLastHeartbeatAt && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 font-bold text-[11px]">
                آخر اتصال من Apps Script: {new Date(config.appsScriptLastHeartbeatAt).toLocaleString('ar-AE')}
                {typeof config.remainingDailyQuota === 'number' && ` • المتبقي اليوم: ${config.remainingDailyQuota}`}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF7EF] dark:bg-[#12395B] border border-[#C9A227]/40 space-y-2">
              <h4 className="font-black text-sm text-[#0B2748] dark:text-[#C9A227]">
                أولاً: استضافة الكود داخل حساب Gmail الأكاديمي (خطة Spark المجانية)
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-200">
                <li>
                  تم إنشاء ملفات السكربت الكاملة في المشروع ضمن المجلد:{' '}
                  <span className="font-mono font-bold">scripts/google-apps-script/Code.gs</span> و{' '}
                  <span className="font-mono font-bold">scripts/google-apps-script/appsscript.json</span>.
                </li>
                <li>
                  سجل الدخول بحساب Gmail الأكاديمي وافتح <span className="font-mono font-bold">script.google.com</span>، ثم أنشئ مشروعاً جديداً والصق محتوى الملفين.
                </li>
                <li>
                  شغّل الدالة <span className="font-mono font-bold">initializeAcademyNotificationBridge</span> مرة واحدة لإنشاء جدول <strong>Google Sheets</strong> الوسيط (الجسر الآمن) الذي يتولى قراءة طلبات الإشعارات المعتمدة من قاعدة البيانات الفعلية{' '}
                  <span className="font-mono">ai-studio-7049e193-0b31-400e-a46c-4163cfd4f315</span> عبر رمز التفويض الأصلي <span className="font-mono">ScriptApp.getOAuthToken()</span> دون أي مفاتيح سرية في المتصفح.
                </li>
                <li>
                  شغّل الدالة <span className="font-mono font-bold">runSafeAdminTest</span> لإرسال رسالة اختبار آمنة إلى بريد المسؤول المعتمد فقط (<span className="font-mono">ameer2020vip@gmail.com</span>).
                </li>
                <li>
                  شغّل الدالة <span className="font-mono font-bold">setupTimeDrivenTriggerEvery5Minutes</span> لتفعيل الجدولة الزمنية التلقائية (Time-Driven Trigger كل 5 دقائق) مع الالتزام التام بفحص <span className="font-mono">MailApp.getRemainingDailyQuota()</span> وحدّ 100 مستلم/يوم.
                </li>
              </ol>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF7EF] dark:bg-[#12395B] border border-[#C9A227]/40 space-y-2">
              <h4 className="font-black text-sm text-[#0B2748] dark:text-[#C9A227]">
                ثانياً: ملف البيان المطلوب في Apps Script (appsscript.json)
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                يمنح السكربت صلاحيات إرسال البريد، وجسر Google Sheets، والاتصال بـ Firestore REST API دون إنشاء Web App عام:
              </p>
              <pre
                dir="ltr"
                className="p-3 rounded-xl bg-[#0B2748] text-[#C9A227] font-mono text-[11px] overflow-x-auto"
              >{`{
  "timeZone": "Asia/Dubai",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.send_mail",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}`}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
