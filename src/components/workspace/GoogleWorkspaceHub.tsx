import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  AlertCircle,
  ExternalLink,
  Search,
  CheckCircle2,
  Clock,
  User,
  Shield,
  Layers,
  Inbox,
  Send,
  Sparkles,
  AlertTriangle,
  FolderPlus,
  ChevronDown,
  Info,
  Eye,
  Copy,
  Printer,
  Check,
  Lock,
  Tag,
  ArrowLeft,
  Reply,
  X,
} from 'lucide-react';
import {
  isWorkspaceConnected,
  signInWithGoogleWorkspace,
  clearWorkspaceAccessToken,
  getGoogleTaskLists,
  createGoogleTaskList,
  getGoogleTasks,
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  clearCompletedGoogleTasks,
  getGmailProfile,
  getGmailMessages,
  getGmailMessageDetails,
  sendGmailApiMessage,
  GoogleTaskList,
  GoogleTaskItem,
  GmailProfile,
  GmailMessageSummary,
  GmailMessageDetail,
} from '../../services/googleWorkspaceService';
import { Student, TardinessRecord, ViolationRecord } from '../../types';
import { getUaeTodayDateString } from '../../utils/time';

interface GoogleWorkspaceHubProps {
  students?: Student[];
  tardinessRecords?: TardinessRecord[];
  violations?: ViolationRecord[];
  onOpenStudentProfile?: (studentId: string) => void;
  defaultSubTab?: 'tasks' | 'gmail';
}

