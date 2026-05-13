/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { QuantityStepper } from "./QuantityStepper";

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return { container, root };
}

function getDec(container: HTMLElement): HTMLButtonElement {
  return container.querySelector("button[aria-label^='Disminuir']") as HTMLButtonElement;
}
function getInc(container: HTMLElement): HTMLButtonElement {
  return container.querySelector("button[aria-label^='Aumentar']") as HTMLButtonElement;
}

describe("QuantityStepper", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renderiza valor inicial", () => {
    const { container } = mount(<QuantityStepper value={3} onChange={vi.fn()} max={10} />);
    expect(container.querySelector("output")?.textContent).toBe("3");
  });

  it("− deshabilitado cuando value == min", () => {
    const { container } = mount(
      <QuantityStepper value={1} min={1} onChange={vi.fn()} max={5} />
    );
    expect(getDec(container).disabled).toBe(true);
  });

  it("+ deshabilitado cuando value == max", () => {
    const { container } = mount(<QuantityStepper value={5} onChange={vi.fn()} max={5} />);
    expect(getInc(container).disabled).toBe(true);
  });

  it("click en + llama onChange(value+1)", () => {
    const onChange = vi.fn();
    const { container } = mount(<QuantityStepper value={2} onChange={onChange} max={10} />);
    act(() => {
      getInc(container).click();
    });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("click en − llama onChange(value-1)", () => {
    const onChange = vi.fn();
    const { container } = mount(<QuantityStepper value={4} onChange={onChange} max={10} />);
    act(() => {
      getDec(container).click();
    });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("disabled global deshabilita ambos botones", () => {
    const { container } = mount(
      <QuantityStepper value={3} onChange={vi.fn()} max={10} disabled />
    );
    expect(getDec(container).disabled).toBe(true);
    expect(getInc(container).disabled).toBe(true);
  });

  it("ariaLabel propagado al group", () => {
    const { container } = mount(
      <QuantityStepper value={1} onChange={vi.fn()} max={5} ariaLabel="Cupos del evento" />
    );
    const group = container.querySelector("[role='group']") as HTMLElement;
    expect(group.getAttribute("aria-label")).toBe("Cupos del evento");
  });

  it("valor por encima de max se clampa al renderizar", () => {
    const { container } = mount(<QuantityStepper value={99} onChange={vi.fn()} max={5} />);
    expect(container.querySelector("output")?.textContent).toBe("5");
  });
});
