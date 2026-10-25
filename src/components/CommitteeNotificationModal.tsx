import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Send,
  Mail,
  Phone,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  X,
  Plus,
  Shield,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Check,
  Search,
  Filter,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import {
  CommitteeMember,
  CommitteeNotificationLog,
  CommitteeNotificationType,
  BehaviorCommitteeMeeting,
  Student,
} from '../types';
import {
  getCommitteeMembers,
  saveCommitteeMembers,
  getCommitteeNotificationLogs,
  dispatchCommitteeNotification,
} from '../storage';
import { buildSmsLink, buildMailtoLink, normalizeUaePhone } from '../utils/phoneUtils';
import { getUaeTodayDateString } from '../utils/time';
import { useSchoolSettings } from '../context/SchoolSettingsContext';

interface CommitteeNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  mode?: 'center' | 'send_meeting' | 'send_urgent_case';
  initialMeeting?: BehaviorCommitteeMeeting | null;
  initialStudentCase?: {
    studentId?: string;
    studentName: string;
    grade?: string;
    section?: string;
    topic?: string;
    incidentDegree?: string;
    urgentReason?: string;
  } | null;
  meetings?: BehaviorCommitteeMeeting[];
  onNotificationSent?: (log: CommitteeNotificationLog) => void;
}

export const CommitteeNotificationModal: React.FC<CommitteeNotificationModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  mode = 'center',
  initialMeeting = null,
  initialStudentCase = null,
  meetings = [],
  onNotificationSent,
}) => {
  const { schoolSettings } = useSchoolSettings();
  // Tabs: 'send' | 'logs' | 'members'
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'members'>(
    mode === 'center' ? 'send' : 'send'
  );

  // Members state
  const [members, setMembers] = useState<CommitteeMember[]>(() => getCommitteeMembers());
  // Logs state
  const [logs, setLogs] = useState<CommitteeNotificationLog[]>(() => getCommitteeNotificationLogs());

  // Form states for sending notification
  const [notifType, setNotifType] = useState<CommitteeNotificationType>(() => {
    if (mode === 'send_meeting' || initialMeeting) return 'meeting_scheduled';
    if (mode === 'send_urgent_case' || initialStudentCase) return 'urgent_student_status';
    return 'meeting_scheduled';
  });

  const [channel, setChannel] = useState<'sms' | 'email' | 'both'>('both');
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent' | 'critical'>(() => {
    if (initialStudentCase) return 'urgent';
    if (initialMeeting?.type === 'urgent') return 'urgent';
    return 'normal';
  });

  // Selected meeting if meeting type
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(() => {
    return initialMeeting?.id || meetings[0]?.id || '';
  });

  // Student case fields if urgent student status
  const [studentName, setStudentName] = useState<string>(() => initialStudentCase?.studentName || '');
  const [studentGrade, setStudentGrade] = useState<string>(() => initialStudentCase?.grade || 'الصف العاشر');
  const [studentSection, setStudentSection] = useState<string>(() => initialStudentCase?.section || '1');
  const [caseTopic, setCaseTopic] = useState<string>(() => initialStudentCase?.topic || 'مخالفة جسيمة تستوجب التدخل');
  const [urgentReason, setUrgentReason] = useState<string>(
    () => initialStudentCase?.urgentReason || 'تكرار السلوك أو خطورة الواقعة وفق المادة التأديبية بلائحة 851'
  );

  // Custom text overrides (allow manual tweaks)
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customSms, setCustomSms] = useState<string>('');
  const [customEmailSubject, setCustomEmailSubject] = useState<string>('');
  const [customEmailBody, setCustomEmailBody] = useState<string>('');

  // Target member selection
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    return members.map((m) => m.id);
  });

  // Preview tab: 'sms' | 'email'
  const [previewTab, setPreviewTab] = useState<'sms' | 'email'>('sms');

  // Logs search and filter
  const [logSearch, setLogSearch] = useState<string>('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');

  // Editing members state
  const [editingMembers, setEditingMembers] = useState<CommitteeMember[]>(() => getCommitteeMembers());
  const [isAddingMember, setIsAddingMember] = useState<boolean>(false);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('عضو لجنة السلوك');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('+97150');
  const [newMemberEmail, setNewMemberEmail] = useState<string>('');

  // Synchronize when initial props change
  useEffect(() => {
    if (initialMeeting) {
      setNotifType('meeting_scheduled');
      setSelectedMeetingId(initialMeeting.id);
      setUrgencyLevel(initialMeeting.type === 'urgent' ? 'urgent' : 'normal');
    } else if (initialStudentCase) {
      setNotifType('urgent_student_status');
      setStudentName(initialStudentCase.studentName || '');
      setStudentGrade(initialStudentCase.grade || 'الصف العاشر');
      setStudentSection(initialStudentCase.section || '1');
      setCaseTopic(initialStudentCase.topic || 'مخالفة جسيمة');
      setUrgentReason(initialStudentCase.urgentReason || 'تكرار السلوك أو خطورة الواقعة وفق المادة التأديبية بلائحة 851');
      setUrgencyLevel('urgent');
    }
  }, [initialMeeting, initialStudentCase]);

  // Refresh members & logs
  const refreshData = () => {
    const freshMembers = getCommitteeMembers();
    setMembers(freshMembers);
    setEditingMembers(freshMembers);
    setLogs(getCommitteeNotificationLogs());
  };

  // Find currently targeted meeting
  const targetedMeeting = useMemo(() => {
    if (initialMeeting) return initialMeeting;
    return meetings.find((m) => m.id === selectedMeetingId) || meetings[0];
  }, [initialMeeting, meetings, selectedMeetingId]);

  // Compute standard auto-generated messages
  const generatedMessages = useMemo(() => {
    if (notifType === 'meeting_scheduled') {
      const isUrgent = urgencyLevel === 'urgent' || urgencyLevel === 'critical' || targetedMeeting?.type === 'urgent';
      const meetingNum = targetedMeeting?.meetingNumber || 'اجتماع لجنة السلوك';
      const date = targetedMeeting?.meetingDate || getUaeTodayDateString();
      const time = targetedMeeting?.meetingTime || '10:00 ص';
      const loc = targetedMeeting?.location || 'قاعة الاجتماعات الرئيسية';

      const title = isUrgent
        ? `🚨 إشعار عاجل: انعقاد ${meetingNum} (طارئ)`
        : `📅 إشعار: جدولة ${meetingNum}`;

      const sms = isUrgent
        ? `عاجل-${schoolSettings.schoolName}: تقرر عقد ${meetingNum} (طارئ) يوم ${date} الساعة ${time} بمقر: ${loc}. يرجى حضور أعضاء لجنة السلوك.`
        : `${schoolSettings.schoolName}: نود تذكيركم بانعقاد ${meetingNum} يوم ${date} الساعة ${time} في ${loc}. شاكرين حضوركم.`;

      const emailSubject = `${isUrgent ? '🚨 [عاجل] ' : ''}دعوة لحضور ${meetingNum} - لجنة إدارة السلوك المدرسي`;

      const emailBody = `السادة رئيس وأعضاء لجنة إدارة السلوك المدرسي بـ${schoolSettings.schoolName} المحترمين،\n\nالسلام عليكم ورحمة الله وبركاته،،\n\nنود إحاطتكم علماً بأنه تقرر انعقاد ${meetingNum} (${isUrgent ? 'جلسة طارئة' : 'جلسة دورية'}) وفق البيانات الآتية:\n\n• التاريخ: ${date}\n• الوقت: ${time}\n• المكان: ${loc}\n• مستوى الإلحاح: ${isUrgent ? 'طارئ وعاجل' : 'دوري نظامي'}\n\nأبرز بنود جدول الأعمال:\n1. استعراض تقارير الانضباط ومخالفات الدرجتين الثالثة والرابعة.\n2. النظر في الحالات المحالة للجنة وإقرار الجزاءات والخطط التربوية.\n\nيرجى التكرم بالحضور في الموعد والمكان المحددين.\n\nوتفضلوا بقبول فائق الاحترام والتقدير،،\nمقرر لجنة إدارة السلوك المدرسي`;

      return { title, sms, emailSubject, emailBody };
    } else if (notifType === 'urgent_student_status') {
      const name = studentName || 'طالب محال';
      const gr = `${studentGrade} / شعبة ${studentSection}`;
      const reason = urgentReason || 'سلوك يستوجب التدخل الفوري';

      const title = `🚨 تنبيه عاجل: تحديث حالة الطالب ${name} بلجنة السلوك`;

      const sms = `عاجل - لجنة السلوك: تحديث حالة الطالب ${name} (${gr}) - يتطلب إجراء فورياً للجنة بشأن: ${caseTopic.slice(0, 45)}.`;

      const emailSubject = `🚨 [تنبيه عاجل] حالة طالب تتطلب إجراء فورياً من لجنة السلوك - ${name}`;

      const emailBody = `السادة رئيس وأعضاء لجنة إدارة السلوك المدرسي المحترمين،\n\nالسلام عليكم ورحمة الله وبركاته،،\n\nنحيط سعادتكم علماً بوجود تحديث إجرائي طارئ يستدعي تدخلاً عاجلاً من أعضاء اللجنة:\n\n• اسم الطالب: ${name}\n• الصف والشعبة: ${gr}\n• موضوع الإحالة: ${caseTopic}\n• مبرر الإجراء العاجل: ${reason}\n\nبناءً على القرار الوزاري رقم (851) لسنة 2018، يرجى الاطلاع على ملف الحالة واتخاذ الإجراء اللازم وتحديد موعد الجلسة الاستثنائية.\n\nشاكرين تعاونكم الدائم،،\nمكتب الإرشاد الطلابي - مقرر اللجنة`;

      return { title, sms, emailSubject, emailBody };
    } else {
      const title = customTitle || '📢 إشعار عام لأعضاء لجنة إدارة السلوك';
      const sms = customSms || `${schoolSettings.schoolName}: إشعار هام من مقرر لجنة إدارة السلوك، يرجى مراجعة البريد الإلكتروني للمستجدات.`;
      const emailSubject = customEmailSubject || 'إشعار من لجنة إدارة السلوك المدرسي';
      const emailBody = customEmailBody || 'السادة أعضاء لجنة السلوك المحترمين، نرجو التكرم بالاطلاع على التوجيهات المرفقة.';
      return { title, sms, emailSubject, emailBody };
    }
  }, [
    notifType,
    urgencyLevel,
    targetedMeeting,
    studentName,
    studentGrade,
    studentSection,
    caseTopic,
    urgentReason,
    customTitle,
    customSms,
    customEmailSubject,
    customEmailBody,
  ]);

  // Final strings being sent
  const finalTitle = customTitle.trim() || generatedMessages.title;
  const finalSms = customSms.trim() || generatedMessages.sms;
  const finalEmailSubject = customEmailSubject.trim() || generatedMessages.emailSubject;
  const finalEmailBody = customEmailBody.trim() || generatedMessages.emailBody;

  // Toggle selection of member
  const handleToggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAllMembers = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map((m) => m.id));
    }
  };

  // Dispatch notification action
  const handleSendNotification = () => {
    if (selectedMemberIds.length === 0) {
      onShowToast('يرجى تحديد عضو واحد على الأقل من أعضاء اللجنة لاستلام التنبيه', 'warning');
      return;
    }

    const log = dispatchCommitteeNotification({
      type: notifType,
      title: finalTitle,
      content: finalSms,
      smsContent: finalSms,
      emailSubject: finalEmailSubject,
      emailBody: finalEmailBody,
      channel,
      urgencyLevel,
      meetingId: targetedMeeting?.id,
      meetingNumber: targetedMeeting?.meetingNumber,
      meetingDate: targetedMeeting?.meetingDate,
      meetingTime: targetedMeeting?.meetingTime,
      studentId: initialStudentCase?.studentId,
      studentName: notifType === 'urgent_student_status' ? studentName : undefined,
      grade: notifType === 'urgent_student_status' ? studentGrade : undefined,
      section: notifType === 'urgent_student_status' ? studentSection : undefined,
      targetMemberIds: selectedMemberIds,
      sentBy: 'المرشد الأكاديمي والمهني (مقرر اللجنة)',
    });

    onShowToast(
      `تم إرسال التنبيه بنجاح إلى (${log.recipients.length}) من أعضاء اللجنة عبر ${
        channel === 'sms' ? 'الرسائل القصيرة SMS' : channel === 'email' ? 'البريد الإلكتروني' : 'SMS والبريد الإلكتروني'
      }`,
      'success'
    );

    refreshData();
    if (onNotificationSent) {
      onNotificationSent(log);
    }

    // Switch to history tab to see dispatched log
    setActiveTab('logs');
  };

  // Save changes to committee members
  const handleSaveMembers = () => {
    saveCommitteeMembers(editingMembers);
    setMembers(editingMembers);
    onShowToast('تم تحديث بيانات أعضاء اللجنة وقنوات الاتصال بنجاح', 'success');
  };

  // Add new member to committee
  const handleAddNewMember = () => {
    if (!newMemberName.trim()) {
      onShowToast('يرجى إدخال اسم العضو', 'warning');
      return;
    }
    const newMember: CommitteeMember = {
      id: `cm-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'عضو لجنة السلوك',
      phone: newMemberPhone.trim() || '+971500000000',
      email: newMemberEmail.trim() || `${newMemberName.split(' ')[0]}@moe.gov.ae`,
      receiveSms: true,
      receiveEmail: true,
      active: true,
    };
    const updated = [...editingMembers, newMember];
    setEditingMembers(updated);
    saveCommitteeMembers(updated);
    setMembers(updated);
    setSelectedMemberIds((prev) => [...prev, newMember.id]);
    setIsAddingMember(false);
    setNewMemberName('');
    onShowToast('تمت إضافة عضو جديد للجنة السلوك', 'success');
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (logTypeFilter !== 'all' && l.type !== logTypeFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const titleMatch = l.title.toLowerCase().includes(q);
        const contentMatch = l.content.toLowerCase().includes(q);
        const studentMatch = l.studentName?.toLowerCase().includes(q);
        const recipientMatch = l.recipients.some((r) => r.name.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !studentMatch && !recipientMatch) return false;
      }
      return true;
    });
  }, [logs, logTypeFilter, logSearch]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#121e31] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/25 dark:text-teal-300">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  نظام إشعارات وتنبيهات لجنة إدارة السلوك
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/25 dark:text-teal-300">
                  SMS & Email Gateway
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إرسال تنبيهات رسمية فورية لأعضاء اللجنة عند جدولة الاجتماعات أو عند تحديث حالات الطلاب العاجلة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === 'send'
                ? 'border-[#006D77] text-[#006D77] dark:text-teal-300 bg-white dark:bg-[#121e31]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4 text-[#D4AF37]" />
            <span>إرسال تنبيه جديد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === 'logs'
                ? 'border-[#006D77] text-[#006D77] dark:text-teal-300 bg-white dark:bg-[#121e31]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل الإشعارات المرسلة</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {logs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[1px] ${
              activeTab === 'members'
                ? 'border-[#006D77] text-[#006D77] dark:text-teal-300 bg-white dark:bg-[#121e31]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>أعضاء اللجنة وقنوات الاتصال ({members.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: SEND NOTIFICATION */}
          {activeTab === 'send' && (
            <div className="space-y-6">
              {/* Type & Urgency Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Notification Event Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                    نوع التنبيه والإشعار:
                  </label>
                  <select
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as CommitteeNotificationType)}
                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="meeting_scheduled">📅 جدولة اجتماع للجنة (دوري / طارئ)</option>
                    <option value="urgent_student_status">🚨 تحديث حالة طالب يتطلب إجراءً عاجلاً</option>
                    <option value="custom_alert">📢 إشعار عام ومخصص للجنة</option>
                  </select>
                </div>

                {/* 2. Channel Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                    قناة الإرسال:
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setChannel('both')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        channel === 'both'
                          ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      كلاهما
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('sms')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        channel === 'sms'
                          ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('email')}
                      className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                        channel === 'email'
                          ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      بريد إلكتروني
                    </button>
                  </div>
                </div>

                {/* 3. Urgency Level */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                    درجة الإلحاح:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setUrgencyLevel('normal')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        urgencyLevel === 'normal'
                          ? 'bg-teal-50 border-teal-400 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      عادي
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgencyLevel('urgent')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        urgencyLevel === 'urgent'
                          ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      عاجل
                    </button>
                    <button
                      type="button"
                      onClick={() => setUrgencyLevel('critical')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        urgencyLevel === 'critical'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      🚨 طارئ جداً
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Context Form based on Notification Type */}
              {notifType === 'meeting_scheduled' && (
                <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
                      <span>تحديد الاجتماع المراد إشعار الأعضاء به:</span>
                    </span>
                    {targetedMeeting && (
                      <span className="text-[11px] font-mono font-bold text-[#006D77] dark:text-teal-300">
                        {targetedMeeting.meetingDate} • {targetedMeeting.meetingTime}
                      </span>
                    )}
                  </div>

                  <select
                    value={selectedMeetingId}
                    onChange={(e) => setSelectedMeetingId(e.target.value)}
                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {meetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.meetingNumber} - {m.type === 'urgent' ? '🚨 اجتماع طارئ' : '📋 دوري'} ({m.meetingDate} - {m.meetingTime})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {notifType === 'urgent_student_status' && (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-3">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>بيانات الطالب والحالة العاجلة المراد إشعار اللجنة بها:</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        اسم الطالب:
                      </label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        placeholder="مثال: سلطان أحمد الشامسي"
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        الصف والشعبة:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={studentGrade}
                          onChange={(e) => setStudentGrade(e.target.value)}
                          placeholder="الصف العاشر"
                          className="w-2/3 p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <input
                          type="text"
                          value={studentSection}
                          onChange={(e) => setStudentSection(e.target.value)}
                          placeholder="1"
                          className="w-1/3 p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        موضوع المخالفة / الإحالة:
                      </label>
                      <input
                        type="text"
                        value={caseTopic}
                        onChange={(e) => setCaseTopic(e.target.value)}
                        placeholder="مشاجرة جماعية / حيازة ممنوعات"
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      مبرر الإجراء العاجل والتدخل الفوري المطلوب:
                    </label>
                    <input
                      type="text"
                      value={urgentReason}
                      onChange={(e) => setUrgentReason(e.target.value)}
                      placeholder="تكرار المخالفة أو خطورة الدرجة الثالثة/الرابعة وتجاوز الإجراء الإداري المباشر"
                      className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Committee Members Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#006D77] dark:text-teal-400" />
                    <span>المستلمون من أعضاء اللجنة ({selectedMemberIds.length} من {members.length}):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllMembers}
                    className="text-xs font-bold text-[#006D77] dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    {selectedMemberIds.length === members.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الأعضاء'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMember(m.id)}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50/60 dark:bg-teal-950/30 border-[#006D77] ring-1 ring-[#006D77]/30'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {m.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {m.role}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <span>{m.phone}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-full bg-[#006D77] text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message Live Previews */}
              <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>المعاينة الحية لنص التنبيه قبل الإرسال:</span>
                  </span>

                  <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('sms')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        previewTab === 'sms'
                          ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>رسالة قصيرة SMS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('email')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        previewTab === 'email'
                          ? 'bg-white dark:bg-slate-800 text-[#006D77] dark:text-teal-300 shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>بريد إلكتروني Email</span>
                    </button>
                  </div>
                </div>

                {previewTab === 'sms' ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">معاينة الرسالة النصية القصيرة:</span>
                      <span className="font-mono font-bold text-[#006D77]">
                        {finalSms.length} حرف
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono">
                      {finalSms}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block">عنوان الرسالة (Subject):</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        {finalEmailSubject}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 block">محتوى البريد الإلكتروني:</span>
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-line leading-relaxed font-sans">
                        {finalEmailBody}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>
                    سيتم الإرسال لـ <strong>{selectedMemberIds.length}</strong> عضو عبر{' '}
                    <strong>
                      {channel === 'sms' ? 'SMS' : channel === 'email' ? 'البريد الإلكتروني' : 'SMS والبريد'}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>

                  <button
                    type="button"
                    onClick={handleSendNotification}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#006D77]/25 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-[#D4AF37]" />
                    <span>إرسال وتعميم التنبيه فورياً</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGS HISTORY */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="بحث في سجل الإشعارات..."
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                  <span className="text-slate-500 font-bold">تصفية:</span>
                  <select
                    value={logTypeFilter}
                    onChange={(e) => setLogTypeFilter(e.target.value)}
                    className="p-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                  >
                    <option value="all">جميع الإشعارات ({logs.length})</option>
                    <option value="meeting_scheduled">اجتماعات اللجنة</option>
                    <option value="urgent_student_status">حالات الطلاب العاجلة</option>
                    <option value="custom_alert">تنبيهات عامة</option>
                  </select>
                </div>
              </div>

              {/* Logs List */}
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="text-xs">لا توجد إشعارات تطابق معايير البحث الحالية</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => {
                    const isUrgent = log.urgencyLevel === 'urgent' || log.urgencyLevel === 'critical';
                    return (
                      <div
                        key={log.id}
                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2.5 hover:border-[#006D77]/40 transition-all card-elevated"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center ${
                                isUrgent
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                              }`}
                            >
                              {isUrgent ? '🚨 عاجل' : '📅 اجتماع'}
                            </span>
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                              {log.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <span>{log.sentAt}</span>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/25 dark:text-teal-300">
                              {log.channel === 'sms' ? 'SMS' : log.channel === 'email' ? 'Email' : 'SMS + Email'}
                            </span>
                          </div>
                        </div>

                        {/* Content Preview */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 leading-relaxed font-sans">
                          {log.content}
                        </p>

                        {/* Recipients Tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-500">تم التسليم إلى:</span>
                          {log.recipients.map((rec, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>{rec.name}</span>
                              <span className="text-[9px] text-slate-400">({rec.role.split(' ')[0]})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MEMBERS DIRECTORY & CHANNELS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    قائمة أعضاء لجنة إدارة السلوك وقنوات استلام التنبيهات
                  </h4>
                  <p className="text-xs text-slate-500">
                    تخصيص أرقام الهواتف والبريد الإلكتروني وتفعيل أو إيقاف استقبال رسائل SMS والبريد لكل عضو
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className="px-3 py-1.5 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>إضافة عضو جديد</span>
                </button>
              </div>

              {/* Add Member Drawer Form */}
              {isAddingMember && (
                <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 space-y-3">
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    إضافة عضو جديد للجنة السلوك:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        الاسم الكامل:
                      </label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="أ. سيف عبدالله"
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        الصفة / الدور:
                      </label>
                      <input
                        type="text"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="عضو ممثل / منسق"
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        رقم الهاتف (SMS):
                      </label>
                      <input
                        type="text"
                        value={newMemberPhone}
                        onChange={(e) => setNewMemberPhone(e.target.value)}
                        placeholder="+971501234567"
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                        البريد الإلكتروني:
                      </label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="name@moe.gov.ae"
                        className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleAddNewMember}
                      className="px-4 py-1.5 rounded-xl bg-[#006D77] text-white text-xs font-bold cursor-pointer"
                    >
                      تأكيد الإضافة
                    </button>
                  </div>
                </div>
              )}

              {/* Members List Table / Cards */}
              <div className="space-y-2.5">
                {editingMembers.map((member, idx) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3 card-elevated"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-2xl bg-[#006D77]/10 text-[#006D77] dark:bg-[#006D77]/25 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          {member.name}
                        </h5>
                        <span className="text-[11px] text-[#006D77] dark:text-teal-400 font-bold block">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.receiveSms}
                          onChange={(e) => {
                            const updated = [...editingMembers];
                            updated[idx].receiveSms = e.target.checked;
                            setEditingMembers(updated);
                          }}
                          className="rounded text-[#006D77]"
                        />
                        <span>رسائل SMS</span>
                      </label>

                      <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.receiveEmail}
                          onChange={(e) => {
                            const updated = [...editingMembers];
                            updated[idx].receiveEmail = e.target.checked;
                            setEditingMembers(updated);
                          }}
                          className="rounded text-[#006D77]"
                        />
                        <span>بريد إلكتروني</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSaveMembers}
                  className="px-5 py-2.5 rounded-2xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#006D77]/20"
                >
                  حفظ تحديثات بيانات الأعضاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
