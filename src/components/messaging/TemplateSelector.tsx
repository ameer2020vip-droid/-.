import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Check,
  Tag,
  Flame,
  AlertCircle,
  FilePlus,
  Compass,
} from 'lucide-react';
import { MessageTemplate, MessageCategory } from '../../types';

interface TemplateSelectorProps {
  templates: MessageTemplate[];
  selectedTemplateId: string;
  onSelectTemplate: (template: MessageTemplate) => void;
  onCreateCustomTemplate?: () => void;
}

const CATEGORIES: { id: MessageCategory | 'all'; label: string; icon?: string }[] = [
  { id: 'all', label: 'كافة القوالب' },
  { id: 'attendance', label: 'الحضور والغياب' },
  { id: 'tardiness', label: 'التأخير الصباحي' },
  { id: 'behavior', label: 'السلوك والمخالفات' },
  { id: 'academic', label: 'أكاديمية وإرشاد' },
  { id: 'guardianCall', label: 'استدعاء ولي أمر' },
  { id: 'exams', label: 'اختبارات وتقييم' },
  { id: 'positive', label: 'شكر وتحفيز' },
  { id: 'events', label: 'اجتماعات وفعاليات' },
  { id: 'administrative', label: 'وثائق وإدارية' },
  { id: 'transport', label: 'مواصلات' },
  { id: 'health', label: 'عيادة وصحة' },
  { id: 'custom', label: 'رسالة فارغة' },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onCreateCustomTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState<MessageCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (activeCategory !== 'all' && t.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchSubj = t.subject.toLowerCase().includes(q);
        const matchBadge = t.badgeText?.toLowerCase().includes(q);
        if (!matchName && !matchSubj && !matchBadge) return false;
      }
      return true;
    });
  }, [templates, activeCategory, searchQuery]);

  const getImportanceBadge = (importance: MessageTemplate['importance']) => {
    switch (importance) {
      case 'veryUrgent':
        return (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-rose-600" />
            <span>عاجل جداً</span>
          </span>
        );
      case 'urgent':
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5 text-amber-600" />
            <span>عاجل</span>
          </span>
        );
      case 'important':
        return (
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
            مهم
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            عادي
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Action bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في قوالب الرسائل (الاسم، الموضوع، نوع الإشعار)..."
            className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-[#006D77]"
          />
        </div>

        {onCreateCustomTemplate && (
          <button
            type="button"
            onClick={onCreateCustomTemplate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0C2340] hover:bg-[#08182B] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <FilePlus className="w-4 h-4 text-[#D4AF37]" />
            <span>قالب مخصص جديد</span>
          </button>
        )}
      </div>

      {/* Category Pills (Horizontal scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#006D77] text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            لا توجد قوالب تطابق تصنيف البحث المحدد
          </div>
        ) : (
          filteredTemplates.map((t) => {
            const isSelected = selectedTemplateId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-teal-50/60 dark:bg-teal-950/30 border-[#006D77] ring-2 ring-[#006D77]/20 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-bold"
                      style={{
                        backgroundColor: t.colors.badgeBg || '#FEF3C7',
                        color: t.colors.badgeText || '#92400E',
                      }}
                    >
                      {t.badgeText || t.name}
                    </span>
                    {getImportanceBadge(t.importance)}
                  </div>

                  <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100 mb-1.5 group-hover:text-[#006D77] transition-colors">
                    {t.name}
                  </h3>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                    {t.sections.mainBody.text || t.body || t.subject}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{CATEGORIES.find((c) => c.id === t.category)?.label || t.category}</span>
                  </span>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[#006D77] dark:text-teal-400 font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>محدد</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
