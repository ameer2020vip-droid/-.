import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
  where,
  writeBatch,
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseReady, reconnectFirestore, enableFirestoreNetwork } from './config';
import {
  Student,
  TardinessRecord,
  AbsenceRecord,
  ViolationRecord,
  WarningFormRecord,
  ParentSummonFormRecord,
  ViolationReportRecord,
  ParentNoticeFormRecord,
  ParentCommitmentFormRecord,
  TemporarySuspensionFormRecord,
  BehaviorCommitteeMeeting,
  CommitteeMeetingCase,
  AppUser,
  UserRole,
  AuditLogRecord,
  SchoolRecord,
  StudentCaseRecord,
  StudentCaseFormRecord,
  StudentFamilyData,
  CounselingSessionRecord,
  EmployeeRecord,
  CommitteeFormationConfig,
  isSystemOwner,
  isSchoolAdmin,
  OfficialDocumentRecord,
  DocumentSignature,
  DocumentAuditLogEntry,
  GuidancePlanRecord,
  NeedsAssessmentRecord,
  CounselorTaskRecord,
  StudentReferralRecord,
} from '../types';

export const DEFAULT_SCHOOL_ID = '7001';
export const KNOWN_SCHOOL_ALIASES = ['7001', 'alkhalil-school', 'school-main'] as const;
export const DEFAULT_SCHOOL_RECORD: SchoolRecord = {
  schoolId: DEFAULT_SCHOOL_ID,
  schoolNameAr: 'أكاديمية الفجيرة العلمية الإسلامية',
  academicYear: '2026–2027',
  active: true,
  createdAt: new Date().toISOString(),
};

export function resolveCanonicalSchoolId(schoolId?: string): string {
  if (!schoolId) return DEFAULT_SCHOOL_ID;
  if (KNOWN_SCHOOL_ALIASES.includes(schoolId as any)) return DEFAULT_SCHOOL_ID;
  return schoolId;
}

function isOfflineError(err: any): boolean {
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

// ----------------------------------------------------------------------------
// RECURSIVE CLEANER: Strips all undefined fields to prevent Firestore errors
// ----------------------------------------------------------------------------
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof obj === 'object') {
    // Avoid mutating instances like Dates or Firestore FieldValues
    if (obj instanceof Date) return obj as any;
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function safeGetDoc(docRef: DocumentReference, retries = 3): Promise<DocumentSnapshot> {
  for (let i = 0; i < retries; i++) {
    try {
      return await getDoc(docRef);
    } catch (err: any) {
      if (isOfflineError(err) && i < retries - 1) {
        try {
          await enableFirestoreNetwork();
        } catch {}
        await new Promise((r) => setTimeout(r, 400 * Math.pow(1.5, i)));
        continue;
      }
      throw err;
    }
  }
  return await getDoc(docRef);
}

export async function safeGetDocs(q: Query, retries = 3): Promise<QuerySnapshot> {
  for (let i = 0; i < retries; i++) {
    try {
      return await getDocs(q);
    } catch (err: any) {
      if (isOfflineError(err) && i < retries - 1) {
        try {
          await enableFirestoreNetwork();
        } catch {}
        await new Promise((r) => setTimeout(r, 400 * Math.pow(1.5, i)));
        continue;
      }
      throw err;
    }
  }
  return await getDocs(q);
}

/**
 * Ensures the initial school record exists in `schools/{schoolId}`
 */
export async function ensureDefaultSchoolExists(): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const schoolRef = doc(db, 'schools', DEFAULT_SCHOOL_ID);
    const snap = await safeGetDoc(schoolRef);
    if (!snap.exists()) {
      await setDoc(schoolRef, DEFAULT_SCHOOL_RECORD);
    }
  } catch (err: any) {
    if (isOfflineError(err)) {
      console.warn('Firestore reported offline in ensureDefaultSchoolExists, attempting reconnect...');
      try {
        await reconnectFirestore();
      } catch {}
    } else {
      console.warn('Could not check/create default school:', err);
    }
  }
}

// ----------------------------------------------------------------------------
// AUDIT LOGS: schools/{schoolId}/auditLogs
// Strictly immutable; no update or delete allowed by rules!
// ----------------------------------------------------------------------------
export async function createAuditLog(
  schoolId: string,
  user: AppUser,
  action: AuditLogRecord['action'],
  entityType: AuditLogRecord['entityType'],
  entityId: string,
  details: string,
  extra?: { beforeData?: any; afterData?: any; reason?: string; affectedEntityName?: string }
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const auditCol = collection(db, 'schools', schoolId, 'auditLogs');
    const logData: Omit<AuditLogRecord, 'id'> = {
      userId: user.uid,
      userName: user.fullName,
      action,
      entityType,
      entityId,
      schoolId,
      timestamp: new Date().toISOString(),
      details,
      ...(extra?.beforeData !== undefined ? { beforeData: extra.beforeData } : {}),
      ...(extra?.afterData !== undefined ? { afterData: extra.afterData } : {}),
      ...(extra?.reason !== undefined ? { reason: extra.reason } : {}),
      ...(extra?.affectedEntityName !== undefined ? { affectedEntityName: extra.affectedEntityName } : {}),
    };
    await addDoc(auditCol, logData);
  } catch (err) {
    console.error('Audit log creation failed:', err);
  }
}

export async function fetchAuditLogs(schoolId: string): Promise<AuditLogRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const auditCol = collection(db, 'schools', schoolId, 'auditLogs');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(100));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AuditLogRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch audit logs notice:', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// STUDENTS: schools/{schoolId}/students
// Document ID is studentNumber (or studentId)
// ----------------------------------------------------------------------------
export async function fetchStudents(schoolId: string): Promise<Student[]> {
  if (!isFirebaseReady || !db) return [];
  const targetId = schoolId || DEFAULT_SCHOOL_ID;
  try {
    const studentsCol = collection(db, 'schools', targetId, 'students');
    const snap = await safeGetDocs(studentsCol);
    if (!snap.empty) {
      return snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Student, 'id'>),
      }));
    }

    // Fallback: If target school has no students yet, check known aliases ('7001', 'alkhalil-school', 'school-main')
    // to preserve all existing legacy data without any data loss
    for (const alias of KNOWN_SCHOOL_ALIASES) {
      if (alias === targetId) continue;
      try {
        const aliasCol = collection(db, 'schools', alias, 'students');
        const aliasSnap = await safeGetDocs(aliasCol);
        if (!aliasSnap.empty) {
          console.info(`Found ${aliasSnap.size} existing students in legacy school path [${alias}], loading seamlessly...`);
          return aliasSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Student, 'id'>),
          }));
        }
      } catch (aliasErr) {
        console.warn(`Alias check for ${alias} notice:`, aliasErr);
      }
    }

    return [];
  } catch (err) {
    console.warn('Fetch students notice:', err);
    return [];
  }
}

export async function saveStudent(
  schoolId: string,
  student: Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>,
  currentUser: AppUser
): Promise<Student> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const docId = student.studentNumber.trim();
  const studentRef = doc(db, 'schools', schoolId, 'students', docId);
  const snap = await getDoc(studentRef);

  const existingData = snap.exists() ? snap.data() : null;

  const newRecord: Student = {
    ...student,
    id: docId,
    totalTardiness: existingData?.totalTardiness ?? 0,
    totalViolations: existingData?.totalViolations ?? 0,
  };

  const cleanedRecord = cleanForFirestore(newRecord);
  await setDoc(studentRef, cleanedRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    snap.exists() ? 'update' : 'create',
    'student',
    docId,
    `تم ${snap.exists() ? 'تحديث بيانات' : 'إضافة'} الطالب: ${student.fullName} (${docId})`
  );

  return newRecord;
}

export async function updateStudentRecord(
  schoolId: string,
  studentId: string,
  updates: Partial<Omit<Student, 'id'>>,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  const studentRef = doc(db, 'schools', schoolId, 'students', studentId);
  const cleanedUpdates = cleanForFirestore(updates);
  await setDoc(studentRef, cleanedUpdates, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    'update',
    'student',
    studentId,
    `تم تحديث بيانات الطالب: ${updates.fullName || studentId}`
  );
}

export async function deleteStudent(
  schoolId: string,
  studentId: string,
  currentUser: AppUser,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  const studentRef = doc(db, 'schools', schoolId, 'students', studentId);
  await deleteDoc(studentRef);

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'student',
    studentId,
    `تم حذف سجل الطالب: ${studentName || studentId}`
  );
}

export async function deleteStudentsBatch(
  schoolId: string,
  studentIds: string[],
  currentUser: AppUser,
  reasonSummary?: string
): Promise<number> {
  if (!isFirebaseReady || !db || studentIds.length === 0) return 0;
  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const chunkSize = 200;
  let deletedCount = 0;

  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((id) => {
      const studentRef = doc(db, 'schools', targetSchoolId, 'students', id);
      batch.delete(studentRef);
    });
    try {
      await batch.commit();
      deletedCount += chunk.length;
    } catch (batchErr) {
      console.warn('Batch delete commit notice, fallback to individual:', batchErr);
      for (const id of chunk) {
        try {
          const studentRef = doc(db, 'schools', targetSchoolId, 'students', id);
          await deleteDoc(studentRef);
          deletedCount++;
        } catch {
          // ignore individual deletion error
        }
      }
    }
  }

  try {
    await createAuditLog(
      targetSchoolId,
      currentUser,
      'delete',
      'student',
      `bulk-${Date.now()}`,
      `تم حذف ${deletedCount} طالباً دفعة واحدة. ${reasonSummary || 'تجهيزاً لاستيراد دفعة جديدة'}`
    );
  } catch (err) {
    console.warn('Audit log notice:', err);
  }

  return deletedCount;
}

export async function deleteAllStudentsFromSchool(
  schoolId: string,
  currentUser: AppUser
): Promise<number> {
  if (!isFirebaseReady || !db) return 0;
  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const studentsCol = collection(db, 'schools', targetSchoolId, 'students');
  const snap = await safeGetDocs(studentsCol);
  const ids = snap.docs.map((d) => d.id);
  if (ids.length === 0) return 0;
  return await deleteStudentsBatch(
    targetSchoolId,
    ids,
    currentUser,
    'حذف وتفريغ جميع سجلات الطلبة الحالية بالمدرسة لإعادة استيراد ملف جديد'
  );
}

