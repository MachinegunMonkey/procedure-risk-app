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
  frailtyOverride: "",
  frailtyIndependence: "0",
  frailtyMobility: "0",
  frailtyFalls: "0",
  frailtyCognition: "0",
  frailtyNutrition: "0",
  frailtyEnergy: "0",
  thromDrug: "",
  thromIndication: "",
  thromTiming: "",
  dapt: "",
  lastDoseHours: "",
  contrastNeed: "no",
  guidance: "ct",
  intent: "initial placement",
  contrastReaction: "none",
  recentSurgery: "no",
  surgDays: "",
  surgRelation: "",
  freshOperativeSite: "",
  postOpComplication: "",
  oxygenNeed: "",
  copdSeverity: "",
  heartFailureSeverity: "",
  canLayFlat: "",
  sedationPlan: "local only",
  airwayRisk: "",
  willChangeManagement: "yes",
  canDelay: "yes",
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

function badgeStyle(band) {
  if (band === "low") return { background: "#dcfce7", color: "#166534" };
  if (band === "moderate") return { background: "#fef3c7", color: "#92400e" };
  if (band === "high") return { background: "#fed7aa", color: "#9a3412" };
  return { background: "#fecaca", color: "#991b1b" };
}

function actionStyle(action) {
  if (action === "Proceed") return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (action === "Proceed after optimization") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" };
  if (action === "Delay / optimize first") return { background: "#fed7aa", color: "#9a3412", border: "1px solid #fb923c" };
  return { background: "#fecaca", color: "#991b1b", border: "1px solid #f87171" };
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
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
        {title}
      </div>
      <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{value}</div>
      <span
        style={{
          display: "inline-block",
          marginTop: 6,
          padding: "4px 10px",
          borderRadius: 999,
          ...badgeStyle(detail),
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {detail}
      </span>
    </div>
  );
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
      if (s !== null && s < 2) why.push("Abscess under 2 cm may be less favorable for drainage.");
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

function cardiopulmonarySedationAssessment(f) {
  let score = 1;
  const why = [];
  const suggestions = [];

  if (f.oxygenNeed === "yes") {
    score = Math.max(score, 5);
    why.push("Baseline oxygen requirement.");
    suggestions.push("Reassess monitoring needs and whether sedation can be minimized.");
  }

  if (f.copdSeverity === "severe") {
    score = Math.max(score, 7);
    why.push("Severe COPD.");
  } else if (f.copdSeverity === "moderate") {
    score = Math.max(score, 5);
    why.push("Moderate COPD.");
  }

  if (f.heartFailureSeverity === "severe") {
    score = Math.max(score, 7);
    why.push("Severe heart failure.");
  } else if (f.heartFailureSeverity === "moderate") {
    score = Math.max(score, 5);
    why.push("Moderate heart failure.");
  }

  if (f.canLayFlat === "no") {
    score = Math.max(score, 7);
    why.push("Cannot tolerate lying flat.");
    suggestions.push("Consider positioning changes or alternate procedural approach.");
  } else if (f.canLayFlat === "partially") {
    score = Math.max(score, 4);
    why.push("Limited tolerance of flat positioning.");
  }

  if (f.airwayRisk === "high") {
    score = Math.max(score, 8);
    why.push("High airway risk.");
    suggestions.push("Airway risk should directly affect sedation planning and monitoring.");
  } else if (f.airwayRisk === "moderate") {
    score = Math.max(score, 5);
    why.push("Moderate airway risk.");
  }

  if (f.sedationPlan === "moderate sedation") {
    score = Math.max(score, 3);
    why.push("Moderate sedation planned.");
  } else if (f.sedationPlan === "deep sedation / anesthesia") {
    score = Math.max(score, 5);
    why.push("Deep sedation / anesthesia planned.");
    suggestions.push("Consider whether a lower sedation strategy is feasible.");
  }

  score = clamp(score, 1, 10);
  return {
    score,
    band: riskBand(score),
    why: why.length ? why.join(" ") : "No major cardiopulmonary / sedation issue entered.",
    suggestions,
  };
}

function toleranceScore(f, cx, cps) {
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

  if (cps >= 8) {
    x += 3;
    why.push("Major cardiopulmonary / sedation burden.");
  } else if (cps >= 5) {
    x += 2;
    why.push("Moderate cardiopulmonary / sedation burden.");
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

function labBleedingAssessment(f, procedureBleedScore) {
  const platelets = toNum(f.platelets);
  const inr = toNum(f.inr);
  const egfr = toNum(f.egfr);

  let score = 1;
  const why = [];
  const suggestions = [];

  if (platelets !== null) {
    if (platelets < 20) {
      score = Math.max(score, 9);
      why.push("Platelets under 20k strongly unfavorable.");
      suggestions.push("Correct severe thrombocytopenia before higher-risk procedures.");
    } else if (platelets < 50) {
      score = Math.max(score, 7);
      why.push("Platelets under 50k increase bleeding concern.");
      suggestions.push("Consider platelet optimization depending on procedure class.");
    } else if (platelets < 75) {
      score = Math.max(score, 5);
      why.push("Platelets 50k–74k create moderate concern.");
    }
  }

  if (inr !== null) {
    if (inr >= 2.5) {
      score = Math.max(score, 8);
      why.push("Marked INR elevation.");
      suggestions.push("Correct INR if clinically appropriate before higher-risk procedures.");
    } else if (inr >= 1.8) {
      score = Math.max(score, 6);
      why.push("Moderate INR elevation.");
    } else if (inr >= 1.5 && procedureBleedScore >= 7) {
      score = Math.max(score, 5);
      why.push("Mild INR elevation matters more in higher-bleeding procedures.");
    }
  }

  if (egfr !== null && egfr < 30) {
    score = Math.max(score, 3);
    why.push("Advanced renal dysfunction may worsen platelet function and medication clearance.");
  }

  return {
    score,
    band: riskBand(score),
    why: why.length ? why.join(" ") : "No major lab-driven bleeding issue entered.",
    suggestions,
  };
}

function thromboticHoldRisk(f) {
  const drug = f.thromDrug;
  const indication = f.thromIndication;
  const timing = f.thromTiming;
  const dapt = f.dapt;
  const egfr = toNum(f.egfr);
  const lastDoseHours = toNum(f.lastDoseHours);

  let score = 1;
  const why = [];
  const suggestions = [];

  if (!drug) {
    return {
      score: 1,
      band: "low",
      why: "No antithrombotic therapy entered.",
      suggestions: ["No hold guidance needed unless therapy is added."],
    };
  }

  if (indication === "mechanical heart valve") {
    score = Math.max(score, 9);
    why.push("Mechanical valve creates very high interruption risk.");
  } else if (indication === "recent VTE (< 3 months)") {
    score = Math.max(score, 8);
    why.push("Recent VTE creates high interruption risk.");
  } else if (indication === "recent arterial stent") {
    score = Math.max(score, 8);
    why.push("Recent arterial stent creates high interruption risk.");
  } else if (indication === "other high-risk thrombosis") {
    score = Math.max(score, 8);
    why.push("High-risk thrombotic indication entered.");
  } else if (indication === "atrial fibrillation") {
    score = Math.max(score, 4);
    why.push("Atrial fibrillation usually creates moderate interruption risk.");
  } else if (indication === "older VTE") {
    score = Math.max(score, 4);
    why.push("Older VTE still creates some interruption risk.");
  } else if (indication === "older arterial stent") {
    score = Math.max(score, 4);
    why.push("Older arterial stent creates lower but persistent interruption risk.");
  } else if (indication === "CAD / stroke prevention") {
    score = Math.max(score, 3);
    why.push("Secondary prevention usually creates low-moderate interruption risk.");
  } else {
    score = Math.max(score, 3);
    why.push("Drug entered but exact indication not specified.");
  }

  if (timing === "< 1 month") {
    score = Math.max(score, 9);
    why.push("Very recent event or stent.");
  } else if (timing === "1 to 3 months") {
    score = Math.max(score, 7);
    why.push("Event or stent within 1–3 months.");
  } else if (timing === "3 to 12 months") {
    score = Math.max(score, 5);
    why.push("Event or stent within 3–12 months.");
  }

  if (dapt === "yes") {
    score = Math.max(score, 8);
    why.push("Dual antiplatelet dependence increases hold risk.");
  }

  if (drug === "aspirin") {
    suggestions.push("Aspirin often continued for lower/moderate bleeding-risk procedures; consider ~5 day hold for higher-risk procedures if appropriate.");
  } else if (drug === "clopidogrel") {
    suggestions.push("Clopidogrel commonly held about 5 days if interruption is acceptable.");
  } else if (drug === "warfarin") {
    suggestions.push("Warfarin commonly held about 5 days with INR check before procedure.");
    if (score >= 8) suggestions.push("Because thrombotic risk is high, discuss bridging or alternatives with the prescribing team.");
  } else if (drug === "apixaban") {
    suggestions.push("Apixaban often held about 1 day for lower/moderate risk and ~2 days for higher bleeding risk.");
    if (egfr !== null && egfr < 30) suggestions.push("Poor renal function may justify a more conservative DOAC hold.");
  } else if (drug === "rivaroxaban") {
    suggestions.push("Rivaroxaban often held about 1 day for lower/moderate risk and ~2 days for higher bleeding risk.");
    if (egfr !== null && egfr < 30) suggestions.push("Poor renal function may justify a more conservative DOAC hold.");
  } else if (drug === "dabigatran") {
    suggestions.push("Dabigatran often held about 1–2 days; hold longer if renal function is reduced.");
  } else if (drug === "UFH") {
    suggestions.push("UFH commonly held about 4–6 hours.");
  } else if (drug === "LMWH") {
    suggestions.push("Therapeutic LMWH commonly held about 24 hours.");
  } else if (drug === "aspirin + clopidogrel") {
    suggestions.push("Recent stent / DAPT context should prompt prescribing-team discussion before interruption.");
    suggestions.push("Clopidogrel commonly ~5 day hold if interruption acceptable; aspirin often continued depending on bleeding risk.");
  }

  if (lastDoseHours !== null) why.push(`Last dose entered as ${lastDoseHours} hours ago.`);

  return {
    score,
    band: riskBand(score),
    why: why.join(" "),
    suggestions,
  };
}

function contrastAssessment(f) {
  const need = f.contrastNeed;
  const guidance = f.guidance;
  const intent = f.intent;
  const reaction = f.contrastReaction;
  const egfr = toNum(f.egfr);
  const p = f.procedure;
  const dr = f.drainType;

  let score = 1;
  const why = [];
  const suggestions = [];
  let pathway = "without contrast";

  if (need === "no") {
    pathway = "without contrast";
    why.push("Contrast not planned.");
  } else {
    if (
      ["paracentesis", "thoracentesis", "skin / dermis procedure", "venous access catheter", "chest tube placement", "lung biopsy", "renal biopsy", "adrenal biopsy", "liver biopsy"].includes(p)
    ) {
      pathway = "without contrast";
      why.push("This procedure is often feasible without contrast.");
    } else if (p === "nephrostomy placement" && guidance === "ct" && intent === "initial placement") {
      pathway = "without contrast";
      why.push("Initial CT-guided nephrostomy often does not require contrast.");
    } else if (p === "abscess drainage" && ["other abscess drainage", "liver abscess", "gallbladder drainage"].includes(dr) && intent === "initial placement") {
      pathway = "without contrast";
      why.push("Initial drainage placement often feasible without contrast if target is visible.");
    } else if (guidance === "fluoro" && intent === "diagnostic check / evaluation") {
      pathway = "standard contrast likely needed";
      why.push("Fluoro-guided diagnostic checks often require contrast.");
      score = Math.max(score, 4);
    } else {
      pathway = "selective or alternative contrast";
      why.push("Contrast may be selective rather than mandatory.");
      score = Math.max(score, 3);
    }

    if (reaction === "allergic-like") {
      score = Math.max(score, 7);
      why.push("Prior allergic-like reaction increases contrast planning risk.");
      suggestions.push("Consider non-contrast or alternative approach if feasible.");
      suggestions.push("If contrast is necessary, follow local premedication / contrast-safety workflow.");
    } else if (reaction === "physiologic") {
      score = Math.max(score, 3);
      why.push("Prior physiologic reaction noted.");
    } else if (reaction === "unknown") {
      score = Math.max(score, 3);
      why.push("Contrast reaction history unclear.");
    }

    if (egfr !== null && egfr < 30) {
      score = Math.max(score, 6);
      why.push("eGFR under 30 increases contrast caution.");
      suggestions.push("Favor no-contrast or alternative-contrast strategy if feasible.");
    } else if (egfr !== null && egfr < 45) {
      score = Math.max(score, 4);
      why.push("Reduced renal function increases contrast planning caution.");
    }
  }

  return {
    score,
    band: riskBand(score),
    why: why.join(" "),
    suggestions,
    pathway,
  };
}

function recentSurgeryAssessment(f) {
  if (f.recentSurgery !== "yes") {
    return {
      score: 0,
      band: "low",
      why: "No recent surgery entered.",
      suggestions: [],
    };
  }

  const days = toNum(f.surgDays);
  const relation = f.surgRelation;
  const fresh = f.freshOperativeSite;
  const complication = f.postOpComplication;

  let score = 1;
  const why = ["Recent surgery entered."];
  const suggestions = [];

  if (days === null) {
    score = Math.max(score, 2);
    why.push("Days since surgery not specified.");
  } else if (days <= 7) {
    score = Math.max(score, 8);
    why.push("Surgery within 7 days.");
  } else if (days <= 14) {
    score = Math.max(score, 7);
    why.push("Surgery within 8–14 days.");
  } else if (days <= 42) {
    score = Math.max(score, 5);
    why.push("Surgery within 2–6 weeks.");
  } else if (days <= 90) {
    score = Math.max(score, 3);
    why.push("Surgery within 6–12 weeks.");
  }

  if (relation === "same operative field") {
    score = Math.max(score, 6);
    why.push("Same operative field.");
    suggestions.push("Reassess whether additional healing time would materially improve safety.");
  } else if (relation === "adjacent region") {
    score = Math.max(score, 4);
    why.push("Adjacent operative region.");
  }

  if (fresh === "yes") {
    score = Math.max(score, 6);
    why.push("Fresh wound / tract / anastomosis.");
    suggestions.push("Fresh operative site increases tissue vulnerability.");
  }

  if (complication === "bleeding / hematoma") {
    score = Math.max(score, 7);
    why.push("Recent postoperative bleeding / hematoma.");
  } else if (complication === "infection / abscess") {
    score = Math.max(score, 5);
    why.push("Recent postoperative infection / abscess.");
  } else if (complication === "leak / dehiscence") {
    score = Math.max(score, 7);
    why.push("Recent leak / dehiscence.");
  } else if (complication === "other complication") {
    score = Math.max(score, 4);
    why.push("Other postoperative complication.");
  }

  return {
    score,
    band: riskBand(score),
    why: why.join(" "),
    suggestions,
  };
}

function missingDataPrompts(f) {
  const missing = [];

  if (!f.procedure) missing.push("procedure");
  if (!f.age) missing.push("age");
  if (!f.bmi) missing.push("BMI");
  if (!f.albumin) missing.push("albumin");
  if (!f.platelets) missing.push("platelet count");
  if (!f.inr) missing.push("INR");

  if (["lung biopsy", "renal biopsy", "adrenal biopsy", "liver biopsy", "abscess drainage"].includes(f.procedure) && !f.sizeCm) {
    missing.push("target / collection size");
  }
  if (f.procedure === "lung biopsy" && !f.emphysema) missing.push("emphysema severity in biopsy path");
  if (f.contrastNeed !== "no" && !f.guidance) missing.push("guidance modality");
  if (f.contrastNeed !== "no" && !f.intent) missing.push("procedure intent");
  if (f.recentSurgery === "yes" && !f.surgDays) missing.push("days since surgery");
  if (f.recentSurgery === "yes" && !f.surgRelation) missing.push("relation to operative field");
  if (f.thromDrug && !f.thromIndication) missing.push("antithrombotic indication");
  if (f.sedationPlan !== "local only" && !f.airwayRisk) missing.push("airway risk");
  if (!f.canLayFlat) missing.push("ability to lie flat");
  if (!f.willChangeManagement) missing.push("whether result will change management");

  return missing;
}

function sirThresholdWarnings(f, bleed, labBleed) {
  const warnings = [];
  const lowSir = ["skin / dermis procedure", "paracentesis", "thoracentesis", "venous access catheter", "chest tube placement"].includes(f.procedure);
  const platelets = toNum(f.platelets);
  const inr = toNum(f.inr);

  if (lowSir) {
    if (platelets !== null && platelets < 20) warnings.push("Very severe thrombocytopenia remains concerning even for lower-SIR-class procedures.");
    if (inr !== null && inr >= 2.5) warnings.push("Marked INR elevation remains concerning even for lower-SIR-class procedures.");
  } else {
    if (platelets !== null && platelets < 50) warnings.push("Higher-SIR-class procedure with platelets <50k deserves strong caution.");
    if (inr !== null && inr >= 1.8) warnings.push("Higher-SIR-class procedure with INR ≥1.8 deserves strong caution.");
    if (labBleed.score >= 6) warnings.push("Higher-SIR-class procedure plus unfavorable labs materially increases bleeding concern.");
  }

  if (bleed.score >= 9) warnings.push("Procedure-specific bleeding modifier is near the top of the scale.");
  return warnings;
}

function optimizationChecklist({ labBleed, thrombotic, contrast, recentSurgery, cps, form, missing }) {
  const items = [];
  labBleed.suggestions.forEach((x) => items.push(x));
  thrombotic.suggestions.forEach((x) => items.push(x));
  contrast.suggestions.forEach((x) => items.push(x));
  recentSurgery.suggestions.forEach((x) => items.push(x));
  cps.suggestions.forEach((x) => items.push(x));

  if (form.canDelay === "yes" && (labBleed.score >= 6 || recentSurgery.score >= 6)) {
    items.push("Because delay is acceptable, short-interval optimization may improve safety.");
  }
  if (form.willChangeManagement === "no") {
    items.push("Reassess whether the procedure should be done if the result will not change management.");
  } else if (form.willChangeManagement === "uncertain") {
    items.push("Clarify whether the result will materially change management.");
  }
  if (missing.length >= 3) {
    items.push("Fill in missing decision-critical inputs before finalizing the plan.");
  }

  return [...new Set(items)];
}

function topModifiableItems({ labBleed, thrombotic, contrast, recentSurgery, cps, missing, form }) {
  const items = [];

  if (labBleed.score >= 7) items.push("Correct the most unfavorable bleeding labs first.");
  else if (labBleed.score >= 5) items.push("Optimize labs if feasible before proceeding.");

  if (thrombotic.score >= 7) items.push("Coordinate antithrombotic interruption with the prescribing team.");
  else if (thrombotic.score >= 5) items.push("Clarify medication hold strategy before the procedure.");

  if (contrast.score >= 6) items.push("Reduce contrast exposure or use an alternative pathway if feasible.");
  if (recentSurgery.score >= 6) items.push("Reassess timing relative to recent surgery and tissue healing.");
  if (cps.score >= 6) items.push("Lower sedation burden or improve cardiopulmonary readiness.");
  if (form.willChangeManagement === "uncertain") items.push("Clarify whether the result will change management.");
  if (form.willChangeManagement === "no") items.push("Reconsider the need for the procedure entirely.");
  if (missing.length >= 3) items.push("Complete missing decision-critical data.");

  return [...new Set(items)].slice(0, 3);
}

function procedureSpecificTargets(f) {
  const platelets = toNum(f.platelets);
  const inr = toNum(f.inr);
  const items = [];

  const lowSir = ["skin / dermis procedure", "paracentesis", "thoracentesis", "venous access catheter", "chest tube placement"].includes(f.procedure);

  if (lowSir) {
    items.push("Lower-SIR-class procedure: minor lab abnormalities may be less consequential than in high-risk biopsies.");
    if (platelets !== null && platelets < 20) items.push("Platelets <20k remain concerning even for lower-risk procedures.");
    if (inr !== null && inr >= 2.5) items.push("Marked INR elevation still deserves caution.");
  } else {
    items.push("Higher-SIR-class procedure: labs and medication strategy deserve closer scrutiny.");
    if (platelets !== null && platelets < 50) items.push("Platelets <50k are especially concerning here.");
    if (inr !== null && inr >= 1.8) items.push("INR ≥1.8 is especially concerning here.");
  }

  if (["renal biopsy", "adrenal biopsy", "liver biopsy", "lung biopsy"].includes(f.procedure)) {
    items.push("Biopsy pathway: balance diagnostic yield against target size, access difficulty, and whether management will change.");
  }

  if (["abscess drainage", "nephrostomy placement", "paracentesis", "thoracentesis", "chest tube placement"].includes(f.procedure)) {
    items.push("Drainage / access pathway: assess whether decompression, source control, or symptom relief justifies urgency.");
  }

  return items;
}

function pathwaySummary(f) {
  if (["renal biopsy", "adrenal biopsy", "liver biopsy", "lung biopsy"].includes(f.procedure)) {
    return {
      title: "Biopsy pathway summary",
      text:
        "Biopsy decisions should emphasize lesion size, expected diagnostic yield, bleeding profile, pulmonary / sedation tolerance when relevant, and whether pathology will meaningfully change management.",
    };
  }

  if (["abscess drainage", "nephrostomy placement", "paracentesis", "thoracentesis", "chest tube placement", "venous access catheter"].includes(f.procedure)) {
    return {
      title: "Drainage / access pathway summary",
      text:
        "Drainage / access decisions should emphasize immediate therapeutic benefit, technical feasibility, infection or obstruction control, tissue integrity, and whether the procedure can be done with less sedation or without contrast.",
    };
  }

  return {
    title: "Procedure pathway summary",
    text: "Use the combined bleeding, technical, tolerance, medication, and timing profile to refine procedural value and safety.",
  };
}

function finalRecommendationEngine({ form, bleed, labBleed, complexity, tolerance, thrombotic, contrast, recentSurgery, cps, missing }) {
  const reasons = [];

  if (bleed.score >= 9) reasons.push("Procedure bleeding modifier is very high.");
  else if (bleed.score >= 7) reasons.push("Procedure bleeding modifier is high.");

  if (labBleed.score >= 8) reasons.push("Labs are strongly unfavorable for bleeding.");
  else if (labBleed.score >= 6) reasons.push("Labs add significant bleeding concern.");

  if (complexity.score >= 8) reasons.push("Technical complexity is high.");
  if (tolerance.score >= 8) reasons.push("Procedure tolerance concern is very high.");
  else if (tolerance.score >= 6) reasons.push("Procedure tolerance concern is meaningful.");

  if (cps.score >= 8) reasons.push("Cardiopulmonary / sedation burden is very high.");
  else if (cps.score >= 5) reasons.push("Cardiopulmonary / sedation burden is moderate.");

  if (thrombotic.score >= 8) reasons.push("Holding antithrombotic therapy carries high thrombotic risk.");
  else if (thrombotic.score >= 5) reasons.push("Medication interruption creates a meaningful thrombosis tradeoff.");

  if (contrast.score >= 7) reasons.push("Contrast issues add major planning risk.");
  else if (contrast.score >= 4) reasons.push("Contrast issues add planning complexity.");

  if (recentSurgery.score >= 7) reasons.push("Recent surgery materially worsens timing and tissue safety.");
  else if (recentSurgery.score >= 4) reasons.push("Recent surgery adds procedural concern.");

  if (missing.length >= 4) reasons.push("Important missing data could materially change the recommendation.");

  if (form.procedure === "lung biopsy" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 0.8) {
    reasons.push("Very small lung target gives poor risk-benefit.");
  }

  if (form.procedure === "abscess drainage" && form.drainType === "liver abscess" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 2) {
    reasons.push("Small liver abscess may be more appropriate for medical therapy first.");
  }

  if (form.willChangeManagement === "no") {
    reasons.push("Result is not expected to change management.");
  } else if (form.willChangeManagement === "uncertain") {
    reasons.push("Clinical utility remains uncertain.");
  }

  let title = "Proceed";
  let subtitle = "Risk-benefit appears acceptable as entered.";

  if (form.procedure === "lung biopsy" && toNum(form.sizeCm) !== null && toNum(form.sizeCm) < 0.8) {
    title = "Avoid / use alternative";
    subtitle = "Very small target gives poor near-term procedural payoff.";
  } else if (
    bleed.score >= 9 ||
    tolerance.score >= 9 ||
    labBleed.score >= 8 ||
    recentSurgery.score >= 8 ||
    cps.score >= 8
  ) {
    title = "Delay / optimize first";
    subtitle = "Current risk profile is very unfavorable without mitigation or reassessment.";
  } else if (
    bleed.score >= 7 ||
    tolerance.score >= 7 ||
    complexity.score >= 8 ||
    labBleed.score >= 6 ||
    contrast.score >= 6 ||
    recentSurgery.score >= 6 ||
    cps.score >= 6 ||
    missing.length >= 4
  ) {
    title = "Proceed after optimization";
    subtitle = "Procedure may be reasonable, but optimization or planning adjustments should occur first.";
  }

  if (form.willChangeManagement === "no" && form.urgency !== "emergent") {
    title = "Avoid / use alternative";
    subtitle = "Entered data suggest limited procedural payoff because management is unlikely to change.";
  }

  if (form.urgency === "emergent") {
    title = "Proceed now";
    subtitle = "Emergent clinical benefit may outweigh several elevated risks.";
  }

  return { title, subtitle, reasons: reasons.slice(0, 6) };
}

function buildNotes(form, result, helperScore, noteMode) {
  const concise = [
    `Procedure: ${form.procedure}.`,
    `Action: ${result.finalRec.title}.`,
    `Reasoning: ${result.finalRec.subtitle}`,
    `Top issues: ${result.finalRec.reasons.join(" ") || "No dominant concern identified."}`,
    `Top modifiable items: ${result.modifiable.join(" ") || "None identified."}`,
  ].join(" ");

  const detailed = [
    `Procedure: ${form.procedure}`,
    `Action: ${result.finalRec.title}`,
    `Summary: ${result.finalRec.subtitle}`,
    `Top reasons:`,
    ...(result.finalRec.reasons.length ? result.finalRec.reasons.map((x) => `- ${x}`) : ["- none"]),
    `Top modifiable items:`,
    ...(result.modifiable.length ? result.modifiable.map((x) => `- ${x}`) : ["- none"]),
    `Missing data prompts:`,
    ...(result.missing.length ? result.missing.map((x) => `- ${x}`) : ["- none"]),
    `SIR / threshold warnings:`,
    ...(result.sirWarnings.length ? result.sirWarnings.map((x) => `- ${x}`) : ["- none"]),
    `Procedure-specific targets:`,
    ...(result.targets.length ? result.targets.map((x) => `- ${x}`) : ["- none"]),
    `${result.pathway.title}: ${result.pathway.text}`,
    `Frailty helper result: ${helperScore}/10 (${frailtyLabel(helperScore)})`,
    `Frailty used in model: ${result.frailty.score}/10 (${result.frailty.source})`,
    `Procedure bleeding modifier: ${result.bleed.score}/10 (${result.bleed.band})`,
    `Lab-driven bleeding concern: ${result.labBleeding.score}/10 (${result.labBleeding.band})`,
    `Complexity score: ${result.complexity.score}/10 (${result.complexity.band})`,
    `Cardiopulmonary / sedation concern: ${result.cps.score}/10 (${result.cps.band})`,
    `Tolerance score: ${result.tolerance.score}/10 (${result.tolerance.band})`,
    `Thrombotic hold risk: ${result.thrombotic.score}/10 (${result.thrombotic.band})`,
    `Contrast concern: ${result.contrast.score}/10 (${result.contrast.band})`,
    `Recent surgery concern: ${result.recentSurgery.score}/10 (${result.recentSurgery.band})`,
    `Optimization checklist:`,
    ...(result.checklist.length ? result.checklist.map((x) => `- ${x}`) : ["- none"]),
    `Notes: ${form.notes || "none"}`,
  ].join("\n");

  return noteMode === "concise" ? concise : detailed;
}

export default function App() {
  const [form, setForm] = useState(initial);
  const [showDetailed, setShowDetailed] = useState(false);
  const [noteMode, setNoteMode] = useState("detailed");

  const helperScore = useMemo(() => frailtyHelperScore(form), [form]);

  const result = useMemo(() => {
    const frailty = frailtyUsed(form);
    const bleed = bleedingScore(form);
    const complexity = complexityScore(form);
    const cps = cardiopulmonarySedationAssessment(form);
    const tolerance = toleranceScore(form, complexity.score, cps.score);
    const labBleeding = labBleedingAssessment(form, bleed.score);
    const thrombotic = thromboticHoldRisk(form);
    const contrast = contrastAssessment(form);
    const recentSurgery = recentSurgeryAssessment(form);
    const missing = missingDataPrompts(form);
    const sirWarnings = sirThresholdWarnings(form, bleed, labBleeding);
    const checklist = optimizationChecklist({ labBleed: labBleeding, thrombotic, contrast, recentSurgery, cps, form, missing });
    const modifiable = topModifiableItems({ labBleed: labBleeding, thrombotic, contrast, recentSurgery, cps, missing, form });
    const targets = procedureSpecificTargets(form);
    const pathway = pathwaySummary(form);
    const finalRec = finalRecommendationEngine({
      form,
      bleed,
      labBleed: labBleeding,
      complexity,
      tolerance,
      thrombotic,
      contrast,
      recentSurgery,
      cps,
      missing,
    });

    return {
      frailty,
      bleed,
      complexity,
      cps,
      tolerance,
      labBleeding,
      thrombotic,
      contrast,
      recentSurgery,
      missing,
      sirWarnings,
      checklist,
      modifiable,
      targets,
      pathway,
      finalRec,
    };
  }, [form]);

  const report = useMemo(() => buildNotes(form, result, helperScore, noteMode), [form, result, helperScore, noteMode]);

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
      platelets: "68",
      inr: "1.7",
      egfr: "34",
      frailtyIndependence: "2",
      frailtyMobility: "3",
      frailtyFalls: "1",
      frailtyCognition: "1",
      frailtyNutrition: "2",
      frailtyEnergy: "2",
      thromDrug: "aspirin + clopidogrel",
      thromIndication: "recent arterial stent",
      thromTiming: "1 to 3 months",
      dapt: "yes",
      lastDoseHours: "18",
      contrastNeed: "possible",
      guidance: "ct",
      intent: "initial placement",
      contrastReaction: "allergic-like",
      recentSurgery: "yes",
      surgDays: "10",
      surgRelation: "adjacent region",
      freshOperativeSite: "no",
      postOpComplication: "",
      oxygenNeed: "yes",
      copdSeverity: "moderate",
      heartFailureSeverity: "",
      canLayFlat: "partially",
      sedationPlan: "moderate sedation",
      airwayRisk: "moderate",
      willChangeManagement: "yes",
      canDelay: "yes",
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
            Added procedure-specific targets, pathway summaries, and concise vs detailed note export.
          </p>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
          <button style={buttonStyle(false)} onClick={loadSample}>Load sample</button>
          <button style={buttonStyle(false)} onClick={() => setForm(initial)}>Reset</button>
          <div style={{ ...cardStyle(), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <span style={{ fontWeight: 600, fontSize: 15 }}>Detailed view</span>
            <input type="checkbox" checked={showDetailed} onChange={(e) => setShowDetailed(e.target.checked)} />
          </div>
          <div style={{ ...cardStyle(), padding: "12px 14px" }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Note export</div>
            <select value={noteMode} onChange={(e) => setNoteMode(e.target.value)} style={inputStyle()}>
              <option value="detailed">detailed note</option>
              <option value="concise">concise note</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Procedure</h2>
              <Field label="Procedure">
                <select value={form.procedure} onChange={(e) => update("procedure", e.target.value)} style={inputStyle()}>
                  {procedures.map((p) => <option key={p} value={p}>{p}</option>)}
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

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Will result change management?">
                  <select value={form.willChangeManagement} onChange={(e) => update("willChangeManagement", e.target.value)} style={inputStyle()}>
                    <option value="yes">yes</option>
                    <option value="uncertain">uncertain</option>
                    <option value="no">no</option>
                  </select>
                </Field>
                <Field label="Can delay for optimization?">
                  <select value={form.canDelay} onChange={(e) => update("canDelay", e.target.value)} style={inputStyle()}>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
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
                <Field label="Age"><input value={form.age} onChange={(e) => update("age", e.target.value)} style={inputStyle()} /></Field>
                <Field label="BMI"><input value={form.bmi} onChange={(e) => update("bmi", e.target.value)} style={inputStyle()} /></Field>
                <Field label="Albumin"><input value={form.albumin} onChange={(e) => update("albumin", e.target.value)} style={inputStyle()} /></Field>
                {showDetailed && (
                  <Field label="Manual frailty override (optional 0–10)">
                    <input value={form.frailtyOverride} onChange={(e) => update("frailtyOverride", e.target.value)} style={inputStyle()} />
                  </Field>
                )}
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Labs</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Platelets (k/µL)"><input value={form.platelets} onChange={(e) => update("platelets", e.target.value)} style={inputStyle()} /></Field>
                <Field label="INR"><input value={form.inr} onChange={(e) => update("inr", e.target.value)} style={inputStyle()} /></Field>
                <Field label="eGFR"><input value={form.egfr} onChange={(e) => update("egfr", e.target.value)} style={inputStyle()} /></Field>
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Frailty helper</h2>
              <p style={{ marginTop: 0, color: "#64748b" }}>Auto-calculated continuously. Manual override takes precedence if entered.</p>
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
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Antithrombotics</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Drug">
                  <select value={form.thromDrug} onChange={(e) => update("thromDrug", e.target.value)} style={inputStyle()}>
                    <option value="">none</option>
                    <option value="aspirin">aspirin</option>
                    <option value="clopidogrel">clopidogrel</option>
                    <option value="warfarin">warfarin</option>
                    <option value="apixaban">apixaban</option>
                    <option value="rivaroxaban">rivaroxaban</option>
                    <option value="dabigatran">dabigatran</option>
                    <option value="UFH">UFH</option>
                    <option value="LMWH">LMWH</option>
                    <option value="aspirin + clopidogrel">aspirin + clopidogrel</option>
                  </select>
                </Field>
                <Field label="Indication">
                  <select value={form.thromIndication} onChange={(e) => update("thromIndication", e.target.value)} style={inputStyle()}>
                    <option value="">not specified</option>
                    <option value="atrial fibrillation">atrial fibrillation</option>
                    <option value="mechanical heart valve">mechanical heart valve</option>
                    <option value="recent VTE (< 3 months)">recent VTE (&lt; 3 months)</option>
                    <option value="older VTE">older VTE</option>
                    <option value="recent arterial stent">recent arterial stent</option>
                    <option value="older arterial stent">older arterial stent</option>
                    <option value="CAD / stroke prevention">CAD / stroke prevention</option>
                    <option value="other high-risk thrombosis">other high-risk thrombosis</option>
                    <option value="other lower-risk indication">other lower-risk indication</option>
                  </select>
                </Field>
                <Field label="Timing since event / stent">
                  <select value={form.thromTiming} onChange={(e) => update("thromTiming", e.target.value)} style={inputStyle()}>
                    <option value="">not specified</option>
                    <option value="< 1 month">&lt; 1 month</option>
                    <option value="1 to 3 months">1 to 3 months</option>
                    <option value="3 to 12 months">3 to 12 months</option>
                    <option value="> 12 months">&gt; 12 months</option>
                  </select>
                </Field>
                <Field label="DAPT needed?">
                  <select value={form.dapt} onChange={(e) => update("dapt", e.target.value)} style={inputStyle()}>
                    <option value="">unknown</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
                <Field label="Last dose (hours ago)">
                  <input value={form.lastDoseHours} onChange={(e) => update("lastDoseHours", e.target.value)} style={inputStyle()} />
                </Field>
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Contrast</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Contrast needed?">
                  <select value={form.contrastNeed} onChange={(e) => update("contrastNeed", e.target.value)} style={inputStyle()}>
                    <option value="no">no</option>
                    <option value="possible">possible</option>
                    <option value="yes">yes</option>
                  </select>
                </Field>
                <Field label="Guidance">
                  <select value={form.guidance} onChange={(e) => update("guidance", e.target.value)} style={inputStyle()}>
                    <option value="ultrasound">ultrasound</option>
                    <option value="ct">ct</option>
                    <option value="fluoro">fluoro</option>
                    <option value="mixed">mixed</option>
                  </select>
                </Field>
                <Field label="Intent">
                  <select value={form.intent} onChange={(e) => update("intent", e.target.value)} style={inputStyle()}>
                    <option value="initial placement">initial placement</option>
                    <option value="exchange / reposition">exchange / reposition</option>
                    <option value="diagnostic check / evaluation">diagnostic check / evaluation</option>
                  </select>
                </Field>
                <Field label="Contrast reaction">
                  <select value={form.contrastReaction} onChange={(e) => update("contrastReaction", e.target.value)} style={inputStyle()}>
                    <option value="none">none</option>
                    <option value="allergic-like">allergic-like</option>
                    <option value="physiologic">physiologic</option>
                    <option value="unknown">unknown</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Recent surgery</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Recent surgery?">
                  <select value={form.recentSurgery} onChange={(e) => update("recentSurgery", e.target.value)} style={inputStyle()}>
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </select>
                </Field>
                <Field label="Days since surgery"><input value={form.surgDays} onChange={(e) => update("surgDays", e.target.value)} style={inputStyle()} /></Field>
                <Field label="Relation to planned procedure">
                  <select value={form.surgRelation} onChange={(e) => update("surgRelation", e.target.value)} style={inputStyle()}>
                    <option value="">not specified</option>
                    <option value="same operative field">same operative field</option>
                    <option value="adjacent region">adjacent region</option>
                    <option value="remote region">remote region</option>
                  </select>
                </Field>
                <Field label="Fresh wound / tract / anastomosis?">
                  <select value={form.freshOperativeSite} onChange={(e) => update("freshOperativeSite", e.target.value)} style={inputStyle()}>
                    <option value="">unknown</option>
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </Field>
                <Field label="Post-op complication">
                  <select value={form.postOpComplication} onChange={(e) => update("postOpComplication", e.target.value)} style={inputStyle()}>
                    <option value="">none / unknown</option>
                    <option value="bleeding / hematoma">bleeding / hematoma</option>
                    <option value="infection / abscess">infection / abscess</option>
                    <option value="leak / dehiscence">leak / dehiscence</option>
                    <option value="other complication">other complication</option>
                  </select>
                </Field>
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Sedation / cardiopulmonary</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <Field label="Sedation plan">
                  <select value={form.sedationPlan} onChange={(e) => update("sedationPlan", e.target.value)} style={inputStyle()}>
                    <option value="local only">local only</option>
                    <option value="minimal sedation">minimal sedation</option>
                    <option value="moderate sedation">moderate sedation</option>
                    <option value="deep sedation / anesthesia">deep sedation / anesthesia</option>
                  </select>
                </Field>
                <Field label="Airway risk">
                  <select value={form.airwayRisk} onChange={(e) => update("airwayRisk", e.target.value)} style={inputStyle()}>
                    <option value="">not entered</option>
                    <option value="low">low</option>
                    <option value="moderate">moderate</option>
                    <option value="high">high</option>
                  </select>
                </Field>
                <Field label="Needs oxygen?">
                  <select value={form.oxygenNeed} onChange={(e) => update("oxygenNeed", e.target.value)} style={inputStyle()}>
                    <option value="">not entered</option>
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </select>
                </Field>
                <Field label="COPD severity">
                  <select value={form.copdSeverity} onChange={(e) => update("copdSeverity", e.target.value)} style={inputStyle()}>
                    <option value="">not entered</option>
                    <option value="mild">mild</option>
                    <option value="moderate">moderate</option>
                    <option value="severe">severe</option>
                  </select>
                </Field>
                <Field label="Heart failure severity">
                  <select value={form.heartFailureSeverity} onChange={(e) => update("heartFailureSeverity", e.target.value)} style={inputStyle()}>
                    <option value="">not entered</option>
                    <option value="mild">mild</option>
                    <option value="moderate">moderate</option>
                    <option value="severe">severe</option>
                  </select>
                </Field>
                <Field label="Can lie flat?">
                  <select value={form.canLayFlat} onChange={(e) => update("canLayFlat", e.target.value)} style={inputStyle()}>
                    <option value="">not entered</option>
                    <option value="yes">yes</option>
                    <option value="partially">partially</option>
                    <option value="no">no</option>
                  </select>
                </Field>
              </div>
            </div>

            {showDetailed && (
              <div style={cardStyle()}>
                <h2 style={{ marginTop: 0 }}>Notes</h2>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} style={{ ...inputStyle(), minHeight: 120 }} />
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ ...cardStyle(), ...actionStyle(result.finalRec.title) }}>
              <h2 style={{ marginTop: 0 }}>Action</h2>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{result.finalRec.title}</div>
              <div style={{ marginTop: 8 }}>{result.finalRec.subtitle}</div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Top 3 modifiable items</h2>
              <ul style={{ marginTop: 8, paddingLeft: 20, color: "#334155" }}>
                {(result.modifiable.length ? result.modifiable : ["No major modifiable item identified."]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>{result.pathway.title}</h2>
              <div style={{ color: "#334155" }}>{result.pathway.text}</div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Procedure-specific targets</h2>
              <ul style={{ marginTop: 8, paddingLeft: 20, color: "#334155" }}>
                {(result.targets.length ? result.targets : ["No additional target prompt."]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Missing data prompts</h2>
              <ul style={{ marginTop: 8, paddingLeft: 20, color: "#334155" }}>
                {(result.missing.length ? result.missing : ["No major missing data prompt triggered."]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>SIR / threshold warnings</h2>
              <ul style={{ marginTop: 8, paddingLeft: 20, color: "#334155" }}>
                {(result.sirWarnings.length ? result.sirWarnings : ["No major threshold warning triggered."]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Optimization checklist</h2>
              <ul style={{ marginTop: 8, paddingLeft: 20, color: "#334155" }}>
                {(result.checklist.length ? result.checklist : ["No major optimization item identified."]).map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Quick output</h2>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <QuickStat title="Proc bleed" value={`${result.bleed.score}/10`} detail={result.bleed.band} />
                <QuickStat title="Lab bleed" value={`${result.labBleeding.score}/10`} detail={result.labBleeding.band} />
                <QuickStat title="Complexity" value={`${result.complexity.score}/10`} detail={result.complexity.band} />
                <QuickStat title="Cardiopulm" value={`${result.cps.score}/10`} detail={result.cps.band} />
                <QuickStat title="Tolerance" value={`${result.tolerance.score}/10`} detail={result.tolerance.band} />
                <QuickStat title="Thrombotic hold" value={`${result.thrombotic.score}/10`} detail={result.thrombotic.band} />
                <QuickStat title="Contrast" value={`${result.contrast.score}/10`} detail={result.contrast.band} />
                <QuickStat title="Recent surgery" value={`${result.recentSurgery.score}/10`} detail={result.recentSurgery.band} />
              </div>
            </div>

            <div style={cardStyle()}>
              <h2 style={{ marginTop: 0 }}>Report</h2>
              <div style={{ marginBottom: 12 }}>
                <button style={buttonStyle(true)} onClick={() => navigator.clipboard.writeText(report)}>
                  Copy {noteMode === "concise" ? "concise" : "detailed"} note
                </button>
              </div>
              <textarea readOnly value={report} style={{ ...inputStyle(), minHeight: 420 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
