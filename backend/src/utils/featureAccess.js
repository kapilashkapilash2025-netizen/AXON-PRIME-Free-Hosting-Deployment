const hierarchy = {
  FREE: 0,
  PRO: 1,
  ELITE: 2
};

export function isFounder(user) {
  return user?.role === 'FOUNDER';
}

export function hasAccess(user, requiredPlan) {
  if (!user) return false;
  if (isFounder(user)) return true;

  const userLevel = hierarchy[user.role];
  const requiredLevel = hierarchy[requiredPlan];
  if (userLevel == null || requiredLevel == null) return false;

  return userLevel >= requiredLevel;
}
