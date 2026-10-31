import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, isFirebaseReady } from '../firebase/config';
import { SchoolSettings } from '../types';

export const OFFICIAL_ACADEMY_NAME_AR = 'أكاديمية الفجيرة العلمية الإسلامية';
export const OFFICIAL_ACADEMY_NAME_EN = 'Fujairah Scientific Islamic Academy';

function sanitizeSchoolNameAr(name?: string): string {
  if (!name || !name.trim()) return OFFICIAL_ACADEMY_NAME_AR;
  if (name.includes('الخليل') || name.includes('المستقبل') || name.includes('مدرسة غير مسماة')) {
    return OFFICIAL_ACADEMY_NAME_AR;
  }
  return name;
}

function sanitizeSchoolNameEn(name?: string): string {
  if (!name || !name.trim()) return OFFICIAL_ACADEMY_NAME_EN;
  const lower = name.toLowerCase();
  if (lower.includes('khalil') || lower.includes('future')) {
    return OFFICIAL_ACADEMY_NAME_EN;
  }
  return name;
}

export const DEFAULT_MASTER_SCHOOL_SETTINGS: SchoolSettings = {
  schoolId: '7001',
  schoolName: OFFICIAL_ACADEMY_NAME_AR,
  schoolNameEn: OFFICIAL_ACADEMY_NAME_EN,
  schoolNumber: '7001',
  schoolLogo: '/assets/aistudio/image_3c0494bc.png',
  emirate: 'الفجيرة',
  schoolCycle: 'جميع المراحل الدراسية – الحلقة الثالثة (الصفوف 9 - 12)',
  schoolGender: 'بنين وبنات',
  academicYear: '2026–2027',
  currentTerm: 'الفصل الدراسي الأول',
  phone: '09-2220000',
  email: 'info@fsia.edu.ae',
  address: 'إمارة الفجيرة – دولة الإمارات العربية المتحدة',
  principalName: 'إدارة أكاديمية الفجيرة العلمية الإسلامية',
  vicePrincipalName: 'نائب مدير الأكاديمية',
  counselorName: 'أمير علي عبدالشاكر بكري',
  status: 'active',

  // Schedule & Timing Defaults
  morningAssemblyTime: '07:45',
  gateClosingTime: '08:00',
  regularDismissalTime: '14:30',
  fridayDismissalTime: '11:30',
  dailyPeriodsCount: 7,

  // Attendance & Behavior Threshold Defaults
  tardinessNoticeThreshold: 2,
  tardinessPledgeThreshold: 3,
  tardinessCommitteeThreshold: 5,
  absenceWarning1Threshold: 3,
  absenceWarning2Threshold: 5,
  absenceFinalThreshold: 10,
  autoAlertsEnabled: true,

  // Messaging & WhatsApp Notification Defaults
  whatsappEnabled: true,
  emailNotificationsEnabled: true,
  defaultTardinessMessageTemplate:
    'نحيطكم علماً بتأخر الطالب [اسم_الطالب] عن طابور الصباح اليوم [التاريخ] الساعة [الوقت] في أكاديمية الفجيرة العلمية الإسلامية. يرجى حثه على الالتزام بالمواعيد الرسمية للأكاديمية.',
  defaultAbsenceMessageTemplate:
    'نود إشعاركم بغياب الطالب [اسم_الطالب] اليوم [التاريخ] عن أكاديمية الفجيرة العلمية الإسلامية. يرجى تزويد إدارة الأكاديمية بالعذر المقبول خلال 3 أيام عمل من تاريخ الغياب.',
  defaultMeetingInvitationTemplate:
    'يرجى من ولي أمر الطالب [اسم_الطالب] التكرم بمراجعة إدارة أكاديمية الفجيرة العلمية الإسلامية لمقابلة المرشد الأكاديمي لمتابعة مصلحة الطالب.',

  // Official Forms & PDF Defaults
  officialHeaderEnabled: true,
  defaultApproverRole: 'مدير الأكاديمية',
  includeStampPlaceholder: true,

  // System & Interface Preferences
  interfaceFont: 'Cairo',
  compactTables: false,
};

const STORAGE_KEY = 'master_template_school_settings_v1';

interface SchoolSettingsContextType {
  schoolSettings: SchoolSettings;
  updateSchoolSettings: (updates: Partial<SchoolSettings>) => Promise<boolean>;
  isLoading: boolean;
  isCustomized: boolean;
  resetToDefaults: () => Promise<void>;
}

const SchoolSettingsContext = createContext<SchoolSettingsContextType>({
  schoolSettings: DEFAULT_MASTER_SCHOOL_SETTINGS,
  updateSchoolSettings: async () => false,
  isLoading: false,
  isCustomized: false,
  resetToDefaults: async () => {},
});

