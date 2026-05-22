import { Rocket, Sun, PlayCircle, Calendar, Zap } from 'lucide-react';

export const SUBSCRIPTION_PLANS = [
  { 
    id: 'august_review', 
    name: 'عرض المراجعة شهر أوت', 
    period: 'شهر أوت', 
    price: '50', 
    description: 'مراجعة شاملة للمكتسبات والتحضير للسنة الجديدة (حصص مباشرة + تسجيلات)',
    icon: Calendar,
    color: 'red',
    featured: true
  },
  { 
    id: 'recordings_yearly',
    name: 'عرض التسجيلات السنوي',
    price: '50',
    period: 'سنة كاملة',
    type: 'recordings',
    description: 'مشاهدة التسجيلات فقط (لا يشمل الحصص المباشرة)',
    icon: PlayCircle
  },
  { 
    id: 'trimester1', 
    name: 'الثلاثي الأول', 
    period: 'سبتمبر ← ديسمبر', 
    dates: '1 سبتمبر — 22 ديسمبر 2025',
    price: '100', 
    sessions: '~24 حصة مباشرة',
    featured: true,
    icon: Rocket,
    color: 'blue'
  },
  { 
    id: 'trimester2', 
    name: 'الثلاثي الثاني', 
    period: 'ديسمبر ← مارس', 
    dates: '23 ديسمبر 2025 — 22 مارس 2026',
    price: '90', 
    sessions: '~22 حصة مباشرة',
    featured: false,
    icon: Calendar,
    color: 'emerald'
  },
  { 
    id: 'trimester3', 
    name: 'الثلاثي الثالث', 
    period: 'مارس ← جوان', 
    dates: '23 مارس — 15 جوان 2026',
    price: '80', 
    sessions: '~18 حصة مباشرة',
    featured: false,
    icon: Zap,
    color: 'amber'
  },
  { 
    id: 'full_year', 
    name: 'السنة كاملة (تخفيض)', 
    period: 'سبتمبر ← جوان', 
    dates: '1 سبتمبر 2025 — 15 جوان 2026',
    price: '240', 
    sessions: '~64 حصة مباشرة',
    featured: false,
    icon: Sun,
    color: 'purple'
  },
  {
    id: 'monthly',
    name: 'الاشتراك الشهري',
    price: '40',
    period: '30 يوم',
    type: 'live',
    icon: Calendar
  }
];

export const PAYMENT_METHODS = [
  { id: 'bank', name: 'حساب بنكي (Bank)', details: 'BIAT: 08 000 000 000000 000 00' },
  { id: 'ccp', name: 'حساب بريدي (CCP)', details: 'CCP: 17 000 000 000000 000 00' },
  { id: 'd17', name: 'محفظة D17', details: 'رقم الهاتف المربوط: 20 000 000' },
  { id: 'mandat', name: 'حوالة بريدية (Mandat)', details: 'الاسم: أكاديمية مسار التميز' },
  { id: 'edinar', name: 'بطاقة e-Dinar', details: 'رقم البطاقة: 0000 0000 0000 0000' }
];

export const TUNISIAN_GOVERNORATES = [
  "أريانة",
  "باجة",
  "بن عروس",
  "بنزرت",
  "قابس",
  "قفصة",
  "جندوبة",
  "القيروان",
  "القصرين",
  "قبلي",
  "الكاف",
  "المهدية",
  "منوبة",
  "مدنين",
  "المنستير",
  "نابل",
  "صفاقس",
  "سيدي بوزيد",
  "سليانة",
  "سوسة",
  "تطاوين",
  "توزر",
  "تونس",
  "زغوان"
];