export async function batchImportStudentsToFirestore(
  schoolId: string,
  students: Array<Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>>,
  currentUser: AppUser
): Promise<number> {
  if (!isFirebaseReady || !db) return students.length;
  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;

  // Split into safe chunks (Firestore max batch is 500, we use 200 for high reliability)
  const chunkSize = 200;
  let savedCount = 0;

  for (let i = 0; i < students.length; i += chunkSize) {
    const chunk = students.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const seenDocsInBatch = new Set<string>();
    const sanitizedChunk: Student[] = [];

    for (let j = 0; j < chunk.length; j++) {
      const s = chunk[j];
      const rawId = String(s.studentNumber || (s as any).id || '').trim();
      const docId = rawId.replace(/[\/\\]/g, '-').replace(/\s+/g, '');
      if (!docId || seenDocsInBatch.has(docId)) continue;
      seenDocsInBatch.add(docId);

      const record: Student = {
        ...s,
        studentNumber: docId,
        id: docId,
        fullName: String(s.fullName || '').trim(),
        grade: s.grade || 'عاشر',
        section: s.section || '1',
        track: s.track || 'عام',
        status: s.status || 'منتظم',
        parentName: String(s.parentName || '').trim() || `ولي أمر الطالب`,
        parentPhone: String(s.parentPhone || '').trim(), // Never default to 0500000000
        parentRelation: s.parentRelation || 'الأب',
        enrollmentDate: s.enrollmentDate || new Date().toISOString().split('T')[0],
        totalTardiness: (s as any).totalTardiness ?? 0,
        totalViolations: (s as any).totalViolations ?? 0,
        importBatchId: s.importBatchId,
        importBatchDate: s.importBatchDate,
        schoolId: s.schoolId || targetSchoolId,
        nameEn: s.nameEn,
        schoolNameAr: s.schoolNameAr,
        schoolNameEn: s.schoolNameEn,
        schoolEmirate: s.schoolEmirate,
        council: s.council,
        schoolComplex: s.schoolComplex,
        sector: s.sector,
        contacts: s.contacts || [],
      };

      const cleanedRecord = cleanForFirestore(record);
      sanitizedChunk.push(cleanedRecord);
      const studentRef = doc(db, 'schools', targetSchoolId, 'students', docId);
      batch.set(studentRef, cleanedRecord, { merge: true });
    }

    try {
      await batch.commit();
      savedCount += sanitizedChunk.length;
    } catch (batchErr) {
      console.warn('Firestore batch commit error, switching to parallel individual writes:', batchErr);
      // Fast fallback using Promise.allSettled in small sub-chunks
      const subChunkSize = 20;
      for (let sc = 0; sc < sanitizedChunk.length; sc += subChunkSize) {
        const subChunk = sanitizedChunk.slice(sc, sc + subChunkSize);
        const settled = await Promise.allSettled(
          subChunk.map(async (record) => {
            const studentRef = doc(db, 'schools', targetSchoolId, 'students', record.id);
            const cleaned = cleanForFirestore(record);
            await setDoc(studentRef, cleaned, { merge: true });
          })
        );
        const successes = settled.filter((res) => res.status === 'fulfilled').length;
        savedCount += successes;
      }
    }
  }

  try {
    await createAuditLog(
      targetSchoolId,
      currentUser,
      'create',
      'student',
      `batch-${Date.now()}`,
      `تم استيراد دفعة طلبة بعدد ${savedCount} طالب من الجهاز عبر Excel`
    );
  } catch (err) {
    console.warn('Audit log creation notice:', err);
  }

  return savedCount;
}

export const saveStudentsBatch = batchImportStudentsToFirestore;

// ----------------------------------------------------------------------------
// MORNING DELAYS: schools/{schoolId}/morningDelays
// ----------------------------------------------------------------------------
export async function fetchMorningDelays(schoolId: string): Promise<TardinessRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const delaysCol = collection(db, 'schools', schoolId, 'morningDelays');
    const snap = await safeGetDocs(delaysCol);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TardinessRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch delays notice:', err);
    return [];
  }
}

export async function addMorningDelay(
  schoolId: string,
  record: Omit<TardinessRecord, 'id'>,
  currentUser: AppUser
): Promise<TardinessRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const delaysCol = collection(db, 'schools', schoolId, 'morningDelays');
  const addedDoc = await addDoc(delaysCol, record);

  // Update totalTardiness on the student document without touching violations or signatures
  const studentRef = doc(db, 'schools', schoolId, 'students', record.studentNumber);
  const studentSnap = await getDoc(studentRef);
  if (studentSnap.exists()) {
    const currTotal = studentSnap.data().totalTardiness ?? 0;
    await updateDoc(studentRef, { totalTardiness: currTotal + 1 });
  }

  await createAuditLog(
    schoolId,
    currentUser,
    'create',
    'morningDelay',
    addedDoc.id,
    `تسجيل تأخير صباحي للطالب: ${record.studentName} (${record.studentNumber}) بتاريخ ${record.date}`
  );

  return {
    ...record,
    id: addedDoc.id,
  };
}

export async function deleteMorningDelay(
  schoolId: string,
  delayId: string,
  currentUser: AppUser,
  studentNumber?: string
): Promise<number> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const delayRef = doc(db, 'schools', schoolId, 'morningDelays', delayId);
  await deleteDoc(delayRef);

  let newExactCount = 0;
  // Recalculate true totalTardiness for student from remaining delays
  if (studentNumber) {
    const delaysCol = collection(db, 'schools', schoolId, 'morningDelays');
    const remainingQ = query(delaysCol, where('studentNumber', '==', studentNumber));
    const remainingSnap = await safeGetDocs(remainingQ);
    newExactCount = remainingSnap.size;

    const studentRef = doc(db, 'schools', schoolId, 'students', studentNumber);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      await updateDoc(studentRef, { totalTardiness: newExactCount });
    }
  }

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'morningDelay',
    delayId,
    `حذف سجل تأخير صباحي${studentNumber ? ` للطالب (${studentNumber}) وإعادة احتساب الرصيد الحقيقي (${newExactCount})` : ''}`
  );

  return newExactCount;
}

export async function batchDeleteMorningDelays(
  schoolId: string,
  delayIds: string[],
  currentUser: AppUser,
  studentNumbers: string[] = []
): Promise<{ deletedCount: number; studentNewCounts: Record<string, number> }> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  if (delayIds.length === 0) return { deletedCount: 0, studentNewCounts: {} };

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const delaysCol = collection(db, 'schools', targetSchoolId, 'morningDelays');

  // Delete in batches of 200
  const chunkSize = 200;
  for (let i = 0; i < delayIds.length; i += chunkSize) {
    const chunk = delayIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(delaysCol, id));
    }
    await batch.commit();
  }

  // Recalculate exact totalTardiness for all affected unique studentNumbers
  const uniqueStudentNumbers = Array.from(new Set(studentNumbers.filter(Boolean)));
  const studentNewCounts: Record<string, number> = {};

  for (const sNum of uniqueStudentNumbers) {
    try {
      const q = query(delaysCol, where('studentNumber', '==', sNum));
      const snap = await safeGetDocs(q);
      const remainingCount = snap.size;
      studentNewCounts[sNum] = remainingCount;

      const studentRef = doc(db, 'schools', targetSchoolId, 'students', sNum);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        await updateDoc(studentRef, { totalTardiness: remainingCount });
      }
    } catch (err) {
      console.warn(`Error recalculating tardiness for student ${sNum}:`, err);
    }
  }

  await createAuditLog(
    targetSchoolId,
    currentUser,
    'delete',
    'morningDelay',
    `batch-delete-${Date.now()}`,
    `حذف جماعي لـ (${delayIds.length}) سجل تأخير صباحي وإعادة حساب أرصدة (${uniqueStudentNumbers.length}) طالب`
  );

  return {
    deletedCount: delayIds.length,
    studentNewCounts,
  };
}

export async function deleteAllMorningDelays(
  schoolId: string,
  currentUser: AppUser
): Promise<number> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  const role = currentUser.role;
  if (role !== 'systemAdmin' && role !== 'schoolAdmin' && role !== 'system_owner' && role !== 'school_admin') {
    throw new Error('غير مصرح لك بإجراء حذف كلي لسجلات التأخير الصباحي.');
  }

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const delaysCol = collection(db, 'schools', targetSchoolId, 'morningDelays');
  const allDelaysSnap = await safeGetDocs(delaysCol);
  const totalToDelete = allDelaysSnap.size;

  if (totalToDelete > 0) {
    const docs = allDelaysSnap.docs;
    const chunkSize = 200;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }
  }

  // Reset totalTardiness to 0 for all students in school
  const studentsCol = collection(db, 'schools', targetSchoolId, 'students');
  const studentsSnap = await safeGetDocs(studentsCol);
  if (!studentsSnap.empty) {
    const studentDocs = studentsSnap.docs;
    const chunkSize = 200;
    for (let i = 0; i < studentDocs.length; i += chunkSize) {
      const chunk = studentDocs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      for (const sd of chunk) {
        batch.update(sd.ref, { totalTardiness: 0 });
      }
      await batch.commit();
    }
  }

  await createAuditLog(
    targetSchoolId,
    currentUser,
    'delete',
    'morningDelay',
    `purge-all-${Date.now()}`,
    `حذف كامل وشامل لجميع سجلات التأخير الصباحي (${totalToDelete} سجل) وتصفير عداد التأخير لجميع الطلبة`
  );

  return totalToDelete;
}

export async function batchAddMorningDelays(
  schoolId: string,
  records: Array<Omit<TardinessRecord, 'id' | 'timestamp'>>,
  currentUser: AppUser
): Promise<{ successCount: number; duplicateCount: number; savedRecords: TardinessRecord[] }> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  if (records.length === 0) return { successCount: 0, duplicateCount: 0, savedRecords: [] };

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const delaysCol = collection(db, 'schools', targetSchoolId, 'morningDelays');

  // Check existing records to prevent duplication on the same date
  const existingRecords = await fetchMorningDelays(targetSchoolId);
  const existingSet = new Set(
    existingRecords.map((r) => `${r.studentNumber || r.studentId}_${r.date}`)
  );

  const savedRecords: TardinessRecord[] = [];
  let duplicateCount = 0;
  const now = Date.now();

  const chunkSize = 200;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const chunkToSave: Array<{ ref: DocumentReference; data: TardinessRecord }> = [];

    for (const rec of chunk) {
      const key = `${rec.studentNumber || rec.studentId}_${rec.date}`;
      if (existingSet.has(key)) {
        duplicateCount++;
        continue;
      }
      existingSet.add(key);

      const newDocRef = doc(delaysCol);
      const dataToSave: TardinessRecord = {
        ...rec,
        id: newDocRef.id,
        timestamp: now,
      };
      batch.set(newDocRef, dataToSave);
      chunkToSave.push({ ref: newDocRef, data: dataToSave });
    }

    if (chunkToSave.length > 0) {
      await batch.commit();
      for (const item of chunkToSave) {
        savedRecords.push(item.data);
      }
    }
  }

  // Update totalTardiness on affected student documents
  for (const saved of savedRecords) {
    if (saved.studentNumber) {
      try {
        const studentRef = doc(db, 'schools', targetSchoolId, 'students', saved.studentNumber);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          const currTardy = studentSnap.data().totalTardiness ?? 0;
          await updateDoc(studentRef, { totalTardiness: currTardy + 1 });
        }
      } catch (err) {
        console.warn('Update student totalTardiness error:', err);
      }
    }
  }

  if (savedRecords.length > 0) {
    await createAuditLog(
      targetSchoolId,
      currentUser,
      'create',
      'morningDelay',
      `batch-${Date.now()}`,
      `رصد تأخير صباحي جماعي لـ (${savedRecords.length}) طالباً`
    );
  }

  return {
    successCount: savedRecords.length,
    duplicateCount,
    savedRecords,
  };
}

export async function updateMorningDelay(
  schoolId: string,
  record: TardinessRecord,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const delayRef = doc(db, 'schools', targetSchoolId, 'morningDelays', record.id);
  await updateDoc(delayRef, {
    ...record,
  });

  await createAuditLog(
    targetSchoolId,
    currentUser,
    'update',
    'morningDelay',
    record.id,
    `تعديل سجل تأخير صباحي للطالب: ${record.studentName} (${record.studentNumber})`
  );
}

