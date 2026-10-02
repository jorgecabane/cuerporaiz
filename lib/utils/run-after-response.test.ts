import { describe, it, expect, vi } from "vitest";

const after = vi.hoisted(() => vi.fn());
vi.mock("next/server", () => ({ after }));

import { runInBackground } from "./run-after-response";

describe("runInBackground", () => {
  it("registra after() con la promesa en el mismo tick, antes de que la tarea termine", async () => {
    let finished = false;
    const promise = runInBackground(async () => {
      await new Promise((r) => setTimeout(r, 5));
      finished = true;
    });
    expect(after).toHaveBeenCalledTimes(1);
    expect(after.mock.calls[0][0]).toBe(promise);
    expect(finished).toBe(false);
    await promise;
    expect(finished).toBe(true);
  });

  it("fuera de un request (after lanza) igual ejecuta la tarea", async () => {
    after.mockImplementationOnce(() => { throw new Error("outside request scope"); });
    const task = vi.fn(async () => {});
    await runInBackground(task);
    expect(task).toHaveBeenCalledTimes(1);
  });
});
