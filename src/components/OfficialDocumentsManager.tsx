import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  FileSignature,
  Printer,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Award,
  Trash2,
  Eye,
  Filter,
  Layers,
  ChevronRight,
  User,
  Calendar,
  MapPin,
  Lock,
  Unlock,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  OfficialDocumentRecord,
  OfficialModelNumber,
  DocumentCategory,
  Student,
  ViolationRecord,
  AppUser,
  CounselorUser,
  EmployeeRecord,
  DocumentSignature,
  TemporarySuspensionFormRecord,
} from '../types';
import {
  fetchOfficialDocuments,
  saveOfficialDocumentFirestore,
  signOfficialDocumentFirestore,
  approveOfficialDocumentFirestore,
  deleteOfficialDocumentFirestore,
} from '../firebase/firestoreService';
import {
  getOfficialDocumentsLocal,
  saveOfficialDocumentLocal,
  deleteOfficialDocumentLocal,
  getEmployees,
} from '../storage';
import { getUaeTodayDateString, getUaeFullDateTimeString } from '../utils/time';
import { DocumentSignaturePadModal } from './DocumentSignaturePadModal';
import { OfficialModel6PrintView } from './OfficialModel6PrintView';
import { PrintTemporarySuspensionModal } from './PrintTemporarySuspensionModal';

export interface OfficialDocumentsManagerProps {
  students: Student[];
  violations: ViolationRecord[];
  currentUser: AppUser | CounselorUser | null;
  onShowToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  initialSelectedStudentId?: string | null;
  initialSelectedViolationId?: string | null;
}

const MODEL_DEFINITIONS: {
  number: OfficialModelNumber;
  name: string;
  category: DocumentCategory;
  categoryLabelAr: string;
  badge: string;
  description: string;
  recommendedForDegrees: string[];
}[] = [
  {
    number: 6,
    name: 'تقرير مخالفة',
    category: 'violations',
    categoryLabelAr: 'المخالفات',
    badge: 'نموذج (6)',
    description: 'توثيق الحادثة / الموقف ووصف الواقعة وتصنيف المخالفة والإجراء المتخذ واعتماد الإدارة',
    recommendedForDegrees: ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'],
  },
  {
    number: 7,
    name: 'تنبيه خطي / إشعار إلى ولي الأمر',
    category: 'notices',
    categoryLabelAr: 'التنبيهات والإنذارات',
    badge: 'نموذج (7)',
    description: 'إخطار خطي رسمي لولي الأمر بوقوع المخالفة السلوكية والتنبيه للحيلولة دون تكرارها',
    recommendedForDegrees: ['الأولى', 'الثانية'],
  },
  {
    number: 8,
    name: 'خطاب استدعاء ولي الأمر',
    category: 'notices',
    categoryLabelAr: 'التنبيهات والإنذارات',
    badge: 'نموذج (8)',
    description: 'طلب حضور ولي الأمر للمدرسة لمقابلة الإدارة بموضوع يتعلق بسلوك الطالب',
    recommendedForDegrees: ['الثانية', 'الثالثة', 'الرابعة'],
  },
  {
    number: 9,
    name: 'تنبيه خطي للطالب بعد الشفهي',
    category: 'notices',
    categoryLabelAr: 'التنبيهات والإنذارات',
    badge: 'نموذج (9)',
    description: 'تنبيه خطي رسمي للطالب بعد استنفاد التنبيه الشفهي والالتزام بعدم التكرار',
    recommendedForDegrees: ['الأولى'],
  },
  {
    number: 10,
    name: 'تعهد ولي الأمر في حال تكرار المخالفات',
    category: 'commitments',
    categoryLabelAr: 'التعهدات',
    badge: 'نموذج (10)',
    description: 'تعهد والتزام ولي الأمر بمتابعة ابنه/ابنته وتوجيهه بعد تكرار المخالفات السلوكية',
    recommendedForDegrees: ['الأولى', 'الثانية', 'الثالثة'],
  },
  {
    number: 12,
    name: 'قرار إيقاف مؤقت من الدراسة',
    category: 'committee',
    categoryLabelAr: 'لجنة السلوك',
    badge: 'نموذج (12)',
    description: 'قرار إيقاف مؤقت معتمد بناءً على اجتماع وقرار لجنة إدارة السلوك المدرسية',
    recommendedForDegrees: ['الثالثة', 'الرابعة'],
  },
  {
    number: 20,
    name: 'إخطار بالحسم من درجة السلوك',
    category: 'violations',
    categoryLabelAr: 'المخالفات',
    badge: 'نموذج (20)',
    description: 'إخطار رسمي بقرار حسم الدرجات بحسب اللائحة وتحديد مقترحات استرجاعها',
    recommendedForDegrees: ['الثانية', 'الثالثة', 'الرابعة'],
  },
  {
    number: 24,
    name: 'مصادرة أجهزة إلكترونية',
    category: 'electronic_devices',
    categoryLabelAr: 'الأجهزة الإلكترونية',
    badge: 'نموذج (24)',
    description: 'توثيق حيازة أو استخدام جهاز إلكتروني بصورة غير مصرح بها ومصادرته مؤقتاً',
    recommendedForDegrees: ['الأولى', 'الثانية', 'الثالثة'],
  },
  {
    number: 25,
    name: 'إعادة أجهزة إلكترونية',
    category: 'electronic_devices',
    categoryLabelAr: 'الأجهزة الإلكترونية',
    badge: 'نموذج (25)',
    description: 'محضر استلام وإعادة الجهاز الإلكتروني المصادر إلى ولي الأمر بالتوقيع',
    recommendedForDegrees: ['الأولى', 'الثانية', 'الثالثة'],
  },
];

