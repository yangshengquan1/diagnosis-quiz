import test from "node:test";
import assert from "node:assert/strict";
import { questions, systems } from "../data/questions.js";

test("question bank has all required systems", () => {
  assert.deepEqual(systems, [
    "呼吸系统疾病",
    "心血管系统疾病",
    "消化系统疾病",
    "泌尿系统疾病",
    "女性生殖系统",
    "血液系统疾病",
    "代谢、内分泌系统疾病",
    "神经系统疾病",
    "运动系统疾病",
    "风湿免疫性疾病",
    "儿科疾病",
    "传染病",
    "其他"
  ]);
});

test("question bank exports a large structured set with unique ids", () => {
  assert.ok(questions.length >= 150);

  const ids = new Set();

  for (const question of questions) {
    assert.ok(question.id);
    assert.equal(ids.has(question.id), false);
    ids.add(question.id);
    assert.ok(question.system);
    assert.ok(question.clue);
    assert.ok(question.answer);
    assert.equal(Array.isArray(question.aliases), true);
    assert.equal(Number.isInteger(question.sourcePage), true);
    assert.ok(question.sourcePage >= 1 && question.sourcePage <= 16);
    assert.equal(typeof question.notes, "string");
    assert.equal(typeof question.explanation, "object");
    assert.equal(Array.isArray(question.explanation.clues), true);
    assert.equal(typeof question.explanation.reasoning, "string");
    assert.ok(question.explanation.reasoning.trim().length > 0);
    assert.equal(Array.isArray(question.explanation.alternatives), true);
    assert.ok(question.explanation.alternatives.length >= 1);

    for (const alternative of question.explanation.alternatives) {
      assert.equal(typeof alternative.diagnosis, "string");
      assert.ok(alternative.diagnosis.trim().length > 0);
      assert.equal(typeof alternative.reason, "string");
      assert.ok(alternative.reason.trim().length > 0);
    }
  }
});

test("question bank explanations use detailed per-clue reasoning instead of template phrasing", () => {
  for (const question of questions) {
    assert.ok(question.explanation);
    assert.match(question.explanation.reasoning, /第\d+条|逐条|每条/);
    assert.match(question.explanation.reasoning, /所以|因此|最终|最符合/);
    assert.doesNotMatch(question.explanation.reasoning, /先看|再看|把这些表现综合起来看/);
  }
});

test("copd explanation gives line-by-line support and a combined diagnostic chain", () => {
  const question = questions.find((item) => item.id === "resp-001");

  assert.ok(question);
  assert.equal(question.explanation.clues.length >= 4, true);

  const ageClue = question.explanation.clues.find((item) => item.clue === "中老年人");
  const chestClue = question.explanation.clues.find((item) => item.clue === "桶状胸");
  const spirometryClue = question.explanation.clues.find((item) => item.clue === "FEV1/FVC<70%");

  assert.ok(ageClue);
  assert.ok(chestClue);
  assert.ok(spirometryClue);
  assert.match(ageClue.meaning, /慢性阻塞性肺疾病|慢阻肺/);
  assert.match(chestClue.meaning, /肺过度充气|慢性阻塞性肺疾病|慢阻肺/);
  assert.match(spirometryClue.meaning, /持续性气流受限|客观依据|慢性阻塞性肺疾病|慢阻肺/);
  assert.match(question.explanation.reasoning, /第1条|逐条|每条/);
  assert.match(question.explanation.reasoning, /证据链|合起来|综合/);
  assert.match(question.explanation.reasoning, /慢性阻塞性肺疾病/);
});

test("pneumonia explanation explains why each sign points to lung infection", () => {
  const question = questions.find((item) => item.id === "resp-005");

  assert.ok(question);

  const feverClue = question.explanation.clues.find((item) => item.clue === "发热");
  const wetRalesClue = question.explanation.clues.find((item) => item.clue === "肺部湿啰音");
  const xrayClue = question.explanation.clues.find((item) => item.clue === "胸片渗出影");

  assert.ok(feverClue);
  assert.ok(wetRalesClue);
  assert.ok(xrayClue);
  assert.match(feverClue.meaning, /感染|炎症/);
  assert.match(wetRalesClue.meaning, /渗出物|肺泡|肺实质/);
  assert.match(xrayClue.meaning, /影像|肺实质|肺炎/);
  assert.match(question.explanation.reasoning, /第1条|逐条|每条/);
  assert.match(question.explanation.reasoning, /感染|肺实质/);
  assert.match(question.explanation.reasoning, /肺炎/);
});

test("sle explanation explains each clue and the combined autoimmune chain", () => {
  const question = questions.find((item) => item.id === "rheum-002");

  assert.ok(question);

  const systemicClue = question.explanation.clues.find((item) => item.clue === "多系统症状");
  const antibodyClue = question.explanation.clues.find((item) => item.clue === "抗Sm或抗dsDNA抗体阳性");
  const jointClue = question.explanation.clues.find((item) => item.clue === "大关节肿痛");

  assert.ok(systemicClue);
  assert.ok(antibodyClue);
  assert.ok(jointClue);
  assert.match(systemicClue.meaning, /多系统|自身免疫|结缔组织病/);
  assert.match(antibodyClue.meaning, /抗Sm|抗dsDNA|特异|定性/);
  assert.match(jointClue.meaning, /关节|炎症|受累/);
  assert.match(question.explanation.reasoning, /第1条|逐条|每条/);
  assert.match(question.explanation.reasoning, /系统性红斑狼疮/);
  assert.doesNotMatch(question.explanation.reasoning, /先看|再看/);
});
