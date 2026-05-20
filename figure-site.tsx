import { useState, useMemo } from "react";

const SAMPLE = [
  { id: 1, name: "レム", series: "Re:ゼロから始める異世界生活", maker: "グッドスマイルカンパニー", category: "アニメ・漫画", price: 17800, shop: "あみあみ", status: "持ってる", image: "" },
  { id: 2, name: "フィリス", series: "アトリエシリーズ", maker: "コトブキヤ", category: "ゲーム", price: 14500, shop: "ホビーサーチ", status: "欲しい", image: "" },
  { id: 3, name: "ゼルダ", series: "ゼルダの伝説", maker: "ファーストフォース", category: "ゲーム", price: 22000, shop: "Amazon", status: "持ってる", image: "" },
  { id: 4, name: "ナミ", series: "ワンピース", maker: "バンプレスト", category: "アニメ・漫画", price: 3200, shop: "コンビニ", status: "欲しい", image: "" },
];

const CATEGORIES = ["すべて", "アニメ・漫画", "ゲーム"];
const STATUSES = ["すべて", "持ってる", "欲しい"];

const initForm = { name: "", series: "", maker: "", category: "アニメ・漫画", price: "", shop: "", status: "欲しい", image: "" };

function Avatar({ name }) {
  const ch = name ? name[0] : "?";
  const colors = ["#EEEDFE","#E1F5EE","#FAECE7","#E6F1FB","#FAEEDA"];
  const texts = ["#3C3489","#085041","#712B13","#0C447C","#633806"];
  const i = name.charCodeAt(0) % 5;
  return (
    <div style={{ width: 56, height: 56, borderRadius: 10, background: colors[i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 500, color: texts[i], flexShrink: 0 }}>
      {ch}
    </div>
  );
}

function Badge({ label }) {
  const style = label === "持ってる"
    ? { background: "#EAF3DE", color: "#27500A" }
    : { background: "#EEEDFE", color: "#3C3489" };
  return <span style={{ ...style, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>{label}</span>;
}

function CatBadge({ label }) {
  const style = label === "ゲーム"
    ? { background: "#E6F1FB", color: "#0C447C" }
    : { background: "#FAECE7", color: "#712B13" };
  return <span style={{ ...style, fontSize: 11, padding: "2px 8px", borderRadius: 20 }}>{label}</span>;
}

export default function App() {
  const [figures, setFigures] = useState(SAMPLE);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("すべて");
  const [statusFilter, setStatusFilter] = useState("すべて");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(initForm);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [nextId, setNextId] = useState(10);

  const filtered = useMemo(() => figures.filter(f => {
    const q = search.toLowerCase();
    const matchQ = !q || f.name.toLowerCase().includes(q) || f.series.toLowerCase().includes(q) || f.maker.toLowerCase().includes(q);
    const matchC = catFilter === "すべて" || f.category === catFilter;
    const matchS = statusFilter === "すべて" || f.status === statusFilter;
    return matchQ && matchC && matchS;
  }), [figures, search, catFilter, statusFilter]);

  const owned = figures.filter(f => f.status === "持ってる").length;
  const wanted = figures.filter(f => f.status === "欲しい").length;

  function openAdd() { setForm(initForm); setEditId(null); setModal("form"); }
  function openEdit(f) { setForm({ ...f, price: String(f.price) }); setEditId(f.id); setModal("form"); }
  function saveForm() {
    if (!form.name.trim()) return;
    const entry = { ...form, price: Number(form.price) || 0 };
    if (editId) {
      setFigures(figures.map(f => f.id === editId ? { ...entry, id: editId } : f));
    } else {
      setFigures([...figures, { ...entry, id: nextId }]);
      setNextId(nextId + 1);
    }
    setModal(null);
  }
  function deleteFig(id) { setFigures(figures.filter(f => f.id !== id)); setDetail(null); }

  const inp = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem 3rem", fontFamily: "var(--font-sans)", color: "var(--color-text-primary)" }}>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 0.25rem" }}>フィギュアコレクション</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 1.25rem" }}>
        計 {figures.length} 体 ・ 持ってる {owned} ・ 欲しい {wanted}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 180px" }}>
          <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "var(--color-text-tertiary)", pointerEvents: "none" }} aria-hidden="true" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="名前・シリーズ・メーカー" style={{ width: "100%", paddingLeft: 32, boxSizing: "border-box" }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ flex: "0 0 auto" }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ flex: "0 0 auto" }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={openAdd} style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 4 }}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" /> 追加
        </button>
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--color-text-secondary)", marginTop: "2rem" }}>フィギュアが見つかりません</p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map(f => (
          <div key={f.id} onClick={() => setDetail(f)} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "0.875rem 1rem", display: "flex", gap: 12, alignItems: "center", cursor: "pointer", transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-secondary)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border-tertiary)"}
          >
            {f.image ? <img src={f.image} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: "cover" }} /> : <Avatar name={f.name} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 500, fontSize: 15 }}>{f.name}</span>
                <Badge label={f.status} />
                <CatBadge label={f.category} />
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.series} / {f.maker}</p>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", flexShrink: 0 }}>¥{f.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", width: "min(90vw, 400px)", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {detail.image ? <img src={detail.image} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover" }} /> : <Avatar name={detail.name} />}
              <div>
                <p style={{ fontWeight: 500, fontSize: 17, margin: 0 }}>{detail.name}</p>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 6px" }}>{detail.series}</p>
                <div style={{ display: "flex", gap: 4 }}>
                  <Badge label={detail.status} />
                  <CatBadge label={detail.category} />
                </div>
              </div>
            </div>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              {[["メーカー", detail.maker], ["価格", `¥${detail.price.toLocaleString()}`], ["購入先", detail.shop || "—"]].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ color: "var(--color-text-secondary)", padding: "5px 0", width: "40%" }}>{k}</td>
                  <td style={{ fontWeight: 500 }}>{v}</td>
                </tr>
              ))}
            </table>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => { setDetail(null); openEdit(detail); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <i className="ti ti-edit" style={{ fontSize: 14 }} aria-hidden="true" /> 編集
              </button>
              <button onClick={() => { if (window.confirm("削除しますか？")) deleteFig(detail.id); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: "var(--color-text-danger)", borderColor: "var(--color-border-danger)" }}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} aria-hidden="true" /> 削除
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "form" && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", width: "min(90vw, 440px)", maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 1rem", fontWeight: 500, fontSize: 16 }}>{editId ? "フィギュアを編集" : "フィギュアを追加"}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {[["名前", "name", "text"], ["シリーズ", "series", "text"], ["メーカー", "maker", "text"], ["価格（円）", "price", "number"], ["購入先", "shop", "text"], ["画像URL", "image", "url"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => inp(key, e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>カテゴリ</label>
                  <select value={form.category} onChange={e => inp("category", e.target.value)} style={{ width: "100%" }}>
                    <option>アニメ・漫画</option>
                    <option>ゲーム</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 3 }}>状態</label>
                  <select value={form.status} onChange={e => inp("status", e.target.value)} style={{ width: "100%" }}>
                    <option>欲しい</option>
                    <option>持ってる</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1 }}>キャンセル</button>
              <button onClick={saveForm} style={{ flex: 1, fontWeight: 500 }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
