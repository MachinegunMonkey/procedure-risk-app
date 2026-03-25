import React, { useMemo, useState } from "react";

const procedures = [
  "skin / dermis procedure",
  "paracentesis",
  "thoracentesis",
  "chest tube placement",
  "venous access catheter",
  "abscess drainage",
  "nephrostomy placement",
  "liver biopsy",
  "renal biopsy",
  "adrenal biopsy",
  "lung biopsy",
];

const initial = {
  procedure: "paracentesis",
  urgency: "urgent",
  targetType: "mass",
  sizeCm: "",
  drainType: "",
  tunneled: "",
  emphysema: "",
  age: "",
  bmi: "",
  albumin: "",
  frailtyOverride: "",
  frailtyIndependence: "0",
  frailtyMobility: "0",
  frailtyFalls: "0",
  frailtyCognition: "0",
  frailtyNutrition: "0",
  frailtyEnergy: "0",
  notes: "",
};

function toNum(v) {
  return v === "" ? null : Number(v);
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function riskBand(score) {
  if (score <= 2) return "low";
  if (score <= 6) return "moderate";
  if (score <= 8) return "high";
  return "very high";
}

function frailtyLabel(score) {
  if (score <= 2) return "low frailty burden";
  if (score <= 4) return "mild frailty burden";
  if (score <= 6) return "moderate frailty burden";
  if (score <= 8) return "high frailty burden";
  return "very high frailty burden";
}

function badgeStyle(band) {
  if (band === "low") return { background: "#dcfce7", color: "#166534" };
  if (band === "moderate") return { background: "#fef3c7", color: "#92400e" };
  if (band === "high") return { background: "#fed7aa", color: "#9a3412" };
  return { background: "#fecaca", color: "#991b1b" };
}

function frailtyHelperScore(f) {
  const raw =
    Number(f.frailtyIndependence || 0) +
    Number(f.frailtyMobility || 0) +
    Number(f.frailtyFalls || 0) +
    Number(f.frailtyCognition || 0) +
    Number(f.frailtyNutrition || 0) +
    Number(f.frailtyEnergy || 0);

  return clamp(Math.round((raw / 20) * 10), 0, 10);
}

function frailtyUsed(f) {
  const override = toNum(f.frailtyOverride);
  if (override !== null) {
    return { score: override, source: "manual override" };
  }
  return { score: frailtyHelperScore(f), source: "frailty helper" };
}

function bleedingScore(f) {
  const p = f.procedure;
  const t = f.targetType;
  const s = toNum(f.sizeCm);
  const dr = f.drainType;
  const tun = f.tunneled;
  const em = f.emphysema;

  let x = 5;
  const why = [];

  if (p === "skin / dermis procedure") {
    x = 1;
    why.push("Skin / dermis only.");
  } else if (p === "paracentesis") {
    x = 2;
    why.push("Paracentesis baseline 2.");
  } else if (p === "thoracentesis") {
    x = 4;
    why.push("Thoracentesis baseline 4.");
  } else if (p === "venous access catheter") {
    x = tun === "yes" ? 3 : 2;
    why.push(tun === "yes" ? "Tunneled venous catheter one level above non-tunneled." : "Non-tunneled venous catheter baseline 2.");
  } else if (p === "chest tube placement") {
    x = tun === "yes" ? 4 : 2;
    why.push(tun === "yes" ? "Tunneled chest tube one level above non-tunneled." : "Non-tunneled chest tube baseline 2.");
  } else if (p === "abscess drainage") {
    if (dr === "liver abscess") {
      x = 6;
      why.push("Liver abscess drainage baseline 6.");
      if (s !== null && s < 2) {
        why.push("Abscess under 2 cm may be less favorable for drainage.");
      }
    } else if (dr === "biliary drainage") {
      x = 6;
      why.push("Biliary drainage baseline 6.");
    } else if (dr === "gallbladder drainage") {
      x = 6;
      why.push("Gallbladder drainage baseline 6.");
    } else {
      x = 5;
      why.push("Other abscess drainage baseline 5.");
    }
  } else if (p === "nephrostomy placement") {
    x = 8;
    why.push("Nephrostomy baseline 8.");
  } else if (p === "liver biopsy") {
    x = 7;
    why.push("Liver biopsy lower than kidney or adrenal.");
  } else if (p === "renal biopsy") {
    if (t === "parenchyma") {
      x = 10;
      why.push("Renal parenchymal biopsy highest bleeding category.");
    } else if (s !== null && s >= 2) {
      x = 7;
      why.push("Renal mass ≥2 cm.");
    } else if (s !== null && s >= 1.2) {
      x = 8;
      why.push("Renal mass between 1.2 and <2 cm.");
    } else {
      x = 9;
      why.push("Small renal mass approaches parenchymal-risk territory.");
    }
  } else if (p === "adrenal biopsy") {
    if (s !== null && s >= 2) {
      x = 7;
      why.push("Adrenal mass ≥2 cm.");
    } else if (s !== null && s >= 1.2) {
      x = 8;
      why.push("Adrenal mass between 1.2 and <2 cm.");
    } else {
      x = 9;
      why.push("Small adrenal mass high bleeding concern.");
    }
  } else if (p === "lung biopsy") {
    x = 8;
    why.push("Lung biopsy baseline 8.");
    if (s !== null && s >= 2) {
      x -= 2;
      why.push("Target ≥2 cm lowers risk.");
    } else if (s !== null && s < 0.8) {
      x += 3;
      why.push("Target <0.8 cm strongly worsens risk-benefit.");
    } else if (s !== null && s < 1) {
      x += 2;
      why.push("Target <1 cm raises risk.");
    } else if (s !== null && s < 2) {
      x += 1;
      why.push("Target <2 cm raises risk.");
    }

    if (em === "mild") {
      x += 1;
      why.push("Mild emphysema in path.");
    } else if (em === "moderate") {
      x += 2;
      why.push("Moderate emphysema in path.");
    } else if (em === "severe") {
      x += 3;
      why.push("Severe emphysema in path.");
    }
  }

  x = clamp(Math.round(x), 1, 10);
  return { score: x, band: riskBand(x), why: why.join(" ") };
}

function complexityScore(f) {
  const p = f.procedure;
  const s = toNum(f.sizeCm);
  const dr = f.drainType;
  const tun = f.tunneled;
  const em = f.emphysema;
  const bmi = toNum(f.bmi);

  let x = 1;
  const why = ["Base complexity set from procedure."];

  if (p === "skin / dermis procedure") x = 1;
  else if (p === "paracentesis") x = 2;
  else if (p === "thoracentesis") x = 3;
  else if (p === "venous access catheter") x = tun === "yes" ? 3 : 2;
  else if (p === "chest tube placement") x = tun === "yes" ? 4 : 3;
  else if (p === "abscess drainage") {
    if (dr === "biliary drainage") x = 7;
    else if (dr === "gallbladder drainage") x = 6;
    else if (dr === "liver abscess") x = 6;
    else x = 5;
  } else if (p === "nephrostomy placement") x = 6;
  else if (p === "liver biopsy") x = 5;
  else if (p === "renal biopsy") x = f.targetType === "parenchyma" ? 9 : 7;
  else if (p === "adrenal biopsy") x = 8;
  else if (p === "lung biopsy") x = 7;

  if (s !== null && s < 0.8 && p !== "abscess drainage" && f.targetType !== "parenchyma") {
    x += 3;
    why.push("Sub-0.8 cm target very difficult.");
  } else if (s !== null && s < 1 && p !== "abscess drainage" && f.targetType !== "parenchyma") {
    x += 2;
    why.push("Sub-1 cm target difficult.");
  } else if (s !== null && s < 2 && p !== "abscess drainage" && f.targetType !== "parenchyma") {
    x += 1;
    why.push("Sub-2 cm target less favorable.");
  }

  if (p === "lung biopsy") {
    if (em === "mild") {
      x += 1;
      why.push("Mild emphysema increases technical difficulty.");
    } else if (em === "moderate") {
      x += 2;
      why.push("Moderate emphysema increases technical difficulty.");
    } else if (em === "severe") {
      x += 3;
      why.push("Severe emphysema increases technical difficulty.");
    }
  }

  if (p === "abscess drainage" && dr === "liver abscess" && s !== null && s < 2) {
    x += 2;
    why.push("Small liver abscess less favorable for successful drainage.");
  }

  if (bmi !== null && bmi >= 40) {
    x += 2;
    why.push("Severe obesity worsens imaging and access.");
  } else if (bmi !== null && bmi >= 30) {
    x += 1;
    why.push("Obesity worsens imaging and access.");
  }

  x = clamp(Math.round(x), 1, 10);
  return { score: x, band: riskBand(x), why: why.join(" ") };
}

function toleranceScore(f, cx) {
  const age = toNum(f.age);
  const frailty = frailtyUsed(f).score;
  const bmi = toNum(f.bmi);
  const albumin = toNum(f.albumin);

  let x = 1;
  const why = ["Base tolerance starts low."];

  if (cx >= 8) {
    x += 2;
    why.push("High complexity adds burden.");
  } else if (cx >= 6) {
    x += 1;
    why.push("Moderate-high complexity adds burden.");
  }

  if (age !== null) {
    if (age >= 95) {
      x += 3;
      why.push("Age 95+.");
    } else if (age >= 90) {
      x += 2;
      why.push("Age 90–94.");
    } else if (age >= 85) {
      x += 1;
      why.push("Age 85–89.");
    } else if (age >= 75) {
      x += 1;
      why.push("Age 75–84.");
    }
  }

  if (frailty >= 8) {
    x += 3;
    why.push("Marked frailty.");
  } else if (frailty >= 5) {
    x += 2;
    why.push("Moderate frailty.");
  } else if (frailty >= 3) {
    x += 1;
    why.push("Mild frailty.");
  }

  if (albumin !== null) {
    if (albumin < 2.5) {
      x += 2;
      why.push("Severe hypoalbuminemia.");
    } else if (albumin < 3.2) {
      x += 1;
      why.push("Low albumin.");
    }
  }

  if (bmi !== null) {
    if (bmi >= 40) {
      x += 2;
      why.push("Severe obesity.");
    } else if (bmi >= 30) {
      x += 1;
      why.push("Obesity.");
    } else if (bmi < 18.5) {
      x += 1;
      why.push("Low body mass.");
    }
  }

  x = clamp(Math.round(x), 1, 10);
  return { score: x, band: riskBand(x), why: why.join(" ") };
}

function cardStyle() {
  return {
    background: "#fff",
    border: "1px solid #dbe1ea",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };
}

function inputStyle() {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 16,
    boxSizing: "border-box",
    background: "#fff",
  };
}

