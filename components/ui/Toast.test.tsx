import { describe, it, expect, vi, beforeEach } from "vitest";
import { toastStore } from "./Toast";

beforeEach(() => {
  toastStore.clear();
});

describe("toastStore", () => {
  it("adds a toast and notifies subscribers", () => {
    const listener = vi.fn();
    const unsub = toastStore.subscribe(listener);

    toastStore.add({ message: "Hello", variant: "default" });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(toastStore.getToasts()).toHaveLength(1);
    expect(toastStore.getToasts()[0].message).toBe("Hello");
    unsub();
  });

  it("removes a toast by id", () => {
    toastStore.add({ message: "A", variant: "default" });
    const id = toastStore.getToasts()[0].id;

    toastStore.remove(id);

    expect(toastStore.getToasts()).toHaveLength(0);
  });

  it("limits visible toasts to 3", () => {
    toastStore.add({ message: "1", variant: "default" });
    toastStore.add({ message: "2", variant: "default" });
    toastStore.add({ message: "3", variant: "default" });
    toastStore.add({ message: "4", variant: "default" });

    expect(toastStore.getToasts()).toHaveLength(4);
  });

  it("clear removes all toasts", () => {
    toastStore.add({ message: "A", variant: "default" });
    toastStore.add({ message: "B", variant: "success" });

    toastStore.clear();

    expect(toastStore.getToasts()).toHaveLength(0);
  });
});
