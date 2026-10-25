import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Plus,
  Trash2,
  Phone,
  ShieldCheck,
  User,
  HelpCircle,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  StudentCaseRecord,
  CounselingSessionRecord,
  Student,
  AppUser,
  SessionGoalItem,
  MiniActionPlanItem,
  GuardianContactInfo,
  StudentAcknowledgementInfo,
  SessionApprovalInfo,
} from '../../types';
import {
  SESSION_TYPES,
  SESSION_LOCATIONS,
  CONFIDENTIALITY_LEVELS,
  REFERRAL_SOURCE_OPTIONS,
  COUNSELING_AREAS_LIST,
  SESSION_PROCEDURES_LIST,
  ACADEMIC_SERVICES_OPTIONS,
  PERSONAL_BEHAVIOR_SERVICES_OPTIONS,
  CAREER_SERVICES_OPTIONS,
  SOCIAL_SERVICES_OPTIONS,
  REFERRAL_SERVICES_OPTIONS,
  STUDENT_INTERACTION_OPTIONS,
  STUDENT_AWARENESS_OPTIONS,
  STUDENT_READINESS_OPTIONS,
  SESSION_OUTCOME_OPTIONS,
} from './counselingConstants';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import { getTardinessRecords, getViolations } from '../../storage';

interface IndividualCounselingFormModalProps {
  caseRecord: StudentCaseRecord;
  student?: Student;
  sessionToEdit?: CounselingSessionRecord | null;
  existingSessionsCount: number;
  currentUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: CounselingSessionRecord, revisionReason?: string) => Promise<void>;
  onCreateTreatmentPlan?: (session: CounselingSessionRecord) => void;
}

