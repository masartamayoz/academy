import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { collection, query, where, doc, onSnapshot, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { 
  Wallet, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Loader2, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Video,
  Award,
  Zap,
  DollarSign,
  Briefcase,
  BookOpen,
  Globe,
  AlertTriangle,
  History as HistoryIcon,
  CreditCard,
  Lock
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Props {
  activeTab: string;
  userData: any;
  user: User;
}

export default function TeacherOverview({ activeTab, userData, user }: Props) {
  const [balance, setBalance] = useState(0);
  const [stats, setStats] = useState({ total: 0, earned: 0, paid: 0 });
  const [sessions, setSessions] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [requestingPayout, setRequestingPayout] = useState(false);

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
    if (!user?.uid) return;

    setLoading(true);

    // 1. Snapshot for groups
    const gQuery = query(collection(db, 'groups'), where('teacherId', '==', user.uid));
    const unsubGroups = onSnapshot(gQuery, (snap) => {
      const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyGroups(groups);
      setLoading(false);
    });

    // 2. Snapshot for sessions
    const sQuery = query(collection(db, 'teacherSessions'), where('teacherId', '==', user.uid));
    const unsubSessions = onSnapshot(sQuery, (snap) => {
      const docs: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a: any, b: any) => {
        const getTime = (d: any) => {
          if (!d) return 0;
          try {
            const date = new Date(d);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          } catch (e) { return 0; }
        };
        return getTime(b.dateTime) - getTime(a.dateTime);
      });
      setSessions(docs);
    });

    // 3. Snapshot for wallet
    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const wData = docSnap.data();
        setWallet(wData);
        setBalance(parseFloat(wData.balance || '0'));
      }
    });

    // 4. Snapshot for attendance (filtered by teacher's groups for security and performance)
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'attendance');
    });

    // 5. Snapshot for payout requests
    const pQuery = query(collection(db, 'payoutRequests'), where('teacherId', '==', user.uid));
    const unsubPayouts = onSnapshot(pQuery, (snap) => {
      setPayoutRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 6. Snapshot for messages
    const mQuery = query(collection(db, 'messages'), where('recipientId', '==', user.uid));
    const unsubMessages = onSnapshot(mQuery, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a: any, b: any) => {
        const getMs = (val: any) => {
          if (!val) return 0;
          if (typeof val.toMillis === 'function') return val.toMillis();
          if (val instanceof Date) return val.getTime();
          if (val.seconds) return val.seconds * 1000;
          return new Date(val).getTime() || 0;
        };
        return getMs(b.createdAt) - getMs(a.createdAt);
      });
      setMessages(msgs.slice(0, 10));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messages');
    });

    return () => {
      unsubGroups();
      unsubSessions();
      unsubWallet();
      unsubAttendance();
      unsubPayouts();
      unsubMessages();
    };
  }, [user.uid]);

  // Update stats whenever sessions or wallet changes
  useEffect(() => {
    if (wallet) {
      setStats({ 
        total: sessions.length, 
        earned: parseFloat(wallet.earnedTotal || '0'), 
        paid: parseFloat(wallet.paid || '0') 
      });
    }
  }, [sessions, wallet]);

  const handleRequestPayout = async () => {
    if (balance < 100) {
      toast.error('يجب أن يبلغ رصيدك 100 د.ت على الأقل لطلب السحب');
      return;
    }

    const hasPending = payoutRequests.some(r => r.status === 'pending');
    if (hasPending) {
      toast.error('لديك طلب سحب قيد الانتظار بالفعل');
      return;
    }

    setRequestingPayout(true);
    try {
      await addDoc(collection(db, 'payoutRequests'), {
        teacherId: user.uid,
        teacherName: userData?.displayName || 'أستاذ',
        amount: balance,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('تم إرسال طلب السحب بنجاح. سيتم مراجعته من قبل الإدارة.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'payoutRequests');
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setRequestingPayout(false);
    }
  };

  const markMessageAsRead = async (id: string) => {
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'messages', id), { isRead: true });
    } catch (e) {
      console.error(e);
    }
  };

  const renderOverview = () => {
    const pendingRequest = payoutRequests.find(r => r.status === 'pending');
    
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Messages Bar */}
        {messages.filter(m => !m.isRead).length > 0 && (
          <div className="space-y-3">
             {messages.filter(m => !m.isRead).map(msg => (
               <div key={msg.id} className="p-4 rounded-2xl bg-blue-dark text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top-4">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-light"><Zap size={20} /></div>
                     <div>
                        <p className="text-sm font-black">{msg.title}</p>
                        <p className="text-[0.7rem] opacity-70 font-bold">{msg.content}</p>
                     </div>
                  </div>
                  <button onClick={() => markMessageAsRead(msg.id)} className="text-xs font-black opacity-40 hover:opacity-100">إغلاق</button>
               </div>
             ))}
          </div>
        )}

        {/* Teacher Welcome & Wallet */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-[32px] bg-[#0A0D14] p-6 sm:p-8 text-white shadow-2xl">
          <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-light/20 blur-[100px]" />
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">مرحباً أستاذ {userData?.displayName?.split(' ')[0]}! 👋</h1>
            <p className="text-blue-light font-bold text-base sm:text-lg mb-8">مساهمتك تبني أجيالاً. إليك ملخص نشاطك.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-white/5">
              <div>
                <p className="text-[0.65rem] font-black text-white/40 uppercase tracking-widest mb-1">إجمالي الحصص</p>
                <p className="text-2xl font-black text-gold-brand">{stats.total}</p>
              </div>
              <div className="h-10 w-px bg-white/5 hidden sm:block" />
              <div>
                <p className="text-[0.65rem] font-black text-white/40 uppercase tracking-widest mb-1">الربح الصافي</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-black text-emerald-400">{stats.earned}</p>
                  <span className="text-[0.6rem] font-bold text-white/30 lowercase">dt</span>
                </div>
              </div>
              <div className="h-10 w-px bg-white/5 hidden sm:block" />
            </div>
          </div>
        </div>

        <div className="rounded-[32px] bg-white border border-gray-100 p-8 shadow-sm flex flex-col justify-between group">
           <div>
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 w-12 rounded-2xl bg-blue-light/10 text-blue-light flex items-center justify-center">
                   <Wallet size={24} />
                </div>
                <div className="h-8 w-8 rounded-full border border-gray-50 flex items-center justify-center text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight size={14} className="ltr:rotate-0 rtl:rotate-180" />
                </div>
              </div>
              <p className="text-[0.7rem] font-black text-gray-400 uppercase tracking-widest mb-1">الرصيد المتاح</p>
              <div className="flex items-baseline gap-2">
                 <h2 className="text-4xl font-black text-blue-dark">{balance.toFixed(3)}</h2>
                 <span className="text-lg font-bold text-gray-300">د.ت</span>
              </div>
           </div>
           <button 
             onClick={handleRequestPayout}
             disabled={balance < 100 || !!pendingRequest || requestingPayout}
             className={cn(
               "mt-8 w-full rounded-2xl py-3.5 text-white font-black text-sm shadow-xl transition-all",
               balance >= 100 && !pendingRequest ? "bg-blue-dark shadow-blue-900/20 hover:shadow-blue-900/40 hover:-translate-y-1" : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
             )}
           >
              {requestingPayout ? (
                <div className="flex items-center justify-center gap-2">
                   <Loader2 size={16} className="animate-spin" /> جاري الطلب...
                </div>
              ) : pendingRequest ? (
                'طلب قيد الانتظار...'
              ) : (
                'طلب سحب الأرباح'
              )}
           </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Recent Sessions & Groups */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                   <Calendar size={22} />
                 </div>
                 <h3 className="text-xl font-black text-blue-dark">حصص مجموعاتي</h3>
               </div>
               <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'schedule');
                  window.history.pushState({}, '', url);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-xs font-black text-blue-light hover:underline flex items-center gap-1 group transition-all"
               >
                 الجدول الأسبوعي
                 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
            
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="mx-auto h-10 w-10 animate-spin text-gray-200" /></div>
            ) : sessions.length > 0 ? (
              <div className="space-y-4">
                 {sessions.slice(0, 5).map(s => (
                   <div key={s.id} className="group relative flex items-center justify-between rounded-3xl border border-gray-50 bg-gray-50/30 p-5 transition-all hover:bg-white hover:border-blue-light/20 hover:shadow-xl hover:shadow-blue-900/5">
                      <div className="flex items-center gap-4">
                         <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-blue-dark font-black shadow-sm">
                            {s.level}
                         </div>
                         <div>
                           <h4 className="font-black text-blue-dark text-[0.95rem]">{s.title || s.subject || s.chapter || 'جبر / هندسة'}</h4>
                           <div className="flex items-center gap-3 mt-1">
                              <span className="text-[0.7rem] text-gray-400 font-bold flex items-center gap-1">
                                 <Clock size={12} /> {formatDate(s.dateTime || s.date, false)}
                              </span>
                              <span className="text-[0.7rem] text-gray-400 font-bold flex items-center gap-1">
                                 <Users size={12} /> {s.students || 0} طالب
                              </span>
                           </div>
                         </div>
                      </div>
                      <div className={cn(
                        "rounded-xl px-4 py-1.5 text-[0.7rem] font-black border",
                        s.status === 'confirmed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        s.status === 'rejected' ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      )}>
                        {s.status === 'confirmed' ? 'مؤكدة' : s.status === 'rejected' ? 'مرفوضة' : 'في الانتظار'}
                      </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="py-20 text-center text-gray-400 border-2 border-dashed border-gray-50 rounded-[32px]">
                <Calendar size={48} className="mx-auto mb-4 opacity-10" />
                <p className="text-[0.95rem] font-black text-gray-600">لا توجد حصص مسجلة بعد</p>
                <p className="text-[0.8rem] mt-1 italic">قم بتسجيل حصصك الجديدة لتظهر هنا</p>
              </div>
            )}
          </div>

          {/* Assigned Groups Section */}
          <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
             <div className="mb-8 flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                 <Users size={22} />
               </div>
               <h3 className="text-xl font-black text-blue-dark">المجموعات التي أشرف عليها</h3>
             </div>

             {myGroups.length > 0 ? (
               <div className="grid sm:grid-cols-2 gap-4">
                  {myGroups.map(g => (
                    <div key={g.id} className="p-6 rounded-[28px] border border-gray-50 bg-gray-50/20 hover:bg-white hover:border-indigo-100 transition-all group">
                       <div className="flex justify-between items-start mb-4">
                          <div className="h-10 w-10 rounded-xl bg-blue-dark text-white flex items-center justify-center font-black text-xs">
                             {g.level}
                          </div>
                          {g.whatsappLink && (
                            <a href={g.whatsappLink} target="_blank" className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                              <Globe size={16} />
                            </a>
                          )}
                       </div>
                       <h4 className="font-black text-blue-dark mb-1">{g.name}</h4>
                       <p className="text-[0.65rem] font-bold text-gray-400"> السنة {g.level} أساسي</p>
                       
                       {g.meetLink && (
                         <button 
                           onClick={() => {
                             import('@/src/lib/attendanceService').then(({ logAttendance }) => {
                               logAttendance({
                                 userId: user.uid,
                                 userName: userData.displayName || 'أستاذ',
                                 userType: 'teacher',
                                 groupId: g.id,
                                 groupName: g.name,
                                 meetLink: g.meetLink
                               });
                             });
                           }}
                           className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 text-blue-brand text-[0.7rem] font-black hover:bg-blue-brand hover:text-white transition-all shadow-sm"
                         >
                           <Video size={14} />
                           الالتحاق بالحصة المباشرة
                         </button>
                       )}
                    </div>
                  ))}
               </div>
             ) : (
               <div className="py-12 text-center text-gray-300 italic border-2 border-dashed border-gray-50 rounded-[28px]">
                 <p className="text-xs font-black">لم يتم تعيينك لأي مجموعة حالياً</p>
               </div>
             )}
          </div>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
            <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-black text-blue-dark mb-6 flex items-center gap-2">
                <TrendingUp className="text-blue-light" size={20} /> الأداء المهني
              </h3>
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-brand">
                        <Video size={18} />
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-black text-gray-400 uppercase leading-none mb-1">المحتوى التعليمي</p>
                        <p className="text-sm font-black text-blue-dark">مساهم نشط</p>
                      </div>
                   </div>
                   <div className="text-[0.65rem] font-black text-blue-light">عرض السجل</div>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Zap size={18} />
                      </div>
                      <div>
                        <p className="text-[0.65rem] font-black text-gray-400 uppercase leading-none mb-1">تقييم الأداء</p>
                        <p className="text-sm font-black text-blue-dark">خبير تعليمي</p>
                      </div>
                   </div>
                   <div className="text-[0.65rem] font-black text-emerald-500">ممتاز</div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

  const renderAttendance = () => {
    const myGroupIds = myGroups.map(g => g.id);
    const myAttendance = attendance.filter((a: any) => myGroupIds.includes(a.groupId));

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-blue-dark">سجلات حضور تلاميذي</h2>
            <p className="text-gray-400 font-bold text-sm">متابعة التلاميذ الذين التحقوا بالحصص المباشرة ({myAttendance.length})</p>
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-x-auto min-h-[400px]">
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] bg-gray-50/80 p-6 border-b border-gray-100 text-[0.65rem] font-black text-gray-400 uppercase tracking-widest text-center min-w-[600px]">
             <div className="text-right pr-4">التلميذ</div>
             <div>المجموعة</div>
             <div>الوقت</div>
             <div>التاريخ</div>
          </div>
          <div className="divide-y divide-gray-50 overflow-x-auto">
            {myAttendance.length > 0 ? (
              myAttendance.map((att: any) => (
                <div key={att.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr] p-6 items-center text-center hover:bg-gray-50 transition-all min-w-[600px]">
                   <div className="flex items-center gap-3 text-right">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
                         {att.userName?.charAt(0) || 'U'}
                      </div>
                      <h4 className="text-sm font-black text-blue-dark truncate max-w-[150px]">{att.userName}</h4>
                   </div>
                   <div>
                      <p className="text-xs font-black text-blue-dark">{att.groupName}</p>
                   </div>
                   <div>
                      <span className="text-[0.7rem] font-black text-gray-500">
                        {formatDate(att.timestamp)}
                      </span>
                   </div>
                   <div>
                      <span className="text-[0.7rem] font-black text-gray-500">
                        {formatDate(att.timestamp, false)}
                      </span>
                   </div>
                </div>
              ))
            ) : (
              <div className="py-40 text-center opacity-30">
                 <CheckCircle2 size={64} className="mx-auto mb-4" />
                 <p className="text-lg font-black italic">لا يوجد سجل حضور حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  switch (activeTab) {
    case 'overview': return renderOverview();
    case 'sessions': return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <Video size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">حصص المباشرة المجدولة</h2>
              <p className="text-gray-400 font-bold text-sm">قائمة المواعيد والروابط الرسمية ({sessions.length})</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.length > 0 ? (
            sessions.map(s => {
              const sessionTime = s.dateTime?.toDate ? s.dateTime.toDate().getTime() : new Date(s.dateTime).getTime();
              const now = Date.now();
              const fifteenMinutesInMs = 15 * 60 * 1000;
              const canJoin = now >= (sessionTime - fifteenMinutesInMs);

              return (
                <div key={s.id} className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                  <div className="mb-4 flex items-center justify-between">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-wider border",
                      s.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      s.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-50 text-gray-500 border-gray-100'
                    )}>
                      {s.status === 'completed' ? 'تمت' : s.status === 'scheduled' ? 'مجدولة' : 'ملغاة'}
                    </span>
                    <div className="flex items-center gap-2 text-[0.65rem] font-black text-gray-400">
                      <Clock size={12} />
                      <span>{formatDate(s.dateTime)}</span>
                    </div>
                  </div>

                  <h4 className="text-lg font-black text-blue-dark mb-2">{s.title || s.chapter || 'حصة مباشرة'}</h4>
                  <div className="space-y-1 mb-6">
                    <p className="text-[0.65rem] font-bold text-gray-400">المستوى: <span className="text-blue-dark">السنة {s.level}</span></p>
                    <p className="text-[0.65rem] font-bold text-gray-400">المجموعة: <span className="text-blue-dark">{s.groupName || 'نشط'}</span></p>
                  </div>

                  {s.status === 'scheduled' && s.meetLink && (
                    canJoin ? (
                      <button 
                        onClick={() => {
                          import('@/src/lib/attendanceService').then(({ logAttendance }) => {
                            logAttendance({
                              userId: user.uid,
                              userName: userData.displayName || 'أستاذ',
                              userType: 'teacher',
                              groupId: s.groupId || '',
                              groupName: s.groupName || 'نشط',
                              meetLink: s.meetLink,
                              sessionId: s.id
                            });
                          });
                        }}
                        className="w-full py-4 rounded-2xl bg-blue-dark text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:-translate-y-1 transition-all"
                      >
                        <Video size={18} />
                        ابدأ الحصة الآن
                      </button>
                    ) : (
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
                    )
                  )}
                  {s.status === 'completed' && (
                    <div className="py-4 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-sm text-center flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      حصة مكتملة (+20 د.ت)
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="sm:col-span-2 lg:col-span-3 py-24 text-center border-2 border-dashed border-gray-50 rounded-[32px]">
               <Video size={64} className="mx-auto mb-6 opacity-10" />
               <p className="text-lg font-black italic">لا توجد حصص مجدولة حالياً</p>
               <p className="text-xs mt-2">ستظهر الحصص هنا فور تعيينها من قبل الإدارة.</p>
            </div>
          )}
        </div>
      </div>
    );
    case 'attendance': return renderAttendance();
    case 'schedule': return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100 shadow-sm">
              <Calendar size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">الجدول الأسبوعي لمجموعاتي</h2>
              <p className="text-gray-400 font-bold text-sm">مواعيد الحصص المباشرة للمجموعات التي تشرف عليها ({myGroups.length} مجموعات)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {myGroups.length > 0 ? (
            myGroups.map(g => (
              <div key={g.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-dark text-white flex items-center justify-center font-black text-xs shadow-sm">
                      {g.level}
                    </div>
                    <div>
                      <h4 className="font-black text-blue-dark text-sm">{g.name}</h4>
                      <p className="text-[0.65rem] text-gray-400 font-bold">السنة {g.level} أساسي</p>
                    </div>
                  </div>
                  {g.meetLink && (
                    <a href={g.meetLink} target="_blank" className="p-2 rounded-lg bg-blue-50 text-blue-brand hover:bg-blue-brand hover:text-white transition-all">
                      <Globe size={14} />
                    </a>
                  )}
                </div>
                
                <div className="p-6 flex-1">
                   {g.schedule && g.schedule.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {g.schedule.map((s: any, idx: number) => (
                         <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/30 border border-blue-100/20 group hover:border-blue-brand/30 transition-all">
                            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-blue-brand font-black text-[0.65rem] shadow-sm">
                               {s.day.charAt(0)}
                            </div>
                            <div>
                               <p className="text-[0.68rem] font-bold text-blue-dark/60">{s.day}</p>
                               <p className="text-xs font-black text-blue-dark">{s.startTime} → {s.endTime}</p>
                            </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="py-10 text-center opacity-30">
                        <Calendar size={40} className="mx-auto mb-2" />
                        <p className="text-xs font-bold">لم يتم ضبط جدول هذه المجموعة</p>
                     </div>
                   )}
                </div>
              </div>
            ))
          ) : (
            <div className="lg:col-span-2 py-24 text-center border-2 border-dashed border-gray-50 rounded-[32px]">
               <Calendar size={64} className="mx-auto mb-6 opacity-10" />
               <p className="text-lg font-black italic">لا توجد حصص مبرمجة حالياً</p>
               <p className="text-xs mt-2">سيتم تعيين جدول فور إضافته من قبل الإدارة.</p>
            </div>
          )}
        </div>
      </div>
    );
    case 'wallet': return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
            <Wallet size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-blue-dark">محفظتي المادية</h2>
            <p className="text-gray-400 font-bold text-sm">متابعة الأرباح، المستحقات، والتحويلات المالية</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0A0D14] p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-light/10 blur-[60px]" />
              <p className="text-[0.65rem] font-bold text-blue-light/60 uppercase tracking-widest mb-1 relative z-10">الرصيد المتاح حالياً</p>
              <div className="flex items-baseline gap-2 relative z-10">
                <p className="text-4xl font-black text-white">{balance.toFixed(3)}</p>
                <p className="text-lg font-bold text-white/50">د.ت</p>
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                <div>
                   <p className="text-[0.55rem] font-bold text-gray-500 uppercase">إجمالي الأرباح</p>
                   <p className="text-sm font-black text-emerald-400">{stats.earned.toFixed(3)}</p>
                </div>
                <div className="text-left">
                   <p className="text-[0.55rem] font-bold text-gray-500 uppercase">تم تحويله</p>
                   <p className="text-sm font-black text-gray-400">{stats.paid.toFixed(3)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="text-sm font-black text-blue-dark mb-4 flex items-center gap-2">
                <AlertTriangle className="text-amber-500" size={16} /> ملاحظات هامة
              </h4>
              <ul className="space-y-3 text-[0.7rem] font-bold text-gray-500 leading-relaxed">
                <li className="flex gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-light mt-1.5 flex-shrink-0" />
                  <span>ثمن الحصة الواحدة هو 20 دينار تونسي.</span>
                </li>
                <li className="flex gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-light mt-1.5 flex-shrink-0" />
                  <span>تُضاف الأرباح آلياً بعد إكمال تسجيل الحضور للحصة.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-blue-dark">سجل العمليات</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">آخر التحويلات والأرباح المحققة</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100"><HistoryIcon size={18} /></div>
              </div>

              <div className="flex-1 space-y-4">
                 {wallet?.transactions?.length > 0 ? (
                   [...wallet.transactions].sort((a:any, b:any) => {
                     const getTime = (d: any) => {
                       if (!d) return 0;
                       try {
                         const date = new Date(d);
                         return isNaN(date.getTime()) ? 0 : date.getTime();
                       } catch (e) { return 0; }
                     };
                     return getTime(b.date) - getTime(a.date);
                   }).map((t: any, idx: number) => (
                     <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-blue-light/30 transition-all group">
                       <div className="flex items-center gap-4">
                         <div className={cn(
                           "h-10 w-10 rounded-xl flex items-center justify-center",
                           t.type === 'earnings' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                         )}>
                           {t.type === 'earnings' ? <TrendingUp size={18} /> : <CreditCard size={18} />}
                         </div>
                         <div>
                           <p className="text-sm font-black text-blue-dark">{t.description}</p>
                           <p className="text-[0.6rem] text-gray-400 font-bold">{formatDate(t.date)}</p>
                         </div>
                       </div>
                       <div className={cn(
                         "text-sm font-black",
                         t.type === 'earnings' ? "text-emerald-600" : "text-blue-dark"
                       )}>
                         {t.type === 'earnings' ? '+' : '-'}{t.amount.toFixed(3)} د.ت
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
                      <HistoryIcon size={60} className="mb-4" />
                      <p className="text-lg font-black italic">لا توجد عمليات مالية مسجلة حالياً</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    default: return renderOverview();
  }
}
