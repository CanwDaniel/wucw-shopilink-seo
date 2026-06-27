export function getMissingFields(profile) {
  const missing = [];

  if(!profile.budget) {
    missing.push("budget");
  }

  if (!profile.dailyHours) {
    missing.push("dailyHours");
  }

  if (!profile.usage) {
    missing.push("usage");
  }

  return missing;
}