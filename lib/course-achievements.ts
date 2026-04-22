"use client";

export const COURSE_ACHIEVEMENT_EVENT = "ml-edge:course-achievement-updated";

export function buildCourseAssessmentStorageKey(courseSlug: string) {
  return `course-assessment:${courseSlug}`;
}

export function readCourseAchievementSnapshot(storageKey: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(storageKey);
}

export function subscribeToCourseAchievements(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith("course-assessment:")) {
      onStoreChange();
    }
  };
  const handleUpdate = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(COURSE_ACHIEVEMENT_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(COURSE_ACHIEVEMENT_EVENT, handleUpdate);
  };
}

export function writeCourseAchievementSnapshot(storageKey: string, value: string) {
  window.localStorage.setItem(storageKey, value);
  window.dispatchEvent(new CustomEvent(COURSE_ACHIEVEMENT_EVENT, { detail: storageKey }));
}