export const SchoolSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const sanitized: SchoolSettings = {
          ...DEFAULT_MASTER_SCHOOL_SETTINGS,
          ...parsed,
          schoolName: sanitizeSchoolNameAr(parsed.schoolName),
          schoolNameEn: sanitizeSchoolNameEn(parsed.schoolNameEn),
          schoolLogo: parsed.schoolLogo || DEFAULT_MASTER_SCHOOL_SETTINGS.schoolLogo,
          emirate: parsed.emirate === 'الشارقة' ? 'الفجيرة' : (parsed.emirate || 'الفجيرة'),
          email: parsed.email?.includes('alkhalil') ? 'info@fsia.edu.ae' : (parsed.email || 'info@fsia.edu.ae'),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    } catch (e) {
      console.warn('Could not read school settings from localStorage', e);
    }
    return DEFAULT_MASTER_SCHOOL_SETTINGS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCustomized, setIsCustomized] = useState(false);

  // Sync with Firestore doc 'settings/school_info' once authenticated
  useEffect(() => {
    let isMounted = true;

    async function loadFromFirestore() {
      if (!isFirebaseReady || !db) return;
      try {
        setIsLoading(true);
        const ref = doc(db, 'settings', 'school_info');
        const snap = await getDoc(ref);
        if (snap.exists() && isMounted) {
          const remoteData = (snap.data() || {}) as Partial<SchoolSettings>;
          setSchoolSettings((prev) => {
            const merged: SchoolSettings = {
              ...DEFAULT_MASTER_SCHOOL_SETTINGS,
              ...prev,
              ...remoteData,
              schoolId: remoteData.schoolId || prev.schoolId || '7001',
              schoolNumber: remoteData.schoolNumber || prev.schoolNumber || '7001',
              schoolName: sanitizeSchoolNameAr(remoteData.schoolName || prev.schoolName || DEFAULT_MASTER_SCHOOL_SETTINGS.schoolName),
              schoolNameEn: sanitizeSchoolNameEn(remoteData.schoolNameEn ?? prev.schoolNameEn ?? DEFAULT_MASTER_SCHOOL_SETTINGS.schoolNameEn),
              emirate: (remoteData.emirate === 'الشارقة' ? 'الفجيرة' : remoteData.emirate) || prev.emirate || 'الفجيرة',
              phone: remoteData.phone ?? prev.phone ?? DEFAULT_MASTER_SCHOOL_SETTINGS.phone,
              email: (remoteData.email?.includes('alkhalil') ? 'info@fsia.edu.ae' : remoteData.email) ?? prev.email ?? DEFAULT_MASTER_SCHOOL_SETTINGS.email,
              address: remoteData.address ?? prev.address ?? DEFAULT_MASTER_SCHOOL_SETTINGS.address,
              principalName: remoteData.principalName ?? prev.principalName ?? DEFAULT_MASTER_SCHOOL_SETTINGS.principalName,
              vicePrincipalName: remoteData.vicePrincipalName ?? prev.vicePrincipalName ?? DEFAULT_MASTER_SCHOOL_SETTINGS.vicePrincipalName,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            } catch {}
            return merged;
          });
          setIsCustomized(true);
        }
      } catch (err) {
        console.warn('Firestore school settings notice:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (!auth) {
      loadFromFirestore();
      return () => {
        isMounted = false;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && isMounted) {
        loadFromFirestore();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const updateSchoolSettings = useCallback(
    async (updates: Partial<SchoolSettings>): Promise<boolean> => {
      const merged: SchoolSettings = {
        ...schoolSettings,
        ...updates,
      };

      setSchoolSettings(merged);
      setIsCustomized(true);

      // Save to localStorage immediately
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (err) {
        console.error('Failed saving to localStorage', err);
      }

      // Persist to Firestore
      if (isFirebaseReady && db) {
        try {
          const ref = doc(db, 'settings', 'school_info');
          await setDoc(ref, merged, { merge: true });
        } catch (err) {
          console.warn('Failed syncing school settings to Firestore:', err);
        }
      }

      return true;
    },
    [schoolSettings]
  );

  const resetToDefaults = useCallback(async () => {
    setSchoolSettings(DEFAULT_MASTER_SCHOOL_SETTINGS);
    setIsCustomized(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    if (isFirebaseReady && db) {
      try {
        const ref = doc(db, 'settings', 'school_info');
        await setDoc(ref, DEFAULT_MASTER_SCHOOL_SETTINGS);
      } catch {}
    }
  }, []);

  const value = useMemo(
    () => ({
      schoolSettings,
      updateSchoolSettings,
      isLoading,
      isCustomized,
      resetToDefaults,
    }),
    [schoolSettings, updateSchoolSettings, isLoading, isCustomized, resetToDefaults]
  );

  return <SchoolSettingsContext.Provider value={value}>{children}</SchoolSettingsContext.Provider>;
};

export const useSchoolSettings = () => useContext(SchoolSettingsContext);
