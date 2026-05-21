import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, limit } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  Users, 
  History, 
  Loader2, 
  Calendar,
  Wallet,
  Bell,
  Trash2,
  AlertCircle,
  Video,
  Search,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Lock,
  ExternalLink,
  Plus,
  Receipt,
  Upload,
  Image as ImageIcon,
  Rocket,
  LayoutDashboard,
  CreditCard
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import CountdownTimer from '../common/CountdownTimer';

import { SUBSCRIPTION_PLANS, PAYMENT_METHODS } from '@/src/constants';

interface Props {
  activeTab: string;
  userData: any;
  user: User;
}

export default function ParentOverview({ activeTab, userData, user }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [children, setChildren] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, any[]>>({});
  const [childSchedules, setChildSchedules] = useState<Record<string, any>>({});
  const [childSessions, setChildSessions] = useState<Record<string, any[]>>({});
  const [myReceipts, setMyReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [childIdInput, setChildIdInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [walletData, setWalletData] = useState<any>(null);
  const [receiptFile, setReceiptFile] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [selectedChildForReceipt, setSelectedChildForReceipt] = useState('');
  const [selectedPlanForSub, setSelectedPlanForSub] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Snapshot for parent's wallet
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) setWalletData(snap.data());
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `wallets/${user.uid}`);
    });

    // 2. Snapshot for parentChildren links
    const unsubChildren = onSnapshot(query(collection(db, 'parentChildren'), where('parentId', '==', user.uid)), async (snap) => {
      setLoading(true);
      const list = [];
      const att: Record<string, any[]> = {};
      const schedules: Record<string, any> = {};
      const sessions: Record<string, any[]> = {};

      for (const d of snap.docs) {
        const link = d.data();
        const deterministicId = `${user.uid}_${link.childId}`;

        // Migrate old random IDs to deterministic ones for Firestore Rules efficiency
        if (d.id !== deterministicId) {
          console.info(`Migrating link ${d.id} to deterministic ID ${deterministicId}`);
          try {
            await setDoc(doc(db, 'parentChildren', deterministicId), {
              ...link,
              updatedAt: serverTimestamp()
            });
            await deleteDoc(doc(db, 'parentChildren', d.id));
            continue; // The snapshot will trigger again
          } catch (err) {
            console.error('Migration failed:', err);
          }
        }

        try {
          const cSnap = await getDoc(doc(db, 'users', link.childId));
          if (cSnap.exists()) {
            const childData = cSnap.data();
            list.push({ linkId: d.id, ...link, childData });

            const isChildSub = childData.subscriptionStatus === 'active';

            if (isChildSub) {
              // Fetch attendance
              try {
                const attQ = query(
                  collection(db, 'attendance'), 
                  where('userId', '==', link.childId),
                  limit(50)
                );
                const attSnap = await getDocs(attQ);
                att[link.childId] = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              } catch (err) {
                console.warn(`Failed to fetch attendance for ${link.childId}:`, err);
              }

              // Fetch group/schedule
              if (childData.group) {
                try {
                  const gQuery = query(collection(db, 'groups'), where('name', '==', childData.group));
                  const gSnap = await getDocs(gQuery);
                  if (!gSnap.empty) {
                    const gInfo = { id: gSnap.docs[0].id, ...gSnap.docs[0].data() };
                    schedules[link.childId] = gInfo;

                    const sQuery = query(
                      collection(db, 'teacherSessions'),
                      where('groupId', '==', gInfo.id),
                      where('status', 'in', ['scheduled', 'completed'])
                    );
                    const sSnap = await getDocs(sQuery);
                    sessions[link.childId] = sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                  }
                } catch (err) {
                  console.warn(`Failed to fetch schedule for ${link.childId}:`, err);
                }
              }
            }
          }
        } catch (err) {
          console.error(`Error syncing data for child ${link.childId}:`, err);
        }
      }
      
      setChildren(list);
      setAttendanceData(att);
      setChildSchedules(schedules);
      setChildSessions(sessions);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'parentChildren');
    });

    // 3. Snapshot for parent's uploaded receipts
    const unsubReceipts = onSnapshot(query(collection(db, 'receipts'), where('parentId', '==', user.uid)), (snap) => {
      setMyReceipts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'receipts');
    });

    const planId = searchParams.get('planId');
    if (planId) {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (plan) setSelectedPlanForSub(plan);
    }

    return () => {
      unsubWallet();
      unsubChildren();
      unsubReceipts();
    };
  }, [searchParams, user?.uid]);

  // Removed old loadWallet and loadChildren logic as it's now handled in the useEffect above

  const handleFileUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dv5xhvkr3';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'masartamayoz-content';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.secure_url) {
        setReceiptFile(data.secure_url);
        toast.success('تم رفع الصورة بنجاح');
      }
    } catch (err) {
      toast.error('فشل رفع الملف');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !selectedChildForReceipt) {
      toast.error('يرجى اختيار التلميذ ورفع صورة الوصل');
      return;
    }

    setUploadingReceipt(true);
    try {
      const child = children.find(c => c.childId === selectedChildForReceipt);
      await addDoc(collection(db, 'receipts'), {
        userId: selectedChildForReceipt,
        parentId: user.uid,
        userName: child?.childData?.displayName || 'تلميذ',
        userEmail: child?.childData?.email || '',
        parentName: userData?.displayName || user.displayName,
        receiptURL: receiptFile,
        planName: selectedPlanForSub?.name || 'اشتراك (عبر الولي)',
        planId: selectedPlanForSub?.id || 'general',
        price: selectedPlanForSub?.price || '0',
        paymentMethod: selectedMethod,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      toast.success('تم إرسال الوصل للمراجعة');
      setReceiptFile('');
      setSelectedChildForReceipt('');
      setSelectedPlanForSub(null);
      setSelectedMethod('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'receipts');
    } finally {
      setUploadingReceipt(false);
    }
  };


  const handleLinkChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childIdInput.trim()) return;
    
    setLinking(true);
    setLinkError('');
    try {
      // 1. Check if student exists by ID
      let studentSnap = null;
      try {
        studentSnap = await getDoc(doc(db, 'users', childIdInput.trim()));
      } catch (err: any) {
        if (err.code === 'permission-denied') {
           console.warn('Direct UID lookup failed (permission denied), falling back to search');
        } else {
           throw err;
        }
      }
      
      // 1b. If not found or permission denied, try finding by email
      if (!studentSnap || !studentSnap.exists()) {
        const qEmail = query(collection(db, 'users'), where('email', '==', childIdInput.trim()), where('userType', '==', 'student'));
        const emailSnap = await getDocs(qEmail);
        if (!emailSnap.empty) {
          studentSnap = emailSnap.docs[0];
        }
      }

      if (!studentSnap || !studentSnap.exists()) {
        setLinkError('رقم التلميذ أو البريد غير صحيح أو ليس لحساب تلميذ');
        return;
      }
      
      const studentData = studentSnap.data();
      const studentId = studentSnap.id;

      if (studentData.userType !== 'student') {
        setLinkError('هذا الحساب ليس لحساب تلميذ');
        return;
      }

      // 2. Check if already linked
      const q = query(
        collection(db, 'parentChildren'), 
        where('parentId', '==', user.uid),
        where('childId', '==', studentId)
      );
      const linkSnap = await getDocs(q);
      if (!linkSnap.empty) {
        setLinkError('هذا التلميذ مرتبط بك بالفعل');
        return;
      }

      // 3. Create link with deterministic ID for efficiency in rules
      const linkId = `${user.uid}_${studentId}`;
      await setDoc(doc(db, 'parentChildren', linkId), {
        parentId: user.uid,
        childId: studentId,
        createdAt: serverTimestamp() // Match blueprint
      });

      toast.success('تم ربط الحساب بنجاح');
      setChildIdInput('');
      setShowLinkModal(false);
      // loadChildren(); - no longer needed with onSnapshot
    } catch (err: any) {
      console.error('Linking Error:', err);
      if (err.code === 'permission-denied') {
        setLinkError('فشل الربط بسبب نقص الصلاحيات. يرجى التأكد من أن حسابك مصنف كـ "ولي أمر".');
      } else {
        setLinkError('حدث خطأ أثناء محاولة الربط - ' + (err.message || 'خطأ مجهول'));
      }
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء متابعة هذا التلميذ؟')) return;
    try {
      await deleteDoc(doc(db, 'parentChildren', linkId));
      // loadChildren(); - no longer needed with onSnapshot
    } catch (err) {
      console.error(err);
    }
  };

  const getLevelLabel = (lvl: string) => {
    const labels: Record<string, string> = {
      '7': 'سابعة أساسي',
      '8': 'ثامنة أساسي',
      '9': 'تاسعة أساسي',
      '1sec': '1 ثانوي',
      '2sec': '2 ثانوي',
      '3sec': '3 ثانوي',
      '4sec': 'باكالوريا'
    };
    return labels[lvl] || lvl;
  };

  const renderChildren = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-brand">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-blue-dark">منظوري المتابعون</h3>
                <p className="text-gray-400 text-sm font-bold">تابع تقدم أبنائك الدراسي في لحظة.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => {}} 
                disabled={loading}
                className="flex items-center justify-center p-3 rounded-2xl border border-gray-100 text-gray-400 hover:text-blue-dark hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                title="تحديث البيانات"
              >
                <Clock size={20} className={loading ? "animate-spin" : ""} />
              </button>
              <button 
                onClick={() => setShowLinkModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-blue-dark px-6 py-3 text-sm font-black text-white hover:bg-[#0A0D14] shadow-xl shadow-blue-900/10 transition-all active:scale-95"
              >
                <Plus size={18} />
                ربط تلميذ جديد
              </button>
            </div>
        </div>
        
        {loading ? (
            <div className="py-24 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-gray-100" />
              <p className="mt-4 text-gray-300 font-bold italic">جاري تحميل البيانات...</p>
            </div>
        ) : children.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {children.map(c => (
              <div key={c.linkId} className="group relative rounded-[32px] border border-gray-50 bg-gray-50/30 p-8 transition-all hover:bg-white hover:border-blue-light/10 hover:shadow-2xl hover:shadow-blue-900/5">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-xl shadow-blue-900/5 border border-gray-100 text-blue-brand font-black text-2xl group-hover:scale-110 transition-transform text-center uppercase">
                      {c.childData?.displayName?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-blue-dark text-lg truncate">{c.childData?.displayName || 'تلميذ مجهول'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[0.7rem] bg-gray-100 px-2.5 py-0.5 rounded-full text-gray-500 font-black">{getLevelLabel(c.childData?.level)}</span>
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          c.childData?.subscriptionStatus === 'active' ? "bg-emerald-500" : "bg-amber-500"
                        )} />
                        <span className={cn(
                          "text-[0.7rem] font-bold",
                          c.childData?.subscriptionStatus === 'active' ? "text-emerald-500" : "text-amber-500"
                        )}>{c.childData?.subscriptionStatus === 'active' ? 'مشترك' : 'غير مشترك'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {c.childData?.subscriptionStatus === 'active' && c.childData?.subscriptionExpiry && (
                    <div className="mt-4 p-5 rounded-[22px] bg-white border border-gray-100 shadow-sm relative overflow-hidden group/timer">
                      <div className="absolute right-0 top-0 h-full w-1.5 bg-gold-brand/30" />
                      <CountdownTimer expiryDate={c.childData.subscriptionExpiry} />
                    </div>
                  )}
                  
                  <div className="space-y-4 pt-6 border-t border-gray-100/50">
                    <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-gray-400">الحضور (آخر 30 يوم)</span>
                       <span className="text-xs font-black text-blue-dark">{attendanceData[c.childId]?.length || 0} حصص</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                       <div className="h-full bg-blue-brand transition-all duration-1000" style={{ width: `${Math.min((attendanceData[c.childId]?.length || 0) * 10, 100)}%` }} />
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button 
                      onClick={() => {
                        const childId = c.childId;
                        const childName = c.childData?.displayName || c.childData?.firstName || 'التلميذ';
                        setSelectedChildForReceipt(childId);
                        toast.info(`تم اختيار ${childName} للاشتراك. سنتوجه للمحفظة.`);
                        setSearchParams({ tab: 'wallet' });
                      }}
                      className="flex-1 rounded-2xl bg-[#0A0D14] py-3 text-[0.8rem] font-black text-white hover:bg-blue-dark transition-all flex items-center justify-center gap-2"
                    >
                      <Rocket size={14} />
                      اشترك الآن
                    </button>
                    <button className="flex-1 rounded-2xl bg-white border border-gray-100 py-3 text-[0.8rem] font-black text-gray-600 hover:border-blue-light hover:text-blue-light transition-all">التفاصيل</button>
                  </div>
                  
                  <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleUnlink(c.linkId)}
                      className="h-8 w-8 rounded-full border border-red-50 bg-white shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                    >
                       <Trash2 size={14} />
                    </button>
                     <div className="h-8 w-8 rounded-full border border-gray-50 flex items-center justify-center text-gray-200">
                        <ArrowRight size={14} className="ltr:rotate-0 rtl:rotate-180" />
                     </div>
                  </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center text-gray-400 border-2 border-dashed border-gray-50 rounded-[40px]">
            <Users size={64} className="mx-auto mb-6 opacity-5" />
            <h3 className="text-xl font-extrabold text-gray-600">اربط حساب الأبناء الآن</h3>
            <p className="mt-2 text-sm max-w-sm mx-auto">لم تضف أي تلميذ بعد لمتابعته. قم بربط حساب الأبناء لمتابعة مسارهم التعليمي، حصصهم، ونتائجهم.</p>
            <button 
              onClick={() => setShowLinkModal(true)}
              className="mt-10 inline-flex items-center gap-2 rounded-2xl border-2 border-blue-light px-8 py-3 text-sm font-black text-blue-light hover:bg-blue-light hover:text-white transition-all"
            >
               <Plus size={18} />
               ابدأ الربط الآن
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {activeTab === 'overview' ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Welcome Dashboard Banner */}
           <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-[#0A0D14] to-blue-dark p-6 sm:p-10 text-white shadow-2xl">
              <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-blue-light/10 blur-[100px]" />
              <div className="absolute left-0 bottom-0 h-48 w-48 -translate-x-1/4 translate-y-1/4 rounded-full bg-gold-brand/5 blur-[80px]" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 text-center md:text-right">
                 <div>
                    <h1 className="text-2xl sm:text-3xl font-black mb-2 text-white">لوحة تحكم الولي 👨‍👩‍👧‍👦</h1>
                    <p className="text-blue-light/80 font-bold max-w-md text-sm sm:text-base">أهلاً بك أستاذ {userData?.displayName?.split(' ')[0]}، تابع مسار تفوق أطفالك في مكان واحد.</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-[24px] text-center">
                       <p className="text-2xl font-black text-gold-brand">{children.length}</p>
                       <p className="text-[0.6rem] font-bold text-white/40 uppercase tracking-widest mt-1">تلاميذ متابعون</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-[24px] text-center">
                       <p className="text-2xl font-black text-emerald-400">0</p>
                       <p className="text-[0.6rem] font-bold text-white/40 uppercase tracking-widest mt-1">تنبيهات نشطة</p>
                    </div>
                 </div>
              </div>
           </div>

           {renderChildren()}
           
           <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
                 <h3 className="text-lg font-black text-blue-dark mb-8 flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                     <History size={20} />
                   </div>
                   آخر النشاطات
                 </h3>
                 <div className="flex flex-col items-center justify-center py-16 text-center text-gray-300">
                    <History size={40} className="mb-4 opacity-5" />
                    <p className="text-sm italic font-medium">لا توجد أي نشاطات مسجلة حالياً</p>
                 </div>
              </div>
              
              <div className="space-y-6">
                 <div className="rounded-[32px] bg-[#0A0D14] p-8 text-white relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 opacity-20 transition-transform group-hover:scale-110 duration-500">
                       <ShieldCheck size={100} />
                    </div>
                    <h4 className="text-lg font-black mb-2 relative z-10">حماية وتفوق</h4>
                    <p className="text-xs font-medium text-white/60 mb-6 leading-relaxed relative z-10">نحن نضمن بيئة تعليمية آمنة ومحفزة تضمن تفوق أبنائكم بإشراف أفضل الأساتذة.</p>
                    <Link to="/contact" className="inline-flex items-center gap-2 text-xs font-black text-blue-light hover:text-white transition-all relative z-10">
                       تواصل مع الدعم التربوي
                       <ArrowRight size={14} className="ltr:rotate-0 rtl:rotate-180" />
                    </Link>
                 </div>

                 <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
                    <h4 className="text-sm font-black text-blue-dark mb-4 flex items-center gap-2">
                       <Bell size={16} className="text-red-500" />
                       تنبيهات هامة
                    </h4>
                    <div className="space-y-4">
                       <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-50">
                          <p className="text-[0.7rem] font-bold text-blue-dark leading-relaxed">يرجى التأكد من ربط حسابات أبنائك بشكل صحيح للبدء في تلقي التقارير.</p>
                       </div>
                       <button className="w-full text-center py-2 text-[0.65rem] font-black text-gray-400 group hover:text-blue-brand transition-all flex items-center justify-center gap-1">
                          مشاهدة جميع التنبيهات
                          <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : activeTab === 'wallet' ? (
        <div className="rounded-[32px] border border-gray-100 bg-white p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-brand">
                  <Wallet size={22} />
                </div>
                <h3 className="text-xl font-black text-blue-dark">المحفظة والاشتراكات</h3>
              </div>
           </div>

           <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-1 space-y-6">
                 <div className="bg-[#0A0D14] p-8 rounded-[28px] text-white shadow-2xl relative overflow-hidden group">
                   <p className="text-[0.65rem] font-black text-blue-light/60 uppercase tracking-widest mb-1">رصيد الولي</p>
                   <div className="flex items-baseline gap-2">
                     <p className="text-4xl font-black text-white">{walletData?.balance || '0.000'}</p>
                     <p className="text-lg font-bold text-white/50">د.ت</p>
                   </div>
                 </div>

                 <div className="rounded-2xl border border-gray-100 p-6 bg-gray-50/50">
                    <h4 className="text-sm font-black text-blue-dark mb-4">حالة اشتراك الأبناء</h4>
                    <div className="space-y-4">
                       {children.map(c => (
                         <div key={c.childId} className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-600">{c.childData.displayName}</span>
                            <div className="flex items-center gap-2">
                               <div className={cn(
                                 "h-2 w-2 rounded-full",
                                 c.childData.subscriptionStatus === 'active' ? "bg-emerald-500" : "bg-amber-500"
                               )} />
                               <span className="text-[0.65rem] font-black">
                                 {c.childData.subscriptionStatus === 'active' ? 'نشط' : 'غير نشط'}
                               </span>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                 {/* Plan Selection */}
                 <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                    <h4 className="text-lg font-black text-blue-dark mb-6 flex items-center gap-2">
                       <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-dark text-white text-xs font-black">2</span>
                       اختر العرض المناسب للمنظور
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                       {SUBSCRIPTION_PLANS.map(p => (
                         <button
                           key={p.id}
                           onClick={() => setSelectedPlanForSub(p)}
                           className={cn(
                             "p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between group",
                             selectedPlanForSub?.id === p.id ? "border-blue-brand bg-blue-50/50" : "border-gray-50 hover:border-gray-200"
                           )}
                         >
                            <div className="flex items-center gap-3">
                               <div className={cn(
                                 "h-10 w-10 rounded-xl flex items-center justify-center",
                                 selectedPlanForSub?.id === p.id ? "bg-blue-brand text-white" : "bg-gray-50 text-gray-400"
                               )}>
                                  <p.icon size={20} />
                               </div>
                               <div className="flex flex-col">
                                  <p className="text-xs font-black text-blue-dark">{p.name}</p>
                                  <p className="text-[0.65rem] text-gray-500 font-bold">{p.price} د.ت • {p.period}</p>
                                  {p.description && <p className="text-[0.62rem] text-blue-light/70 mt-1 max-w-[180px] leading-tight text-right">{p.description}</p>}
                               </div>
                            </div>
                            {selectedPlanForSub?.id === p.id && <CheckCircle2 size={18} className="text-blue-brand" />}
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Payment Method & Upload */}
                 {selectedPlanForSub && (
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm bg-gray-50/20">
                       <h4 className="text-lg font-black text-blue-dark mb-2 flex items-center gap-2">
                          <CreditCard className="text-blue-light" size={20} /> دفع الاشتراك
                       </h4>
                       <p className="text-xs text-gray-500 mb-6">يرجى اختيار وسيلة الدفع المناسبة ورفع صورة الوصل.</p>

                       <div className="grid gap-4 mb-8">
                          {PAYMENT_METHODS.map(m => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMethod(m.id)}
                              className={cn(
                                "p-4 rounded-2xl border-2 text-right transition-all group relative overflow-hidden bg-white",
                                selectedMethod === m.id ? "border-blue-brand bg-blue-50/30" : "border-gray-50"
                              )}
                            >
                               <div className="relative z-10 flex items-center justify-between">
                                  <div>
                                     <p className="text-xs font-black text-blue-dark">{m.name}</p>
                                     <p className="text-[0.65rem] text-blue-light/70 font-bold mt-0.5">{m.details}</p>
                                  </div>
                                  {selectedMethod === m.id && <CheckCircle2 size={20} className="text-blue-brand" />}
                               </div>
                            </button>
                          ))}
                       </div>

                       <form onSubmit={handleUploadReceipt} className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">منظوري المراد دفع اشتراكه</label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                 {children.map(c => (
                                   <button
                                     key={c.childId}
                                     type="button"
                                     onClick={() => setSelectedChildForReceipt(c.childId)}
                                     className={cn(
                                       "p-2.5 rounded-xl border-2 text-[0.7rem] font-black transition-all flex flex-col items-center gap-1.5 relative",
                                       selectedChildForReceipt === c.childId 
                                         ? "border-blue-brand bg-blue-50 text-blue-dark shadow-sm" 
                                         : "border-gray-50 bg-white text-gray-500 hover:border-gray-200"
                                     )}
                                   >
                                     <div className={cn(
                                       "h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm",
                                       selectedChildForReceipt === c.childId ? "bg-blue-brand text-white" : "bg-gray-100 text-blue-brand"
                                     )}>
                                       {c.childData?.displayName?.charAt(0) || '؟'}
                                     </div>
                                     <span className="truncate w-full text-center">{c.childData?.displayName || 'تلميذ'}</span>
                                   </button>
                                 ))}
                              </div>
                          </div>

                          <div className="relative group">
                             <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-light/50 transition-all cursor-pointer bg-white">
                                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-brand">
                                   <ImageIcon size={20} />
                                </div>
                                <input 
                                  type="text" 
                                  placeholder="رابط صورة الوصل" 
                                  value={receiptFile}
                                  onChange={(e) => setReceiptFile(e.target.value)}
                                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-blue-dark"
                                />
                                <button 
                                  type="button" 
                                  onClick={() => document.getElementById('parent-receipt-upload')?.click()}
                                  className="text-xs bg-blue-50 px-3 py-2 rounded-xl text-blue-brand hover:bg-blue-100 transition-all font-bold"
                                >
                                  {uploadingReceipt ? <Loader2 size={12} className="animate-spin" /> : 'رفع'}
                                </button>
                                <input 
                                  id="parent-receipt-upload"
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={handleFileUploadReceipt}
                                />
                             </div>
                          </div>

                          <button 
                            type="submit"
                            disabled={uploadingReceipt || !receiptFile || !selectedChildForReceipt || !selectedMethod}
                            className="w-full py-4 rounded-2xl bg-blue-brand text-white font-black text-sm shadow-xl shadow-blue-900/10 hover:bg-blue-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                             {uploadingReceipt ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                             تأكيد الدفع للمراجعة
                          </button>
                       </form>
                    </div>
                 )}
              </div>
           </div>
        </div>
      ) : activeTab === 'absences' || activeTab === 'schedule' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-10">
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm",
                activeTab === 'absences' ? "bg-red-50 text-red-500 border-red-100" : "bg-blue-50 text-blue-500 border-blue-100"
              )}>
                 {activeTab === 'absences' ? <AlertCircle size={32} /> : <Calendar size={32} />}
              </div>
              <div>
                <h3 className="text-3xl font-black text-blue-dark">
                  {activeTab === 'absences' ? 'سجل الحضور والمتابعة' : 'الجداول الأسبوعية للأبناء'}
                </h3>
                <p className="text-gray-400 font-bold text-sm">
                  {activeTab === 'absences' 
                    ? 'اطلع على سجل حضور أبنائك للحصص المباشرة.'
                    : 'يمكنك هنا تصفح الجداول الدراسية لكل واحد من أبنائك.'}
                </p>
              </div>
            </div>

            {activeTab === 'absences' ? (
              <div className="overflow-x-auto rounded-3xl border border-gray-100 pb-2">
                <table className="w-full text-right min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">التلميذ</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">المجموعة</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">التاريخ والوقت</th>
                      <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.values(attendanceData).flat().sort((a: any, b: any) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)).length > 0 ? (
                      Object.values(attendanceData).flat().sort((a: any, b: any) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)).map((record: any) => (
                        <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-5">
                            <span className="text-sm font-black text-blue-dark">{record.userName}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-xs font-bold text-gray-500">{record.groupName}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-blue-dark">
                                {record.timestamp?.toDate().toLocaleDateString('ar-TN')}
                              </span>
                              <span className="text-[0.65rem] font-bold text-gray-400">
                                {record.timestamp?.toDate().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[0.68rem] font-black">
                              <CheckCircle2 size={12} />
                              حاضر
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-gray-300 italic font-bold">
                          لا توجد سجلات حضور حالياً
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-12">
                {children.map(child => {
                  const scheduleMap = childSchedules[child.childId];
                  const childSessionsList = childSessions[child.childId] || [];
                  
                  return (
                    <div key={child.childId} className="space-y-6">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-dark flex items-center justify-center text-white text-[0.65rem] font-black">
                            {child.childData?.displayName?.charAt(0) || '؟'}
                          </div>
                          <h4 className="font-extrabold text-blue-dark">جدول التلميذ: {child.childData?.displayName}</h4>
                        </div>
                        {child.childData?.subscriptionStatus !== 'active' && (
                          <span className="flex items-center gap-1 text-[0.65rem] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                             مقفل - اشتراك غير نشط
                          </span>
                        )}
                      </div>

                      {child.childData?.subscriptionStatus !== 'active' ? (
                        <div className="p-12 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                          <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-4">
                            <Lock size={24} />
                          </div>
                          <p className="text-sm font-black text-blue-dark">محتوى مقفل 🔒</p>
                          <p className="text-[0.7rem] text-gray-400 font-bold mt-1 max-w-xs mx-auto leading-relaxed">
                            يتطلب الوصول إلى جدول الحصص المباشرة وسجل الحضور تفعيل اشتراك التلميذ أولاً.
                          </p>
                          <button 
                            onClick={() => {
                              setSelectedChildForReceipt(child.childId);
                              setSearchParams({ tab: 'wallet' });
                            }}
                            className="mt-6 text-xs font-black text-blue-brand hover:underline flex items-center gap-1 mx-auto"
                          >
                            تفعيل الاشتراك الآن
                            <ArrowRight size={14} className="ltr:rotate-0 rtl:rotate-180" />
                          </button>
                        </div>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Weekly Schedule */}
                          <div className="space-y-4">
                            <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-[0.1em] px-2 flex items-center gap-2">
                              <Clock size={12} /> الجدول الأسبوعي الأساسي
                            </p>
                            {scheduleMap?.schedule && scheduleMap.schedule.length > 0 ? (
                              <div className="grid gap-3">
                                {scheduleMap.schedule.map((s: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100/50">
                                    <span className="text-[0.7rem] font-black text-blue-dark bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">{s.day}</span>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[0.7rem] font-bold text-gray-500">{s.startTime}</span>
                                       <span className="text-gray-300">←</span>
                                       <span className="text-[0.7rem] font-bold text-gray-500">{s.endTime}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 italic">
                                 لا يوجد جدول أسبوعي محدد لهذه المجموعة
                              </div>
                            )}
                          </div>

                          {/* Recent/Upcoming Live Sessions */}
                          <div className="space-y-4">
                            <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-[0.1em] px-2 flex items-center gap-2">
                              <Video size={12} /> الحصص المباشرة والروابط
                            </p>
                            <div className="space-y-3">
                              {childSessionsList.length > 0 ? (
                                childSessionsList
                                  .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
                                  .slice(0, 3) // Only last 3/upcoming for the parent view
                                  .map((s: any) => (
                                  <div key={s.id} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm relative overflow-hidden group">
                                    <div className="flex items-center justify-between mb-2">
                                       <span className={cn(
                                         "text-[0.6rem] font-black px-2 py-0.5 rounded-full uppercase",
                                         s.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-brand"
                                       )}>
                                         {s.status === 'completed' ? 'مكتملة' : 'قادمة'}
                                       </span>
                                       <span className="text-[0.6rem] text-gray-400 font-bold">
                                         {new Date(s.dateTime).toLocaleDateString('ar-TN')}
                                       </span>
                                    </div>
                                    <h5 className="text-xs font-black text-blue-dark truncate">{s.title || 'حصة مباشرة'}</h5>
                                    <div className="mt-4 flex items-center justify-between">
                                       <span className="text-[0.65rem] font-bold text-gray-400">{new Date(s.dateTime).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}</span>
                                       {s.status === 'scheduled' && s.meetLink && (() => {
                                         const sessionTime = new Date(s.dateTime).getTime();
                                         const now = Date.now();
                                         const fifteenMinutesInMs = 15 * 60 * 1000;
                                         const canJoin = now >= (sessionTime - fifteenMinutesInMs);
                                         
                                         if (!canJoin) {
                                           return (
                                             <span className="text-[0.55rem] font-bold text-amber-600 flex items-center gap-1">
                                               <Lock size={10} /> الرابط يفتح قريباً
                                             </span>
                                           );
                                         }
                                         
                                         return (
                                           <a 
                                             href={s.meetLink} 
                                             target="_blank" 
                                             className="text-[0.65rem] font-black text-blue-light hover:underline flex items-center gap-1"
                                           >
                                             <ExternalLink size={10} /> رابط الحصة
                                           </a>
                                         );
                                       })()}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400 italic">
                                  لا توجد حصص مباشرة مسجلة حالياً
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'children' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {renderChildren()}
        </div>
      ) : null}

      <AnimatePresence>
        {showLinkModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !linking && setShowLinkModal(false)}
              className="absolute inset-0 bg-blue-dark/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[480px] rounded-[32px] bg-white p-10 shadow-2xl overflow-hidden shadow-blue-900/20"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-10 -mt-10">
                 <Plus size={160} />
              </div>
              <h3 className="mb-2 text-2xl font-black text-blue-dark">ربط تلميذ جديد</h3>
              <p className="mb-8 text-gray-400 text-sm font-bold">أدخل "رمز التلميذ" المتاح في صفحة الملف الشخصي لدى ابنك.</p>
              
              <form onSubmit={handleLinkChild} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">رمز التلميذ (Student Code)</label>
                  <div className="relative">
                    <input 
                      required
                      value={childIdInput}
                      onChange={e => setChildIdInput(e.target.value)}
                      placeholder="أدخل الرمز هنا..."
                      className="w-full rounded-2xl border-none bg-gray-50 px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all shadow-inner"
                    />
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  </div>
                </div>

                {linkError && (
                  <p className="text-xs font-black text-red-500 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {linkError}
                  </p>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    disabled={linking}
                    onClick={() => setShowLinkModal(false)}
                    className="flex-1 rounded-2xl border border-gray-100 py-4 text-sm font-black text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button 
                    disabled={linking || !childIdInput}
                    className="flex-[2] rounded-2xl bg-blue-light py-4 text-sm font-black text-white hover:bg-blue-brand shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {linking ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    ربط الحساب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
