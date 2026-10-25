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
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseReady } from './config';
import {
  DetailedSchool,
  AppUser,
  SchoolStatus,
  isSystemOwner,
  UserRole,
  RegistrationRequest,
} from '../types';
import { createAuditLog, safeGetDoc, safeGetDocs, cleanForFirestore } from './firestoreService';
import { DEFAULT_SCHOOL_7001 } from './registrationService';

export const SYSTEM_DEFAULT_SCHOOL_ID = '7001';

/**
 * Check if a school number (الرقم الوزاري) already exists in Firestore
 */
export async function checkSchoolNumberExists(
  schoolNumber: string,
  excludeSchoolId?: string
): Promise<boolean> {
  if (!isFirebaseReady || !db) return false;
  const trimmed = schoolNumber.trim();
  if (!trimmed) return false;

  try {
    // 1. Direct doc lookup
    const directDoc = await getDoc(doc(db, 'schools', trimmed));
    if (directDoc.exists() && directDoc.id !== excludeSchoolId) {
      return true;
    }

    // 2. Query by schoolNumber field
    const q = query(collection(db, 'schools'), where('schoolNumber', '==', trimmed));
    const snap = await safeGetDocs(q);
    const existing = snap.docs.find((d) => d.id !== excludeSchoolId);
    return !!existing;
  } catch (err) {
    console.warn('Check school number notice:', err);
    return false;
  }
}

/**
 * Fetch all schools (strictly for system_owner)
 */
export async function fetchSchoolsList(
  currentUser: AppUser,
  statusFilter?: SchoolStatus | 'all'
): Promise<DetailedSchool[]> {
  if (!isSystemOwner(currentUser.role)) {
    throw new Error('غير مصرح لك بالوصول لإدارة المدارس. هذه الميزة خاصة بمدير النظام العام (system_owner).');
  }

  if (!isFirebaseReady || !db) {
    return [DEFAULT_SCHOOL_7001];
  }

  try {
    const schoolsCol = collection(db, 'schools');
    const snap = await safeGetDocs(schoolsCol);

    const schools: DetailedSchool[] = [];
    snap.forEach((d) => {
      const data = d.data();
      schools.push({
        schoolId: d.id,
        schoolNumber: data.schoolNumber || d.id,
        schoolNameArabic: data.schoolNameArabic || data.schoolNameAr || 'مدرسة غير مسماة',
        schoolNameEnglish: data.schoolNameEnglish || '',
        emirate: data.emirate || 'أبوظبي',
        region: data.region || '',
        schoolGender: data.schoolGender || 'boys',
        educationCycles: data.educationCycles || ['cycle3'],
        status: data.status || 'active',
        subscriptionStatus: data.subscriptionStatus || 'active',
        principalName: data.principalName || '',
        principalEmail: data.principalEmail || '',
        principalPhone: data.principalPhone || '',
        requesterUid: data.requesterUid || '',
        requesterName: data.requesterName || '',
        requesterEmail: data.requesterEmail || '',
        requesterPhone: data.requesterPhone || '',
        requesterJobTitle: data.requesterJobTitle || '',
        rejectionReason: data.rejectionReason || '',
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || 'system',
        updatedAt: data.updatedAt,
      });
    });

    // Make sure default 7001 is included if collection was empty
    if (schools.length === 0) {
      try {
        await setDoc(doc(db, 'schools', '7001'), DEFAULT_SCHOOL_7001);
        schools.push({
          ...DEFAULT_SCHOOL_7001,
          schoolId: '7001',
        });
      } catch {}
    }

    // Filter by status if provided
    let filtered = schools;
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Sort: newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered;
  } catch (err) {
    console.error('Fetch schools list error:', err);
    return [DEFAULT_SCHOOL_7001];
  }
}

/**
 * Fetch a single school by schoolId
 */
