export function hasSchoolAccess(
  school: {
    isActive: boolean;
    activationExpiryDate: Date | null;
  },
  now = new Date(),
): boolean {
  if (!school.isActive) {
    return false;
  }

  // No expiry date must never mean unlimited access.
  if (school.activationExpiryDate === null) {
    return false;
  }

  const expiryTime = school.activationExpiryDate.getTime();

  if (!Number.isFinite(expiryTime)) {
    return false;
  }

  // The expiry API stores the end of the selected Kenyan
  // calendar day as a UTC timestamp.
  return expiryTime >= now.getTime();
}

/**
 * Retained for compatibility with any other existing imports.
 * School expiry is no longer calculated automatically during
 * activation-payment approval.
 */
export function addCalendarMonthsClamped(
  date: Date,
  months: number,
): Date {
  if (!Number.isInteger(months)) {
    throw new Error("Months must be a whole number.");
  }

  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDay));

  return result;
}