// ----------------------------------------------------------------------------
// ABSENCES: schools/{schoolId}/absences
// ----------------------------------------------------------------------------
export async function fetchAbsences(schoolId: string): Promise<AbsenceRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const absencesCol = collection(db, 'schools', schoolId, 'absences');
    const snap = await safeGetDocs(absencesCol);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AbsenceRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch absences notice:', err);
    return [];
  }
}

export async function addAbsence(
  schoolId: string,
  record: Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>,
  currentUser: AppUser
): Promise<AbsenceRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const absencesCol = collection(db, 'schools', targetSchoolId, 'absences');

  // Prevent duplicate absence for the same student on the same date
  const dupQ = query(
    absencesCol,
    where('studentNumber', '==', record.studentNumber),
    where('date', '==', record.date)
  );
  const dupSnap = await safeGetDocs(dupQ);
  if (!dupSnap.empty) {
    throw new Error(`تم تسجيل غياب الطالب (${record.studentName}) بالفعل في تاريخ ${record.date}`);
  }

  const nowStr = new Date().toISOString();
  const docData = {
    ...record,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  const addedDoc = await addDoc(absencesCol, docData);

  // Increment totalAbsences on student document if exists
  try {
    const studentRef = doc(db, 'schools', targetSchoolId, 'students', record.studentNumber);
    const studentSnap = await getDoc(studentRef);
    if (studentSnap.exists()) {
      const currAbs = studentSnap.data().totalAbsences ?? 0;
      await updateDoc(studentRef, { totalAbsences: currAbs + 1 });
    }
  } catch (studentErr) {
    console.warn('Update student totalAbsences notice:', studentErr);
  }

  await createAuditLog(
    targetSchoolId,
    currentUser,
    'create',
    'absence',
    addedDoc.id,
    `تسجيل غياب الطالب: ${record.studentName} (${record.studentNumber}) بتاريخ ${record.date} - ${record.status}`
  );

  return {
    ...docData,
    id: addedDoc.id,
  };
}

export async function batchAddAbsences(
  schoolId: string,
  records: Array<Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>>,
  currentUser: AppUser
): Promise<{ successCount: number; duplicateCount: number; savedRecords: AbsenceRecord[] }> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');
  if (records.length === 0) return { successCount: 0, duplicateCount: 0, savedRecords: [] };

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const absencesCol = collection(db, 'schools', targetSchoolId, 'absences');

  // Check existing records for the dates in this batch
  const existingRecords = await fetchAbsences(targetSchoolId);
  const existingSet = new Set(
    existingRecords.map((r) => `${r.studentNumber}_${r.date}`)
  );

  const savedRecords: AbsenceRecord[] = [];
  let duplicateCount = 0;
  const nowStr = new Date().toISOString();

  // Use Firestore batch (chunk size 200)
  const chunkSize = 200;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    const chunkToSave: Array<{ ref: DocumentReference; data: Omit<AbsenceRecord, 'id'> }> = [];

    for (const rec of chunk) {
      const key = `${rec.studentNumber}_${rec.date}`;
      if (existingSet.has(key)) {
        duplicateCount++;
        continue;
      }
      existingSet.add(key);

      const newDocRef = doc(absencesCol);
      const dataToSave = {
        ...rec,
        createdAt: nowStr,
        updatedAt: nowStr,
      };
      batch.set(newDocRef, dataToSave);
      chunkToSave.push({ ref: newDocRef, data: dataToSave });
    }

    if (chunkToSave.length > 0) {
      await batch.commit();
      for (const item of chunkToSave) {
        savedRecords.push({
          ...item.data,
          id: item.ref.id,
        });

        // Increment student totalAbsences
        try {
          const studentRef = doc(db, 'schools', targetSchoolId, 'students', item.data.studentNumber);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            const currAbs = studentSnap.data().totalAbsences ?? 0;
            await updateDoc(studentRef, { totalAbsences: currAbs + 1 });
          }
        } catch {
          // ignore individual student counter update error
        }
      }
    }
  }

  if (savedRecords.length > 0) {
    await createAuditLog(
      targetSchoolId,
      currentUser,
      'create',
      'absence',
      `batch-${Date.now()}`,
      `تسجيل غياب جماعي لعدد ${savedRecords.length} طالباً (${duplicateCount > 0 ? `${duplicateCount} مكرر تم تجاوزه` : 'بدون تكرار'})`
    );
  }

  return {
    successCount: savedRecords.length,
    duplicateCount,
    savedRecords,
  };
}

export async function updateAbsence(
  schoolId: string,
  record: AbsenceRecord,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const absenceRef = doc(db, 'schools', targetSchoolId, 'absences', record.id);
  const nowStr = new Date().toISOString();

  await updateDoc(absenceRef, {
    status: record.status,
    excuseStatus: record.excuseStatus,
    notes: record.notes || '',
    updatedAt: nowStr,
  });

  await createAuditLog(
    targetSchoolId,
    currentUser,
    'update',
    'absence',
    record.id,
    `تعديل حالة غياب الطالب: ${record.studentName} (${record.date}) إلى: ${record.status} (${record.excuseStatus})`
  );
}

export async function deleteAbsence(
  schoolId: string,
  absenceId: string,
  currentUser: AppUser,
  studentNumber?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const targetSchoolId = schoolId || DEFAULT_SCHOOL_ID;
  const absenceRef = doc(db, 'schools', targetSchoolId, 'absences', absenceId);
  await deleteDoc(absenceRef);

  let newExactCount = 0;
  // Recalculate true totalAbsences for student from remaining records
  if (studentNumber) {
    try {
      const absencesCol = collection(db, 'schools', targetSchoolId, 'absences');
      const remainingQ = query(absencesCol, where('studentNumber', '==', studentNumber));
      const remainingSnap = await safeGetDocs(remainingQ);
      newExactCount = remainingSnap.size;

      const studentRef = doc(db, 'schools', targetSchoolId, 'students', studentNumber);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        await updateDoc(studentRef, { totalAbsences: newExactCount });
      }
    } catch (err) {
      console.warn('Error recalculating absences for student:', err);
    }
  }

  await createAuditLog(
    targetSchoolId,
    currentUser,
    'delete',
    'absence',
    absenceId,
    `حذف سجل غياب${studentNumber ? ` للطالب: ${studentNumber}` : ''}`
  );
}

// ----------------------------------------------------------------------------
// VIOLATIONS: schools/{schoolId}/violations
// ----------------------------------------------------------------------------
export async function fetchViolations(schoolId: string): Promise<ViolationRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const violCol = collection(db, 'schools', schoolId, 'violations');
    const snap = await safeGetDocs(violCol);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ViolationRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch violations notice:', err);
    return [];
  }
}

export async function addViolation(
  schoolId: string,
  record: Omit<ViolationRecord, 'id' | 'createdAt' | 'updatedAt'>,
  currentUser: AppUser
): Promise<ViolationRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const nowIso = new Date().toISOString();
  const fullRecord: Omit<ViolationRecord, 'id'> = {
    ...record,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const violCol = collection(db, 'schools', schoolId, 'violations');
  const addedDoc = await addDoc(violCol, fullRecord);

  // Increment totalViolations on student document
  const studentRef = doc(db, 'schools', schoolId, 'students', record.studentNumber);
  const studentSnap = await getDoc(studentRef);
  if (studentSnap.exists()) {
    const currTotal = studentSnap.data().totalViolations ?? 0;
    await updateDoc(studentRef, { totalViolations: currTotal + 1 });
  }

  await createAuditLog(
    schoolId,
    currentUser,
    'create',
    'violation',
    addedDoc.id,
    `تسجيل مخالفة (${record.violationDegree}) للطالب: ${record.studentName} (${record.studentNumber})`
  );

  return {
    ...fullRecord,
    id: addedDoc.id,
  };
}

export async function updateViolation(
  schoolId: string,
  record: ViolationRecord,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const violRef = doc(db, 'schools', schoolId, 'violations', record.id);
  const updatedData = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  await updateDoc(violRef, updatedData);

  await createAuditLog(
    schoolId,
    currentUser,
    'update',
    'violation',
    record.id,
    `تحديث حالة مخالفة الطالب: ${record.studentName} إلى (${record.status})`
  );
}

export async function deleteViolation(
  schoolId: string,
  violationId: string,
  currentUser: AppUser,
  studentNumber?: string,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const violRef = doc(db, 'schools', schoolId, 'violations', violationId);
  const snap = await getDoc(violRef);
  let effectiveStudentNumber = studentNumber;
  let effectiveStudentName = studentName;
  if (snap.exists()) {
    const data = snap.data() as ViolationRecord;
    effectiveStudentNumber = effectiveStudentNumber || data.studentNumber;
    effectiveStudentName = effectiveStudentName || data.studentName;
  }

  await deleteDoc(violRef);

  let newExactViolations = 0;
  if (effectiveStudentNumber) {
    try {
      const violCol = collection(db, 'schools', schoolId, 'violations');
      const remainingQ = query(violCol, where('studentNumber', '==', effectiveStudentNumber));
      const remainingSnap = await safeGetDocs(remainingQ);
      newExactViolations = remainingSnap.size;

      const studentRef = doc(db, 'schools', schoolId, 'students', effectiveStudentNumber);
      const studentSnap = await getDoc(studentRef);
      if (studentSnap.exists()) {
        await updateDoc(studentRef, { totalViolations: newExactViolations });
      }
    } catch (err) {
      console.warn('Error recalculating violations for student:', err);
    }
  }

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'violation',
    violationId,
    `حذف مخالفة للطالب: ${effectiveStudentName || 'غير محدد'} (${effectiveStudentNumber || 'غير محدد'})`
  );
}

// ----------------------------------------------------------------------------
// WARNING FORMS: schools/{schoolId}/warningForms
// ----------------------------------------------------------------------------
export async function fetchWarningForms(schoolId: string): Promise<WarningFormRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const formsCol = collection(db, 'schools', schoolId, 'warningForms');
    const snap = await safeGetDocs(formsCol);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<WarningFormRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch warning forms notice:', err);
    return [];
  }
}

export async function saveWarningForm(
  schoolId: string,
  form: WarningFormRecord,
  currentUser: AppUser
): Promise<WarningFormRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formId = form.id || `wf-${Date.now()}`;
  const formRef = doc(db, 'schools', schoolId, 'warningForms', formId);

  const fullRecord: WarningFormRecord = {
    ...form,
    id: formId,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(formRef, fullRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    'update',
    'warningForm',
    formId,
    `حفظ/اعتماد نموذج تنبيه خطي رقم (9) للطالب: ${form.studentName} (${form.studentNumber})`
  );

  return fullRecord;
}

// ----------------------------------------------------------------------------
// PARENT SUMMON FORMS (MODEL 8): schools/{schoolId}/parentSummonForms
// ----------------------------------------------------------------------------
export async function fetchParentSummonForms(schoolId: string): Promise<ParentSummonFormRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const formsCol = collection(db, 'schools', schoolId, 'parentSummonForms');
    const snap = await safeGetDocs(formsCol);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ParentSummonFormRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch parent summon forms notice:', err);
    return [];
  }
}

