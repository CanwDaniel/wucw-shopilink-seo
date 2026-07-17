const QUESTION_MAP = {
  budget: [
    "预算大概是多少？",

    "你的预算区间是多少？",

    "准备花多少钱购买电竞椅？",
  ],

  usage: [
    "主要是办公还是游戏？",

    "平时主要写代码还是玩游戏？",

    "你购买电竞椅主要用于什么？",
  ],

  dailyHours: [
    "每天大概会坐几个小时？",

    "平均每天使用多久？",

    "一天需要坐多久？",
  ],
};

export function buildQuestion(missingFields: string[]): string {
  const field = missingFields[0];

  if (!field) return "";

  const questions = QUESTION_MAP[field as keyof typeof QUESTION_MAP];

  if (!questions) return "";

  const random = Math.floor(Math.random() * questions.length);

  return questions[random];
}
