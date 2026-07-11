import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth, db } from '@/src/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendPasswordResetEmail, 
  updateProfile,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { 
  Video, 
  Users, 
  FileText, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRight, 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Loader2,
  GraduationCap,
  Users2,
  XCircle,
  MapPin,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { TUNISIAN_GOVERNORATES } from '@/src/constants';

type AuthMode = 'login' | 'register';
type UserRole = 'student' | 'parent';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [level, setLevel] = useState('7');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [moughataa, setMoughataa] = useState('');
  const [school, setSchool] = useState('');

  // Phone/SMS states
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'login' | 'register' | 'forgot'>('login');
  const [newPasswordMode, setNewPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<any>(null);

  const isPhoneNumber = (input: string) => {
    const numericOnly = input.replace(/[^\d]/g, '');
    return !input.includes('@') && numericOnly.length >= 8;
  };

  const getCleanPhone = (input: string) => {
    let cleaned = input.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    }
    if (/^\d{8}$/.test(cleaned)) {
      cleaned = '+216' + cleaned;
    }
    if (/^216\d{8}$/.test(cleaned)) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const getSyntheticEmail = (phoneNum: string) => {
    const clean = phoneNum.replace(/[^\d]/g, '');
    return `${clean}@phone.masartamayoz.com`;
  };

  const getSyntheticPassword = (phoneNum: string) => {
    const clean = phoneNum.replace(/[^\d]/g, '');
    return `phone_auth_${clean}_secure_pwd_2026`;
  };

  const sendSmsCode = async (phoneNum: string) => {
    setError('');
    setLoading(true);
    let verifier = recaptchaVerifier;
    try {
      const formattedPhone = getCleanPhone(phoneNum);
      
      // Clean up previous reCAPTCHA container to avoid "reCAPTCHA has already been rendered in this element"
      const container = document.getElementById('recaptcha-container');
      if (container) {
        container.innerHTML = '';
      }
      
      verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
        }
      });
      setRecaptchaVerifier(verifier);
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setShowOtpInput(true);
      setError('تم إرسال رمز التحقق SMS إلى هاتفك بنجاح');
    } catch (err: any) {
      console.error('Error sending SMS:', err);
      setError(handleAuthError(err.code) || 'فشل إرسال رمز التحقق SMS. يرجى التأكد من صحة رقم الهاتف.');
      if (verifier) {
        try {
          verifier.clear();
        } catch (e) {}
        setRecaptchaVerifier(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otp) { setError('يرجى إدخال رمز التحقق'); return; }
    setLoading(true); setError('');
    try {
      const result = await confirmationResult.confirm(otp);
      const loggedUser = result.user;
      
      if (otpPurpose === 'forgot') {
        setShowOtpInput(false);
        setNewPasswordMode(true);
        setError('تم التحقق بنجاح من رقم الهاتف. يرجى إدخال كلمة المرور الجديدة أدناه:');
        setLoading(false);
        return;
      }

      // Check if user document exists in Firestore
      const snap = await getDoc(doc(db, 'users', loggedUser.uid));
      if (!snap.exists()) {
        setPhone(loggedUser.phoneNumber || '');
        setMode('register');
        setError('رقم الهاتف هذا غير مسجل بالكامل بعد. يرجى ملء بقية بيانات الحساب لإتمام التسجيل.');
      } else {
        localStorage.removeItem('pendingGoogleUser');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('OTP confirmation error:', err);
      setError('رمز التحقق غير صحيح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePasswordAfterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setLoading(true); setError('');
    try {
      const formattedPhone = getCleanPhone(email);
      
      const q = query(collection(db, 'users'), where('phone', '==', formattedPhone));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userDocRef = doc(db, 'users', snap.docs[0].id);
        await updateDoc(userDocRef, { password: newPassword });
        setNewPasswordMode(false);
        setError('تم تحديث كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.');
        await auth.signOut();
      } else {
        setError('لم نتمكن من العثور على الحساب الخاص برقم الهاتف هذا.');
      }
    } catch (err: any) {
      console.error('Password update error:', err);
      setError('حدث خطأ أثناء تحديث كلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.hash === '#register') setMode('register');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !loading && !localStorage.getItem('pendingGoogleUser')) {
        navigate('/dashboard');
      }
    });

    // Check for pending Google user
    const pending = localStorage.getItem('pendingGoogleUser');
    if (pending) {
      const data = JSON.parse(pending);
      setFirstName(data.parts?.[0] || '');
      setLastName(data.parts?.slice(1).join(' ') || '');
      setEmail(data.email || '');
      setMode('register');
    }

    return () => unsubscribe();
  }, [location.hash, navigate]);

  const handleAuthError = (code: string) => {
    console.error('Authentication Error Code:', code);
    switch (code) {
      case 'auth/invalid-login-credentials':
      case 'auth/invalid-credential':
        return 'البريد أو كلمة المرور غير صحيحة';
      case 'auth/user-not-found':
        return 'لا يوجد حساب بهذا البريد';
      case 'auth/wrong-password':
        return 'كلمة المرور غير صحيحة';
      case 'auth/email-already-in-use':
        return 'هذا البريد مسجّل مسبقاً — سجّل دخولك';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة — 6 أحرف على الأقل';
      case 'auth/invalid-email':
        return 'صيغة البريد غير صحيحة';
      case 'auth/network-request-failed':
        return `فشل الاتصال بخوادم Firebase (${navigator.onLine ? 'المتصفح متصل بالإنترنت' : 'لا يوجد اتصال'}) — قد يكون السبب حظر النطاق أو استخدام VPN أو إضافة لمتصفحك تمنع الاتصال. حاول استخدام متصفح آخر أو تسجيل الدخول بـ Google.`;
      case 'auth/unauthorized-domain':
        return `النطاق ${window.location.hostname} غير مصرح به في Firebase — يرجى إضافته إلى Authorized Domains في إعدادات Authentication.`;
      case 'auth/internal-error':
        return 'خطأ داخلي في خادم Firebase — حاول مرة أخرى لاحقاً.';
      case 'auth/operation-not-allowed':
        return 'طريقة تسجيل الدخول بالبريد وكلمة المرور غير مفعلة في إعدادات Firebase Console. يرجى تفعيلها من قسم Authentication (الإعدادات > Sign-in method) أو استخدم المتابعة بـ Google حالياً.';
      case 'auth/too-many-requests':
        return 'محاولات كثيرة خاطئة — يرجى المحاولة لاحقاً';
      case 'auth/popup-blocked':
        return 'تم حظر النافذة المنبثقة — يرجى السماح بالنوافذ المنبثقة للموقع';
      case 'auth/billing-not-enabled':
        return 'إرسال الرسائل القصيرة (SMS) يتطلب تفعيل الفوترة (Billing) وترقية مشروع Firebase الخاص بك إلى الخطة المدفوعة (Blaze - Pay as you go). يرجى زيارة لوحة تحكم Firebase Console لتفعيل الفوترة، أو استخدم تسجيل الدخول بكلمة المرور.';
      default:
        return `حدث خطأ غير متوقع (${code || 'unknown'}) — حاول مرة أخرى`;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور'); return; }
    setLoading(true); setError('');
    try {
      console.log('Logging in with:', email);
      await setPersistence(auth, browserLocalPersistence);

      if (isPhoneNumber(email)) {
        const formattedPhone = getCleanPhone(email);
        const q = query(collection(db, 'users'), where('phone', '==', formattedPhone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('رقم الهاتف هذا غير مسجل لدينا. يرجى إنشاء حساب أولاً.');
          setLoading(false);
          return;
        }

        let foundUser: any = null;
        querySnapshot.forEach((doc) => {
          foundUser = doc.data();
        });

        const retrievedEmail = foundUser.email;
        // Check if it's a legacy synthetic user
        if (foundUser.password && retrievedEmail === getSyntheticEmail(formattedPhone)) {
          if (foundUser.password === password) {
            const syntheticEmail = getSyntheticEmail(formattedPhone);
            const syntheticPassword = getSyntheticPassword(formattedPhone);
            await signInWithEmailAndPassword(auth, syntheticEmail, syntheticPassword);
            localStorage.removeItem('pendingGoogleUser');
            navigate('/dashboard');
          } else {
            setError('كلمة المرور غير صحيحة');
          }
        } else {
          // For standard users who registered with real email and password,
          // we use their retrieved real email to authenticate with Firebase Auth
          await signInWithEmailAndPassword(auth, retrievedEmail, password);
          localStorage.removeItem('pendingGoogleUser');
          navigate('/dashboard');
        }
      } else {
        // Standard email login
        await signInWithEmailAndPassword(auth, email, password);
        localStorage.removeItem('pendingGoogleUser');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login Error Object:', err);
      setError(handleAuthError(err.code));
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const pending = localStorage.getItem('pendingGoogleUser');
    
    if (!firstName || !lastName || !email || !phone || (!password && !pending)) { 
      setError('يرجى إكمال جميع الحقول الأساسية (بما في ذلك البريد الإلكتروني ورقم الهاتف)'); 
      return; 
    }

    if (isPhoneNumber(email)) {
      setError('يرجى إدخال بريد إلكتروني صالح في خانة البريد الإلكتروني، ورقم هاتفك في الخانة المخصصة له.');
      return;
    }

    if (!isPhoneNumber(phone)) {
      setError('يرجى إدخال رقم هاتف صحيح يتكون من 8 أرقام على الأقل.');
      return;
    }
    
    setLoading(true); setError('');
    try {
      let user = auth.currentUser;
      const finalEmail = email;
      const finalPhone = getCleanPhone(phone);
      const finalPassword = password;

      if (!user) {
        const res = await createUserWithEmailAndPassword(auth, finalEmail, finalPassword);
        user = res.user;
      }

      await updateProfile(user, { displayName: `${firstName} ${lastName}` });
      
      const userData: any = {
        firstName, 
        lastName, 
        email: finalEmail, 
        phone: finalPhone,
        userType: role,
        level: role === 'student' ? level : '',
        birthDate, 
        wilaya, 
        moughataa, 
        school,
        subscriptionStatus: 'inactive',
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      localStorage.removeItem('pendingGoogleUser');
      navigate('/dashboard');
    } catch (err: any) {
      setError(handleAuthError(err.code));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      const snap = await getDoc(doc(db, 'users', user.uid));
      
      if (!snap.exists()) {
        localStorage.setItem('pendingGoogleUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          parts: (user.displayName || '').split(' ')
        }));
        setMode('register');
        setError('يرجى إكمال اختيار نوع الحساب لإتمام التسجيل بـ Google');
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(handleAuthError(err.code));
      }
    }
  };

  const handleForgot = () => {
    setIsForgotMode(true);
    setForgotEmail('');
    setError('');
  };

  const handleForgotWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { setError('يرجى إدخال البريد الإلكتروني أولاً لاسترجاع كلمة المرور'); return; }
    if (isPhoneNumber(forgotEmail)) {
      setError('يرجى إدخال بريدك الإلكتروني لإعادة تعيين كلمة المرور، وليس رقم الهاتف.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setError('تم إرسال رابط إعادة تعيين كلمة المرور لبريدك الإلكتروني');
    } catch (err: any) {
      setError(handleAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen grid-cols-1 overflow-hidden lg:grid lg:grid-cols-2" dir="rtl">
      
      {/* Left Decoration */}
      <div className="hidden flex-col items-center justify-center bg-gradient-to-br from-blue-dark via-blue-mid to-blue-brand p-12 text-center lg:flex relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-5">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        </div>
        
        <div className="relative z-10">
          <Link to="/" className="mb-12 flex items-center justify-center gap-3.5 no-underline">
            <div className="h-14 w-14 rounded-2xl bg-white p-1.5 shadow-lg flex items-center justify-center relative overflow-hidden">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain relative z-10" onError={(e) => (e.currentTarget.style.display = 'none')} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white leading-none">أكاديمية مسار التميز</h1>
              <span className="mt-1 block text-[0.72rem] font-medium text-gold-light">التعليم عن بعد في تونس</span>
            </div>
          </Link>

          <div className="auth-hero max-w-[340px] mx-auto">
            <h2 className="mb-4 text-3xl font-black text-white leading-tight">
              منصتك لتعلم <span className="text-gold-brand">الرياضيات</span> بشكل احترافي
            </h2>
            <p className="mb-8 text-[0.92rem] leading-relaxed text-white/65">
              دروس مسجّلة، حصص مباشرة، وفروض محلولة لكل المستويات الإعدادية.
            </p>

            <div className="flex flex-col gap-3 text-right">
              {[
                { icon: Video, color: 'text-gold-brand bg-gold-brand/15', text: 'دروس فيديو لكل المقررات' },
                { icon: Users2, color: 'text-emerald-400 bg-emerald-400/15', text: 'حصص مباشرة أسبوعية' },
                { icon: FileText, color: 'text-blue-400 bg-blue-400/15', text: 'فروض وسلاسل تمارين محلولة' },
                { icon: ShieldCheck, color: 'text-purple-400 bg-purple-400/15', text: 'متابعة الولي لمنظوره' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white/6 p-3">
                  <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg", f.color)}>
                    <f.icon size={18} />
                  </div>
                  <p className="text-[0.85rem] font-medium text-white/80">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-20 text-[0.78rem] text-white/30">© 2026 أكاديمية مسار التميز</div>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex items-center justify-center bg-white p-8 sm:p-12 lg:ltr:border-l lg:rtl:border-r border-gray-100">
        <div className="w-full max-w-[420px]">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-[0.83rem] font-semibold text-gray-600 transition-colors hover:text-blue-light">
            <ArrowRight size={16} />
            العودة للرئيسية
          </Link>

          {isForgotMode ? (
            <header className="mb-2">
              <h2 className="text-2xl font-black text-blue-dark">استرجاع كلمة المرور 🔑</h2>
              <p className="text-[0.88rem] text-gray-600">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
            </header>
          ) : (
            <>
              <header className="mb-2">
                <h2 className="text-2xl font-black text-blue-dark">{mode === 'login' ? 'مرحباً بك 👋' : 'إنشاء حساب جديد'}</h2>
                <p className="text-[0.88rem] text-gray-600">{mode === 'login' ? 'سجّل دخولك للوصول إلى دروسك' : 'أنشئ حسابك مجاناً الآن'}</p>
              </header>

              {/* TABS */}
              <div className="mb-6 mt-6 flex gap-1 rounded-xl bg-gray-100 p-1">
                <button 
                  type="button"
                  onClick={() => setMode('login')}
                  className={cn("flex-1 rounded-[9px] py-2 text-[0.88rem] font-bold transition-all", mode === 'login' ? "bg-white text-blue-light shadow-sm" : "text-gray-500 hover:text-gray-800")}
                >
                  تسجيل الدخول
                </button>
                <button 
                  type="button"
                  onClick={() => setMode('register')}
                  className={cn("flex-1 rounded-[9px] py-2 text-[0.88rem] font-bold transition-all", mode === 'register' ? "bg-white text-blue-light shadow-sm" : "text-gray-500 hover:text-gray-800")}
                >
                  إنشاء حساب
                </button>
              </div>
            </>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl bg-red-50 border border-red-100 p-4 text-[0.88rem] font-bold text-red-600 shadow-sm animate-pulse-subtle"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={20} className="shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    <span className="leading-tight">{error}</span>
                    {(error.includes('النطاق') || error.includes('الاتصال')) && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-[0.7rem] bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <LogIn size={12} /> تحديث الصفحة
                        </button>
                        <span className="text-[0.65rem] text-red-400 font-medium opacity-60">
                          نطاقك الحالي: {window.location.hostname}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setError('')} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                   <XCircle size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {isForgotMode ? (
            <form onSubmit={handleForgotWithEmail} className="space-y-4 font-Tajawal animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="form-group">
                <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={forgotEmail} 
                  onChange={e => setForgotEmail(e.target.value)} 
                  className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white text-right ltr:text-left font-sans" 
                  placeholder="example@gmail.com" 
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-light py-3.5 text-base font-bold text-white transition-all hover:bg-blue-brand hover:-translate-y-0.5 disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                إرسال رابط الاسترجاع
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsForgotMode(false);
                    setError('');
                  }} 
                  className="text-[0.82rem] font-bold text-blue-light hover:underline"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-4 font-Tajawal">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">الاسم</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="محمد" />
                </div>
                <div className="form-group">
                  <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">اللقب</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white focus:ring-4 focus:ring-blue-500/10" placeholder="بن علي" />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">
                {mode === 'register' ? 'البريد الإلكتروني' : 'البريد الإلكتروني أو رقم الهاتف'}
              </label>
              <input 
                type={mode === 'register' ? 'email' : 'text'} 
                value={email} 
                onChange={e => {
                  setEmail(e.target.value);
                  if (mode === 'login' && isPhoneNumber(e.target.value)) {
                    setPhone(getCleanPhone(e.target.value));
                  }
                }} 
                className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white text-right" 
                placeholder={mode === 'register' ? 'example@gmail.com' : 'example@gmail.com أو 216XXXXXXXX'} 
                required
              />
            </div>

            {mode === 'register' && (
               <div className="form-group">
                <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">رقم الهاتف</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white text-right" 
                  placeholder="216XXXXXXXX" 
                  required
                />
              </div>
            )}

            {mode === 'register' && (
              <>
                <label className="mb-2.5 block text-[0.83rem] font-bold text-gray-700">نوع الحساب</label>
                <div className="mb-4 grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setRole('student')} className={cn("flex flex-col items-center rounded-xl border-1.5 p-3 transition-all", role === 'student' ? "border-blue-light bg-blue-light/5 text-blue-light" : "border-gray-200 bg-gray-50 text-gray-500")}>
                    <GraduationCap size={20} className="mb-1" />
                    <span className="text-[0.8rem] font-bold">تلميذ</span>
                  </button>
                  <button type="button" onClick={() => setRole('parent')} className={cn("flex flex-col items-center rounded-xl border-1.5 p-3 transition-all", role === 'parent' ? "border-blue-light bg-blue-light/5 text-blue-light" : "border-gray-200 bg-gray-50 text-gray-500")}>
                    <Users2 size={20} className="mb-1" />
                    <span className="text-[0.8rem] font-bold">ولي أمر</span>
                  </button>
                </div>

                {role === 'student' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                          <label className="mb-2.5 block text-[0.83rem] font-bold text-gray-700">المستوى الدراسي</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                             {['7', '8', '9'].map(lvl => (
                               <button key={lvl} type="button" onClick={() => setLevel(lvl)} className={cn("rounded-xl border-1.5 py-2.5 text-[0.85rem] font-bold transition-all", level === lvl ? "border-blue-light bg-blue-light/8 text-blue-light shadow-sm" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300")}>
                                 السنة {lvl}
                               </button>
                             ))}
                             {[
                               { id: '1sec', label: '1 ثانوي' },
                               { id: '2sec', label: '2 ثانوي' },
                               { id: '3sec', label: '3 ثانوي' },
                               { id: '4sec', label: 'باكالوريا' }
                             ].map(lvl => (
                               <button key={lvl.id} type="button" onClick={() => setLevel(lvl.id)} className={cn("rounded-xl border-1.5 py-2.5 text-[0.8rem] font-bold transition-all", level === lvl.id ? "border-blue-light bg-blue-light/8 text-blue-light shadow-sm" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300")}>
                                 {lvl.label}
                               </button>
                             ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="form-group">
                            <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">تاريخ الميلاد</label>
                            <input 
                              type="date" 
                              required
                              value={birthDate} 
                              onChange={e => setBirthDate(e.target.value)} 
                              className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white focus:ring-4 focus:ring-blue-500/10" 
                            />
                          </div>
                          <div className="form-group">
                            <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">الولاية</label>
                            <select 
                              required
                              value={wilaya} 
                              onChange={e => setWilaya(e.target.value)} 
                              className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            >
                              <option value="">اختر الولاية</option>
                              {TUNISIAN_GOVERNORATES.map(gov => (
                                <option key={gov} value={gov}>{gov}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                )}

                {role === 'parent' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="form-group">
                      <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">الولاية</label>
                      <select 
                        required
                        value={wilaya} 
                        onChange={e => setWilaya(e.target.value)} 
                        className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      >
                        <option value="">اختر الولاية</option>
                        {TUNISIAN_GOVERNORATES.map(gov => (
                          <option key={gov} value={gov}>{gov}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {newPasswordMode ? (
              <div className="space-y-4 bg-green-50/50 p-4 rounded-2xl border border-green-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="form-group">
                  <label className="mb-1.5 block text-[0.83rem] font-bold text-green-800">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border-1.5 border-green-200 bg-white p-2.5 ltr:pl-11 rtl:pr-11 text-[0.9rem] outline-none focus:border-green-500 focus:bg-white" 
                      placeholder="6 أحرف على الأقل" 
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-gray-400 hover:text-green-500">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={handleUpdatePasswordAfterOtp}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-base font-bold text-white transition-all hover:bg-green-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                  حفظ كلمة المرور الجديدة
                </button>
              </div>
            ) : showOtpInput ? (
              <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="form-group">
                  <label className="mb-1.5 block text-[0.83rem] font-bold text-blue-800">أدخل رمز التحقق (SMS OTP)</label>
                  <input 
                    type="text" 
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    className="w-full rounded-xl border-1.5 border-blue-200 bg-white p-2.5 text-[1.1rem] font-bold text-center tracking-widest outline-none focus:border-blue-500" 
                    placeholder="------" 
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={handleConfirmOtp}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-light py-3 text-base font-bold text-white transition-all hover:bg-blue-brand disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                    تأكيد الرمز
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setShowOtpInput(false);
                      setConfirmationResult(null);
                      setError('');
                    }}
                    className="rounded-xl border border-gray-200 px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="mb-1.5 block text-[0.83rem] font-bold text-gray-700">كلمة المرور</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-xl border-1.5 border-gray-200 bg-gray-50 p-2.5 ltr:pl-11 rtl:pr-11 text-[0.9rem] outline-none focus:border-blue-light focus:bg-white" 
                      placeholder={mode === 'login' ? "••••••••" : "6 أحرف على الأقل"} 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 text-gray-400 hover:text-blue-light">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="text-left ltr:text-left rtl:text-right">
                    <button type="button" onClick={handleForgot} className="text-[0.82rem] font-bold text-blue-light hover:underline">نسيت كلمة المرور؟</button>
                  </div>
                )}

                <button 
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-light py-3.5 text-base font-bold text-white transition-all hover:bg-blue-brand hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                  {mode === 'login' ? 'تسجيل الدخول بكلمة المرور' : 'إنشاء الحساب'}
                </button>
              </>
            )}
            <div id="recaptcha-container"></div>
          </form>
          )}

          {!isForgotMode && (
            <>
              <div className="my-6 flex items-center gap-3 text-[0.82rem] text-gray-400 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200">أو</div>
              
              <button onClick={handleGoogle} className="flex w-full items-center justify-center gap-2.5 rounded-xl border-1.5 border-gray-200 bg-white py-3 font-semibold text-gray-800 transition-all hover:border-blue-light hover:bg-gray-50">
                 <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                 المتابعة بـ Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
