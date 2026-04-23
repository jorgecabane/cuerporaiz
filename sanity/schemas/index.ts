import type { SchemaTypeDefinition } from "sanity";

import { post } from "./documents/post";
import { author } from "./documents/author";
import { category } from "./documents/category";

import { seo } from "./objects/seo";
import { imageBlock } from "./objects/blocks/image-block";
import { pullQuote } from "./objects/blocks/pull-quote";
import { callout } from "./objects/blocks/callout";
import { ctaButton } from "./objects/blocks/cta-button";
import { divider } from "./objects/blocks/divider";
import { gallery } from "./objects/blocks/gallery";
import { embed } from "./objects/blocks/embed";
import { twoColumn } from "./objects/blocks/two-column";
import { tableBlock } from "./objects/blocks/table-block";
import { toggleBlock } from "./objects/blocks/toggle-block";
import { todoBlock } from "./objects/blocks/todo-block";
import { asanaCard } from "./objects/blocks/asana-card";
import { breathPattern } from "./objects/blocks/breath-pattern";
import { featuredEvent } from "./objects/blocks/featured-event";
import { testimonial } from "./objects/blocks/testimonial";

export const schemaTypes: SchemaTypeDefinition[] = [
  // documents
  post,
  author,
  category,

  // objects
  seo,
  imageBlock,
  pullQuote,
  callout,
  ctaButton,
  divider,
  gallery,
  embed,
  twoColumn,
  tableBlock,
  toggleBlock,
  todoBlock,
  asanaCard,
  breathPattern,
  featuredEvent,
  testimonial,
];
