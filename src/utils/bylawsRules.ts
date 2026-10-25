import { TardinessRecord, TardinessSuggestedAction } from '../types';

/**
 * محرك قواعد لائحة إدارة سلوك الطلبة (القرار الوزاري رقم 851 لسنة 2018م)
 * 
 * ملاحظة هامة جداً:
 * الإجراءات الناتجة عن هذا المحرك هي "إجراءات مقترحة استرشادية" للمرشد الأكاديمي والمهني،
 * ولا يتم تطبيق أي عقوبة، أو خصم درجات، أو إنشاء نماذج رسمية، أو إحالة للجنة بشكل آلي قط.
 */

export interface TardinessRuleRecommendation {
  recurrence: number;
  suggestedAction: TardinessSuggestedAction;
  title: string;
  description: string;
  isCritical: boolean;
  bylawReference: string;
}

/**
 * الحصول على الإجراء السلوكي المقترح حسب لائحة السلوك
 */
export function getSuggestedTardinessAction(pastCount: number): TardinessSuggestedAction {
  const currentOccurrence = pastCount + 1;
  if (currentOccurrence <= 1) {
    return 'تنبيه شفهي';
  } else if (currentOccurrence === 2) {
    return 'تعهد طالب';
  } else {
    return 'متابعة المرشد والتواصل مع ولي الأمر';
  }
}

/**
 * تفاصيل الإجراء المقترح وفق نص اللائحة
 */
export function getTardinessActionDetails(pastCount: number): TardinessRuleRecommendation {
  const currentOccurrence = pastCount + 1;
  if (currentOccurrence <= 1) {
    return {
      recurrence: currentOccurrence,
      suggestedAction: 'تنبيه شفهي',
      title: 'تنبيه شفهي وتوجيه إرشادي فردي',
      description: 'جلسة توجيه فردية للطالب للتأكيد على أهمية الانضباط الصباحي وبداية اليوم الدراسي.',
      isCritical: false,
      bylawReference: 'القرار الوزاري 851 لسنة 2018م – إجراء وقائي إرشادي',
    };
  } else if (currentOccurrence === 2) {
    return {
      recurrence: currentOccurrence,
      suggestedAction: 'تعهد طالب',
      title: 'تعهد خطي للطالب وإخطار ولي الأمر',
      description: 'أخذ تعهد خطي على الطالب بالالتزام الصباحي وإشعار ولي الأمر بالعلم.',
      isCritical: false,
      bylawReference: 'القرار الوزاري 851 لسنة 2018م – ملحق رقم (9/27)',
    };
  } else {
    return {
      recurrence: currentOccurrence,
      suggestedAction: 'متابعة المرشد والتواصل مع ولي الأمر',
      title: 'متابعة المرشد الأكاديمي واستدعاء ولي الأمر',
      description: 'استدعاء ولي الأمر (نموذج 8) وإحالة الحالة لغرفة الإرشاد لدراسة أسباب التأخير ووضع خطة مساعدة.',
      isCritical: true,
      bylawReference: 'القرار الوزاري 851 لسنة 2018م – ملحق رقم (8) و(10)',
    };
  }
}

export type FollowUpDisplayStatus =
  | 'لا يوجد إجراء'
  | 'تعهد مطلوب'
  | 'بانتظار توقيع الطالب'
  | '✓ وقع الطالب'
  | 'بانتظار توقيع ولي الأمر'
  | '✓ وقع ولي الأمر'
  | '✓ مكتمل';

export interface FollowUpResolutionResult {
  statusText: FollowUpDisplayStatus;
  badgeClass: string;
  linkedFormId?: string;
  linkedFormType?: string;
  hasForm: boolean;
}

/**
 * فحص وحساب حالة المتابعة والتوقيعات لسجل التأخير بدقة
 */
export function resolveTardinessFollowUpStatus(
  record: TardinessRecord,
  allLinkedForms?: Array<{
    id: string;
    formType?: string;
    studentSignature?: string;
    parentSignature?: string;
    guardianSignature?: string;
    isParentSignatureRecorded?: boolean;
    status?: string;
    tardinessRecordId?: string;
    studentId?: string;
    studentNumber?: string;
  }>
): FollowUpResolutionResult {
  // 1. البحث عن أي نموذج مرتبط مسجل بهذا السجل بالتحديد
  const linkedForm = allLinkedForms?.find(
    (f) =>
      (f.tardinessRecordId && f.tardinessRecordId === record.id) ||
      (record.linkedFormId && f.id === record.linkedFormId)
  );

  const formId = linkedForm?.id || record.linkedFormId;
  const formType = linkedForm?.formType || record.linkedFormType;

  // فحص حالة التوقيعات المباشرة من السجل أو من النموذج
  const studentSigned = Boolean(
    record.isStudentSigned || linkedForm?.studentSignature
  );
  const parentSigned = Boolean(
    record.isParentSigned ||
      linkedForm?.parentSignature ||
      linkedForm?.guardianSignature ||
      linkedForm?.isParentSignatureRecorded
  );

  // إذا لم يكن هناك إجراء مطلوب أو كان تنبيهاً شفهياً بدون نموذج
  if (!formId && record.suggestedAction === 'تنبيه شفهي' && !record.counselorNotes?.includes('تعهد')) {
    return {
      statusText: 'لا يوجد إجراء',
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700',
      hasForm: false,
    };
  }

  // إذا كان هناك تعهد مكتمل بتوقيع الطالب وولي الأمر
  if (studentSigned && parentSigned) {
    return {
      statusText: '✓ مكتمل',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 font-bold',
      linkedFormId: formId,
      linkedFormType: formType,
      hasForm: Boolean(formId),
    };
  }

  // إذا وقع ولي الأمر
  if (parentSigned && !studentSigned) {
    return {
      statusText: '✓ وقع ولي الأمر',
      badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-300 font-bold',
      linkedFormId: formId,
      linkedFormType: formType,
      hasForm: Boolean(formId),
    };
  }

  // إذا وقع الطالب وبانتظار ولي الأمر
  if (studentSigned && !parentSigned) {
    return {
      statusText: '✓ وقع الطالب',
      badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 font-bold',
      linkedFormId: formId,
      linkedFormType: formType,
      hasForm: Boolean(formId),
    };
  }

  // إذا وجد نموذج بانتظار توقيع ولي الأمر
  if (formId && (formType?.includes('summon') || formType?.includes('parent') || record.suggestedAction.includes('ولي الأمر'))) {
    return {
      statusText: 'بانتظار توقيع ولي الأمر',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 font-bold animate-pulse',
      linkedFormId: formId,
      linkedFormType: formType,
      hasForm: true,
    };
  }

  // إذا وجد نموذج بانتظار توقيع الطالب
  if (formId && !studentSigned) {
    return {
      statusText: 'بانتظار توقيع الطالب',
      badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 font-bold',
      linkedFormId: formId,
      linkedFormType: formType,
      hasForm: true,
    };
  }

  // إذا كان التأخير يستوجب تعهداً لكن لم ينشأ بعد
  if (record.suggestedAction.includes('تعهد') || (record.previousTardinessCount ?? 0) >= 1) {
    return {
      statusText: 'تعهد مطلوب',
      badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/80 font-semibold',
      hasForm: false,
    };
  }

  return {
    statusText: 'لا يوجد إجراء',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700',
    hasForm: false,
  };
}
