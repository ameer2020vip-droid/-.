import React from 'react';
import {
  Student,
  WarningFormRecord,
  ParentSummonFormRecord,
  ViolationReportRecord,
  ParentNoticeFormRecord,
  ParentCommitmentFormRecord,
  ViolationRecord,
  CounselorUser,
  AppUser,
} from '../types';
import { FormsPage, FormTabType } from './FormsPage';

export interface BylawsPageProps {
  students?: Student[];
  counselor?: CounselorUser | AppUser | null;
  warningForms?: WarningFormRecord[];
  parentSummonForms?: ParentSummonFormRecord[];
  violationReports?: ViolationReportRecord[];
  parentNoticeForms?: ParentNoticeFormRecord[];
  parentCommitmentForms?: ParentCommitmentFormRecord[];
  violations?: ViolationRecord[];
  onSaveWarningForm?: (form: WarningFormRecord) => void;
  onSaveSummonForm?: (form: ParentSummonFormRecord) => Promise<void>;
  onDeleteSummonForm?: (formId: string, studentName?: string) => Promise<void>;
  onSaveViolationReport?: (form: ViolationReportRecord) => Promise<void>;
  onDeleteViolationReport?: (formId: string, studentName?: string) => Promise<void>;
  onSaveNoticeForm?: (form: ParentNoticeFormRecord) => Promise<void>;
  onDeleteNoticeForm?: (formId: string, studentName?: string) => Promise<void>;
  onSaveCommitmentForm?: (form: ParentCommitmentFormRecord) => Promise<void>;
  onDeleteCommitmentForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  selectedStudentIdForForm?: string | null;
  selectedViolationIdForForm?: string | null;
  initialSubTab?: FormTabType;
  initialFormsSubTab?: FormTabType;
  onOpenStudentProfile?: (studentId: string) => void;
}

export const BylawsPage: React.FC<BylawsPageProps> = ({
  students = [],
  counselor = null,
  warningForms = [],
  parentSummonForms = [],
  violationReports = [],
  parentNoticeForms = [],
  parentCommitmentForms = [],
  violations = [],
  onSaveWarningForm = () => {},
  onSaveSummonForm = async () => {},
  onDeleteSummonForm,
  onSaveViolationReport,
  onDeleteViolationReport,
  onSaveNoticeForm,
  onDeleteNoticeForm,
  onSaveCommitmentForm,
  onDeleteCommitmentForm,
  onShowToast = () => {},
  selectedStudentIdForForm = null,
  selectedViolationIdForForm = null,
  initialFormsSubTab,
}) => {
  return (
    <FormsPage
      students={students}
      counselor={counselor}
      warningForms={warningForms}
      parentSummonForms={parentSummonForms}
      violationReports={violationReports}
      parentNoticeForms={parentNoticeForms}
      parentCommitmentForms={parentCommitmentForms}
      violations={violations}
      onSaveWarningForm={onSaveWarningForm}
      onSaveSummonForm={onSaveSummonForm}
      onDeleteSummonForm={onDeleteSummonForm}
      onSaveViolationReport={onSaveViolationReport}
      onDeleteViolationReport={onDeleteViolationReport}
      onSaveNoticeForm={onSaveNoticeForm}
      onDeleteNoticeForm={onDeleteNoticeForm}
      onSaveCommitmentForm={onSaveCommitmentForm}
      onDeleteCommitmentForm={onDeleteCommitmentForm}
      onShowToast={onShowToast}
      selectedStudentIdForForm={selectedStudentIdForForm}
      selectedViolationIdForForm={selectedViolationIdForForm}
      initialSubTab={initialFormsSubTab || (selectedViolationIdForForm ? 'bundle-engine' : 'model8-summon')}
    />
  );
};
