import { describe, it, expect } from "vitest";
import { buildPublicNav, flattenNav, isNavGroup, type NavGroup } from "./public-nav";

const full = { aboutLabel: "Sobre Trini", faqEnabled: true, blogLabel: "Blog" };

describe("buildPublicNav", () => {
  it("agrupa en Nosotros y Practica, seguido de Blog y Contacto", () => {
    const nav = buildPublicNav(full);
    expect(nav.map((i) => i.label)).toEqual(["Nosotros", "Practica", "Blog", "Contacto"]);
    const [about, practice] = nav as NavGroup[];
    expect(about.children.map((c) => c.href)).toEqual(["/sobre", "/preguntas-frecuentes"]);
    expect(practice.children.map((c) => c.href)).toEqual(["/horarios", "/catalogo", "/eventos"]);
  });

  it("suma Conócenos a Nosotros cuando está visible", () => {
    const about = buildPublicNav({ ...full, visitEnabled: true })[0] as NavGroup;
    expect(about.children.map((c) => c.href)).toEqual(["/sobre", "/conocenos", "/preguntas-frecuentes"]);
  });

  it("aplica los nombres personalizados del panel", () => {
    const nav = buildPublicNav({ ...full, labels: { inPerson: "Clases", online: "Online", contact: "Escríbenos" } });
    const practice = nav[1] as NavGroup;
    expect(practice.children.map((c) => c.label).slice(0, 2)).toEqual(["Clases", "Online"]);
    expect(nav.at(-1)?.label).toBe("Escríbenos");
  });

  it("un grupo con un solo link se muestra como link directo; sin links, desaparece", () => {
    expect(buildPublicNav({ ...full, faqEnabled: false })[0]).toEqual({ href: "/sobre", label: "Sobre Trini" });
    const nav = buildPublicNav({ aboutLabel: null, faqEnabled: false, blogLabel: null });
    expect(nav.map((i) => i.label)).toEqual(["Practica", "Contacto"]);
  });
});

describe("flattenNav / isNavGroup", () => {
  it("expande grupos para el footer", () => {
    const flat = flattenNav(buildPublicNav(full));
    expect(flat.map((l) => l.href)).toEqual([
      "/sobre", "/preguntas-frecuentes", "/horarios", "/catalogo", "/eventos", "/blog", "/#contacto",
    ]);
    expect(flat.every((l) => !isNavGroup(l))).toBe(true);
  });
});
