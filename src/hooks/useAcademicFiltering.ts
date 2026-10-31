import { useMemo } from 'react';
import { Student, GradeLevel, AcademicTrack, SectionName, TardinessRecord } from '../types';

export const ACADEMY_STANDARD_GRADES: GradeLevel[] = [
  'خامس',
  'سادس',
  'سابع',
  'ثامن',
  'تاسع',
  'عاشر',
  'حادي عشر',
  'ثاني عشر',
];

export const ALL_SUPPORTED_GRADES: GradeLevel[] = [
  'أول',
  'ثاني',
  'ثالث',
  'رابع',
  'خامس',
  'سادس',
  'سابع',
  'ثامن',
  'تاسع',
  'عاشر',
  'حادي عشر',
  'ثاني عشر',
];

const GRADE_SORT_MAP: Record<string, number> = {
  'أول': 1,
  'الأول': 1,
  'الصف الأول': 1,
  '1': 1,
  'ثاني': 2,
  'الثاني': 2,
  'الصف الثاني': 2,
  '2': 2,
  'ثالث': 3,
  'الثالث': 3,
  'الصف الثالث': 3,
  '3': 3,
  'رابع': 4,
  'الرابع': 4,
  'الصف الرابع': 4,
  '4': 4,
  'خامس': 5,
  'الخامس': 5,
  'الصف الخامس': 5,
  '5': 5,
  'سادس': 6,
  'السادس': 6,
  'الصف السادس': 6,
  '6': 6,
  'سابع': 7,
  'السابع': 7,
  'الصف السابع': 7,
  '7': 7,
  'ثامن': 8,
  'الثامن': 8,
  'الصف الثامن': 8,
  '8': 8,
  'تاسع': 9,
  'التاسع': 9,
  'الصف التاسع': 9,
  '9': 9,
  'عاشر': 10,
  'العاشر': 10,
  'الصف العاشر': 10,
  '10': 10,
  'حادي عشر': 11,
  'الحادي عشر': 11,
  'الصف الحادي عشر': 11,
  '11': 11,
  'ثاني عشر': 12,
  'الثاني عشر': 12,
  'الصف الثاني عشر': 12,
  '12': 12,
  'غير محدد': 999,
};

/**
 * Normalizes any grade representation into canonical Academy grade strings
 * while preserving custom grade names if they are outside 1..12.
 */
