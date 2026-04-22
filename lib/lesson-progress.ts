"use client";

export const LESSON_PROGRESS_EVENT = "ml-edge:lesson-progress-updated";

export function buildLessonProgressStorageKey(courseSlug: string, lessonId: string) {
  return `lesson-progress:${courseSlug}:${lessonId}`;
}

export function readLessonProgressSnapshot(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

export function subscribeToLessonProgress(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith("lesson-progress:")) {
      onStoreChange();
    }
  };
  const handleProgressUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LESSON_PROGRESS_EVENT, handleProgressUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LESSON_PROGRESS_EVENT, handleProgressUpdate);
  };
}

export function writeLessonProgressSnapshot(storageKey: string, value: string) {
  window.localStorage.setItem(storageKey, value);
  window.dispatchEvent(new CustomEvent(LESSON_PROGRESS_EVENT, { detail: storageKey }));
}
