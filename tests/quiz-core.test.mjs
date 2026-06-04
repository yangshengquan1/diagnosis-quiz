import test from "node:test";
import assert from "node:assert/strict";
import {
  buildChoiceOptions,
  createSession,
  getQuestionExplanation,
  isAnswerCorrect,
  normalizeExplanation,
  normalizeAnswer,
  restorePersistedSession,
  recordWrongQuestion,
  snapshotSessionState,
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
  assert.equal(isAnswerCorrect(question, "  慢阻肺"), true);
  assert.equal(isAnswerCorrect(question, "肺结核"), false);
});

test("normalizeExplanation converts legacy strings into the structured format", () => {
  assert.deepEqual(
    normalizeExplanation("发热、咳嗽提示感染性呼吸系统疾病，更支持肺炎。"),
    {
      clues: [],
      reasoning: "发热、咳嗽提示感染性呼吸系统疾病，更支持肺炎。",
      alternatives: []
    }
  );
});

test("normalizeExplanation preserves structured fields and fills missing defaults", () => {
  assert.deepEqual(
    normalizeExplanation({
      clues: [{ clue: "桶状胸", meaning: "提示肺过度充气，是慢阻肺常见体征。" }],
      reasoning: "结合气流受限，更支持慢性阻塞性肺疾病。"
    }),
    {
      clues: [{ clue: "桶状胸", meaning: "提示肺过度充气，是慢阻肺常见体征。" }],
      reasoning: "结合气流受限，更支持慢性阻塞性肺疾病。",
      alternatives: []
    }
  );
});

test("normalizeExplanation converts legacy differential text into one structured alternative", () => {
  assert.deepEqual(
    normalizeExplanation({
      clues: [],
      reasoning: "长期咳嗽咳痰合并气流受限，更支持慢性阻塞性肺疾病。",
      differential: "支气管哮喘常有可逆性气流受限，而不是持续下降。"
    }),
    {
      clues: [],
      reasoning: "长期咳嗽咳痰合并气流受限，更支持慢性阻塞性肺疾病。",
      alternatives: [
        {
          diagnosis: "易混淆诊断",
          reason: "支气管哮喘常有可逆性气流受限，而不是持续下降。"
        }
      ]
    }
  );
});

test("normalizeExplanation preserves structured alternatives", () => {
  assert.deepEqual(
    normalizeExplanation({
      clues: [],
      reasoning: "发热、咳嗽、湿啰音更支持肺炎。",
      alternatives: [
        { diagnosis: "上呼吸道感染", reason: "缺乏明确肺部体征和胸片渗出影。" },
        { diagnosis: "支气管哮喘", reason: "更常见哮鸣音，而不是感染性实变表现。" }
      ]
    }),
    {
      clues: [],
      reasoning: "发热、咳嗽、湿啰音更支持肺炎。",
      alternatives: [
        { diagnosis: "上呼吸道感染", reason: "缺乏明确肺部体征和胸片渗出影。" },
        { diagnosis: "支气管哮喘", reason: "更常见哮鸣音，而不是感染性实变表现。" }
      ]
    }
  );
});

test("getQuestionExplanation falls back to a structured placeholder", () => {
  assert.deepEqual(
    getQuestionExplanation({ explanation: "" }),
    {
      clues: [],
      reasoning: "该题解析暂未补充，可先结合题干关键词和标准答案复习。",
      alternatives: []
    }
  );
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

test("createSession honors explicit question order when questionIds are provided", () => {
  const session = createSession(sampleQuestions, {
    view: "resume",
    questionIds: ["cardio-1", "resp-2", "resp-1"],
    random: false
  });

  assert.deepEqual(
    session.questions.map((item) => item.id),
    ["cardio-1", "resp-2", "resp-1"]
  );
});

test("snapshotSessionState stores ordered ids, current index, and feedback", () => {
  const session = {
    view: "random",
    random: true,
    questions: [sampleQuestions[1], sampleQuestions[3], sampleQuestions[4]]
  };
  const feedback = {
    correct: false,
    answer: "肺癌",
    userAnswer: "支气管哮喘",
    explanation: {
      clues: [],
      reasoning: "更符合肺癌。",
      alternatives: []
    }
  };

  assert.deepEqual(snapshotSessionState(session, 1, feedback), {
    view: "random",
    system: null,
    random: true,
    questionIds: ["resp-2", "resp-4", "cardio-1"],
    currentIndex: 1,
    feedback
  });
});

test("restorePersistedSession rebuilds a saved session and preserves question order", () => {
  const restored = restorePersistedSession(sampleQuestions, {
    view: "category",
    system: "呼吸系统疾病",
    random: false,
    questionIds: ["resp-4", "resp-2", "resp-1"],
    currentIndex: 2,
    feedback: null
  });

  assert.ok(restored);
  assert.equal(restored.currentIndex, 2);
  assert.equal(restored.feedback, null);
  assert.deepEqual(
    restored.session.questions.map((item) => item.id),
    ["resp-4", "resp-2", "resp-1"]
  );
});

test("restorePersistedSession returns null for invalid saved progress", () => {
  assert.equal(
    restorePersistedSession(sampleQuestions, {
      view: "random",
      random: true,
      questionIds: [],
      currentIndex: 0,
      feedback: null
    }),
    null
  );
  assert.equal(
    restorePersistedSession(sampleQuestions, {
      view: "random",
      random: true,
      questionIds: ["resp-1"],
      currentIndex: 4,
      feedback: null
    }),
    null
  );
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
