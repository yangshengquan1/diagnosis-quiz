import { questions, systems } from "../data/questions.js";
import {
  buildChoiceOptions,
  buildSystemStats,
  createSession,
  isAnswerCorrect,
  recordWrongQuestion,
  summarizeProgress
} from "./quiz-core.js";
import { createStorageApi, defaultState } from "./storage.js";
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

function save() {
  storage.save(state);
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
  app.innerHTML = renderHomeView({
    summary: summarizeProgress(questions, state),
    mode: state.mode,
    systems: buildSystemStats(questions, state, systems)
  });
}

function renderWrongBook() {
  const entries = Object.values(state.wrongBook)
    .map((item) => {
      const question = questions.find((row) => row.id === item.questionId);
      return question ? { ...question, wrongCount: item.wrongCount, lastWrongAt: item.lastWrongAt } : null;
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
    renderWrongBook();
    return;
  }

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
    userAnswer
  };

  renderCurrentQuestion();
}

function goToNextQuestion() {
  if (!session || currentIndex >= session.questions.length - 1) {
    renderHome();
    return;
  }

  currentIndex += 1;
  feedback = null;
  renderCurrentQuestion();
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

app.addEventListener("click", (event) => {
  const target = event.target.closest("button");

  if (!target) {
    return;
  }

  if (target.dataset.mode) {
    state = { ...state, mode: target.dataset.mode };
    save();

    if (session) {
      renderCurrentQuestion();
    } else {
      renderHome();
    }
    return;
  }

  if (target.dataset.nav === "home") {
    session = null;
    feedback = null;
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

renderHome();
