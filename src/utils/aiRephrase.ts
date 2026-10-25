/**
 * AI Incident Rephrasing Assistant for School Counselors
 * Transforms subjective or colloquial accounts into objective, pedagogical,
 * evidence-based official reports compliant with UAE Student Code of Conduct (Resolution 851/2018).
 */

export interface RephraseResult {
  improvedText: string;
  keyChanges: string[];
  tone: string;
}

/**
 * Rephrases incident text using the pedagogical rule engine compliant with UAE Ministerial Resolution 851/2018.
 * Returns a formal, objective, pedagogical drafting proposal for counselor review.
 */
export async function rephraseIncidentWithAI(
  rawText: string,
  context?: { location?: string; degree?: string }
): Promise<RephraseResult> {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      improvedText: '',
      keyChanges: [],
      tone: 'محايد رسمي',
    };
  }

  // Pure client-side transformation compliant with Resolution 851/2018
  return rephraseIncidentObjective(trimmed, context);
}

/**
 * Synchronous pedagogical rule-based transformer for offline or immediate drafting
 */
export function rephraseIncidentObjective(rawText: string, context?: { location?: string; degree?: string }): RephraseResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      improvedText: '',
      keyChanges: [],
      tone: 'محايد رسمي',
    };
  }

  // Common replacements for emotional/accusatory colloquial terms
  let text = trimmed;

  // Pattern transformations
  const transformations: Array<{ test: RegExp; replace: string; note: string }> = [
    {
      test: /(قليل أدب|عديم احترام|ما يحترم|يستهبل|ما يستحي)/gi,
      replace: 'عدم الالتزام بآداب الحوار والتعامل التربوي اللائق',
      note: 'استبدال الألفاظ الشخصية بوصف سلوكي إجرائي',
    },
    {
      test: /(يصارخ|صرخ في وجه|يعلي صوته بقوة|صوته عالي)/gi,
      replace: 'رفع نبرة الصوت والتحدث بنبرة غير مناسبة للبيئة الصفية',
      note: 'صياغة توصيف واقعي لنبرة الصوت دون انفعال',
    },
    {
      test: /(عنيد|ما يسمع الكلام|طنش المعلم|يتجاهل الأوامر)/gi,
      replace: 'عدم الاستجابة لتوجيهات الكادر التدريسي والتعليمات الصفية المعتمدة',
      note: 'تحويل صفة العناد إلى عدم استجابة إجرائية للتعليمات',
    },
    {
      test: /(يطقطق بالهاتف|يلعب بالتلفون|ماسح الجوال)/gi,
      replace: 'استخدام الهاتف المتحرك للأغراض الشخصية دون تصريح مسبق',
      note: 'استخدام المصطلح الإداري المعتمد للأجهزة الإلكترونية',
    },
    {
      test: /(ضرب زميله|تهاوشوا|اشتبكوا باليد)/gi,
      replace: 'حدوث احتكاك جسدي وتدافع بين الطرفين نتج عنه إخلال بالنظام العام',
      note: 'وصف واقعة التشابك بدقة وتوازن قانوني',
    },
    {
      test: /(يكذب|يألف كلام|يتبلى)/gi,
      replace: 'تقديم إفادات غير متطابقة مع وقائع المعاينة وشهادات الحاضرين',
      note: 'استبدال تهمة الكذب المباشرة بتناقض الإفادات',
    },
    {
      test: /(شرد من الحصة|نط من السور|هرب من المدرسة)/gi,
      replace: 'مغادرة الحرم المدرسي أو القاعة الدراسية دون إذن رسمي مسبق',
      note: 'توثيق الخروج غير المصرح به بالصياغة المعتمدة',
    },
    {
      test: /(كسر الكرسي|خرب الطاولة|كسر الأغراض)/gi,
      replace: 'إلحاق ضرر بالممتلكات والتجهيزات المدرسية في القاعة',
      note: 'استخدام مصطلح إلحاق الضرر بالمرافق بدلاً من التكسير العفوي',
    },
  ];

  const appliedNotes: string[] = [];

  transformations.forEach((item) => {
    if (item.test.test(text)) {
      text = text.replace(item.test, item.replace);
      appliedNotes.push(item.note);
    }
  });

  // Structural wrapping into official pedagogical language
  let refinedText = text;
  if (!appliedNotes.length) {
    // If no slang detected, structure into polished formal administrative phrasing
    refinedText = `في تمام الواقعة المحددة، تبيّن قيام الطالب بالسلوك الآتي: (${trimmed}). وحيث إن هذا التصرف يتعارض مع الالتزامات السلوكية المنصوص عليها في لائحة السلوك الطلابي لمرحلة التعليم الثانوي، فقد تم توثيق الملاحظة بموضوعية تمهيداً لاتخاذ الإجراء التوجيهي المناسب.`;
    appliedNotes.push('إعادة صياغة العبارات بأسلوب إداري توثيقي خالٍ من الانفعال');
    appliedNotes.push('تأطير الواقعة ضمن لائحة الانضباط والسلوك الطلابي الرسمية');
  } else {
    refinedText = `لوحظ قيام الطالب بـ ${refinedText}، الأمر الذي شكّل إخلالاً بالانضباط المدرسي المطلوب. وقد جرى التعامل مع الموقف وفق الأطر التربوية المعتمدة والتحقق من ملابسات الحادثة دون توجيه أحكام مسبقة.`;
    appliedNotes.push('تنقية النص من أي أحكام مسبقة أو عبارات تزيد الاحتقان');
  }

  return {
    improvedText: refinedText,
    keyChanges: appliedNotes,
    tone: 'رسمي تربوي وموضوعي',
  };
}
