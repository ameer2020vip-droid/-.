import * as XLSX from 'xlsx';
import { Student, GradeLevel, SectionName, AcademicTrack } from '../types';

/**
 * Normalizes an Arabic or English column header for robust matching.
 * Handles:
 * - Regular and redundant whitespace.
 * - Non-breaking space (NBSP) and zero-width spaces.
 * - Arabic Tashkeel (diacritics: Fatha, Damma, Kasra, Tanween, Sukun, Shadda).
 * - Arabic Tatweel / Kashida (\u0640).
 * - Alif variants: أ, إ, آ, ء -> ا
 * - Ya variants: ى -> ي
 * - Ta Marbuta & Ha: ة -> ه for flexible matching (e.g. المدرسه vs المدرسة)
 * - Line breaks (\r, \n) and tabs
 */
export function normalizeHeader(header: string): string {
  if (!header) return '';
  let str = String(header);

  // 1. Replace non-breaking spaces, zero-width chars, line breaks and tabs with normal space
  str = str.replace(/[\u00A0\u200B\u200C\u200D\r\n\t]+/g, ' ');

  // 2. Remove Arabic diacritics (Tashkeel)
  str = str.replace(/[\u064B-\u065F\u0670\u0652\u0651]/g, '');

  // 3. Remove Tatweel (Kashida)
  str = str.replace(/\u0640+/g, '');

  // 4. Normalize Alif variations (أ, إ, آ -> ا)
  str = str.replace(/[أإآ]/g, 'ا');

  // 5. Normalize Ya / Alif Maqsura (ى -> ي)
  str = str.replace(/ى/g, 'ي');

  // 6. Normalize Ta Marbuta (ة -> ه) for tolerant dictionary comparison
  str = str.replace(/ة/g, 'ه');

  // 7. Collapse multiple spaces and trim
  str = str.replace(/\s+/g, ' ').trim().toLowerCase();

  return str;
}

/**
 * Standard Al Manhal & UAE Ministry of Education field identifiers
 */
export type AlManhalFieldKey =
  | 'studentId'
  | 'nameAr'
  | 'nameEn'
  | 'nationalId'
  | 'gender'
  | 'nationality'
  | 'citizenshipStatus'
  | 'birthDate'
  | 'birthPlace'
  | 'age'
  | 'country'
  | 'emirate'
  | 'city'
  | 'district'
  | 'neighborhood'
  | 'streetName'
  | 'latitude'
  | 'longitude'
  | 'isDeterminedPerson'
  | 'transportType'
  | 'email'
  | 'phone'
  | 'religion'
  | 'section'
  | 'track'
  | 'grade'
  | 'enrollmentType'
  | 'enrollmentDate'
  | 'parentsStatus'
  // Legacy or administrative fields
  | 'schoolId'
  | 'schoolNameAr'
  | 'schoolNameEn'
  | 'schoolEmirate'
  | 'council'
  | 'schoolComplex'
  | 'sector';

export interface FieldDefinition {
  key: AlManhalFieldKey;
  labelAr: string;
  expectedHeaders: string[]; // Normalized canonical phrases
  isRequired: boolean;
  isEssentialForHeaderRow: boolean; // Used to identify the header row
}

