import { Student, StudentContact } from '../types';

/**
 * Normalizes any phone number string into UAE international E.164 format (+971...)
 */
export function normalizeUaePhone(rawPhone?: string | null): {
  isValid: boolean;
  e164: string;
  display: string;
  waNumber: string;
} {
  if (!rawPhone) {
    return { isValid: false, e164: '', display: '', waNumber: '' };
  }

  // Remove all non-digits except leading +
  let cleaned = rawPhone.toString().trim().replace(/[\s\-\(\)\.]/g, '');

  // If starts with 00, convert to +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle UAE local format: 05x xxxxxxx (10 digits)
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    cleaned = '+971' + cleaned.slice(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '+971' + cleaned;
  } else if (cleaned.startsWith('9715') && (cleaned.length === 12 || cleaned.length === 13)) {
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  }

  // Validate E.164 pattern: +971 5x xxx xxxx (13 chars total with +)
  const isUaeMobile = /^\+9715[0-9]{8}$/.test(cleaned);
  // Also accept general international numbers with 9 to 15 digits
  const isGeneralValid = /^\+[1-9][0-9]{8,14}$/.test(cleaned);

  const isValid = isUaeMobile || isGeneralValid;
  const waNumber = cleaned.replace(/^\+/, '');

  // Format display nicely
  let display = cleaned;
  if (isUaeMobile) {
    // +971 50 123 4567
    display = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return {
    isValid,
    e164: cleaned,
    display: isValid ? display : rawPhone.toString().trim(),
    waNumber,
  };
}

/**
 * Masks a phone number for privacy display in general audit logs: +971 50 *** 1234
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  const norm = normalizeUaePhone(phone);
  if (!norm.isValid) {
    if (phone.length <= 4) return '***';
    return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
  }
  const digits = norm.e164;
  // Format: +971 5x *** xxxx
  if (digits.length >= 12) {
    const prefix = digits.slice(0, 7); // e.g. +97150
    const suffix = digits.slice(-4); // e.g. 1234
    return `${prefix} *** ${suffix}`;
  }
  return `${digits.slice(0, 4)} *** ${digits.slice(-2)}`;
}

export const maskPhone = maskPhoneNumber;
export const maskEmailAddress = maskEmail;

/**
 * Masks an email for privacy display: a***@domain.com
 */
export function maskEmail(email?: string | null): string {
  if (!email || !email.includes('@')) return '—';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

/**
 * Generates safe WhatsApp direct link with pre-filled message text
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const norm = normalizeUaePhone(phone);
  const waNumber = norm.waNumber;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates safe mailto link with encoded subject and body
 */
export function buildMailtoLink(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generates safe sms link with normalized phone and encoded message
 */
export function buildSmsLink(phone: string, text: string): string {
  const norm = normalizeUaePhone(phone);
  const targetPhone = norm.e164 || phone;
  // RFC 5724 standard for SMS uri; also supports ?body= on iOS & Android
  return `sms:${targetPhone}?body=${encodeURIComponent(text)}`;
}

/**
 * Automatically extracts and normalizes all contacts for a student,
 * combining any pre-existing contacts array or legacy parentPhone/motherPhone/etc.
 * Prevents duplicates (same phone number).
 */
export function getStudentNormalizedContacts(student: Student): StudentContact[] {
  const contactsMap = new Map<string, StudentContact>();

  // 1. Existing contacts array if any
  if (Array.isArray(student.contacts) && student.contacts.length > 0) {
    for (const c of student.contacts) {
      const norm = normalizeUaePhone(c.phone);
      if (norm.isValid && norm.waNumber) {
        if (!contactsMap.has(norm.waNumber)) {
          contactsMap.set(norm.waNumber, {
            ...c,
            phoneE164: norm.e164,
            phone: norm.display,
          });
        }
      }
    }
  }

  // 2. Legacy / default parentPhone
  if (student.parentPhone) {
    const norm = normalizeUaePhone(student.parentPhone);
    if (norm.isValid && !contactsMap.has(norm.waNumber)) {
      contactsMap.set(norm.waNumber, {
        id: `c-parent-${student.id}`,
        name: student.parentName || `ولي أمر ${student.fullName.split(' ')[0]}`,
        relation: student.parentRelation || 'ولي الأمر الأساسي',
        phone: norm.display,
        phoneE164: norm.e164,
        email: student.email || student.guardianEmail || undefined,
        isPrimary: contactsMap.size === 0,
        hasWhatsApp: true,
        whatsappConsent: true,
        emailConsent: Boolean(student.email || student.guardianEmail),
        isVerified: true,
        source: 'legacy',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 3. Father phone if different
  if (student.fatherPhone) {
    const norm = normalizeUaePhone(student.fatherPhone);
    if (norm.isValid && !contactsMap.has(norm.waNumber)) {
      contactsMap.set(norm.waNumber, {
        id: `c-father-${student.id}`,
        name: `والد الطالب ${student.fullName.split(' ')[0]}`,
        relation: 'الأب',
        phone: norm.display,
        phoneE164: norm.e164,
        isPrimary: contactsMap.size === 0,
        hasWhatsApp: true,
        whatsappConsent: true,
        emailConsent: false,
        isVerified: true,
        source: 'legacy',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 4. Mother phone if different
  if (student.motherPhone) {
    const norm = normalizeUaePhone(student.motherPhone);
    if (norm.isValid && !contactsMap.has(norm.waNumber)) {
      contactsMap.set(norm.waNumber, {
        id: `c-mother-${student.id}`,
        name: `والدة الطالب ${student.fullName.split(' ')[0]}`,
        relation: 'الأم',
        phone: norm.display,
        phoneE164: norm.e164,
        isPrimary: contactsMap.size === 0,
        hasWhatsApp: true,
        whatsappConsent: true,
        emailConsent: false,
        isVerified: true,
        source: 'legacy',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 5. Student phone if different
  if (student.studentPhone) {
    const norm = normalizeUaePhone(student.studentPhone);
    if (norm.isValid && !contactsMap.has(norm.waNumber)) {
      contactsMap.set(norm.waNumber, {
        id: `c-student-${student.id}`,
        name: student.fullName,
        relation: 'الطالب',
        phone: norm.display,
        phoneE164: norm.e164,
        email: student.email,
        isPrimary: false,
        hasWhatsApp: true,
        whatsappConsent: true,
        emailConsent: Boolean(student.email),
        isVerified: true,
        source: 'legacy',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // If map is still empty but student has an email
  if (contactsMap.size === 0 && (student.email || student.guardianEmail)) {
    const email = student.email || student.guardianEmail;
    contactsMap.set(`email-${email}`, {
      id: `c-email-${student.id}`,
      name: student.parentName || student.fullName,
      relation: student.parentRelation || 'ولي الأمر الأساسي',
      phone: '',
      phoneE164: '',
      email,
      isPrimary: true,
      hasWhatsApp: false,
      whatsappConsent: false,
      emailConsent: true,
      isVerified: true,
      source: 'legacy',
      updatedAt: new Date().toISOString(),
    });
  }

  const result = Array.from(contactsMap.values());
  // Ensure at least one is marked as primary if any exist
  if (result.length > 0 && !result.some((c) => c.isPrimary)) {
    result[0].isPrimary = true;
  }
  return result;
}
