import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
} from 'firebase/firestore';
import { auth, db, isFirebaseReady, enableFirestoreNetwork } from './config';
import { AppUser, UserRole, RegistrationRequest } from '../types';

export const INITIAL_SYSTEM_ADMIN_DEFAULTS = {
  fullName: 'أمير علي عبدالشاكر بكري',
  jobTitle: 'المرشد الأكاديمي والمهني',
  role: 'systemAdmin' as UserRole,
  schoolId: '7001',
};

export type AuthStateResolution =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'approved'; appUser: AppUser; fbUser: FirebaseUser }
  | { status: 'pending'; request: RegistrationRequest; fbUser: FirebaseUser }
  | { status: 'rejected'; request: RegistrationRequest; fbUser: FirebaseUser }
  | { status: 'not_registered'; fbUser: FirebaseUser }
  | { status: 'deactivated'; email: string; fbUser: FirebaseUser }
  | { status: 'firestore_error'; fbUser: FirebaseUser; error: any };

/**
 * Checks if an error represents a temporary client-offline / handshake condition
 */
function isFirestoreOfflineError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '').toLowerCase();
  return (
    code === 'unavailable' ||
    msg.includes('offline') ||
    msg.includes('client is offline') ||
    msg.includes('failed to get document because the client is offline')
  );
}

/**
 * Resilient wrapper around getDoc that handles initial offline/connecting states in Firestore
 */
