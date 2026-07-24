import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const getPlanExpiryDate = (planId: string): Date => {
  const now = new Date();
  const currentYear = now.getFullYear();
  switch (planId) {
    case 'august_review':
      return new Date(currentYear, 7, 31, 23, 59, 59); // 31 August of current year
    case 'trimester1':
      return new Date(currentYear, 11, 22, 23, 59, 59); // 22 December of current year
    case 'trimester2':
      const t2Date = new Date(currentYear, 2, 22, 23, 59, 59);
      if (t2Date < now) {
        return new Date(currentYear + 1, 2, 22, 23, 59, 59);
      }
      return t2Date;
    case 'trimester3':
      const t3Date = new Date(currentYear, 5, 15, 23, 59, 59);
      if (t3Date < now) {
        return new Date(currentYear + 1, 5, 15, 23, 59, 59);
      }
      return t3Date;
    case 'full_year':
      const yearEnd = new Date(currentYear, 5, 15, 23, 59, 59);
      if (yearEnd < now) {
        return new Date(currentYear + 1, 5, 15, 23, 59, 59);
      }
      return yearEnd;
    case 'recordings_yearly':
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      return oneYear;
    case 'monthly':
    default:
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return thirtyDays;
  }
};

/**
 * Updates a single user profile & wallet to active subscription status.
 */
export const activateUserSubscription = async (
  userId: string,
  planId: string,
  planName: string,
  planPrice: string,
  expiryDateStr: string,
  paymentMethod?: string
) => {
  await updateDoc(doc(db, 'users', userId), {
    subscriptionStatus: 'active',
    currentPlan: planName,
    plan: planId,
    planId: planId,
    lastPaymentDate: serverTimestamp(),
    subscriptionExpiry: expiryDateStr
  });

  await setDoc(
    doc(db, 'wallets', userId),
    {
      activeSubscription: {
        planName,
        planId,
        activatedAt: serverTimestamp(),
        price: planPrice,
        ...(paymentMethod ? { paymentMethod } : {})
      },
      lastUpdated: serverTimestamp()
    },
    { merge: true }
  );
};

/**
 * Activates subscription for a target user and synchronizes subscription activation
 * across all linked family members (parents and children) with the exact same offer and duration.
 */
export const getLinkedFamilyUserIds = async (
  primaryUserId: string,
  explicitParentId?: string
): Promise<Set<string>> => {
  const familyIds = new Set<string>();
  if (primaryUserId) familyIds.add(primaryUserId);
  if (explicitParentId) familyIds.add(explicitParentId);

  const queue = Array.from(familyIds);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    try {
      // 1. If currentId is a parent, query all children where parentId == currentId
      const qChildren = query(collection(db, 'parentChildren'), where('parentId', '==', currentId));
      const snapChildren = await getDocs(qChildren);
      snapChildren.forEach((d) => {
        const childId = d.data().childId;
        if (childId && !visited.has(childId)) {
          familyIds.add(childId);
          queue.push(childId);
        }
      });

      // 2. If currentId is a child, query all parents where childId == currentId
      const qParents = query(collection(db, 'parentChildren'), where('childId', '==', currentId));
      const snapParents = await getDocs(qParents);
      snapParents.forEach((d) => {
        const parentId = d.data().parentId;
        if (parentId && !visited.has(parentId)) {
          familyIds.add(parentId);
          queue.push(parentId);
        }
      });
    } catch (err) {
      console.error(`Error querying parentChildren links for ${currentId}:`, err);
    }
  }

  return familyIds;
};

export const activateSubscriptionWithLinkedUsers = async ({
  userId,
  planId,
  planName,
  planPrice,
  expiryDateStr,
  paymentMethod,
  explicitParentId
}: {
  userId: string;
  planId: string;
  planName: string;
  planPrice: string;
  expiryDateStr: string;
  paymentMethod?: string;
  explicitParentId?: string;
}) => {
  const familyUserIds = await getLinkedFamilyUserIds(userId, explicitParentId);

  for (const idToActivate of familyUserIds) {
    try {
      await activateUserSubscription(
        idToActivate,
        planId,
        planName,
        planPrice,
        expiryDateStr,
        paymentMethod
      );
    } catch (err) {
      console.error(`Error activating subscription for family member ${idToActivate}:`, err);
    }
  }
};

/**
 * Synchronizes subscription when a new link between parent and child is established.
 */
export const syncSubscriptionOnLink = async (parentId: string, childId: string) => {
  try {
    const parentSnap = await getDoc(doc(db, 'users', parentId));
    const childSnap = await getDoc(doc(db, 'users', childId));

    if (!parentSnap.exists() || !childSnap.exists()) return;

    const parentData = parentSnap.data();
    const childData = childSnap.data();

    const parentActive = parentData.subscriptionStatus === 'active';
    const childActive = childData.subscriptionStatus === 'active';

    if (parentActive || childActive) {
      const activeData = parentActive ? parentData : childData;
      const planId = activeData.plan || activeData.planId || 'monthly';
      const planName = activeData.currentPlan || 'اشتراك';
      const expiry = activeData.subscriptionExpiry || new Date(Date.now() + 30 * 86400000).toISOString();
      const price = activeData.price || '0';

      await activateSubscriptionWithLinkedUsers({
        userId: parentId,
        planId,
        planName,
        planPrice: price,
        expiryDateStr: expiry,
        explicitParentId: parentId
      });
    }
  } catch (err) {
    console.error('Error syncing subscription on link:', err);
  }
};
