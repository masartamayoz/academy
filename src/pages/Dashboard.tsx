import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth, db } from '@/src/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AppShell from '@/src/components/layout/AppShell';

// UI Components for roles
import StudentOverview from '@/src/components/dashboard/StudentOverview';
import ParentOverview from '@/src/components/dashboard/ParentOverview';
import TeacherOverview from '@/src/components/dashboard/TeacherOverview';
import AdminOverview from '@/src/components/dashboard/AdminOverview';

type Role = 'student' | 'parent' | 'teacher' | 'admin';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const activeTab = searchParams.get('tab') || 'overview';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        
        // Load from local cache for immediate offline rendering
        const cachedKey = `masar_user_data_${authUser.uid}`;
        const cached = localStorage.getItem(cachedKey);
        if (cached) {
          try {
            setUserData(JSON.parse(cached));
          } catch (e) {
            console.warn('Stale cached user data, ignoring:', e);
          }
        }

        try {
          const snap = await getDoc(doc(db, 'users', authUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUserData(data);
            localStorage.setItem(cachedKey, JSON.stringify(data));
          }
        } catch (error) {
          console.warn('Could not load user data from Firestore (offline or slow):', error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const role: Role = (user?.email === 'masartamayoz@gmail.com' || user?.email === 'academy.masartamayoz@gmail.com') 
    ? 'admin' 
    : (userData?.userType || 'student');

  const renderActiveView = () => {
    if (!user) return null;
    if (!userData && !(user.email === 'masartamayoz@gmail.com' || user.email === 'academy.masartamayoz@gmail.com')) return null;
    
    const currentInfo = userData || {
      firstName: 'المشرف',
      lastName: 'العام',
      email: user.email,
      userType: 'admin'
    };

    switch (role) {
      case 'student': return <StudentOverview activeTab={activeTab} userData={currentInfo} user={user} />;
      case 'parent': return <ParentOverview activeTab={activeTab} userData={currentInfo} user={user} />;
      case 'teacher': return <TeacherOverview activeTab={activeTab} userData={currentInfo} user={user} />;
      case 'admin': return <AdminOverview activeTab={activeTab} userData={currentInfo} user={user} />;
      default: return <div>Role not recognized</div>;
    }
  };

  return (
    <AppShell 
      title="لوحة التحكم" 
      description="مرحباً بك في مسار التميز"
    >
      <div className="p-7 lg:p-10">
        {renderActiveView()}
      </div>
    </AppShell>
  );
}
