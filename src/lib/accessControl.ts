import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export interface ContentAccessRule {
  id: string;
  type: 'level_free' | 'user_free' | 'cross_level';
  level?: string;
  targetLevel?: string;
  userIds?: string[];
  userEmails?: string[];
  startDate: string;
  endDate: string;
  description?: string;
  isActive: boolean;
  createdAt?: any;
}

export function useContentAccess(userData: any) {
  const [rules, setRules] = useState<ContentAccessRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to all active rules
    const q = query(collection(db, 'contentAccessRules'), where('isActive', '==', true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activeRules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContentAccessRule[];
      
      setRules(activeRules);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching content access rules:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isRuleActive = (rule: ContentAccessRule): boolean => {
    if (!rule.isActive) return false;
    const now = new Date();
    const start = new Date(rule.startDate);
    const end = new Date(rule.endDate);
    return now >= start && now <= end;
  };

  /**
   * Checks whether the user can browse/select a specific level.
   */
  const isLevelAccessible = (lvl: string): boolean => {
    if (!userData) return false;
    const role = userData.userType || 'student';
    
    // Admins and teachers can browse all levels
    if (role === 'admin' || role === 'teacher') return true;

    // Students can browse their own level
    if (userData.level === lvl) return true;

    // Check if there is a cross_level rule active from user's level to target lvl
    const hasCrossLevel = rules.some(rule => 
      rule.type === 'cross_level' &&
      rule.level === userData.level &&
      rule.targetLevel === lvl &&
      isRuleActive(rule)
    );
    if (hasCrossLevel) return true;

    // Check if there is a level_free rule active for this level
    const isLvlFree = rules.some(rule => 
      rule.type === 'level_free' &&
      rule.level === lvl &&
      isRuleActive(rule)
    );
    if (isLvlFree) return true;

    return false;
  };

  /**
   * Checks whether the user has permission to open/view content of a specific level.
   */
  const hasAccess = (itemLevel: string, isItemFree?: boolean): boolean => {
    if (!userData) return false;
    const role = userData.userType || 'student';

    // Admins and teachers have absolute access
    if (role === 'admin' || role === 'teacher') return true;

    // If item itself is free, anyone can view it
    if (isItemFree) return true;

    // Check if this student is explicitly granted free access under user_free rules
    const hasStudentFree = rules.some(rule => 
      rule.type === 'user_free' &&
      rule.userIds?.includes(userData.uid || userData.id || '') &&
      isRuleActive(rule)
    );
    if (hasStudentFree) return true;

    // Check if this level is currently free for everyone
    const isLvlFree = rules.some(rule => 
      rule.type === 'level_free' &&
      rule.level === itemLevel &&
      isRuleActive(rule)
    );
    if (isLvlFree) return true;

    // If they have an active subscription or August review plan access
    const hasAugustReviewAccess = (() => {
      if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
      const now = new Date();
      const year = now.getFullYear();
      const start = new Date(year, 4, 20); // 20 May
      const end = new Date(year, 7, 31, 23, 59, 59); // 31 August
      return now >= start && now <= end;
    })();

    const isSubscribed = userData.subscriptionStatus === 'active' || hasAugustReviewAccess;
    if (isSubscribed) {
      // Subscribed users can access their own level
      if (userData.level === itemLevel) return true;

      // Subscribed users can also access another level if a cross_level rule is active
      const hasCrossLevel = rules.some(rule => 
        rule.type === 'cross_level' &&
        rule.level === userData.level &&
        rule.targetLevel === itemLevel &&
        isRuleActive(rule)
      );
      if (hasCrossLevel) return true;
    }

    return false;
  };

  return {
    rules,
    loading,
    isLevelAccessible,
    hasAccess
  };
}
