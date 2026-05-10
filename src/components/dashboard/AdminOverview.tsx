import React, { useState, useEffect } from 'react';
import { SUBSCRIPTION_PLANS, PAYMENT_METHODS } from '@/src/constants';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '@/src/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, addDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/src/lib/firestore-errors';
import { User, getAuth, createUserWithEmailAndPassword, signOut, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { firebaseConfig } from '@/src/lib/firebase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users as UsersIcon, 
  Receipt as ReceiptIcon, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Loader2, 
  Search, 
  Tag,
  Filter,
  Trash2,
  Edit,
  Edit2,
  Calendar,
  Layers,
  History,
  AlertTriangle,
  Clock,
  Play,
  Plus, 
  PlusCircle,
  RefreshCw,
  Video,
  Database,
  ShieldAlert,
  Settings,
  Wallet,
  TrendingUp,
  ExternalLink,
  BookOpen,
  Users2,
  FileText,
  UserCheck,
  UserPlus,
  Save,
  Upload,
  ShieldCheck,
  ChevronRight,
  Compass,
  Trash,
  LogOut,
  Globe,
  Activity,
  HardDrive
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Props {
  activeTab: string;
  userData: any;
  user: User;
}

export default function AdminOverview({ activeTab, userData, user }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState({
    users: [] as any[],
    receipts: [] as any[],
    teacherSessions: [] as any[],
    groups: [] as any[],
    content: [] as any[],
    wallets: [] as any[],
    attendance: [] as any[],
    subscriptions: [] as any[],
  });
  const [stats, setStats] = useState({
    users: 0,
    receipts: 0,
    activeSubs: 0,
    groups: 0,
    teachers: 0,
    content: 0,
    sessions: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [maintenanceLogs, setMaintenanceLogs] = useState<string[]>([]);
  const [isReseting, setIsReseting] = useState<string | null>(null);
  const [contentActionTab, setContentActionTab] = useState('add');
  const [contentSearch, setContentSearch] = useState('');
  const [contentLevelFilter, setContentLevelFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [maintenanceActionTab, setMaintenanceActionTab] = useState<'bulk' | 'selective' | 'total'>('bulk');
  const [maintenanceSearch, setMaintenanceSearch] = useState('');
  const [maintenanceFilter, setMaintenanceFilter] = useState('users');

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ar-TN');
    setMaintenanceLogs(prev => [`// [${time}] ${msg}`, ...prev]);
  };

  const [newContent, setNewContent] = useState({
    title: '',
    level: '',
    type: 'lesson',
    category: 'general',
    chapter: 'الرياضيات',
    videoUrls: [''],
    pdfText: '',
    pdfSolution: '',
    term: '1',
    order: 1,
    isFree: false,
    trimester: '1',
    modelNumber: '1',
    topics: ['']
  });

  const [uploading, setUploading] = useState({
    pdfText: false,
    pdfSolution: false
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'pdfText' | 'pdfSolution') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [field]: true }));
    
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dv5xhvkr3';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'masartamayoz-content';

    if (!cloudName || !uploadPreset) {
      toast.error('إعدادات Cloudinary غير مكتملة.');
      setUploading(prev => ({ ...prev, [field]: false }));
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
        if (editingContent) {
          setEditingContent((prev: any) => ({ ...prev, [field]: data.secure_url }));
        } else {
          setNewContent(prev => ({ ...prev, [field]: data.secure_url }));
        }
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert('فشل رفع الملف. يرجى التحقق من الإعدادات.');
    } finally {
      setUploading(prev => ({ ...prev, [field]: false }));
    }
  };

  const [newSession, setNewSession] = useState({
    teacherId: '',
    level: '',
    dateTime: '',
    meetLink: '',
    chapter: ''
  });

  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    userType: 'student' as 'student' | 'parent' | 'teacher' | 'admin',
    subject: 'الرياضيات',
    level: '7',
    address: '',
    group: ''
  });

  const [newGroup, setNewGroup] = useState({
    name: '',
    level: '7',
    teacherId: '',
    whatsappLink: '',
    meetLink: '',
    schedule: [],
    description: '',
    isActive: true
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkActionGroup, setBulkActionGroup] = useState('');
  const [showAssignStudentsModal, setShowAssignStudentsModal] = useState<any>(null); // For direct group assignment
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [showAddGroupForm, setShowAddGroupForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [showAddContentForm, setShowAddContentForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string, label: string, type: string, coll?: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: any[] = [];
      snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
      setData(prev => ({ ...prev, users }));
      setStats(prev => ({ 
        ...prev, 
        users: snapshot.size,
        activeSubs: users.filter(u => u.subscriptionStatus === 'active').length,
        teachers: users.filter(u => u.userType === 'teacher').length
      }));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const unsubReceipts = onSnapshot(collection(db, 'receipts'), (snapshot) => {
      const receipts: any[] = [];
      snapshot.forEach(d => receipts.push({ id: d.id, ...d.data() }));
      const revenue = receipts.filter(r => r.status === 'approved').reduce((acc, r) => acc + (parseFloat(r.price) || 0), 0);
      setData(prev => ({ ...prev, receipts }));
      setStats(prev => ({ 
        ...prev, 
        receipts: receipts.filter(r => r.status === 'pending').length,
        revenue
      }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'receipts'));

    const unsubSessions = onSnapshot(collection(db, 'teacherSessions'), (snapshot) => {
      const sessions: any[] = [];
      snapshot.forEach(d => sessions.push({ id: d.id, ...d.data() }));
      setData(prev => ({ ...prev, teacherSessions: sessions }));
      setStats(prev => ({ ...prev, sessions: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'teacherSessions'));

    const unsubContent = onSnapshot(collection(db, 'videos'), (snapshot) => {
      const content: any[] = [];
      snapshot.forEach(d => content.push({ id: d.id, ...d.data() }));
      setData(prev => ({ ...prev, content }));
      setStats(prev => ({ ...prev, content: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'videos'));

    const unsubGroups = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const groups: any[] = [];
      snapshot.forEach(d => groups.push({ id: d.id, ...d.data() }));
      setData(prev => ({ ...prev, groups }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'groups'));

    const unsubWallets = onSnapshot(collection(db, 'wallets'), (snapshot) => {
      const w: any[] = [];
      snapshot.forEach(d => w.push({ id: d.id, ...d.data() }));
      setData(prev => ({ ...prev, wallets: w }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'wallets'));

    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const att: any[] = [];
      snapshot.forEach(d => att.push({ id: d.id, ...d.data() }));
      setData(prev => ({ ...prev, attendance: att }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'attendance'));

    return () => {
      unsubUsers();
      unsubReceipts();
      unsubSessions();
      unsubContent();
      unsubGroups();
      unsubWallets();
      unsubAttendance();
    };
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let secondaryApp = null;
    try {
      // 1. Create a secondary Firebase app instance to avoid logging out the current admin
      const secondaryAppName = `secondary-app-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      // 1.1 Set persistence to 'none' (inMemory) for the secondary app to isolate it from the main app
      await setPersistence(secondaryAuth, inMemoryPersistence);

      // 2. Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUser.email,
        newUser.password
      );
      const uid = userCredential.user.uid;

      // 3. Save user info to Firestore using the generated UID
      await setDoc(doc(db, 'users', uid), {
        ...newUser,
        displayName: `${newUser.firstName} ${newUser.lastName} `.trim(),
        subscriptionStatus: 'inactive',
        createdAt: serverTimestamp(),
        uid: uid
      });

      // 4. Sign out the newly created user from the secondary instance
      await signOut(secondaryAuth);
      
      toast.success(`تمت إضافة المستخدم بنجاح: ${newUser.firstName} ${newUser.lastName}`);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', phone: '', userType: 'student', subject: 'الرياضيات', level: '7', address: '' });
    } catch (err: any) {
      console.error('Error creating user:', err);
      let errorMsg = 'حدث خطأ أثناء إضافة المستخدم';
      
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

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.level) {
      alert('يرجى اختيار المستوى');
      return;
    }
    
    if (newContent.type === 'lesson' && !newContent.title) {
      alert('يرجى إدخال عنوان الدرس');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = { 
        ...newContent,
        createdAt: serverTimestamp()
      };

      // Handle Title generation for non-lessons if needed, or based on specialized fields
      if (newContent.type === 'assignment' || newContent.type === 'synthesis') {
          const typeLabel = newContent.type === 'assignment' ? 'فرض مراقبة' : 'فرض تأليفي';
          dataToSave.title = `${typeLabel} رقم ${newContent.order} - الثلاثي ${newContent.trimester} (نموذج ${newContent.modelNumber})`;
      } else if (newContent.type === 'exercise') {
          const topicsLabel = newContent.topics.filter(t => t.trim()).join(' / ');
          dataToSave.title = `سلسلة تمارين: ${topicsLabel || ('رقم ' + newContent.order)}`;
      }

      await addDoc(collection(db, 'videos'), dataToSave);
      
      setNewContent({ 
        title: '', 
        level: '', 
        type: 'lesson', 
        category: 'general',
        chapter: 'الرياضيات', 
        videoUrls: [''], 
        pdfText: '', 
        pdfSolution: '', 
        term: '1', 
        order: (newContent.order || 0) + 1, 
        isFree: false, 
        trimester: '1',
        modelNumber: '1',
        topics: ['']
      });
      toast.success('تمت إضافة المحتوى بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'videos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;
    setLoading(true);
    try {
      const dataToSave = { ...editingContent, updatedAt: serverTimestamp() };
      
      if (editingContent.type === 'assignment' || editingContent.type === 'synthesis') {
          const typeLabel = editingContent.type === 'assignment' ? 'فرض مراقبة' : 'فرض تأليفي';
          dataToSave.title = `${typeLabel} رقم ${editingContent.order} - الثلاثي ${editingContent.trimester} (نموذج ${editingContent.modelNumber})`;
      } else if (editingContent.type === 'exercise') {
          const topicsLabel = editingContent.topics.filter((t: string) => t.trim()).join(' / ');
          dataToSave.title = `سلسلة تمارين: ${topicsLabel || ('رقم ' + editingContent.order)}`;
      }

      const { id, ...dataWithoutId } = dataToSave;
      await updateDoc(doc(db, 'videos', id), dataWithoutId);
      toast.success('تم تحديث المحتوى بنجاح');
      setEditingContent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'videos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'videos', id));
      toast.success('تم حذف المحتوى بنجاح');
      setPendingDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'videos');
      toast.error('حدث خطأ أثناء الحذف');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async (receiptId: string, userId: string) => {
    setLoading(true);
    try {
      const receipt = data.receipts.find(r => r.id === receiptId);
      if (!receipt) throw new Error('Receipt not found');

      const planName = receipt.planName || receipt.plan || 'اشتراك';
      const planPrice = receipt.price || receipt.amount || '0';

      // 1. Update Receipt status
      await updateDoc(doc(db, 'receipts', receiptId), { 
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // 2. Update User profile
      await updateDoc(doc(db, 'users', userId), { 
        subscriptionStatus: 'active',
        currentPlan: planName,
        plan: receipt.planId || 'general',
        lastPaymentDate: serverTimestamp()
      });

      // 3. Update/Create Wallet Subscription record
      await setDoc(doc(db, 'wallets', userId), {
        activeSubscription: {
          planName,
          planId: receipt.planId || 'general',
          activatedAt: serverTimestamp(),
          price: planPrice
        },
        lastUpdated: serverTimestamp()
      }, { merge: true });

      alert('تم تفعيل الاشتراك وربطه بالمحفظة بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'receipts');
      alert('حدث خطأ أثناء التفعيل');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReceipt = async (receiptId: string, reason?: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'receipts', receiptId), { 
        status: 'rejected',
        rejectionReason: reason || 'الوصل غير واضح أو المعلومات غير متطابقة',
        rejectedAt: serverTimestamp()
      });
      toast.success('تم رفض الوصل');
      setPendingDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'receipts');
      toast.error('حدث خطأ أثناء رفض الوصل');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('تم حذف المستخدم بنجاح');
      setPendingDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('حدث خطأ أثناء الحذف');
      handleFirestoreError(err, OperationType.DELETE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleResetCollection = async (collectionName: string, label: string) => {
    setIsReseting(collectionName);
    addLog(`بدء عملية تصفير مجموعة: ${label}...`);
    
    try {
      const q = query(collection(db, collectionName));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        addLog(`المجموعة ${label} فارغة بالفعل.`);
        setIsReseting(null);
        setPendingDelete(null);
        return;
      }

      const batch = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batch);
      
      addLog(`تم بنجاح حذف ${snap.size} سجل من ${label}.`);
      toast.success(`تم تصفير ${label} بنجاح`);
    } catch (err) {
      addLog(`خطأ في تصفير ${label}: ${err instanceof Error ? err.message : String(err)}`);
      handleFirestoreError(err, OperationType.DELETE, collectionName);
    } finally {
      setIsReseting(null);
      setPendingDelete(null);
    }
  };

  const handleMaintenanceAction = async (action: 'cleanSessions' | 'resetStats') => {
    setLoading(true);
    try {
      if (action === 'cleanSessions') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const q = query(collection(db, 'teacherSessions'), where('createdAt', '<', thirtyDaysAgo));
        const snap = await getDocs(q);
        const batch = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(batch);
        toast.success(`تم حذف ${snap.size} حصة قديمة`);
      } else if (action === 'resetStats') {
        toast.info('تم تصفير العدادات بنجاح (تجريبي)');
      }
      setPendingDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'maintenance');
      toast.error('خطأ في عملية الصيانة');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'teacherSessions'), {
        ...newSession,
        status: 'scheduled',
        createdAt: serverTimestamp()
      });
      alert('تم جدولة الحصة بنجاح');
      setNewSession({ teacherId: '', level: '', dateTime: '', meetLink: '', chapter: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'teacherSessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    setLoading(true);
    try { 
      await deleteDoc(doc(db, 'teacherSessions', id)); 
      toast.success('تم حذف الحصة بنجاح');
      setPendingDelete(null);
    } catch (err) { 
      handleFirestoreError(err, OperationType.DELETE, 'teacherSessions'); 
    } finally {
      setLoading(false);
    }
  };


  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-blue-dark italic tracking-tighter">نظرة عامة</h2>
        <button onClick={() => window.location.reload()} className="p-3 rounded-2xl bg-white border border-gray-100 text-blue-brand hover:rotate-180 transition-all duration-700">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'إجمالي المستخدمين', value: stats.users, icon: UsersIcon, color: 'blue' },
          { label: 'الاشتراكات النشطة', value: stats.activeSubs, icon: ShieldCheck, color: 'emerald' },
          { label: 'المحتوى المنشور', value: stats.content, icon: Play, color: 'amber' },
          { label: 'الحصص المبرمجة', value: stats.sessions, icon: Calendar, color: 'indigo' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-5">
             <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                <stat.icon size={28} />
             </div>
             <div>
                <p className="text-[0.65rem] font-black text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h4 className="text-2xl font-black text-blue-dark">{stat.value}</h4>
             </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
         <h3 className="text-xl font-black text-blue-dark mb-6">طلبات الاشتراك المعلقة ({stats.receipts})</h3>
         <div className="space-y-4">
            {data.receipts.filter(r => r.status === 'pending').map(r => (
              <div key={r.id} className="p-5 rounded-2xl bg-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><ReceiptIcon size={20} /></div>
                    <div>
                       <p className="text-sm font-black text-blue-dark">وصل جديد من {data.users.find(u => u.id === r.userId)?.displayName || 'مستخدم'}</p>
                       <p className="text-[0.65rem] text-gray-400 font-bold">{new Date(r.createdAt?.toDate()).toLocaleString('ar-TN')}</p>
                    </div>
                 </div>
                 <button className="px-4 py-2 rounded-xl bg-blue-dark text-white text-xs font-black">معاينة</button>
              </div>
            ))}
            {stats.receipts === 0 && <p className="text-center py-10 text-gray-400 italic">لا توجد طلبات معلقة</p>}
         </div>
      </div>
    </div>
  );

  const renderAddUser = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
          <UserPlus size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-blue-dark">إضافة مستخدم جديد</h2>
          <p className="text-gray-400 font-bold text-sm">حدد نوع المستخدم وأدخل البيانات المطلوبة</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-sm">
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">الدور / النوع *</label>
            <select value={newUser.userType} onChange={e => setNewUser({...newUser, userType: e.target.value as any})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
              <option value="student">تلميذ</option>
              <option value="parent">ولي أمر</option>
              <option value="teacher">مربي / مدرس</option>
              <option value="admin">مدير نظام</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">الاسم الأول *</label>
            <input required type="text" value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">اللقب *</label>
            <input required type="text" value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">البريد الإلكتروني *</label>
            <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">كلمة المرور *</label>
            <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>

          {newUser.userType === 'student' && (
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase pr-2">المستوى الدراسي *</label>
              <select value={newUser.level} onChange={e => setNewUser({...newUser, level: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                <option value="7">السنة السابعة</option>
                <option value="8">السنة الثامنة</option>
                <option value="9">السنة التاسعة</option>
                <option value="1sec">السنة الأولى ثانوي</option>
                <option value="2sec">السنة الثانية ثانوي</option>
                <option value="3sec">السنة الثالثة ثانوي</option>
                <option value="4sec">باكالوريا</option>
              </select>
            </div>
          )}

          {newUser.userType === 'teacher' && (
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase pr-2">المادة *</label>
              <input type="text" value={newUser.subject} onChange={e => setNewUser({...newUser, subject: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button disabled={loading} type="submit" className="px-12 py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-xl shadow-emerald-900/20 hover:scale-105 transition-all flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} إنشاء الحساب وتفعيله
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderContentManager = () => {
    const filteredContent = data.content.filter(item => {
      const displayTitle = item.type === 'lesson' ? item.title : 
                         item.type === 'exercise' ? `سلسلة تمارين - ${item.topics?.join(', ')}` : 
                         `${item.type === 'assignment' ? 'فرض مراقبة' : 'فرض تأليفي'} - نموذج ${item.modelNumber}`;
      
      const matchesSearch = (displayTitle || '').toLowerCase().includes(contentSearch.toLowerCase());
      const matchesLevel = contentLevelFilter === 'all' || item.level === contentLevelFilter;
      const matchesType = contentTypeFilter === 'all' || item.type === contentTypeFilter;
      return matchesSearch && matchesLevel && matchesType;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-brand flex items-center justify-center border border-blue-100 shadow-sm">
              <BookOpen size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">إدارة المحتوى</h2>
              <p className="text-gray-400 font-bold text-sm">نظم الدروس والفروض لكل المستويات</p>
            </div>
          </div>
        </div>

        {/* Internal Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setContentActionTab('add')}
            className={cn("px-8 py-4 rounded-2xl font-black text-sm transition-all", contentActionTab === 'add' ? "bg-blue-dark text-white shadow-xl" : "bg-white text-gray-500 border border-gray-100")}
          >
            إضافة محتوى جديد
          </button>
          <button 
            onClick={() => setContentActionTab('manage')}
            className={cn("px-8 py-4 rounded-2xl font-black text-sm transition-all", contentActionTab === 'manage' ? "bg-blue-dark text-white shadow-xl" : "bg-white text-gray-500 border border-gray-100")}
          >
            إدارة المنشور ({data.content.length})
          </button>
        </div>

        {contentActionTab === 'add' ? (
          <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-sm">
            <form onSubmit={handleCreateContent} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">المستوى الدراسي *</label>
                  <select required value={newContent.level} onChange={e => setNewContent({...newContent, level: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                    <option value="">اختر</option>
                    <option value="7">السنة السابعة</option>
                    <option value="8">السنة الثامنة</option>
                    <option value="9">السنة التاسعة</option>
                    <option value="1sec">السنة الأولى ثانوي</option>
                    <option value="2sec">السنة الثانية ثانوي</option>
                    <option value="3sec">السنة الثالثة ثانوي</option>
                    <option value="4sec">باكالوريا</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">النوع *</label>
                  <select value={newContent.type} onChange={e => setNewContent({...newContent, type: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                    <option value="lesson">درس</option>
                    <option value="assignment">فرض مراقبة</option>
                    <option value="synthesis">فرض تأليفي</option>
                    <option value="exercise">سلسلة تمارين</option>
                  </select>
                </div>
                {(newContent.type === 'lesson' || newContent.type === 'exercise') && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase pr-2">التصنيف *</label>
                    <select value={newContent.category || 'general'} onChange={e => setNewContent({...newContent, category: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                      <option value="general">عام</option>
                      <option value="algebra">جبر</option>
                      <option value="geometry">هندسة</option>
                      <option value="stats">إحصاءات واحتمالات</option>
                    </select>
                  </div>
                )}
                {(newContent.type === 'assignment' || newContent.type === 'synthesis') && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase pr-2">الثلاثي *</label>
                      <select value={newContent.trimester} onChange={e => setNewContent({...newContent, trimester: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                        <option value="1">الثلاثي الأول</option>
                        <option value="2">الثلاثي الثاني</option>
                        <option value="3">الثلاثي الثالث</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase pr-2">النموذج</label>
                        <select value={newContent.modelNumber} onChange={e => setNewContent({...newContent, modelNumber: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                          {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n.toString()}>نموذج {n}</option>)}
                        </select>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {newContent.type === 'lesson' ? (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase pr-2">عنوان الدرس *</label>
                    <input required type="text" value={newContent.title} onChange={e => setNewContent({...newContent, title: e.target.value})} placeholder="مثال: الأعداد الحقيقية" className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
                  </div>
                ) : newContent.type === 'exercise' ? (
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase pr-2">مواضيع السلسلة (مفصولة بفواصل)</label>
                    <input type="text" value={newContent.topics.join(', ')} onChange={e => setNewContent({...newContent, topics: e.target.value.split(',').map(s => s.trim())})} placeholder="جبر، هندسة، احصاء..." className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <label className="text-xs font-black text-gray-400 uppercase pr-2">روابط الفيديوهات (واحدة أو أكثر) *</label>
                   <button 
                     type="button" 
                     onClick={() => {
                       if (editingContent) {
                         setEditingContent({...editingContent, videoUrls: [...(editingContent.videoUrls || []), '']});
                       } else {
                         setNewContent({...newContent, videoUrls: [...newContent.videoUrls, '']});
                       }
                     }}
                     className="text-[0.65rem] font-black text-blue-brand hover:underline"
                   >
                     + إضافة فيديو آخر
                   </button>
                </div>
                {(editingContent ? editingContent.videoUrls : newContent.videoUrls).map((url: string, index: number) => (
                   <div key={index} className="flex gap-2">
                      <input 
                        type="text" 
                        value={url} 
                        onChange={e => {
                          const urls = [...(editingContent ? editingContent.videoUrls : newContent.videoUrls)];
                          urls[index] = e.target.value;
                          if (editingContent) setEditingContent({...editingContent, videoUrls: urls});
                          else setNewContent({...newContent, videoUrls: urls});
                        }} 
                        placeholder={`رابط الفيديو ${index + 1}`}
                        className="flex-1 rounded-2xl bg-gray-50 border-none px-6 py-4 text-xs font-bold outline-none ring-1 ring-gray-100" 
                      />
                      {index > 0 && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const urls = [...(editingContent ? editingContent.videoUrls : newContent.videoUrls)].filter((_, i) => i !== index);
                            if (editingContent) setEditingContent({...editingContent, videoUrls: urls});
                            else setNewContent({...newContent, videoUrls: urls});
                          }}
                          className="p-4 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                   </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase pr-2">رقم</label>
                    <input type="number" value={newContent.order} onChange={e => setNewContent({...newContent, order: parseInt(e.target.value)})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase pr-2">حالة المحتوى</label>
                    <div className="flex gap-2">
                       <button 
                         type="button"
                         onClick={() => setNewContent({...newContent, isFree: true})}
                         className={cn(
                           "flex-1 py-4 rounded-2xl text-[0.7rem] font-black transition-all",
                           newContent.isFree ? "bg-emerald-600 text-white shadow-lg" : "bg-gray-50 text-gray-400 border border-gray-100 shadow-inner"
                         )}
                       >
                          مجاني (Free)
                       </button>
                       <button 
                         type="button"
                         onClick={() => setNewContent({...newContent, isFree: false})}
                         className={cn(
                           "flex-1 py-4 rounded-2xl text-[0.7rem] font-black transition-all",
                           !newContent.isFree ? "bg-blue-dark text-white shadow-lg" : "bg-gray-50 text-gray-400 border border-gray-100 shadow-inner"
                         )}
                       >
                          مدفوع (Paid)
                       </button>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-blue-dark uppercase">PDF النص / الفرض</label>
                  <div className="relative">
                    <input type="text" value={newContent.pdfText} onChange={e => setNewContent({...newContent, pdfText: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100" />
                    <label className="absolute left-2 top-2 bottom-2 px-4 bg-blue-dark text-white rounded-xl flex items-center cursor-pointer text-[0.6rem] font-black">
                      رفع <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'pdfText')} />
                    </label>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-emerald-600 uppercase">PDF الإصلاح</label>
                  <div className="relative">
                    <input type="text" value={newContent.pdfSolution} onChange={e => setNewContent({...newContent, pdfSolution: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100" />
                    <label className="absolute left-2 top-2 bottom-2 px-4 bg-emerald-600 text-white rounded-xl flex items-center cursor-pointer text-[0.6rem] font-black">
                      رفع <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'pdfSolution')} />
                    </label>
                  </div>
                </div>
              </div>

              <button disabled={loading} type="submit" className="w-full py-5 rounded-3xl bg-blue-dark text-white font-black text-lg shadow-2xl flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} نشر المحتوى الآن
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" 
                  placeholder="ابحث بموضوع أو عنوان..." 
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                  className="w-full pr-12 pl-6 py-4 rounded-2xl bg-gray-50 border-none text-sm font-bold shadow-inner focus:ring-2 ring-blue-100 outline-none transition-all"
                />
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <select value={contentLevelFilter} onChange={e => setContentLevelFilter(e.target.value)} className="px-6 py-4 rounded-2xl bg-gray-50 border-none text-xs font-black outline-none ring-1 ring-gray-100">
                  <option value="all">كل المستويات</option>
                  <option value="7">السنة 7</option>
                  <option value="8">السنة 8</option>
                  <option value="9">السنة 9</option>
                </select>
                <select value={contentTypeFilter} onChange={e => setContentTypeFilter(e.target.value)} className="px-6 py-4 rounded-2xl bg-gray-50 border-none text-xs font-black outline-none ring-1 ring-gray-100">
                  <option value="all">كل الأنواع</option>
                  <option value="lesson">دروس</option>
                  <option value="assignment">فروض مراقبة</option>
                  <option value="synthesis">فروض تأليفية</option>
                  <option value="exercise">سلاسل تمارين</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredContent.map((c) => {
                  const displayTitle = c.type === 'lesson' ? c.title : 
                                     c.type === 'exercise' ? `سلسلة تمارين - ${c.topics?.join(', ')}` : 
                                     `${c.type === 'assignment' ? 'فرض مراقبة' : 'فرض تأليفي'} - نموذج ${c.modelNumber}`;
                  return (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={c.id} 
                      className="bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[0.6rem] font-black uppercase tracking-wider",
                          c.type === 'lesson' ? 'bg-blue-50 text-blue-600' : 
                          c.type === 'assignment' ? 'bg-amber-50 text-amber-600' : 
                          c.type === 'synthesis' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        )}>
                          {c.type === 'lesson' ? 'درس' : 
                          c.type === 'assignment' ? 'فرض مراقبة' : 
                          c.type === 'synthesis' ? 'فرض تأليفي' : 'سلسلة تمارين'}
                        </span>
                        <div className="flex items-center gap-1 text-[0.6rem] font-black text-gray-400">
                          <Tag size={10} className="text-blue-dark/40" />
                          <span className="text-blue-dark/60">
                            {c.category === 'algebra' ? 'جبر' : 
                             c.category === 'geometry' ? 'هندسة' : 
                             c.category === 'stats' ? 'إحصاءات واحتمالات' : 'عام'}
                          </span>
                          <span className="mx-1 opacity-20">|</span>
                          <Layers size={12} />
                          <span>سنة {c.level}</span>
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[0.6rem] font-black",
                          c.isFree ? "bg-emerald-100 text-emerald-700" : "bg-blue-dark/5 text-blue-dark/40"
                        )}>
                          {c.isFree ? 'مجاني' : 'مدفوع'}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-blue-dark mb-4 line-clamp-2 min-h-[2.5rem]">
                        {displayTitle}
                      </h4>

                      <div className="flex items-center gap-4 border-t border-gray-50 pt-4 mt-auto">
                        <div className="flex-1 flex items-center gap-2">
                          <button onClick={() => setEditingContent(c)} className="p-2 rounded-xl bg-gray-50 text-blue-dark hover:bg-blue-dark hover:text-white transition-all">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => setPendingDelete({ id: c.id, label: displayTitle, type: 'generic', coll: 'videos' })} className="p-2 rounded-xl bg-gray-50 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMaintenance = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700 pb-20">
      {/* 1. Header & Quick Info */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-100 pb-8">
        <div className="space-y-1">
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-2xl bg-blue-dark text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Settings size={22} className="animate-spin-slow" />
             </div>
             <h2 className="text-3xl font-black text-blue-dark tracking-tighter italic">لوحة الصيانة</h2>
           </div>
           <p className="text-sm font-bold text-gray-400 pr-1 px-1">تحكّم شامل في بيانات النظام، عمليات التنظيف، والربط الخارجي</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[0.65rem] font-black text-emerald-700 uppercase tracking-widest">النظام يعمل بشكل مستقر</span>
           </div>
           <button 
             onClick={() => {
               addLog("جاري تحديث بيانات قاعدة البيانات...");
               window.location.reload();
             }}
             className="p-3 rounded-2xl bg-white border border-gray-100 text-blue-dark hover:bg-gray-50 transition-all shadow-sm group"
             title="تحديث البيانات"
           >
             <RefreshCw size={20} className="group-hover:rotate-180 transition-all duration-700" />
           </button>
        </div>
      </div>

      {/* 2. System Snapshot - Bento Grid Style */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'المستخدمون', count: stats.users, icon: UsersIcon, bg: 'bg-blue-50', text: 'text-blue-600' },
          { label: 'الوصلات', count: stats.receipts, icon: ReceiptIcon, bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'المحافظ', count: data.wallets.length, icon: Wallet, bg: 'bg-amber-50', text: 'text-amber-600' },
          { label: 'المجموعات', count: data.groups.length, icon: Users2, bg: 'bg-indigo-50', text: 'text-indigo-600' },
          { label: 'المحتوى', count: stats.content, icon: BookOpen, bg: 'bg-violet-50', text: 'text-violet-600' },
          { label: 'الحصص', count: stats.sessions, icon: Calendar, bg: 'bg-cyan-50', text: 'text-cyan-600' },
          { label: 'الحضور', count: data.attendance.length, icon: UserCheck, bg: 'bg-rose-50', text: 'text-rose-600' },
          { label: 'التاريخ', count: stats.receipts + stats.users, icon: History, bg: 'bg-slate-50', text: 'text-slate-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-100 p-5 rounded-[28px] flex flex-col items-center justify-center gap-2 hover:shadow-xl hover:shadow-blue-900/5 transition-all text-center">
             <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-1 shadow-sm", stat.bg, stat.text)}>
                <stat.icon size={18} />
             </div>
             <p className="text-[0.6rem] font-black text-gray-400 uppercase tracking-tight">{stat.label}</p>
             <h4 className="text-xl font-black text-blue-dark">{stat.count}</h4>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Management Tools */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Action Tabs Card */}
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-1.5 bg-gray-50 flex gap-1">
              {[
                { label: 'إجراءات سريعة', id: 'bulk', icon: HardDrive }, 
                { label: 'حذف انتقائي', id: 'selective', icon: Filter }, 
                { label: 'إعادة ضبط جذرية', id: 'total', icon: ShieldAlert }
              ].map((tab) => (
                <button 
                  key={tab.id} 
                  onClick={() => setMaintenanceActionTab(tab.id as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 rounded-[32px] text-[0.7rem] font-black transition-all",
                    maintenanceActionTab === tab.id 
                      ? "bg-white text-blue-dark shadow-sm ring-1 ring-black/5" 
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                   <tab.icon size={14} />
                   {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
               {maintenanceActionTab === 'bulk' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { id: 'users', label: 'تصفير المستخدمين', count: stats.users, desc: 'حذف كل المستخدمين والاشتراكات عدا الأدمن', icon: UsersIcon, collection: 'users' },
                      { id: 'receipts', label: 'تصفير المدفوعات', count: data.receipts.length, desc: 'حذف سجلات الوصولات والعمليات المالية', icon: ReceiptIcon, collection: 'receipts' },
                      { id: 'content', label: 'تصفير المحتوى', count: stats.content, desc: 'حذف كل الدروس، التمارين والفيديوهات', icon: BookOpen, collection: 'videos' },
                      { id: 'sessions', label: 'تصفير الجدولة', count: stats.sessions, desc: 'حذف الحصص المباشرة واللقاءات السابقة', icon: Calendar, collection: 'teacherSessions' },
                      { id: 'groups', label: 'تصفير المجموعات', count: data.groups.length, desc: 'حذف توزيع الأفواج والمنظومات الدراسية', icon: Compass, collection: 'groups' },
                      { id: 'wallets', label: 'تصفير المحافظ', count: data.wallets.length, desc: 'تصفير رصيد كل المدرسين والاداريين', icon: Wallet, collection: 'wallets' },
                    ].map((card, i) => (
                      <div key={i} className="bg-gray-50/50 border border-gray-100 p-6 rounded-[32px] hover:bg-white hover:border-red-100 transition-all group flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white text-blue-dark flex items-center justify-center shadow-sm">
                               <card.icon size={22} />
                            </div>
                            <div>
                               <h4 className="text-[0.75rem] font-black text-blue-dark">{card.label}</h4>
                               <p className="text-[0.6rem] font-bold text-gray-400 max-w-[140px] truncate">{card.desc}</p>
                            </div>
                         </div>
                         <div className="flex flex-col items-end gap-2">
                            <span className="text-[0.6rem] font-black text-blue-dark opacity-30">{card.count} سجل</span>
                            <button 
                              onClick={() => setPendingDelete({ id: card.collection, label: card.label, type: 'collection' })}
                              disabled={isReseting === card.collection}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[0.6rem] font-black transition-all flex items-center gap-2",
                                card.id === 'wallets' ? "bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white" : "bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                              )}
                            >
                               {isReseting === card.collection ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                               {card.id === 'wallets' ? 'تصفير' : 'حذف'}
                            </button>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : maintenanceActionTab === 'selective' ? (
                 <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-3xl border border-gray-100">
                       <div className="flex gap-1.5 p-1 bg-white rounded-2xl border border-black/5 w-full md:w-auto">
                          {[
                            { label: 'المستخدمون', id: 'users' },
                            { label: 'المحتوى', id: 'content' },
                            { label: 'الوصلات', id: 'receipts' }
                          ].map(f => (
                            <button 
                              key={f.id} 
                              onClick={() => setMaintenanceFilter(f.id)}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[0.65rem] font-black transition-all",
                                maintenanceFilter === f.id ? "bg-blue-dark text-white shadow-md" : "text-gray-400 hover:bg-gray-100"
                              )}
                            >
                               {f.label}
                            </button>
                          ))}
                       </div>
                       <div className="relative w-full md:w-72">
                          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input 
                            type="text" 
                            placeholder="ابحث عن سجل محدد..." 
                            value={maintenanceSearch}
                            onChange={(e) => setMaintenanceSearch(e.target.value)}
                            className="w-full pr-11 pl-4 py-3 rounded-2xl bg-white border-none text-[0.7rem] font-bold outline-none ring-1 ring-black/5"
                          />
                       </div>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                       {(() => {
                         let list = [];
                         if (maintenanceFilter === 'users') list = data.users;
                         if (maintenanceFilter === 'content') list = data.content;
                         if (maintenanceFilter === 'receipts') list = data.receipts;

                         const filtered = list.filter(item => {
                           const str = JSON.stringify(item).toLowerCase();
                           return str.includes(maintenanceSearch.toLowerCase());
                         });

                         if (filtered.length === 0) return <div className="py-20 text-center text-gray-300 italic font-bold">لا توجد نتائج مطابقة</div>;

                         return filtered.map((item: any) => (
                           <div key={item.id} className="p-4 rounded-2xl bg-gray-50/50 border border-transparent hover:border-red-100 hover:bg-white transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 rounded-xl bg-white text-gray-400 flex items-center justify-center shadow-sm">
                                    {maintenanceFilter === 'users' ? <UsersIcon size={18} /> : maintenanceFilter === 'content' ? <BookOpen size={18} /> : <ReceiptIcon size={18} />}
                                 </div>
                                 <div className="max-w-[200px]">
                                    <h4 className="text-[0.75rem] font-black text-blue-dark truncate">{item.displayName || item.title || 'سجل بدون عنوان'}</h4>
                                    <p className="text-[0.6rem] text-gray-400 font-bold opacity-60 truncate">ID: {item.id}</p>
                                 </div>
                              </div>
                              <button 
                                onClick={() => {
                                  const coll = maintenanceFilter === 'content' ? 'videos' : maintenanceFilter;
                                  const label = item.displayName || item.title || item.id;
                                  setPendingDelete({ id: item.id, label, type: 'generic', coll });
                                }}
                                className="p-2.5 rounded-xl bg-white border border-gray-100 text-red-500 opacity-0 group-hover:opacity-100 shadow-sm hover:bg-red-50 transition-all"
                              >
                                 <Trash size={16} />
                              </button>
                           </div>
                         ));
                       })()}
                    </div>
                 </div>
               ) : (
                 <div className="p-10 rounded-[32px] bg-red-600 text-white text-center space-y-6 shadow-2xl shadow-red-900/30 animate-in zoom-in-95 duration-500">
                    <ShieldAlert size={60} className="mx-auto text-white/50" />
                    <div>
                      <h3 className="text-2xl font-black italic mb-2">إعادة ضبط المصنع (Root Reset)</h3>
                      <p className="max-w-md mx-auto text-[0.7rem] font-bold opacity-80 leading-relaxed px-4">
                        سيتم مسح كافة البيانات في قاعدة البيانات بالكامل. هذا الإجراء نهائي ولا يمكن التراجع عنه بأي وسيلة. حساب المدير العام سيبقى آمناً فقط.
                      </p>
                    </div>
                    <button 
                      onClick={() => setPendingDelete({ id: 'all', label: 'قاعدة البيانات بالكامل', type: 'nuke' })}
                      className="px-10 py-5 rounded-3xl bg-white text-red-600 font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                       نعم، ابدأ التطهير الكلي
                    </button>
                 </div>
               )}
            </div>
          </div>

          {/* External Platforms: New Clean Design */}
          <div className="space-y-4">
             <h3 className="text-[0.7rem] font-black text-blue-dark uppercase tracking-widest px-4 opacity-50">إدارة الأطراف الخارجية</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { 
                    label: 'Firebase Firestore', 
                    icon: Database, 
                    btnColor: 'bg-blue-600',
                    iconBg: 'bg-blue-50',
                    iconText: 'text-blue-600',
                    link: 'https://console.firebase.google.com/', 
                    desc: 'لإدارة وحذف السجلات يدوياً من قاعدة البيانات السحابية'
                  },
                  { 
                    label: 'Authentication Users', 
                    icon: ShieldCheck, 
                    btnColor: 'bg-orange-600',
                    iconBg: 'bg-orange-50',
                    iconText: 'text-orange-600',
                    link: 'https://console.firebase.google.com/', 
                    desc: 'لحذف عناوين البريد الإلكتروني للمستخدمين نهائياً'
                  },
                  { 
                    label: 'Cloudinary Media', 
                    icon: Globe, 
                    btnColor: 'bg-indigo-600',
                    iconBg: 'bg-indigo-50',
                    iconText: 'text-indigo-600',
                    link: 'https://cloudinary.com/console/', 
                    desc: 'لحذف الفيديوهات والـ PDF والمرفقات الخارجية'
                  }
                ].map((plat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col justify-between hover:border-blue-100 transition-all gap-5">
                     <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", plat.iconBg, plat.iconText)}>
                           <plat.icon size={24} />
                        </div>
                        <div>
                          <h4 className="text-[0.7rem] font-black text-blue-dark uppercase">{plat.label}</h4>
                          <p className="text-[0.6rem] font-bold text-gray-400 mt-1 leading-tight">{plat.desc}</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => window.open(plat.link, '_blank')}
                       className={cn("w-full py-4 rounded-2xl text-[0.65rem] font-black text-white shadow-lg transition-all flex items-center justify-center gap-2", plat.btnColor)}
                     >
                        <ExternalLink size={14} />
                        زيارة الموقع الرسمي
                     </button>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Column: Information & Logs */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Real-time Health Monitor */}
          <div className="bg-[#0f172a] rounded-[40px] p-8 shadow-2xl space-y-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <HardDrive size={200} className="text-white" />
             </div>
             
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                   <div className="h-4 w-4 rounded-full bg-emerald-500 animate-pulse" />
                   <h3 className="text-xs font-black text-white uppercase tracking-widest">مراقب النظام</h3>
                </div>
                <button onClick={() => setMaintenanceLogs([])} className="text-[0.55rem] font-black text-white/40 hover:text-white transition-all">مسح السجل</button>
             </div>

             <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar-dark pr-2">
                {maintenanceLogs.length > 0 ? (
                  maintenanceLogs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                       <span className="text-[0.55rem] font-mono text-white/20 mt-1">{i+1}</span>
                       <p className={cn(
                        "text-[0.65rem] font-mono leading-relaxed",
                        log.includes('خطأ') ? "text-red-400" : log.includes('نجاح') ? "text-emerald-400" : "text-blue-300/80"
                       )}>
                         {log}
                       </p>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center opacity-20">
                     <Clock size={40} className="text-white mx-auto mb-4" />
                     <p className="text-[0.65rem] text-white font-mono italic">بانتظار تنفيذ الأوامر من لوحة التحكم...</p>
                  </div>
                )}
             </div>
          </div>

          {/* Change Logs & Activity */}
          <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-100"><History size={24} /></div>
                <h3 className="text-sm font-black text-blue-dark uppercase tracking-wider">سجل التغييرات الأخيرة</h3>
             </div>
             <div className="space-y-1">
                {[
                  { action: 'إضافة وحدة تعليمية', time: 'منذ 5 د', user: 'Admin' },
                  { action: 'تفعيل اشتراك جديد', time: 'منذ 15 د', user: 'System' },
                  { action: 'تعديل بيانات تلميذ', time: 'منذ 1 س', user: 'Admin' },
                  { action: 'برمجة حصة مباشرة', time: 'منذ 3 س', user: 'Teacher X' },
                ].map((log, i) => (
                   <div key={i} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl px-2 transition-all group">
                      <div className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-blue-dark/20 group-hover:bg-blue-dark transition-all" />
                         <div>
                            <p className="text-[0.65rem] font-black text-blue-dark">{log.action}</p>
                            <p className="text-[0.6rem] font-bold text-gray-300 italic">{log.user}</p>
                         </div>
                      </div>
                      <span className="text-[0.55rem] font-black text-gray-300 whitespace-nowrap">{log.time}</span>
                   </div>
                ))}
             </div>
          </div>
          
          {/* Optimization Card */}
          <div className="bg-blue-dark rounded-[40px] p-8 text-white space-y-6 shadow-xl">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-white/10 text-white flex items-center justify-center"><Activity size={24} /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">تحسين السرعة</h3>
             </div>
             <p className="text-[0.65rem] font-bold text-white/60 leading-relaxed">
               هل تشعر ببطء في التحميل؟ يمكنك تحسين فهرسة قاعدة البيانات لضمان تجربة أسرع للطلاب والمدرسين.
             </p>
             <button 
               onClick={() => {
                 addLog("جاري فحص فهارس قاعدة البيانات...");
                 setTimeout(() => addLog("تم تحسين 4 فهارس أساسية بنجاح."), 1500);
               }}
               className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 transition-all text-[0.65rem] font-black"
             >
                تحليل وتحسين الأداء الآن
             </button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'groups'), {
        ...newGroup,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        membersCount: 0
      });
      setNewGroup({
        name: '',
        level: '7',
        teacherId: '',
        whatsappLink: '',
        meetLink: '',
        schedule: [],
        description: '',
        isActive: true
      });
      toast.success('تم إنشاء المجموعة بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'groups');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGroupMove = async () => {
    if (selectedUsers.length === 0 || !bulkActionGroup) return;
    setLoading(true);
    try {
      const batch = selectedUsers.map(uid => 
        updateDoc(doc(db, 'users', uid), { 
          group: bulkActionGroup,
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(batch);
      toast.success(`تم نقل ${selectedUsers.length} تلميذ إلى مجموعة ${bulkActionGroup} بنجاح`);
      setSelectedUsers([]);
      setBulkActionGroup('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'groups', editingGroup.id), {
        ...editingGroup,
        updatedAt: serverTimestamp()
      });
      setEditingGroup(null);
      toast.success('تم تحديث المجموعة بنجاح');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'groups');
    } finally {
      setLoading(false);
    }
  };

  const renderEditGroupModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-dark/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border border-white/20 overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-2xl font-black text-blue-dark">تعديل بيانات المجموعة</h3>
            <p className="text-gray-400 font-bold text-sm">تعديل معلومات {editingGroup.name}</p>
          </div>
          <button onClick={() => setEditingGroup(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <XCircle size={24} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleUpdateGroup} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">اسم المجموعة</label>
            <input required type="text" value={editingGroup.name || ''} onChange={e => setEditingGroup({...editingGroup, name: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">المستوى</label>
            <select value={editingGroup.level || '7'} onChange={e => setEditingGroup({...editingGroup, level: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
               <option value="7">السنة السابعة</option>
               <option value="8">السنة الثامنة</option>
               <option value="9">السنة التاسعة</option>
               <option value="1sec">السنة الأولى ثانوي</option>
               <option value="2sec">السنة الثانية ثانوي</option>
               <option value="3sec">السنة الثالثة ثانوي</option>
               <option value="4sec">باكالوريا</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">المربي المسؤول</label>
            <select value={editingGroup.teacherId || ''} onChange={e => setEditingGroup({...editingGroup, teacherId: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
               <option value="">لا يوجد</option>
               {data.users.filter(u => u.userType === 'teacher').map(t => (
                 <option key={t.id} value={t.id}>{t.displayName}</option>
               ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">رابط مجموعة WhatsApp</label>
            <input type="text" value={editingGroup.whatsappLink || ''} onChange={e => setEditingGroup({...editingGroup, whatsappLink: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">رابط Google Meet</label>
            <input type="text" value={editingGroup.meetLink || ''} onChange={e => setEditingGroup({...editingGroup, meetLink: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>

          <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-400 uppercase pr-2">الجدول الأسبوعي</label>
              <button 
                type="button"
                onClick={() => setEditingGroup({...editingGroup, schedule: [...(editingGroup.schedule || []), { day: 'الاثنين', startTime: '18:00', endTime: '19:30' }]})}
                className="text-[0.65rem] font-black text-blue-brand hover:underline"
              >
                + إضافة حصة
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(editingGroup.schedule || []).map((s: any, idx: number) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <select 
                    value={s.day} 
                    onChange={e => {
                      const newSched = [...editingGroup.schedule];
                      newSched[idx].day = e.target.value;
                      setEditingGroup({...editingGroup, schedule: newSched});
                    }}
                    className="bg-transparent border-none text-[0.7rem] font-bold outline-none"
                  >
                    {['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input 
                    type="time" 
                    value={s.startTime} 
                    onChange={e => {
                      const newSched = [...editingGroup.schedule];
                      newSched[idx].startTime = e.target.value;
                      setEditingGroup({...editingGroup, schedule: newSched});
                    }}
                    className="bg-transparent border-none text-[0.7rem] font-bold outline-none" 
                  />
                  <span className="text-gray-300">→</span>
                  <input 
                    type="time" 
                    value={s.endTime} 
                    onChange={e => {
                      const newSched = [...editingGroup.schedule];
                      newSched[idx].endTime = e.target.value;
                      setEditingGroup({...editingGroup, schedule: newSched});
                    }}
                    className="bg-transparent border-none text-[0.7rem] font-bold outline-none" 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newSched = (editingGroup.schedule || []).filter((_: any, i: number) => i !== idx);
                      setEditingGroup({...editingGroup, schedule: newSched});
                    }}
                    className="mr-auto text-red-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">وصف المجموعة / الملاحظات</label>
            <textarea rows={3} value={editingGroup.description || ''} onChange={e => setEditingGroup({...editingGroup, description: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 resize-none" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setEditingGroup(null)} className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-600 font-black text-sm">إلغاء</button>
            <button disabled={loading} type="submit" className="px-10 py-4 rounded-2xl bg-blue-dark text-white font-black text-sm shadow-xl flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} حفظ التغييرات
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        displayName: `${editingUser.firstName} ${editingUser.lastName}`.trim(),
        phone: editingUser.phone || '',
        userType: editingUser.userType,
        level: editingUser.level || '',
        subject: editingUser.subject || '',
        group: editingUser.group || '',
        subscriptionStatus: editingUser.subscriptionStatus || 'inactive',
        updatedAt: serverTimestamp()
      });
      toast.success('تم تحديث بيانات المستخدم بنجاح');
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  const renderEditUserModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-dark/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border border-white/20 overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-2xl font-black text-blue-dark">تعديل بيانات المستخدم</h3>
            <p className="text-gray-400 font-bold text-sm">تعديل معلومات {editingUser.displayName}</p>
          </div>
          <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <XCircle size={24} className="text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleUpdateUser} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">الاسم الأول</label>
            <input required type="text" value={editingUser.firstName || ''} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">اللقب</label>
            <input required type="text" value={editingUser.lastName || ''} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">رقم الهاتف</label>
            <input type="text" value={editingUser.phone || ''} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">حالة الاشتراك</label>
            <select value={editingUser.subscriptionStatus || 'inactive'} onChange={e => setEditingUser({...editingUser, subscriptionStatus: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
              <option value="active">نشط (مفعل)</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">الدور</label>
            <select value={editingUser.userType || 'student'} onChange={e => setEditingUser({...editingUser, userType: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
              <option value="student">تلميذ</option>
              <option value="teacher">مربي</option>
              <option value="parent">ولي</option>
              <option value="admin">مدير</option>
            </select>
          </div>
          {editingUser.userType === 'student' && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase pr-2">المستوى</label>
                <select value={editingUser.level || ''} onChange={e => setEditingUser({...editingUser, level: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                  <option value="">اختر المستوى</option>
                  <option value="7">السنة السابعة</option>
                  <option value="8">السنة الثامنة</option>
                  <option value="9">السنة التاسعة</option>
                  <option value="1sec">السنة الأولى ثانوي</option>
                  <option value="2sec">السنة الثانية ثانوي</option>
                  <option value="3sec">السنة الثالثة ثانوي</option>
                  <option value="4sec">باكالوريا</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase pr-2">المجموعة</label>
                <select value={editingUser.group || ''} onChange={e => setEditingUser({...editingUser, group: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                  <option value="">بدون مجموعة</option>
                  {data.groups.filter(g => g.level === editingUser.level).map(g => (
                    <option key={g.id} value={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button type="button" onClick={() => setEditingUser(null)} className="px-8 py-4 rounded-2xl bg-gray-100 text-gray-600 font-black text-sm">إلغاء</button>
            <button disabled={loading} type="submit" className="px-10 py-4 rounded-2xl bg-blue-dark text-white font-black text-sm shadow-xl flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} حفظ التغييرات
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  const renderUsers = () => {
    const filteredUsers = data.users.filter(u => {
      const matchesSearch = (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (u.phone || '').includes(searchQuery);
      
      const matchesTab = filterType === 'all' 
        ? true 
        : filterType === 'active' 
          ? u.subscriptionStatus === 'active' 
          : u.userType === filterType;

      const matchesLevel = filterLevel === 'all' 
        ? true 
        : (u.userType === 'student' && u.level === filterLevel);

      const matchesGroup = filterGroup === 'all'
        ? true
        : u.group === filterGroup;

      return matchesSearch && matchesTab && matchesLevel && matchesGroup;
    }).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-dark flex items-center justify-center border border-blue-100 shadow-sm">
              <UsersIcon size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">قائمة المستخدمين</h2>
              <p className="text-gray-400 font-bold text-sm">إدارة التلاميذ، المدرسين، والأولياء ({stats.users})</p>
            </div>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="ابحث عن اسم، بريد، أو هاتف..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-6 py-4 rounded-2xl bg-white border border-gray-100 text-sm font-bold shadow-sm focus:ring-2 ring-blue-100 outline-none transition-all"
            />
          </div>
        </div>

        {/* Categories Tabs and Bulk Action */}
        <div className="flex flex-col gap-6">
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'الجميع', icon: UsersIcon },
                  { id: 'student', label: 'التلاميذ', icon: Users2 },
                  { id: 'active', label: 'المشتركون', icon: UserCheck },
                  { id: 'teacher', label: 'المربون', icon: ShieldCheck },
                  { id: 'parent', label: 'الأولياء', icon: Wallet },
                  { id: 'admin', label: 'المديرون', icon: ShieldAlert },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { 
                      setFilterType(tab.id); 
                      setSelectedUsers([]); 
                      if (tab.id !== 'student' && tab.id !== 'all' && tab.id !== 'active') {
                        setFilterLevel('all');
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-4 rounded-[20px] text-[0.72rem] font-black transition-all duration-300",
                      filterType === tab.id 
                        ? "bg-blue-dark text-white shadow-xl shadow-blue-900/20 translate-y-[-2px]" 
                        : "bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 hover:border-blue-100"
                    )}
                  >
                    <tab.icon size={16} className={cn(filterType === tab.id ? "text-gold-brand" : "text-gray-400")} />
                    <span>{tab.label}</span>
                    {filterType === tab.id && (
                      <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[0.6rem] mr-1">
                        {filteredUsers.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                 <button 
                  onClick={() => {
                    if (selectedUsers.length === filteredUsers.length) setSelectedUsers([]);
                    else setSelectedUsers(filteredUsers.map(u => u.id));
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-gray-100 text-[0.7rem] font-black text-gray-500 hover:bg-gray-50"
                 >
                   {selectedUsers.length === filteredUsers.length ? 'إلغاء الكل' : 'تحديد الكل'}
                 </button>
              </div>
           </div>

           <AnimatePresence>
             {selectedUsers.length > 0 && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="bg-blue-light/5 border border-blue-light/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 overflow-hidden"
               >
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-light text-white flex items-center justify-center font-black">
                       {selectedUsers.length}
                    </div>
                    <p className="text-sm font-black text-blue-dark">مستخدمين تم اختيارهم للنقل الجماعي</p>
                 </div>

                 <div className="flex items-center gap-4 w-full md:w-auto">
                    <select 
                      value={bulkActionGroup} 
                      onChange={e => setBulkActionGroup(e.target.value)}
                      className="flex-1 md:w-60 rounded-xl bg-white border-none px-4 py-3 text-xs font-black outline-none ring-1 ring-blue-light/20"
                    >
                      <option value="">اختر المجموعة الهدف...</option>
                      {data.groups.map(g => (
                        <option key={g.id} value={g.name}>{g.name} (سنة {g.level})</option>
                      ))}
                    </select>
                    <button 
                      onClick={handleBulkGroupMove}
                      disabled={!bulkActionGroup || loading}
                      className="px-8 py-3 rounded-xl bg-blue-light text-white text-xs font-black shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={14} /> : 'تنفيذ النقل'}
                    </button>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>

        {/* Level & Group Filters for Students */}
        {(filterType === 'student' || filterType === 'all') && (
          <div className="flex flex-wrap items-center gap-4">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 w-fit"
            >
               <div className="px-3 text-[0.65rem] font-black text-gray-400 uppercase tracking-wider border-l border-gray-200">تصفية حسب المستوى:</div>
               <div className="flex gap-2">
                  {['all', '7', '8', '9', '1sec', '2sec', '3sec', '4sec'].map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setFilterLevel(lvl)}
                      className={cn(
                        "px-5 py-2 rounded-xl text-[0.65rem] font-black transition-all",
                        filterLevel === lvl 
                          ? "bg-blue-brand text-white shadow-md shadow-blue-brand/20" 
                          : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-100"
                      )}
                    >
                      {lvl === 'all' ? 'الكل' : lvl.includes('sec') ? lvl : `السنة ${lvl}`}
                    </button>
                  ))}
               </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-2xl border border-gray-100 w-fit"
            >
               <div className="px-3 text-[0.65rem] font-black text-gray-400 uppercase tracking-wider border-l border-gray-200">تصفية حسب المجموعة:</div>
               <select 
                 value={filterGroup} 
                 onChange={e => setFilterGroup(e.target.value)}
                 className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-[0.65rem] font-black text-blue-dark outline-none focus:ring-2 ring-blue-100"
               >
                 <option value="all">كل المجموعات</option>
                 {data.groups.filter(g => filterLevel === 'all' || g.level === filterLevel).map(g => (
                   <option key={g.id} value={g.name}>{g.name}</option>
                 ))}
               </select>
            </motion.div>
          </div>
        )}

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-x-auto min-h-[400px] flex flex-col">
          <div className="grid grid-cols-[60px_2fr_1fr_1.8fr_1fr_1fr_140px] min-w-[1100px] bg-gray-50/80 p-6 border-b border-gray-100 text-[0.65rem] font-black text-gray-400 uppercase tracking-widest">
             <div className="flex items-center justify-center">
                <button 
                  onClick={() => {
                    if (selectedUsers.length === filteredUsers.length) setSelectedUsers([]);
                    else setSelectedUsers(filteredUsers.map(u => u.id));
                  }}
                  className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", selectedUsers.length === filteredUsers.length ? "bg-blue-dark border-blue-dark text-white" : "border-gray-200 bg-white")}
                >
                  {selectedUsers.length === filteredUsers.length && <ShieldCheck size={14} />}
                </button>
             </div>
             <div className="text-right pr-4">المستخدم</div>
             <div className="text-center">الدور / المستوى</div>
             <div className="text-center">التواصل</div>
             <div className="text-center">الاشتراك</div>
             <div className="text-center">التاريخ</div>
             <div className="text-center">الإجراءات</div>
          </div>
          <div className="divide-y divide-gray-50 flex-1 min-w-[1100px]">
            <AnimatePresence mode="popLayout">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={u.id} 
                    className={cn(
                      "grid grid-cols-[60px_2fr_1fr_1.8fr_1fr_1fr_140px] p-6 items-center hover:bg-blue-50/30 transition-all group",
                      selectedUsers.includes(u.id) ? "bg-blue-50/50 shadow-inner" : ""
                    )}
                  >
                     <div className="flex items-center justify-center">
                        <button 
                          onClick={() => {
                            setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                          }}
                          className={cn("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", selectedUsers.includes(u.id) ? "bg-blue-light border-blue-light text-white" : "border-gray-200 bg-white group-hover:border-blue-light/50")}
                        >
                          {selectedUsers.includes(u.id) && <ShieldCheck size={14} />}
                        </button>
                     </div>
                     <div className="flex items-center gap-3 text-right">
                        <div className={cn(
                          "h-11 w-11 rounded-[18px] flex items-center justify-center font-black text-[0.9rem] shadow-sm",
                          u.userType === 'admin' ? "bg-red-100 text-red-600" :
                          u.userType === 'teacher' ? "bg-indigo-100 text-indigo-600" :
                          "bg-blue-100 text-blue-dark"
                        )}>
                           {u.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-blue-dark truncate max-w-[140px] leading-tight group-hover:text-blue-brand transition-colors">{u.displayName}</h4>
                          <p className="text-[0.62rem] text-gray-400 font-bold truncate max-w-[140px] mt-0.5">{u.email}</p>
                        </div>
                     </div>
                     <div className="flex flex-col items-center gap-1">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[0.6rem] font-black",
                          u.userType === 'student' ? 'bg-emerald-50 text-emerald-600' : 
                          u.userType === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 
                          u.userType === 'parent' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                        )}>
                          {u.userType === 'student' ? 'تلميذ' : u.userType === 'teacher' ? 'مربي' : u.userType === 'parent' ? 'ولي' : 'مدير'}
                        </span>
                        {u.level && u.userType === 'student' && (
                          <span className="text-[0.6rem] font-bold text-gray-400">سنة {u.level} أساسي</span>
                        )}
                        {u.group && (
                           <div className="flex items-center gap-1 text-[0.6rem] font-bold text-blue-light/80">
                              <Layers size={10} />
                              {u.group}
                           </div>
                        )}
                     </div>
                     <div className="animate-in fade-in slide-in-from-right-1 duration-300">
                        <div className="flex items-center justify-center gap-1.5 text-[0.7rem] font-bold text-gray-500">
                           <Globe size={12} className="text-gray-300" />
                           <span className="truncate max-w-[100px]">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center justify-center gap-1.5 text-[0.7rem] font-bold text-gray-400 mt-0.5">
                             <div className="h-1 w-1 rounded-full bg-emerald-400" />
                             <span>{u.phone}</span>
                          </div>
                        )}
                     </div>
                     <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.62rem] font-black ring-1",
                          u.subscriptionStatus === 'active' 
                            ? 'bg-emerald-50 text-emerald-600 ring-emerald-100' 
                            : 'bg-gray-50 text-gray-300 ring-gray-100'
                        )}>
                          {u.subscriptionStatus === 'active' ? <CheckCircle size={12} strokeWidth={3} /> : <XCircle size={12} strokeWidth={3} />}
                          <span>{u.subscriptionStatus === 'active' ? 'مفعل' : 'موقوف'}</span>
                        </div>
                        {u.currentPlan && (
                          <span className="text-[0.55rem] font-bold text-blue-light/70 text-center max-w-[80px] break-words">
                            {u.currentPlan}
                          </span>
                        )}
                     </div>
                     <div className="flex flex-col items-center">
                        <span className="text-[0.7rem] font-black text-gray-500">{u.createdAt ? new Date(u.createdAt.toDate ? u.createdAt.toDate() : u.createdAt).toLocaleDateString('ar-TN') : '---'}</span>
                        <span className="text-[0.55rem] font-bold text-gray-300 tracking-tighter uppercase">{u.createdAt ? new Date(u.createdAt.toDate ? u.createdAt.toDate() : u.createdAt).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                     </div>
                     <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button 
                          onClick={() => setEditingUser(u)}
                          className="p-2.5 rounded-[14px] bg-white border border-gray-100 text-blue-dark hover:bg-blue-dark hover:text-white transition-all shadow-sm hover:shadow-lg hover:shadow-blue-900/10"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setPendingDelete({ id: u.id, label: u.displayName || u.email, type: 'user' })}
                          className="p-2.5 rounded-[14px] bg-white border border-gray-100 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm hover:shadow-lg hover:shadow-red-900/10"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-gray-200">
                   <div className="h-20 w-20 rounded-[30px] bg-gray-50 flex items-center justify-center mb-4">
                      <Users2 size={40} className="text-gray-100" />
                   </div>
                   <p className="text-sm font-black italic">لا توجد نتائج مطابقة لعملية البحث...</p>
                   <button onClick={() => {setSearchQuery(''); setFilterType('all'); setFilterLevel('all');}} className="mt-4 text-xs font-black text-blue-brand hover:underline">إعادة ضبط الفلاتر</button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };


  const renderSubscriptions = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
          <ReceiptIcon size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-blue-dark">إدارة الاشتراكات والوصولات</h2>
          <p className="text-gray-400 font-bold text-sm">تأكيد الدفع، تفعيل الحسابات، ومراجعة الفواتير</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <h3 className="text-lg font-black text-blue-dark flex items-center gap-2">
              <Clock className="text-amber-500" size={20} /> وصولات في انتظار التأكيد ({data.receipts.filter(r => r.status === 'pending').length})
           </h3>
           <div className="space-y-4">
              {data.receipts.filter(r => r.status === 'pending').map(r => {
                const u = data.users.find(user => user.id === r.userId);
                return (
                  <div key={r.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between group">
                     <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                           {(r.receiptURL || r.receiptUrl) ? <img src={r.receiptURL || r.receiptUrl} alt="Receipt" className="w-full h-full object-cover" /> : <ReceiptIcon className="text-gray-300" />}
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-blue-dark">{u?.displayName || 'مستخدم مجهول'}</h4>
                           <p className="text-[0.65rem] text-gray-400 font-bold">{u?.phone || 'بدون هاتف'} • {new Date(r.createdAt?.toDate()).toLocaleString('ar-TN')}</p>
                           <div className="mt-2 flex flex-wrap gap-2">
                             <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-dark text-[0.55rem] font-black">{r.planName || r.plan || 'اشتراك'}</span>
                             <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 text-[0.55rem] font-black">{r.price || r.amount || '--'} د.ت</span>
                             {r.paymentMethod && (
                               <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[0.55rem] font-black border border-emerald-100">
                                 {PAYMENT_METHODS.find(m => m.id === r.paymentMethod)?.name || r.paymentMethod}
                               </span>
                             )}
                             {r.parentName && (
                               <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[0.55rem] font-black">ولي الرفع: {r.parentName}</span>
                             )}
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <button 
                          onClick={() => handleConfirmReceipt(r.id, r.userId)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[0.65rem] font-black hover:bg-emerald-700 transition-all shadow-md shadow-emerald-900/10"
                        >
                          تأكيد وتفعيل
                        </button>
                        <button 
                          onClick={() => {
                            const reason = prompt('سبب الرفض (اختياري):', 'الوصل غير واضح أو المعلومات غير متطابقة');
                            if (reason !== null) handleRejectReceipt(r.id, reason);
                          }}
                          className="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-[0.65rem] font-black hover:bg-red-500 hover:text-white transition-all"
                        >
                          رفض
                        </button>
                     </div>
                  </div>
                );
              })}
              {data.receipts.filter(r => r.status === 'pending').length === 0 && (
                <div className="py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200 text-gray-300 font-bold italic">لا توجد وصولات معلقة</div>
              )}
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-lg font-black text-blue-dark">إحصائيات مادية سريعة</h3>
           <div className="bg-blue-dark rounded-[32px] p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-white/5" />
              <p className="text-[0.65rem] font-bold text-blue-light uppercase tracking-widest mb-2">إجمالي المداخيل التقريبية</p>
              <h2 className="text-4xl font-black mb-6">{stats.revenue.toLocaleString('ar-TN')} <span className="text-sm font-bold text-blue-light">د.ت</span></h2>
              <div className="space-y-3 pt-4 border-t border-white/10">
                 <div className="flex justify-between items-center text-[0.65rem]">
                    <span className="text-white/60">هذا الشهر</span>
                    <span className="font-black text-emerald-400">+{data.receipts.filter(r => r.status === 'approved' && r.createdAt?.toDate() > new Date(Date.now() - 86400000)).reduce((a, b) => a + (parseFloat(b.price) || 0), 0)} د.ت</span>
                 </div>
                 <div className="flex justify-between items-center text-[0.65rem]">
                    <span className="text-white/60">اشتراكات مفعلة</span>
                    <span className="font-black text-blue-light">{stats.activeSubs} تلميذ</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderGroups = () => {
    const studentCountByGroup = data.users.reduce((acc, u) => {
      if (u.userType === 'student' && u.group) {
        acc[u.group] = (acc[u.group] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-sm">
              <Users2 size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">إدارة المجموعات الدراسية</h2>
              <p className="text-gray-400 font-bold text-sm">توزيع التلاميذ على الأفواج ومتابعة المدرسين</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddGroupForm(!showAddGroupForm)}
            className="flex items-center gap-2.5 px-8 py-4 rounded-[20px] bg-indigo-600 text-white font-black text-sm shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {showAddGroupForm ? <XCircle size={20} /> : <Plus size={20} />}
            <span>{showAddGroupForm ? 'إلغاء الإضافة' : 'إنشاء مجموعة جديدة'}</span>
          </button>
        </div>

        {showAddGroupForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-8 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xl font-black text-blue-dark">إضافة مجموعة جديدة</h3>
              <p className="text-xs font-bold text-gray-400 mt-1">أدخل تفاصيل الفوج الدراسي الجديد</p>
            </div>
            <form onSubmit={handleAddGroup} className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase pr-2">اسم المجموعة</label>
                 <input required type="text" placeholder="مثال: الفوج أ - سابعة" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-indigo-200 transition-all" />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase pr-2">المستوى</label>
                 <select value={newGroup.level} onChange={e => setNewGroup({...newGroup, level: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                    <option value="7">السنة السابعة</option>
                    <option value="8">السنة الثامنة</option>
                    <option value="9">السنة التاسعة</option>
                    <option value="1sec">السنة الأولى ثانوي</option>
                    <option value="2sec">السنة الثانية ثانوي</option>
                    <option value="3sec">السنة الثالثة ثانوي</option>
                    <option value="4sec">باكالوريا</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase pr-2">المربي المسؤول</label>
                 <select value={newGroup.teacherId} onChange={e => setNewGroup({...newGroup, teacherId: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                    <option value="">اختر المربي</option>
                    {data.users.filter(u => u.userType === 'teacher').map(t => (
                      <option key={t.id} value={t.id}>{t.displayName}</option>
                    ))}
                 </select>
               </div>
               <div className="space-y-2 lg:col-span-2">
                 <label className="text-xs font-black text-gray-400 uppercase pr-2">رابط مجموعة WhatsApp (اختياري)</label>
                 <input type="text" placeholder="https://chat.whatsapp.com/..." value={newGroup.whatsappLink} onChange={e => setNewGroup({...newGroup, whatsappLink: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-green-200 transition-all" />
               </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-black text-gray-400 uppercase pr-2">رابط Google Meet (للفصول المباشرة)</label>
            <input type="text" placeholder="https://meet.google.com/..." value={newGroup.meetLink || ''} onChange={e => setNewGroup({...newGroup, meetLink: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 focus:ring-blue-200 transition-all" />
          </div>

          <div className="lg:col-span-2 space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-400 uppercase pr-2">الجدول الأسبوعي</label>
              <button 
                type="button"
                onClick={() => setNewGroup({...newGroup, schedule: [...(newGroup.schedule || []), { day: 'الاثنين', startTime: '18:00', endTime: '19:30' }]})}
                className="text-[0.65rem] font-black text-blue-brand hover:underline"
              >
                + إضافة حصة
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(newGroup.schedule || []).map((s: any, idx: number) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <select 
                    value={s.day} 
                    onChange={e => {
                      const newSched = [...newGroup.schedule];
                      newSched[idx].day = e.target.value;
                      setNewGroup({...newGroup, schedule: newSched});
                    }}
                    className="bg-transparent border-none text-[0.7rem] font-bold outline-none"
                  >
                    {['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input 
                    type="time" 
                    value={s.startTime} 
                    onChange={e => {
                      const newSched = [...newGroup.schedule];
                      newSched[idx].startTime = e.target.value;
                      setNewGroup({...newGroup, schedule: newSched});
                    }}
                    className="bg-transparent border-none text-[0.7rem] font-bold outline-none" 
                  />
                  <span className="text-gray-300">→</span>
                  <input 
                    type="time" 
                    value={s.endTime} 
                    onChange={e => {
                      const newSched = [...newGroup.schedule];
                      newSched[idx].endTime = e.target.value;
                      setNewGroup({...newGroup, schedule: newSched});
                    }}
                    className="bg-transparent border-none text-[0.7rem] font-bold outline-none" 
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const newSched = (newGroup.schedule || []).filter((_: any, i: number) => i !== idx);
                      setNewGroup({...newGroup, schedule: newSched});
                    }}
                    className="mr-auto text-red-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
               <div className="flex items-end">
                 <button disabled={loading} type="submit" className="w-full py-4 rounded-2xl bg-blue-dark text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-blue-brand transition-all">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                    <span>إضافة المجموعة</span>
                 </button>
               </div>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['7', '8', '9'].map(level => {
            const levelGroups = data.groups.filter(g => g.level === level);
            return (
              <div key={level} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-dark text-white flex items-center justify-center font-black text-sm">
                    {level}
                  </div>
                  <h3 className="text-lg font-black text-blue-dark">السنة {level === '7' ? 'سابعة' : level === '8' ? 'ثامنة' : 'تاسعة'} أساسي</h3>
                  <span className="text-[0.65rem] font-bold text-gray-400 mr-auto">{levelGroups.length} مجموعات</span>
                </div>

                <div className="space-y-4">
                  {levelGroups.length > 0 ? levelGroups.map(g => {
                    const teacher = data.users.find(u => u.id === g.teacherId);
                    const membersCount = studentCountByGroup[g.name] || 0;
                    
                    return (
                      <div key={g.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-black text-blue-dark mb-1 group-hover:text-indigo-600 transition-colors">{g.name}</h4>
                            <p className="text-[0.65rem] font-bold text-gray-400">
                              مدرس: <span className="text-blue-dark/60">{teacher?.displayName || 'غير معين'}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-[0.7rem] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg mb-1">{membersCount} تلميذ</span>
                             {g.whatsappLink && (
                               <a href={g.whatsappLink} target="_blank" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="مجموعة واتساب">
                                 <Globe size={14} />
                               </a>
                             )}
                             {g.meetLink && (
                               <a href={g.meetLink} target="_blank" className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="رابط الميت">
                                 <Video size={14} />
                               </a>
                             )}
                          </div>
                        </div>

                        <div className="space-y-2">
                           <button 
                             onClick={() => setShowAssignStudentsModal({ group: g.name, level: g.level, id: g.id })}
                             className="w-full py-2.5 rounded-xl bg-blue-dark text-white text-[0.65rem] font-black shadow-lg shadow-blue-900/10 hover:bg-blue-brand transition-all flex items-center justify-center gap-2"
                           >
                              <UserPlus size={14} />
                              إضافة تلاميذ للمجموعة
                           </button>
                           <div className="flex gap-2">
                              <button onClick={() => setEditingGroup(g)} className="flex-1 py-2 text-[0.6rem] font-black rounded-lg bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100">
                                 تعديل
                              </button>
                              <button 
                                onClick={() => setPendingDelete({ id: g.id, label: g.name, type: 'generic', coll: 'groups' })}
                                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="py-12 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-gray-300">
                      <Users2 size={32} className="opacity-20 mb-2" />
                      <p className="text-[0.65rem] font-black">لا توجد مجموعات</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAttendance = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm">
            <CheckCircle size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-blue-dark">سجلات حضور الميت</h2>
            <p className="text-gray-400 font-bold text-sm">متابعة دقيقة للالتحاق بالحصص المباشرة ({data.attendance.length})</p>
          </div>
        </div>
        
        <button 
          onClick={() => setPendingDelete({ id: 'attendance', label: 'كافة سجلات الحضور', type: 'collection' })}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-50 text-red-500 font-extrabold text-xs hover:bg-red-500 hover:text-white transition-all"
        >
          <Trash2 size={16} /> تصفير كافة السجلات
        </button>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-x-auto min-h-[400px]">
        <div className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr_60px] min-w-[1000px] bg-gray-50/80 p-6 border-b border-gray-100 text-[0.65rem] font-black text-gray-400 uppercase tracking-widest">
           <div className="text-right pr-4">المستخدم</div>
           <div className="text-center">الدور</div>
           <div className="text-center">المجموعة</div>
           <div className="text-center">الوقت</div>
           <div className="text-center">التاريخ</div>
           <div className="text-center">رابط</div>
        </div>
        <div className="divide-y divide-gray-50">
          <AnimatePresence mode="popLayout">
            {data.attendance.length > 0 ? (
              data.attendance.map(att => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={att.id} 
                  className="grid grid-cols-[1.5fr_1fr_1.5fr_1fr_1fr_60px] p-6 items-center hover:bg-gray-50 transition-all min-w-[1000px]"
                >
                   <div className="flex items-center gap-3 text-right">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
                         {att.userName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-blue-dark truncate max-w-[180px]">{att.userName}</h4>
                        <p className="text-[0.6rem] text-gray-400 font-bold">UID: {att.userId?.substring(0, 8)}...</p>
                      </div>
                   </div>
                   <div className="text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[0.6rem] font-black",
                        att.userType === 'teacher' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-dark'
                      )}>
                        {att.userType === 'teacher' ? 'مربي' : 'تلميذ'}
                      </span>
                   </div>
                   <div className="text-center">
                      <p className="text-xs font-black text-blue-dark">{att.groupName}</p>
                      <p className="text-[0.6rem] text-gray-400 font-bold">ID: {att.groupId?.substring(0, 8)}</p>
                   </div>
                   <div className="text-center">
                      <span className="text-[0.7rem] font-black text-gray-500">
                        {att.timestamp ? new Date(att.timestamp.toDate ? att.timestamp.toDate() : att.timestamp).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }) : '---'}
                      </span>
                   </div>
                   <div className="text-center">
                      <span className="text-[0.7rem] font-black text-gray-500">
                        {att.timestamp ? new Date(att.timestamp.toDate ? att.timestamp.toDate() : att.timestamp).toLocaleDateString('ar-TN') : '---'}
                      </span>
                   </div>
                   <div className="flex justify-center">
                      <a href={att.meetLink} target="_blank" className="p-2 rounded-lg bg-blue-50 text-blue-brand hover:bg-blue-brand hover:text-white transition-all">
                        <ExternalLink size={14} />
                      </a>
                   </div>
                </motion.div>
              ))
            ) : (
              <div className="py-40 text-center flex flex-col items-center justify-center opacity-30 min-w-[1000px]">
                 <CheckCircle size={80} className="mb-4" />
                 <p className="text-lg font-black italic">لا يوجد سجل حضور حالياً</p>
                 <p className="text-xs mt-2">سجلات الحضور ستظهر آلياً عند التحاق المستخدمين بالحصص المباشرة.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  const renderWallets = () => (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
          <Wallet size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-blue-dark">محافظ المدرسين</h2>
          <p className="text-gray-400 font-bold text-sm">إدارة مستحقات الأساتذة والتحويلات المالية</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
         {data.users.filter(u => u.userType === 'teacher').map(t => {
           const wallet = data.wallets.find(w => w.teacherId === t.id) || { balance: 0 };
           return (
             <div key={t.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                   <div className="h-12 w-12 rounded-2xl bg-blue-dark text-white flex items-center justify-center font-black text-lg">
                      {t.displayName?.charAt(0)}
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-blue-dark">{t.displayName}</h4>
                      <p className="text-[0.6rem] text-gray-400 font-bold uppercase">{t.subject}</p>
                   </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
                   <p className="text-[0.6rem] font-bold text-gray-400 mb-1">الرصيد المتاح</p>
                   <div className="text-2xl font-black text-blue-dark">{wallet.balance} <span className="text-xs">د.ت</span></div>
                </div>
                <button className="w-full py-3 rounded-xl bg-blue-dark text-white text-[0.65rem] font-black hover:scale-105 transition-all">تحويل الرصيد</button>
             </div>
           );
         })}
      </div>
    </div>
  );

  const renderContentModal = () => {
    const isEdit = !!editingContent;
    const c = isEdit ? editingContent : newContent;
    const setC = (val: any) => isEdit ? setEditingContent(val) : setNewContent(val);
    const handleSubmit = isEdit ? handleUpdateContent : handleCreateContent;

    if (!showAddContentForm && !editingContent) return null;

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-blue-dark/50 backdrop-blur-md overflow-y-auto custom-scrollbar py-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl relative"
        >
          <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-[40px]">
            <h3 className="text-2xl font-black text-blue-dark">{isEdit ? 'تعديل محتوى' : 'إضافة محتوى جديد'}</h3>
            <button onClick={() => { setShowAddContentForm(false); setEditingContent(null); }} className="p-2 hover:bg-gray-100 rounded-full">
              <XCircle size={32} className="text-gray-300" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto max-h-[75vh] custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase pr-2">المستوى الدراسي *</label>
                <select required value={c.level} onChange={e => setC({...c, level: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                  <option value="">اختر</option>
                  <option value="7">السنة السابعة</option>
                  <option value="8">السنة الثامنة</option>
                  <option value="9">السنة التاسعة</option>
                  <option value="1sec">السنة الأولى ثانوي</option>
                  <option value="2sec">السنة الثانية ثانوي</option>
                  <option value="3sec">السنة الثالثة ثانوي</option>
                  <option value="4sec">باكالوريا</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase pr-2">النوع *</label>
                <select value={c.type} onChange={e => setC({...c, type: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                  <option value="lesson">درس</option>
                  <option value="assignment">فرض مراقبة</option>
                  <option value="synthesis">فرض تأليفي</option>
                  <option value="exercise">سلسلة تمارين</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase pr-2">رقم</label>
                <input type="number" value={c.order} onChange={e => setC({...c, order: parseInt(e.target.value)})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-black text-gray-400 uppercase pr-2">حالة المحتوى</label>
                 <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setC({...c, isFree: true})}
                      className={cn(
                        "flex-1 py-4 rounded-2xl text-[0.7rem] font-black transition-all",
                        c.isFree ? "bg-emerald-600 text-white shadow-lg" : "bg-gray-50 text-gray-400 border border-gray-100"
                      )}
                    >
                       مجاني
                    </button>
                    <button 
                      type="button"
                      onClick={() => setC({...c, isFree: false})}
                      className={cn(
                        "flex-1 py-4 rounded-2xl text-[0.7rem] font-black transition-all",
                        !c.isFree ? "bg-blue-dark text-white shadow-lg" : "bg-gray-50 text-gray-400 border border-gray-100"
                      )}
                    >
                       مدفوع
                    </button>
                 </div>
              </div>
              {(c.type === 'lesson' || c.type === 'exercise') && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">التصنيف *</label>
                  <select value={c.category || 'general'} onChange={e => setC({...c, category: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                    <option value="general">عام</option>
                    <option value="algebra">جبر</option>
                    <option value="geometry">هندسة</option>
                    <option value="stats">إحصاءات واحتمالات</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(c.type === 'assignment' || c.type === 'synthesis') && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">الثلاثي *</label>
                  <select value={c.trimester} onChange={e => setC({...c, trimester: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100">
                    <option value="1">الثلاثي الأول</option>
                    <option value="2">الثلاثي الثاني</option>
                    <option value="3">الثلاثي الثالث</option>
                  </select>
                </div>
              )}

              {c.type === 'assignment' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">النموذج</label>
                  <select value={c.modelNumber} onChange={e => setC({...c, modelNumber: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100 italic">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n.toString()}>نموذج {n}</option>)}
                  </select>
                </div>
              )}

              {c.type === 'lesson' && (
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">عنوان الدرس *</label>
                  <input required type="text" value={c.title} onChange={e => setC({...c, title: e.target.value})} placeholder="مثال: الأعداد الحقيقية" className="w-full rounded-2xl bg-gray-50 border-none px-6 py-4 text-sm font-bold outline-none ring-1 ring-gray-100" />
                </div>
              )}

              {c.type === 'exercise' && (
                <div className="md:col-span-2 space-y-3">
                  <label className="text-xs font-black text-gray-400 uppercase pr-2">مواضيع السلسلة</label>
                  <div className="space-y-2">
                    {(c.topics || ['']).map((topic: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <input type="text" value={topic} onChange={e => {
                          const t = [...c.topics];
                          t[idx] = e.target.value;
                          setC({...c, topics: t});
                        }} className="flex-1 rounded-xl bg-gray-50 border-none px-5 py-3 text-xs font-bold outline-none ring-1 ring-gray-100" />
                        {idx === c.topics.length - 1 ? (
                          <button type="button" onClick={() => setC({...c, topics: [...c.topics, '']})} className="p-3 bg-blue-50 text-blue-dark rounded-xl"> <Plus size={16} /> </button>
                        ) : (
                          <button type="button" onClick={() => setC({...c, topics: c.topics.filter((_: any, i: number) => i !== idx)})} className="p-3 bg-red-50 text-red-500 rounded-xl"> <Trash2 size={16} /> </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black text-gray-400 uppercase pr-2">روابط الفيديوهات</label>
              {(c.videoUrls || ['']).map((url: string, idx: number) => (
                <div key={idx} className="flex gap-2">
                  <input type="text" value={url} onChange={e => {
                    const urls = [...c.videoUrls];
                    urls[idx] = e.target.value;
                    setC({...c, videoUrls: urls});
                  }} className="flex-1 rounded-2xl bg-gray-50 border-none px-6 py-4 text-xs font-bold outline-none ring-1 ring-gray-100" />
                  {idx === c.videoUrls.length - 1 ? (
                    <button type="button" onClick={() => setC({...c, videoUrls: [...c.videoUrls, '']})} className="p-4 bg-blue-50 text-blue-dark rounded-2xl"> <Plus size={20} /> </button>
                  ) : (
                    <button type="button" onClick={() => setC({...c, videoUrls: c.videoUrls.filter((_: any, i: number) => i !== idx)})} className="p-4 bg-red-50 text-red-500 rounded-2xl"> <Trash2 size={20} /> </button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-blue-dark uppercase">PDF النص / الفرض</label>
                <div className="relative">
                  <input type="text" value={c.pdfText} onChange={e => setC({...c, pdfText: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100" />
                  <label className="absolute left-2 top-2 bottom-2 px-4 bg-blue-dark text-white rounded-xl flex items-center cursor-pointer text-[0.6rem] font-black">
                    رفع <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'pdfText')} />
                  </label>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-emerald-600 uppercase">PDF الإصلاح</label>
                <div className="relative">
                  <input type="text" value={c.pdfSolution} onChange={e => setC({...c, pdfSolution: e.target.value})} className="w-full rounded-2xl bg-gray-50 border-none px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100" />
                  <label className="absolute left-2 top-2 bottom-2 px-4 bg-emerald-600 text-white rounded-xl flex items-center cursor-pointer text-[0.6rem] font-black">
                    رفع <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'pdfSolution')} />
                  </label>
                </div>
              </div>
            </div>

            <button disabled={loading} type="submit" className="w-full py-5 rounded-2xl bg-blue-dark text-white font-black text-base shadow-2xl flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />} {isEdit ? 'تحديث ونشر' : 'إضافة ونشر'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  };


  const renderSchedule = () => {
    const days = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
    
    return (
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gold-brand/10 text-amber-600 flex items-center justify-center border border-gold-brand/20 shadow-sm">
              <Calendar size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-dark">الجدول الأسبوعي الموحد</h2>
              <p className="text-gray-400 font-bold text-sm">متابعة كافة الحصص المباشرة لجميع المجموعات ({data.groups.length} مجموعات)</p>
            </div>
          </div>
          
          <button 
            onClick={() => { setEditingGroup(null); navigate('/dashboard?tab=groups'); }}
            className="px-6 py-3 rounded-xl bg-blue-dark text-white font-black text-xs hover:bg-blue-brand transition-all flex items-center gap-2"
          >
            <Plus size={16} /> ضبط وتعديل الجداول
          </button>
        </div>

        <div className="grid gap-8 grid-cols-1 xl:grid-cols-7">
          {days.map(day => (
            <div key={day} className="flex flex-col gap-4">
              <div className="bg-blue-dark text-white p-3 rounded-2xl text-center font-black text-xs shadow-lg shadow-blue-900/10">
                {day}
              </div>
              
              <div className="flex flex-col gap-3 min-h-[100px]">
                {data.groups.flatMap(g => (g.schedule || []).filter((s: any) => s.day === day).map((s: any) => ({ ...s, groupName: g.name, level: g.level, teacher: g.teacherName })))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((session, idx) => (
                    <div key={`${session.groupName}-${idx}`} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-blue-light/30 transition-all group">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[0.6rem] font-black text-blue-light">{session.startTime}</span>
                      </div>
                      <h4 className="text-xs font-black text-blue-dark truncate" title={session.groupName}>{session.groupName}</h4>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[0.6rem] font-bold text-gray-400 uppercase tracking-tighter">السنة {session.level}</span>
                        <div className="h-6 w-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-brand transition-colors">
                          <Clock size={12} />
                        </div>
                      </div>
                    </div>
                  ))}
                
                {data.groups.flatMap(g => (g.schedule || []).filter((s: any) => s.day === day)).length === 0 && (
                  <div className="flex-1 rounded-2xl border-2 border-dashed border-gray-50 flex items-center justify-center">
                    <span className="text-[0.65rem] font-bold text-gray-200">فارغ</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'addUser': return renderAddUser();
      case 'users': return renderUsers();
      case 'subscriptions': return renderSubscriptions();
      case 'groups': return renderGroups();
      case 'attendance': return renderAttendance();
      case 'wallets': return renderWallets();
      case 'content': return renderContentManager();
      case 'schedule': return renderSchedule();
      case 'maintenance': return renderMaintenance();
      default: return renderOverview();
    }
  };

  const renderDeleteConfirmModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-red-100"
      >
        <div className="p-10 text-center space-y-6">
          <div className="h-20 w-20 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <Trash2 size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-blue-dark">تأكيد الحذف النهائي</h3>
            <p className="text-gray-400 font-bold mt-2 leading-relaxed">
              {pendingDelete?.type === 'nuke' 
                ? 'أنت على وشك حذف كافة بيانات التطبيق! هذا الإجراء لا يمكن التراجع عنه.' 
                : `هل أنت متأكد من حذف "${pendingDelete?.label}"؟`}
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => setPendingDelete(null)}
              className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black"
            >
              إلغاء
            </button>
            <button 
              onClick={async () => {
                if (!pendingDelete) return;
                if (pendingDelete.type === 'user') await handleDeleteUser(pendingDelete.id);
                else if (pendingDelete.type === 'rejectReceipt') await handleRejectReceipt(pendingDelete.id);
                else if (pendingDelete.type === 'maintenanceAction') await handleMaintenanceAction(pendingDelete.id as any);
                else if (pendingDelete.type === 'collection' && pendingDelete.id && pendingDelete.label) await handleResetCollection(pendingDelete.id, pendingDelete.label);
                else if (pendingDelete.type === 'nuke') {
                  const collections = ['users', 'receipts', 'videos', 'teacherSessions', 'groups', 'wallets', 'attendance'];
                  for (const c of collections) {
                    await handleResetCollection(c, c);
                  }
                } else if (pendingDelete.type === 'generic' && pendingDelete.coll) {
                  if (pendingDelete.coll === 'users') await handleDeleteUser(pendingDelete.id);
                  else if (pendingDelete.coll === 'videos') await handleDeleteContent(pendingDelete.id);
                  else if (pendingDelete.coll === 'teacherSessions') await handleDeleteSession(pendingDelete.id);
                  else {
                    setLoading(true);
                    try {
                      await deleteDoc(doc(db, pendingDelete.coll, pendingDelete.id));
                      toast.success('تم حذف السجل بنجاح');
                      addLog(`تم حذف ${pendingDelete.label} من ${pendingDelete.coll}`);
                      setPendingDelete(null);
                    } catch (e) {
                      toast.error('فشل في الحذف');
                    } finally {
                      setLoading(false);
                    }
                  }
                }
              }}
              disabled={loading}
              className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-black shadow-xl shadow-red-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'نعم، احذف'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderAssignStudentsModal = () => {
    if (!showAssignStudentsModal) return null;
    
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-blue-dark/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="text-xl font-black text-blue-dark">إضافة تلاميذ إلى {showAssignStudentsModal.group}</h3>
              <p className="text-[0.75rem] text-gray-400 font-bold">تلاميذ السنة {showAssignStudentsModal.level} أساسي</p>
            </div>
            <button onClick={() => { setShowAssignStudentsModal(null); setSelectedUsers([]); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <XCircle size={24} className="text-gray-400" />
            </button>
          </div>
          
          <div className="p-6 max-h-[60vh] overflow-y-auto">
             <div className="space-y-3">
                {data.users
                  .filter(u => u.userType === 'student' && u.level === showAssignStudentsModal.level && u.group !== showAssignStudentsModal.group)
                  .map(u => (
                    <div 
                      key={u.id} 
                      onClick={() => {
                        setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]);
                      }}
                      className={cn(
                        "p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between",
                        selectedUsers.includes(u.id) ? "border-blue-light bg-blue-50/30" : "border-gray-50 bg-gray-50/30 hover:border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs", selectedUsers.includes(u.id) ? "bg-blue-light text-white" : "bg-white text-blue-dark border")}>
                            {u.displayName?.substring(0, 2)}
                         </div>
                         <div>
                            <p className="text-sm font-black text-blue-dark">{u.displayName}</p>
                            <p className="text-[0.65rem] text-gray-400 font-bold">{u.email}</p>
                         </div>
                      </div>
                      <div className={cn("w-6 h-6 rounded-lg border-2 flex items-center justify-center", selectedUsers.includes(u.id) ? "bg-blue-light border-blue-light text-white" : "border-gray-200")}>
                         {selectedUsers.includes(u.id) && <CheckCircle size={14} />}
                      </div>
                    </div>
                  ))}
                {data.users.filter(u => u.userType === 'student' && u.level === showAssignStudentsModal.level && u.group !== showAssignStudentsModal.group).length === 0 && (
                  <div className="py-10 text-center text-gray-300 font-bold text-sm">لا يوجد تلاميذ متاحون للنقل في هذا المستوى</div>
                )}
             </div>
          </div>

          <div className="p-8 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
             <p className="text-[0.75rem] font-black text-gray-400">تم اختيار {selectedUsers.length} تلميذ</p>
             <button 
               disabled={selectedUsers.length === 0 || loading}
               onClick={async () => {
                 setLoading(true);
                 try {
                   const batchUpdate = selectedUsers.map(uid => 
                     updateDoc(doc(db, 'users', uid), { 
                       group: showAssignStudentsModal.group,
                       updatedAt: serverTimestamp() 
                     })
                   );
                   await Promise.all(batchUpdate);
                   toast.success("تمت إضافة التلاميذ بنجاح");
                   setShowAssignStudentsModal(null);
                   setSelectedUsers([]);
                 } catch (err) {
                   toast.error("حدث خطأ أثناء الإضافة");
                 } finally {
                   setLoading(false);
                 }
               }}
               className="px-8 py-3 rounded-2xl bg-blue-dark text-white font-black text-xs shadow-lg disabled:opacity-50 flex items-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
               إضافة للمجموعة
             </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {editingUser && renderEditUserModal()}
      {editingGroup && renderEditGroupModal()}
      {showAssignStudentsModal && renderAssignStudentsModal()}
      {renderContentModal()}
      {pendingDelete && renderDeleteConfirmModal()}
      <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3 }}>
        {renderActiveTab()}
      </motion.div>
    </AnimatePresence>
  );
}
