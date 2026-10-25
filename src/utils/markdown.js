// src/utils/markdown.js
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  gfm: true,
  breaks: true,
  async: false,
});

/* Force every link to open in a new tab (DOMPurify strips target by default) */
let hookAttached = false;
const attachHook = () => {
  if (hookAttached) return;
  hookAttached = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
};

/** Markdown string → sanitized HTML string (safe for dangerouslySetInnerHTML) */
export const renderMarkdown = (md = "") => {
  if (!md) return "";
  attachHook();
  const html = marked.parse(String(md), { async: false });
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
};

/** Strip Markdown/HTML → plain text (used for the copy button + sidebar titles) */
export const toPlainText = (md = "") =>
  String(md)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();