export const ALMANHAL_FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    key: 'studentId',
    labelAr: 'رقم الطالب',
    expectedHeaders: ['رقم الطالب', 'الرقم الطلابي', 'رقم القيد', 'studentid', 'student id', 'student number', 'id'],
    isRequired: true,
    isEssentialForHeaderRow: true,
  },
  {
    key: 'nameAr',
    labelAr: 'الاسم بالعربية',
    expectedHeaders: ['الاسم بالعربيه', 'الاسم بالعربية', 'اسم الطالب بالعربيه', 'اسم الطالب بالعربية', 'اسم الطالب', 'الاسم'],
    isRequired: true,
    isEssentialForHeaderRow: true,
  },
  {
    key: 'nameEn',
    labelAr: 'الاسم بالانجليزية',
    expectedHeaders: ['الاسم بالانجليزيه', 'الاسم بالانجليزية', 'student name en', 'english name', 'name en'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'nationalId',
    labelAr: 'الرقم الوطني',
    expectedHeaders: ['الرقم الوطني', 'بطاقة الهوية', 'رقم الهوية', 'الهوية الإماراتية', 'national id', 'emirates id', 'id number'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'gender',
    labelAr: 'الجنس',
    expectedHeaders: ['الجنس', 'النوع', 'gender', 'sex'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'nationality',
    labelAr: 'الجنسية',
    expectedHeaders: ['الجنسيه', 'الجنسية', 'nationality'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'citizenshipStatus',
    labelAr: 'حالة المواطنة',
    expectedHeaders: ['حالة المواطنة', 'حاله المواطنه', 'المواطنة', 'citizenship status', 'citizenship'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'birthDate',
    labelAr: 'تاريخ الميلاد',
    expectedHeaders: ['تاريخ الميلاد', 'الميلاد', 'date of birth', 'dob', 'birth date'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'birthPlace',
    labelAr: 'مكان الميلاد',
    expectedHeaders: ['مكان الميلاد', 'محل الميلاد', 'place of birth', 'birth place'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'age',
    labelAr: 'العمر حتى تاريخه',
    expectedHeaders: ['العمر حتى تاريخه', 'العمر', 'سن الطالب', 'age'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'country',
    labelAr: 'البلد',
    expectedHeaders: ['البلد', 'الدولة', 'country'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'emirate',
    labelAr: 'الإمارة',
    expectedHeaders: ['الاماره', 'الإمارة', 'emirate', 'الاماره التابع لها المدرسه', 'الإمارة التابع لها المدرسة'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'city',
    labelAr: 'المدينة',
    expectedHeaders: ['المدينه', 'المدينة', 'city'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'district',
    labelAr: 'منطقة/قطاع',
    expectedHeaders: ['منطقه/قطاع', 'منطقة/قطاع', 'المنطقه', 'المنطقة', 'منطقة', 'منطقه', 'district', 'suburb'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'neighborhood',
    labelAr: 'حوض/حي',
    expectedHeaders: ['حوض/حي', 'الحوض', 'الحي', 'neighborhood', 'zone'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'streetName',
    labelAr: 'اسم الشارع',
    expectedHeaders: ['اسم الشارع', 'الشارع', 'street', 'street name'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'latitude',
    labelAr: 'خط العرض',
    expectedHeaders: ['خط العرض', 'latitude', 'lat'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'longitude',
    labelAr: 'خط الطول',
    expectedHeaders: ['خط الطول', 'longitude', 'lng', 'long'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'isDeterminedPerson',
    labelAr: 'من أصحاب الهمم',
    expectedHeaders: ['من اصحاب الهمم', 'من أصحاب الهمم', 'اصحاب الهمم', 'أصحاب الهمم', 'ذوي الاحتياجات', 'special needs', 'determined'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'transportType',
    labelAr: 'نوع المواصلات',
    expectedHeaders: ['نوع المواصلات', 'المواصلات', 'النقل المدرسي', 'transport', 'transportation'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'email',
    labelAr: 'البريد',
    expectedHeaders: ['البريد', 'البريد الالكتروني', 'البريد الإلكتروني', 'ايميل الطالب', 'email', 'student email'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'phone',
    labelAr: 'رقم الهاتف',
    expectedHeaders: ['رقم الهاتف', 'الهاتف', 'رقم هاتف ولي الامر', 'هاتف ولي الامر', 'رقم الموبايل', 'رقم التواصل', 'phone', 'mobile'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'religion',
    labelAr: 'الديانة',
    expectedHeaders: ['الديانه', 'الديانة', 'religion'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'section',
    labelAr: 'الشعبة',
    expectedHeaders: ['الشعبه', 'الشعبة', 'الفصل', 'رقم الشعبه', 'رقم الشعبة', 'section', 'sec'],
    isRequired: true,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'track',
    labelAr: 'المسار الأكاديمي',
    expectedHeaders: [
      'المسار',
      'المسار التعليمي',
      'المسار الاكاديمي',
      'المسار الأكاديمي',
      'نوع المسار',
      'الفرع',
      'البرنامج',
      'البرنامج التعليمي',
      'الخطة الدراسية',
      'track',
      'stream',
      'academic track',
      'education track',
    ],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'grade',
    labelAr: 'الصف الدراسي',
    expectedHeaders: ['الصف الدراسي', 'الصف', 'المرحله الدراسيه', 'المرحلة الدراسية', 'grade', 'class'],
    isRequired: true,
    isEssentialForHeaderRow: true,
  },
  {
    key: 'enrollmentType',
    labelAr: 'نوع الالتحاق',
    expectedHeaders: ['نوع الالتحاق', 'حالة القيد', 'نوع القيد', 'enrollment type'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'enrollmentDate',
    labelAr: 'تاريخ الالتحاق',
    expectedHeaders: ['تاريخ الالتحاق', 'تاريخ القيد', 'تاريخ التسجيل', 'enrollment date'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'parentsStatus',
    labelAr: 'حالة الوالدين',
    expectedHeaders: ['حالة الوالدين', 'حاله الوالدين', 'الحالة الاجتماعية للوالدين', 'parents status'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  // Optional School context fields
  {
    key: 'schoolId',
    labelAr: 'رقم المدرسة',
    expectedHeaders: ['رقم المدرسه', 'رقم المدرسة', 'كود المدرسه', 'كود المدرسة', 'schoolid', 'school id'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'schoolNameAr',
    labelAr: 'اسم المدرسه بالعربية',
    expectedHeaders: ['اسم المدرسه بالعربيه', 'اسم المدرسة بالعربية', 'اسم المدرسه', 'اسم المدرسة', 'school name ar'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'schoolNameEn',
    labelAr: 'اسم المدرسه بالانجليزية',
    expectedHeaders: ['اسم المدرسه بالانجليزيه', 'اسم المدرسة بالانجليزية', 'school name en'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'council',
    labelAr: 'مجلس',
    expectedHeaders: ['مجلس', 'المجلس', 'council'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'schoolComplex',
    labelAr: 'مجمع مدرسي',
    expectedHeaders: ['مجمع مدرسي', 'المجمع المدرسي', 'school complex'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
  {
    key: 'sector',
    labelAr: 'القطاع التعليمي',
    expectedHeaders: ['القطاع التعليمي', 'قطاع تعليمي', 'نطاق مدرسي', 'القطاع المدرسي', 'النطاق المدرسي', 'school sector'],
    isRequired: false,
    isEssentialForHeaderRow: false,
  },
];

export interface ColumnMappingStatus {
  fieldKey: AlManhalFieldKey;
  labelAr: string;
  excelColumnName: string;
  excelColumnIndex: number; // -1 if not found
  sampleValue: string;
  status: 'valid' | 'warning' | 'missing';
  statusTextAr: string;
  isRequired: boolean;
}

export interface SheetAnalysis {
  sheetName: string;
  headerRowIndex: number; // -1 if not found
  hasAllEssentialHeaders: boolean;
  score: number;
}

export interface ParseResult {
  validStudents: Student[];
  invalidRows: { rowNumber: number; rawData: any; reason: string }[];
  mappingStatuses: ColumnMappingStatus[];
  headerRowIndex: number;
  rawHeaders: string[];
  sheetNames: string[];
  selectedSheetName: string;
  suggestedSheetName?: string;
  totalRawRowsScanned: number;
  importBatchId: string;
}

/**
 * Canonical normalizer for Student Number (رقم الطالب / SIS ID).
 * - Converts Arabic-Indic numerals (٠-٩) to standard ASCII (0-9)
 * - Removes slashes, backslashes, leading/trailing whitespace, and invisible Unicode chars
 * - Preserves alphanumeric SIS IDs while guaranteeing exact string uniformity
 */
export function normalizeStudentNumber(val: any): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  // Convert Arabic-Indic numerals
  str = str
    .replace(/٠/g, '0')
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/٥/g, '5')
    .replace(/٦/g, '6')
    .replace(/٧/g, '7')
    .replace(/٨/g, '8')
    .replace(/٩/g, '9');
  // Strip slashes, backslashes, spaces, and non-printable zero-width characters
  str = str.replace(/[\/\\]/g, '-').replace(/[\s\u200B-\u200D\uFEFF\t\r\n]+/g, '');
  return str;
}

/**
 * Parses academic Grade according to UAE K-12 Al Manhal standard.
 * Evaluates grades in descending order (12 -> 11 -> 10 -> 9) to prevent digit cross-matching.
 */
export function normalizeStrictGrade(val: any): GradeLevel | null {
  if (!val) return null;
  let s = String(val).trim().toLowerCase();

  // Convert Arabic-Indic numerals
  s = s
    .replace(/١٢/g, '12')
    .replace(/١١/g, '11')
    .replace(/١٠/g, '10')
    .replace(/٩/g, '9');

  const norm = normalizeHeader(s);

  // Exclude administrative headings mistakenly placed in grade
  if (
    norm.includes('مجلس') ||
    norm.includes('مكتب') ||
    norm.includes('قطاع') ||
    norm.includes('مجمع') ||
    norm.includes('الشارقه') ||
    norm.includes('الفجيره') ||
    norm.includes('وزاره') ||
    norm.includes('تقرير') ||
    norm.includes('بيانات')
  ) {
    return null;
  }

  // 12 (ثاني عشر)
  if (
    norm.includes('ثاني عشر') ||
    norm.includes('12') ||
    norm.includes('g12') ||
    norm.includes('grade 12') ||
    norm.includes('صف 12')
  ) {
    return 'ثاني عشر';
  }

  // 11 (حادي عشر)
  if (
    norm.includes('حادي عشر') ||
    norm.includes('11') ||
    norm.includes('g11') ||
    norm.includes('grade 11') ||
    norm.includes('صف 11')
  ) {
    return 'حادي عشر';
  }

  // 10 (عاشر)
  if (
    norm.includes('عاشر') ||
    norm.includes('10') ||
    norm.includes('g10') ||
    norm.includes('grade 10') ||
    norm.includes('صف 10')
  ) {
    return 'عاشر';
  }

  // 9 (تاسع)
  if (
    norm.includes('تاسع') ||
    norm.includes('9') ||
    norm.includes('g9') ||
    norm.includes('grade 9') ||
    norm.includes('صف 9')
  ) {
    return 'تاسع';
  }

  return null;
}

/**
 * Parses academic Section strictly (1, 2, 3, 4).
 * COMPLETELY DECOUPLED FROM TRACK AND GRADE.
 * Strips out any track keywords (e.g. 'متقدم', 'عام', 'advanced', 'general') and grade prefixes
 * so that Section is extracted strictly on its own merits.
 */
export function normalizeStrictSection(val: any): SectionName {
  if (!val) return '1';
  let s = String(val).trim().toLowerCase();

  // Convert all Arabic-Indic numerals
  s = s
    .replace(/٠/g, '0')
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/٥/g, '5')
    .replace(/٦/g, '6')
    .replace(/٧/g, '7')
    .replace(/٨/g, '8')
    .replace(/٩/g, '9');

  // 1. Strip all track words so they cannot interfere with section parsing
  s = s.replace(/(المسار\s*المتقدم|المسار\s*العام|المسار\s*النخبة|المسار\s*التطبيقي|متقدم|عام|نخبة|تطبيقي|advanced|general|elite|applied|adv|gen)/gi, '').trim();

  // 2. Strip grade prefixes like '10/', '11/', '12/', '9/', 'G10-', 'الصف العاشر'
  s = s.replace(/^(صف|الصف|grade|gr|g)?\s*(12|11|10|9|تاسع|عاشر|حادي عشر|ثاني عشر)[\s\/\-_:]+/i, '').trim();

  // 3. Check for explicit pattern with keyword like "شعبة 5" or "section 5"
  const secKeywordMatch = s.match(/(?:شعبة|فصل|sec|section)[\s:-]*([0-9]{1,2})/i);
  if (secKeywordMatch) {
    return secKeywordMatch[1] as SectionName;
  }

  // 4. Check for pattern like '10/5' or '9/2' -> take the section after the slash/dash
  const slashMatch = s.match(/\b(?:9|10|11|12)\s*[\/\-_]\s*([0-9]{1,2})\b/);
  if (slashMatch) {
    return slashMatch[1] as SectionName;
  }

  // 5. Letter sections (أ = 1, ب = 2, ج = 3, د = 4, هـ/ه = 5, و = 6, ز = 7, ح = 8, ط = 9, ي = 10)
  if (/\b(شعبة|فصل|sec|section)?\s*(10|ي|j)\b/i.test(s) || s === '10' || s === 'ي' || s === 'j') return '10';
  if (/\b(شعبة|فصل|sec|section)?\s*(9|ط|i)\b/i.test(s) || s === '9' || s === 'ط' || s === 'i') return '9';
  if (/\b(شعبة|فصل|sec|section)?\s*(8|ح|h)\b/i.test(s) || s === '8' || s === 'ح' || s === 'h') return '8';
  if (/\b(شعبة|فصل|sec|section)?\s*(7|ز|g)\b/i.test(s) || s === '7' || s === 'ز' || s === 'g') return '7';
  if (/\b(شعبة|فصل|sec|section)?\s*(6|و|f)\b/i.test(s) || s === '6' || s === 'و' || s === 'f') return '6';
  if (/\b(شعبة|فصل|sec|section)?\s*(5|هـ|ه|e)\b/i.test(s) || s === '5' || s === 'هـ' || s === 'ه' || s === 'e') return '5';
  if (/\b(شعبة|فصل|sec|section)?\s*(4|د|d)\b/i.test(s) || s === '4' || s === 'د' || s === 'd') return '4';
  if (/\b(شعبة|فصل|sec|section)?\s*(3|ج|c)\b/i.test(s) || s === '3' || s === 'ج' || s === 'c') return '3';
  if (/\b(شعبة|فصل|sec|section)?\s*(2|ب|b)\b/i.test(s) || s === '2' || s === 'ب' || s === 'b') return '2';
  if (/\b(شعبة|فصل|sec|section)?\s*(1|أ|a)\b/i.test(s) || s === '1' || s === 'أ' || s === 'a') return '1';

  // 6. Look for any isolated number
  const isolated = s.match(/\b([0-9]{1,2})\b/);
  if (isolated) {
    return isolated[1] as SectionName;
  }

  // 7. Look for trailing digits
  const digits = s.match(/[0-9]+/g);
  if (digits && digits.length > 0) {
    return digits[digits.length - 1] as SectionName;
  }

  return '1';
}

/**
 * Parses academic Track from an explicit track column.
 * COMPLETELY DECOUPLED FROM SECTION NUMBER.
 * Section numbers (1, 2, 3, 4) NEVER determine whether a track is 'متقدم' or 'عام'.
 * Returns 'متقدم' | 'عام' if recognized, or null if empty/unrecognized.
 */
export function parseExplicitTrack(val: any): AcademicTrack | null {
  if (!val) return null;
  const s = String(val).trim().toLowerCase();
  if (!s) return null;

  const norm = normalizeHeader(s);

  // Advanced / متقدم keywords
  if (
    norm.includes('متقدم') ||
    norm.includes('advanced') ||
    norm.includes('adv') ||
    norm.includes('علمي') ||
    norm.includes('نخبه') ||
    norm.includes('نخبة') ||
    norm.includes('elite') ||
    norm.includes('asp')
  ) {
    return 'متقدم';
  }

  // General / عام keywords
  if (
    norm.includes('عام') ||
    norm.includes('general') ||
    norm.includes('gen') ||
    norm.includes('ادبي') ||
    norm.includes('أدبي') ||
    norm.includes('تطبيقي') ||
    norm.includes('applied')
  ) {
    return 'عام';
  }

  return null;
}

/**
 * Fallback extraction of track keyword from Section or Grade string.
 * Used ONLY when explicit Track column is empty or missing.
 * CRITICAL RULE: Only searches for explicit text words ('متقدم', 'عام').
 * NEVER assumes or infers track from just a section digit (1, 2, 3, 4)!
 */
export function extractTrackFromContext(sectionVal: any, gradeVal: any): AcademicTrack | null {
  const combined = `${sectionVal || ''} ${gradeVal || ''}`.toLowerCase();
  const norm = normalizeHeader(combined);

  if (
    norm.includes('متقدم') ||
    norm.includes('advanced') ||
    norm.includes('adv') ||
    norm.includes('علمي') ||
    norm.includes('نخبه') ||
    norm.includes('نخبة') ||
    norm.includes('elite')
  ) {
    return 'متقدم';
  }

  if (
    norm.includes('عام') ||
    norm.includes('general') ||
    norm.includes('gen') ||
    norm.includes('ادبي') ||
    norm.includes('تطبيقي')
  ) {
    return 'عام';
  }

  return null;
}

/**
 * Strict Track Resolver:
 * 1. Primary: Explicit Track column value (100% independent of section).
 * 2. Fallback: Explicit track keyword in section/grade text ONLY if Track column is missing/empty.
 * 3. Never guess: If no explicit keyword exists, returns 'يحتاج مراجعة' for manual audit.
 */
export function resolveStudentTrack(rawTrack: any, rawSection: any, rawGrade: any): AcademicTrack {
  const explicit = parseExplicitTrack(rawTrack);
  if (explicit) return explicit;

  const fallback = extractTrackFromContext(rawSection, rawGrade);
  if (fallback) return fallback;

  return 'يحتاج مراجعة';
}

export function normalizeStrictTrack(val: any): AcademicTrack {
  const explicit = parseExplicitTrack(val);
  return explicit || 'عام';
}

/**
 * Analyzes an individual sheet matrix to find the header row within the first 35 rows.
 * Detects if the row contains Student ID and Name along with any identifying student field (Grade, National ID, Section, etc.)
 */
export function findHeaderRowInSheet(matrix: any[][]): {
  headerRowIndex: number;
  hasAllEssentials: boolean;
  headers: string[];
} {
  const maxRowsToCheck = Math.min(35, matrix.length);

  for (let r = 0; r < maxRowsToCheck; r++) {
    const row = matrix[r];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const normalizedCells = row.map((cell) => normalizeHeader(String(cell ?? '')));

    const hasStudentId = normalizedCells.some(
      (c) =>
        c === 'رقم الطالب' ||
        c === 'الرقم الطلابي' ||
        c === 'رقم القيد' ||
        c === 'studentid' ||
        c === 'student id' ||
        c === 'student number' ||
        c === 'id'
    );

    const hasNameAr = normalizedCells.some(
      (c) =>
        c === 'الاسم بالعربيه' ||
        c === 'الاسم بالعربية' ||
        c === 'اسم الطالب بالعربيه' ||
        c === 'اسم الطالب بالعربية' ||
        c === 'اسم الطالب' ||
        c === 'الاسم'
    );

    const hasGrade = normalizedCells.some(
      (c) => c === 'الصف الدراسي' || c === 'الصف' || c === 'المرحله الدراسيه' || c === 'grade' || c === 'class'
    );

    const hasNationalId = normalizedCells.some(
      (c) => c === 'الرقم الوطني' || c === 'بطاقة الهوية' || c === 'رقم الهوية' || c === 'الهوية الإماراتية' || c === 'national id'
    );

    const hasSection = normalizedCells.some(
      (c) => c === 'الشعبه' || c === 'الشعبة' || c === 'الفصل' || c === 'section'
    );

    const hasBirthDate = normalizedCells.some(
      (c) => c === 'تاريخ الميلاد' || c === 'الميلاد' || c === 'date of birth' || c === 'dob'
    );

    const hasPhone = normalizedCells.some(
      (c) => c === 'رقم الهاتف' || c === 'الهاتف' || c === 'phone' || c === 'mobile'
    );

    // If row contains Student ID and Name, AND at least one other standard student attribute -> Header row found!
    if (hasStudentId && hasNameAr && (hasGrade || hasNationalId || hasSection || hasBirthDate || hasPhone)) {
      return {
        headerRowIndex: r,
        hasAllEssentials: true,
        headers: row.map((c) => String(c ?? '').trim()),
      };
    }
  }

  // Fallback: If hasStudentId and hasNameAr anywhere
  for (let r = 0; r < maxRowsToCheck; r++) {
    const row = matrix[r];
    if (!row || !Array.isArray(row)) continue;
    const normalizedCells = row.map((cell) => normalizeHeader(String(cell ?? '')));
    const hasStudentId = normalizedCells.some((c) => c.includes('طالب') || c.includes('student'));
    const hasNameAr = normalizedCells.some((c) => c.includes('اسم') || c.includes('name'));
    if (hasStudentId && hasNameAr) {
      return {
        headerRowIndex: r,
        hasAllEssentials: true,
        headers: row.map((c) => String(c ?? '').trim()),
      };
    }
  }

  return {
    headerRowIndex: -1,
    hasAllEssentials: false,
    headers: [],
  };
}

/**
 * Matches raw headers with Al Manhal / Ministry canonical field definitions
 */
export function buildColumnMappings(
  rawHeaders: string[],
  firstDataRow?: any[]
): ColumnMappingStatus[] {
  const normalizedHeaders = rawHeaders.map((h) => normalizeHeader(h));
  const claimedColIndices = new Set<number>();

  const results: ColumnMappingStatus[] = [];

  // Pass 1: Exact matches (Highest priority)
  for (const def of ALMANHAL_FIELD_DEFINITIONS) {
    let matchedColIndex = -1;
    let matchedHeaderName = '';

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const normH = normalizedHeaders[i];
      if (!normH) continue;
      if (claimedColIndices.has(i)) continue;

      const exactMatch = def.expectedHeaders.some((exp) => normH === normalizeHeader(exp));
      if (exactMatch) {
        matchedColIndex = i;
        matchedHeaderName = rawHeaders[i];
        claimedColIndices.add(i);
        break;
      }
    }

    results.push({
      fieldKey: def.key,
      labelAr: def.labelAr,
      excelColumnName: matchedHeaderName,
      excelColumnIndex: matchedColIndex,
      sampleValue: '',
      status: matchedColIndex >= 0 ? 'valid' : def.isRequired ? 'missing' : 'warning',
      statusTextAr:
        matchedColIndex >= 0
          ? `تم الربط (${matchedHeaderName})`
          : def.isRequired
          ? 'مطلوب إلزامي ولم يتم العثور عليه'
          : 'اختياري (غير محدد)',
      isRequired: def.isRequired,
    });
  }

  // Pass 2: Fallback partial matches for unmapped fields
  for (let mIdx = 0; mIdx < results.length; mIdx++) {
    const item = results[mIdx];
    if (item.excelColumnIndex >= 0) continue;

    const def = ALMANHAL_FIELD_DEFINITIONS[mIdx];

    for (let i = 0; i < normalizedHeaders.length; i++) {
      const normH = normalizedHeaders[i];
      if (!normH) continue;
      if (claimedColIndices.has(i)) continue;

      // Special guard: sector should never match district headers containing 'منطق' or 'suburb'
      if (def.key === 'sector' && (normH.includes('منطق') || normH.includes('suburb'))) {
        continue;
      }

      const partialMatch = def.expectedHeaders.some((exp) => {
        const normExp = normalizeHeader(exp);
        return normExp.length >= 3 && normH.includes(normExp);
      });

      if (partialMatch) {
        item.excelColumnIndex = i;
        item.excelColumnName = rawHeaders[i];
        item.status = 'valid';
        item.statusTextAr = `تم الربط تقريبياً (${rawHeaders[i]})`;
        claimedColIndices.add(i);
        break;
      }
    }
  }

  // Populate sample values
  for (const item of results) {
    if (item.excelColumnIndex >= 0 && firstDataRow && firstDataRow[item.excelColumnIndex] !== undefined) {
      item.sampleValue = String(firstDataRow[item.excelColumnIndex] ?? '').trim();
    }
  }

  return results;
}

/**
 * Parses raw phone string, splitting multiple phones separated by ;, / or spaces
 */
export function parsePhoneNumbers(raw: string): { primary: string; secondary?: string } {
  if (!raw) return { primary: '' };
  // Split multiple phone numbers by semicolons, commas, slashes
  const parts = String(raw)
    .split(/[;,/]+/)
    .map((p) => p.replace(/[^\d+]/g, '').trim())
    .filter((p) => p.length >= 7 && p !== '0500000000' && p !== '050000000');

  const primary = parts[0] || '';
  const secondary = parts[1] || undefined;
  return { primary, secondary };
}

/**
 * Shared parser core that processes a 2D matrix of sheet/text rows
 */
export function parseAlManhalFromMatrix(
  matrix: any[][],
  options?: {
    sheetNames?: string[];
    selectedSheetName?: string;
    suggestedSheetName?: string;
    currentUserSchoolId?: string;
    customColumnIndices?: Partial<Record<AlManhalFieldKey, number>>;
  }
): ParseResult {
  const headerCheck = findHeaderRowInSheet(matrix);
  const bestHeaderRowIndex = headerCheck.headerRowIndex;

  if (bestHeaderRowIndex === -1 || !headerCheck.hasAllEssentials) {
    throw new Error(
      'تعذر العثور على صف عناوين بيانات الطلبة. تأكد من احتواء الملف أو النص على عمود (رقم الطالب) و(الاسم بالعربية) و(الصف الدراسي).'
    );
  }

  const rawHeaders = headerCheck.headers;

  // Find first non-empty data row after header for sample extraction
  let firstDataRow: any[] | undefined;
  for (let r = bestHeaderRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (row && row.some((c: any) => String(c ?? '').trim().length > 0)) {
      firstDataRow = row;
      break;
    }
  }

  // Build column mappings
  const mappingStatuses = buildColumnMappings(rawHeaders, firstDataRow);

  // Apply custom manual overrides if provided by user in the UI mapping step
  if (options?.customColumnIndices) {
    for (const [key, colIdx] of Object.entries(options.customColumnIndices)) {
      const mapping = mappingStatuses.find((m) => m.fieldKey === key);
      if (mapping && typeof colIdx === 'number') {
        mapping.excelColumnIndex = colIdx;
        mapping.excelColumnName = colIdx >= 0 && rawHeaders[colIdx] ? rawHeaders[colIdx] : '';
        mapping.sampleValue = colIdx >= 0 && firstDataRow ? String(firstDataRow[colIdx] ?? '').trim() : '';
        if (colIdx >= 0) {
          mapping.status = 'valid';
          mapping.statusTextAr = 'صحيح (يدوي)';
        } else {
          mapping.status = mapping.isRequired ? 'missing' : 'warning';
          mapping.statusTextAr = mapping.isRequired ? 'غير موجود (إلزامي)' : 'غير محدد';
        }
      }
    }
  }

  // Get effective column index for each field
  const getColIndex = (key: AlManhalFieldKey): number => {
    const item = mappingStatuses.find((m) => m.fieldKey === key);
    return item ? item.excelColumnIndex : -1;
  };

  const studentIdCol = getColIndex('studentId');
  const nameArCol = getColIndex('nameAr');
  const nameEnCol = getColIndex('nameEn');
  const nationalIdCol = getColIndex('nationalId');
  const genderCol = getColIndex('gender');
  const nationalityCol = getColIndex('nationality');
  const citizenshipStatusCol = getColIndex('citizenshipStatus');
  const birthDateCol = getColIndex('birthDate');
  const birthPlaceCol = getColIndex('birthPlace');
  const ageCol = getColIndex('age');
  const countryCol = getColIndex('country');
  const emirateCol = getColIndex('emirate');
  const cityCol = getColIndex('city');
  const districtCol = getColIndex('district');
  const neighborhoodCol = getColIndex('neighborhood');
  const streetNameCol = getColIndex('streetName');
  const latitudeCol = getColIndex('latitude');
  const longitudeCol = getColIndex('longitude');
  const isDeterminedCol = getColIndex('isDeterminedPerson');
  const transportTypeCol = getColIndex('transportType');
  const emailCol = getColIndex('email');
  const phoneCol = getColIndex('phone');
  const religionCol = getColIndex('religion');
  const sectionCol = getColIndex('section');
  const trackCol = getColIndex('track');
  const gradeCol = getColIndex('grade');
  const enrollmentTypeCol = getColIndex('enrollmentType');
  const enrollmentDateCol = getColIndex('enrollmentDate');
  const parentsStatusCol = getColIndex('parentsStatus');
  const schoolIdCol = getColIndex('schoolId');
  const schoolNameArCol = getColIndex('schoolNameAr');
  const schoolNameEnCol = getColIndex('schoolNameEn');
  const schoolEmirateCol = getColIndex('schoolEmirate');
  const councilCol = getColIndex('council');
  const schoolComplexCol = getColIndex('schoolComplex');
  const sectorCol = getColIndex('sector');

  // StudentId and NameAr are the absolute fundamental requirements
  if (studentIdCol === -1 || nameArCol === -1) {
    throw new Error(
      'تعذر مطابقة الحقول الأساسية الإلزامية (رقم الطالب، الاسم بالعربية). يرجى مراجعة صف العناوين أو مطابقة الأعمدة يدوياً.'
    );
  }

  // Generate unique import batch ID
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const importBatchId = `batch_${timestampStr}_${Math.random().toString(36).substring(2, 7)}`;
  const importBatchDate = new Date().toISOString();

  const validStudents: Student[] = [];
  const invalidRows: { rowNumber: number; rawData: any; reason: string }[] = [];
  const seenStudentNumbers = new Set<string>();

  const normalizedHeaderRowValues = rawHeaders.map((h) => normalizeHeader(h));

  // Process rows after header
  for (let r = bestHeaderRowIndex + 1; r < matrix.length; r++) {
    const row = matrix[r];
    const rowNumber = r + 1;

    // Ignore empty rows
    if (!row || !Array.isArray(row) || row.every((c) => String(c ?? '').trim() === '')) {
      continue;
    }

    // Ignore total / aggregate rows
    const firstFewCells = row.slice(0, 5).map((c) => normalizeHeader(String(c ?? '')));
    if (firstFewCells.some((c) => c === 'المجموع' || c === 'الاجمالي' || c === 'total' || c.includes('اجمالي'))) {
      continue;
    }

    // Helper to sanitize any cell string and remove null/undefined/-
    const cleanCell = (colIdx: number): string | undefined => {
      if (colIdx < 0 || colIdx >= row.length) return undefined;
      const raw = row[colIdx];
      if (raw === null || raw === undefined) return undefined;
      const s = String(raw).trim();
      if (
        !s ||
        s.toLowerCase() === 'null' ||
        s.toLowerCase() === 'undefined' ||
        s === '-' ||
        s === '--'
      ) {
        return undefined;
      }
      return s;
    };

    // Extract values cleanly
    const rawStudentId = cleanCell(studentIdCol) || '';
    const rawNameAr = cleanCell(nameArCol) || '';
    const rawNameEn = cleanCell(nameEnCol);
    const rawNationalId = cleanCell(nationalIdCol);
    const rawGender = cleanCell(genderCol) || '';
    const rawNationality = cleanCell(nationalityCol);
    const rawCitizenshipStatus = cleanCell(citizenshipStatusCol);
    const rawBirthDate = cleanCell(birthDateCol);
    const rawBirthPlace = cleanCell(birthPlaceCol);
    const rawAge = cleanCell(ageCol);
    const rawCountry = cleanCell(countryCol);
    const rawEmirate = cleanCell(emirateCol);
    const rawCity = cleanCell(cityCol);
    const rawDistrict = cleanCell(districtCol);
    const rawNeighborhood = cleanCell(neighborhoodCol);
    const rawStreetName = cleanCell(streetNameCol);
    const rawLatitude = cleanCell(latitudeCol);
    const rawLongitude = cleanCell(longitudeCol);
    const rawIsDetermined = cleanCell(isDeterminedCol) || '';
    const rawTransportType = cleanCell(transportTypeCol);
    const rawEmail = cleanCell(emailCol);
    const rawPhone = cleanCell(phoneCol) || '';
    const rawReligion = cleanCell(religionCol);
    const rawSection = cleanCell(sectionCol) || '';
    const rawTrack = cleanCell(trackCol) || '';
    const rawGrade = cleanCell(gradeCol) || '';
    const rawEnrollmentType = cleanCell(enrollmentTypeCol);
    const rawEnrollmentDate = cleanCell(enrollmentDateCol);
    const rawParentsStatus = cleanCell(parentsStatusCol);
    const rawSchoolId = cleanCell(schoolIdCol);
    const rawSchoolNameAr = cleanCell(schoolNameArCol);
    const rawSchoolNameEn = cleanCell(schoolNameEnCol);
    const rawSchoolEmirate = cleanCell(schoolEmirateCol);
    const rawCouncil = cleanCell(councilCol);
    const rawSchoolComplex = cleanCell(schoolComplexCol);
    const rawSector = cleanCell(sectorCol);

    // Ignore repeated headers in data rows
    const normStudentId = normalizeHeader(rawStudentId);
    if (normStudentId === 'رقم الطالب' || normStudentId === 'الرقم الطلابي' || normStudentId === 'studentid') {
      continue;
    }

    // Validation 1: Student ID must not be empty
    if (!rawStudentId) {
      invalidRows.push({ rowNumber, rawData: row, reason: 'رقم الطالب فارغ' });
      continue;
    }

    // Validation 2: Student ID must not be system auto-generated
    if (rawStudentId.startsWith('st-') || rawStudentId.startsWith('auto-') || rawStudentId.startsWith('temp-')) {
      invalidRows.push({ rowNumber, rawData: row, reason: 'رقم الطالب تم توليده بواسطة النظام وغير حقيقي' });
      continue;
    }

    // Validation 3: Name AR must not be empty
    if (!rawNameAr || rawNameAr.length < 2) {
      invalidRows.push({ rowNumber, rawData: row, reason: 'الاسم بالعربية فارغ أو قصير جداً' });
      continue;
    }

    // Validation 4: Name AR must not equal any column header
    const normName = normalizeHeader(rawNameAr);
    if (normalizedHeaderRowValues.includes(normName)) {
      invalidRows.push({ rowNumber, rawData: row, reason: 'اسم الطالب يطابق عنوان أحد الأعمدة' });
      continue;
    }

    // Validation 5: Name AR must not be organizational unit
    if (
      normName === 'مجلس' ||
      normName === 'القطاع' ||
      normName === 'مجمع مدرسي' ||
      normName.includes('مكتب الفجيره') ||
      normName.includes('مكتب الشارقه') ||
      normName.includes('مجلس التعليم') ||
      normName.includes('وزاره التربيه')
    ) {
      invalidRows.push({ rowNumber, rawData: row, reason: `اسم الطالب قيمة تنظيمية خاطئة ("${rawNameAr}")` });
      continue;
    }

    // Validation 6: Grade validation (Must normalize to 9, 10, 11, 12 or تاسع، عاشر، إلخ)
    const validGrade = normalizeStrictGrade(rawGrade) || 'تاسع'; // Fallback to 'تاسع' if grade column missing/unspecified

    // Clean and canonicalize student number using standard normalizer
    const studentNumber = normalizeStudentNumber(rawStudentId);

    // Deduplication within the same import session
    if (seenStudentNumbers.has(studentNumber)) {
      invalidRows.push({ rowNumber, rawData: row, reason: `تكرار رقم الطالب (${studentNumber}) في نفس الملف` });
      continue;
    }
    seenStudentNumbers.add(studentNumber);

    // Section and Track are evaluated 100% independently
    const validSection = normalizeStrictSection(rawSection);
    const validTrack = resolveStudentTrack(rawTrack, rawSection, rawGrade);

    // Multi-phone parsing
    const { primary: cleanedPhone, secondary: alternatePhone } = parsePhoneNumbers(rawPhone);

    // Gender normalization
    let gender: 'بنين' | 'بنات' | undefined;
    const normGender = normalizeHeader(rawGender);
    if (normGender.includes('ذكر') || normGender.includes('بنين') || normGender === 'm' || normGender === 'male') {
      gender = 'بنين';
    } else if (normGender.includes('انثى') || normGender.includes('بنات') || normGender === 'f' || normGender === 'female') {
      gender = 'بنات';
    }

    // Determined person normalization
    const isDeterminedPerson =
      rawIsDetermined.includes('نعم') || rawIsDetermined.toLowerCase() === 'yes' || rawIsDetermined === 'true';

    // Construct valid student record
    const studentRecord: Student = {
      id: studentNumber,
      studentNumber,
      fullName: rawNameAr,
      nameEn: rawNameEn,
      nationalId: rawNationalId,
      gender,
      nationality: rawNationality,
      citizenshipStatus: rawCitizenshipStatus,
      birthDate: rawBirthDate,
      birthPlace: rawBirthPlace,
      age: rawAge,
      country: rawCountry,
      emirate: rawEmirate,
      city: rawCity,
      district: rawDistrict,
      neighborhood: rawNeighborhood,
      streetName: rawStreetName,
      latitude: rawLatitude,
      longitude: rawLongitude,
      isDeterminedPerson,
      transportType: rawTransportType,
      email: rawEmail,
      religion: rawReligion,
      grade: validGrade,
      section: validSection,
      track: validTrack,
      status: 'منتظم',
      enrollmentType: rawEnrollmentType,
      enrollmentDate: rawEnrollmentDate || new Date().toISOString().split('T')[0],
      parentsStatus: rawParentsStatus,
      schoolId: rawSchoolId || options?.currentUserSchoolId || 'school-main',
      schoolNameAr: rawSchoolNameAr || undefined,
      schoolNameEn: rawSchoolNameEn || undefined,
      schoolEmirate: rawSchoolEmirate || undefined,
      council: rawCouncil || undefined,
      schoolComplex: rawSchoolComplex || undefined,
      sector: rawSector || undefined,
      parentName: `ولي أمر الطالب ${rawNameAr.split(' ')[0]}`,
      parentPhone: cleanedPhone,
      alternatePhone: alternatePhone || undefined,
      parentRelation: 'الأب',
      totalTardiness: 0,
      totalViolations: 0,
      importBatchId,
      importBatchDate,
      contacts: cleanedPhone
        ? [
            {
              id: `c_${studentNumber}_primary`,
              name: `ولي أمر الطالب ${rawNameAr.split(' ')[0]}`,
              relation: 'ولي الأمر (رئيسي)',
              phone: cleanedPhone,
              phoneE164: cleanedPhone.startsWith('+')
                ? cleanedPhone
                : cleanedPhone.startsWith('05')
                ? `+971${cleanedPhone.substring(1)}`
                : cleanedPhone,
              isPrimary: true,
              hasWhatsApp: true,
              whatsappConsent: true,
              emailConsent: false,
              isVerified: false,
              source: 'almanhal',
              updatedAt: importBatchDate,
            },
            ...(alternatePhone
              ? [
                  {
                    id: `c_${studentNumber}_alternate`,
                    name: `ولي أمر بديل للطالب ${rawNameAr.split(' ')[0]}`,
                    relation: 'ولي أمر بديل',
                    phone: alternatePhone,
                    phoneE164: alternatePhone.startsWith('+')
                      ? alternatePhone
                      : alternatePhone.startsWith('05')
                      ? `+971${alternatePhone.substring(1)}`
                      : alternatePhone,
                    isPrimary: false,
                    hasWhatsApp: true,
                    whatsappConsent: true,
                    emailConsent: false,
                    isVerified: false,
                    source: 'almanhal',
                    updatedAt: importBatchDate,
                  },
                ]
              : []),
          ]
        : [],
    };

    validStudents.push(studentRecord);
  }

  return {
    validStudents,
    invalidRows,
    mappingStatuses,
    headerRowIndex: bestHeaderRowIndex,
    rawHeaders,
    sheetNames: options?.sheetNames || ['Sheet1'],
    selectedSheetName: options?.selectedSheetName || 'Sheet1',
    suggestedSheetName: options?.suggestedSheetName || 'Sheet1',
    totalRawRowsScanned: matrix.length,
    importBatchId,
  };
}

/**
 * Main parser for Excel file buffer (.xlsx, .xls, .csv)
 */
export function parseAlManhalWorkbook(
  buffer: ArrayBuffer,
  options?: {
    forcedSheetName?: string;
    currentUserSchoolId?: string;
    customColumnIndices?: Partial<Record<AlManhalFieldKey, number>>;
  }
): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    throw new Error('الملف فارغ ولا يحتوي على أي ورقة عمل.');
  }

  // Analyze sheets to find best sheet with header row
  let selectedSheetName = options?.forcedSheetName || '';
  let suggestedSheetName = '';

  const analyzedSheets: SheetAnalysis[] = sheetNames.map((name) => {
    const ws = workbook.Sheets[name];
    if (!ws) return { sheetName: name, headerRowIndex: -1, hasAllEssentialHeaders: false, score: 0 };
    const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    const { headerRowIndex, hasAllEssentials } = findHeaderRowInSheet(matrix);
    return {
      sheetName: name,
      headerRowIndex,
      hasAllEssentialHeaders: hasAllEssentials,
      score: hasAllEssentials ? 100 : headerRowIndex >= 0 ? 50 : 0,
    };
  });

  const bestSheet = analyzedSheets.find((s) => s.hasAllEssentialHeaders) || analyzedSheets[0];
  suggestedSheetName = bestSheet?.sheetName || sheetNames[0];

  if (!selectedSheetName) {
    selectedSheetName = suggestedSheetName;
  }

  const activeWorksheet = workbook.Sheets[selectedSheetName];
  if (!activeWorksheet) {
    throw new Error(`تعذر فتح ورقة العمل: ${selectedSheetName}`);
  }

  const matrix: any[][] = XLSX.utils.sheet_to_json(activeWorksheet, { header: 1, defval: '', blankrows: false });

  return parseAlManhalFromMatrix(matrix, {
    sheetNames,
    selectedSheetName,
    suggestedSheetName,
    currentUserSchoolId: options?.currentUserSchoolId,
    customColumnIndices: options?.customColumnIndices,
  });
}

/**
 * Parser for raw pasted text (TSV or CSV format copied from Excel)
 */
export function parseAlManhalFromText(
  rawText: string,
  options?: {
    currentUserSchoolId?: string;
    customColumnIndices?: Partial<Record<AlManhalFieldKey, number>>;
  }
): ParseResult {
  if (!rawText || !rawText.trim()) {
    throw new Error('النص المنسوخ فارغ، يرجى لصق بيانات الطلبة من ملف الإكسل.');
  }

  const lines = rawText
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error('لم يتم العثور على أسطر صالحة في النص المنسوخ.');
  }

  // Detect delimiter
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount ? '\t' : ',';

  // Build matrix
  const matrix: any[][] = lines.map((line) => {
    if (delimiter === '\t') {
      return line.split('\t').map((c) => c.trim());
    } else {
      return line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    }
  });

  return parseAlManhalFromMatrix(matrix, {
    sheetNames: ['البيانات المنسوخة'],
    selectedSheetName: 'البيانات المنسوخة',
    suggestedSheetName: 'البيانات المنسوخة',
    currentUserSchoolId: options?.currentUserSchoolId,
    customColumnIndices: options?.customColumnIndices,
  });
}
