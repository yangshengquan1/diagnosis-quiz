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
    assert.equal(typeof question.explanation.differential, "string");
  }
});
