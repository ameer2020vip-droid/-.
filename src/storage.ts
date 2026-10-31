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
  CounselorUser,
  DashboardStats,
  TimelineEvent,
  BehavioralCase,
  CaseWorkflowStatus,
  BehaviorModificationPlan,
  PositiveBehaviorRecord,
  ParentMeetingRecord,
  BehaviorCommitteeMeeting,
  BehaviorCommitteeDecision,
  CustomFormTemplate,
  CommitteeMember,
  CommitteeNotificationLog,
  StudentCaseRecord,
  StudentCaseFormRecord,
  CounselingSessionRecord,
  BehaviorDeductionNoticeRecord,
  ViolationCompensationRecord,
  DeviceConfiscationRecord,
  DeviceReturnRecord,
  AuthorizedPickupCommitmentRecord,
  AttendanceCommitmentRecord,
  TemporarySuspensionFormRecord,
  TrackAuditLog,
  AcademicTrack,
  EmployeeRecord,
  CommitteeMemberConfig,
  CommitteeFormationConfig,
  OfficialDocumentRecord,
  GuidancePlanRecord,
  NeedsAssessmentRecord,
  CounselorTaskRecord,
  StudentReferralRecord,
  EditableMessageTemplate,
  ParentMessageCampaign,
  ParentMessageItem,
  ParentMessageType,
  CounselorNotification,
  CounselorNotificationType,
} from './types';
import {
  DEFAULT_COUNSELOR,
  INITIAL_STUDENTS,
  getInitialTardinessRecords,
  getInitialViolations,
  getInitialWarningForms,
} from './mockData';
import { getUaeTodayDateString } from './utils/time';
import { normalizeStudentNumber } from './utils/almanhalParser';

const STORAGE_KEYS = {
  STUDENTS: 'alkhalil_counselor_students_v1',
  TARDINESS: 'alkhalil_counselor_tardiness_v1',
  ABSENCES: 'alkhalil_counselor_absences_v1',
  VIOLATIONS: 'alkhalil_counselor_violations_v1',
  WARNING_FORMS: 'alkhalil_counselor_warning_forms_v1',
  PARENT_SUMMONS: 'alkhalil_counselor_parent_summons_v1',
  VIOLATION_REPORTS: 'alkhalil_counselor_violation_reports_v1',
  PARENT_NOTICES: 'alkhalil_counselor_parent_notices_v1',
  PARENT_COMMITMENTS: 'alkhalil_counselor_parent_commitments_v1',
  AUTH_USER: 'alkhalil_counselor_auth_v1',
  THEME: 'alkhalil_counselor_theme_v1',
  CASES: 'alkhalil_counselor_cases_v2',
  BEHAVIOR_PLANS: 'alkhalil_counselor_behavior_plans_v2',
  POSITIVE_BEHAVIORS: 'alkhalil_counselor_positive_v2',
  PARENT_MEETINGS: 'alkhalil_counselor_parent_meetings_v2',
  COMMITTEE_MEETINGS: 'alkhalil_counselor_committee_v2',
  COMMITTEE_DECISIONS: 'alkhalil_counselor_committee_decisions_v2',
  FORM_TEMPLATES: 'alkhalil_counselor_form_templates_v2',
  COMMITTEE_MEMBERS: 'alkhalil_committee_members_v1',
  COMMITTEE_NOTIFICATIONS: 'alkhalil_committee_notifications_v1',
  STUDENT_CASES: 'alkhalil_student_cases_v1',
  STUDENT_CASE_FORMS: 'alkhalil_student_case_forms_v1',
  COUNSELING_SESSIONS: 'alkhalil_counseling_sessions_v1',
  BEHAVIOR_DEDUCTIONS: 'alkhalil_behavior_deductions_m20_v1',
  VIOLATION_COMPENSATIONS: 'alkhalil_violation_compensations_m21_v1',
  DEVICE_CONFISCATIONS: 'alkhalil_device_confiscations_m24_v1',
  DEVICE_RETURNS: 'alkhalil_device_returns_m25_v1',
  AUTHORIZED_PICKUPS: 'alkhalil_authorized_pickups_m26_v1',
  ATTENDANCE_COMMITMENTS: 'alkhalil_attendance_commitments_m27_v1',
  TEMPORARY_SUSPENSIONS: 'alkhalil_temporary_suspensions_m12_v1',
  TRACK_AUDIT_LOGS: 'alkhalil_counselor_track_audit_logs_v1',
  STAFF_EMPLOYEES: 'alkhalil_staff_employees_v1',
  COMMITTEE_FORMATION: 'alkhalil_committee_formation_v1',
  OFFICIAL_DOCUMENTS: 'alkhalil_official_documents_v1',
  GUIDANCE_PLANS: 'alkhalil_guidance_plans_v1',
  NEEDS_ASSESSMENTS: 'alkhalil_needs_assessments_v1',
  COUNSELOR_TASKS: 'alkhalil_counselor_tasks_v1',
  STUDENT_REFERRALS: 'alkhalil_student_referrals_v1',
  EDITABLE_TEMPLATES: 'alkhalil_editable_msg_templates_v1',
  PARENT_CAMPAIGNS: 'alkhalil_parent_msg_campaigns_v1',
  ACTIVE_PARENT_CAMPAIGN_ID: 'alkhalil_active_parent_campaign_id_v1',
  COUNSELOR_NOTIFICATIONS: 'alkhalil_counselor_notifications_v1',
  COUNSELOR_ACKNOWLEDGED_KEYS: 'alkhalil_counselor_acknowledged_keys_v1',
};

// Event dispatcher for reactive updates across components
export const STORAGE_EVENT_NAME = 'alkhalil_counselor_storage_updated';

function notifyStorageChange() {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new Event(STORAGE_EVENT_NAME));
    }, 0);
  }
}

// ----------------------------------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------------------------------
export function getCurrentUser(): CounselorUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CounselorUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }
  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// STUDENTS
// ----------------------------------------------------------------------------
export function getStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      // Seed initial data
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
      return INITIAL_STUDENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_STUDENTS;
  }
}

export function saveStudents(students: Student[]): void {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  notifyStorageChange();
}

export function getStudentById(id: string): Student | undefined {
  const students = getStudents();
  return students.find((s) => s.id === id || s.studentNumber === id);
}

export function addStudent(studentData: Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>): Student {
  const students = getStudents();
  const newStudent: Student = {
    ...studentData,
    id: `std-${Date.now()}`,
    totalTardiness: 0,
    totalViolations: 0,
  };
  const updated = [newStudent, ...students];
  saveStudents(updated);
  return newStudent;
}

export function importStudents(newStudents: Array<Omit<Student, 'id' | 'totalTardiness' | 'totalViolations'>>): number {
  const existing = getStudents();
  const tardinessRecords = getTardinessRecords();
  const violations = getViolations();
  const absences = getAbsences();

  // Index existing students by normalized studentNumber and id
  const existingMap = new Map<string, Student>();
  existing.forEach((s) => {
    const num = normalizeStudentNumber(s.studentNumber);
    if (num) existingMap.set(num, s);
    const id = normalizeStudentNumber(s.id);
    if (id) existingMap.set(id, s);
  });

  const updatedStudents: Student[] = [];
  const handledKeys = new Set<string>();

  // Process all incoming students
  for (const s of newStudents) {
    const normNum = normalizeStudentNumber(s.studentNumber || (s as any).id);
    if (!normNum) continue;

    const existingStudent = existingMap.get(normNum);
    const studentId = existingStudent ? existingStudent.id : normNum;

    // Recalculate true counts from historical records to guarantee 100% preservation
    const trueTardiness = tardinessRecords.filter(
      (t) => (t.studentId && (t.studentId === studentId || t.studentId === normNum)) ||
             (t.studentNumber && (t.studentNumber === normNum || (existingStudent?.studentNumber && t.studentNumber === existingStudent.studentNumber)))
    ).length;

    const trueViolations = violations.filter(
      (v) => (v.studentId && (v.studentId === studentId || v.studentId === normNum)) ||
             (v.studentNumber && (v.studentNumber === normNum || (existingStudent?.studentNumber && v.studentNumber === existingStudent.studentNumber)))
    ).length;

    const trueAbsences = absences.filter(
      (a) => (a.studentId && (a.studentId === studentId || a.studentId === normNum)) ||
             (a.studentNumber && (a.studentNumber === normNum || (existingStudent?.studentNumber && a.studentNumber === existingStudent.studentNumber)))
    ).length;

    const finalTardiness = Math.max(existingStudent?.totalTardiness || 0, trueTardiness);
    const finalViolations = Math.max(existingStudent?.totalViolations || 0, trueViolations);
    const finalAbsences = Math.max(existingStudent?.totalAbsences || 0, trueAbsences);

    const mergedStudent: Student = {
      ...existingStudent,
      ...s,
      id: studentId,
      studentNumber: normNum,
      fullName: s.fullName,
      grade: s.grade,
      section: s.section,
      track: s.track,
      status: existingStudent?.status || s.status || 'منتظم',
      parentName: s.parentName || existingStudent?.parentName || `ولي أمر الطالب`,
      parentPhone: s.parentPhone || existingStudent?.parentPhone || '',
      parentRelation: s.parentRelation || existingStudent?.parentRelation || 'الأب',
      enrollmentDate: s.enrollmentDate || existingStudent?.enrollmentDate || new Date().toISOString().split('T')[0],
      totalTardiness: finalTardiness,
      totalViolations: finalViolations,
      totalAbsences: finalAbsences,
      importBatchId: s.importBatchId,
      importBatchDate: s.importBatchDate,
    };

    updatedStudents.push(mergedStudent);
    handledKeys.add(normNum);
    if (existingStudent) {
      handledKeys.add(normalizeStudentNumber(existingStudent.id));
    }
  }

  // Also retain any pre-existing students not included in this imported batch
  for (const prev of existing) {
    const normNum = normalizeStudentNumber(prev.studentNumber);
    const normId = normalizeStudentNumber(prev.id);
    if (!handledKeys.has(normNum) && !handledKeys.has(normId)) {
      updatedStudents.push(prev);
      handledKeys.add(normNum);
      handledKeys.add(normId);
    }
  }

  saveStudents(updatedStudents);
  return newStudents.length;
}

/**
 * Synchronizes every student's totalTardiness and totalViolations counters
 * with the exact count of physical historical records in storage.
 */
export function syncAllStudentsViolationAndTardinessCounts(): void {
  const students = getStudents();
  const tardinessRecords = getTardinessRecords();
  const violations = getViolations();
  const absences = getAbsences();

  let modified = false;
  const updated = students.map((s) => {
    const sId = s.id;
    const sNum = normalizeStudentNumber(s.studentNumber);

    const actualTardiness = tardinessRecords.filter(
      (t) => (t.studentId && (t.studentId === sId || t.studentId === sNum)) ||
             (t.studentNumber && t.studentNumber === sNum)
    ).length;

    const actualViolations = violations.filter(
      (v) => (v.studentId && (v.studentId === sId || v.studentId === sNum)) ||
             (v.studentNumber && v.studentNumber === sNum)
    ).length;

    const actualAbsences = absences.filter(
      (a) => (a.studentId && (a.studentId === sId || a.studentId === sNum)) ||
             (a.studentNumber && a.studentNumber === sNum)
    ).length;

    if (
      s.totalTardiness !== actualTardiness ||
      s.totalViolations !== actualViolations ||
      s.totalAbsences !== actualAbsences
    ) {
      modified = true;
      return {
        ...s,
        totalTardiness: actualTardiness,
        totalViolations: actualViolations,
        totalAbsences: actualAbsences,
      };
    }
    return s;
  });

  if (modified) {
    saveStudents(updated);
  }
}

export function getTrackAuditLogs(): TrackAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRACK_AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTrackAuditLogs(logs: TrackAuditLog[]): void {
  localStorage.setItem(STORAGE_KEYS.TRACK_AUDIT_LOGS, JSON.stringify(logs));
  notifyStorageChange();
}

export function addTrackAuditLogs(newLogs: TrackAuditLog[]): void {
  const existing = getTrackAuditLogs();
  saveTrackAuditLogs([...newLogs, ...existing]);
}

/**
 * Updates academic track in-place for selected students.
 * - Preserves studentId, studentNumber, and all linked records (absence, tardiness, violations, etc.)
 * - Generates immutable audit logs (oldTrack -> newTrack, who, when)
 * - Returns the exact count of modified records
 */
