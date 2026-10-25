import React, { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  GraduationCap,
  School,
  Moon,
  Sun,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { auth, db, isFirebaseReady, reconnectFirestore } from '../firebase/config';
import { AppUser, RegistrationRequest } from '../types';
import {
  checkUserRegistrationStatus,
  translateFirebaseAuthError,
  AuthStateResolution,
} from '../firebase/auth';
import { RefreshCw } from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface LoginPageProps {
  onLogin: (user: AppUser) => void;
  onAuthResolved?: (resolution: AuthStateResolution) => void;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  initialAuthResolution?: AuthStateResolution | null;
  onOpenPublicPortal?: () => void;
}

interface DiagnosticErrorInfo {
  stage: 'Firebase Authentication (Google Sign-In)' | 'Firestore Database (users/{uid} check)' | 'System';
  stageArabic: string;
  code: string;
  message: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onAuthResolved,
  onShowToast,
  isDarkMode = false,
  onToggleDarkMode,
  initialAuthResolution,
  onOpenPublicPortal,
}) => {
  const { schoolSettings } = useSchoolSettings();
  const [errorMsg, setErrorMsg] = useState('');
  const [diagnosticError, setDiagnosticError] = useState<DiagnosticErrorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [authenticatedGoogleUser, setAuthenticatedGoogleUser] = useState<FirebaseUser | null>(
    auth?.currentUser || null
  );

  // Synchronize initial resolution if present (e.g., from onAuthStateChanged firestore_error)
  useEffect(() => {
    if (initialAuthResolution && initialAuthResolution.status === 'firestore_error') {
      setAuthenticatedGoogleUser(initialAuthResolution.fbUser);
      setDiagnosticError({
        stage: 'Firestore Database (users/{uid} check)',
        stageArabic: 'نجح تسجيل الدخول عبر Google ولكن تعذر الاتصال بـ Cloud Firestore',
        code: initialAuthResolution.error?.code || 'unavailable',
        message: initialAuthResolution.error?.message || String(initialAuthResolution.error),
      });
    } else if (auth?.currentUser && !authenticatedGoogleUser) {
      setAuthenticatedGoogleUser(auth.currentUser);
    }
  }, [initialAuthResolution, authenticatedGoogleUser]);

  // Reconnect and retry reading users/{uid} without signing the user out
  const handleReconnectAndRetry = async () => {
    const targetUser = authenticatedGoogleUser || auth?.currentUser;
    if (!targetUser) {
      setErrorMsg('يرجى تسجيل الدخول بحساب Google أولاً');
      return;
    }

    setIsReconnecting(true);
    onShowToast('جاري إعادة الاتصال بـ Cloud Firestore واسترجاع ملف المستخدم...', 'info');

    try {
      await reconnectFirestore();
      const resolution = await checkUserRegistrationStatus(targetUser);

      // Successfully resolved
      setDiagnosticError(null);
      setErrorMsg('');

      if (onAuthResolved) {
        onAuthResolved(resolution);
      }

      if (resolution.status === 'approved') {
        onLogin(resolution.appUser);
        onShowToast(`مرحباً بك يا ${resolution.appUser.fullName}`, 'success');
      } else if (resolution.status === 'not_registered') {
        onShowToast('يرجى استكمال بيانات طلب إنشاء الحساب', 'info');
      } else if (resolution.status === 'pending') {
        onShowToast('طلبك قيد المراجعة والاعتماد من قبل إدارة النظام', 'info');
      } else if (resolution.status === 'rejected') {
        onShowToast('تم رفض طلب التسجيل السابق. يمكنك تعديل البيانات وإعادة الإرسال', 'warning');
      }
    } catch (retryErr: any) {
      console.error('[Firestore Reconnect and getDoc Retry Error]:', retryErr);
      setDiagnosticError({
        stage: 'Firestore Database (users/{uid} check)',
        stageArabic: 'نجح تسجيل Google ولكن تعذر قراءة users/{uid} أثناء إعادة الاتصال',
        code: retryErr?.code || 'unavailable',
        message: retryErr?.message || String(retryErr),
      });
      onShowToast('تعذر الاتصال بـ Firestore، يرجى المحاولة مرة أخرى', 'error');
    } finally {
      setIsReconnecting(false);
    }
  };

  // Sign in with Google using popup and separated diagnostics
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setDiagnosticError(null);

    if (!isFirebaseReady || !auth || !db) {
      setErrorMsg('لم يتم ربط قاعدة البيانات بعد. يرجى التحقق من اتصال Firebase.');
      return;
    }

    setIsLoading(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    // 1. Firebase Authentication stage (signInWithPopup first)
    let fbUser: FirebaseUser;
    try {
      const userCred = await signInWithPopup(auth, provider);
      fbUser = userCred.user;
      setAuthenticatedGoogleUser(fbUser);
    } catch (authError: any) {
      // 3. Print full error details in Console using console.error
      console.error('[Firebase Authentication Error Details]:', authError);

      // 6. Do NOT use signInWithRedirect inside iframe unless error is specifically auth/popup-blocked
      if (authError?.code === 'auth/popup-blocked') {
        try {
          console.warn('Popup was blocked by browser (auth/popup-blocked). Attempting signInWithRedirect fallback...');
          onShowToast('جاري التحويل لصفحة تسجيل الدخول بحساب Google...', 'info');
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr: any) {
          console.error('[Firebase Auth signInWithRedirect Error Details]:', redirectErr);
          setDiagnosticError({
            stage: 'Firebase Authentication (Google Sign-In)',
            stageArabic: 'فشل المصادقة أثناء التحويل (signInWithRedirect)',
            code: redirectErr?.code || 'auth/redirect-error',
            message: redirectErr?.message || String(redirectErr),
          });
          setIsLoading(false);
          return;
        }
      }

      // Other Auth errors
      setDiagnosticError({
        stage: 'Firebase Authentication (Google Sign-In)',
        stageArabic: 'فشل في تسجيل الدخول عبر Google (Firebase Authentication)',
        code: authError?.code || 'auth/unknown-code',
        message: authError?.message || String(authError),
      });
      setIsLoading(false);
      return;
    }

    // 2. Separate Firestore Database stage: resolving users/{uid} & registrationRequests/{uid}
    let resolution: AuthStateResolution;
    try {
      resolution = await checkUserRegistrationStatus(fbUser);
    } catch (firestoreError: any) {
      console.warn('[Firestore users/{uid} check notice]:', firestoreError);
      const errCode = String(firestoreError?.code || '').toLowerCase();
      const errMsg = String(firestoreError?.message || '').toLowerCase();

      // If user document is missing or not found, do not show an error; open the registration request page
      if (
        errCode === 'not-found' ||
        errMsg.includes('not found') ||
        errMsg.includes('does not exist')
      ) {
        resolution = { status: 'not_registered', fbUser };
      } else {
        // Keep fbUser authenticated in component state; do not log user out
        setAuthenticatedGoogleUser(fbUser);
        setDiagnosticError({
          stage: 'Firestore Database (users/{uid} check)',
          stageArabic: 'نجح تسجيل الدخول عبر Google ولكن تعذر الاتصال بـ Cloud Firestore (users/{uid})',
          code: firestoreError?.code || 'unavailable',
          message: firestoreError?.message || String(firestoreError),
        });
        setIsLoading(false);
        return;
      }
    }

    // 3. Handle resolution status
    try {
      if (onAuthResolved) {
        onAuthResolved(resolution);
      }

      if (resolution.status === 'approved') {
        onLogin(resolution.appUser);
        onShowToast(`مرحباً بك يا ${resolution.appUser.fullName}`, 'success');
      } else if (resolution.status === 'not_registered') {
        onShowToast('يرجى استكمال بيانات طلب إنشاء الحساب', 'info');
      } else if (resolution.status === 'pending') {
        onShowToast('طلبك قيد المراجعة والاعتماد من قبل إدارة النظام', 'info');
      } else if (resolution.status === 'rejected') {
        onShowToast('تم رفض طلب التسجيل السابق. يمكنك تعديل البيانات وإعادة الإرسال', 'warning');
      } else if (resolution.status === 'deactivated') {
        setDiagnosticError({
          stage: 'System',
          stageArabic: 'الحساب معطل',
          code: 'auth/account-deactivated',
          message: 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة مدير النظام.',
        });
        await signOut(auth);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 relative" dir="rtl">
      {/* Top Controls: Status & Theme Toggle */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>بوابة الدخول الرسمية • Google Auth</span>
        </div>

        {onToggleDarkMode && (
          <button
            type="button"
            id="btn-login-theme-toggle"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>الوضع النهاري</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>الوضع الليلي</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#12395B] rounded-2xl shadow-xl border-2 border-[#C9A227]/60 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-[#0B2748] text-white p-6 text-center relative border-b-4 border-[#C9A227]">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-[#0B2748] to-[#12395B] border-2 border-[#C9A227] flex items-center justify-center text-[#C9A227] shadow-lg">
            <GraduationCap className="w-9 h-9" />
          </div>
          <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#C9A227]/20 text-[#C9A227] border border-[#C9A227]/40 mb-1.5">
            دولة الإمارات العربية المتحدة • إمارة الفجيرة
          </span>
          <h2 className="text-xl font-extrabold text-white">
            أكاديمية الفجيرة العلمية الإسلامية
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            {schoolSettings.schoolCycle} • العام الدراسي {schoolSettings.academicYear}
          </p>
          <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-center gap-1.5 text-xs text-[#C9A227] font-semibold">
            <School className="w-4 h-4" />
            <span>البوابة الرقمية الموحدة ونظام الرعاية الطلابية الذكي</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              تسجيل الدخول للنظام
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              الدخول موحد وموثق لجميع الكوادر التربوية عبر حساب Google المؤسسي
            </p>
          </div>

          {!isFirebaseReady && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>جاري تهيئة الاتصال بقاعدة البيانات السحابية...</span>
            </div>
          )}

          {(diagnosticError || errorMsg) && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-2 w-full text-right">
                {diagnosticError ? (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-rose-200/80 dark:border-rose-800/80 pb-1.5">
                      <span className="font-bold text-slate-900 dark:text-rose-100">
                        {diagnosticError.stageArabic}
                      </span>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 font-semibold shrink-0"
                        dir="ltr"
                      >
                        {diagnosticError.stage}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-rose-200">رمز الخطأ (error.code):</span>
                      <code
                        className="font-mono font-bold text-rose-900 dark:text-rose-100 bg-rose-200/70 dark:bg-rose-900/80 px-2 py-0.5 rounded text-[11px] select-all border border-rose-300 dark:border-rose-700"
                        dir="ltr"
                      >
                        {diagnosticError.code}
                      </code>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 dark:text-rose-200">تفاصيل رسالة الخطأ (error.message):</span>
                      <div
                        className="font-mono text-[11px] text-rose-900 dark:text-rose-200 bg-white/80 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-800/80 p-2.5 rounded-lg break-all select-all leading-normal"
                        dir="ltr"
                      >
                        {diagnosticError.message}
                      </div>
                    </div>

                    {(diagnosticError.code === 'unavailable' ||
                      diagnosticError.message.toLowerCase().includes('offline') ||
                      diagnosticError.message.toLowerCase().includes('unavailable') ||
                      authenticatedGoogleUser) && (
                      <div className="pt-2 border-t border-rose-200/80 dark:border-rose-800/80">
                        <button
                          type="button"
                          id="btn-reconnect-firestore"
                          disabled={isReconnecting}
                          onClick={handleReconnectAndRetry}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                          <span>{isReconnecting ? 'جاري إعادة الاتصال واسترجاع البيانات...' : 'إعادة الاتصال'}</span>
                        </button>
                        {authenticatedGoogleUser && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1.5 text-center font-mono" dir="ltr">
                            Google session active: {authenticatedGoogleUser.email}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span>{errorMsg}</span>
                )}
              </div>
            </div>
          )}

          {/* Prominent Center Google Button */}
          <div className="py-2">
            <button
              type="button"
              id="btn-google-signin"
              onClick={handleGoogleLogin}
              disabled={isLoading || !isFirebaseReady}
              className="w-full py-3.5 px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-black rounded-2xl text-sm border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <>
                  <Clock className="w-5 h-5 animate-spin text-[#006D77] dark:text-teal-400" />
                  <span>جاري تسجيل الدخول بحساب Google...</span>
                </>
              ) : (
                <>
                  {/* Official Google 4-Color Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    تسجيل الدخول بحساب Google
                  </span>
                </>
              )}
            </button>
          </div>

          {onOpenPublicPortal && (
            <button
              type="button"
              onClick={onOpenPublicPortal}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0B2748] hover:bg-[#12395B] text-[#C9A227] font-bold text-xs border border-[#C9A227]/50 transition-colors cursor-pointer"
            >
              العودة لتصفح البوابة الرسمية لأكاديمية الفجيرة العلمية الإسلامية
            </button>
          )}

          {/* Security & Access Notice */}
          <div className="p-3.5 bg-[#FAF7EF] dark:bg-slate-900/60 border border-[#C9A227]/30 rounded-xl text-[11px] text-slate-600 dark:text-slate-300 text-center space-y-1">
            <div className="flex items-center justify-center gap-1 font-bold text-[#0B2748] dark:text-[#C9A227]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#147A4A]" />
              <span>نظام رسمي موثق ومحمي بقواعد الأمان – أكاديمية الفجيرة العلمية الإسلامية</span>
            </div>
            <p className="leading-relaxed">
              إذا لم يكن لديك حساب معتمد مسبقاً، سيتم توجيهك مباشرة لصفحة تقديم طلب إنشاء الحساب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
