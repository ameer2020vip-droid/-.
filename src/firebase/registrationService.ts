import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseReady } from './config';
import {
  RegistrationRequest,
  DetailedSchool,
  AppUser,
  UserRole,
} from '../types';
import { createAuditLog, safeGetDoc, safeGetDocs } from './firestoreService';

// Emirates list for UAE schools
export const EMIRATES_LIST = [
  'أبوظبي',
  'دبي',
  'الشارقة',
  'عجمان',
  'أم القيوين',
  'رأس الخيمة',
  'الفجيرة',
];

// Job titles configurations for school staff
export const JOB_TITLES_CONFIG = [
  'مدير المدرسة',
  'مساعد مدير المدرسة',
  'موجه تربوي',
  'مرشد أكاديمي ومهني',
  'أخصائي اجتماعي',
  'أخصائي نفسي',
  'منسق شؤون الطلبة',
  'معلم أول',
  'مشرف إداري',
];

// Default pre-seeded school for easy testing & demo
export const DEFAULT_SCHOOL_7001: DetailedSchool = {
  schoolId: '7001',
  schoolNumber: '7001',
  schoolNameArabic: 'أكاديمية الفجيرة العلمية الإسلامية',
  emirate: 'الفجيرة',
  schoolGender: 'boys',
  educationCycles: ['cycle3'],
  status: 'active',
  createdAt: new Date().toISOString(),
  createdBy: 'system_bootstrap',
};

/**
 * Lookup school in Firestore by school number (or fallback to pre-seeded 7001/alkhalil-school)
 */
export async function lookupSchoolByNumber(
  schoolNumberInput: string
): Promise<DetailedSchool | null> {
  if (!isFirebaseReady || !db) {
    // If db not ready, check default
    const trimmed = schoolNumberInput.trim();
    if (trimmed === '7001' || trimmed.toLowerCase() === 'alkhalil-school') {
      return DEFAULT_SCHOOL_7001;
    }
    return null;
  }

  const trimmedNumber = schoolNumberInput.trim();
  if (!trimmedNumber) return null;

  try {
    // 1. Direct doc lookup in schools/{schoolNumber}
    const schoolDocRef = doc(db, 'schools', trimmedNumber);
    const snap = await getDoc(schoolDocRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        schoolId: snap.id || trimmedNumber,
        schoolNumber: trimmedNumber,
        schoolNameArabic: data.schoolNameArabic || data.schoolNameAr || 'مدرسة معتمدة',
        emirate: data.emirate || 'أبوظبي',
        schoolGender: data.schoolGender || 'boys',
        educationCycles: data.educationCycles || ['cycle3'],
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || 'system',
      };
    }

    // 2. Check if searching 7001 or alkhalil-school
    if (trimmedNumber === '7001' || trimmedNumber.toLowerCase() === 'alkhalil-school') {
      // Auto seed 7001 into schools collection if absent
      try {
        await setDoc(doc(db, 'schools', '7001'), DEFAULT_SCHOOL_7001);
      } catch {}
      return DEFAULT_SCHOOL_7001;
    }

    // 3. Fallback search by query on schoolNumber field if path key differed
    const schoolsCol = collection(db, 'schools');
    const q = query(schoolsCol, where('schoolNumber', '==', trimmedNumber));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      const docData = querySnap.docs[0].data();
      return {
        schoolId: querySnap.docs[0].id || trimmedNumber,
        schoolNumber: trimmedNumber,
        schoolNameArabic: docData.schoolNameArabic || docData.schoolNameAr || 'مدرسة مسجلة',
        emirate: docData.emirate || 'أبوظبي',
        schoolGender: docData.schoolGender || 'boys',
        educationCycles: docData.educationCycles || ['cycle3'],
        status: docData.status || 'active',
        createdAt: docData.createdAt || new Date().toISOString(),
        createdBy: docData.createdBy || 'system',
      };
    }

    return null;
  } catch (err) {
    console.warn('Error looking up school by number:', err);
    if (trimmedNumber === '7001' || trimmedNumber.toLowerCase() === 'alkhalil-school') {
      return DEFAULT_SCHOOL_7001;
    }
    return null;
  }
}