export function updateStudentsTrack(
  updates: Array<{ studentId: string; newTrack: AcademicTrack; reason?: string }>,
  changedBy: string
): { updatedCount: number; logs: TrackAuditLog[] } {
  const students = getStudents();
  const updateMap = new Map<string, { newTrack: AcademicTrack; reason?: string }>();
  updates.forEach((u) => {
    updateMap.set(u.studentId, { newTrack: u.newTrack, reason: u.reason });
  });

  const nowIso = new Date().toISOString();
  const createdLogs: TrackAuditLog[] = [];
  let updatedCount = 0;

  const updatedStudents = students.map((s) => {
    const match = updateMap.get(s.id) || updateMap.get(s.studentNumber);
    if (!match) return s;
    if (s.track === match.newTrack) return s; // Do not alter if track is already matching

    const log: TrackAuditLog = {
      id: `tal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      studentId: s.id,
      studentNumber: s.studentNumber,
      studentName: s.fullName,
      grade: s.grade,
      section: s.section,
      oldTrack: s.track,
      newTrack: match.newTrack,
      reason: match.reason || 'مراجعة وتصحيح المسار الأكاديمي',
      changedBy: changedBy || 'المرشد الأكاديمي',
      timestamp: nowIso,
    };
    createdLogs.push(log);
    updatedCount++;

    return {
      ...s,
      track: match.newTrack,
    };
  });

  if (updatedCount > 0) {
    saveStudents(updatedStudents);
    if (createdLogs.length > 0) {
      addTrackAuditLogs(createdLogs);
    }
  }

  return { updatedCount, logs: createdLogs };
}


// ----------------------------------------------------------------------------
// TARDINESS
// ----------------------------------------------------------------------------
export function getTardinessRecords(): TardinessRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TARDINESS);
    if (!raw) {
      const initial = getInitialTardinessRecords();
      localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export const getMorningDelays = getTardinessRecords;

export function saveTardinessRecordsLocal(records: TardinessRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify(records));
  notifyStorageChange();
}

export function isStudentTardyToday(studentId: string, dateStr?: string): boolean {
  const targetDate = dateStr || getUaeTodayDateString();
  const records = getTardinessRecords();
  return records.some(
    (r) => (r.studentId === studentId || r.studentNumber === studentId) && r.date === targetDate
  );
}

export function getStudentPastTardinessCount(studentId: string): number {
  const records = getTardinessRecords();
  const uniqueDates = new Set(
    records
      .filter((r) => r.studentId === studentId || r.studentNumber === studentId)
      .map((r) => String(r.date || '').trim())
      .filter(Boolean)
  );
  return uniqueDates.size;
}

export function addTardinessRecordsBatch(
  newRecordsData: Array<Omit<TardinessRecord, 'id' | 'timestamp'>>
): { successCount: number; duplicatesCount: number; createdRecords: TardinessRecord[] } {
  const existingRecords = getTardinessRecords();
  const today = getUaeTodayDateString();
  const students = getStudents();

  let successCount = 0;
  let duplicatesCount = 0;
  const createdRecords: TardinessRecord[] = [];
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  for (const rec of newRecordsData) {
    const targetDate = rec.date || today;
    const sNum = String(rec.studentNumber || rec.studentId || '').trim();
    const alreadyLoggedOnDate = existingRecords.some(
      (r) => (r.studentId === rec.studentId || (sNum && r.studentNumber === sNum)) && r.date === targetDate
    );

    if (alreadyLoggedOnDate) {
      duplicatesCount++;
      continue;
    }

    const created: TardinessRecord = {
      ...rec,
      id: `tard-${now}-${Math.random().toString(36).substr(2, 5)}`,
      studentId: sNum || rec.studentId,
      studentNumber: sNum || rec.studentNumber,
      timestamp: now,
      createdAt: rec.createdAt || nowIso,
    };

    createdRecords.push(created);
    existingRecords.unshift(created);
    successCount++;
  }

  if (successCount > 0) {
    // Update student totalTardiness count from unique dates
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const uniqueDates = new Set(
        existingRecords
          .filter((r) => (s.studentNumber && r.studentNumber === s.studentNumber) || (s.id && r.studentId === s.id))
          .map((r) => String(r.date || '').trim())
          .filter(Boolean)
      );
      if (uniqueDates.size > 0 || s.totalTardiness) {
        students[i].totalTardiness = uniqueDates.size;
      }
    }
    localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify(existingRecords));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    notifyStorageChange();
  }

  return { successCount, duplicatesCount, createdRecords };
}

export function deleteTardinessRecord(recordId: string): boolean {
  const records = getTardinessRecords();
  const target = records.find((r) => r.id === recordId);
  if (!target) return false;

  const filtered = records.filter((r) => r.id !== recordId);
  localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify(filtered));

  // Recalculate true totalTardiness for student from remaining unique dates
  const students = getStudents();
  const studentIdx = students.findIndex((s) => s.id === target.studentId || (target.studentNumber && s.studentNumber === target.studentNumber));
  if (studentIdx !== -1) {
    const studentNum = students[studentIdx].studentNumber;
    const studentId = students[studentIdx].id;
    const uniqueDates = new Set(
      filtered
        .filter((r) => (studentNum && r.studentNumber === studentNum) || (studentId && r.studentId === studentId))
        .map((r) => String(r.date || '').trim())
        .filter(Boolean)
    );
    students[studentIdx].totalTardiness = uniqueDates.size;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  notifyStorageChange();
  return true;
}

export function deleteTardinessRecordsBatch(recordIds: string[]): { deletedCount: number; studentNewCounts: Record<string, number> } {
  if (recordIds.length === 0) return { deletedCount: 0, studentNewCounts: {} };
  const idSet = new Set(recordIds);
  const records = getTardinessRecords();
  const targets = records.filter((r) => idSet.has(r.id));
  const remaining = records.filter((r) => !idSet.has(r.id));
  localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify(remaining));

  // Recalculate exact totalTardiness for affected students from unique dates
  const affectedStudentNumbers = new Set(targets.map((t) => t.studentNumber || t.studentId));
  const students = getStudents();
  const studentNewCounts: Record<string, number> = {};

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    if (affectedStudentNumbers.has(s.studentNumber) || affectedStudentNumbers.has(s.id)) {
      const uniqueDates = new Set(
        remaining
          .filter((r) => (s.studentNumber && r.studentNumber === s.studentNumber) || (s.id && r.studentId === s.id))
          .map((r) => String(r.date || '').trim())
          .filter(Boolean)
      );
      const remainingCount = uniqueDates.size;
      students[i].totalTardiness = remainingCount;
      studentNewCounts[s.studentNumber] = remainingCount;
    }
  }
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  notifyStorageChange();

  return { deletedCount: targets.length, studentNewCounts };
}

export function clearAllTardinessRecordsLocal(): number {
  const records = getTardinessRecords();
  const count = records.length;
  localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify([]));

  // Reset totalTardiness to 0
  const students = getStudents();
  students.forEach((s) => {
    s.totalTardiness = 0;
  });
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  notifyStorageChange();

  return count;
}

// ----------------------------------------------------------------------------
// ABSENCES LOCAL STORAGE
// ----------------------------------------------------------------------------
export function getAbsences(): AbsenceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ABSENCES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAbsencesLocal(absences: AbsenceRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(absences));
  notifyStorageChange();
}

export function addAbsenceLocal(
  data: Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>
): AbsenceRecord {
  const list = getAbsences();
  const nowStr = getUaeTodayDateString();
  const newRec: AbsenceRecord = {
    ...data,
    id: `abs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  list.unshift(newRec);
  localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(list));

  // update student totalAbsences
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === data.studentId || s.studentNumber === data.studentNumber);
  if (idx !== -1) {
    students[idx].totalAbsences = (students[idx].totalAbsences || 0) + 1;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  notifyStorageChange();
  return newRec;
}

export function batchAddAbsencesLocal(
  records: Array<Omit<AbsenceRecord, 'id' | 'createdAt' | 'updatedAt'>>
): { successCount: number; duplicateCount: number; savedRecords: AbsenceRecord[] } {
  const existing = getAbsences();
  const students = getStudents();
  const nowStr = getUaeTodayDateString();
  const existingKeys = new Set(existing.map((r) => `${r.studentNumber}_${r.date}`));

  let duplicateCount = 0;
  const savedRecords: AbsenceRecord[] = [];

  for (const rec of records) {
    const key = `${rec.studentNumber}_${rec.date}`;
    if (existingKeys.has(key)) {
      duplicateCount++;
      continue;
    }
    existingKeys.add(key);

    const newRec: AbsenceRecord = {
      ...rec,
      id: `abs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    savedRecords.push(newRec);
    existing.unshift(newRec);

    const sIdx = students.findIndex((s) => s.id === rec.studentId || s.studentNumber === rec.studentNumber);
    if (sIdx !== -1) {
      students[sIdx].totalAbsences = (students[sIdx].totalAbsences || 0) + 1;
    }
  }

  if (savedRecords.length > 0) {
    localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(existing));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    notifyStorageChange();
  }

  return { successCount: savedRecords.length, duplicateCount, savedRecords };
}

export function deleteAbsenceLocal(absenceId: string): boolean {
  const list = getAbsences();
  const target = list.find((r) => r.id === absenceId);
  if (!target) return false;

  const filtered = list.filter((r) => r.id !== absenceId);
  localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(filtered));

  const students = getStudents();
  const idx = students.findIndex((s) => s.id === target.studentId || (target.studentNumber && s.studentNumber === target.studentNumber));
  if (idx !== -1) {
    const s = students[idx];
    const trueRemainingCount = filtered.filter(
      (a) => (s.studentNumber && a.studentNumber === s.studentNumber) || (s.id && a.studentId === s.id)
    ).length;
    students[idx].totalAbsences = trueRemainingCount;
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  notifyStorageChange();
  return true;
}

// ----------------------------------------------------------------------------
// VIOLATIONS
// ----------------------------------------------------------------------------
export function getViolations(): ViolationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIOLATIONS);
    if (!raw) {
      const initial = getInitialViolations();
      localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveViolationsLocal(violations: ViolationRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(violations));
  notifyStorageChange();
}

export function addViolation(
  data: Omit<ViolationRecord, 'id' | 'createdAt' | 'updatedAt'>
): ViolationRecord {
  const list = getViolations();
  const nowStr = getUaeTodayDateString();
  const newRec: ViolationRecord = {
    ...data,
    id: `viol-${Date.now()}`,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  list.unshift(newRec);
  localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(list));

  // update student totalViolations
  const students = getStudents();
  const idx = students.findIndex((s) => s.id === data.studentId || (data.studentNumber && s.studentNumber === data.studentNumber));
  if (idx !== -1) {
    const s = students[idx];
    const trueCount = list.filter(
      (v) => (s.studentNumber && v.studentNumber === s.studentNumber) || (s.id && v.studentId === s.id)
    ).length;
    students[idx].totalViolations = trueCount;
    if (students[idx].status === 'منتظم') {
      students[idx].status = 'متابع سلوكيًا';
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  notifyInfractionLogged(newRec);
  notifyStorageChange();
  return newRec;
}

export function updateViolation(record: ViolationRecord): void {
  const list = getViolations();
  const idx = list.findIndex((v) => v.id === record.id);
  if (idx !== -1) {
    list[idx] = {
      ...record,
      updatedAt: getUaeTodayDateString(),
    };
    localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(list));
    notifyStorageChange();
  }
}

export function deleteViolation(id: string): void {
  const list = getViolations();
  const target = list.find((v) => v.id === id);
  if (!target) return;

  const filtered = list.filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(filtered));

  const students = getStudents();
  const sIdx = students.findIndex((s) => s.id === target.studentId || (target.studentNumber && s.studentNumber === target.studentNumber));
  if (sIdx !== -1) {
    const s = students[sIdx];
    const trueRemainingCount = filtered.filter(
      (v) => (s.studentNumber && v.studentNumber === s.studentNumber) || (s.id && v.studentId === s.id)
    ).length;
    students[sIdx].totalViolations = trueRemainingCount;
    if (trueRemainingCount === 0 && students[sIdx].status === 'متابع سلوكيًا') {
      students[sIdx].status = 'منتظم';
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  }

  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// WARNING FORMS (نموذج التنبيه الخطي بعد التنبيه الشفهي)
// ----------------------------------------------------------------------------
export function getWarningForms(): WarningFormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WARNING_FORMS);
    if (!raw) {
      const initial = getInitialWarningForms();
      localStorage.setItem(STORAGE_KEYS.WARNING_FORMS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getWarningFormById(id: string): WarningFormRecord | undefined {
  const forms = getWarningForms();
  return forms.find((f) => f.id === id);
}

export function saveWarningForm(form: WarningFormRecord): void {
  const forms = getWarningForms();
  const existingIdx = forms.findIndex((f) => f.id === form.id);
  const nowStr = getUaeTodayDateString();

  if (existingIdx !== -1) {
    forms[existingIdx] = {
      ...form,
      updatedAt: nowStr,
    };
  } else {
    forms.unshift({
      ...form,
      createdAt: form.createdAt || nowStr,
      updatedAt: nowStr,
    });
  }

  localStorage.setItem(STORAGE_KEYS.WARNING_FORMS, JSON.stringify(forms));
  notifyLinearWarningFormSaved(form);
  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// PARENT SUMMON FORMS (MODEL 8)
// ----------------------------------------------------------------------------
export function getParentSummonForms(): ParentSummonFormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARENT_SUMMONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getParentSummonFormById(id: string): ParentSummonFormRecord | undefined {
  const forms = getParentSummonForms();
  return forms.find((f) => f.id === id);
}

export function saveParentSummonFormLocal(form: ParentSummonFormRecord): void {
  const forms = getParentSummonForms();
  const existingIdx = forms.findIndex((f) => f.id === form.id);
  const nowStr = getUaeTodayDateString();

  if (existingIdx !== -1) {
    forms[existingIdx] = {
      ...form,
      updatedAt: nowStr,
    };
  } else {
    forms.unshift({
      ...form,
      createdAt: form.createdAt || nowStr,
      updatedAt: nowStr,
    });
  }

  localStorage.setItem(STORAGE_KEYS.PARENT_SUMMONS, JSON.stringify(forms));
  notifyStorageChange();
}

export function deleteParentSummonFormLocal(id: string): void {
  const forms = getParentSummonForms();
  const filtered = forms.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.PARENT_SUMMONS, JSON.stringify(filtered));
  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// VIOLATION REPORTS (MODEL 6 - تقرير مخالفة)
// ----------------------------------------------------------------------------
export function getViolationReports(): ViolationReportRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIOLATION_REPORTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getViolationReportById(id: string): ViolationReportRecord | undefined {
  const reports = getViolationReports();
  return reports.find((r) => r.id === id);
}

export function saveViolationReportLocal(report: ViolationReportRecord): void {
  const reports = getViolationReports();
  const existingIdx = reports.findIndex((r) => r.id === report.id);
  const nowStr = getUaeTodayDateString();

  if (existingIdx !== -1) {
    reports[existingIdx] = {
      ...report,
      updatedAt: nowStr,
    };
  } else {
    reports.unshift({
      ...report,
      createdAt: report.createdAt || nowStr,
      updatedAt: nowStr,
    });
  }

  localStorage.setItem(STORAGE_KEYS.VIOLATION_REPORTS, JSON.stringify(reports));
  notifyStorageChange();
}

export function deleteViolationReportLocal(id: string): boolean {
  const reports = getViolationReports();
  const target = reports.find((r) => r.id === id);
  if (!target) return false;
  // If approved, don't allow deletion
  if (target.status === 'معتمد') {
    return false;
  }
  const filtered = reports.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.VIOLATION_REPORTS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// ----------------------------------------------------------------------------
// PARENT NOTICE FORMS (MODEL 7 - تنبيه خطي / تحذير / إنذار إلى ولي الأمر)
// ----------------------------------------------------------------------------
export function getParentNoticeForms(): ParentNoticeFormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARENT_NOTICES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getParentNoticeFormById(id: string): ParentNoticeFormRecord | undefined {
  const notices = getParentNoticeForms();
  return notices.find((n) => n.id === id);
}

export function saveParentNoticeFormLocal(notice: ParentNoticeFormRecord): void {
  const notices = getParentNoticeForms();
  const existingIdx = notices.findIndex((n) => n.id === notice.id);
  const nowStr = getUaeTodayDateString();

  if (existingIdx !== -1) {
    notices[existingIdx] = {
      ...notice,
      updatedAt: nowStr,
    };
  } else {
    notices.unshift({
      ...notice,
      createdAt: notice.createdAt || nowStr,
      updatedAt: nowStr,
    });
  }

  localStorage.setItem(STORAGE_KEYS.PARENT_NOTICES, JSON.stringify(notices));
  notifyStorageChange();
}

export function deleteParentNoticeFormLocal(id: string): boolean {
  const notices = getParentNoticeForms();
  const target = notices.find((n) => n.id === id);
  if (!target) return false;
  if (target.status === 'معتمد ومسلّم') {
    return false;
  }
  const filtered = notices.filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEYS.PARENT_NOTICES, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// ----------------------------------------------------------------------------
// PARENT COMMITMENT FORMS (MODEL 10 - تعهد ولي الأمر في حال تكرار مخالفات الطالب)
// ----------------------------------------------------------------------------
export function getParentCommitmentForms(): ParentCommitmentFormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARENT_COMMITMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getParentCommitmentFormById(id: string): ParentCommitmentFormRecord | undefined {
  const forms = getParentCommitmentForms();
  return forms.find((f) => f.id === id);
}

export function saveParentCommitmentFormLocal(form: ParentCommitmentFormRecord): void {
  const forms = getParentCommitmentForms();
  const existingIdx = forms.findIndex((f) => f.id === form.id);
  const nowStr = getUaeTodayDateString();

  if (existingIdx !== -1) {
    forms[existingIdx] = {
      ...form,
      updatedAt: nowStr,
    };
  } else {
    forms.unshift({
      ...form,
      createdAt: form.createdAt || nowStr,
      updatedAt: nowStr,
    });
  }

  localStorage.setItem(STORAGE_KEYS.PARENT_COMMITMENTS, JSON.stringify(forms));
  notifyStorageChange();
}

export function deleteParentCommitmentFormLocal(id: string): boolean {
  const forms = getParentCommitmentForms();
  const target = forms.find((f) => f.id === id);
  if (!target) return false;
  if (target.status === 'معتمد ومسلّم') {
    return false;
  }
  const filtered = forms.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.PARENT_COMMITMENTS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// ----------------------------------------------------------------------------
// UNIFIED TIMELINE FOR STUDENT PROFILE (AUDITED & SEPARATED CHRONOLOGICALLY)
// ----------------------------------------------------------------------------

export function isRealDocumentedTime(timeStr?: string): boolean {
  if (!timeStr) return false;
  const t = timeStr.trim();
  // Reject placeholder descriptive strings like "صباحاً", "بداية اليوم الدراسي", "محرر رسمياً", etc.
  if (!/\b\d{1,2}:\d{2}\b/.test(t)) return false;
  return true;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || !isRealDocumentedTime(timeStr)) return null;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(ص|م|am|pm)?/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toLowerCase();
  if (period === 'م' || period === 'pm') {
    if (hours < 12) hours += 12;
  } else if (period === 'ص' || period === 'am') {
    if (hours === 12) hours = 0;
  }
  return hours * 60 + minutes;
}

export function calculateDeterministicTimestamp(dateStr?: string, timeStr?: string, categoryPriority: number = 0): number {
  if (!dateStr) return Date.now();
  const dateOnly = dateStr.split('T')[0];
  const baseDate = new Date(`${dateOnly}T00:00:00`).getTime() || Date.now();
  const minutes = parseTimeToMinutes(timeStr);
  if (minutes !== null) {
    return baseDate + minutes * 60 * 1000 + categoryPriority;
  }
  return baseDate + categoryPriority * 60 * 1000;
}

export function getStudentTimeline(
  studentId: string,
  customSources?: {
    studentNumber?: string;
    absences?: AbsenceRecord[];
    violations?: ViolationRecord[];
    tardinessRecords?: TardinessRecord[];
    warningForms?: WarningFormRecord[];
    parentSummonForms?: ParentSummonFormRecord[];
    violationReports?: ViolationReportRecord[];
    parentNoticeForms?: ParentNoticeFormRecord[];
  }
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const allStudents = getStudents();
  const matchedStudent = allStudents.find((s) => s.id === studentId || s.studentNumber === studentId);
  const stuNum = (customSources?.studentNumber || matchedStudent?.studentNumber || '').trim();
  const matchesStudent = (r: { studentId?: string; studentNumber?: string }) =>
    r.studentId === studentId ||
    r.studentNumber === studentId ||
    Boolean(stuNum && (String(r.studentNumber || '').trim() === stuNum || String(r.studentId || '').trim() === stuNum));

  // 1. Absence records (غياب يوم دراسي كامل - لا يُعرض وقت افتراضي ما لم يكن موثقاً حقيقة)
  const rawAbsences = customSources?.absences && customSources.absences.length > 0 ? customSources.absences : getAbsences();
  const absenceRecords = rawAbsences.filter(matchesStudent);
  for (const a of absenceRecords) {
    const rawTime = (a as any).time || (a as any).recordedTime;
    const hasReal = isRealDocumentedTime(rawTime);
    const realTime = hasReal ? rawTime : undefined;
    events.push({
      id: `ev-abs-${a.id}`,
      studentId,
      type: 'absence',
      title: `تسجيل غياب مدرسي (${a.status || 'يوم دراسي'})`,
      description: a.notes
        ? `حالة العذر: ${a.excuseStatus}. ملاحظات: ${a.notes}`
        : `حالة العذر: ${a.excuseStatus}. غياب يوم دراسي كامل عن المدرسة.`,
      date: a.date,
      time: realTime,
      hasRealTime: hasReal,
      timestamp: calculateDeterministicTimestamp(a.date, realTime, 10),
      sortPriority: 10,
      recordedBy: a.recordedBy || 'مسؤول الحضور والغياب',
      badgeText: a.excuseStatus === 'بعذر' ? 'غياب بعذر' : 'غياب بدون عذر',
      badgeColor:
        a.excuseStatus === 'بعذر'
          ? 'bg-blue-100 text-blue-900 border-blue-300'
          : 'bg-rose-100 text-rose-900 border-rose-300',
      referenceId: a.id,
      absenceId: a.id,
      needsFollowUp: a.excuseStatus === 'بدون عذر',
      followUpStatus: 'open',
    });
  }

  // 2. Tardiness records (سجلات التأخير الصباحي المستقلة)
  const rawTardies = customSources?.tardinessRecords && customSources.tardinessRecords.length > 0 ? customSources.tardinessRecords : getTardinessRecords();
  const tardinessRecords = rawTardies.filter(matchesStudent);
  for (const t of tardinessRecords) {
    const hasReal = isRealDocumentedTime(t.time);
    const occurrenceCount = (t.previousTardinessCount ?? 0) + 1;
    events.push({
      id: `ev-tard-${t.id}`,
      studentId,
      type: 'tardiness',
      title: `تأخير صباحي (تكرار رقم ${occurrenceCount})`,
      description: `حضور متأخر عن الطابور الصباحي. السبب: ${t.reason || 'عذر غير محدد'}. الإجراء المقترح: ${t.suggestedAction || 'تنبيه'}${t.counselorDecision ? ` | قرار المرشد: ${t.counselorDecision}` : ''}`,
      date: t.date,
      time: hasReal ? t.time : undefined,
      hasRealTime: hasReal,
      timestamp: calculateDeterministicTimestamp(t.date, t.time, 20),
      sortPriority: 20,
      recordedBy: t.recordedBy || 'مشرف الدوام الصباحي',
      badgeText: `تأخير رقم (${occurrenceCount})`,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      referenceId: t.id,
      tardinessRecordId: t.id,
      formId: t.linkedFormId,
      formType: t.linkedFormType,
      needsFollowUp: occurrenceCount >= 3,
      followUpStatus: occurrenceCount >= 3 ? 'open' : 'completed',
    });
  }

  // 3. Violations (المخالفات السلوكية المستقلة)
  const rawViolations = customSources?.violations && customSources.violations.length > 0 ? customSources.violations : getViolations();
  const violations = rawViolations.filter(matchesStudent);
  for (const v of violations) {
    const timeMatch = v.incidentDateTime?.match(/\b\d{1,2}:\d{2}\b/);
    const hasReal = Boolean(timeMatch);
    const realTime = hasReal ? v.incidentDateTime.split(' ').slice(1).join(' ') || timeMatch![0] : undefined;
    const datePart = (v as any).incidentDate || (v.incidentDateTime ? v.incidentDateTime.split(' ')[0] : v.createdAt);

    events.push({
      id: `ev-viol-${v.id}`,
      studentId,
      type: 'violation',
      title: `مخالفة سلوكية: ${v.violationType}`,
      description: `المكان: ${v.incidentLocation || 'الحرم المدرسي'} | المُبلغ: ${v.reportingPerson || 'إدارة المدرسة'}. التفاصيل: ${v.incidentDescription}. الإجراء: ${v.suggestedAction}`,
      date: datePart,
      time: realTime,
      hasRealTime: hasReal,
      timestamp: calculateDeterministicTimestamp(datePart, realTime, 30),
      sortPriority: 30,
      recordedBy: v.recordedBy || 'لجنة إدارة السلوك',
      badgeText: v.violationDegree?.split(' ')[0] ? `${v.violationDegree.split(' ')[0]} ${v.violationDegree.split(' ')[1] || ''}`.trim() : 'مخالفة سلوكية',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      referenceId: v.id,
      violationId: v.id,
      needsFollowUp: v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب',
      followUpStatus: v.status === 'مغلقة' ? 'completed' : 'open',
    });
  }

  // 4. Warning Forms (نموذج 9 - تنبيه خطي للطالب وتعهد سلوكي)
  const rawWarnings = customSources?.warningForms && customSources.warningForms.length > 0 ? customSources.warningForms : getWarningForms();
  const warningForms = rawWarnings.filter(matchesStudent);
  for (const w of warningForms) {
    const studentSigned = Boolean(w.studentSignature);
    const sigStatusText = studentSigned
      ? '✓ تم التوقيع'
      : w.status === 'مسودة'
      ? 'مسودة'
      : '⏳ بانتظار توقيع الطالب';
    const sigBadgeClass = studentSigned
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : w.status === 'مسودة'
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-orange-100 text-orange-800 border-orange-300 font-bold';

    const hasRealTime = isRealDocumentedTime(w.studentSignatureDate);
    const timeVal = hasRealTime ? w.studentSignatureDate?.split(' ').slice(1).join(' ') : undefined;

    events.push({
      id: `ev-form-warn-${w.id}`,
      studentId,
      type: 'warning',
      title: 'نموذج (9): تنبيه خطي وتعهد سلوكي للطالب',
      description: `تحرير نموذج رسمي بعد التنبيه الشفهي. الإجراء المتخذ: ${w.actionTaken}. تعهد الطالب بالالتزام بالسلوك الإيجابي وعدم تكرار المخالفة. حالة الاعتماد: ${w.status}.`,
      date: w.formDate,
      time: timeVal,
      hasRealTime,
      timestamp: calculateDeterministicTimestamp(w.formDate, timeVal, 40),
      sortPriority: 40,
      recordedBy: w.counselorName || 'المرشد الأكاديمي والمهني',
      badgeText: `نموذج 9 (${w.status})`,
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      referenceId: w.id,
      formId: w.id,
      formType: 'warning',
      formNumber: 9,
      formName: 'تنبيه خطي للطالب بعد التنبيه الشفهي',
      studentSigned,
      studentSignedDate: w.studentSignatureDate,
      approvalStatus: w.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      tardinessRecordId: w.tardinessRecordId,
      needsFollowUp: !studentSigned,
      followUpStatus: studentSigned ? 'completed' : 'open',
    });
  }

  // 5. Parent Summon Forms (نموذج 8 - خطاب استدعاء ولي الأمر)
  const rawSummons = customSources?.parentSummonForms && customSources.parentSummonForms.length > 0 ? customSources.parentSummonForms : getParentSummonForms();
  const summonForms = rawSummons.filter(matchesStudent);
  for (const s of summonForms) {
    const studentSigned = Boolean(s.studentSignature || s.status === 'تم الاستلام والتوقيع');
    const sigStatusText = studentSigned
      ? '✓ تم التوقيع (استلام الطالب)'
      : s.status === 'مسودة'
      ? 'مسودة'
      : '⏳ بانتظار توقيع الطالب على الاستلام';
    const sigBadgeClass = studentSigned
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : s.status === 'مسودة'
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-amber-100 text-amber-800 border-amber-300 font-bold';

    const hasRealTime = isRealDocumentedTime(s.summonTime);

    events.push({
      id: `ev-form-summon-${s.id}`,
      studentId,
      type: 'parent_summon',
      title: 'نموذج (8): خطاب استدعاء ولي الأمر',
      description: `طلب حضور ولي الأمر لمناقشة: ${s.subject}. الموعد المحدد: ${s.summonDay ? `يوم ${s.summonDay} الموافق ` : ''}${s.summonDate}. الحالة: ${s.status}.`,
      date: s.summonDate,
      time: hasRealTime ? s.summonTime : undefined,
      hasRealTime,
      timestamp: calculateDeterministicTimestamp(s.summonDate, s.summonTime, 42),
      sortPriority: 42,
      recordedBy: s.recordedBy || 'إدارة المدرسة',
      badgeText: `نموذج 8 (${s.status})`,
      badgeColor: studentSigned
        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
        : 'bg-amber-100 text-amber-900 border-amber-300',
      referenceId: s.id,
      formId: s.id,
      formType: 'summon',
      formNumber: 8,
      formName: 'خطاب استدعاء ولي الأمر',
      studentSigned,
      studentSignedDate: s.studentSignatureDate,
      approvalStatus: s.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      tardinessRecordId: s.tardinessRecordId,
      needsFollowUp: true,
      followUpDate: s.summonDate,
      followUpStatus: s.status === 'تم الاستلام والتوقيع' ? 'in_progress' : 'open',
    });
  }

  // 6. Violation Reports (نموذج 6 - تقرير مخالفة سلوكية)
  const rawReports = customSources?.violationReports && customSources.violationReports.length > 0 ? customSources.violationReports : getViolationReports();
  const violationReports = rawReports.filter(matchesStudent);
  for (const vr of violationReports) {
    const studentSigned = Boolean(vr.signatures?.student?.signatureImage || vr.studentSignature);
    const isApproved = vr.status === 'معتمد';
    const sigStatusText = isApproved
      ? '✓ مكتمل ومعتمد'
      : studentSigned
      ? '✓ وقّع الطالب وبانتظار الاعتماد'
      : vr.status === 'مسودة'
      ? 'مسودة'
      : '⏳ بانتظار إفادة وتوقيع الطالب';
    const sigBadgeClass = isApproved
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : studentSigned
      ? 'bg-sky-100 text-sky-800 border-sky-300 font-bold'
      : 'bg-orange-100 text-orange-800 border-orange-300 font-bold';

    const hasRealTime = isRealDocumentedTime(vr.incidentTime);

    events.push({
      id: `ev-form-vr-${vr.id}`,
      studentId,
      type: 'violation_report',
      title: `نموذج (6): تقرير مخالفة (${vr.violationName})`,
      description: `المكان: ${vr.incidentPlace} | الحصة: ${vr.period} (${vr.subject}). الإجراء الفوري: ${vr.immediateAction}. الحالة: ${vr.status}.`,
      date: vr.incidentDate,
      time: hasRealTime ? vr.incidentTime : undefined,
      hasRealTime,
      timestamp: calculateDeterministicTimestamp(vr.incidentDate, vr.incidentTime, 43),
      sortPriority: 43,
      recordedBy: vr.reportedBy || vr.createdBy || 'مسؤول الضبط السلوكي',
      badgeText: `نموذج 6 (${vr.status})`,
      badgeColor: isApproved
        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
        : 'bg-purple-100 text-purple-900 border-purple-300',
      referenceId: vr.id,
      formId: vr.id,
      formType: 'violation_report',
      formNumber: 6,
      formName: 'تقرير مخالفة سلوكية',
      violationId: vr.violationId,
      studentSigned,
      approvalStatus: vr.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      needsFollowUp: !isApproved,
      followUpStatus: isApproved ? 'completed' : 'open',
    });
  }

  // 7. Parent Notice Forms (نموذج 7 - إخطار ولي أمر بحسم درجات)
  const rawNotices = customSources?.parentNoticeForms && customSources.parentNoticeForms.length > 0 ? customSources.parentNoticeForms : getParentNoticeForms();
  const noticeForms = rawNotices.filter(matchesStudent);
  for (const n of noticeForms) {
    const parentSigned = Boolean(n.parentSignature || n.status === 'معتمد ومسلّم');
    const sigStatusText = parentSigned
      ? '✓ تم إخطار وتوقيع ولي الأمر'
      : '⏳ بانتظار تسليم وتوقيع ولي الأمر';
    const sigBadgeClass = parentSigned
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : 'bg-amber-100 text-amber-800 border-amber-300 font-bold';

    const eventDate = n.incidentDate || n.issueDate;

    events.push({
      id: `ev-form-notice-${n.id}`,
      studentId,
      type: 'parent_notice',
      title: `نموذج (7): ${n.noticeType} لولي الأمر`,
      description: `مخالفة سلوكية: ${n.violationDetails}. الحسم المقرر: ${n.deductedMarks || 0} درجات. الحالة: ${n.status}.`,
      date: eventDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(eventDate, undefined, 44),
      sortPriority: 44,
      recordedBy: n.officerName || 'إدارة المدرسة',
      badgeText: `نموذج 7 (${n.status})`,
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      referenceId: n.id,
      formId: n.id,
      formType: 'notice',
      formNumber: 7,
      formName: 'إخطار ولي أمر بحسم درجات من السلوك',
      parentSigned,
      parentSignedDate: n.parentSignatureDate,
      approvalStatus: n.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      violationId: n.violationId,
      needsFollowUp: !parentSigned,
      followUpStatus: parentSigned ? 'completed' : 'open',
    });
  }

  // 8. Parent Commitment Forms (نموذج 10 - تعهد ولي أمر بحال تكرار المخالفات)
  const commitmentForms = getParentCommitmentForms().filter(matchesStudent);
  for (const c of commitmentForms) {
    const parentSigned = Boolean(c.parentSignature || c.status === 'معتمد ومسلّم');
    const sigStatusText = parentSigned
      ? '✓ تم توقيع ولي الأمر'
      : '⏳ بانتظار توقيع ولي الأمر';
    const sigBadgeClass = parentSigned
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : 'bg-amber-100 text-amber-800 border-amber-300 font-bold';

    events.push({
      id: `ev-form-commit-${c.id}`,
      studentId,
      type: 'parent_commitment',
      title: 'نموذج (10): تعهد ولي الأمر بالانضباط السلوكي',
      description: `تعهد رسمي من ولي الأمر (${c.parentName}). عدد المخالفات المضمنة: ${c.violationsList?.filter(Boolean).length || 0}. الحالة: ${c.status}.`,
      date: c.issueDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(c.issueDate, undefined, 45),
      sortPriority: 45,
      recordedBy: c.vicePrincipalName || c.createdBy || 'مساعد مدير المدرسة',
      badgeText: `نموذج 10 (${c.status})`,
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      referenceId: c.id,
      formId: c.id,
      formType: 'commitment',
      formNumber: 10,
      formName: 'تعهد ولي أمر بحال تكرار المخالفات',
      parentSigned,
      parentSignedDate: c.parentSignatureDate,
      approvalStatus: c.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      tardinessRecordId: c.tardinessRecordId,
      needsFollowUp: !parentSigned,
      followUpStatus: parentSigned ? 'completed' : 'open',
    });
  }

  // 9. Attendance Commitments (نموذج 27 - تعهد خطي بالمواظبة والالتزام بالدوام)
  const attendanceCommitments = getAttendanceCommitments().filter(matchesStudent);
  for (const att of attendanceCommitments) {
    const parentSigned = Boolean(att.parentSignature || att.status === 'معتمد ومسلّم');
    const sigStatusText = parentSigned
      ? '✓ تم توقيع ولي الأمر'
      : '⏳ بانتظار توقيع ولي الأمر';
    const sigBadgeClass = parentSigned
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : 'bg-orange-100 text-orange-800 border-orange-300 font-bold';

    const eventDate = att.issueDate || att.createdAt?.split('T')[0] || getUaeTodayDateString();

    events.push({
      id: `ev-form-att-${att.id}`,
      studentId,
      type: 'attendance_commitment',
      title: 'نموذج (27): تعهد خطي بالمواظبة والالتزام بالدوام المدرسي',
      description: `تعهد رسمي بعدم الغياب بدون عذر وعدم التأخر عن الطابور الصباحي، والالتزام بلائحة إدارة سلوك الطلبة. الحالة: ${att.status}.`,
      date: eventDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(eventDate, undefined, 46),
      sortPriority: 46,
      recordedBy: 'المرشد الأكاديمي',
      badgeText: `نموذج 27 (${att.status})`,
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      referenceId: att.id,
      formId: att.id,
      formType: 'attendance_commitment',
      formNumber: 27,
      formName: 'تعهد خطي بالمواظبة والالتزام بالدوام',
      parentSigned,
      approvalStatus: att.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      tardinessRecordId: att.tardinessRecordId,
      needsFollowUp: !parentSigned,
      followUpStatus: parentSigned ? 'completed' : 'open',
    });
  }

  // 9b. Temporary Suspension Forms (نموذج 12 - قرار إيقاف مؤقت من الدراسة)
  const suspensionForms = getTemporarySuspensionForms().filter(matchesStudent);
  for (const sus of suspensionForms) {
    const isApproved = sus.status === 'معتمد ومسلّم';
    const isSigned = Boolean(sus.principalSignature || sus.studentSignature || isApproved);
    const sigStatusText = isApproved
      ? '✓ معتمد وموثق رسمياً'
      : isSigned
      ? '✓ تم التوقيع وبانتظار الاعتماد'
      : sus.status === 'مسودة'
      ? 'مسودة'
      : '⏳ بانتظار استكمال التوقيعات';
    const sigBadgeClass = isApproved
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
      : 'bg-rose-100 text-rose-800 border-rose-300 font-bold';

    const eventDate = sus.issueDate || sus.suspensionStartDate || sus.meetingDate || getUaeTodayDateString();

    events.push({
      id: `ev-form-sus-${sus.id}`,
      studentId,
      type: 'temporary_suspension',
      title: 'نموذج (12): قرار إيقاف مؤقت من الدراسة',
      description: `قرار لجنة إدارة السلوك${sus.meetingNumber ? ` برقم جلسة (${sus.meetingNumber})` : ''}. مدة الإيقاف: ${sus.suspensionDaysCount || 1} أيام من ${sus.suspensionStartDate} إلى ${sus.suspensionEndDate}. الأسباب: ${sus.reason1}. الحالة: ${sus.status}.`,
      date: eventDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(eventDate, undefined, 47),
      sortPriority: 47,
      recordedBy: sus.principalName || 'لجنة إدارة السلوك',
      badgeText: `نموذج 12 (${sus.status})`,
      badgeColor: isApproved
        ? 'bg-rose-100 text-rose-900 border-rose-300'
        : 'bg-amber-100 text-amber-900 border-amber-300',
      referenceId: sus.id,
      formId: sus.id,
      formType: 'temporary_suspension',
      formNumber: 12,
      formName: 'قرار إيقاف مؤقت من الدراسة',
      meetingNumber: sus.meetingNumber,
      suspensionDaysCount: sus.suspensionDaysCount,
      studentSigned: Boolean(sus.studentSignature || isApproved),
      studentSignedDate: sus.studentSignatureDate,
      parentSigned: Boolean(sus.parentSignature || isApproved),
      parentSignedDate: sus.parentSignatureDate,
      approvalStatus: sus.status,
      signatureStatusText: sigStatusText,
      signatureBadgeClass: sigBadgeClass,
      violationId: sus.violationId,
      needsFollowUp: !isApproved,
      followUpStatus: isApproved ? 'completed' : 'open',
    });
  }

  // 10. Parent Meetings (مقابلات ولي الأمر)
  const meetings = getParentMeetings(studentId);
  for (const m of meetings) {
    const meetingDateStr = m.meetingDate || m.date || new Date().toISOString().split('T')[0];
    const topicStr = m.topic || m.meetingReason || 'لقاء ولي أمر';
    const attendeeStr = m.attendeeRole || (m.attendees && m.attendees.length > 0 ? m.attendees.join(', ') : 'ولي الأمر');
    const planStr = m.agreedPlan || m.meetingSummary || 'تمت مناقشة حالة الطالب والاتفاق على خطة المتابعة';
    const hasReal = isRealDocumentedTime(m.meetingTime);

    events.push({
      id: `ev-meeting-${m.id}`,
      studentId,
      type: 'action',
      title: `مقابلة ولي أمر: ${topicStr}`,
      description: `الطرف الحاضر: ${attendeeStr}. الخطة/التوصيات: ${planStr}`,
      date: meetingDateStr,
      time: hasReal ? m.meetingTime : undefined,
      hasRealTime: hasReal,
      timestamp: calculateDeterministicTimestamp(meetingDateStr, m.meetingTime, 50),
      sortPriority: 50,
      recordedBy: m.counselorName || 'المرشد الطلابي',
      badgeText: 'مقابلة ولي أمر',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      referenceId: m.id,
      needsFollowUp: Boolean(m.followUpDate || m.nextFollowUpDate),
      followUpDate: m.followUpDate || m.nextFollowUpDate,
      followUpStatus: 'completed',
    });
  }

  // 11. Behavior Modification Plans (خطط تعديل السلوك)
  const plans = getBehaviorPlans(studentId);
  for (const p of plans) {
    events.push({
      id: `ev-plan-${p.id}`,
      studentId,
      type: 'action',
      title: `خطة تعديل سلوك: ${p.targetBehavior}`,
      description: `الهدف المنشود: ${p.desiredOutcome}. نسبة التحسن: ${p.improvementRate || 0}%. الحالة: ${p.status}`,
      date: p.startDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(p.startDate, undefined, 55),
      sortPriority: 55,
      recordedBy: p.counselorName,
      badgeText: `خطة سلوك (${p.status})`,
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      referenceId: p.id,
      needsFollowUp: p.status === 'قيد التنفيذ',
      followUpStatus: p.status === 'مكتملة' ? 'completed' : 'in_progress',
    });
  }

  // 12. Positive Behavior & Recovery (تعزيز السلوك واسترداد الدرجات)
  const positives = getPositiveBehaviorRecords(studentId);
  for (const pos of positives) {
    events.push({
      id: `ev-pos-${pos.id}`,
      studentId,
      type: 'action',
      title: `تعزيز سلوكي إيجابي: ${pos.behaviorTitle}`,
      description: `الوصف: ${pos.description}. تم تعويض واسترداد (${pos.recoveredMarks}) درجات سلوك.`,
      date: pos.date,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(pos.date, undefined, 60),
      sortPriority: 60,
      recordedBy: pos.recordedBy,
      badgeText: `+${pos.recoveredMarks} درجات`,
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      referenceId: pos.id,
      needsFollowUp: false,
      followUpStatus: 'completed',
    });
  }

  // 13. Behavior Committee Decisions (قرارات لجنة إدارة السلوك)
  const decisions = getCommitteeDecisions(studentId);
  for (const d of decisions) {
    const decTitle = d.violationTitle || (d.decisionNumber ? `قرار رقم ${d.decisionNumber}` : 'قرار لجنة السلوك');
    const decContent = d.description || (d.penalties && d.penalties.join(', ')) || 'قرار معتمد من لجنة السلوك';
    const decPenalty = (d.penalties && d.penalties.join(', ')) || (d.deductedMarks ? `حسم ${d.deductedMarks} درجات` : '');
    const decStatus = d.executionStatus || (d.approved ? 'معتمد' : 'قيد المراجعة');
    events.push({
      id: `ev-dec-${d.id}`,
      studentId,
      type: 'action',
      title: `قرار لجنة إدارة السلوك: ${decTitle}`,
      description: `المحتوى: ${decContent}.${decPenalty ? ` الجزاء: ${decPenalty}.` : ''} الحالة: ${decStatus}`,
      date: d.decisionDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(d.decisionDate, undefined, 65),
      sortPriority: 65,
      recordedBy: d.counselorName || d.committeeChairperson || 'لجنة السلوك',
      badgeText: `قرار معتمد (${decStatus})`,
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      referenceId: d.id,
      approvalStatus: decStatus,
      needsFollowUp: (decStatus as string) === 'in_progress' || (decStatus as string) === 'pending' || (decStatus as string) === 'قيد المراجعة',
      followUpStatus: decStatus === 'معتمد' || decStatus === 'executed' ? 'completed' : 'in_progress',
    });
  }

  // 13b. Committee Meeting Sessions & Cases (عُرض على لجنة إدارة السلوك)
  const allMeetings = getCommitteeMeetings();
  for (const m of allMeetings) {
    if (m.cases && Array.isArray(m.cases)) {
      const matchedCase = m.cases.find((c) => c.studentId === studentId || c.studentNumber === studentId);
      if (matchedCase) {
        const decisionLabel = matchedCase.decisionCustomText || 
          (matchedCase.decision === 'temporary_suspension' ? 'قرار إيقاف مؤقت من الدراسة' :
           matchedCase.decision === 'behavior_plan' ? 'إلزام بخطة تعديل سلوك' :
           matchedCase.decision === 'final_warning' ? 'إنذار كتابي نهائي' :
           matchedCase.decision === 'community_service' ? 'تكليف بمهام مدرسية بديلة' :
           matchedCase.decision === 'referral_specialized' ? 'إحالة إلى جهة مختصة' :
           matchedCase.decision || 'قيد المداولة');
        
        const resultingFormsText = matchedCase.resultingFormIds && matchedCase.resultingFormIds.length > 0
          ? `نموذج رقم (12) [${matchedCase.resultingFormIds.join('، ')}]`
          : 'لا توجد نماذج ناتجة';

        events.push({
          id: `ev-meet-case-${m.id}-${matchedCase.caseId}`,
          studentId,
          type: 'action',
          title: `عُرض على لجنة إدارة السلوك (جلسة ${m.sessionNumber || m.meetingNumber})`,
          description: `رقم الاجتماع: ${m.sessionNumber || m.meetingNumber} • التاريخ: ${m.meetingDate} • القرار: ${decisionLabel} • النماذج الناتجة: ${resultingFormsText}`,
          date: m.meetingDate,
          hasRealTime: false,
          timestamp: calculateDeterministicTimestamp(m.meetingDate, undefined, 66),
          sortPriority: 66,
          recordedBy: m.chairpersonName || m.rapporteurName || 'رئيس لجنة إدارة السلوك',
          badgeText: `جلسة لجنة (${matchedCase.approvalStatus === 'approved' ? 'معتمد' : 'مسودة'})`,
          badgeColor: matchedCase.approvalStatus === 'approved' 
            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
            : 'bg-amber-100 text-amber-900 border-amber-300',
          referenceId: m.id,
          approvalStatus: matchedCase.approvalStatus,
          needsFollowUp: matchedCase.approvalStatus !== 'approved',
          followUpStatus: matchedCase.approvalStatus === 'approved' ? 'completed' : 'in_progress',
        });
      }
    }
  }

  // 14. Student Referrals (الإحالات الطلابية الواردة للمرشد)
  const studentReferrals = getStudentReferralsLocal().filter(
    (r) => r.studentId === studentId || r.studentNumber === studentId
  );
  for (const ref of studentReferrals) {
    events.push({
      id: `ev-ref-${ref.id}`,
      studentId,
      type: 'action',
      title: `إحالة طلابية للمرشد (${ref.referralNumber}) – ${ref.urgency}`,
      description: `جهة الإحالة: ${ref.referralSource} (${ref.referredByName}) • الصف والشعبة وقت الإحالة: ${ref.grade}/${ref.section} • السبب: ${ref.reason}${ref.shareableRecommendations ? ` • التوصيات المهنية المشتركة: ${ref.shareableRecommendations}` : ''}`,
      date: ref.referralDate || ref.createdAt.split('T')[0],
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(ref.referralDate || ref.createdAt.split('T')[0], undefined, 68),
      sortPriority: 68,
      recordedBy: ref.assignedCounselorName || 'أمير علي عبدالشاكر بكري',
      badgeText: `إحالة (${ref.urgency})`,
      badgeColor:
        ref.urgency === 'طارئة'
          ? 'bg-rose-100 text-rose-900 border-rose-300'
          : ref.urgency === 'عاجلة'
          ? 'bg-amber-100 text-amber-900 border-amber-300'
          : 'bg-blue-100 text-blue-900 border-blue-300',
      referenceId: ref.id,
      needsFollowUp: ref.status !== 'closed',
      followUpStatus: ref.status === 'closed' ? 'completed' : 'in_progress',
    });
  }

  // 15. Authorized Counseling Cases (الحالات الإرشادية المصرح بها في ملف الطالب الموحد)
  const allCases = getStoredStudentCases().filter(
    (c) => (c.studentId === studentId || c.studentNumber === studentId) && !c.isArchived
  );
  for (const c of allCases) {
    // Separate shareable professional summary from strictly confidential notes
    const isRestrictedConfidential =
      c.confidentialityLevel === 'سري جداً' || c.confidentialityLevel === 'حماية طفل';
    const safeDescription = isRestrictedConfidential
      ? `ملف إرشادي مقيد السرية (${c.confidentialityLevel}) • الصف والشعبة وقت التسجيل: ${c.grade}/${c.section} • الحالة: ${c.status} (الملاحظات التفصيلية محجوبة لغير المخولين)`
      : `نوع الحالة: ${c.caseType} (${c.subcategory || 'عام'}) • الصف والشعبة وقت التسجيل: ${c.grade}/${c.section} • الحالة: ${c.status}`;

    events.push({
      id: `ev-case-${c.id}`,
      studentId,
      type: 'counseling',
      title: `ملف حالة إرشادية (${c.caseNumber})`,
      description: safeDescription,
      date: c.openedAt || c.createdAt.split('T')[0],
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(c.openedAt || c.createdAt.split('T')[0], undefined, 69),
      sortPriority: 69,
      recordedBy: c.assignedCounselorName || 'أمير علي عبدالشاكر بكري',
      badgeText: `حالة (${c.status})`,
      badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
      referenceId: c.id,
      needsFollowUp: c.status !== 'مغلق',
      followUpDate: c.nextFollowUpAt,
      followUpStatus: c.status === 'مغلق' ? 'completed' : 'in_progress',
    });
  }

  // 16. Documented Parent WhatsApp Communications (سجل مراسلات أولياء الأمور عبر واتساب)
  const parentMsgs = getStudentParentMessagesLocal(studentId);
  for (const msg of parentMsgs) {
    const statusLabel =
      msg.status === 'confirmed_sent'
        ? '✓ تم تأكيد الإرسال يدوياً'
        : msg.status === 'whatsapp_opened'
        ? 'تم فتح واتساب (بانتظار تأكيد الإرسال)'
        : msg.status === 'failed'
        ? 'تعذر الإرسال'
        : msg.status === 'needs_followup'
        ? 'يحتاج متابعة'
        : 'مسودة في الطابور';

    const eventDate = (msg.confirmedSentAt || msg.whatsappOpenedAt || msg.createdAt || '').split('T')[0] || getUaeTodayDateString();
    events.push({
      id: `ev-pmsg-${msg.messageId}`,
      studentId,
      type: 'action',
      title: `مراسلة ولي أمر (${msg.templateTitle}) – ${statusLabel}`,
      description: `المستلم: ${msg.guardianName} (${msg.guardianRelation} - ${msg.recipientPhoneRaw}) • الحالة: ${statusLabel} (توثيق يدوي بواسطة ${msg.confirmedByName || msg.createdByName} وليس تحققاً تقنياً آلياً من واتساب)${msg.failureReason ? ` • سبب التعذر: ${msg.failureReason}` : ''}${msg.followUpNote ? ` • ملاحظة المتابعة: ${msg.followUpNote}` : ''}`,
      date: eventDate,
      hasRealTime: false,
      timestamp: calculateDeterministicTimestamp(eventDate, undefined, 70),
      sortPriority: 70,
      recordedBy: msg.confirmedByName || msg.createdByName || 'المرشد الأكاديمي والمهني',
      badgeText: statusLabel,
      badgeColor:
        msg.status === 'confirmed_sent'
          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
          : msg.status === 'whatsapp_opened'
          ? 'bg-blue-100 text-blue-900 border-blue-300'
          : msg.status === 'failed'
          ? 'bg-rose-100 text-rose-900 border-rose-300'
          : 'bg-amber-100 text-amber-900 border-amber-300',
      referenceId: msg.messageId,
      needsFollowUp: msg.status === 'needs_followup' || msg.status === 'failed',
      followUpStatus: msg.status === 'confirmed_sent' ? 'completed' : 'in_progress',
    });
  }

  // Deduplicate events by ID and sort descending deterministically
  const eventMap = new Map<string, TimelineEvent>();
  for (const ev of events) {
    if (!eventMap.has(ev.id)) {
      eventMap.set(ev.id, ev);
    }
  }

  return Array.from(eventMap.values()).sort((a, b) => {
    // 1. Primary: date & real time timestamp descending
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    // 2. Secondary: sortPriority descending for same day
    const prioA = a.sortPriority ?? 0;
    const prioB = b.sortPriority ?? 0;
    if (prioB !== prioA) {
      return prioB - prioA;
    }
    // 3. Stable tie-breaker
    return b.id.localeCompare(a.id);
  });
}

// ----------------------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------------------
export function getDashboardStats(): DashboardStats {
  const students = getStudents();
  const today = getUaeTodayDateString();
  const tardiness = getTardinessRecords();
  const violations = getViolations();
  const forms = getWarningForms();

  const tardyTodayCount = tardiness.filter((t) => t.date === today).length;
  const openViolationsCount = violations.filter(
    (v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب'
  ).length;
  const pendingSignaturesCount = forms.filter((f) => !f.studentSignature).length;
  const criticalTardinessCount = students.filter((s) => {
    const recordsCount = tardiness.filter((t) => t.studentId === s.id).length;
    return Math.max(s.totalTardiness || 0, recordsCount) >= 3;
  }).length;

  return {
    totalStudents: students.length,
    tardyTodayCount,
    openViolationsCount,
    pendingSignaturesCount,
    criticalTardinessCount,
  };
}

// Reset data to initial state if desired by user
export function resetSystemData(): void {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  localStorage.setItem(STORAGE_KEYS.TARDINESS, JSON.stringify(getInitialTardinessRecords()));
  localStorage.setItem(STORAGE_KEYS.VIOLATIONS, JSON.stringify(getInitialViolations()));
  localStorage.setItem(STORAGE_KEYS.WARNING_FORMS, JSON.stringify(getInitialWarningForms()));
  notifyStorageChange();
}

export function initializeStorage(): void {
  getStudents();
  getTardinessRecords();
  getViolations();
  getWarningForms();
  const current = getCurrentUser();
  if (!current || current.id === 'counselor-01' || current.name.includes('سلطان')) {
    setCurrentUser(DEFAULT_COUNSELOR);
  }
}

// Aliases for convenient importing
export const getCurrentCounselor = getCurrentUser;
export const setCurrentCounselor = setCurrentUser;
export const getViolationRecords = getViolations;
export const saveViolationRecord = addViolation;
export const updateViolationRecord = updateViolation;
export const addStudentsBatch = importStudents;
export const saveTardinessRecordsBatch = addTardinessRecordsBatch;
export const resetToDefaultData = resetSystemData;

// ----------------------------------------------------------------------------
// THEME (DARK / LIGHT MODE)
// ----------------------------------------------------------------------------
export function getStoredTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch {
    // fallback
  }
  return 'light';
}

export function setStoredTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    notifyStorageChange();
  } catch {}
}

// ----------------------------------------------------------------------------
// BEHAVIORAL CASES & WORKFLOW
// ----------------------------------------------------------------------------
export function getBehavioralCases(): BehavioralCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CASES);
    if (!raw) {
      const initialCases: BehavioralCase[] = [
        {
          id: 'case-2026-001',
          caseNumber: 'CASE-2026-001',
          track: 'bullying',
          title: 'شجار وتنمر لفظي متكرر بساحة المدرسة',
          studentId: 'std-001',
          studentNumber: 'STU-1001',
          studentName: 'سلطان أحمد الشامسي',
          grade: 'عاشر',
          section: '1',
          incidentDate: getUaeTodayDateString(),
          incidentTime: '09:45 ص',
          incidentLocation: 'الساحة المدرسية',
          reportedBy: 'أ. طارق عبد الرحمن',
          reporterRole: 'مشرف الجناح',
          description: 'قام الطالب بتوجيه ألفاظ غير لائقة والدفع بالأيدي لزميله خلال الفسحة المدرسية.',
          confidentiality: 'normal',
          status: 'awaiting_parent',
          assignedTo: 'usr-counselor-01',
          assignedToName: 'أ. محمد المنصوري (المرشد الأكاديمي)',
          dueDate: getUaeTodayDateString(),
          smartAnalysis: {
            violationCode: '3-01',
            degreeName: 'الدرجة الثالثة (جسيمة - تنمر)',
            gradeDeduction: 8,
            repetitionCount: 2,
            previousActions: ['تنبيه واستدعاء سابق لولي الأمر'],
            suggestedAction: 'عقد اجتماع فوري للجنة السلوك، استدعاء ولي أمر الطالب، حسم 8 درجات، وبدء خطة تعديل سلوك.',
            responsibleRole: 'مساعد المدير والمرشد الطلابي ولجنة السلوك',
            requiredForms: ['نموذج 6 (تقرير)', 'نموذج 7 (إخطار حسم)', 'نموذج 8 (استدعاء)', 'نموذج 10 (تعهد ولي الأمر)'],
            requiresPrincipalApproval: true,
            requiresBehaviorCommittee: true,
            requiresSpecializedReferral: true,
            specializedReferralEntity: 'فريق الرعاية الطلابية وإدارة الإرشاد الأكاديمي',
            caseBundleSupported: true,
          },
          deductedMarks: 8,
          signatures: {
            student: { signed: true, date: getUaeTodayDateString() },
            counselor: { signed: true, date: getUaeTodayDateString() },
            principal: { signed: false },
            parent: { signed: false },
          },
          createdAt: getUaeTodayDateString(),
          updatedAt: getUaeTodayDateString(),
        },
        {
          id: 'case-2026-002',
          caseNumber: 'CASE-2026-002',
          track: 'phone_electronic',
          title: 'استخدام الهاتف المحمول أثناء حصة الرياضيات',
          studentId: 'std-002',
          studentNumber: 'STU-1002',
          studentName: 'منصور خالد الظاهري',
          grade: 'حادي عشر',
          section: '2',
          incidentDate: getUaeTodayDateString(),
          incidentTime: '11:15 ص',
          incidentLocation: 'مختبر الرياضيات',
          reportedBy: 'أ. إبراهيم خليل',
          reporterRole: 'معلم المادة',
          description: 'تم ضبط الطالب يستخدم الهاتف المتحرك لمشاهدة مقاطع أثناء شرح الدرس.',
          confidentiality: 'normal',
          status: 'awaiting_student_sig',
          assignedTo: 'usr-counselor-01',
          assignedToName: 'أ. محمد المنصوري (المرشد الأكاديمي)',
          dueDate: getUaeTodayDateString(),
          smartAnalysis: {
            violationCode: '2-02',
            degreeName: 'الدرجة الثانية (متوسطة)',
            gradeDeduction: 2,
            repetitionCount: 1,
            previousActions: ['الواقعة الأولى المرصودة'],
            suggestedAction: 'التحفظ المؤقت على الهاتف، تحرير تقرير مخالفة وإشعار ولي الأمر بالحضور لاستلام الجهاز.',
            responsibleRole: 'مساعد المدير والمرشد الطلابي',
            requiredForms: ['نموذج 6 (تقرير مخالفة)', 'نموذج 8 (استدعاء ولي أمر لاستلام الهاتف)'],
            requiresPrincipalApproval: true,
            requiresBehaviorCommittee: false,
            requiresSpecializedReferral: false,
            caseBundleSupported: true,
          },
          deductedMarks: 2,
          signatures: {
            counselor: { signed: true, date: getUaeTodayDateString() },
          },
          createdAt: getUaeTodayDateString(),
          updatedAt: getUaeTodayDateString(),
        },
        {
          id: 'case-2026-003',
          caseNumber: 'CASE-2026-003',
          track: 'child_protection',
          title: 'اشتباه بإيذاء خارجي وحاجة للدعم الوقائي السري',
          studentId: 'std-003',
          studentNumber: 'STU-1003',
          studentName: 'راشد سالم الكعبي',
          grade: 'تاسع',
          section: '3',
          incidentDate: getUaeTodayDateString(),
          incidentTime: '08:30 ص',
          incidentLocation: 'مكتب الإرشاد الطلابي',
          reportedBy: 'أ. محمد المنصوري',
          reporterRole: 'المرشد الطلابي المعتمد',
          description: 'ملاحظة علامات انطواء وقلق شديد وإفادة بوجود نزاع أسري حاد يؤثر على سلامة الطالب وفق قانون وديمة.',
          confidentiality: 'restricted_child_protection',
          status: 'confidential',
          assignedTo: 'usr-principal-01',
          assignedToName: 'أحمد خليفة الكعبي (مدير المدرسة)',
          smartAnalysis: {
            violationCode: 'CP-SAFE-01',
            degreeName: 'الدرجة الرابعة (شديدة الخطورة - حماية طفل)',
            gradeDeduction: 0,
            repetitionCount: 1,
            previousActions: ['بروتوكول حماية الطفل الاتحادي'],
            suggestedAction: 'إحالة سرية وفورية لاختصاصي حماية الطفل ومركز حماية الطفل (116111). يُحظر التحقيق العشوائي أو إفشاء هوية الطفل.',
            responsibleRole: 'مدير المدرسة ومنسق حماية الطفل المعتمد حصراً',
            requiredForms: ['استمارة تبليغ حماية طفل سرية'],
            requiresPrincipalApproval: true,
            requiresBehaviorCommittee: false,
            requiresSpecializedReferral: true,
            specializedReferralEntity: 'مركز حماية الطفل بوزارة الداخلية (116111)',
            caseBundleSupported: false,
          },
          auditLogs: [
            {
              userId: 'usr-counselor-01',
              userName: 'أ. محمد المنصوري',
              action: 'فتح الملف السري لأول مرة وتسجيل الواقعة',
              timestamp: new Date().toISOString(),
            },
          ],
          createdAt: getUaeTodayDateString(),
          updatedAt: getUaeTodayDateString(),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(initialCases));
      return initialCases;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveBehavioralCase(caseItem: BehavioralCase): void {
  try {
    const list = getBehavioralCases();
    const idx = list.findIndex((c) => c.id === caseItem.id);
    if (idx !== -1) {
      list[idx] = { ...caseItem, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...caseItem, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save behavioral case', err);
  }
}

export function updateBehavioralCaseStatus(
  caseId: string,
  newStatus: CaseWorkflowStatus,
  auditNote?: string,
  user?: string
): void {
  const list = getBehavioralCases();
  const target = list.find((c) => c.id === caseId);
  if (!target) return;

  target.status = newStatus;
  target.updatedAt = new Date().toISOString();

  if (auditNote || user) {
    if (!target.auditLogs) target.auditLogs = [];
    target.auditLogs.push({
      userId: user || 'current_user',
      userName: user || 'المشرف',
      action: auditNote || `تحديث حالة الحالة إلى ${newStatus}`,
      timestamp: new Date().toISOString(),
    });
  }

  localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteBehavioralCase(caseId: string): void {
  try {
    const list = getBehavioralCases().filter((c) => c.id !== caseId);
    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to delete case', err);
  }
}

/**
 * Creates an Automated Case Bundle (حزمة الحالة التلقائية)
 * Generates official Model 6, Model 7, Model 8, Model 10 and Behavior Plan in one unified action!
 */
export function createCaseBundle(
  caseItem: BehavioralCase,
  currentUser: CounselorUser
): {
  reportId: string;
  noticeId: string;
  summonId: string;
  commitmentId: string;
  planId?: string;
} {
  const today = getUaeTodayDateString();

  // 1. Model 6 (تقرير مخالفة)
  const reportId = `vr-${Date.now()}`;
  const report: ViolationReportRecord = {
    id: reportId,
    reportNumber: `VR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    formType: 'violation_report',
    formNumber: 6,
    schoolId: currentUser.schoolId || 'school-1',
    schoolName: currentUser.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
    studentId: caseItem.studentId,
    studentNumber: caseItem.studentNumber,
    studentName: caseItem.studentName,
    grade: caseItem.grade,
    section: caseItem.section,
    violationName: caseItem.title,
    violationLevel: 'الثانية – متوسطة الخطورة',
    suggestedDeduction: String(caseItem.deductedMarks || 2),
    occurrenceCount: 1,
    incidentDate: caseItem.incidentDate,
    incidentTime: caseItem.incidentTime,
    incidentPlace: caseItem.incidentLocation,
    period: 'الحصة المعنية',
    subject: 'الدوام المدرسي',
    description: caseItem.description,
    immediateAction: caseItem.smartAnalysis?.suggestedAction || 'تم التحفظ والإحالة للإدارة المدرسية',
    studentStatement: 'أفاد الطالب بالواقعة وتعهد بالالتزام.',
    studentAdmitted: true,
    witnesses: 'معلم الحصة والطلبة الحاضرون',
    witnessStatements: 'أكد الحاضرون مجريات الواقعة.',
    damageOrInjury: false,
    damageOrInjuryDetails: '',
    attachments: [],
    counselorNotes: 'تم فتح دراسة حالة وبدء المتابعة الإرشادية.',
    reportedBy: caseItem.reportedBy,
    reporterRole: caseItem.reporterRole,
    status: 'معتمد',
    signatures: {
      counselor: { name: currentUser.name, role: 'المرشد الأكاديمي', date: today },
    },
    academicYear: '2025-2026',
    term: 'الفصل الدراسي الثاني',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveViolationReportLocal(report);

  // 2. Model 7 (إخطار ولي أمر)
  const noticeId = `not-${Date.now()}`;
  const notice: ParentNoticeFormRecord = {
    id: noticeId,
    formType: 'parent_notice_form',
    formNumber: 7,
    noticeType: 'تنبيه خطي',
    schoolId: 'school-1',
    emirate: 'أبوظبي',
    operationsManagement: 'إدارة العمليات المدرسية',
    council: 'المجلس الأول',
    sector: 'النطاق التعليمي 1',
    schoolName: currentUser.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
    studentId: caseItem.studentId,
    studentNumber: caseItem.studentNumber,
    studentName: caseItem.studentName,
    grade: caseItem.grade,
    section: caseItem.section,
    issueDate: today,
    incidentDate: caseItem.incidentDate,
    incidentDay: 'خلال الأسبوع',
    violationDetails: `${caseItem.title} - ${caseItem.description}`,
    officerName: currentUser.name,
    principalName: 'مدير المدرسة',
    status: 'بانتظار التوقيع',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveParentNoticeFormLocal(notice);

  // 3. Model 8 (استدعاء ولي أمر)
  const summonId = `sum-${Date.now()}`;
  const summon: ParentSummonFormRecord = {
    id: summonId,
    studentId: caseItem.studentId,
    studentNumber: caseItem.studentNumber,
    studentName: caseItem.studentName,
    grade: caseItem.grade,
    section: caseItem.section,
    parentName: `ولي أمر الطالب ${caseItem.studentName}`,
    parentRelation: 'الأب / ولي الأمر',
    parentPhone: '0501234567',
    emirate: 'أبوظبي',
    council: 'المجلس الأول',
    sector: 'النطاق 1',
    school: currentUser.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
    summonDate: today,
    summonDay: 'الغد',
    summonTime: '08:30 ص',
    subject: `مناقشة واقعة: ${caseItem.title} ووضع الخطة التربوية المشتركة`,
    principalName: 'مدير المدرسة',
    principalDate: today,
    status: 'مسودة',
    recordedBy: currentUser.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveParentSummonFormLocal(summon);

  // 4. Model 10 (تعهد ولي الأمر)
  const commitmentId = `com-${Date.now()}`;
  const commitment: ParentCommitmentFormRecord = {
    id: commitmentId,
    formType: 'parent_commitment_form',
    formNumber: 10,
    schoolId: currentUser.schoolId || 'school-1',
    emirate: 'أبوظبي',
    operationsManagement: 'إدارة العمليات المدرسية',
    council: 'المجلس الأول',
    sector: 'النطاق التعليمي 1',
    schoolName: currentUser.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
    studentId: caseItem.studentId,
    studentNumber: caseItem.studentNumber,
    studentName: caseItem.studentName,
    grade: caseItem.grade,
    section: caseItem.section,
    issueDate: today,
    parentName: `ولي أمر الطالب ${caseItem.studentName}`,
    parentRelation: 'الأب / ولي الأمر',
    parentPhone: '0501234567',
    violationsList: [caseItem.title, caseItem.smartAnalysis?.degreeName || 'مخالفة سلوكية'],
    status: 'بانتظار التوقيع',
    vicePrincipalName: 'مساعد مدير المدرسة للشؤون التربوية',
    createdBy: currentUser.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveParentCommitmentFormLocal(commitment);

  // 5. Behavior Modification Plan (if degree >= 2)
  let planId: string | undefined = undefined;
  if (
    caseItem.smartAnalysis?.degreeName.includes('الثانية') ||
    caseItem.smartAnalysis?.degreeName.includes('الثالثة')
  ) {
    planId = `plan-${Date.now()}`;
    const plan: BehaviorModificationPlan = {
      id: planId,
      planNumber: `BMP-2026-${Math.floor(100 + Math.random() * 900)}`,
      studentId: caseItem.studentId,
      studentNumber: caseItem.studentNumber,
      studentName: caseItem.studentName,
      grade: caseItem.grade,
      section: caseItem.section,
      targetBehavior: caseItem.title,
      rootCauses: 'الانفعال المفاجئ وضعف مهارات حل النزاع والميل لجذب الانتباه',
      desiredGoal: 'الامتناع التام عن السلوك غير اللائق واكتساب مهارات الانضباط الذاتي الإيجابي',
      counselorId: currentUser.id,
      counselorName: currentUser.name,
      responsibleOfficer: currentUser.name,
      startDate: today,
      endDate: today,
      counselingSessions: [
        {
          sessionNumber: 1,
          date: today,
          topic: 'الجلسة الاستكشافية: التعرف على دوافع السلوك والبدائل الإيجابية',
          studentCommitment: 'الالتزام بالهدوء واللجوء للمرشد عند الغضب',
          status: 'completed',
        },
        {
          sessionNumber: 2,
          date: today,
          topic: 'تدريب مهارات إدارة الغضب والتواصل الفعال مع الأقران',
          studentCommitment: 'تجنب الاحتكاك واستخدام أساليب التهدئة',
          status: 'scheduled',
        },
      ],
      weeklyFollowUps: [
        {
          weekNumber: 1,
          date: today,
          scorePercent: 80,
          teacherNotes: 'تحسن ملحوظ في هدوء الطالب خلال الحصة الأولى والثانية',
          parentFeedback: 'تم التحدث مع الابن وإلزامه بالنوم المبكر',
          observedBehavior: 'ملتزم ومنضبط بشكل جيد',
        },
      ],
      improvementPercentage: 75,
      finalDecision: 'ongoing',
      parentInvolved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveBehaviorModificationPlan(plan);
  }

  // Link form IDs to the behavioral case
  caseItem.associatedFormIds = {
    model6ReportId: reportId,
    model7NoticeId: noticeId,
    model8SummonId: summonId,
    model10CommitmentId: commitmentId,
    planId,
  };
  caseItem.status = 'awaiting_parent';
  saveBehavioralCase(caseItem);

  return { reportId, noticeId, summonId, commitmentId, planId };
}

// ----------------------------------------------------------------------------
// BEHAVIOR MODIFICATION PLANS (خطط تعديل السلوك)
// ----------------------------------------------------------------------------
export function getBehaviorModificationPlans(studentId?: string): BehaviorModificationPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BEHAVIOR_PLANS);
    if (!raw) {
      return [];
    }
    const list: BehaviorModificationPlan[] = JSON.parse(raw);
    if (studentId) {
      return list.filter((p) => p.studentId === studentId);
    }
    return list;
  } catch {
    return [];
  }
}

export const getBehaviorPlans = getBehaviorModificationPlans;

export function saveBehaviorModificationPlan(plan: BehaviorModificationPlan): void {
  try {
    const list = getBehaviorModificationPlans();
    const idx = list.findIndex((p) => p.id === plan.id);
    if (idx !== -1) {
      list[idx] = { ...plan, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(plan);
    }
    localStorage.setItem(STORAGE_KEYS.BEHAVIOR_PLANS, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save behavior plan', err);
  }
}

export const saveBehaviorPlan = saveBehaviorModificationPlan;

// ----------------------------------------------------------------------------
// POSITIVE BEHAVIOR & GRADE RECOVERY (السلوك الإيجابي وتعويض الدرجات)
// ----------------------------------------------------------------------------
export function getPositiveBehaviorRecords(studentId?: string): PositiveBehaviorRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSITIVE_BEHAVIORS);
    if (!raw) {
      const initialPositive: PositiveBehaviorRecord[] = [
        {
          id: 'pos-01',
          studentId: 'std-002',
          studentNumber: 'STU-1002',
          studentName: 'منصور خالد الظاهري',
          grade: 'حادي عشر',
          section: '2',
          date: getUaeTodayDateString(),
          behaviorTitle: 'مبادرة قيادية متميزة في مساعدة الزملاء وتنظيم الفعالية العلمية',
          category: 'peer_mentoring',
          pointsAwarded: 15,
          recoveredMarks: 2, // تم تعويض الدرجتين المحسومتين سابقاً
          description: 'أظهر الطالب نضجاً كبيراً وأخلاقاً رفيعة في رعاية زملائه خلال الأسبوع الأكاديمي.',
          approvedByCommittee: true,
          certificateIssued: true,
          recordedBy: 'أ. محمد المنصوري',
          createdAt: getUaeTodayDateString(),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.POSITIVE_BEHAVIORS, JSON.stringify(initialPositive));
      return studentId ? initialPositive.filter((p) => p.studentId === studentId) : initialPositive;
    }
    const list: PositiveBehaviorRecord[] = JSON.parse(raw);
    if (studentId) {
      return list.filter((p) => p.studentId === studentId);
    }
    return list;
  } catch {
    return [];
  }
}

export function savePositiveBehaviorRecord(record: PositiveBehaviorRecord): void {
  try {
    const list = getPositiveBehaviorRecords();
    const idx = list.findIndex((p) => p.id === record.id);
    if (idx !== -1) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(STORAGE_KEYS.POSITIVE_BEHAVIORS, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save positive behavior record', err);
  }
}

// ----------------------------------------------------------------------------
// PARENT MEETINGS (اجتماعات ولي الأمر)
// ----------------------------------------------------------------------------
export function getParentMeetings(studentId?: string): ParentMeetingRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARENT_MEETINGS);
    if (!raw) {
      return [];
    }
    const list: ParentMeetingRecord[] = JSON.parse(raw);
    if (studentId) {
      return list.filter((m) => m.studentId === studentId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveParentMeeting(meeting: ParentMeetingRecord): void {
  try {
    const list = getParentMeetings();
    const idx = list.findIndex((m) => m.id === meeting.id);
    if (idx !== -1) {
      list[idx] = meeting;
    } else {
      list.unshift(meeting);
    }
    localStorage.setItem(STORAGE_KEYS.PARENT_MEETINGS, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save parent meeting', err);
  }
}

// ----------------------------------------------------------------------------
// BEHAVIOR COMMITTEE MEETINGS (لجنة إدارة السلوك)
// ----------------------------------------------------------------------------
export function getCommitteeMeetings(): BehaviorCommitteeMeeting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITTEE_MEETINGS);
    if (!raw) {
      const initialMeeting: BehaviorCommitteeMeeting = {
        id: 'comm-meet-01',
        meetingNumber: 'اجتماع رقم (2) – الفصل الدراسي الثاني 2026',
        meetingDate: getUaeTodayDateString(),
        meetingTime: '10:00 ص',
        location: 'قاعة الاجتماعات الرئيسية بالإدارة',
        type: 'regular',
        chairpersonName: 'أحمد خليفة الكعبي (مدير المدرسة)',
        attendees: [
          { name: 'أحمد خليفة الكعبي', role: 'مدير المدرسة (رئيس اللجنة)', present: true, signed: true },
          { name: 'راشد سلطان الظاهري', role: 'مساعد المدير للشؤون الأكاديمية (عضواً)', present: true, signed: true },
          { name: 'أ. محمد المنصوري', role: 'المرشد الطلابي (مقرراً للجنة)', present: true, signed: true },
          { name: 'سيف عبد الله الشامسي', role: 'رئيس مجلس أولياء الأمور (عضواً)', present: true, signed: true },
          { name: 'طارق عبد الرحمن', role: 'مشرف شؤون الطلبة (عضواً)', present: true, signed: false },
        ],
        agendaItems: [
          {
            id: 'agenda-1',
            studentId: 'std-001',
            studentName: 'سلطان أحمد الشامسي',
            grade: 'الصف العاشر (10-A)',
            topic: 'النظر في تكرار شجار وتنمر لفظي وفق الدرجة الثالثة وتحديد خطة الرعاية',
            incidentDegree: 'الدرجة الثالثة (جسيمة)',
            discussionNotes: 'تم استعراض إفادات الطالب والشهود ومحضر المقابلة مع ولي الأمر.',
            proposedResolution: 'اعتماد حسم 8 درجات سلوك، وإلزام الطالب ببرنامج تعديل سلوك مكثف مع تكليف مدرسي بديل.',
            votes: { approve: 4, reject: 0, abstain: 1 },
            finalResolution: 'موافقة جماعية على الإجراء المقترح وإلزام ولي الأمر بالمتابعة الأسبوعية.',
            actionRequired: 'إصدار النموذج وتوجيه المرشد لتنفيذ خطة المتابعة',
          },
        ],
        generalNotes: 'التأكيد على البيئة الآمنة وتفعيل التدخل المبكر قبل تفاقم الحالات.',
        minutesGenerated: true,
        status: 'in_progress',
        createdAt: getUaeTodayDateString(),
        updatedAt: getUaeTodayDateString(),
      };
      localStorage.setItem(STORAGE_KEYS.COMMITTEE_MEETINGS, JSON.stringify([initialMeeting]));
      return [initialMeeting];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCommitteeMeeting(meeting: BehaviorCommitteeMeeting): void {
  try {
    const list = getCommitteeMeetings();
    const idx = list.findIndex((m) => m.id === meeting.id);
    if (idx !== -1) {
      list[idx] = { ...meeting, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...meeting, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_MEETINGS, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save committee meeting', err);
  }
}

export function deleteCommitteeMeetingLocal(meetingId: string): boolean {
  try {
    const list = getCommitteeMeetings();
    const filtered = list.filter((m) => m.id !== meetingId);
    if (filtered.length === list.length) return false;
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_MEETINGS, JSON.stringify(filtered));
    notifyStorageChange();
    return true;
  } catch (err) {
    console.error('Failed to delete committee meeting', err);
    return false;
  }
}

export function getCommitteeCasesByViolationId(violationId: string): Array<{
  meeting: BehaviorCommitteeMeeting;
  caseItem: any;
}> {
  try {
    const list = getCommitteeMeetings();
    const results: Array<{ meeting: BehaviorCommitteeMeeting; caseItem: any }> = [];
    for (const m of list) {
      if (m.cases && Array.isArray(m.cases)) {
        for (const c of m.cases) {
          if (c.violationId === violationId) {
            results.push({ meeting: m, caseItem: c });
          }
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// BEHAVIOR COMMITTEE DECISIONS (القرارات السلوكية الصادرة عن اللجنة)
// ----------------------------------------------------------------------------
export function getCommitteeDecisions(studentId?: string): BehaviorCommitteeDecision[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITTEE_DECISIONS);
    if (!raw) {
      const initialDecisions: BehaviorCommitteeDecision[] = [
        {
          id: 'dec-init-01',
          decisionNumber: 'DEC-2026-001',
          meetingId: 'comm-meet-01',
          meetingNumber: 'اجتماع رقم (2) – الفصل الدراسي الثاني 2026',
          studentId: 'std-001',
          studentName: 'سلطان أحمد الشامسي',
          studentNumber: 'STU-1001',
          grade: 'العاشر',
          section: '1',
          decisionDate: getUaeTodayDateString(),
          violationTitle: 'مخالفة الدرجة الثالثة (تكرار تنمر وشجار)',
          violationDegree: 'الدرجة الثالثة (جسيمة)',
          penalties: [
            'حسم 8 درجات من درجات السلوك للفصل الدراسي الحالي',
            'إلزام الطالب ببرنامج تعديل سلوك مكثف لمدة شهر',
            'تكليف مدرسي بديل في خدمة المكتبة المدرسية لمدة 5 أيام',
          ],
          deductedMarks: 8,
          behaviorPlanMandated: true,
          parentNotified: true,
          executionStatus: 'in_progress',
          type: 'behavior_plan_mandate',
          description: 'اعتماد الإجراء التربوي وإلزام ولي الأمر بالخطة المشتركة ومتابعة المرشد الطلابي.',
          votesInFavor: 4,
          votesAgainst: 0,
          votesAbstained: 1,
          approved: true,
          committeeChairperson: 'أحمد خليفة الكعبي (مدير المدرسة)',
          counselorName: 'أ. محمد المنصوري (المرشد الطلابي)',
          createdAt: getUaeTodayDateString(),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.COMMITTEE_DECISIONS, JSON.stringify(initialDecisions));
      return studentId ? initialDecisions.filter((d) => d.studentId === studentId) : initialDecisions;
    }
    const list: BehaviorCommitteeDecision[] = JSON.parse(raw);
    if (studentId) {
      return list.filter((d) => d.studentId === studentId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveCommitteeDecision(decision: BehaviorCommitteeDecision): void {
  try {
    const list = getCommitteeDecisions();
    const idx = list.findIndex((d) => d.id === decision.id);
    if (idx !== -1) {
      list[idx] = decision;
    } else {
      list.unshift(decision);
    }
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_DECISIONS, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save committee decision', err);
  }
}

/**
 * Refer a student or case directly to the Behavior Committee
 * Links an agenda item to upcoming meeting or creates a scheduled meeting
 */
export function referStudentToCommittee(options: {
  studentId: string;
  studentName: string;
  studentNumber?: string;
  grade?: string;
  section?: string;
  topic: string;
  proposedAction?: string;
  incidentDegree?: string;
  caseId?: string;
}): BehaviorCommitteeMeeting {
  const meetings = getCommitteeMeetings();
  // Find a scheduled or in_progress meeting or create a new one
  let targetMeeting = meetings.find((m) => m.status === 'scheduled' || m.status === 'in_progress');

  const newAgendaItem = {
    studentId: options.studentId,
    studentName: options.studentName,
    grade: options.grade || '',
    section: options.section || '',
    topic: options.topic,
    proposedAction: options.proposedAction || 'النظر في الواقعة وتطبيق الإجراءات والجزاءات المعتمدة بلائحة 851',
    decision: 'pending' as const,
    stage: 'committee_review' as const,
  };

  if (!targetMeeting) {
    targetMeeting = {
      id: `comm-meet-${Date.now()}`,
      meetingNumber: `COMM-${new Date().getFullYear()}-${meetings.length + 1}`,
      meetingDate: getUaeTodayDateString(),
      meetingTime: '10:30 ص',
      location: 'قاعة الاجتماعات الرئيسية - إدارة المدرسة',
      type: 'urgent',
      attendees: [
        { name: 'أحمد خليفة الكعبي', role: 'مدير المدرسة - رئيساً', attended: true, present: true },
        { name: 'سلطان سالم الشامسي', role: 'مساعد المدير لشؤون الطلبة', attended: true, present: true },
        { name: 'أ. محمد المنصوري', role: 'المرشد الأكاديمي - مقرراً', attended: true, present: true },
        { name: 'علي حسن البلوشي', role: 'الاختصاصي الاجتماعي', attended: true, present: true },
      ],
      agenda: [newAgendaItem],
      agendaItems: [
        {
          id: `agenda-${Date.now()}`,
          studentId: options.studentId,
          studentName: options.studentName,
          grade: options.grade || '',
          topic: options.topic,
          incidentDegree: options.incidentDegree || 'الدرجة الثالثة',
          discussionNotes: 'إحالة عاجلة من ملف الطالب للنظر النظامي.',
          proposedResolution: options.proposedAction || 'تطبيق الإجراءات المقررة',
          votes: { approve: 0, reject: 0, abstain: 0 },
          finalResolution: 'قيد المناقشة',
          actionRequired: 'انعقاد اللجنة والبت',
        },
      ],
      status: 'scheduled',
      recordedBy: 'المرشد الطلابي',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCommitteeMeeting(targetMeeting);
  } else {
    if (!targetMeeting.agenda) targetMeeting.agenda = [];
    targetMeeting.agenda.push(newAgendaItem);
    saveCommitteeMeeting(targetMeeting);
  }

  notifyStorageChange();
  return targetMeeting;
}

// ----------------------------------------------------------------------------
// CUSTOM FORM BUILDER TEMPLATES (منشئ النماذج المرن)
// ----------------------------------------------------------------------------
export function getCustomFormTemplates(): CustomFormTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FORM_TEMPLATES);
    if (!raw) {
      const initialTemplates: CustomFormTemplate[] = [
        {
          id: 'tmpl-01',
          templateCode: 'FORM-EXAM-INTEGRITY',
          title: 'محضر إخلال بالنزاهة الأكاديمية وضبط الغش',
          description: 'نموذج مخصص ومحدث لتوثيق محاولات الغش في الاختبارات المركزية والقصيرة.',
          version: 1,
          headerText: 'محضر إثبات واقعة امتحانية رسمية',
          bodyTemplate:
            'في يوم {{incident_date}} وأثناء تأدية اختبار مادة {{subject}} للصف {{grade}}، تم ضبط الطالب {{student_name}} متلبساً بالوسيلة التالية: {{details}}.\nبناءً عليه جرى تحرير هذا المحضر وإحالته لإدارة المدرسة.',
          footerText: 'يُحفظ هذا المحضر في ملف الطالب السري ويُعرض على لجنة إدارة السلوك.',
          fields: [
            { id: 'f1', label: 'المادة الدراسية', type: 'text', required: true },
            { id: 'f2', label: 'طريقة الغش المضبوطة', type: 'select', options: ['قصاصات ورقية', 'هاتف محمول', 'سماعات بلوتوث', 'تبادل إجابات'], required: true },
            { id: 'f3', label: 'إفادة المراقب', type: 'textarea', required: true },
          ],
          signaturesRequired: [
            { role: 'student', label: 'توقيع الطالب المعني' },
            { role: 'counselor', label: 'المراقب / المرشد' },
            { role: 'principal', label: 'اعتماد مدير المدرسة' },
          ],
          associatedDegree: 'الدرجة الثانية (متوسطة)',
          isActive: true,
          createdAt: getUaeTodayDateString(),
          updatedAt: getUaeTodayDateString(),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.FORM_TEMPLATES, JSON.stringify(initialTemplates));
      return initialTemplates;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomFormTemplate(template: CustomFormTemplate): void {
  try {
    const list = getCustomFormTemplates();
    const idx = list.findIndex((t) => t.id === template.id);
    if (idx !== -1) {
      list[idx] = { ...template, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...template, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.FORM_TEMPLATES, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save template', err);
  }
}

// ----------------------------------------------------------------------------
// SMART ALERTS ENGINE (نظام التنبيهات الذكي للتدخل المبكر)
// ----------------------------------------------------------------------------
export interface SmartAlert {
  id: string;
  type: 'critical_escalation' | 'repeat_violation' | 'absence_threshold' | 'pending_signature' | 'overdue_action';
  title: string;
  description: string;
  studentId?: string;
  studentName?: string;
  severity: 'high' | 'medium' | 'info';
  date: string;
  actionText?: string;
}

export function getSmartAlerts(): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const students = getStudents();
  const cases = getBehavioralCases();
  const notices = getParentNoticeForms();
  const summons = getParentSummonForms();
  const tardiness = getTardinessRecords();

  // 1. Critical Escalation Alerts (حماية طفل أو مواد ممنوعة أو مخالفات درجة 4)
  for (const c of cases) {
    if (c.confidentiality === 'restricted_child_protection' || c.track === 'child_protection') {
      alerts.push({
        id: `alt-cp-${c.id}`,
        type: 'critical_escalation',
        title: '⚠️ تصعيد فوري: حالة حماية طفل نشطة',
        description: `ملف سري للطالب ${c.studentName} يتطلب متابعة مباشرة واختصاصي حماية الطفل معتمد.`,
        studentId: c.studentId,
        studentName: c.studentName,
        severity: 'high',
        date: c.incidentDate,
        actionText: 'متابعة الحالة السرية',
      });
    }
  }

  // 2. High Tardiness/Absence Alerts (تخطي حد 3 أيام تأخير)
  for (const s of students) {
    const studentTardies = tardiness.filter((t) => t.studentId === s.id).length;
    const totalTardy = Math.max(s.totalTardiness || 0, studentTardies);
    if (totalTardy >= 3) {
      alerts.push({
        id: `alt-tardy-${s.id}`,
        type: 'absence_threshold',
        title: `تنبيه تأخير متكرر: ${s.fullName}`,
        description: `بلغ إجمالي التأخيرات الصباحية (${totalTardy}) مرات. يتطلب استدعاء ولي الأمر وتحرير تنبيه خطي رسمي (نموذج 9).`,
        studentId: s.id,
        studentName: s.fullName,
        severity: totalTardy >= 5 ? 'high' : 'medium',
        date: getUaeTodayDateString(),
        actionText: 'إصدار استدعاء / تنبيه',
      });
    }
  }

  // 3. Pending Parent Signatures (عدم توقيع ولي الأمر)
  const unsignedNotices = notices.filter((n) => !n.parentSignature);
  for (const n of unsignedNotices.slice(0, 5)) {
    alerts.push({
      id: `alt-sig-${n.id}`,
      type: 'pending_signature',
      title: `بانتظار توقيع ولي الأمر: ${n.studentName}`,
      description: `إشعار ${n.noticeType} محرر بتاريخ ${n.issueDate} لم يتم اعتماده وتوقيعه من قبل ولي الأمر حتى الآن.`,
      studentId: n.studentId,
      studentName: n.studentName,
      severity: 'medium',
      date: n.issueDate,
      actionText: 'إعادة إرسال رابط التوقيع',
    });
  }

  return alerts;
}

// ----------------------------------------------------------------------------
// BEHAVIOR COMMITTEE MEMBERS & NOTIFICATIONS SYSTEM (نظام إشعارات أعضاء لجنة السلوك)
// ----------------------------------------------------------------------------
export const DEFAULT_COMMITTEE_MEMBERS: CommitteeMember[] = [
  {
    id: 'cm-1',
    name: 'أحمد خليفة الكعبي',
    role: 'مدير المدرسة - رئيساً',
    phone: '+971501234567',
    email: 'principal.alkaabi@moe.gov.ae',
    receiveSms: true,
    receiveEmail: true,
    active: true,
  },
  {
    id: 'cm-2',
    name: 'سلطان سالم الشامسي',
    role: 'مساعد المدير لشؤون الطلبة - نائباً للرئيس',
    phone: '+971502345678',
    email: 'vp.alshamsi@moe.gov.ae',
    receiveSms: true,
    receiveEmail: true,
    active: true,
  },
  {
    id: 'cm-3',
    name: 'عبدالله راشد النعيمي',
    role: 'المرشد الأكاديمي والمهني - مقرراً',
    phone: '+971503456789',
    email: 'counselor.alnuaimi@moe.gov.ae',
    receiveSms: true,
    receiveEmail: true,
    active: true,
  },
  {
    id: 'cm-4',
    name: 'علي حسن البلوشي',
    role: 'الاختصاصي الاجتماعي',
    phone: '+971504567890',
    email: 'social.alblooshi@moe.gov.ae',
    receiveSms: true,
    receiveEmail: true,
    active: true,
  },
  {
    id: 'cm-5',
    name: 'د. خالد محمد المنصوري',
    role: 'ممثل المعلمين',
    phone: '+971505678901',
    email: 'teacher.almansoori@moe.gov.ae',
    receiveSms: true,
    receiveEmail: true,
    active: true,
  },
  {
    id: 'cm-6',
    name: 'مريم راشد القاسمي',
    role: 'مسؤولة حماية الطفل والرعاية التربوية',
    phone: '+971506789012',
    email: 'child.protection.alqasimi@moe.gov.ae',
    receiveSms: true,
    receiveEmail: true,
    active: true,
  },
];

export function getCommitteeMembers(): CommitteeMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITTEE_MEMBERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.COMMITTEE_MEMBERS, JSON.stringify(DEFAULT_COMMITTEE_MEMBERS));
      return DEFAULT_COMMITTEE_MEMBERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_COMMITTEE_MEMBERS;
  }
}

export function saveCommitteeMembers(members: CommitteeMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_MEMBERS, JSON.stringify(members));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save committee members', err);
  }
}

export function getCommitteeNotificationLogs(): CommitteeNotificationLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITTEE_NOTIFICATIONS);
    if (!raw) {
      const initialLogs: CommitteeNotificationLog[] = [
        {
          id: 'notif-init-01',
          type: 'meeting_scheduled',
          title: 'جدولة اجتماع دوري للجنة إدارة السلوك رقم (1)',
          content: 'تم جدولة اجتماع للجنة إدارة السلوك يوم الأحد 10:00 صباحاً بقاعة الاجتماعات لمناقشة تقارير الانضباط ومخالفات الدرجة الثالثة.',
          smsContent: 'لجنة السلوك: تم جدولة اجتماع للجنة إدارة السلوك يوم الأحد 10:00 ص لمناقشة حالات الطلاب، يرجى الحضور.',
          emailSubject: 'دعوة لحضور اجتماع لجنة إدارة السلوك رقم (1)',
          emailBody: 'السادة أعضاء لجنة إدارة السلوك المحترمين،\nتحية طيبة وبعد،،\nنحيطكم علماً بأنه تقرر عقد اجتماع لجنة السلوك رقم (1) يوم الأحد الساعة 10:00 صباحاً في قاعة الاجتماعات الرئيسية لمناقشة جدول الأعمال.\nشاكرين حرصكم وتعاونكم.',
          channel: 'both',
          urgencyLevel: 'normal',
          meetingId: 'comm-meet-01',
          meetingNumber: 'اجتماع رقم (1)',
          meetingDate: '2026-09-18',
          meetingTime: '10:00 ص',
          recipients: DEFAULT_COMMITTEE_MEMBERS.map((m) => ({
            memberId: m.id,
            name: m.name,
            role: m.role,
            phone: m.phone,
            email: m.email,
            channelsSent: ['sms', 'email'],
            status: 'delivered',
          })),
          sentBy: 'المرشد الأكاديمي والمهني',
          sentAt: '2026-09-15 08:30 ص',
          timestamp: Date.now() - 86400000,
        },
        {
          id: 'notif-init-02',
          type: 'urgent_student_status',
          title: '🚨 تنبيه عاجل: إحالة مخالفة جسيمة للطالب سلطان أحمد الشامسي',
          content: 'تم تحديث حالة الطالب سلطان أحمد الشامسي (الصف العاشر/1) وإحالته الفورية إلى لجنة إدارة السلوك للبت في واقعة شجار وتنمر لفظي وفق الدرجة الثالثة.',
          smsContent: 'عاجل - لجنة السلوك: إحالة طارئة للطالب سلطان الشامسي (الصف 10/1) بمخالفة درجة 3 تتطلب إجراء فورياً من اللجنة.',
          emailSubject: '🚨 تنبيه عاجل: إحالة طالب إلى لجنة إدارة السلوك - سلطان أحمد الشامسي',
          emailBody: 'السادة رئيس وأعضاء لجنة إدارة السلوك،\nنحيطكم علماً بأنه تم تسجيل مخالفة جسيمة وإحالة عاجلة للطالب سلطان أحمد الشامسي (الصف العاشر/1)، وتتطلب الحالة عقد جلسة طارئة للبت في الإجراء التربوي وإقرار خطة تعديل السلوك.\nمرفق تقرير الواقعة رقم (6).',
          channel: 'both',
          urgencyLevel: 'urgent',
          studentId: 'std-001',
          studentName: 'سلطان أحمد الشامسي',
          grade: 'العاشر',
          section: '1',
          recipients: DEFAULT_COMMITTEE_MEMBERS.map((m) => ({
            memberId: m.id,
            name: m.name,
            role: m.role,
            phone: m.phone,
            email: m.email,
            channelsSent: ['sms', 'email'],
            status: 'delivered',
          })),
          sentBy: 'المرشد الأكاديمي والمهني',
          sentAt: '2026-09-16 09:15 ص',
          timestamp: Date.now() - 3600000,
        },
      ];
      localStorage.setItem(STORAGE_KEYS.COMMITTEE_NOTIFICATIONS, JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCommitteeNotificationLog(notification: CommitteeNotificationLog): void {
  try {
    const list = getCommitteeNotificationLogs();
    list.unshift(notification);
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_NOTIFICATIONS, JSON.stringify(list));
    notifyStorageChange();
  } catch (err) {
    console.error('Failed to save committee notification log', err);
  }
}

/**
 * Dispatches a notification to selected or all committee members via SMS, Email, or Both.
 */
export function dispatchCommitteeNotification(options: {
  type: CommitteeNotificationLog['type'];
  title: string;
  content: string;
  smsContent?: string;
  emailSubject?: string;
  emailBody?: string;
  channel: 'sms' | 'email' | 'both';
  urgencyLevel?: 'normal' | 'urgent' | 'critical';
  meetingId?: string;
  meetingNumber?: string;
  meetingDate?: string;
  meetingTime?: string;
  studentId?: string;
  studentName?: string;
  grade?: string;
  section?: string;
  targetMemberIds?: string[];
  sentBy?: string;
}): CommitteeNotificationLog {
  const members = getCommitteeMembers().filter((m) => m.active);
  const selectedMembers = options.targetMemberIds && options.targetMemberIds.length > 0
    ? members.filter((m) => options.targetMemberIds!.includes(m.id))
    : members;

  const recipients = selectedMembers.map((m) => {
    const channelsSent: ('sms' | 'email')[] = [];
    if ((options.channel === 'sms' || options.channel === 'both') && m.receiveSms) {
      channelsSent.push('sms');
    }
    if ((options.channel === 'email' || options.channel === 'both') && m.receiveEmail) {
      channelsSent.push('email');
    }
    return {
      memberId: m.id,
      name: m.name,
      role: m.role,
      phone: m.phone,
      email: m.email,
      channelsSent,
      status: 'delivered' as const,
    };
  });

  const now = new Date();
  const timeFormatted = now.toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = getUaeTodayDateString();

  const newLog: CommitteeNotificationLog = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: options.type,
    title: options.title,
    content: options.content,
    smsContent: options.smsContent || options.content,
    emailSubject: options.emailSubject || options.title,
    emailBody: options.emailBody || options.content,
    channel: options.channel,
    urgencyLevel: options.urgencyLevel || 'normal',
    meetingId: options.meetingId,
    meetingNumber: options.meetingNumber,
    meetingDate: options.meetingDate,
    meetingTime: options.meetingTime,
    studentId: options.studentId,
    studentName: options.studentName,
    grade: options.grade,
    section: options.section,
    recipients,
    sentBy: options.sentBy || 'مقرر لجنة إدارة السلوك',
    sentAt: `${dateFormatted} ${timeFormatted}`,
    timestamp: Date.now(),
  };

  saveCommitteeNotificationLog(newLog);
  return newLog;
}

// ----------------------------------------------------------------------------
// CASE MANAGEMENT & COUNSELING MODULE STORAGE HELPERS
// ----------------------------------------------------------------------------

export function getStoredStudentCases(schoolId?: string): StudentCaseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_CASES);
    if (!raw) {
      const initialCases: StudentCaseRecord[] = [
        {
          id: 'case-demo-01',
          caseNumber: 'CAS-2026-001',
          studentId: 'std-001',
          studentName: 'سلطان أحمد الشامسي',
          studentNumber: '20261001',
          grade: 'الصف العاشر',
          section: '10-A',
          caseType: 'سلوكية',
          subcategory: 'تكرار شجار وتنمر لفظي',
          referralSource: 'المعلم',
          status: 'مفتوح',
          confidentialityLevel: 'عادي',
          assignedCounselorId: 'counselor-1',
          assignedCounselorName: 'أ. محمد المنصوري',
          schoolId: schoolId || 'alkhalil-school',
          openedAt: '2026-09-10',
          nextFollowUpAt: '2026-09-22',
          academicYear: '2025-2026',
          referralReason: 'متابعة انضباطية وسلوكية بعد رصد نزاعات لفظية متكررة مع الأقران والعمل على خطة ضبط النفس.',
          initialSummary: 'تم عقد جلستين إرشاديتين وتطبيق تقنيات التهدئة الذاتية وتكليف بمهام قيادية صفية.',
          parentNotified: true,
          parentNotificationDate: '2026-09-11',
          createdBy: 'counselor-1',
          createdAt: '2026-09-10T08:00:00.000Z',
          updatedBy: 'counselor-1',
          updatedAt: '2026-09-17T10:00:00.000Z',
        },
        {
          id: 'case-demo-02',
          caseNumber: 'CAS-2026-002',
          studentId: 'std-002',
          studentName: 'هزاع محمد المنصوري',
          studentNumber: '20261002',
          grade: 'الصف الحادي عشر',
          section: '11-B',
          caseType: 'أكاديمية',
          subcategory: 'تراجع أو تعثر تحصيلي دراسي',
          referralSource: 'المعلم',
          status: 'مفتوح',
          confidentialityLevel: 'مقيّد',
          assignedCounselorId: 'counselor-1',
          assignedCounselorName: 'أ. محمد المنصوري',
          schoolId: schoolId || 'alkhalil-school',
          openedAt: '2026-09-12',
          nextFollowUpAt: '2026-09-23',
          academicYear: '2025-2026',
          referralReason: 'تراجع ملحوظ في درجات مواد الرياضيات والعلوم مع تشتت التركيز أثناء الحصص.',
          initialSummary: 'إجراء دراسة حالة مصغرة وتنسيق حصص تقوية وبناء جدول دراسي أسبوعي.',
          parentNotified: true,
          parentNotificationDate: '2026-09-13',
          createdBy: 'counselor-1',
          createdAt: '2026-09-12T09:30:00.000Z',
          updatedBy: 'counselor-1',
          updatedAt: '2026-09-16T11:00:00.000Z',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.STUDENT_CASES, JSON.stringify(initialCases));
      return initialCases;
    }
    const list: StudentCaseRecord[] = JSON.parse(raw);
    if (schoolId) {
      return list.filter((c) => c.schoolId === schoolId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveStoredStudentCase(record: StudentCaseRecord): void {
  try {
    const current = getStoredStudentCases();
    const idx = current.findIndex((c) => c.id === record.id);
    let updated: StudentCaseRecord[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = record;
    } else {
      updated = [record, ...current];
    }
    localStorage.setItem(STORAGE_KEYS.STUDENT_CASES, JSON.stringify(updated));
    notifyStorageChange();
  } catch (err) {
    console.warn('Error saving case to local storage:', err);
  }
}

export function saveAllStoredStudentCases(cases: StudentCaseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_CASES, JSON.stringify(cases));
    notifyStorageChange();
  } catch (err) {
    console.warn('Error saving all cases to local storage:', err);
  }
}

export function getStoredStudentCaseForm(
  caseId: string,
  formId = 'student_data_update'
): StudentCaseFormRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_CASE_FORMS);
    if (!raw) return null;
    const map: Record<string, StudentCaseFormRecord> = JSON.parse(raw);
    const key = `${caseId}_${formId}`;
    return map[key] || null;
  } catch {
    return null;
  }
}

export function saveStoredStudentCaseForm(form: StudentCaseFormRecord): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_CASE_FORMS);
    const map: Record<string, StudentCaseFormRecord> = raw ? JSON.parse(raw) : {};
    const key = `${form.caseId}_${form.id || 'student_data_update'}`;
    map[key] = form;
    localStorage.setItem(STORAGE_KEYS.STUDENT_CASE_FORMS, JSON.stringify(map));
    notifyStorageChange();
  } catch (err) {
    console.warn('Error saving form to local storage:', err);
  }
}

// ============================================================================
// OFFICIAL BYLAW ANNEX FORMS PERSISTENCE (النماذج الوزارية الرسمية 20, 21, 24, 25, 26, 27)
// ============================================================================

// --- 1. MODEL 20: إخطار بالحسم من درجة السلوك ---
export function getBehaviorDeductionNotices(): BehaviorDeductionNoticeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveBehaviorDeductionNoticeLocal(form: BehaviorDeductionNoticeRecord): void {
  const list = getBehaviorDeductionNotices();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = getUaeTodayDateString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteBehaviorDeductionNoticeLocal(id: string): boolean {
  const list = getBehaviorDeductionNotices();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// --- 2. MODEL 21: نموذج تعويض عن مخالفة ---
export function getViolationCompensations(): ViolationCompensationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VIOLATION_COMPENSATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveViolationCompensationLocal(form: ViolationCompensationRecord): void {
  const list = getViolationCompensations();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = getUaeTodayDateString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.VIOLATION_COMPENSATIONS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteViolationCompensationLocal(id: string): boolean {
  const list = getViolationCompensations();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.VIOLATION_COMPENSATIONS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// --- 3. MODEL 24: مصادرة أجهزة الكترونية ---
export function getDeviceConfiscations(): DeviceConfiscationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_CONFISCATIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDeviceConfiscationLocal(form: DeviceConfiscationRecord): void {
  const list = getDeviceConfiscations();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = getUaeTodayDateString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.DEVICE_CONFISCATIONS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteDeviceConfiscationLocal(id: string): boolean {
  const list = getDeviceConfiscations();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.DEVICE_CONFISCATIONS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// --- 4. MODEL 25: إعادة أجهزة الكترونية ---
export function getDeviceReturns(): DeviceReturnRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_RETURNS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDeviceReturnLocal(form: DeviceReturnRecord): void {
  const list = getDeviceReturns();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = getUaeTodayDateString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.DEVICE_RETURNS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteDeviceReturnLocal(id: string): boolean {
  const list = getDeviceReturns();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.DEVICE_RETURNS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// --- 5. MODEL 26: تعهد ولي أمر بالأشخاص المخولين لاستلام ابنه / ابنته ---
export function getAuthorizedPickupCommitments(): AuthorizedPickupCommitmentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTHORIZED_PICKUPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAuthorizedPickupCommitmentLocal(form: AuthorizedPickupCommitmentRecord): void {
  const list = getAuthorizedPickupCommitments();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = getUaeTodayDateString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.AUTHORIZED_PICKUPS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteAuthorizedPickupCommitmentLocal(id: string): boolean {
  const list = getAuthorizedPickupCommitments();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.AUTHORIZED_PICKUPS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// --- 6. MODEL 27: تعهد ولي أمر بالتزام ابنه/ ابنته بالدوام المدرسي ---
export function getAttendanceCommitments(): AttendanceCommitmentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE_COMMITMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAttendanceCommitmentLocal(form: AttendanceCommitmentRecord): void {
  const list = getAttendanceCommitments();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = getUaeTodayDateString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE_COMMITMENTS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteAttendanceCommitmentLocal(id: string): boolean {
  const list = getAttendanceCommitments();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE_COMMITMENTS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// ----------------------------------------------------------------------------
// INDIVIDUAL COUNSELING SESSIONS (استمارة الإرشاد الفردي ودراسة الحالة المصغرة)
// ----------------------------------------------------------------------------

export function getCounselingSessionsLocal(caseId?: string): CounselingSessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COUNSELING_SESSIONS);
    if (!raw) {
      const initialSessions: CounselingSessionRecord[] = [
        {
          id: 'session-demo-01',
          caseId: 'case-demo-01',
          studentId: 'std-001',
          schoolId: 'alkhalil-school',
          sessionNumber: 'SES-CAS-2026-001-01',
          sessionDate: '2026-09-15',
          startTime: '09:30',
          endTime: '10:15',
          sessionType: 'جلسة أولى',
          sessionLocation: 'مكتب المرشد',
          confidentialityLevel: 'عادي',
          counselorName: 'أ. محمد المنصوري',
          priorityLevel: 'مرتفع',
          counselingAreas: [
            'مخالفة سلوكية أو عدم انضباط',
            'علاقات الأقران والنزاعات الطلابية',
            'انفعالات حادة أو غضب وصعوبة ضبط النفس',
          ],
          sessionTitle: 'جلسة استكشافية أولى لبحث دوافع الانفعال وتنظيم مهارات ضبط النفس',
          sessionReasons: 'إحالة من رائد الفصل إثر مشادة كلامية مع زميل بالصف وملاحظة سرعة الاستثارة.',
          studentWordsProblemDescription:
            'أفاد الطالب بأنه شعر بالاستفزاز وسرعة الانفعال نتيجة تعليق غير لائق، وأبدى رغبته في تحسين علاقاته مع زملائه وتجنب المشاحنات.',
          counselorDirectObservations:
            'يعاني الطالب من ضعف في التعبير الهادئ عن المشاعر وسرعة الغضب، مع وجود دافعية عالية للتغيير الإيجابي والتعاون.',
          studentInteraction: 'متعاون',
          studentReadinessToCooperate: 'مرتفع',
          sessionGoals: [
            {
              id: 'g-01',
              description: 'تدريب الطالب على مهارات إدارة الغضب والتنفس العميق عند استشعار التوتر',
              type: 'سلوكي',
              status: 'يحتاج إلى متابعة',
              notes: 'استخدام بطاقة التهدئة الذاتية والعد العكسي قبل الرد (المرشد والطالب)',
            },
            {
              id: 'g-02',
              description: 'الابتعاد الفوري عن التجمعات المثيرة للمشاحنات أثناء الفسحة المدرسية',
              type: 'سلوكي',
              status: 'تحقق',
              notes: 'المشاركة في الأنشطة الرياضية الموجهة بإشراف معلم الرياضة',
            },
          ],
          counselingTechniquesUsed: ['حوار عقلاني انفعالي', 'لعب الأدوار ونمذجة السلوك', 'التعزيز الإيجابي'],
          sessionOutcome:
            'تم الاتفاق على تقنيات التهدئة وضبط النفس والابتعاد عن مواطن الخلاف، والتزام الطالب بميثاق سلوكي صفي.',
          nextFollowUpAt: '2026-09-22',
          nextFollowUpPurpose: 'تقييم الالتزام بالسلوك الصفي ومراجعة المواقف اليومية مع رائد الفصل.',
          notesAndRecommendations:
            'يوصى بالتواصل الإيجابي مع ولي الأمر لتعزيز سلوك الطالب في المنزل وعدم التذكير بالمواقف السابقة.',
          formStatus: 'معتمد',
          isArchived: false,
          studentSignature: 'سلطان أحمد الشامسي',
          studentSignatureDate: '2026-09-15',
          counselorSignature: 'أ. محمد المنصوري',
          counselorSignatureDate: '2026-09-15',
          schoolPrincipalApproval: 'أحمد خليفة الكعبي',
          schoolPrincipalApprovalDate: '2026-09-16',
          createdAt: '2026-09-15T09:30:00.000Z',
          updatedAt: '2026-09-16T10:00:00.000Z',
        },
        {
          id: 'session-demo-02',
          caseId: 'case-demo-01',
          studentId: 'std-001',
          schoolId: 'alkhalil-school',
          sessionNumber: 'SES-CAS-2026-001-02',
          sessionDate: '2026-09-17',
          startTime: '11:00',
          endTime: '11:45',
          sessionType: 'جلسة متابعة',
          sessionLocation: 'مكتب المرشد',
          confidentialityLevel: 'عادي',
          counselorName: 'أ. محمد المنصوري',
          priorityLevel: 'متوسط',
          counselingAreas: ['علاقات الأقران والنزاعات الطلابية'],
          sessionTitle: 'متابعة الالتزام بالسلوك الإيجابي ومراجعة تقرير رائد الفصل',
          sessionReasons: 'جلسة متابعة دورية أسبوعية للتحقق من هدوء الطالب والتزامه الصفي.',
          studentWordsProblemDescription:
            'أكد الطالب نجاحه في تجنب أي مشادة كلامية طوال الأسبوع وشعوره بالراحة والتقدير من زملائه والمعلمين.',
          counselorDiagnosticImpression:
            'تحسن ملحوظ في مستوى النضج الانفعالي والالتزام بالقواعد الصفية والتفاعل الإيجابي مع البيئة المدرسية.',
          studentInteraction: 'متعاون',
          studentReadinessToCooperate: 'مرتفع',
          sessionGoals: [
            {
              id: 'g-03',
              description: 'تثبيت السلوك الإيجابي وتشجيع الطالب على المبادرة الصفية',
              type: 'سلوكي',
              status: 'تحقق',
              notes: 'تكليف الطالب بمساعدة رائد الفصل في تنظيم الأنشطة الصباحية (رائد الفصل والمرشد)',
            },
          ],
          counselingTechniquesUsed: ['التعزيز الإيجابي', 'إعادة الصياغة المعرفية'],
          sessionOutcome:
            'تحسن إيجابي ملحوظ وعدم تسجيل أي ملاحظات سلبية، وتكليف الطالب بمسؤولية صفية لتعزيز ثقته بنفسه.',
          nextFollowUpAt: '2026-09-24',
          nextFollowUpPurpose: 'جلسة مراجعة نهائية قبل خفض مستوى المتابعة وتحديث سجل الحالة.',
          notesAndRecommendations: 'شكر رائد الفصل على تعاونه المثمر ومتابعة الطالب اليومية.',
          formStatus: 'معتمد',
          isArchived: false,
          studentSignature: 'سلطان أحمد الشامسي',
          studentSignatureDate: '2026-09-17',
          counselorSignature: 'أ. محمد المنصوري',
          counselorSignatureDate: '2026-09-17',
          createdAt: '2026-09-17T11:00:00.000Z',
          updatedAt: '2026-09-17T11:45:00.000Z',
        },
        {
          id: 'session-demo-03',
          caseId: 'case-demo-02',
          studentId: 'std-002',
          schoolId: 'alkhalil-school',
          sessionNumber: 'SES-CAS-2026-002-01',
          sessionDate: '2026-09-16',
          startTime: '10:00',
          endTime: '10:50',
          sessionType: 'جلسة أولى',
          sessionLocation: 'مكتب المرشد',
          confidentialityLevel: 'مقيّد',
          counselorName: 'أ. محمد المنصوري',
          priorityLevel: 'مرتفع',
          counselingAreas: [
            'تراجع أو تعثر تحصيلي دراسي',
            'دافعية التعلم وتنظيم الوقت',
            'صعوبات في القلق الامتحاني أو الأداء الأكاديمي',
          ],
          sessionTitle: 'دراسة حالة مصغرة لبحث أسباب التعثر الدراسي وتنظيم الجدول الأسبوعي',
          sessionReasons: 'تراجع ملحوظ في درجات مواد الرياضيات والفيزياء وشكوى من تشتت الانتباه.',
          studentWordsProblemDescription:
            'ذكر الطالب أنه يعاني من السهر الطويل واستخدام الهاتف المحمول مما يسبب له الخمول الصباحي وعدم التركيز في الحصص الأولى.',
          counselorDiagnosticImpression:
            'اضطراب في نمط النوم واستخدام الشاشات الإلكترونية يؤثر سلباً على اليقظة والتحصيل الأكاديمي.',
          studentInteraction: 'متعاون',
          studentReadinessToCooperate: 'مرتفع',
          sessionGoals: [
            {
              id: 'g-04',
              description: 'وضع جدول زمني للمذاكرة وتقنين استخدام الهاتف قبل النوم بساعتين',
              type: 'أكاديمي',
              status: 'يحتاج إلى متابعة',
              notes: 'تسليم الهاتف لولي الأمر الساعة 9:30 مساءً وتحديد ساعتين يومياً للمذاكرة المركزية',
            },
            {
              id: 'g-05',
              description: 'الالتحاق ببرنامج التقوية الصباحي لمادة الرياضيات',
              type: 'أكاديمي',
              status: 'يحتاج إلى متابعة',
              notes: 'حضور حصص الدعم المدرسي أيام الاثنين والأربعاء (معلم الرياضيات والطالب)',
            },
          ],
          counselingTechniquesUsed: ['العقد السلوكي', 'إدارة الوقت وحل المشكلات', 'الإرشاد المعرفي'],
          sessionOutcome:
            'تم الاتفاق على العقد السلوكي لتنظيم الوقت والنوم، وإلحاق الطالب بمجموعات التقوية بموافقة المعلم.',
          nextFollowUpAt: '2026-09-23',
          nextFollowUpPurpose: 'متابعة الالتزام ببرنامج التقوية ومراجعة سجل الحضور والنوم مع ولي الأمر.',
          notesAndRecommendations: 'متابعة أسبوعية مع معلم الرياضيات ومعلم الفيزياء.',
          formStatus: 'معتمد',
          isArchived: false,
          studentSignature: 'هزاع محمد المنصوري',
          studentSignatureDate: '2026-09-16',
          counselorSignature: 'أ. محمد المنصوري',
          counselorSignatureDate: '2026-09-16',
          createdAt: '2026-09-16T10:00:00.000Z',
          updatedAt: '2026-09-16T10:50:00.000Z',
        },
      ];
      localStorage.setItem(STORAGE_KEYS.COUNSELING_SESSIONS, JSON.stringify(initialSessions));
      return caseId ? initialSessions.filter((s) => s.caseId === caseId) : initialSessions;
    }
    const list: CounselingSessionRecord[] = JSON.parse(raw);
    if (caseId) {
      return list.filter((s) => s.caseId === caseId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveCounselingSessionLocal(session: CounselingSessionRecord): void {
  const list = getCounselingSessionsLocal();
  const idx = list.findIndex((s) => s.id === session.id);
  const now = new Date().toISOString();
  if (idx !== -1) {
    list[idx] = { ...session, updatedAt: now };
  } else {
    list.unshift({ ...session, createdAt: session.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.COUNSELING_SESSIONS, JSON.stringify(list));
  notifyStorageChange();
}

export function saveAllCounselingSessionsLocal(sessions: CounselingSessionRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.COUNSELING_SESSIONS, JSON.stringify(sessions));
  notifyStorageChange();
}

export function archiveCounselingSessionLocal(sessionId: string): boolean {
  const list = getCounselingSessionsLocal();
  const target = list.find((s) => s.id === sessionId);
  if (!target) return false;
  const now = new Date().toISOString();
  target.formStatus = 'مؤرشف';
  target.isArchived = true;
  target.archivedAt = now;
  target.updatedAt = now;
  localStorage.setItem(STORAGE_KEYS.COUNSELING_SESSIONS, JSON.stringify(list));
  notifyStorageChange();
  return true;
}

// ============================================================================
// MODEL 12: TEMPORARY SUSPENSION (قرار إيقاف مؤقت من الدراسة – ملحق 12)
// ============================================================================
export function getTemporarySuspensionForms(): TemporarySuspensionFormRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEMPORARY_SUSPENSIONS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTemporarySuspensionFormLocal(form: TemporarySuspensionFormRecord): void {
  const list = getTemporarySuspensionForms();
  const idx = list.findIndex((f) => f.id === form.id);
  const now = new Date().toISOString();
  if (idx !== -1) {
    list[idx] = { ...form, updatedAt: now };
  } else {
    list.unshift({ ...form, createdAt: form.createdAt || now, updatedAt: now });
  }
  localStorage.setItem(STORAGE_KEYS.TEMPORARY_SUSPENSIONS, JSON.stringify(list));
  notifyStorageChange();
}

export function deleteTemporarySuspensionFormLocal(id: string): boolean {
  const list = getTemporarySuspensionForms();
  const target = list.find((f) => f.id === id);
  if (!target) return false;
  const filtered = list.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.TEMPORARY_SUSPENSIONS, JSON.stringify(filtered));
  notifyStorageChange();
  return true;
}

// ----------------------------------------------------------------------------
// STAFF & EMPLOYEES REGISTRY (سجل الموظفين والكادر المدرسي)
// ----------------------------------------------------------------------------
export function getInitialEmployees(): EmployeeRecord[] {
  return [
    {
      id: 'EMP-1001',
      employeeNumber: '1001',
      fullName: 'أحمد خليفة الكعبي',
      jobTitle: 'مدير المدرسة',
      department: 'الإدارة المدرسية',
      phoneNumber: '0501234567',
      email: 'principal@school.edu.ae',
      isCommitteeMember: true,
      committeeRole: 'رئيس اللجنة',
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1002',
      employeeNumber: '1002',
      fullName: 'سلطان سالم الشامسي',
      jobTitle: 'مساعد المدير لشؤون الطلبة',
      department: 'الإدارة المدرسية',
      phoneNumber: '0502345678',
      email: 'sultan.shamsi@school.edu.ae',
      isCommitteeMember: true,
      committeeRole: 'نائب الرئيس',
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1003',
      employeeNumber: '1003',
      fullName: 'عبدالله راشد النعيمي',
      jobTitle: 'المرشد الأكاديمي والمهني',
      department: 'الإرشاد الأكاديمي والطلابي',
      phoneNumber: '0503456789',
      email: 'counselor@school.edu.ae',
      isCommitteeMember: true,
      committeeRole: 'مقرر اللجنة',
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1004',
      employeeNumber: '1004',
      fullName: 'علي حسن البلوشي',
      jobTitle: 'الاختصاصي الاجتماعي',
      department: 'الرعاية الطلابية والخدمة الاجتماعية',
      phoneNumber: '0504567890',
      email: 'ali.balushi@school.edu.ae',
      isCommitteeMember: true,
      committeeRole: 'عضو',
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1005',
      employeeNumber: '1005',
      fullName: 'د. خالد محمد المنصوري',
      jobTitle: 'معلم أول - فيزياء',
      department: 'العلوم الطبيعية',
      phoneNumber: '0505678901',
      email: 'khaled.mansoori@school.edu.ae',
      isCommitteeMember: true,
      committeeRole: 'ممثل المعلمين',
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1006',
      employeeNumber: '1006',
      fullName: 'سيف عبد الله الشامسي',
      jobTitle: 'رئيس مجلس أولياء الأمور',
      department: 'المجتمع المدرسي',
      phoneNumber: '0506789012',
      email: 'parent.rep@school.edu.ae',
      isCommitteeMember: true,
      committeeRole: 'ممثل أولياء الأمور',
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1007',
      employeeNumber: '1007',
      fullName: 'محمد إبراهيم الزعابي',
      jobTitle: 'معلم لغة عربية',
      department: 'اللغة العربية',
      phoneNumber: '0507890123',
      email: 'mohamed.zaabi@school.edu.ae',
      isCommitteeMember: false,
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1008',
      employeeNumber: '1008',
      fullName: 'خالد عبدالله المري',
      jobTitle: 'معلم رياضيات',
      department: 'الرياضيات',
      phoneNumber: '0508901234',
      email: 'khaled.marri@school.edu.ae',
      isCommitteeMember: false,
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1009',
      employeeNumber: '1009',
      fullName: 'عمر يوسف الحوسني',
      jobTitle: 'معلم تربية إسلامية',
      department: 'التربية الإسلامية',
      phoneNumber: '0509012345',
      email: 'omar.hosani@school.edu.ae',
      isCommitteeMember: false,
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
    {
      id: 'EMP-1010',
      employeeNumber: '1010',
      fullName: 'سالم مبارك العامري',
      jobTitle: 'مشرف إداري وشؤون طلابية',
      department: 'الإشراف الطلابي',
      phoneNumber: '0500123456',
      email: 'salem.ameri@school.edu.ae',
      isCommitteeMember: false,
      status: 'active',
      schoolId: '7001',
      createdAt: '2025-09-01T08:00:00Z',
      updatedAt: '2025-09-01T08:00:00Z',
    },
  ];
}

export function getEmployees(): EmployeeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STAFF_EMPLOYEES);
    if (!raw) {
      const initial = getInitialEmployees();
      localStorage.setItem(STORAGE_KEYS.STAFF_EMPLOYEES, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const fallback = getInitialEmployees();
    localStorage.setItem(STORAGE_KEYS.STAFF_EMPLOYEES, JSON.stringify(fallback));
    return fallback;
  } catch {
    return getInitialEmployees();
  }
}

export function saveEmployeesLocal(employees: EmployeeRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.STAFF_EMPLOYEES, JSON.stringify(employees));
  notifyStorageChange();
}

export function addEmployeeLocal(emp: EmployeeRecord): void {
  const list = getEmployees();
  const exists = list.some((e) => e.employeeNumber === emp.employeeNumber || e.id === emp.id);
  if (exists) {
    const updated = list.map((e) => (e.id === emp.id || e.employeeNumber === emp.employeeNumber ? emp : e));
    saveEmployeesLocal(updated);
    return;
  }
  list.unshift(emp);
  saveEmployeesLocal(list);
}

export function updateEmployeeLocal(emp: EmployeeRecord): void {
  const list = getEmployees();
  const idx = list.findIndex((e) => e.id === emp.id);
  if (idx !== -1) {
    list[idx] = { ...emp, updatedAt: new Date().toISOString() };
  } else {
    list.unshift(emp);
  }
  saveEmployeesLocal(list);
}

export function deleteEmployeeLocal(id: string): boolean {
  const list = getEmployees();
  const target = list.find((e) => e.id === id);
  if (!target) return false;
  const filtered = list.filter((e) => e.id !== id);
  saveEmployeesLocal(filtered);
  return true;
}

export function batchSaveEmployeesLocal(newEmployees: EmployeeRecord[]): void {
  const current = getEmployees();
  const map = new Map<string, EmployeeRecord>();
  current.forEach((e) => map.set(e.employeeNumber || e.id, e));
  newEmployees.forEach((e) => map.set(e.employeeNumber || e.id, e));
  const merged = Array.from(map.values());
  saveEmployeesLocal(merged);
}

// ----------------------------------------------------------------------------
// COMMITTEE FORMATION CONFIG (تشكيل لجان إدارة السلوك)
// ----------------------------------------------------------------------------
export function getInitialCommitteeFormation(): CommitteeFormationConfig {
  return {
    schoolId: '7001',
    academicYear: '2025/2026',
    updatedAt: new Date().toISOString(),
    members: [
      {
        id: 'CFM-1',
        employeeId: 'EMP-1001',
        name: 'أحمد خليفة الكعبي',
        roleTitle: 'مدير المدرسة - رئيساً',
        department: 'الإدارة المدرسية',
        phoneNumber: '0501234567',
        isRequired: true,
      },
      {
        id: 'CFM-2',
        employeeId: 'EMP-1002',
        name: 'سلطان سالم الشامسي',
        roleTitle: 'مساعد المدير لشؤون الطلبة - نائباً',
        department: 'الإدارة المدرسية',
        phoneNumber: '0502345678',
        isRequired: true,
      },
      {
        id: 'CFM-3',
        employeeId: 'EMP-1003',
        name: 'عبدالله راشد النعيمي',
        roleTitle: 'المرشد الأكاديمي والمهني - مقرراً',
        department: 'الإرشاد الأكاديمي والطلابي',
        phoneNumber: '0503456789',
        isRequired: true,
      },
      {
        id: 'CFM-4',
        employeeId: 'EMP-1004',
        name: 'علي حسن البلوشي',
        roleTitle: 'الاختصاصي الاجتماعي - عضواً',
        department: 'الرعاية الطلابية والخدمة الاجتماعية',
        phoneNumber: '0504567890',
        isRequired: true,
      },
      {
        id: 'CFM-5',
        employeeId: 'EMP-1005',
        name: 'د. خالد محمد المنصوري',
        roleTitle: 'ممثل المعلمين - عضواً',
        department: 'العلوم الطبيعية',
        phoneNumber: '0505678901',
        isRequired: true,
      },
      {
        id: 'CFM-6',
        employeeId: 'EMP-1006',
        name: 'سيف عبد الله الشامسي',
        roleTitle: 'رئيس مجلس أولياء الأمور - عضواً',
        department: 'المجتمع المدرسي',
        phoneNumber: '0506789012',
        isRequired: true,
      },
    ],
  };
}

export function getCommitteeFormationLocal(): CommitteeFormationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITTEE_FORMATION);
    if (!raw) {
      const initial = getInitialCommitteeFormation();
      localStorage.setItem(STORAGE_KEYS.COMMITTEE_FORMATION, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.members) && parsed.members.length > 0) {
      return parsed;
    }
    const initial = getInitialCommitteeFormation();
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_FORMATION, JSON.stringify(initial));
    return initial;
  } catch {
    return getInitialCommitteeFormation();
  }
}

export function saveCommitteeFormationLocal(config: CommitteeFormationConfig): void {
  localStorage.setItem(STORAGE_KEYS.COMMITTEE_FORMATION, JSON.stringify(config));
  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// OFFICIAL DOCUMENTS LOCAL CACHE
// ----------------------------------------------------------------------------
export function getOfficialDocumentsLocal(): OfficialDocumentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFICIAL_DOCUMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveOfficialDocumentLocal(doc: OfficialDocumentRecord): void {
  const current = getOfficialDocumentsLocal();
  const index = current.findIndex((d) => d.id === doc.id || d.documentId === doc.documentId);
  let updated: OfficialDocumentRecord[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = doc;
  } else {
    updated = [doc, ...current];
  }
  localStorage.setItem(STORAGE_KEYS.OFFICIAL_DOCUMENTS, JSON.stringify(updated));
  notifyStorageChange();
}

export function deleteOfficialDocumentLocal(docId: string): void {
  const current = getOfficialDocumentsLocal();
  const updated = current.filter((d) => d.id !== docId && d.documentId !== docId);
  localStorage.setItem(STORAGE_KEYS.OFFICIAL_DOCUMENTS, JSON.stringify(updated));
  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// SMART GUIDANCE & COUNSELING CACHE HELPERS
// ----------------------------------------------------------------------------
export function getGuidancePlansLocal(): GuidancePlanRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GUIDANCE_PLANS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setGuidancePlansLocal(plans: GuidancePlanRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.GUIDANCE_PLANS, JSON.stringify(plans));
  notifyStorageChange();
}

export function getNeedsAssessmentsLocal(): NeedsAssessmentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NEEDS_ASSESSMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setNeedsAssessmentsLocal(items: NeedsAssessmentRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.NEEDS_ASSESSMENTS, JSON.stringify(items));
  notifyStorageChange();
}

export function getCounselorTasksLocal(): CounselorTaskRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COUNSELOR_TASKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCounselorTasksLocal(items: CounselorTaskRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.COUNSELOR_TASKS, JSON.stringify(items));
  notifyStorageChange();
}

export function getStudentReferralsLocal(): StudentReferralRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENT_REFERRALS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setStudentReferralsLocal(items: StudentReferralRecord[]): void {
  localStorage.setItem(STORAGE_KEYS.STUDENT_REFERRALS, JSON.stringify(items));
  notifyStorageChange();
}

// ----------------------------------------------------------------------------
// PARENT COMMUNICATIONS CENTER & EDITABLE TEMPLATES HELPERS
// ----------------------------------------------------------------------------
export function getInitialEditableMessageTemplates(schoolId = '7001'): EditableMessageTemplate[] {
  const now = new Date().toISOString();
  const author = 'أمير علي عبدالشاكر بكري';
  const commonVars = [
    '{studentName}',
    '{studentNumber}',
    '{grade}',
    '{track}',
    '{section}',
    '{guardianName}',
    '{violationDescription}',
    '{incidentDate}',
    '{approvedAction}',
    '{requiredGuardianAction}',
    '{schoolName}',
    '{schoolPhone}',
    '{schoolEmail}',
  ];

  const rawList: Array<{
    id: string;
    name: string;
    category: ParentMessageType;
    body: string;
    defaultReqAction: string;
  }> = [
    {
      id: 'TPL-VIOLATION-01',
      name: 'إشعار مخالفة سلوكية رسمي لولي الأمر',
      category: 'violation_notice',
      defaultReqAction: 'التكرم بمناقشة الطالب وتوجيهه للالتزام بلائحة الانضباط السلوكي والتواصل مع المرشد الأكاديمي.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار مخالفة سلوكية*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

نود إشعاركم بتسجيل ملاحظة سلوكية تخص ابنكم الطالب:
👤 *الاسم:* {studentName} (الرقم الطلابي: {studentNumber})
🎓 *الصف:* {grade} – المسار {track} – الشعبة ({section})

📋 *تفاصيل المخالفة المرصودة:*
• *وصف المخالفة:* {violationDescription}
• *تاريخ الواقعة:* {incidentDate}
• *الإجراء التربوي المعتمد:* {approvedAction}

⚠️ *الإجراء المطلوب من ولي الأمر:*
{requiredGuardianAction}

نشكر لكم تعاونكم الدائم في تعزيز السلوك الإيجابي والانضباط المدرسي.
📞 هاتف المدرسة: {schoolPhone} | ✉️ {schoolEmail}`,
    },
    {
      id: 'TPL-SUMMON-01',
      name: 'خطاب استدعاء ولي الأمر لمقابلة المرشد الأكاديمي',
      category: 'parent_summon',
      defaultReqAction: 'التكرم بالحضور إلى مكتب الإرشاد الأكاديمي والمهني بالمدرسة أو تأكيد الموعد عبر الرد على هذه الرسالة.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *خطاب استدعاء ودعوة لولي الأمر*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

حرصاً من إدارة *{schoolName}* على مصلحة ابنكم الطالب *{studentName}* المقيد بالصف *{grade}* (المسار {track} / شعبة {section} – رقم طلابي {studentNumber})، نرجو التكرم بمراجعة المدرسة لمناقشة المستجدات التربوية والسلوكية الخاصة بالطالب.

📋 *الموضوع:* {violationDescription}
📅 *التاريخ المرجعي:* {incidentDate}
⚖️ *التوصية المعتمدة:* {approvedAction}

⚠️ *المطلوب من ولي الأمر:*
{requiredGuardianAction}

📞 للتنسيق والاستفسار: {schoolPhone} | ✉️ {schoolEmail}`,
    },
    {
      id: 'TPL-ABSENCE-01',
      name: 'إنذار غياب ومتابعة المواظبة الدراسية',
      category: 'absence',
      defaultReqAction: 'موافاة إدارة المدرسة بالعذر الرسمي المبرر للغياب خلال 3 أيام عمل ومتابعة انتظام الطالب.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار وإنذار غياب عن الدوام المدرسي*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

نحيطكم علماً بغياب ابنكم الطالب *{studentName}* (رقم: {studentNumber}) بالصف *{grade}* – المسار {track} – الشعبة ({section}) بتاريخ *{incidentDate}*.

📋 *بيان الحالة:* {violationDescription}
⚖️ *الإجراء المدرسي:* {approvedAction}

⚠️ *الإجراء المطلوب من ولي الأمر:*
{requiredGuardianAction}

📞 للتواصل مع شؤون الطلبة: {schoolPhone}`,
    },
    {
      id: 'TPL-TARDINESS-01',
      name: 'تنبيه التأخر الصباحي عن الطابور والحصة الأولى',
      category: 'morning_tardiness',
      defaultReqAction: 'حث الطالب على الحضور المبكر قبل إغلاق البوابة المدرسية الساعة 07:45 صباحاً.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *تنبيه التأخر الصباحي*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

نود إشعاركم بتأخر ابنكم الطالب *{studentName}* (الصف {grade} / شعبة {section}) عن الطابور الصباحي بتاريخ *{incidentDate}*.

📋 *التفاصيل:* {violationDescription}
⚖️ *الإجراء المتخذ:* {approvedAction}

⚠️ *المطلوب من ولي الأمر:*
{requiredGuardianAction}

📞 هاتف المدرسة: {schoolPhone}`,
    },
    {
      id: 'TPL-PHONE-CONF-01',
      name: 'إشعار مصادرة هاتف متحرك (نموذج 24)',
      category: 'phone_confiscation',
      defaultReqAction: 'حضور ولي الأمر شخصياً لاستلام الجهاز بعد انتهاء المدة المقررة والتوقيع على تعهد عدم التكرار.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار التحفظ على جهاز هاتف متحرك*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

عملاً بلائحة إدارة سلوك الطلبة، تم التحفظ على الهاتف المتحرك الخاص بابنكم الطالب *{studentName}* بالصف *{grade}* (شعبة {section}) بتاريخ *{incidentDate}*.

📋 *سبب المصادرة:* {violationDescription}
⚖️ *الإجراء المعتمد:* {approvedAction}

⚠️ *إجراء الاستلام المطلوب:*
{requiredGuardianAction}

📞 هاتف المدرسة: {schoolPhone}`,
    },
    {
      id: 'TPL-PHONE-RET-01',
      name: 'إشعار تسليم وإعادة هاتف متحرك لولي الأمر (نموذج 25)',
      category: 'phone_return',
      defaultReqAction: 'التأكيد على الطالب بعدم إحضار الهاتف مستقبلاً التزاماً بالضوابط المدرسية.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار إعادة وتسليم هاتف متحرك*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

نفيدكم بأنه تم بتاريخ *{incidentDate}* توثيق إجراءات تسليم الهاتف المتحرك الخاص بالطالب *{studentName}* (الصف {grade} / شعبة {section}).

📋 *البيان:* {violationDescription}
⚠️ *التوصية:* {requiredGuardianAction}

📞 هاتف المدرسة: {schoolPhone}`,
    },
    {
      id: 'TPL-COMMITTEE-01',
      name: 'إشعار قرار صادر عن لجنة إدارة السلوك',
      category: 'committee_action',
      defaultReqAction: 'مراجعة إدارة المدرسة لاستلام نسخة القرار الرسمي ومتابعة تنفيذ خطة تعديل السلوك المعتمدة.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار رسمي صادر عن لجنة إدارة السلوك*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

بناءً على اجتماع لجنة إدارة السلوك بتاريخ *{incidentDate}* بخصوص الطالب *{studentName}* المقيد بالصف *{grade}* (المسار {track} / شعبة {section} – رقم {studentNumber}):

📋 *موضوع العرض على اللجنة:* {violationDescription}
⚖️ *قرار اللجنة المعتمد:* {approvedAction}

⚠️ *المطلوب من ولي الأمر:*
{requiredGuardianAction}

📞 هاتف المدرسة: {schoolPhone} | ✉️ {schoolEmail}`,
    },
    {
      id: 'TPL-MEETING-01',
      name: 'تذكير بموعد اجتماع ومقابلة إرشادية',
      category: 'meeting_reminder',
      defaultReqAction: 'تأكيد الحضور في الموعد المحدد مع إحضار بطاقة الهوية الإماراتية للدخول المدرسي.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *تذكير بموعد اجتماع مع المرشد الأكاديمي*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

نود تذكيركم بموعد اللقاء الإرشادي المجدول بخصوص ابنكم الطالب *{studentName}* (الصف {grade} / شعبة {section}) بتاريخ *{incidentDate}*.

📋 *محور اللقاء:* {violationDescription}
⚠️ *ملاحظة هامة:* {requiredGuardianAction}

📞 للتواصل: {schoolPhone}`,
    },
    {
      id: 'TPL-UNIFORM-01',
      name: 'إشعار عدم الالتزام بالزي المدرسي والمظهر العام',
      category: 'uniform_noncompliance',
      defaultReqAction: 'التأكد من التزام الطالب بالزي المدرسي الرسمي الكامل يومياً قبل مغادرة المنزل.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار الالتزام بالزي المدرسي والمظهر العام*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

لوحظ بتاريخ *{incidentDate}* عدم التزام ابنكم الطالب *{studentName}* (الصف {grade} / شعبة {section}) بضوابط الزي المدرسي الرسمي:
📋 *الملاحظة:* {violationDescription}
⚖️ *الإجراء:* {approvedAction}

⚠️ *المطلوب من ولي الأمر:*
{requiredGuardianAction}

📞 هاتف المدرسة: {schoolPhone}`,
    },
    {
      id: 'TPL-POSITIVE-01',
      name: 'رسالة شكر وتعزيز سلوكي وأكاديمي إيجابي',
      category: 'positive_reinforcement',
      defaultReqAction: 'نبارك لكم هذا التميز ونأمل استمرار تشجيع الطالب وتحفيزه.',
      body: `🏫 *{schoolName}*
─────────────────────
🌟 *رسالة شكر وتقدير وتعزيز إيجابي*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

يسر إدارة *{schoolName}* ومكتب الإرشاد الأكاديمي والمهني أن يتقدموا لكم بخالص الشكر والتقدير لتميز ابنكم الطالب *{studentName}* بالصف *{grade}* (المسار {track} / شعبة {section}).

✨ *مجال التميز والإشادة:* {violationDescription}
📅 *التاريخ:* {incidentDate}
🏅 *التكريم والتعزيز:* {approvedAction}

💬 {requiredGuardianAction}

📞 {schoolPhone} | ✉️ {schoolEmail}`,
    },
    {
      id: 'TPL-GENERAL-01',
      name: 'رسالة عامة قابلة للتخصيص لأولياء الأمور',
      category: 'custom_message',
      defaultReqAction: 'التكرم بالاطلاع والتعاون مع إدارة المدرسة لما فيه مصلحة الطالب.',
      body: `🏫 *{schoolName}*
─────────────────────
📌 *إشعار من مكتب الإرشاد الأكاديمي والمهني*

المكرم ولي أمر الطالب: *{guardianName}* المحترم،
السلام عليكم ورحمة الله وبركاته،،

نود التواصل معكم بخصوص ابنكم الطالب *{studentName}* المقيد بالصف *{grade}* (المسار {track} / شعبة {section} – رقم طلابي {studentNumber}):

📋 *الموضوع:* {violationDescription}
📅 *التاريخ:* {incidentDate}

⚠️ *المطلوب:*
{requiredGuardianAction}

وتفضلوا بقبول فائق الاحترام والتقدير،،
📞 {schoolPhone} | ✉️ {schoolEmail}`,
    },
  ];

  return rawList.map((item) => ({
    templateId: item.id,
    schoolId,
    templateName: item.name,
    category: item.category,
    body: item.body,
    requiredGuardianActionDefault: item.defaultReqAction,
    variables: commonVars,
    isDefault: true,
    isActive: true,
    isArchived: false,
    version: 1,
    createdBy: author,
    updatedBy: author,
    createdAt: now,
    updatedAt: now,
    history: [
      {
        version: 1,
        templateName: item.name,
        category: item.category,
        body: item.body,
        requiredGuardianActionDefault: item.defaultReqAction,
        updatedBy: author,
        updatedAt: now,
        changeNote: 'الإصدار التأسيسي المعتمد للقالب',
      },
    ],
  }));
}

export function getEditableTemplatesLocal(schoolId = '7001'): EditableMessageTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EDITABLE_TEMPLATES);
    if (!raw) {
      const initial = getInitialEditableMessageTemplates(schoolId);
      localStorage.setItem(STORAGE_KEYS.EDITABLE_TEMPLATES, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initial = getInitialEditableMessageTemplates(schoolId);
    localStorage.setItem(STORAGE_KEYS.EDITABLE_TEMPLATES, JSON.stringify(initial));
    return initial;
  } catch {
    return getInitialEditableMessageTemplates(schoolId);
  }
}

export function saveEditableTemplatesLocal(templates: EditableMessageTemplate[]): void {
  localStorage.setItem(STORAGE_KEYS.EDITABLE_TEMPLATES, JSON.stringify(templates));
  notifyStorageChange();
}

export function getParentCampaignsLocal(): ParentMessageCampaign[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARENT_CAMPAIGNS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setParentCampaignsLocal(campaigns: ParentMessageCampaign[]): void {
  localStorage.setItem(STORAGE_KEYS.PARENT_CAMPAIGNS, JSON.stringify(campaigns));
  notifyStorageChange();
}

export function saveParentCampaignLocal(campaign: ParentMessageCampaign): ParentMessageCampaign[] {
  const current = getParentCampaignsLocal();
  const exists = current.some((c) => c.campaignId === campaign.campaignId);
  const updated = exists
    ? current.map((c) => (c.campaignId === campaign.campaignId ? campaign : c))
    : [campaign, ...current];
  setParentCampaignsLocal(updated);
  return updated;
}

export function getActiveParentCampaignIdLocal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PARENT_CAMPAIGN_ID);
  } catch {
    return null;
  }
}

export function setActiveParentCampaignIdLocal(campaignId: string | null): void {
  try {
    if (campaignId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PARENT_CAMPAIGN_ID, campaignId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_PARENT_CAMPAIGN_ID);
    }
  } catch {}
}

export function getStudentParentMessagesLocal(studentId: string): ParentMessageItem[] {
  const campaigns = getParentCampaignsLocal();
  const list: ParentMessageItem[] = [];
  for (const camp of campaigns) {
    if (Array.isArray(camp.items)) {
      for (const item of camp.items) {
        if (item.studentId === studentId || item.studentNumber === studentId) {
          list.push(item);
        }
      }
    }
  }
  return list.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
}

// ============================================================================
// INTERNAL COUNSELOR NOTIFICATION SYSTEM (Temporary Local Storage & Acknowledgment)
// ============================================================================

export const COUNSELOR_NOTIFICATION_EVENT = 'alkhalil_counselor_notifications_updated';

function dispatchNotificationEvent() {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new Event(COUNSELOR_NOTIFICATION_EVENT));
    }, 0);
  }
}

export function getAcknowledgedNotificationKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COUNSELOR_ACKNOWLEDGED_KEYS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAcknowledgedNotificationKeys(keys: string[]): void {
  try {
    // Keep most recent 500 keys to prevent unbounded growth
    const trimmed = Array.from(new Set(keys)).slice(-500);
    localStorage.setItem(STORAGE_KEYS.COUNSELOR_ACKNOWLEDGED_KEYS, JSON.stringify(trimmed));
  } catch {}
}

export function getCounselorNotifications(): CounselorNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COUNSELOR_NOTIFICATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  } catch {
    return [];
  }
}

export function saveCounselorNotifications(notifications: CounselorNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COUNSELOR_NOTIFICATIONS, JSON.stringify(notifications));
    dispatchNotificationEvent();
  } catch {}
}

export function addCounselorNotification(
  input: Omit<CounselorNotification, 'id' | 'createdAt' | 'timestamp'> & {
    id?: string;
    bypassAcknowledgeCheck?: boolean;
  }
): CounselorNotification | null {
  const existing = getCounselorNotifications();
  const ackKeys = new Set(getAcknowledgedNotificationKeys());

  if (input.dedupeKey && !input.bypassAcknowledgeCheck && ackKeys.has(input.dedupeKey)) {
    return null;
  }

  // If an explicit user action re-triggers an event with bypassAcknowledgeCheck, remove it from ackKeys
  if (input.dedupeKey && input.bypassAcknowledgeCheck && ackKeys.has(input.dedupeKey)) {
    ackKeys.delete(input.dedupeKey);
    saveAcknowledgedNotificationKeys(Array.from(ackKeys));
  }

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const existingIdx = input.dedupeKey
    ? existing.findIndex((n) => n.dedupeKey === input.dedupeKey)
    : -1;

  const newNotification: CounselorNotification = {
    id:
      existingIdx !== -1
        ? existing[existingIdx].id
        : input.id || `notif-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
    dedupeKey: input.dedupeKey,
    type: input.type,
    title: input.title,
    message: input.message,
    studentId: input.studentId,
    studentName: input.studentName,
    studentNumber: input.studentNumber,
    gradeSection: input.gradeSection,
    formId: input.formId,
    formTab: input.formTab,
    violationId: input.violationId,
    targetTab: input.targetTab,
    createdAt: nowIso,
    timestamp: nowMs,
    isUrgent: input.isUrgent,
  };

  let updated: CounselorNotification[];
  if (existingIdx !== -1) {
    updated = [...existing];
    updated[existingIdx] = newNotification;
  } else {
    updated = [newNotification, ...existing];
  }

  saveCounselorNotifications(updated);
  return newNotification;
}

/**
 * Clears a single notification from Local Storage once acknowledged by the counselor.
 */
export function acknowledgeCounselorNotification(notificationId: string): void {
  const existing = getCounselorNotifications();
  const target = existing.find((n) => n.id === notificationId);
  if (target?.dedupeKey) {
    const ackKeys = getAcknowledgedNotificationKeys();
    saveAcknowledgedNotificationKeys([...ackKeys, target.dedupeKey]);
  }
  const remaining = existing.filter((n) => n.id !== notificationId);
  saveCounselorNotifications(remaining);
}

/**
 * Clears all active counselor notifications from Local Storage once acknowledged.
 */
export function acknowledgeAllCounselorNotifications(): void {
  const existing = getCounselorNotifications();
  const dedupeKeys = existing.map((n) => n.dedupeKey).filter(Boolean) as string[];
  if (dedupeKeys.length > 0) {
    const ackKeys = getAcknowledgedNotificationKeys();
    saveAcknowledgedNotificationKeys([...ackKeys, ...dedupeKeys]);
  }
  localStorage.removeItem(STORAGE_KEYS.COUNSELOR_NOTIFICATIONS);
  dispatchNotificationEvent();
}

/**
 * Triggers a notification when a 'Linear Warning Form' (نموذج التنبيه الخطي - نموذج 9)
 * is saved as a draft or marked for approval.
 */
export function notifyLinearWarningFormSaved(form: WarningFormRecord): CounselorNotification | null {
  const isDraft = form.status === 'مسودة';
  const type: CounselorNotificationType = isDraft ? 'warning_form_draft' : 'warning_form_approval';
  const title = isDraft
    ? `مسودة نموذج تنبيه خطي – ${form.studentName}`
    : `اعتماد نموذج التنبيه الخطي – ${form.studentName}`;
  const message = isDraft
    ? `تم حفظ نموذج التنبيه الخطي (نموذج 9) كمسودة للطالب ${form.studentName} (${form.grade}/${form.section}) بانتظار استكمال التوقيع والاعتماد.`
    : `تم حفظ نموذج التنبيه الخطي (نموذج 9) بحالة «${form.status}» للطالب ${form.studentName} (${form.grade}/${form.section}).`;

  return addCounselorNotification({
    dedupeKey: `linear-warning-form-${form.id}-${form.status}`,
    bypassAcknowledgeCheck: true,
    type,
    title,
    message,
    studentId: form.studentId,
    studentName: form.studentName,
    studentNumber: form.studentNumber,
    gradeSection: `الصف ${form.grade} / ${form.section}`,
    formId: form.id,
    formTab: 'model9-warning',
    targetTab: 'warning-form',
    isUrgent: !isDraft && !form.studentSignature,
  });
}

/**
 * Triggers a notification when a Parent Notice / Written Warning (نموذج 7 - تنبيه خطي لولي الأمر)
 * is saved as a draft or marked for signature/approval.
 */
export function notifyParentWrittenNoticeSaved(form: ParentNoticeFormRecord): CounselorNotification | null {
  const isDraft = form.status === 'مسودة';
  const type: CounselorNotificationType = isDraft ? 'warning_form_draft' : 'warning_form_approval';
  const title = isDraft
    ? `مسودة ${form.noticeType} (نموذج 7) – ${form.studentName}`
    : `${form.status === 'بانتظار التوقيع' ? 'طلب اعتماد وتوقيع' : 'اعتماد'} ${form.noticeType} – ${form.studentName}`;
  const message = isDraft
    ? `تم حفظ ${form.noticeType} (نموذج 7) كمسودة للطالب ${form.studentName} (${form.grade}/${form.section}).`
    : `تم تحديث حالة ${form.noticeType} (نموذج 7) إلى «${form.status}» للطالب ${form.studentName} (${form.grade}/${form.section}).`;

  return addCounselorNotification({
    dedupeKey: `parent-written-notice-${form.id}-${form.status}`,
    bypassAcknowledgeCheck: true,
    type,
    title,
    message,
    studentId: form.studentId,
    studentName: form.studentName,
    studentNumber: form.studentNumber,
    gradeSection: `الصف ${form.grade} / ${form.section}`,
    formId: form.id,
    formTab: 'model7-notice',
    targetTab: 'forms',
    isUrgent: form.status === 'بانتظار التوقيع',
  });
}

/**
 * Triggers a notification when a new behavioral infraction (ViolationRecord) is logged.
 */
export function notifyInfractionLogged(violation: ViolationRecord): CounselorNotification | null {
  const isHighSeverity =
    violation.violationDegree?.includes('الثالثة') ||
    violation.violationDegree?.includes('الرابعة');

  return addCounselorNotification({
    dedupeKey: `infraction-${violation.id}`,
    bypassAcknowledgeCheck: true,
    type: 'new_infraction',
    title: `مخالفة سلوكية جديدة – ${violation.studentName}`,
    message: `تم رصد مخالفة «${violation.violationType}» (${violation.violationDegree}) للطالب ${violation.studentName}. الإجراء المقترح: ${violation.suggestedAction || 'متابعة المرشد'}.`,
    studentId: violation.studentId,
    studentName: violation.studentName,
    studentNumber: violation.studentNumber,
    gradeSection: `الصف ${violation.grade} / ${violation.section}`,
    violationId: violation.id,
    formTab: 'model6-violation',
    targetTab: 'violations',
    isUrgent: Boolean(isHighSeverity),
  });
}

/**
 * Evaluates student records, open infractions, unsigned warning forms, attendance thresholds,
 * and scheduled counseling follow-ups to generate temporary Local Storage notifications
 * for due follow-ups that haven't been acknowledged yet.
 */
export function syncStudentFollowUpNotifications(
  paramsOrStudents:
    | {
        students: Student[];
        violations: ViolationRecord[];
        warningForms: WarningFormRecord[];
        tardinessRecords?: TardinessRecord[];
        absences?: AbsenceRecord[];
      }
    | Student[],
  violationsArg?: ViolationRecord[],
  warningFormsArg?: WarningFormRecord[],
  _tardinessRecordsArg?: TardinessRecord[],
  _absencesArg?: AbsenceRecord[]
): CounselorNotification[] {
  const students = Array.isArray(paramsOrStudents)
    ? paramsOrStudents
    : paramsOrStudents?.students || [];
  const violations = Array.isArray(paramsOrStudents)
    ? violationsArg || []
    : paramsOrStudents?.violations || [];
  const warningForms = Array.isArray(paramsOrStudents)
    ? warningFormsArg || []
    : paramsOrStudents?.warningForms || [];
  if (!students || students.length === 0) return getCounselorNotifications();

  const existing = getCounselorNotifications();
  const existingKeys = new Set(existing.map((n) => n.dedupeKey).filter(Boolean));
  const ackKeys = new Set(getAcknowledgedNotificationKeys());
  const today = getUaeTodayDateString();

  const newlyAdded: CounselorNotification[] = [];

  const queueFollowUp = (item: Omit<CounselorNotification, 'id' | 'createdAt' | 'timestamp'>) => {
    if (!item.dedupeKey) return;
    if (existingKeys.has(item.dedupeKey) || ackKeys.has(item.dedupeKey)) return;
    existingKeys.add(item.dedupeKey);
    newlyAdded.push({
      ...item,
      id: `notif-fu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      timestamp: Date.now() - newlyAdded.length * 1000,
    });
  };

  // 1. Unsigned or Draft Linear Warning Forms requiring follow-up
  for (const wf of warningForms.slice(0, 10)) {
    if (wf.status === 'مسودة' || !wf.studentSignature) {
      const isDraft = wf.status === 'مسودة';
      queueFollowUp({
        dedupeKey: `followup-warnform-${wf.id}-${wf.status}-${Boolean(wf.studentSignature)}`,
        type: isDraft ? 'warning_form_draft' : 'follow_up_due',
        title: isDraft
          ? `متابعة مسودة تنبيه خطي – ${wf.studentName}`
          : `متابعة استكمال توقيع التنبيه الخطي – ${wf.studentName}`,
        message: isDraft
          ? `نموذج التنبيه الخطي (نموذج 9) للطالب ${wf.studentName} محفوظ كمسودة منذ ${wf.formDate} ويحتاج للاعتماد.`
          : `نموذج التنبيه الخطي (نموذج 9) للطالب ${wf.studentName} بانتظار توقيع الطالب لإغلاق الإجراء.`,
        studentId: wf.studentId,
        studentName: wf.studentName,
        studentNumber: wf.studentNumber,
        gradeSection: `الصف ${wf.grade} / ${wf.section}`,
        formId: wf.id,
        formTab: 'model9-warning',
        targetTab: 'warning-form',
        isUrgent: true,
      });
    }
  }

  // 2. Open behavioral infractions requiring counselor follow-up
  const openViolations = violations.filter(
    (v) => v.status !== 'مغلقة' && v.status !== 'تم الحفظ في ملف الطالب'
  );
  for (const v of openViolations.slice(0, 8)) {
    const isUrgent =
      v.violationDegree?.includes('الثالثة') || v.violationDegree?.includes('الرابعة');
    queueFollowUp({
      dedupeKey: `followup-violation-${v.id}-${v.status}`,
      type: 'follow_up_due',
      title: `متابعة مخالفة مفتوحة – ${v.studentName}`,
      message: `تستحق متابعة سلوكية للطالب ${v.studentName} بشأن مخالفة «${v.violationType}» (الحالة الحالية: ${v.status}).`,
      studentId: v.studentId,
      studentName: v.studentName,
      studentNumber: v.studentNumber,
      gradeSection: `الصف ${v.grade} / ${v.section}`,
      violationId: v.id,
      formTab: 'model6-violation',
      targetTab: 'violations',
      isUrgent: Boolean(isUrgent),
    });
  }

  // 3. Students flagged in their record for behavioral follow-up or repeated tardiness/absence
  for (const s of students) {
    if (
      s.status === 'متابع سلوكيًا' ||
      s.status === 'إنذار أول' ||
      s.status === 'في غرفة الإرشاد'
    ) {
      queueFollowUp({
        dedupeKey: `followup-student-status-${s.id}-${s.status}`,
        type: 'follow_up_due',
        title: `متابعة دورية مستحقة (${s.status}) – ${s.fullName}`,
        message: `الطالب ${s.fullName} مصنف في السجل بحالة «${s.status}» (مخالفات: ${s.totalViolations || 0}، تأخير: ${s.totalTardiness || 0}) ويستحق جلسة متابعة إرشادية.`,
        studentId: s.id,
        studentName: s.fullName,
        studentNumber: s.studentNumber,
        gradeSection: `الصف ${s.grade} / ${s.section}`,
        targetTab: 'cases',
        isUrgent: s.status === 'إنذار أول' || s.status === 'في غرفة الإرشاد',
      });
    } else if ((s.totalTardiness || 0) >= 3) {
      queueFollowUp({
        dedupeKey: `followup-student-tardiness-${s.id}-${s.totalTardiness}`,
        type: 'follow_up_due',
        title: `متابعة تأخير صباحي متكرر (${s.totalTardiness} مرات) – ${s.fullName}`,
        message: `تجاوز الطالب ${s.fullName} حد التأخير الصباحي (${s.totalTardiness} مرات) ويستوجب تحرير تنبيه خطي أو تعهد حضور.`,
        studentId: s.id,
        studentName: s.fullName,
        studentNumber: s.studentNumber,
        gradeSection: `الصف ${s.grade} / ${s.section}`,
        formTab: 'model9-warning',
        targetTab: 'warning-form',
        isUrgent: (s.totalTardiness || 0) >= 5,
      });
    } else if ((s.totalAbsences || 0) >= 3) {
      queueFollowUp({
        dedupeKey: `followup-student-absence-${s.id}-${s.totalAbsences}`,
        type: 'follow_up_due',
        title: `متابعة غياب متكرر (${s.totalAbsences} أيام) – ${s.fullName}`,
        message: `سجل الطالب ${s.fullName} يظهر ${s.totalAbsences} أيام غياب ويستدعي متابعة ولي الأمر وتوثيق الإجراء.`,
        studentId: s.id,
        studentName: s.fullName,
        studentNumber: s.studentNumber,
        gradeSection: `الصف ${s.grade} / ${s.section}`,
        targetTab: 'absences',
        isUrgent: (s.totalAbsences || 0) >= 5,
      });
    }
  }

  // 4. Check Counselor Tasks & Counseling Sessions with due follow-up dates
  try {
    const rawTasks = localStorage.getItem(STORAGE_KEYS.COUNSELOR_TASKS);
    if (rawTasks) {
      const tasks: CounselorTaskRecord[] = JSON.parse(rawTasks);
      if (Array.isArray(tasks)) {
        for (const task of tasks) {
          if (task.status !== 'completed' && task.dueDate && task.dueDate <= today && task.studentId) {
            queueFollowUp({
              dedupeKey: `followup-task-${task.id}-${task.dueDate}`,
              type: 'follow_up_due',
              title: `موعد متابعة مستحق اليوم – ${task.studentName || 'طالب'}`,
              message: `مهمة متابعة مستحقة (${task.title}) للطالب ${task.studentName || ''} بتاريخ ${task.dueDate}.`,
              studentId: task.studentId,
              studentName: task.studentName,
              studentNumber: task.studentNumber,
              gradeSection: task.grade ? `الصف ${task.grade} / ${task.section || ''}` : undefined,
              targetTab: 'cases',
              isUrgent: task.priority === 'urgent' || task.priority === 'high',
            });
          }
        }
      }
    }
  } catch {}

  if (newlyAdded.length > 0) {
    const combined = [...newlyAdded, ...existing].slice(0, 40);
    saveCounselorNotifications(combined);
    return combined;
  }

  return existing;
}


