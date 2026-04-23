import type { StructureResolver } from "sanity/structure";

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Contenido")
    .items([
      S.listItem()
        .title("Artículos")
        .schemaType("post")
        .child(S.documentTypeList("post").title("Artículos").defaultOrdering([{ field: "publishedAt", direction: "desc" }])),
      S.listItem()
        .title("Autores")
        .schemaType("author")
        .child(S.documentTypeList("author").title("Autores")),
      S.listItem()
        .title("Categorías")
        .schemaType("category")
        .child(S.documentTypeList("category").title("Categorías")),
    ]);