export async function saveParentSummonForm(
  schoolId: string,
  form: ParentSummonFormRecord,
  currentUser: AppUser
): Promise<ParentSummonFormRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formId = form.id || `summon-${Date.now()}`;
  const formRef = doc(db, 'schools', schoolId, 'parentSummonForms', formId);

  const fullRecord: ParentSummonFormRecord = {
    ...form,
    id: formId,
    schoolId,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(formRef, fullRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    'update',
    'parentSummonForm',
    formId,
    `تحرير/حفظ خطاب استدعاء ولي الأمر (نموذج 8) للطالب: ${form.studentName} (${form.studentNumber}) - الحالة: ${form.status}`
  );

  return fullRecord;
}

export async function deleteParentSummonForm(
  schoolId: string,
  formId: string,
  currentUser: AppUser,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formRef = doc(db, 'schools', schoolId, 'parentSummonForms', formId);
  await deleteDoc(formRef);

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'parentSummonForm',
    formId,
    `حذف خطاب استدعاء ولي أمر (نموذج 8)${studentName ? ` للطالب: ${studentName}` : ''}`
  );
}

// ----------------------------------------------------------------------------
// VIOLATION REPORTS (MODEL 6): schools/{schoolId}/behaviorForms
// ----------------------------------------------------------------------------
export async function fetchViolationReports(schoolId: string): Promise<ViolationReportRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const formsCol = collection(db, 'schools', schoolId, 'behaviorForms');
    const q = query(formsCol, where('formType', '==', 'violation_report'));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ViolationReportRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch violation reports notice:', err);
    return [];
  }
}

export async function saveViolationReport(
  schoolId: string,
  form: ViolationReportRecord,
  currentUser: AppUser
): Promise<ViolationReportRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formId = form.id || `VR-${schoolId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);

  const existingSnap = await getDoc(formRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as ViolationReportRecord) : null;

  // Security check: If approved and user is not creating a correction version, lock direct content mutation
  if (existingData && existingData.status === 'معتمد' && form.status === 'معتمد' && !form.isCorrectionVersion) {
    // Only allow changing status to 'مغلق' or non-content updates
  }

  const nowIso = new Date().toISOString();
  const historyLogs = form.historyLogs || existingData?.historyLogs || [];

  // Append history log
  historyLogs.push({
    timestamp: nowIso,
    action: existingData ? (form.status === 'معتمد' ? 'اعتماد التقرير' : 'تحديث التقرير') : 'إنشاء التقرير كمسودة',
    userName: currentUser.fullName || currentUser.email,
    notes: `الحالة: ${form.status}`,
  });

  const fullRecord: ViolationReportRecord = {
    ...form,
    id: formId,
    reportNumber: form.reportNumber || formId,
    formType: 'violation_report',
    formNumber: 6,
    schoolId,
    historyLogs,
    updatedAt: nowIso,
  };

  if (form.status === 'معتمد' && (!existingData || existingData.status !== 'معتمد')) {
    fullRecord.approvedBy = currentUser.fullName || currentUser.email;
    fullRecord.approvedAt = nowIso;
    fullRecord.isLocked = true;
  }

  await setDoc(formRef, fullRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    existingData ? (form.status === 'معتمد' ? 'approve' : 'update') : 'create',
    'behaviorForms',
    formId,
    `تقرير مخالفة – نموذج رقم (6) للطالب: ${form.studentName} (${form.studentNumber}) - الحالة: ${form.status}`
  );

  return fullRecord;
}

export async function deleteViolationReport(
  schoolId: string,
  formId: string,
  currentUser: AppUser,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);
  const snap = await getDoc(formRef);
  if (snap.exists()) {
    const data = snap.data() as ViolationReportRecord;
    if (data.status === 'معتمد') {
      throw new Error('لا يمكن حذف تقرير مخالفة معتمد رسمياً حفاظاً على سجلات التدقيق والمصداقية.');
    }
  }

  await deleteDoc(formRef);

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'behaviorForms',
    formId,
    `حذف تقرير مخالفة (نموذج 6)${studentName ? ` للطالب: ${studentName}` : ''}`
  );
}

// ----------------------------------------------------------------------------
// MODEL 7: PARENT WARNING / NOTICE FORMS (تنبيه خطي / تحذير / إنذار إلى ولي الأمر - ملحق 7)
// ----------------------------------------------------------------------------
export async function fetchParentNoticeForms(schoolId: string): Promise<ParentNoticeFormRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const formsCol = collection(db, 'schools', schoolId, 'behaviorForms');
    const q = query(formsCol, where('formType', '==', 'parent_notice_form'));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ParentNoticeFormRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch parent notice forms notice:', err);
    return [];
  }
}

export async function saveParentNoticeForm(
  schoolId: string,
  form: ParentNoticeFormRecord,
  currentUser: AppUser
): Promise<ParentNoticeFormRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formId = form.id || `PN-${schoolId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);

  const existingSnap = await getDoc(formRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as ParentNoticeFormRecord) : null;

  const nowIso = new Date().toISOString();
  const historyLogs = form.historyLogs || existingData?.historyLogs || [];

  historyLogs.push({
    timestamp: nowIso,
    action: existingData
      ? form.status === 'معتمد ومسلّم'
        ? 'اعتماد التنبيه/الإنذار'
        : 'تحديث النموذج'
      : `تحرير ${form.noticeType} لولي الأمر`,
    userName: currentUser.fullName || currentUser.email,
    notes: `نوع الإشعار: ${form.noticeType} | الحالة: ${form.status}`,
  });

  const fullRecord: ParentNoticeFormRecord = {
    ...form,
    id: formId,
    formType: 'parent_notice_form',
    formNumber: 7,
    schoolId,
    historyLogs,
    updatedAt: nowIso,
  };

  if (form.status === 'معتمد ومسلّم' && (!existingData || existingData.status !== 'معتمد ومسلّم')) {
    fullRecord.approvedBy = currentUser.fullName || currentUser.email;
    fullRecord.approvedAt = nowIso;
    fullRecord.isLocked = true;
  }

  await setDoc(formRef, fullRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    existingData ? (form.status === 'معتمد ومسلّم' ? 'approve' : 'update') : 'create',
    'parentNoticeForm',
    formId,
    `إصدار ${form.noticeType} (نموذج 7) للطالب: ${form.studentName} (${form.studentNumber}) - الحالة: ${form.status}`
  );

  return fullRecord;
}

export async function deleteParentNoticeForm(
  schoolId: string,
  formId: string,
  currentUser: AppUser,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);
  const snap = await getDoc(formRef);
  if (snap.exists()) {
    const data = snap.data() as ParentNoticeFormRecord;
    if (data.status === 'معتمد ومسلّم') {
      throw new Error('لا يمكن حذف إشعار ولي أمر معتمد ومسلّم رسمياً حفاظاً على حقوق التوثيق.');
    }
  }

  await deleteDoc(formRef);

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'parentNoticeForm',
    formId,
    `حذف إشعار ولي الأمر (نموذج 7)${studentName ? ` للطالب: ${studentName}` : ''}`
  );
}

// ----------------------------------------------------------------------------
// MODEL 10: PARENT COMMITMENT ON REPEATED VIOLATIONS (تعهد ولي الأمر بتكرار المخالفات - ملحق 10)
// ----------------------------------------------------------------------------
export async function fetchParentCommitmentForms(schoolId: string): Promise<ParentCommitmentFormRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const formsCol = collection(db, 'schools', schoolId, 'behaviorForms');
    const q = query(formsCol, where('formType', '==', 'parent_commitment_form'));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ParentCommitmentFormRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch parent commitment forms notice:', err);
    return [];
  }
}

export async function saveParentCommitmentForm(
  schoolId: string,
  form: ParentCommitmentFormRecord,
  currentUser: AppUser
): Promise<ParentCommitmentFormRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formId = form.id || `PC-${schoolId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);

  const existingSnap = await getDoc(formRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as ParentCommitmentFormRecord) : null;

  const nowIso = new Date().toISOString();
  const historyLogs = form.historyLogs || existingData?.historyLogs || [];

  historyLogs.push({
    timestamp: nowIso,
    action: existingData
      ? form.status === 'معتمد ومسلّم'
        ? 'اعتماد وتوثيق التعهد'
        : 'تحديث التعهد'
      : 'تحرير تعهد ولي الأمر بتكرار المخالفات (نموذج 10)',
    userName: currentUser.fullName || currentUser.email,
    notes: `الحالة: ${form.status} | عدد المخالفات: ${form.violationsList.filter(Boolean).length}`,
  });

  const fullRecord: ParentCommitmentFormRecord = {
    ...form,
    id: formId,
    formType: 'parent_commitment_form',
    formNumber: 10,
    schoolId,
    historyLogs,
    updatedAt: nowIso,
  };

  if (form.status === 'معتمد ومسلّم' && (!existingData || existingData.status !== 'معتمد ومسلّم')) {
    fullRecord.approvedBy = currentUser.fullName || currentUser.email;
    fullRecord.approvedAt = nowIso;
    fullRecord.isLocked = true;
  }

  await setDoc(formRef, fullRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    existingData ? (form.status === 'معتمد ومسلّم' ? 'approve' : 'update') : 'create',
    'parentCommitmentForm',
    formId,
    `إصدار تعهد ولي الأمر بتكرار المخالفات (نموذج 10) للطالب: ${form.studentName} (${form.studentNumber}) - الحالة: ${form.status}`
  );

  return fullRecord;
}

export async function deleteParentCommitmentForm(
  schoolId: string,
  formId: string,
  currentUser: AppUser,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);
  const snap = await getDoc(formRef);
  if (snap.exists()) {
    const data = snap.data() as ParentCommitmentFormRecord;
    if (data.status === 'معتمد ومسلّم') {
      throw new Error('لا يمكن حذف تعهد ولي أمر معتمد ومسلّم رسمياً حفاظاً على حقوق التوثيق.');
    }
  }

  await deleteDoc(formRef);

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'parentCommitmentForm',
    formId,
    `حذف تعهد ولي الأمر (نموذج 10)${studentName ? ` للطالب: ${studentName}` : ''}`
  );
}

// ----------------------------------------------------------------------------
// MODEL 12: TEMPORARY SUSPENSION FORMS (قرار إيقاف مؤقت من الدراسة - ملحق 12)
// ----------------------------------------------------------------------------
export async function fetchTemporarySuspensionForms(schoolId: string): Promise<TemporarySuspensionFormRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const formsCol = collection(db, 'schools', schoolId, 'behaviorForms');
    const q = query(formsCol, where('formType', '==', 'temporary_suspension_form'));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TemporarySuspensionFormRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch temporary suspension forms notice:', err);
    return [];
  }
}

export async function saveTemporarySuspensionForm(
  schoolId: string,
  form: TemporarySuspensionFormRecord,
  currentUser: AppUser
): Promise<TemporarySuspensionFormRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formId = form.id || `TSF-${schoolId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);

  const existingSnap = await getDoc(formRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as TemporarySuspensionFormRecord) : null;

  const nowIso = new Date().toISOString();
  const fullRecord: TemporarySuspensionFormRecord = {
    ...form,
    id: formId,
    formType: 'temporary_suspension_form',
    formNumber: 12,
    schoolId,
    updatedAt: nowIso,
  };

  if (form.status === 'معتمد ومسلّم') {
    fullRecord.isLocked = true;
  }

  await setDoc(formRef, fullRecord, { merge: true });

  await createAuditLog(
    schoolId,
    currentUser,
    existingData ? 'update' : 'create',
    'temporarySuspensionForm',
    formId,
    `حفظ قرار إيقاف مؤقت من الدراسة (نموذج 12) للطالب: ${form.studentName} - رقم الجلسة: ${form.meetingNumber || 'غير محدد'}`
  );

  return fullRecord;
}

