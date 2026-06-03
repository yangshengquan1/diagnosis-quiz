const FALLBACK_EXPLANATION = "该题解析暂未补充，可先结合题干关键词和标准答案复习。";

function normalizePunctuation(value) {
  return value
    .replace(/[（）]/g, (match) => (match === "（" ? "(" : ")"))
    .replace(/[，、；]/g, ",")
    .replace(/。/g, ".")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s*\+\s*/g, "+")
    .replace(/\s*,\s*/g, ",");
}

export function normalizeAnswer(value = "") {
  return normalizePunctuation(String(value).trim().replace(/\s+/g, " "));
}

export function getQuestionExplanation(question) {
  const explanation = String(question?.explanation || "").trim();
  return explanation || FALLBACK_EXPLANATION;
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
  const selected = options.view === "wrong-book"
    ? questions.filter((item) => (options.questionIds || []).includes(item.id))
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
