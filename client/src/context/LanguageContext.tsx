import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'en' | 'ta';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const STORAGE_KEY = 'aegis_app_language';

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.findDoctors': 'Find Doctors',
    'nav.emrTimeline': 'EMR Timeline',
    'nav.aiAssistant': 'AI Assistant',
    'nav.doctorPortal': 'Doctor Portal',
    'nav.emergency': 'Emergency SOS',
    'nav.signIn': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.rolePatient': 'Patient',
    'nav.roleDoctor': 'Doctor',
    'nav.roleAdmin': 'Admin',
    'nav.guest': 'Guest Mode',

    // Home Hero
    'hero.badge': 'Next-Gen Healthcare Super-App • AI-Powered Clinical OS',
    'hero.title': 'Exceptional Care.',
    'hero.subtitle': 'Zero Wait Time.',
    'hero.desc': 'Connect with top verified doctors, schedule instant video visits, view longitudinal health timelines, and access non-diagnostic clinical AI guidance.',
    'hero.searchPlaceholder': 'Search doctors, symptoms, specialties, clinics...',
    'hero.searchButton': 'Search Care',
    'hero.instantVideo': 'Instant Video Consult (15 min)',
    'hero.bookInClinic': 'Book In-Clinic',
    'hero.aiAssistant': 'AI Assistant',

    // Patient Dashboard
    'dashboard.title': 'Patient Dashboard',
    'dashboard.welcome': 'Good morning',
    'dashboard.summary': 'Your cardiovascular and glycemic telemetry are tracking within acceptable parameters this week.',
    'dashboard.healthIndex': 'Health Index',
    'dashboard.healthStatus': 'Excellent Metabolic Health',
    'dashboard.bp': 'Blood Pressure',
    'dashboard.heartRate': 'Resting Heart Rate',
    'dashboard.glucose': 'Fasting Glucose',
    'dashboard.steps': 'Daily Activity',
    'dashboard.upcomingConsultations': 'Upcoming Consultations',
    'dashboard.bookNew': 'Book New',
    'dashboard.prescribedMedications': "Today's Prescribed Medications",
    'dashboard.noPrescriptions': 'No active prescriptions recorded. Consultations from your doctor will populate here automatically.',
    'dashboard.dosesTaken': 'doses taken',
    'dashboard.taken': 'TAKEN',
    'dashboard.pending': 'PENDING',
    'dashboard.prescribedBy': 'Prescribed by',

    // Doctor Workbench
    'doctor.title': 'Doctor Clinical Workbench & OPD Queue',
    'doctor.opdQueue': "Today's OPD Queue",
    'doctor.activeConsultation': 'Active Patient Consultation',
    'doctor.prescriptionComposer': 'Digital Prescription Composer',
    'doctor.addMedicine': '+ Add Medicine',
    'doctor.drugNamePlaceholder': 'Drug name e.g. Atorvastatin 10mg...',
    'doctor.dosagePlaceholder': 'Dosage (e.g. 10mg)',
    'doctor.signTransmit': 'Sign & Transmit Digital Prescription',
    'doctor.transmitting': 'Transmitting to Patient Portal...',
    'doctor.transmitted': 'Prescription Signed & Transmitted to Patient Portal ✓',
    'doctor.verified': 'Verified',

    // Login Module
    'login.title': 'AegisHealth Access Portal',
    'login.subtitle': 'Select your role to access encrypted healthcare services',
    'login.patientTab': 'Patient & Family',
    'login.doctorTab': 'Clinician & Doctor',
    'login.adminTab': 'Enterprise Admin',
    'login.phoneLabel': 'Mobile Number',
    'login.otpLabel': 'Verification Code (OTP)',
    'login.requestOtp': 'Send Code',
    'login.verifyLogin': 'Authenticate & Enter',
    'login.quickDemo': 'Quick Verified Demo Login',
    'login.switchRole': 'Switch Role',

    // Language Toggle
    'lang.english': 'English',
    'lang.tamil': 'தமிழ்',
  },
  ta: {
    // Navigation
    'nav.home': 'முகப்பு',
    'nav.dashboard': 'கட்டுப்பாட்டு மையம்',
    'nav.findDoctors': 'மருத்துவர்களைக் கண்டறியவும்',
    'nav.emrTimeline': 'மருத்துவ ஆவணங்கள்',
    'nav.aiAssistant': 'செயற்கை நுண்ணறிவு உதவியாளர்',
    'nav.doctorPortal': 'மருத்துவர் தளம்',
    'nav.emergency': 'அவசர உதவி (112)',
    'nav.signIn': 'உள்நுழைக',
    'nav.logout': 'வெளியேறு',
    'nav.rolePatient': 'நோயாளி',
    'nav.roleDoctor': 'மருத்துவர்',
    'nav.roleAdmin': 'நிர்வாகி',
    'nav.guest': 'விருந்தினர் முறை',

    // Home Hero
    'hero.badge': 'அடுத்த தலைமுறை சுகாதார தளம் • AI மருத்துவ மென்பொருள்',
    'hero.title': 'சிறந்த மருத்துவ சேவை.',
    'hero.subtitle': 'காத்திருப்பு நேரம் இல்லை.',
    'hero.desc': 'சரிபார்க்கப்பட்ட சிறந்த மருத்துவர்களுடன் இணையுங்கள், உடனடி வீடியோ ஆலோசனை பெறுங்கள் மற்றும் மருத்துவ ஆவணங்களை பாதுகாப்பாக அணுகுங்கள்.',
    'hero.searchPlaceholder': 'மருத்துவர்கள், அறிகுறிகள், சிறப்புப் பிரிவுகளைத் தேடுங்கள்...',
    'hero.searchButton': 'சேவைகளைத் தேடுங்கள்',
    'hero.instantVideo': 'உடனடி வீடியோ ஆலோசனை (15 நிமிடம்)',
    'hero.bookInClinic': 'நேரடி ஆலோசனை முன்பதிவு',
    'hero.aiAssistant': 'AI உதவியாளர்',

    // Patient Dashboard
    'dashboard.title': 'நோயாளி கட்டுப்பாட்டு மையம்',
    'dashboard.welcome': 'இனிய காலை வணக்கம்',
    'dashboard.summary': 'உங்கள் இதய மற்றும் சர்க்கரை அளவு அளவீடுகள் இந்த வாரம் சீராக கண்காணிக்கப்படுகின்றன.',
    'dashboard.healthIndex': 'உடல்நலக் குறியீடு',
    'dashboard.healthStatus': 'சிறந்த உடல்நல நிலை',
    'dashboard.bp': 'இரத்த அழுத்தம்',
    'dashboard.heartRate': 'இதயத் துடிப்பு வீதம்',
    'dashboard.glucose': 'வெறும் வயிற்று சர்க்கரை அளவு',
    'dashboard.steps': 'தினசரி நடைப்பயிற்சி',
    'dashboard.upcomingConsultations': 'வரவிருக்கும் ஆலோசனைகள்',
    'dashboard.bookNew': 'புதிய முன்பதிவு',
    'dashboard.prescribedMedications': 'இன்றைய பரிந்துரைக்கப்பட்ட மருந்துகள்',
    'dashboard.noPrescriptions': 'தற்போது மருந்துகள் எதுவும் இல்லை. மருத்துவர் பரிந்துரைத்தவுடன் இங்கு தானாகத் தோன்றும்.',
    'dashboard.dosesTaken': 'அளவுகள் உட்கொள்ளப்பட்டன',
    'dashboard.taken': 'எடுக்கப்பட்டது',
    'dashboard.pending': 'நிலுவையில்',
    'dashboard.prescribedBy': 'பரிந்துரைத்தவர்',

    // Doctor Workbench
    'doctor.title': 'மருத்துவர் ஆலோசனை தளம் மற்றும் வரிசை நிலை',
    'doctor.opdQueue': 'இன்றைய நோயாளி வரிசை',
    'doctor.activeConsultation': 'தற்போதைய நோயாளி ஆலோசனை',
    'doctor.prescriptionComposer': 'டிஜிட்டல் மருந்துச்சீட்டு உருவாக்குநர்',
    'doctor.addMedicine': '+ மருந்தைச் சேர்க்கவும்',
    'doctor.drugNamePlaceholder': 'மருந்தின் பெயர் (எ.கா. Atorvastatin 10mg)...',
    'doctor.dosagePlaceholder': 'அளவு (எ.கா. 10mg)',
    'doctor.signTransmit': 'மருந்துச்சீட்டை கையொப்பமிட்டு நோயாளிக்கு அனுப்புக',
    'doctor.transmitting': 'நோயாளி தளத்திற்கு அனுப்பப்படுகிறது...',
    'doctor.transmitted': 'மருந்துச்சீட்டு வெற்றிகரமாக அனுப்பப்பட்டது ✓',
    'doctor.verified': 'சரிபார்க்கப்பட்டது',

    // Login Module
    'login.title': 'AegisHealth உள்நுழைவு தளம்',
    'login.subtitle': 'பாதுகாப்பான சுகாதார சேவைகளை அணுக உங்கள் பிரிவைத் தேர்ந்தெடுக்கவும்',
    'login.patientTab': 'நோயாளி & குடும்பத்தினர்',
    'login.doctorTab': 'மருத்துவர் & நிபுணர்',
    'login.adminTab': 'மருத்துவமனை நிர்வாகி',
    'login.phoneLabel': 'கைபேசி எண்',
    'login.otpLabel': 'சரிபார்ப்புக் குறியீடு (OTP)',
    'login.requestOtp': 'குறியீட்டை அனுப்பு',
    'login.verifyLogin': 'சரிபார்த்து உள்நுழைக',
    'login.quickDemo': 'உடனடி சோதனை உள்நுழைவு',
    'login.switchRole': 'பிரிவை மாற்றுக',

    // Language Toggle
    'lang.english': 'English',
    'lang.tamil': 'தமிழ்',
  },
};

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'ta' ? 'ta' : 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (err) {
      console.error(err);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
  };

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] || fallback || TRANSLATIONS.en[key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
