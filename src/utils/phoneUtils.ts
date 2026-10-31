import { Student, StudentContact } from '../types';

const COUNTRY_DIAL_MAP: Record<string, string> = {
  'الإمارات': '971',
  'الامارات': '971',
  'UAE': '971',
  'عمان': '968',
  'سلطنة عمان': '968',
  'السعودية': '966',
  'المملكة العربية السعودية': '966',
  'الكويت': '965',
  'قطر': '974',
  'البحرين': '973',
  'مصر': '20',
  'الأردن': '962',
  'الاردن': '962',
  'سوريا': '963',
  'فلسطين': '970',
  'اليمن': '967',
  'السودان': '249',
};

/**
 * Normalizes a phone number into international E.164 format (+CountryCode...),
 * respecting any explicit international prefix (+ / 00) or stored country code,
 * and flagging numbers that require manual country-code verification.
 */
export function normalizeUaePhone(
  rawPhone?: string | null,
  storedCountryOrDialCode?: string | null
): {
  isValid: boolean;
  e164: string;
  display: string;
  waNumber: string;
  hasExplicitCountryCode: boolean;
  inferredCountryCode?: string;
  validationNotice?: string;
} {
  if (!rawPhone || !String(rawPhone).trim()) {
    return {
      isValid: false,
      e164: '',
      display: '',
      waNumber: '',
      hasExplicitCountryCode: false,
      validationNotice: 'لا يوجد رقم هاتف مسجل لولي الأمر.',
    };
  }

  // Convert Arabic/Eastern numerals to standard Western digits
  const westernized = rawPhone
    .toString()
    .trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  // Remove spaces, dashes, parentheses, dots
  let cleaned = westernized.replace(/[\s\-\(\)\.]/g, '');
  let hasExplicitCountryCode = false;

  // If starts with 00, convert to +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
    hasExplicitCountryCode = true;
  } else if (cleaned.startsWith('+')) {
    hasExplicitCountryCode = true;
  }

  // Determine dial code from storedCountryOrDialCode if present
  let dialCode = '';
  if (storedCountryOrDialCode) {
    const trimmedCountry = storedCountryOrDialCode.trim().replace(/^\+|^00/, '');
    if (/^[1-9][0-9]{0,3}$/.test(trimmedCountry)) {
      dialCode = trimmedCountry;
    } else if (COUNTRY_DIAL_MAP[storedCountryOrDialCode.trim()]) {
      dialCode = COUNTRY_DIAL_MAP[storedCountryOrDialCode.trim()];
    }
  }

  if (!hasExplicitCountryCode) {
    // Check if number already starts with a known GCC/Arab international code (e.g. 9715..., 9665..., 9689...)
    if (/^(971|966|968|965|974|973)[0-9]{8,9}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
      hasExplicitCountryCode = true;
    } else if (dialCode) {
      // Strip leading 0 and prepend stored country dial code
      const localPart = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
      cleaned = `+${dialCode}${localPart}`;
    } else if (cleaned.startsWith('05') && cleaned.length === 10) {
      // Standard 10-digit 05XXXXXXXX in UAE school context, but mark hasExplicitCountryCode = false so UI can show country code note
      cleaned = '+971' + cleaned.slice(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '+971' + cleaned;
    }
  }

  const isUaeMobile = /^\+9715[0-9]{8}$/.test(cleaned);
  const isGeneralValid = /^\+[1-9][0-9]{8,14}$/.test(cleaned);
  const isValid = isUaeMobile || isGeneralValid;
  const waNumber = isValid ? cleaned.replace(/^\+/, '') : '';

  let display = cleaned;
  if (isUaeMobile) {
    display = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  let validationNotice: string | undefined;
  if (!isValid) {
    validationNotice = 'صيغة الرقم غير صالحة دولياً — يرجى إدخال رمز الدولة الصحيح (مثل +971 أو +968).';
  } else if (!hasExplicitCountryCode) {
    validationNotice = 'تم تطبيق رمز الدولة (+971) تلقائياً للرقم المحلي؛ يرجى التحقق إذا كان الرقم خارج دولة الإمارات.';
  }

  return {
    isValid,
    e164: isValid ? cleaned : '',
    display: isValid ? display : rawPhone.toString().trim(),
    waNumber,
    hasExplicitCountryCode,
    inferredCountryCode: isValid ? cleaned.slice(0, 4) : undefined,
    validationNotice,
  };
}

export function isValidEmailFormat(email?: string | null): boolean {
  if (!email) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
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
export function buildWhatsAppLink(phone: string, text: string, countryHint?: string): string {
  const norm = normalizeUaePhone(phone, countryHint);
  const waNumber = norm.waNumber;
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates safe mailto link with encoded subject and body
 */
export function buildMailtoLink(email: string, subject: string, body: string): string {
  const cleanEmail = email.trim();
  return `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Generates safe BCC mailto link for general school announcements so guardians never see each other's emails
 */
export function buildBccMailtoLink(bccEmails: string[], subject: string, body: string): string {
  const validEmails = Array.from(
    new Set(bccEmails.map((e) => e.trim().toLowerCase()).filter((e) => isValidEmailFormat(e)))
  );
  return `mailto:?bcc=${encodeURIComponent(validEmails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