export const GoogleWorkspaceHub: React.FC<GoogleWorkspaceHubProps> = ({
  students = [],
  tardinessRecords = [],
  violations = [],
  onOpenStudentProfile,
  defaultSubTab = 'tasks',
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'gmail'>(defaultSubTab);
  const [isConnected, setIsConnected] = useState<boolean>(isWorkspaceConnected());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Google Tasks State
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState<boolean>(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'needsAction' | 'completed'>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');

  // New Task Form
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [selectedStudentForTask, setSelectedStudentForTask] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState<boolean>(false);

  // New List Form
  const [showNewListModal, setShowNewListModal] = useState<boolean>(false);
  const [newListName, setNewListName] = useState<string>('');
  const [creatingList, setCreatingList] = useState<boolean>(false);

  // Destructive Action Confirmation Modal (MANDATORY)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDangerous?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: '',
    onConfirm: async () => {},
  });
  const [isConfirmActionLoading, setIsConfirmActionLoading] = useState<boolean>(false);

  // Gmail Inbox Viewer State
  const [gmailProfile, setGmailProfile] = useState<GmailProfile | null>(null);
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [gmailLoading, setGmailLoading] = useState<boolean>(false);
  const [gmailSearchQuery, setGmailSearchQuery] = useState<string>('');
  const [gmailInboxFilter, setGmailInboxFilter] = useState<'INBOX' | 'ALL' | 'UNREAD' | 'SENT'>('INBOX');
  const [selectedMessageDetail, setSelectedMessageDetail] = useState<GmailMessageDetail | null>(null);
  const [loadingMessageDetail, setLoadingMessageDetail] = useState<boolean>(false);
  const [copiedEmailText, setCopiedEmailText] = useState<boolean>(false);

  // Compose Email State
  const [showComposeModal, setShowComposeModal] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [composeStudentId, setComposeStudentId] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);

  // Check connection and load data
  useEffect(() => {
    if (isConnected) {
      loadTasksData();
      loadGmailData();
    }
  }, [isConnected]);

  // Reload tasks when list changes
  useEffect(() => {
    if (isConnected && selectedListId) {
      loadTasksForList(selectedListId);
    }
  }, [selectedListId, isConnected]);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      const res = await signInWithGoogleWorkspace();
      if (res) {
        setIsConnected(true);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'تعذر تسجيل الدخول بحساب Google Workspace.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDisconnect = () => {
    clearWorkspaceAccessToken();
    setIsConnected(false);
    setTasks([]);
    setTaskLists([]);
    setGmailProfile(null);
    setGmailMessages([]);
  };

  const loadTasksData = async () => {
    setTasksLoading(true);
    try {
      const lists = await getGoogleTaskLists();
      setTaskLists(lists);
      const activeId = selectedListId || lists[0]?.id || '@default';
      await loadTasksForList(activeId);
    } catch (err: any) {
      console.warn('Error loading task lists:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadTasksForList = async (listId: string) => {
    setTasksLoading(true);
    try {
      const items = await getGoogleTasks(listId, true, false);
      setTasks(items);
    } catch (err: any) {
      console.warn('Error loading tasks for list:', err);
    } finally {
      setTasksLoading(false);
    }
  };

  const loadGmailData = async (
    filter: 'INBOX' | 'ALL' | 'UNREAD' | 'SENT' = gmailInboxFilter,
    query: string = gmailSearchQuery
  ) => {
    setGmailLoading(true);
    try {
      let finalQuery = query.trim();
      let labelParam: string | undefined = filter;
      if (filter === 'UNREAD') {
        labelParam = undefined;
        finalQuery = finalQuery ? `is:unread ${finalQuery}` : 'is:unread';
      }

      const [profile, messages] = await Promise.all([
        getGmailProfile().catch(() => null),
        getGmailMessages(finalQuery, 10, labelParam).catch(() => []),
      ]);
      setGmailProfile(profile);
      setGmailMessages(messages);
    } catch (err: any) {
      console.warn('Error loading Gmail data:', err);
    } finally {
      setGmailLoading(false);
    }
  };

  const handleOpenMessageDetail = async (msg: GmailMessageSummary) => {
    setLoadingMessageDetail(true);
    try {
      const details = await getGmailMessageDetails(msg.id);
      setSelectedMessageDetail(details);
    } catch (err: any) {
      alert(`تعذر تحميل نص الرسالة من Gmail: ${err?.message || err}`);
    } finally {
      setLoadingMessageDetail(false);
    }
  };

  const handleCopyEmailContent = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopiedEmailText(true);
      setTimeout(() => setCopiedEmailText(false), 2500);
    });
  };

  const handleReplyToMessage = (msg: GmailMessageDetail) => {
    const match = msg.from ? msg.from.match(/<([^>]+)>/) : null;
    const cleanEmail = match ? match[1] : (msg.from || '');
    setComposeTo(cleanEmail);
    setComposeSubject(msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject || ''}`);
    setComposeBody(`\n\n--- الرسالة الأصلية (${msg.date || ''}) ---\n${msg.bodyText}`);
    setSelectedMessageDetail(null);
    setShowComposeModal(true);
  };

  const handleToggleTaskStatus = async (task: GoogleTaskItem) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await updateGoogleTask(selectedListId, task.id, {
        status: newStatus,
        completed: newStatus === 'completed' ? new Date().toISOString() : undefined,
      });
    } catch (err: any) {
      console.error('Failed to toggle task status:', err);
      // Rollback on error
      loadTasksForList(selectedListId);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setCreatingTask(true);
    try {
      let notes = newTaskNotes.trim();
      if (selectedStudentForTask) {
        const student = students.find((s) => s.id === selectedStudentForTask);
        if (student) {
          notes = `${notes ? notes + '\n\n' : ''}• الطالب: ${student.fullName} (رقم: ${student.studentNumber || student.id}) - الصف: ${student.grade}/${student.section}`;
        }
      }

      let rfcDue: string | undefined = undefined;
      if (newTaskDueDate) {
        rfcDue = new Date(newTaskDueDate).toISOString();
      }

      const created = await createGoogleTask(selectedListId, {
        title: newTaskTitle.trim(),
        notes: notes || undefined,
        due: rfcDue,
      });

      setTasks((prev) => [created, ...prev]);
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDueDate('');
      setSelectedStudentForTask('');
    } catch (err: any) {
      alert(`تعذر إضافة المهمة إلى Google Tasks: ${err?.message || err}`);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setCreatingList(true);
    try {
      const created = await createGoogleTaskList(newListName.trim());
      setTaskLists((prev) => [...prev, created]);
      setSelectedListId(created.id);
      setShowNewListModal(false);
      setNewListName('');
    } catch (err: any) {
      alert(`تعذر إنشاء قائمة المهام: ${err?.message || err}`);
    } finally {
      setCreatingList(false);
    }
  };

  // Mandatory confirmation dialog before deleting task
  const requestDeleteTask = (task: GoogleTaskItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'حذف مهمة من Google Tasks',
      description: `هل أنت متأكد من رغبتك في حذف المهمة "${task.title}" نهائياً من حساب Google Tasks؟ لا يمكن التراجع عن هذا الإجراء.`,
      actionLabel: 'نعم، حذف المهمة',
      isDangerous: true,
      onConfirm: async () => {
        await deleteGoogleTask(selectedListId, task.id);
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      },
    });
  };

  // Mandatory confirmation dialog before clearing completed tasks
  const requestClearCompleted = () => {
    const completedCount = tasks.filter((t) => t.status === 'completed').length;
    if (completedCount === 0) return;

    setConfirmModal({
      isOpen: true,
      title: 'مسح جميع المهام المكتملة',
      description: `هل أنت متأكد من مسح ${completedCount} مهمة مكتملة من قائمة Google Tasks؟`,
      actionLabel: 'مسح المهام المكتملة',
      isDangerous: true,
      onConfirm: async () => {
        await clearCompletedGoogleTasks(selectedListId);
        setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
      },
    });
  };

  // Sync / Convert Open Student Disciplinary & Tardiness issues into Google Tasks
  const handleAutoSyncStudentFollowUps = async () => {
    // Find high-priority students: 3+ tardies or open violations
    const urgentTardyStudents = students.filter((s) => (s.totalTardiness || 0) >= 3).slice(0, 5);
    const urgentViolations = violations.filter((v) => !v.resolved).slice(0, 5);

    if (urgentTardyStudents.length === 0 && urgentViolations.length === 0) {
      alert('لا توجد حالات متأخرة أو مخالفات مفتوحة تستدعي إنشاء مهام جديدة حالياً.');
      return;
    }

    setTasksLoading(true);
    try {
      for (const st of urgentTardyStudents) {
        await createGoogleTask(selectedListId, {
          title: `متابعة انضباط: ${st.fullName} (${st.totalTardiness} مرات تأخير)`,
          notes: `• الرقم الطلابي: ${st.studentNumber || st.id}\n• الصف: ${st.grade}/${st.section}\n• ولي الأمر: ${st.parentName || 'مسجل'} (${st.parentPhone || 'غير متوفر'})\n• الإجراء المطلوب: استدعاء ولي الأمر وتوقيع تعهد انضباط.`,
          due: new Date(Date.now() + 86400000).toISOString(),
        });
      }

      for (const v of urgentViolations) {
        await createGoogleTask(selectedListId, {
          title: `متابعة مخالفة: ${v.studentName} - ${v.violationDegree}`,
          notes: `• رقم الواقعة: #${v.id.slice(-6)}\n• الوصف: ${v.description || 'مخالفة سلوكية'}\n• التاريخ: ${v.date}\n• الإجراء: متابعة تطبيق الإجراء التربوي المعتمد.`,
          due: new Date(Date.now() + 86400000 * 2).toISOString(),
        });
      }

      await loadTasksForList(selectedListId);
      alert('تم بنجاح تصدير متابعات الطلاب كمهام متابعة في Google Tasks!');
    } catch (err: any) {
      alert(`خطأ أثناء مزامنة المهام: ${err?.message || err}`);
    } finally {
      setTasksLoading(false);
    }
  };

  // Compose email confirmation and send
  const requestSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      alert('يرجى ملء كافة حقول البريد المطلوبة (المستلم، الموضوع، نص الرسالة).');
      return;
    }

    const linkedStudent = students.find((s) => s.id === composeStudentId);

    setConfirmModal({
      isOpen: true,
      title: 'تأكيد إرسال رسالة رسمية عبر Gmail API',
      description: `سيتم إرسال الرسالة مباشرةً من حسابك الرسمي إلى ${composeTo} بعنوان "${composeSubject}". هل ترغب في المتابعة والإرسال الآن؟`,
      actionLabel: 'تأكيد الإرسال الآن',
      isDangerous: false,
      onConfirm: async () => {
        setSendingEmail(true);
        try {
          await sendGmailApiMessage({
            to: composeTo.trim(),
            subject: composeSubject.trim(),
            bodyText: composeBody.trim(),
            studentName: linkedStudent?.fullName,
            studentNumber: linkedStudent?.studentNumber || linkedStudent?.id,
          });
          setShowComposeModal(false);
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
          setComposeStudentId('');
          await loadGmailData();
          alert('تم إرسال الرسالة الرسمية بنجاح عبر Gmail API!');
        } finally {
          setSendingEmail(false);
        }
      },
    });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskStatusFilter === 'needsAction' && t.status !== 'needsAction') return false;
      if (taskStatusFilter === 'completed' && t.status !== 'completed') return false;
      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.trim().toLowerCase();
        const text = `${t.title} ${t.notes || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, taskStatusFilter, taskSearchQuery]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner / Google Workspace Integration Status */}
      <div className="bg-gradient-to-r from-[#0C2340] via-[#103058] to-[#006D77] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-[#D4AF37]/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-[#D4AF37]">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black">
                مركز خدمات Google Workspace (Google Tasks & Gmail)
              </h2>
            </div>
            <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
              إدارة مهام المتابعة الإرشادية والسلوكية عبر <strong>Google Tasks</strong> وإرسال ومراجعة
              المراسلات الرسمية عبر <strong>Gmail API</strong> بتفويض مباشر وآمن.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isConnected ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-400/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-200">
                    متصل بـ Google Workspace
                  </span>
                </div>
                {gmailProfile?.emailAddress && (
                  <span className="text-xs font-mono font-bold text-white bg-black/20 px-2.5 py-1 rounded-lg">
                    {gmailProfile.emailAddress}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-300 hover:text-white px-2 py-1 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  فصل الجلسة
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="gsi-material-button bg-white text-slate-900 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-bold">
                  {isAuthenticating ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول بحساب Google Workspace'}
                </span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-xs text-rose-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'border-[#006D77] text-[#006D77] dark:text-[#D4AF37] dark:border-[#D4AF37]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>مهام Google Tasks</span>
          {isConnected && tasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-mono font-bold">
              {tasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gmail')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'gmail'
              ? 'border-[#006D77] text-[#006D77] dark:text-[#D4AF37] dark:border-[#D4AF37]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>بريد Gmail الرسمي (Gmail API)</span>
          {isConnected && gmailProfile && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              مفعل
            </span>
          )}
        </button>
      </div>

      {/* If Not Connected Notice */}
      {!isConnected && (
        <div className="p-8 text-center bg-white dark:bg-[#0C2340] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#006D77] dark:text-[#D4AF37] flex items-center justify-center mx-auto shadow-inner">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              قم بربط حساب Google لتفعيل مزامنة المهام والبريد
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              تتيح لك هذه الميزة مزامنة مهام المتابعة الإرشادية لطلاب أكاديمية الفجيرة العلمية الإسلامية
              مع تطبيق Google Tasks على هاتفك وحاسوبك، وإرسال الرسائل الرسمية لأولياء الأمور مباشرة عبر Gmail.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isAuthenticating}
            className="gsi-material-button inline-flex items-center gap-3 bg-[#0C2340] hover:bg-[#103058] text-white font-bold px-6 py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            <CheckSquare className="w-4 h-4 text-[#D4AF37]" />
            <span>{isAuthenticating ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول الآن لتشغيل Google Tasks و Gmail'}</span>
          </button>
        </div>
      )}

      {/* TAB 1: GOOGLE TASKS */}
      {isConnected && activeTab === 'tasks' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">قائمة المهام:</span>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="@default">القائمة الافتراضية (Default)</option>
                  {taskLists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowNewListModal(true)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="إنشاء قائمة مهام جديدة في Google Tasks"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>قائمة جديدة</span>
              </button>

              <button
                type="button"
                onClick={() => loadTasksForList(selectedListId)}
                disabled={tasksLoading}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="تحديث المهام من Google Tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${tasksLoading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleAutoSyncStudentFollowUps}
                className="px-3.5 py-2 rounded-xl bg-[#006D77]/10 hover:bg-[#006D77]/20 border border-[#006D77]/30 text-[#006D77] dark:text-[#D4AF37] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تحويل الطلاب المتأخرين والمخالفات المفتوحة إلى مهام متابعة في Google Tasks"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>تصدير متابعات الطلاب تلقائياً</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewTaskModal(true)}
                className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>+ مهمة جديدة</span>
              </button>

              <button
                type="button"
                onClick={requestClearCompleted}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 text-slate-500 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="مسح جميع المهام المكتملة"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح المكتملة</span>
              </button>
            </div>
          </div>

          {/* Filtering and Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTaskStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  taskStatusFilter === 'all'
                    ? 'bg-[#0C2340] text-white dark:bg-[#D4AF37] dark:text-slate-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                الكل ({tasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskStatusFilter('needsAction')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  taskStatusFilter === 'needsAction'
                    ? 'bg-[#006D77] text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                قيد التنفيذ ({tasks.filter((t) => t.status === 'needsAction').length})
              </button>
              <button
                type="button"
                onClick={() => setTaskStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  taskStatusFilter === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                المكتملة ({tasks.filter((t) => t.status === 'completed').length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث في المهام..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Tasks List Table / Cards */}
          {tasksLoading ? (
            <div className="p-12 text-center bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800">
              <RefreshCw className="w-6 h-6 animate-spin text-[#006D77] mx-auto mb-2" />
              <p className="text-xs text-slate-500">جارٍ جلب المهام من Google Tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#0C2340] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <CheckSquare className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                لا توجد مهام مطابقة في هذه القائمة حالياً.
              </p>
              <p className="text-[11px] text-slate-400">
                يمكنك إضافة مهمة جديدة أو تصدير متابعات الطلاب المتأخرين والمخالفات مباشرةً.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const hasDue = Boolean(task.due);
                const dueDate = hasDue ? new Date(task.due!) : null;
                const formattedDue = dueDate
                  ? dueDate.toLocaleDateString('ar-AE', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : null;

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                      isCompleted
                        ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                        : 'bg-white dark:bg-[#0C2340] border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#006D77]/50'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-[#006D77]'
                        }`}
                        title={isCompleted ? 'إعادة المهمة كقيد التنفيذ' : 'تعليم كمكتملة في Google Tasks'}
                      >
                        {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`text-xs sm:text-sm font-bold ${
                              isCompleted
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {task.title}
                          </h4>

                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 text-[10px] font-bold">
                              مكتملة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 text-[10px] font-bold">
                              قيد التنفيذ
                            </span>
                          )}
                        </div>

                        {task.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            {task.notes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono pt-1">
                          {formattedDue && (
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-bold">
                              <Calendar className="w-3 h-3 text-[#006D77] dark:text-[#D4AF37]" />
                              <span>تاريخ الاستحقاق: {formattedDue}</span>
                            </span>
                          )}
                          {task.updated && (
                            <span>
                              آخر تحديث: {new Date(task.updated).toLocaleDateString('ar-AE')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => requestDeleteTask(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="حذف المهمة نهائياً من Google Tasks"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GMAIL WORKSPACE (READ-ONLY INBOX VIEWER FOR LAST 10 EMAILS) */}
      {isConnected && activeTab === 'gmail' && (
        <div className="space-y-5">
          {/* Gmail Header & Status */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#0C2340] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Mail className="w-5 h-5 text-[#006D77] dark:text-[#D4AF37]" />
                <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  صندوق بريد Gmail الرسمي للأكاديمية (Gmail Inbox Viewer)
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                  قراءة مباشرة آمنة (Read-Only)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                الحساب المتصل: <strong className="font-mono text-slate-800 dark:text-slate-200">{gmailProfile?.emailAddress || 'جاري التحميل...'}</strong>
                {gmailProfile && (
                  <span> • إجمالي الرسائل: {gmailProfile.messagesTotal.toLocaleString()} • المحادثات: {gmailProfile.threadsTotal.toLocaleString()}</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadGmailData(gmailInboxFilter, gmailSearchQuery)}
                disabled={gmailLoading}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="تحديث صندوق البريد من Gmail"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${gmailLoading ? 'animate-spin' : ''}`} />
                <span>تحديث</span>
              </button>

              <button
                type="button"
                onClick={() => setShowComposeModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>إنشاء رسالة جديدة</span>
              </button>
            </div>
          </div>

          {/* Privacy & Scope Compliance Notice */}
          <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 text-xs flex items-center gap-3">
            <Lock className="w-4 h-4 text-[#006D77] dark:text-[#D4AF37] shrink-0" />
            <div className="flex-1 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>حماية الخصوصية والأمان:</strong> يتم استعراض آخر 10 رسائل رسمية مباشرة من واجهة Gmail API المعتمدة بتفويض آمن للقراءة فقط (Read-Only)، دون تخزين أو نقل محتوى الرسائل الخاصة على أي خوادم خارجية.
            </div>
          </div>

          {/* Inbox Filter Toolbar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              <button
                type="button"
                onClick={() => {
                  setGmailInboxFilter('INBOX');
                  loadGmailData('INBOX', gmailSearchQuery);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  gmailInboxFilter === 'INBOX'
                    ? 'bg-[#006D77] text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>صندوق الوارد (Inbox)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGmailInboxFilter('UNREAD');
                  loadGmailData('UNREAD', gmailSearchQuery);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  gmailInboxFilter === 'UNREAD'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>غير مقروءة (Unread)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGmailInboxFilter('SENT');
                  loadGmailData('SENT', gmailSearchQuery);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                  gmailInboxFilter === 'SENT'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>المرسلة (Sent)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGmailInboxFilter('ALL');
                  loadGmailData('ALL', gmailSearchQuery);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                  gmailInboxFilter === 'ALL'
                    ? 'bg-[#0C2340] text-white dark:bg-[#D4AF37] dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>جميع الرسائل</span>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadGmailData(gmailInboxFilter, gmailSearchQuery);
              }}
              className="relative w-full sm:w-72"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث في الرسائل (المرسل، الموضوع)..."
                value={gmailSearchQuery}
                onChange={(e) => setGmailSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </form>
          </div>

          {/* Messages List from Gmail API (Last 10 emails) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Inbox className="w-4 h-4 text-[#006D77] dark:text-[#D4AF37]" />
                <span>آخر 10 رسائل في حساب Gmail ({gmailMessages.length} معروضة):</span>
              </h5>
              <span className="text-[11px] text-slate-400 font-mono">
                محدثة مباشرة من خادم Gmail الرسمي
              </span>
            </div>

            {gmailLoading ? (
              <div className="p-12 text-center bg-white dark:bg-[#0C2340] rounded-2xl border border-slate-200 dark:border-slate-800">
                <RefreshCw className="w-6 h-6 animate-spin text-[#006D77] mx-auto mb-2" />
                <p className="text-xs text-slate-500">جارٍ قراءة آخر الرسائل من Gmail API...</p>
              </div>
            ) : gmailMessages.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#0C2340] rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                <Mail className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  لا توجد رسائل مطابقة في هذا التصنيف حالياً.
                </p>
                <p className="text-[11px] text-slate-400">
                  يمكنك تغيير التصفية أو البحث عن موضوع محدد.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {gmailMessages.map((msg) => {
                  const isUnread = msg.isUnread;
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                        isUnread
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80 shadow-xs'
                          : 'bg-white dark:bg-[#0C2340] border-slate-200 dark:border-slate-800 shadow-2xs hover:border-[#006D77]/40'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="رسالة غير مقروءة" />
                          )}
                          <strong className="text-slate-900 dark:text-white text-xs sm:text-sm truncate max-w-lg">
                            {msg.subject || '(بدون موضوع)'}
                          </strong>

                          {isUnread ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-bold">
                              غير مقروءة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px]">
                              مقروءة
                            </span>
                          )}

                          {msg.labelIds?.includes('SENT') && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 text-[10px] font-bold">
                              مرسلة
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            من: <strong className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{msg.from || 'غير محدد'}</strong>
                          </span>
                          {msg.to && (
                            <span>
                              إلى: <strong className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{msg.to}</strong>
                            </span>
                          )}
                          <span className="font-mono text-slate-400 text-[10px]">
                            {msg.date || 'تاريخ غير محدد'}
                          </span>
                        </div>

                        {msg.snippet && (
                          <p className="text-slate-600 dark:text-slate-300 line-clamp-1 text-[11px] leading-relaxed">
                            {msg.snippet}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => handleOpenMessageDetail(msg)}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-[#006D77] dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة الرسالة داخل التطبيق</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: IN-APP GMAIL MESSAGE VIEWER (READ-ONLY VIEWER WITHOUT LEAVING APP) */}
      {(selectedMessageDetail || loadingMessageDetail) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col text-right">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#006D77] dark:text-[#D4AF37]" />
                  <span className="text-[11px] font-bold text-slate-400">معاينة الرسالة الرسمية عبر Gmail</span>
                  {selectedMessageDetail?.isUnread && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                      غير مقروءة
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                  {selectedMessageDetail?.subject || 'جارٍ تحميل موضوع الرسالة...'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMessageDetail(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="إغلاق المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingMessageDetail ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#006D77] mx-auto" />
                <p className="text-xs text-slate-500 font-bold">
                  جارٍ استخراج وتنسيق محتوى الرسالة من حساب Gmail...
                </p>
              </div>
            ) : selectedMessageDetail ? (
              <>
                {/* Meta details (From, To, Date) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">من (المرسل):</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-[11px] block break-all">
                      {selectedMessageDetail.from}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">إلى (المستلم):</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-[11px] block break-all">
                      {selectedMessageDetail.to || 'غير محدد'}
                    </strong>
                  </div>

                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 font-mono">
                    <span>تاريخ ووقت الإرسال: {selectedMessageDetail.date || '—'}</span>
                    <span>معرّف الرسالة: #{selectedMessageDetail.id.slice(-8)}</span>
                  </div>
                </div>

                {/* Email Body Content Viewer */}
                <div className="flex-1 overflow-y-auto p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs leading-relaxed space-y-3">
                  {selectedMessageDetail.bodyHtml ? (
                    <div
                      className="prose dark:prose-invert max-w-none text-xs leading-relaxed overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: selectedMessageDetail.bodyHtml }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                      {selectedMessageDetail.bodyText || 'لا يتوفر نص للرسالة.'}
                    </div>
                  )}
                </div>

                {/* Footer Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyEmailContent(selectedMessageDetail.bodyText || selectedMessageDetail.snippet || '')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      {copiedEmailText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedEmailText ? 'تم نسخ النص!' : 'نسخ نص الرسالة'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReplyToMessage(selectedMessageDetail)}
                      className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>الرد على هذه الرسالة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMessageDetail(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold cursor-pointer transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL: NEW TASK */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#006D77]" />
                <span>إضافة مهمة جديدة إلى Google Tasks</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  عنوان المهمة: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متابعة جلسة إرشادية وتوقيع تعهد انضباط..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ربط المهمة بطالب (اختياري):
                </label>
                <select
                  value={selectedStudentForTask}
                  onChange={(e) => setSelectedStudentForTask(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="">بدون ربط بطالب معين</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentNumber || s.id}) - الصف {s.grade}/{s.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  تاريخ الاستحقاق (اختياري):
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ملاحظات وتفاصيل المهمة:
                </label>
                <textarea
                  rows={3}
                  placeholder="تفاصيل الإجراء المطلوب، رقم هاتف ولي الأمر، التوصيات..."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingTask || !newTaskTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  {creatingTask ? 'جارٍ الحفظ في Google Tasks...' : 'حفظ في Google Tasks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW LIST */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#006D77]" />
              <span>إنشاء قائمة مهام جديدة في Google Tasks</span>
            </h3>

            <form onSubmit={handleCreateList} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  اسم القائمة: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: متابعات سلوكية - الفصل الأول"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingList || !newListName.trim()}
                  className="px-4 py-2 rounded-xl bg-[#006D77] hover:bg-[#005a63] disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  {creatingList ? 'جارٍ الإنشاء...' : 'إنشاء القائمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPOSE EMAIL */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-[#006D77]" />
                <span>إرسال بريد رسمي عبر Gmail API</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <form onSubmit={requestSendEmail} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  ربط بطالب (لتعبئة بريد ولي الأمر تلقائياً):
                </label>
                <select
                  value={composeStudentId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setComposeStudentId(sid);
                    const st = students.find((s) => s.id === sid);
                    if (st && (st.guardianEmail || st.email)) {
                      setComposeTo(st.guardianEmail || st.email || '');
                      setComposeSubject(`إشعار رسمي بشأن الطالب ${st.fullName} - أكاديمية الفجيرة`);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                >
                  <option value="">اختيار طالب من السجل المدرسي...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentNumber || s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  البريد الإلكتروني للمستلم: *
                </label>
                <input
                  type="email"
                  required
                  placeholder="parent@example.com"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  موضوع الرسالة: *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إشعار موعد مقابلة ولي الأمر - مكتب الإرشاد الطلابي"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  نص الرسالة: *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="السلام عليكم ورحمة الله وبركاته، نود إحاطتكم علماً..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  متابعة الإرسال (تأكيد)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY CONFIRMATION MODAL FOR DESTRUCTIVE / MUTATING OPERATIONS */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-right">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className={`p-2 rounded-xl ${confirmModal.isDangerous ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60' : 'bg-teal-100 text-teal-700 dark:bg-teal-950/60'}`}>
                {confirmModal.isDangerous ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                {confirmModal.title}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              {confirmModal.description}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                disabled={isConfirmActionLoading}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                disabled={isConfirmActionLoading}
                onClick={async () => {
                  setIsConfirmActionLoading(true);
                  try {
                    await confirmModal.onConfirm();
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  } catch (err: any) {
                    alert(`حدث خطأ أثناء تنفيذ الإجراء: ${err?.message || err}`);
                  } finally {
                    setIsConfirmActionLoading(false);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer shadow-xs ${
                  confirmModal.isDangerous
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-[#006D77] hover:bg-[#005a63]'
                }`}
              >
                {isConfirmActionLoading ? 'جارٍ التنفيذ...' : confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
