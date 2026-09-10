/** Trivial module worker used only by the worker-support e2e test. */
self.onmessage = (event: MessageEvent<number>) => {
  self.postMessage(event.data * 2);
};
export {};
