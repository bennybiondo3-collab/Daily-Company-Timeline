const TOTAL_ROUNDS = 5;
const STORAGE_PREFIX = "company-timeline-daily-v3";

const puzzleDateEl = document.getElementById("puzzleDate");
const roundLabelEl = document.getElementById("roundLabel");
const scoreLabelEl = document.getElementById("scoreLabel");
const leftChoiceBtn = document.getElementById("leftChoice");
const rightChoiceBtn = document.getElementById("rightChoice");
const feedbackEl = document.getElementById("feedback");
const nextBtn = document.getElementById("nextBtn");
const gameSection = document.getElementById("game");
const resultsSection = document.getElementById("results");
const finalScoreEl = document.getElementById("finalScore");
const emojiLineEl = document.getElementById("emojiLine");
const copyBtn = document.getElementById("copyBtn");

let gameState = null;

function toLocalDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function seed() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedText) {
  const seedFn = xmur3(seedText);
  return mulberry32(seedFn());
}

function shuffle(items, rng) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderCompany(company) {
  const safeName = escapeHtml(company.name);
  const fallback = initials(company.name);
  const logoHtml = company.logo
    ? `<span class="logo-wrap">
         <img class="logo" src="${encodeURI(company.logo)}" alt="${safeName} logo" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">
         <span class="logo-fallback" hidden aria-hidden="true">${fallback}</span>
       </span>`
    : `<span class="logo-fallback" aria-hidden="true">${fallback}</span>`;

  return `
    <span class="company">
      ${logoHtml}
      <span class="company-name">${safeName}</span>
      <span class="tap-hint">Tap to choose</span>
    </span>
  `;
}

function buildDailyPairs(companies, dateKey) {
  const rng = makeRng(dateKey);
  const shuffled = shuffle(companies, rng);
  const pairs = [];
  for (let i = 0; i < shuffled.length - 1 && pairs.length < TOTAL_ROUNDS; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  if (pairs.length < TOTAL_ROUNDS) {
    throw new Error("Not enough companies to generate daily rounds.");
  }
  return pairs;
}

function setChoiceButtonsEnabled(enabled) {
  leftChoiceBtn.disabled = !enabled;
  rightChoiceBtn.disabled = !enabled;
}

function updateHeader() {
  roundLabelEl.textContent = `Round ${Math.min(gameState.currentRound + 1, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`;
  scoreLabelEl.textContent = `Score: ${gameState.score}`;
}

function renderRound() {
  if (gameState.currentRound >= TOTAL_ROUNDS) {
    showResults();
    return;
  }

  const [left, right] = gameState.pairs[gameState.currentRound];
  leftChoiceBtn.innerHTML = renderCompany(left);
  rightChoiceBtn.innerHTML = renderCompany(right);
  leftChoiceBtn.className = "choice";
  rightChoiceBtn.className = "choice";
  feedbackEl.textContent = "";
  nextBtn.classList.add("hidden");
  setChoiceButtonsEnabled(true);
  updateHeader();
}

function answerRound(chosenSide) {
  const [left, right] = gameState.pairs[gameState.currentRound];
  const leftWins = left.founded < right.founded;
  const rightWins = right.founded < left.founded;
  const tie = left.founded === right.founded;
  const isCorrect = tie || (chosenSide === "left" ? leftWins : rightWins);

  gameState.results.push(isCorrect);
  if (isCorrect) {
    gameState.score += 1;
  }

  const chosenBtn = chosenSide === "left" ? leftChoiceBtn : rightChoiceBtn;
  const otherBtn = chosenSide === "left" ? rightChoiceBtn : leftChoiceBtn;
  chosenBtn.classList.add("selected");

  leftChoiceBtn.classList.add(leftWins || tie ? "correct" : "incorrect");
  rightChoiceBtn.classList.add(rightWins || tie ? "correct" : "incorrect");

  if (tie) {
    leftChoiceBtn.classList.add("answer-good");
    rightChoiceBtn.classList.add("answer-good");
  } else {
    const winnerBtn = leftWins ? leftChoiceBtn : rightChoiceBtn;
    const loserBtn = leftWins ? rightChoiceBtn : leftChoiceBtn;
    winnerBtn.classList.add("answer-good");
    loserBtn.classList.add("answer-bad");
    if (!isCorrect) {
      chosenBtn.classList.add("shake");
    } else {
      otherBtn.classList.add("dimmed");
    }
  }
  setChoiceButtonsEnabled(false);

  const verdict = isCorrect ? "Correct" : "Incorrect";
  const tieText = tie ? " (same year tie)" : "";
  feedbackEl.textContent = `${verdict}. ${left.name} (${left.founded}) vs ${right.name} (${right.founded})${tieText}.`;
  nextBtn.classList.remove("hidden");
  persistState();
}

function showResults() {
  gameSection.classList.add("hidden");
  resultsSection.classList.remove("hidden");

  finalScoreEl.textContent = `You scored ${gameState.score}/${TOTAL_ROUNDS}.`;
  const emoji = gameState.results.map((v) => (v ? "🟩" : "🟥")).join("");
  emojiLineEl.textContent = emoji;
}

function persistState() {
  const key = `${STORAGE_PREFIX}:${gameState.dateKey}`;
  localStorage.setItem(key, JSON.stringify(gameState));
}

function loadState(dateKey) {
  const key = `${STORAGE_PREFIX}:${dateKey}`;
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function bootNewGame(companies, dateKey) {
  gameState = {
    dateKey,
    currentRound: 0,
    score: 0,
    results: [],
    pairs: buildDailyPairs(companies, dateKey),
  };
  persistState();
}

async function init() {
  const dateKey = toLocalDateKey();
  puzzleDateEl.textContent = `Puzzle date: ${dateKey}`;

  const response = await fetch("./data/companies.json");
  if (!response.ok) {
    throw new Error("Could not load company dataset.");
  }
  const companies = await response.json();
  if (!Array.isArray(companies) || companies.length < TOTAL_ROUNDS * 2) {
    throw new Error("Company dataset is invalid.");
  }

  const existing = loadState(dateKey);
  if (existing && existing.dateKey === dateKey) {
    gameState = existing;
  } else {
    bootNewGame(companies, dateKey);
  }

  if (gameState.currentRound >= TOTAL_ROUNDS) {
    showResults();
  } else {
    renderRound();
  }
}

leftChoiceBtn.addEventListener("click", () => answerRound("left"));
rightChoiceBtn.addEventListener("click", () => answerRound("right"));
nextBtn.addEventListener("click", () => {
  gameState.currentRound += 1;
  persistState();
  renderRound();
});
copyBtn.addEventListener("click", async () => {
  const share = [
    `Company Timeline Daily ${gameState.dateKey}`,
    `Score: ${gameState.score}/${TOTAL_ROUNDS}`,
    gameState.results.map((v) => (v ? "🟩" : "🟥")).join(""),
  ].join("\n");
  await navigator.clipboard.writeText(share);
  copyBtn.textContent = "Copied!";
});

init().catch((error) => {
  gameSection.innerHTML = `<p>Unable to start game: ${error.message}</p>`;
});
