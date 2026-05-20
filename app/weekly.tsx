import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { BarChart, LineChart } from "react-native-chart-kit";
import { loadAllRecords, loadGoals, calcWeeklyStats, calcAchievementRate } from "../store";
import { Goals, WeeklyStats } from "../types";

const C = {
  green: "#1A7A4A", greenLight: "#D5F5E3",
  blue: "#1A5276", blueLight: "#D6EAF8",
  orange: "#BA4A00", orangeLight: "#FDEBD0",
  purple: "#6C3483", purpleLight: "#E8DAEF",
  text: "#222", sub: "#666",
};

const W = Dimensions.get("window").width;

function StatCell({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[styles.statCell, { backgroundColor: bg }]}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function WeeklyScreen() {
  const [stats, setStats] = useState<WeeklyStats[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [g, records] = await Promise.all([loadGoals(), loadAllRecords()]);
        setGoals(g);
        setStats(calcWeeklyStats(records, g.startDate));
      })();
    }, [])
  );

  function fmtNum(n?: number, dec = 1) {
    return n != null ? n.toFixed(dec) : "--";
  }

  const totalExercise = stats.reduce((s, w) => s + w.totalExerciseMin, 0);
  const totalCal = stats.reduce((s, w) => s + w.totalCal, 0);
  const avgWeights = stats.map((w) => w.avgWeight).filter((w): w is number => w != null);
  const avgSleeps = stats.map((w) => w.avgSleep).filter((s): s is number => s != null);
  const overallAvgWeight = avgWeights.length
    ? Math.round((avgWeights.reduce((a, b) => a + b, 0) / avgWeights.length) * 10) / 10
    : undefined;
  const overallAvgSleep = avgSleeps.length
    ? Math.round((avgSleeps.reduce((a, b) => a + b, 0) / avgSleeps.length) * 10) / 10
    : undefined;

  const chartStats = stats.filter((w) => w.totalExerciseMin > 0).slice(0, 10);
  const hasChart = chartStats.length >= 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 3ヶ月合計 */}
      <Text style={styles.sectionHead}>3ヶ月 合計 / 平均</Text>
      <View style={styles.totalGrid}>
        <StatCell label="合計運動時間" value={`${totalExercise} 分`} color={C.green} bg={C.greenLight} />
        <StatCell label="合計消費Cal" value={`${totalCal.toLocaleString()} kcal`} color={C.orange} bg={C.orangeLight} />
        <StatCell label="平均体重" value={overallAvgWeight ? `${fmtNum(overallAvgWeight)} kg` : "--"} color={C.blue} bg={C.blueLight} />
        <StatCell label="平均睡眠" value={overallAvgSleep ? `${fmtNum(overallAvgSleep)} 時間` : "--"} color={C.purple} bg={C.purpleLight} />
      </View>

      {/* 目標達成率グラフ */}
      {goals && (() => {
        const rateData = stats.map(w => calcAchievementRate(w, goals));
        const hasAny = rateData.some(r => r > 0);
        if (!hasAny) return null;
        return (
          <>
            <Text style={styles.sectionHead}>週ごとの目標達成率（%）</Text>
            <View style={styles.chartBox}>
              <BarChart
                data={{
                  labels: stats.map(w => `W${w.week}`),
                  datasets: [{ data: rateData }],
                }}
                width={W - 32}
                height={180}
                yAxisLabel=""
                yAxisSuffix="%"
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(46,204,113,${opacity})`,
                  labelColor: () => "#666",
                  barPercentage: 0.7,
                  withInnerLines: false,
                }}
                style={{ borderRadius: 10 }}
                showValuesOnTopOfBars
              />
            </View>
          </>
        );
      })()}

      {/* 運動時間棒グラフ */}
      <Text style={styles.sectionHead}>週ごとの運動時間（分）</Text>
      {hasChart ? (
        <View style={styles.chartBox}>
          <BarChart
            data={{
              labels: chartStats.map((w) => `W${w.week}`),
              datasets: [{ data: chartStats.map((w) => w.totalExerciseMin) }],
            }}
            width={W - 32}
            height={180}
            yAxisLabel=""
            yAxisSuffix="分"
            chartConfig={{
              backgroundColor: "#fff",
              backgroundGradientFrom: "#fff",
              backgroundGradientTo: "#fff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(46,204,113,${opacity})`,
              labelColor: () => C.sub,
              barPercentage: 0.7,
            }}
            style={{ borderRadius: 10 }}
            showValuesOnTopOfBars
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>運動記録がある週が表示されます</Text>
        </View>
      )}

      {/* 睡眠折れ線グラフ */}
      {(() => {
        const sleepStats = stats.filter(w => w.avgSleep != null);
        if (sleepStats.length < 2) return null;
        return (
          <>
            <Text style={styles.sectionHead}>週ごとの平均睡眠（時間）</Text>
            <View style={styles.chartBox}>
              <LineChart
                data={{
                  labels: sleepStats.map(w => `W${w.week}`),
                  datasets: [
                    { data: sleepStats.map(w => w.avgSleep!), color: () => "#6C3483", strokeWidth: 2 },
                    { data: sleepStats.map(() => goals?.sleepGoalHours ?? 7.5), color: () => "#E74C3C", strokeWidth: 1.5 },
                  ],
                  legend: ["実績", "目標"],
                }}
                width={W - 32}
                height={180}
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(108,52,131,${opacity})`,
                  labelColor: () => "#666",
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#6C3483" },
                }}
                bezier
                style={{ borderRadius: 10 }}
              />
            </View>
          </>
        );
      })()}

      {/* カロリー消費棒グラフ */}
      {(() => {
        const calStats = stats.filter(w => w.totalCal > 0);
        if (calStats.length < 1) return null;
        return (
          <>
            <Text style={styles.sectionHead}>週ごとの消費カロリー（kcal）</Text>
            <View style={styles.chartBox}>
              <BarChart
                data={{
                  labels: calStats.map(w => `W${w.week}`),
                  datasets: [{ data: calStats.map(w => w.totalCal) }],
                }}
                width={W - 32}
                height={180}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(186,74,0,${opacity})`,
                  labelColor: () => "#666",
                  barPercentage: 0.7,
                  withInnerLines: false,
                }}
                style={{ borderRadius: 10 }}
                showValuesOnTopOfBars
              />
            </View>
          </>
        );
      })()}

      {/* 週次テーブル */}
      <Text style={styles.sectionHead}>週次詳細（全13週）</Text>
      <View style={styles.tableHeader}>
        {["週", "体重(kg)", "運動(分)", "Cal(kcal)", "睡眠(h)"].map((h) => (
          <Text key={h} style={styles.tableHead}>{h}</Text>
        ))}
      </View>
      {stats.map((w, i) => (
        <View key={w.week} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
          <Text style={[styles.tableCell, styles.tableCellBold]}>第{w.week}週</Text>
          <Text style={[styles.tableCell, { color: C.blue }]}>{fmtNum(w.avgWeight)}</Text>
          <Text style={[styles.tableCell, { color: C.green }]}>{w.totalExerciseMin}</Text>
          <Text style={[styles.tableCell, { color: C.orange }]}>{w.totalCal.toLocaleString()}</Text>
          <Text style={[styles.tableCell, { color: C.purple }]}>{fmtNum(w.avgSleep)}</Text>
        </View>
      ))}

      {/* 目標との比較 */}
      {goals && (
        <>
          <Text style={[styles.sectionHead, { marginTop: 20 }]}>目標との比較</Text>
          <View style={styles.goalCompare}>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>目標体重</Text>
              <Text style={[styles.goalTarget, { color: C.green }]}>{goals.targetWeight} kg</Text>
              <Text style={styles.goalArrow}>→</Text>
              <Text style={[styles.goalCurrent, { color: C.blue }]}>
                {overallAvgWeight ? `${fmtNum(overallAvgWeight)} kg` : "未記録"}
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>目標睡眠</Text>
              <Text style={[styles.goalTarget, { color: C.green }]}>{goals.sleepGoalHours} h</Text>
              <Text style={styles.goalArrow}>→</Text>
              <Text style={[styles.goalCurrent, { color: C.blue }]}>
                {overallAvgSleep ? `${fmtNum(overallAvgSleep)} h` : "未記録"}
              </Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16, paddingBottom: 40 },
  sectionHead: { fontSize: 14, fontWeight: "700", color: "#222", marginBottom: 10, borderLeftWidth: 3, borderLeftColor: "#1A7A4A", paddingLeft: 8 },
  totalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  statCell: {
    width: (W - 42) / 2, borderRadius: 12, padding: 14,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  statLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: "700" },
  chartBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 10, marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  noData: {
    backgroundColor: "#fff", borderRadius: 14, padding: 24, marginBottom: 20,
    alignItems: "center",
  },
  noDataText: { color: C.sub, fontSize: 13 },
  tableHeader: {
    flexDirection: "row", backgroundColor: C.green, borderRadius: 8,
    padding: 8, marginBottom: 2,
  },
  tableHead: { flex: 1, color: "#fff", fontSize: 10, fontWeight: "700", textAlign: "center" },
  tableRow: {
    flexDirection: "row", backgroundColor: "#fff", padding: 8,
    borderRadius: 6, marginBottom: 2,
  },
  tableRowAlt: { backgroundColor: "#F2F3F4" },
  tableCell: { flex: 1, fontSize: 11, textAlign: "center", color: "#222" },
  tableCellBold: { fontWeight: "700" },
  goalCompare: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, elevation: 1,
  },
  goalRow: {
    flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8,
  },
  goalLabel: { flex: 1, fontSize: 14, color: "#222" },
  goalTarget: { fontSize: 16, fontWeight: "700" },
  goalArrow: { fontSize: 16, color: C.sub },
  goalCurrent: { fontSize: 16, fontWeight: "700" },
});
