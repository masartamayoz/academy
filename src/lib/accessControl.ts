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

    // Check if this level is free for everyone
    const isLvlFree = rules.some(rule => 
      rule.type === 'level_free' &&
      rule.level === lvl &&
      isRuleActive(rule)
    );
    if (isLvlFree) return true;

    // Check if the user is authorized for their own level (active subscription, August review, or user_free)
    const hasAugustReviewAccess = (() => {
      if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
      const now = new Date();
      const year = now.getFullYear();
      const start = new Date(year, 4, 20); // 20 May
      const end = new Date(year, 7, 31, 23, 59, 59); // 31 August
      return now >= start && now <= end;
    })();

    const hasStudentFree = rules.some(rule => 
      rule.type === 'user_free' &&
      rule.userIds?.includes(userData.uid || userData.id || '') &&
      isRuleActive(rule)
    );

    const isSubscribedOrFreeSelf = userData.subscriptionStatus === 'active' || hasAugustReviewAccess || hasStudentFree;

    // If they are subscribed or free-student, they can browse their own level
    if (isSubscribedOrFreeSelf && userData.level === lvl) return true;

    // If they are subscribed/free-student, can they browse other levels via cross_level?
    if (isSubscribedOrFreeSelf) {
      const hasCrossLevel = rules.some(rule => 
        rule.type === 'cross_level' &&
        rule.level === userData.level &&
        rule.targetLevel === lvl &&
        isRuleActive(rule)
      );
      if (hasCrossLevel) return true;
    }

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

    // Check if this level is currently free for everyone
    const isLvlFree = rules.some(rule => 
      rule.type === 'level_free' &&
      rule.level === itemLevel &&
      isRuleActive(rule)
    );
    if (isLvlFree) return true;

    // Check if the user is authorized for their own level (active subscription, August review, or user_free)
    const hasAugustReviewAccess = (() => {
      if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
      const now = new Date();
      const year = now.getFullYear();
      const start = new Date(year, 4, 20); // 20 May
      const end = new Date(year, 7, 31, 23, 59, 59); // 31 August
      return now >= start && now <= end;
    })();

    const hasStudentFree = rules.some(rule => 
      rule.type === 'user_free' &&
      rule.userIds?.includes(userData.uid || userData.id || '') &&
      isRuleActive(rule)
    );

    const isSubscribedOrFreeSelf = userData.subscriptionStatus === 'active' || hasAugustReviewAccess || hasStudentFree;

    if (isSubscribedOrFreeSelf) {
      // Subscribed/free users can access their own level
      if (userData.level === itemLevel) return true;

      // Subscribed/free users can also access another level if a cross_level rule is active
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
