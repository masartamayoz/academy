import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AppShell from '@/src/components/layout/AppShell';
import { cn } from '@/src/lib/utils';

// UI Components for roles
import StudentOverview from '@/src/components/dashboard/StudentOverview';
import ParentOverview from '@/src/components/dashboard/ParentOverview';
import TeacherOverview from '@/src/components/dashboard/TeacherOverview';
import AdminOverview from '@/src/components/dashboard/AdminOverview';

type Role = 'student' | 'parent' | 'teacher' | 'admin';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        const snap = await getDoc(doc(db, 'users', authUser.uid));
        if (snap.exists()) {
          setUserData(snap.data());
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const role: Role = userData?.userType || 'student';

  const menuItems = {
    student: [
      { id: 'overview', label: 'الإستقبال' },
      { id: 'sessions', label: 'الحصص' },
      { id: 'schedule', label: 'الجدول' },
      { id: 'tests', label: 'الاختبارات' },
      { id: 'wallet', label: 'المحفظة' },
    ],
    parent: [
      { id: 'overview', label: 'لوحة التحكم' },
      { id: 'children', label: 'الأبناء' },
      { id: 'schedule', label: 'الجداول' },
      { id: 'absences', label: 'الغيابات' },
      { id: 'wallet', label: 'المحفظة' },
    ],
    teacher: [
      { id: 'overview', label: 'لوحة التحكم' },
      { id: 'content', label: 'المحتوى' },
      { id: 'sessions', label: 'حصصي' },
      { id: 'schedule', label: 'الجدول' },
      { id: 'attendance', label: 'الحضور' },
      { id: 'wallet', label: 'محفظتي' },
    ],
    admin: [
      { id: 'overview', label: 'نظرة عامة' },
      { id: 'users', label: 'المستخدمين' },
      { id: 'subscriptions', label: 'الاشتراكات' },
      { id: 'groups', label: 'المجموعات' },
      { id: 'attendance', label: 'الحصص' },
      { id: 'wallets', label: 'المحافظ' },
      { id: 'maintenance', label: 'الصيانة' },
    ]
  };

  const currentTabs = menuItems[role] || menuItems.student;

  const renderActiveView = () => {
    if (!user || !userData) return null;
    switch (role) {
      case 'student': return <StudentOverview activeTab={activeTab} userData={userData} user={user} />;
      case 'parent': return <ParentOverview activeTab={activeTab} userData={userData} user={user} />;
      case 'teacher': return <TeacherOverview activeTab={activeTab} userData={userData} user={user} />;
      case 'admin': return <AdminOverview activeTab={activeTab} userData={userData} user={user} />;
      default: return <div>Role not recognized</div>;
    }
  };

  return (
    <AppShell 
      title="لوحة التحكم" 
      description="مرحباً بك في مسار التميز"
    >
      <div className="p-4 sm:p-7 lg:p-10">
        {/* Mobile Horizontal Sub-Navigation */}
        <div className="lg:hidden mb-6 -mx-4 relative">
          <div className="overflow-x-auto scroller-hidden flex items-center gap-2 pb-4 scroll-smooth px-4">
             <div className="flex items-center gap-2 shrink-0">
               {currentTabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => navigate(`/dashboard?tab=${tab.id}`)}
                   className={cn(
                     "whitespace-nowrap px-5 py-2.5 rounded-2xl text-[0.8rem] font-bold transition-all shrink-0",
                     activeTab === tab.id 
                      ? "bg-blue-brand text-white shadow-lg shadow-blue-brand/20 scale-105" 
                      : "bg-white text-gray-500 border border-gray-100 active:scale-95"
                   )}
                 >
                   {tab.label}
                 </button>
               ))}
             </div>
          </div>
          {/* Subtle fade to indicate scroll */}
          <div className="absolute top-0 right-0 bottom-4 w-8 bg-gradient-to-l from-[#F8FAFC] to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 bottom-4 w-8 bg-gradient-to-r from-[#F8FAFC] to-transparent pointer-events-none" />
        </div>

        {renderActiveView()}
      </div>
    </AppShell>
  );
}