export const IndividualCounselingFormModal: React.FC<IndividualCounselingFormModalProps> = ({
  caseRecord,
  student,
  sessionToEdit,
  existingSessionsCount,
  currentUser,
  isOpen,
  onClose,
  onSave,
  onCreateTreatmentPlan,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(sessionToEdit);
  const isApproved = sessionToEdit?.formStatus === 'معتمد';

  // Section collapse states for smoother navigation
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    sessionData: true,
    referral: true,
    areas: true,
    reasons: true,
    observations: true,
    goals: true,
    procedures: true,
    services: true,
    actionPlan: true,
    guardian: true,
    outcome: true,
    acknowledgement: true,
    approval: true,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Form state
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultStartTime = '09:00';
  const defaultEndTime = '09:45';

  const [sessionNumber, setSessionNumber] = useState(
    sessionToEdit?.sessionNumber || `جلسة ${existingSessionsCount + 1}`
  );
  const [sessionDate, setSessionDate] = useState(sessionToEdit?.sessionDate || todayStr);
  const [startTime, setStartTime] = useState(sessionToEdit?.startTime || defaultStartTime);
  const [endTime, setEndTime] = useState(sessionToEdit?.endTime || defaultEndTime);
  const [sessionLocation, setSessionLocation] = useState(
    sessionToEdit?.sessionLocation || 'مكتب المرشد'
  );
  const [sessionLocationOther, setSessionLocationOther] = useState(
    sessionToEdit?.sessionLocationOther || ''
  );
  const [sessionType, setSessionType] = useState(
    sessionToEdit?.sessionType || (existingSessionsCount === 0 ? 'جلسة أولى' : 'جلسة متابعة')
  );
  const [counselorName, setCounselorName] = useState(
    sessionToEdit?.counselorName || currentUser.displayName || currentUser.name || 'المرشد الطلابي'
  );
  const [counselorJobTitle, setCounselorJobTitle] = useState(
    sessionToEdit?.counselorJobTitle || 'مرشد طلابي'
  );
  const [confidentialityLevel, setConfidentialityLevel] = useState(
    sessionToEdit?.confidentialityLevel || caseRecord.confidentialityLevel || 'مقيّد'
  );

  // Referral
  const [referralSources, setReferralSources] = useState<string[]>(
    sessionToEdit?.referralSources || [caseRecord.referralSource || 'الطالب نفسه (إحالة ذاتية)']
  );
  const [refTeacherName, setRefTeacherName] = useState(
    sessionToEdit?.referralSourceDetails?.teacherName || ''
  );
  const [refSubject, setRefSubject] = useState(sessionToEdit?.referralSourceDetails?.subject || '');
  const [refGuardianName, setRefGuardianName] = useState(
    sessionToEdit?.referralSourceDetails?.guardianName || student?.guardianName || ''
  );
  const [refGuardianRelation, setRefGuardianRelation] = useState(
    sessionToEdit?.referralSourceDetails?.guardianRelation || 'ولي أمر'
  );
  const [refGuardianPhone, setRefGuardianPhone] = useState(
    sessionToEdit?.referralSourceDetails?.guardianPhone || student?.guardianPhone || ''
  );
  const [refExternalEntity, setRefExternalEntity] = useState(
    sessionToEdit?.referralSourceDetails?.externalEntityName || ''
  );
  const [refOtherExplanation, setRefOtherExplanation] = useState(
    sessionToEdit?.referralSourceDetails?.otherExplanation || ''
  );
  const [referralDate, setReferralDate] = useState(sessionToEdit?.referralDate || todayStr);
  const [referringPersonName, setReferringPersonName] = useState(
    sessionToEdit?.referringPersonName || ''
  );
  const [referralReasonBrief, setReferralReasonBrief] = useState(
    sessionToEdit?.referralReasonBrief || ''
  );
  const [referralNumber, setReferralNumber] = useState(sessionToEdit?.referralNumber || '');

  // Links to violations or tardiness
  const [isRelatedToViolation, setIsRelatedToViolation] = useState(
    Boolean(sessionToEdit?.isRelatedToBehaviorViolation)
  );
  const [relatedViolationId, setRelatedViolationId] = useState(
    sessionToEdit?.relatedViolationId || ''
  );
  const [isRelatedToTardiness, setIsRelatedToTardiness] = useState(
    Boolean(sessionToEdit?.isRelatedToTardinessOrAbsence)
  );
  const [relatedTardinessId, setRelatedTardinessId] = useState(
    sessionToEdit?.relatedTardinessId || ''
  );
  const [isRelatedToAcademicDecline, setIsRelatedToAcademicDecline] = useState(
    Boolean(sessionToEdit?.isRelatedToAcademicDecline)
  );
  const [isRelatedToChildProtection, setIsRelatedToChildProtection] = useState(
    Boolean(sessionToEdit?.isRelatedToChildProtection)
  );

  // Counseling Areas
  const [counselingAreas, setCounselingAreas] = useState<string[]>(
    sessionToEdit?.counselingAreas || []
  );
  const [counselingAreasOther, setCounselingAreasOther] = useState(
    sessionToEdit?.counselingAreasOther || ''
  );

  // Reasons & Case Description
  const [sessionTitle, setSessionTitle] = useState(
    sessionToEdit?.sessionTitle || caseRecord.issueTitle || 'جلسة إرشاد ومتابعة سلوكية وأكاديمية'
  );
  const [sessionReasons, setSessionReasons] = useState(
    sessionToEdit?.sessionReasons || caseRecord.issueDescription || ''
  );
  const [issueDescriptionInReferral, setIssueDescriptionInReferral] = useState(
    sessionToEdit?.issueDescriptionInReferral || ''
  );
  const [studentWordsProblemDescription, setStudentWordsProblemDescription] = useState(
    sessionToEdit?.studentWordsProblemDescription || ''
  );
  const [problemStartDate, setProblemStartDate] = useState(
    sessionToEdit?.problemStartDate || ''
  );
  const [problemRecurrenceCount, setProblemRecurrenceCount] = useState(
    sessionToEdit?.problemRecurrenceCount || ''
  );
  const [involvedPersons, setInvolvedPersons] = useState(
    sessionToEdit?.involvedPersons || ''
  );
  const [incidentLocation, setIncidentLocation] = useState(
    sessionToEdit?.incidentLocation || ''
  );
  const [antecedentCircumstances, setAntecedentCircumstances] = useState(
    sessionToEdit?.antecedentCircumstances || ''
  );
  const [impactOnStudent, setImpactOnStudent] = useState(
    sessionToEdit?.impactOnStudent || ''
  );
  const [impactOnAcademicPerformance, setImpactOnAcademicPerformance] = useState(
    sessionToEdit?.impactOnAcademicPerformance || ''
  );
  const [impactOnAttendanceAndDiscipline, setImpactOnAttendanceAndDiscipline] = useState(
    sessionToEdit?.impactOnAttendanceAndDiscipline || ''
  );
  const [impactOnSocialRelationships, setImpactOnSocialRelationships] = useState(
    sessionToEdit?.impactOnSocialRelationships || ''
  );
  const [counselorInitialNotes, setCounselorInitialNotes] = useState(
    sessionToEdit?.counselorInitialNotes || ''
  );

  // Observations & Session dynamics
  const [studentStatementSummary, setStudentStatementSummary] = useState(
    sessionToEdit?.studentStatementSummary || ''
  );
  const [counselorDirectObservations, setCounselorDirectObservations] = useState(
    sessionToEdit?.counselorDirectObservations || ''
  );
  const [studentInteraction, setStudentInteraction] = useState(
    sessionToEdit?.studentInteraction || 'متعاون'
  );
  const [studentInteractionOther, setStudentInteractionOther] = useState(
    sessionToEdit?.studentInteractionOther || ''
  );
  const [studentAwarenessLevel, setStudentAwarenessLevel] = useState(
    sessionToEdit?.studentAwarenessLevel || 'واضح'
  );
  const [studentReadinessToCooperate, setStudentReadinessToCooperate] = useState(
    sessionToEdit?.studentReadinessToCooperate || 'متوسط'
  );
  const [strengths, setStrengths] = useState(sessionToEdit?.strengths || '');
  const [needs, setNeeds] = useState(sessionToEdit?.needs || '');
  const [contributingFactors, setContributingFactors] = useState(
    sessionToEdit?.contributingFactors || ''
  );
  const [hinderingFactors, setHinderingFactors] = useState(
    sessionToEdit?.hinderingFactors || ''
  );
  const [otherObservations, setOtherObservations] = useState(
    sessionToEdit?.otherObservations || ''
  );

  // Goals
  const [sessionGoals, setSessionGoals] = useState<SessionGoalItem[]>(
    sessionToEdit?.sessionGoals || [
      {
        id: 'goal-1',
        description: 'تحديد مسببات المشكلة وبناء التزام إيجابي بالانضباط',
        type: 'سلوكي',
        status: 'تحقق جزئيًا',
        notes: '',
      },
    ]
  );

  // Procedures
  const [sessionProcedures, setSessionProcedures] = useState<string[]>(
    sessionToEdit?.sessionProcedures || [
      'بناء الألفة العلاجية والإرشادية وخلق بيئة آمنة',
      'الاستماع الفعّال والإنصات الإيجابي لمشاعر الطالب',
    ]
  );
  const [sessionProceduresDetails, setSessionProceduresDetails] = useState(
    sessionToEdit?.sessionProceduresDetails || ''
  );

  // Services
  const [academicServices, setAcademicServices] = useState<string[]>(
    sessionToEdit?.servicesProvided?.academicServices || []
  );
  const [personalBehaviorServices, setPersonalBehaviorServices] = useState<string[]>(
    sessionToEdit?.servicesProvided?.personalBehaviorServices || []
  );
  const [careerServices, setCareerServices] = useState<string[]>(
    sessionToEdit?.servicesProvided?.careerServices || []
  );
  const [socialServices, setSocialServices] = useState<string[]>(
    sessionToEdit?.servicesProvided?.socialServices || []
  );
  const [referrals, setReferrals] = useState<string[]>(
    sessionToEdit?.servicesProvided?.referrals || []
  );
  const [detailedExplanation, setDetailedExplanation] = useState(
    sessionToEdit?.servicesProvided?.detailedExplanation || ''
  );

  // Mini Action Plan
  const [miniActionPlan, setMiniActionPlan] = useState<MiniActionPlanItem[]>(
    sessionToEdit?.miniActionPlan || [
      {
        id: 'act-1',
        action: 'الالتزام بالحضور الصباحي المبكر في الموعد المحدد',
        responsible: 'الطالب',
        startDate: todayStr,
        expectedEndDate: todayStr,
        successIndicator: 'عدم تسجيل أي تأخير خلال أسبوعين متتاليين',
        status: 'قيد التنفيذ',
        notes: '',
      },
    ]
  );

  // Guardian contact
  const [guardianContacted, setGuardianContacted] = useState(
    Boolean(sessionToEdit?.guardianContact?.contacted)
  );
  const [guardianContact, setGuardianContact] = useState<GuardianContactInfo>(
    sessionToEdit?.guardianContact || {
      contacted: false,
      contactDate: todayStr,
      contactTime: '10:00',
      contactPersonName: student?.guardianName || '',
      relation: 'ولي أمر',
      phone: student?.guardianPhone || '',
      contactMethod: 'اتصال هاتفي',
      summary: '',
      guardianNotes: '',
      agreedToPlan: 'نعم',
      needsAppointment: false,
      appointmentDate: '',
    }
  );

  // Outcome
  const [initialProfessionalAssessment, setInitialProfessionalAssessment] = useState(
    sessionToEdit?.initialProfessionalAssessment || ''
  );
  const [priorityLevel, setPriorityLevel] = useState<'منخفض' | 'متوسط' | 'مرتفع' | 'عاجل'>(
    sessionToEdit?.priorityLevel || 'متوسط'
  );
  const [sessionOutcome, setSessionOutcome] = useState(
    sessionToEdit?.sessionOutcome || 'تحقيق الهدف وتحديد موعد متابعة قريبة'
  );
  const [nextFollowUpAt, setNextFollowUpAt] = useState(sessionToEdit?.nextFollowUpAt || '');
  const [nextFollowUpPurpose, setNextFollowUpPurpose] = useState(
    sessionToEdit?.nextFollowUpPurpose || 'متابعة استقرار السلوك وتنفيذ بنود خطة العمل'
  );
  const [concludingNotes, setConcludingNotes] = useState(
    sessionToEdit?.concludingNotes || ''
  );

  // Acknowledgement & Signatures
  const [ackEnabled, setAckEnabled] = useState(
    sessionToEdit?.studentAcknowledgement?.enabled ?? true
  );
  const [ackCommitmentText, setAckCommitmentText] = useState(
    sessionToEdit?.studentAcknowledgement?.commitmentText ||
      'أقر أنا الطالب بصحة ما تم مناقشته خلال الجلسة، وألتزم ببنود خطة العمل والتوجيهات الإرشادية المتفق عليها حفاظاً على مستقبلي الدراسي والأخلاقي.'
  );
  const [studentSig, setStudentSig] = useState<string | undefined>(
    sessionToEdit?.studentAcknowledgement?.studentSignature
  );

  // Counselor Approval
  const [counselorSig, setCounselorSig] = useState<string | undefined>(
    sessionToEdit?.approval?.counselorSignature
  );
  const [reviewerName, setReviewerName] = useState(
    sessionToEdit?.approval?.reviewerName || ''
  );
  const [reviewerNotes, setReviewerNotes] = useState(
    sessionToEdit?.approval?.reviewerNotes || ''
  );

  // Revision reason if editing an already approved form
  const [revisionReason, setRevisionReason] = useState('');
  const [isRevisionUnlocked, setIsRevisionUnlocked] = useState(!isApproved);

  // Errors & Saving
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Linked student records
  const studentViolations = getViolations().filter(
    (v) => v.studentId === caseRecord.studentId || v.studentNumber === caseRecord.studentNumber
  );
  const studentDelays = getTardinessRecords().filter(
    (d) => d.studentId === caseRecord.studentId || d.studentNumber === caseRecord.studentNumber
  );

  // Handle goals
  const addGoal = () => {
    setSessionGoals((prev) => [
      ...prev,
      {
        id: `goal-${Date.now()}`,
        description: '',
        type: 'سلوكي',
        status: 'لم يتحقق',
        notes: '',
      },
    ]);
  };

  const removeGoal = (id: string) => {
    setSessionGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGoal = (id: string, field: keyof SessionGoalItem, value: any) => {
    setSessionGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
    );
  };

  // Handle action plan items
  const addActionPlanItem = () => {
    setMiniActionPlan((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        action: '',
        responsible: 'الطالب',
        startDate: sessionDate,
        expectedEndDate: '',
        successIndicator: '',
        status: 'لم يبدأ',
        notes: '',
      },
    ]);
  };

  const removeActionPlanItem = (id: string) => {
    setMiniActionPlan((prev) => prev.filter((a) => a.id !== id));
  };

  const updateActionPlanItem = (id: string, field: keyof MiniActionPlanItem, value: any) => {
    setMiniActionPlan((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  // Checkbox toggles
  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((x) => x !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleSaveForm = async (targetStatus: 'مسودة' | 'معتمد') => {
    setErrorMessage(null);

    // Validation for final approval
    if (targetStatus === 'معتمد') {
      if (!sessionNumber.trim()) {
        setErrorMessage('يرجى تحديد رقم أو مسمى الجلسة.');
        return;
      }
      if (!sessionDate) {
        setErrorMessage('يرجى تحديد تاريخ انعقاد الجلسة.');
        return;
      }
      if (!sessionTitle.trim()) {
        setErrorMessage('يرجى إدخال عنوان الجلسة وأسبابها.');
        return;
      }
      if (counselingAreas.length === 0 && !counselingAreasOther.trim()) {
        setErrorMessage('يرجى اختيار مجال إرشادي واحد على الأقل.');
        return;
      }
      if (sessionGoals.length === 0 || sessionGoals.some((g) => !g.description.trim())) {
        setErrorMessage('يرجى كتابة أهداف الجلسة والتأكد من عدم ترك أهداف فارغة.');
        return;
      }
      if (isApproved && !isRevisionUnlocked && !revisionReason.trim()) {
        setErrorMessage('يرجى توضيح سبب التعديل لتوثيقه في سجل التعديلات المعتمد.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const studentAck: StudentAcknowledgementInfo = {
        enabled: ackEnabled,
        commitmentText: ackCommitmentText,
        studentName: sessionToEdit?.studentName || student?.fullName || caseRecord.studentName,
        studentSignature: studentSig,
        signatureDate: sessionDate,
      };

      const approvalInfo: SessionApprovalInfo = {
        counselorName,
        counselorJobTitle,
        counselorSignature: counselorSig,
        approvalDate: targetStatus === 'معتمد' ? sessionDate : undefined,
        reviewerName: reviewerName || undefined,
        reviewerNotes: reviewerNotes || undefined,
        approvalStatus: targetStatus === 'معتمد' ? 'معتمد' : 'مسودة',
      };

      const sessionRecord: CounselingSessionRecord = {
        id: sessionToEdit?.id || `sess_${Date.now()}`,
        schoolId: caseRecord.schoolId,
        academicYear: caseRecord.academicYear || '2026–2027',
        studentId: caseRecord.studentId,
        caseId: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        studentName: student?.fullName || caseRecord.studentName,
        studentNumber: student?.studentNumber || caseRecord.studentNumber,
        grade: student?.grade || caseRecord.grade,
        section: student?.section || caseRecord.section,
        track: student?.stream || 'عام',

        // Session data
        sessionNumber,
        sessionDate,
        startTime,
        endTime,
        sessionLocation,
        sessionLocationOther: sessionLocation === 'مكان آخر' ? sessionLocationOther : undefined,
        sessionType,
        counselorId: currentUser.id || 'counselor_1',
        counselorName,
        counselorJobTitle,
        confidentialityLevel,
        formStatus: targetStatus,

        // Referral
        referralSources,
        referralSourceDetails: {
          teacherName: refTeacherName || undefined,
          subject: refSubject || undefined,
          guardianName: refGuardianName || undefined,
          guardianRelation: refGuardianRelation || undefined,
          guardianPhone: refGuardianPhone || undefined,
          externalEntityName: refExternalEntity || undefined,
          otherExplanation: refOtherExplanation || undefined,
        },
        referralDate,
        referringPersonName: referringPersonName || undefined,
        referralReasonBrief: referralReasonBrief || undefined,
        referralNumber: referralNumber || undefined,
        isRelatedToBehaviorViolation: isRelatedToViolation,
        relatedViolationId: isRelatedToViolation ? relatedViolationId : undefined,
        isRelatedToTardinessOrAbsence: isRelatedToTardiness,
        relatedTardinessId: isRelatedToTardiness ? relatedTardinessId : undefined,
        isRelatedToAcademicDecline,
        isRelatedToChildProtection,

        // Counseling areas
        counselingAreas,
        counselingAreasOther: counselingAreasOther || undefined,

        // Reasons & Description
        sessionTitle,
        sessionReasons,
        issueDescriptionInReferral: issueDescriptionInReferral || undefined,
        studentWordsProblemDescription: studentWordsProblemDescription || undefined,
        problemStartDate: problemStartDate || undefined,
        problemRecurrenceCount: problemRecurrenceCount || undefined,
        involvedPersons: involvedPersons || undefined,
        incidentLocation: incidentLocation || undefined,
        antecedentCircumstances: antecedentCircumstances || undefined,
        impactOnStudent: impactOnStudent || undefined,
        impactOnAcademicPerformance: impactOnAcademicPerformance || undefined,
        impactOnAttendanceAndDiscipline: impactOnAttendanceAndDiscipline || undefined,
        impactOnSocialRelationships: impactOnSocialRelationships || undefined,
        counselorInitialNotes: counselorInitialNotes || undefined,

        // Observations
        studentStatementSummary: studentStatementSummary || undefined,
        counselorDirectObservations: counselorDirectObservations || undefined,
        studentInteraction,
        studentInteractionOther: studentInteraction === 'أخرى' ? studentInteractionOther : undefined,
        studentAwarenessLevel,
        studentReadinessToCooperate,
        strengths: strengths || undefined,
        needs: needs || undefined,
        contributingFactors: contributingFactors || undefined,
        hinderingFactors: hinderingFactors || undefined,
        otherObservations: otherObservations || undefined,

        // Goals
        sessionGoals,

        // Procedures
        sessionProcedures,
        sessionProceduresDetails: sessionProceduresDetails || undefined,

        // Services
        servicesProvided: {
          academicServices,
          personalBehaviorServices,
          careerServices,
          socialServices,
          referrals,
          detailedExplanation: detailedExplanation || undefined,
        },

        // Mini action plan
        miniActionPlan,

        // Guardian contact
        guardianContact: {
          ...guardianContact,
          contacted: guardianContacted,
        },

        // Outcome
        initialProfessionalAssessment: initialProfessionalAssessment || undefined,
        priorityLevel,
        sessionOutcome,
        nextFollowUpAt: nextFollowUpAt || undefined,
        nextFollowUpPurpose: nextFollowUpPurpose || undefined,
        concludingNotes: concludingNotes || undefined,

        // Student ack
        studentAcknowledgement: studentAck,

        // Approval
        approval: approvalInfo,

        // System
        createdBy: sessionToEdit?.createdBy || currentUser.displayName || currentUser.email || 'المرشد',
        createdAt: sessionToEdit?.createdAt || new Date().toISOString(),
        updatedBy: currentUser.displayName || currentUser.email || 'المرشد',
        updatedAt: new Date().toISOString(),
      };

      await onSave(sessionRecord, revisionReason.trim() ? revisionReason : undefined);
      onClose();
    } catch (err: any) {
      setErrorMessage('حدث خطأ أثناء حفظ الجلسة: ' + (err?.message || 'يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-5xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden text-right flex flex-col max-h-[92vh]" dir="rtl">
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-teal-800 to-teal-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-teal-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-700/80 rounded-xl">
              <FileText className="w-6 h-6 text-teal-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">
                  استمارة الإرشاد الفردي ودراسة الحالة المصغرة
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-600 text-teal-50 font-bold">
                  {sessionNumber}
                </span>
                {confidentialityLevel === 'سري جدًا' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    سري جدًا
                  </span>
                )}
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                ملف الحالة #{caseRecord.caseNumber} • الطالب:{' '}
                <span className="font-bold text-white">
                  {student?.fullName || caseRecord.studentName}
                </span>{' '}
                • الصف: {caseRecord.grade} / {caseRecord.section}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-teal-200 hover:text-white hover:bg-teal-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
          {/* Approved banner / Revision unlock prompt */}
          {isApproved && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold">هذه الاستمارة معتمدة رسمياً ومقفلة.</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    لإجراء تعديلات جديدة، يجب تقديم سبب التعديل لتوثيقه في سجل المراجعات الرسمي.
                  </p>
                </div>
              </div>
              {!isRevisionUnlocked ? (
                <button
                  type="button"
                  onClick={() => setIsRevisionUnlocked(true)}
                  className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
                >
                  طلب فتح التعديل لسبب طارئ
                </button>
              ) : (
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="سبب التعديل الرسمي (إلزامي)..."
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Child protection notice if flagged */}
          {isRelatedToChildProtection && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 p-3.5 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-rose-900 dark:text-rose-200">
                  تنبيه حماية الطفل وسرية الإجراءات
                </h4>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
                  الحالات المرتبطة باشتباه إيذاء أو إهمال تخضع لدليل حماية الطفل الإماراتي والبروتوكول
                  المعتمد. يجب حصر الاطلاع، وتوثيق الوقائع بدقة وموضوعية دون إشراك أطراف غير مخولة.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: بيانات الجلسة الأساسية */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('sessionData')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>أولاً: بيانات الجلسة الإرشادية</span>
              </div>
              {openSections.sessionData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.sessionData && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    رقم أو مسمى الجلسة *
                  </label>
                  <input
                    type="text"
                    value={sessionNumber}
                    onChange={(e) => setSessionNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="مثال: جلسة 1 أو جلسة استكشافية"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الجلسة *
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    وقت البداية
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    وقت النهاية
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الجلسة
                  </label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {SESSION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    مكان الجلسة
                  </label>
                  <select
                    value={sessionLocation}
                    onChange={(e) => setSessionLocation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {SESSION_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  {sessionLocation === 'مكان آخر' && (
                    <input
                      type="text"
                      value={sessionLocationOther}
                      onChange={(e) => setSessionLocationOther(e.target.value)}
                      placeholder="حدد المكان..."
                      className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    المرشد المنفذ
                  </label>
                  <input
                    type="text"
                    value={counselorName}
                    onChange={(e) => setCounselorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    مستوى السرية
                  </label>
                  <select
                    value={confidentialityLevel}
                    onChange={(e) => setConfidentialityLevel(e.target.value as any)}
                    className={`w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold ${
                      confidentialityLevel === 'سري جدًا'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {CONFIDENTIALITY_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: مصدر الإحالة والربط بالسجلات */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('referral')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-teal-600" />
                <span>ثانياً: مصدر الإحالة والربط بسجلات الطالب</span>
              </div>
              {openSections.referral ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.referral && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    مصدر الإحالة (يمكن اختيار أكثر من مصدر)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {REFERRAL_SOURCE_OPTIONS.map((src) => {
                      const isChecked = referralSources.includes(src);
                      return (
                        <label
                          key={src}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleArrayItem(referralSources, src, setReferralSources)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>{src}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional details for referral */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {referralSources.includes('معلم المادة') && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          اسم المعلم المحيل
                        </label>
                        <input
                          type="text"
                          value={refTeacherName}
                          onChange={(e) => setRefTeacherName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                          placeholder="اسم المعلم..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          المادة الدراسية
                        </label>
                        <input
                          type="text"
                          value={refSubject}
                          onChange={(e) => setRefSubject(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                          placeholder="مثال: الرياضيات"
                        />
                      </div>
                    </>
                  )}

                  {referralSources.includes('ولي أمر الطالب') && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          اسم ولي الأمر
                        </label>
                        <input
                          type="text"
                          value={refGuardianName}
                          onChange={(e) => setRefGuardianName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          صلة القرابة
                        </label>
                        <input
                          type="text"
                          value={refGuardianRelation}
                          onChange={(e) => setRefGuardianRelation(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          هاتف التواصل
                        </label>
                        <input
                          type="text"
                          value={refGuardianPhone}
                          onChange={(e) => setRefGuardianPhone(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono"
                        />
                      </div>
                    </>
                  )}

                  {referralSources.includes('جهة خارجية / شريك مجتمعي') && (
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        اسم الجهة الخارجية وتفاصيل التواصل
                      </label>
                      <input
                        type="text"
                        value={refExternalEntity}
                        onChange={(e) => setRefExternalEntity(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        placeholder="اسم الجهة..."
                      />
                    </div>
                  )}

                  <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        تاريخ الإحالة
                      </label>
                      <input
                        type="date"
                        value={referralDate}
                        onChange={(e) => setReferralDate(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        اسم الشخص المحيل
                      </label>
                      <input
                        type="text"
                        value={referringPersonName}
                        onChange={(e) => setReferringPersonName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        placeholder="من أحال الحالة..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        رقم الإحالة / البلاغ (إن وجد)
                      </label>
                      <input
                        type="text"
                        value={referralNumber}
                        onChange={(e) => setReferralNumber(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Linking to existing violations or morning delays */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <p className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5 text-teal-600" />
                    ربط الجلسة بسجلات المدرسة الموجودة مسبقاً:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRelatedToViolation}
                        onChange={(e) => setIsRelatedToViolation(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs">مرتبطة بمخالفة سلوكية</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRelatedToTardiness}
                        onChange={(e) => setIsRelatedToTardiness(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs">مرتبطة بتأخر صباحي / غياب</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRelatedToAcademicDecline}
                        onChange={(e) => setIsRelatedToAcademicDecline(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs">مرتبطة بانخفاض تحصيل دراسي</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRelatedToChildProtection}
                        onChange={(e) => setIsRelatedToChildProtection(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs text-rose-700 dark:text-rose-400 font-bold">
                        مرتبطة بملف حماية طفل
                      </span>
                    </label>
                  </div>

                  {/* Dropdowns for linking */}
                  {isRelatedToViolation && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        اختر المخالفة المسجلة للطالب:
                      </label>
                      {studentViolations.length > 0 ? (
                        <select
                          value={relatedViolationId}
                          onChange={(e) => setRelatedViolationId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        >
                          <option value="">-- حدد المخالفة المرتبطة --</option>
                          {studentViolations.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.incidentDateTime?.split('T')[0] || v.createdAt} - {v.violationType} ({v.violationDegree})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          لا توجد مخالفات مسجلة لهذا الطالب في النظام حتى الآن.
                        </p>
                      )}
                    </div>
                  )}

                  {isRelatedToTardiness && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        اختر سجل التأخر المرتبط:
                      </label>
                      {studentDelays.length > 0 ? (
                        <select
                          value={relatedTardinessId}
                          onChange={(e) => setRelatedTardinessId(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                        >
                          <option value="">-- حدد سجل التأخر المرتبط --</option>
                          {studentDelays.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.date} - {d.reason || 'تأخر صباحي'} (تكرارات سابقة: {d.previousTardinessCount})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          لا توجد سجلات تأخر مسجلة لهذا الطالب حالياً.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: مجالات الإرشاد */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('areas')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>ثالثاً: مجالات الإرشاد المختارة *</span>
                <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-full">
                  {counselingAreas.length} مجال
                </span>
              </div>
              {openSections.areas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.areas && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {COUNSELING_AREAS_LIST.map((area) => {
                    const isChecked = counselingAreas.includes(area);
                    const isChildProt = area.includes('حماية الطفل');
                    return (
                      <label
                        key={area}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? isChildProt
                              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 font-bold'
                              : 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            toggleArrayItem(counselingAreas, area, setCounselingAreas);
                            if (isChildProt && !isChecked) {
                              setIsRelatedToChildProtection(true);
                              setConfidentialityLevel('سري جدًا');
                            }
                          }}
                          className={`rounded ${isChildProt ? 'text-rose-600' : 'text-teal-600'} focus:ring-teal-500`}
                        />
                        <span>{area}</span>
                      </label>
                    );
                  })}
                </div>

                {counselingAreas.includes('أخرى (تحدد)') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      حدد المجال الإرشادي الآخر:
                    </label>
                    <input
                      type="text"
                      value={counselingAreasOther}
                      onChange={(e) => setCounselingAreasOther(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="اكتب المجال..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: أسباب الإرشاد ووصف الحالة */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('reasons')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-teal-600" />
                <span>رابعاً: أسباب الإرشاد وتفاصيل المشكلة</span>
              </div>
              {openSections.reasons ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.reasons && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    عنوان الجلسة والموضوع الرئيسي *
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                    placeholder="عنوان محدد للجلسة..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    أسباب انعقاد الجلسة والظروف الدافعة لها
                  </label>
                  <textarea
                    rows={2}
                    value={sessionReasons}
                    onChange={(e) => setSessionReasons(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="ما الذي استدعى عقد هذه الجلسة في هذا التوقيت..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      وصف المشكلة كما وردت في الإحالة
                    </label>
                    <textarea
                      rows={2}
                      value={issueDescriptionInReferral}
                      onChange={(e) => setIssueDescriptionInReferral(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="رواية الجهة أو الشخص المحيل..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      وصف الطالب للمشكلة بكلماته وتعبيره الذاتي
                    </label>
                    <textarea
                      rows={2}
                      value={studentWordsProblemDescription}
                      onChange={(e) => setStudentWordsProblemDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      placeholder="كيف يرى الطالب المشكلة ويصفها..."
                    />
                  </div>
                </div>

                {/* Additional contextual parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      تاريخ بدء ظهور المشكلة
                    </label>
                    <input
                      type="text"
                      value={problemStartDate}
                      onChange={(e) => setProblemStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                      placeholder="مثال: منذ أسبوعين"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      تكرار المشكلة
                    </label>
                    <input
                      type="text"
                      value={problemRecurrenceCount}
                      onChange={(e) => setProblemRecurrenceCount(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                      placeholder="مثال: 3 مرات متفرقة"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      الأشخاص المرتبطون بها
                    </label>
                    <input
                      type="text"
                      value={involvedPersons}
                      onChange={(e) => setInvolvedPersons(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                      placeholder="زملاء، معلمون..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      مكان وقوع المشكلة
                    </label>
                    <input
                      type="text"
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                      placeholder="الفصل، الساحة، الحافلة..."
                    />
                  </div>
                </div>

                {/* Impacts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الأثر على التحصيل الدراسي
                    </label>
                    <input
                      type="text"
                      value={impactOnAcademicPerformance}
                      onChange={(e) => setImpactOnAcademicPerformance(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="تدني درجات، عدم تسليم واجبات..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الأثر على الحضور والانضباط
                    </label>
                    <input
                      type="text"
                      value={impactOnAttendanceAndDiscipline}
                      onChange={(e) => setImpactOnAttendanceAndDiscipline(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="تأخر صباحي، تغيب متكرر..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      الأثر على العلاقات الاجتماعية
                    </label>
                    <input
                      type="text"
                      value={impactOnSocialRelationships}
                      onChange={(e) => setImpactOnSocialRelationships(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="عزلة، احتكاك بالأقران..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: مجريات وملاحظات الجلسة وتفاعل الطالب */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('observations')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                <span>خامساً: ملاحظات ومجريات الجلسة وتفاعل الطالب</span>
              </div>
              {openSections.observations ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.observations && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      تفاعل الطالب في الجلسة
                    </label>
                    <select
                      value={studentInteraction}
                      onChange={(e) => setStudentInteraction(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {STUDENT_INTERACTION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    {studentInteraction === 'أخرى' && (
                      <input
                        type="text"
                        value={studentInteractionOther}
                        onChange={(e) => setStudentInteractionOther(e.target.value)}
                        placeholder="حدد..."
                        className="mt-2 w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      مستوى وعي الطالب بالمشكلة
                    </label>
                    <select
                      value={studentAwarenessLevel}
                      onChange={(e) => setStudentAwarenessLevel(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {STUDENT_AWARENESS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      استعداد الطالب للتعاون والتغيير
                    </label>
                    <select
                      value={studentReadinessToCooperate}
                      onChange={(e) => setStudentReadinessToCooperate(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      {STUDENT_READINESS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ملخص ما ذكره الطالب ومجريات الحوار
                  </label>
                  <textarea
                    rows={3}
                    value={studentStatementSummary}
                    onChange={(e) => setStudentStatementSummary(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 leading-relaxed"
                    placeholder="أهم النقاط التي أفاد بها الطالب خلال الحديث..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات المرشد المباشرة (لغة الجسد، نبرة الصوت، الانفعالات)
                  </label>
                  <textarea
                    rows={2}
                    value={counselorDirectObservations}
                    onChange={(e) => setCounselorDirectObservations(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="ملاحظات المرشد المهنية المباشرة..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      نقاط القوة لدى الطالب
                    </label>
                    <textarea
                      rows={2}
                      value={strengths}
                      onChange={(e) => setStrengths(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="قدرات، اهتمامات، صفات إيجابية يمكن الاستناد إليها..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                      الاحتياجات الإرشادية والمهارات المفقودة
                    </label>
                    <textarea
                      rows={2}
                      value={needs}
                      onChange={(e) => setNeeds(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="مهارات ضبط النفس، تنظيم الوقت، مهارات التواصل..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      عوامل مساعدة تدعم التحسن
                    </label>
                    <input
                      type="text"
                      value={contributingFactors}
                      onChange={(e) => setContributingFactors(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="دعم الوالدين، وجود أصدقاء أخيار، رغبة ذاتية..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      عوامل قد تعيق التحسن
                    </label>
                    <input
                      type="text"
                      value={hinderingFactors}
                      onChange={(e) => setHinderingFactors(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="رفقة سوء، ضغوط أسرية، انشغال إلكتروني..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: أهداف الجلسة الإرشادية */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('goals')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>سادساً: أهداف الجلسة الإرشادية *</span>
                <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-full">
                  {sessionGoals.length} أهداف
                </span>
              </div>
              {openSections.goals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.goals && (
              <div className="p-4 space-y-3">
                <div className="space-y-2">
                  {sessionGoals.map((goal, idx) => (
                    <div
                      key={goal.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                    >
                      <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 w-full">
                        <input
                          type="text"
                          value={goal.description}
                          onChange={(e) => updateGoal(goal.id, 'description', e.target.value)}
                          placeholder="وصف الهدف الإرشادي المحدد..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>
                      <div className="w-32 shrink-0">
                        <select
                          value={goal.type}
                          onChange={(e) => updateGoal(goal.id, 'type', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        >
                          <option value="سلوكي">سلوكي</option>
                          <option value="أكاديمي">أكاديمي</option>
                          <option value="حضور وانضباط">حضور وانضباط</option>
                          <option value="شخصي">شخصي</option>
                          <option value="اجتماعي">اجتماعي</option>
                          <option value="مهني">مهني</option>
                          <option value="آخر">آخر</option>
                        </select>
                      </div>
                      <div className="w-32 shrink-0">
                        <select
                          value={goal.status}
                          onChange={(e) => updateGoal(goal.id, 'status', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                        >
                          <option value="تحقق">تحقق</option>
                          <option value="تحقق جزئيًا">تحقق جزئيًا</option>
                          <option value="لم يتحقق">لم يتحقق</option>
                          <option value="يحتاج إلى متابعة">يحتاج إلى متابعة</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                        title="حذف الهدف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addGoal}
                  className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-xl text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة هدف إرشادي جديد
                </button>
              </div>
            )}
          </div>

          {/* SECTION 7: إجراءات الجلسة */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('procedures')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>سابعاً: إجراءات وفنيات الجلسة المنفذة</span>
                <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-full">
                  {sessionProcedures.length} إجراء
                </span>
              </div>
              {openSections.procedures ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.procedures && (
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {SESSION_PROCEDURES_LIST.map((proc) => {
                    const isChecked = sessionProcedures.includes(proc);
                    return (
                      <label
                        key={proc}
                        className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleArrayItem(sessionProcedures, proc, setSessionProcedures)}
                          className="rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                        />
                        <span>{proc}</span>
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    توضيح أو تفاصيل إضافية حول الإجراءات المنفذة
                  </label>
                  <textarea
                    rows={2}
                    value={sessionProceduresDetails}
                    onChange={(e) => setSessionProceduresDetails(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    placeholder="تفاصيل التمارين أو الفنيات الإرشادية المطبقة..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 8: الخدمات والحلول الإرشادية */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('services')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>ثامناً: الخدمات والحلول الإرشادية المقدمة</span>
              </div>
              {openSections.services ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.services && (
              <div className="p-4 space-y-4">
                {/* Academic Services */}
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1.5">
                    الخدمات الأكاديمية والتعليمية:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ACADEMIC_SERVICES_OPTIONS.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={academicServices.includes(item)}
                          onChange={() => toggleArrayItem(academicServices, item, setAcademicServices)}
                          className="rounded text-teal-600"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personal / Behavioral Services */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1.5">
                    الخدمات الشخصية والسلوكية:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {PERSONAL_BEHAVIOR_SERVICES_OPTIONS.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={personalBehaviorServices.includes(item)}
                          onChange={() => toggleArrayItem(personalBehaviorServices, item, setPersonalBehaviorServices)}
                          className="rounded text-teal-600"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Social & Career & Referrals */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1.5">
                      الخدمات الاجتماعية والمهنية:
                    </h4>
                    <div className="space-y-1.5">
                      {[...SOCIAL_SERVICES_OPTIONS, ...CAREER_SERVICES_OPTIONS].map((item) => (
                        <label key={item} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={socialServices.includes(item) || careerServices.includes(item)}
                            onChange={() => {
                              if (SOCIAL_SERVICES_OPTIONS.includes(item)) {
                                toggleArrayItem(socialServices, item, setSocialServices);
                              } else {
                                toggleArrayItem(careerServices, item, setCareerServices);
                              }
                            }}
                            className="rounded text-teal-600"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-rose-800 dark:text-rose-300 mb-1.5">
                      الإحالات الإرشادية والتنسيقية:
                    </h4>
                    <div className="space-y-1.5">
                      {REFERRAL_SERVICES_OPTIONS.map((item) => (
                        <label key={item} className="flex items-center gap-2 text-xs cursor-pointer text-rose-900 dark:text-rose-200">
                          <input
                            type="checkbox"
                            checked={referrals.includes(item)}
                            onChange={() => toggleArrayItem(referrals, item, setReferrals)}
                            className="rounded text-rose-600"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    شرح تفصيلي للحلول المقترحة والخدمات
                  </label>
                  <textarea
                    rows={2}
                    value={detailedExplanation}
                    onChange={(e) => setDetailedExplanation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    placeholder="أي توضيحات أو تفاصيل أخرى حول الحلول الإرشادية..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 9: خطة العمل المصغرة */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('actionPlan')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>تاسعاً: خطة العمل المصغرة (Mini Action Plan)</span>
                <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-full">
                  {miniActionPlan.length} إجراء
                </span>
              </div>
              {openSections.actionPlan ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.actionPlan && (
              <div className="p-4 space-y-3">
                <div className="space-y-3">
                  {miniActionPlan.map((act, idx) => (
                    <div
                      key={act.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          الإجراء المتفق عليه #{idx + 1}
                        </label>
                        <input
                          type="text"
                          value={act.action}
                          onChange={(e) => updateActionPlanItem(act.id, 'action', e.target.value)}
                          placeholder="الإجراء..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">المسؤول</label>
                        <select
                          value={act.responsible}
                          onChange={(e) => updateActionPlanItem(act.id, 'responsible', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        >
                          <option value="الطالب">الطالب</option>
                          <option value="ولي الأمر">ولي الأمر</option>
                          <option value="المرشد">المرشد</option>
                          <option value="المعلم">المعلم</option>
                          <option value="الإدارة">الإدارة</option>
                          <option value="الأخصائي الاجتماعي">الأخصائي الاجتماعي</option>
                          <option value="جهة أخرى">جهة أخرى</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">الإنجاز المتوقع</label>
                        <input
                          type="date"
                          value={act.expectedEndDate}
                          onChange={(e) => updateActionPlanItem(act.id, 'expectedEndDate', e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] text-slate-500 mb-0.5">مؤشر النجاح</label>
                        <input
                          type="text"
                          value={act.successIndicator}
                          onChange={(e) => updateActionPlanItem(act.id, 'successIndicator', e.target.value)}
                          placeholder="دليل تحقق الهدف..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => removeActionPlanItem(act.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addActionPlanItem}
                  className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-xl text-xs font-bold hover:bg-teal-100 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة بند لخطة العمل
                </button>
              </div>
            )}
          </div>

          {/* SECTION 10: التواصل مع ولي الأمر */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('guardian')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-600" />
                <span>عاشراً: التواصل مع ولي الأمر</span>
                {guardianContacted && (
                  <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-full font-bold">
                    تم التواصل
                  </span>
                )}
              </div>
              {openSections.guardian ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.guardian && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      هل تم التواصل مع ولي الأمر بخصوص هذه الجلسة؟
                    </p>
                    <p className="text-[11px] text-slate-500">
                      (تنبيه أمان: لا يتم إرسال أي رسالة تلقائياً دون معاينة وموافقة المستخدم)
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-teal-800 dark:text-teal-300">
                    <input
                      type="checkbox"
                      checked={guardianContacted}
                      onChange={(e) => setGuardianContacted(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>نعم، تم التواصل</span>
                  </label>
                </div>

                {guardianContacted && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          تاريخ التواصل
                        </label>
                        <input
                          type="date"
                          value={guardianContact.contactDate || todayStr}
                          onChange={(e) =>
                            setGuardianContact((prev) => ({ ...prev, contactDate: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          طريقة التواصل
                        </label>
                        <select
                          value={guardianContact.contactMethod || 'اتصال هاتفي'}
                          onChange={(e) =>
                            setGuardianContact((prev) => ({
                              ...prev,
                              contactMethod: e.target.value as any,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        >
                          <option value="اتصال هاتفي">اتصال هاتفي</option>
                          <option value="واتساب">واتساب (إشعار)</option>
                          <option value="بريد إلكتروني">بريد إلكتروني</option>
                          <option value="حضور شخصي">حضور شخصي للمدرسة</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          موقف ولي الأمر من الخطة
                        </label>
                        <select
                          value={String(guardianContact.agreedToPlan ?? 'نعم')}
                          onChange={(e) =>
                            setGuardianContact((prev) => ({ ...prev, agreedToPlan: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                        >
                          <option value="نعم">موافق وداعم بالكامل</option>
                          <option value="مع تحفظات">موافق مع بعض التحفظات</option>
                          <option value="لا">غير موافق / غير متعاون</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          موعد حضور للمدرسة (إن وجد)
                        </label>
                        <input
                          type="date"
                          value={guardianContact.appointmentDate || ''}
                          onChange={(e) =>
                            setGuardianContact((prev) => ({
                              ...prev,
                              needsAppointment: Boolean(e.target.value),
                              appointmentDate: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        ملخص ما دار في التواصل وملاحظات ولي الأمر
                      </label>
                      <textarea
                        rows={2}
                        value={guardianContact.summary || ''}
                        onChange={(e) =>
                          setGuardianContact((prev) => ({ ...prev, summary: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                        placeholder="استجابة ولي الأمر وتوصياته..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 11: نتيجة الجلسة والتوصيات المهنية */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('outcome')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-600" />
                <span>الحادي عشر: نتيجة الجلسة والتوصيات المهنية</span>
              </div>
              {openSections.outcome ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.outcome && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      نتيجة الجلسة *
                    </label>
                    <select
                      value={sessionOutcome}
                      onChange={(e) => setSessionOutcome(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    >
                      {SESSION_OUTCOME_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      مستوى الأولوية والخطورة
                    </label>
                    <select
                      value={priorityLevel}
                      onChange={(e) => setPriorityLevel(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold ${
                        priorityLevel === 'عاجل'
                          ? 'text-rose-600'
                          : priorityLevel === 'مرتفع'
                          ? 'text-amber-600'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <option value="منخفض">منخفض</option>
                      <option value="متوسط">متوسط</option>
                      <option value="مرتفع">مرتفع</option>
                      <option value="عاجل">عاجل (تدخل فوري)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ المتابعة القادمة
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpAt}
                      onChange={(e) => setNextFollowUpAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Treatment plan prompt if outcome is treatment plan */}
                {sessionOutcome.includes('خطة علاجية') && onCreateTreatmentPlan && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-teal-900 dark:text-teal-200 text-xs">
                        تتطلب الحالة إعداد خطة علاجية فردية متكاملة
                      </p>
                      <p className="text-[11px] text-teal-700 dark:text-teal-300">
                        يمكنك نقل البيانات الأساسية والأهداف مباشرة إلى تبويب الخطة العلاجية.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const tempRec: any = {
                          sessionTitle,
                          sessionReasons,
                          sessionGoals,
                          studentName: student?.fullName || caseRecord.studentName,
                        };
                        onCreateTreatmentPlan(tempRec);
                      }}
                      className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800"
                    >
                      إنشاء خطة علاجية من هذه الجلسة
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    التقييم المهني الأولي للمرشد
                  </label>
                  <textarea
                    rows={2}
                    value={initialProfessionalAssessment}
                    onChange={(e) => setInitialProfessionalAssessment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="رؤية المرشد التشخيصية التفسيرية الأولية..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات وتوصيات ختامية
                  </label>
                  <textarea
                    rows={2}
                    value={concludingNotes}
                    onChange={(e) => setConcludingNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    placeholder="أي ملاحظات ختامية للجلسة..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 12: إقرار والتزام الطالب */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('acknowledgement')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>الثاني عشر: إقرار والتزام الطالب</span>
              </div>
              {openSections.acknowledgement ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.acknowledgement && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={ackEnabled}
                      onChange={(e) => setAckEnabled(e.target.checked)}
                      className="rounded text-teal-600 w-4 h-4"
                    />
                    <span>تضمين إقرار والتزام الطالب وتوقيعه الإلكتروني</span>
                  </label>
                </div>

                {ackEnabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        صيغة الالتزام والإقرار
                      </label>
                      <textarea
                        rows={2}
                        value={ackCommitmentText}
                        onChange={(e) => setAckCommitmentText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs italic"
                      />
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <SignatureCanvas
                        id="student-session-sig"
                        title="توقيع الطالب الإلكتروني"
                        subtitle="يمكن للطالب التوقيع عبر شاشة اللمس أو الماوس"
                        initialSignature={studentSig}
                        signerType="طالب"
                        onSave={(dataUrl) => setStudentSig(dataUrl)}
                        onClear={() => setStudentSig(undefined)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 13: اعتماد المرشد والمراجعة */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
            <button
              type="button"
              onClick={() => toggleSection('approval')}
              className="w-full p-3.5 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-slate-800 dark:text-slate-100 font-bold border-b border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>الثالث عشر: اعتماد المرشد المدرسي والمراجعة</span>
              </div>
              {openSections.approval ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {openSections.approval && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      اسم المرشد المعتمد
                    </label>
                    <input
                      type="text"
                      value={counselorName}
                      onChange={(e) => setCounselorName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      المسمى الوظيفي
                    </label>
                    <input
                      type="text"
                      value={counselorJobTitle}
                      onChange={(e) => setCounselorJobTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      اسم المراجع الإداري / الموجه (اختياري)
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      placeholder="اسم المراجع..."
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <SignatureCanvas
                    id="counselor-session-sig"
                    title="توقيع المرشد المدرسي المعتمد"
                    subtitle="التوقيع الرسمي لاعتماد الجلسة في سجل الطالب"
                    initialSignature={counselorSig}
                    signerType="المرشد المدرسي"
                    counselorName={counselorName}
                    onSave={(dataUrl) => setCounselorSig(dataUrl)}
                    onClear={() => setCounselorSig(undefined)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {isApproved ? 'الاستمارة معتمدة رسمياً' : 'يمكن الحفظ كمسودة والعودة لإكمالها لاحقاً'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              إلغاء
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveForm('مسودة')}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              حفظ كمسودة
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveForm('معتمد')}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {isSaving ? 'جارٍ الحفظ...' : 'اعتماد الجلسة نهائياً'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
