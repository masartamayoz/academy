import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/src/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
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
  Receipt,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye
} from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/src/lib/firestore-errors';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

import { SUBSCRIPTION_PLANS, PAYMENT_METHODS } from '@/src/constants';
import { useSearchParams } from 'react-router-dom';

interface Props {
  activeTab: string;
  userData: any;
  user: User;
}

export default function StudentOverview({ activeTab, userData, user }: Props) {
  const [searchParams] = useSearchParams();
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<string>('');
  const [walletData, setWalletData] = useState<any>(null);
  const [myReceipts, setMyReceipts] = useState<any[]>([]);
  const [selectedPlanForSub, setSelectedPlanForSub] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');

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
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error('إعدادات Cloudinary غير مكتملة في ملف .env');
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
    if (activeTab === 'overview' || activeTab === 'sessions' || activeTab === 'schedule') {
      loadOverviewData();
    }
  }, [activeTab, userData]);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      // Fetch videos
      const vQuery = query(
        collection(db, 'videos'), 
        where('level', '==', String(userData?.level || '7')),
        limit(20)
      );
      const vSnap = await getDocs(vQuery);
      const docs = vSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return timeB - timeA;
      });
      setRecentVideos(docs.slice(0, 4));

      // Fetch group info if assigned
      if (userData?.group) {
        const gQuery = query(collection(db, 'groups'), where('name', '==', userData.group));
        const gSnap = await getDocs(gQuery);
        if (!gSnap.empty) {
          setGroupInfo({ id: gSnap.docs[0].id, ...gSnap.docs[0].data() });
        }
      }

      // Fetch wallet info
      const walletSnap = await getDocs(query(collection(db, 'wallets'), where('__name__', '==', user.uid)));
      if (!walletSnap.empty) {
        setWalletData(walletSnap.docs[0].data());
      }

      // Fetch my receipts
      const rQuery = query(collection(db, 'receipts'), where('userId', '==', user.uid));
      const rSnap = await getDocs(rQuery);
      setMyReceipts(rSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    const { subscriptionStatus, plan, level, displayName } = userData;
    
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-[32px] bg-[#0A0D14] p-8 text-white shadow-2xl">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-light/20 blur-[100px]" />
          <div className="absolute left-0 bottom-0 h-40 w-40 -translate-x-1/2 translate-y-1/2 rounded-full bg-gold-brand/10 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-right">
              <h1 className="text-3xl md:text-3xl font-black text-white mb-2">مرحباً {displayName?.split(' ')[0]}! 👋</h1>
              <p className="text-blue-light font-bold text-lg">أهلاً بك في مسار أكاديمي، استعد لرحلة التميز.</p>
            </div>
            
            {subscriptionStatus === 'active' ? (
              <div className="flex flex-col items-center md:items-end gap-3 text-white">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 text-sm font-black">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  اشتراكك نشط
                </div>
                <p className="text-white/60 text-xs font-medium">خطتك: {plan === 'sessions' ? 'الحصص المباشرة' : 'المحتوى المسجل'}</p>
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
          <StatCard 
            icon={<Zap className="text-emerald-500" size={24} />}
            label="آخر الحصص"
            value="0"
            trend="ابتدأ الآن"
            color="emerald"
          />
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
                  const isAccessible = v.isFree || userData?.subscriptionStatus === 'active';
                  
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
                             userData?.subscriptionStatus !== 'active' && (
                               <span className="rounded-lg bg-blue-dark/80 backdrop-blur-md px-2 py-0.5 text-[0.6rem] font-black text-gold-brand shadow-lg flex items-center gap-1 border border-white/10">
                                  <Lock size={10} /> مدفوع
                               </span>
                             )
                           )}
                        </div>

                        <div className={cn(
                          "absolute bottom-2 right-2 rounded-md px-2 py-0.5 text-[0.65rem] font-bold text-white backdrop-blur-sm",
                          v.type === 'lesson' ? 'bg-blue-dark/80' : 
                          v.type === 'exercise' ? 'bg-emerald-600/80' : 
                          'bg-amber-600/80'
                        )}>
                          {v.type === 'lesson' ? 'درس فيديو' : 
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
                    <div className="h-8 w-px bg-gray-100" />
                    <div>
                      <div className="text-lg font-black text-blue-dark">0</div>
                      <div className="text-[0.65rem] font-bold text-gray-400 uppercase">اختبارات</div>
                    </div>
                    <div className="h-8 w-px bg-gray-100" />
                    <div>
                      <div className="text-lg font-black text-blue-dark">0</div>
                      <div className="text-[0.65rem] font-bold text-gray-400 uppercase">حصص مباشرة</div>
                    </div>
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
    case 'sessions': return (
      <div className="rounded-[32px] border border-gray-100 bg-white p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
               <Video size={22} />
             </div>
             <h3 className="text-xl font-black text-blue-dark">الحصص المباشرة</h3>
           </div>
           <div className="flex flex-col md:flex-row items-center gap-4">
              {groupInfo?.whatsappLink && (
                <a 
                  href={groupInfo.whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-600 text-[0.7rem] font-bold border border-green-100 hover:bg-green-100 transition-all"
                >
                  <Globe size={14} />
                  <span>مجموعة واتساب</span>
                </a>
              )}
              <div className="px-4 py-2 rounded-xl bg-blue-50 text-[0.7rem] font-black text-blue-light border border-blue-100">
                مجموعتي: {userData?.group || 'بانتظار التعيين'}
              </div>
           </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-gray-50 rounded-[28px] text-gray-300">
           {groupInfo?.meetLink ? (
             <div className="flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-brand animate-bounce">
                  <Video size={40} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-blue-dark">حصتك المباشرة الآن!</h4>
                  <p className="text-sm text-gray-400 mt-2">اضغط على الزر أدناه للالتحاق بالحصة وتسجيل حضورك آلياً.</p>
                </div>
                <button 
                  onClick={() => {
                    import('@/src/lib/attendanceService').then(({ logAttendance }) => {
                      logAttendance({
                        userId: user.uid,
                        userName: userData.displayName || 'تلميذ',
                        userType: 'student',
                        groupId: groupInfo.id,
                        groupName: groupInfo.name,
                        meetLink: groupInfo.meetLink
                      });
                    });
                  }}
                  className="px-10 py-4 rounded-[20px] bg-blue-brand text-white font-black text-sm shadow-xl shadow-blue-900/10 hover:bg-blue-dark hover:-translate-y-1 transition-all active:translate-y-0"
                >
                  الالتحاق بالحصة المباشرة
                </button>
             </div>
           ) : (
             <>
               <Video size={64} className="mx-auto mb-6 opacity-10" />
               <p className="text-lg font-black italic">الحصص القادمة ستظهر هنا</p>
               <p className="text-xs mt-2">تأكد من مراجعة الجدول الأسبوعي باستمرار.</p>
             </>
           )}
        </div>
      </div>
    );
    case 'schedule': return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm">
              <Calendar size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">الجدول الأسبوعي</h2>
              <p className="text-gray-400 font-bold text-sm">مواعيد حصصك المباشرة في مجموعة {groupInfo?.name || '...'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupInfo?.schedule && groupInfo.schedule.length > 0 ? (
            groupInfo.schedule.map((s: any, idx: number) => (
              <div key={idx} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
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
                  <h4 className="text-xl font-black text-blue-dark flex items-center gap-2">
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
            <div className="md:col-span-2 lg:col-span-3 py-24 text-center border-2 border-dashed border-gray-50 rounded-[32px]">
               <Calendar size={64} className="mx-auto mb-6 opacity-10" />
               <p className="text-lg font-black italic">لا يوجد حصص مبرمجة حالياً</p>
               <p className="text-xs mt-2">سيظهر جدول حصصك هنا فور تحديثه من قبل الإدارة.</p>
            </div>
          )}
        </div>
      </div>
    );
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
                      آخر تفعيل: {new Date((walletData?.activeSubscription?.activatedAt?.toDate?.() || userData.lastPaymentDate?.toDate?.() || Date.now())).toLocaleDateString('ar-TN')}
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
                            <p className="text-[0.55rem] text-gray-400">{new Date(r.createdAt?.toDate()).toLocaleDateString('ar-TN')}</p>
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
                    
                    <div className="grid gap-4 mb-8">
                       {PAYMENT_METHODS.map(m => (
                         <button
                           key={m.id}
                           onClick={() => setSelectedMethod(m.id)}
                           className={cn(
                             "p-4 rounded-2xl border-2 text-right transition-all group relative overflow-hidden",
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
    case 'tests': return (
      <div className="rounded-[32px] border border-gray-100 bg-white p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-2xl font-black text-blue-dark mb-2">الاختبارات والتقييمات</h3>
        <p className="text-gray-400 text-[0.9rem] mb-10">اختبر معلوماتك لتمّر إلى المستويات الأعلى وتفوز بنقاط تميز إضافية تضاف لمحفظتك.</p>
        <div className="py-24 text-center text-gray-100 uppercase font-black tracking-[0.2em] text-sm border-2 border-dashed border-gray-50 rounded-[28px]">
           <Award size={64} className="mx-auto mb-6 opacity-10" />
           قريباً في التحديث القادم
        </div>
      </div>
    );
    case 'referral': return (
      <div className="rounded-[32px] border border-gray-100 bg-white overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-amber-500 p-1 bg-gradient-to-r from-amber-500 to-gold-brand" />
        <div className="p-10">
          <h3 className="text-2xl font-black text-blue-dark mb-2">كلم أصحابك واربح رصيد مجاني</h3>
          <p className="text-gray-400 text-[0.9rem] mb-10 max-w-xl">عبر مشاركة كود الإحالة الخاص بك، تتحصل على رصيد إضافي في محفظتك ونقاط لمساعدتك في الحصول على اشتراكات وهدايا قيمة من مسار أكاديمي.</p>
          
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="bg-gray-50 p-8 rounded-[32px] border border-gray-100 flex flex-col items-center shadow-inner">
               <span className="bg-white px-4 py-1.5 rounded-full border border-gray-100 text-[0.6rem] font-black text-gray-400 uppercase tracking-widest mb-6 shadow-sm">Your Referral Code</span>
               <div className="bg-white px-10 py-5 rounded-[22px] border border-blue-100 shadow-xl shadow-blue-900/5 transition-all hover:scale-105">
                 <span className="text-blue-light font-black tracking-[0.3em] text-3xl ltr">MASAR-{user.uid.substring(0, 6).toUpperCase()}</span>
               </div>
               <button className="mt-10 rounded-2xl bg-blue-dark px-10 py-3.5 text-white font-black text-sm shadow-xl shadow-blue-900/30 hover:-translate-y-1 transition-all active:translate-y-0">
                 نسخ ومشاركة الكود
               </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="h-10 w-10 flex-shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 font-black">1</div>
                 <div>
                    <h4 className="font-bold text-blue-dark mb-1">شارك الكود</h4>
                    <p className="text-xs text-gray-500">أرسل الكود لأصدقائك عبر وسائل التواصل الاجتماعي.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-blue-brand font-black">2</div>
                 <div>
                    <h4 className="font-bold text-blue-dark mb-1">سجل صديقك</h4>
                    <p className="text-xs text-gray-500">عند استعمال الكود في تسجيل جديد، يتلقى صديقك خصماً فورياً.</p>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gold-brand/10 flex items-center justify-center text-amber-600 font-black">3</div>
                 <div>
                    <h4 className="font-bold text-blue-dark mb-1">اربح المكافأة</h4>
                    <p className="text-xs text-gray-500">ستضاف المكافأة لمحفظتك فور تفعيل اشتراك صديقك.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    case 'help': return (
      <div className="rounded-[32px] border border-gray-100 bg-white p-10 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-2xl font-black text-blue-dark mb-2">مركز المساعدة</h3>
        <p className="text-gray-400 text-sm mb-10">فريقنا جاهز للإجابة على جميع استفساراتك ومرافقتك في رحلتك التعليمية.</p>
        
        <div className="grid gap-6 md:grid-cols-2">
           <a href="https://wa.me/21698346706" target="_blank" className="p-8 rounded-[28px] bg-emerald-50/30 border border-emerald-100 hover:border-emerald-400 hover:bg-emerald-50 transition-all group flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20">
                <PlayCircle size={28} />
              </div>
              <h4 className="font-black text-blue-dark mb-2 group-hover:text-emerald-700">الدعم الفني المباشر</h4>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">تواصل معنا فوراً عبر واتساب لحل أي مشكلة تقنية تواجهها.</p>
           </a>
           <Link to="/contact" className="p-8 rounded-[28px] bg-blue-50/30 border border-blue-100 hover:border-blue-brand hover:bg-blue-50 transition-all group flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-blue-brand flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-brand/20">
                <AlertTriangle size={28} />
              </div>
              <h4 className="font-black text-blue-dark mb-2 group-hover:text-blue-brand">الأسئلة المتكررة</h4>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">ابحث عن إجابات سريعة وخطوات توضيحية لأكثر الأسئلة شيوعاً.</p>
           </Link>
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
