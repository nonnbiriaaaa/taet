import { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { calcBMI, getBMICategory, loadGoals, saveGoals } from "../store";
import { BMICategory, Goals } from "../types";

const C = {
  green: "#1A7A4A", greenLight: "#D5F5E3",
  blue: "#1A5276", blueLight: "#D6EAF8",
  orange: "#BA4A00", orangeLight: "#FDEBD0",
  gray: "#F2F3F4", border: "#DDDDDD", text: "#222",
};

interface RowProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  keyboardType?: "numeric" | "default";
  color?: string;
}

function Row({ label, value, onChangeText, unit, keyboardType = "default", color = C.blue }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.rowInput, { borderColor: color }]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          returnKeyType="done"
        />
        {unit && <Text style={[styles.unit, { color }]}>{unit}</Text>}
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goals | null>(null);

  useEffect(() => {
    loadGoals().then(setGoals);
  }, []);

  if (!goals) return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={C.green} />
      <Text style={styles.loadingText}>読み込み中...</Text>
    </View>
  );

  const set = (key: keyof Goals) => (val: string) =>
    setGoals((g) => g ? { ...g, [key]: key === "startDate" || key === "targetDate" ? val : Number(val) } : g);

  async function handleSave() {
    if (!goals) return;
    await saveGoals(goals);
    Alert.alert("保存しました", "目標設定を更新しました");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.section, { borderLeftColor: C.blue }]}>
        <Text style={[styles.sectionTitle, { color: C.blue }]}>体重目標</Text>
        <Row label="現在体重" value={String(goals.currentWeight || "")} onChangeText={set("currentWeight")} unit="kg" keyboardType="numeric" color={C.orange} />
        <Row label="身長" value={String(goals.heightCm || "")} onChangeText={set("heightCm")} unit="cm" keyboardType="numeric" color={C.blue} />
        <Row label="目標体重" value={String(goals.targetWeight)} onChangeText={set("targetWeight")} unit="kg" keyboardType="numeric" color={C.green} />
        {goals.heightCm > 0 && goals.currentWeight > 0 && (() => {
          const bmi = calcBMI(goals.currentWeight, goals.heightCm);
          const cat: BMICategory = getBMICategory(bmi);
          const catColor = cat === "普通体重" ? C.green : C.orange;
          return (
            <View style={styles.bmiPreview}>
              <Text style={styles.bmiLabel}>現在のBMI</Text>
              <Text style={[styles.bmiValue, { color: catColor }]}>
                {bmi}  <Text style={styles.bmiCat}>{cat}</Text>
              </Text>
            </View>
          );
        })()}
      </View>

      <View style={[styles.section, { borderLeftColor: C.green }]}>
        <Text style={[styles.sectionTitle, { color: C.green }]}>期間設定</Text>
        <Row label="開始日" value={goals.startDate} onChangeText={(v) => setGoals((g) => g ? { ...g, startDate: v } : g)} color={C.green} />
        <Row label="目標達成日" value={goals.targetDate} onChangeText={(v) => setGoals((g) => g ? { ...g, targetDate: v } : g)} color={C.green} />
      </View>

      <View style={[styles.section, { borderLeftColor: C.orange }]}>
        <Text style={[styles.sectionTitle, { color: C.orange }]}>1日の目標</Text>
        <Row label="目標カロリー" value={String(goals.dailyCalGoal)} onChangeText={set("dailyCalGoal")} unit="kcal" keyboardType="numeric" color={C.orange} />
        <Row label="目標歩数" value={String(goals.dailyStepGoal)} onChangeText={set("dailyStepGoal")} unit="歩" keyboardType="numeric" color={C.orange} />
        <Row label="目標睡眠時間" value={String(goals.sleepGoalHours)} onChangeText={set("sleepGoalHours")} unit="時間" keyboardType="numeric" color={C.orange} />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>保存する</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16, paddingBottom: 40 },
  section: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    marginBottom: 16, borderLeftWidth: 4,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  rowLabel: { flex: 1, fontSize: 14, color: C.text },
  rowInput: {
    flex: 1, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10,
    backgroundColor: "#FAFAFA",
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 8, color: C.text },
  unit: { fontSize: 13, marginLeft: 4 },
  saveBtn: {
    backgroundColor: C.green, borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bmiPreview: { backgroundColor: "#D6EAF8", borderRadius: 8, padding: 12, marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bmiLabel: { fontSize: 13, color: "#1A5276" },
  bmiValue: { fontSize: 20, fontWeight: "700" },
  bmiCat: { fontSize: 13, fontWeight: "400" },
  loadingContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: "#F8F9FA", gap: 12,
  },
  loadingText: { color: C.green, fontSize: 14, fontWeight: "600" },
});
