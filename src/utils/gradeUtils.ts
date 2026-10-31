import { Student } from '../types';

const GRADE_SORT_WEIGHT: Record<string, number> = {
  '5': 5,
  'خامس': 5,
  'الخامس': 5,
  '6': 6,
  'سادس': 6,
  'السادس': 6,
  '7': 7,
  'سابع': 7,
  'السابع': 7,
  '8': 8,
  'ثامن': 8,
  'الثامن': 8,
  '9': 9,
  'تاسع': 9,
  'التاسع': 9,
  '10': 10,
  'عاشر': 10,
  'العاشر': 10,
  '11': 11,
  'حادي عشر': 11,
  'الحادي عشر': 11,
  '12': 12,
  'ثاني عشر': 12,
  'الثاني عشر': 12,
};

export function getGradeWeight(grade: string): number {
  const clean = String(grade || '').replace(/^الصف\s+/i, '').trim();
  if (GRADE_SORT_WEIGHT[clean] !== undefined) {
    return GRADE_SORT_WEIGHT[clean];
  }
  const num = parseInt(clean, 10);
  if (!isNaN(num)) return num;
  return 99;
}

export function gradesMatch(studentGrade: string, targetGrade: string): boolean {
  if (!targetGrade || targetGrade === 'all') return true;
  if (studentGrade === targetGrade) return true;
  const w1 = getGradeWeight(studentGrade);
  const w2 = getGradeWeight(targetGrade);
  if (w1 !== 99 && w1 === w2) return true;
  return String(studentGrade || '').trim() === String(targetGrade || '').trim();
}

/**
 * Extracts all unique grades present in the student dataset, sorted from Grade 5 up to Grade 12
 * without hardcoding or restricting to grades 9-12.
 */
export function extractDynamicGrades(students: Student[]): string[] {
  const set = new Set<string>();
  for (const s of students) {
    const g = String(s.grade || '').trim();
    if (g) set.add(g);
  }
  return Array.from(set).sort((a, b) => {
    const wa = getGradeWeight(a);
    const wb = getGradeWeight(b);
    if (wa !== wb) return wa - wb;
    return a.localeCompare(b, 'ar', { numeric: true });
  });
}

/**
 * Extracts all unique sections for the selected grade (or all grades if 'all') dynamically.
 */
export function extractDynamicSections(students: Student[], gradeFilter = 'all'): string[] {
  const set = new Set<string>();
  for (const s of students) {
    if (gradeFilter === 'all' || gradesMatch(s.grade, gradeFilter)) {
      const sec = String(s.section || '').trim();
      if (sec) set.add(sec);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar', { numeric: true }));
}
