import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  Edit3,
  Paperclip,
  BarChart3,
  Target,
  ClipboardList,
  Sparkles,
  Printer,
  Upload,
  ExternalLink,
  Check,
  X,
  FolderOpen,
  Layers,
  Award,
  RefreshCw,
} from 'lucide-react';
import {
  GuidancePlanRecord,
  GuidancePlanType,
  GuidancePlanDomain,
  GuidancePlanStatus,
  NeedsAssessmentRecord,
  GuidanceEvidenceItem,
  AppUser,
} from '../../types';
import {
  saveGuidancePlanFirestore,
  deleteGuidancePlanFirestore,
  saveNeedsAssessmentFirestore,
  deleteNeedsAssessmentFirestore,
} from '../../firebase/firestoreService';
import {
  setGuidancePlansLocal,
  setNeedsAssessmentsLocal,
} from '../../storage';
import { getUaeTodayDateString } from '../../utils/time';
import { useSchoolSettings } from '../../context/SchoolSettingsContext';

interface GuidancePlansAndNeedsViewProps {
  plans: GuidancePlanRecord[];
  setPlans: React.Dispatch<React.SetStateAction<GuidancePlanRecord[]>>;
  needsList: NeedsAssessmentRecord[];
  setNeedsList: React.Dispatch<React.SetStateAction<NeedsAssessmentRecord[]>>;
  currentUser: AppUser;
  selectedAcademicYear: string;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onRefreshFromCloud: () => Promise<void>;
  isSyncing: boolean;
}

