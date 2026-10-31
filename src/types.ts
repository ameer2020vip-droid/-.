export type GradeLevel =
  | 'أول'
  | 'ثاني'
  | 'ثالث'
  | 'رابع'
  | 'خامس'
  | 'سادس'
  | 'سابع'
  | 'ثامن'
  | 'تاسع'
  | 'عاشر'
  | 'حادي عشر'
  | 'ثاني عشر'
  | 'غير محدد'
  | (string & {});
export type SectionName = string;
export type AcademicTrack = 'عام' | 'متقدم' | 'نخبة' | 'تطبيقي' | 'بدون مسار' | 'يحتاج مراجعة' | (string & {});

export interface TrackAuditLog {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  oldTrack: AcademicTrack;
  newTrack: AcademicTrack;
  reason?: string;
  changedBy: string;
  timestamp: string; // ISO string
}

export interface StudentContact {
  id: string;
  name: string;
  relation: string; // 'الأب' | 'الأم' | 'ولي الأمر الأساسي' | 'ولي أمر بديل' | 'الطالب' | 'جهة اتصال للطوارئ' | 'أخرى'
  phone: string;
  phoneE164: string; // E.164 format: e.g. +971501234567
  email?: string;
  isPrimary: boolean;
  hasWhatsApp: boolean;
  whatsappConsent: boolean;
  emailConsent: boolean;
  isVerified: boolean;
  source: string; // 'almanhal' | 'manual' | 'legacy'
  updatedAt: string;
}

export interface Student {
  id: string;
  studentNumber: string; // الرقم الطلابي
  fullName: string;
  grade: GradeLevel;
  section: SectionName;
  track: AcademicTrack;
  rawGrade?: string;
  rawSection?: string;
  rawTrack?: string;
  hasMissingGradeOrSection?: boolean;
  status: 'منتظم' | 'متابع سلوكيًا' | 'في غرفة الإرشاد' | 'إنذار أول';
  nationalId?: string;
  parentName: string;
  parentPhone: string;
  parentRelation: string;
  totalTardiness: number;
  totalViolations: number;
  totalAbsences?: number;
  enrollmentDate?: string;
  contacts?: StudentContact[];
  gender?: 'بنين' | 'بنات' | 'ذكر' | 'أنثى';
  studentPhone?: string;
  fatherPhone?: string;
  motherPhone?: string;
  guardianPhone?: string;
  alternatePhone?: string;
  emergencyPhone?: string;
  email?: string;
  guardianEmail?: string;
  birthDate?: string;
  birthPlace?: string;
  age?: number | string;
  nationality?: string;
  citizenshipStatus?: string;
  country?: string;
  emirate?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
  streetName?: string;
  latitude?: number | string;
  longitude?: number | string;
  isDeterminedPerson?: boolean;
  determinedCategory?: string;
  transportType?: string;
  religion?: string;
  enrollmentType?: string;
  parentsStatus?: string;
  // Al Manhal fields & import tracking
  schoolId?: string;
  nameEn?: string;
  schoolNameAr?: string;
  schoolNameEn?: string;
  schoolEmirate?: string;
  council?: string;
  schoolComplex?: string;
  sector?: string;
  importBatchId?: string;
  importBatchDate?: string;
}

export interface ImportBatchInfo {
  batchId: string;
  importedAt: string;
  studentCount: number;
  schoolId?: string;
  sampleStudents?: string[];
}

export type AbsenceStatus = 'غائب' | 'غياب بدون عذر' | 'غياب بعذر' | 'مستأذن';
export type AbsenceExcuseStatus = 'بعذر' | 'بدون عذر' | 'قيد المراجعة';

export interface AbsenceRecord {
  id: string;
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  track: AcademicTrack;
  date: string; // YYYY-MM-DD
  status: AbsenceStatus;
  excuseStatus: AbsenceExcuseStatus;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TardinessSuggestedAction = 
  | 'تنبيه شفهي'
  | 'تعهد طالب'
  | 'متابعة المرشد والتواصل مع ولي الأمر';

export interface TardinessRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  track: AcademicTrack;
  date: string; // YYYY-MM-DD
  time: string; // hh:mm a UAE time
  timestamp: number;
  createdAt?: string;
  reason?: string;
  counselorNotes?: string;
  previousTardinessCount: number;
  suggestedAction: TardinessSuggestedAction;
  counselorDecision?: string;
  recordedBy: string;
  schoolId?: string;
  linkedFormId?: string;
  linkedFormType?: 'warning_form' | 'parent_summon' | 'parent_commitment' | 'attendance_commitment' | string;
  followUpStatus?:
    | 'none'
    | 'commitment_required'
    | 'pending_student_signature'
    | 'student_signed'
    | 'pending_parent_signature'
    | 'parent_signed'
    | 'completed'
    | string;
  isStudentSigned?: boolean;
  studentSignatureDate?: string;
  isParentSigned?: boolean;
  parentSignatureDate?: string;
}

export type ViolationDegree = 
  | 'الدرجة الأولى (بسيطة)'
  | 'الدرجة الثانية (متوسطة)'
  | 'الدرجة الثالثة (جسيمة)'
  | 'الدرجة الرابعة (شديدة الخطورة)';

export type ViolationStatus = 
  | 'مسودة'
  | 'تم التنبيه'
  | 'تم توقيع الطالب'
  | 'تم توقيع ولي الأمر'
  | 'تم الحفظ في ملف الطالب'
  | 'تم رفعها على موقع الوزارة'
  | 'مغلقة';

export interface ViolationRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  violationType: string;
  violationDegree: ViolationDegree;
  incidentDateTime: string;
  incidentLocation: string;
  reportingPerson: string;
  incidentDescription: string;
  suggestedAction: string;
  counselorNotes?: string;
  status: ViolationStatus;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  originalDescription?: string; // before AI rephrase
  // Multi-violation & unified forms support (القرار الوزاري 851)
  isMultiViolationIncident?: boolean;
  violationsList?: Array<{
    code: string;
    degree: string;
    title: string;
    repetition?: string;
    deductionMarks?: number;
  }>;
  totalDeductionMarks?: number;
  linkedFormIds?: string[];
  linkedFormTypes?: string[];
  studentSignature?: string;
  studentSignatureDate?: string;
  parentSignature?: string;
  parentSignatureDate?: string;
  principalSignature?: string;
  principalSignatureDate?: string;
}

export interface WarningFormRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  emirate: string;
  council: string;
  sector: string;
  school: string;
  priorBehaviors: [string, string, string];
  studentPledge: string;
  formDate: string;
  counselorName: string;
  counselorNotes?: string;
  violationReason?: string;
  actionTaken: string;
  parentPhone: string;
  parentName: string;
  parentRelation: string;
  communicationDateTime: string;
  communicationResult: string;
  studentSignature?: string; // base64 PNG
  studentSignatureDate?: string;
  studentAttestation: boolean;
  parentSignature?: string; // base64 PNG
  parentSignatureDate?: string;
  isParentSignatureRecorded: boolean;
  status: 'مسودة' | 'تم الاعتماد والتوقيع';
  tardinessRecordId?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 8: PARENT SUMMON FORM (خطاب استدعاء ولي الأمر - ملحق 8)
// ----------------------------------------------------------------------------
export interface ParentSummonFormRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string;
  parentPhone?: string;
  parentRelation?: string;
  emirate: string;
  council: string;
  sector: string;
  school: string;
  summonDay: string; // e.g. 'الثلاثاء'
  summonDate: string; // e.g. '2026-09-16'
  summonTime?: string; // e.g. '08:30 صباحاً'
  subject: string; // موضوع الاستدعاء
  principalName: string;
  principalSignature?: string;
  principalDate: string;
  studentSignature?: string; // base64 PNG
  studentSignatureDate?: string;
  status: 'مسودة' | 'تم الاستلام والتوقيع';
  tardinessRecordId?: string;
  schoolId?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 7: PARENT WARNING / NOTICE FORM (تنبيه خطي / تحذير / إنذار إلى ولي الأمر - ملحق 7)
// ملحق (7) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة
// ----------------------------------------------------------------------------
export type ParentNoticeType =
  | 'تنبيه خطي'
  | 'تحذير'
  | 'إنذار أول'
  | 'إنذار ثاني'
  | 'إنذار نهائي';

export interface ParentNoticeFormRecord {
  id: string; // Document ID: PN-schoolId-year-sequence
  formType: 'parent_notice_form';
  formNumber: 7;
  noticeType: ParentNoticeType;
  schoolId: string;
  emirate: string; // إمارة
  operationsManagement: string; // إدارة العمليات المدرسية
  council: string; // المجلس
  sector: string; // نطاق
  schoolName: string; // مدرسة
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName?: string;
  parentPhone?: string;
  incidentDay: string; // e.g. الثلاثاء
  incidentDate: string; // e.g. 2026-09-15
  violationDetails: string; // مخالفة سلوكية تمثلت في:...
  violationId?: string; // Optional reference to ViolationRecord
  deductedMarks?: number; // درجات السلوك المحسومة إن وجدت

  // Signatures
  officerName: string; // اسم الموظف المسؤول
  officerRole?: string; // صفته
  officerSignature?: string; // base64
  officerSignatureDate?: string;

  principalName: string; // مدير المدرسة
  principalSignature?: string; // base64
  principalSignatureDate?: string;

  studentSignature?: string; // توقيع الطالب/الطالبة بالعلم
  studentSignatureDate?: string;

  parentSignature?: string; // توقيع ولي أمر الطالب/الطالبة بالعلم
  parentSignatureDate?: string;

