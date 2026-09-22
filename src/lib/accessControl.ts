import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export interface ContentAccessRule {
  id: string;
  type: 'level_free' | 'user_free' | 'cross_level' | 'parent_free' | 'group_free' | 'offer_free';
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

export interface FreeOfferRule {
  id: string;
  offerId: string;
  offerName: string;
  targetType: 'level' | 'student' | 'parent' | 'group';
  level?: string;
  targetLevel?: string;
  studentIds?: string[];
  studentNames?: string[];
  studentEmails?: string[];
  parentIds?: string[];
  parentNames?: string[];
  parentEmails?: string[];
  groupId?: string;
  groupName?: string;
  startDate: string;
  endDate: string;
  description?: string;
  isActive: boolean;
  createdAt?: any;
}

export function useContentAccess(userData: any) {
  const [rules, setRules] = useState<ContentAccessRule[]>([]);
  const [freeOffers, setFreeOffers] = useState<FreeOfferRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to all active content access rules
    const qRules = query(collection(db, 'contentAccessRules'), where('isActive', '==', true));
    const unsubscribeRules = onSnapshot(qRules, (snapshot) => {
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

    // Listen to all active free offer rules
    const qOffers = query(collection(db, 'freeOfferRules'), where('isActive', '==', true));
    const unsubscribeOffers = onSnapshot(qOffers, (snapshot) => {
      const activeOffers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FreeOfferRule[];
      
      setFreeOffers(activeOffers);
    }, (error) => {
      console.error("Error fetching free offer rules:", error);
    });

    return () => {
      unsubscribeRules();
      unsubscribeOffers();
    };
  }, []);

  const isRuleActive = (rule: { isActive: boolean; startDate: string; endDate: string }): boolean => {
    if (!rule.isActive) return false;
    const now = new Date();
    const start = new Date(rule.startDate);
    const end = new Date(rule.endDate);
    return now >= start && now <= end;
  };

  const doesFreeOfferMatchUser = (rule: FreeOfferRule, targetLevelCheck?: string): boolean => {
    if (!userData || !isRuleActive(rule)) return false;
    const role = userData.userType || 'student';
    if (role === 'admin' || role === 'teacher') return true;

    const userId = userData.uid || userData.id || '';
    const parentId = userData.parentId || '';
    const userEmail = (userData.email || '').toLowerCase();
    const parentEmail = (userData.parentEmail || '').toLowerCase();
    const userGroup = userData.group || '';

    let matchesTarget = false;
    if (rule.targetType === 'level') {
      matchesTarget = !rule.level || rule.level === 'all' || rule.level === userData.level;
    } else if (rule.targetType === 'student') {
      const emailsLower = (rule.studentEmails || []).map(e => (e || '').toLowerCase());
      matchesTarget = Boolean((userId && rule.studentIds?.includes(userId)) || (userEmail && emailsLower.includes(userEmail)));
    } else if (rule.targetType === 'parent') {
      const emailsLower = (rule.parentEmails || []).map(e => (e || '').toLowerCase());
      matchesTarget = Boolean(
        (parentId && rule.parentIds?.includes(parentId)) ||
        (userId && rule.parentIds?.includes(userId)) ||
        (parentEmail && emailsLower.includes(parentEmail)) ||
        (userEmail && emailsLower.includes(userEmail))
      );
    } else if (rule.targetType === 'group') {
      matchesTarget = Boolean(userGroup && (rule.groupId === userGroup || rule.groupName === userGroup));
    }

    if (!matchesTarget) return false;

    if (targetLevelCheck) {
      if (rule.targetLevel && rule.targetLevel !== 'all' && rule.targetLevel !== targetLevelCheck) {
        return false;
      }
    }

    return true;
  };

  // Find user's active free offers
  const userActiveFreeOffers = freeOffers.filter(rule => doesFreeOfferMatchUser(rule));

  /**
   * Checks whether the user can browse/select a specific level.
   */
  const isLevelAccessible = (lvl: string): boolean => {
    if (!userData) return false;
    const role = userData.userType || 'student';
    
    // Admins and teachers can browse all levels
    if (role === 'admin' || role === 'teacher') return true;

    // Check if there is a matching free offer rule
    const hasMatchingFreeOffer = freeOffers.some(rule => doesFreeOfferMatchUser(rule, lvl));
    if (hasMatchingFreeOffer) return true;

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
    const parentId = userData.parentId || '';
    const userEmail = (userData.email || '').toLowerCase();
    const parentEmail = (userData.parentEmail || '').toLowerCase();

    const matchesUserFree = rules.some(rule => {
      if (!isRuleActive(rule)) return false;
      if (rule.type !== 'user_free' && rule.type !== 'parent_free') return false;
      
      const ruleEmailsLower = (rule.userEmails || []).map(e => (e || '').toLowerCase());

      // Matches specific user or parent (by ID or Email)?
      const matchesUser = 
        (userId && rule.userIds?.includes(userId)) ||
        (parentId && rule.userIds?.includes(parentId)) ||
        (userEmail && ruleEmailsLower.includes(userEmail)) ||
        (parentEmail && ruleEmailsLower.includes(parentEmail));
      
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

    // Check if there is a matching free offer rule
    const hasMatchingFreeOffer = freeOffers.some(rule => doesFreeOfferMatchUser(rule, itemLevel));
    if (hasMatchingFreeOffer) return true;

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
    const parentId = userData.parentId || '';
    const userEmail = (userData.email || '').toLowerCase();
    const parentEmail = (userData.parentEmail || '').toLowerCase();

    const matchesUserFree = rules.some(rule => {
      if (!isRuleActive(rule)) return false;
      if (rule.type !== 'user_free' && rule.type !== 'parent_free') return false;
      
      const ruleEmailsLower = (rule.userEmails || []).map(e => (e || '').toLowerCase());

      // Matches specific user or parent (by ID or Email)?
      const matchesUser = 
        (userId && rule.userIds?.includes(userId)) ||
        (parentId && rule.userIds?.includes(parentId)) ||
        (userEmail && ruleEmailsLower.includes(userEmail)) ||
        (parentEmail && ruleEmailsLower.includes(parentEmail));
      
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
    freeOffers,
    userActiveFreeOffers,
    hasStudentFreeAccess: userActiveFreeOffers.length > 0,
    loading,
    isLevelAccessible,
    hasAccess
  };
}
