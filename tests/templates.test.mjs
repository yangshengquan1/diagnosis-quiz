import test from "node:test";
import assert from "node:assert/strict";
import {
  renderHomeView,
  renderQuestionView,
  renderWrongBookView
} from "../src/templates.js";

test("renderHomeView includes the three main entry points", () => {
  const html = renderHomeView({
    summary: { totalQuestions: 174, completedCount: 12, wrongCount: 5 },
    mode: "四选一",
    installState: null,
    systems: [
      { name: "呼吸系统疾病", total: 23, completed: 3, wrong: 1 },
      { name: "心血管系统疾病", total: 14, completed: 2, wrong: 0 }
    ]
  });

  assert.match(html, /分类练习/);
  assert.match(html, /随机练习/);
  assert.match(html, /错题本/);
  assert.match(html, /四选一/);
  assert.match(html, /手动输入/);
});

test("renderHomeView includes install and network status copy", () => {
  const html = renderHomeView({
    summary: { totalQuestions: 174, completedCount: 12, wrongCount: 5 },
    mode: "四选一",
    installState: {
      canInstall: true,
      isInstalled: false,
      isOnline: true,
      label: "可安装到主屏幕"
    },
    systems: [
      { name: "呼吸系统疾病", total: 23, completed: 3, wrong: 1 }
    ]
  });

  assert.match(html, /可安装到主屏幕/);
  assert.match(html, /data-action="install-app"/);
});

test("renderQuestionView shows either options or manual input based on mode", () => {
  const optionHtml = renderQuestionView({
    mode: "四选一",
    question: {
      system: "呼吸系统疾病",
      clue: "中老年人，咳嗽、咳痰数年或数十年，桶状胸，FEV1/FVC<70%",
      sourcePage: 1
    },
    progressLabel: "1 / 20",
    options: ["慢性阻塞性肺疾病", "支气管哮喘", "支气管扩张", "肺癌"],
    feedback: null
  });

  const inputHtml = renderQuestionView({
    mode: "手动输入",
    question: {
      system: "呼吸系统疾病",
      clue: "中老年人，咳嗽、咳痰数年或数十年，桶状胸，FEV1/FVC<70%",
      sourcePage: 1
    },
    progressLabel: "1 / 20",
    options: [],
    feedback: { correct: false, answer: "慢性阻塞性肺疾病", userAnswer: "肺癌" }
  });

  assert.match(optionHtml, /data-answer=/);
  assert.match(inputHtml, /name="manual-answer"/);
  assert.match(inputHtml, /正确答案：慢性阻塞性肺疾病/);
});

test("renderQuestionView shows structured explanation sections with alternatives", () => {
  const html = renderQuestionView({
    mode: "手动输入",
    question: {
      system: "呼吸系统疾病",
      clue: "中老年人，咳嗽、咳痰数年或数十年，桶状胸，FEV1/FVC<70%",
      sourcePage: 1
    },
    progressLabel: "1 / 20",
    options: [],
    feedback: {
      correct: false,
      answer: "慢性阻塞性肺疾病",
      userAnswer: "肺癌",
      explanation: {
        clues: [
          { clue: "桶状胸", meaning: "提示长期肺过度充气，是慢阻肺常见体征。" },
          { clue: "FEV1/FVC<70%", meaning: "提示持续气流受限，是慢阻肺诊断关键依据。" }
        ],
        reasoning: "这些线索组合起来更支持慢性阻塞性肺疾病。",
        alternatives: [
          { diagnosis: "支气管哮喘", reason: "哮喘更强调反复发作和可逆性气流受限，不像本题这样持续下降。" },
          { diagnosis: "肺癌", reason: "本题缺乏进行性消瘦、痰中带血和固定局灶病灶等肿瘤线索。" }
        ]
      }
    }
  });

  assert.match(html, /关键线索/);
  assert.match(html, /桶状胸/);
  assert.match(html, /持续气流受限/);
  assert.match(html, /诊断结论/);
  assert.match(html, /为什么不是别的诊断/);
  assert.match(html, /支气管哮喘/);
  assert.match(html, /肺癌/);
});

test("renderWrongBookView supports legacy string explanations", () => {
  const html = renderWrongBookView({
    entries: [
      {
        clue: "发热、咳嗽、咳痰、肺部湿啰音",
        answer: "肺炎",
        explanation: "发热、咳嗽、咳痰伴湿啰音，提示肺实质感染。",
        wrongCount: 1,
        lastWrongAt: "2026-06-03T12:00:00.000Z"
      }
    ]
  });

  assert.match(html, /解析/);
  assert.match(html, /诊断结论/);
  assert.match(html, /肺实质感染/);
});

test("renderWrongBookView lists wrong counts and structured alternatives", () => {
  const html = renderWrongBookView({
    entries: [
      {
        clue: "中老年人，咳嗽、咳痰数年或数十年，桶状胸，FEV1/FVC<70%",
        answer: "慢性阻塞性肺疾病",
        explanation: {
          clues: [],
          reasoning: "长期咳嗽咳痰合并气流受限，更支持慢性阻塞性肺疾病。",
          alternatives: [
            {
              diagnosis: "支气管哮喘",
              reason: "支气管哮喘常有可逆性气流受限，而不是持续下降。"
            }
          ]
        },
        wrongCount: 2,
        lastWrongAt: "2026-06-03T12:00:00.000Z"
      }
    ]
  });

  assert.match(html, /重新练习全部错题/);
  assert.match(html, /慢性阻塞性肺疾病/);
  assert.match(html, /支气管哮喘/);
  assert.match(html, /错 2 次/);
});
