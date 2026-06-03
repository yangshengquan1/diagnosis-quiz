import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChoiceOptions,
  createSession,
  isAnswerCorrect,
  normalizeAnswer,
  recordWrongQuestion,
  summarizeProgress
} from "../src/quiz-core.js";

test("normalizeAnswer trims, collapses spaces, and normalizes punctuation", () => {
  assert.equal(normalizeAnswer("  慢阻肺（急性加重）  "), "慢阻肺(急性加重)");
});

test("isAnswerCorrect accepts canonical answer and aliases after normalization", () => {
  const question = {
    answer: "慢性阻塞性肺疾病",
    aliases: ["慢阻肺"]
  };

  assert.equal(isAnswerCorrect(question, "慢性阻塞性肺疾病"), true);
  assert.equal(isAnswerCorrect(question, "  慢阻肺 "), true);
  assert.equal(isAnswerCorrect(question, "肺结核"), false);
});

const sampleQuestions = [
  { id: "resp-1", system: "呼吸系统疾病", clue: "A", answer: "慢性阻塞性肺疾病", aliases: ["慢阻肺"], sourcePage: 1, notes: "" },
  { id: "resp-2", system: "呼吸系统疾病", clue: "B", answer: "支气管哮喘", aliases: [], sourcePage: 1, notes: "" },
  { id: "resp-3", system: "呼吸系统疾病", clue: "C", answer: "支气管扩张", aliases: [], sourcePage: 1, notes: "" },
  { id: "resp-4", system: "呼吸系统疾病", clue: "D", answer: "肺癌", aliases: [], sourcePage: 1, notes: "" },
  { id: "cardio-1", system: "心血管系统疾病", clue: "E", answer: "急性左心衰", aliases: [], sourcePage: 3, notes: "" }
];

test("buildChoiceOptions includes the correct answer and returns four unique options", () => {
  const options = buildChoiceOptions(sampleQuestions[0], sampleQuestions);

  assert.equal(options.includes("慢性阻塞性肺疾病"), true);
  assert.equal(options.length, 4);
  assert.equal(new Set(options).size, 4);
});

test("createSession filters by category and supports random ordering", () => {
  const session = createSession(sampleQuestions, {
    view: "category",
    system: "呼吸系统疾病",
    random: true
  });

  assert.equal(session.questions.length, 4);
  assert.equal(session.questions.every((item) => item.system === "呼吸系统疾病"), true);
});

test("recordWrongQuestion deduplicates and increments wrong counts", () => {
  const firstPass = recordWrongQuestion(
    { wrongBook: {}, completedIds: [], mode: "四选一", recentView: "home" },
    sampleQuestions[0],
    "四选一",
    "2026-06-03T12:00:00.000Z"
  );
  const secondPass = recordWrongQuestion(
    firstPass,
    sampleQuestions[0],
    "手动输入",
    "2026-06-03T12:01:00.000Z"
  );

  assert.equal(Object.keys(secondPass.wrongBook).length, 1);
  assert.equal(secondPass.wrongBook["resp-1"].wrongCount, 2);
  assert.equal(secondPass.wrongBook["resp-1"].lastMode, "手动输入");
  assert.equal(secondPass.wrongBook["resp-1"].lastWrongAt, "2026-06-03T12:01:00.000Z");
});

test("summarizeProgress returns totals for home screen cards", () => {
  const summary = summarizeProgress(sampleQuestions, {
    completedIds: ["resp-1", "cardio-1"],
    wrongBook: {
      "resp-1": { questionId: "resp-1", wrongCount: 2, lastWrongAt: "2026-06-03T12:00:00.000Z", lastMode: "四选一" }
    }
  });

  assert.deepEqual(summary, {
    totalQuestions: 5,
    completedCount: 2,
    wrongCount: 1
  });
});
