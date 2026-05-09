import React, { useState, useEffect } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { User, Mail, Smartphone, Save, Loader2, CheckCircle, GraduationCap, Shield } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import AppShell from '@/src/components/layout/AppShell';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    level: ''
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setUserData(d);
          setFormData({
            displayName: d.displayName || user.displayName || '',
            phone: d.phone || '',
            level: d.level || ''
          });
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...formData,
        updatedAt: new Date()
      });
      await updateProfile(auth.currentUser, { displayName: formData.displayName });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell 
      title="ملفي الشخصي" 
      description="إدارة معلوماتك الشخصية وإعدادات الحساب"
    >
      <div className="max-w-4xl mx-auto p-7 lg:p-10">
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Profile Card */}
            <aside className="lg:col-span-4 space-y-6">
               <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center shadow-xl shadow-gray-200/40">
                  <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-[32px] bg-blue-50 text-blue-light border-4 border-white shadow-lg overflow-hidden font-black text-2xl">
                     {formData.displayName ? formData.displayName.charAt(0).toUpperCase() : <User size={40} />}
                  </div>
                  <h2 className="text-xl font-black text-blue-dark">{formData.displayName || 'مستخدم'}</h2>
                  <p className="text-sm text-gray-400 mb-6 truncate px-2 font-Tajawal">{userData?.email}</p>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-blue-light/10 px-4 py-2 text-[0.75rem] font-black text-blue-brand">
                     <Shield size={14} />
                     {userData?.userType === 'student' ? 'تلميذ' : userData?.userType === 'parent' ? 'ولي أمر' : 'أستاذ'}
                  </div>
               </div>

               <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xl shadow-gray-200/40">
                  <h3 className="font-black text-blue-dark mb-5 text-[0.85rem] uppercase tracking-widest text-gray-400">حالة الحساب</h3>
                  <div className={cn(
                    "flex items-center justify-between p-4 rounded-2xl",
                    userData?.subscriptionStatus === 'active' ? "bg-emerald-50 border border-emerald-100" : "bg-amber-50 border border-amber-100"
                  )}>
                     <div className="flex items-center gap-3">
                        <CheckCircle className={userData?.subscriptionStatus === 'active' ? "text-emerald-500" : "text-amber-500"} size={20} />
                        <div>
                          <p className="text-[0.65rem] font-bold text-gray-400 uppercase">الاشتراك</p>
                          <p className={cn("text-sm font-black", userData?.subscriptionStatus === 'active' ? "text-emerald-700" : "text-amber-700")}>
                             {userData?.subscriptionStatus === 'active' ? 'مفعّل حالياً' : 'غير مشترك'}
                          </p>
                        </div>
                     </div>
                  </div>
               </div>
            </aside>

            {/* Form Content */}
            <div className="lg:col-span-8">
               <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
                  <div className="bg-gradient-to-br from-blue-dark to-blue-mid p-8 text-white">
                     <h3 className="text-lg font-black">المعلومات الأساسية</h3>
                     <p className="text-white/50 text-xs mt-1 font-Tajawal">يرجى التأكد من صحة رقم الهاتف لتلقي الإشعارات</p>
                  </div>

                  <div className="p-8">
                     {success && (
                       <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-700 font-bold border border-emerald-100 animate-in slide-in-from-top">
                         <CheckCircle size={20} /> تم حفظ التغييرات بنجاح
                       </div>
                     )}

                     <form onSubmit={handleUpdate} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest px-1">الاسم الكامل</label>
                              <div className="relative">
                                <input 
                                  value={formData.displayName}
                                  onChange={e => setFormData({...formData, displayName: e.target.value})}
                                  type="text" 
                                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3.5 pr-10 text-[0.92rem] font-bold outline-none focus:border-blue-light focus:bg-white transition-all shadow-inner" 
                                />
                                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest px-1">رقم الهاتف</label>
                              <div className="relative">
                                <input 
                                  value={formData.phone}
                                  onChange={e => setFormData({...formData, phone: e.target.value})}
                                  type="tel" 
                                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3.5 pr-10 text-[0.92rem] font-bold outline-none focus:border-blue-light focus:bg-white transition-all shadow-inner" 
                                  placeholder="+216" 
                                />
                                <Smartphone className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest px-1">نوع الحساب</label>
                              <div className="relative">
                                <select 
                                  value={userData?.userType}
                                  onChange={async (e) => {
                                     const newType = e.target.value;
                                     if (confirm('تغيير نوع الحساب قد يؤثر على صلاحياتك وجدولة دروسك. هل أنت متأكد؟')) {
                                        try {
                                           setSaving(true);
                                           await updateDoc(doc(db, 'users', auth.currentUser!.uid), { userType: newType });
                                           setUserData({ ...userData, userType: newType });
                                        } finally {
                                           setSaving(false);
                                        }
                                     }
                                  }}
                                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3.5 pr-10 text-[0.92rem] font-bold outline-none focus:border-blue-light focus:bg-white cursor-pointer transition-all shadow-inner appearance-none"
                                >
                                   <option value="student">تلميذ</option>
                                   <option value="parent">ولي أمر</option>
                                   {userData?.userType === 'teacher' && <option value="teacher">أستاذ</option>}
                                   {userData?.userType === 'admin' && <option value="admin">مدير</option>}
                                </select>
                                <Shield className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest px-1">البريد الإلكتروني</label>
                              <div className="relative">
                                <input readOnly value={userData?.email} type="email" className="w-full rounded-2xl border border-gray-50 bg-gray-50 p-3.5 pr-10 text-[0.92rem] font-bold text-gray-300 outline-none cursor-not-allowed shadow-inner" />
                                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                              </div>
                           </div>
                           {userData?.userType === 'student' && (
                              <div className="space-y-2">
                                 <label className="text-[0.7rem] font-bold text-gray-400 uppercase tracking-widest px-1">المستوى الدراسي</label>
                                 <div className="relative">
                                   <select 
                                    value={formData.level}
                                    onChange={e => setFormData({...formData, level: e.target.value})}
                                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-3.5 pr-10 text-[0.92rem] font-bold outline-none focus:border-blue-light focus:bg-white cursor-pointer transition-all shadow-inner appearance-none"
                                   >
                                      <option value="7">السنة السابعة أساسي</option>
                                      <option value="8">السنة الثامنة أساسي</option>
                                      <option value="9">السنة التاسعة أساسي</option>
                                      <option value="1sec">السنة الأولى ثانوي</option>
                                      <option value="2sec">السنة الثانية ثانوي</option>
                                      <option value="3sec">السنة الثالثة ثانوي</option>
                                      <option value="4sec">باكالوريا</option>
                                   </select>
                                   <GraduationCap className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                 </div>
                              </div>
                           )}

                           {userData?.userType === 'student' && (
                              <div className="rounded-2xl border border-blue-50 bg-blue-50/30 p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                                 <div>
                                    <h4 className="text-sm font-black text-blue-dark">رمز التلميذ للمتابعة</h4>
                                    <p className="text-[0.75rem] text-gray-500 font-bold font-Tajawal">أعطِ هذا الرمز لوليك ليتمكن من متابعة تقدمك.</p>
                                 </div>
                                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-blue-100 shadow-sm font-mono">
                                    <code className="text-sm font-black text-blue-brand tracking-wider">{auth.currentUser?.uid}</code>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        if (auth.currentUser?.uid) {
                                          navigator.clipboard.writeText(auth.currentUser.uid);
                                          alert('تم نسخ الرمز');
                                        }
                                      }}
                                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-blue-light"
                                    >
                                       <Save size={14} className="rotate-45" />
                                    </button>
                                 </div>
                              </div>
                           )}
                        </div>

                        <div className="pt-8 border-t border-gray-50 flex justify-end">
                           <button 
                            disabled={saving}
                            type="submit" 
                            className="group relative flex items-center gap-3 rounded-2xl bg-blue-light px-12 py-4 font-black text-white hover:bg-blue-brand transition-all shadow-xl shadow-blue-500/25 disabled:opacity-50 overflow-hidden"
                           >
                              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                              <div className="relative flex items-center gap-3">
                                 {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                 <span>حفظ التغييرات</span>
                              </div>
                           </button>
                        </div>
                     </form>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </AppShell>
  );
}