export function normalizeCanonicalGrade(raw: any): GradeLevel {
  if (raw === null || raw === undefined) return 'غير محدد';
  const str = String(raw).trim();
  if (!str) return 'غير محدد';

  const g = str
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim();

  if (
    g === 'غير محدد' ||
    g === 'بدون صف' ||
    g === 'غير معروف' ||
    g === 'unknown' ||
    g === 'n/a' ||
    g === '-'
  ) {
    return 'غير محدد';
  }

  // Check multi-digit 10, 11, 12 first
  if (
    g.includes('ثاني عشر') ||
    g.includes('الثاني عشر') ||
    g.includes('12') ||
    g.includes('twelve') ||
    g.includes('twelfth')
  ) {
    return 'ثاني عشر';
  }
  if (
    g.includes('حادي عشر') ||
    g.includes('الحادي عشر') ||
    g.includes('11') ||
    g.includes('eleven') ||
    g.includes('eleventh')
  ) {
    return 'حادي عشر';
  }
  if (
    g.includes('عاشر') ||
    g.includes('العاشر') ||
    g.includes('10') ||
    g.includes('ten') ||
    g.includes('tenth')
  ) {
    return 'عاشر';
  }

  // Grades 5 to 9
  if (
    g.includes('تاسع') ||
    g.includes('التاسع') ||
    /\b9\b/.test(g) ||
    g.startsWith('9/') ||
    g.endsWith('/9') ||
    g.startsWith('9-') ||
    g.endsWith('-9') ||
    g === 'g9' ||
    g === 'gr9' ||
    g.includes('grade 9') ||
    g.includes('ninth')
  ) {
    return 'تاسع';
  }
  if (
    g.includes('ثامن') ||
    g.includes('الثامن') ||
    /\b8\b/.test(g) ||
    g.startsWith('8/') ||
    g.endsWith('/8') ||
    g.startsWith('8-') ||
    g.endsWith('-8') ||
    g === 'g8' ||
    g === 'gr8' ||
    g.includes('grade 8') ||
    g.includes('eighth')
  ) {
    return 'ثامن';
  }
  if (
    g.includes('سابع') ||
    g.includes('السابع') ||
    /\b7\b/.test(g) ||
    g.startsWith('7/') ||
    g.endsWith('/7') ||
    g.startsWith('7-') ||
    g.endsWith('-7') ||
    g === 'g7' ||
    g === 'gr7' ||
    g.includes('grade 7') ||
    g.includes('seventh')
  ) {
    return 'سابع';
  }
  if (
    g.includes('سادس') ||
    g.includes('السادس') ||
    /\b6\b/.test(g) ||
    g.startsWith('6/') ||
    g.endsWith('/6') ||
    g.startsWith('6-') ||
    g.endsWith('-6') ||
    g === 'g6' ||
    g === 'gr6' ||
    g.includes('grade 6') ||
    g.includes('sixth')
  ) {
    return 'سادس';
  }
  if (
    g.includes('خامس') ||
    g.includes('الخامس') ||
    /\b5\b/.test(g) ||
    g.startsWith('5/') ||
    g.endsWith('/5') ||
    g.startsWith('5-') ||
    g.endsWith('-5') ||
    g === 'g5' ||
    g === 'gr5' ||
    g.includes('grade 5') ||
    g.includes('fifth')
  ) {
    return 'خامس';
  }

  // Grades 1 to 4 (if present in imported files)
  if (
    g.includes('رابع') ||
    g.includes('الرابع') ||
    /\b4\b/.test(g) ||
    g.startsWith('4/') ||
    g === 'g4' ||
    g.includes('grade 4')
  ) {
    return 'رابع';
  }
  if (
    g.includes('ثالث') ||
    g.includes('الثالث') ||
    /\b3\b/.test(g) ||
    g.startsWith('3/') ||
    g === 'g3' ||
    g.includes('grade 3')
  ) {
    return 'ثالث';
  }
  if (
    (g.includes('ثاني') && !g.includes('عشر')) ||
    (g.includes('الثاني') && !g.includes('عشر')) ||
    /\b2\b/.test(g) ||
    g.startsWith('2/') ||
    g === 'g2' ||
    g.includes('grade 2')
  ) {
    return 'ثاني';
  }
  if (
    (g.includes('أول') && !g.includes('إنذار')) ||
    (g.includes('اول') && !g.includes('انذار')) ||
    /\b1\b/.test(g) ||
    g.startsWith('1/') ||
    g === 'g1' ||
    g.includes('grade 1')
  ) {
    return 'أول';
  }

  return str as GradeLevel;
}

export function getGradeSortRank(grade: string | undefined): number {
  if (!grade) return 999;
  const trimmed = String(grade).trim();
  if (GRADE_SORT_MAP[trimmed] !== undefined) return GRADE_SORT_MAP[trimmed];
  const normalized = normalizeCanonicalGrade(trimmed);
  if (GRADE_SORT_MAP[normalized] !== undefined) return GRADE_SORT_MAP[normalized];
  const digits = trimmed.match(/\d+/);
  if (digits) return parseInt(digits[0], 10);
  return 500;
}

export function compareGrades(a: string | undefined, b: string | undefined): number {
  const rankA = getGradeSortRank(a);
  const rankB = getGradeSortRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return String(a || '').localeCompare(String(b || ''), 'ar', { numeric: true });
}

export function compareSections(a: string | undefined, b: string | undefined): number {
  const sa = String(a || '').trim();
  const sb = String(b || '').trim();
  if (sa === 'غير محدد' && sb !== 'غير محدد') return 1;
  if (sb === 'غير محدد' && sa !== 'غير محدد') return -1;
  return sa.localeCompare(sb, 'ar', { numeric: true });
}

