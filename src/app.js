import { questions, systems } from "../data/questions.js";
import {
  buildChoiceOptions,
  buildSystemStats,
  createSession,
  getQuestionExplanation,
  isAnswerCorrect,
  recordWrongQuestion,
  restorePersistedSession,
  snapshotSessionState,
  summarizeProgress
} from "./quiz-core.js";
import { createStorageApi, defaultState } from "./storage.js";
import {
  buildInstallState,
  serviceWorkerScriptUrl
} from "./pwa.js";
import {
  renderHomeView,
  renderQuestionView,
  renderWrongBookView
} from "./templates.js";

const storage = createStorageApi(window.localStorage);
const app = document.querySelector("#app");

let state = { ...defaultState, ...storage.load() };
let session = null;
let currentIndex = 0;
let feedback = null;
let installPromptEvent = null;
let installState = buildInstallState({
  hasPrompt: false,
  isStandalone: window.matchMedia("(display-mode: standalone)").matches,
  isOnline: navigator.onLine
});

function save() {
  storage.save(state);
}

function persistActiveSession() {
  state = {
    ...state,
    activeSession: snapshotSessionState(session, currentIndex, feedback)
  };
  save();
}

function clearActiveSession() {
  state = {
    ...state,
    activeSession: null
  };
  save();
}

function updateInstallState() {
  installState = buildInstallState({
    hasPrompt: Boolean(installPromptEvent),
    isStandalone: window.matchMedia("(display-mode: standalone)").matches,
    isOnline: navigator.onLine
  });
}

function markCompleted(questionId) {
  if (!state.completedIds.includes(questionId)) {
    state = {
      ...state,
      completedIds: [...state.completedIds, questionId]
    };
    save();
  }
}

function renderHome() {
  updateInstallState();
  app.innerHTML = renderHomeView({
    summary: summarizeProgress(questions, state),
    mode: state.mode,
    installState,
    activeSession: state.activeSession,
    systems: buildSystemStats(questions, state, systems)
  });
}

function decorateQuestion(question) {
  return {
    ...question,
    explanation: getQuestionExplanation(question)
  };
}

function renderWrongBook() {
  const entries = Object.values(state.wrongBook)
    .map((item) => {
      const question = questions.find((row) => row.id === item.questionId);
      return question
        ? {
            ...decorateQuestion(question),
            wrongCount: item.wrongCount,
            lastWrongAt: item.lastWrongAt
          }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.lastWrongAt.localeCompare(left.lastWrongAt));

  app.innerHTML = renderWrongBookView({ entries });
}

function renderCurrentQuestion() {
  if (!session || session.questions.length === 0) {
    renderHome();
    return;
  }

  const question = session.questions[currentIndex];
  const options = state.mode === "四选一" ? buildChoiceOptions(question, questions) : [];

  app.innerHTML = renderQuestionView({
    mode: state.mode,
    question,
    progressLabel: `${currentIndex + 1} / ${session.questions.length}`,
    options,
    feedback
  });
}

function startSession(options) {
  session = createSession(questions, options);
  currentIndex = 0;
  feedback = null;
  state = { ...state, recentView: options.view };
  save();

  if (session.questions.length === 0) {
    clearActiveSession();
    renderWrongBook();
    return;
  }

  persistActiveSession();
  renderCurrentQuestion();
}

function submitAnswer(userAnswer) {
  if (!session || session.questions.length === 0) {
    return;
  }

  const question = session.questions[currentIndex];
  const correct = isAnswerCorrect(question, userAnswer);

  markCompleted(question.id);

  if (!correct) {
    state = recordWrongQuestion(state, question, state.mode);
    save();
  }

  feedback = {
    correct,
    answer: question.answer,
    userAnswer,
    explanation: getQuestionExplanation(question)
  };

  persistActiveSession();
  renderCurrentQuestion();
}

function goToNextQuestion() {
  if (!session || currentIndex >= session.questions.length - 1) {
    session = null;
    feedback = null;
    currentIndex = 0;
    clearActiveSession();
    renderHome();
    return;
  }

  currentIndex += 1;
  feedback = null;
  persistActiveSession();
  renderCurrentQuestion();
}

function resumeSavedSession() {
  const restored = restorePersistedSession(questions, state.activeSession);

  if (!restored) {
    clearActiveSession();
    return false;
  }

  session = restored.session;
  currentIndex = restored.currentIndex;
  feedback = restored.feedback;
  renderCurrentQuestion();
  return true;
}

function openRecentWrongs() {
  const recentIds = Object.values(state.wrongBook)
    .sort((left, right) => right.lastWrongAt.localeCompare(left.lastWrongAt))
    .slice(0, 10)
    .map((item) => item.questionId);

  startSession({
    view: "wrong-book",
    questionIds: recentIds,
    random: true
  });
}

async function promptInstall() {
  if (!installPromptEvent) {
    return;
  }

  await installPromptEvent.prompt();
  installPromptEvent = null;
  renderHome();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;

  if (!session) {
    renderHome();
  }
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;

  if (!session) {
    renderHome();
  }
});

window.addEventListener("online", () => {
  if (!session) {
    renderHome();
  }
});

window.addEventListener("offline", () => {
  if (!session) {
    renderHome();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register(serviceWorkerScriptUrl(import.meta.url), {
        type: "module",
        updateViaCache: "none"
      });
    } catch (error) {
      console.warn("Service worker registration failed", error);
    }
  });
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("button");

  if (!target) {
    return;
  }

  if (target.dataset.action === "install-app") {
    await promptInstall();
    return;
  }

  if (target.dataset.mode) {
    state = { ...state, mode: target.dataset.mode };
    save();

    if (session) {
      persistActiveSession();
      renderCurrentQuestion();
    } else {
      renderHome();
    }
    return;
  }

  if (target.dataset.nav === "home") {
    renderHome();
    return;
  }

  if (target.dataset.nav === "categories") {
    document.querySelector(".system-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (target.dataset.nav === "random") {
    startSession({ view: "random", system: null, random: true });
    return;
  }

  if (target.dataset.action === "resume-session") {
    resumeSavedSession();
    return;
  }

  if (target.dataset.nav === "wrong-book") {
    renderWrongBook();
    return;
  }

  if (target.dataset.system) {
    startSession({ view: "category", system: target.dataset.system, random: false });
    return;
  }

  if (target.dataset.answer) {
    submitAnswer(target.dataset.answer);
    return;
  }

  if (target.dataset.action === "next-question") {
    goToNextQuestion();
    return;
  }

  if (target.dataset.action === "practice-all-wrongs") {
    startSession({
      view: "wrong-book",
      questionIds: Object.keys(state.wrongBook),
      random: true
    });
    return;
  }

  if (target.dataset.action === "recent-wrongs") {
    openRecentWrongs();
  }
});

app.addEventListener("submit", (event) => {
  if (event.target.id !== "manual-answer-form") {
    return;
  }

  event.preventDefault();
  const formData = new FormData(event.target);
  submitAnswer(formData.get("manual-answer") || "");
});

if (!resumeSavedSession()) {
  renderHome();
}
