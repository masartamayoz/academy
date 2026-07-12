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

    // Check if there is a matching level_free rule
    const matchesLevelFree = rules.some(rule => {
      if (rule.type !== 'level_free' || !isRuleActive(rule)) return false;
      
      // Matches student's level?
      const matchesStudent = !rule.level || rule.level === 'all' || rule.level === userData.level;
      
      // Matches content level?
      const matchesContent = !rule.targetLevel || rule.targetLevel === 'all' || rule.targetLevel === lvl;
      
      return matchesStudent && matchesContent;
    });
    if (matchesLevelFree) return true;

    // Check if there is a matching user_free rule
    const userId = userData.uid || userData.id || '';
    const matchesUserFree = rules.some(rule => {
      if (rule.type !== 'user_free' || !isRuleActive(rule)) return false;
      
      // Matches specific user?
      const matchesUser = rule.userIds?.includes(userId);
      
      // Matches content level?
      const matchesContent = !rule.targetLevel || rule.targetLevel === 'all' || rule.targetLevel === lvl;
      
      return matchesUser && matchesContent;
    });
    if (matchesUserFree) return true;

    // Check if the user is authorized for their own level via subscription or August review
    const hasAugustReviewAccess = (() => {
      if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
      const now = new Date();
      const year = now.getFullYear();
      const start = new Date(year, 4, 20); // 20 May
      const end = new Date(year, 7, 31, 23, 59, 59); // 31 August
      return now >= start && now <= end;
    })();

    const isSubscribed = userData.subscriptionStatus === 'active' || hasAugustReviewAccess;

    // Subscribed users can browse their own level
    if (isSubscribed && userData.level === lvl) return true;

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

    // Check if there is a matching level_free rule
    const matchesLevelFree = rules.some(rule => {
      if (rule.type !== 'level_free' || !isRuleActive(rule)) return false;
      
      // Matches student's level?
      const matchesStudent = !rule.level || rule.level === 'all' || rule.level === userData.level;
      
      // Matches content level?
      const matchesContent = !rule.targetLevel || rule.targetLevel === 'all' || rule.targetLevel === itemLevel;
      
      return matchesStudent && matchesContent;
    });
    if (matchesLevelFree) return true;

    // Check if there is a matching user_free rule
    const userId = userData.uid || userData.id || '';
    const matchesUserFree = rules.some(rule => {
      if (rule.type !== 'user_free' || !isRuleActive(rule)) return false;
      
      // Matches specific user?
      const matchesUser = rule.userIds?.includes(userId);
      
      // Matches content level?
      const matchesContent = !rule.targetLevel || rule.targetLevel === 'all' || rule.targetLevel === itemLevel;
      
      return matchesUser && matchesContent;
    });
    if (matchesUserFree) return true;

    // Check if the user is authorized for their own level via subscription or August review
    const hasAugustReviewAccess = (() => {
      if (!userData || (userData.planId !== 'august_review' && userData.plan !== 'august_review')) return false;
      const now = new Date();
      const year = now.getFullYear();
      const start = new Date(year, 4, 20); // 20 May
      const end = new Date(year, 7, 31, 23, 59, 59); // 31 August
      return now >= start && now <= end;
    })();

    const isSubscribed = userData.subscriptionStatus === 'active' || hasAugustReviewAccess;

    // Subscribed users can access their own level
    if (isSubscribed && userData.level === itemLevel) return true;

    return false;
  };

  return {
    rules,
    loading,
    isLevelAccessible,
    hasAccess
  };
}
