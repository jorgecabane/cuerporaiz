import { defineField, defineType } from "sanity";
import { PlayIcon } from "@sanity/icons";

const SUPPORTED_PROVIDERS = [
  "youtube.com",
  "youtu.be",
  "vimeo.com",
  "instagram.com",
  "open.spotify.com",
  "soundcloud.com",
  "music.apple.com",
];

export const embed = defineType({
  name: "embed",
  title: "Embed (video / audio / red social)",
  type: "object",
  icon: PlayIcon,
  fields: [
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      description:
        "Pegá el enlace completo. Soportamos YouTube, Vimeo, Instagram, Spotify, SoundCloud y Apple Music.",
      validation: (r) =>
        r
          .required()
          .uri({ scheme: ["http", "https"] })
          .custom((value) => {
            if (typeof value !== "string") return "URL requerida";
            const isSupported = SUPPORTED_PROVIDERS.some((p) => value.includes(p));
            return isSupported || `URL no reconocida. Proveedores: ${SUPPORTED_PROVIDERS.join(", ")}`;
          }),
    }),
    defineField({
      name: "caption",
      title: "Descripción",
      type: "string",
      description: "Opcional. Se muestra debajo del embed.",
    }),
  ],
  preview: {
    select: { url: "url", caption: "caption" },
    prepare({ url, caption }) {
      return { title: caption || "Embed", subtitle: url };
    },
  },
});
