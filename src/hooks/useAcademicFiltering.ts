import { useMemo } from 'react';
import { Student, GradeLevel, AcademicTrack, SectionName } from '../types';

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
  getSectionsFor: (grade?: string, track?: string) => SectionName[];
  getTracksFor: (grade?: string) => AcademicTrack[];
  getStudentCount: (grade?: string, track?: string, section?: string) => number;
}

/**
 * Custom hook to dynamically extract actual existing Grades, Tracks, and Sections
 * strictly from the current students dataset, avoiding any hardcoded arrays.
 */
export function useAcademicFiltering({
  students,
  selectedGrade = 'all',
  selectedTrack = 'all',
  selectedSection = 'all',
}: UseAcademicFilteringParams): UseAcademicFilteringResult {
  // Sort grades logically: تاسع (9), عاشر (10), حادي عشر (11), ثاني عشر (12)
  const filteredGrades = useMemo<GradeLevel[]>(() => {
    const grades = Array.from(
      new Set<GradeLevel>(
        students
          .map((s) => s.grade)
          .filter((g): g is GradeLevel => Boolean(g))
      )
    );
    if (grades.length === 0) {
      return ['تاسع', 'عاشر', 'حادي عشر', 'ثاني عشر'] as GradeLevel[];
    }
    const gradeOrder: Record<string, number> = {
      'تاسع': 1,
      'عاشر': 2,
      'حادي عشر': 3,
      'ثاني عشر': 4,
      '9': 1,
      '10': 2,
      '11': 3,
      '12': 4,
    };
    return grades.sort((a, b) => {
      const orderA = gradeOrder[a] ?? 99;
      const orderB = gradeOrder[b] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [students]);

  // Dynamically compute available tracks for selectedGrade
  const filteredTracks = useMemo<AcademicTrack[]>(() => {
    const studentsInGrade =
      selectedGrade === 'all'
        ? students
        : students.filter((s) => s.grade === selectedGrade);
    const tracks = Array.from(
      new Set<AcademicTrack>(
        studentsInGrade
          .map((s) => (s.track || 'عام') as AcademicTrack)
          .filter(Boolean)
      )
    );
    if (tracks.length === 0) {
      return ['عام', 'متقدم'] as AcademicTrack[];
    }
    const trackOrder: Record<string, number> = {
      'عام': 1,
      'متقدم': 2,
      'يحتاج مراجعة': 3,
    };
    return tracks.sort(
      (a, b) => (trackOrder[a] ?? 99) - (trackOrder[b] ?? 99)
    );
  }, [students, selectedGrade]);

  // Dynamically compute filteredSections for the selectedGrade and selectedTrack
  const filteredSections = useMemo<SectionName[]>(() => {
    const matchingStudents = students.filter((s) => {
      const matchGrade =
        selectedGrade === 'all' || s.grade === selectedGrade;
      const matchTrack =
        selectedTrack === 'all' || (s.track || 'عام') === selectedTrack;
      return matchGrade && matchTrack;
    });
    const sections = Array.from(
      new Set<string>(
        matchingStudents
          .map((s) => String(s.section || ''))
          .filter(Boolean)
      )
    );
    return sections.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [students, selectedGrade, selectedTrack]);

  // Sections specifically for General track in selectedGrade
  const generalSections = useMemo<SectionName[]>(() => {
    const matching = students.filter(
      (s) =>
        (selectedGrade === 'all' || s.grade === selectedGrade) &&
        (s.track || 'عام') === 'عام'
    );
    const sections = Array.from(
      new Set<string>(
        matching.map((s) => String(s.section || '')).filter(Boolean)
      )
    );
    return sections.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [students, selectedGrade]);

  // Sections specifically for Advanced track in selectedGrade
  const advancedSections = useMemo<SectionName[]>(() => {
    const matching = students.filter(
      (s) =>
        (selectedGrade === 'all' || s.grade === selectedGrade) &&
        (s.track || 'عام') === 'متقدم'
    );
    const sections = Array.from(
      new Set<string>(
        matching.map((s) => String(s.section || '')).filter(Boolean)
      )
    );
    return sections.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [students, selectedGrade]);

  // Sections specifically for Review track in selectedGrade
  const reviewSections = useMemo<SectionName[]>(() => {
    const matching = students.filter(
      (s) =>
        (selectedGrade === 'all' || s.grade === selectedGrade) &&
        s.track === 'يحتاج مراجعة'
    );
    const sections = Array.from(
      new Set<string>(
        matching.map((s) => String(s.section || '')).filter(Boolean)
      )
    );
    return sections.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [students, selectedGrade]);

  // Helper to extract sections for any specific grade and track
  const getSectionsFor = (grade?: string, track?: string): SectionName[] => {
    const matching = students.filter((s) => {
      const matchGrade = !grade || grade === 'all' || s.grade === grade;
      const matchTrack = !track || track === 'all' || (s.track || 'عام') === track;
      return matchGrade && matchTrack;
    });
    return Array.from(
      new Set<string>(matching.map((s) => String(s.section || '')).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  // Helper to extract tracks for any specific grade
  const getTracksFor = (grade?: string): AcademicTrack[] => {
    const matching = students.filter((s) => {
      return !grade || grade === 'all' || s.grade === grade;
    });
    const tracks = Array.from(
      new Set<AcademicTrack>(
        matching.map((s) => (s.track || 'عام') as AcademicTrack).filter(Boolean)
      )
    );
    const trackOrder: Record<string, number> = {
      'عام': 1,
      'متقدم': 2,
      'يحتاج مراجعة': 3,
    };
    return tracks.sort((a, b) => (trackOrder[a] ?? 99) - (trackOrder[b] ?? 99));
  };

  // Count helper
  const getStudentCount = (grade?: string, track?: string, section?: string): number => {
    return students.filter((s) => {
      const matchGrade = !grade || grade === 'all' || s.grade === grade;
      const matchTrack = !track || track === 'all' || (s.track || 'عام') === track;
      const matchSection = !section || section === 'all' || String(s.section) === section;
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
    getSectionsFor,
    getTracksFor,
    getStudentCount,
  };
}
