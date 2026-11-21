import { createContext } from "react";

/** BUG-1000: the section an editable field belongs to, used in its accessible name. */
export const FieldSectionCtx = createContext<string>("");
