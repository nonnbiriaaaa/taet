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
  error: "#C0392B", errorLight: "#FDECEA",
};

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtDate(s: string) {
  const d = new Date(s + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`;
}

interface ValidationErrors {
  weight?: string;
  exerciseMin?: string;
  exerciseCal?: string;
  bedtime?: string;
  wakeup?: string;
}

function validate(rec: DailyRecord): ValidationErrors {
  const errors: ValidationErrors = {};

  const weightStr = String(rec.weight ?? "").trim();
  if (weightStr !== "") {
    const w = parseFloat(weightStr);
    if (isNaN(w) || w <= 0) {
      errors.weight = "正の数値を入力してください";
    } else if (w < 20 || w > 300) {
      errors.weight = "20〜300kgの範囲で入力してください";
    }
  }

  const exMinStr = String(rec.exerciseMin ?? "").trim();
  if (exMinStr !== "") {
    const m = parseFloat(exMinStr);
    if (isNaN(m) || m < 0) {
      errors.exerciseMin = "0以上の数値を入力してください";
    } else if (m > 1440) {
      errors.exerciseMin = "1440分以下で入力してください";
    }
  }

  const exCalStr = String(rec.exerciseCal ?? "").trim();
  if (exCalStr !== "") {
    const c = parseFloat(exCalStr);
    if (isNaN(c) || c < 0) {
      errors.exerciseCal = "0以上の数値を入力してください";
    } else if (c > 10000) {
      errors.exerciseCal = "10000kcal以下で入力してください";
    }
  }

  const timeRe = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (rec.bedtime && !timeRe.test(rec.bedtime)) {
    errors.bedtime = "HH:MM形式で入力してください（例: 23:00）";
  }
  if (rec.wakeup && !timeRe.test(rec.wakeup)) {
    errors.wakeup = "HH:MM形式で入力してください（例: 07:00）";
  }

  return errors;
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
  const borderColor = error ? C.error : accent;
  const labelColor = error ? C.error : accent;
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: labelColor }]}>{label}</Text>
      <View style={[styles.fieldRow, { borderColor }]}>
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor="#AAA"
          returnKeyType="done"
        />
        {unit && <Text style={[styles.fieldUnit, { color: borderColor }]}>{unit}</Text>}
      </View>
      {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}
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
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    loadGoals().then(setGoals);
  }, []);

  useEffect(() => {
    loadRecord(date).then((r) => setRec(r ?? { date }));
    setErrors({});
  }, [date]);

  const set = (key: keyof DailyRecord) => (val: string) => {
    setRec((r) => ({ ...r, [key]: val }));
    // フィールド変更時に該当エラーをクリア
    if (key in errors) {
      setErrors((e) => { const next = { ...e }; delete (next as any)[key]; return next; });
    }
  };

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
    const timeRe = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const sleep = timeRe.test(v) ? calcSleep(v, rec.wakeup ?? "") : undefined;
    setRec((r) => ({ ...r, bedtime: v, sleepHours: sleep }));
    if (errors.bedtime) setErrors((e) => { const next = { ...e }; delete next.bedtime; return next; });
  }

  function handleWakeup(v: string) {
    const timeRe = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    const sleep = timeRe.test(v) ? calcSleep(rec.bedtime ?? "", v) : undefined;
    setRec((r) => ({ ...r, wakeup: v, sleepHours: sleep }));
    if (errors.wakeup) setErrors((e) => { const next = { ...e }; delete next.wakeup; return next; });
  }

  async function handleSave() {
    const validationErrors = validate(rec);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert("入力エラー", "赤く表示されているフィールドの入力内容を確認してください");
      return;
    }
    setErrors({});
    const toSave: DailyRecord = {
      ...rec,
      weight: rec.weight ? Number(rec.weight) : undefined,
      exerciseMin: rec.exerciseMin ? Number(rec.exerciseMin) : undefined,
      exerciseCal: rec.exerciseCal ? Number(rec.exerciseCal) : undefined,
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
          value={String(rec.weight ?? "")}
          onChangeText={set("weight")}
          keyboardType="numeric"
          unit="kg"
          placeholder="0.0"
          accent={C.green}
          error={errors.weight}
        />
        {rec.weight && goals?.heightCm > 0 && (() => {
          const bmi = calcBMI(Number(rec.weight), goals!.heightCm);
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
          value={String(rec.exerciseMin ?? "")}
          onChangeText={set("exerciseMin")}
          keyboardType="numeric"
          unit="分"
          placeholder="0"
          accent={C.green}
          error={errors.exerciseMin}
        />
        <Field
          label="消費カロリー"
          value={String(rec.exerciseCal ?? "")}
          onChangeText={set("exerciseCal")}
          keyboardType="numeric"
          unit="kcal"
          placeholder="0"
          accent={C.green}
          error={errors.exerciseCal}
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
          error={errors.bedtime}
        />
        <Field
          label="起床時刻"
          value={rec.wakeup ?? ""}
          onChangeText={handleWakeup}
          placeholder="07:00"
          accent={C.blue}
          error={errors.wakeup}
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

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
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
  errorText: { color: C.error, fontSize: 11, marginTop: 3, marginLeft: 2 },
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
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  bmiChip: { backgroundColor: C.blueLight, borderRadius: 8, padding: 10, marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bmiChipLabel: { color: C.blue, fontSize: 12 },
  bmiChipValue: { color: C.blue, fontSize: 14, fontWeight: "700" },
  bmiChipCat: { fontSize: 12, fontWeight: "400" },
});
