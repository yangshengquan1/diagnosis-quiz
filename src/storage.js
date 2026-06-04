const STORAGE_KEY = "medical-diagnosis-quiz-state";

export const defaultState = {
  mode: "四选一",
  completedIds: [],
  wrongBook: {},
  recentView: "home",
  activeSession: null
};

export function createStorageApi(storage) {
  return {
    load() {
      const raw = storage.getItem(STORAGE_KEY);

      if (!raw) {
        return { ...defaultState };
      }

      try {
        return { ...defaultState, ...JSON.parse(raw) };
      } catch {
        return { ...defaultState };
      }
    },
    save(state) {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  };
}
