import { useEffect, useState } from "react";
import {
  View, Text, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { calcBMI, getBMICategory, loadGoals, loadRecord, saveRecord } from "../store";
import { DailyRecord, Goals } from "../types";

const C = {
  green: "#1A7A4A", greenLight: "#D5F5E3",
  blue: "#1A5276", blueLight: "#D6EAF8",
  orange: "#BA4A00",
  purple: "#6C3483", purpleLight: "#E8DAEF",
  gray: "#F2F3F4", border: "#DDDDDD", text: "#222",
  error: "#C0392B", errorLight: "#FDEDEC",
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDate(s: string) {
  const d = new Date(s + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`;
}

// バリデーションルール
interface ValidationResult {
  valid: boolean;
  message?: string;
}

function validateWeight(val: string): ValidationResult {
  if (!val) return { valid: true };
  const n = Number(val);
  if (isNaN(n)) return { valid: false, message: "数値を入力してください" };
  if (n <= 0) return { valid: false, message: "体重は0より大きい値を入力してください" };
  if (n > 999) return { valid: false, message: "体重は999kg以下を入力してください" };
  return { valid: true };
}

function validateExerciseMin(val: string): ValidationResult {
  if (!val) return { valid: true };
  const n = Number(val);
  if (isNaN(n) || !Number.isInteger(n)) return { valid: false, message: "整数を入力してください" };
  if (n < 0) return { valid: false, message: "0以上の値を入力してください" };
  if (n > 1440) return { valid: false, message: "1日の上限は1440分です" };
  return { valid: true };
}

function validateExerciseCal(val: string): ValidationResult {
  if (!val) return { valid: true };
  const n = Number(val);
  if (isNaN(n) || !Number.isInteger(n)) return { valid: false, message: "整数を入力してください" };
  if (n < 0) return { valid: false, message: "0以上の値を入力してください" };
  if (n > 99999) return { valid: false, message: "99999kcal以下を入力してください" };
  return { valid: true };
}

function validateTime(val: string): ValidationResult {
  if (!val) return { valid: true };
  const matched = /^(\d{1,2}):(\d{2})$/.exec(val);
  if (!matched) return { valid: false, message: "HH:MM形式で入力してください（例: 23:00）" };
  const h = Number(matched[1]);
  const m = Number(matched[2]);
  if (h < 0 || h > 23) return { valid: false, message: "時は0〜23で入力してください" };
  if (m < 0 || m > 59) return { valid: false, message: "分は0〜59で入力してください" };
  return { valid: true };
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "numeric" | "default";
  placeholder?: string;
  unit?: string;
  accent?: string;
  error?: string;
}

function Field({ label, value, onChangeText, keyboardType = "default", placeholder, unit, accent = C.blue, error }: FieldProps) {
  const hasError = !!error;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: hasError ? C.error : accent }]}>{label}</Text>
      <View style={[styles.fieldRow, { borderColor: hasError ? C.error : accent }]}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#AAA"
          returnKeyType="done"
        />
        {unit && <Text style={[styles.fieldUnit, { color: hasError ? C.error : accent }]}>{unit}</Text>}
      </View>
      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { borderLeftColor: color }]}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function DailyScreen() {
  const [date, setDate] = useState(toDateStr(new Date()));
  const [rec, setRec] = useState<DailyRecord>({ date });
  const [goals, setGoals] = useState<Goals | null>(null);
  // 入力値（文字列として管理）
  const [weightStr, setWeightStr] = useState("");
  const [exerciseMinStr, setExerciseMinStr] = useState("");
  const [exerciseCalStr, setExerciseCalStr] = useState("");

  useEffect(() => {
    loadGoals().then(setGoals);
  }, []);

  useEffect(() => {
    loadRecord(date).then((r) => {
      const loaded: DailyRecord = r ?? { date };
      setRec(loaded);
      setWeightStr(loaded.weight != null ? String(loaded.weight) : "");
      setExerciseMinStr(loaded.exerciseMin != null ? String(loaded.exerciseMin) : "");
      setExerciseCalStr(loaded.exerciseCal != null ? String(loaded.exerciseCal) : "");
    });
  }, [date]);

  const set = (key: keyof DailyRecord) => (val: string) =>
    setRec((r) => ({ ...r, [key]: val }));

  function handleWeightChange(val: string) {
    setWeightStr(val);
    setRec((r) => ({ ...r, weight: val ? Number(val) : undefined }));
  }

  function handleExerciseMinChange(val: string) {
    setExerciseMinStr(val);
    setRec((r) => ({ ...r, exerciseMin: val ? Number(val) : undefined }));
  }

  function handleExerciseCalChange(val: string) {
    setExerciseCalStr(val);
    setRec((r) => ({ ...r, exerciseCal: val ? Number(val) : undefined }));
  }

  function calcSleep(bed: string, wake: string): number | undefined {
    if (!bed || !wake) return undefined;
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    if (isNaN(bh) || isNaN(wh)) return undefined;
    let diff = (wh * 60 + wm) - (bh * 60 + bm);
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  }

  function handleBedtime(v: string) {
    const sleep = calcSleep(v, rec.wakeup ?? "");
    setRec((r) => ({ ...r, bedtime: v, sleepHours: sleep }));
  }

  function handleWakeup(v: string) {
    const sleep = calcSleep(rec.bedtime ?? "", v);
    setRec((r) => ({ ...r, wakeup: v, sleepHours: sleep }));
  }

  // バリデーション状態
  const weightValidation = validateWeight(weightStr);
  const exerciseMinValidation = validateExerciseMin(exerciseMinStr);
  const exerciseCalValidation = validateExerciseCal(exerciseCalStr);
  const bedtimeValidation = validateTime(rec.bedtime ?? "");
  const wakeupValidation = validateTime(rec.wakeup ?? "");

  const hasValidationError =
    !weightValidation.valid ||
    !exerciseMinValidation.valid ||
    !exerciseCalValidation.valid ||
    !bedtimeValidation.valid ||
    !wakeupValidation.valid;

  async function handleSave() {
    if (hasValidationError) {
      Alert.alert(
        "入力エラー",
        "入力内容に誤りがあります。赤く表示されているフィールドを確認してください。",
        [{ text: "OK" }]
      );
      return;
    }

    const toSave: DailyRecord = {
      ...rec,
      weight: weightStr ? Number(weightStr) : undefined,
      exerciseMin: exerciseMinStr ? Number(exerciseMinStr) : undefined,
      exerciseCal: exerciseCalStr ? Number(exerciseCalStr) : undefined,
    };
    await saveRecord(toSave);
    Alert.alert("保存しました", fmtDate(date) + " の記録を保存しました");
  }

  function changeDate(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(toDateStr(d));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* 日付選択 */}
      <View style={styles.datePicker}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
          <Ionicons name="chevron-back" size={22} color={C.green} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.dateText}>{fmtDate(date)}</Text>
          <TouchableOpacity onPress={() => setDate(toDateStr(new Date()))} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>今日</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateBtn}>
          <Ionicons name="chevron-forward" size={22} color={C.green} />
        </TouchableOpacity>
      </View>

      {/* 体重 */}
      <Section title="体重" color={C.green}>
        <Field
          label="体重"
          value={weightStr}
          onChangeText={handleWeightChange}
          keyboardType="numeric"
          unit="kg"
          placeholder="0.0"
          accent={C.green}
          error={weightValidation.message}
        />
        {weightStr && !weightValidation.message && goals?.heightCm > 0 && (() => {
          const bmi = calcBMI(Number(weightStr), goals!.heightCm);
          const cat = getBMICategory(bmi);
          return (
            <View style={styles.bmiChip}>
              <Text style={styles.bmiChipLabel}>BMI</Text>
              <Text style={styles.bmiChipValue}>{bmi}  <Text style={styles.bmiChipCat}>{cat}</Text></Text>
            </View>
          );
        })()}
      </Section>

      {/* 食事 */}
      <Section title="食事" color={C.orange}>
        <Field label="朝食" value={rec.breakfast ?? ""} onChangeText={set("breakfast")} placeholder="例: ご飯、味噌汁、卵" accent={C.orange} />
        <Field label="昼食" value={rec.lunch ?? ""} onChangeText={set("lunch")} placeholder="例: 定食" accent={C.orange} />
        <Field label="夕食" value={rec.dinner ?? ""} onChangeText={set("dinner")} placeholder="例: サラダ、鶏肉" accent={C.orange} />
        <Field label="間食" value={rec.snack ?? ""} onChangeText={set("snack")} placeholder="例: ヨーグルト" accent={C.orange} />
      </Section>

      {/* 運動 */}
      <Section title="運動" color={C.green}>
        <Field label="運動種類" value={rec.exerciseType ?? ""} onChangeText={set("exerciseType")} placeholder="例: ウォーキング" accent={C.green} />
        <Field
          label="運動時間"
          value={exerciseMinStr}
          onChangeText={handleExerciseMinChange}
          keyboardType="numeric"
          unit="分"
          placeholder="0"
          accent={C.green}
          error={exerciseMinValidation.message}
        />
        <Field
          label="消費カロリー"
          value={exerciseCalStr}
          onChangeText={handleExerciseCalChange}
          keyboardType="numeric"
          unit="kcal"
          placeholder="0"
          accent={C.green}
          error={exerciseCalValidation.message}
        />
      </Section>

      {/* 睡眠 */}
      <Section title="睡眠" color={C.blue}>
        <Field
          label="就寝時刻"
          value={rec.bedtime ?? ""}
          onChangeText={handleBedtime}
          placeholder="23:00"
          accent={C.blue}
          error={bedtimeValidation.message}
        />
        <Field
          label="起床時刻"
          value={rec.wakeup ?? ""}
          onChangeText={handleWakeup}
          placeholder="07:00"
          accent={C.blue}
          error={wakeupValidation.message}
        />
        <View style={styles.sleepResult}>
          <Text style={styles.sleepLabel}>睡眠時間</Text>
          <Text style={[styles.sleepValue, { color: C.blue }]}>
            {rec.sleepHours != null ? `${rec.sleepHours} 時間` : "—"}
          </Text>
        </View>
      </Section>

      {/* メモ */}
      <Section title="メモ" color={C.purple}>
        <TextInput
          style={styles.memo}
          value={rec.memo ?? ""}
          onChangeText={set("memo")}
          multiline
          placeholder="体調・気づきなど"
          placeholderTextColor="#AAA"
        />
      </Section>

      <TouchableOpacity
        style={[styles.saveBtn, hasValidationError && styles.saveBtnDisabled]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>記録を保存</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { padding: 16, paddingBottom: 40 },
  datePicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  dateBtn: { padding: 8 },
  dateText: { fontSize: 16, fontWeight: "600", color: C.text },
  todayBtn: { backgroundColor: C.greenLight, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
  todayBtnText: { color: C.green, fontSize: 11, fontWeight: "600" },
  section: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    marginBottom: 14, borderLeftWidth: 4,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  field: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  fieldRow: {
    flexDirection: "row", alignItems: "center", borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, backgroundColor: "#FAFAFA",
  },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 8, color: C.text },
  fieldUnit: { fontSize: 13, marginLeft: 4 },
  errorText: {
    color: C.error, fontSize: 11, marginTop: 3, paddingLeft: 2,
  },
  sleepResult: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", backgroundColor: C.blueLight,
    borderRadius: 8, padding: 12, marginTop: 4,
  },
  sleepLabel: { fontSize: 13, color: C.blue },
  sleepValue: { fontSize: 18, fontWeight: "700" },
  memo: {
    borderWidth: 1, borderColor: C.purple, borderRadius: 8,
    padding: 10, minHeight: 80, fontSize: 14,
    backgroundColor: "#FAFAFA", color: C.text, textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: C.green, borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 8,
  },
  saveBtnDisabled: {
    backgroundColor: "#A9C4B5",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bmiChip: { backgroundColor: C.blueLight, borderRadius: 8, padding: 10, marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bmiChipLabel: { color: C.blue, fontSize: 12 },
  bmiChipValue: { color: C.blue, fontSize: 14, fontWeight: "700" },
  bmiChipCat: { fontSize: 12, fontWeight: "400" },
});