export async function deleteTemporarySuspensionForm(
  schoolId: string,
  formId: string,
  currentUser: AppUser,
  studentName?: string
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const formRef = doc(db, 'schools', schoolId, 'behaviorForms', formId);
  const snap = await getDoc(formRef);
  if (snap.exists()) {
    const data = snap.data() as TemporarySuspensionFormRecord;
    if (data.status === 'معتمد ومسلّم') {
      throw new Error('لا يمكن حذف قرار إيقاف مؤقت معتمد ومسلّم رسمياً حفاظاً على حقوق التوثيق.');
    }
  }

  await deleteDoc(formRef);

  await createAuditLog(
    schoolId,
    currentUser,
    'delete',
    'temporarySuspensionForm',
    formId,
    `حذف قرار إيقاف مؤقت من الدراسة (نموذج 12)${studentName ? ` للطالب: ${studentName}` : ''}`
  );
}

// ----------------------------------------------------------------------------
// BEHAVIOR COMMITTEE MEETINGS: /schools/{schoolId}/meetings & /schools/{schoolId}/committeeMeetings
// ----------------------------------------------------------------------------
export async function fetchCommitteeMeetingsFromFirestore(schoolId: string): Promise<BehaviorCommitteeMeeting[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const colMeetings = collection(db, 'schools', schoolId, 'meetings');
    const snapMeetings = await safeGetDocs(colMeetings);
    if (!snapMeetings.empty) {
      return snapMeetings.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<BehaviorCommitteeMeeting, 'id'>),
      }));
    }
    const col = collection(db, 'schools', schoolId, 'committeeMeetings');
    const snap = await safeGetDocs(col);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<BehaviorCommitteeMeeting, 'id'>),
    }));
  } catch (err) {
    console.warn('Fetch committee meetings from Firestore notice:', err);
    return [];
  }
}

export async function saveCommitteeMeetingFirestore(
  schoolId: string,
  meeting: BehaviorCommitteeMeeting,
  currentUser?: AppUser | null
): Promise<BehaviorCommitteeMeeting> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const meetingId = meeting.id || `COMM-${schoolId}-${Date.now()}`;
  const meetingRef = doc(db, 'schools', schoolId, 'meetings', meetingId);
  const legacyRef = doc(db, 'schools', schoolId, 'committeeMeetings', meetingId);

  const existingSnap = await getDoc(meetingRef);
  const nowIso = new Date().toISOString();

  const recordToSave: BehaviorCommitteeMeeting = cleanForFirestore({
    ...meeting,
    id: meetingId,
    updatedAt: nowIso,
    createdAt: meeting.createdAt || nowIso,
  });

  await Promise.allSettled([
    setDoc(meetingRef, recordToSave, { merge: true }),
    setDoc(legacyRef, recordToSave, { merge: true }),
  ]);

  if (currentUser) {
    await createAuditLog(
      schoolId,
      currentUser,
      existingSnap.exists() ? 'update' : 'create',
      'committeeMeeting',
      meetingId,
      `حفظ اجتماع لجنة إدارة السلوك: ${meeting.meetingNumber} - عدد الحالات: ${meeting.cases?.length || 0}`
    );
  }

  return recordToSave;
}

export async function deleteCommitteeMeetingFirestore(
  schoolId: string,
  meetingId: string,
  currentUser?: AppUser | null
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const meetingRef = doc(db, 'schools', schoolId, 'meetings', meetingId);
  const legacyRef = doc(db, 'schools', schoolId, 'committeeMeetings', meetingId);
  const snap = await getDoc(meetingRef);
  if (snap.exists()) {
    const data = snap.data() as BehaviorCommitteeMeeting;
    if (data.status === 'approved') {
      throw new Error('لا يمكن حذف اجتماع لجنة معتمد رسمياً حفاظاً على سجلات القرارات المعتمدة.');
    }
  }

  await Promise.allSettled([
    deleteDoc(meetingRef),
    deleteDoc(legacyRef),
  ]);

  if (currentUser) {
    await createAuditLog(
      schoolId,
      currentUser,
      'delete',
      'committeeMeeting',
      meetingId,
      `حذف اجتماع لجنة إدارة السلوك: ${meetingId}`
    );
  }
}

// ----------------------------------------------------------------------------
// USERS MANAGEMENT: /users
// ----------------------------------------------------------------------------
export async function fetchUsersList(schoolId?: string): Promise<AppUser[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const usersCol = collection(db, 'users');
    const snap = await safeGetDocs(usersCol);
    const users = snap.docs.map((d) => d.data() as AppUser);
    if (schoolId) {
      return users.filter((u) => u.schoolId === schoolId || isSystemOwner(u.role));
    }
    return users;
  } catch (err) {
    console.warn('Fetch users notice:', err);
    return [];
  }
}

export async function createUserRecord(
  userData: Omit<AppUser, 'createdAt'>,
  currentUser: AppUser
): Promise<AppUser> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const userRef = doc(db, 'users', userData.uid);
  const fullUser: AppUser = {
    ...userData,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, fullUser);

  await createAuditLog(
    userData.schoolId || currentUser.schoolId,
    currentUser,
    'create',
    'user',
    userData.uid,
    `إنشاء مستخدم جديد: ${userData.fullName} (${userData.email}) بدور: ${userData.role}`
  );

  return fullUser;
}

export async function toggleUserActiveStatus(
  targetUser: AppUser,
  newActive: boolean,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const userRef = doc(db, 'users', targetUser.uid);
  await updateDoc(userRef, { active: newActive });

  await createAuditLog(
    targetUser.schoolId || currentUser.schoolId,
    currentUser,
    'toggle_status',
    'user',
    targetUser.uid,
    `${newActive ? 'تفعيل' : 'إيقاف'} حساب المستخدم: ${targetUser.fullName} (${targetUser.email})`
  );
}

export async function updateUserRole(
  targetUser: AppUser,
  newRole: UserRole,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const userRef = doc(db, 'users', targetUser.uid);
  await updateDoc(userRef, { role: newRole });

  await createAuditLog(
    targetUser.schoolId || currentUser.schoolId,
    currentUser,
    'update',
    'user',
    targetUser.uid,
    `تعديل صلاحية المستخدم: ${targetUser.fullName} من (${targetUser.role}) إلى (${newRole})`
  );
}

export async function updateUserProfileData(
  targetUid: string,
  updates: {
    fullName?: string;
    photoURL?: string;
    phone?: string;
    jobTitle?: string;
  },
  currentUser: AppUser
): Promise<AppUser> {
  const updatedUser: AppUser = {
    ...currentUser,
    ...(updates.fullName !== undefined ? { fullName: updates.fullName, displayName: updates.fullName } : {}),
    ...(updates.photoURL !== undefined ? { photoURL: updates.photoURL } : {}),
    ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    ...(updates.jobTitle !== undefined ? { jobTitle: updates.jobTitle } : {}),
  };

  if (!isFirebaseReady || !db) {
    return updatedUser;
  }

  const userRef = doc(db, 'users', targetUid);
  const cleanUpdates: Record<string, any> = {};
  if (updates.fullName !== undefined) {
    cleanUpdates.fullName = updates.fullName;
    cleanUpdates.displayName = updates.fullName;
  }
  if (updates.photoURL !== undefined) cleanUpdates.photoURL = updates.photoURL;
  if (updates.phone !== undefined) cleanUpdates.phone = updates.phone;
  if (updates.jobTitle !== undefined) cleanUpdates.jobTitle = updates.jobTitle;

  await updateDoc(userRef, cleanUpdates);

  try {
    await createAuditLog(
      currentUser.schoolId || DEFAULT_SCHOOL_ID,
      currentUser,
      'update',
      'user',
      targetUid,
      `تحديث الملف الشخصي للمستخدم: ${updates.fullName || currentUser.fullName}`
    );
  } catch {
    // Non-blocking audit log
  }

  return updatedUser;
}

// ----------------------------------------------------------------------------
// IMPORT BATCH MANAGEMENT: schools/{schoolId}/students where importBatchId == batchId
// ----------------------------------------------------------------------------
export async function deleteImportBatch(
  schoolId: string,
  importBatchId: string,
  currentUser: AppUser
): Promise<{ deletedCount: number; studentIds: string[] }> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة البيانات غير متصلة.');
  }
  const targetSchoolId = schoolId || currentUser.schoolId || DEFAULT_SCHOOL_ID;
  const studentsCol = collection(db, 'schools', targetSchoolId, 'students');
  const q = query(studentsCol, where('importBatchId', '==', importBatchId));
  const snap = await safeGetDocs(q);

  let deletedCount = 0;
  const studentIds: string[] = [];

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    studentIds.push(d.id);
    batch.delete(d.ref);
    deletedCount++;
  });

  if (deletedCount > 0) {
    await batch.commit();
  }

  try {
    await createAuditLog(
      targetSchoolId,
      currentUser,
      'delete',
      'student',
      importBatchId,
      `تم حذف دفعة الاستيراد (${importBatchId}) بعدد ${deletedCount} طالب من قبل مدير النظام`
    );
  } catch (err) {
    console.warn('Audit log notice on batch deletion:', err);
  }

  return { deletedCount, studentIds };
}

// ----------------------------------------------------------------------------
// SYSTEM ADMIN OPTION: Purge Demo Data from Local Storage
// ----------------------------------------------------------------------------
export function purgeLocalDemoData(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove = [
      'alkhalil_counselor_students_v1',
      'alkhalil_counselor_tardiness_v1',
      'alkhalil_counselor_violations_v1',
      'alkhalil_counselor_warning_forms_v1',
      'alkhalil_counselor_auth_v1',
      'alkhalil_student_cases_v1',
      'alkhalil_student_case_forms_v1',
    ];
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error purging local demo data:', err);
  }
}


// ----------------------------------------------------------------------------
// CASE MANAGEMENT & COUNSELING MODULE (إدارة الحالات والإرشاد)
// Top-Level: studentCases/{caseId}
// Sub-Collection: studentCases/{caseId}/forms/{formId}
// ----------------------------------------------------------------------------

export async function fetchStudentCases(schoolId: string): Promise<StudentCaseRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const casesCol = collection(db, 'studentCases');
    const q = query(casesCol, where('schoolId', '==', schoolId));
    const snap = await safeGetDocs(q);
    const results: StudentCaseRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      results.push({
        id: docSnap.id,
        ...data,
      } as StudentCaseRecord);
    });
    // Sort descending by openedAt or createdAt
    return results.sort((a, b) => {
      const dateA = a.openedAt || a.createdAt || '';
      const dateB = b.openedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  } catch (err) {
    console.warn('Fetch student cases notice:', err);
    return [];
  }
}

