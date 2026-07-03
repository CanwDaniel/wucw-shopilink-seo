type UserProfile = {
  budget?: number;
  dailyHours?: number;
  usage?: string;
};

type Chair = {
  id: string;
  title: string;
  price: number;
  minDailyHours: number;
  recommendedUsage: string[];
};

function scoreChair(profile: UserProfile, chair: Chair) {
  let score = 0;

  if (profile.budget && chair.price <= profile.budget) {
    score += 30;
  }

  if (profile.dailyHours && chair.minDailyHours <= profile.dailyHours) {
    score += 30;
  }

  if (profile.usage && chair.recommendedUsage.includes(profile.usage)) {
    score += 40;
  }

  return score;
}

export function recommendChairs(profile: UserProfile, chairs: any) {
  return chairs.data.map((chair: any) => ({
    ...chair,
    score: scoreChair(profile, chair),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
