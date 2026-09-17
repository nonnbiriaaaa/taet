import AsyncStorage from "@react-native-async-storage/async-storage";
import { BMICategory, DailyRecord, Goals, StreakInfo, WeeklyStats } from "./types";

const KEYS = {
  RECORDS: "health_records",
  GOALS: "health_goals",
};

const DEFAULT_GOALS: Goals = {
  currentWeight: 0,
  targetWeight: 65,
  heightCm: 170,
  startDate: new Date().toISOString().slice(0, 10),
  targetDate: "2026-08-17",
  dailyCalGoal: 2000,
  dailyStepGoal: 8000,
  sleepGoalHours: 7.5,
};

export async function loadGoals(): Promise<Goals> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.GOALS);
    return raw ? JSON.parse(raw) : DEFAULT_GOALS;
  } catch (e) {
    console.error("loadGoals error:", e);
    return DEFAULT_GOALS;
  }
}

export async function saveGoals(goals: Goals): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
  } catch (e) {
    console.error("saveGoals error:", e);
  }
}

export async function loadAllRecords(): Promise<DailyRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RECORDS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("loadAllRecords error:", e);
    return [];
  }
}

export async function saveRecord(record: DailyRecord): Promise<void> {
  try {
    const all = await loadAllRecords();
    const idx = all.findIndex((r) => r.date === record.date);
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    all.sort((a, b) => a.date.localeCompare(b.date));
    await AsyncStorage.setItem(KEYS.RECORDS, JSON.stringify(all));
  } catch (e) {
    console.error("saveRecord error:", e);
  }
}

export async function loadRecord(date: string): Promise<DailyRecord | null> {
  try {
    const all = await loadAllRecords();
    return all.find((r) => r.date === date) ?? null;
  } catch (e) {
    console.error("loadRecord error:", e);
    return null;
  }
}

export function calcWeeklyStats(records: DailyRecord[], startDate: string): WeeklyStats[] {
  const stats: WeeklyStats[] = [];
  for (let wk = 0; wk < 13; wk++) {
    const sd = addDays(startDate, wk * 7);
    const ed = addDays(sd, 6);
    const week = records.filter((r) => r.date >= sd && r.date <= ed);
    const weights = week.map((r) => r.weight).filter((w): w is number => !!w);
    const sleeps = week.map((r) => r.sleepHours).filter((s): s is number => !!s);
    stats.push({
      week: wk + 1,
      startDate: sd,
      endDate: ed,
      avgWeight: weights.length ? avg(weights) : undefined,
      totalExerciseMin: week.reduce((s, r) => s + (r.exerciseMin ?? 0), 0),
      totalCal: week.reduce((s, r) => s + (r.exerciseCal ?? 0), 0),
      avgSleep: sleeps.length ? avg(sleeps) : undefined,
    });
  }
  return stats;
}

function avg(arr: number[]): number {
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function calcBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function getBMICategory(bmi: number): BMICategory {
  if (bmi < 18.5) return "低体重";
  if (bmi < 25.0) return "普通体重";
  if (bmi < 30.0) return "肥満（1度）";
  return "肥満（2度以上）";
}

export function calcStreak(records: DailyRecord[]): StreakInfo {
  const recorded = new Set(
    records
      .filter(r => r.weight != null || r.breakfast || r.lunch || r.dinner || r.exerciseMin != null || r.sleepHours != null)
      .map(r => r.date)
  );
  if (recorded.size === 0) return { currentStreak: 0, longestStreak: 0, lastRecordDate: "" };

  const sorted = [...recorded].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  let currentStreak = 0;
  let checkDate = today;
  while (recorded.has(checkDate)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }
  if (currentStreak === 0) {
    checkDate = addDays(today, -1);
    while (recorded.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  const allSorted = [...recorded].sort();
  let longest = 0, cur = 1;
  for (let i = 1; i < allSorted.length; i++) {
    if (addDays(allSorted[i - 1], 1) === allSorted[i]) {
      cur++;
    } else {
      longest = Math.max(longest, cur);
      cur = 1;
    }
  }
  longest = Math.max(longest, cur);

  return { currentStreak, longestStreak: longest, lastRecordDate: sorted[0] };
}

export function calcCurrentWeekIndex(startDate: string): number {
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return 0;
  const startMs = new Date(startDate + "T00:00:00").getTime();
  const todayMs = new Date(today + "T00:00:00").getTime();
  const diffDays = Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24));
  return Math.min(Math.floor(diffDays / 7), 12);
}

export function calcAchievementRate(stat: WeeklyStats, goals: Goals): number {
  const rates: number[] = [];
  if (stat.avgSleep != null && goals.sleepGoalHours > 0) {
    rates.push(Math.min(100, Math.round((stat.avgSleep / goals.sleepGoalHours) * 100)));
  }
  const weeklyExerciseGoal = 150;
  if (stat.totalExerciseMin > 0) {
    rates.push(Math.min(100, Math.round((stat.totalExerciseMin / weeklyExerciseGoal) * 100)));
  }
  if (rates.length === 0) return 0;
  return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
}
