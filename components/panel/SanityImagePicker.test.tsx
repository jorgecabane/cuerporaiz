/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { SanityImagePicker } from "./SanityImagePicker";

function render(element: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

describe("SanityImagePicker", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("shows 'Elegir imagen' button when value is null", () => {
    const { container } = render(<SanityImagePicker value={null} onChange={() => {}} label="Test" />);
    const button = container.querySelector("button");
    expect(button?.textContent).toContain("Elegir imagen");
  });

  it("shows preview and 'Cambiar' + 'Quitar' when value is set", () => {
    const { container } = render(
      <SanityImagePicker value="https://cdn.sanity.io/test.jpg" onChange={() => {}} label="Test" />,
    );
    const buttons = Array.from(container.querySelectorAll("button")).map((b) => b.textContent);
    expect(buttons.some((t) => t?.includes("Cambiar"))).toBe(true);
    expect(buttons.some((t) => t?.includes("Quitar"))).toBe(true);
  });

  it("calls onChange(null) when 'Quitar' is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SanityImagePicker value="https://cdn.sanity.io/test.jpg" onChange={onChange} />,
    );
    const quitar = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Quitar"),
    );
    act(() => {
      quitar?.click();
    });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("disables buttons when disabled=true", () => {
    const { container } = render(<SanityImagePicker value={null} onChange={() => {}} disabled />);
    const button = container.querySelector("button");
    expect(button?.hasAttribute("disabled")).toBe(true);
  });
});