const PLAN_STATUS_LABELS: Record<GuidancePlanStatus, { label: string; badgeClass: string }> = {
  draft: { label: 'مسودة', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' },
  submitted: { label: 'مقدمة للاعتماد', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300' },
  returned: { label: 'معادة للتعديل', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' },
  approved: { label: 'معتمدة', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300' },
  in_progress: { label: 'قيد التنفيذ', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' },
  completed: { label: 'مكتملة', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' },
  archived: { label: 'مؤرشفة', badgeClass: 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400' },
};

const PLAN_TYPE_LABELS: Record<GuidancePlanType, string> = {
  annual: 'الخطة السنوية للمرشد',
  quarterly: 'الخطة الفصلية',
  weekly: 'خطة العمل الأسبوعية',
};

export const GuidancePlansAndNeedsView: React.FC<GuidancePlansAndNeedsViewProps> = ({
  plans,
  setPlans,
  needsList,
  setNeedsList,
  currentUser,
  selectedAcademicYear,
  onShowToast,
  onRefreshFromCloud,
  isSyncing,
}) => {
  const { schoolSettings } = useSchoolSettings();
  const schoolId = currentUser.schoolId || schoolSettings.schoolId || '7001';
  const counselorDefaultName = schoolSettings.counselorName || 'أمير علي عبدالشاكر بكري';

  // Active sub-section: 'plans' | 'needs' | 'kpis' | 'evidences'
  const [subTab, setSubTab] = useState<'plans' | 'needs' | 'kpis' | 'evidences'>('plans');

  // Plan Filters
  const [planTypeFilter, setPlanTypeFilter] = useState<'all' | GuidancePlanType>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Plan Create/Edit Modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<GuidancePlanRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Plan Form State
  const [formPlanType, setFormPlanType] = useState<GuidancePlanType>('quarterly');
  const [formTerm, setFormTerm] = useState<'الفصل الأول' | 'الفصل الثاني' | 'الفصل الثالث' | 'العام الكامل'>('الفصل الأول');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDomain, setFormDomain] = useState<GuidancePlanDomain>('أكاديمي');
  const [formNeedSource, setFormNeedSource] = useState<string>('');
  const [formLinkedNeedId, setFormLinkedNeedId] = useState<string>('');
  const [formObjective, setFormObjective] = useState<string>('');
  const [formTargetGroup, setFormTargetGroup] = useState<string>('طلبة الصفوف التاسع إلى الثاني عشر');
  const [formActivities, setFormActivities] = useState<string>('');
  const [formResponsible, setFormResponsible] = useState<string>(counselorDefaultName);
  const [formStartDate, setFormStartDate] = useState<string>(getUaeTodayDateString());
  const [formEndDate, setFormEndDate] = useState<string>(getUaeTodayDateString());
  const [formResources, setFormResources] = useState<string>('أدلة الإرشاد، استمارات المتابعة، العروض التقديمية، ملف الطالب الموحد');
  const [formKpiIndicator, setFormKpiIndicator] = useState<string>('عدد الجلسات والأنشطة المنفذة ونسبة استفادة الطلبة المستهدفين');
  const [formTargetCount, setFormTargetCount] = useState<number>(10);
  const [formExecutedCount, setFormExecutedCount] = useState<number>(0);
  const [formResultsSummary, setFormResultsSummary] = useState<string>('');
  const [formImprovementActions, setFormImprovementActions] = useState<string>('');
  const [formStatus, setFormStatus] = useState<GuidancePlanStatus>('in_progress');
  const [formEvidences, setFormEvidences] = useState<GuidanceEvidenceItem[]>([]);

  // Evidence Quick Add inside Plan Modal or Evidence Tab
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState<boolean>(false);
  const [targetPlanForEvidence, setTargetPlanForEvidence] = useState<GuidancePlanRecord | null>(null);
  const [evTitle, setEvTitle] = useState<string>('');
  const [evType, setEvType] = useState<GuidanceEvidenceItem['type']>('PDF');
  const [evCategory, setEvCategory] = useState<GuidanceEvidenceItem['category']>('خطة');
  const [evFileName, setEvFileName] = useState<string>('');
  const [evFileUrl, setEvFileUrl] = useState<string>('');
  const [evDescription, setEvDescription] = useState<string>('');

  // Needs Assessment Modal State
  const [isNeedModalOpen, setIsNeedModalOpen] = useState<boolean>(false);
  const [editingNeed, setEditingNeed] = useState<NeedsAssessmentRecord | null>(null);
  const [needTitle, setNeedTitle] = useState<string>('');
  const [needTerm, setNeedTerm] = useState<string>('الفصل الأول');
  const [needCategory, setNeedCategory] = useState<NeedsAssessmentRecord['category']>('استبانة طلابية');
  const [needGrades, setNeedGrades] = useState<string[]>(['تاسع', 'عاشر', 'حادي عشر', 'ثاني عشر']);
  const [needParticipants, setNeedParticipants] = useState<number>(120);
  const [needFindings, setNeedFindings] = useState<string>('');
  const [needPriority, setNeedPriority] = useState<'عالية' | 'متوسطة' | 'منخفضة'>('عالية');
  const [needRecommendedObj, setNeedRecommendedObj] = useState<string>('');
  const [needStatus, setNeedStatus] = useState<NeedsAssessmentRecord['status']>('تم التحليل');
  const [needSurveyLink, setNeedSurveyLink] = useState<string>('');

  // Filtered plans for current academic year (or all if selectedAcademicYear === 'الكل')
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (selectedAcademicYear !== 'الكل' && p.academicYear !== selectedAcademicYear) return false;
      if (planTypeFilter !== 'all' && p.planType !== planTypeFilter) return false;
      if (domainFilter !== 'all' && p.domain !== domainFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          p.title.toLowerCase().includes(q) ||
          p.objective.toLowerCase().includes(q) ||
          p.activities.toLowerCase().includes(q) ||
          p.targetGroup.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [plans, selectedAcademicYear, planTypeFilter, domainFilter, statusFilter, searchQuery]);

  const filteredNeeds = useMemo(() => {
    return needsList.filter((n) => {
      if (selectedAcademicYear !== 'الكل' && n.academicYear !== selectedAcademicYear) return false;
      return true;
    });
  }, [needsList, selectedAcademicYear]);

  // All evidences aggregated across plans and needs
  const allEvidences = useMemo(() => {
    const list: Array<GuidanceEvidenceItem & { planTitle?: string; planId?: string; academicYear?: string }> = [];
    filteredPlans.forEach((p) => {
      (p.evidences || []).forEach((ev) => {
        list.push({
          ...ev,
          planTitle: p.title,
          planId: p.id,
          academicYear: p.academicYear,
        });
      });
    });
    return list;
  }, [filteredPlans]);

  // KPI Metrics Summary
  const kpiStats = useMemo(() => {
    const totalPlans = filteredPlans.length;
    const annualCount = filteredPlans.filter((p) => p.planType === 'annual').length;
    const quarterlyCount = filteredPlans.filter((p) => p.planType === 'quarterly').length;
    const weeklyCount = filteredPlans.filter((p) => p.planType === 'weekly').length;
    const completedCount = filteredPlans.filter((p) => p.status === 'completed' || p.completionPercentage >= 100).length;
    const avgCompletion =
      totalPlans > 0
        ? Math.round(filteredPlans.reduce((acc, p) => acc + (Number(p.completionPercentage) || 0), 0) / totalPlans)
        : 0;
    const totalTarget = filteredPlans.reduce((acc, p) => acc + (Number(p.targetCount) || 0), 0);
    const totalExecuted = filteredPlans.reduce((acc, p) => acc + (Number(p.executedCount) || 0), 0);

    return {
      totalPlans,
      annualCount,
      quarterlyCount,
      weeklyCount,
      completedCount,
      avgCompletion,
      totalTarget,
      totalExecuted,
      evidencesCount: allEvidences.length,
    };
  }, [filteredPlans, allEvidences]);

  // Open Plan Modal for New
  const handleOpenNewPlan = (defaultType: GuidancePlanType = 'quarterly', prefillNeed?: NeedsAssessmentRecord) => {
    setEditingPlan(null);
    setFormPlanType(defaultType);
    setFormTerm(defaultType === 'annual' ? 'العام الكامل' : 'الفصل الأول');
    setFormTitle(prefillNeed ? `خطة استجابة: ${prefillNeed.title}` : '');
    setFormDomain('أكاديمي');
    setFormNeedSource(prefillNeed ? prefillNeed.keyFindings : '');
    setFormLinkedNeedId(prefillNeed ? prefillNeed.id : '');
    setFormObjective(prefillNeed ? prefillNeed.recommendedObjectives : '');
    setFormTargetGroup(prefillNeed ? `الصفوف: ${prefillNeed.targetGrades.join('، ')}` : 'طلبة الصفوف التاسع إلى الثاني عشر');
    setFormActivities('');
    setFormResponsible(counselorDefaultName);
    setFormStartDate(getUaeTodayDateString());
    setFormEndDate(getUaeTodayDateString());
    setFormResources('أدلة الإرشاد، استمارات المتابعة، العروض التقديمية، ملف الطالب الموحد');
    setFormKpiIndicator('عدد الجلسات والأنشطة المنفذة ونسبة استفادة الطلبة المستهدفين');
    setFormTargetCount(10);
    setFormExecutedCount(0);
    setFormResultsSummary('');
    setFormImprovementActions('');
    setFormStatus('in_progress');
    setFormEvidences([]);
    setIsPlanModalOpen(true);
  };

  // Open Plan Modal for Edit
  const handleOpenEditPlan = (plan: GuidancePlanRecord) => {
    setEditingPlan(plan);
    setFormPlanType(plan.planType);
    setFormTerm(plan.term);
    setFormTitle(plan.title);
    setFormDomain(plan.domain);
    setFormNeedSource(plan.needSource);
    setFormLinkedNeedId(plan.linkedNeedId || '');
    setFormObjective(plan.objective);
    setFormTargetGroup(plan.targetGroup);
    setFormActivities(plan.activities);
    setFormResponsible(plan.responsiblePerson || counselorDefaultName);
    setFormStartDate(plan.startDate);
    setFormEndDate(plan.endDate);
    setFormResources(plan.resources);
    setFormKpiIndicator(plan.kpiIndicator);
    setFormTargetCount(plan.targetCount || 10);
    setFormExecutedCount(plan.executedCount || 0);
    setFormResultsSummary(plan.resultsSummary || '');
    setFormImprovementActions(plan.improvementActions || '');
    setFormStatus(plan.status);
    setFormEvidences(plan.evidences || []);
    setIsPlanModalOpen(true);
  };

  // Save Plan to Firestore (Strict confirmation before showing success)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formObjective.trim()) {
      onShowToast('يرجى إدخال عنوان الخطة والهدف الإرشادي المطلوب', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const target = Math.max(1, Number(formTargetCount) || 1);
      const executed = Math.max(0, Number(formExecutedCount) || 0);
      const calculatedPercentage = Math.min(100, Math.round((executed / target) * 100));

      const now = new Date().toISOString();
      const record: GuidancePlanRecord = {
        id: editingPlan ? editingPlan.id : `GPLAN-${Date.now()}`,
        schoolId,
        academicYear: selectedAcademicYear === 'الكل' ? (schoolSettings.academicYear || '2026–2027') : selectedAcademicYear,
        term: formTerm,
        planType: formPlanType,
        title: formTitle.trim(),
        domain: formDomain,
        needSource: formNeedSource.trim() || 'تحليل الاحتياجات الطلابية ومؤشرات الانضباط والتحصيل',
        linkedNeedId: formLinkedNeedId || undefined,
        objective: formObjective.trim(),
        targetGroup: formTargetGroup.trim(),
        activities: formActivities.trim() || 'جلسات إرشادية فردية وجماعية وورش توجيهية ومتابعة مع أولياء الأمور',
        responsiblePerson: formResponsible.trim() || counselorDefaultName,
        startDate: formStartDate,
        endDate: formEndDate,
        resources: formResources.trim(),
        kpiIndicator: formKpiIndicator.trim(),
        targetCount: target,
        executedCount: executed,
        completionPercentage: formStatus === 'completed' ? 100 : calculatedPercentage,
        resultsSummary: formResultsSummary.trim(),
        improvementActions: formImprovementActions.trim(),
        status: calculatedPercentage >= 100 && formStatus === 'in_progress' ? 'completed' : formStatus,
        evidences: formEvidences,
        createdBy: currentUser.fullName || counselorDefaultName,
        createdAt: editingPlan ? editingPlan.createdAt : now,
        updatedAt: now,
      };

      // Confirm Firestore save first
      const updatedPlans = await saveGuidancePlanFirestore(schoolId, record, currentUser);
      setPlans(updatedPlans);
      setGuidancePlansLocal(updatedPlans);

      // If linked to a NeedsAssessmentRecord, update its status to 'مدرج في الخطة'
      if (formLinkedNeedId) {
        const targetNeed = needsList.find((n) => n.id === formLinkedNeedId);
        if (targetNeed) {
          const updatedNeed: NeedsAssessmentRecord = {
            ...targetNeed,
            status: 'مدرج في الخطة',
            linkedPlanIds: Array.from(new Set([...(targetNeed.linkedPlanIds || []), record.id])),
          };
          const updatedNeeds = await saveNeedsAssessmentFirestore(schoolId, updatedNeed, currentUser);
          setNeedsList(updatedNeeds);
          setNeedsAssessmentsLocal(updatedNeeds);
        }
      }

      setIsPlanModalOpen(false);
      onShowToast(
        `تم حفظ وتوثيق الخطة الإرشادية (${record.title}) في Firestore بنجاح`,
        'success'
      );
    } catch (err: any) {
      console.error('Error saving guidance plan to Firestore:', err);
      onShowToast(`تعذر الحفظ في Firestore: ${err?.message || 'تحقق من الاتصال'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Increment Executed Count directly on a Plan Card & sync to Firestore
  const handleQuickIncrementExecution = async (plan: GuidancePlanRecord) => {
    setIsSaving(true);
    try {
      const nextExec = (Number(plan.executedCount) || 0) + 1;
      const target = Math.max(1, Number(plan.targetCount) || 1);
      const nextPct = Math.min(100, Math.round((nextExec / target) * 100));
      const updatedPlan: GuidancePlanRecord = {
        ...plan,
        executedCount: nextExec,
        completionPercentage: nextPct,
        status: nextPct >= 100 ? 'completed' : plan.status === 'draft' ? 'in_progress' : plan.status,
      };
      const updatedPlans = await saveGuidancePlanFirestore(schoolId, updatedPlan, currentUser);
      setPlans(updatedPlans);
      setGuidancePlansLocal(updatedPlans);
      onShowToast(`تم تسجيل تنفيذ نشاط/جلسة وتحديث نسبة إنجاز الخطة إلى ${nextPct}% في Firestore`, 'success');
    } catch (err: any) {
      onShowToast(`تعذر تحديث نسبة الإنجاز في Firestore: ${err?.message || ''}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Plan
  const handleDeletePlan = async (plan: GuidancePlanRecord) => {
    if (!window.confirm(`هل أنت متأكد من حذف الخطة "${plan.title}"؟`)) return;
    setIsSaving(true);
    try {
      const updated = await deleteGuidancePlanFirestore(schoolId, plan.id, currentUser);
      setPlans(updated);
      setGuidancePlansLocal(updated);
      onShowToast('تم حذف الخطة الإرشادية من Firestore بنجاح', 'info');
    } catch (err: any) {
      onShowToast(`تعذر الحذف من Firestore: ${err?.message || ''}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Evidence Item to a Plan in Firestore
  const handleSaveEvidenceToPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      onShowToast('يرجى إدخال عنوان الشاهد أو المستند', 'warning');
      return;
    }

    const newEvidence: GuidanceEvidenceItem = {
      id: `EVID-${Date.now()}`,
      title: evTitle.trim(),
      type: evType,
      category: evCategory,
      fileName: evFileName.trim() || `${evTitle.trim()}.${evType === 'PDF' ? 'pdf' : evType === 'Excel' ? 'xlsx' : 'docx'}`,
      fileUrl: evFileUrl.trim() || undefined,
      description: evDescription.trim() || undefined,
      uploadedBy: currentUser.fullName || counselorDefaultName,
      uploadedAt: getUaeTodayDateString(),
      version: 'v1.0',
    };

    if (targetPlanForEvidence) {
      setIsSaving(true);
      try {
        const updatedPlan: GuidancePlanRecord = {
          ...targetPlanForEvidence,
          evidences: [newEvidence, ...(targetPlanForEvidence.evidences || [])],
        };
        const updatedPlans = await saveGuidancePlanFirestore(schoolId, updatedPlan, currentUser);
        setPlans(updatedPlans);
        setGuidancePlansLocal(updatedPlans);
        setIsEvidenceModalOpen(false);
        setTargetPlanForEvidence(null);
        setEvTitle('');
        setEvFileName('');
        setEvFileUrl('');
        setEvDescription('');
        onShowToast('تم إرفاق الشاهد وربطه بالخطة وحفظه في Firestore بنجاح', 'success');
      } catch (err: any) {
        onShowToast(`تعذر حفظ الشاهد في Firestore: ${err?.message || ''}`, 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Inside Plan Form Modal
      setFormEvidences((prev) => [newEvidence, ...prev]);
      setIsEvidenceModalOpen(false);
      setEvTitle('');
      setEvFileName('');
      setEvFileUrl('');
      setEvDescription('');
      onShowToast('تمت إضافة الشاهد إلى مسودة الخطة (اضغط حفظ الخطة لتأكيده سحابياً)', 'info');
    }
  };

  // Save Needs Assessment to Firestore
  const handleSaveNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needTitle.trim() || !needFindings.trim()) {
      onShowToast('يرجى إدخال عنوان دراسة الاحتياج وأبرز النتائج المرصودة', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const record: NeedsAssessmentRecord = {
        id: editingNeed ? editingNeed.id : `NEED-${Date.now()}`,
        schoolId,
        academicYear: selectedAcademicYear === 'الكل' ? (schoolSettings.academicYear || '2026–2027') : selectedAcademicYear,
        term: needTerm,
        title: needTitle.trim(),
        category: needCategory,
        targetGrades: needGrades.length > 0 ? needGrades : ['تاسع', 'عاشر', 'حادي عشر', 'ثاني عشر'],
        participantsCount: Number(needParticipants) || 0,
        keyFindings: needFindings.trim(),
        priorityLevel: needPriority,
        recommendedObjectives: needRecommendedObj.trim() || 'إدراج برامج توجيهية وجلسات دعم فردية وجماعية في الخطة الفصلية',
        linkedPlanIds: editingNeed ? editingNeed.linkedPlanIds : [],
        status: needStatus,
        surveyLink: needSurveyLink.trim() || undefined,
        createdBy: currentUser.fullName || counselorDefaultName,
        createdAt: editingNeed ? editingNeed.createdAt : now,
        updatedAt: now,
      };

      const updatedList = await saveNeedsAssessmentFirestore(schoolId, record, currentUser);
      setNeedsList(updatedList);
      setNeedsAssessmentsLocal(updatedList);
      setIsNeedModalOpen(false);
      setEditingNeed(null);
      onShowToast(`تم حفظ تحليل الاحتياجات (${record.title}) في Firestore بنجاح`, 'success');
    } catch (err: any) {
      onShowToast(`تعذر حفظ تحليل الاحتياج في Firestore: ${err?.message || ''}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNeed = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف سجل تحليل الاحتياج؟')) return;
    setIsSaving(true);
    try {
      const updated = await deleteNeedsAssessmentFirestore(schoolId, id, currentUser);
      setNeedsList(updated);
      setNeedsAssessmentsLocal(updated);
      onShowToast('تم حذف سجل تحليل الاحتياج من Firestore', 'info');
    } catch (err: any) {
      onShowToast(`تعذر الحذف: ${err?.message || ''}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Executive Banner */}
      <div className="bg-gradient-to-l from-[#0C2340] via-[#13325B] to-[#006D77] rounded-3xl p-6 text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-black">
              وحدة التخطيط الإرشادي وتحليل الاحتياجات
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-teal-200 text-xs font-mono font-bold">
              العام الدراسي: {selectedAcademicYear === 'الكل' ? (schoolSettings.academicYear || '2026–2027') : selectedAcademicYear}
            </span>
          </div>
          <h2 className="text-xl font-black tracking-tight">
            الخطط السنوية والفصلية والأسبوعية وتحليل الاحتياجات والشواهد
          </h2>
          <p className="text-xs text-slate-200 max-w-3xl">
            المرشد الأكاديمي والمهني: <strong className="text-[#D4AF37]">{counselorDefaultName}</strong> • {schoolSettings.schoolName} • جميع الخطط والشواهد محفوظة وموثقة مباشرة في Firestore
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenNewPlan('annual')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 text-[#D4AF37]" />
            <span>خطة سنوية</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenNewPlan('quarterly')}
            className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ إضافة هدف / خطة فصلية</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingNeed(null);
              setNeedTitle('');
              setNeedFindings('');
              setNeedRecommendedObj('');
              setIsNeedModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            <span>+ تحليل احتياج / استبانة</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 cursor-pointer"
            title="طباعة الخطة الرسمية A4"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">إجمالي أهداف الخطط</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{kpiStats.totalPlans}</span>
            <span className="text-[10px] text-[#006D77] font-bold">سنوي: {kpiStats.annualCount} | فصلي: {kpiStats.quarterlyCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">متوسط نسبة تنفيذ الخطة</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-[#006D77] font-mono">{kpiStats.avgCompletion}%</span>
            <span className="text-[10px] text-emerald-700 font-bold">مكتمل: {kpiStats.completedCount}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#006D77] rounded-full transition-all" style={{ width: `${kpiStats.avgCompletion}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">الأنشطة المنفذة / المستهدفة</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400 font-mono">
              {kpiStats.totalExecuted} / {kpiStats.totalTarget}
            </span>
            <span className="text-[10px] text-slate-500">فعلي</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">دراسات الاحتياج والاستبانات</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600 font-mono">{filteredNeeds.length}</span>
            <span className="text-[10px] text-amber-700 font-bold">محللة ومرتبطة</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">الشواهد الأساسية الموثقة</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-700 font-mono">{kpiStats.evidencesCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold">شاهد مرتبط</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 block">خطط العمل الأسبوعية</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-purple-700 font-mono">{kpiStats.weeklyCount}</span>
            <button
              type="button"
              onClick={() => handleOpenNewPlan('weekly')}
              className="text-[10px] text-[#006D77] font-bold hover:underline cursor-pointer"
            >
              + خطة أسبوعية
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              subTab === 'plans'
                ? 'bg-[#0C2340] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4 text-[#D4AF37]" />
            <span>الخطط السنوية والفصلية والأسبوعية ({filteredPlans.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('needs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              subTab === 'needs'
                ? 'bg-[#006D77] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#D4AF37]" />
            <span>تحليل الاحتياجات والاستبانات ({filteredNeeds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('evidences')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
              subTab === 'evidences'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Paperclip className="w-4 h-4 text-[#D4AF37]" />
            <span>الشواهد الأساسية المرتبطة بالخطط ({allEvidences.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onRefreshFromCloud}
          disabled={isSyncing}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#006D77]' : ''}`} />
          <span>مزامنة من Firestore</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: GUIDANCE PLANS (ANNUAL / QUARTERLY / WEEKLY)               */}
      {/* ===================================================================== */}
      {subTab === 'plans' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'annual', 'quarterly', 'weekly'] as const).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPlanTypeFilter(pt)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    planTypeFilter === pt
                      ? 'bg-[#006D77] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {pt === 'all' ? 'جميع الخطط' : PLAN_TYPE_LABELS[pt]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl justify-end">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في الأهداف، الأنشطة، الفئة المستهدفة..."
                  className="w-full pr-8 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="all">كل المجالات</option>
                <option value="أكاديمي">أكاديمي</option>
                <option value="مهني ومسارات">مهني ومسارات</option>
                <option value="وقائي وسلوكي">وقائي وسلوكي</option>
                <option value="اجتماعي ونفسي">اجتماعي ونفسي</option>
                <option value="جودة الحياة والشراكات">جودة الحياة والشراكات</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="all">كل الحالات</option>
                {Object.entries(PLAN_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Plans List */}
          {filteredPlans.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3">
              <Target className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                لا توجد خطط إرشادية مسجلة تطابق الفلتر الحالي
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                يمكنك إنشاء هدف جديد في الخطة السنوية أو الفصلية أو الأسبوعية وربطه باحتياج طلابي وشواهد التنفيذ وحفظه مباشرة في Firestore.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenNewPlan('quarterly')}
                  className="px-4 py-2 rounded-xl bg-[#006D77] text-white text-xs font-bold hover:bg-teal-700 cursor-pointer shadow-sm"
                >
                  + إنشاء خطة فصلية جديدة
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenNewPlan('annual')}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  + إنشاء خطة سنوية
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((plan) => {
                const stInfo = PLAN_STATUS_LABELS[plan.status] || PLAN_STATUS_LABELS.draft;
                const pct = Math.min(100, Math.max(0, Number(plan.completionPercentage) || 0));

                return (
                  <div
                    key={plan.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-[#006D77]/40 transition-all space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0C2340] text-[#D4AF37] text-[11px] font-black">
                            {PLAN_TYPE_LABELS[plan.planType]}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-teal-300 border border-teal-200 text-[11px] font-bold">
                            مجال: {plan.domain}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {plan.academicYear} • {plan.term}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${stInfo.badgeClass}`}>
                            {stInfo.label}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white pt-1">
                          {plan.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          <strong>الهدف الإرشادي:</strong> {plan.objective}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleQuickIncrementExecution(plan)}
                          disabled={isSaving}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="تسجيل نشاط منفذ وتحديث نسبة الإنجاز تلقائياً"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+ توثيق تنفيذ ({plan.executedCount}/{plan.targetCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTargetPlanForEvidence(plan);
                            setEvCategory('خطة');
                            setIsEvidenceModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-amber-600" />
                          <span>إرفاق شاهد ({plan.evidences?.length || 0})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditPlan(plan)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePlan(plan)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 cursor-pointer"
                          title="حذف الخطة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">الاحتياج المرصود والفئة المستهدفة:</span>
                        <p className="text-slate-600 dark:text-slate-400">{plan.needSource}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 text-[11px] font-bold text-[#006D77]">
                          الفئة: {plan.targetGroup}
                        </span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">الأنشطة والإجراءات وموعد التنفيذ:</span>
                        <p className="text-slate-600 dark:text-slate-400">{plan.activities}</p>
                        <span className="text-[11px] text-slate-400 font-mono block mt-1">
                          الفترة: {plan.startDate} إلى {plan.endDate} • المسؤول: {plan.responsiblePerson}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 dark:text-slate-300">نسبة الإنجاز الفعلي:</span>
                          <span className="font-black text-[#006D77] font-mono text-sm">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100 ? 'bg-emerald-600' : pct >= 50 ? 'bg-[#006D77]' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          المؤشر: {plan.kpiIndicator} ({plan.executedCount} من {plan.targetCount})
                        </p>
                      </div>
                    </div>

                    {/* Linked Evidences Strip */}
                    {plan.evidences && plan.evidences.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-[#006D77]" />
                          الشواهد المرفقة:
                        </span>
                        {plan.evidences.map((ev) => (
                          <span
                            key={ev.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 text-[11px] text-teal-900 dark:text-teal-200 font-bold"
                          >
                            <span>[{ev.type}]</span>
                            <span>{ev.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({ev.uploadedAt})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: NEEDS ASSESSMENT & SURVEYS (تحليل الاحتياجات والاستبانات)    */}
      {/* ===================================================================== */}
      {subTab === 'needs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                سجل تحليل الاحتياجات والاستبانات الطلابية والأسرية والمدرسية
              </h3>
              <p className="text-xs text-slate-500">
                حصر احتياجات الطلبة والمعلمين وأولياء الأمور وتحويلها مباشرة إلى أهداف معتمدة في الخطة الفصلية والسنوية
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingNeed(null);
                setNeedTitle('');
                setNeedFindings('');
                setNeedRecommendedObj('');
                setIsNeedModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ إضافة دراسة احتياج / استبانة</span>
            </button>
          </div>

          {filteredNeeds.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد سجلات تحليل احتياجات مسجلة لهذا العام</p>
              <button
                type="button"
                onClick={() => setIsNeedModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#006D77] text-white text-xs font-bold cursor-pointer"
              >
                + تسجيل أول استبانة أو تحليل احتياج
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNeeds.map((need) => (
                <div
                  key={need.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-[11px] font-bold">
                          {need.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            need.priorityLevel === 'عالية'
                              ? 'bg-rose-100 text-rose-800'
                              : need.priorityLevel === 'متوسطة'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          أولوية {need.priorityLevel}
                        </span>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                        {need.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{need.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>أبرز النتائج والاحتياجات:</strong> {need.keyFindings}
                    </p>
                    <p className="text-xs text-[#006D77] dark:text-teal-300 bg-teal-50/60 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-200/60">
                      <strong>الأهداف المقترحة للخطة:</strong> {need.recommendedObjectives}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>الصفوف: {need.targetGrades.join('، ')}</span>
                      <span>حجم العينة / المشاركون: {need.participantsCount}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenNewPlan('quarterly', need)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#006D77] to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>تحويل إلى هدف في الخطة الفصلية</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNeed(need);
                          setNeedTitle(need.title);
                          setNeedTerm(need.term);
                          setNeedCategory(need.category);
                          setNeedGrades(need.targetGrades);
                          setNeedParticipants(need.participantsCount);
                          setNeedFindings(need.keyFindings);
                          setNeedPriority(need.priorityLevel);
                          setNeedRecommendedObj(need.recommendedObjectives);
                          setNeedStatus(need.status);
                          setNeedSurveyLink(need.surveyLink || '');
                          setIsNeedModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNeed(need.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: EVIDENCES & WITNESSES (الشواهد الأساسية المرتبطة بالخطط)      */}
      {/* ===================================================================== */}
      {subTab === 'evidences' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                سجل الشواهد الأساسية المرتبطة بالخطط والأنشطة الإرشادية
              </h3>
              <p className="text-xs text-slate-500">
                توثيق الملفات والعروض والصور والمحاضر المرتبطة بأهداف الخطة السنوية والفصلية لجاهزية الزيارات الإشرافية
              </p>
            </div>
            {filteredPlans.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTargetPlanForEvidence(filteredPlans[0]);
                  setIsEvidenceModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>+ إرفاق شاهد جديد</span>
              </button>
            )}
          </div>

          {allEvidences.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 p-12 text-center space-y-2">
              <Paperclip className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد شواهد مرفقة حتى الآن</p>
              <p className="text-xs text-slate-500">اضغط على «إرفاق شاهد» في أي خطة إرشادية لتوثيق الشاهد وحفظه في Firestore.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allEvidences.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black">
                      {ev.type} • {ev.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">{ev.uploadedAt}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">{ev.title}</h4>
                  {ev.description && <p className="text-xs text-slate-600 dark:text-slate-400">{ev.description}</p>}
                  <div className="text-[11px] text-[#006D77] font-bold bg-teal-50/60 p-2 rounded-xl border border-teal-100">
                    مرتبط بخطة: {ev.planTitle}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>الرافع: {ev.uploadedBy}</span>
                    <span>الإصدار: {ev.version || 'v1.0'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: CREATE / EDIT GUIDANCE PLAN                                  */}
      {/* ===================================================================== */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-[#0C2340] text-white">
              <div className="flex items-center gap-2.5">
                <Target className="w-5 h-5 text-[#D4AF37]" />
                <div>
                  <h3 className="text-sm sm:text-base font-black">
                    {editingPlan ? 'تعديل الخطة الإرشادية وتحديث الإنجاز' : 'إنشاء خطة إرشادية جديدة (سنوية / فصلية / أسبوعية)'}
                  </h3>
                  <p className="text-[11px] text-teal-200">
                    الحفظ الفعلي المباشر في Firestore • {schoolSettings.schoolName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">نوع الخطة: *</label>
                  <select
                    value={formPlanType}
                    onChange={(e) => setFormPlanType(e.target.value as GuidancePlanType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="annual">الخطة السنوية للمرشد</option>
                    <option value="quarterly">الخطة الفصلية</option>
                    <option value="weekly">خطة العمل الأسبوعية</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الفصل الدراسي: *</label>
                  <select
                    value={formTerm}
                    onChange={(e) => setFormTerm(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="الفصل الأول">الفصل الأول</option>
                    <option value="الفصل الثاني">الفصل الثاني</option>
                    <option value="الفصل الثالث">الفصل الثالث</option>
                    <option value="العام الكامل">العام الكامل</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">المجال الإرشادي: *</label>
                  <select
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value as GuidancePlanDomain)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[#006D77]"
                  >
                    <option value="أكاديمي">أكاديمي</option>
                    <option value="مهني ومسارات">مهني ومسارات</option>
                    <option value="وقائي وسلوكي">وقائي وسلوكي</option>
                    <option value="اجتماعي ونفسي">اجتماعي ونفسي</option>
                    <option value="جودة الحياة والشراكات">جودة الحياة والشراكات</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">عنوان محور الخطة / البرنامج: *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: برنامج رفع الدافعية الأكاديمية ومتابعة الطلبة المتعثرين في الحلقة الثالثة"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">ربط بتحليل احتياج مسجل (اختياري):</label>
                  <select
                    value={formLinkedNeedId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setFormLinkedNeedId(id);
                      const found = needsList.find((n) => n.id === id);
                      if (found) {
                        setFormNeedSource(found.keyFindings);
                        if (!formObjective) setFormObjective(found.recommendedObjectives);
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="">-- بدون ربط مباشر أو إدخال يدوي --</option>
                    {filteredNeeds.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title} ({n.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الفئة المستهدفة: *</label>
                  <input
                    type="text"
                    value={formTargetGroup}
                    onChange={(e) => setFormTargetGroup(e.target.value)}
                    placeholder="مثال: طلاب الصف العاشر والحادي عشر - المسار العام"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الاحتياج المرصود / المبررات:</label>
                <input
                  type="text"
                  value={formNeedSource}
                  onChange={(e) => setFormNeedSource(e.target.value)}
                  placeholder="مثال: نتائج تحليل درجات التقويم الأول واستبانة مهارات الاستذكار..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الهدف الإرشادي التفصيلي: *</label>
                <textarea
                  rows={2}
                  required
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  placeholder="خفض نسبة التعثر الدراسي وتنمية مهارات التخطيط الدراسي لدى الطلبة المستهدفين بنسبة 85%..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الأنشطة والإجراءات التنفيذية:</label>
                <textarea
                  rows={2}
                  value={formActivities}
                  onChange={(e) => setFormActivities(e.target.value)}
                  placeholder="جلسات إرشاد فردي، ورش مهارات التفوق، لقاءات أولياء الأمور، متابعة خطط الدعم الأكاديمي..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">المسؤول عن التنفيذ:</label>
                  <input
                    type="text"
                    value={formResponsible}
                    onChange={(e) => setFormResponsible(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">تاريخ البدء:</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">تاريخ الانتهاء:</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-teal-50/50 dark:bg-teal-950/30 p-3.5 rounded-2xl border border-teal-200 dark:border-teal-800">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">العدد المستهدف (جلسات/أنشطة):</label>
                  <input
                    type="number"
                    min={1}
                    value={formTargetCount}
                    onChange={(e) => setFormTargetCount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">المنفذ فعلياً حتى الآن:</label>
                  <input
                    type="number"
                    min={0}
                    value={formExecutedCount}
                    onChange={(e) => setFormExecutedCount(Number(e.target.value))}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-mono font-bold text-[#006D77]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">حالة الخطة الرسمية:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as GuidancePlanStatus)}
                    className="w-full p-2 rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {Object.entries(PLAN_STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">النتائج المتحققة والأثر:</label>
                  <input
                    type="text"
                    value={formResultsSummary}
                    onChange={(e) => setFormResultsSummary(e.target.value)}
                    placeholder="تحسن ملموس في التزام الطلبة وانخفاض حالات التأخر والتعثر..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">إجراءات التحسين والتطوير:</label>
                  <input
                    type="text"
                    value={formImprovementActions}
                    onChange={(e) => setFormImprovementActions(e.target.value)}
                    placeholder="تكثيف التواصل مع أولياء الأمور وجلسات الإرشاد الجمعي..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#006D77] hover:bg-teal-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'جارٍ الحفظ في Firestore...' : 'حفظ وتوثيق الخطة في Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: NEEDS ASSESSMENT & SURVEYS                                   */}
      {/* ===================================================================== */}
      {isNeedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-[#006D77] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-sm sm:text-base font-black">
                  {editingNeed ? 'تعديل تحليل الاحتياج / الاستبانة' : 'تسجيل تحليل احتياجات أو استبانة جديدة'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNeedModalOpen(false)}
                className="p-1 text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNeed} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">عنوان الاستبانة / دراسة الاحتياج: *</label>
                  <input
                    type="text"
                    required
                    value={needTitle}
                    onChange={(e) => setNeedTitle(e.target.value)}
                    placeholder="مثال: استبانة حصر المشكلات الدراسية والمهنية لطلبة الصف العاشر"
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تصنيف الأداة:</label>
                  <select
                    value={needCategory}
                    onChange={(e) => setNeedCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="استبانة طلابية">استبانة طلابية</option>
                    <option value="استبانة أولياء أمور">استبانة أولياء أمور</option>
                    <option value="استبانة معلمين">استبانة معلمين</option>
                    <option value="تحليل نتائج أكاديمية">تحليل نتائج أكاديمية</option>
                    <option value="تحليل مؤشرات الغياب والسلوك">تحليل مؤشرات الغياب والسلوك</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">عدد المشاركين / العينة:</label>
                  <input
                    type="number"
                    min={1}
                    value={needParticipants}
                    onChange={(e) => setNeedParticipants(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">درجة الأولوية:</label>
                  <select
                    value={needPriority}
                    onChange={(e) => setNeedPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="عالية">عالية</option>
                    <option value="متوسطة">متوسطة</option>
                    <option value="منخفضة">منخفضة</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الحالة:</label>
                  <select
                    value={needStatus}
                    onChange={(e) => setNeedStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="قيد الجمع">قيد الجمع</option>
                    <option value="تم التحليل">تم التحليل</option>
                    <option value="مدرج في الخطة">مدرج في الخطة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">أبرز النتائج والاحتياجات المرصودة: *</label>
                <textarea
                  rows={2}
                  required
                  value={needFindings}
                  onChange={(e) => setNeedFindings(e.target.value)}
                  placeholder="حاجة 35% من الطلاب إلى جلسات تنظيم الوقت والاستعداد للاختبارات وتحديد المسار الجامعي..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الأهداف الإرشادية المقترحة للخطة:</label>
                <textarea
                  rows={2}
                  value={needRecommendedObj}
                  onChange={(e) => setNeedRecommendedObj(e.target.value)}
                  placeholder="تنفيذ سلسلة ورش مهارات الاستذكار الفعال وجلسات توجيه مهني فردية لطلبة الثاني عشر..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNeedModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-[#006D77] text-white font-black shadow-md cursor-pointer"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ تحليل الاحتياج في Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: ATTACH EVIDENCE ITEM                                         */}
      {/* ===================================================================== */}
      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-black">إرفاق شاهد رسمي مرتبط بالخطة</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEvidenceModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvidenceToPlan} className="p-5 space-y-3 text-xs">
              {targetPlanForEvidence && (
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold">
                  الخطة المرتبطة: {targetPlanForEvidence.title}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">عنوان الشاهد / المستند: *</label>
                <input
                  type="text"
                  required
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                  placeholder="مثال: كشف حضور ورشة مهارات التفوق الدراسي + صور التنفيذ"
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">نوع الملف:</label>
                  <select
                    value={evType}
                    onChange={(e) => setEvType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="PDF">ملف PDF رسمي</option>
                    <option value="Word">مستند Word</option>
                    <option value="Excel">جدول Excel</option>
                    <option value="صورة">صورة توثيقية</option>
                    <option value="رابط خارجي">رابط خارجي</option>
                    <option value="سجل داخلي">سجل داخلي بالنظام</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">التصنيف الإشرافي:</label>
                  <select
                    value={evCategory}
                    onChange={(e) => setEvCategory(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="خطة">توثيق خطة</option>
                    <option value="احتياج واستبانة">احتياج واستبانة</option>
                    <option value="برنامج">برنامج إرشادي</option>
                    <option value="جلسة">جلسة توجيهية</option>
                    <option value="شاهد إشرافي">شاهد زيارة إشرافية</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">اختيار ملف من الجهاز أو إدخال اسم المرفق:</label>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setEvFileName(f.name);
                  }}
                  className="w-full p-2 rounded-xl border border-dashed border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">وصف مختصر للشاهد:</label>
                <input
                  type="text"
                  value={evDescription}
                  onChange={(e) => setEvDescription(e.target.value)}
                  placeholder="تم التنفيذ بحضور 45 طالباً من الصف العاشر..."
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEvidenceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-black cursor-pointer"
                >
                  {isSaving ? 'جارٍ الحفظ...' : 'حفظ الشاهد في Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