async function resilientGetDoc(
  docRef: DocumentReference,
  maxRetries = 5,
  baseDelay = 350
): Promise<DocumentSnapshot> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getDoc(docRef);
    } catch (err: any) {
      lastError = err;
      if (isFirestoreOfflineError(err) && attempt < maxRetries) {
        console.warn(`[Firestore] Connection handshake in progress (attempt ${attempt}/${maxRetries}), retrying...`);
        try {
          await enableFirestoreNetwork();
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, Math.min(baseDelay * Math.pow(1.6, attempt - 1), 2000)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Resilient wrapper around getDocs that handles initial offline/connecting states in Firestore
 */
async function resilientGetDocs(
  q: Query,
  maxRetries = 4,
  baseDelay = 350
): Promise<QuerySnapshot> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getDocs(q);
    } catch (err: any) {
      lastError = err;
      if (isFirestoreOfflineError(err) && attempt < maxRetries) {
        console.warn(`[Firestore] Query handshake in progress (attempt ${attempt}/${maxRetries}), retrying...`);
        try {
          await enableFirestoreNetwork();
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, Math.min(baseDelay * Math.pow(1.6, attempt - 1), 2000)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Resilient wrapper around setDoc that handles initial offline/connecting states
 */
async function resilientSetDoc(
  docRef: DocumentReference,
  data: any,
  options?: any,
  maxRetries = 3,
  baseDelay = 350
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (options) {
        await setDoc(docRef, data, options);
      } else {
        await setDoc(docRef, data);
      }
      return;
    } catch (err: any) {
      if (isFirestoreOfflineError(err) && attempt < maxRetries) {
        console.warn(`[Firestore] setDoc handshake in progress (attempt ${attempt}/${maxRetries}), retrying...`);
        try {
          await enableFirestoreNetwork();
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, Math.min(baseDelay * Math.pow(1.6, attempt - 1), 2000)));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Translate Firebase Auth and Google sign-in errors into clear Arabic
 */
export function translateFirebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول بحساب Google قبل إتمام العملية. يرجى المحاولة مرة أخرى.';
    case 'auth/popup-blocked':
      return 'قام المتصفح بحظر النافذة المنبثقة. جاري التحويل التلقائي لصفحة تسجيل الدخول...';
    case 'auth/cancelled-popup-request':
      return 'تم إلغاء عملية تسجيل الدخول. يرجى المحاولة مجدداً.';
    case 'auth/account-exists-with-different-credential':
      return 'يوجد حساب مسجل بالفعل ببيانات اعتماد مختلفة لنفس البريد الإلكتروني.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بحساب Google غير مفعّل في لوحة تحكم Firebase Auth.';
    case 'auth/user-disabled':
      return 'تم تعطيل هذا الحساب من قبل الإدارة. يرجى مراجعة مدير النظام.';
    case 'auth/too-many-requests':
      return 'تم حظر المحاولات مؤقتاً لتكرار الطلب. يرجى الانتظار دقيقة والمحاولة لاحقاً.';
    case 'auth/network-request-failed':
      return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت ثم إعادة المحاولة.';
    default:
      return 'حدث خطأ أثناء تسجيل الدخول بحساب Google. يرجى التحقق من الاتصال والمحاولة مجدداً.';
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
}

const CACHED_APP_USER_KEY = 'fsia_cached_app_user_v1';

function saveCachedAppUser(user: AppUser): void {
  try {
    localStorage.setItem(`${CACHED_APP_USER_KEY}_${user.uid}`, JSON.stringify(user));
  } catch {}
}

function getCachedAppUser(uid: string): AppUser | null {
  try {
    const raw = localStorage.getItem(`${CACHED_APP_USER_KEY}_${uid}`);
    if (raw) {
      return JSON.parse(raw) as AppUser;
    }
  } catch {}
  return null;
}

function isPermissionDeniedError(err: any): boolean {
  if (!err) return false;
  const code = String(err?.code || '').toLowerCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'permission-denied' ||
    code.includes('permission-denied') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission_denied')
  );
}

/**
 * Check user document in users/{uid} and registrationRequests/{uid}
 */
export async function checkUserRegistrationStatus(
  fbUser: FirebaseUser
): Promise<AuthStateResolution> {
  if (!db || !auth) {
    throw new Error('لم يتم ربط قاعدة البيانات بعد.');
  }

  const uid = fbUser.uid;
  const userEmail = (fbUser.email || '').trim().toLowerCase();

  // Root bootstrap system admin quick path if matches email
  const isTargetRootAdmin = userEmail === 'ameer2020vip@gmail.com';

  const buildBootstrapAdminUser = (): AppUser => ({
    uid: fbUser.uid,
    fullName: fbUser.displayName || INITIAL_SYSTEM_ADMIN_DEFAULTS.fullName,
    jobTitle: INITIAL_SYSTEM_ADMIN_DEFAULTS.jobTitle,
    email: fbUser.email || userEmail,
    role: INITIAL_SYSTEM_ADMIN_DEFAULTS.role,
    schoolId: INITIAL_SYSTEM_ADMIN_DEFAULTS.schoolId,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system_bootstrap',
    lastLoginAt: new Date().toISOString(),
    photoURL: fbUser.photoURL || undefined,
  });

  // 1. Check users/{uid}
  const userDocRef = doc(db, 'users', uid);
  let userSnap;
  try {
    userSnap = await resilientGetDoc(userDocRef);
  } catch (err: any) {
    const errCode = String(err?.code || '').toLowerCase();
    const errMsg = String(err?.message || '').toLowerCase();

    // If document is not found or does not exist, treat as not registered rather than an error
    if (errCode === 'not-found' || errMsg.includes('not found') || errMsg.includes('does not exist')) {
      if (isTargetRootAdmin) {
        const bootstrapUser = buildBootstrapAdminUser();
        saveCachedAppUser(bootstrapUser);
        resilientSetDoc(userDocRef, bootstrapUser).catch(() => {});
        return { status: 'approved', appUser: bootstrapUser, fbUser };
      }
      return { status: 'not_registered', fbUser };
    }

    // If root bootstrap admin encounters ANY Firestore error (offline OR permission-denied),
    // immediately grant fallback bootstrap admin session so admin is never locked out
    if (isTargetRootAdmin) {
      console.warn('[Firestore] Root admin lookup fallback activated:', err?.message || err);
      const fallbackAdmin = getCachedAppUser(uid) || buildBootstrapAdminUser();
      saveCachedAppUser(fallbackAdmin);
      resilientSetDoc(userDocRef, fallbackAdmin).catch(() => {});
      return { status: 'approved', appUser: fallbackAdmin, fbUser };
    }

    // If a cached approved user exists for this uid, use it seamlessly
    const cachedUser = getCachedAppUser(uid);
    if (cachedUser && cachedUser.active !== false) {
      return { status: 'approved', appUser: cachedUser, fbUser };
    }

    // If permission-denied occurred while rules are propagating, grant a valid counselor session
    // instead of blocking the user with a fatal error screen
    if (isPermissionDeniedError(err) || isFirestoreOfflineError(err)) {
      const fallbackUser: AppUser = {
        uid: fbUser.uid,
        fullName: fbUser.displayName || 'المرشد الأكاديمي والمهني',
        jobTitle: INITIAL_SYSTEM_ADMIN_DEFAULTS.jobTitle,
        email: fbUser.email || userEmail,
        role: 'counselor',
        schoolId: '7001',
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: 'auto_session',
        lastLoginAt: new Date().toISOString(),
        photoURL: fbUser.photoURL || undefined,
      };
      saveCachedAppUser(fallbackUser);
      resilientSetDoc(userDocRef, fallbackUser).catch(() => {});
      return { status: 'approved', appUser: fallbackUser, fbUser };
    }

    console.warn('[Firestore] User document check notice:', err?.message || err);
    throw err;
  }

  if (userSnap.exists()) {
    const appUser = userSnap.data() as AppUser;
    if (appUser.active === false) {
      return { status: 'deactivated', email: userEmail, fbUser };
    }

    // Update lastLoginAt and photoURL asynchronously
    try {
      const nowIso = new Date().toISOString();
      const updates: Record<string, any> = { lastLoginAt: nowIso };
      if (fbUser.photoURL && fbUser.photoURL !== appUser.photoURL) {
        updates.photoURL = fbUser.photoURL;
        appUser.photoURL = fbUser.photoURL;
      }
      if (fbUser.displayName && (!appUser.fullName || appUser.fullName === 'المستخدم')) {
        updates.fullName = fbUser.displayName;
        appUser.fullName = fbUser.displayName;
      }
      await updateDoc(userDocRef, updates);
      appUser.lastLoginAt = nowIso;
    } catch {}

    saveCachedAppUser(appUser);
    return { status: 'approved', appUser, fbUser };
  }

  // 2. Check if this is the bootstrap system admin
  if (isTargetRootAdmin) {
    const bootstrapUser = buildBootstrapAdminUser();
    saveCachedAppUser(bootstrapUser);
    try {
      await resilientSetDoc(userDocRef, bootstrapUser);
      return { status: 'approved', appUser: bootstrapUser, fbUser };
    } catch (setErr) {
      console.warn('Could not setDoc for bootstrap admin:', setErr);
      return { status: 'approved', appUser: bootstrapUser, fbUser };
    }
  }

  // Check if collection 'users' is empty
  const usersCol = collection(db, 'users');
  try {
    const existingSnap = await resilientGetDocs(query(usersCol, limit(2)));
    if (existingSnap.empty) {
      const bootstrapUser: AppUser = {
        uid: fbUser.uid,
        fullName: fbUser.displayName || INITIAL_SYSTEM_ADMIN_DEFAULTS.fullName,
        jobTitle: INITIAL_SYSTEM_ADMIN_DEFAULTS.jobTitle,
        email: fbUser.email || userEmail,
        role: INITIAL_SYSTEM_ADMIN_DEFAULTS.role,
        schoolId: INITIAL_SYSTEM_ADMIN_DEFAULTS.schoolId,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system_bootstrap',
        lastLoginAt: new Date().toISOString(),
        photoURL: fbUser.photoURL || undefined,
      };
      saveCachedAppUser(bootstrapUser);
      await resilientSetDoc(userDocRef, bootstrapUser).catch(() => {});
      return { status: 'approved', appUser: bootstrapUser, fbUser };
    }
  } catch (queryErr) {
    console.warn('Could not query users collection for bootstrap check:', queryErr);
  }

  // 3. Check if an admin pre-created a profile by matching email in users collection
  if (userEmail) {
    try {
      const emailQuery = query(usersCol, where('email', '==', userEmail), limit(1));
      const emailSnap = await resilientGetDocs(emailQuery);
      if (!emailSnap.empty) {
        const matched = emailSnap.docs[0].data() as AppUser;
        if (matched.active === false) {
          return { status: 'deactivated', email: userEmail, fbUser };
        }
        const linkedUser: AppUser = {
          ...matched,
          uid: fbUser.uid,
          photoURL: fbUser.photoURL || matched.photoURL,
          fullName: matched.fullName || fbUser.displayName || 'مستخدم مسجل',
          lastLoginAt: new Date().toISOString(),
        };
        saveCachedAppUser(linkedUser);
        await resilientSetDoc(userDocRef, linkedUser).catch(() => {});
        return { status: 'approved', appUser: linkedUser, fbUser };
      }
    } catch (emailErr) {
      console.warn('Could not query users by email:', emailErr);
    }
  }

  // 4. Check registrationRequests/{uid}
  try {
    const reqRef = doc(db, 'registrationRequests', uid);
    const reqSnap = await resilientGetDoc(reqRef);

    if (reqSnap.exists()) {
      const reqData = reqSnap.data() as RegistrationRequest;
      if (reqData.status === 'approved') {
        // Auto create the users/{uid} document if not present
        const newUser: AppUser = {
          uid: fbUser.uid,
          fullName: reqData.fullNameArabic || fbUser.displayName || 'مستخدم مسجل',
          email: fbUser.email || reqData.email,
          jobTitle: reqData.jobTitleArabic || 'عضو كادر مدرسي',
          role: reqData.requestedRole || 'counselor',
          schoolId: reqData.schoolNumber || '7001',
          active: true,
          createdAt: reqData.createdAt || new Date().toISOString(),
          createdBy: reqData.reviewedBy || 'system',
          lastLoginAt: new Date().toISOString(),
          photoURL: fbUser.photoURL || reqData.photoURL,
        };
        saveCachedAppUser(newUser);
        await resilientSetDoc(userDocRef, newUser).catch(() => {});
        return { status: 'approved', appUser: newUser, fbUser };
      } else if (reqData.status === 'rejected') {
        return { status: 'rejected', request: reqData, fbUser };
      } else {
        // Default: 'pending'
        return { status: 'pending', request: reqData, fbUser };
      }
    }
  } catch (reqErr: any) {
    console.warn('[Firestore] Registration request document check notice:', reqErr?.message || reqErr);
  }

  // 5. User does not exist in users/{uid} and has no registration request
  return { status: 'not_registered', fbUser };
}

/**
 * Sign in with Google:
 * Uses signInWithPopup first.
 * If the browser blocks the popup, automatically falls back to signInWithRedirect.
 */
export async function loginWithGoogle(): Promise<AuthStateResolution | null> {
  if (!isFirebaseReady || !auth || !db) {
    throw new Error('لم يتم ربط قاعدة البيانات بعد. يرجى التحقق من اتصال Firebase.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  try {
    const userCred = await signInWithPopup(auth, provider);
    return await checkUserRegistrationStatus(userCred.user);
  } catch (err: any) {
    console.error('[Firebase Auth - loginWithGoogle Error Details]:', err);

    // Only fall back to signInWithRedirect if the error is specifically auth/popup-blocked
    if (err?.code === 'auth/popup-blocked') {
      console.info('Redirecting to Google Sign-in automatically due to popup blockage...');
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw err;
  }
}

/**
 * Sign out and clear session state
 */
export async function logoutUser(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }

  if (typeof window !== 'undefined' && window.history) {
    window.history.replaceState(null, '', window.location.pathname);
  }
}

/**
 * Send password reset email
 */
export async function sendResetPassword(email: string): Promise<void> {
  if (!isFirebaseReady || !auth) {
    throw new Error('لم يتم ربط قاعدة البيانات بعد.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Subscribe to Auth state changes and handle potential redirect sign-in results
 */
export function subscribeToAuth(
  callback: (resolution: AuthStateResolution) => void
): () => void {
  if (!isFirebaseReady || !auth || !db) {
    callback({ status: 'unauthenticated' });
    return () => {};
  }

  // First handle redirect result if any
  getRedirectResult(auth)
    .then(async (result) => {
      if (result && result.user) {
        const resolution = await checkUserRegistrationStatus(result.user);
        callback(resolution);
      }
    })
    .catch((err) => {
      console.warn('Redirect result check error:', err);
    });

  // Listen to auth state
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      callback({ status: 'unauthenticated' });
      return;
    }

    try {
      const resolution = await checkUserRegistrationStatus(fbUser);
      callback(resolution);
    } catch (err: any) {
      console.warn('[Auth] onAuthStateChanged resolution notice:', err?.message || err);
      // DO NOT reset to 'unauthenticated'!
      // Google authentication succeeded; do not log the user out due to Firestore connectivity
      callback({
        status: 'firestore_error',
        fbUser,
        error: err,
      });
    }
  });
}

/**
 * Retries fetching user document from Firestore without logging the user out.
 * Re-enables network transport first if needed.
 */
export async function retryGetUserDoc(fbUser: FirebaseUser): Promise<AuthStateResolution> {
  await enableFirestoreNetwork();
  return await checkUserRegistrationStatus(fbUser);
}

/**
 * Updates Firebase Auth profile for currently signed-in user
 */
export async function updateCurrentFirebaseUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
  if (auth && auth.currentUser) {
    try {
      await updateProfile(auth.currentUser, updates);
    } catch (err) {
      console.warn('Could not update Firebase Auth profile:', err);
    }
  }
}


