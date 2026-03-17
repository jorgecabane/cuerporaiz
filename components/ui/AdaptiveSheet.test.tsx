/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { AdaptiveSheet } from "./AdaptiveSheet";

describe("AdaptiveSheet", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("when open=true renders backdrop and content", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenChange = vi.fn();

    act(() => {
      root.render(
        <AdaptiveSheet open title="Test" onOpenChange={onOpenChange}>
          Content
        </AdaptiveSheet>
      );
    });

    const backdrop = document.querySelector(
      '[data-testid="adaptive-sheet-backdrop"]'
    );
    const content = document.querySelector(
      '[data-testid="adaptive-sheet-content"]'
    );
    expect(backdrop).toBeTruthy();
    expect(content).toBeTruthy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("when dismissible=true and backdrop is clicked, calls onOpenChange(false)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenChange = vi.fn();

    act(() => {
      root.render(
        <AdaptiveSheet
          open
          title="Test"
          onOpenChange={onOpenChange}
          dismissible
        >
          Content
        </AdaptiveSheet>
      );
    });

    const backdrop = document.querySelector(
      '[data-testid="adaptive-sheet-backdrop"]'
    );
    expect(backdrop).toBeTruthy();

    act(() => {
      backdrop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("when dismissible=false, backdrop click does not call onOpenChange", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenChange = vi.fn();

    act(() => {
      root.render(
        <AdaptiveSheet
          open
          title="Test"
          onOpenChange={onOpenChange}
          dismissible={false}
        >
          Content
        </AdaptiveSheet>
      );
    });

    const backdrop = document.querySelector(
      '[data-testid="adaptive-sheet-backdrop"]'
    );
    act(() => {
      backdrop?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onOpenChange).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it("when open=false does not render backdrop", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onOpenChange = vi.fn();

    act(() => {
      root.render(
        <AdaptiveSheet open={false} title="Test" onOpenChange={onOpenChange}>
          Content
        </AdaptiveSheet>
      );
    });

    const backdrop = document.querySelector(
      '[data-testid="adaptive-sheet-backdrop"]'
    );
    expect(backdrop).toBeFalsy();

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