export const OfficialDocumentsManager: React.FC<OfficialDocumentsManagerProps> = ({
  students,
  violations,
  currentUser,
  onShowToast,
  initialSelectedStudentId,
  initialSelectedViolationId,
}) => {
  const [documents, setDocuments] = useState<OfficialDocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Creation Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardStudentSearch, setWizardStudentSearch] = useState('');
  const [wizardSelectedStudent, setWizardSelectedStudent] = useState<Student | null>(null);
  const [wizardSelectedViolation, setWizardSelectedViolation] = useState<ViolationRecord | null>(null);
  const [wizardSelectedModelNumber, setWizardSelectedModelNumber] = useState<OfficialModelNumber>(6);

  // Wizard editable form fields
  const [wizardStaffName, setWizardStaffName] = useState('');
  const [wizardStaffRole, setWizardStaffRole] = useState('معلم');
  const [wizardStaffOracle, setWizardStaffOracle] = useState('');
  const [wizardIncidentDescription, setWizardIncidentDescription] = useState('');
  const [wizardImmediateAction, setWizardImmediateAction] = useState('تنبيه الطالب شفهياً وتوجيهه وإحالته للمرشد الطلابي');
  const [wizardIncidentSituation, setWizardIncidentSituation] = useState('أثناء الحصة الدراسية');
  const [wizardIncidentLocation, setWizardIncidentLocation] = useState('الصف الدراسي');
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  // Sign & Print Modals State
  const [signingDoc, setSigningDoc] = useState<OfficialDocumentRecord | null>(null);
  const [printingDoc, setPrintingDoc] = useState<OfficialDocumentRecord | null>(null);

  // Staff registry
  const staffEmployees = useMemo(() => getEmployees(), []);

  // Sync / Load Documents from Firestore on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      // 1. Load local cache first for instant responsiveness
      const local = getOfficialDocumentsLocal();
      if (local && local.length > 0) {
        setDocuments(local);
      }

      // 2. Fetch fresh documents from Firestore
      const remote = await fetchOfficialDocuments('7001');
      if (remote && Array.isArray(remote)) {
        setDocuments(remote);
        // update local cache
        localStorage.setItem('alkhalil_official_documents_v1', JSON.stringify(remote));
      }
    } catch (err) {
      console.warn('Error loading official documents from Firestore:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // If initial props are passed, pre-open wizard
  useEffect(() => {
    if (initialSelectedStudentId) {
      const st = students.find((s) => s.id === initialSelectedStudentId);
      if (st) {
        setWizardSelectedStudent(st);
        if (initialSelectedViolationId) {
          const v = violations.find((vi) => vi.id === initialSelectedViolationId);
          if (v) {
            setWizardSelectedViolation(v);
            setWizardIncidentDescription(v.incidentDescription || v.violationType);
            setWizardIncidentLocation(v.incidentLocation || 'الصف الدراسي');
          }
        }
      }
    }
  }, [initialSelectedStudentId, initialSelectedViolationId, students, violations]);

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const drafts = documents.filter((d) => d.status === 'draft' || d.status === 'needs_completion').length;
    const pendingSignatures = documents.filter((d) => d.status === 'pending_signature').length;
    const signed = documents.filter((d) => d.status === 'signed').length;
    const approved = documents.filter((d) => d.status === 'approved').length;
    return { total, drafts, pendingSignatures, signed, approved };
  }, [documents]);

  // Filtered Documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Category filter
      if (selectedCategory !== 'all' && doc.modelCategory !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && doc.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesStudent = doc.studentName?.toLowerCase().includes(q);
        const matchesStudentNum = doc.studentNumber?.toLowerCase().includes(q);
        const matchesDocId = doc.documentId?.toLowerCase().includes(q);
        const matchesModel = doc.modelName?.toLowerCase().includes(q) || String(doc.modelNumber).includes(q);
        if (!matchesStudent && !matchesStudentNum && !matchesDocId && !matchesModel) {
          return false;
        }
      }
      return true;
    });
  }, [documents, selectedCategory, selectedStatus, searchQuery]);

  // Wizard: Filtered students for Step 1
  const wizardFilteredStudents = useMemo(() => {
    if (!wizardStudentSearch.trim()) return students.slice(0, 8);
    const q = wizardStudentSearch.trim().toLowerCase();
    return students
      .filter((s) => s.fullName.toLowerCase().includes(q) || s.studentNumber.includes(q))
      .slice(0, 8);
  }, [students, wizardStudentSearch]);

  // Wizard: Violations for selected student (Step 2)
  const studentViolations = useMemo(() => {
    if (!wizardSelectedStudent) return [];
    return violations.filter(
      (v) =>
        v.studentId === wizardSelectedStudent.id ||
        v.studentNumber === wizardSelectedStudent.studentNumber
    );
  }, [violations, wizardSelectedStudent]);

  // Handle Open Create Wizard
  const handleOpenWizard = (presetModel: OfficialModelNumber = 6) => {
    setWizardSelectedModelNumber(presetModel);
    setWizardStep(1);
    setWizardStudentSearch('');
    if (!wizardSelectedStudent && students.length > 0) {
      setWizardSelectedStudent(null);
    }
    setWizardSelectedViolation(null);
    setWizardStaffName(currentUser?.displayName || 'أ. المعلم المناوب');
    setWizardStaffRole('معلم');
    setWizardStaffOracle('');
    setIsWizardOpen(true);
  };

  // Step 1: Select Student
  const handleSelectStudent = (student: Student) => {
    setWizardSelectedStudent(student);
    const stViolations = violations.filter(
      (v) => v.studentId === student.id || v.studentNumber === student.studentNumber
    );
    if (stViolations.length > 0) {
      setWizardSelectedViolation(stViolations[0]);
      setWizardIncidentDescription(stViolations[0].incidentDescription || stViolations[0].violationType);
      setWizardIncidentLocation(stViolations[0].incidentLocation || 'الصف الدراسي');
    } else {
      setWizardSelectedViolation(null);
      setWizardIncidentDescription('');
    }
    setWizardStep(2);
  };

  // Step 2: Select Violation
  const handleSelectViolation = (violation: ViolationRecord) => {
    setWizardSelectedViolation(violation);
    setWizardIncidentDescription(violation.incidentDescription || violation.violationType);
    setWizardIncidentLocation(violation.incidentLocation || 'الصف الدراسي');
    setWizardStep(3);
  };

  // Wizard: Handle Staff dropdown change
  const handleSelectStaffEmployee = (empId: string) => {
    const emp = staffEmployees.find((e) => e.id === empId);
    if (emp) {
      setWizardStaffName(emp.fullName);
      setWizardStaffRole(emp.jobTitle);
      setWizardStaffOracle(emp.employeeNumber);
    }
  };

  // Step 4: Finalize & Create Document in Firestore
  const handleCreateDocument = async () => {
    if (!wizardSelectedStudent) {
      onShowToast('يرجى اختيار الطالب أولاً', 'warning');
      return;
    }

    const modelDef = MODEL_DEFINITIONS.find((m) => m.number === wizardSelectedModelNumber) || MODEL_DEFINITIONS[0];
    const generatedDocId = `DOC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const today = getUaeTodayDateString();
    const timeNow = new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' });

    setIsSavingDoc(true);

    try {
      const newDoc: OfficialDocumentRecord = {
        id: generatedDocId,
        documentId: generatedDocId,
        modelNumber: wizardSelectedModelNumber,
        modelName: modelDef.name,
        modelCategory: modelDef.category,
        studentId: wizardSelectedStudent.id,
        studentNumber: wizardSelectedStudent.studentNumber,
        studentName: wizardSelectedStudent.fullName,
        grade: wizardSelectedStudent.grade,
        section: wizardSelectedStudent.section,
        stream: wizardSelectedStudent.stream || 'عام',
        parentName: wizardSelectedStudent.parentName || `ولي أمر الطالب ${wizardSelectedStudent.fullName}`,
        parentPhone: wizardSelectedStudent.parentPhone || '',
        violationId: wizardSelectedViolation?.id,
        violationCode: wizardSelectedViolation?.violationsList?.[0]?.code || '1-1',
        violationDegree: wizardSelectedViolation?.violationDegree || 'الدرجة الأولى (بسيطة)',
        violationTitle: wizardSelectedViolation?.violationType || 'مخالفة سلوكية مسجلة',
        incidentDate: wizardSelectedViolation?.incidentDateTime?.slice(0, 10) || today,
        incidentTime: wizardSelectedViolation?.incidentDateTime?.slice(11, 16) || timeNow,
        incidentLocation: wizardIncidentLocation,
        incidentDescription: wizardIncidentDescription,
        repetitionCount: (wizardSelectedViolation?.violationsList?.length) || 1,
        schoolName: 'أكاديمية الفجيرة العلمية الإسلامية',
        emirate: 'الفجيرة',
        academicYear: '2026–2027',
        reportingStaffName: wizardStaffName,
        reportingStaffRole: wizardStaffRole,
        reportingStaffOracle: wizardStaffOracle,
        specificData: {
          immediateAction: wizardImmediateAction,
          incidentSituation: wizardIncidentSituation,
          teacherName: wizardStaffName,
          oracleNumber: wizardStaffOracle,
          principalName: 'مدير المدرسة',
        },
        status: 'draft',
        signatures: [],
        auditLog: [],
        issueDate: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save to Firestore
      if (currentUser) {
        await saveOfficialDocumentFirestore('7001', newDoc, currentUser as AppUser);
      }
      // 2. Save locally
      saveOfficialDocumentLocal(newDoc);

      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
      setIsWizardOpen(false);
      onShowToast(`تم إنشاء «${modelDef.name}» (رقم ${generatedDocId}) بنجاح وحفظه في السحابة`, 'success');

      // Prompt to sign or view
      setSigningDoc(newDoc);
    } catch (err: any) {
      console.error('Error creating official document:', err);
      onShowToast(`تعذر حفظ المستند: ${err.message || 'خطأ في الاتصال بالخادم'}`, 'error');
    } finally {
      setIsSavingDoc(false);
    }
  };

  // Electronic Signature Confirm Handler
  const handleConfirmSignature = async (sig: DocumentSignature) => {
    if (!signingDoc) return;
    try {
      if (currentUser) {
        const updated = await signOfficialDocumentFirestore('7001', signingDoc.id, sig, currentUser as AppUser);
        saveOfficialDocumentLocal(updated);
        setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setSigningDoc(null);
        onShowToast(`تم توثيق توقيع (${sig.signerName} - ${sig.roleTitleAr}) بنجاح`, 'success');
      } else {
        throw new Error('يرجى تسجيل الدخول لتسجيل التوقيع');
      }
    } catch (err: any) {
      console.error('Error saving signature to Firestore:', err);
      onShowToast(`فشل تسجيل التوقيع: ${err.message}`, 'error');
    }
  };

  // Approve Document Handler
  const handleApproveDocument = async (docToApprove: OfficialDocumentRecord) => {
    if (docToApprove.status === 'approved') {
      onShowToast('المستند معتمد رسمياً بالفعل', 'info');
      return;
    }

    if (
      !window.confirm(
        `هل أنت متأكد من اعتماد المستند الرسمي (${docToApprove.modelName} - ${docToApprove.documentId}) رسمياً؟ سيتم إقفال المستند لمنع أي تعديل مستقبلي.`
      )
    ) {
      return;
    }

    try {
      const principalName = currentUser?.displayName || 'مدير المدرسة';
      const today = getUaeTodayDateString();
      const updated = await approveOfficialDocumentFirestore(
        '7001',
        docToApprove.id,
        { approvedBy: principalName, approvalDate: today },
        currentUser as AppUser
      );
      saveOfficialDocumentLocal(updated);
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      onShowToast(`تم اعتماد المستند (${updated.documentId}) رسمياً وإقفاله بنجاح`, 'success');
    } catch (err: any) {
      console.error('Error approving document:', err);
      onShowToast(`تعذر اعتماد المستند: ${err.message}`, 'error');
    }
  };

  // Delete Document Handler
  const handleDeleteDocument = async (docToDelete: OfficialDocumentRecord) => {
    if (docToDelete.status === 'approved' || docToDelete.isLocked) {
      onShowToast('لا يمكن حذف مستند رسمي معتمد ومقفل قانونياً', 'warning');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من حذف المسودة (${docToDelete.documentId}) للطالب (${docToDelete.studentName})؟`)) {
      return;
    }

    try {
      if (currentUser) {
        await deleteOfficialDocumentFirestore('7001', docToDelete.id, currentUser as AppUser);
      }
      deleteOfficialDocumentLocal(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      onShowToast('تم حذف المسودة بنجاح', 'info');
    } catch (err: any) {
      console.error('Error deleting document:', err);
      onShowToast(`تعذر حذف المستند: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Banner & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-lg">
                لائحة إدارة السلوك الطلابي
              </span>
              <span className="text-xs text-slate-400 font-mono">القرار الوزاري رقم (851) لسنة 2018م</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              <FileSignature className="w-7 h-7 text-indigo-400" />
              <span>وحدة النماذج والتوقيعات الرسمية</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              إدارة وإنشاء النماذج الرسمية المعتمدة للمخالفات السلوكية، والتوقيع الإلكتروني المزدوج، والطباعة الرسمية A4، المرتبطة مباشرة بسجل الطلبة واللجنة وسجلات Firestore السحابية.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => handleOpenWizard(6)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء نموذج جديد</span>
            </button>
            <button
              onClick={() => {
                handleOpenWizard(6);
                setWizardStep(3);
              }}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>حزمة النماذج</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">إجمالي النماذج</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">مسودات وقيد الإكمال</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">{stats.drafts}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">بانتظار التوقيع</div>
            <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">{stats.pendingSignatures}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">موقّع إلكترونياً</div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-0.5">{stats.signed}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">معتمد ومقفل</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{stats.approved}</div>
          </div>
        </div>
      </div>

      {/* 2. Official Models Quick Library Carousel / Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">مكتبة النماذج الرسمية المعتمدة (لائحة 2018)</h3>
          </div>
          <span className="text-xs text-slate-500">اختر نموذجاً للإنشاء المباشر للطالب</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {MODEL_DEFINITIONS.map((m) => (
            <div
              key={m.number}
              onClick={() => handleOpenWizard(m.number)}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-black bg-indigo-100 text-indigo-800 rounded-md">
                    {m.badge}
                  </span>
                  <span className="text-[10px] text-slate-500">{m.categoryLabelAr}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {m.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-indigo-600 font-bold">
                <span>إنشاء النموذج</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث برقم المستند، اسم الطالب، الرقم الطلابي..."
            className="w-full pr-10 pl-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-medium">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedCategory === 'all' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setSelectedCategory('violations')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedCategory === 'violations' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              المخالفات
            </button>
            <button
              onClick={() => setSelectedCategory('notices')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedCategory === 'notices' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              التنبيهات
            </button>
            <button
              onClick={() => setSelectedCategory('commitments')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedCategory === 'commitments' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              التعهدات
            </button>
            <button
              onClick={() => setSelectedCategory('committee')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                selectedCategory === 'committee' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600'
              }`}
            >
              لجنة السلوك
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none"
          >
            <option value="all">كافة الحالات</option>
            <option value="draft">مسودة</option>
            <option value="pending_signature">بانتظار التوقيع</option>
            <option value="signed">موقع إلكترونياً</option>
            <option value="approved">معتمد رسمياً</option>
          </select>
        </div>
      </div>

      {/* 4. Documents Table / Cards List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>سجل النماذج والمستندات المحفوظة ({filteredDocuments.length})</span>
          </div>
          <button
            onClick={loadDocuments}
            className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
          >
            تحديث القائمة السحابية
          </button>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <FileSignature className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">لا توجد نماذج محفوظة حالياً</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              يمكنك إنشاء نموذج رسمي جديد بالضغط على «إنشاء نموذج جديد» أو اختيار نموذج من المكتبة أعلاه.
            </p>
            <button
              onClick={() => handleOpenWizard(6)}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء نموذج (6) تقرير مخالفة</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((doc) => {
              const modelDef = MODEL_DEFINITIONS.find((m) => m.number === doc.modelNumber);
              const isLocked = doc.status === 'approved' || doc.isLocked;

              return (
                <div
                  key={doc.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 shrink-0">
                      <span className="text-xs font-black">{doc.modelNumber ? `م(${doc.modelNumber})` : 'مستند'}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{doc.modelName}</span>
                        <span className="text-[11px] font-mono text-slate-500">#{doc.documentId}</span>
                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            doc.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : doc.status === 'signed'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : doc.status === 'pending_signature'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {doc.status === 'approved'
                            ? 'معتمد ومقفل'
                            : doc.status === 'signed'
                            ? 'موقع إلكترونياً'
                            : doc.status === 'pending_signature'
                            ? 'بانتظار التوقيع'
                            : 'مسودة'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          الطالب: {doc.studentName} ({doc.grade} / {doc.section})
                        </span>
                        <span className="text-slate-400">·</span>
                        <span>المخالفة: {doc.violationTitle || 'تقرير واقعة'}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono">{doc.issueDate}</span>
                      </div>

                      {/* Signatures status snippet */}
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-0.5">
                        <span className="font-medium">التوقيعات ({doc.signatures?.length || 0}):</span>
                        {doc.signatures && doc.signatures.length > 0 ? (
                          doc.signatures.map((s, idx) => (
                            <span key={idx} className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 font-semibold text-[10px]">
                              ✓ {s.signerName} ({s.roleTitleAr})
                            </span>
                          ))
                        ) : (
                          <span className="text-amber-600">لم يتم التوقيع بعد</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Sign Button */}
                    <button
                      onClick={() => setSigningDoc(doc)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      title="التوقيع الإلكتروني"
                    >
                      <FileSignature className="w-3.5 h-3.5" />
                      <span>توقيع</span>
                    </button>

                    {/* Approve Button */}
                    {!isLocked && (
                      <button
                        onClick={() => handleApproveDocument(doc)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                        title="اعتماد الإدارة المدرسية"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>اعتماد</span>
                      </button>
                    )}

                    {/* Print A4 Button */}
                    <button
                      onClick={() => setPrintingDoc(doc)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      title="طباعة رسمية A4"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>طباعة A4</span>
                    </button>

                    {/* Delete button (only if not locked) */}
                    {!isLocked && (
                      <button
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="حذف المسودة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. CREATE DOCUMENT WIZARD MODAL                                           */}
      {/* ========================================================================= */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>معالج إنشاء النموذج الرسمي</span>
                  <span className="px-2 py-0.5 text-xs bg-indigo-500/30 text-indigo-300 rounded font-mono">
                    الخطوة {wizardStep} من 4
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {wizardStep === 1 && 'اختيار الطالب من السجل المدرسي'}
                  {wizardStep === 2 && 'اختيار المخالفة السلوكية المسجلة للطالب'}
                  {wizardStep === 3 && 'اختيار النموذج الرسمي المطلوب'}
                  {wizardStep === 4 && 'مراجعة وتأكيد البيانات المشتركة والإنشاء السحابي'}
                </p>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold py-2 px-3">
              <div className={`py-1 rounded ${wizardStep === 1 ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                1. الطالب
              </div>
              <div className={`py-1 rounded ${wizardStep === 2 ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                2. المخالفة
              </div>
              <div className={`py-1 rounded ${wizardStep === 3 ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                3. النموذج
              </div>
              <div className={`py-1 rounded ${wizardStep === 4 ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}>
                4. الاعتماد
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* STEP 1: Select Student */}
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      البحث عن الطالب (بالاسم أو الرقم الطلابي):
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={wizardStudentSearch}
                        onChange={(e) => setWizardStudentSearch(e.target.value)}
                        placeholder="ابحث عن اسم الطالب..."
                        className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pt-2">
                    {wizardFilteredStudents.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelectStudent(st)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          wizardSelectedStudent?.id === st.id
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{st.fullName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            الرقم: {st.studentNumber} · الصف {st.grade} / {st.section} ({st.stream || 'عام'})
                          </div>
                          {st.parentPhone && (
                            <div className="text-[10px] text-slate-400">ولي الأمر: {st.parentPhone}</div>
                          )}
                        </div>
                        <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                          <span>اختيار</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Select Violation */}
              {wizardStep === 2 && wizardSelectedStudent && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-indigo-900">الطالب المحدد: </span>
                      <span className="text-indigo-800">{wizardSelectedStudent.fullName}</span>
                      <span className="text-indigo-600 text-[11px]"> ({wizardSelectedStudent.studentNumber})</span>
                    </div>
                    <button
                      onClick={() => setWizardStep(1)}
                      className="text-xs text-indigo-700 underline font-medium"
                    >
                      تغيير الطالب
                    </button>
                  </div>

                  <label className="block text-xs font-bold text-slate-700">
                    المخالفات المسجلة للطالب (اختر المخالفة المطلوب ربط النموذج بها):
                  </label>

                  {studentViolations.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">
                        لا توجد مخالفات مسجلة مسبقاً لهذا الطالب في النظام
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        وفق اللائحة، يمكنك إنشاء نموذج عام وإدخال تفاصيل الواقعة مباشرة دون إنشاء مخالفة مسبقة.
                      </p>
                      <button
                        onClick={() => setWizardStep(3)}
                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                      >
                        المتابعة بنموذج مباشر للطالب
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {studentViolations.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => handleSelectViolation(v)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            wizardSelectedViolation?.id === v.id
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-[10px] bg-slate-200 font-mono font-bold rounded">
                                {v.violationsList?.[0]?.code || 'بند سلوكي'}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{v.violationType}</span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                                {v.violationDegree}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {v.incidentDescription || 'لا يوجد وصف تفصيلي'}
                            </p>
                            <div className="text-[10px] text-slate-400 font-mono">
                              التاريخ: {v.incidentDateTime?.slice(0, 10) || v.createdAt?.slice(0, 10)}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <span>اختيار</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Select Model */}
              {wizardStep === 3 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    اختر النموذج المطلوب إنشاؤه:
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto">
                    {MODEL_DEFINITIONS.map((m) => {
                      const isSelected = wizardSelectedModelNumber === m.number;
                      return (
                        <div
                          key={m.number}
                          onClick={() => setWizardSelectedModelNumber(m.number)}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-indigo-900">{m.badge}</span>
                              <span className="text-[10px] text-slate-500">{m.categoryLabelAr}</span>
                            </div>
                            <div className="text-xs font-bold text-slate-900">{m.name}</div>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {m.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 4: Review Common Data & Save */}
              {wizardStep === 4 && (
                <div className="space-y-3.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="font-bold text-slate-800">
                      ملخص النموذج: {MODEL_DEFINITIONS.find((m) => m.number === wizardSelectedModelNumber)?.name} (
                      {wizardSelectedModelNumber})
                    </div>
                    <div className="text-slate-600">
                      الطالب: {wizardSelectedStudent?.fullName} ({wizardSelectedStudent?.studentNumber}) · الصف{' '}
                      {wizardSelectedStudent?.grade}/{wizardSelectedStudent?.section}
                    </div>
                    {wizardSelectedViolation && (
                      <div className="text-slate-600">
                        المخالفة: {wizardSelectedViolation.violationType} ({wizardSelectedViolation.violationDegree})
                      </div>
                    )}
                  </div>

                  {/* Staff Selection Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الموظف / المعلم محرر الواقعة:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        onChange={(e) => handleSelectStaffEmployee(e.target.value)}
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                      >
                        <option value="">اختيار من سجل موظفي المدرسة...</option>
                        {staffEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.fullName} ({emp.jobTitle})
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={wizardStaffName}
                        onChange={(e) => setWizardStaffName(e.target.value)}
                        placeholder="اسم الموظف محرر الواقعة..."
                        className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">الوظيفة:</label>
                      <input
                        type="text"
                        value={wizardStaffRole}
                        onChange={(e) => setWizardStaffRole(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">رقم الأوراكل:</label>
                      <input
                        type="text"
                        value={wizardStaffOracle}
                        onChange={(e) => setWizardStaffOracle(e.target.value)}
                        placeholder="الرقم الوظيفي إن وجد..."
                        className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Incident Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      وصف التصرف / الحادثة / الموقف:
                    </label>
                    <textarea
                      rows={2}
                      value={wizardIncidentDescription}
                      onChange={(e) => setWizardIncidentDescription(e.target.value)}
                      placeholder="اكتب وصف الواقعة الفعلي المحرر بمعرفة المعلم..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Immediate Action */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الإجراء المتخذ:
                    </label>
                    <input
                      type="text"
                      value={wizardImmediateAction}
                      onChange={(e) => setWizardImmediateAction(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {wizardStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev > 1 ? ((prev - 1) as any) : prev))}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl"
                >
                  السابق
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl"
                >
                  إلغاء
                </button>
              )}

              {wizardStep < 4 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep((prev) => (prev < 4 ? ((prev + 1) as any) : prev))}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow"
                >
                  التالي
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateDocument}
                  disabled={isSavingDoc}
                  className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md flex items-center gap-2"
                >
                  {isSavingDoc ? (
                    <span>جاري الإنشاء والحفظ في Firestore...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد إنشاء النموذج وحفظه سحابياً</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SIGNATURE PAD MODAL                                                    */}
      {/* ========================================================================= */}
      {signingDoc && (
        <DocumentSignaturePadModal
          isOpen={!!signingDoc}
          onClose={() => setSigningDoc(null)}
          documentTitle={signingDoc.modelName}
          documentNumber={signingDoc.documentId}
          studentName={signingDoc.studentName}
          defaultRole="teacher"
          defaultSignerName={signingDoc.reportingStaffName || currentUser?.displayName || ''}
          onConfirmSignature={handleConfirmSignature}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. OFFICIAL MODEL PRINT MODALS (MODEL 6 & MODEL 12)                       */}
      {/* ========================================================================= */}
      {printingDoc && printingDoc.modelNumber === 6 && (
        <OfficialModel6PrintView
          isOpen={!!printingDoc}
          onClose={() => setPrintingDoc(null)}
          document={printingDoc}
        />
      )}

      {printingDoc && printingDoc.modelNumber === 12 && (
        <PrintTemporarySuspensionModal
          isOpen={!!printingDoc}
          onClose={() => setPrintingDoc(null)}
          form={{
            id: printingDoc.documentId || printingDoc.id,
            formType: 'temporary_suspension_form',
            formNumber: 12,
            schoolId: printingDoc.schoolId || '7001',
            emirate: printingDoc.emirate || 'الفجيرة',
            operationsManagement: 'إدارة العمليات المدرسية',
            council: 'المجلس الثاني',
            sector: 'النطاق الرابع',
            schoolName: printingDoc.schoolName || 'أكاديمية الفجيرة العلمية الإسلامية',
            studentId: printingDoc.studentId,
            studentNumber: printingDoc.studentNumber,
            studentName: printingDoc.studentName,
            grade: (printingDoc.grade as any) || 'عاشر',
            section: printingDoc.section || '1',
            parentName: printingDoc.parentName || 'ولي أمر الطالب',
            parentPhone: printingDoc.parentPhone || '',
            violationId: printingDoc.violationId || '',
            meetingId: printingDoc.meetingId,
            meetingNumber: printingDoc.meetingNumber,
            meetingDate: printingDoc.meetingDate || printingDoc.issueDate,
            priorAction1: printingDoc.previousActions?.[0] || 'تنبيه خطي للطالب واستدعاء ولي الأمر وتوقيع التعهدات.',
            priorAction2: printingDoc.previousActions?.[1] || 'جلسات إرشاد وتوجيه ومتابعة مع المرشد الأكاديمي وإخطار بالحسم.',
            suspensionStartDay: 'الأحد',
            suspensionStartDate: printingDoc.suspensionStartDate || printingDoc.issueDate,
            suspensionEndDay: 'الثلاثاء',
            suspensionEndDate: printingDoc.suspensionEndDate || printingDoc.issueDate,
            suspensionDaysCount: printingDoc.suspensionDaysCount || 3,
            behaviorModificationProgram: printingDoc.behaviorModificationProgram || 'التكليف بواجبات وتطبيقات دراسية يومية داخل المدرسة تحت إشراف المرشد الأكاديمي.',
            reason1: printingDoc.violationTitle || 'ارتكاب مخالفة سلوكية موجبة للإيقاف المؤقت وفق اللائحة.',
            reason2: printingDoc.committeeDecision || 'تكرار السلوك وعدم التجاوب مع البرامج الوقائية والتنموية.',
            reason3: 'تحقيق المصلحة التربوية وضمان الانضباط العام داخل البيئة المدرسية.',
            principalName: printingDoc.approvedBy || 'أحمد خليفة الكعبي',
            issueDate: printingDoc.issueDate,
            status: printingDoc.status === 'approved' ? 'معتمد ومسلّم' : 'مسودة',
            principalSignature: printingDoc.signatures?.find((s) => s.role === 'principal')?.signatureDataUrl,
            parentSignature: printingDoc.signatures?.find((s) => s.role === 'parent')?.signatureDataUrl,
            studentSignature: printingDoc.signatures?.find((s) => s.role === 'student')?.signatureDataUrl,
            createdAt: printingDoc.createdAt,
            updatedAt: printingDoc.updatedAt,
            ...printingDoc.specificData,
          }}
        />
      )}
    </div>
  );
};
