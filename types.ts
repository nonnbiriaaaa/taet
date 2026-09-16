export interface DailyRecord {
  date: string; // YYYY-MM-DD
  weight?: number;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snack?: string;
  exerciseType?: string;
  exerciseMin?: number;
  exerciseCal?: number;
  bedtime?: string;  // HH:MM
  wakeup?: string;   // HH:MM
  sleepHours?: number;
  memo?: string;
  waterMl?: number;  // 水分摂取量 (ml)
}

export interface Goals {
  currentWeight: number;
  targetWeight: number;
  heightCm: number;
  startDate: string;     // YYYY-MM-DD
  targetDate: string;    // YYYY-MM-DD
  dailyCalGoal: number;
  dailyStepGoal: number;
  sleepGoalHours: number;
}

export interface WeeklyStats {
  week: number;
  startDate: string;
  endDate: string;
  avgWeight?: number;
  totalExerciseMin: number;
  totalCal: number;
  avgSleep?: number;
  achievementRate?: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastRecordDate: string;
}

export type BMICategory = "低体重" | "普通体重" | "肥満（1度）" | "肥満（2度以上）";
