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

function frailtyHelperScore(f) {
  const raw =
    Number(f.frailtyIndependence) +
    Number(f.frailtyMobility) +
    Number(f.frailtyFalls) +
    Number(f.frailtyCognition) +
    Number(f.frailtyNutrition) +
    Number(f.frailtyEnergy);
  return clamp(Math.round((raw / 20) * 10), 0, 10);
}

function frailtyUsed(f) {
  const override = toNum(f.frailtyOverride);
  if (override !== null) return override;
  return frailtyHelperScore(f);
}

function bleedingScore(f) {
  let x = 5;

  if (f.procedure === "paracentesis") x = 2;
  if (f.procedure === "thoracentesis") x = 4;
  if (f.procedure === "liver biopsy") x = 7;

  if (f.procedure === "renal biopsy") {
    if (f.targetType === "parenchyma") x = 10;
    else if (toNum(f.sizeCm) >= 2) x = 7;
    else x = 9;
  }

  if (f.procedure === "lung biopsy") {
    x = 8;
    if (toNum(f.sizeCm) >= 2) x -= 2;
    if (toNum(f.sizeCm) < 1) x += 2;
    if (f.emphysema === "moderate") x += 2;
    if (f.emphysema === "severe") x += 3;
  }

  return clamp(x, 1, 10);
}

function complexityScore(f) {
  let x = 3;

  if (toNum(f.sizeCm) < 1) x += 2;
  if (toNum(f.bmi) >= 40) x += 2;

  return clamp(x, 1, 10);
}

function toleranceScore(f, cx) {
  let x = 1;

  const age = toNum(f.age);
  const frailty = frailtyUsed(f);

  if (age >= 90) x += 2;
  if (frailty >= 6) x += 2;
  if (cx >= 7) x += 2;

  return clamp(x, 1, 10);
}

export default function App() {
  const [form, setForm] = useState(initial);

  const result = useMemo(() => {
    const bleed = bleedingScore(form);
    const cx = complexityScore(form);
    const tol = toleranceScore(form, cx);
    const frailty = frailtyUsed(form);

    let decision = "Proceed";

    if (bleed >= 9 || tol >= 9) decision = "Delay / optimize";
    if (form.procedure === "lung biopsy" && toNum(form.sizeCm) < 0.8)
      decision = "Avoid";

    return { bleed, cx, tol, frailty, decision };
  }, [form]);

  const update = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Procedure Risk App</h2>

      <div>
        <label>Procedure</label><br />
        <select value={form.procedure} onChange={(e)=>update("procedure", e.target.value)}>
          {procedures.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <label>Size (cm)</label><br />
        <input value={form.sizeCm} onChange={(e)=>update("sizeCm", e.target.value)} />
      </div>

      <div>
        <label>Age</label><br />
        <input value={form.age} onChange={(e)=>update("age", e.target.value)} />
      </div>

      <div>
        <label>Frailty (manual optional)</label><br />
        <input value={form.frailtyOverride} onChange={(e)=>update("frailtyOverride", e.target.value)} />
      </div>

      <hr />

      <h3>Results</h3>
      <div>Bleeding: {result.bleed}/10</div>
      <div>Complexity: {result.cx}/10</div>
      <div>Tolerance: {result.tol}/10</div>
      <div>Frailty: {result.frailty}/10</div>

      <h2>{result.decision}</h2>
    </div>
  );
}
