import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, firebaseConfig } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, deleteDoc, serverTimestamp, onSnapshot, limit } from 'firebase/firestore';
import { User, getAuth, createUserWithEmailAndPassword, signOut, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
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
  CreditCard,
  Copy,
  Share2,
  X,
  Info,
  BookOpen,
  FileText,
  Play,
  Download,
  Award,
  Sun,
  File
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import CountdownTimer from '../common/CountdownTimer';
import { useContentAccess } from '@/src/lib/accessControl';

import { SUBSCRIPTION_PLANS, PAYMENT_METHODS, TUNISIAN_GOVERNORATES } from '@/src/constants';

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
  const [showCreateChildModal, setShowCreateChildModal] = useState(false);
  const [newChild, setNewChild] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    userType: 'student' as const,
    subject: 'الرياضيات',
    level: '7',
    address: '',
    group: '',
    birthDate: '',
    wilaya: ''
  });
  const [createdChildCredentials, setCreatedChildCredentials] = useState<{
    displayName: string;
    email: string;
    phone: string;
    password: string;
  } | null>(null);
  const [selectedChildForDetails, setSelectedChildForDetails] = useState<any>(null);
  const [detailsModalTab, setDetailsModalTab] = useState<'info' | 'attendance' | 'schedule'>('info');

  // Lessons tab states
  const [selectedChildIdForLessons, setSelectedChildIdForLessons] = useState<string>('');
  const [lessonsType, setLessonsType] = useState<string>('lesson');
  const [lessonsContent, setLessonsContent] = useState<any[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState<boolean>(false);
  const [lessonsSearchTerm, setLessonsSearchTerm] = useState<string>('');
  const [lessonsViewerItem, setLessonsViewerItem] = useState<any | null>(null);
  const [lessonsActiveRes, setLessonsActiveRes] = useState<{type: 'video' | 'pdf', url: string, name: string} | null>(null);

  // Default the child ID when children are loaded
  useEffect(() => {
    if (children.length > 0 && !selectedChildIdForLessons) {
      setSelectedChildIdForLessons(children[0].childId);
    }
  }, [children, selectedChildIdForLessons]);

  // Compute active child based on chosen ID
  const activeLessonsChild = children.find(c => c.childId === selectedChildIdForLessons) || children[0];

  // Memoize childUserObj for useContentAccess
  const childUserObj = React.useMemo(() => {
    if (!activeLessonsChild) return null;
    return {
      ...activeLessonsChild.childData,
      uid: activeLessonsChild.childId,
      id: activeLessonsChild.childId
    };
  }, [activeLessonsChild]);

  const { isLevelAccessible, hasAccess } = useContentAccess(childUserObj);

  // Helper function to extract YouTube ID
  const extractYTId = (url: string) => {
    const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  // Fetch lessons for active child's level
  useEffect(() => {
    if (!activeLessonsChild?.childData?.level || activeTab !== 'lessons') return;

    let isMounted = true;
    const loadChildLessons = async () => {
      setLessonsLoading(true);
      try {
        const targetLevel = activeLessonsChild.childData.level;
        const q = query(
          collection(db, 'videos'),
          where('level', '==', String(targetLevel)),
          where('type', '==', lessonsType)
        );
        const snap = await getDocs(q);
        if (isMounted) {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a: any, b: any) => {
            if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
               return a.order - b.order;
            }
            const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
            return timeB - timeA;
          });
          setLessonsContent(docs);
        }
      } catch (err) {
        console.error('Error loading child lessons:', err);
        if (isMounted) setLessonsContent([]);
      } finally {
        if (isMounted) setLessonsLoading(false);
      }
    };

    loadChildLessons();
    return () => {
      isMounted = false;
    };
  }, [selectedChildIdForLessons, lessonsType, activeLessonsChild, activeTab]);

  // Handle active resource update for video/PDF player
  useEffect(() => {
    if (lessonsViewerItem) {
      const vUrls = lessonsViewerItem.videoUrls || (lessonsViewerItem.videoUrl ? [lessonsViewerItem.videoUrl] : []);
      if (vUrls.length > 0 && vUrls[0]) {
        setLessonsActiveRes({ type: 'video', url: vUrls[0], name: 'شرح الفيديو' });
      } else if (lessonsViewerItem.pdfText) {
        setLessonsActiveRes({ type: 'pdf', url: lessonsViewerItem.pdfText, name: 'الوثيقة التعليمية' });
      } else if (lessonsViewerItem.pdfSolution) {
        setLessonsActiveRes({ type: 'pdf', url: lessonsViewerItem.pdfSolution, name: 'الإصلاح النموذجي' });
      }
    } else {
      setLessonsActiveRes(null);
    }
  }, [lessonsViewerItem]);

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

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let secondaryApp = null;
    try {
      if (!newChild.firstName.trim() || !newChild.lastName.trim() || !newChild.email.trim() || !newChild.password.trim() || !newChild.birthDate || !newChild.wilaya) {
        toast.error('يرجى ملء جميع الحقول الإجبارية');
        setLoading(false);
        return;
      }

      const secondaryAppName = `secondary-app-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      await setPersistence(secondaryAuth, inMemoryPersistence);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newChild.email.trim(),
        newChild.password
      );
      const uid = userCredential.user.uid;

      let userPhone = newChild.phone ? newChild.phone.trim() : '';
      if (userPhone) {
        let cleaned = userPhone.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('00')) {
          cleaned = '+' + cleaned.slice(2);
        }
        if (/^\d{8}$/.test(cleaned)) {
          cleaned = '+216' + cleaned;
        }
        if (/^216\d{8}$/.test(cleaned)) {
          cleaned = '+' + cleaned;
        }
        userPhone = cleaned;
      }

      const displayName = `${newChild.firstName.trim()} ${newChild.lastName.trim()}`;
      await setDoc(doc(db, 'users', uid), {
        ...newChild,
        phone: userPhone,
        displayName: displayName,
        subscriptionStatus: 'inactive',
        createdAt: serverTimestamp(),
        uid: uid
      });

      const linkId = `${user.uid}_${uid}`;
      await setDoc(doc(db, 'parentChildren', linkId), {
        parentId: user.uid,
        childId: uid,
        createdAt: serverTimestamp()
      });

      await signOut(secondaryAuth);
      
      toast.success(`تم إنشاء حساب الابن وربطه بنجاح: ${displayName}`);
      
      setCreatedChildCredentials({
        displayName: displayName,
        email: newChild.email.trim(),
        phone: userPhone,
        password: newChild.password
      });

      setNewChild({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        userType: 'student',
        subject: 'الرياضيات',
        level: '7',
        address: '',
        group: '',
        birthDate: '',
        wilaya: ''
      });
      setShowCreateChildModal(false);
    } catch (err: any) {
      console.error('Error creating child user:', err);
      let errorMsg = 'حدث خطأ أثناء إضافة حساب الابن';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'هذا البريد الإلكتروني مستخدم بالفعل';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'كلمة المرور ضعيفة جداً (يجب أن لا تقل عن 6 أحرف)';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'البريد الإلكتروني غير صالح';
      }
      
      toast.error(errorMsg);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setLoading(false);
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
              <button 
                onClick={() => setShowCreateChildModal(true)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all active:scale-95"
              >
                <Plus size={18} />
                إنشاء حساب جديد لابني
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
                    <button 
                      onClick={() => setSelectedChildForDetails(c)} 
                      className="flex-1 rounded-2xl bg-white border border-gray-100 py-3 text-[0.8rem] font-black text-gray-600 hover:border-blue-light hover:text-blue-light transition-all"
                    >
                      التفاصيل
                    </button>
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
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-blue-light px-8 py-3 text-sm font-black text-blue-light hover:bg-blue-light hover:text-white transition-all"
              >
                 <Plus size={18} />
                 ابدأ ربط حساب قائم
              </button>
              <button 
                onClick={() => setShowCreateChildModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3.5 text-sm font-black text-white hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all active:scale-95"
              >
                 <Plus size={18} />
                 إنشاء حساب جديد للابن
              </button>
            </div>
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

                       <div className="grid gap-4 mb-8 sm:grid-cols-3">
                          {PAYMENT_METHODS.map(m => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMethod(m.id)}
                              className={cn(
                                "p-5 rounded-2xl border text-right transition-all group relative overflow-hidden flex flex-col justify-between h-full min-h-[110px] bg-white",
                                selectedMethod === m.id ? "border-blue-brand bg-blue-50/10 ring-2 ring-blue-brand/20" : "border-gray-100"
                              )}
                            >
                               <div className="relative z-10 flex items-center justify-between">
                                  <div>
                                     <p className="text-xs font-black text-blue-dark">{m.name}</p>
                                     <p className="text-[0.65rem] text-gray-400 font-bold mt-1">{m.bankName}</p>
                                  </div>
                                  {selectedMethod === m.id && <CheckCircle2 size={20} className="text-blue-brand" />}
                               </div>
                            </button>
                          ))}
                       </div>

                       {/* Selected Payment Method Detail Card */}
                        {selectedMethod && (
                          <div className="mb-8 p-6 rounded-2xl bg-white border border-gray-100 text-right animate-in fade-in slide-in-from-top-2">
                            {selectedMethod === 'bank' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{PAYMENT_METHODS[0].bankName}</span>
                                  <span className="text-[0.68rem] text-gray-400 font-bold">يرجى تحويل المبلغ للحساب التالي:</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                                  <span className="font-mono text-sm font-black tracking-wider text-blue-dark select-all">{PAYMENT_METHODS[0].accountNumber}</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(PAYMENT_METHODS[0].accountNumber || '');
                                      toast.success('تم نسخ رقم الحساب البنكي بنجاح');
                                    }}
                                    className="text-[0.68rem] bg-white border border-gray-200 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                                  >
                                    نسخ الحساب
                                  </button>
                                </div>
                              </div>
                            )}

                            {selectedMethod === 'ccp' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full">{PAYMENT_METHODS[1].bankName}</span>
                                  <span className="text-[0.68rem] text-gray-400 font-bold">يرجى تحويل المبلغ للحساب التالي:</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                                  <span className="font-mono text-sm font-black tracking-wider text-blue-dark select-all">{PAYMENT_METHODS[1].accountNumber}</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(PAYMENT_METHODS[1].accountNumber || '');
                                      toast.success('تم نسخ رقم الحساب البريدي بنجاح');
                                    }}
                                    className="text-[0.68rem] bg-white border border-gray-200 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                                  >
                                    نسخ الحساب
                                  </button>
                                </div>
                              </div>
                            )}

                            {selectedMethod === 'd17' && (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black text-red-600 bg-red-50/50 px-3 py-1 rounded-full">{PAYMENT_METHODS[2].bankName}</span>
                                  <span className="text-[0.68rem] text-gray-400 font-bold">يمكنك الدفع عبر التطبيق مباشرة:</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                                  <div className="flex flex-col text-right">
                                    <span className="text-[0.62rem] text-gray-400 font-bold">رقم الهاتف المربوط</span>
                                    <span className="font-mono text-sm font-black tracking-widest text-blue-dark select-all">{PAYMENT_METHODS[2].phone}</span>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(PAYMENT_METHODS[2].phone || '');
                                      toast.success('تم نسخ رقم هاتف D17 بنجاح');
                                    }}
                                    className="text-[0.68rem] bg-white border border-gray-200 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                                  >
                                    نسخ الرقم
                                  </button>
                                </div>

                                {PAYMENT_METHODS[2].qrCode && (
                                  <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 mt-2">
                                    <p className="text-[0.65rem] font-bold text-gray-500">امسح رمز الـ QR Code من تطبيق D17 لإتمام الدفع بسرعة:</p>
                                    <div className="relative group p-2 border-2 border-gray-100 bg-white rounded-2xl shadow-sm transition-all hover:border-blue-light/50">
                                      <img 
                                        src={PAYMENT_METHODS[2].qrCode} 
                                        alt="D17 QR Code" 
                                        className="w-48 h-48 object-contain rounded-lg"
                                      />
                                      <div className="absolute inset-2 border border-blue-brand/20 rounded-md pointer-events-none group-hover:border-blue-brand/40 transition-all" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

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
      ) : activeTab === 'lessons' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right font-Tajawal">
          {children.length === 0 ? (
            <div className="rounded-[40px] border border-gray-100 bg-white p-10 shadow-sm text-center">
              <div className="h-20 w-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6">
                <BookOpen size={36} className="text-blue-brand" />
              </div>
              <h3 className="text-2xl font-black text-blue-dark">دروس أبنائي</h3>
              <p className="text-gray-400 font-bold text-sm mt-2 max-w-lg mx-auto leading-relaxed">
                لم تقم بربط أي تلميذ بحسابك بعد. يرجى ربط حساب ابنك أو إنشاء حساب جديد له للتمكن من تصفح دروسه التعليمية المخصصة ومتابعة تقدمه الدراسي.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 max-w-md mx-auto">
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-blue-brand hover:bg-blue-dark text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10"
                >
                  <Users size={16} />
                  <span>ربط حساب موجود</span>
                </button>
                <button
                  onClick={() => setShowCreateChildModal(true)}
                  className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-[#0A0D14] hover:bg-gray-900 text-white text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Plus size={16} />
                  <span>إنشاء حساب جديد لابني</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Header and Child Selector */}
              <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-black text-blue-dark flex items-center gap-3 justify-start">
                      <BookOpen size={28} className="text-blue-brand" />
                      <span>دروس أبنائي التعليمية</span>
                    </h3>
                    <p className="text-gray-400 font-bold text-xs mt-1">
                      تابع وتصفح الدروس التعليمية والفيديوهات وسلاسل التمارين الخاصة بأبنائك
                    </p>
                  </div>

                  {/* Kids Selector pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {children.map(c => {
                      const isActive = c.childId === selectedChildIdForLessons;
                      return (
                        <button
                          key={c.childId}
                          onClick={() => setSelectedChildIdForLessons(c.childId)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[0.8rem] font-black transition-all border",
                            isActive
                              ? "bg-blue-brand text-white border-blue-brand shadow-md"
                              : "bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100"
                          )}
                        >
                          <div className={cn(
                            "h-6 w-6 rounded-lg flex items-center justify-center text-[0.7rem] font-bold uppercase",
                            isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-brand"
                          )}>
                            {c.childData?.displayName?.charAt(0) || '?'}
                          </div>
                          <span>{c.childData?.displayName || 'تلميذ مجهول'}</span>
                          <span className={cn(
                            "text-[0.62rem] px-1.5 py-0.5 rounded",
                            isActive ? "bg-white/10 text-white" : "bg-gray-200 text-gray-500"
                          )}>
                            {getLevelLabel(c.childData?.level)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid content like student view */}
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar/Filtering */}
                <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                  <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                    <p className="text-[0.65rem] font-black uppercase tracking-widest text-gray-400">تصنيف المحتوى</p>
                    
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'lesson', label: 'الدروس المشروحة', icon: BookOpen },
                        { id: 'exercise', label: 'سلاسل التمارين', icon: FileText },
                        { id: 'summer_review', label: 'مراجعة صيفية', icon: Sun },
                        { id: 'assignment', label: 'فروض المراقبة', icon: FileText },
                        { id: 'synthesis', label: 'الفروض التأليفية', icon: Award }
                      ].map(subItem => {
                        const Icon = subItem.icon;
                        const active = lessonsType === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => setLessonsType(subItem.id)}
                            className={cn(
                              "flex items-center gap-3 w-full text-right px-4 py-3 rounded-2xl text-[0.8rem] font-black transition-all border",
                              active
                                ? "bg-blue-dark text-white border-blue-dark shadow-sm"
                                : "bg-gray-50/50 text-gray-500 border-gray-100 hover:bg-gray-100/50 hover:text-blue-dark"
                            )}
                          >
                            <Icon size={16} className={active ? "text-gold-brand" : "text-gray-400"} />
                            <span className="flex-1">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Student Info Card */}
                  <div className="rounded-[28px] border border-gray-100 bg-gray-50 p-6 space-y-3">
                    <p className="text-[0.65rem] font-black uppercase tracking-widest text-gray-400">حالة التلميذ</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">حالة الاشتراك:</span>
                      <span className={cn(
                        "text-xs font-black px-2.5 py-0.5 rounded-full",
                        activeLessonsChild?.childData?.subscriptionStatus === 'active' 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      )}>
                        {activeLessonsChild?.childData?.subscriptionStatus === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                    {activeLessonsChild?.childData?.subscriptionStatus !== 'active' && (
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setSelectedChildForReceipt(activeLessonsChild.childId);
                            setSearchParams({ tab: 'wallet' });
                          }}
                          className="w-full py-2.5 rounded-xl bg-gold-brand hover:bg-gold-light text-blue-dark text-[0.7rem] font-black transition-all text-center flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Rocket size={12} />
                          <span>تفعيل الاشتراك</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lessons Content Stage */}
                <div className="flex-1 space-y-6">
                  {/* Search and Metadata Bar */}
                  <div className="rounded-[28px] border border-gray-100 bg-white p-4 px-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <input 
                        type="text" 
                        value={lessonsSearchTerm} 
                        onChange={e => setLessonsSearchTerm(e.target.value)} 
                        className="w-full rounded-2xl border border-gray-100 bg-gray-50/50 p-3 pr-10 text-xs font-bold outline-none focus:border-blue-light focus:bg-white transition-all" 
                        placeholder="ابحث عن درس، محور، أو تمرين..." 
                      />
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto text-[0.7rem] font-black text-gray-400 bg-gray-50 px-3.5 py-1.5 rounded-full border border-gray-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span>{lessonsContent.filter(c => c.title?.toLowerCase().includes(lessonsSearchTerm.toLowerCase()) || c.chapter?.toLowerCase().includes(lessonsSearchTerm.toLowerCase())).length} عنصر متوفر</span>
                    </div>
                  </div>

                  {/* Lessons List */}
                  {lessonsLoading ? (
                    <div className="rounded-[32px] border border-gray-100 bg-white p-20 text-center shadow-sm">
                      <Loader2 className="mx-auto animate-spin text-blue-brand mb-4" size={40} />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">جاري تحميل الدروس...</p>
                    </div>
                  ) : (
                    (() => {
                      const filteredLessons = lessonsContent.filter(c => 
                        c.title?.toLowerCase().includes(lessonsSearchTerm.toLowerCase()) || 
                        c.chapter?.toLowerCase().includes(lessonsSearchTerm.toLowerCase())
                      );

                      if (filteredLessons.length === 0) {
                        return (
                          <div className="rounded-[32px] border border-gray-100 bg-white p-16 text-center shadow-sm text-gray-300">
                            <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="font-black text-lg text-blue-dark/20 italic">لم نجد أي دروس مخصصة حالياً</p>
                            <p className="text-xs font-bold text-gray-400 mt-1">تأكد من اختيار تصنيف آخر أو تصفية بحث مختلفة</p>
                          </div>
                        );
                      }

                      // Group by categories
                      const categories = [
                        { id: 'algebra', label: 'الجبر / ALGÈBRE' },
                        { id: 'geometry', label: 'الهندسة / GÉOMÉTRIE' },
                        { id: 'stats', label: 'إحصاءات واحتمالات / STATISTIQUES' },
                        { id: 'general', label: 'عام / GÉNÉRAL' },
                      ];

                      return (
                        <div className="space-y-12">
                          {categories.map(cat => {
                            const catItems = filteredLessons.filter(item => (item.category || 'general') === cat.id);
                            if (catItems.length === 0) return null;

                            return (
                              <div key={cat.id} className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <h3 className="text-xs font-black text-blue-dark tracking-wider bg-blue-50 px-3.5 py-1 rounded-full">{cat.label}</h3>
                                  <div className="h-px flex-1 bg-gray-100" />
                                </div>

                                <div className="grid gap-4">
                                  {catItems.map((item, idx) => {
                                    const childHasAccess = hasAccess(item.level, item.isFree);
                                    return (
                                      <div 
                                        key={item.id} 
                                        className="group relative flex flex-col md:flex-row items-center gap-5 p-4 rounded-[24px] border border-gray-100 bg-white transition-all duration-300 hover:shadow-md"
                                      >
                                        {/* Thumbnail / Action block */}
                                        <div 
                                          onClick={() => childHasAccess && setLessonsViewerItem(item)}
                                          className="relative w-full md:w-[150px] aspect-[16/10] rounded-2xl bg-blue-dark cursor-pointer overflow-hidden shrink-0"
                                        >
                                          {extractYTId(item.videoUrls?.[0] || item.videoUrl) ? (
                                            <img 
                                              src={`https://img.youtube.com/vi/${extractYTId(item.videoUrls?.[0] || item.videoUrl)}/hqdefault.jpg`} 
                                              className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500" 
                                              alt={item.title}
                                              referrerPolicy="no-referrer"
                                            />
                                          ) : (
                                            <div className="flex h-full items-center justify-center text-white/20">
                                              <FileText size={28} strokeWidth={1.5} />
                                            </div>
                                          )}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-40" />
                                          
                                          {item.isFree && (
                                            <span className="absolute top-2 right-2 rounded-md bg-gold-brand px-1.5 py-0.5 text-[0.5rem] font-black text-blue-dark">مجاني</span>
                                          )}

                                          {childHasAccess && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                              <div className="h-8 w-8 rounded-full bg-white text-blue-dark flex items-center justify-center shadow-lg">
                                                <Play fill="currentColor" size={12} className="mr-0.5" />
                                              </div>
                                            </div>
                                          )}

                                          {!childHasAccess && (
                                            <div className="absolute inset-0 bg-blue-dark/70 backdrop-blur-[1px] flex items-center justify-center">
                                              <Lock size={14} className="text-gold-brand" />
                                            </div>
                                          )}
                                        </div>

                                        {/* Content Meta Info */}
                                        <div className="flex-1 min-w-0 flex flex-col md:flex-row items-center gap-4 w-full">
                                          <div className="flex-1 text-center md:text-right min-w-0 space-y-1">
                                            <div className="flex items-center justify-center md:justify-start gap-1.5">
                                              <span className="text-[0.62rem] font-black text-blue-brand uppercase">{item.chapter}</span>
                                              <span className="w-1 h-1 rounded-full bg-gray-200" />
                                              <span className="text-[0.62rem] font-bold text-gray-400">
                                                {item.type === 'lesson' ? 'درس فيديو' : item.type === 'summer_review' ? 'درس مراجعة صيفية' : item.type === 'exercise' ? 'سلسلة تمارين' : 'نموذج فرض'}
                                              </span>
                                            </div>
                                            <h4 className="text-[0.85rem] font-black text-blue-dark truncate leading-tight group-hover:text-blue-brand transition-colors">
                                              {item.title}
                                            </h4>
                                          </div>

                                          <div className="shrink-0 w-full md:w-auto">
                                            <button 
                                              onClick={() => childHasAccess && setLessonsViewerItem(item)} 
                                              className={cn(
                                                "w-full md:w-[120px] flex items-center justify-center gap-2 rounded-xl py-2.5 text-[0.75rem] font-black transition-all",
                                                childHasAccess 
                                                  ? "bg-blue-brand hover:bg-blue-dark text-white shadow-sm" 
                                                  : "bg-gray-50 text-gray-400 cursor-not-allowed"
                                              )}
                                            >
                                              {childHasAccess ? (
                                                <>
                                                  <Play size={10} fill="currentColor" />
                                                  <span>عرض الدرس</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Lock size={10} />
                                                  <span>مغلق</span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          )}
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

        {showCreateChildModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowCreateChildModal(false)}
              className="absolute inset-0 bg-blue-dark/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[680px] rounded-[32px] bg-white p-8 md:p-10 shadow-2xl overflow-y-auto max-h-[90vh] shadow-blue-900/20 text-right"
            >
              <h3 className="mb-2 text-2xl font-black text-blue-dark">إنشاء حساب جديد لابني</h3>
              <p className="mb-8 text-gray-400 text-sm font-bold">يرجى ملء البيانات التالية لإنشاء حساب تلميذ جديد وربطه بحسابك تلقائياً.</p>
              
              <form onSubmit={handleCreateChild} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">الاسم الأول *</label>
                    <input 
                      required 
                      type="text" 
                      value={newChild.firstName} 
                      onChange={e => setNewChild({...newChild, firstName: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">اللقب *</label>
                    <input 
                      required 
                      type="text" 
                      value={newChild.lastName} 
                      onChange={e => setNewChild({...newChild, lastName: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">البريد الإلكتروني *</label>
                    <input 
                      required 
                      type="email" 
                      value={newChild.email} 
                      onChange={e => setNewChild({...newChild, email: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">كلمة المرور *</label>
                    <input 
                      required 
                      type="password" 
                      value={newChild.password} 
                      onChange={e => setNewChild({...newChild, password: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">رقم الهاتف (اختياري)</label>
                    <input 
                      type="tel" 
                      placeholder="مثال: 98765432" 
                      value={newChild.phone} 
                      onChange={e => setNewChild({...newChild, phone: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">المستوى الدراسي *</label>
                    <select 
                      value={newChild.level} 
                      onChange={e => setNewChild({...newChild, level: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all"
                    >
                      <option value="7">السنة السابعة أساسي</option>
                      <option value="8">السنة الثامنة أساسي</option>
                      <option value="9">السنة التاسعة أساسي</option>
                      <option value="1sec">السنة الأولى ثانوي</option>
                      <option value="2sec">السنة الثانية ثانوي</option>
                      <option value="3sec">السنة الثالثة ثانوي</option>
                      <option value="4sec">باكالوريا</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">تاريخ الميلاد *</label>
                    <input 
                      required 
                      type="date" 
                      value={newChild.birthDate} 
                      onChange={e => setNewChild({...newChild, birthDate: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[0.65rem] font-black text-gray-400 uppercase pr-2">الولاية *</label>
                    <select 
                      required 
                      value={newChild.wilaya} 
                      onChange={e => setNewChild({...newChild, wilaya: e.target.value})} 
                      className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-blue-light transition-all"
                    >
                      <option value="">اختر الولاية</option>
                      {TUNISIAN_GOVERNORATES.map(gov => (
                        <option key={gov} value={gov}>{gov}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={() => setShowCreateChildModal(false)}
                    className="flex-1 rounded-2xl border border-gray-100 py-4 text-sm font-black text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button 
                    disabled={loading}
                    className="flex-[2] rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    إنشاء الحساب
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {createdChildCredentials && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreatedChildCredentials(null)}
              className="absolute inset-0 bg-blue-dark/55 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-[480px] rounded-[32px] bg-white p-10 shadow-2xl overflow-hidden shadow-blue-900/20 text-right"
            >
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="mb-2 text-2xl font-black text-blue-dark">تم إنشاء الحساب بنجاح! 🎉</h3>
              <p className="mb-6 text-gray-400 text-sm font-bold">تم إنشاء حساب ابنك وربطه بملفك الشخصي تلقائياً. هذه هي معطيات تسجيل الدخول الخاصة به:</p>
              
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4 text-right mb-6">
                <div>
                  <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">الاسم واللقب</span>
                  <span className="text-sm font-black text-blue-dark">{createdChildCredentials.displayName}</span>
                </div>
                <div>
                  <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">البريد الإلكتروني (أو رقم الهاتف)</span>
                  <span className="text-sm font-mono font-black text-blue-dark select-all">{createdChildCredentials.email}</span>
                </div>
                {createdChildCredentials.phone && (
                  <div>
                    <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">رقم الهاتف</span>
                    <span className="text-sm font-mono font-black text-blue-dark select-all">{createdChildCredentials.phone}</span>
                  </div>
                )}
                <div>
                  <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">كلمة المرور</span>
                  <span className="text-sm font-mono font-black text-blue-dark select-all">{createdChildCredentials.password}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => {
                    const text = `حساب الابن في منصة مسار التميز:\nالاسم: ${createdChildCredentials.displayName}\nالبريد الإلكتروني: ${createdChildCredentials.email}\nكلمة المرور: ${createdChildCredentials.password}`;
                    navigator.clipboard.writeText(text);
                    toast.success('تم نسخ بيانات الدخول إلى الحافظة');
                  }}
                  className="flex-1 rounded-2xl bg-blue-dark py-4 text-sm font-black text-white hover:bg-[#0A0D14] transition-all flex items-center justify-center gap-2"
                >
                  <Copy size={16} />
                  نسخ البيانات
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    const text = `حساب الابن في منصة مسار التميز:\nالاسم: ${createdChildCredentials.displayName}\nالبريد الإلكتروني: ${createdChildCredentials.email}\nكلمة المرور: ${createdChildCredentials.password}`;
                    if (navigator.share) {
                      navigator.share({
                        title: 'بيانات حساب الابن',
                        text: text,
                      }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(text);
                      toast.success('تم نسخ البيانات لعدم دعم ميزة المشاركة في هذا المتصفح');
                    }
                  }}
                  className="flex-1 rounded-2xl border border-gray-100 py-4 text-sm font-black text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 size={16} />
                  مشاركة البيانات
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setCreatedChildCredentials(null)}
                className="w-full mt-4 py-3 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 text-xs font-black transition-all"
              >
                إغلاق
              </button>
            </motion.div>
          </div>
        )}

        {selectedChildForDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedChildForDetails(null)}
              className="absolute inset-0 bg-blue-dark/50 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[700px] rounded-[32px] bg-white p-8 shadow-2xl overflow-y-auto max-h-[92vh] shadow-blue-900/20 text-right font-Tajawal"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedChildForDetails(null)}
                className="absolute top-6 left-6 h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-blue-dark hover:bg-gray-100 transition-all"
              >
                <X size={18} />
              </button>

              {/* Student Header Info */}
              <div className="flex items-center gap-5 pb-6 border-b border-gray-100 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-blue-50 text-blue-brand font-black text-2xl uppercase shadow-sm">
                  {selectedChildForDetails.childData?.displayName?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-black text-blue-dark">{selectedChildForDetails.childData?.displayName || 'تلميذ مجهول'}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-[0.7rem] bg-gray-100 px-2.5 py-0.5 rounded-full text-gray-500 font-black">
                      {getLevelLabel(selectedChildForDetails.childData?.level)}
                    </span>
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      selectedChildForDetails.childData?.subscriptionStatus === 'active' ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                    <span className={cn(
                      "text-[0.7rem] font-bold",
                      selectedChildForDetails.childData?.subscriptionStatus === 'active' ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {selectedChildForDetails.childData?.subscriptionStatus === 'active' ? 'مشترك' : 'غير مشترك'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs inside Modal */}
              <div className="flex border-b border-gray-100 mb-6">
                <button
                  type="button"
                  onClick={() => setDetailsModalTab('info')}
                  className={cn(
                    "flex-1 pb-3 text-sm font-black transition-all border-b-2 text-center",
                    detailsModalTab === 'info' ? "border-blue-brand text-blue-brand" : "border-transparent text-gray-400 hover:text-gray-600"
                  )}
                >
                  البيانات والاشتراك
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsModalTab('attendance')}
                  className={cn(
                    "flex-1 pb-3 text-sm font-black transition-all border-b-2 text-center",
                    detailsModalTab === 'attendance' ? "border-blue-brand text-blue-brand" : "border-transparent text-gray-400 hover:text-gray-600"
                  )}
                >
                  الحضور والغياب
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsModalTab('schedule')}
                  className={cn(
                    "flex-1 pb-3 text-sm font-black transition-all border-b-2 text-center",
                    detailsModalTab === 'schedule' ? "border-blue-brand text-blue-brand" : "border-transparent text-gray-400 hover:text-gray-600"
                  )}
                >
                  الجدول والحصص
                </button>
              </div>

              {/* Tab 1: Info & Subscription */}
              {detailsModalTab === 'info' && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                      <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">البريد الإلكتروني</span>
                      <span className="text-sm font-bold text-blue-dark">{selectedChildForDetails.childData?.email || 'لا يوجد'}</span>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 font-mono">
                      <span className="text-[0.65rem] text-gray-400 font-bold block mb-1 font-Tajawal">رقم الهاتف</span>
                      <span className="text-sm font-bold text-blue-dark">{selectedChildForDetails.childData?.phone || 'لا يوجد'}</span>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                      <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">الولاية</span>
                      <span className="text-sm font-bold text-blue-dark">{selectedChildForDetails.childData?.wilaya || 'لا يوجد'}</span>
                    </div>
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 font-mono">
                      <span className="text-[0.65rem] text-gray-400 font-bold block mb-1 font-Tajawal">تاريخ الميلاد</span>
                      <span className="text-sm font-bold text-blue-dark">{selectedChildForDetails.childData?.birthDate || 'لا يوجد'}</span>
                    </div>
                  </div>

                  {/* Student Code copy block */}
                  <div className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[0.65rem] text-gray-400 font-bold block mb-1">رمز التلميذ (Student Code)</span>
                      <span className="text-xs font-mono font-black text-blue-dark">{selectedChildForDetails.childId}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedChildForDetails.childId);
                        toast.success('تم نسخ رمز التلميذ بنجاح');
                      }}
                      className="self-end sm:self-center inline-flex items-center gap-2 text-xs font-black text-blue-brand hover:underline"
                    >
                      <Copy size={14} />
                      نسخ الرمز
                    </button>
                  </div>

                  {/* Subscription Status Block */}
                  <div className="p-6 rounded-3xl border border-gray-100 bg-white shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-blue-dark flex items-center gap-2">
                      <Info size={16} className="text-blue-light" /> حالة الاشتراك
                    </h4>
                    {selectedChildForDetails.childData?.subscriptionStatus === 'active' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                          <CheckCircle2 size={20} />
                          <div className="text-right">
                            <p className="text-xs font-black">الاشتراك نشط ومفعّل</p>
                            <p className="text-[0.68rem] font-bold opacity-90 mt-0.5 font-mono">
                              تاريخ انتهاء الصلاحية: {selectedChildForDetails.childData.subscriptionExpiry ? new Date(selectedChildForDetails.childData.subscriptionExpiry).toLocaleDateString('ar-TN') : 'غير محدد'}
                            </p>
                          </div>
                        </div>
                        {selectedChildForDetails.childData.subscriptionExpiry && (
                          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 relative overflow-hidden">
                            <div className="absolute right-0 top-0 h-full w-1 bg-gold-brand" />
                            <CountdownTimer expiryDate={selectedChildForDetails.childData.subscriptionExpiry} />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start gap-3 text-amber-600 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                          <AlertCircle size={20} className="shrink-0 mt-0.5" />
                          <div className="text-right">
                            <p className="text-xs font-black">الاشتراك غير مفعّل</p>
                            <p className="text-[0.68rem] font-bold opacity-90 mt-1 leading-relaxed">
                              الاشتراك غير مفعّل حالياً لهذا التلميذ. يرجى تفعيل الاشتراك لتتمكن من متابعة الدروس المباشرة، التقارير الأسبوعية، وجداول الحضور.
                            </p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedChildForReceipt(selectedChildForDetails.childId);
                            setSelectedChildForDetails(null);
                            setSearchParams({ tab: 'wallet' });
                          }}
                          className="w-full py-4 rounded-2xl bg-[#0A0D14] hover:bg-blue-dark text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Rocket size={16} />
                          اشترك للتلميذ الآن
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Attendance */}
              {detailsModalTab === 'attendance' && (
                <div className="space-y-6">
                  {selectedChildForDetails.childData?.subscriptionStatus !== 'active' ? (
                    <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <Lock size={32} className="text-amber-500 mx-auto mb-3" />
                      <p className="text-sm font-black text-blue-dark">المحتوى مقفل 🔒</p>
                      <p className="text-[0.7rem] text-gray-400 font-bold mt-1 max-w-xs mx-auto leading-relaxed">
                        سجل الحضور والمتابعة متاح فقط للتلاميذ المشتركين بشكل نشط.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-400">إجمالي الحضور والنشاط</span>
                        <span className="text-xs font-black text-blue-brand bg-blue-50 px-3 py-1 rounded-full">
                          {(attendanceData[selectedChildForDetails.childId] || []).length} حصص
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-2xl border border-gray-100 max-h-[300px]">
                        <table className="w-full text-right">
                          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-[0.7rem] font-black text-gray-500 uppercase">المجموعة</th>
                              <th className="px-4 py-3 text-[0.7rem] font-black text-gray-500 uppercase">التاريخ والوقت</th>
                              <th className="px-4 py-3 text-[0.7rem] font-black text-gray-500 uppercase">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(attendanceData[selectedChildForDetails.childId] || []).length > 0 ? (
                              (attendanceData[selectedChildForDetails.childId] || [])
                                .sort((a: any, b: any) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
                                .map((record: any) => (
                                  <tr key={record.id} className="hover:bg-gray-50/30 transition-colors">
                                    <td className="px-4 py-4">
                                      <span className="text-xs font-black text-blue-dark">{record.groupName}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex flex-col font-mono">
                                        <span className="text-xs font-black text-blue-dark font-Tajawal">
                                          {record.timestamp?.toDate().toLocaleDateString('ar-TN')}
                                        </span>
                                        <span className="text-[0.62rem] font-bold text-gray-400">
                                          {record.timestamp?.toDate().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[0.62rem] font-black">
                                        <CheckCircle2 size={10} />
                                        حاضر
                                      </span>
                                    </td>
                                  </tr>
                                ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-16 text-center text-gray-300 italic font-bold text-xs">
                                  لا توجد أي سجلات حضور مسجلة لهذا التلميذ حتى الآن.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Schedule & Lessons */}
              {detailsModalTab === 'schedule' && (
                <div className="space-y-6">
                  {selectedChildForDetails.childData?.subscriptionStatus !== 'active' ? (
                    <div className="p-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <Lock size={32} className="text-amber-500 mx-auto mb-3" />
                      <p className="text-sm font-black text-blue-dark">المحتوى مقفل 🔒</p>
                      <p className="text-[0.7rem] text-gray-400 font-bold mt-1 max-w-xs mx-auto leading-relaxed">
                        جدول الحصص الأسبوعي متاح فقط للتلاميذ المشتركين بشكل نشط.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Weekly Schedule */}
                      <div className="space-y-4">
                        <p className="text-[0.68rem] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Clock size={14} /> الجدول الأسبوعي الأساسي
                        </p>
                        {childSchedules[selectedChildForDetails.childId]?.schedule && childSchedules[selectedChildForDetails.childId].schedule.length > 0 ? (
                          <div className="grid gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                            {childSchedules[selectedChildForDetails.childId].schedule.map((s: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100/50">
                                <span className="text-[0.68rem] font-black text-blue-dark bg-white px-2.5 py-0.5 rounded-lg border border-gray-100 shadow-sm">{s.day}</span>
                                <div className="flex items-center gap-1.5 text-[0.68rem] font-bold text-gray-500 font-mono">
                                  <span>{s.startTime}</span>
                                  <span>←</span>
                                  <span>{s.endTime}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-[0.65rem] text-gray-400 italic">
                            لم يتم تعيين جدول أسبوعي للمجموعة حالياً
                          </div>
                        )}
                      </div>

                      {/* Live Sessions */}
                      <div className="space-y-4">
                        <p className="text-[0.68rem] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Video size={14} /> الحصص والدروس الأخيرة
                        </p>
                        {childSessions[selectedChildForDetails.childId] && childSessions[selectedChildForDetails.childId].length > 0 ? (
                          <div className="grid gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                            {childSessions[selectedChildForDetails.childId].map((session: any) => (
                              <div key={session.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100/50 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[0.68rem] font-black text-blue-dark truncate max-w-[130px]">{session.title}</span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[0.58rem] font-black shrink-0",
                                    session.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                                  )}>
                                    {session.status === 'completed' ? 'مكتملة' : 'مجدولة'}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[0.6rem] text-gray-400 font-bold font-mono">
                                  <span className="font-Tajawal">{session.subject}</span>
                                  <span>{session.startTime ? new Date(session.startTime).toLocaleDateString('ar-TN') : ''}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center bg-gray-50 rounded-2xl border border-gray-100 text-[0.65rem] text-gray-400 italic font-Tajawal">
                            لا توجد حصص مباشرة مسجلة حالياً
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Close Bottom Button */}
              <button 
                type="button"
                onClick={() => setSelectedChildForDetails(null)}
                className="w-full mt-8 py-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-xs font-black transition-all text-center"
              >
                إغلاق
              </button>
            </motion.div>
          </div>
        )}

        {lessonsViewerItem && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
             <div className="relative w-full h-full flex flex-col lg:flex-row overflow-hidden">
                {/* Main Stage (Player/PDF) */}
                <div className="flex-1 h-full flex flex-col bg-black">
                   {/* Top Controls Overlay */}
                   <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 px-10 bg-gradient-to-b from-black/80 to-transparent">
                      <div className="flex items-center gap-4">
                         <button onClick={() => setLessonsViewerItem(null)} className="h-10 w-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/25">
                            <X size={20} />
                         </button>
                         <div className="text-right">
                            <h3 className="font-black text-white text-base leading-none">{lessonsViewerItem.title}</h3>
                            <div className="flex items-center gap-2.5 mt-1.5 justify-start">
                               <span className="text-[0.6rem] font-black text-gold-light uppercase tracking-widest bg-gold-brand/10 px-1.5 py-0.5 rounded border border-gold-brand/20">
                                 {getLevelLabel(lessonsViewerItem.level)}
                               </span>
                               <span className="text-[0.6rem] text-white/40 font-bold">{lessonsViewerItem.chapter}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-3">
                         {lessonsActiveRes?.type === 'pdf' && (
                            <>
                              <a 
                                href={lessonsActiveRes.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-blue-dark font-black text-xs transition-all border border-white/15"
                              >
                                 <ExternalLink size={14} />
                                 <span>فتح في نافذة مستقلة</span>
                              </a>
                              <a 
                                href={lessonsActiveRes.url} 
                                download
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-brand hover:bg-gold-light text-blue-dark font-black text-xs transition-all shadow-md shadow-gold-500/10"
                              >
                                 <Download size={14} />
                                 <span>تحميل الوثيقة</span>
                              </a>
                            </>
                         )}
                      </div>
                   </div>

                   {/* Content Frame */}
                   <div className="flex-1 flex items-center justify-center relative pt-20 lg:pt-0">
                      {lessonsActiveRes?.type === 'video' ? (
                         <div className="w-full h-full">
                            <iframe 
                              className="w-full h-full border-none" 
                              src={`https://www.youtube.com/embed/${extractYTId(lessonsActiveRes.url)}?rel=0&autoplay=1&modestbranding=1`} 
                              allowFullScreen 
                              allow="autoplay"
                            />
                         </div>
                      ) : lessonsActiveRes?.type === 'pdf' ? (
                         <div className="w-full h-full bg-[#1a1a1a] flex flex-col">
                            <div className="flex-1 relative">
                               <iframe 
                                 className="w-full h-full border-none" 
                                 src={`https://docs.google.com/viewer?url=${encodeURIComponent(lessonsActiveRes.url)}&embedded=true`} 
                                 title={lessonsActiveRes.name}
                               />
                            </div>
                         </div>
                      ) : (
                         <div className="text-white/20 flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin" size={36} />
                            <p className="font-black text-xs uppercase tracking-widest">جاري التجهيز...</p>
                         </div>
                      )}
                   </div>
                </div>

                {/* Resource Sidebar */}
                <aside className="w-full lg:w-[350px] h-full bg-blue-dark border-r border-white/5 flex flex-col shadow-2xl relative z-40 text-right">
                   <div className="p-6 border-b border-white/5 bg-white/5">
                      <p className="text-[0.6rem] font-black text-blue-light uppercase tracking-wider mb-2">قائمة المحتويات</p>
                      <h4 className="text-white font-black text-base">مصادر الدرس المتاحة</h4>
                   </div>

                   <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {(lessonsViewerItem.videoUrls || (lessonsViewerItem.videoUrl ? [lessonsViewerItem.videoUrl] : [])).map((url: string, idx: number) => url && (
                         <button 
                            key={`lessons-vid-${idx}`}
                            onClick={() => setLessonsActiveRes({ type: 'video', url, name: idx === 0 ? 'شرح الفيديو' : `فيديو ${idx + 1}` })}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center gap-3 text-right border transition-all",
                              lessonsActiveRes?.url === url 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                         >
                            <Video size={18} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black truncate">{idx === 0 ? "شرح بالفيديو" : `فيديو إضافي ${idx + 1}`}</p>
                              <p className="text-[0.62rem] opacity-60 font-bold mt-0.5">الحل المفصل والمنهجية</p>
                            </div>
                         </button>
                      ))}

                      {lessonsViewerItem.pdfText && (
                         <button 
                            onClick={() => setLessonsActiveRes({ type: 'pdf', url: lessonsViewerItem.pdfText, name: 'الوثيقة التعليمية' })}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center gap-3 text-right border transition-all",
                              lessonsActiveRes?.url === lessonsViewerItem.pdfText 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                         >
                            <FileText size={18} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black truncate">{lessonsViewerItem.type === 'lesson' || lessonsViewerItem.type === 'summer_review' ? "ملخص الدرس" : "نص التمرين / الفرض"}</p>
                              <p className="text-[0.62rem] opacity-60 font-bold mt-0.5">وثيقة بصيغة PDF</p>
                            </div>
                         </button>
                      )}

                      {lessonsViewerItem.pdfSolution && (
                         <button 
                            onClick={() => setLessonsActiveRes({ type: 'pdf', url: lessonsViewerItem.pdfSolution, name: 'الإصلاح النموذجي' })}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center gap-3 text-right border transition-all",
                              lessonsActiveRes?.url === lessonsViewerItem.pdfSolution 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                         >
                            <Award size={18} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black truncate">الإصلاح النموذجي</p>
                              <p className="text-[0.62rem] opacity-60 font-bold mt-0.5">النتائج والتعليلات</p>
                            </div>
                         </button>
                      )}

                      {lessonsViewerItem.pdfUrl && !lessonsViewerItem.pdfText && (
                         <button 
                            onClick={() => setLessonsActiveRes({ type: 'pdf', url: lessonsViewerItem.pdfUrl, name: 'الوثيقة التعليمية' })}
                            className={cn(
                              "w-full p-4 rounded-2xl flex items-center gap-3 text-right border transition-all",
                              lessonsActiveRes?.url === lessonsViewerItem.pdfUrl 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                         >
                            <FileText size={18} className="shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black truncate">الوثيقة التعليمية</p>
                              <p className="text-[0.62rem] opacity-60 font-bold mt-0.5">قواعد هامة وملخصات</p>
                            </div>
                         </button>
                      )}
                   </div>

                   <div className="p-6 border-t border-white/5 bg-white/5 flex items-center justify-between text-white/50 text-[0.65rem]">
                     <span>أكاديمية مسار التميز</span>
                     <button onClick={() => setLessonsViewerItem(null)} className="text-white hover:underline font-black">إغلاق</button>
                   </div>
                </aside>
             </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