export async function createStudentCase(
  schoolId: string,
  caseData: Omit<StudentCaseRecord, 'id' | 'createdAt' | 'updatedAt'>,
  currentUser: AppUser
): Promise<StudentCaseRecord> {
  const nowIso = new Date().toISOString();
  const caseId = caseData.caseNumber
    ? `case_${caseData.caseNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : `case_${Date.now()}`;

  const record: StudentCaseRecord = {
    ...caseData,
    id: caseId,
    schoolId,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (isFirebaseReady && db) {
    try {
      const caseRef = doc(db, 'studentCases', caseId);
      const cleanedRecord = cleanForFirestore({
        ...record,
        serverCreated: serverTimestamp(),
      });
      await setDoc(caseRef, cleanedRecord, { merge: true });

      await createAuditLog(
        schoolId,
        currentUser,
        'create',
        'studentCase',
        caseId,
        `تم فتح ملف حالة جديد برقم (${record.caseNumber}) للطالب: ${record.studentName || record.studentId} - نوع الحالة: (${record.caseType})`
      );
    } catch (err) {
      console.warn('Error saving student case to Firestore:', err);
    }
  }

  return record;
}

export async function updateStudentCase(
  schoolId: string,
  caseId: string,
  updates: Partial<StudentCaseRecord>,
  currentUser: AppUser
): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isFirebaseReady && db) {
    try {
      const caseRef = doc(db, 'studentCases', caseId);
      const cleanedUpdates = cleanForFirestore({
        ...updates,
        updatedAt: nowIso,
        updatedBy: currentUser.displayName || currentUser.email,
        serverUpdated: serverTimestamp(),
      });
      await setDoc(caseRef, cleanedUpdates, { merge: true });

      await createAuditLog(
        schoolId,
        currentUser,
        'update',
        'studentCase',
        caseId,
        `تم تحديث بيانات ملف الحالة (${caseId})`
      );
    } catch (err) {
      console.warn('Error updating student case in Firestore:', err);
    }
  }
}

export async function archiveStudentCase(
  schoolId: string,
  caseId: string,
  currentUser: AppUser,
  caseNumber?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isFirebaseReady && db) {
    try {
      const caseRef = doc(db, 'studentCases', caseId);
      await setDoc(
        caseRef,
        {
          status: 'مؤرشف',
          isArchived: true,
          updatedAt: nowIso,
          updatedBy: currentUser.displayName || currentUser.email,
          serverUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      await createAuditLog(
        schoolId,
        currentUser,
        'archive',
        'studentCase',
        caseId,
        `تم أرشفة ملف الحالة (${caseNumber || caseId}) وفق الصلاحيات الإرشادية`
      );
    } catch (err) {
      console.warn('Error archiving student case in Firestore:', err);
    }
  }
}

export async function fetchStudentCaseForm(
  caseId: string,
  formId = 'student_data_update'
): Promise<StudentCaseFormRecord | null> {
  if (!isFirebaseReady || !db) return null;
  try {
    const formRef = doc(db, 'studentCases', caseId, 'forms', formId);
    const snap = await safeGetDoc(formRef);
    if (snap.exists()) {
      return {
        id: snap.id,
        ...snap.data(),
      } as StudentCaseFormRecord;
    }
    return null;
  } catch (err) {
    console.warn('Fetch student case form notice:', err);
    return null;
  }
}

export async function saveStudentCaseForm(
  caseId: string,
  form: StudentCaseFormRecord,
  currentUser: AppUser,
  updateStudentMaster = false,
  masterUpdates?: Partial<Student>
): Promise<void> {
  const formId = form.id || 'student_data_update';
  const nowIso = new Date().toISOString();

  if (isFirebaseReady && db) {
    try {
      const formRef = doc(db, 'studentCases', caseId, 'forms', formId);
      const cleanedForm = cleanForFirestore({
        ...form,
        id: formId,
        caseId,
        updatedAt: nowIso,
        updatedBy: currentUser.displayName || currentUser.email,
        serverUpdated: serverTimestamp(),
      });
      await setDoc(formRef, cleanedForm, { merge: true });

      // Update case last modified
      const caseRef = doc(db, 'studentCases', caseId);
      await setDoc(
        caseRef,
        {
          updatedAt: nowIso,
          updatedBy: currentUser.displayName || currentUser.email,
        },
        { merge: true }
      );

      // Audit log
      await createAuditLog(
        form.schoolId,
        currentUser,
        'update',
        'studentCaseForm',
        `${caseId}_${formId}`,
        `تم حفظ ${form.formStatus === 'معتمد' ? 'واعتماد' : form.formStatus === 'مسودة' ? 'مسودة' : 'تحديث'} استمارة بيانات الطالب والأسرة للحالة (${caseId})`
      );

      // Update student master record if explicitly requested by user
      if (updateStudentMaster && form.studentId && masterUpdates) {
        const studentRef = doc(db, 'schools', form.schoolId, 'students', form.studentId);
        const cleanedMaster = cleanForFirestore({
          ...masterUpdates,
          updatedAt: nowIso,
          updatedBy: currentUser.displayName || currentUser.email,
        });
        await setDoc(studentRef, cleanedMaster, { merge: true });

        await createAuditLog(
          form.schoolId,
          currentUser,
          'update',
          'student',
          form.studentId,
          `تم تحديث بيانات الطالب الأساسية تزامناً مع اعتماد استمارة الحالة (${caseId})`
        );
      }
    } catch (err) {
      console.warn('Error saving student case form to Firestore:', err);
    }
  }
}

export async function logCaseAuditEvent(
  schoolId: string,
  caseId: string,
  action: 'open' | 'view' | 'print' | 'archive' | 'update',
  currentUser: AppUser,
  details: string
): Promise<void> {
  try {
    await createAuditLog(
      schoolId,
      currentUser,
      action,
      'studentCase',
      caseId,
      details
    );
  } catch (err) {
    console.warn('Audit log notice:', err);
  }
}

// ----------------------------------------------------------------------------
// INDIVIDUAL COUNSELING SESSIONS (استمارة الإرشاد الفردي ودراسة الحالة المصغرة)
// Path: studentCases/{caseId}/counselingSessions/{sessionId}
// ----------------------------------------------------------------------------

export async function fetchCounselingSessions(caseId: string): Promise<CounselingSessionRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const colRef = collection(db, 'studentCases', caseId, 'counselingSessions');
    const snap = await safeGetDocs(colRef);
    const results: CounselingSessionRecord[] = [];
    snap.forEach((docSnap) => {
      results.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as CounselingSessionRecord);
    });
    // Sort descending by sessionDate then createdAt
    return results.sort((a, b) => {
      const dateA = a.sessionDate || a.createdAt || '';
      const dateB = b.sessionDate || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
  } catch (err) {
    console.warn('Fetch counseling sessions notice:', err);
    return [];
  }
}

export async function createCounselingSession(
  caseId: string,
  sessionData: Omit<CounselingSessionRecord, 'id' | 'createdAt' | 'updatedAt'>,
  currentUser: AppUser
): Promise<CounselingSessionRecord> {
  const nowIso = new Date().toISOString();
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: CounselingSessionRecord = {
    ...sessionData,
    id: sessionId,
    caseId,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: currentUser.displayName || currentUser.email || 'المرشد الطلابي',
    updatedBy: currentUser.displayName || currentUser.email || 'المرشد الطلابي',
  };

  if (isFirebaseReady && db) {
    try {
      const docRef = doc(db, 'studentCases', caseId, 'counselingSessions', sessionId);
      const cleaned = cleanForFirestore({
        ...record,
        serverCreated: serverTimestamp(),
      });
      await setDoc(docRef, cleaned, { merge: true });

      // Update case last modified & next follow-up if specified
      const caseRef = doc(db, 'studentCases', caseId);
      const caseUpdates: any = {
        updatedAt: nowIso,
        updatedBy: currentUser.displayName || currentUser.email,
      };
      if (record.nextFollowUpAt) {
        caseUpdates.nextFollowUpAt = record.nextFollowUpAt;
      }
      await setDoc(caseRef, caseUpdates, { merge: true });

      await createAuditLog(
        record.schoolId,
        currentUser,
        'create',
        'counselingSession',
        sessionId,
        `تم تسجيل جلسة إرشاد فردي (${record.sessionNumber}) للحالة (${caseId}) - مستوى السرية: (${record.confidentialityLevel})`
      );
    } catch (err) {
      console.warn('Error saving counseling session to Firestore:', err);
    }
  }

  return record;
}

export async function updateCounselingSession(
  caseId: string,
  sessionId: string,
  updates: Partial<CounselingSessionRecord>,
  currentUser: AppUser,
  revisionReason?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isFirebaseReady && db) {
    try {
      const docRef = doc(db, 'studentCases', caseId, 'counselingSessions', sessionId);
      
      const payload: any = {
        ...updates,
        updatedAt: nowIso,
        updatedBy: currentUser.displayName || currentUser.email,
        serverUpdated: serverTimestamp(),
      };

      if (revisionReason) {
        payload.revisions = [
          ...(updates.revisions || []),
          {
            revisedAt: nowIso,
            revisedBy: currentUser.displayName || currentUser.email,
            reason: revisionReason,
          },
        ];
      }

      const cleaned = cleanForFirestore(payload);
      await setDoc(docRef, cleaned, { merge: true });

      // Update case next follow up if present
      const caseRef = doc(db, 'studentCases', caseId);
      const caseUpdates: any = {
        updatedAt: nowIso,
        updatedBy: currentUser.displayName || currentUser.email,
      };
      if (updates.nextFollowUpAt !== undefined) {
        caseUpdates.nextFollowUpAt = updates.nextFollowUpAt;
      }
      await setDoc(caseRef, caseUpdates, { merge: true });

      if (updates.schoolId) {
        await createAuditLog(
          updates.schoolId,
          currentUser,
          'update',
          'counselingSession',
          sessionId,
          `تم تحديث بيانات جلسة الإرشاد الفردي (${sessionId}) في الحالة (${caseId})${revisionReason ? ` - سبب التعديل: ${revisionReason}` : ''}`
        );
      }
    } catch (err) {
      console.warn('Error updating counseling session in Firestore:', err);
    }
  }
}

export async function archiveCounselingSession(
  caseId: string,
  sessionId: string,
  currentUser: AppUser,
  sessionNumber?: string,
  schoolId?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isFirebaseReady && db) {
    try {
      const docRef = doc(db, 'studentCases', caseId, 'counselingSessions', sessionId);
      await setDoc(
        docRef,
        {
          formStatus: 'مؤرشف',
          isArchived: true,
          archivedAt: nowIso,
          updatedAt: nowIso,
          updatedBy: currentUser.displayName || currentUser.email,
          serverUpdated: serverTimestamp(),
        },
        { merge: true }
      );

      if (schoolId) {
        await createAuditLog(
          schoolId,
          currentUser,
          'archive',
          'counselingSession',
          sessionId,
          `تم أرشفة جلسة الإرشاد الفردي (${sessionNumber || sessionId}) للحالة (${caseId})`
        );
      }
    } catch (err) {
      console.warn('Error archiving counseling session in Firestore:', err);
    }
  }
}

export async function logCounselingSessionAudit(
  schoolId: string,
  caseId: string,
  sessionId: string,
  action: 'open' | 'view' | 'print' | 'archive' | 'update' | 'create',
  currentUser: AppUser,
  details: string
): Promise<void> {
  try {
    await createAuditLog(
      schoolId,
      currentUser,
      action,
      'counselingSession',
      sessionId,
      details
    );
  } catch (err) {
    console.warn('Counseling session audit log notice:', err);
  }
}

// ----------------------------------------------------------------------------
// STAFF & EMPLOYEES REGISTRY (سجل الموظفين والكادر المدرسي)
// ----------------------------------------------------------------------------
export async function fetchEmployees(schoolId: string = DEFAULT_SCHOOL_ID): Promise<EmployeeRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const staffCol = collection(db, 'schools', validSchoolId, 'staff_members');
    const snap = await getDocs(staffCol);
    const list: EmployeeRecord[] = [];
    snap.forEach((docSnap) => {
      list.push(docSnap.data() as EmployeeRecord);
    });
    return list;
  } catch (err) {
    console.warn('fetchEmployees notice:', err);
    return [];
  }
}

export async function saveEmployeeFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  employee: EmployeeRecord,
  currentUser?: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const staffDoc = doc(db, 'schools', validSchoolId, 'staff_members', employee.id);
    await setDoc(staffDoc, { ...employee, schoolId: validSchoolId }, { merge: true });
    if (currentUser) {
      await createAuditLog(
        validSchoolId,
        currentUser,
        'update',
        'setting',
        employee.id,
        `حفظ بيانات الموظف: ${employee.fullName} (${employee.employeeNumber})`
      );
    }
  } catch (err) {
    console.warn('saveEmployeeFirestore notice:', err);
  }
}

export async function deleteEmployeeFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  employeeId: string,
  currentUser?: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const staffDoc = doc(db, 'schools', validSchoolId, 'staff_members', employeeId);
    await deleteDoc(staffDoc);
    if (currentUser) {
      await createAuditLog(
        validSchoolId,
        currentUser,
        'delete',
        'setting',
        employeeId,
        `حذف سجل موظف برقم: ${employeeId}`
      );
    }
  } catch (err) {
    console.warn('deleteEmployeeFirestore notice:', err);
  }
}

export async function batchSaveEmployeesFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  employees: EmployeeRecord[],
  currentUser?: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db || employees.length === 0) return;
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const batch = writeBatch(db);
    employees.forEach((emp) => {
      const staffDoc = doc(db, 'schools', validSchoolId, 'staff_members', emp.id);
      batch.set(staffDoc, { ...emp, schoolId: validSchoolId }, { merge: true });
    });
    await batch.commit();
    if (currentUser) {
      await createAuditLog(
        validSchoolId,
        currentUser,
        'create',
        'setting',
        'batch',
        `استيراد دفعة موظفين بعدد: ${employees.length}`
      );
    }
  } catch (err) {
    console.warn('batchSaveEmployeesFirestore notice:', err);
  }
}

// ----------------------------------------------------------------------------
// COMMITTEE FORMATION (تشكيل لجان إدارة السلوك)
// ----------------------------------------------------------------------------
export async function fetchCommitteeFormation(
  schoolId: string = DEFAULT_SCHOOL_ID
): Promise<CommitteeFormationConfig | null> {
  if (!isFirebaseReady || !db) return null;
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const formDoc = doc(db, 'schools', validSchoolId, 'committee_formation', 'active');
    const snap = await getDoc(formDoc);
    if (snap.exists()) {
      return snap.data() as CommitteeFormationConfig;
    }
    return null;
  } catch (err) {
    console.warn('fetchCommitteeFormation notice:', err);
    return null;
  }
}

export async function saveCommitteeFormationFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  config: CommitteeFormationConfig,
  currentUser?: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const formDoc = doc(db, 'schools', validSchoolId, 'committee_formation', 'active');
    await setDoc(formDoc, { ...config, schoolId: validSchoolId }, { merge: true });
    if (currentUser) {
      await createAuditLog(
        validSchoolId,
        currentUser,
        'update',
        'committeeMeeting',
        'active',
        `تحديث التشكيل الرسمي لأعضاء لجنة إدارة السلوك (${config.members.length} أعضاء)`
      );
    }
  } catch (err) {
    console.warn('saveCommitteeFormationFirestore notice:', err);
  }
}

// ============================================================================
// OFFICIAL DOCUMENTS & SIGNATURES MODULE (وحدة النماذج والتوقيعات المركزية)
// ============================================================================

export async function fetchOfficialDocuments(
  schoolId: string = DEFAULT_SCHOOL_ID
): Promise<OfficialDocumentRecord[]> {
  if (!isFirebaseReady || !db) return [];
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const docsCol = collection(db, 'schools', validSchoolId, 'officialDocuments');
    const snap = await safeGetDocs(docsCol);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<OfficialDocumentRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('fetchOfficialDocuments notice:', err);
    return [];
  }
}

export async function fetchOfficialDocumentsByStudent(
  schoolId: string = DEFAULT_SCHOOL_ID,
  studentId: string
): Promise<OfficialDocumentRecord[]> {
  if (!isFirebaseReady || !db || !studentId) return [];
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const docsCol = collection(db, 'schools', validSchoolId, 'officialDocuments');
    const q = query(docsCol, where('studentId', '==', studentId));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<OfficialDocumentRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('fetchOfficialDocumentsByStudent notice:', err);
    return [];
  }
}

export async function fetchOfficialDocumentsByViolation(
  schoolId: string = DEFAULT_SCHOOL_ID,
  violationId: string
): Promise<OfficialDocumentRecord[]> {
  if (!isFirebaseReady || !db || !violationId) return [];
  try {
    const validSchoolId = resolveCanonicalSchoolId(schoolId);
    const docsCol = collection(db, 'schools', validSchoolId, 'officialDocuments');
    const q = query(docsCol, where('violationId', '==', violationId));
    const snap = await safeGetDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<OfficialDocumentRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('fetchOfficialDocumentsByViolation notice:', err);
    return [];
  }
}

export async function saveOfficialDocumentFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  docRecord: OfficialDocumentRecord,
  currentUser: AppUser
): Promise<OfficialDocumentRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const docId = docRecord.id || `DOC-${Date.now().toString().slice(-6)}`;
  const docRef = doc(db, 'schools', validSchoolId, 'officialDocuments', docId);

  const existingSnap = await getDoc(docRef);
  const existingData = existingSnap.exists() ? (existingSnap.data() as OfficialDocumentRecord) : null;

  if (existingData?.isLocked && docRecord.isLocked && existingData.status === 'approved') {
    // If locked and approved, guard against unauthorized changes
    if (!isSchoolAdmin(currentUser.role) && !isSystemOwner(currentUser.role)) {
      throw new Error('لا يمكن تعديل مستند رسمي معتمد ومقفل إلا من قبل إدارة المدرسة ذات الصلاحية.');
    }
  }

  const now = new Date().toISOString();
  const updatedAudit: DocumentAuditLogEntry[] = [
    ...(docRecord.auditLog || []),
    {
      action: existingData ? 'update' : 'create',
      performedBy: currentUser.displayName || currentUser.fullName || currentUser.email || 'مستخدم النظام',
      role: currentUser.role,
      timestamp: now,
      details: existingData
        ? `تحديث المستند الرسمي (${docRecord.modelName} - ${docRecord.documentId})`
        : `إنشاء المستند الرسمي الجديد (${docRecord.modelName} - ${docRecord.documentId})`,
    },
  ];

  const fullRecord: OfficialDocumentRecord = {
    ...docRecord,
    id: docId,
    schoolId: validSchoolId,
    auditLog: updatedAudit,
    createdAt: docRecord.createdAt || now,
    updatedAt: now,
  };

  await setDoc(docRef, fullRecord, { merge: true });

  await createAuditLog(
    validSchoolId,
    currentUser,
    existingData ? 'update' : 'create',
    'behaviorForms',
    docId,
    `المستند الرسمي: ${docRecord.modelName} (رقم ${docRecord.modelNumber}) للطالب: ${docRecord.studentName} - الحالة: ${docRecord.status}`
  );

  return fullRecord;
}

export async function signOfficialDocumentFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  docId: string,
  signature: DocumentSignature,
  currentUser: AppUser
): Promise<OfficialDocumentRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const docRef = doc(db, 'schools', validSchoolId, 'officialDocuments', docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('المستند الرسمي غير موجود في قاعدة البيانات.');
  }

  const docRecord = snap.data() as OfficialDocumentRecord;
  const now = new Date().toISOString();

  // Replace existing signature of same role or add
  const existingSigs = (docRecord.signatures || []).filter((s) => s.role !== signature.role);
  const updatedSignatures = [...existingSigs, signature];

  const newStatus = docRecord.status === 'approved' ? 'approved' : 'signed';

  const updatedAudit: DocumentAuditLogEntry[] = [
    ...(docRecord.auditLog || []),
    {
      action: 'sign',
      performedBy: signature.signerName,
      role: signature.role,
      timestamp: now,
      details: `إضافة توقيع إلكتروني (${signature.roleTitleAr}) - طريقة التوقيع: ${
        signature.signatureType === 'drawn' ? 'رسم يدوي' : 'اعتماد رقمي'
      }`,
    },
  ];

  const updatedRecord: OfficialDocumentRecord = {
    ...docRecord,
    signatures: updatedSignatures,
    status: newStatus,
    auditLog: updatedAudit,
    updatedAt: now,
  };

  await setDoc(docRef, updatedRecord, { merge: true });

  await createAuditLog(
    validSchoolId,
    currentUser,
    'update',
    'behaviorForms',
    docId,
    `توقيع المستند الرسمي (${docRecord.modelName}) بواسطة (${signature.signerName} - ${signature.roleTitleAr})`
  );

  return updatedRecord;
}

export async function approveOfficialDocumentFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  docId: string,
  approvalData: {
    approvedBy: string;
    approvalDate: string;
    principalSignature?: DocumentSignature;
  },
  currentUser: AppUser
): Promise<OfficialDocumentRecord> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const docRef = doc(db, 'schools', validSchoolId, 'officialDocuments', docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('المستند المطلوب اعتماده غير موجود.');
  }

  const docRecord = snap.data() as OfficialDocumentRecord;
  const now = new Date().toISOString();

  let updatedSignatures = [...(docRecord.signatures || [])];
  if (approvalData.principalSignature) {
    updatedSignatures = updatedSignatures.filter((s) => s.role !== 'principal');
    updatedSignatures.push(approvalData.principalSignature);
  }

  const updatedAudit: DocumentAuditLogEntry[] = [
    ...(docRecord.auditLog || []),
    {
      action: 'approve',
      performedBy: approvalData.approvedBy,
      role: currentUser.role,
      timestamp: now,
      details: `اعتماد المستند رسمياً وإقفاله النهائي من قبل الإدارة المدرسية (${approvalData.approvedBy})`,
    },
  ];

  const approvedRecord: OfficialDocumentRecord = {
    ...docRecord,
    status: 'approved',
    signatures: updatedSignatures,
    approvedBy: approvalData.approvedBy,
    approvalDate: approvalData.approvalDate || now.split('T')[0],
    isLocked: true,
    auditLog: updatedAudit,
    updatedAt: now,
  };

  await setDoc(docRef, approvedRecord, { merge: true });

  await createAuditLog(
    validSchoolId,
    currentUser,
    'approve',
    'behaviorForms',
    docId,
    `اعتماد وإقفال المستند الرسمي (${docRecord.modelName} - ${docRecord.documentId}) للطالب (${docRecord.studentName})`
  );

  return approvedRecord;
}

export async function deleteOfficialDocumentFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  docId: string,
  currentUser: AppUser
): Promise<void> {
  if (!isFirebaseReady || !db) throw new Error('قاعدة البيانات غير متصلة.');

  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const docRef = doc(db, 'schools', validSchoolId, 'officialDocuments', docId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data() as OfficialDocumentRecord;
    if (data.status === 'approved' || data.isLocked) {
      throw new Error('لا يمكن حذف مستند رسمي معتمد وموثق نهائياً لحفظ سجلات التدقيق والمصداقية القانونية.');
    }
  }

  await deleteDoc(docRef);

  await createAuditLog(
    validSchoolId,
    currentUser,
    'delete',
    'behaviorForms',
    docId,
    `حذف مستند رسمي غير معتمد (معرف ${docId})`
  );
}

// ============================================================================
// SMART GUIDANCE & COUNSELING SYSTEM FIRESTORE SERVICES
// (لوحة متابعة المرشد، الخطط السنوية والفصلية، تحليل الاحتياجات، المهام، الإحالات)
// ============================================================================

export async function fetchGuidancePlansFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID
): Promise<GuidancePlanRecord[]> {
  if (!isFirebaseReady || !db) return [];
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  try {
    const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'guidance_plans_registry');
    const snap = await getDoc(schoolDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      return snap.data().items as GuidancePlanRecord[];
    }
    const fallbackRef = doc(db, 'settings', `guidance_plans_${validSchoolId}`);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists() && Array.isArray(fallbackSnap.data()?.items)) {
      return fallbackSnap.data().items as GuidancePlanRecord[];
    }
    return [];
  } catch (err) {
    console.warn('fetchGuidancePlansFirestore error:', err);
    throw err;
  }
}

export async function saveGuidancePlanFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  plan: GuidancePlanRecord,
  currentUser?: AppUser | null
): Promise<GuidancePlanRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentPlans = await fetchGuidancePlansFirestore(validSchoolId).catch(() => []);
  const now = new Date().toISOString();
  const normalizedPlan: GuidancePlanRecord = {
    ...plan,
    schoolId: validSchoolId,
    updatedAt: now,
    createdAt: plan.createdAt || now,
  };

  const exists = currentPlans.some((p) => p.id === normalizedPlan.id);
  const updatedList = exists
    ? currentPlans.map((p) => (p.id === normalizedPlan.id ? normalizedPlan : p))
    : [normalizedPlan, ...currentPlans];

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'guidance_plans_registry');
  await setDoc(
    schoolDocRef,
    {
      schoolId: validSchoolId,
      updatedAt: now,
      updatedBy: currentUser?.fullName || 'أمير علي عبدالشاكر بكري',
      items: stripUndefinedDeep(updatedList),
    },
    { merge: true }
  );

  try {
    const settingsRef = doc(db, 'settings', `guidance_plans_${validSchoolId}`);
    await setDoc(
      settingsRef,
      {
        schoolId: validSchoolId,
        updatedAt: now,
        items: stripUndefinedDeep(updatedList),
      },
      { merge: true }
    );
  } catch {
    // Secondary mirror is optional if role is counselor-only
  }

  if (currentUser) {
    await createAuditLog(
      validSchoolId,
      currentUser,
      exists ? 'update' : 'create',
      'setting',
      normalizedPlan.id,
      `${exists ? 'تحديث' : 'إنشاء'} خطة إرشادية (${normalizedPlan.title}) - العام ${normalizedPlan.academicYear}`
    ).catch(() => {});
  }

  return updatedList;
}

export async function deleteGuidancePlanFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  planId: string,
  currentUser?: AppUser | null
): Promise<GuidancePlanRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentPlans = await fetchGuidancePlansFirestore(validSchoolId).catch(() => []);
  const updatedList = currentPlans.filter((p) => p.id !== planId);
  const now = new Date().toISOString();

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'guidance_plans_registry');
  await setDoc(
    schoolDocRef,
    {
      schoolId: validSchoolId,
      updatedAt: now,
      items: stripUndefinedDeep(updatedList),
    },
    { merge: true }
  );

  try {
    const settingsRef = doc(db, 'settings', `guidance_plans_${validSchoolId}`);
    await setDoc(settingsRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });
  } catch {}

  if (currentUser) {
    await createAuditLog(validSchoolId, currentUser, 'delete', 'setting', planId, `حذف خطة إرشادية (${planId})`).catch(() => {});
  }

  return updatedList;
}

export async function fetchNeedsAssessmentsFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID
): Promise<NeedsAssessmentRecord[]> {
  if (!isFirebaseReady || !db) return [];
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  try {
    const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'needs_assessments_registry');
    const snap = await getDoc(schoolDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      return snap.data().items as NeedsAssessmentRecord[];
    }
    const fallbackRef = doc(db, 'settings', `needs_assessments_${validSchoolId}`);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists() && Array.isArray(fallbackSnap.data()?.items)) {
      return fallbackSnap.data().items as NeedsAssessmentRecord[];
    }
    return [];
  } catch (err) {
    console.warn('fetchNeedsAssessmentsFirestore error:', err);
    throw err;
  }
}

export async function saveNeedsAssessmentFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  needRecord: NeedsAssessmentRecord,
  currentUser?: AppUser | null
): Promise<NeedsAssessmentRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentList = await fetchNeedsAssessmentsFirestore(validSchoolId).catch(() => []);
  const now = new Date().toISOString();
  const normalized: NeedsAssessmentRecord = {
    ...needRecord,
    schoolId: validSchoolId,
    updatedAt: now,
    createdAt: needRecord.createdAt || now,
  };

  const exists = currentList.some((n) => n.id === normalized.id);
  const updatedList = exists
    ? currentList.map((n) => (n.id === normalized.id ? normalized : n))
    : [normalized, ...currentList];

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'needs_assessments_registry');
  await setDoc(
    schoolDocRef,
    {
      schoolId: validSchoolId,
      updatedAt: now,
      items: stripUndefinedDeep(updatedList),
    },
    { merge: true }
  );

  try {
    const settingsRef = doc(db, 'settings', `needs_assessments_${validSchoolId}`);
    await setDoc(settingsRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });
  } catch {}

  if (currentUser) {
    await createAuditLog(
      validSchoolId,
      currentUser,
      exists ? 'update' : 'create',
      'setting',
      normalized.id,
      `${exists ? 'تحديث' : 'إضافة'} تحليل احتياجات واستبانة (${normalized.title})`
    ).catch(() => {});
  }

  return updatedList;
}

export async function deleteNeedsAssessmentFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  needId: string,
  currentUser?: AppUser | null
): Promise<NeedsAssessmentRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentList = await fetchNeedsAssessmentsFirestore(validSchoolId).catch(() => []);
  const updatedList = currentList.filter((n) => n.id !== needId);
  const now = new Date().toISOString();

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'needs_assessments_registry');
  await setDoc(schoolDocRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });

  try {
    const settingsRef = doc(db, 'settings', `needs_assessments_${validSchoolId}`);
    await setDoc(settingsRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });
  } catch {}

  return updatedList;
}

export async function fetchCounselorTasksFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID
): Promise<CounselorTaskRecord[]> {
  if (!isFirebaseReady || !db) return [];
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  try {
    const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'counselor_tasks_registry');
    const snap = await getDoc(schoolDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      return snap.data().items as CounselorTaskRecord[];
    }
    const fallbackRef = doc(db, 'settings', `counselor_tasks_${validSchoolId}`);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists() && Array.isArray(fallbackSnap.data()?.items)) {
      return fallbackSnap.data().items as CounselorTaskRecord[];
    }
    return [];
  } catch (err) {
    console.warn('fetchCounselorTasksFirestore error:', err);
    throw err;
  }
}

export async function saveCounselorTaskFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  task: CounselorTaskRecord,
  currentUser?: AppUser | null
): Promise<CounselorTaskRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentList = await fetchCounselorTasksFirestore(validSchoolId).catch(() => []);
  const now = new Date().toISOString();
  const normalized: CounselorTaskRecord = {
    ...task,
    schoolId: validSchoolId,
    updatedAt: now,
    createdAt: task.createdAt || now,
  };

  const exists = currentList.some((t) => t.id === normalized.id);
  const updatedList = exists
    ? currentList.map((t) => (t.id === normalized.id ? normalized : t))
    : [normalized, ...currentList];

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'counselor_tasks_registry');
  await setDoc(schoolDocRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });

  try {
    const settingsRef = doc(db, 'settings', `counselor_tasks_${validSchoolId}`);
    await setDoc(settingsRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });
  } catch {}

  return updatedList;
}

export async function deleteCounselorTaskFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  taskId: string
): Promise<CounselorTaskRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentList = await fetchCounselorTasksFirestore(validSchoolId).catch(() => []);
  const updatedList = currentList.filter((t) => t.id !== taskId);
  const now = new Date().toISOString();

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'counselor_tasks_registry');
  await setDoc(schoolDocRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });

  try {
    const settingsRef = doc(db, 'settings', `counselor_tasks_${validSchoolId}`);
    await setDoc(settingsRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });
  } catch {}

  return updatedList;
}

export async function fetchStudentReferralsFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID
): Promise<StudentReferralRecord[]> {
  if (!isFirebaseReady || !db) return [];
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  try {
    const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'student_referrals_registry');
    const snap = await getDoc(schoolDocRef);
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      return snap.data().items as StudentReferralRecord[];
    }
    const fallbackRef = doc(db, 'settings', `student_referrals_${validSchoolId}`);
    const fallbackSnap = await getDoc(fallbackRef);
    if (fallbackSnap.exists() && Array.isArray(fallbackSnap.data()?.items)) {
      return fallbackSnap.data().items as StudentReferralRecord[];
    }
    return [];
  } catch (err) {
    console.warn('fetchStudentReferralsFirestore error:', err);
    throw err;
  }
}

export async function saveStudentReferralFirestore(
  schoolId: string = DEFAULT_SCHOOL_ID,
  referral: StudentReferralRecord,
  currentUser?: AppUser | null
): Promise<StudentReferralRecord[]> {
  if (!isFirebaseReady || !db) {
    throw new Error('قاعدة بيانات Firestore غير متصلة حالياً.');
  }
  const validSchoolId = resolveCanonicalSchoolId(schoolId);
  const currentList = await fetchStudentReferralsFirestore(validSchoolId).catch(() => []);
  const now = new Date().toISOString();
  const normalized: StudentReferralRecord = {
    ...referral,
    schoolId: validSchoolId,
    updatedAt: now,
    createdAt: referral.createdAt || now,
  };

  const exists = currentList.some((r) => r.id === normalized.id);
  const updatedList = exists
    ? currentList.map((r) => (r.id === normalized.id ? normalized : r))
    : [normalized, ...currentList];

  const schoolDocRef = doc(db, 'schools', validSchoolId, 'committee_formation', 'student_referrals_registry');
  await setDoc(schoolDocRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });

  try {
    const settingsRef = doc(db, 'settings', `student_referrals_${validSchoolId}`);
    await setDoc(settingsRef, { schoolId: validSchoolId, updatedAt: now, items: stripUndefinedDeep(updatedList) }, { merge: true });
  } catch {}

  if (currentUser) {
    await createAuditLog(
      validSchoolId,
      currentUser,
      exists ? 'update' : 'create',
      'studentCase',
      normalized.id,
      `${exists ? 'تحديث' : 'إرسال'} إحالة طلابية (${normalized.referralNumber}) للطالب ${normalized.studentName}`
    ).catch(() => {});
  }

  return updatedList;
}

