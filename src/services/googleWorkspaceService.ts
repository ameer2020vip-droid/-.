import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/config';

// Primary Workspace Scopes
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/tasks.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
] as const;

// In-memory token storage (MANDATORY: Never stored in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Types for Google Tasks API
export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  updated?: string;
  selfLink?: string;
  parent?: string;
  position?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
  links?: Array<{ type: string; description: string; link: string }>;
  // Extension metadata for school app
  studentId?: string;
  studentNumber?: string;
  studentName?: string;
}

// Types for Gmail API
export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  internalDate?: string;
  labelIds?: string[];
  isUnread?: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText: string;
  bodyHtml?: string;
  hasHtml: boolean;
  isUnread: boolean;
}

export interface SendGmailPayload {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  studentNumber?: string;
  studentName?: string;
}

/**
 * Configure Google Auth Provider with Workspace Scopes
 */
export function getWorkspaceGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of WORKSPACE_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: 'select_account',
    access_type: 'offline',
  });
  return provider;
}

/**
 * Initialize workspace auth listener.
 * Clears cached access token whenever user signs out.
 */
export function initWorkspaceAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): () => void {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

/**
 * Signs in with Google and acquires the Workspace OAuth access token in-memory.
 */
export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string;
} | null> {
  if (!auth) {
    throw new Error('خدمة المصادقة Firebase غير مهيأة.');
  }

  try {
    isSigningIn = true;
    const provider = getWorkspaceGoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('تعذر استخراج رمز وصول Google Workspace (Access Token) من عملية تسجيل الدخول.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Google Workspace Sign-in error:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Returns the in-memory access token if available.
 */
export function getWorkspaceAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Sets the access token manually into memory (e.g. from existing auth credential).
 */
export function setWorkspaceAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

/**
 * Clears the in-memory access token.
 */
export function clearWorkspaceAccessToken(): void {
  cachedAccessToken = null;
}

export function isWorkspaceConnected(): boolean {
  return Boolean(cachedAccessToken);
}

// ============================================================================
// GOOGLE TASKS API CLIENT
// ============================================================================

const TASKS_BASE_URL = 'https://tasks.googleapis.com/tasks/v1';

async function tasksFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('انتهت صلاحية جلسة Google Tasks أو لم يتم تسجيل الدخول بعد.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${TASKS_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    if (res.status === 401) {
      clearWorkspaceAccessToken();
      throw new Error('انتهت صلاحية رمز التفويض (401). يرجى إعادة تسجيل الدخول بحساب Google.');
    }
    throw new Error(`خطأ في استدعاء Google Tasks (${res.status}): ${errorDetail}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}

/**
 * Fetches all Google Task Lists for the authenticated user.
 */
export async function getGoogleTaskLists(): Promise<GoogleTaskList[]> {
  const data = await tasksFetch<{ items?: GoogleTaskList[] }>('/users/@me/lists');
  return data.items || [];
}

/**
 * Creates a new Google Task List (e.g. "متابعات أكاديمية الفجيرة").
 */
export async function createGoogleTaskList(title: string): Promise<GoogleTaskList> {
  return await tasksFetch<GoogleTaskList>('/users/@me/lists', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

/**
 * Fetches all tasks within a given task list.
 */
export async function getGoogleTasks(
  taskListId: string = '@default',
  showCompleted: boolean = true,
  showHidden: boolean = false
): Promise<GoogleTaskItem[]> {
  const params = new URLSearchParams({
    showCompleted: showCompleted ? 'true' : 'false',
    showHidden: showHidden ? 'true' : 'false',
    maxResults: '100',
  });
  const data = await tasksFetch<{ items?: GoogleTaskItem[] }>(
    `/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`
  );
  return data.items || [];
}

/**
 * Creates a new task in Google Tasks.
 */
export async function createGoogleTask(
  taskListId: string = '@default',
  task: {
    title: string;
    notes?: string;
    due?: string; // RFC 3339 timestamp (e.g. "2026-11-01T00:00:00.000Z")
  }
): Promise<GoogleTaskItem> {
  return await tasksFetch<GoogleTaskItem>(`/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify({
      title: task.title,
      notes: task.notes,
      ...(task.due ? { due: task.due } : {}),
      status: 'needsAction',
    }),
  });
}

/**
 * Updates a task (e.g. toggle completion status, update notes or due date).
 */
export async function updateGoogleTask(
  taskListId: string,
  taskId: string,
  updates: Partial<GoogleTaskItem>
): Promise<GoogleTaskItem> {
  return await tasksFetch<GoogleTaskItem>(
    `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Deletes a task from Google Tasks.
 * Note: Must be preceded by an explicit user confirmation dialog.
 */
export async function deleteGoogleTask(
  taskListId: string,
  taskId: string
): Promise<void> {
  await tasksFetch<void>(
    `/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Clears all completed tasks from a task list.
 * Note: Must be preceded by an explicit user confirmation dialog.
 */
export async function clearCompletedGoogleTasks(taskListId: string): Promise<void> {
  await tasksFetch<void>(`/lists/${encodeURIComponent(taskListId)}/clear`, {
    method: 'POST',
  });
}

// ============================================================================
// GMAIL API CLIENT
// ============================================================================

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function gmailFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('انتهت صلاحية جلسة Gmail أو لم يتم تسجيل الدخول بعد.');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(`${GMAIL_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    if (res.status === 401) {
      clearWorkspaceAccessToken();
      throw new Error('انتهت صلاحية رمز التفويض لـ Gmail (401). يرجى إعادة تسجيل الدخول بحساب Google.');
    }
    throw new Error(`خطأ في استدعاء Gmail API (${res.status}): ${errorDetail}`);
  }

  return (await res.json()) as T;
}

/**
 * Fetches authenticated user's Gmail profile.
 */
export async function getGmailProfile(): Promise<GmailProfile> {
  return await gmailFetch<GmailProfile>('/profile');
}

/**
 * Helper to decode base64url string into unicode text
 */
export function decodeBase64Url(base64UrlStr: string): string {
  try {
    let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (m) => m.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    console.warn('Failed to decode base64url content:', err);
    return '';
  }
}

/**
 * Extracts plain text and HTML bodies from Gmail message payload
 */
function extractBodyFromPayload(payload: any): { text: string; html?: string } {
  let text = '';
  let html = '';

  function walk(part: any) {
    if (!part) return;
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    }
    if (part.parts && Array.isArray(part.parts)) {
      for (const sub of part.parts) {
        walk(sub);
      }
    }
  }

  if (payload?.body?.data) {
    if (payload.mimeType === 'text/html') {
      html = decodeBase64Url(payload.body.data);
    } else {
      text = decodeBase64Url(payload.body.data);
    }
  }

  if (payload?.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      walk(part);
    }
  }

  return { text: text || payload?.snippet || '', html: html || undefined };
}

/**
 * Fetches recent messages list from Gmail (default last 10 messages from school account).
 * Read-only, client-side OAuth fetch respecting user privacy.
 */
export async function getGmailMessages(
  queryParam: string = '',
  maxResults: number = 10,
  labelId?: string
): Promise<GmailMessageSummary[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults || 10),
    ...(queryParam ? { q: queryParam } : {}),
    ...(labelId && labelId !== 'ALL' ? { labelIds: labelId } : {}),
  });

  const listData = await gmailFetch<{ messages?: Array<{ id: string; threadId: string }> }>(
    `/messages?${params.toString()}`
  );

  if (!listData.messages || listData.messages.length === 0) {
    return [];
  }

  // Fetch metadata headers for the last 10 messages
  const targetBatch = listData.messages.slice(0, maxResults || 10);
  const summaries = await Promise.all(
    targetBatch.map(async (msg) => {
      try {
        const detail = await gmailFetch<any>(
          `/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`
        );
        const headers: Array<{ name: string; value: string }> = detail.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(بدون موضوع)';
        const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
        const to = headers.find((h) => h.name.toLowerCase() === 'to')?.value || '';
        const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';
        const labelIds = detail.labelIds || [];
        const isUnread = labelIds.includes('UNREAD');

        return {
          id: detail.id,
          threadId: detail.threadId,
          snippet: detail.snippet,
          subject,
          from,
          to,
          date,
          internalDate: detail.internalDate,
          labelIds,
          isUnread,
        } as GmailMessageSummary;
      } catch {
        return {
          id: msg.id,
          threadId: msg.threadId,
          isUnread: false,
        } as GmailMessageSummary;
      }
    })
  );

  return summaries;
}

/**
 * Fetches full details and message body for viewing an email inside the app without leaving.
 * Completely read-only and respects user privacy.
 */
export async function getGmailMessageDetails(messageId: string): Promise<GmailMessageDetail> {
  const detail = await gmailFetch<any>(`/messages/${encodeURIComponent(messageId)}?format=full`);
  const headers: Array<{ name: string; value: string }> = detail.payload?.headers || [];
  const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(بدون موضوع)';
  const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || '';
  const to = headers.find((h) => h.name.toLowerCase() === 'to')?.value || '';
  const date = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';
  const labelIds = detail.labelIds || [];
  const isUnread = labelIds.includes('UNREAD');

  const { text, html } = extractBodyFromPayload(detail.payload);

  return {
    id: detail.id,
    threadId: detail.threadId,
    snippet: detail.snippet,
    subject,
    from,
    to,
    date,
    internalDate: detail.internalDate,
    labelIds,
    isUnread,
    bodyText: text,
    bodyHtml: html,
    hasHtml: Boolean(html),
  };
}

/**
 * Helper to encode unicode string to base64url format for RFC 2822
 */
function toBase64Url(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sends an email message through the Gmail API using client-side OAuth access token.
 * Note: Must be preceded by an explicit user confirmation dialog.
 */
export async function sendGmailApiMessage(payload: SendGmailPayload): Promise<{
  id: string;
  threadId: string;
}> {
  const profile = await getGmailProfile();
  const senderEmail = profile.emailAddress;

  // Build standard RFC 2822 email message with UTF-8 encoding
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;

  const htmlContent = payload.bodyHtml || `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0C2340; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid #D4AF37;">
        <h2 style="margin: 0; font-size: 18px; font-weight: bold;">أكاديمية الفجيرة العلمية الإسلامية</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #D4AF37;">Fujairah Islamic Scientific Academy</p>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        ${payload.studentName ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px;"><strong>الطالب:</strong> ${payload.studentName} ${payload.studentNumber ? `(${payload.studentNumber})` : ''}</div>` : ''}
        <div style="white-space: pre-wrap; font-size: 14px; color: #334155;">${payload.bodyText}</div>
      </div>
      <div style="background: #f1f5f9; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        هذه الرسالة رسمية وموجهة من إدارة أكاديمية الفجيرة العلمية الإسلامية عبر نظام الإرشاد الطلابي.
      </div>
    </div>
  `;

  const rawLines = [
    `From: ${senderEmail}`,
    `To: ${payload.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64Url(payload.bodyText),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    toBase64Url(htmlContent),
    '',
    `--${boundary}--`,
  ];

  const rawMessage = rawLines.join('\r\n');
  const base64EncodedMessage = toBase64Url(rawMessage);

  return await gmailFetch<{ id: string; threadId: string }>('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ raw: base64EncodedMessage }),
  });
}
