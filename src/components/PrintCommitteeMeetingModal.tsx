import React from 'react';
import { PrintPreviewModalWrapper } from './PrintPreviewModalWrapper';
import { BehaviorCommitteeMeeting, Student } from '../types';
import { Users, FileText, CheckCircle2, Shield } from 'lucide-react';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface PrintCommitteeMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: BehaviorCommitteeMeeting | null;
  student?: Student | null;
}

export const PrintCommitteeMeetingModal: React.FC<PrintCommitteeMeetingModalProps> = ({
  isOpen,
  onClose,
  meeting,
  student,
}) => {
  const { schoolSettings } = useSchoolSettings();
  if (!meeting) return null;

  const meetingTypeArabic = meeting.type === 'urgent' ? 'اجتماع طارئ' : 'اجتماع دوري';

  return (
    <PrintPreviewModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={`معاينة الطباعة – محضر اجتماع لجنة إدارة السلوك (${meeting.meetingNumber})`}
      subtitle={`التاريخ: ${meeting.meetingDate} • النوع: ${meetingTypeArabic}`}
      printButtonId="btn-print-committee-meeting"
      printButtonText="طباعة المحضر (A4) / حفظ PDF"
      defaultZoom={80}
    >
      {/* Official UAE Ministry Behavior Committee Meeting Minutes Form */}
      <div
        id="printable-committee-meeting-minutes"
        className="p-8 sm:p-14 text-black bg-white text-right space-y-6 print:p-0 print:space-y-4"
        style={{
          fontFamily: "'Tajawal', 'Cairo', 'Traditional Arabic', 'Arial', sans-serif",
          lineHeight: 1.75,
          fontSize: '14px',
        }}
        dir="rtl"
      >
        {/* Top Institutional Annex Header */}
        <div className="text-center pt-2">
          <p className="font-bold text-sm sm:text-base border-b-2 border-black pb-1 inline-block">
            دولة الإمارات العربية المتحدة • مؤسسة الإمارات للتعليم المدرسي • القرار الوزاري (851) لسنة 2018
          </p>
        </div>

        {/* Header Block: Administrative Hierarchy and Form Title */}
        <div className="flex justify-between items-start pt-2 border-b border-black pb-4">
          <div className="space-y-1 text-xs sm:text-sm font-semibold text-black leading-relaxed">
            <p>إدارة العمليات المدرسية – النطاق المدرسي</p>
            <p className="font-bold text-sm">{schoolSettings.schoolName}</p>
            <p className="text-slate-700">لجنة إدارة السلوك والتربية الأخلاقية</p>
          </div>

          <div className="text-left space-y-1 font-mono text-xs text-black">
            <div className="inline-block px-3 py-1 bg-slate-100 print:bg-white border border-black rounded font-bold text-sm">
              محضر رسمي رقم: {meeting.meetingNumber}
            </div>
            <p className="font-sans">نوع الاجتماع: <span className="font-bold">{meetingTypeArabic}</span></p>
            <p>تاريخ الانعقاد: <span className="font-bold">{meeting.meetingDate}</span></p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center py-2">
          <h2 className="text-xl sm:text-2xl font-black text-black inline-block border-b border-black pb-1">
            محضر اجتماع لجنة إدارة السلوك الطلابي
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            بشأن دراسة الحالات السلوكية واتخاذ الإجراءات والقرارات التربوية وفق اللائحة الوزارية المعتمدة
          </p>
        </div>

        {/* Meeting Information Details Table */}
        <div className="border border-black rounded-lg overflow-hidden text-xs">
          <div className="bg-slate-100 print:bg-slate-200 font-bold px-3 py-1.5 border-b border-black flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            <span>1. بيانات وظروف انعقاد الاجتماع</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-black/70 rtl:divide-x-reverse p-0">
            <div className="p-2.5">
              <span className="font-bold block text-slate-700">رقم الاجتماع:</span>
              <span className="font-bold text-black">{meeting.meetingNumber}</span>
            </div>
            <div className="p-2.5">
              <span className="font-bold block text-slate-700">تاريخ الاجتماع:</span>
              <span className="font-mono text-black">{meeting.meetingDate}</span>
            </div>
            <div className="p-2.5">
              <span className="font-bold block text-slate-700">توقيت الانعقاد:</span>
              <span className="font-black text-black">{meeting.meetingTime || 'صباحاً'}</span>
            </div>
            <div className="p-2.5">
              <span className="font-bold block text-slate-700">مقر الاجتماع:</span>
              <span className="text-black">{meeting.location || 'قاعة الاجتماعات الرئيسية'}</span>
            </div>
          </div>
        </div>

        {/* Attendees List */}
        <div className="border border-black rounded-lg overflow-hidden text-xs print-break-inside-avoid">
          <div className="bg-slate-100 print:bg-slate-200 font-bold px-3 py-1.5 border-b border-black flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>2. أعضاء اللجنة الحاضرون وتوقيعاتهم</span>
          </div>
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 print:bg-white border-b border-black text-slate-900">
                <th className="p-2 border-l border-black w-10 text-center font-bold">م</th>
                <th className="p-2 border-l border-black font-bold">الاسم الكامل</th>
                <th className="p-2 border-l border-black font-bold">الصفة في اللجنة</th>
                <th className="p-2 border-l border-black w-24 text-center font-bold">حالة الحضور</th>
                <th className="p-2 w-36 text-center font-bold">التوقيع / الاعتماد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/60">
              {meeting.attendees && meeting.attendees.length > 0 ? (
                meeting.attendees.map((att, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border-l border-black text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border-l border-black font-semibold text-black">{att.name}</td>
                    <td className="p-2 border-l border-black text-slate-800">{att.role}</td>
                    <td className="p-2 border-l border-black text-center">
                      <span className="font-bold text-emerald-800">حاضر</span>
                    </td>
                    <td className="p-2 text-center font-serif text-[11px] text-slate-600">
                      {att.signatureUrl ? (
                        <img src={att.signatureUrl} alt="توقيع" className="h-6 mx-auto object-contain" />
                      ) : (
                        <span className="underline decoration-dotted underline-offset-4">معتمد وموقع</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-slate-500">
                    تم حضور كامل النصاب القانوني لأعضاء اللجنة المعتمدة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Agenda & Decisions Table */}
        <div className="border border-black rounded-lg overflow-hidden text-xs print-break-inside-avoid">
          <div className="bg-slate-100 print:bg-slate-200 font-bold px-3 py-1.5 border-b border-black">
            <span>3. الحالات المعروضة وبنود جدول الأعمال</span>
          </div>
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 print:bg-white border-b border-black text-slate-900">
                <th className="p-2 border-l border-black w-10 text-center font-bold">م</th>
                <th className="p-2 border-l border-black font-bold">الموضوع / القضية السلوكية</th>
                <th className="p-2 border-l border-black font-bold">الطالب المعني</th>
                <th className="p-2 font-bold">قرار اللجنة والإجراء المعتمد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/60">
              {meeting.agenda && meeting.agenda.length > 0 ? (
                meeting.agenda.map((ag: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2.5 border-l border-black text-center font-mono">{idx + 1}</td>
                    <td className="p-2.5 border-l border-black font-bold text-black">{ag.topic || 'دراسة وضع سلوكي'}</td>
                    <td className="p-2.5 border-l border-black">
                      {ag.studentName ? (
                        <div>
                          <span className="font-bold text-black">{ag.studentName}</span>
                          {ag.grade && <span className="text-slate-600 block text-[11px]">({ag.grade}/{ag.section || ''})</span>}
                        </div>
                      ) : student ? (
                        <div>
                          <span className="font-bold text-black">{student.fullName}</span>
                          <span className="text-slate-600 block text-[11px]">({student.grade}/{student.section})</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">حالة عامة</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-900">
                      {ag.decision || ag.notes || 'تطبيق الإجراءات التربوية المعتمدة وفق درجة المخالفة باللائحة الوزارية'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-2.5 border-l border-black text-center font-mono">1</td>
                  <td className="p-2.5 border-l border-black font-bold">دراسة ومتابعة السلوك الطلابي</td>
                  <td className="p-2.5 border-l border-black">{student?.fullName || 'طلبة المدرسة المشمولين بالمتابعة'}</td>
                  <td className="p-2.5">اتخاذ التدابير التربوية والإرشادية المناسبة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Official Minutes Body */}
        {meeting.officialMinutes && (
          <div className="border border-black rounded-lg p-3.5 bg-slate-50/40 print:bg-white space-y-2 text-xs print-break-inside-avoid">
            <span className="font-bold text-slate-900 block border-b border-black/30 pb-1">
              4. نص وقائع الاجتماع وتوصيات اللجنة المعتمدة:
            </span>
            <p className="text-slate-900 leading-relaxed font-serif whitespace-pre-wrap">
              {meeting.officialMinutes}
            </p>
          </div>
        )}

        {/* General Notes if present */}
        {meeting.generalNotes && (
          <div className="border border-black rounded-lg p-3 bg-slate-50/40 print:bg-white text-xs print-break-inside-avoid">
            <span className="font-bold text-slate-900 block mb-1">ملاحظات إضافية وتوجيهات المتابعة:</span>
            <p className="text-slate-800 leading-relaxed">{meeting.generalNotes}</p>
          </div>
        )}

        {/* Signatures & Approvals Section */}
        <div className="pt-4 border-t border-black space-y-3 print-break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-3 p-3 border border-black/40 rounded-lg">
              <span className="font-bold block text-slate-900">مقرر اللجنة / المرشد الأكاديمي والمهني</span>
              <p className="font-semibold text-black">{meeting.recordedBy || 'المرشد الطلابي'}</p>
              <div className="h-10 flex items-center justify-center">
                <span className="text-slate-400 font-serif italic text-xs underline decoration-dotted">توقيع المقرر معتمد</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">التاريخ: {meeting.meetingDate}</p>
            </div>

            <div className="space-y-3 p-3 border border-black/40 rounded-lg">
              <span className="font-bold block text-slate-900">رئيس لجنة إدارة السلوك / مدير المدرسة</span>
              <p className="font-semibold text-black">{meeting.chairpersonName || 'مدير المدرسة'}</p>
              <div className="h-10 flex items-center justify-center">
                <div className="border-2 border-black/60 rounded-full px-4 py-1 text-[11px] font-bold text-black inline-block">
                  الختم الرسمي للمدرسة
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">التاريخ: {meeting.meetingDate}</p>
            </div>
          </div>
        </div>

        {/* Ministry Footer */}
        <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-300 print:text-black/70 print:block">
          <span>
            نظام المرشد المدرسي الذكي • {schoolSettings.schoolName} • محضر معتمد ومحفوظ في السجلات الرسمية للجنة السلوك
          </span>
          <div className="text-[10px] font-mono mt-0.5">
            تاريخ الطباعة: {new Date().toLocaleDateString('ar-AE')}
          </div>
        </div>
      </div>
    </PrintPreviewModalWrapper>
  );
};
