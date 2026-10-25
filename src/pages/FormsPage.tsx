import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSignature,
  FileText,
  Printer,
  FileCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  Filter,
  Layers,
  Send,
  Sparkles,
  ShieldCheck,
  Award,
  Smartphone,
  SmartphoneCharging,
  Car,
  CalendarCheck,
  MinusCircle,
  User,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  ArrowRight,
} from 'lucide-react';
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
  BehaviorDeductionNoticeRecord,
  ViolationCompensationRecord,
  DeviceConfiscationRecord,
  DeviceReturnRecord,
  AuthorizedPickupCommitmentRecord,
  AttendanceCommitmentRecord,
} from '../types';
import { ParentSummonFormTab } from './ParentSummonFormTab';
import { WarningFormPage } from './WarningFormPage';
import { ViolationReportFormTab } from './ViolationReportFormTab';
import { ParentNoticeFormTab } from './ParentNoticeFormTab';
import { ParentCommitmentFormTab } from './ParentCommitmentFormTab';
import { BehaviorDeductionNoticeTab } from './BehaviorDeductionNoticeTab';
import { ViolationCompensationTab } from './ViolationCompensationTab';
import { DeviceConfiscationTab } from './DeviceConfiscationTab';
import { DeviceReturnTab } from './DeviceReturnTab';
import { AuthorizedPickupCommitmentTab } from './AuthorizedPickupCommitmentTab';
import { AttendanceCommitmentTab } from './AttendanceCommitmentTab';

import { PrintSummonModal } from '../components/PrintSummonModal';
import { PrintWarningModal } from '../components/PrintWarningModal';
import { PrintViolationReportModal } from '../components/PrintViolationReportModal';
import { PrintParentNoticeModal } from '../components/PrintParentNoticeModal';
import { PrintParentCommitmentModal } from '../components/PrintParentCommitmentModal';
import { PrintDeductionNoticeModal } from '../components/PrintDeductionNoticeModal';
import { PrintCompensationModal } from '../components/PrintCompensationModal';
import { PrintDeviceConfiscationModal } from '../components/PrintDeviceConfiscationModal';
import { PrintDeviceReturnModal } from '../components/PrintDeviceReturnModal';
import { PrintAuthorizedPickupModal } from '../components/PrintAuthorizedPickupModal';
import { PrintAttendanceCommitmentModal } from '../components/PrintAttendanceCommitmentModal';
import { StudentGradeSectionSearchModal } from '../components/StudentGradeSectionSearchModal';
import { FormsBundleEngine } from '../components/FormsBundleEngine';

import {
  getBehaviorDeductionNotices,
  saveBehaviorDeductionNoticeLocal,
  deleteBehaviorDeductionNoticeLocal,
  getViolationCompensations,
  saveViolationCompensationLocal,
  deleteViolationCompensationLocal,
  getDeviceConfiscations,
  saveDeviceConfiscationLocal,
  deleteDeviceConfiscationLocal,
  getDeviceReturns,
  saveDeviceReturnLocal,
  deleteDeviceReturnLocal,
  getAuthorizedPickupCommitments,
  saveAuthorizedPickupCommitmentLocal,
  deleteAuthorizedPickupCommitmentLocal,
  getAttendanceCommitments,
  saveAttendanceCommitmentLocal,
  deleteAttendanceCommitmentLocal,
} from '../storage';

export type FormTabType =
  | 'bundle-engine'
  | 'model6-violation'
  | 'model7-notice'
  | 'model8-summon'
  | 'model9-warning'
  | 'model10-commitment'
  | 'model20-deduction'
  | 'model21-compensation'
  | 'model24-confiscation'
  | 'model25-return'
  | 'model26-pickup'
  | 'model27-attendance'
  | 'all-archive';

