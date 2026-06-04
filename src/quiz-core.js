const FALLBACK_EXPLANATION = Object.freeze({
  clues: [],
  reasoning: "该题解析暂未补充，可先结合题干关键词和标准答案复习。",
  alternatives: []
});

function normalizePunctuation(value) {
  return value
    .replace(/[（），、；]/g, (match) => {
      if (match === "（") {
        return "(";
      }

      if (match === "）") {
        return ")";
      }

      return ",";
    })
    .replace(/。/g, ".")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s*,\s*/g, ",");
}

function normalizeAlternatives(alternatives, differential = "") {
  const normalized = Array.isArray(alternatives)
    ? alternatives
        .filter((item) => item && (item.diagnosis || item.reason))
        .map((item) => ({
          diagnosis: String(item.diagnosis || "").trim(),
          reason: String(item.reason || "").trim()
        }))
        .filter((item) => item.diagnosis || item.reason)
    : [];

  if (normalized.length > 0) {
    return normalized;
  }

  const legacyReason = String(differential || "").trim();

  return legacyReason
    ? [{ diagnosis: "易混淆诊断", reason: legacyReason }]
    : [];
}

export function normalizeAnswer(value = "") {
  return normalizePunctuation(String(value).trim().replace(/\s+/g, " "));
}

export function normalizeExplanation(explanation) {
  if (!explanation) {
    return { ...FALLBACK_EXPLANATION };
  }

  if (typeof explanation === "string") {
    const reasoning = explanation.trim();

    return {
      clues: [],
      reasoning: reasoning || FALLBACK_EXPLANATION.reasoning,
      alternatives: []
    };
  }

  const clues = Array.isArray(explanation.clues)
    ? explanation.clues
        .filter((item) => item && (item.clue || item.meaning))
        .map((item) => ({
          clue: String(item.clue || "").trim(),
          meaning: String(item.meaning || "").trim()
        }))
        .filter((item) => item.clue || item.meaning)
    : [];

  const reasoning = String(explanation.reasoning || "").trim();
  const alternatives = normalizeAlternatives(explanation.alternatives, explanation.differential);

  return {
    clues,
    reasoning: reasoning || FALLBACK_EXPLANATION.reasoning,
    alternatives
  };
}

export function getQuestionExplanation(question) {
  return normalizeExplanation(question?.explanation);
}

export function isAnswerCorrect(question, input) {
  const normalizedInput = normalizeAnswer(input);
  const candidates = [question?.answer, ...(question?.aliases || [])]
    .filter((item) => item != null)
    .map((item) => normalizeAnswer(item));

  return candidates.includes(normalizedInput);
}

function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

export function buildChoiceOptions(question, questions) {
  const sameSystemAnswers = questions
    .filter((item) => item.system === question.system && item.id !== question.id)
    .map((item) => item.answer);

  const otherAnswers = questions
    .filter((item) => item.system !== question.system)
    .map((item) => item.answer);

  const distractors = [...new Set([...sameSystemAnswers, ...otherAnswers])]
    .filter((answer) => answer !== question.answer)
    .slice(0, 3);

  return shuffle([question.answer, ...distractors]).slice(0, 4);
}

export function createSession(questions, options) {
  const selected = Array.isArray(options.questionIds) && options.questionIds.length > 0
    ? options.questionIds
        .map((id) => questions.find((item) => item.id === id))
        .filter(Boolean)
    : options.system
      ? questions.filter((item) => item.system === options.system)
      : [...questions];

  return {
    ...options,
    questions: options.random ? shuffle(selected) : selected
  };
}

export function recordWrongQuestion(state, question, mode, now = new Date().toISOString()) {
  const current = state.wrongBook[question.id];

  return {
    ...state,
    wrongBook: {
      ...state.wrongBook,
      [question.id]: {
        questionId: question.id,
        wrongCount: current ? current.wrongCount + 1 : 1,
        lastWrongAt: now,
        lastMode: mode
      }
    }
  };
}

export function summarizeProgress(questions, state) {
  return {
    totalQuestions: questions.length,
    completedCount: state.completedIds.length,
    wrongCount: Object.keys(state.wrongBook).length
  };
}

export function snapshotSessionState(session, currentIndex, feedback) {
  if (!session || !Array.isArray(session.questions) || session.questions.length === 0) {
    return null;
  }

  return {
    view: session.view || "random",
    system: session.system || null,
    random: Boolean(session.random),
    questionIds: session.questions.map((item) => item.id),
    currentIndex,
    feedback: feedback || null
  };
}

export function restorePersistedSession(questions, persisted) {
  if (
    !persisted
    || !Array.isArray(persisted.questionIds)
    || persisted.questionIds.length === 0
    || !Number.isInteger(persisted.currentIndex)
  ) {
    return null;
  }

  const session = createSession(questions, {
    view: persisted.view || "random",
    system: persisted.system || null,
    random: Boolean(persisted.random),
    questionIds: persisted.questionIds
  });

  if (
    !Array.isArray(session.questions)
    || session.questions.length === 0
    || persisted.currentIndex < 0
    || persisted.currentIndex >= session.questions.length
  ) {
    return null;
  }

  return {
    session,
    currentIndex: persisted.currentIndex,
    feedback: persisted.feedback || null
  };
}

export function buildSystemStats(questions, state, systems) {
  return systems.map((system) => {
    const systemQuestions = questions.filter((item) => item.system === system);
    const questionIds = new Set(systemQuestions.map((item) => item.id));

    return {
      name: system,
      total: systemQuestions.length,
      completed: state.completedIds.filter((id) => questionIds.has(id)).length,
      wrong: Object.values(state.wrongBook).filter((item) => questionIds.has(item.questionId)).length
    };
  });
}
