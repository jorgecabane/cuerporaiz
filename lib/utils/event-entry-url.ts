import { getBaseUrl } from "./base-url";

/** URL absoluta del link personal de un cupo de evento online. */
export const eventEntryUrl = (token: string) => `${getBaseUrl()}/eventos/entrar/${token}`;