interface FormsPageProps {
  students: Student[];
  counselor: CounselorUser | AppUser | null;
  warningForms: WarningFormRecord[];
  parentSummonForms: ParentSummonFormRecord[];
  violationReports?: ViolationReportRecord[];
  parentNoticeForms?: ParentNoticeFormRecord[];
  parentCommitmentForms?: ParentCommitmentFormRecord[];
  violations?: ViolationRecord[];
  onSaveWarningForm: (form: WarningFormRecord) => void;
  onSaveSummonForm: (form: ParentSummonFormRecord) => Promise<void>;
  onDeleteSummonForm?: (formId: string, studentName?: string) => Promise<void>;
  onSaveViolationReport?: (form: ViolationReportRecord) => Promise<void>;
  onDeleteViolationReport?: (formId: string, studentName?: string) => Promise<void>;
  onSaveNoticeForm?: (form: ParentNoticeFormRecord) => Promise<void>;
  onDeleteNoticeForm?: (formId: string, studentName?: string) => Promise<void>;
  onSaveCommitmentForm?: (form: ParentCommitmentFormRecord) => Promise<void>;
  onDeleteCommitmentForm?: (formId: string, studentName?: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  selectedStudentIdForForm?: string | null;
  selectedViolationIdForForm?: string | null;
  initialSubTab?: FormTabType;
}

export const FormsPage: React.FC<FormsPageProps> = ({
  students,
  counselor,
  warningForms,
  parentSummonForms,
  violationReports = [],
  parentNoticeForms = [],
  parentCommitmentForms = [],
  violations = [],
  onSaveWarningForm,
  onSaveSummonForm,
  onDeleteSummonForm,
  onSaveViolationReport,
  onDeleteViolationReport,
  onSaveNoticeForm,
  onDeleteNoticeForm,
  onSaveCommitmentForm,
  onDeleteCommitmentForm,
  onShowToast,
  selectedStudentIdForForm,
  selectedViolationIdForForm,
  initialSubTab = 'model8-summon',
}) => {
  const [activeTab, setActiveTab] = useState<FormTabType>(initialSubTab);

  // Grade & Section search modal state
  const [isGradeSectionModalOpen, setIsGradeSectionModalOpen] = useState(false);
  const [currentSelectedStudentId, setCurrentSelectedStudentId] = useState<string | null>(
    selectedStudentIdForForm || null
  );
  const [currentSelectedViolationId, setCurrentSelectedViolationId] = useState<string | null>(
    selectedViolationIdForForm || null
  );

  useEffect(() => {
    if (selectedStudentIdForForm) {
      setCurrentSelectedStudentId(selectedStudentIdForForm);
    }
  }, [selectedStudentIdForForm]);

  useEffect(() => {
    if (selectedViolationIdForForm) {
      setCurrentSelectedViolationId(selectedViolationIdForForm);
    }
  }, [selectedViolationIdForForm]);

  const handleSelectStudentFromGradeSectionModal = (
    studentId: string,
    formTab: FormTabType,
    violationId?: string
  ) => {
    setCurrentSelectedStudentId(studentId);
    if (violationId) {
      setCurrentSelectedViolationId(violationId);
    }
    setActiveTab(formTab);

    const st = students.find((s) => s.id === studentId);
    const stName = st ? st.fullName : 'الطالب';
    onShowToast(`تم تحديد الطالب (${stName}) وتجهيز النموذج بنجاح`, 'success');
  };

  // Sync initialSubTab if parent requests it
  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab, selectedStudentIdForForm]);

  // Print Modals for archive actions
  const [activeSummonToPrint, setActiveSummonToPrint] = useState<ParentSummonFormRecord | null>(null);
  const [activeWarningToPrint, setActiveWarningToPrint] = useState<WarningFormRecord | null>(null);
  const [activeReportToPrint, setActiveReportToPrint] = useState<ViolationReportRecord | null>(null);
  const [activeNoticeToPrint, setActiveNoticeToPrint] = useState<ParentNoticeFormRecord | null>(null);
  const [activeCommitmentToPrint, setActiveCommitmentToPrint] = useState<ParentCommitmentFormRecord | null>(null);
  const [activeDeductionToPrint, setActiveDeductionToPrint] = useState<BehaviorDeductionNoticeRecord | null>(null);
  const [activeCompensationToPrint, setActiveCompensationToPrint] = useState<ViolationCompensationRecord | null>(null);
  const [activeConfiscationToPrint, setActiveConfiscationToPrint] = useState<DeviceConfiscationRecord | null>(null);
  const [activeReturnToPrint, setActiveReturnToPrint] = useState<DeviceReturnRecord | null>(null);
  const [activePickupToPrint, setActivePickupToPrint] = useState<AuthorizedPickupCommitmentRecord | null>(null);
  const [activeAttendanceToPrint, setActiveAttendanceToPrint] = useState<AttendanceCommitmentRecord | null>(null);

  // States for the 6 new official models
  const [m20Forms, setM20Forms] = useState<BehaviorDeductionNoticeRecord[]>(() => {
    try {
      return getBehaviorDeductionNotices();
    } catch {
      return [];
    }
  });
  const [m21Forms, setM21Forms] = useState<ViolationCompensationRecord[]>(() => {
    try {
      return getViolationCompensations();
    } catch {
      return [];
    }
  });
  const [m24Forms, setM24Forms] = useState<DeviceConfiscationRecord[]>(() => {
    try {
      return getDeviceConfiscations();
    } catch {
      return [];
    }
  });
  const [m25Forms, setM25Forms] = useState<DeviceReturnRecord[]>(() => {
    try {
      return getDeviceReturns();
    } catch {
      return [];
    }
  });
  const [m26Forms, setM26Forms] = useState<AuthorizedPickupCommitmentRecord[]>(() => {
    try {
      return getAuthorizedPickupCommitments();
    } catch {
      return [];
    }
  });
  const [m27Forms, setM27Forms] = useState<AttendanceCommitmentRecord[]>(() => {
    try {
      return getAttendanceCommitments();
    } catch {
      return [];
    }
  });

  // State for passing preselected confiscation to return tab
  const [preselectedConfiscationForReturn, setPreselectedConfiscationForReturn] = useState<DeviceConfiscationRecord | null>(null);

  // Handlers for 6 new models
  const handleSaveM20 = async (form: BehaviorDeductionNoticeRecord) => {
    saveBehaviorDeductionNoticeLocal(form);
    setM20Forms((prev) => {
      const idx = prev.findIndex((f) => f.id === form.id);
      return idx >= 0 ? prev.map((f) => (f.id === form.id ? form : f)) : [form, ...prev];
    });
  };
  const handleDeleteM20 = async (formId: string) => {
    deleteBehaviorDeductionNoticeLocal(formId);
    setM20Forms((prev) => prev.filter((f) => f.id !== formId));
    onShowToast('تم حذف نموذج حسم الدرجات بنجاح', 'info');
  };

  const handleSaveM21 = async (form: ViolationCompensationRecord) => {
    saveViolationCompensationLocal(form);
    setM21Forms((prev) => {
      const idx = prev.findIndex((f) => f.id === form.id);
      return idx >= 0 ? prev.map((f) => (f.id === form.id ? form : f)) : [form, ...prev];
    });
  };
  const handleDeleteM21 = async (formId: string) => {
    deleteViolationCompensationLocal(formId);
    setM21Forms((prev) => prev.filter((f) => f.id !== formId));
    onShowToast('تم حذف نموذج التعويض بنجاح', 'info');
  };

  const handleSaveM24 = async (form: DeviceConfiscationRecord) => {
    saveDeviceConfiscationLocal(form);
    setM24Forms((prev) => {
      const idx = prev.findIndex((f) => f.id === form.id);
      return idx >= 0 ? prev.map((f) => (f.id === form.id ? form : f)) : [form, ...prev];
    });
  };
  const handleDeleteM24 = async (formId: string) => {
    deleteDeviceConfiscationLocal(formId);
    setM24Forms((prev) => prev.filter((f) => f.id !== formId));
    onShowToast('تم حذف سجل مصادرة الجهاز بنجاح', 'info');
  };

  const handleSaveM25 = async (form: DeviceReturnRecord) => {
    saveDeviceReturnLocal(form);
    setM25Forms((prev) => {
      const idx = prev.findIndex((f) => f.id === form.id);
      return idx >= 0 ? prev.map((f) => (f.id === form.id ? form : f)) : [form, ...prev];
    });
    // If linked to confiscation, update its status
    if (form.confiscationFormId) {
      setM24Forms((prev) =>
        prev.map((c) =>
          c.id === form.confiscationFormId ? { ...c, status: 'تمت الإعادة لولي الأمر' } : c
        )
      );
      const confItem = m24Forms.find((c) => c.id === form.confiscationFormId);
      if (confItem) {
        saveDeviceConfiscationLocal({ ...confItem, status: 'تمت الإعادة لولي الأمر' });
      }
    }
  };
  const handleDeleteM25 = async (formId: string) => {
    deleteDeviceReturnLocal(formId);
    setM25Forms((prev) => prev.filter((f) => f.id !== formId));
    onShowToast('تم حذف سجل إعادة الجهاز بنجاح', 'info');
  };

  const handleSaveM26 = async (form: AuthorizedPickupCommitmentRecord) => {
    saveAuthorizedPickupCommitmentLocal(form);
    setM26Forms((prev) => {
      const idx = prev.findIndex((f) => f.id === form.id);
      return idx >= 0 ? prev.map((f) => (f.id === form.id ? form : f)) : [form, ...prev];
    });
  };
  const handleDeleteM26 = async (formId: string) => {
    deleteAuthorizedPickupCommitmentLocal(formId);
    setM26Forms((prev) => prev.filter((f) => f.id !== formId));
    onShowToast('تم حذف تعهد الاستلام بنجاح', 'info');
  };

  const handleSaveM27 = async (form: AttendanceCommitmentRecord) => {
    saveAttendanceCommitmentLocal(form);
    setM27Forms((prev) => {
      const idx = prev.findIndex((f) => f.id === form.id);
      return idx >= 0 ? prev.map((f) => (f.id === form.id ? form : f)) : [form, ...prev];
    });
  };
  const handleDeleteM27 = async (formId: string) => {
    deleteAttendanceCommitmentLocal(formId);
    setM27Forms((prev) => prev.filter((f) => f.id !== formId));
    onShowToast('تم حذف تعهد الدوام المدرسي بنجاح', 'info');
  };

  // Search in unified archive
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<
    'all' | 'model6' | 'model7' | 'model8' | 'model9' | 'model10' | 'model20' | 'model21' | 'model24' | 'model25' | 'model26' | 'model27'
  >('all');

  // Stats calculation
  const totalModel6 = violationReports.length;
  const totalModel7 = parentNoticeForms.length;
  const totalModel8 = parentSummonForms.length;
  const totalModel9 = warningForms.length;
  const totalModel10 = parentCommitmentForms.length;
  const totalModel20 = m20Forms.length;
  const totalModel21 = m21Forms.length;
  const totalModel24 = m24Forms.length;
  const totalModel25 = m25Forms.length;
  const totalModel26 = m26Forms.length;
  const totalModel27 = m27Forms.length;

  const signedModel6 = violationReports.filter((r) => !!r.signatures?.student?.signatureUrl).length;
  const signedModel7 = parentNoticeForms.filter((n) => !!n.studentSignature).length;
  const signedModel8 = parentSummonForms.filter((f) => !!f.studentSignature).length;
  const signedModel9 = warningForms.filter((f) => !!f.studentSignature).length;
  const signedModel10 = parentCommitmentForms.filter((c) => !!c.parentSignature).length;
  const signedModel20 = m20Forms.filter((f) => !!f.parentSignature).length;
  const signedModel21 = m21Forms.filter((f) => !!f.principalSignature).length;
  const signedModel24 = m24Forms.filter((f) => !!f.parentSignature).length;
  const signedModel25 = m25Forms.filter((f) => !!f.parentSignature).length;
  const signedModel26 = m26Forms.filter((f) => !!f.parentSignature).length;
  const signedModel27 = m27Forms.filter((f) => !!f.parentSignature).length;

  const totalSigned =
    signedModel6 +
    signedModel7 +
    signedModel8 +
    signedModel9 +
    signedModel10 +
    signedModel20 +
    signedModel21 +
    signedModel24 +
    signedModel25 +
    signedModel26 +
    signedModel27;

  // New States for Form Selection (Step 1) & Categorization
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [formCategoryFilter, setFormCategoryFilter] = useState<
    'all' | 'violations' | 'marks' | 'devices' | 'attendance' | 'archive'
  >('all');
  const [isFormSelectorOpen, setIsFormSelectorOpen] = useState(false);

  // New State for Student Search (Step 2)
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Unified items for archive
  interface UnifiedFormItem {
    id: string;
    type:
      | 'model6'
      | 'model7'
      | 'model8'
      | 'model9'
      | 'model10'
      | 'model20'
      | 'model21'
      | 'model24'
      | 'model25'
      | 'model26'
      | 'model27';
    typeName: string;
    modelBadge: string;
    studentName: string;
    studentNumber: string;
    grade: string;
    date: string;
    subjectOrAction: string;
    isSigned: boolean;
    status: string;
    rawSummon?: ParentSummonFormRecord;
    rawWarning?: WarningFormRecord;
    rawReport?: ViolationReportRecord;
    rawNotice?: ParentNoticeFormRecord;
    rawCommitment?: ParentCommitmentFormRecord;
    rawDeduction?: BehaviorDeductionNoticeRecord;
    rawCompensation?: ViolationCompensationRecord;
    rawConfiscation?: DeviceConfiscationRecord;
    rawReturn?: DeviceReturnRecord;
    rawPickup?: AuthorizedPickupCommitmentRecord;
    rawAttendance?: AttendanceCommitmentRecord;
  }

  const unifiedList: UnifiedFormItem[] = useMemo(() => {
    const list: UnifiedFormItem[] = [];

    // Map Model 6
    for (const r of violationReports) {
      list.push({
        id: r.id,
        type: 'model6',
        typeName: 'تقرير مخالفة سلوكية',
        modelBadge: 'نموذج (6)',
        studentName: r.studentName,
        studentNumber: r.studentNumber,
        grade: `الصف ${r.grade}`,
        date: r.incidentDate,
        subjectOrAction: r.violationDegree || r.violationDetails,
        isSigned: !!r.signatures?.student?.signatureUrl,
        status: r.status,
        rawReport: r,
      });
    }

    // Map Model 7
    for (const n of parentNoticeForms) {
      list.push({
        id: n.id,
        type: 'model7',
        typeName: `${n.noticeType} لولي الأمر`,
        modelBadge: 'نموذج (7)',
        studentName: n.studentName,
        studentNumber: n.studentNumber,
        grade: `الصف ${n.grade}`,
        date: n.incidentDate || n.issueDate,
        subjectOrAction: n.violationDetails,
        isSigned: !!n.studentSignature,
        status: n.status,
        rawNotice: n,
      });
    }

    // Map Model 8
    for (const f of parentSummonForms) {
      list.push({
        id: f.id,
        type: 'model8',
        typeName: 'خطاب استدعاء ولي الأمر',
        modelBadge: 'نموذج (8)',
        studentName: f.studentName,
        studentNumber: f.studentNumber,
        grade: `الصف ${f.grade}`,
        date: f.summonDate,
        subjectOrAction: f.subject,
        isSigned: !!f.studentSignature,
        status: f.status,
        rawSummon: f,
      });
    }

    // Map Model 9
    for (const w of warningForms) {
      list.push({
        id: w.id,
        type: 'model9',
        typeName: 'تنبيه خطي وتعهد سلوكي',
        modelBadge: 'نموذج (9)',
        studentName: w.studentName,
        studentNumber: w.studentNumber,
        grade: `الصف ${w.grade}`,
        date: w.formDate,
        subjectOrAction: w.actionTaken || 'تنبيه خطي رسمي وتعهد سلوكي',
        isSigned: !!w.studentSignature,
        status: w.status,
        rawWarning: w,
      });
    }

    // Map Model 10
    for (const c of parentCommitmentForms) {
      list.push({
        id: c.id,
        type: 'model10',
        typeName: 'تعهد ولي الأمر بتكرار المخالفات',
        modelBadge: 'نموذج (10)',
        studentName: c.studentName,
        studentNumber: c.studentNumber,
        grade: `الصف ${c.grade}`,
        date: c.issueDate,
        subjectOrAction: c.violationsList.filter(Boolean).join(' | ') || 'تعهد بتكرار المخالفات',
        isSigned: !!c.parentSignature,
        status: c.status,
        rawCommitment: c,
      });
    }

    // Map Model 20
    for (const d of m20Forms) {
      list.push({
        id: d.id,
        type: 'model20',
        typeName: 'إشعار حسم درجات سلوك',
        modelBadge: 'نموذج (20)',
        studentName: d.studentName,
        studentNumber: d.studentNumber,
        grade: `الصف ${d.grade}`,
        date: d.noticeDate,
        subjectOrAction: `حسم ${d.deductedMarks} درجات - ${d.violationDescription}`,
        isSigned: !!d.parentSignature,
        status: d.status,
        rawDeduction: d,
      });
    }

    // Map Model 21
    for (const c of m21Forms) {
      list.push({
        id: c.id,
        type: 'model21',
        typeName: 'نموذج تعويض عن مخالفة',
        modelBadge: 'نموذج (21)',
        studentName: c.studentName,
        studentNumber: c.studentNumber,
        grade: `الصف ${c.grade}`,
        date: c.createdAt,
        subjectOrAction: `تعويض +${c.totalPositiveMarksAfterCompensation} درجات (النهائي ${c.finalTermMarks}/100)`,
        isSigned: !!c.principalSignature,
        status: c.status,
        rawCompensation: c,
      });
    }

    // Map Model 24
    for (const dev of m24Forms) {
      list.push({
        id: dev.id,
        type: 'model24',
        typeName: 'مصادرة أجهزة إلكترونية',
        modelBadge: 'نموذج (24)',
        studentName: dev.studentName,
        studentNumber: dev.studentNumber,
        grade: `الصف ${dev.grade}`,
        date: dev.confiscationDate,
        subjectOrAction: dev.deviceDescription,
        isSigned: !!dev.parentSignature,
        status: dev.status,
        rawConfiscation: dev,
      });
    }

    // Map Model 25
    for (const ret of m25Forms) {
      list.push({
        id: ret.id,
        type: 'model25',
        typeName: 'إعادة أجهزة إلكترونية',
        modelBadge: 'نموذج (25)',
        studentName: ret.studentName,
        studentNumber: ret.studentNumber,
        grade: `الصف ${ret.grade}`,
        date: ret.returnDate,
        subjectOrAction: ret.deviceDescription,
        isSigned: !!ret.parentSignature,
        status: ret.status,
        rawReturn: ret,
      });
    }

    // Map Model 26
    for (const p of m26Forms) {
      list.push({
        id: p.id,
        type: 'model26',
        typeName: 'تعهد المخولين بالاستلام',
        modelBadge: 'نموذج (26)',
        studentName: p.studentName,
        studentNumber: p.studentNumber,
        grade: `الصف ${p.grade}`,
        date: p.issueDate,
        subjectOrAction: `المخول: ${p.authorizedPersonName} (${p.authorizedPersonRelation})`,
        isSigned: !!p.parentSignature,
        status: p.status,
        rawPickup: p,
      });
    }

    // Map Model 27
    for (const a of m27Forms) {
      list.push({
        id: a.id,
        type: 'model27',
        typeName: 'تعهد الالتزام بالدوام المدرسي',
        modelBadge: 'نموذج (27)',
        studentName: a.studentName,
        studentNumber: a.studentNumber,
        grade: `الصف ${a.grade}`,
        date: a.issueDate,
        subjectOrAction: `تعهد مواظبة وعدم غياب - ولي الأمر: ${a.parentName}`,
        isSigned: !!a.parentSignature,
        status: a.status,
        rawAttendance: a,
      });
    }

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    violationReports,
    parentNoticeForms,
    parentSummonForms,
    warningForms,
    parentCommitmentForms,
    m20Forms,
    m21Forms,
    m24Forms,
    m25Forms,
    m26Forms,
    m27Forms,
  ]);

  const filteredUnifiedList = useMemo(() => {
    return unifiedList.filter((item) => {
      if (archiveFilter === 'model6' && item.type !== 'model6') return false;
      if (archiveFilter === 'model7' && item.type !== 'model7') return false;
      if (archiveFilter === 'model8' && item.type !== 'model8') return false;
      if (archiveFilter === 'model9' && item.type !== 'model9') return false;
      if (archiveFilter === 'model10' && item.type !== 'model10') return false;
      if (archiveFilter === 'model20' && item.type !== 'model20') return false;
      if (archiveFilter === 'model21' && item.type !== 'model21') return false;
      if (archiveFilter === 'model24' && item.type !== 'model24') return false;
      if (archiveFilter === 'model25' && item.type !== 'model25') return false;
      if (archiveFilter === 'model26' && item.type !== 'model26') return false;
      if (archiveFilter === 'model27' && item.type !== 'model27') return false;
      if (!archiveSearch.trim()) return true;

      const q = archiveSearch.toLowerCase().trim();
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.studentNumber.includes(q) ||
        item.subjectOrAction.toLowerCase().includes(q) ||
        item.date.includes(q) ||
        item.typeName.toLowerCase().includes(q)
      );
    });
  }, [unifiedList, archiveFilter, archiveSearch]);

  // Structured definitions for all official models
  const formDefinitions = useMemo(() => [
    {
      id: 'bundle-engine' as FormTabType,
      number: 'حزمة',
      badge: 'محرك الحزمة',
      title: 'حزمة النماذج الرسمية للواقعة السلوكية',
      category: 'violations' as const,
      categoryLabel: 'حزمة النماذج الموحدة',
      description: 'إنشاء حزمة متكاملة من النماذج الرسمية للواقعة السلوكية بمراجعة موحدة للحقول المشتركة',
      requiredSignatures: [
        'توقيعات النماذج المختارة في الحزمة',
      ],
      icon: Layers,
      color: 'teal',
      count: violations.length,
    },
    {
      id: 'model6-violation' as FormTabType,
      number: '6',
      badge: 'نموذج (6)',
      title: 'تقرير توثيق مخالفة سلوكية',
      category: 'violations' as const,
      categoryLabel: 'إجراءات ومخالفات',
      description: 'توثيق رسمي لوقائع المخالفات السلوكية وضبط الإجراءات المتخذة وملاحظات المرشد',
      requiredSignatures: [
        'توقيع الطالب بالعلم',
        'توقيع رائد الصف / المعلم الشاهد',
        'توقيع المرشد الطلابي أو مدير المدرسة',
      ],
      icon: FileText,
      color: 'rose',
      count: totalModel6,
    },
    {
      id: 'model7-notice' as FormTabType,
      number: '7',
      badge: 'نموذج (7)',
      title: 'إشعار ولي أمر بمخالفة سلوكية',
      category: 'violations' as const,
      categoryLabel: 'إجراءات ومخالفات',
      description: 'إخطار كتابي رسمي لولي الأمر بنوع ودرجة المخالفة السلوكية والإجراء التربوي المطبق',
      requiredSignatures: [
        'توقيع مدير المدرسة أو المرشد',
        'توقيع ولي الأمر بالعلم والاستلام',
      ],
      icon: AlertTriangle,
      color: 'amber',
      count: totalModel7,
    },
    {
      id: 'model8-summon' as FormTabType,
      number: '8',
      badge: 'نموذج (8)',
      title: 'استدعاء ولي أمر طالب مخالف',
      category: 'violations' as const,
      categoryLabel: 'إجراءات ومخالفات',
      description: 'طلب حضور رسمي عاجل لولي الأمر للمدرسة لمناقشة وضع الطالب وسلوكه واتخاذ الإجراء',
      requiredSignatures: [
        'توقيع الإدارة المدرسية / المرشد',
        'توقيع ولي الأمر عند الحضور والمناقشة',
      ],
      icon: FileSignature,
      color: 'amber',
      count: totalModel8,
    },
    {
      id: 'model9-warning' as FormTabType,
      number: '9',
      badge: 'نموذج (9)',
      title: 'إنذار خطي وتعهد عدم تكرار',
      category: 'violations' as const,
      categoryLabel: 'إجراءات ومخالفات',
      description: 'إنذار خطي رسمي صادر للطالب لمخالفات الدرجة الأولى والثانية مع تعهد خطي بعدم التكرار',
      requiredSignatures: [
        'توقيع الطالب المخالف',
        'توقيع ولي الأمر بالعلم',
        'اعتماد مدير المدرسة',
      ],
      icon: FileCheck,
      color: 'blue',
      count: totalModel9,
    },
    {
      id: 'model10-commitment' as FormTabType,
      number: '10',
      badge: 'نموذج (10)',
      title: 'تعهد ولي الأمر عند تكرار المخالفات',
      category: 'violations' as const,
      categoryLabel: 'إجراءات ومخالفات',
      description: 'تعهد خطي ملزم لولي الأمر بتحمل المسؤولية والتعاون الكامل مع المدرسة لتعديل سلوك الطالب',
      requiredSignatures: [
        'توقيع ولي الأمر بالتعهد',
        'اعتماد إدارة المدرسة',
      ],
      icon: ShieldCheck,
      color: 'indigo',
      count: totalModel10,
    },
    {
      id: 'model20-deduction' as FormTabType,
      number: '20',
      badge: 'نموذج (20)',
      title: 'إشعار خطي بحسم درجات السلوك',
      category: 'marks' as const,
      categoryLabel: 'درجات السلوك والتعويض',
      description: 'إشعار خطي رسمي صادر لولي الأمر بتفاصيل الحسم المعتمد من درجات السلوك ورصيد الطالب',
      requiredSignatures: [
        'توقيع مدير المدرسة',
        'توقيع المرشد الطلابي',
        'توقيع ولي الأمر بالعلم بالحسم',
      ],
      icon: MinusCircle,
      color: 'rose',
      count: totalModel20,
    },
    {
      id: 'model21-compensation' as FormTabType,
      number: '21',
      badge: 'نموذج (21)',
      title: 'نموذج تعويض درجات السلوك',
      category: 'marks' as const,
      categoryLabel: 'درجات السلوك والتعويض',
      description: 'خطة تعويض الدرجات المحسومة عبر السلوك الإيجابي والأنشطة المدرسية وخدمة المجتمع',
      requiredSignatures: [
        'توقيع المرشد الأكاديمي',
        'توقيع مدير المدرسة',
        'اعتماد لجنة إدارة السلوك',
      ],
      icon: Award,
      color: 'emerald',
      count: totalModel21,
    },
    {
      id: 'model24-confiscation' as FormTabType,
      number: '24',
      badge: 'نموذج (24)',
      title: 'محضر ضبط ومصادرة أجهزة إلكترونية',
      category: 'devices' as const,
      categoryLabel: 'الأجهزة والمضبوطات',
      description: 'محضر إثبات ضبط جهاز إلكتروني أو مادة غير مصرح بها داخل الحرم المدرسي وحفظها في الخزينة',
      requiredSignatures: [
        'توقيع محرر محضر الضبط',
        'توقيع الطالب بالعلم',
        'توقيع ولي الأمر عند الإشعار',
      ],
      icon: Smartphone,
      color: 'purple',
      count: totalModel24,
    },
    {
      id: 'model25-return' as FormTabType,
      number: '25',
      badge: 'نموذج (25)',
      title: 'إقرار استلام وإعادة جهاز مصادر',
      category: 'devices' as const,
      categoryLabel: 'الأجهزة والمضبوطات',
      description: 'محضر رسمي بتسليم الجهاز المصادر لولي الأمر بعد انقضاء مدة الحجز النظامية والتعهد',
      requiredSignatures: [
        'توقيع ولي الأمر المستلم',
        'توقيع مسؤول التسليم',
        'اعتماد مدير المدرسة',
      ],
      icon: SmartphoneCharging,
      color: 'teal',
      count: totalModel25,
    },
    {
      id: 'model26-pickup' as FormTabType,
      number: '26',
      badge: 'نموذج (26)',
      title: 'تعهد وتفويض المخولين بالاستلام',
      category: 'attendance' as const,
      categoryLabel: 'المواظبة والاستلام',
      description: 'تفويض رسمي معتمد من ولي الأمر بالأشخاص المصرح لهم قانونياً باستلام الطالب من المدرسة',
      requiredSignatures: [
        'توقيع ولي الأمر المفوض',
        'اعتماد الإدارة المدرسية',
      ],
      icon: Car,
      color: 'blue',
      count: totalModel26,
    },
    {
      id: 'model27-attendance' as FormTabType,
      number: '27',
      badge: 'نموذج (27)',
      title: 'تعهد الالتزام بالدوام والمواظبة',
      category: 'attendance' as const,
      categoryLabel: 'المواظبة والاستلام',
      description: 'تعهد خطي ملزم للطالب وولي الأمر بعدم تكرار التأخر الصباحي أو الغياب والالتزام بالحضور',
      requiredSignatures: [
        'توقيع ولي الأمر',
        'توقيع الطالب',
        'اعتماد إدارة المدرسة / المرشد',
      ],
      icon: CalendarCheck,
      color: 'cyan',
      count: totalModel27,
    },
    {
      id: 'all-archive' as FormTabType,
      number: 'أرشيف',
      badge: 'الأرشيف الموحد',
      title: 'سجل وأرشيف النماذج الصادرة',
      category: 'archive' as const,
      categoryLabel: 'الأرشيف والسجلات',
      description: 'استعراض وبحث وطباعة وإدارة كافة الخطابات والنماذج والتعهدات الصادرة لجميع الطلبة',
      requiredSignatures: [],
      icon: Layers,
      color: 'slate',
      count: unifiedList.length,
    },
  ], [
    totalModel6,
    totalModel7,
    totalModel8,
    totalModel9,
    totalModel10,
    totalModel20,
    totalModel21,
    totalModel24,
    totalModel25,
    totalModel26,
    totalModel27,
    unifiedList.length,
  ]);

  const filteredFormDefinitions = useMemo(() => {
    return formDefinitions.filter((item) => {
      if (formCategoryFilter !== 'all' && item.category !== formCategoryFilter) {
        return false;
      }
      if (!formSearchQuery.trim()) return true;
      const q = formSearchQuery.trim().toLowerCase();
      return (
        item.number.includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [formDefinitions, formCategoryFilter, formSearchQuery]);

  const activeFormDef = useMemo(() => {
    return formDefinitions.find((f) => f.id === activeTab) || formDefinitions[0];
  }, [formDefinitions, activeTab]);

  const activeStudent = useMemo(() => {
    if (!currentSelectedStudentId) return null;
    return students.find((s) => s.id === currentSelectedStudentId || s.studentNumber === currentSelectedStudentId) || null;
  }, [students, currentSelectedStudentId]);

  const filteredStudentsForSelection = useMemo(() => {
    if (!studentSearchQuery.trim()) return [];
    const q = studentSearchQuery.trim().toLowerCase();
    return students
      .filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentNumber.toLowerCase().includes(q) ||
          s.grade.includes(q) ||
          s.section.includes(q)
      )
      .slice(0, 8);
  }, [students, studentSearchQuery]);

  return (
    <div className="space-y-6">
      {/* 4-Step Workflow Progress Bar & Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 text-[#006D77] border border-teal-100 flex items-center justify-center shrink-0 shadow-2xs">
              <FileSignature className="w-5 h-5 text-[#006D77]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  منظومة النماذج والتوقيعات الرسمية
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006D77] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200/60">
                  القرار الوزاري 851
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                مسار عمل متتابع ومنظم لإعداد النماذج وتحديد الطلبة وتوثيق التوقيعات المعتمدة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('bundle-engine');
                setIsFormSelectorOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'bundle-engine'
                  ? 'bg-[#006D77] text-white border-[#006D77] shadow-xs'
                  : 'bg-teal-50 text-[#006D77] border-teal-200 hover:bg-teal-100'
              }`}
            >
              <Layers className="w-4 h-4 text-[#D4AF37]" />
              <span>حزمة النماذج الرسمية</span>
            </button>

            <button
              type="button"
              onClick={() => setIsGradeSectionModalOpen(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-900 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              title="البحث عن طريق الصفوف والشعب والمسارات"
            >
              <Layers className="w-4 h-4 text-slate-900" />
              <span>البحث بالصفوف والشعب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('all-archive');
                setIsFormSelectorOpen(false);
              }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                activeTab === 'all-archive'
                  ? 'bg-[#0C2340] text-white border-[#0C2340] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>الأرشيف الموحد ({unifiedList.length})</span>
            </button>
          </div>
        </div>

        {/* 4 Sequential Workflow Steps Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Step 1 Indicator */}
          <div
            onClick={() => setIsFormSelectorOpen(!isFormSelectorOpen)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab !== 'all-archive'
                ? 'bg-teal-50/70 border-teal-200 shadow-2xs ring-1 ring-teal-500/20'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#006D77] flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-mono flex items-center justify-center font-bold">1</span>
                <span>اختيار النموذج</span>
              </span>
              <span className="text-[10px] text-teal-800 font-bold bg-teal-100/80 px-2 py-0.5 rounded-md">
                {activeFormDef.badge}
              </span>
            </div>
            <p className="text-slate-800 font-bold text-xs truncate mb-1">
              {activeFormDef.title}
            </p>
            <span className="text-[10px] text-teal-700 underline font-medium block">
              {isFormSelectorOpen ? 'إغلاق قائمة النماذج ▲' : 'تغيير النموذج ▼'}
            </span>
          </div>

          {/* Step 2 Indicator */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              activeStudent
                ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs ring-1 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center font-bold ${
                  activeStudent ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                }`}>2</span>
                <span>تحديد الطالب</span>
              </span>
              {activeStudent ? (
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">
                  تم التحديد
                </span>
              ) : (
                <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                  مطلوب
                </span>
              )}
            </div>
            <p className="text-slate-800 font-bold text-xs truncate mb-1">
              {activeStudent ? activeStudent.fullName : 'لم يتم تحديد طالب بعد'}
            </p>
            <span className="text-[10px] text-slate-500 block truncate font-mono">
              {activeStudent ? `الصف ${activeStudent.grade} (${activeStudent.section}) • #${activeStudent.studentNumber}` : 'ابحث بالاسم أو الرقم الطلابي أدناه'}
            </span>
          </div>

          {/* Step 3 Indicator */}
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">3</span>
                <span>استكمال البيانات</span>
              </span>
              <span className="text-[10px] text-slate-600 font-bold bg-slate-200/80 px-2 py-0.5 rounded-md">
                التحرير
              </span>
            </div>
            <p className="text-slate-700 text-xs font-medium truncate mb-1">
              تعبئة بنود وتفاصيل الواقعة والإجراء
            </p>
            <span className="text-[10px] text-slate-400 block truncate">
              الحقول والمرفقات والتاريخ والوقت
            </span>
          </div>

          {/* Step 4 Indicator */}
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-[10px] font-mono flex items-center justify-center font-bold">4</span>
                <span>التوقيعات والحفظ</span>
              </span>
              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                الاعتماد
              </span>
            </div>
            <p className="text-slate-700 text-xs font-medium truncate mb-1">
              {activeFormDef.requiredSignatures.length > 0
                ? `${activeFormDef.requiredSignatures.length} توقيعات محددة باللائحة`
                : 'السجل العام والأرشيف'}
            </p>
            <span className="text-[10px] text-slate-400 block truncate">
              توقيع إلكتروني وطباعة وأرشفة فورية
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: FORM SELECTION & CATEGORIZED SEARCH (Collapsible / Switcher) */}
      {isFormSelectorOpen ? (
        <div className="bg-white rounded-2xl border-2 border-[#006D77]/40 shadow-md p-5 sm:p-6 space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#006D77] text-white flex items-center justify-center text-xs font-mono font-bold">1</span>
                <span>اختيار النموذج الرسمي المطلوب ({filteredFormDefinitions.length} نموذج متاح)</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ابحث برقم النموذج أو اسمه، أو اختر من التصنيفات أدناه
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsFormSelectorOpen(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer self-start sm:self-auto flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>إغلاق القائمة</span>
            </button>
          </div>

          {/* Search Input & Category Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                value={formSearchQuery}
                onChange={(e) => setFormSearchQuery(e.target.value)}
                placeholder="ابحث باسم النموذج أو رقمه (مثال: 6، 8، استدعاء، حسم، مصادرة، تعهد...)"
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] focus:bg-white transition-all shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              {formSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFormSearchQuery('')}
                  className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: 'كافة النماذج (12)' },
                { id: 'violations', label: 'المخالفات والإجراءات (5)' },
                { id: 'marks', label: 'الدرجات والتعويض (2)' },
                { id: 'devices', label: 'الأجهزة والمضبوطات (2)' },
                { id: 'attendance', label: 'المواظبة والاستلام (2)' },
                { id: 'archive', label: 'الأرشيف الشامل' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormCategoryFilter(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    formCategoryFilter === cat.id
                      ? 'bg-[#006D77] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
            {filteredFormDefinitions.map((form) => {
              const Icon = form.icon;
              const isSelected = activeTab === form.id;
              return (
                <div
                  key={form.id}
                  onClick={() => {
                    setActiveTab(form.id);
                    setIsFormSelectorOpen(false);
                    onShowToast(`تم اختيار ${form.title}`, 'info');
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-teal-50/80 border-[#006D77] shadow-sm ring-2 ring-[#006D77]/20'
                      : 'bg-white border-slate-200 hover:border-[#006D77]/50 hover:shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-black text-[#0C2340] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {form.badge}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                        {form.categoryLabel}
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#006D77] flex items-center justify-center shrink-0 border border-teal-100">
                        <Icon className="w-4 h-4 text-[#006D77]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                          {form.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">
                          {form.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Required Signatures Preview */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {form.requiredSignatures.length > 0 ? (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">
                          التوقيعات المطلوبة:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {form.requiredSignatures.map((sig, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md"
                            >
                              ✓ {sig}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 block font-medium">
                        سجل واستعراض النماذج المعتمدة
                      </span>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="font-mono text-slate-500 font-bold">
                        {form.count} سجل محفوظ
                      </span>
                      <span className={`font-bold ${isSelected ? 'text-[#006D77]' : 'text-slate-600'}`}>
                        {isSelected ? 'النموذج المختار حالياً ●' : 'اختيار وتعبئة ⟵'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ACTIVE MODEL BANNER & REQUIRED SIGNATURES BAR */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-[#0C2340] text-[#D4AF37] font-black text-xs font-mono shadow-2xs">
                {activeFormDef.badge}
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900">
                  {activeFormDef.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeFormDef.description}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFormSelectorOpen(true)}
              className="text-xs font-bold text-[#006D77] hover:text-[#005a63] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1.5 active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تغيير النموذج (عرض قائمة النماذج)</span>
            </button>
          </div>

          {/* STEP 4 PREVIEW: Specific Required Signatures Alert Bar */}
          {activeFormDef.requiredSignatures.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>التوقيعات المطلوبة لاعتماد هذا النموذج:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeFormDef.requiredSignatures.map((sig, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold text-[11px] shadow-2xs"
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 font-medium shrink-0">
                * لا يُطلب توقيع أطراف غير محددة في هذا النموذج
              </span>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: STUDENT SELECTION & INFORMATION CARD (Visible on Form Tabs) */}
      {activeTab !== 'all-archive' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-mono flex items-center justify-center font-bold">2</span>
              <span>تحديد الطالب المعني بالنموذج الرسمي</span>
              <span className="text-rose-600">*</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGradeSectionModalOpen(true)}
                className="text-xs font-bold text-[#006D77] hover:text-[#005a63] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-xl border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>البحث بالصفوف والشعب</span>
              </button>
              {activeStudent && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentSelectedStudentId(null);
                    setStudentSearchQuery('');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تغيير الطالب</span>
                </button>
              )}
            </div>
          </div>

          {!activeStudent ? (
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطالب أو رقمه الطلابي لاختياره وتعبئة النموذج..."
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] focus:bg-white transition-all shadow-2xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>

              {/* Autocomplete Suggestions */}
              {filteredStudentsForSelection.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-md divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {filteredStudentsForSelection.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setCurrentSelectedStudentId(s.id);
                        setStudentSearchQuery('');
                        onShowToast(`تم تحديد الطالب (${s.fullName}) بنجاح`, 'success');
                      }}
                      className="p-2.5 hover:bg-teal-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#006D77]/10 text-[#006D77] flex items-center justify-center font-bold text-xs">
                          {s.fullName.slice(0, 1)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{s.fullName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            الرقم: {s.studentNumber}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-600 font-medium">
                        الصف {s.grade} ({s.section}) • المسار {s.track}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected Student Detailed Card */
            <div className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                    {activeStudent.fullName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 text-sm">
                        {activeStudent.fullName}
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                        تم ربط الطالب بالنموذج
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      الرقم الطلابي: #{activeStudent.studentNumber}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentSelectedStudentId(null);
                    setStudentSearchQuery('');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 px-3 py-1 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                >
                  تغيير الطالب
                </button>
              </div>

              {/* Details Grid (Stacks vertically on mobile and tablet) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">الصف:</span>
                  <span className="font-bold text-slate-800 block">الصف {activeStudent.grade}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">الشعبة:</span>
                  <span className="font-bold text-slate-800 block">شعبة {activeStudent.section}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">المسار:</span>
                  <span className="font-bold text-slate-800 block">{activeStudent.track}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">ولي الأمر:</span>
                  <span className="font-bold text-slate-800 truncate block" title={activeStudent.parentName}>
                    {activeStudent.parentName || 'ولي الأمر'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">هاتف ولي الأمر:</span>
                  <span className="font-bold text-teal-800 font-mono block">
                    {activeStudent.parentPhone || 'غير مسجل'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">حالة القيد:</span>
                  <span className="font-bold text-emerald-800 block">{activeStudent.status || 'منتظم'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3 & 4: FORM CONTENT & SIGNATURES SECTION */}
      {activeTab !== 'all-archive' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[#006D77] text-white flex items-center justify-center text-xs font-mono font-bold shrink-0">
                3
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>استكمال ومراجعة بيانات: {activeFormDef.title}</span>
                  <span className="text-xs font-mono text-[#D4AF37] bg-[#0C2340] px-2 py-0.5 rounded-md">
                    {activeFormDef.badge}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  تعبئة بيانات الواقعة والإجراء والمرفقات، والتحقق من التوقيعات الرسمية المقررة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#006D77]" />
                <span>الخطوة 4: التوقيعات المعتمدة ({activeFormDef.requiredSignatures.length})</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE SUB-TAB CONTENT */}
      {activeTab === 'bundle-engine' && (
        <FormsBundleEngine
          students={students}
          violations={violations}
          currentUser={counselor}
          activeStudent={activeStudent}
          selectedViolationId={currentSelectedViolationId || selectedViolationIdForForm || null}
          onSelectViolation={(vId) => setCurrentSelectedViolationId(vId)}
          onSelectStudent={(sId) => setCurrentSelectedStudentId(sId)}
          onOpenFormTab={(tabKey, sId, vId) => {
            if (sId) setCurrentSelectedStudentId(sId);
            if (vId) setCurrentSelectedViolationId(vId);
            setActiveTab(tabKey as FormTabType);
          }}
          violationReports={violationReports}
          parentNoticeForms={parentNoticeForms}
          parentSummonForms={parentSummonForms}
          warningForms={warningForms}
          parentCommitmentForms={parentCommitmentForms}
          m20Forms={m20Forms}
          onSaveViolationReport={onSaveViolationReport}
          onSaveNoticeForm={onSaveNoticeForm}
          onSaveSummonForm={onSaveSummonForm}
          onSaveWarningForm={onSaveWarningForm}
          onSaveCommitmentForm={onSaveCommitmentForm}
          onSaveM20={handleSaveM20}
          onShowToast={onShowToast}
        />
      )}

      {activeTab === 'model6-violation' && (
        <ViolationReportFormTab
          students={students}
          reports={violationReports}
          violations={violations}
          currentUser={counselor}
          onSaveReport={onSaveViolationReport || (async () => {})}
          onDeleteReport={onDeleteViolationReport}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          preselectedViolationId={currentSelectedViolationId || selectedViolationIdForForm}
          onShowToast={onShowToast}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model7-notice' && (
        <ParentNoticeFormTab
          students={students}
          forms={parentNoticeForms}
          violations={violations}
          currentUser={counselor}
          onSaveForm={onSaveNoticeForm || (async () => {})}
          onDeleteForm={onDeleteNoticeForm}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          preselectedViolationId={currentSelectedViolationId || selectedViolationIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model8-summon' && (
        <ParentSummonFormTab
          students={students}
          forms={parentSummonForms}
          currentUser={counselor}
          onSaveForm={onSaveSummonForm}
          onDeleteForm={onDeleteSummonForm}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model9-warning' && (
        <WarningFormPage
          students={students}
          counselor={counselor as CounselorUser}
          warningForms={warningForms}
          onSaveForm={onSaveWarningForm}
          onShowToast={onShowToast}
          selectedStudentIdForWarning={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model10-commitment' && (
        <ParentCommitmentFormTab
          students={students}
          forms={parentCommitmentForms}
          violations={violations}
          currentUser={counselor}
          onSaveForm={onSaveCommitmentForm || (async () => {})}
          onDeleteForm={onDeleteCommitmentForm}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model20-deduction' && (
        <BehaviorDeductionNoticeTab
          students={students}
          forms={m20Forms}
          violations={violations}
          currentUser={counselor}
          onSaveForm={handleSaveM20}
          onDeleteForm={handleDeleteM20}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model21-compensation' && (
        <ViolationCompensationTab
          students={students}
          forms={m21Forms}
          violations={violations}
          currentUser={counselor}
          onSaveForm={handleSaveM21}
          onDeleteForm={handleDeleteM21}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model24-confiscation' && (
        <DeviceConfiscationTab
          students={students}
          forms={m24Forms}
          violations={violations}
          currentUser={counselor}
          onSaveForm={handleSaveM24}
          onDeleteForm={handleDeleteM24}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onNavigateToReturn={(conf) => {
            setPreselectedConfiscationForReturn(conf);
            setActiveTab('model25-return');
          }}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model25-return' && (
        <DeviceReturnTab
          students={students}
          forms={m25Forms}
          confiscations={m24Forms}
          currentUser={counselor}
          onSaveForm={handleSaveM25}
          onDeleteForm={handleDeleteM25}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          preselectedConfiscation={preselectedConfiscationForReturn}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model26-pickup' && (
        <AuthorizedPickupCommitmentTab
          students={students}
          forms={m26Forms}
          currentUser={counselor}
          onSaveForm={handleSaveM26}
          onDeleteForm={handleDeleteM26}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'model27-attendance' && (
        <AttendanceCommitmentTab
          students={students}
          forms={m27Forms}
          currentUser={counselor}
          onSaveForm={handleSaveM27}
          onDeleteForm={handleDeleteM27}
          onShowToast={onShowToast}
          preselectedStudentId={currentSelectedStudentId || selectedStudentIdForForm}
          onOpenGradeSectionSearch={() => setIsGradeSectionModalOpen(true)}
        />
      )}

      {activeTab === 'all-archive' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                سجل الأرشيف الموحد للنماذج الرسمية ({unifiedList.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                عرض وبحث وإعادة طباعة لجميع النماذج الرسمية المعتمدة (النماذج 6، 7، 8، 9، 10، 20، 21، 24، 25، 26، 27)
              </p>
            </div>

            {/* Filter and Search */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ابحث بالطالب أو الموضوع..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#006D77] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Quick Filters Pill Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setArchiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'all' ? 'bg-[#0C2340] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({unifiedList.length})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model6')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model6' ? 'bg-rose-700 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              مخالفة (6) ({totalModel6})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model7')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model7' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              إشعار (7) ({totalModel7})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model8')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model8' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              استدعاء (8) ({totalModel8})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model9')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model9' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              تنبيه (9) ({totalModel9})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model10')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model10' ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              تعهد (10) ({totalModel10})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model20')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model20' ? 'bg-rose-800 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              حسم درجات (20) ({totalModel20})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model21')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model21' ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              تعويض (21) ({totalModel21})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model24')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model24' ? 'bg-purple-800 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              مصادرة أجهزة (24) ({totalModel24})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model25')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model25' ? 'bg-teal-800 text-white' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
              }`}
            >
              إعادة أجهزة (25) ({totalModel25})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model26')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model26' ? 'bg-sky-800 text-white' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              استلام (26) ({totalModel26})
            </button>
            <button
              type="button"
              onClick={() => setArchiveFilter('model27')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
                archiveFilter === 'model27' ? 'bg-cyan-800 text-white' : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
              }`}
            >
              تعهد دوام (27) ({totalModel27})
            </button>
          </div>

          {filteredUnifiedList.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileSignature className="w-12 h-12 mx-auto mb-2 opacity-30 text-slate-600" />
              <p className="text-sm font-medium">لا توجد نماذج مسجلة تطابق خيارات البحث الحالية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">نوع النموذج</th>
                    <th className="p-3">اسم الطالب</th>
                    <th className="p-3">الصف</th>
                    <th className="p-3">الموضوع / الإجراء</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">التوقيع والاعتماد</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnifiedList.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            item.type === 'model6'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.type === 'model7'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : item.type === 'model8'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.type === 'model9'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : item.type === 'model10'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : item.type === 'model20'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : item.type === 'model21'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.type === 'model24'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : item.type === 'model25'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : item.type === 'model26'
                              ? 'bg-sky-50 text-sky-800 border border-sky-200'
                              : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                          }`}
                        >
                          {item.modelBadge} {item.typeName}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-slate-900">
                        <div>{item.studentName}</div>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {item.studentNumber}
                        </span>
                      </td>

                      <td className="p-3 text-slate-600">{item.grade}</td>

                      <td className="p-3 max-w-xs truncate" title={item.subjectOrAction}>
                        {item.subjectOrAction}
                      </td>

                      <td className="p-3 font-mono text-slate-600">{item.date}</td>

                      <td className="p-3">
                        {item.isSigned ? (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            موقّع إلكترونياً
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                            <Clock className="w-3 h-3 text-amber-600" />
                            بانتظار التوقيع
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            item.status === 'تم الاعتماد والتوقيع' ||
                            item.status === 'تم الاستلام والتوقيع' ||
                            item.status === 'معتمد ومسلّم' ||
                            item.status === 'تم التعويض وتعديل الدرجة' ||
                            item.status === 'تمت الإعادة لولي الأمر'
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.type === 'model6' && item.rawReport) {
                                setActiveReportToPrint(item.rawReport);
                              } else if (item.type === 'model7' && item.rawNotice) {
                                setActiveNoticeToPrint(item.rawNotice);
                              } else if (item.type === 'model8' && item.rawSummon) {
                                setActiveSummonToPrint(item.rawSummon);
                              } else if (item.type === 'model9' && item.rawWarning) {
                                setActiveWarningToPrint(item.rawWarning);
                              } else if (item.type === 'model10' && item.rawCommitment) {
                                setActiveCommitmentToPrint(item.rawCommitment);
                              } else if (item.type === 'model20' && item.rawDeduction) {
                                setActiveDeductionToPrint(item.rawDeduction);
                              } else if (item.type === 'model21' && item.rawCompensation) {
                                setActiveCompensationToPrint(item.rawCompensation);
                              } else if (item.type === 'model24' && item.rawConfiscation) {
                                setActiveConfiscationToPrint(item.rawConfiscation);
                              } else if (item.type === 'model25' && item.rawReturn) {
                                setActiveReturnToPrint(item.rawReturn);
                              } else if (item.type === 'model26' && item.rawPickup) {
                                setActivePickupToPrint(item.rawPickup);
                              } else if (item.type === 'model27' && item.rawAttendance) {
                                setActiveAttendanceToPrint(item.rawAttendance);
                              }
                            }}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="معاينة وطباعة A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.type === 'model6') {
                                setActiveTab('model6-violation');
                              } else if (item.type === 'model7') {
                                setActiveTab('model7-notice');
                              } else if (item.type === 'model8') {
                                setActiveTab('model8-summon');
                              } else if (item.type === 'model9') {
                                setActiveTab('model9-warning');
                              } else if (item.type === 'model10') {
                                setActiveTab('model10-commitment');
                              } else if (item.type === 'model20') {
                                setActiveTab('model20-deduction');
                              } else if (item.type === 'model21') {
                                setActiveTab('model21-compensation');
                              } else if (item.type === 'model24') {
                                setActiveTab('model24-confiscation');
                              } else if (item.type === 'model25') {
                                setActiveTab('model25-return');
                              } else if (item.type === 'model26') {
                                setActiveTab('model26-pickup');
                              } else if (item.type === 'model27') {
                                setActiveTab('model27-attendance');
                              }
                            }}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="الانتقال لتبويب النموذج"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Direct Print Modals from Archive */}
      <PrintViolationReportModal
        isOpen={!!activeReportToPrint}
        onClose={() => setActiveReportToPrint(null)}
        report={activeReportToPrint}
      />

      <PrintParentNoticeModal
        isOpen={!!activeNoticeToPrint}
        onClose={() => setActiveNoticeToPrint(null)}
        form={activeNoticeToPrint}
      />

      <PrintSummonModal
        isOpen={!!activeSummonToPrint}
        onClose={() => setActiveSummonToPrint(null)}
        form={activeSummonToPrint}
      />

      {activeWarningToPrint && (
        <PrintWarningModal
          isOpen={!!activeWarningToPrint}
          onClose={() => setActiveWarningToPrint(null)}
          form={activeWarningToPrint}
        />
      )}

      {activeCommitmentToPrint && (
        <PrintParentCommitmentModal
          isOpen={!!activeCommitmentToPrint}
          onClose={() => setActiveCommitmentToPrint(null)}
          form={activeCommitmentToPrint}
        />
      )}

      {activeDeductionToPrint && (
        <PrintDeductionNoticeModal
          isOpen={!!activeDeductionToPrint}
          onClose={() => setActiveDeductionToPrint(null)}
          record={activeDeductionToPrint}
        />
      )}

      {activeCompensationToPrint && (
        <PrintCompensationModal
          isOpen={!!activeCompensationToPrint}
          onClose={() => setActiveCompensationToPrint(null)}
          record={activeCompensationToPrint}
        />
      )}

      {activeConfiscationToPrint && (
        <PrintDeviceConfiscationModal
          isOpen={!!activeConfiscationToPrint}
          onClose={() => setActiveConfiscationToPrint(null)}
          record={activeConfiscationToPrint}
        />
      )}

      {activeReturnToPrint && (
        <PrintDeviceReturnModal
          isOpen={!!activeReturnToPrint}
          onClose={() => setActiveReturnToPrint(null)}
          record={activeReturnToPrint}
        />
      )}

      {activePickupToPrint && (
        <PrintAuthorizedPickupModal
          isOpen={!!activePickupToPrint}
          onClose={() => setActivePickupToPrint(null)}
          record={activePickupToPrint}
        />
      )}

      {activeAttendanceToPrint && (
        <PrintAttendanceCommitmentModal
          isOpen={!!activeAttendanceToPrint}
          onClose={() => setActiveAttendanceToPrint(null)}
          record={activeAttendanceToPrint}
        />
      )}

      {/* Grade, Section, Track & Violator Student Search Modal */}
      <StudentGradeSectionSearchModal
        isOpen={isGradeSectionModalOpen}
        onClose={() => setIsGradeSectionModalOpen(false)}
        students={students}
        violations={violations}
        onSelectStudentForForm={handleSelectStudentFromGradeSectionModal}
        currentFormTab={activeTab}
      />
    </div>
  );
};