/**
 * Fetch registration request for a given user UID
 */
export async function getRegistrationRequest(
  uid: string
): Promise<RegistrationRequest | null> {
  if (!isFirebaseReady || !db || !uid) return null;

  try {
    const reqRef = doc(db, 'registrationRequests', uid);
    const snap = await safeGetDoc(reqRef);
    if (snap.exists()) {
      return snap.data() as RegistrationRequest;
    }
    return null;
  } catch (err) {
    console.warn('Registration request fetch notice:', err);
    return null;
  }
}

/**
 * Submit or re-submit a registration request
 */
export async function submitRegistrationRequest(
  req: RegistrationRequest
): Promise<void> {
  if (!isFirebaseReady || !db) {
    throw new Error('لم يتم ربط قاعدة البيانات بعد.');
  }

  const reqRef = doc(db, 'registrationRequests', req.uid);
  const now = new Date().toISOString();

  const payload: RegistrationRequest = {
    ...req,
    status: 'pending',
    rejectionReason: null,
    createdAt: req.createdAt || now,
    updatedAt: now,
  };

  await setDoc(reqRef, payload);

  // If request created a new school, record school in schools collection as pending
  if (req.requestType === 'createNewSchool' && req.schoolNumber) {
    try {
      const schoolRef = doc(db, 'schools', req.schoolNumber);
      const schoolSnap = await getDoc(schoolRef);
      if (!schoolSnap.exists()) {
        const newSchool: DetailedSchool = {
          schoolId: req.schoolNumber,
          schoolNumber: req.schoolNumber,
          schoolNameArabic: req.schoolNameArabic,
          schoolNameEnglish: req.schoolNameEnglish || '',
          emirate: req.emirate,
          region: req.region || '',
          schoolGender: req.schoolGender,
          educationCycles: req.educationCycles,
          status: 'pending',
          subscriptionStatus: 'trial',
          requesterUid: req.uid,
          requesterName: req.fullNameArabic,
          requesterEmail: req.email,
          requesterPhone: req.phone || '',
          requesterJobTitle: req.jobTitleArabic,
          createdAt: now,
          createdBy: req.uid,
          updatedAt: now,
        };
        await setDoc(schoolRef, newSchool);
      }
    } catch (err) {
      console.warn('Could not register pending school:', err);
    }
  }
}

/**
 * Fetch all registration requests (for systemAdmin or schoolAdmin)
 */
export async function fetchAllRegistrationRequests(
  schoolFilter?: string
): Promise<RegistrationRequest[]> {
  if (!isFirebaseReady || !db) return [];

  try {
    const colRef = collection(db, 'registrationRequests');
    let snap;
    if (schoolFilter) {
      const q = query(colRef, where('schoolNumber', '==', schoolFilter));
      snap = await safeGetDocs(q);
    } else {
      snap = await safeGetDocs(colRef);
    }

    const list: RegistrationRequest[] = [];
    snap.forEach((d) => {
      list.push(d.data() as RegistrationRequest);
    });

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('Registration requests fetch notice:', err);
    return [];
  }
}

export const fetchRegistrationRequests = fetchAllRegistrationRequests;

/**
 * Approve a registration request:
 * 1. Creates/Updates profile in `users/{uid}` with active: true
 * 2. Marks request status: 'approved'
 * 3. Activates the school if it was pending
 */
