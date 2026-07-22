export function getMissingFields(profile = { budget: "", dailyHours: "", usage: "" }) {
  const missing = [];

  if(!profile.budget) {
    // missing.push({field: "budget", message: "What is your budget and the usage scenario?"});
    missing.push("budget");
  }

  if (!profile.dailyHours) {
    // missing.push({field: "dailyHours", message: "How long do you work every day?"});
    missing.push("dailyHours");
  }

  if (!profile.usage) {
    // missing.push({field: "usage", message: "What are your usage scenarios?"});
    missing.push("usage");
  }

  return missing;
}