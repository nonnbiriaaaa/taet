import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { LineChart } from "react-native-chart-kit";
import { loadAllRecords, loadGoals, calcWeeklyStats, calcStreak, calcBMI, getBMICategory } from "../store";
import { Goals, WeeklyStats, StreakInfo } from "../types";

const C = {
  green: "#1A7A4A", greenLight: "#D5F5E3",
  blue: "#1A5276", blueLight: "#D6EAF8",
  orange: "#BA4A00", orangeLight: "#FDEBD0",
  purple: "#6C3483", purpleLight: "#E8DAEF",
  text: "#222", sub: "#666",
};

const W = Dimensions.get("window").width;

interface KpiProps {
  label: string;
  value: string;
  bg: string;
  accent: string;
}

function KpiCard({ label, value, bg, accent }: KpiProps) {
  return (
    <View style={[styles.kpi, { backgroundColor: bg, borderLeftColor: accent }]}>
      <Text style={[styles.kpiLabel, { color: accent }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [goals, setGoals] = useState<Goals | null>(null);
  const [weekStats, setWeekStats] = useState<WeeklyStats[]>([]);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [g, records] = await Promise.all([loadGoals(), loadAllRecords()]);
        setGoals(g);
        setWeekStats(calcWeeklyStats(records, g.startDate));
        setStreakInfo(calcStreak(records));
      })();
    }, [])
  );

  const latest = weekStats.find((w) => w.avgWeight);
  const thisWeek = weekStats[0];

  const chartData = weekStats.filter((w) => w.avgWeight).slice(0, 13);
  const hasChart = chartData.length >= 2;

  function fmtNum(n?: number, dec = 1) {
    return n != null ? n.toFixed(dec) : "--";
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 目標体重バナー */}
      {goals && (
        <View style={styles.bannerWrapper}>
          <View style={styles.banner}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={styles.bannerSub}>目標体重</Text>
              <Text style={styles.bannerValue}>{goals.targetWeight} kg</Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={styles.bannerSub}>連続記録</Text>
              <Text style={styles.bannerValue}>{streakInfo?.currentStreak ?? 0} 日</Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={styles.bannerSub}>現在の平均</Text>
              <Text style={styles.bannerValue}>{latest?.avgWeight ? `${fmtNum(latest.avgWeight)} kg` : "--"}</Text>
            </View>
          </View>
          {goals?.heightCm > 0 && latest?.avgWeight && (() => {
            const bmi = calcBMI(latest.avgWeight!, goals!.heightCm);
            const cat = getBMICategory(bmi);
            return (
              <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: "center", marginTop: 10 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>BMI {bmi} · {cat}</Text>
              </View>
            );
          })()}
        </View>
      )}

      {/* 今週のKPI */}
      <Text style={styles.sectionHead}>今週のサマリー</Text>
      <View style={styles.kpiGrid}>
        <KpiCard label="平均体重" value={thisWeek?.avgWeight ? `${fmtNum(thisWeek.avgWeight)} kg` : "--"} bg={C.blueLight} accent={C.blue} />
        <KpiCard label="運動時間" value={thisWeek ? `${thisWeek.totalExerciseMin} 分` : "--"} bg={C.greenLight} accent={C.green} />
        <KpiCard label="消費Cal" value={thisWeek ? `${thisWeek.totalCal.toLocaleString()} kcal` : "--"} bg={C.orangeLight} accent={C.orange} />
        <KpiCard label="平均睡眠" value={thisWeek?.avgSleep ? `${fmtNum(thisWeek.avgSleep)} 時間` : "--"} bg={C.purpleLight} accent={C.purple} />
        <KpiCard label="連続記録" value={`${streakInfo?.currentStreak ?? 0} 日`} bg={C.purpleLight} accent={C.purple} />
      </View>

      {/* 体重推移グラフ */}
      <Text style={styles.sectionHead}>体重推移（週平均）</Text>
      {hasChart ? (
        <View style={styles.chartBox}>
          <LineChart
            data={{
              labels: chartData.map((w) => `第${w.week}週`),
              datasets: [
                { data: chartData.map((w) => w.avgWeight!), color: () => C.green, strokeWidth: 2 },
                { data: chartData.map(() => goals?.targetWeight ?? 65), color: () => "#E74C3C", strokeWidth: 1.5 },
              ],
              legend: ["実績", "目標"],
            }}
            width={W - 32}
            height={200}
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(26,122,74,${opacity})`,
              labelColor: () => C.sub,
              propsForDots: { r: "4", strokeWidth: "2", stroke: C.green },
            }}
            bezier
            style={{ borderRadius: 10 }}
            fromZero={false}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>体重データが2件以上になるとグラフが表示されます</Text>
        </View>
      )}

      {/* 週次サマリーリスト */}
      <Text style={styles.sectionHead}>週別サマリー（全13週）</Text>
      {weekStats.map((w, i) => (
        <View key={w.week} style={[styles.weekRow, i % 2 === 1 ? { backgroundColor: "#F8FAF9" } : {}]}>
          <Text style={styles.weekLabel}>第{w.week}週</Text>
          <Text style={styles.weekSub}>{w.startDate.slice(5)} 〜 {w.endDate.slice(5)}</Text>
          <View style={styles.weekVals}>
            <Text style={[styles.weekVal, { color: C.blue }]}>{w.avgWeight ? `${fmtNum(w.avgWeight)} kg` : "--"}</Text>
            <Text style={[styles.weekVal, { color: C.green }]}>{w.totalExerciseMin} 分</Text>
            <Text style={[styles.weekVal, { color: C.orange }]}>{w.totalCal.toLocaleString()} kcal</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16, paddingBottom: 40 },
  // bannerWrapper: 緑バナー全体（banner + BMIチップ）を包むコンテナ
  bannerWrapper: {
    backgroundColor: C.green, borderRadius: 14, padding: 18, marginBottom: 20,
  },
  // banner: バナー内の3統計を横並びにする内部レイアウト
  banner: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  bannerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
  bannerValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  sectionHead: { fontSize: 14, fontWeight: "700", color: C.text, marginBottom: 10, marginTop: 4 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  kpi: {
    width: (W - 42) / 2, borderRadius: 12, padding: 14, borderLeftWidth: 4,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  kpiLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  kpiValue: { fontSize: 20, fontWeight: "700" },
  chartBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 10, marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  noData: {
    backgroundColor: "#fff", borderRadius: 14, padding: 30, marginBottom: 20,
    alignItems: "center",
  },
  noDataText: { color: C.sub, fontSize: 13, textAlign: "center" },
  weekRow: {
    backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8,
    flexDirection: "row", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  weekLabel: { width: 42, fontSize: 13, fontWeight: "700", color: C.text },
  weekSub: { flex: 1, fontSize: 11, color: C.sub },
  weekVals: { flexDirection: "row", gap: 8 },
  weekVal: { fontSize: 12, fontWeight: "600", minWidth: 52, textAlign: "right" },
});