export async function approveRegistrationRequest(
  reqOrId: RegistrationRequest | string,
  approverOrOverrides: AppUser | { role?: UserRole; schoolId?: string; jobTitle?: string },
  customRoleOrApprover?: UserRole | AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) {
    throw new Error('لم يتم ربط قاعدة البيانات بعد.');
  }

  const now = new Date().toISOString();

  let req: RegistrationRequest;
  let approver: AppUser;
  let customRole: UserRole | undefined;
  let overrides: { role?: UserRole; schoolId?: string; jobTitle?: string } = {};

  if (typeof reqOrId === 'string') {
    const snap = await getDoc(doc(db, 'registrationRequests', reqOrId));
    if (!snap.exists()) {
      throw new Error('لم يتم العثور على طلب التسجيل.');
    }
    req = { id: snap.id, ...snap.data() } as RegistrationRequest;
    overrides = (approverOrOverrides as { role?: UserRole; schoolId?: string; jobTitle?: string }) || {};
    approver = customRoleOrApprover as AppUser;
    customRole = overrides.role;
  } else {
    req = reqOrId;
    approver = approverOrOverrides as AppUser;
    customRole = customRoleOrApprover as UserRole | undefined;
  }

  const assignedRole: UserRole = customRole || overrides.role || req.requestedRole || 'counselor';
  const assignedSchoolId = overrides.schoolId || req.schoolNumber || '7001';
  const assignedJobTitle = overrides.jobTitle || req.jobTitleArabic || 'مرشد مدرسي';
  const targetUid = req.uid || req.id;

  // 1. Create or update user profile in `users/{uid}`
  const userRef = doc(db, 'users', targetUid);
  const userProfile: AppUser = {
    uid: targetUid,
    fullName: req.fullNameArabic || req.displayName || 'مستخدم جديد',
    email: req.email,
    jobTitle: assignedJobTitle,
    role: assignedRole,
    schoolId: assignedSchoolId,
    active: true,
    createdAt: req.createdAt || now,
    createdBy: approver?.fullName || approver?.uid || 'admin',
    lastLoginAt: now,
    photoURL: req.photoURL,
  };
  await setDoc(userRef, userProfile);

  // 2. Mark request approved
  const reqRef = doc(db, 'registrationRequests', targetUid);
  await updateDoc(reqRef, {
    status: 'approved',
    reviewedAt: now,
    reviewedBy: approver?.fullName || approver?.email || 'admin',
    rejectionReason: null,
  });

  // 3. If school is pending, activate it
  if (assignedSchoolId) {
    try {
      const schoolRef = doc(db, 'schools', assignedSchoolId);
      const sSnap = await getDoc(schoolRef);
      if (sSnap.exists()) {
        await updateDoc(schoolRef, { status: 'active', updatedAt: now });
      }
    } catch {}
  }

  // 4. Audit log
  try {
    await createAuditLog(
      assignedSchoolId || approver?.schoolId || '7001',
      approver,
      'create',
      'user',
      targetUid,
      `تم اعتماد طلب التسجيل وتفعيل حساب المستخدم: ${req.fullNameArabic || req.email} (${assignedRole})`
    );
  } catch {}
}

/**
 * Reject a registration request with a reason
 */
export async function rejectRegistrationRequest(
  reqOrId: RegistrationRequest | string,
  reason: string,
  approver: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) {
    throw new Error('لم يتم ربط قاعدة البيانات بعد.');
  }

  const now = new Date().toISOString();
  const targetId = typeof reqOrId === 'string' ? reqOrId : (reqOrId.uid || reqOrId.id);
  const reqRef = doc(db, 'registrationRequests', targetId);

  await updateDoc(reqRef, {
    status: 'rejected',
    rejectionReason: reason.trim() || 'لم يتم استيفاء شروط التسجيل المطلوبة',
    reviewedAt: now,
    reviewedBy: approver.fullName || approver.email,
  });

  try {
    await createAuditLog(
      approver.schoolId || '7001',
      approver,
      'update',
      'user',
      targetId,
      `تم رفض طلب التسجيل للمستخدم (${targetId}) - السبب: ${reason}`
    );
  } catch {}
}
