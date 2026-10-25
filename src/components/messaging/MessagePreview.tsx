import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Printer,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  School as SchoolIcon,
  Phone,
  Mail,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { MessageTemplate, Student, SchoolMessageSettings } from '../../types';
import { renderMessageVariables, generatePlainTextVersion } from '../../firebase/messageService';

interface MessagePreviewProps {
  template: MessageTemplate;
  student?: Student | null;
  studentsList?: Student[];
  currentStudentIndex?: number;
  onStudentIndexChange?: (index: number) => void;
  settings: SchoolMessageSettings;
  senderName?: string;
  senderRole?: string;
}

export const MessagePreview: React.FC<MessagePreviewProps> = ({
  template,
  student,
  studentsList = [],
  currentStudentIndex = 0,
  onStudentIndexChange,
  settings,
  senderName = 'المرشد الأكاديمي والمهني',
  senderRole = 'مكتب الإرشاد الطلابي',
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);

  const activeStudent = student || (studentsList.length > 0 ? studentsList[currentStudentIndex] : null);

  const variables: Record<string, string | number | undefined> = {
    student: activeStudent?.fullName || 'اسم الطالب',
    studentNameAr: activeStudent?.fullName || 'اسم الطالب',
    studentId: activeStudent?.studentNumber || '123456',
    grade: activeStudent?.grade || '10',
    section: activeStudent?.section || '1',
    track: activeStudent?.track || 'عام',
    guardian: activeStudent?.parentName || 'ولي الأمر',
    guardianName: activeStudent?.parentName || 'ولي الأمر',
    relation: activeStudent?.parentRelation || 'ولي الأمر الأساسي',
    school: settings.schoolNameAr || 'إدارة المدرسة',
    schoolNameAr: settings.schoolNameAr || 'إدارة المدرسة',
    schoolNameEn: settings.schoolNameEn || 'School Administration',
    schoolId: settings.schoolId || 'school-main',
    phone: settings.phone || '04-0000000',
    email: settings.email || 'info@school.moe.ae',
    date: new Date().toLocaleDateString('ar-AE', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: new Date().toLocaleTimeString('ar-AE', { hour: '2-digit', minute: '2-digit' }),
    academicYear: settings.academicYear || '2026–2027',
    semester: settings.semester || 'الفصل الدراسي الأول',
    senderName: senderName || settings.defaultSenderName,
    senderRole: senderRole || settings.defaultSenderRole,
    absenceCount: 3,
    latenessCount: activeStudent?.totalTardiness || 2,
    violationType: 'مخالفة لائحة السلوك الطلابي',
    violationDate: new Date().toLocaleDateString('ar-AE'),
    requiredAction: 'مراجعة إدارة المدرسة وقسم شؤون الطلبة',
    meetingDate: 'يوم الخميس القادم',
    meetingTime: '10:00 صباحاً',
    customText: 'التفاصيل والملاحظات الإضافية المحددة في الإشعار',
  };

  const handleCopyText = async () => {
    const plain = generatePlainTextVersion(template, variables);
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const sections = template.sections;
  const colors = template.colors;

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Top Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        {/* Pager if multiple students */}
        {studentsList.length > 1 && onStudentIndexChange && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-medium">
            <button
              onClick={() => onStudentIndexChange(Math.max(0, currentStudentIndex - 1))}
              disabled={currentStudentIndex === 0}
              className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded disabled:opacity-30 transition-colors"
              title="الطالب السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span>
              طالب {currentStudentIndex + 1} من {studentsList.length} ({activeStudent?.fullName.split(' ')[0]})
            </span>
            <button
              onClick={() => onStudentIndexChange(Math.min(studentsList.length - 1, currentStudentIndex + 1))}
              disabled={currentStudentIndex === studentsList.length - 1}
              className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded disabled:opacity-30 transition-colors"
              title="الطالب التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              deviceMode === 'desktop'
                ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>كمبيوتر / A4</span>
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              deviceMode === 'mobile'
                ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>هاتف ذكي</span>
          </button>
        </div>

        {/* Zoom & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 px-2 py-1 rounded-xl text-xs text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(75, z - 10))}
              className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-9 text-center font-mono font-medium">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 100 && (
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1 hover:bg-white dark:hover:bg-slate-600 rounded text-slate-400"
                title="إعادة التعيين"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors"
            title="نسخ نص الرسالة بالكامل للواتساب"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ!' : 'نسخ النص'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0C2340] hover:bg-[#08182B] text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            title="طباعة الإشعار الرسمي أو الحفظ كـ PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>طباعة / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Preview Canvas Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className={`print-unscaled-container print:transform-none print:m-0 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white ${
            deviceMode === 'mobile'
              ? 'w-[380px] max-w-full rounded-[38px] border-[10px] border-slate-800 shadow-2xl p-2 bg-slate-900 ring-1 ring-slate-700/50'
              : 'w-full max-w-[760px] shadow-lg rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800'
          }`}
        >
          {/* Mobile Speaker Notch */}
          {deviceMode === 'mobile' && (
            <div className="no-print w-full flex justify-center pb-2 pt-1">
              <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                <div className="w-3 h-1 bg-slate-700 rounded-full"></div>
              </div>
            </div>
          )}

          {/* Letterhead / Document Content */}
          <div
            id="printable-message-content"
            className={`print:border-none print:shadow-none print:p-0 print:m-0 print:w-full print:rounded-none ${
              deviceMode === 'mobile'
                ? 'rounded-[28px] overflow-hidden bg-white text-slate-900 p-4 text-[13px] leading-relaxed max-h-[640px] overflow-y-auto'
                : 'p-6 sm:p-8 text-slate-800 dark:text-slate-100 text-sm leading-relaxed'
            }`}
            style={{ backgroundColor: colors.background || '#FFFFFF' }}
          >
            {/* 1. School Header & Identity */}
            {sections.schoolIdentity.enabled && (
              <div className="border-b-2 pb-4 mb-4" style={{ borderColor: colors.primary || '#0C2340' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {settings.logoUrl ? (
                      <img
                        src={settings.logoUrl}
                        alt="شعار المدرسة"
                        className="w-12 h-12 object-contain rounded-lg"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                        style={{ backgroundColor: colors.primary || '#0C2340' }}
                      >
                        <SchoolIcon className="w-6 h-6 text-[#D4AF37]" />
                      </div>
                    )}
                    <div>
                      <h2
                        className="font-extrabold text-base sm:text-lg leading-tight"
                        style={{ color: colors.primary || '#0C2340' }}
                      >
                        {settings.schoolNameAr}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {settings.schoolNameEn} | {settings.emirate}
                      </p>
                    </div>
                  </div>

                  <div className="text-left text-[11px] text-slate-500 space-y-0.5">
                    <div>{variables.academicYear}</div>
                    <div className="font-semibold text-slate-700">{variables.date}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Badge / Tag */}
            {sections.badge.enabled && (
              <div className="flex justify-between items-center mb-3">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-xs"
                  style={{
                    backgroundColor: colors.badgeBg || '#FEF3C7',
                    color: colors.badgeText || '#92400E',
                  }}
                >
                  {renderMessageVariables(sections.badge.text || template.badgeText, variables)}
                </span>

                <span className="text-[11px] text-slate-400 font-mono">
                  رقم الإشعار: #{activeStudent?.studentNumber || '101'}-
                  {new Date().toISOString().slice(2, 10).replace(/-/g, '')}
                </span>
              </div>
            )}

            {/* 3. Student Card */}
            {sections.studentCard.enabled && activeStudent && (
              <div
                className="rounded-xl p-3 sm:p-4 mb-4 border flex items-center justify-between gap-3"
                style={{
                  backgroundColor: '#F8FAFC',
                  borderColor: '#E2E8F0',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: colors.primary || '#0C2340' }}
                  >
                    {activeStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{activeStudent.fullName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>الرقم الطلابي: {activeStudent.studentNumber}</span>
                      <span>•</span>
                      <span>
                        الصف {activeStudent.grade} / شعبة {activeStudent.section}
                      </span>
                      <span>•</span>
                      <span>مسار {activeStudent.track}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg text-xs font-medium">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>طالب مسجل</span>
                </div>
              </div>
            )}

            {/* 4. Greeting */}
            {sections.greeting.enabled && (
              <div className="font-semibold text-slate-800 text-sm mb-3">
                {renderMessageVariables(sections.greeting.text, variables)}
              </div>
            )}

            {/* 5. Data Table */}
            {sections.dataTable.enabled && sections.dataTable.items.length > 0 && (
              <div className="mb-4 rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div
                  className="px-3 py-2 font-bold text-white text-xs flex items-center justify-between"
                  style={{ backgroundColor: colors.primary || '#0C2340' }}
                >
                  <span>بيانات الإشعار والتفاصيل</span>
                  <span className="text-[10px] text-amber-300">مستخرج رسمي</span>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {sections.dataTable.items.map((item) => (
                    <div key={item.id} className="flex justify-between px-3 py-2">
                      <span className="text-slate-500 font-medium">{item.label}:</span>
                      <span className="font-bold text-slate-800">
                        {renderMessageVariables(item.value, variables)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Main Body */}
            {sections.mainBody.enabled && sections.mainBody.text && (
              <div className="text-slate-700 text-sm leading-relaxed mb-4 text-justify whitespace-pre-line font-normal">
                {renderMessageVariables(sections.mainBody.text, variables)}
              </div>
            )}

            {/* 7. Key Points */}
            {sections.keyPoints.enabled && sections.keyPoints.points.length > 0 && (
              <div className="mb-4 bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-200">
                <div className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-1.5">
                  <span className="text-[#D4AF37]">✦</span>
                  <span>نقاط هامة يجب مراعاتها:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 list-inside">
                  {sections.keyPoints.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#006D77] font-bold mt-0.5">•</span>
                      <span>{renderMessageVariables(pt, variables)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 8. Required Action Callout */}
            {sections.requiredAction.enabled && sections.requiredAction.text && (
              <div className="mb-4 rounded-xl p-3 sm:p-4 border border-amber-300 bg-amber-50/80">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{sections.requiredAction.title || 'الإجراء المطلوب من ولي الأمر'}</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  {renderMessageVariables(sections.requiredAction.text, variables)}
                </p>
              </div>
            )}

            {/* 9. Action Button */}
            {sections.actionButton.enabled && sections.actionButton.url && (
              <div className="mb-4 flex justify-center">
                <a
                  href={sections.actionButton.url}
                  target={sections.actionButton.openInNewTab ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: sections.actionButton.color || '#006D77' }}
                >
                  <span>{sections.actionButton.text || 'انقر للمتابعة'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* 10. Closing and Signature */}
            {sections.closingAndSignature.enabled && (
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="text-xs text-slate-600 italic">
                  {renderMessageVariables(sections.closingAndSignature.closingText, variables)}
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {renderMessageVariables(
                      sections.closingAndSignature.signerName || variables.senderName?.toString() || '',
                      variables
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {renderMessageVariables(
                      sections.closingAndSignature.signerRole || variables.senderRole?.toString() || '',
                      variables
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 11. Contact Info Box */}
            {sections.contactBox.enabled && (
              <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  {(sections.contactBox.phone || settings.phone) && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#006D77]" />
                      <span>{sections.contactBox.phone || settings.phone}</span>
                    </span>
                  )}
                  {(sections.contactBox.email || settings.email) && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#006D77]" />
                      <span>{sections.contactBox.email || settings.email}</span>
                    </span>
                  )}
                </div>
                {sections.contactBox.notes && (
                  <span className="text-[10px] text-slate-400">{sections.contactBox.notes}</span>
                )}
              </div>
            )}

            {/* 12. Footer */}
            {sections.footer.enabled && sections.footer.text && (
              <div className="mt-4 pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
                {renderMessageVariables(sections.footer.text, variables)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