function labelStyle() {
  return {
    display: "block",
    marginBottom: 6,
    fontSize: 14,
    fontWeight: 600,
  };
}

function buttonStyle(primary = false) {
  return {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: primary ? "1px solid #2563eb" : "1px solid #cbd5e1",
    background: primary ? "#2563eb" : "#fff",
    color: primary ? "#fff" : "#0f172a",
    fontWeight: 600,
    fontSize: 15,
    cursor: "pointer",
  };
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={labelStyle()}>{label}</label>
      {children}
    </div>
  );
}

function QuickStat({ title, value, detail }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{value}</div>
      <span style={{ display: "inline-block", marginTop: 6, padding: "4px 10px", borderRadius: 999, ...badgeStyle(detail), fontSize: 12, fontWeight: 700 }}>
        {detail}
      </span>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState(initial);
  const [showDetailed, setShowDetailed] = useState(false);

  const helperScore = useMemo(() => frailtyHelperScore(form), [form]);

  const result = useMemo(() => {
    const frailty = frailtyUsed(form);
    const bleed = bleedingScore(form);
    const complexity = complexityScore(form);
    const tolerance = toleranceScore(form, complexity.score);

    const reasons = [];
    if (bleed.score >= 9) reasons.push("Very high bleeding modifier.");
    else if (bleed.score >= 7) reasons.push("High bleeding modifier.");

    if (complexity.score >= 8) reasons.push("High technical complexity.");

    if (tolerance.score >= 8) reasons.push("Very poor expected procedure tolerance.");
    else if (tolerance.score >= 6) reasons.push("Moderate-high procedure tolerance concern.");

    if (form.procedure === "lung biopsy" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 0.8) {
      reasons.push("Very small target gives poor risk-benefit.");
    }

    if (form.procedure === "abscess drainage" && form.drainType === "liver abscess" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 2) {
      reasons.push("Small liver abscess may be more appropriate for medical therapy first.");
    }

    let title = "Proceed";
    let subtitle = "Risk-benefit appears acceptable as entered.";

    if (form.procedure === "lung biopsy" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 0.8) {
      title = "Avoid / use alternative";
      subtitle = "Very small target gives poor near-term procedural payoff.";
    } else if (bleed.score >= 9 || tolerance.score >= 9) {
      title = "Delay / optimize first";
      subtitle = "Current risk profile is very unfavorable without additional mitigation.";
    } else if (bleed.score >= 7 || tolerance.score >= 7 || complexity.score >= 8) {
      title = "Proceed after optimization";
      subtitle = "Procedure may be reasonable, but optimization should occur first.";
    }

    if (form.urgency === "emergent") {
      title = "Proceed now";
      subtitle = "Emergent benefit may outweigh several elevated risks.";
    }

    return { frailty, bleed, complexity, tolerance, title, subtitle, reasons };
  }, [form]);

  const report = useMemo(() => {
    return [
      `Procedure: ${form.procedure}`,
      `Final recommendation: ${result.title}`,
      `Summary: ${result.subtitle}`,
      `Frailty helper result: ${helperScore}/10 (${frailtyLabel(helperScore)})`,
      `Frailty used in model: ${result.frailty.score}/10 (${result.frailty.source})`,
      `Bleeding modifier: ${result.bleed.score}/10 (${result.bleed.band})`,
      `Bleeding basis: ${result.bleed.why}`,
      `Complexity score: ${result.complexity.score}/10 (${result.complexity.band})`,
      `Complexity basis: ${result.complexity.why}`,
      `Tolerance score: ${result.tolerance.score}/10 (${result.tolerance.band})`,
      `Tolerance basis: ${result.tolerance.why}`,
      `Notes: ${form.notes || "none"}`,
    ].join("\n");
  }, [form, result, helperScore]);

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const loadSample = () => {
    setForm({
      ...initial,
      procedure: "lung biopsy",
      targetType: "lung nodule",
      sizeCm: "0.9",
      emphysema: "moderate",
      age: "92",
      bmi: "41",
      albumin: "2.4",
      frailtyIndependence: "2",
      frailtyMobility: "3",
      frailtyFalls: "1",
      frailtyCognition: "1",
      frailtyNutrition: "2",
      frailtyEnergy: "2",
    });
  };

  const isLowSir = [
    "skin / dermis procedure",
    "paracentesis",
    "thoracentesis",
    "venous access catheter",
    "chest tube placement",
  ].includes(form.procedure);

  const sirBand = isLowSir ? "low" : "high";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 12,
        color: "#0f172a",
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Procedure Risk App</h1>
          <p style={{ marginTop: 6, color: "#64748b" }}>
            Stable base with restored frailty helper, bleeding modifier, complexity score, and tolerance score.
          </p>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
          <button style={buttonStyle(false)} onClick={loadSample}>Load sample</button>
          <button style={buttonStyle(false)} onClick={() => setForm(initial)}>Reset</button>
          <div style={{ ...cardStyle(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Detailed view</span>
            <input type="checkbox" checked={showDetailed} onChange={(e) => setShowDetailed(e.target.checked)} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Procedure</h2>

              <Field label="Procedure">
                <select value={form.procedure} onChange={(e) => update("procedure", e.target.value)} style={inputStyle()}>
                  {procedures.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Field>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Target type">
                  <select value={form.targetType} onChange={(e) => update("targetType", e.target.value)} style={inputStyle()}>
                    {["mass", "parenchyma", "fluid collection", "biliary", "gallbladder", "lung nodule", "skin/dermis"].map((x) => (
                      <option key={x} value={x}>{x}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Size (cm)">
                  <input value={form.sizeCm} onChange={(e) => update("sizeCm", e.target.value)} style={inputStyle()} />
                </Field>
              </div>

              {showDetailed && (
                <>
                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    <Field label="Drainage subtype">
                      <select value={form.drainType} onChange={(e) => update("drainType", e.target.value)} style={inputStyle()}>
                        <option value="">not applicable</option>
                        <option value="liver abscess">liver abscess</option>
                        <option value="biliary drainage">biliary drainage</option>
                        <option value="gallbladder drainage">gallbladder drainage</option>
                        <option value="other abscess drainage">other abscess drainage</option>
                      </select>
                    </Field>

                    <Field label="Tunneled?">
                      <select value={form.tunneled} onChange={(e) => update("tunneled", e.target.value)} style={inputStyle()}>
                        <option value="">n/a</option>
                        <option value="no">no</option>
                        <option value="yes">yes</option>
                      </select>
                    </Field>
                  </div>

                  <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                    <Field label="Lung emphysema in path">
                      <select value={form.emphysema} onChange={(e) => update("emphysema", e.target.value)} style={inputStyle()}>
                        <option value="">n/a</option>
                        <option value="none">none</option>
                        <option value="mild">mild</option>
                        <option value="moderate">moderate</option>
                        <option value="severe">severe</option>
                      </select>
                    </Field>

                    <Field label="Urgency">
                      <select value={form.urgency} onChange={(e) => update("urgency", e.target.value)} style={inputStyle()}>
                        <option value="elective">elective</option>
                        <option value="urgent">urgent</option>
                        <option value="emergent">emergent</option>
                      </select>
                    </Field>
                  </div>
                </>
              )}
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Patient factors</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Age">
                  <input value={form.age} onChange={(e) => update("age", e.target.value)} style={inputStyle()} />
                </Field>

                <Field label="BMI">
                  <input value={form.bmi} onChange={(e) => update("bmi", e.target.value)} style={inputStyle()} />
                </Field>

                {showDetailed && (
                  <>
                    <Field label="Albumin">
                      <input value={form.albumin} onChange={(e) => update("albumin", e.target.value)} style={inputStyle()} />
                    </Field>

                    <Field label="Manual frailty override (optional 0–10)">
                      <input value={form.frailtyOverride} onChange={(e) => update("frailtyOverride", e.target.value)} style={inputStyle()} />
                    </Field>
                  </>
                )}
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Frailty helper</h2>
              <p style={{ marginTop: 0, color: "#64748b" }}>
                Auto-calculated continuously. Manual override takes precedence if entered.
              </p>

              {[
                ["Baseline independence", "frailtyIndependence", [["0", "Fully independent"], ["2", "Needs help with some IADLs"], ["4", "Needs help with ADLs"], ["6", "Dependent for most daily care"]]],
                ["Mobility", "frailtyMobility", [["0", "Walks independently"], ["1", "Uses cane / walker"], ["3", "Limited household ambulation"], ["5", "Mostly chair or bed bound"]]],
                ["Falls in last 6 months", "frailtyFalls", [["0", "None"], ["1", "One fall"], ["2", "Recurrent falls"]]],
                ["Cognition / delirium vulnerability", "frailtyCognition", [["0", "No major impairment"], ["1", "Mild impairment"], ["2", "Moderate impairment / prior delirium"], ["3", "Severe impairment"]]],
                ["Nutrition / weight loss", "frailtyNutrition", [["0", "No major issue"], ["1", "Reduced intake or mild weight loss"], ["2", "Significant weight loss / sarcopenia"]]],
                ["Energy / exhaustion", "frailtyEnergy", [["0", "Usual energy"], ["1", "Some slowing / fatigue"], ["2", "Marked exhaustion / minimal reserve"]]],
              ].map(([label, key, options]) => (
                <Field key={key} label={label}>
                  <select value={form[key]} onChange={(e) => update(key, e.target.value)} style={inputStyle()}>
                    {options.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
              ))}

              <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 14, padding: 14 }}>
                <div><strong>Frailty helper result:</strong> {helperScore}/10</div>
                <div style={{ marginTop: 4, color: "#475569" }}>{frailtyLabel(helperScore)}</div>
                <div style={{ marginTop: 12 }}><strong>Frailty used in model:</strong> {result.frailty.score}/10</div>
                <div style={{ marginTop: 4, color: "#475569" }}>Source: {result.frailty.source}</div>
              </div>
            </div>

            {showDetailed && (
              <div style={cardStyle()}>
                <h2 style={{ marginTop: 0 }}>Notes</h2>
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  style={{ ...inputStyle(), minHeight: 120 }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Quick output</h2>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{result.title}</div>
              <div style={{ marginTop: 6, color: "#64748b" }}>{result.subtitle}</div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", marginTop: 14 }}>
                <QuickStat title="Bleeding" value={`${result.bleed.score}/10`} detail={result.bleed.band} />
                <QuickStat title="Complexity" value={`${result.complexity.score}/10`} detail={result.complexity.band} />
                <QuickStat title="Tolerance" value={`${result.tolerance.score}/10`} detail={result.tolerance.band} />
                <QuickStat title="Frailty used" value={`${result.frailty.score}/10`} detail={result.frailty.source} />
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Detailed output</h2>

              <div>
                <strong>SIR category:</strong>
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 8,
                    padding: "4px 10px",
                    borderRadius: 999,
                    ...badgeStyle(sirBand),
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {sirBand}
                </span>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Top reasons</div>
                <ul style={{ marginTop: 8, paddingLeft: 20, color: "#334155" }}>
                  {(result.reasons.length ? result.reasons : ["No dominant concern identified."]).slice(0, 3).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Bleeding modifier</div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{result.bleed.score}/10</div>
                <div style={{ color: "#64748b" }}>{result.bleed.why}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Complexity score</div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{result.complexity.score}/10</div>
                <div style={{ color: "#64748b" }}>{result.complexity.why}</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Procedure tolerance score</div>
                <div style={{ fontSize: 34, fontWeight: 800 }}>{result.tolerance.score}/10</div>
                <div style={{ color: "#64748b" }}>{result.tolerance.why}</div>
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Report</h2>
              <div style={{ marginBottom: 12 }}>
                <button style={buttonStyle(true)} onClick={() => navigator.clipboard.writeText(report)}>
                  Copy report
                </button>
              </div>
              <textarea readOnly value={report} style={{ ...inputStyle(), minHeight: 260 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
