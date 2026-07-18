import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  PlayCircle, 
  Layers, 
  Star, 
  Calendar, 
  Video, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  CreditCard,
  ExternalLink,
  Loader2,
  BookOpen,
  Wallet,
  Clock,
  Globe,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Plus,
  Receipt,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye,
  Rocket, Users,
  Play, ChevronDown,
  Mail, MessageCircle, Facebook, Youtube, Send
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import CountdownTimer from '../common/CountdownTimer';
import { useContentAccess } from '@/src/lib/accessControl';

import { SUBSCRIPTION_PLANS, PAYMENT_METHODS } from '@/src/constants';
import { useSearchParams } from 'react-router-dom';

interface Props {
  activeTab: string;
  userData: any;
  user: User;
}

export default function StudentOverview({ activeTab, userData, user }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<string>('');
  const [walletData, setWalletData] = useState<any>(null);
  const [myReceipts, setMyReceipts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedPlanForSub, setSelectedPlanForSub] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [scheduleSubTab, setScheduleSubTab] = useState<'sessions' | 'weekly'>('sessions');

  const hasAugustReviewAccess = (() => {
    if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 4, 20); // 20 May (month 4 is May)
    const end = new Date(year, 7, 31, 23, 59, 59); // 31 August (month 7 is August)
    return now >= start && now <= end;
  })();

  const { rules } = useContentAccess(userData);
  
  const hasStudentFreeAccess = (() => {
    if (!userData) return false;
    const userId = userData.uid || userData.id || user?.uid || '';
    if (!userId) return false;
    const now = new Date();
    return rules.some(rule => 
      rule.type === 'user_free' &&
      rule.userIds?.includes(userId) &&
      rule.isActive &&
      (now >= new Date(rule.startDate) && now <= new Date(rule.endDate))
    );
  })();

  const formatDate = (date: any, includeTime: boolean = true) => {
    if (!date) return '---';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(d.getTime())) return '---';
      if (includeTime) {
        return d.toLocaleString('ar-TN', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return d.toLocaleDateString('ar-TN');
    } catch (e) {
      return '---';
    }
  };

  useEffect(() => {
    const planId = searchParams.get('planId');
    if (planId) {
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
      if (plan) setSelectedPlanForSub(plan);
    }
  }, [searchParams]);

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFile || !selectedPlanForSub) {
      alert('يرجى اختيار العرض ورفع صورة الوصل');
      return;
    }

    setUploadingReceipt(true);
    try {
      await addDoc(collection(db, 'receipts'), {
        userId: user.uid,
        userName: userData.displayName || 'مستخدم',
        userEmail: user.email,
        receiptURL: receiptFile,
        planName: selectedPlanForSub.name,
        planId: selectedPlanForSub.id,
        price: selectedPlanForSub.price,
        paymentMethod: selectedMethod,
        status: 'pending',
        level: userData.level || 'غير محدد',
        createdAt: serverTimestamp()
      });
      
      toast.success('تم إرسال الوصل بنجاح! سيتم تفعيل حسابك بعد المراجعة.');
      setReceiptFile('');
      setSelectedPlanForSub(null);
      setSelectedMethod('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'receipts');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleFileUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dv5xhvkr3';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'masartamayoz-content';

    if (!cloudName || !uploadPreset) {
      toast.error('إعدادات Cloudinary غير مكتملة.');
      setUploadingReceipt(false);
      return;
    }

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
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('فشل رفع الملف. تأكد من حجم الملف ونوعه.');
      console.error(err);
    } finally {
      setUploadingReceipt(false);
    }
  };

  useEffect(() => {
    if (!user?.uid || !userData?.level) return;

    setLoading(true);
    
    const hasAugustReviewAccess = (() => {
      if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
      const now = new Date();
      const year = now.getFullYear();
      const start = new Date(year, 4, 20); // 20 May (month 4 is May)
      const end = new Date(year, 7, 31, 23, 59, 59); // 31 August (month 7 is August)
      return now >= start && now <= end;
    })();

    const isSubscribed = userData.subscriptionStatus === 'active' || hasAugustReviewAccess;

    // 1. Snapshot for videos (Recent Lessons) - Only if subscribed or for free videos
    // Actually the current query doesn't filter by isFree, so it will fail if not subscribed.
    let unsubVideos = () => {};
    if (isSubscribed) {
      const vQuery = query(
        collection(db, 'videos'), 
        where('level', '==', String(userData.level)),
        limit(20)
      );
      unsubVideos = onSnapshot(vQuery, (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
          const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
          return timeB - timeA;
        });
        setRecentVideos(docs.slice(0, 4));
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'videos');
        setLoading(false);
      });
    } else {
      // Fetch only free videos if not subscribed? 
      // For now just keep it empty to avoid permission errors
      setLoading(false);
    }

    // 2. Snapshot for wallet info
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setWalletData(docSnap.data());
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `wallets/${user.uid}`));

    // 3. Snapshot for my receipts
    const rQuery = query(collection(db, 'receipts'), where('userId', '==', user.uid));
    const unsubReceipts = onSnapshot(rQuery, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyReceipts(list.sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'receipts'));

    // 4. Snapshot for group and sessions (if assigned and subscribed)
    let unsubSessions: () => void = () => {};
    let unsubGroup: () => void = () => {};

    if (userData.level) {
      const sQuery = query(
        collection(db, 'teacherSessions'),
        where('level', '==', String(userData.level)),
        where('status', 'in', ['scheduled', 'completed'])
      );
      unsubSessions = onSnapshot(sQuery, (sSnap) => {
        const allSessions = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = allSessions.filter((s: any) => {
          if (s.isFree) return true;
          return isSubscribed && userData.group && s.groupName === userData.group;
        });
        setSessions(filtered);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'teacherSessions'));
    }

    if (userData.group) {
      const gQuery = query(collection(db, 'groups'), where('name', '==', userData.group));
      unsubGroup = onSnapshot(gQuery, (snap) => {
        if (!snap.empty) {
          const gInfo = { id: snap.docs[0].id, ...snap.docs[0].data() };
          setGroupInfo(gInfo);
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'groups'));
    }

    return () => {
      unsubVideos();
      unsubWallet();
      unsubReceipts();
      unsubGroup();
      unsubSessions();
    };
  }, [user?.uid, userData?.level, userData?.group]);

  // Removed loadOverviewData helper as it is replaced by onSnapshot hooks

  const renderOverview = () => {
    const { subscriptionStatus, plan, level, displayName } = userData;
    
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0A0D14] p-6 sm:p-8 text-white shadow-2xl">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-light/20 blur-[100px]" />
          <div className="absolute left-0 bottom-0 h-40 w-40 -translate-x-1/2 translate-y-1/2 rounded-full bg-gold-brand/10 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-right">
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">مرحباً {displayName?.split(' ')[0]}! 👋</h1>
              <p className="text-blue-light font-bold text-base sm:text-lg">أهلاً بك في مسار أكاديمي، استعد لرحلة التميز.</p>
            </div>
            
            {(subscriptionStatus === 'active' || hasAugustReviewAccess || hasStudentFreeAccess) ? (
              <div className="flex flex-col items-center md:items-end gap-3 text-white">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-sm font-black">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {hasStudentFreeAccess ? 'وصول مجاني مفعل' : 'اشتراكك نشط'}
                </div>
                {userData.subscriptionExpiry && !hasStudentFreeAccess && (
                   <CountdownTimer expiryDate={userData.subscriptionExpiry} showTitle={false} />
                )}
                <p className="text-white/60 text-xs font-medium">
                  {hasStudentFreeAccess 
                    ? 'فترة وصول مجاني مخصصة من الإدارة' 
                    : (userData.currentPlan || ((userData.planId?.includes('recording') || userData.plan?.includes('recording')) ? 'المحتوى المسجل' : 'الحصص المباشرة'))} 
                  • نشط
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center md:items-end gap-3">
                 <Link to="/pricing" className="bg-gold-brand hover:bg-gold-light text-blue-dark px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg shadow-gold-brand/20">
                   <Zap size={18} fill="currentColor" />
                   فعّل اشتراكك الآن
                 </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            icon={<Layers className="text-blue-light" size={24} />}
            label="السنة الدراسية"
            value={`السنة ${level || '—'}`}
            trend={level ? "مستوى ممتاز" : "يرجى التحديد"}
            color="blue"
          />
          <StatCard 
            icon={<Award className="text-amber-500" size={24} />}
            label="الرتبة الحالية"
            value="مبتدئ"
            trend="0 نقاط مجمعة"
            color="amber"
          />
          {(userData?.planId !== 'recordings_yearly' && userData?.plan !== 'recordings_yearly') && (
            <StatCard 
              icon={<Zap className="text-emerald-500" size={24} />}
              label="آخر الحصص"
              value="0"
              trend="ابتدأ الآن"
              color="emerald"
            />
          )}
          <StatCard 
            icon={<Clock className="text-purple-500" size={24} />}
            label="ساعات المشاهدة"
            value="0h"
            trend="+0% هذا الأسبوع"
            color="purple"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent Lessons */}
          <div className="lg:col-span-2 rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-brand">
                  <PlayCircle size={22} />
                </div>
                <h3 className="text-xl font-black text-blue-dark">آخر الدروس المضافة</h3>
              </div>
              <Link to="/courses" className="text-xs font-black text-blue-light hover:underline flex items-center gap-1 group transition-all">
                مشاهدة الكل
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-200" /></div>
            ) : recentVideos.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {recentVideos.map(v => {
                  const ytId = extractYTId(v.videoUrls?.[0] || v.videoUrl);
                  const isPdf = !ytId && (v.pdfText || v.pdfSolution);
                  const isAccessible = v.isFree || userData?.subscriptionStatus === 'active' || hasAugustReviewAccess;
                  
                  return (
                    <div key={v.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 transition-all hover:border-blue-light/30 hover:shadow-xl hover:shadow-blue-900/5 relative">
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#0A0D14]">
                        {ytId ? (
                          <img 
                            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70 group-hover:opacity-100" 
                            alt={v.title}
                          />
                        ) : (
                          <div className={cn(
                            "h-full w-full flex flex-col items-center justify-center gap-2 transition-all duration-500 group-hover:scale-110",
                            isPdf ? "bg-gradient-to-br from-red-500/20 to-red-600/5" : "bg-gradient-to-br from-blue-brand/20 to-blue-dark/5"
                          )}>
                            {isPdf ? (
                              <FileText size={32} className="text-red-500/40 group-hover:text-red-500 transition-colors" />
                            ) : (
                              <BookOpen size={32} className="text-blue-light/40 group-hover:text-blue-brand transition-colors" />
                            )}
                            <div className="text-[0.6rem] font-black uppercase tracking-widest text-white/20">
                              {isPdf ? 'Document PDF' : 'Educational Content'}
                            </div>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 transition-opacity group-hover:opacity-30" />
                        
                        {/* Status Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-2">
                           {v.isFree ? (
                             <span className="rounded-lg bg-emerald-500 px-2 py-0.5 text-[0.6rem] font-black text-white shadow-lg flex items-center gap-1">
                                <Zap size={10} fill="white" /> مجاني
                             </span>
                           ) : (
                             (userData?.subscriptionStatus !== 'active' && !hasAugustReviewAccess) && (
                               <span className="rounded-lg bg-blue-dark/80 backdrop-blur-md px-2 py-0.5 text-[0.6rem] font-black text-gold-brand shadow-lg flex items-center gap-1 border border-white/10">
                                  <Lock size={10} /> مدفوع
                               </span>
                             )
                           )}
                        </div>

                        <div className={cn(
                          "absolute bottom-2 right-2 rounded-md px-2 py-0.5 text-[0.65rem] font-bold text-white backdrop-blur-sm",
                          v.type === 'lesson' ? 'bg-blue-dark/80' : 
                          v.type === 'summer_review' ? 'bg-indigo-600/80' : 
                          v.type === 'exercise' ? 'bg-emerald-600/80' : 
                          'bg-amber-600/80'
                        )}>
                          {v.type === 'lesson' ? 'درس فيديو' : 
                           v.type === 'summer_review' ? 'مراجعة صيفية' : 
                           v.type === 'exercise' ? 'تمارين' : 
                           v.type === 'assignment' ? 'فرض مراقبة' : 'فرض تأليفي'}
                        </div>
                        
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className={cn(
                             "h-10 w-10 rounded-full flex items-center justify-center text-white shadow-xl scale-75 group-hover:scale-100 transition-transform",
                             isAccessible ? (ytId ? "bg-blue-light" : "bg-gold-brand text-blue-dark") : "bg-black/60 backdrop-blur-md text-gold-brand border border-white/20"
                           )}>
                              {isAccessible ? (
                                ytId ? <PlayCircle size={20} fill="white" /> : <Eye size={20} />
                              ) : (
                                <Lock size={20} />
                              )}
                           </div>
                        </div>
                      </div>
                      <div className="p-3 text-right">
                        <h4 className="truncate text-sm font-black text-blue-dark mb-0.5">{v.title}</h4>
                        <div className="flex items-center justify-between">
                          <p className="text-[0.65rem] text-gray-400 font-bold">{v.chapter}</p>
                        </div>
                      </div>
                      {isAccessible && (
                        <Link to={`/courses?v=${v.id}`} className="absolute inset-0 z-10" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400 border-2 border-dashed border-gray-50 rounded-3xl">
                <Video size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-[0.95rem] font-black text-gray-600">لا توجد دروس متاحة لمستواك حالياً</p>
                <p className="text-[0.8rem] mt-1 italic">سيتم إشعورك فور إضافة محتوى جديد</p>
              </div>
            )}
          </div>

          {/* Activity/Sidebar Info */}
          <div className="space-y-6">
            <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
               <h3 className="text-lg font-black text-blue-dark mb-6 flex items-center gap-2">
                 <TrendingUp className="text-gold-brand" size={20} /> نشاطي الدراسي
               </h3>
               <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">التقدم الكلي</span>
                    <span className="text-xs font-black text-blue-dark">0%</span>
                 </div>
                 <div className="h-2 w-full rounded-full bg-gray-50 overflow-hidden">
                    <div className="h-full bg-blue-brand rounded-full transition-all duration-1000" style={{ width: '0%' }} />
                 </div>
                 
                 <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-center">
                    <div>
                      <div className="text-lg font-black text-blue-dark">0</div>
                      <div className="text-[0.65rem] font-bold text-gray-400 uppercase">سلسلة تمارين</div>
                    </div>

                    {(userData?.planId !== 'recordings_yearly' && userData?.plan !== 'recordings_yearly') && (
                      <>
                        <div className="h-8 w-px bg-gray-100" />
                        <div>
                          <div className="text-lg font-black text-blue-dark">0</div>
                          <div className="text-[0.65rem] font-bold text-gray-400 uppercase">حصص مباشرة</div>
                        </div>
                      </>
                    )}
                 </div>
               </div>
            </div>

            <div className="rounded-[32px] bg-gradient-to-br from-gold-brand/20 to-amber-500/10 p-8 border border-gold-brand/10 group cursor-pointer overflow-hidden relative">
               <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 group-hover:-rotate-12 duration-500">
                  <Award size={100} />
               </div>
               <h3 className="text-lg font-black text-amber-800 mb-2 relative z-10">اربح نقاط هدايا</h3>
               <p className="text-xs font-medium text-amber-700/70 mb-4 leading-relaxed relative z-10">ادعُ أصدقاءك وانضم إلى تحدياتنا الأسبوعية لربح رصيد مجاني ونقاط تميز.</p>
               <button className="text-xs font-black text-amber-800 flex items-center gap-1 group transition-all relative z-10">
                 اكتشف المزيد
                 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const extractYTId = (url: string) => {
    const m = (url || '').match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  const renderTabHeader = (title: string, icon: any, action?: { label: string, to: string }) => (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-brand">
          {icon}
        </div>
        <h3 className="text-xl font-black text-blue-dark">{title}</h3>
      </div>
      {action && (
        <Link to={action.to} className="inline-flex items-center gap-2 rounded-xl bg-blue-dark px-5 py-2.5 text-xs font-black text-white transition-all hover:bg-[#0A0D14] hover:shadow-lg">
          <ExternalLink size={14} /> {action.label}
        </Link>
      )}
    </div>
  );

  // Switch between tabs
  switch (activeTab) {
    case 'overview': return renderOverview();
    case 'courses': return (
      <div className="rounded-[32px] border border-gray-100 bg-white p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderTabHeader('دروسي التعليمية', <BookOpen size={22} />, { label: 'فتح صفحة الدروس', to: '/courses' })}
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-50 rounded-[28px]">
          <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-brand/30 mb-6">
            <BookOpen size={36} />
          </div>
          <p className="text-gray-600 font-extrabold text-lg">تصفح مكتبة الدروس الكاملة</p>
          <p className="text-gray-400 text-sm max-w-sm mt-1">بإمكانك تصفح الدروس بشكل كامل واحترافي، ترتيب المحتوى والمتابعة من حيث توقفت في صفحة الدروس المنفصلة.</p>
          <Link to="/courses" className="mt-8 bg-blue-brand px-8 py-3 rounded-2xl text-white font-black text-sm shadow-xl shadow-blue-900/10 hover:shadow-blue-900/20 transition-all">
            ابدأ التعلم الآن
          </Link>
        </div>
      </div>
    );
    case 'sessions':
    case 'schedule': {
      if (userData?.planId === 'recordings_yearly' || userData?.plan === 'recordings_yearly') return renderOverview();
      
      const isSubscribed = userData?.subscriptionStatus === 'active' || hasAugustReviewAccess || hasStudentFreeAccess;

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 text-right" dir="rtl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm">
                <Calendar size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-blue-dark">الحصص المباشرة</h2>
                <p className="text-gray-400 font-bold text-sm">متابعة جدول الحصص المباشرة لمجموعتك</p>
              </div>
            </div>

            <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setScheduleSubTab('sessions')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black transition-all",
                  scheduleSubTab === 'sessions' ? "bg-white text-blue-dark shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                الحصص المباشرة المجدولة
              </button>
              <button 
                onClick={() => setScheduleSubTab('weekly')}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-xs font-black transition-all",
                  scheduleSubTab === 'weekly' ? "bg-white text-blue-dark shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
              >
                الجدول الأسبوعي المعتمد
              </button>
            </div>
          </div>

          {scheduleSubTab === 'sessions' ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-blue-dark">الحصص المباشرة</h3>
                  <p className="text-gray-400 font-bold text-xs">قائمة الحصص الفردية والمراجعات المبرمجة حالياً</p>
                </div>
                {groupInfo?.whatsappLink && (
                  <a 
                    href={groupInfo.whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-green-50 text-green-600 text-xs font-black border border-green-100 hover:bg-green-100 transition-all shadow-sm"
                  >
                    <Globe size={14} />
                    <span>مجموعة واتساب المرافقة</span>
                  </a>
                )}
              </div>

              {!isSubscribed && (
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-brand to-indigo-900 p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-6 border border-white/10 text-right">
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-gold-brand flex items-center gap-2 justify-start">
                      <Lock size={18} className="text-gold-brand animate-pulse shrink-0" />
                      <span>أنت تشاهد الحصص المباشرة المجانية فقط</span>
                    </h4>
                    <p className="text-xs font-bold text-blue-100 leading-relaxed max-w-2xl">
                      هناك العديد من الحصص المباشرة والدروس التفاعلية المدفوعة والمتابعة الفردية التي تقدمها الأكاديمية مع المعلمين. اشترك الآن في العرض الكامل لتحصل على وصول شامل لكل الخدمات.
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <Link to="/pricing" className="bg-gold-brand text-blue-dark px-6 py-3 rounded-xl font-black text-xs shadow-lg hover:bg-white transition-all flex items-center gap-1.5">
                      <Zap size={14} fill="currentColor" />
                      <span>اشترك الآن</span>
                    </Link>
                  </div>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.length > 0 ? (
                  sessions
                    .sort((a, b) => {
                      const getTime = (d: any) => {
                        if (!d) return 0;
                        try {
                          const date = new Date(d);
                          return isNaN(date.getTime()) ? 0 : date.getTime();
                        } catch (e) { return 0; }
                      };
                      return getTime(b.dateTime) - getTime(a.dateTime);
                    })
                    .map(s => (
                    <div key={s.id} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group text-right">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-wider",
                            s.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-brand'
                          )}>
                            {s.status === 'completed' ? 'تمت' : 'مجدولة'}
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-wider",
                            s.isFree ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                          )}>
                            {s.isFree ? '🔓 مجانية' : '🔒 مدفوعة'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[0.6rem] font-bold text-gray-400">
                          <Clock size={12} />
                          {formatDate(s.dateTime)}
                        </div>
                      </div>

                      <h4 className="text-lg font-black text-blue-dark mb-2">{s.title || 'حصة مباشرة'}</h4>
                      <p className="text-xs font-bold text-gray-400 mb-6 italic">{s.chapter || 'مراجعة وتطبيقات عمليّة'}</p>

                      {s.status === 'scheduled' ? (() => {
                        const sessionTime = s.dateTime?.toDate ? s.dateTime.toDate().getTime() : new Date(s.dateTime).getTime();
                        const now = Date.now();
                        const fifteenMinutesInMs = 15 * 60 * 1000;
                        const canJoin = now >= (sessionTime - fifteenMinutesInMs);
                        
                        if (!canJoin) {
                          return (
                            <div className="space-y-3">
                              <button 
                                disabled
                                className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-sm border border-gray-200 cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <Lock size={16} /> يفتح القاعة قريباً
                              </button>
                              <p className="text-[0.6rem] text-center text-amber-600 font-bold">
                                يتم تفعيل الرابط قبل 15 دقيقة من موعد الحصة
                              </p>
                            </div>
                          );
                        }

                        return (
                          <button 
                            onClick={() => {
                              import('@/src/lib/attendanceService').then(({ logAttendance }) => {
                                logAttendance({
                                  userId: user.uid,
                                  userName: userData.displayName || 'تلميذ',
                                  userType: 'student',
                                  groupId: s.groupId || groupInfo?.id || 'free_session',
                                  groupName: s.groupName || groupInfo?.name || 'حصة مجانية',
                                  meetLink: s.meetLink,
                                  sessionId: s.id
                                });
                              });
                            }}
                            className="w-full py-4 rounded-2xl bg-blue-brand text-white font-black text-sm shadow-xl shadow-blue-900/10 hover:bg-blue-dark hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                          >
                            <Play size={18} /> الالتحاق بالحصة
                          </button>
                        );
                      })() : (
                        <div className="w-full py-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-sm text-center flex items-center justify-center gap-2 border border-gray-100">
                          <CheckCircle2 size={18} /> حصة مكتملة
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 py-24 text-center border-2 border-dashed border-gray-50 rounded-[40px] bg-white w-full">
                     <Video size={64} className="mx-auto mb-6 opacity-10" />
                     <p className="text-xl font-black italic text-gray-300">لا توجد حصص مجدولة حالياً</p>
                     <p className="text-xs mt-2 text-gray-400 font-bold">يرجى متابعة الجدول الأسبوعي ومجموعة الواتساب للتنبيهات.</p>
                     {groupInfo?.meetLink && isSubscribed && (
                       <div className="mt-8 flex flex-col items-center gap-4">
                          <p className="text-[0.65rem] font-black text-blue-light uppercase tracking-widest">غرفة الميت الدائمة</p>
                          <a 
                            href={groupInfo.meetLink} 
                            target="_blank"
                            className="px-8 py-3 rounded-2xl bg-blue-50 text-blue-brand font-black text-xs border border-blue-100 hover:bg-blue-brand hover:text-white transition-all shadow-sm"
                          >
                            دخول غرفة الميت العامة
                          </a>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div>
                <h3 className="text-lg font-black text-blue-dark">الجدول الأسبوعي المعتمد</h3>
                <p className="text-gray-400 font-bold text-xs">مواعيد حصصك الأسبوعية الثابتة في مجموعة {groupInfo?.name || '...'}</p>
              </div>

              {!isSubscribed ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-100 rounded-[40px] bg-white px-6">
                  <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-6 shadow-xl shadow-amber-500/10">
                    <Lock size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-blue-dark mb-3">الجدول مخصص للمشتركين 🔐</h3>
                  <p className="text-gray-400 font-bold text-sm max-w-md mx-auto leading-relaxed">
                    انضم إلى مجتمع مسار التميز! الحصص المباشرة والجدول الأسبوعي والمتابعة الدقيقة متاحة حصرياً للمشتركين النشطين. اشترك الآن لتبدأ رحلة النجاح مع نخبة من الأساتذة.
                  </p>
                  <Link to="/pricing" className="mt-10 bg-gold-brand hover:bg-gold-light text-blue-dark px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-gold-brand/20 transition-all flex items-center gap-2">
                    <Zap size={18} fill="currentColor" /> الاشتراك الآن
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {groupInfo?.schedule && groupInfo.schedule.length > 0 ? (
                    groupInfo.schedule.map((s: any, idx: number) => (
                      <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group text-right">
                        <div className="flex items-center justify-between mb-6">
                          <div className="px-5 py-2 rounded-xl bg-orange-50 text-orange-600 text-xs font-black">
                            {s.day}
                          </div>
                          <div className="h-10 w-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-dark transition-colors">
                            <Clock size={18} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[0.65rem] font-bold text-gray-400 uppercase">توقيت الحصة</p>
                          <h4 className="text-xl font-black text-blue-dark flex items-center gap-2 justify-end">
                            <span>{s.startTime}</span>
                            <span className="text-gray-300 text-sm">←</span>
                            <span>{s.endTime}</span>
                          </h4>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                          <span className="text-[0.65rem] font-bold text-green-500 flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            حصة مباشرة
                          </span>
                          {groupInfo.meetLink && (
                            <a href={groupInfo.meetLink} target="_blank" className="text-[0.65rem] font-black text-blue-brand hover:underline">
                              رابط الميت
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="md:col-span-2 lg:col-span-3 py-24 text-center border-2 border-dashed border-gray-50 rounded-[32px] w-full bg-white">
                       <Calendar size={64} className="mx-auto mb-6 opacity-10" />
                       <p className="text-lg font-black italic">لا يوجد حصص مبرمجة حالياً</p>
                       <p className="text-xs mt-2">سيظهر جدول حصصك هنا فور تحديثه من قبل الإدارة.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    case 'wallet': return (
      <div className="rounded-[32px] border border-gray-100 bg-white p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
         {renderTabHeader('محفظتي واشتراكاتي', <Wallet size={22} />)}
         
         <div className="grid gap-8 lg:grid-cols-3">
            {/* Stats */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-[#0A0D14] p-8 rounded-[28px] text-white shadow-2xl relative overflow-hidden group">
                 <p className="text-[0.65rem] font-black text-blue-light/60 uppercase tracking-widest mb-1">الرصيد المتاح</p>
                 <div className="flex items-baseline gap-2">
                   <p className="text-4xl font-black text-white">{walletData?.balance || '0.000'}</p>
                   <p className="text-lg font-bold text-white/50">د.ت</p>
                 </div>
               </div>
               
               <div className="rounded-2xl border border-gray-100 p-6 bg-gray-50/50">
                  <h4 className="text-sm font-black text-blue-dark mb-4">حالة الاشتراك الحالي</h4>
                  <div className="flex items-center gap-3">
                     <div className={cn(
                       "h-3 w-3 rounded-full",
                       userData.subscriptionStatus === 'active' ? "bg-emerald-500" : 
                       userData.subscriptionStatus === 'pending' ? "bg-amber-500" : "bg-gray-300"
                     )} />
                     <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-700">
                          {userData.subscriptionStatus === 'active' ? 'نشط' : 
                           userData.subscriptionStatus === 'pending' ? 'بانتظار التفعيل' : 'غير مشترك'}
                        </span>
                        {userData.subscriptionStatus === 'active' && (
                          <span className="text-[0.65rem] font-bold text-blue-brand">
                            {walletData?.activeSubscription?.planName || userData.currentPlan || 'اشتراك عام'}
                          </span>
                        )}
                     </div>
                  </div>
                  {(userData.lastPaymentDate || walletData?.activeSubscription?.activatedAt) && (
                    <p className="text-[0.65rem] text-gray-400 mt-2">
                      آخر تفعيل: {formatDate(walletData?.activeSubscription?.activatedAt || userData.lastPaymentDate, false)}
                    </p>
                  )}
               </div>

               {/* Receipt History */}
               <div className="rounded-2xl border border-gray-100 p-6">
                  <h4 className="text-sm font-black text-blue-dark mb-4 border-b pb-2">تاريخ العمليات</h4>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                    {myReceipts.length > 0 ? myReceipts.map(r => (
                      <div key={r.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center",
                            r.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                            r.status === 'rejected' ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                          )}>
                            <Receipt size={14} />
                          </div>
                          <div>
                            <p className="text-[0.7rem] font-black text-blue-dark truncate w-24">{r.planName || 'اشتراك'}</p>
                            <p className="text-[0.55rem] text-gray-400">{formatDate(r.createdAt, false)}</p>
                          </div>
                        </div>
                        <span className="text-[0.6rem] font-black">{r.price || r.amount || '--'} د.ت</span>
                      </div>
                    )) : (
                      <p className="text-[0.65rem] text-gray-400 text-center italic py-4">لا توجد عمليات سابقة</p>
                    )}
                  </div>
               </div>
            </div>

            {/* Subscription Form */}
            <div className="lg:col-span-2 space-y-8">
               {/* Plan Selection */}
               <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                  <h4 className="text-lg font-black text-blue-dark mb-6 flex items-center gap-2">
                    <Rocket className="text-blue-light" size={20} /> اختر العرض المناسب
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
                            <div>
                               <p className="text-xs font-black text-blue-dark">{p.name}</p>
                               <p className="text-[0.65rem] text-gray-500 font-bold">{p.price} د.ت • {p.period}</p>
                            </div>
                         </div>
                         {selectedPlanForSub?.id === p.id && <CheckCircle2 size={18} className="text-blue-brand" />}
                      </button>
                    ))}
                  </div>
               </div>

               {/* Payment Method & Upload */}
               {selectedPlanForSub && (
                 <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h4 className="text-lg font-black text-blue-dark mb-4 flex items-center gap-2">
                       <CreditCard className="text-blue-light" size={20} /> طريقة الدفع وتفعيل الاشتراك
                    </h4>
                    
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
                       <div className="mb-8 p-6 rounded-2xl bg-gray-50/50 border border-gray-100/80 text-right animate-in fade-in slide-in-from-top-2">
                         {selectedMethod === 'bank' && (
                           <div className="space-y-3">
                             <div className="flex items-center justify-between">
                               <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{PAYMENT_METHODS[0].bankName}</span>
                               <span className="text-[0.68rem] text-gray-400 font-bold">يرجى تحويل المبلغ للحساب التالي:</span>
                             </div>
                             <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                               <span className="font-mono text-sm font-black tracking-wider text-blue-dark select-all">{PAYMENT_METHODS[0].accountNumber}</span>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   navigator.clipboard.writeText(PAYMENT_METHODS[0].accountNumber || '');
                                   toast.success('تم نسخ رقم الحساب البنكي بنجاح');
                                 }}
                                 className="text-[0.68rem] bg-gray-50 border border-gray-100 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
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
                             <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                               <span className="font-mono text-sm font-black tracking-wider text-blue-dark select-all">{PAYMENT_METHODS[1].accountNumber}</span>
                               <button 
                                 type="button"
                                 onClick={() => {
                                   navigator.clipboard.writeText(PAYMENT_METHODS[1].accountNumber || '');
                                   toast.success('تم نسخ رقم الحساب البريدي بنجاح');
                                 }}
                                 className="text-[0.68rem] bg-gray-50 border border-gray-100 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
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
                             <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
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
                                 className="text-[0.68rem] bg-gray-50 border border-gray-100 hover:bg-gray-100 font-black text-blue-dark px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all"
                               >
                                 نسخ الرقم
                               </button>
                             </div>

                             {PAYMENT_METHODS[2].qrCode && (
                               <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-gray-100 space-y-2 mt-2">
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

                     <p className="text-xs text-gray-500 mb-4">بعد الدفع، يرجى رفع صورة الوصل هنا لتفعيل حسابك:</p>
                    
                    <form onSubmit={handleUploadReceipt} className="space-y-4">
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
                               onClick={() => document.getElementById('receipt-upload')?.click()}
                               className="text-xs bg-blue-50 px-3 py-2 rounded-xl text-blue-brand hover:bg-blue-100 transition-all font-bold flex items-center gap-1"
                             >
                               {uploadingReceipt ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                               رفع الصورة
                             </button>
                             <input 
                               id="receipt-upload"
                               type="file" 
                               className="hidden" 
                                accept="image/*"
                               onChange={handleFileUploadReceipt}
                             />
                          </div>
                       </div>

                       <button 
                         type="submit"
                         disabled={uploadingReceipt || !receiptFile || !selectedMethod}
                         className="w-full py-4 rounded-2xl bg-blue-brand text-white font-black text-sm shadow-xl shadow-blue-900/10 hover:bg-blue-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                       >
                          {uploadingReceipt ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
                          إرسال الوصل للمراجعة
                       </button>
                    </form>
                 </div>
               )}

               <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50">
                  <p className="text-[0.65rem] text-blue-dark/70 leading-relaxed font-bold">
                     💡 ملاحظة: تفعيل الحساب يتم يدوياً بعد التثبت من صحة الوصل. ستصلك رسالة تأكيد فور التفعيل.
                  </p>
               </div>
            </div>
         </div>
      </div>
    );
    case 'referral': return (
      <div className="rounded-[32px] border border-gray-100 bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-amber-500 p-1 bg-gradient-to-r from-amber-500 to-gold-brand" />
        <div className="p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-20 w-20 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 mb-6 shadow-md shadow-amber-500/10 animate-pulse">
             <Users size={36} />
          </div>
          <h3 className="text-2xl font-black text-blue-dark mb-3">برنامج إحالة الأصدقاء (قريباً جداً!)</h3>
          <p className="text-gray-400 text-[0.92rem] max-w-xl leading-relaxed mb-6">
             نحن نعمل حالياً على تطوير نظام إحالة متكامل يتيح لكم دعوة أصدقائكم لشبكة مسار التميز التعليمية والحصول على رصيد إضافي مجاني ومكافآت مميزة فور تفعيل اشتراكاتهم. انتظرونا قريباً!
          </p>
          <span className="bg-amber-100/60 text-amber-800 text-xs font-black px-4 py-1.5 rounded-full border border-amber-200 shadow-sm animate-pulse">
             قريباً في التحديث القادم 🚀
          </span>
        </div>
      </div>
    );
    case 'help': return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Banner header */}
        <div className="rounded-[32px] border border-blue-50/10 bg-gradient-to-br from-blue-dark to-blue-blue p-8 md:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-950/20">
          <div className="absolute right-0 top-0 translate-x-20 -translate-y-20 h-80 w-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute left-0 bottom-0 -translate-x-10 translate-y-10 h-60 w-60 rounded-full bg-gold-brand/10 blur-2xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl text-right">
            <span className="bg-gold-brand/15 text-gold-brand text-xs font-black px-3 py-1 rounded-full border border-gold-brand/25 select-none inline-block mb-4 font-Tajawal">
               مركز دعم مسار التميز
            </span>
            <h3 className="text-2xl md:text-3xl font-black mb-3 font-Tajawal">كيف يمكننا مساعدتك اليوم؟</h3>
            <p className="text-white/70 text-sm md:text-base leading-relaxed font-Tajawal">
              فريق الإرشاد الأكاديمي والتقني دائماً في خدمتكم لتسهيل تجربة التعلم وتفعيل اشتراكات مادة الرياضيات لجميع المستويات.
            </p>
          </div>
        </div>

        {/* Content sections split */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main FAQ list (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
              <h4 className="text-lg font-black text-blue-dark mb-1 font-Tajawal">الأسئلة الشائعة والمعلومات الأساسية</h4>
              <p className="text-gray-400 text-xs mb-6 font-Tajawal">كل ما تحتاج لمعرفته حول طريقة الاشتراك وتفعيل حسابك وحضور الحصص.</p>
              
              <FAQAccordion />
            </div>
          </div>

          {/* Contact channels card (1/3 width on desktop) */}
          <div className="space-y-6">
            {/* Quick WhatsApp Support */}
            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/10 p-6 shadow-sm flex flex-col items-center text-center group transition-all hover:bg-emerald-50/30">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white mb-4 shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <MessageCircle size={28} fill="currentColor" />
              </div>
              <h4 className="font-extrabold text-blue-dark text-base mb-1 font-Tajawal">الدعم الفني والمالي فوراً</h4>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[220px] mb-5 font-Tajawal">
                هل تفضل المحادثة المباشرة؟ تواصل معنا فوراً عبر واتساب لتفعيل اشتراكك وحل أي إشكال أو استفسار.
              </p>
              <a 
                href="https://wa.me/21698346706" 
                target="_blank" 
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all text-center font-Tajawal"
              >
                <span>ابدأ محادثة واتساب الآن</span>
                <MessageCircle size={15} fill="currentColor" className="shrink-0" />
              </a>
            </div>

            {/* Inquiries & Social details */}
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="font-black text-blue-dark text-sm mb-4 font-Tajawal border-b border-gray-50 pb-3">قنوات التواصل الإضافية</h4>
              
              <div className="space-y-4">
                <a 
                  href="mailto:academy.masartamayoz@gmail.com" 
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50/70 border border-transparent hover:border-gray-100/80 transition-all group"
                >
                  <div className="h-9 w-9 rounded-lg bg-[#EA4335]/10 flex items-center justify-center text-[#EA4335] shrink-0 group-hover:scale-105 transition-transform">
                    <Mail size={16} />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[0.62rem] font-black text-gray-400 leading-none mb-1 font-Tajawal">مراسلتنا بالبريد الإلكتروني (Gmail)</p>
                    <p className="text-[0.76rem] font-extrabold text-blue-dark truncate font-Tajawal">academy.masartamayoz@gmail.com</p>
                  </div>
                </a>

                <div className="flex items-center gap-3 justify-center pt-3 border-t border-gray-50">
                  <a 
                    href="https://www.facebook.com/masartamayoz" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-10 h-10 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] flex items-center justify-center hover:scale-110 transition-all"
                    title="فيسبوك"
                  >
                    <Facebook size={18} fill="currentColor" />
                  </a>
                  <a 
                    href="https://www.youtube.com/@masartamayoz" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-10 h-10 rounded-xl bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] flex items-center justify-center hover:scale-110 transition-all"
                    title="يوتيوب"
                  >
                    <Youtube size={18} fill="currentColor" />
                  </a>
                  <a 
                    href="https://t.me/masartamayoz" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-10 h-10 rounded-xl bg-[#24A1DE]/10 hover:bg-[#24A1DE]/20 text-[#24A1DE] flex items-center justify-center hover:scale-110 transition-all"
                    title="تيليغرام"
                  >
                    <Send size={16} className="translate-x-[-1px] rotate-[-20deg]" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    default: return renderOverview();
  }
}

function StatCard({ icon, label, value, trend, color }: { icon: any, label: string, value: string, trend: string, color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-brand",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600"
  };

  return (
    <div className="group rounded-[28px] border border-gray-100 bg-white p-6 transition-all hover:border-blue-light/20 hover:shadow-xl hover:shadow-blue-900/5">
      <div className="mb-4 flex items-center justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border border-transparent transition-all group-hover:border-current group-hover:bg-white", colorMap[color])}>
          {icon}
        </div>
        <div className="h-8 w-8 rounded-full border border-gray-50 flex items-center justify-center text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
           <ArrowRight size={14} className="ltr:rotate-0 rtl:rotate-180" />
        </div>
      </div>
      <div>
        <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-2xl font-black text-blue-dark mb-2 leading-none">{value}</h4>
        <div className="flex items-center gap-1.5">
           <div className="h-4 w-4 rounded-full bg-gray-50 flex items-center justify-center">
              <TrendingUp size={10} className="text-gray-400" />
           </div>
           <span className="text-[0.68rem] font-bold text-gray-400">{trend}</span>
        </div>
      </div>
    </div>
  );
}

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "كيف يمكنني الاشتراك في أكاديمية مسار التميز؟",
      a: "الاشتراك بسيط ومباشر! أولاً، قم بإنشاء حساب تلميذ أو ولي أمر على موقعنا. ثانياً، تصفح باقات الاشتراك المتوفرة واختر الباقة المناسبة لمستواك الدراسي. ثالثاً، قم بإتمام عملية الدفع عبر تحويل بريدي أو بنكي، ثم قم برفع صورة من وصل الدفع مباشرة في حسابك تحت تبويب 'المحفظة والاشتراكات'. بمجرد التحقق من الوصل، سيتم تفعيل حسابك فوراً وتلقائياً!"
    },
    {
      q: "ما هي طرق الدفع المتوفرة والمقبولة؟",
      a: "لتسهيل العملية على الجميع في كافة ولايات تونس، نقبل الدفع عن طريق الحوالات البريدية (CCP) أو التحويلات البنكية المباشرة. تفاصيل الحساب البريدي والبنكي تظهر لك بوضوح عند اختيار الباقة وبدء عملية التفعيل من لوحة التحكم."
    },
    {
      q: "هل يمكنني متابعة الدروس وحضور الحصص من الهاتف الذكي؟",
      a: "بكل تأكيد! المنصة متوافقة بالكامل وتعمل بسلاسة تامة على جميع الهواتف الذكية (آيفون وأندرويد)، الأجهزة اللوحية والحواسيب المكتبية والمحمولة. لا تحتاج لتنزيل أي تطبيق خارجي، فقط افتح المتصفح وابدأ التعلم فوراً."
    },
    {
      q: "ما الذي سأحصل عليه بالضبط عند تفعيل الاشتراك؟",
      a: "ستحصل على وصول غير محدود طيلة فترة الاشتراك إلى: دروس مصورة مشروحة بأعلى جودة تغطي المناهج الرسمية لمادة الرياضيات بالتفصيل، سلاسل تمارين وبطاقات عمل تطبيقية نموذجية مع فيديوهات إصلاح دقيق خطوة بخطوة، بالإضافة إلى إمكانية حضور الحصص المباشرة والدردشة التفاعلية مع الأستاذ لطرح الأسئلة ومتابعة مستمرة تضمن تميزك البيداغوجي."
    },
    {
      q: "هل يوجد متابعة وتقارير حضور لأولياء الأمور؟",
      a: "نعم! يمكن لولي الأمر إنشاء حساب خاص به وربطه بحساب ابنه لمتابعة تقدمه الدراسي، نسب حضور الحصص التفاعلية، الغيابات، والمدة الزمنية المستغرقة في معالجة الدروس والسلاسل."
    }
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div 
            key={idx} 
            className={cn(
              "border rounded-[22px] overflow-hidden transition-all duration-300",
              isOpen ? "border-blue-100 bg-blue-50/10 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"
            )}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full text-right p-5 flex items-center justify-between gap-4 font-Tajawal focus:outline-none transition-colors"
            >
              <span className={cn("font-black text-[0.92rem] transition-colors", isOpen ? "text-blue-brand" : "text-blue-dark")}>
                {faq.q}
              </span>
              <span className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0", 
                isOpen ? "bg-blue-brand text-white rotate-180" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"
              )}>
                <ChevronDown size={14} />
              </span>
            </button>
            <div 
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden", 
                isOpen ? "max-h-[300px] opacity-100 border-t border-gray-100/50" : "max-h-0 opacity-0 pointer-events-none"
              )}
            >
              <div className="p-5 bg-white text-gray-600 text-[0.84rem] leading-relaxed font-bold font-Tajawal">
                {faq.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

