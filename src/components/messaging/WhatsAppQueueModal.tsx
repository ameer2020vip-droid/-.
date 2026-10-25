import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  Phone,
  Edit3,
  RotateCcw,
} from 'lucide-react';
import {
  Student,
  StudentContact,
  MessageTemplate,
  SchoolMessageSettings,
  MessageChannel,
  QueueItem,
} from '../../types';
import { buildWhatsAppLink, buildMailtoLink, normalizeUaePhone } from '../../utils/phoneUtils';

export type { QueueItem };

interface WhatsAppQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queueItems: QueueItem[];
  template: MessageTemplate;
  settings: SchoolMessageSettings;
  channel: MessageChannel;
  onItemConfirmed: (index: number) => void;
  onItemSkipped: (index: number) => void;
  onItemOpened: (index: number) => void;
  onItemTextChange?: (index: number, newText: string) => void;
}

export const WhatsAppQueueModal: React.FC<WhatsAppQueueModalProps> = ({
  isOpen,
  onClose,
  queueItems,
  channel,
  onItemConfirmed,
  onItemSkipped,
  onItemOpened,
  onItemTextChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingCurrent, setIsEditingCurrent] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  if (!isOpen || queueItems.length === 0) return null;

  const safeIndex = Math.min(currentIndex, queueItems.length - 1);
  const currentItem = queueItems[safeIndex] || queueItems[0];
  const total = queueItems.length;
  const confirmedCount = queueItems.filter((i) => i.status === 'confirmed').length;
  const openedCount = queueItems.filter((i) => i.status === 'opened').length;
  const skippedCount = queueItems.filter((i) => i.status === 'skipped').length;
  const progressPercent = Math.round(((confirmedCount + skippedCount) / total) * 100);

  const normalizedPhone = normalizeUaePhone(
    currentItem.contact.phoneE164 || currentItem.contact.phone || currentItem.student.parentPhone
  );

  const handleOpenChannel = () => {
    setPhoneError(null);

    if (channel === 'whatsapp' || channel === 'both') {
      if (!normalizedPhone.isValid) {
        setPhoneError('رقم هاتف ولي الأمر غير صالح أو ناقص. يرجى التأكد من الرقم قبل فتح واتساب.');
        return;
      }
      onItemOpened(safeIndex);
      const url = buildWhatsAppLink(normalizedPhone.e164, currentItem.renderedText);
      window.open(url, '_blank');
    } else if (channel === 'email') {
      const email = currentItem.contact.email || currentItem.student.email;
      if (email) {
        onItemOpened(safeIndex);
        const mailto = buildMailtoLink(email, currentItem.renderedSubject, currentItem.renderedText);
        window.location.href = mailto;
      }
    }
  };

  const handleConfirmAndNext = () => {
    setPhoneError(null);
    onItemConfirmed(safeIndex);
    if (safeIndex < total - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handleSkipAndNext = () => {
    setPhoneError(null);
    onItemSkipped(safeIndex);
    if (safeIndex < total - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(currentItem.renderedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-white dark:bg-[#0C2340] rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-[#0C2340] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#006D77] text-[#D4AF37] flex items-center justify-center shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">
                طابور الإرسال الفردي لأولياء الأمور عبر {channel === 'whatsapp' ? 'واتساب (wa.me)' : 'البريد الرسمي'}
              </h3>
              <p className="text-xs text-teal-200">
                الطالب {safeIndex + 1} من أصل {total} • كل رسالة مستقلة ببيانات ومخالفة الطالب الخاصة به فقط
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Student Pills Strip */}
        <div className="px-5 pt-3 pb-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-emerald-700 dark:text-emerald-400">
                ✓ تم التأكيد: {confirmedCount}
              </span>
              <span className="text-blue-700 dark:text-blue-400">
                • فُتح واتساب: {openedCount}
              </span>
              <span className="text-amber-700 dark:text-amber-400">
                • تم التخطي: {skippedCount}
              </span>
            </div>
            <span className="font-black text-[#006D77] dark:text-teal-300 font-mono">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Horizontal Quick Switcher for Students in Queue */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {queueItems.map((item, idx) => {
              const isCurr = idx === safeIndex;
              return (
                <button
                  key={`${item.student.id}-${idx}`}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setPhoneError(null);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCurr
                      ? 'bg-[#006D77] text-white border-[#006D77] shadow-2xs'
                      : item.status === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : item.status === 'opened'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : item.status === 'skipped'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{idx + 1}. {item.student.fullName.split(' ').slice(0, 2).join(' ')}</span>
                  {item.status === 'confirmed' && <Check className="w-3 h-3 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Warnings for Missing Fields or Unapproved Action or Invalid Phone */}
          {(phoneError ||
            !normalizedPhone.isValid ||
            currentItem.hasUnapprovedAction ||
            (currentItem.missingFields && currentItem.missingFields.length > 0)) && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-black text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تنبيه تدقيق البيانات قبل الإرسال لهذا الطالب:</span>
              </div>
              {phoneError && <p className="text-rose-700 font-bold">• {phoneError}</p>}
              {!normalizedPhone.isValid && (
                <p className="text-rose-700 font-bold">
                  • رقم هاتف ولي الأمر غير صالح أو غير مسجل في ملف الطالب ({currentItem.contact.phone || 'فارغ'}).
                </p>
              )}
              {currentItem.hasUnapprovedAction && (
                <p>
                  • المخالفة المرتبطة بهذا الطالب ما زالت في حالة «مسودة» ولم يُعتمد إجراؤها النهائي بعد. يرجى مراجعة النص قبل الإرسال.
                </p>
              )}
              {currentItem.missingFields && currentItem.missingFields.length > 0 && (
                <p>
                  • حقول ناقصة لهذا الطالب: <strong>{currentItem.missingFields.join(' ، ')}</strong>.
                </p>
              )}
            </div>
          )}

          {/* Current Student & Contact Info Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0C2340] text-[#D4AF37] font-black text-sm flex items-center justify-center shrink-0">
                {currentItem.student.fullName.charAt(0)}
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                  <span>{currentItem.student.fullName}</span>
                  <span className="text-xs font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#006D77] dark:text-teal-300">
                    #{currentItem.student.studentNumber}
                  </span>
                  {currentItem.isCustomEdited && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                      نص مخصص لهذا الطالب
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span>الصف {currentItem.student.grade} ({currentItem.student.track || 'عام'}) - شعبة {currentItem.student.section}</span>
                  <span>•</span>
                  <span>ولي الأمر: <strong className="text-slate-700 dark:text-slate-200">{currentItem.contact.name}</strong></span>
                </div>
                {currentItem.violationDescription && (
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-1 font-bold">
                    المخالفة المرتبطة: {currentItem.violationDescription} ({currentItem.incidentDate})
                  </div>
                )}
              </div>
            </div>

            <div className="text-right sm:text-left font-mono text-xs shrink-0">
              <div className="text-[#006D77] dark:text-teal-400 font-bold flex items-center gap-1.5 sm:justify-end" dir="ltr">
                <Phone className="w-3.5 h-3.5" />
                <span>{normalizedPhone.e164 || currentItem.contact.phone || 'بدون رقم'}</span>
              </div>
              <div className="text-[11px] mt-1">
                {currentItem.status === 'confirmed' ? (
                  <span className="text-emerald-600 font-bold">✓ تم الإرسال والتوثيق بملف الطالب</span>
                ) : currentItem.status === 'opened' ? (
                  <span className="text-blue-600 font-bold">تم فتح واتساب — بانتظار التأكيد</span>
                ) : currentItem.status === 'skipped' ? (
                  <span className="text-amber-600 font-bold">تم التخطي</span>
                ) : (
                  <span className="text-slate-400">في انتظار الإرسال</span>
                )}
              </div>
            </div>
          </div>

          {/* Editable / Preview Message Box for this specific student */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-black text-slate-800 dark:text-slate-100">
                الرسالة النهائية الخاصة بالطالب ({currentItem.student.fullName}):
              </label>

              <div className="flex items-center gap-2">
                {onItemTextChange && (
                  <button
                    type="button"
                    onClick={() => setIsEditingCurrent(!isEditingCurrent)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      isEditingCurrent
                        ? 'bg-[#006D77] text-white border-[#006D77]'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-teal-50'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingCurrent ? 'إغلاق التعديل الفردي' : 'تعديل رسالة هذا الطالب فقط'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-[#006D77] dark:text-teal-300 font-bold cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>

            {isEditingCurrent && onItemTextChange ? (
              <textarea
                rows={7}
                value={currentItem.renderedText}
                onChange={(e) => onItemTextChange(safeIndex, e.target.value)}
                className="w-full p-3.5 bg-white dark:bg-slate-900 border-2 border-[#006D77] rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white leading-relaxed focus:outline-hidden"
              />
            ) : (
              <div className="p-4 bg-[#0B141A] text-white border border-slate-800 rounded-2xl text-xs whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto font-sans">
                {currentItem.renderedText}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          {/* Previous / Next Pager */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => {
                setCurrentIndex(safeIndex - 1);
                setPhoneError(null);
              }}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-colors cursor-pointer"
              title="الطالب السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
              {safeIndex + 1} / {total}
            </span>
            <button
              type="button"
              disabled={safeIndex === total - 1}
              onClick={() => {
                setCurrentIndex(safeIndex + 1);
                setPhoneError(null);
              }}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-100 transition-colors cursor-pointer"
              title="الطالب التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Core Action Flow */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSkipAndNext}
              className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              تخطي الطالب
            </button>

            <button
              type="button"
              onClick={handleOpenChannel}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح واتساب (wa.me)</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmAndNext}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#006D77] hover:bg-[#00555d] text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>تأكيد الإرسال والتوثيق بملف الطالب</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