export async function fetchSchoolById(schoolId: string): Promise<DetailedSchool | null> {
  if (!isFirebaseReady || !db) {
    if (schoolId === '7001' || schoolId === 'alkhalil-school') return DEFAULT_SCHOOL_7001;
    return null;
  }

  try {
    const snap = await getDoc(doc(db, 'schools', schoolId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        schoolId: snap.id,
        schoolNumber: data.schoolNumber || snap.id,
        schoolNameArabic: data.schoolNameArabic || data.schoolNameAr || 'مدرسة',
        schoolNameEnglish: data.schoolNameEnglish || '',
        emirate: data.emirate || 'أبوظبي',
        region: data.region || '',
        schoolGender: data.schoolGender || 'boys',
        educationCycles: data.educationCycles || ['cycle3'],
        status: data.status || 'active',
        subscriptionStatus: data.subscriptionStatus || 'active',
        principalName: data.principalName || '',
        principalEmail: data.principalEmail || '',
        principalPhone: data.principalPhone || '',
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || 'system',
        updatedAt: data.updatedAt,
      };
    }
    return null;
  } catch (err) {
    console.warn('Fetch school by ID notice:', err);
    return null;
  }
}

/**
 * Create a new school record (for system_owner)
 */
export async function createSchoolRecord(
  schoolData: Partial<DetailedSchool>,
  currentUser: AppUser
): Promise<DetailedSchool> {
  if (!isSystemOwner(currentUser.role)) {
    throw new Error('غير مصرح لك بإضافة مدارس جديدة.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  const schoolNumber = (schoolData.schoolNumber || '').trim();
  if (!schoolNumber) {
    throw new Error('الرقم الوزاري للمدرسة مطلوب.');
  }
  if (!schoolData.schoolNameArabic?.trim()) {
    throw new Error('اسم المدرسة باللغة العربية مطلوب.');
  }

  // Check duplicate ministerial number
  const exists = await checkSchoolNumberExists(schoolNumber);
  if (exists) {
    throw new Error(`الرقم الوزاري (${schoolNumber}) مسجل مسبقاً لمدرسة أخرى. يرجى التأكد من الرقم.`);
  }

  const schoolId = schoolNumber;
  const now = new Date().toISOString();

  const record: DetailedSchool = {
    schoolId,
    schoolNumber,
    schoolNameArabic: schoolData.schoolNameArabic.trim(),
    schoolNameEnglish: schoolData.schoolNameEnglish?.trim() || '',
    emirate: schoolData.emirate || 'أبوظبي',
    region: schoolData.region?.trim() || '',
    schoolGender: schoolData.schoolGender || 'boys',
    educationCycles: schoolData.educationCycles && schoolData.educationCycles.length > 0 ? schoolData.educationCycles : ['cycle3'],
    status: schoolData.status || 'active',
    subscriptionStatus: schoolData.subscriptionStatus || 'active',
    principalName: schoolData.principalName?.trim() || '',
    principalEmail: schoolData.principalEmail?.trim() || '',
    principalPhone: schoolData.principalPhone?.trim() || '',
    createdAt: now,
    createdBy: currentUser.fullName || currentUser.email || 'system_owner',
    updatedAt: now,
  };

  await setDoc(doc(db, 'schools', schoolId), record);

  // Log in Audit Log
  try {
    await createAuditLog(
      schoolId,
      currentUser,
      'create',
      'school',
      schoolId,
      `إنشاء مدرسة جديدة: ${record.schoolNameArabic} (الرقم الوزاري: ${record.schoolNumber})`,
      { afterData: record }
    );
  } catch {}

  return record;
}

/**
 * Update school record (for system_owner)
 */
export async function updateSchoolRecord(
  schoolId: string,
  updates: Partial<DetailedSchool>,
  currentUser: AppUser,
  reason?: string
): Promise<void> {
  if (!isSystemOwner(currentUser.role)) {
    throw new Error('غير مصرح لك بتعديل بيانات المدرسة.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  const schoolRef = doc(db, 'schools', schoolId);
  const snap = await getDoc(schoolRef);
  const beforeData = snap.exists() ? snap.data() : null;

  // Check if schoolNumber was changed and if it conflicts
  if (updates.schoolNumber && updates.schoolNumber !== beforeData?.schoolNumber) {
    const exists = await checkSchoolNumberExists(updates.schoolNumber, schoolId);
    if (exists) {
      throw new Error(`الرقم الوزاري الجديد (${updates.schoolNumber}) مسجل مسبقاً لمدرسة أخرى.`);
    }
  }

  const cleanUpdates: Record<string, any> = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(schoolRef, cleanUpdates);

  // Log in Audit Log
  try {
    await createAuditLog(
      schoolId,
      currentUser,
      'update',
      'school',
      schoolId,
      `تعديل بيانات المدرسة: ${updates.schoolNameArabic || beforeData?.schoolNameArabic || schoolId}${reason ? ` - السبب: ${reason}` : ''}`,
      { beforeData, afterData: cleanUpdates, reason }
    );
  } catch {}
}

/**
 * Archive school (strictly NO direct hard delete)
 */
export async function archiveSchoolRecord(
  schoolId: string,
  currentUser: AppUser,
  reason: string
): Promise<void> {
  if (!isSystemOwner(currentUser.role)) {
    throw new Error('غير مصرح لك بأرشفة المدارس.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  const schoolRef = doc(db, 'schools', schoolId);
  const snap = await getDoc(schoolRef);
  const beforeData = snap.exists() ? snap.data() : null;

  const updates = {
    status: 'archived',
    updatedAt: new Date().toISOString(),
    archiveReason: reason.trim() || 'أرشفة إدارية',
    archivedBy: currentUser.fullName || currentUser.email,
  };

  await updateDoc(schoolRef, updates);

  try {
    await createAuditLog(
      schoolId,
      currentUser,
      'archive',
      'school',
      schoolId,
      `أرشفة المدرسة: ${beforeData?.schoolNameArabic || schoolId} - سبب الأرشفة: ${reason}`,
      { beforeData, afterData: updates, reason }
    );
  } catch {}
}

/**
 * Toggle school active/suspended status
 */
export async function toggleSchoolStatus(
  schoolId: string,
  newStatus: 'active' | 'suspended',
  currentUser: AppUser,
  reason?: string
): Promise<void> {
  if (!isSystemOwner(currentUser.role)) {
    throw new Error('غير مصرح لك بتغيير حالة المدرسة.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  const schoolRef = doc(db, 'schools', schoolId);
  const snap = await getDoc(schoolRef);
  const beforeData = snap.exists() ? snap.data() : null;

  const updates = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
    statusReason: reason?.trim() || null,
  };

  await updateDoc(schoolRef, updates);

  const actionLabel = newStatus === 'suspended' ? 'تعليق مدرسة' : 'إعادة تفعيل مدرسة';
  try {
    await createAuditLog(
      schoolId,
      currentUser,
      newStatus === 'suspended' ? 'suspend' : 'reactivate',
      'school',
      schoolId,
      `${actionLabel}: ${beforeData?.schoolNameArabic || schoolId}${reason ? ` - السبب: ${reason}` : ''}`,
      { beforeData, afterData: updates, reason }
    );
  } catch {}
}

/**
 * Assign or change school principal
 */
export async function assignSchoolPrincipal(
  schoolId: string,
  principalUser: { uid: string; fullName: string; email: string; phone?: string },
  currentUser: AppUser
): Promise<void> {
  if (!isSystemOwner(currentUser.role)) {
    throw new Error('غير مصرح لك بتعيين مدير المدرسة.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  // Update school record
  const schoolRef = doc(db, 'schools', schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const beforeData = schoolSnap.exists() ? schoolSnap.data() : null;

  await updateDoc(schoolRef, {
    principalName: principalUser.fullName,
    principalEmail: principalUser.email,
    principalPhone: principalUser.phone || '',
    updatedAt: new Date().toISOString(),
  });

  // Update user document if UID exists
  if (principalUser.uid) {
    try {
      const userRef = doc(db, 'users', principalUser.uid);
      await updateDoc(userRef, {
        role: 'schoolAdmin',
        schoolId: schoolId,
        jobTitle: 'مدير مدرسة',
      });
    } catch (err) {
      console.warn('Could not update user record for principal:', err);
    }
  }

  try {
    await createAuditLog(
      schoolId,
      currentUser,
      'update',
      'school',
      schoolId,
      `تعيين مدير جديد للمدرسة: ${principalUser.fullName} (${principalUser.email})`,
      { beforeData, afterData: { principalName: principalUser.fullName, principalEmail: principalUser.email } }
    );
  } catch {}
}

/**
 * Approve a pending school registration request
 */
export async function approveSchoolRequest(
  schoolId: string,
  options: {
    approveUserToo: boolean;
    requesterUid?: string;
    assignAsPrincipal: boolean;
    customSchoolNumber?: string;
    customSchoolName?: string;
    customEmirate?: string;
  },
  approver: AppUser
): Promise<void> {
  if (!isSystemOwner(approver.role)) {
    throw new Error('غير مصرح لك باعتماد طلبات المدارس.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  const now = new Date().toISOString();
  const schoolRef = doc(db, 'schools', schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const sData = schoolSnap.exists() ? schoolSnap.data() : {};

  // 1. Activate school
  const schoolUpdates: Partial<DetailedSchool> = {
    status: 'active',
    updatedAt: now,
  };
  if (options.customSchoolName) schoolUpdates.schoolNameArabic = options.customSchoolName;
  if (options.customSchoolNumber) schoolUpdates.schoolNumber = options.customSchoolNumber;
  if (options.customEmirate) schoolUpdates.emirate = options.customEmirate;

  await updateDoc(schoolRef, schoolUpdates);

  // 2. If approveUserToo and requesterUid are provided
  if (options.approveUserToo && options.requesterUid) {
    const userRef = doc(db, 'users', options.requesterUid);
    const assignedRole: UserRole = options.assignAsPrincipal ? 'schoolAdmin' : 'counselor';
    const assignedJobTitle = options.assignAsPrincipal ? 'مدير مدرسة' : (sData.requesterJobTitle || 'مرشد مدرسي');

    // Create / update user doc
    const userUpdates: Partial<AppUser> = {
      active: true,
      role: assignedRole,
      schoolId: schoolId,
      jobTitle: assignedJobTitle,
    };
    await setDoc(userRef, userUpdates, { merge: true });

    // Update school with principal name if assigned
    if (options.assignAsPrincipal && sData.requesterName) {
      await updateDoc(schoolRef, {
        principalName: sData.requesterName,
        principalEmail: sData.requesterEmail || '',
        principalPhone: sData.requesterPhone || '',
      });
    }

    // Update registration request
    try {
      const reqRef = doc(db, 'registrationRequests', options.requesterUid);
      await updateDoc(reqRef, {
        status: 'approved',
        reviewedAt: now,
        reviewedBy: approver.fullName || approver.email,
        rejectionReason: null,
      });
    } catch {}
  }

  // 3. Audit Log
  try {
    await createAuditLog(
      schoolId,
      approver,
      'approve',
      'school',
      schoolId,
      `اعتماد طلب إنشاء المدرسة: ${schoolUpdates.schoolNameArabic || sData.schoolNameArabic || schoolId}${options.approveUserToo ? ' واعتماد حساب مقدم الطلب' : ''}`,
      { afterData: schoolUpdates }
    );
  } catch {}
}

/**
 * Reject school request with reason
 */
export async function rejectSchoolRequest(
  schoolId: string,
  reason: string,
  approver: AppUser,
  requesterUid?: string
): Promise<void> {
  if (!isSystemOwner(approver.role)) {
    throw new Error('غير مصرح لك برفض طلبات المدارس.');
  }
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }

  const now = new Date().toISOString();
  const schoolRef = doc(db, 'schools', schoolId);
  const schoolSnap = await getDoc(schoolRef);
  const sData = schoolSnap.exists() ? schoolSnap.data() : {};

  // Update school doc as rejected/archived
  await updateDoc(schoolRef, {
    status: 'archived',
    rejectionReason: reason.trim(),
    rejectedAt: now,
    rejectedBy: approver.fullName || approver.email,
    updatedAt: now,
  });

  // If requesterUid, mark registration request rejected
  if (requesterUid) {
    try {
      const reqRef = doc(db, 'registrationRequests', requesterUid);
      await updateDoc(reqRef, {
        status: 'rejected',
        rejectionReason: reason.trim(),
        reviewedAt: now,
        reviewedBy: approver.fullName || approver.email,
      });
    } catch {}
  }

  try {
    await createAuditLog(
      schoolId,
      approver,
      'update',
      'school',
      schoolId,
      `رفض طلب إضافة مدرسة: ${sData.schoolNameArabic || schoolId} - سبب الرفض: ${reason}`,
      { reason }
    );
  } catch {}
}

/**
 * Request more info for user registration request
 */
export async function requestMoreInfoForRegistration(
  reqId: string,
  note: string,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const now = new Date().toISOString();
  const reqRef = doc(db, 'registrationRequests', reqId);
  await updateDoc(reqRef, {
    status: 'needs_info',
    infoRequestNote: note.trim(),
    reviewedAt: now,
    reviewedBy: currentUser.fullName || currentUser.email,
  });

  try {
    await createAuditLog(
      currentUser.schoolId || '7001',
      currentUser,
      'request_info',
      'user',
      reqId,
      `طلب معلومات إضافية من مقدم الطلب (${reqId}): ${note}`
    );
  } catch {}
}

/**
 * Fetch all users belonging to a specific school
 */
export async function fetchSchoolUsers(schoolId: string): Promise<AppUser[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const q = query(collection(db, 'users'), where('schoolId', '==', schoolId));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => d.data() as AppUser);
  } catch (err) {
    console.warn('Fetch school users notice:', err);
    return [];
  }
}

/**
 * Fetch school counts (students & users)
 */
export async function fetchSchoolCounts(schoolId: string): Promise<{ studentsCount: number; usersCount: number }> {
  if (!isFirebaseReady || !db) return { studentsCount: 0, usersCount: 0 };
  try {
    const studentsCol = collection(db, 'schools', schoolId, 'students');
    const sSnap = await safeGetDocs(studentsCol);
    const studentsCount = sSnap.size;

    const uCol = collection(db, 'users');
    const uQ = query(uCol, where('schoolId', '==', schoolId));
    const uSnap = await safeGetDocs(uQ);
    const usersCount = uSnap.size;

    return { studentsCount, usersCount };
  } catch (err) {
    return { studentsCount: 0, usersCount: 0 };
  }
}

/**
 * Transfer user to another school
 */
export async function transferUserToSchool(
  targetUser: AppUser,
  newSchoolId: string,
  currentUser: AppUser,
  reason?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  if (currentUser.role !== 'systemAdmin' && !isSystemOwner(currentUser.role)) {
    throw new Error('فقط مدير النظام العام يملك صلاحية نقل المستخدمين بين المدارس.');
  }

  const userRef = doc(db, 'users', targetUser.uid);
  const oldSchool = targetUser.schoolId || 'غير محددة';
  await updateDoc(userRef, { schoolId: newSchoolId });

  try {
    await createAuditLog(
      newSchoolId,
      currentUser,
      'update',
      'user',
      targetUser.uid,
      `نقل المستخدم (${targetUser.fullName}) من مدرسة (#${oldSchool}) إلى مدرسة (#${newSchoolId})${reason ? ` - السبب: ${reason}` : ''}`,
      { beforeData: { schoolId: oldSchool }, afterData: { schoolId: newSchoolId }, reason }
    );
  } catch {}
}

/**
 * Archive user account (strictly NO direct hard delete)
 */
export async function archiveUserAccount(
  targetUser: AppUser,
  currentUser: AppUser,
  reason: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  const userRef = doc(db, 'users', targetUser.uid);

  const updates = {
    active: false,
    archived: true,
    archiveReason: reason.trim() || 'أرشفة الحساب الإداري',
    archivedAt: new Date().toISOString(),
    archivedBy: currentUser.fullName || currentUser.email,
  };

  await updateDoc(userRef, updates);

  try {
    await createAuditLog(
      targetUser.schoolId || currentUser.schoolId || '7001',
      currentUser,
      'archive',
      'user',
      targetUser.uid,
      `أرشفة حساب المستخدم (${targetUser.fullName}) - سبب الأرشفة: ${reason}`,
      { beforeData: { active: targetUser.active }, afterData: updates, reason }
    );
  } catch {}
}

/**
 * Update user extended details
 */
export async function updateUserExtended(
  targetUser: AppUser,
  updates: Partial<AppUser>,
  currentUser: AppUser,
  reason?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  const userRef = doc(db, 'users', targetUser.uid);

  const cleanUpdates = cleanForFirestore(updates);
  await updateDoc(userRef, cleanUpdates);

  try {
    await createAuditLog(
      targetUser.schoolId || currentUser.schoolId || '7001',
      currentUser,
      'update',
      'user',
      targetUser.uid,
      `تحديث بيانات وصلاحيات المستخدم: ${targetUser.fullName}${reason ? ` - السبب: ${reason}` : ''}`,
      { beforeData: targetUser, afterData: cleanUpdates, reason }
    );
  } catch {}
}
