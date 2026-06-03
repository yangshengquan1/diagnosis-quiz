import test from "node:test";
import assert from "node:assert/strict";
import { createStorageApi, defaultState } from "../src/storage.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}

test("load returns default state when storage is empty", () => {
  const api = createStorageApi(createMemoryStorage());
  assert.deepEqual(api.load(), defaultState);
});

test("save persists mode, completed ids, and wrong-book data", () => {
  const api = createStorageApi(createMemoryStorage());
  const state = {
    mode: "手动输入",
    completedIds: ["resp-1"],
    wrongBook: {
      "resp-1": {
        questionId: "resp-1",
        wrongCount: 1,
        lastWrongAt: "2026-06-03T12:00:00.000Z",
        lastMode: "四选一"
      }
    },
    recentView: "wrong-book"
  };

  api.save(state);
  assert.deepEqual(api.load(), state);
});
