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
  platelets: "",
  inr: "",
  egfr: "",
  changeMgmt: "yes",
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

function frailtyLabel(score) {
  if (score <= 2) return "low frailty burden";
  if (score <= 4) return "mild frailty burden";
  if (score <= 6) return "moderate frailty burden";
  if (score <= 8) return "high frailty burden";
  return "very high frailty burden";
}

function riskBand(score) {
  if (score <= 2) return "low";
  if (score <= 6) return "moderate";
  if (score <= 8) return "high";
  return "very high";
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
  if (override !== null) return { score: override, source: "manual override" };
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
    x = 1; why.push("Skin / dermis only.");
  } else if (p === "paracentesis") {
    x = 2; why.push("Paracentesis baseline 2.");
  } else if (p === "thoracentesis") {
    x = 4; why.push("Thoracentesis baseline 4.");
  } else if (p === "venous access catheter") {
    x = tun === "yes" ? 3 : 2; why.push(tun === "yes" ? "Tunneled line +1 over non-tunneled." : "Non-tunneled line baseline 2.");
  } else if (p === "chest tube placement") {
    x = tun === "yes" ? 3 : 2; why.push(tun === "yes" ? "Tunneled drain +1 over non-tunneled." : "Non-tunneled drain baseline 2.");
  } else if (p === "abscess drainage") {
    x = 6; why.push("Deep drainage baseline 6.");
  } else if (p === "nephrostomy placement") {
    x = 8; why.push("Nephrostomy baseline 8.");
  } else if (p === "liver biopsy") {
    x = 7; why.push("Liver biopsy lower than kidney/adrenal.");
  } else if (p === "renal biopsy") {
    if (t === "parenchyma") { x = 10; why.push("Renal parenchymal biopsy highest risk."); }
    else if (s !== null && s >= 2) { x = 7; why.push("Renal mass ≥2 cm."); }
    else if (s !== null && s >= 1) { x = 8; why.push("Renal mass 1 to <2 cm."); }
    else { x = 9; why.push("Very small renal mass biopsy."); }
  } else if (p === "adrenal biopsy") {
    if (s !== null && s >= 2) { x = 7; why.push("Adrenal mass ≥2 cm."); }
    else if (s !== null && s >= 1) { x = 8; why.push("Adrenal mass 1 to <2 cm."); }
    else { x = 9; why.push("Very small adrenal mass biopsy."); }
  } else if (p === "lung biopsy") {
    x = 8; why.push("Lung biopsy baseline 8.");
    if (s !== null && s >= 2) { x -= 2; why.push("Target ≥2 cm lowers risk."); }
    else if (s !== null && s < 0.8) { x += 3; why.push("Target <0.8 cm strongly worsens risk/benefit."); }
    else if (s !== null && s < 1) { x += 2; why.push("Target <1 cm raises risk."); }
    else if (s !== null && s < 2) { x += 1; why.push("Target <2 cm raises risk."); }
    if (em === "mild") x += 1;
    if (em === "moderate") x += 2;
    if (em === "severe") x += 3;
    if (em) why.push(`Emphysema in path: ${em}.`);
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
  else if (p === "abscess drainage") x = dr === "biliary drainage" ? 7 : dr === "gallbladder drainage" ? 6 : dr === "liver abscess" ? 6 : 5;
  else if (p === "nephrostomy placement") x = 6;
  else if (p === "liver biopsy") x = 5;
  else if (p === "renal biopsy") x = f.targetType === "parenchyma" ? 9 : 7;
  else if (p === "adrenal biopsy") x = 8;
  else if (p === "lung biopsy") x = 7;

  if (s !== null && s < 0.8 && p !== "abscess drainage" && f.targetType !== "parenchyma") { x += 3; why.push("Sub-0.8 cm target."); }
  else if (s !== null && s < 1 && p !== "abscess drainage" && f.targetType !== "parenchyma") { x += 2; why.push("Sub-1 cm target."); }
  else if (s !== null && s < 2 && p !== "abscess drainage" && f.targetType !== "parenchyma") { x += 1; why.push("Sub-2 cm target."); }

  if (p === "lung biopsy") {
    if (em === "mild") x += 1;
    if (em === "moderate") x += 2;
    if (em === "severe") x += 3;
  }
  if (p === "abscess drainage" && dr === "liver abscess" && s !== null && s < 2) {
    x += 2; why.push("Small liver abscess less favorable.");
  }
  if (bmi !== null && bmi >= 40) { x += 2; why.push("Severe obesity worsens imaging/access."); }
  else if (bmi !== null && bmi >= 30) { x += 1; why.push("Obesity worsens imaging/access."); }

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

  if (cx >= 8) { x += 2; why.push("High complexity adds burden."); }
  else if (cx >= 6) { x += 1; why.push("Moderate-high complexity adds burden."); }
  if (age !== null) {
    if (age >= 95) { x += 3; why.push("Age 95+."); }
    else if (age >= 90) { x += 2; why.push("Age 90–94."); }
    else if (age >= 85) { x += 1; why.push("Age 85–89."); }
    else if (age >= 75) { x += 1; why.push("Age 75–84."); }
  }
  if (frailty >= 8) { x += 3; why.push("Marked frailty."); }
  else if (frailty >= 5) { x += 2; why.push("Moderate frailty."); }
  else if (frailty >= 3) { x += 1; why.push("Mild frailty."); }
  if (albumin !== null) {
    if (albumin < 2.5) { x += 2; why.push("Severe hypoalbuminemia."); }
    else if (albumin < 3.2) { x += 1; why.push("Low albumin."); }
  }
  if (bmi !== null) {
    if (bmi >= 40) { x += 2; why.push("Severe obesity."); }
    else if (bmi >= 30) { x += 1; why.push("Obesity."); }
    else if (bmi < 18.5) { x += 1; why.push("Low body mass."); }
  }

  x = clamp(Math.round(x), 1, 10);
  return { score: x, band: riskBand(x), why: why.join(" ") };
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function QuickStat({ title, value, detail }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{detail}</div>
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
    const cx = complexityScore(form);
    const tol = toleranceScore(form, cx.score);
    const reasons = [];

    if (bleed.score >= 9) reasons.push("Very high bleeding modifier.");
    else if (bleed.score >= 7) reasons.push("High bleeding modifier.");
    if (cx.score >= 8) reasons.push("High technical complexity.");
    if (tol.score >= 8) reasons.push("Very poor expected procedure tolerance.");
    else if (tol.score >= 6) reasons.push("Moderate-high procedure tolerance concern.");
    if (form.procedure === "lung biopsy" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 0.8) reasons.push("Very small target gives poor risk-benefit.");

    let title = "Proceed";
    let subtitle = "Risk-benefit appears acceptable as entered.";
    if (form.procedure === "lung biopsy" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 0.8) {
      title = "Avoid / use alternative";
      subtitle = "Very small target gives poor near-term procedural payoff.";
    } else if (bleed.score >= 9 || tol.score >= 9) {
      title = "Delay / optimize first";
      subtitle = "Current risk profile is very unfavorable without additional mitigation.";
    } else if (bleed.score >= 7 || tol.score >= 7 || cx.score >= 8) {
      title = "Proceed after optimization";
      subtitle = "Procedure may be reasonable, but optimization should occur first.";
    }
    if (form.urgency === "emergent") {
      title = "Proceed now";
      subtitle = "Emergent benefit may outweigh several elevated risks.";
    }

    return { frailty, bleed, cx, tol, title, subtitle, reasons };
  }, [form]);

  const report = useMemo(() => {
    return [
      `Procedure: ${form.procedure}`,
      `Final recommendation: ${result.title}`,
      `Summary: ${result.subtitle}`,
      `Frailty helper result: ${helperScore}/10 (${frailtyLabel(helperScore)})`,
      `Frailty used in model: ${result.frailty.score}/10 (${result.frailty.source})`,
      `Bleeding modifier: ${result.bleed.score}/10`,
      `Bleeding basis: ${result.bleed.why}`,
      `Complexity score: ${result.cx.score}/10`,
      `Complexity basis: ${result.cx.why}`,
      `Tolerance score: ${result.tol.score}/10`,
      `Tolerance basis: ${result.tol.why}`,
      `Notes: ${form.notes || "none"}`,
    ].join("\n");
  }, [form, result, helperScore]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

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

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Procedure Risk App</h1>
          <p className="text-sm text-slate-600">Packaged for GitHub and Vercel. Mobile-first, fast workflow, with both quick and detailed output.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Button onClick={loadSample} variant="outline">Load sample</Button>
          <Button onClick={() => setForm(initial)} variant="outline">Reset</Button>
          <div className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
            <span className="text-sm font-medium">Detailed view</span>
            <Switch checked={showDetailed} onCheckedChange={setShowDetailed} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Procedure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Field label="Procedure">
                  <Select value={form.procedure} onValueChange={(v) => update("procedure", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {procedures.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Target type">
                    <Select value={form.targetType} onValueChange={(v) => update("targetType", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["mass", "parenchyma", "fluid collection", "biliary", "gallbladder", "lung nodule", "skin/dermis"].map((x) => (
                          <SelectItem key={x} value={x}>{x}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Size (cm)">
                    <Input value={form.sizeCm} onChange={(e) => update("sizeCm", e.target.value)} />
                  </Field>
                </div>

                {showDetailed && (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Drainage subtype">
                        <Select value={form.drainType} onValueChange={(v) => update("drainType", v)}>
                          <SelectTrigger><SelectValue placeholder="not applicable" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">not applicable</SelectItem>
                            <SelectItem value="liver abscess">liver abscess</SelectItem>
                            <SelectItem value="biliary drainage">biliary drainage</SelectItem>
                            <SelectItem value="gallbladder drainage">gallbladder drainage</SelectItem>
                            <SelectItem value="other abscess drainage">other abscess drainage</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Tunneled?">
                        <Select value={form.tunneled} onValueChange={(v) => update("tunneled", v)}>
                          <SelectTrigger><SelectValue placeholder="n/a" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">n/a</SelectItem>
                            <SelectItem value="no">no</SelectItem>
                            <SelectItem value="yes">yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Lung emphysema in path">
                        <Select value={form.emphysema} onValueChange={(v) => update("emphysema", v)}>
                          <SelectTrigger><SelectValue placeholder="n/a" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">n/a</SelectItem>
                            <SelectItem value="none">none</SelectItem>
                            <SelectItem value="mild">mild</SelectItem>
                            <SelectItem value="moderate">moderate</SelectItem>
                            <SelectItem value="severe">severe</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Urgency">
                        <Select value={form.urgency} onValueChange={(v) => update("urgency", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="elective">elective</SelectItem>
                            <SelectItem value="urgent">urgent</SelectItem>
                            <SelectItem value="emergent">emergent</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Patient factors</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Field label="Age">
                  <Input value={form.age} onChange={(e) => update("age", e.target.value)} />
                </Field>
                <Field label="BMI">
                  <Input value={form.bmi} onChange={(e) => update("bmi", e.target.value)} />
                </Field>
                {showDetailed && (
                  <>
                    <Field label="Albumin">
                      <Input value={form.albumin} onChange={(e) => update("albumin", e.target.value)} />
                    </Field>
                    <Field label="Manual frailty override (optional 0–10)">
                      <Input value={form.frailtyOverride} onChange={(e) => update("frailtyOverride", e.target.value)} />
                    </Field>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frailty helper</CardTitle>
                <CardDescription>Auto-calculated continuously. Manual override takes precedence if entered.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Baseline independence", "frailtyIndependence", [["0","Fully independent"],["2","Needs help with some IADLs"],["4","Needs help with ADLs"],["6","Dependent for most daily care"]]],
                  ["Mobility", "frailtyMobility", [["0","Walks independently"],["1","Uses cane / walker"],["3","Limited household ambulation"],["5","Mostly chair or bed bound"]]],
                  ["Falls in last 6 months", "frailtyFalls", [["0","None"],["1","One fall"],["2","Recurrent falls"]]],
                  ["Cognition / delirium vulnerability", "frailtyCognition", [["0","No major impairment"],["1","Mild impairment"],["2","Moderate impairment / prior delirium"],["3","Severe impairment"]]],
                  ["Nutrition / weight loss", "frailtyNutrition", [["0","No major issue"],["1","Reduced intake or mild weight loss"],["2","Significant weight loss / sarcopenia"]]],
                  ["Energy / exhaustion", "frailtyEnergy", [["0","Usual energy"],["1","Some slowing / fatigue"],["2","Marked exhaustion / minimal reserve"]]],
                ].map(([label, key, options]) => (
                  <Field key={String(key)} label={String(label)}>
                    <Select value={form[key]} onValueChange={(v) => update(key, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}

                <div className="rounded-xl border bg-blue-50 p-3">
                  <div><strong>Frailty helper result:</strong> {helperScore}/10</div>
                  <div className="mt-1 text-sm text-slate-600">{frailtyLabel(helperScore)}</div>
                  <div className="mt-3"><strong>Frailty used in model:</strong> {result.frailty.score}/10</div>
                  <div className="mt-1 text-sm text-slate-600">Source: {result.frailty.source}</div>
                </div>
              </CardContent>
            </Card>

            {showDetailed && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Optional clinical notes..." />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold">{result.title}</div>
                <div className="text-sm text-slate-600">{result.subtitle}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <QuickStat title="Bleeding" value={`${result.bleed.score}/10`} detail={result.bleed.band} />
                  <QuickStat title="Complexity" value={`${result.cx.score}/10`} detail={result.cx.band} />
                  <QuickStat title="Tolerance" value={`${result.tol.score}/10`} detail={result.tol.band} />
                  <QuickStat title="Frailty used" value={`${result.frailty.score}/10`} detail={result.frailty.source} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detailed output</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><strong>SIR category:</strong> <Badge className={badgeClass(["skin / dermis procedure","paracentesis","thoracentesis","venous access catheter","chest tube placement"].includes(form.procedure) ? "low" : "high")}>{["skin / dermis procedure","paracentesis","thoracentesis","venous access catheter","chest tube placement"].includes(form.procedure) ? "low" : "high"}</Badge></div>
                <Separator />
                <div>
                  <div className="text-sm font-semibold">Top reasons</div>
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                    {(result.reasons.length ? result.reasons : ["No dominant concern identified."]).slice(0, 3).map((x) => <li key={x}>{x}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-sm font-semibold">Bleeding modifier</div>
                  <div className="text-3xl font-bold">{result.bleed.score}/10</div>
                  <div className="text-sm text-slate-600">{result.bleed.why}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">Complexity score</div>
                  <div className="text-3xl font-bold">{result.cx.score}/10</div>
                  <div className="text-sm text-slate-600">{result.cx.why}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">Procedure tolerance score</div>
                  <div className="text-3xl font-bold">{result.tol.score}/10</div>
                  <div className="text-sm text-slate-600">{result.tol.why}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => navigator.clipboard.writeText(report)}>Copy report</Button>
                <Textarea value={report} readOnly className="min-h-[260px]" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