export function getGradeDisplayLabel(grade: string | undefined): string {
  if (!grade || grade === 'غير محدد') return 'صف غير محدد';
  const g = String(grade).trim();
  if (g.startsWith('الصف ')) return g;
  const map: Record<string, string> = {
    'أول': 'الصف الأول',
    'ثاني': 'الصف الثاني',
    'ثالث': 'الصف الثالث',
    'رابع': 'الصف الرابع',
    'خامس': 'الصف الخامس',
    'سادس': 'الصف السادس',
    'سابع': 'الصف السابع',
    'ثامن': 'الصف الثامن',
    'تاسع': 'الصف التاسع',
    'عاشر': 'الصف العاشر',
    'حادي عشر': 'الصف الحادي عشر',
    'ثاني عشر': 'الصف الثاني عشر',
  };
  return map[g] || `الصف ${g}`;
}

export function getGradeIconNumber(grade: string | undefined): string {
  const rank = getGradeSortRank(grade);
  if (rank >= 1 && rank <= 12) {
    return rank < 10 ? `0${rank}` : String(rank);
  }
  return '؟';
}

export function getGradeCycleSubtitle(grade: string | undefined): string {
  const rank = getGradeSortRank(grade);
  if (rank >= 1 && rank <= 4) return 'الحلقة الأولى';
  if (rank >= 5 && rank <= 8) return 'الحلقة الثانية';
  if (rank >= 9 && rank <= 12) return 'الحلقة الثالثة (المرحلة الثانوية)';
  return 'أكاديمية الفجيرة العلمية الإسلامية';
}

/**
 * Helper to compute unique tardiness dates for a student (never double-counting the same day).
 */
export function getUniqueStudentTardinessDates(
  student: { id?: string; studentNumber?: string } | string,
  tardinessRecords: TardinessRecord[]
): string[] {
  const id = typeof student === 'string' ? student : student.id || '';
  const num = typeof student === 'string' ? student : student.studentNumber || '';
  const cleanId = String(id).trim();
  const cleanNum = String(num).trim();

  const dateSet = new Set<string>();
  for (const r of tardinessRecords) {
    const rId = String(r.studentId || '').trim();
    const rNum = String(r.studentNumber || '').trim();
    const matches =
      (cleanId && (rId === cleanId || rNum === cleanId)) ||
      (cleanNum && (rNum === cleanNum || rId === cleanNum));
    if (matches && r.date) {
      dateSet.add(String(r.date).split('T')[0].trim());
    }
  }
  return Array.from(dateSet).sort((a, b) => b.localeCompare(a));
}

/**
 * Helper to get all tardiness records belonging to a student, sorted newest first.
 */
