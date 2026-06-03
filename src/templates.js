import { normalizeExplanation } from "./quiz-core.js";

function renderModeToggle(mode) {
  return `
    <div class="mode-toggle">
      <button data-mode="四选一" class="${mode === "四选一" ? "active" : ""}">四选一</button>
      <button data-mode="手动输入" class="${mode === "手动输入" ? "active" : ""}">手动输入</button>
    </div>
  `;
}

function renderStatusBar(installState) {
  if (!installState) {
    return "";
  }

  return `
    <section class="status-bar" aria-label="应用状态">
      <span class="status-pill">${installState.label}</span>
      ${installState.canInstall ? '<button data-action="install-app" class="secondary-action">安装应用</button>' : ""}
    </section>
  `;
}

function renderExplanation(explanation) {
  const normalized = normalizeExplanation(explanation);
  const clueItems = normalized.clues
    .map((item) => `
      <li>
        <strong>${escapeHtml(item.clue)}</strong>
        <span>${escapeHtml(item.meaning)}</span>
      </li>
    `)
    .join("");

  const clueSection = clueItems
    ? `
      <section class="explanation-section">
        <h4>关键线索</h4>
        <ul class="explanation-list">
          ${clueItems}
        </ul>
      </section>
    `
    : "";

  const differentialSection = normalized.differential
    ? `
      <section class="explanation-section">
        <h4>简短鉴别</h4>
        <p>${escapeHtml(normalized.differential)}</p>
      </section>
    `
    : "";

  return `
    <div class="answer-explanation">
      <h3>解析</h3>
      ${clueSection}
      <section class="explanation-section">
        <h4>诊断结论</h4>
        <p>${escapeHtml(normalized.reasoning)}</p>
      </section>
      ${differentialSection}
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderHomeView({ summary, mode, installState, systems }) {
  return `
    <section class="home-view">
      <header class="hero">
        <p class="eyebrow">诊断刷题</p>
        <h1>执业医题眼诊断练习</h1>
        <p class="subtitle">根据题眼判断诊断，答题后立即查看正确答案和解析。</p>
        ${renderStatusBar(installState)}
        ${renderModeToggle(mode)}
      </header>
      <section class="stats-grid">
        <article><span>题库总数</span><strong>${summary.totalQuestions}</strong></article>
        <article><span>已练题数</span><strong>${summary.completedCount}</strong></article>
        <article><span>错题数</span><strong>${summary.wrongCount}</strong></article>
      </section>
      <section class="entry-grid">
        <button data-nav="categories">分类练习</button>
        <button data-nav="random">随机练习</button>
        <button data-nav="wrong-book">错题本</button>
      </section>
      <section class="section-head">
        <h2>系统分类</h2>
      </section>
      <section class="system-list">
        ${systems.map((system) => `
          <button class="system-card" data-system="${system.name}">
            <strong>${system.name}</strong>
            <span>${system.total} 题</span>
            <span>已练 ${system.completed}</span>
            <span>错题 ${system.wrong}</span>
          </button>
        `).join("")}
      </section>
    </section>
  `;
}

export function renderQuestionView({ mode, question, progressLabel, options, feedback }) {
  const feedbackHtml = feedback
    ? `
      <div class="feedback ${feedback.correct ? "correct" : "wrong"}">
        <p>你的答案：${feedback.userAnswer || "未作答"}</p>
        <p>正确答案：${feedback.answer}</p>
        ${renderExplanation(feedback.explanation)}
      </div>
    `
    : "";

  const answerArea = mode === "四选一"
    ? `
      <div class="choice-grid">
        ${options.map((option) => `<button data-answer="${option}">${option}</button>`).join("")}
      </div>
    `
    : `
      <form id="manual-answer-form" class="manual-form">
        <input name="manual-answer" placeholder="输入诊断名称" autocomplete="off" />
        <button type="submit">提交答案</button>
      </form>
    `;

  return `
    <section class="question-view">
      <header class="question-header">
        <button data-nav="home">返回首页</button>
        <span>${question.system}</span>
        <span>${progressLabel}</span>
      </header>
      <article class="question-card">
        <p class="clue">${question.clue}</p>
        <p class="meta">来源页码：第 ${question.sourcePage} 页${question.notes ? ` · ${question.notes}` : ""}</p>
      </article>
      ${answerArea}
      ${feedbackHtml}
      <div class="question-actions">
        <button data-action="next-question">下一题</button>
      </div>
    </section>
  `;
}

export function renderWrongBookView({ entries }) {
  return `
    <section class="wrong-book-view">
      <header class="question-header">
        <button data-nav="home">返回首页</button>
        <h2>错题本</h2>
      </header>
      <div class="entry-grid">
        <button data-action="practice-all-wrongs">重新练习全部错题</button>
        <button data-action="recent-wrongs">只练最近错题</button>
      </div>
      <div class="wrong-list">
        ${entries.length ? entries.map((entry) => `
          <article class="question-card">
            <p class="clue">${entry.clue}</p>
            <p>正确答案：${entry.answer}</p>
            ${renderExplanation(entry.explanation)}
            <p>错 ${entry.wrongCount} 次</p>
            <p>最近做错：${new Date(entry.lastWrongAt).toLocaleString("zh-CN")}</p>
          </article>
        `).join("") : '<article class="question-card"><p class="clue">还没有错题，继续保持。</p></article>'}
      </div>
    </section>
  `;
}
