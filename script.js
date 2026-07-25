"use strict";

/* ============================================
   Config
   ============================================ */
const API_URL = "https://mental-health-score-fzsu.onrender.com";
const RING_CIRCUMFERENCE = 2 * Math.PI * 86; // matches r=86 on #ring-progress

/* ============================================
   Elements
   ============================================ */
const form = document.getElementById("predict-form");
const predictBtn = document.getElementById("predict-btn");
const resultSection = document.getElementById("result-section");
const resultCard = document.getElementById("result-card");
const scoreNumberEl = document.getElementById("score-number");
const ringProgressEl = document.getElementById("ring-progress");
const resultTagEl = document.getElementById("result-tag");
const resultDescEl = document.getElementById("result-desc");
const resultEyebrowEl = document.getElementById("result-eyebrow");
const retryBtn = document.getElementById("retry-btn");
const toastContainer = document.getElementById("toast-container");

/* ============================================
   Validation rules
   ============================================ */
const numericFields = [
  { id: "age", min: 5, max: 100, label: "Age" },
  { id: "avg_daily_usage_hours", min: 0, max: 24, label: "Average daily usage hours" },
  { id: "daily_unlocks", min: 0, max: 500, label: "Daily unlocks" },
  { id: "study_hours", min: 0, max: 24, label: "Study hours" },
  { id: "physical_activity_hours", min: 0, max: 24, label: "Physical activity hours" },
  { id: "sleep_hours_per_night", min: 0, max: 24, label: "Sleep hours per night" },
];

const requiredSelects = ["gender", "academic_level", "most_used_platform", "purpose_of_use", "stress_level"];

function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.querySelector(`[data-error-for="${fieldId}"]`);
  input.closest(".field").classList.add("invalid");
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  const errorEl = document.querySelector(`[data-error-for="${fieldId}"]`);
  input.closest(".field").classList.remove("invalid");
  if (errorEl) errorEl.textContent = "";
}

function clearAllErrors() {
  document.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));
  document.querySelectorAll(".field-error").forEach((e) => (e.textContent = ""));
}

function validateForm() {
  clearAllErrors();
  let isValid = true;

  // Country (text)
  const country = document.getElementById("country").value.trim();
  if (!country) {
    showFieldError("country", "Please enter a country.");
    isValid = false;
  }

  // Required selects
  requiredSelects.forEach((id) => {
    const value = document.getElementById(id).value;
    if (!value) {
      showFieldError(id, "This field is required.");
      isValid = false;
    }
  });

  // Numeric fields
  numericFields.forEach(({ id, min, max, label }) => {
    const raw = document.getElementById(id).value;
    if (raw === "" || raw === null) {
      showFieldError(id, `${label} is required.`);
      isValid = false;
      return;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      showFieldError(id, `${label} must be a number.`);
      isValid = false;
    } else if (value < min || value > max) {
      showFieldError(id, `${label} must be between ${min} and ${max}.`);
      isValid = false;
    }
  });

  return isValid;
}

/* Live-clear errors as user types/selects */
[...numericFields.map((f) => f.id), "country", ...requiredSelects].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener("input", () => clearFieldError(id));
  el.addEventListener("change", () => clearFieldError(id));
});

/* ============================================
   Toast notifications
   ============================================ */
function showToast(message, type = "error") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 320);
  }, 4200);
}

/* ============================================
   Build payload
   ============================================ */
function buildPayload() {
  return {
    age: Number(document.getElementById("age").value),
    gender: document.getElementById("gender").value,
    country: document.getElementById("country").value.trim(),
    academic_level: document.getElementById("academic_level").value,
    most_used_platform: document.getElementById("most_used_platform").value,
    purpose_of_use: document.getElementById("purpose_of_use").value,
    avg_daily_usage_hours: Number(document.getElementById("avg_daily_usage_hours").value),
    daily_unlocks: Number(document.getElementById("daily_unlocks").value),
    study_hours: Number(document.getElementById("study_hours").value),
    physical_activity_hours: Number(document.getElementById("physical_activity_hours").value),
    sleep_hours_per_night: Number(document.getElementById("sleep_hours_per_night").value),
    stress_level: document.getElementById("stress_level").value,
  };
}

/* ============================================
   Interpretation bands
   ============================================ */
function getInterpretation(score) {
  if (score <= 30) {
    return {
      tag: "Poor Mental Health",
      desc: "The student's score indicates significant strain. Immediate support and lifestyle changes are strongly recommended.",
      color: "var(--poor)",
    };
  } else if (score <= 50) {
    return {
      tag: "Needs Attention",
      desc: "The student's wellbeing needs attention. Consider improving sleep, reducing stress, and balancing screen time.",
      color: "var(--needs)",
    };
  } else if (score <= 70) {
    return {
      tag: "Moderate",
      desc: "The student's mental health score suggests a moderate wellbeing state. Small lifestyle adjustments could help.",
      color: "var(--moderate)",
    };
  } else if (score <= 85) {
    return {
      tag: "Good",
      desc: "The student is maintaining good mental wellbeing, supported by healthy daily habits.",
      color: "var(--good)",
    };
  } else {
    return {
      tag: "Excellent",
      desc: "The student shows excellent mental wellbeing, with strong balance across study, rest, and activity.",
      color: "var(--excellent)",
    };
  }
}

/* ============================================
   Render result
   ============================================ */
function renderResult(score) {
  const clamped = Math.max(0, Math.min(100, score));
  const { tag, desc, color } = getInterpretation(clamped);

  resultCard.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

  resultTagEl.textContent = tag;
  resultDescEl.textContent = desc;
  resultEyebrowEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Prediction Complete`;

  // Animate number count-up
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = (clamped * eased).toFixed(2);
    scoreNumberEl.textContent = current;
    if (progress < 1) requestAnimationFrame(tick);
    else scoreNumberEl.textContent = clamped.toFixed(2);
  }
  requestAnimationFrame(tick);

  // Animate ring
  const offset = RING_CIRCUMFERENCE - (clamped / 100) * RING_CIRCUMFERENCE;
  ringProgressEl.style.stroke = color;
  // reset then set for transition to trigger
  ringProgressEl.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
  ringProgressEl.style.strokeDashoffset = `${RING_CIRCUMFERENCE}`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ringProgressEl.style.strokeDashoffset = `${offset}`;
    });
  });
}

/* ============================================
   Submit handler
   ============================================ */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    showToast("Please fix the highlighted fields before submitting.", "error");
    return;
  }

  const payload = buildPayload();

  predictBtn.disabled = true;
  predictBtn.classList.add("is-loading");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();

    if (typeof data.predicted_mental_health_score !== "number") {
      throw new Error("Unexpected response format from server.");
    }

    renderResult(data.predicted_mental_health_score);
    showToast("Prediction generated successfully.", "success");
  } catch (err) {
    console.error("Prediction request failed:", err);
    showToast(
      "Could not reach the prediction server. Please check that the API is running and try again.",
      "error"
    );
  } finally {
    predictBtn.disabled = false;
    predictBtn.classList.remove("is-loading");
  }
});

/* ============================================
   Retry button
   ============================================ */
retryBtn.addEventListener("click", () => {
  resultCard.hidden = true;
  document.getElementById("predict-section").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ============================================
   Scroll reveal for sections (simple IntersectionObserver)
   ============================================ */
const revealTargets = document.querySelectorAll(".feature-card, .section-head");
revealTargets.forEach((el) => el.classList.add("reveal"));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealTargets.forEach((el) => observer.observe(el));