export function getStudentTardinessRecordsList(
  student: { id?: string; studentNumber?: string } | string,
  tardinessRecords: TardinessRecord[]
): TardinessRecord[] {
  const id = typeof student === 'string' ? student : student.id || '';
  const num = typeof student === 'string' ? student : student.studentNumber || '';
  const cleanId = String(id).trim();
  const cleanNum = String(num).trim();

  return tardinessRecords
    .filter((r) => {
      const rId = String(r.studentId || '').trim();
      const rNum = String(r.studentNumber || '').trim();
      return (
        (cleanId && (rId === cleanId || rNum === cleanId)) ||
        (cleanNum && (rNum === cleanNum || rId === cleanNum))
      );
    })
    .sort((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
}

export interface UseAcademicFilteringParams {
  students: Student[];
  selectedGrade?: string;
  selectedTrack?: string;
  selectedSection?: string;
}

export interface UseAcademicFilteringResult {
  filteredGrades: GradeLevel[];
  filteredTracks: AcademicTrack[];
  filteredSections: SectionName[];
  generalSections: SectionName[];
  advancedSections: SectionName[];
  reviewSections: SectionName[];
  otherTrackSections: Array<{ track: AcademicTrack; sections: SectionName[] }>;
  getSectionsFor: (grade?: string, track?: string) => SectionName[];
  getTracksFor: (grade?: string) => AcademicTrack[];
  getStudentCount: (grade?: string, track?: string, section?: string) => number;
}

/**
 * Unified hook to dynamically extract all existing Grades (5-12 and any imported grade),
 * Tracks, and Sections strictly from the live students dataset.
 */
export function useAcademicFiltering({
  students,
  selectedGrade = 'all',
  selectedTrack = 'all',
  selectedSection = 'all',
}: UseAcademicFilteringParams): UseAcademicFilteringResult {
  // Extract all unique grades present in students, sorted in ascending academic order (5 -> 12)
  const filteredGrades = useMemo<GradeLevel[]>(() => {
    const grades = Array.from(
      new Set<GradeLevel>(
        students
          .map((s) => (s.grade ? normalizeCanonicalGrade(s.grade) : ('غير محدد' as GradeLevel)))
          .filter((g): g is GradeLevel => Boolean(g))
      )
    );
    if (grades.length === 0) {
      return [...ACADEMY_STANDARD_GRADES];
    }
    return grades.sort(compareGrades);
  }, [students]);

  // Dynamically compute available tracks for selectedGrade
  const filteredTracks = useMemo<AcademicTrack[]>(() => {
    const studentsInGrade =
      selectedGrade === 'all'
        ? students
        : students.filter(
            (s) =>
              s.grade === selectedGrade ||
              normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(selectedGrade)
          );
    const tracks = Array.from(
      new Set<AcademicTrack>(
        studentsInGrade
          .map((s) => (s.track || 'عام') as AcademicTrack)
          .filter(Boolean)
      )
    );
    if (tracks.length === 0) {
      return ['عام'] as AcademicTrack[];
    }
    const trackOrder: Record<string, number> = {
      'عام': 1,
      'متقدم': 2,
      'نخبة': 3,
      'تطبيقي': 4,
      'بدون مسار': 5,
      'يحتاج مراجعة': 6,
    };
    return tracks.sort(
      (a, b) => (trackOrder[a] ?? 99) - (trackOrder[b] ?? 99)
    );
  }, [students, selectedGrade]);

  // Dynamically compute filteredSections for the selectedGrade and selectedTrack
  const filteredSections = useMemo<SectionName[]>(() => {
    const matchingStudents = students.filter((s) => {
      const matchGrade =
        selectedGrade === 'all' ||
        s.grade === selectedGrade ||
        normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(selectedGrade);
      const matchTrack =
        selectedTrack === 'all' || (s.track || 'عام') === selectedTrack;
      return matchGrade && matchTrack;
    });
    const sections = Array.from(
      new Set<string>(
        matchingStudents
          .map((s) => String(s.section || 'غير محدد').trim())
          .filter(Boolean)
      )
    );
    return sections.sort(compareSections);
  }, [students, selectedGrade, selectedTrack]);

  // Sections specifically for General track in selectedGrade
  const generalSections = useMemo<SectionName[]>(() => {
    const matching = students.filter(
      (s) =>
        (selectedGrade === 'all' ||
          s.grade === selectedGrade ||
          normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(selectedGrade)) &&
        (s.track || 'عام') === 'عام'
    );
    const sections = Array.from(
      new Set<string>(
        matching.map((s) => String(s.section || 'غير محدد').trim()).filter(Boolean)
      )
    );
    return sections.sort(compareSections);
  }, [students, selectedGrade]);

  // Sections specifically for Advanced track in selectedGrade
  const advancedSections = useMemo<SectionName[]>(() => {
    const matching = students.filter(
      (s) =>
        (selectedGrade === 'all' ||
          s.grade === selectedGrade ||
          normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(selectedGrade)) &&
        (s.track || 'عام') === 'متقدم'
    );
    const sections = Array.from(
      new Set<string>(
        matching.map((s) => String(s.section || 'غير محدد').trim()).filter(Boolean)
      )
    );
    return sections.sort(compareSections);
  }, [students, selectedGrade]);

  // Sections specifically for Review track in selectedGrade
  const reviewSections = useMemo<SectionName[]>(() => {
    const matching = students.filter(
      (s) =>
        (selectedGrade === 'all' ||
          s.grade === selectedGrade ||
          normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(selectedGrade)) &&
        (s.track === 'يحتاج مراجعة' || s.track === 'بدون مسار')
    );
    const sections = Array.from(
      new Set<string>(
        matching.map((s) => String(s.section || 'غير محدد').trim()).filter(Boolean)
      )
    );
    return sections.sort(compareSections);
  }, [students, selectedGrade]);

  // Any other tracks (e.g., نخبة, تطبيقي, custom)
  const otherTrackSections = useMemo<Array<{ track: AcademicTrack; sections: SectionName[] }>>(() => {
    const map = new Map<AcademicTrack, Set<string>>();
    students.forEach((s) => {
      const matchGrade =
        selectedGrade === 'all' ||
        s.grade === selectedGrade ||
        normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(selectedGrade);
      if (!matchGrade) return;
      const trk = (s.track || 'عام') as AcademicTrack;
      if (trk === 'عام' || trk === 'متقدم' || trk === 'يحتاج مراجعة') return;
      if (!map.has(trk)) map.set(trk, new Set<string>());
      map.get(trk)!.add(String(s.section || 'غير محدد').trim());
    });
    return Array.from(map.entries()).map(([track, secSet]) => ({
      track,
      sections: Array.from(secSet).sort(compareSections),
    }));
  }, [students, selectedGrade]);

  // Helper to extract sections for any specific grade and track
  const getSectionsFor = (grade?: string, track?: string): SectionName[] => {
    const matching = students.filter((s) => {
      const matchGrade =
        !grade ||
        grade === 'all' ||
        s.grade === grade ||
        normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(grade);
      const matchTrack = !track || track === 'all' || (s.track || 'عام') === track;
      return matchGrade && matchTrack;
    });
    return Array.from(
      new Set<string>(matching.map((s) => String(s.section || 'غير محدد').trim()).filter(Boolean))
    ).sort(compareSections);
  };

  // Helper to extract tracks for any specific grade
  const getTracksFor = (grade?: string): AcademicTrack[] => {
    const matching = students.filter((s) => {
      return (
        !grade ||
        grade === 'all' ||
        s.grade === grade ||
        normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(grade)
      );
    });
    const tracks = Array.from(
      new Set<AcademicTrack>(
        matching.map((s) => (s.track || 'عام') as AcademicTrack).filter(Boolean)
      )
    );
    const trackOrder: Record<string, number> = {
      'عام': 1,
      'متقدم': 2,
      'نخبة': 3,
      'تطبيقي': 4,
      'بدون مسار': 5,
      'يحتاج مراجعة': 6,
    };
    return tracks.sort((a, b) => (trackOrder[a] ?? 99) - (trackOrder[b] ?? 99));
  };

  // Count helper
  const getStudentCount = (grade?: string, track?: string, section?: string): number => {
    return students.filter((s) => {
      const matchGrade =
        !grade ||
        grade === 'all' ||
        s.grade === grade ||
        normalizeCanonicalGrade(s.grade) === normalizeCanonicalGrade(grade);
      const matchTrack = !track || track === 'all' || (s.track || 'عام') === track;
      const matchSection =
        !section || section === 'all' || String(s.section || 'غير محدد').trim() === section;
      return matchGrade && matchTrack && matchSection;
    }).length;
  };

  return {
    filteredGrades,
    filteredTracks,
    filteredSections,
    generalSections,
    advancedSections,
    reviewSections,
    otherTrackSections,
    getSectionsFor,
    getTracksFor,
    getStudentCount,
  };
}