  issueDate: string; // تحريرًا في: YYYY-MM-DD
  status: 'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم';
  isLocked?: boolean;
  historyLogs?: Array<{
    timestamp: string;
    action: string;
    userName: string;
    notes?: string;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ----------------------------------------------------------------------------
// MODEL 10: PARENT COMMITMENT ON REPEATED VIOLATIONS (تعهد ولي الأمر في حال تكرار مخالفات الطالب – ملحق 10)
// ملحق (10) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة
// ----------------------------------------------------------------------------
export interface ParentCommitmentFormRecord {
  id: string; // Document ID: PC-schoolId-year-sequence
  formType: 'parent_commitment_form';
  formNumber: 10;
  schoolId: string;
  emirate: string; // إمارة
  operationsManagement: string; // إدارة العمليات المدرسية
  council: string; // المجلس
  sector: string; // نطاق
  schoolName: string; // مدرسة
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string; // أتعهد أنا / ولي أمر الطالب
  parentPhone?: string; // الهاتف
  parentRelation?: string; // صلة القرابة

  // List of repeated violations (المخالفات الصادرة عنه والتي تمثلت في الآتي:)
  violationsList: string[]; // [1, 2, 3, ...]
  violationIds?: string[]; // Optional linked ViolationRecord ids
  subject?: string;
  formDate?: string;
  tardinessRecordId?: string;

  // Signatures & Endorsement
  parentSignature?: string; // base64 PNG
  parentSignatureDate?: string;

  vicePrincipalName: string; // يعتمد، مساعد مدير المدرسة
  vicePrincipalSignature?: string; // base64 PNG
  vicePrincipalSignatureDate?: string;

  issueDate: string; // تحريرًا في: YYYY-MM-DD
  status: 'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم';
  isLocked?: boolean;
  historyLogs?: Array<{
    timestamp: string;
    action: string;
    userName: string;
    notes?: string;
  }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ----------------------------------------------------------------------------
// MODEL 6: VIOLATION REPORT FORM (تقرير مخالفة – نموذج رقم 6)
// ملحق (6) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة
// ----------------------------------------------------------------------------
export type ViolationReportStatus =
  | 'مسودة'
  | 'جاهز للتوقيع'
  | 'تم التوقيع'
  | 'معتمد'
  | 'بانتظار المراجعة'
  | 'مرفوض'
  | 'مغلق';

export type IncidentPlaceType =
  | 'الصف'
  | 'الممر'
  | 'الساحة'
  | 'الحافلة'
  | 'المختبر'
  | 'الملعب'
  | 'خارج المدرسة أثناء نشاط رسمي'
  | 'مكان آخر';

export type ViolationReportDegree =
  | 'الأولى – بسيطة'
  | 'الثانية – متوسطة الخطورة'
  | 'الثالثة – خطيرة'
  | 'الرابعة – شديدة الخطورة';

export interface FormSignatureItem {
  name: string;
  role: string;
  date: string;
  time?: string;
  signatureImage?: string; // base64
}

export interface FormSignaturesGroup {
  student?: FormSignatureItem;
  reporter?: FormSignatureItem;
  counselor?: FormSignatureItem;
  administrator?: FormSignatureItem;
}

export interface FormAttachmentItem {
  id: string;
  name: string;
  size?: string;
  type?: string;
  dataUrl?: string; // base64 data uri or link
  uploadedAt: string;
}

export interface ViolationReportRecord {
  id: string; // Document ID / VR-schoolId-year-sequence
  reportNumber: string; // e.g. VR-schoolId-2026-0001
  formType: 'violation_report';
  formNumber: 6;
  schoolId: string;
  schoolName: string;
  emirate?: string;
  operationsManagement?: string;
  council?: string;
  sector?: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  track?: AcademicTrack;
  violationId?: string; // reference to original violation if linked
  violationCode?: string;
  violationName: string;
  violationLevel: ViolationReportDegree;
  suggestedDeduction: string;
  occurrenceCount: number;
  incidentDate: string;
  date?: string; // alias for incidentDate
  incidentTime: string;
  incidentSituation?: string; // الموقف (الحصة الدراسية، طابور الصباح، الفسحة...)
  incidentPlace: IncidentPlaceType | string;
  period: string; // الحصة الدراسية
  subject: string; // اسم المادة
  teacherName?: string; // اسم المعلم
  reportedBy: string; // اسم المعلم أو محرر المخالفة
  reporterRole?: string; // الوظيفة
  oracleNumber?: string; // رقم الأوراكل
  principalName?: string; // مدير المدرسة
  electronicSignatureInfo?: {
    reportId: string;
    signerName: string;
    signerRole: string;
    oracleNumber?: string;
    signedAt: string;
    signatureImage?: string;
    verified: boolean;
  };
  description: string; // وصف تفصيلي وموضوعي
  immediateAction: string; // الإجراء الفوري المتخذ
  studentStatement: string; // إفادة الطالب
  studentAdmitted: boolean; // هل اعترف الطالب بالواقعة؟
  witnesses: string; // أسماء الطلبة أو الموظفين الشهود
  witnessStatements: string; // إفادات الشهود
  damageOrInjury: boolean; // وجود أضرار أو إصابات
  damageOrInjuryDetails: string; // وصف الأضرار أو الإصابات
  attachments: FormAttachmentItem[];
  counselorNotes: string; // ملاحظات المرشد
  signatures: FormSignaturesGroup;
  studentSignature?: string; // توقيع الطالب (base64)
  studentSignatureDate?: string;
  status: ViolationReportStatus;
  academicYear: string;
  term: string;
  isLocked?: boolean; // locked from direct editing once approved
  isCorrectionVersion?: boolean; // true if created as a corrected version of an approved report
  originalReportId?: string; // ID of the original report if this is a corrected version
  historyLogs?: Array<{
    timestamp: string;
    action: string;
    userName: string;
    notes?: string;
  }>;
  actionTaken?: string;
  degree?: string;
  violationCategory?: string;
  guardianSignature?: string;
  guardianSignatureDate?: string;
  principalSignature?: string;
  principalSignatureDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export type TimelineEventType = 
  | 'tardiness' 
  | 'absence'
  | 'violation' 
  | 'warning' 
  | 'violation_report'
  | 'parent_notice'
  | 'parent_summon'
  | 'parent_commitment'
  | 'temporary_suspension'
  | 'attendance_commitment'
  | 'authorized_pickup'
  | 'signature' 
  | 'action';

export interface TimelineEvent {
  id: string;
  studentId: string;
  type: TimelineEventType;
  title: string;
  description: string;
  date: string;
  time?: string; // Real documented time only (e.g. '07:45 ص')
  hasRealTime?: boolean; // False if whole-day or time not documented; hides clock display
  timestamp: number;
  sortPriority?: number; // Technical deterministic tie-breaker for same date
  recordedBy: string;
  badgeText: string;
  badgeColor: string;
  referenceId?: string;

  // Form & Signatures Tracking (Audit requirement)
  formId?: string;
  formType?: string;
  formNumber?: number | string;
  formName?: string;
  meetingNumber?: string; // رقم اجتماع لجنة إدارة السلوك (يدوي)
  suspensionDaysCount?: number; // مدة الإيقاف بالأيام
  studentSigned?: boolean;
  studentSignedDate?: string;
  parentSigned?: boolean;
  parentSignedDate?: string;
  approvalStatus?: string;
  signatureStatusText?: string; // '✓ تم التوقيع' | '⏳ بانتظار توقيع الطالب' | '⏳ بانتظار توقيع ولي الأمر' | '✓ مكتمل' | 'مسودة'
  signatureBadgeClass?: string;

  // Originating Cross-references
  tardinessRecordId?: string;
  violationId?: string;
  absenceId?: string;

  // Schema Readiness for Phase 2: Follow-ups and Tasks Center
  needsFollowUp?: boolean;
  followUpAssignee?: string;
  followUpDate?: string;
  followUpStatus?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  followUpNotes?: string;
}

export type UserRole =
  | 'system_owner'
  | 'systemAdmin'
  | 'school_admin'
  | 'schoolAdmin'
  | 'academic_advisor'
  | 'student_affairs'
  | 'counselor'
  | 'teacher'
  | 'viewer';

export function isSystemOwner(role?: string | null): boolean {
  if (!role) return false;
  return role === 'system_owner' || role === 'systemAdmin';
}

export function isSchoolAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role === 'school_admin' || role === 'schoolAdmin' || isSystemOwner(role);
}

export interface AppUser {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  schoolId: string;
  jobTitle: string;
  active: boolean;
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
  photoURL?: string;
  phone?: string;
  displayName?: string;
  name?: string;
  id?: string;
  expirationDate?: string;
}

export interface SchoolRecord {
  schoolId: string;
  schoolNameAr: string;
  academicYear: string;
  active: boolean;
  createdAt: string;
}

export type RequestedJobTitle =
  | 'schoolPrincipal'
  | 'studentAffairsDeputy'
  | 'careerCounselor'
  | 'socialWorker';

export type SchoolGender = 'boys' | 'girls' | 'mixed';
export type EducationCycle = 'cycle1' | 'cycle2' | 'cycle3';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'needs_info';
export type SchoolSubscriptionStatus = 'active' | 'trial' | 'expired' | 'permanent';
export type SchoolStatus = 'active' | 'pending' | 'suspended' | 'archived';

export interface RegistrationRequest {
  id: string; // uid
  uid: string;
  email: string;
  phone?: string;
  displayName?: string;
  fullNameArabic: string;
  schoolId: string; // matches schoolNumber
  schoolNumber: string; // الرقم الوزاري للمدرسة
  schoolNameArabic: string;
  schoolNameEnglish?: string;
  emirate: string;
  region?: string;
  requestedJobTitle: RequestedJobTitle;
  jobTitleArabic: string;
  schoolGender: SchoolGender;
  educationCycles: EducationCycle[];
  requestedRole: UserRole;
  requestType: 'joinExistingSchool' | 'createNewSchool';
  status: RegistrationStatus;
  rejectionReason?: string | null;
  infoRequestNote?: string | null;
  expirationDate?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  photoURL?: string;
}

export interface SchoolSettings {
  schoolId: string;
  schoolName: string;
  schoolNameEn?: string;
  schoolNumber: string;
  schoolLogo?: string;
  emirate: string;
  schoolCycle: string;
  schoolGender: 'بنين' | 'بنات' | 'مشترك';
  academicYear: string;
  currentTerm: string;
  phone: string;
  email: string;
  address: string;
  principalName: string;
  vicePrincipalName?: string;
  counselorName?: string;
  status?: string;

  // Schedule & Timing Settings
  morningAssemblyTime?: string;
  gateClosingTime?: string;
  regularDismissalTime?: string;
  fridayDismissalTime?: string;
  dailyPeriodsCount?: number;

  // Attendance & Behavioral Rules Thresholds
  tardinessNoticeThreshold?: number;
  tardinessPledgeThreshold?: number;
  tardinessCommitteeThreshold?: number;
  absenceWarning1Threshold?: number;
  absenceWarning2Threshold?: number;
  absenceFinalThreshold?: number;
  autoAlertsEnabled?: boolean;

  // Messaging & WhatsApp Notifications
  whatsappEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  defaultTardinessMessageTemplate?: string;
  defaultAbsenceMessageTemplate?: string;
  defaultMeetingInvitationTemplate?: string;

  // Official Forms & PDF Printing Defaults
  officialHeaderEnabled?: boolean;
  defaultApproverRole?: string;
  includeStampPlaceholder?: boolean;

  // System & Interface Preferences
  interfaceFont?: 'Cairo' | 'Tajawal';
  compactTables?: boolean;
}

export interface DetailedSchool {
  schoolId: string;
  schoolNumber: string; // الرقم الوزاري
  schoolNameArabic: string;
  schoolNameEnglish?: string;
  emirate: string;
  region?: string;
  schoolGender: SchoolGender;
  educationCycles: EducationCycle[];
  status: SchoolStatus;
  subscriptionStatus?: SchoolSubscriptionStatus;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  requesterUid?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  requesterJobTitle?: string;
  rejectionReason?: string;
  userCount?: number;
  studentCount?: number;
  approvedUsersCount?: number;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'toggle_status' | 'reset_password' | 'approve' | 'open' | 'view' | 'print' | 'archive' | 'suspend' | 'reactivate' | 'request_info';
  entityType: 'student' | 'morningDelay' | 'absence' | 'violation' | 'warningForm' | 'parentSummonForm' | 'violationReport' | 'parentNoticeForm' | 'parentCommitmentForm' | 'temporarySuspensionForm' | 'behaviorForms' | 'committeeMeeting' | 'user' | 'setting' | 'studentCase' | 'studentCaseForm' | 'counselingSession' | 'school';
  entityId: string;
  schoolId: string;
  timestamp: string;
  details: string;
  beforeData?: any;
  afterData?: any;
  reason?: string;
  affectedEntityName?: string;
}

export interface CounselorUser {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  schoolName: string;
  schoolCycle: string;
  schoolId?: string;
  jobTitle?: string;
  active?: boolean;
  photoURL?: string;
}

export interface DashboardStats {
  totalStudents: number;
  tardyTodayCount: number;
  absencesTodayCount?: number;
  openViolationsCount: number;
  pendingSignaturesCount: number;
  criticalTardinessCount: number;
  criticalAbsencesCount?: number;
}

// ============================================================================
// SCHOOL MESSAGING SYSTEM TYPES
// ============================================================================

export type MessageCategory =
  | 'behavior' // إشعار مخالفة سلوكية
  | 'guardianCall' // استدعاء ولي الأمر
  | 'attendance' // إنذار غياب
  | 'tardiness' // تنبيه التأخر الصباحي
  | 'phoneConfiscation' // إشعار مصادرة هاتف
  | 'phoneReturn' // إشعار إعادة هاتف
  | 'committeeDecision' // إشعار إجراء صادر عن لجنة إدارة السلوك
  | 'meetingReminder' // تذكير بموعد اجتماع
  | 'uniformNotice' // إشعار عدم الالتزام بالزي المدرسي
  | 'positive' // رسالة شكر أو تعزيز إيجابي
  | 'custom' // رسالة عامة قابلة للتخصيص
  | 'academic' // أكاديمية
  | 'administrative' // إدارية
  | 'health' // صحية
  | 'events' // فعاليات ومناسبات
  | 'exams' // اختبارات
  | 'transport' // مواصلات مدرسية
  | 'other'; // أخرى

export type MessageImportance = 'normal' | 'important' | 'urgent' | 'veryUrgent';
// عادية | مهمة | عاجلة | عاجلة جدًا

export type TemplateScope = 'system' | 'school' | 'personal';

export interface MessageDataTableItem {
  id: string;
  label: string;
  value: string;
}

export interface MessageSectionsConfig {
  schoolIdentity: { enabled: boolean };
  badge: { enabled: boolean; text?: string; color?: string };
  studentCard: { enabled: boolean };
  greeting: { enabled: boolean; text: string };
  dataTable: { enabled: boolean; items: MessageDataTableItem[] };
  mainBody: { enabled: boolean; text: string };
  keyPoints: { enabled: boolean; points: string[]; icon?: string };
  requiredAction: { enabled: boolean; title?: string; text: string };
  actionButton: { enabled: boolean; text: string; url: string; color?: string; openInNewTab?: boolean };
  closingAndSignature: { enabled: boolean; closingText: string; signerName: string; signerRole: string };
  contactBox: { enabled: boolean; phone?: string; email?: string; notes?: string };
  footer: { enabled: boolean; text: string };
}

export interface MessageColorsConfig {
  primary: string; // e.g. '#006D77' or '#0C2340'
  accent: string; // e.g. '#D4AF37'
  background: string; // e.g. '#FFFFFF' or '#F8FAFC'
  badgeBg: string;
  badgeText: string;
}

export interface MessageTemplateRevision {
  version: number;
  name: string;
  category: MessageCategory;
  subject: string;
  body: string;
  sections: MessageSectionsConfig;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  changeNote?: string;
}

export interface MessageTemplate {
  id: string;
  schoolId: string;
  name: string;
  category: MessageCategory;
  subject: string;
  badgeText: string;
  importance: MessageImportance;
  colors: MessageColorsConfig;
  sections: MessageSectionsConfig;
  body: string; // fallback / unified WhatsApp text version
  variables: string[];
  scope: TemplateScope;
  isActive: boolean;
  isDefaultForCategory?: boolean;
  isSystemTemplate: boolean;
  version?: number;
  revisionHistory?: MessageTemplateRevision[];
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageChannel = 'whatsapp' | 'email' | 'both';

export type MessageStatus =
  | 'draft' // مسودة
  | 'ready' // جاهزة للإرسال
  | 'whatsapp_opened' // تم فتح واتساب للإرسال
  | 'email_opened' // تم فتح البريد للإرسال
  | 'confirmed_sent' // أكد المستخدم الإرسال
  | 'failed' // تعذر الإرسال
  | 'skipped' // تم التخطي
  | 'cancelled' // أُلغي
  | 'retried'; // تمت إعادة المحاولة

export interface MessageLogRecord {
  id: string;
  messageId: string;
  schoolId: string;
  templateId?: string;
  templateName?: string;
  templateTitle?: string;
  templateCategory?: MessageCategory;
  category?: MessageCategory;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  track?: string;
  recipientName: string;
  recipientRelation: string;
  recipientRole?: string;
  recipientAddress?: string;
  recipientPhoneMasked: string; // e.g. +971 50 *** 1234
  recipientEmailMasked?: string;
  recipientPhoneFull?: string;
  recipientEmailFull?: string;
  channel: MessageChannel;
  status: MessageStatus | string;
  subject: string;
  messageSnapshot: string;
  messageBody?: string;
  incidentId?: string;
  incidentType?: 'absence' | 'tardiness' | 'violation' | 'academic' | 'summon' | 'general';
  violationId?: string;
  absenceId?: string;
  tardinessId?: string;
  violationDescription?: string;
  incidentDate?: string;
  approvedAction?: string;
  requiredGuardianAction?: string;
  dedupeKey?: string;
  createdBy: string;
  createdByName: string;
  sentByName?: string;
  senderRole?: string;
  createdAt: string;
  openedAt?: string;
  confirmedAt?: string;
  retryCount?: number;
  lastRetryAt?: string;
  retriedBy?: string;
  isTestMode?: boolean;
  mergedStudentNumbers?: string[];
  notes?: string;
  relatedAction?: string;
}

export interface QueueItem {
  student: Student;
  contact: StudentContact;
  renderedText: string;
  renderedSubject: string;
  status: 'pending' | 'opened' | 'confirmed' | 'skipped' | 'failed';
  violationId?: string;
  violationDescription?: string;
  incidentDate?: string;
  approvedAction?: string;
  requiredGuardianAction?: string;
  missingFields?: string[];
  hasUnapprovedAction?: boolean;
  isCustomEdited?: boolean;
}

export interface MessageQueueRecipient {
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  track: AcademicTrack;
  contact: StudentContact;
  renderedSubject: string;
  renderedText: string;
  status: 'pending' | 'opened' | 'confirmed' | 'skipped' | 'failed';
  logId?: string;
  error?: string;
}

export interface MessageQueueRecord {
  id: string;
  queueId: string;
  schoolId: string;
  templateId?: string;
  recipients: MessageQueueRecipient[];
  currentIndex: number;
  completedCount: number;
  skippedCount: number;
  failedCount: number;
  status: 'in_progress' | 'completed' | 'paused' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolMessageSettings {
  schoolId: string;
  schoolNameAr: string;
  schoolNameEn: string;
  schoolNumber: string;
  emirate: string;
  cycle: string;
  logoUrl?: string;
  phone: string;
  email: string;
  defaultSenderName: string;
  defaultSenderRole: string;
  academicYear: string;
  semester: string;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  autoGreeting: string;
  autoFooter: string;
  updatedAt: string;
  updatedBy: string;
}

// ----------------------------------------------------------------------------
// UNIFIED BEHAVIORAL PLATFORM - 2026/2027 ENHANCED SPECIFICATIONS
// ----------------------------------------------------------------------------

export type CaseIntakeTrack =
  | 'violation' // مخالفة سلوكية عامة
  | 'tardiness' // تأخير صباحي
  | 'absence' // غياب دون عذر
  | 'bullying' // تنمر (مسار خاص)
  | 'cheating' // غش أو إخلال باختبار
  | 'phone_electronic' // هاتف أو جهاز إلكتروني
  | 'suspected_substance' // اشتباه بمادة ممنوعة (مسار خاص)
  | 'substance_suspicion' // اشتباه بمادة ممنوعة بديل
  | 'child_protection' // حماية طفل (سري ومشدد)
  | 'positive_behavior'; // سلوك إيجابي متميز

export type IncidentTrack = CaseIntakeTrack;

export type CaseWorkflowStatus =
  | 'new' // جديدة
  | 'draft' // مسودة أولية
  | 'investigating' // قيد التحقق
  | 'awaiting_student_sig' // بانتظار توقيع الطالب
  | 'awaiting_parent' // بانتظار ولي الأمر
  | 'awaiting_principal' // بانتظار المدير
  | 'referred_committee' // محالة للجنة السلوك
  | 'referred_to_committee' // اسم بديل لنفس الحالة
  | 'under_plan' // تحت خطة تعديل سلوك
  | 'closed' // مغلقة
  | 'approved_closed' // معتمدة ومغلقة
  | 'in_progress' // جارية
  | 'appealed' // متظلم عليها
  | 'confidential'; // سرية / حماية طفل

export type CaseConfidentiality = 'normal' | 'confidential' | 'restricted_child_protection';

export interface SmartActionEngineResult {
  violationCode: string;
  degreeName: ViolationDegree | string;
  gradeDeduction: number; // e.g. 0, 1, 2, 4, 8, 12, 16, 20
  repetitionCount: number; // 1st, 2nd, 3rd, etc.
  previousActions: string[];
  suggestedAction: string;
  responsibleRole: string; // e.g. "المعلم / المرشد الطلابي" or "مساعد المدير ولجنة السلوك"
  requiredForms: string[]; // e.g. ["نموذج 6 (تقرير)", "نموذج 7 (إخطار ولي أمر)", "نموذج 8 (استدعاء)"]
  requiresPrincipalApproval: boolean;
  requiresBehaviorCommittee: boolean;
  requiresSpecializedReferral: boolean;
  specializedReferralEntity?: string; // e.g. "فريق حماية الطفل" or "الرعاية الاجتماعية / الشرطة المجتمعية"
  caseBundleSupported: boolean;
}

export interface BehavioralCase {
  id: string;
  caseNumber: string; // e.g. "CASE-2026-0042"
  track: CaseIntakeTrack;
  title: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  incidentDate: string;
  incidentTime: string;
  incidentLocation: string;
  reportedBy: string;
  reporterRole: string;
  description: string;
  confidentiality: CaseConfidentiality;
  status: CaseWorkflowStatus;
  assignedTo: string;
  assignedToName: string;
  dueDate?: string;

  // Smart Engine Assessment
  smartAnalysis?: SmartActionEngineResult;
  appliedAction?: string;
  deductedMarks?: number;

  // Signatures & Forms Checklist
  signatures?: {
    student?: { signed: boolean; name?: string; date?: string; signatureUrl?: string };
    parent?: { signed: boolean; name?: string; date?: string; signatureUrl?: string; method?: 'in_person' | 'sms_link' };
    counselor?: { signed: boolean; name?: string; date?: string; signatureUrl?: string };
    principal?: { signed: boolean; name?: string; date?: string; signatureUrl?: string };
  };

  // Associated generated form IDs
  associatedFormIds?: {
    model6ReportId?: string;
    model7NoticeId?: string;
    model8SummonId?: string;
    model9WarningId?: string;
    model10CommitmentId?: string;
    planId?: string;
  };

  // Attachments
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
    isEncrypted?: boolean;
  }>;

  notes?: string;
  auditLogs?: Array<{
    userId: string;
    userName: string;
    action: string;
    timestamp: string;
  }>;

  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// BEHAVIOR MODIFICATION PLAN (خطة تعديل السلوك)
// ----------------------------------------------------------------------------
export interface BehaviorModificationPlan {
  id: string;
  planNumber?: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  targetBehavior: string; // السلوك المستهدف تعديله
  rootCauses: string; // أسباب الحالة والعوامل المؤثرة
  desiredGoal?: string; // الهدف المطلوب
  desiredOutcome?: string; // الهدف المطلوب بديل
  counselorId: string;
  counselorName: string;
  responsibleOfficer: string; // المسؤول عن المتابعة
  startDate: string;
  endDate: string;
  status?: 'active' | 'completed' | 'in_progress' | 'cancelled' | string;
  improvementRate?: number;
  counselingSessions: Array<{
    sessionNumber: number;
    date: string;
    topic: string;
    studentCommitment: string;
    status: 'completed' | 'scheduled' | 'cancelled';
  }>;
  weeklyFollowUps: Array<{
    weekNumber: number;
    date: string;
    scorePercent: number; // 0 - 100%
    teacherNotes: string;
    parentFeedback: string;
    observedBehavior: string;
  }>;
  improvementPercentage: number; // e.g. 75%
  finalDecision: 'ongoing' | 'successful' | 'extended' | 'referred' | string;
  parentInvolved: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// POSITIVE BEHAVIOR & GRADE RECOVERY (السلوك الإيجابي وتعويض الدرجات)
// ----------------------------------------------------------------------------
export interface PositiveBehaviorRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  date: string;
  behaviorTitle: string;
  category: 'academic_initiative' | 'community_service' | 'peer_mentoring' | 'discipline_excellence' | 'extracurricular' | 'school_service' | string;
  pointsAwarded: number;
  recoveredMarks: number; // درجات السلوك المعوضة
  description: string;
  evidenceNotes?: string;
  approvedByCommittee: boolean;
  certificateIssued: boolean;
  recordedBy: string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// PARENT MEETINGS (اجتماعات ولي الأمر)
// ----------------------------------------------------------------------------
export interface ParentMeetingRecord {
  id: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade?: string;
  section?: string;
  parentName: string;
  parentRelation?: string;
  meetingDate?: string;
  date?: string;
  meetingTime?: string;
  time?: string;
  meetingType?: string;
  attendees?: string[]; // e.g. ["المرشد الطلابي", "ولي الأمر", "معلم المادة"]
  attendeeRole?: string;
  meetingReason?: string;
  topic?: string;
  meetingSummary?: string;
  agreedPlan?: string;
  agreedRecommendations?: string[];
  parentSigned?: boolean;
  parentSignatureUrl?: string;
  counselorName?: string;
  counselorSignatureUrl?: string;
  followUpDate?: string;
  nextFollowUpDate?: string;
  status?: 'scheduled' | 'completed' | 'parent_absent' | string;
  createdAt: string;
}

// ----------------------------------------------------------------------------
// BEHAVIOR COMMITTEE MEETINGS (لجنة إدارة السلوك)
// ----------------------------------------------------------------------------
export interface CommitteeMeetingAgendaItem {
  id: string;
  caseId?: string;
  studentId: string;
  studentName: string;
  grade: string;
  topic: string;
  incidentDegree: string;
  discussionNotes: string;
  proposedResolution: string;
  votes: {
    approve: number;
    reject: number;
    abstain: number;
  };
  finalResolution: string;
  actionRequired: string;
}

export interface CommitteeMeetingCase {
  caseId: string;
  meetingId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel | string;
  section: SectionName | string;
  violationId: string; // ربط إلزامي بمخالفة قائمة
  violationTitle: string;
  violationDegree: string;
  incidentDescription: string;
  incidentDateTime: string;
  repetitionCount: number;
  priorActionsTaken: string[];
  linkedFormIds?: string[];
  currentBehaviorScore?: number;

  // Committee deliberations
  discussionNotes: string;
  committeeRecommendation: string;
  decision: 'none' | 'temporary_suspension' | 'behavior_plan' | 'final_warning' | 'community_service' | 'referral_specialized' | 'other';
  decisionCustomText?: string;
  decisionJustification: string;
  behaviorModificationProgram: string;
  notes?: string;

  // Approval details
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedByRole?: string;
  approvedAt?: string;

  // Resulting official committee forms (e.g. Model 12 TSF id)
  resultingFormIds?: string[];
}

export interface BehaviorCommitteeMeeting {
  id: string;
  meetingNumber: string; // e.g. "جلسة رقم (1) / 2026"
  sessionNumber?: string;
  meetingDate: string;
  meetingTime: string;
  location: string;
  type: 'regular' | 'urgent';
  chairpersonName?: string; // رئيس اللجنة (مدير المدرسة أو المكلف)
  rapporteurName?: string; // مقرر اللجنة (المرشد الأكاديمي)
  recordedBy?: string;
  officialMinutes?: string;
  attendees: Array<{
    name: string;
    role: string;
    present?: boolean;
    attended?: boolean;
    signed?: boolean;
    signatureUrl?: string;
  }>;
  agenda?: any[];
  agendaItems?: CommitteeMeetingAgendaItem[];
  cases?: CommitteeMeetingCase[];
  decisions?: BehaviorCommitteeDecision[];
  generalNotes?: string;
  minutesGenerated?: boolean;
  status: 'scheduled' | 'in_progress' | 'minutes_signed' | 'completed' | 'draft' | 'convened' | 'approved';
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorCommitteeDecision {
  id: string;
  decisionNumber?: string;
  meetingId?: string;
  meetingNumber?: string;
  caseId?: string;
  studentId: string;
  studentName: string;
  studentNumber?: string;
  grade?: string;
  section?: string;
  type?: 'temporary_suspension' | 'behavior_plan_mandate' | 'final_warning' | 'community_service' | string;
  description?: string;
  decisionDate: string;
  violationTitle?: string;
  violationDegree?: string;
  penalties?: string[];
  deductedMarks?: number;
  approvedAlternativeServices?: string[];
  behaviorPlanMandated?: boolean;
  parentNotified?: boolean;
  executionStatus?: 'pending' | 'in_progress' | 'executed' | 'appealed';
  votesInFavor?: number;
  votesAgainst?: number;
  votesAbstained?: number;
  approved?: boolean;
  committeeChairperson?: string;
  counselorName?: string;
  notes?: string;
  createdAt?: string;
}

// ----------------------------------------------------------------------------
// BEHAVIOR COMMITTEE NOTIFICATIONS & MEMBERS (نظام إشعارات وتنبيهات لجنة السلوك)
// ----------------------------------------------------------------------------
export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  receiveSms: boolean;
  receiveEmail: boolean;
  active: boolean;
}

export type CommitteeNotificationType =
  | 'meeting_scheduled'
  | 'urgent_student_status'
  | 'decision_approved'
  | 'custom_alert';

export interface CommitteeNotificationRecipient {
  memberId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  channelsSent: ('sms' | 'email')[];
  status: 'delivered' | 'sent' | 'pending';
}

export interface CommitteeNotificationLog {
  id: string;
  type: CommitteeNotificationType;
  title: string;
  content: string;
  smsContent?: string;
  emailSubject?: string;
  emailBody?: string;
  channel: 'sms' | 'email' | 'both';
  urgencyLevel: 'normal' | 'urgent' | 'critical';
  meetingId?: string;
  meetingNumber?: string;
  meetingDate?: string;
  meetingTime?: string;
  studentId?: string;
  studentName?: string;
  grade?: string;
  section?: string;
  recipients: CommitteeNotificationRecipient[];
  sentBy: string;
  sentAt: string;
  timestamp: number;
}

// ----------------------------------------------------------------------------
// CUSTOM FORM BUILDER TEMPLATE (منشئ النماذج المرن)
// ----------------------------------------------------------------------------
export interface CustomFormTemplate {
  id: string;
  templateCode: string; // e.g. "FORM_CUSTOM_01"
  title: string;
  description: string;
  version: number;
  schoolLogoUrl?: string;
  headerText: string;
  bodyTemplate: string; // text with {{student_name}}, {{incident_date}}, etc.
  footerText: string;
  fields: Array<{
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'select' | 'checkbox';
    options?: string[];
    required: boolean;
  }>;
  signaturesRequired: Array<{
    role: 'student' | 'parent' | 'counselor' | 'principal' | 'committee_member';
    label: string;
  }>;
  associatedDegree?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// CASE MANAGEMENT & COUNSELING MODULE (إدارة الحالات والإرشاد)
// ----------------------------------------------------------------------------

export type CaseType =
  | 'أكاديمية'
  | 'سلوكية'
  | 'حضور وغياب'
  | 'اجتماعية'
  | 'أسرية'
  | 'صحية'
  | 'نفسية'
  | 'حماية طفل'
  | 'متعددة الجوانب'
  | 'أخرى';

export type CaseReferralSource =
  | 'الطالب نفسه'
  | 'ولي الأمر'
  | 'المعلم'
  | 'المرشد'
  | 'رئيس وحدة شؤون الطلبة'
  | 'مدير المدرسة'
  | 'الإدارة المدرسية'
  | 'جهة خارجية'
  | 'أخرى';

export type CaseConfidentialityLevel = 'عادي' | 'مقيّد' | 'سري جدًا';

export type CaseStatus =
  | 'مسودة'
  | 'مفتوح'
  | 'قيد التقييم'
  | 'توجد خطة تدخل'
  | 'قيد المتابعة'
  | 'محوّل'
  | 'مغلق'
  | 'مؤرشف';

export interface StudentCaseRecord {
  id: string; // Document ID (e.g., matching caseNumber or unique ID)
  schoolId: string;
  studentId: string;
  studentName?: string;
  studentNumber?: string;
  grade?: GradeLevel | string;
  section?: SectionName | string;
  academicYear: string;
  caseNumber: string; // e.g. "CASE-2026-0001"
  caseType: CaseType;
  subcategory?: string; // تصنيف فرعي للحالة (مثل: تأخر تحصيلي، تنمر، قلق امتحاني، تدخين، غياب متكرر...)
  referralSource: CaseReferralSource;
  referralReason: string;
  initialSummary: string;
  confidentialityLevel: CaseConfidentialityLevel;
  status: CaseStatus;
  assignedCounselorId: string;
  assignedCounselorName?: string;
  openedAt: string; // YYYY-MM-DD
  nextFollowUpAt?: string | null;
  closedAt?: string | null;
  parentNotified?: boolean;
  parentNotificationDate?: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  isArchived?: boolean;
}

export interface StudentFamilyContactItem {
  id: string;
  name: string;
  relation: string; // e.g. 'الأب' | 'الأم' | 'الأخ' | 'العم' ...
  isPrimary: boolean;
  nationalId: string;
  job: string;
  employer: string;
  educationLevel: string;
  phone: string;
  whatsapp: string;
  email: string;
  livesWithStudent: boolean;
}

export interface StudentFamilyData {
  // القسم الأول: بيانات الطالب
  schoolName: string;
  studentName: string;
  studentNumber: string;
  grade: string;
  section: string;
  nationality: string;
  birthDate: string;
  gender: 'ذكر' | 'أنثى' | string;
  nationalId: string;
  studentPhone: string;
  studentEmail: string;
  hasSiblingsInSchool: boolean;
  siblingsInfo: string;
  isDeterminedPerson: boolean; // أصحاب الهمم
  determinedCategory: string; // تصنيف الحالة

  // القسم الثاني: البيانات الصحية
  hasHealthIssue: boolean;
  healthIssueTypes: string[]; // السكري، ضغط الدم، أمراض القلب، الربو، أمراض الدم، أخرى
  healthIssueOther: string;
  healthDescription: string;
  usesMedicalDevices: boolean;
  medicalDeviceType: string;
  familyHasChronicIllness: boolean;
  familyIllnessDetails: string;

  // القسم الثالث: الأنشطة والمواهب
  externalActivities: string[]; // نادٍ رياضي، نادٍ ثقافي، مركز علمي، مركز هوايات، نشاط تطوعي، مركز تحفيظ قرآن، معهد لغات، أخرى
  externalActivitiesOther: string;
  hobbies: string;
  talents: string;
  transportationMethod: string; // ولي الأمر، السائق، الحافلة المدرسية، سيرًا على الأقدام، أخرى
  transportationOther: string;

  // القسم الرابع: ولي الأمر ووسائل التواصل
  contacts: StudentFamilyContactItem[];

  // القسم الخامس: الوضع الأسري
  brothersCount: number;
  sistersCount: number;
  birthOrder: number;
  livesWithBothParents: boolean;
  separationReason: string; // طلاق، وفاة الأب، وفاة الأم، انفصال، سفر، أخرى
  separationReasonOther: string;
  livesWithWhom: string;
  otherResidentsInHome: boolean;
  otherResidentsDetails: string;
  familyNotes: string;

  // القسم السادس: السكن والوضع الاقتصادي
  emirate: string;
  area: string;
  streetName: string;
  houseNumber: string;
  homePhone: string;
  housingType: string; // فيلا، شقة، بيت عربي، سكن مشترك، أخرى
  housingTypeOther: string;
  housingOwnership: string; // ملك، إيجار، سكن حكومي، أخرى
  housingOwnershipOther: string;
  hasPrivateRoom: boolean;
  sharedRoomWith: string;
  incomeSources: string;
  incomeLevel: 'مناسب' | 'يحتاج إلى دعم' | 'غير محدد' | string;
  economicNotes: string;

  // القسم السابع: اعتماد البيانات
  filledByName: string;
  filledByRole: string;
  formDate: string;
  counselorNotes: string;
  formStatus: 'مسودة' | 'مكتمل' | 'معتمد';
  reviewedBy: string;
  reviewedAt: string;
}

export interface StudentCaseFormRecord {
  id: string; // e.g. student_data_update
  schoolId: string;
  studentId: string;
  caseId: string;
  formType: 'student_data_update' | string;
  formVersion: number;
  formStatus: 'مسودة' | 'مكتمل' | 'معتمد';
  data: StudentFamilyData;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// ----------------------------------------------------------------------------
// INDIVIDUAL COUNSELING SESSION & MINI CASE STUDY (استمارة الإرشاد الفردي ودراسة الحالة المصغرة)
// Subcollection: studentCases/{caseId}/counselingSessions/{sessionId}
// ----------------------------------------------------------------------------

export type CounselingSessionType = 'جلسة أولى' | 'جلسة متابعة' | 'جلسة طارئة' | 'جلسة ختامية';

export type CounselingSessionLocation =
  | 'مكتب المرشد'
  | 'مكتب الإدارة'
  | 'غرفة الاجتماعات'
  | 'الصف'
  | 'عن بُعد'
  | 'مكان آخر';

export type CounselingSessionConfidentiality = 'عادي' | 'مقيّد' | 'سري جدًا';

export type CounselingSessionFormStatus =
  | 'مسودة'
  | 'مكتمل'
  | 'ينتظر المراجعة'
  | 'معتمد'
  | 'مغلق'
  | 'مؤرشف';

export type StudentInteractionType =
  | 'متعاون'
  | 'متردد'
  | 'منسحب'
  | 'غاضب'
  | 'متوتر'
  | 'هادئ'
  | 'غير محدد'
  | 'أخرى';

export type StudentAwarenessLevel = 'واضح' | 'جزئي' | 'محدود' | 'غير محدد';

export type StudentReadinessLevel = 'مرتفع' | 'متوسط' | 'منخفض' | 'يحتاج إلى متابعة';

export interface SessionGoalItem {
  id: string;
  description: string;
  type: 'أكاديمي' | 'سلوكي' | 'اجتماعي' | 'شخصي' | 'مهني' | 'حضور وانضباط' | 'آخر';
  status: 'تحقق' | 'تحقق جزئيًا' | 'لم يتحقق' | 'يحتاج إلى متابعة';
  notes?: string;
}

export interface MiniActionPlanItem {
  id: string;
  action: string;
  responsible:
    | 'الطالب'
    | 'ولي الأمر'
    | 'المرشد'
    | 'المعلم'
    | 'الإدارة'
    | 'الأخصائي الاجتماعي'
    | 'جهة أخرى';
  startDate: string;
  expectedEndDate: string;
  successIndicator: string;
  status: 'لم يبدأ' | 'قيد التنفيذ' | 'مكتمل' | 'متعثر' | 'ملغى';
  notes?: string;
}

export interface GuardianContactInfo {
  contacted: boolean;
  contactDate?: string;
  contactTime?: string;
  contactPersonName?: string;
  relation?: string;
  phone?: string;
  contactMethod?: 'اتصال هاتفي' | 'واتساب' | 'بريد إلكتروني' | 'حضور شخصي' | 'أخرى';
  summary?: string;
  guardianNotes?: string;
  agreedToPlan?: 'نعم' | 'لا' | 'مع تحفظات' | boolean | string;
  needsAppointment?: boolean;
  appointmentDate?: string;
}

export interface StudentAcknowledgementInfo {
  enabled: boolean;
  agreedPoints?: string;
  commitmentText?: string;
  studentName?: string;
  studentSignature?: string;
  signatureDate?: string;
}

export interface SessionApprovalInfo {
  counselorName: string;
  counselorJobTitle?: string;
  counselorSignature?: string;
  approvalDate?: string;
  reviewerName?: string;
  reviewerNotes?: string;
  approvalStatus: 'معتمد' | 'قيد المراجعة' | 'مسودة';
}

export interface SessionRevisionItem {
  revisedAt: string;
  revisedBy: string;
  reason: string;
  previousSnapshot?: any;
}

export interface CounselingSessionRecord {
  id: string;
  schoolId: string;
  academicYear?: string;
  studentId: string;
  caseId: string;
  caseNumber?: string;
  studentName?: string;
  studentNumber?: string;
  grade?: string;
  section?: string;
  track?: string;

  // بيانات الجلسة
  sessionNumber: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  sessionLocation: CounselingSessionLocation | string;
  sessionLocationOther?: string;
  sessionType: CounselingSessionType;
  counselorId?: string;
  counselorName: string;
  counselorJobTitle?: string;
  confidentialityLevel: CounselingSessionConfidentiality;
  formStatus: CounselingSessionFormStatus;

  // مصدر الإحالة
  referralSources?: string[];
  referralSourceDetails?: {
    teacherName?: string;
    subject?: string;
    guardianName?: string;
    guardianRelation?: string;
    guardianPhone?: string;
    externalEntityName?: string;
    otherExplanation?: string;
  };
  referralDate?: string;
  referringPersonName?: string;
  referralReasonBrief?: string;
  referralNumber?: string;
  isRelatedToBehaviorViolation?: boolean;
  relatedViolationId?: string;
  relatedViolationText?: string;
  isRelatedToTardinessOrAbsence?: boolean;
  relatedTardinessId?: string;
  relatedTardinessText?: string;
  isRelatedToAcademicDecline?: boolean;
  isRelatedToChildProtection?: boolean;

  // مجال الإرشاد
  counselingAreas: string[];
  counselingAreasOther?: string;

  // أسباب الإرشاد ووصف الحالة
  sessionTitle: string;
  sessionReasons: string;
  issueDescriptionInReferral?: string;
  studentWordsProblemDescription?: string;
  problemStartDate?: string;
  problemRecurrenceCount?: string;
  involvedPersons?: string;
  incidentLocation?: string;
  antecedentCircumstances?: string;
  impactOnStudent?: string;
  impactOnAcademicPerformance?: string;
  impactOnAttendanceAndDiscipline?: string;
  impactOnSocialRelationships?: string;
  counselorInitialNotes?: string;

  // ملاحظات ومجريات الجلسة
  studentStatementSummary?: string;
  counselorDirectObservations?: string;
  studentInteraction?: StudentInteractionType | string;
  studentInteractionOther?: string;
  studentAwarenessLevel?: StudentAwarenessLevel | string;
  studentReadinessToCooperate?: StudentReadinessLevel | string;
  strengths?: string;
  needs?: string;
  contributingFactors?: string;
  hinderingFactors?: string;
  otherObservations?: string;

  // أهداف الجلسة
  sessionGoals: SessionGoalItem[];

  // تقنيات وإجراءات الجلسة
  counselingTechniquesUsed?: string[];
  counselorDiagnosticImpression?: string;
  notesAndRecommendations?: string;
  studentSignature?: string;
  studentSignatureDate?: string;
  counselorSignature?: string;
  counselorSignatureDate?: string;
  schoolPrincipalApproval?: string;
  schoolPrincipalApprovalDate?: string;

  // إجراءات الجلسة
  sessionProcedures?: string[];
  sessionProceduresDetails?: string;

  // الحلول والخدمات الإرشادية
  servicesProvided?: {
    academicServices?: string[];
    personalBehaviorServices?: string[];
    careerServices?: string[];
    socialServices?: string[];
    referrals?: string[];
    detailedExplanation?: string;
  };

  // خطة العمل المصغرة
  miniActionPlan?: MiniActionPlanItem[];

  // التواصل مع ولي الأمر
  guardianContact?: GuardianContactInfo;

  // نتيجة الجلسة
  initialProfessionalAssessment?: string;
  priorityLevel: 'منخفض' | 'متوسط' | 'مرتفع' | 'عاجل';
  sessionOutcome: string;
  nextFollowUpAt?: string;
  nextFollowUpPurpose?: string;
  concludingNotes?: string;

  // إقرار الطالب
  studentAcknowledgement?: StudentAcknowledgementInfo;

  // اعتماد المرشد
  approval?: SessionApprovalInfo;

  // سجل التعديلات
  revisions?: SessionRevisionItem[];

  // نظام وأرشفة
  isArchived?: boolean;
  archivedAt?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt: string;
}

// ============================================================================
// OFFICIAL BYLAW ANNEX FORMS (القرار الوزاري رقم 851 لسنة 2018 م)
// ============================================================================

// ----------------------------------------------------------------------------
// MODEL 20: BEHAVIOR DEDUCTION NOTICE (إخطار بالحسم من درجة السلوك – ملحق 20)
// ----------------------------------------------------------------------------
export interface BehaviorDeductionNoticeRecord {
  id: string; // BD-schoolId-year-seq
  formType: 'behavior_deduction_notice';
  formNumber: 20;
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string;
  parentPhone?: string;
  violationDegree: string; // الدرجة الأولى / الثانية / الثالثة / الرابعة
  violationDescription: string; // وهي:...
  committeeDecisionNumber: string; // قرار لجنة السلوك بالمدرسة رقم
  committeeDecisionDate: string; // الموافق من يوم .../.../...م
  deductedMarks: number; // حسم (...) درجة
  term: string; // الفصل الدراسي (الأول / الثاني / الثالث)
  academicYear: string; // للعام الدراسي 2025/2026م
  recoveryProposals: string[]; // 1, 2, 3 مقترحات استرجاع جزء من الدرجة
  
  // Signatures
  parentSignature?: string; // base64
  parentSignatureDate?: string;
  parentReceiptName?: string;
  
  principalName: string;
  principalSignature?: string;
  principalSignatureDate?: string;
  
  status: 'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 21: VIOLATION COMPENSATION FORM (نموذج تعويض عن مخالفة – ملحق 21)
// ----------------------------------------------------------------------------
export interface CompensationTableRow {
  id: string;
  violationDegree: string; // درجة المخالفة
  violationNumber: string; // رقم المخالفة
  violationDescription: string; // وصف المخالفة
  deductedMarks: number; // درجة الحسم
  positiveBehaviorCorrection: string; // التصحيح (وصف السلوك الإيجابي)
  compensationMarks: number; // درجة التعويض
}

export interface ViolationCompensationRecord {
  id: string; // VC-schoolId-year-seq
  formType: 'violation_compensation';
  formNumber: 21;
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  term: string;
  academicYear: string;
  rows: CompensationTableRow[];
  totalPositiveMarksAfterCompensation: number; // مجموع درجات السلوك الإيجابي بعد التعويض
  totalMarks: number; // مجموع الدرجات
  finalTermMarks: number; // الدرجة الكلية نهاية الفصل الدراسي
  
  // Signatures
  officerName: string; // الموظف المسؤول
  officerSignature?: string;
  officerDate: string;
  
  principalName: string; // مدير/ة المدرسة
  principalSignature?: string;
  principalDate: string;
  
  status: 'مسودة' | 'بانتظار الاعتماد' | 'معتمد';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 24: DEVICE CONFISCATION FORM ("مصادرة أجهزة الكترونية" – ملحق 24)
// ----------------------------------------------------------------------------
export interface DeviceConfiscationRecord {
  id: string; // DC-schoolId-year-seq
  formType: 'device_confiscation';
  formNumber: 24;
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string;
  parentPhone?: string;
  deviceDescription: string; // جهاز ... بحوزة ابنكم/ابنتكم
  retentionDuration: string; // سيتم الاحتفاظ بالجهاز لمدة (....)
  confiscationDate: string; // حرر في / / م
  
  // Signatures
  officerSignature?: string;
  officerName?: string;
  principalSignature?: string;
  principalName?: string;
  parentSignature?: string;
  parentSignatureDate?: string;
  
  status: 'محجوز' | 'تمت الإعادة لولي الأمر' | 'مسودة';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 25: DEVICE RETURN FORM (إعادة أجهزة الكترونية – ملحق 25)
// ----------------------------------------------------------------------------
export interface DeviceReturnRecord {
  id: string; // DR-schoolId-year-seq
  formType: 'device_return';
  formNumber: 25;
  confiscationFormId?: string; // Reference to model 24 if applicable
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string;
  parentPhone?: string;
  deviceDescription: string; // تمت اعادة جهاز ...
  violationNumber: string; // المصادر بموجب المخالفة رقم ...
  confiscationDate: string; // بتاريخ: ...
  returnDate: string; // حرر في / / م
  
  // Signatures
  officerSignature?: string;
  officerName?: string;
  principalSignature?: string;
  principalName?: string;
  parentSignature?: string;
  parentSignatureDate?: string;
  
  status: 'تم التسليم والإغلاق' | 'مسودة';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 26: AUTHORIZED PICKUP COMMITMENT FORM (تعهد ولي أمر بالأشخاص المخولين لاستلام ابنه / ابنته – ملحق 26)
// ----------------------------------------------------------------------------
export interface AuthorizedPickupCommitmentRecord {
  id: string; // AP-schoolId-year-seq
  formType: 'authorized_pickup_commitment';
  formNumber: 26;
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string;
  isParentNonFather?: boolean;
  parentNonFatherName?: string; // اسم ولي الأمر إذا كان غير الأب
  parentPhone: string;
  
  // Authorized Person
  authorizedPersonName: string; // الشخص المخول له توصيل الطالب
  authorizedPersonRelation: string; // صلته بالطالب
  authorizedPersonEmiratesId: string; // رقم هويته
  authorizedPersonPhone: string; // رقم الهاتف
  notes?: string;
  
  // Signatures
  parentSignature?: string;
  issueDate: string;
  
  status: 'معتمد وساري' | 'مسودة' | 'ملغي ومستبدل';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 27: ATTENDANCE COMMITMENT FORM (تعهد ولي أمر بالتزام ابنه/ ابنته بالدوام المدرسي – ملحق 27)
// ----------------------------------------------------------------------------
export interface AttendanceCommitmentRecord {
  id: string; // AC-schoolId-year-seq
  formType: 'attendance_commitment';
  formNumber: 27;
  schoolId: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName: string;
  parentRelation: string; // صلة القرابة
  parentPhone?: string;
  issueDate: string;
  tardinessRecordId?: string;
  
  // Signatures
  parentSignature?: string;
  parentSignatureDate?: string;
  
  status: 'معتمد ومسلّم' | 'مسودة';
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// MODEL 12: TEMPORARY SUSPENSION FORM (قرار إيقاف مؤقت من الدراسة – ملحق 12)
// ملحق (12) للقرار الوزاري رقم (851) لسنة 2018م بشأن لائحة إدارة سلوك الطلبة
// ----------------------------------------------------------------------------
export interface TemporarySuspensionFormRecord {
  id: string; // TSF-schoolId-year-seq
  formType: 'temporary_suspension_form';
  formNumber: 12;
  schoolId: string;
  emirate: string; // إمارة
  operationsManagement: string; // إدارة العمليات المدرسية
  council: string; // المجلس
  sector: string; // نطاق
  schoolName: string; // مدرسة
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: GradeLevel;
  section: SectionName;
  parentName?: string;
  parentPhone?: string;

  // Association with Incident / Violation & Committee Meeting
  violationId?: string;
  meetingId?: string;
  caseId?: string;

  // Prior actions taken against the student (سبق اتخاذ الإجراءات التالية بحقه:)
  priorAction1?: string;
  priorAction2?: string;

  // Committee Meeting Details (MANUAL INPUT ONLY: رقم اجتماع لجنة إدارة السلوك)
  meetingNumber: string; // رقم الجلسة / الاجتماع (إدخال يدوي واضح، لا auto increment)
  meetingDay: string; // في يوم (مثال: الأحد)
  meetingDate: string; // بتاريخ (YYYY-MM-DD)

  // Suspension Period (إيقاف الطالب/الطالبة مؤقتاً من الدراسة بالمدرسة، وإلحاقه ببرنامج لتعديل السلوك خلال المدة:)
  suspensionStartDay: string; // من يوم
  suspensionStartDate: string; // الموافق YYYY-MM-DD
  suspensionEndDay: string; // إلى يوم
  suspensionEndDate: string; // الموافق YYYY-MM-DD
  suspensionDaysCount?: number; // عدد الأيام
  behaviorModificationProgram?: string; // تفاصيل برنامج تعديل السلوك والتكليف بالواجبات داخل المدرسة

  // Reasons for suspension (وذلك للأسباب التالية:)
  reason1: string;
  reason2?: string;
  reason3?: string;

  // Signatures & Approvals (التوقيعات والاعتمادات)
  principalName: string; // مدير المدرسة أو المفوض
  principalSignature?: string; // base64
  principalSignatureDate?: string;

  studentSignature?: string; // توقيع الطالب / الطالبة بالعلم
  studentSignatureDate?: string;

  parentSignature?: string; // توقيع ولي أمر الطالب/الطالبة
  parentSignatureDate?: string;

  // Detailed Signature Audit Information
  signaturesAudit?: {
    principal?: {
      signerName: string;
      signerRole: string;
      signedAt: string;
      meetingId?: string;
      documentId?: string;
    };
    parent?: {
      signerName: string;
      signerRole: string;
      signedAt: string;
      meetingId?: string;
      documentId?: string;
    };
    student?: {
      signerName: string;
      signerRole: string;
      signedAt: string;
      meetingId?: string;
      documentId?: string;
    };
  };

  issueDate: string; // تحريراً في: YYYY-MM-DD
  status: 'مسودة' | 'بانتظار التوقيع' | 'معتمد ومسلّم';
  isLocked?: boolean;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// EMPLOYEES & STAFF REGISTRY (سجل الموظفين والكادر المدرسي)
// ============================================================================
export interface EmployeeRecord {
  id: string;
  employeeNumber: string;         // الرقم الوظيفي
  fullName: string;               // الاسم الكامل
  jobTitle: string;               // المسمى الوظيفي
  department: string;             // القسم / المادة / الإدارة
  phoneNumber?: string;           // رقم الهاتف
  email?: string;                 // البريد الإلكتروني
  isCommitteeMember?: boolean;    // هل هو عضو بلجنة إدارة السلوك
  committeeRole?: string;         // الدور الرسمي في اللجنة (رئيس، نائب رئيس، مقرر، عضو...)
  status: 'active' | 'inactive';  // الحالة
  notes?: string;                 // ملاحظات
  schoolId?: string;
  createdAt: string;
  updatedAt: string;
}

// تشكيل لجنة إدارة السلوك
export interface CommitteeMemberConfig {
  id: string;
  employeeId?: string;           // معرف الموظف المرتبط إن وجد
  name: string;                  // اسم العضو
  roleTitle: string;             // المنصب في اللجنة (رئيس اللجنة، مقرر اللجنة، ممثل المعلمين...)
  department?: string;           // القسم أو الصفة الإدارية
  phoneNumber?: string;
  isRequired: boolean;
  notes?: string;
}

export interface CommitteeFormationConfig {
  schoolId?: string;
  academicYear?: string;
  members: CommitteeMemberConfig[];
  updatedAt: string;
}

// ============================================================================
// OFFICIAL DOCUMENTS & SIGNATURES MODULE (وحدة النماذج والتوقيعات الرسمية)
// ============================================================================

export type OfficialModelNumber = 6 | 7 | 8 | 9 | 10 | 12 | 20 | 24 | 25;

export type OfficialDocumentStatus =
  | 'draft'               // مسودة
  | 'needs_completion'    // يحتاج استكمال
  | 'pending_signature'   // بانتظار التوقيع
  | 'signed'              // موقع
  | 'approved';           // معتمد

export type DocumentCategory =
  | 'violations'          // المخالفات
  | 'notices'             // التنبيهات والإنذارات
  | 'commitments'         // التعهدات
  | 'committee'           // لجنة السلوك
  | 'electronic_devices'; // الأجهزة الإلكترونية

export interface DocumentSignature {
  role: 'student' | 'parent' | 'teacher' | 'counselor' | 'committee_chair' | 'principal';
  roleTitleAr: string;          // صفة الموقع بالعربية
  signerName: string;           // اسم الموقع
  signerId?: string;            // الرقم الوظيفي أو رقم الهوية أو معرف المستخدم
  signedAt: string;             // تاريخ ووقت التوقيع
  signatureType: 'drawn' | 'digital_approval'; // رسم يدوي أو اعتماد رقمي
  signatureDataUrl?: string;    // Base64 png data
  verificationBadge?: string;   // رمز الاعتماد الرسمي
  isVerified: boolean;
}

export interface DocumentAuditLogEntry {
  action: 'create' | 'update' | 'sign' | 'approve' | 'reopen';
  performedBy: string;
  role: string;
  timestamp: string;
  details?: string;
}

export interface OfficialDocumentRecord {
  id: string;                      // المعرف في Firestore
  documentId: string;              // رقم المستند الرسمي المرجعي (e.g., DOC-2026-00042)
  bundleId?: string;               // معرّف حزمة النماذج إن وجدت
  modelNumber: OfficialModelNumber;// رقم النموذج (6, 7, 8...)
  modelName: string;               // الاسم الرسمي للنموذج (تقرير مخالفة، خطاب استدعاء...)
  modelCategory: DocumentCategory; // تصنيف النموذج
  
  // Associations
  schoolId?: string;
  studentId: string;               // معرف الطالب في السجل
  studentNumber: string;           // رقم الطالب
  studentName: string;             // اسم الطالب
  grade: string;                   // الصف
  section: string;                 // الشعبة
  stream?: string;                 // المسار (عام / متقدم / نخبة...)
  
  violationId?: string;            // معرّف المخالفة السلوكية
  violationCode?: string;          // كود المخالفة (e.g., 1-1, 2-3)
  violationDegree?: string;        // درجة المخالفة
  violationTitle?: string;         // العنوان / الوصف الرسمي للمخالفة
  incidentDate?: string;           // تاريخ الواقعة
  incidentTime?: string;           // وقت الواقعة
  incidentLocation?: string;       // مكان الواقعة
  incidentDescription?: string;    // وصف الواقعة الفعلي المحرر
  previousActions?: string[];      // الإجراءات السابقة
  repetitionCount?: number;        // عدد مرات التكرار

  // Parent & Contact Information
  parentName?: string;             // اسم ولي الأمر
  parentPhone?: string;            // هاتف ولي الأمر
  parentRelationship?: string;     // صلة القرابة

  // School Metadata
  schoolName: string;              // اسم المدرسة
  emirate: string;                 // الإمارة
  academicYear?: string;           // العام الدراسي

  // Staff Reporter
  reportingStaffName?: string;     // اسم الموظف محرر الواقعة
  reportingStaffRole?: string;     // صفته الوظيفية
  reportingStaffOracle?: string;   // رقمه الوظيفي

  // Committee Meeting Link (Model 12)
  meetingId?: string;              // معرف اجتماع اللجنة
  meetingNumber?: string;          // رقم الجلسة / الاجتماع
  meetingDate?: string;            // تاريخ الاجتماع
  meetingDay?: string;             // يوم الاجتماع
  caseId?: string;                 // معرف الحالة المعروضة
  decisionNumber?: string;         // رقم قرار اللجنة
  committeeDecision?: string;      // نص قرار اللجنة المعتمد
  suspensionDaysCount?: number;    // عدد أيام الإيقاف المعتمدة
  suspensionStartDate?: string;    // تاريخ بدء الإيقاف
  suspensionEndDate?: string;      // تاريخ نهاية الإيقاف
  behaviorModificationProgram?: string; // برنامج تعديل السلوك

  // Model-specific payload (e.g. Model 6 action recommendations, Model 12 suspension days, Model 24 device details)
  specificData: Record<string, any>;

  // Workflow & Signatures
  status: OfficialDocumentStatus;
  signatures: DocumentSignature[];
  auditLog: DocumentAuditLogEntry[];

  issueDate: string;               // تاريخ تحرير المستند
  approvalDate?: string;           // تاريخ الاعتماد النهائي
  approvedBy?: string;             // اسم المعتمد النهائي
  isLocked?: boolean;              // إغلاق المستند لمنع التعديل بعد الاعتماد

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SMART GUIDANCE & COUNSELING SYSTEM (منظومة أعمال المرشد الأكاديمي والمهني)
// ============================================================================

export type GuidancePlanType = 'annual' | 'quarterly' | 'weekly';

export type GuidancePlanDomain =
  | 'أكاديمي'
  | 'مهني ومسارات'
  | 'وقائي وسلوكي'
  | 'اجتماعي ونفسي'
  | 'جودة الحياة والشراكات';

export type GuidancePlanStatus =
  | 'draft'        // مسودة
  | 'submitted'    // مقدمة للاعتماد
  | 'returned'     // معادة للتعديل
  | 'approved'     // معتمدة
  | 'in_progress'  // قيد التنفيذ
  | 'completed'    // مكتملة
  | 'archived';    // مؤرشفة

export interface GuidanceEvidenceItem {
  id: string;
  title: string;
  type: 'PDF' | 'Word' | 'Excel' | 'صورة' | 'رابط خارجي' | 'سجل داخلي';
  category: 'خطة' | 'احتياج واستبانة' | 'برنامج' | 'جلسة' | 'تواصل' | 'تطوير مهني' | 'شاهد إشرافي';
  fileName?: string;
  fileUrl?: string;
  description?: string;
  uploadedBy: string;
  uploadedAt: string;
  linkedEntityId?: string;
  version?: string;
}

export interface GuidancePlanRecord {
  id: string;
  schoolId: string;
  academicYear: string;            // e.g. '2026–2027'
  term: 'الفصل الأول' | 'الفصل الثاني' | 'الفصل الثالث' | 'العام الكامل';
  planType: GuidancePlanType;      // سنوية / فصلية / أسبوعية
  title: string;                   // عنوان الهدف أو محور الخطة
  domain: GuidancePlanDomain;      // المجال الإرشادي
  needSource: string;              // الاحتياج المرصود / المبرر
  linkedNeedId?: string;           // ربط بتحليل احتياج محدد
  objective: string;               // الهدف الإرشادي التفصيلي
  targetGroup: string;             // الفئة المستهدفة (مثال: الصف العاشر، الطلبة المتعثرون...)
  activities: string;              // الأنشطة والبرامج والجلسات المخططة
  responsiblePerson: string;       // المسؤول عن التنفيذ (أمير علي عبدالشاكر بكري)
  startDate: string;               // تاريخ البدء YYYY-MM-DD
  endDate: string;                 // تاريخ الانتهاء YYYY-MM-DD
  resources: string;               // الموارد والأدوات اللازمة
  kpiIndicator: string;            // مؤشر الأداء القياسي
  targetCount: number;             // العدد المستهدف (جلسات / برامج / مستفيدين)
  executedCount: number;           // العدد المنفذ فعلياً
  completionPercentage: number;    // نسبة الإنجاز 0 - 100
  resultsSummary: string;          // النتائج المتحققة والأثر
  improvementActions: string;      // إجراءات التحسين والتطوير
  status: GuidancePlanStatus;      // حالة الخطة
  evidences: GuidanceEvidenceItem[]; // الشواهد المرتبطة بالخطة
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NeedsAssessmentRecord {
  id: string;
  schoolId: string;
  academicYear: string;
  term: string;
  title: string;                   // عنوان الاستبانة أو تحليل الاحتياج
  category:
    | 'استبانة طلابية'
    | 'استبانة أولياء أمور'
    | 'استبانة معلمين'
    | 'تحليل نتائج أكاديمية'
    | 'تحليل مؤشرات الغياب والسلوك';
  targetGrades: string[];          // الصفوف المستهدفة (تاسع، عاشر، حادي عشر، ثاني عشر)
  participantsCount: number;       // حجم العينة أو عدد المستجيبين
  keyFindings: string;             // أبرز الاحتياجات والنتائج المرصودة
  priorityLevel: 'عالية' | 'متوسطة' | 'منخفضة';
  recommendedObjectives: string;   // الأهداف المقترحة لإدراجها في الخطة
  linkedPlanIds: string[];         // معرّفات الخطط المرتبطة
  status: 'قيد الجمع' | 'تم التحليل' | 'مدرج في الخطة';
  surveyLink?: string;
  evidences?: GuidanceEvidenceItem[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CounselorTaskRecord {
  id: string;
  schoolId: string;
  academicYear: string;
  title: string;
  taskType:
    | 'متابعة حالة'
    | 'متابعة إحالة'
    | 'جلسة مجدولة'
    | 'تنفيذ خطة'
    | 'تواصل ولي أمر'
    | 'شاهد زيارة إشرافية';
  priority: 'عادية' | 'عاجلة' | 'طارئة';
  dueDate: string;                 // YYYY-MM-DD
  studentId?: string;
  studentName?: string;
  grade?: string;
  section?: string;
  linkedPlanId?: string;
  linkedCaseId?: string;
  linkedReferralId?: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentReferralRecord {
  id: string;
  referralNumber: string;
  schoolId: string;
  academicYear: string;
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: string;
  section: string;
  referralSource:
    | 'معلم'
    | 'إدارة المدرسة'
    | 'سجل المخالفات'
    | 'سجل الغياب والتأخر'
    | 'ولي أمر'
    | 'مبادرة ذاتية';
  referredByName: string;
  referredByRole?: string;
  referralDate: string;
  reason: string;
  priorActions: string;
  urgency: 'عادية' | 'عاجلة' | 'طارئة';
  responseSlaHours: number;        // مثال: 120 ساعة (5 أيام) للعادية، 48 ساعة للعاجلة
  assignedCounselorName: string;
  status: 'new' | 'received' | 'studying' | 'support_plan' | 'specialized_referral' | 'closed';
  shareableRecommendations?: string; // التوصيات المهنية المصرح بمشاركتها مع المعلم المحيل
  outcomeSummary?: string;
  linkedPlanId?: string;
  linkedCaseId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PARENT COMMUNICATIONS CENTER & EDITABLE TEMPLATES (مركز مراسلات أولياء الأمور وإدارة القوالب)
// ============================================================================

export type ParentMessageType =
  | 'violation_notice'       // إشعار مخالفة سلوكية
  | 'parent_summon'          // استدعاء ولي الأمر
  | 'absence'                // إنذار غياب
  | 'morning_tardiness'      // تنبيه التأخر الصباحي
  | 'phone_confiscation'     // إشعار مصادرة هاتف
  | 'phone_return'           // إشعار إعادة هاتف
  | 'committee_action'       // إشعار إجراء صادر عن لجنة إدارة السلوك
  | 'meeting_reminder'       // تذكير بموعد اجتماع
  | 'uniform_noncompliance'  // إشعار عدم الالتزام بالزي المدرسي
  | 'positive_reinforcement' // رسالة شكر أو تعزيز إيجابي
  | 'general_notice'         // تنبيه عام
  | 'custom_message';        // رسالة عامة قابلة للتخصيص

export type ParentMessageDeliveryStatus =
  | 'not_sent'           // لم يُرسل بعد
  | 'whatsapp_opened'    // تم فتح واتساب
  | 'confirmed_sent'     // تم تأكيد الإرسال يدوياً
  | 'failed'             // تعذر الإرسال
  | 'needs_followup';    // يحتاج متابعة

export interface EditableMessageTemplateVersion {
  version: number;
  templateName: string;
  category: ParentMessageType;
  body: string;
  requiredGuardianActionDefault: string;
  updatedBy: string;
  updatedByUid?: string;
  updatedAt: string;
  changeNote?: string;
}

export interface EditableMessageTemplate {
  templateId: string;
  schoolId: string;
  templateName: string;
  category: ParentMessageType;
  body: string;
  requiredGuardianActionDefault: string;
  variables: string[];
  isDefault: boolean;
  isActive: boolean;
  isArchived?: boolean;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  history: EditableMessageTemplateVersion[];
}

export interface ParentMessageItem {
  messageId: string;
  campaignId: string;
  schoolId: string;
  academicYear: string;

  // Student & Historical Snapshot
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: string;
  track: string;
  section: string;

  // Guardian Contact Verification
  guardianContactId: string;
  guardianName: string;
  guardianRelation: string;
  recipientPhoneRaw: string;
  recipientPhoneE164: string;
  isValidPhone: boolean;

  // Linked Records (Violation / Absence / Tardiness)
  violationId?: string;
  violationDescription?: string;
  incidentDate?: string;
  approvedAction?: string;
  requiredGuardianAction?: string;

  // Message Content & Customization
  messageType: ParentMessageType;
  templateId: string;
  templateTitle: string;
  isIndividuallyEdited: boolean;
  customTextOverride?: string;
  finalMessageText: string;
  missingFieldsWarnings: string[];

  // Delivery & Audit Trail
  status: ParentMessageDeliveryStatus;
  createdByUid: string;
  createdByName: string;
  createdAt: string;

  whatsappOpenedAt?: string;
  whatsappOpenedByUid?: string;
  whatsappOpenedByName?: string;

  confirmedSentAt?: string;
  confirmedByUid?: string;
  confirmedByName?: string;

  failureReason?: string;
  followUpNote?: string;
  resendCount?: number;
  updatedAt: string;
}

export interface ParentMessageCampaign {
  campaignId: string;
  schoolId: string;
  academicYear: string;
  title: string;
  messageType: ParentMessageType;
  templateId: string;
  templateBody: string;
  requiredGuardianActionDefault: string;
  status: 'draft' | 'in_progress' | 'completed';
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  items: ParentMessageItem[];
}

// ============================================================================
// INTERNAL COUNSELOR NOTIFICATION SYSTEM (نظام الإشعارات الداخلية للمرشد المدرسي)
// ============================================================================

export type CounselorNotificationType =
  | 'warning_form_draft'
  | 'warning_form_approval'
  | 'new_infraction'
  | 'follow_up_due';

export interface CounselorNotification {
  id: string;
  dedupeKey?: string;
  type: CounselorNotificationType;
  title: string;
  message: string;
  studentId?: string;
  studentName?: string;
  studentNumber?: string;
  gradeSection?: string;
  formId?: string;
  formTab?: string;
  violationId?: string;
  targetTab?: string;
  createdAt: string;
  timestamp: number;
  isUrgent?: boolean;
}

// ============================================================================
// GMAIL OAUTH 2.0 & AUTOMATED GUARDIAN NOTIFICATION SYSTEM (نظام الربط التلقائي مع Gmail)
// ============================================================================

export type GmailAuthorizationStatus =
  | 'disconnected'             // غير مرتبط
  | 'authorized_pending_test'  // مفوّض بانتظار اختبار الإرسال الحقيقي
  | 'connected_verified'       // متصل ومفعّل بعد اختبار ناجح
  | 'token_expired_or_revoked' // انتهى التفويض أو تم سحبه
  | 'quota_paused';            // موقوف مؤقتاً لبلوغ الحد اليومي

export type GmailNotificationEventType =
  | 'tardiness_notice'  // إشعار التأخير الصباحي بعد اعتماد الواقعة
  | 'absence_notice'    // إشعار الغياب بعد اعتماد الواقعة
  | 'violation_notice'; // إشعار المخالفة السلوكية بعد مراجعة المسؤول واعتماد الإرسال

export type GmailQueueDeliveryState =
  | 'pending'           // انتظار
  | 'processing'        // معالجة
  | 'accepted_by_gmail' // قبول من Gmail (لا يعني تأكيد التسليم النهائي لصندوق الوارد)
  | 'failed'            // فشل
  | 'uncertain';        // حالة غير مؤكدة (انقطع الاتصال بعد إرسال الطلب لـ Gmail)

export interface GmailEmailTemplateConfig {
  id: GmailNotificationEventType;
  titleAr: string;
  subjectTemplate: string;
  bodyTemplate: string;
  updatedAt: string;
  updatedBy: string;
}

export interface GmailConnectionConfig {
  schoolId: string;
  connectedEmail: string | null;
  authorizationStatus: GmailAuthorizationStatus;
  grantedScopes: string[];
  authorizedAt: string | null;
  authorizedByUid: string | null;
  authorizedByName: string | null;
  secretManagerConfigured: boolean;
  secretResourcePath?: string;
  // Testing & Staged Activation Gates
  isVerifiedByRealTest: boolean;
  lastTestSuccessAt: string | null;
  lastTestRecipient: string | null;
  lastTestMessageId: string | null;
  isBatchTestVerified: boolean;
  lastBatchTestSuccessAt: string | null;
  lastBatchTestCount: number;
  adminApprovedProductionSend: boolean;
  adminApprovedByName: string | null;
  adminApprovedAt: string | null;
  // Automated Sending Controls
  autoSendEnabled: boolean;
  autoSendTardinessOnApprove: boolean;
  autoSendAbsenceOnApprove: boolean;
  requireAdminApprovalForViolations: boolean; // Always true per security policy
  serviceActivatedAt: string | null;          // Cutoff timestamp: never auto-send for older incidents
  // Quota & Rate Limit Controls
  dailyLimitMax: number;
  dailySentCount: number;
  dailyCounterDate: string;                   // YYYY-MM-DD
  remainingDailyQuota?: number;               // Live MailApp.getRemainingDailyQuota() reported by Apps Script
  appsScriptWorkerStatus?: string;            // Last worker state from Apps Script time-driven trigger
  appsScriptLastHeartbeatAt?: string;         // Last heartbeat timestamp from Apps Script
  bridgeSpreadsheetUrl?: string;              // Google Sheets intermediate bridge URL
  rateLimitDelayMs: number;
  isQuotaReachedAlert: boolean;
  // Alerts & Error Diagnostics
  adminAlertMessage: string | null;
  adminAlertType: 'none' | 'token_revoked' | 'quota_reached' | 'config_error' | 'uncertain_state';
  oauthPublishingMode: 'testing' | 'in_production';
  updatedAt: string;
}

export interface GmailQueueRecord {
  id: string;                                 // Deterministic idempotencyKey
  idempotencyKey: string;                     // ${schoolId}_${notificationType}_${incidentId}_${studentId}_${recipientEmail}
  schoolId: string;
  notificationType: GmailNotificationEventType;
  state: GmailQueueDeliveryState;
  // Student immutable link
  studentId: string;
  studentNumber: string;
  studentName: string;
  grade: string;
  section: string;
  // Incident details (sanitized, no sensitive psychological notes)
  incidentId: string;
  incidentDate: string;
  incidentTime?: string;
  incidentTitle: string;
  incidentDegree?: string;
  actionTaken?: string;
  // Guardian verification
  guardianName: string;
  guardianRelation: string;
  recipientEmail: string;
  isAuthorizedGuardian: boolean;
  // Rendered isolated email content
  subject: string;
  bodyText: string;
  rfc822MessageId: string;
  // Approval & Audit metadata
  approvedByUid: string;
  approvedByName: string;
  approvedByRole: string;
  approvedAt: string;
  isAdminReviewedViolation?: boolean;
  // Execution & Gmail API response tracking
  attemptCount: number;
  lastAttemptId?: string;
  lastAttemptAt?: string;
  gmailMessageId?: string;
  gmailThreadId?: string;
  acceptedByGmailAt?: string;
  failureReason?: string;
  uncertainReason?: string;
  retriedByUid?: string;
  retriedByName?: string;
  retriedAt?: string;
  createdAt: string;
  updatedAt: string;
}



